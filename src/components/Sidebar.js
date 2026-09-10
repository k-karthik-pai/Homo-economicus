/**
 * Sidebar — Navigation, conversation history, and user controls
 */

import { isApiKeyConfigured } from '../api/gemini.js';

export class Sidebar {
  constructor(chatEngine, { onNewChat, onSwitchChat, onDeleteChat, onProfileClick, onApiClick }) {
    this.chatEngine = chatEngine;
    this.onNewChat = onNewChat;
    this.onSwitchChat = onSwitchChat;
    this.onDeleteChat = onDeleteChat;
    this.onProfileClick = onProfileClick;
    this.onApiClick = onApiClick;
    this.isOpen = false;
  }

  render() {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.id = 'sidebar';
    sidebar.setAttribute('aria-label', 'Application navigation');

    sidebar.innerHTML = `
      <div class="sidebar__brand">
        <div class="sidebar__logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 7h18"></path>
            <path d="M12 3v18"></path>
            <path d="M7 21h10"></path>
            <path d="m2 16 3-8 3 8a5 5 0 0 1-6 0Z"></path>
            <path d="m16 16 3-8 3 8a5 5 0 0 1-6 0Z"></path>
          </svg>
        </div>
        <div>
          <div class="sidebar__title">Homo Economicus</div>
          <div class="sidebar__subtitle">Rational Decision Advisor</div>
        </div>
      </div>

      <button class="sidebar__new-chat" id="btn-new-chat" type="button">
        <span>＋</span>
        <span>New Analysis</span>
      </button>

      <div class="sidebar__history-label">Conversations</div>
      <div class="sidebar__history" id="sidebar-history"></div>

      <div class="sidebar__footer">
        <button class="sidebar__user-btn" id="btn-api-key" type="button" style="margin-bottom: var(--space-3);">
          <div class="sidebar__user-avatar" id="api-status-icon" style="background: var(--bg-tertiary); box-shadow: none;">○</div>
          <span id="api-status-label">Connect Gemini</span>
        </button>
        <button class="sidebar__user-btn" id="btn-user" type="button">
          <div class="sidebar__user-avatar" id="user-avatar">?</div>
          <span id="user-name">Set Profile</span>
        </button>
      </div>
    `;

    // Toggle button (mobile)
    const toggle = document.createElement('button');
    toggle.className = 'sidebar__toggle';
    toggle.id = 'sidebar-toggle';
    toggle.innerHTML = '☰';
    toggle.type = 'button';
    toggle.title = 'Open navigation';
    toggle.setAttribute('aria-label', 'Open navigation');
    toggle.setAttribute('aria-controls', 'sidebar');
    toggle.setAttribute('aria-expanded', 'false');
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
      this.onProfileClick();
      this.close();
    });

    sidebar.querySelector('#btn-api-key').addEventListener('click', () => {
      if (this.onApiClick) this.onApiClick();
      this.close();
    });

    this.sidebarElement = sidebar;
    this.toggleElement = toggle;
    this.mobileQuery = window.matchMedia('(max-width: 768px)');
    this.mobileQuery.addEventListener?.('change', () => this._syncAccessibility());
    this._syncAccessibility();

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
          No conversations yet.<br>Start a new analysis.
        </div>
      `;
      return;
    }

    container.innerHTML = conversations.map(conv => `
      <div class="sidebar__history-item ${conv.id === activeId ? 'sidebar__history-item--active' : ''}"
           data-id="${conv.id}" role="button" tabindex="0"
           ${conv.id === activeId ? 'aria-current="true"' : ''}>
        <span>💬</span>
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${this._escapeHtml(conv.title)}</span>
        <button class="sidebar__history-item__delete" data-delete-id="${conv.id}" type="button" title="Delete" aria-label="Delete conversation">✕</button>
      </div>
    `).join('');

    // Attach click handlers
    container.querySelectorAll('.sidebar__history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.sidebar__history-item__delete')) return;
        this.onSwitchChat(item.dataset.id);
        this.close();
      });
      item.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (event.target.closest('.sidebar__history-item__delete')) return;
        event.preventDefault();
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
      name.textContent = 'Set Profile';
    }
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    document.getElementById('sidebar')?.classList.add('sidebar--open');
    document.getElementById('sidebar-overlay')?.classList.add('sidebar-overlay--visible');
    document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', 'true');
    this._syncAccessibility();
    this.sidebarElement?.querySelector('#btn-new-chat')?.focus();
  }

  close() {
    this.isOpen = false;
    const focusWasInside = this.sidebarElement?.contains(document.activeElement);
    document.getElementById('sidebar')?.classList.remove('sidebar--open');
    document.getElementById('sidebar-overlay')?.classList.remove('sidebar-overlay--visible');
    document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', 'false');
    this._syncAccessibility();
    if (focusWasInside && this.mobileQuery?.matches) this.toggleElement?.focus();
  }

  _syncAccessibility() {
    if (!this.sidebarElement || !this.mobileQuery) return;
    const isHiddenMobileSidebar = this.mobileQuery.matches && !this.isOpen;
    this.sidebarElement.toggleAttribute('inert', isHiddenMobileSidebar);
    if (isHiddenMobileSidebar) {
      this.sidebarElement.setAttribute('aria-hidden', 'true');
    } else {
      this.sidebarElement.removeAttribute('aria-hidden');
    }
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
