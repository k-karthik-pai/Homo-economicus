/**
 * InputArea — Message textarea with auto-resize and send button
 */

export class InputArea {
  constructor({ onSend }) {
    this.onSend = onSend;
    this.disabled = false;
  }

  render() {
    const area = document.createElement('div');
    area.className = 'input-area';
    area.id = 'input-area';

    area.innerHTML = `
      <div class="input-area__container">
        <div class="input-area__wrapper">
          <textarea
            class="input-area__textarea"
            id="chat-input"
            placeholder="Describe your decision scenario..."
            rows="1"
            aria-label="Type your message"
          ></textarea>
          <button class="input-area__send" id="btn-send" title="Send message" disabled>
            ➤
          </button>
        </div>
        <div class="input-area__hint">
          Homo Economicus applies scientific theories to help you decide rationally.
        </div>
      </div>
    `;

    const textarea = area.querySelector('#chat-input');
    const sendBtn = area.querySelector('#btn-send');

    // Auto-resize textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
      sendBtn.disabled = !textarea.value.trim();
    });

    // Send on Enter (Shift+Enter for newline)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (textarea.value.trim() && !this.disabled) {
          this._send(textarea, sendBtn);
        }
      }
    });

    // Send button click
    sendBtn.addEventListener('click', () => {
      if (textarea.value.trim() && !this.disabled) {
        this._send(textarea, sendBtn);
      }
    });

    return area;
  }

  _send(textarea, sendBtn) {
    const content = textarea.value.trim();
    if (!content) return;

    this.onSend(content);
    textarea.value = '';
    textarea.style.height = 'auto';
    sendBtn.disabled = true;
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    const textarea = document.getElementById('chat-input');
    const sendBtn = document.getElementById('btn-send');
    if (textarea) textarea.disabled = disabled;
    if (sendBtn) sendBtn.disabled = disabled || !textarea?.value.trim();
  }

  focus() {
    document.getElementById('chat-input')?.focus();
  }
}
