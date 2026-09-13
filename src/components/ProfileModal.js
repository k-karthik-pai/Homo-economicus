/**
 * ProfileModal — Optional device-local display name.
 */

import { trapModalFocus } from './modalFocus.js';

export class ProfileModal {
  constructor({ getUser, onSave, onClear }) {
    this.getUser = getUser;
    this.onSave = onSave;
    this.onClear = onClear;
    this.handleEscape = (event) => {
      if (event.key === 'Escape') this.hide();
    };
  }

  render() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'profile-overlay';

    overlay.innerHTML = `
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button class="auth-modal__close" id="profile-close" type="button" aria-label="Close">✕</button>
        <div class="auth-modal__icon">U</div>
        <h2 class="auth-modal__title" id="profile-title">Local Profile</h2>
        <p class="auth-modal__subtitle">
          Add an optional display name for this device. Your conversations stay local either way.
        </p>

        <form class="auth-modal__form" id="profile-form">
          <input
            class="auth-modal__input"
            id="profile-name"
            type="text"
            placeholder="Your name"
            aria-label="Display name"
            autocomplete="name"
            maxlength="60"
            required
          >
          <button class="auth-modal__submit" type="submit">Save Profile</button>
        </form>

        <button class="auth-modal__guest auth-modal__guest--danger" id="profile-clear" type="button">
          Remove Local Profile
        </button>
      </div>
    `;

    overlay.querySelector('.auth-modal').addEventListener('click', event => event.stopPropagation());
    overlay.addEventListener('click', event => {
      if (event.target === overlay) this.hide();
    });
    overlay.querySelector('#profile-close').addEventListener('click', () => this.hide());
    overlay.querySelector('#profile-form').addEventListener('submit', event => {
      event.preventDefault();
      const input = overlay.querySelector('#profile-name');
      const name = input.value.trim();
      if (!name) {
        input.focus();
        return;
      }
      this.onSave({ name });
      this.hide();
    });
    overlay.querySelector('#profile-clear').addEventListener('click', () => {
      this.onClear();
      this.hide();
    });

    return overlay;
  }

  show() {
    const overlay = document.getElementById('profile-overlay');
    const input = document.getElementById('profile-name');
    const clearButton = document.getElementById('profile-clear');
    if (!overlay || !input || !clearButton) return;

    const user = this.getUser();
    input.value = user?.name || '';
    clearButton.hidden = !user;
    overlay.classList.add('modal-overlay--visible');
    this.releaseFocus = trapModalFocus(overlay, () => this.hide());
    window.setTimeout(() => input.focus(), 0);
  }

  hide() {
    document.getElementById('profile-overlay')?.classList.remove('modal-overlay--visible');
    document.removeEventListener('keydown', this.handleEscape);
    this.releaseFocus?.();
  }
}
