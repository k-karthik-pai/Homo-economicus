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
import { Sidebar } from './components/Sidebar.js';
import { InputArea } from './components/InputArea.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { AuthModal } from './components/AuthModal.js';
import { ApiKeyModal } from './components/ApiKeyModal.js';

// ---- Initialize Engine ----
const chatEngine = new ChatEngine();

// ---- Initialize Components ----
const sidebar = new Sidebar(chatEngine, {
  onNewChat: () => startNewChat(),
  onSwitchChat: (id) => switchToChat(id),
  onDeleteChat: (id) => deleteChat(id),
  onAuthClick: () => handleAuthClick(),
  onApiClick: () => {
    new ApiKeyModal((status) => {
      sidebar.updateApiStatus();
      if (status === 'saved') {
        showToast('Gemini API key saved. Live AI mode is on.', 'success');
      }
      if (status === 'cleared') {
        showToast('API key cleared. Demo advisor mode is on.', 'success');
      }
      if (status === 'demo') {
        showToast('Demo advisor mode is on.', 'success');
      }
    });
  },
});

const inputArea = new InputArea({
  onSend: (content) => sendMessage(content),
});

const welcomeScreen = new WelcomeScreen({
  onExampleClick: (text) => sendMessage(text),
});

const authModal = new AuthModal({
  onLogin: (user) => {
    chatEngine.setUser(user);
    sidebar.updateUser();
    showToast(`Welcome, ${user.name}!`, 'success');
  },
  onGuest: () => {
    showToast('Continuing as guest', 'success');
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
  main.appendChild(inputArea.render());
  app.appendChild(main);

  // Auth modal
  app.appendChild(authModal.render());

  // Toast notification
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.id = 'app-toast';
  app.appendChild(toast);

  // Initial state
  sidebar.updateHistory();
  sidebar.updateUser();
  sidebar.updateApiStatus();
  renderChatView();

  // Focus input
  inputArea.focus();
}

// ---- Chat Operations ----

function startNewChat() {
  chatEngine.createConversation();
  renderChatView();
  sidebar.updateHistory();
  inputArea.focus();
}

function switchToChat(id) {
  chatEngine.switchConversation(id);
  renderChatView();
  sidebar.updateHistory();
}

function deleteChat(id) {
  chatEngine.deleteConversation(id);
  renderChatView();
  sidebar.updateHistory();
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

async function sendMessage(content) {
  if (chatEngine.isStreaming) return;

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

  // Disable input while streaming
  inputArea.setDisabled(true);

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
    inputArea.setDisabled(false);
    inputArea.focus();
    sidebar.updateHistory();
    scrollToBottom();
  };

  chatEngine.onStreamError = (error) => {
    removeTypingIndicator();
    document.getElementById('streaming-message')?.remove();
    inputArea.setDisabled(false);
    inputArea.focus();
    showToast(`Error: ${error.message}`, 'error');
    console.error('Stream error:', error);
  };

  chatEngine.onConversationsChanged = () => {
    sidebar.updateHistory();
  };

  await chatEngine.sendMessage(content);
}

// ---- Auth ----

function handleAuthClick() {
  if (chatEngine.isLoggedIn()) {
    // Show logout option
    if (confirm('Sign out?')) {
      chatEngine.logout();
      sidebar.updateUser();
      showToast('Signed out', 'success');
    }
  } else {
    authModal.show();
  }
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

function showToast(message, type = 'error') {
  const toast = document.getElementById('app-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast toast--visible toast--${type}`;

  setTimeout(() => {
    toast.className = 'toast';
  }, 4000);
}

// ---- Boot ----
document.addEventListener('DOMContentLoaded', buildApp);
