import {
  API_KEY_STORAGE_KEY,
  clearApiKey,
  getAvailableApiKey,
  isApiKeyConfigured,
  saveApiKey,
  useDemoMode,
  useGeminiMode,
} from '../api/gemini.js';

export class ApiKeyModal {
  constructor(onSave) {
    this.onSave = onSave;
    this.handleEscape = (event) => {
      if (event.key === 'Escape') this.close();
    };
    this.render();
  }

  render() {
    const hasAvailableKey = !!getAvailableApiKey();
    const isGeminiActive = isApiKeyConfigured();
    const hasBrowserKey = hasStoredBrowserKey();

    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay modal-overlay--visible';
    document.body.appendChild(this.overlay);

    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    this.overlay.appendChild(modal);

    modal.innerHTML = `
      <button class="auth-modal__close" id="api-key-close" aria-label="Close">✕</button>
      <div class="auth-modal__icon">◇</div>
      <h2 class="auth-modal__title">AI Mode</h2>
      <p class="auth-modal__subtitle">
        Homo Economicus works immediately with the built-in demo advisor. Add a Gemini API key to use live AI responses.
      </p>

      <div class="api-key-status ${isGeminiActive ? 'api-key-status--connected' : ''}">
        ${getStatusText(hasAvailableKey, isGeminiActive)}
      </div>

      <form class="auth-modal__form" id="api-key-form">
        <input
          class="auth-modal__input"
          id="api-key-input"
          type="password"
          placeholder="${hasAvailableKey ? 'Enter a new key to replace the current one' : 'AIzaSy...'}"
          autocomplete="off"
          aria-label="Gemini API key"
        >
        <button class="auth-modal__submit" type="submit">Save Gemini Key</button>
      </form>

      <p class="api-key-help">
        Keys are stored only in this browser's local storage. For a production app, use a backend API proxy instead.
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Get a key</a>.
      </p>

      <button class="auth-modal__guest" id="api-key-demo">Continue in Demo Mode</button>
      ${hasAvailableKey && !isGeminiActive ? '<button class="auth-modal__guest" id="api-key-live">Use Available Gemini Key</button>' : ''}
      ${hasBrowserKey ? '<button class="auth-modal__guest auth-modal__guest--danger" id="api-key-clear">Clear Saved Key</button>' : ''}
    `;

    const input = modal.querySelector('#api-key-input');
    const form = modal.querySelector('#api-key-form');

    modal.addEventListener('click', event => event.stopPropagation());
    this.overlay.addEventListener('click', () => this.close());
    modal.querySelector('#api-key-close').addEventListener('click', () => this.close());
    modal.querySelector('#api-key-demo').addEventListener('click', () => {
      useDemoMode();
      this.onSave?.('demo');
      this.close();
    });

    modal.querySelector('#api-key-live')?.addEventListener('click', () => {
      useGeminiMode();
      this.onSave?.('saved');
      this.close();
    });

    modal.querySelector('#api-key-clear')?.addEventListener('click', () => {
      clearApiKey();
      this.onSave?.('cleared');
      this.close();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const key = input.value.trim();
      if (key) {
        saveApiKey(key);
        this.onSave?.('saved');
        this.close();
      } else {
        input.focus();
        input.setAttribute('aria-invalid', 'true');
      }
    });

    document.addEventListener('keydown', this.handleEscape);
    window.setTimeout(() => input.focus(), 0);
  }

  close() {
    if (this.overlay) {
      this.overlay.classList.remove('modal-overlay--visible');
      setTimeout(() => this.overlay.remove(), 300); // match fade-out duration
      document.removeEventListener('keydown', this.handleEscape);
    }
  }
}

function hasStoredBrowserKey() {
  try {
    return !!localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch {
    return false;
  }
}

function getStatusText(hasAvailableKey, isGeminiActive) {
  if (isGeminiActive) return 'Gemini key detected. Live AI mode is active.';
  if (hasAvailableKey) return 'Demo advisor mode is active. A Gemini key is available but paused.';
  return 'Demo advisor mode is active.';
}
