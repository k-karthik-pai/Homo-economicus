/* src/components/ApiKeyModal.js */

export class ApiKeyModal {
  constructor(onSave) {
    this.onSave = onSave;
    this.render();
  }

  render() {
    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay modal-overlay--visible';
    document.body.appendChild(this.overlay);

    // Modal container (reusing auth-modal styles for consistency)
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    this.overlay.appendChild(modal);

    const icon = document.createElement('div');
    icon.className = 'auth-modal__icon';
    icon.innerHTML = '🔑';
    modal.appendChild(icon);

    const title = document.createElement('h2');
    title.className = 'auth-modal__title';
    title.textContent = 'Enter API Key';
    modal.appendChild(title);

    const description = document.createElement('p');
    description.className = 'auth-modal__subtitle';
    description.textContent = 'To use Homo Economicus, you need a free Gemini API key. Your key is stored securely in your browser.';
    modal.appendChild(description);

    const form = document.createElement('div');
    form.className = 'auth-modal__form';
    modal.appendChild(form);

    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = 'AIzaSy...';
    input.className = 'auth-modal__input';
    input.autofocus = true;
    form.appendChild(input);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'auth-modal__submit';
    saveBtn.textContent = 'Save Key & Continue';
    form.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'auth-modal__guest';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.marginTop = 'var(--space-4)';
    form.appendChild(cancelBtn);

    saveBtn.addEventListener('click', () => {
      const key = input.value.trim();
      if (key) {
        localStorage.setItem('gemini_api_key', key);
        this.close();
        if (this.onSave) this.onSave(key);
      } else {
        alert('Please enter a valid API key.');
      }
    });

    cancelBtn.addEventListener('click', () => {
      this.close();
    });
  }

  close() {
    if (this.overlay) {
      this.overlay.classList.remove('modal-overlay--visible');
      setTimeout(() => this.overlay.remove(), 300); // match fade-out duration
    }
  }
}
