import {
  clearApiKey,
  isApiKeyConfigured,
  saveApiKey,
} from '../api/gemini.js';
import { trapModalFocus } from './modalFocus.js';

export class ApiKeyModal {
  constructor(onSave) {
    this.onSave = onSave;
    this.handleEscape = (event) => {
      if (event.key === 'Escape') this.close();
    };
    this.render();
  }

  render() {
    const isGeminiActive = isApiKeyConfigured();
    const isDesktop = !!window.homoEconomicusDesktop;

    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay modal-overlay--visible';
    document.body.appendChild(this.overlay);

    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'api-key-title');
    this.overlay.appendChild(modal);

    modal.innerHTML = `
      <button class="auth-modal__close" id="api-key-close" aria-label="Close">✕</button>
      <div class="auth-modal__icon">◆</div>
      <h2 class="auth-modal__title" id="api-key-title">Gemini Settings</h2>
      <p class="auth-modal__subtitle">
        Add your Gemini API key to run live decision analysis. Nothing is sent until you submit a scenario.
      </p>

      <div class="api-key-status ${isGeminiActive ? 'api-key-status--connected' : ''}">
        ${isGeminiActive ? 'Gemini is connected.' : 'Gemini is not connected yet.'}
      </div>

      <form class="auth-modal__form" id="api-key-form">
        <input
          class="auth-modal__input"
          id="api-key-input"
          type="password"
          placeholder="${isGeminiActive ? 'Enter a new key to replace the current one' : 'AIzaSy...'}"
          autocomplete="off"
          maxlength="1024"
          spellcheck="false"
          aria-label="Gemini API key"
        >
        <div class="auth-modal__message" id="api-key-message" role="status"></div>
        <button class="auth-modal__submit" id="api-key-submit" type="submit">Save Gemini Key</button>
      </form>

      <p class="api-key-help">
        ${isDesktop
          ? 'Your key is encrypted with Windows secure storage and stays on this device.'
          : 'Your key is stored in this browser only. Do not use a shared browser profile.'}
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Get a key</a>.
      </p>

      ${isGeminiActive ? '<button class="auth-modal__guest auth-modal__guest--danger" id="api-key-clear" type="button">Clear Saved Key</button>' : ''}
    `;

    const input = modal.querySelector('#api-key-input');
    const form = modal.querySelector('#api-key-form');

    modal.addEventListener('click', event => event.stopPropagation());
    this.overlay.addEventListener('click', () => this.close());
    modal.querySelector('#api-key-close').addEventListener('click', () => this.close());

    modal.querySelector('#api-key-clear')?.addEventListener('click', async () => {
      this._setBusy(true);
      try {
        await clearApiKey();
        this.onSave?.('cleared');
        this.close();
      } catch (error) {
        this._showError(error.message || 'Could not clear the saved key.');
        this._setBusy(false);
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const key = input.value.trim();
      if (key) {
        this._setBusy(true);
        try {
          await saveApiKey(key);
          this.onSave?.('saved');
          this.close();
        } catch (error) {
          this._showError(error.message || 'Could not save the Gemini key.');
          this._setBusy(false);
        }
      } else {
        input.focus();
        input.setAttribute('aria-invalid', 'true');
      }
    });

    this.releaseFocus = trapModalFocus(this.overlay, () => this.close());
    window.setTimeout(() => input.focus(), 0);
  }

  close() {
    if (this.overlay && !this.isClosing) {
      this.isClosing = true;
      this.overlay.classList.remove('modal-overlay--visible');
      setTimeout(() => this.overlay.remove(), 300); // match fade-out duration
      document.removeEventListener('keydown', this.handleEscape);
      this.releaseFocus?.();
    }
  }

  _setBusy(isBusy) {
    const input = this.overlay?.querySelector('#api-key-input');
    const submit = this.overlay?.querySelector('#api-key-submit');
    const clear = this.overlay?.querySelector('#api-key-clear');
    if (input) input.disabled = isBusy;
    if (submit) {
      submit.disabled = isBusy;
      submit.textContent = isBusy ? 'Saving...' : 'Save Gemini Key';
    }
    if (clear) clear.disabled = isBusy;
  }

  _showError(message) {
    const error = this.overlay?.querySelector('#api-key-message');
    if (!error) return;
    error.textContent = message;
    error.classList.add('auth-modal__message--visible');
  }
}
