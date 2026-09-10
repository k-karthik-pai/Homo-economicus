/**
 * main.js — Application Entry Point
 * 
 * Wires together the ChatEngine, UI components, and DOM.
 */

import './styles/reset.css';
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/chat.css';
import './styles/modal.css';
import './styles/animations.css';
import './styles/responsive.css';

import { ChatEngine } from './chat/ChatEngine.js';
import {
  renderUserMessage,
  renderAiMessage,
  createStreamingMessage,
  updateStreamingMessage,
  finalizeStreamingMessage,
  createTypingIndicator,
  removeTypingIndicator,
} from './chat/MessageRenderer.js';
import { initializeApiKey, isApiKeyConfigured } from './api/gemini.js';
import { Sidebar } from './components/Sidebar.js';
import { InputArea } from './components/InputArea.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { ProfileModal } from './components/ProfileModal.js';
import { ApiKeyModal } from './components/ApiKeyModal.js';

// ---- Initialize Engine ----
const chatEngine = new ChatEngine();

// ---- Initialize Components ----
const sidebar = new Sidebar(chatEngine, {
  onNewChat: () => startNewChat(),
  onSwitchChat: (id) => switchToChat(id),
  onDeleteChat: (id) => deleteChat(id),
  onProfileClick: () => profileModal.show(),
  onApiClick: () => {
    new ApiKeyModal((status) => {
      sidebar.updateApiStatus();
      inputArea.setApiConfigured(isApiKeyConfigured());
      if (status === 'saved') {
        setStatusMessage('Gemini connected. You can start an analysis.', 'success');
      }
      if (status === 'cleared') {
        setStatusMessage('Gemini key cleared. Add a key before starting a new analysis.', 'neutral');
      }
    });
  },
});

const inputArea = new InputArea({
  onSend: (content) => sendMessage(content),
  onCancel: () => stopGeneration(),
});

const welcomeScreen = new WelcomeScreen({
  onExampleClick: (text) => sendMessage(text),
});

const profileModal = new ProfileModal({
  getUser: () => chatEngine.getUser(),
  onSave: (user) => {
    chatEngine.setUser(user);
    sidebar.updateUser();
    setStatusMessage(`Local profile saved for ${user.name}.`, 'success');
  },
  onClear: () => {
    chatEngine.logout();
    sidebar.updateUser();
    setStatusMessage('Local profile removed.', 'neutral');
  },
});

// ---- Build DOM ----
function buildApp() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Ambient glow effects removed for minimalist design

  // Sidebar
  const { sidebar: sidebarEl, toggle, overlay } = sidebar.render();
  app.appendChild(toggle);
  app.appendChild(overlay);
  app.appendChild(sidebarEl);

  // Main area
  const main = document.createElement('main');
  main.className = 'main';
  main.id = 'main-area';

  // Chat container
  const chatArea = document.createElement('div');
  chatArea.className = 'chat';
  chatArea.id = 'chat-area';

  // Welcome screen (shown when no active conversation)
  chatArea.appendChild(welcomeScreen.render());

  main.appendChild(chatArea);

  const status = document.createElement('div');
  status.className = 'app-status';
  status.id = 'app-status';
  status.hidden = true;
  main.appendChild(status);

  main.appendChild(inputArea.render());
  app.appendChild(main);

  app.appendChild(profileModal.render());

  // Initial state
  sidebar.updateHistory();
  sidebar.updateUser();
  sidebar.updateApiStatus();
  inputArea.setApiConfigured(isApiKeyConfigured());
  renderChatView();

  // Focus input
  inputArea.focus();
}

// ---- Chat Operations ----

function startNewChat() {
  if (!canChangeConversation()) return;

  const activeConversation = chatEngine.getActiveConversation();
  if (activeConversation?.messages.length === 0) {
    clearStatusMessage();
    inputArea.focus();
    return;
  }

  chatEngine.createConversation();
  clearStatusMessage();
  renderChatView();
  sidebar.updateHistory();
  inputArea.focus();
}

function switchToChat(id) {
  if (id === chatEngine.activeConversationId) return;
  if (!canChangeConversation()) return;

  chatEngine.switchConversation(id);
  clearStatusMessage();
  renderChatView();
  sidebar.updateHistory();
  inputArea.focus();
}

function deleteChat(id) {
  if (!canChangeConversation()) return;

  const deletedConversation = chatEngine.deleteConversation(id);
  if (!deletedConversation) return;

  renderChatView();
  sidebar.updateHistory();
  setStatusMessage('Conversation deleted.', 'neutral', {
    label: 'Undo',
    onClick: () => {
      if (!chatEngine.restoreConversation(deletedConversation)) return;
      renderChatView();
      sidebar.updateHistory();
      setStatusMessage('Conversation restored.', 'success');
    },
  });
}

