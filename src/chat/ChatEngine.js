/**
 * ChatEngine — Core conversation management
 * 
 * Handles message storage, conversation history,
 * localStorage persistence, and multi-conversation support.
 */

import { streamMessage } from '../api/gemini.js';

const STORAGE_KEY = 'homo_economicus_chats';
const USER_KEY = 'homo_economicus_user';

export class ChatEngine {
  constructor() {
    /** @type {Map<string, {id: string, title: string, messages: Array, createdAt: number}>} */
    this.conversations = new Map();
    this.activeConversationId = null;
    this.isStreaming = false;
    this.currentController = null;
    this.user = null;

    // Callbacks — set by main.js
    this.onMessageAdded = null;
    this.onStreamChunk = null;
    this.onStreamComplete = null;
    this.onStreamError = null;
    this.onConversationsChanged = null;

    this._loadFromStorage();
    this._loadUser();
  }

  // ---- User Management ----

  _loadUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      if (data) this.user = JSON.parse(data);
    } catch { /* ignore */ }
  }

  setUser(user) {
    this.user = user;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  getUser() {
    return this.user;
  }

  isLoggedIn() {
    return this.user !== null;
  }

  logout() {
    this.user = null;
    localStorage.removeItem(USER_KEY);
  }

  // ---- Conversation Management ----

  _loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.forEach(conv => this.conversations.set(conv.id, conv));
      }
    } catch {
      this.conversations = new Map();
    }
  }

  _saveToStorage() {
    try {
      const data = Array.from(this.conversations.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* storage full or unavailable */ }
  }

  _generateId() {
    return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  createConversation() {
    const id = this._generateId();
    const conversation = {
      id,
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
    };
    this.conversations.set(id, conversation);
    this.activeConversationId = id;
    this._saveToStorage();
    this.onConversationsChanged?.();
    return id;
  }

  getActiveConversation() {
    if (!this.activeConversationId) return null;
    return this.conversations.get(this.activeConversationId) || null;
  }

  getActiveMessages() {
    return this.getActiveConversation()?.messages || [];
  }

  switchConversation(id) {
    if (this.conversations.has(id)) {
      this.activeConversationId = id;
      this.onConversationsChanged?.();
      return true;
    }
    return false;
  }

  deleteConversation(id) {
    this.conversations.delete(id);
    if (this.activeConversationId === id) {
      this.activeConversationId = null;
    }
    this._saveToStorage();
    this.onConversationsChanged?.();
  }

  getConversationList() {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  _updateTitle(conversation) {
    const firstUserMsg = conversation.messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      conversation.title = firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '…' : '');
    }
  }

  // ---- Messaging ----

  async sendMessage(content) {
    if (!content.trim() || this.isStreaming) return;

    // Create conversation if none active
    if (!this.activeConversationId) {
      this.createConversation();
    }

    const conversation = this.getActiveConversation();
    if (!conversation) return;

    // Add user message
    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    conversation.messages.push(userMessage);
    this._updateTitle(conversation);
    this._saveToStorage();
    this.onMessageAdded?.(userMessage);
    this.onConversationsChanged?.();

    // Start streaming AI response
    this.isStreaming = true;

    const aiMessage = {
      id: `msg_${Date.now() + 1}`,
      role: 'ai',
      content: '',
      theories: [],
      timestamp: Date.now(),
    };

    // Build history for API (only send user/ai content pairs)
    const history = conversation.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    this.currentController = streamMessage(
      history,
      // onChunk
      (chunk, fullText) => {
        aiMessage.content = fullText;
        this.onStreamChunk?.(chunk, fullText, aiMessage);
      },
      // onComplete
      (fullText) => {
        // Parse theories from the response
        aiMessage.theories = this._parseTheories(fullText);
        // Clean the THEORIES_USED line from display content
        aiMessage.content = this._cleanContent(fullText);

        conversation.messages.push(aiMessage);
        this._saveToStorage();
        this.isStreaming = false;
        this.currentController = null;
        this.onStreamComplete?.(aiMessage);
      },
      // onError
      (error) => {
        this.isStreaming = false;
        this.currentController = null;
        this.onStreamError?.(error);
      }
    );
  }

  cancelStream() {
    if (this.currentController) {
      this.currentController.abort();
      this.isStreaming = false;
      this.currentController = null;
    }
  }

  _parseTheories(text) {
    const match = text.match(/THEORIES_USED:\s*(.+)/i);
    if (!match) return [];
    return match[1]
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);
  }

  _cleanContent(text) {
    return text.replace(/\n?THEORIES_USED:\s*.+$/i, '').trim();
  }
}
