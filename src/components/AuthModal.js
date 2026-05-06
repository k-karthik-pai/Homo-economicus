/**
 * AuthModal — Login / Sign Up / Continue as Guest
 * 
 * For Phase 1, uses localStorage-based accounts.
 * Will be wired to Firebase/Supabase in Phase 2.
 */

const ACCOUNTS_KEY = 'homo_economicus_accounts';

export class AuthModal {
  constructor({ onLogin, onGuest }) {
    this.onLogin = onLogin;
    this.onGuest = onGuest;
    this.mode = 'login'; // 'login' or 'signup'
  }

  render() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'auth-overlay';

    overlay.innerHTML = `
      <div class="auth-modal" id="auth-modal">
        <button class="auth-modal__close" id="auth-close">✕</button>
        <div class="auth-modal__icon">⚖</div>
        <h2 class="auth-modal__title" id="auth-title">Welcome Back</h2>
        <p class="auth-modal__subtitle" id="auth-subtitle">Sign in to save your decision history</p>
        
        <form class="auth-modal__form" id="auth-form">
          <div id="auth-name-field" style="display:none;">
            <input class="auth-modal__input" id="auth-name" type="text" placeholder="Your name" autocomplete="name">
          </div>
          <input class="auth-modal__input" id="auth-email" type="email" placeholder="Email address" autocomplete="email" required>
          <input class="auth-modal__input" id="auth-password" type="password" placeholder="Password" autocomplete="current-password" required>
          <button class="auth-modal__submit" type="submit" id="auth-submit">Sign In</button>
        </form>
        
        <div class="auth-modal__divider">or</div>
        
        <button class="auth-modal__guest" id="auth-guest">
          Continue without signing in →
        </button>
        
        <div class="auth-modal__toggle">
          <span id="auth-toggle-text">Don't have an account? </span>
          <span class="auth-modal__toggle-link" id="auth-toggle-link">Sign Up</span>
        </div>
      </div>
    `;

    // Prevent overlay close when clicking modal
    overlay.querySelector('.auth-modal').addEventListener('click', e => e.stopPropagation());

    // Close button
    overlay.querySelector('#auth-close').addEventListener('click', () => this.hide());

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hide();
    });

    // Toggle login/signup
    overlay.querySelector('#auth-toggle-link').addEventListener('click', () => {
      this.mode = this.mode === 'login' ? 'signup' : 'login';
      this._updateMode();
    });

    // Form submit
    overlay.querySelector('#auth-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleSubmit();
    });

    // Guest button
    overlay.querySelector('#auth-guest').addEventListener('click', () => {
      this.onGuest();
      this.hide();
    });

    return overlay;
  }

  _updateMode() {
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const nameField = document.getElementById('auth-name-field');
    const submit = document.getElementById('auth-submit');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');

    if (this.mode === 'signup') {
      title.textContent = 'Create Account';
      subtitle.textContent = 'Start making rational decisions today';
      nameField.style.display = 'block';
      submit.textContent = 'Create Account';
      toggleText.textContent = 'Already have an account? ';
      toggleLink.textContent = 'Sign In';
    } else {
      title.textContent = 'Welcome Back';
      subtitle.textContent = 'Sign in to save your decision history';
      nameField.style.display = 'none';
      submit.textContent = 'Sign In';
      toggleText.textContent = "Don't have an account? ";
      toggleLink.textContent = 'Sign Up';
    }
  }

  _handleSubmit() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value.trim();

    if (!email || !password) return;

    if (this.mode === 'signup') {
      if (!name) {
        document.getElementById('auth-name').focus();
        return;
      }
      // Create account in localStorage
      const accounts = this._getAccounts();
      if (accounts[email]) {
        this._showToast('Account already exists. Please sign in.', 'error');
        return;
      }
      accounts[email] = { name, email, password: this._hash(password), createdAt: Date.now() };
      this._saveAccounts(accounts);
      this.onLogin({ name, email });
      this.hide();
    } else {
      // Login
      const accounts = this._getAccounts();
      const account = accounts[email];
      if (!account || account.password !== this._hash(password)) {
        this._showToast('Invalid email or password.', 'error');
        return;
      }
      this.onLogin({ name: account.name, email });
      this.hide();
    }
  }

  _getAccounts() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
    } catch {
      return {};
    }
  }

  _saveAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  // Simple hash for demo purposes — NOT production-grade security
  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  _showToast(message, type = 'error') {
    // Use the global toast if available
    const existing = document.getElementById('app-toast');
    if (existing) {
      existing.textContent = message;
      existing.className = `toast toast--visible toast--${type}`;
      setTimeout(() => { existing.className = 'toast'; }, 3000);
    }
  }

  show() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
      overlay.classList.add('modal-overlay--visible');
      // Reset form
      document.getElementById('auth-form')?.reset();
      this.mode = 'login';
      this._updateMode();
    }
  }

  hide() {
    document.getElementById('auth-overlay')?.classList.remove('modal-overlay--visible');
  }
}