function canChangeConversation() {
  if (!chatEngine.isStreaming) return true;
  setStatusMessage('Stop the current response before changing conversations.', 'neutral');
  return false;
}

function renderChatView() {
  const chatArea = document.getElementById('chat-area');
  if (!chatArea) return;

  chatArea.innerHTML = '';

  const conversation = chatEngine.getActiveConversation();

  if (!conversation || conversation.messages.length === 0) {
    // Show welcome screen
    chatArea.appendChild(welcomeScreen.render());
    return;
  }

  // Create message container
  const container = document.createElement('div');
  container.className = 'chat__container';
  container.id = 'chat-container';

  // Render all messages
  conversation.messages.forEach(msg => {
    if (msg.role === 'user') {
      container.appendChild(renderUserMessage(msg));
    } else {
      container.appendChild(renderAiMessage(msg));
    }
  });

  chatArea.appendChild(container);
  scrollToBottom();
}

function sendMessage(content) {
  if (chatEngine.isStreaming) return false;

  if (!isApiKeyConfigured()) {
    setStatusMessage('Add a Gemini API key in Settings before starting an analysis.', 'error');
    inputArea.focus();
    return false;
  }

  clearStatusMessage();

  // Ensure chat view is active
  const conversation = chatEngine.getActiveConversation();
  if (!conversation) {
    chatEngine.createConversation();
  }

  // Make sure we have a container
  let container = document.getElementById('chat-container');
  if (!container) {
    const chatArea = document.getElementById('chat-area');
    chatArea.innerHTML = '';
    container = document.createElement('div');
    container.className = 'chat__container';
    container.id = 'chat-container';
    chatArea.appendChild(container);
  }

  inputArea.setStreaming(true);

  // Engine callbacks for this message
  chatEngine.onMessageAdded = (msg) => {
    container.appendChild(renderUserMessage(msg));
    scrollToBottom();

    // Show typing indicator
    container.appendChild(createTypingIndicator());
    scrollToBottom();
  };

  chatEngine.onStreamChunk = (chunk, fullText, aiMsg) => {
    // Replace typing indicator with streaming message on first chunk
    removeTypingIndicator();
    let streamEl = document.getElementById('streaming-message');
    if (!streamEl) {
      streamEl = createStreamingMessage();
      container.appendChild(streamEl);
    }
    updateStreamingMessage(fullText);
    scrollToBottom();
  };

  chatEngine.onStreamComplete = (aiMsg) => {
    finalizeStreamingMessage(aiMsg);
    inputArea.setStreaming(false);
    inputArea.focus();
    sidebar.updateHistory();
    clearStatusMessage();
    scrollToBottom();
  };

  chatEngine.onStreamError = (error) => {
    removeTypingIndicator();
    document.getElementById('streaming-message')?.remove();
    inputArea.setStreaming(false);
    inputArea.focus();
    setStatusMessage(error.message, 'error');
    console.error('Stream error:', error);
  };

  chatEngine.onStreamCancelled = (aiMsg) => {
    removeTypingIndicator();
    if (aiMsg) {
      finalizeStreamingMessage(aiMsg);
    } else {
      document.getElementById('streaming-message')?.remove();
    }
    inputArea.setStreaming(false);
    inputArea.focus();
    sidebar.updateHistory();
    setStatusMessage(
      aiMsg ? 'Generation stopped. Partial answer saved.' : 'Generation stopped.',
      'neutral'
    );
    scrollToBottom();
  };

  chatEngine.onConversationsChanged = () => {
    sidebar.updateHistory();
  };

  chatEngine.sendMessage(content);
  return true;
}

function stopGeneration() {
  chatEngine.cancelStream();
}

// ---- Utilities ----

function scrollToBottom() {
  const chatArea = document.getElementById('chat-area');
  if (chatArea) {
    requestAnimationFrame(() => {
      chatArea.scrollTop = chatArea.scrollHeight;
    });
  }
}

function setStatusMessage(message, type = 'neutral', action = null) {
  const status = document.getElementById('app-status');
  if (!status) return;

  status.hidden = false;
  status.className = `app-status app-status--${type}`;
  status.replaceChildren();

  const text = document.createElement('span');
  text.textContent = message;
  status.appendChild(text);

  if (action) {
    const button = document.createElement('button');
    button.className = 'app-status__action';
    button.type = 'button';
    button.textContent = action.label;
    button.addEventListener('click', action.onClick, { once: true });
    status.appendChild(button);
  }
}

function clearStatusMessage() {
  const status = document.getElementById('app-status');
  if (!status) return;

  status.hidden = true;
  status.replaceChildren();
  status.className = 'app-status';
}

// ---- Boot ----
async function boot() {
  let apiKeyError = null;
  try {
    await initializeApiKey();
  } catch (error) {
    apiKeyError = error;
  }

  buildApp();
  if (apiKeyError) {
    setStatusMessage(apiKeyError.message || 'Could not access the saved Gemini key.', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
