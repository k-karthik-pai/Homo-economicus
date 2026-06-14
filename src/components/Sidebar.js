/**
 * Sidebar — Navigation, conversation history, and user controls
 */

import { isApiKeyConfigured } from '../api/gemini.js';

export class Sidebar {
  constructor(chatEngine, { onNewChat, onSwitchChat, onDeleteChat, onAuthClick, onApiClick }) {
    this.chatEngine = chatEngine;
    this.onNewChat = onNewChat;
    this.onSwitchChat = onSwitchChat;
    this.onDeleteChat = onDeleteChat;
    this.onAuthClick = onAuthClick;
    this.onApiClick = onApiClick;
    this.isOpen = false;
  }

  render() {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.id = 'sidebar';

    sidebar.innerHTML = `
      <div class="sidebar__brand">
        <div class="sidebar__logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
        </div>
        <div>
          <div class="sidebar__title">Homo Economicus</div>
          <div class="sidebar__subtitle">Rational Decision Advisor</div>
        </div>
      </div>

      <button class="sidebar__new-chat" id="btn-new-chat">
        <span>＋</span>
        <span>New Analysis</span>
      </button>

      <div class="sidebar__history-label">Conversations</div>
      <div class="sidebar__history" id="sidebar-history"></div>

      <div class="sidebar__footer">
        <button class="sidebar__user-btn" id="btn-api-key" style="margin-bottom: var(--space-3);">
          <div class="sidebar__user-avatar" id="api-status-icon" style="background: var(--bg-tertiary); box-shadow: none;">○</div>
          <span id="api-status-label">Connect Gemini</span>
        </button>
        <button class="sidebar__user-btn" id="btn-user">
          <div class="sidebar__user-avatar" id="user-avatar">?</div>
          <span id="user-name">Sign In</span>
        </button>
      </div>
    `;

    // Toggle button (mobile)
    const toggle = document.createElement('button');
    toggle.className = 'sidebar__toggle';
    toggle.id = 'sidebar-toggle';
    toggle.innerHTML = '☰';
    toggle.addEventListener('click', () => this.toggle());

    // Overlay (mobile)
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    overlay.addEventListener('click', () => this.close());

    // Event listeners
    sidebar.querySelector('#btn-new-chat').addEventListener('click', () => {
      this.onNewChat();
      this.close();
    });

    sidebar.querySelector('#btn-user').addEventListener('click', () => {
      this.onAuthClick();
    });

    sidebar.querySelector('#btn-api-key').addEventListener('click', () => {
      if (this.onApiClick) this.onApiClick();
    });

    return { sidebar, toggle, overlay };
  }

  updateHistory() {
    const container = document.getElementById('sidebar-history');
    if (!container) return;

    const conversations = this.chatEngine.getConversationList();
    const activeId = this.chatEngine.activeConversationId;

    if (conversations.length === 0) {
      container.innerHTML = `
        <div style="padding: var(--space-4) var(--space-5); color: var(--text-tertiary); font-size: var(--fs-xs); text-align: center;">
          No conversations yet.<br>Start a new analysis!
        </div>
      `;
      return;
    }

    container.innerHTML = conversations.map(conv => `
      <div class="sidebar__history-item ${conv.id === activeId ? 'sidebar__history-item--active' : ''}"
           data-id="${conv.id}">
        <span>💬</span>
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${this._escapeHtml(conv.title)}</span>
        <button class="sidebar__history-item__delete" data-delete-id="${conv.id}" title="Delete">✕</button>
      </div>
    `).join('');

    // Attach click handlers
    container.querySelectorAll('.sidebar__history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.sidebar__history-item__delete')) return;
        this.onSwitchChat(item.dataset.id);
        this.close();
      });
    });

    container.querySelectorAll('.sidebar__history-item__delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onDeleteChat(btn.dataset.deleteId);
      });
    });
  }

  updateApiStatus() {
    const icon = document.getElementById('api-status-icon');
    const label = document.getElementById('api-status-label');
    if (!icon || !label) return;

    if (isApiKeyConfigured()) {
      icon.textContent = '◆';
      label.textContent = 'Gemini Connected';
    } else {
      icon.textContent = '○';
      label.textContent = 'Connect Gemini';
    }
  }

  updateUser() {
    const avatar = document.getElementById('user-avatar');
    const name = document.getElementById('user-name');
    if (!avatar || !name) return;

    const user = this.chatEngine.getUser();
    if (user) {
      avatar.textContent = user.name.charAt(0).toUpperCase();
      name.textContent = user.name;
    } else {
      avatar.textContent = '?';
      name.textContent = 'Sign In';
    }
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    document.getElementById('sidebar')?.classList.add('sidebar--open');
    document.getElementById('sidebar-overlay')?.classList.add('sidebar-overlay--visible');
  }

  close() {
    this.isOpen = false;
    document.getElementById('sidebar')?.classList.remove('sidebar--open');
    document.getElementById('sidebar-overlay')?.classList.remove('sidebar-overlay--visible');
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
