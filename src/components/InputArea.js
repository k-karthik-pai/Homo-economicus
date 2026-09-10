/**
 * InputArea — Message textarea with auto-resize and send/stop button
 */

export class InputArea {
  constructor({ onSend, onCancel }) {
    this.onSend = onSend;
    this.onCancel = onCancel;
    this.disabled = false;
    this.streaming = false;
    this.apiConfigured = false;
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
            placeholder="Describe the decision, constraints, stakeholders, and what you are optimizing for..."
            rows="1"
            aria-label="Type your message"
          ></textarea>
          <button class="input-area__send" id="btn-send" title="Send message" aria-label="Send message" disabled>
            ➤
          </button>
        </div>
        <div class="input-area__hint" id="input-hint">
          Requires Gemini. Press Enter to send, Shift+Enter for a new line.
        </div>
      </div>
    `;

    const textarea = area.querySelector('#chat-input');
    const sendBtn = area.querySelector('#btn-send');

    // Auto-resize textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
      this._syncControls();
    });

    // Send on Enter (Shift+Enter for newline)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (textarea.value.trim() && !this.disabled) {
          this._send(textarea);
        }
      }
    });

    // Send button click
    sendBtn.addEventListener('click', () => {
      if (this.streaming) {
        this.onCancel?.();
        return;
      }

      if (textarea.value.trim() && !this.disabled) {
        this._send(textarea);
      }
    });

    return area;
  }

  _send(textarea) {
    const content = textarea.value.trim();
    if (!content) return;

    const accepted = this.onSend(content);
    if (accepted === false) return;

    textarea.value = '';
    textarea.style.height = 'auto';
    this._syncControls();
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    this._syncControls();
  }

  setStreaming(streaming) {
    this.streaming = streaming;
    this.disabled = streaming;
    this._syncControls();
  }

  setApiConfigured(configured) {
    this.apiConfigured = configured;
    this._syncControls();
  }

  _syncControls() {
    const textarea = document.getElementById('chat-input');
    const sendBtn = document.getElementById('btn-send');
    const hint = document.getElementById('input-hint');

    if (textarea) textarea.disabled = this.disabled;

    if (sendBtn) {
      sendBtn.disabled = this.streaming ? false : this.disabled || !textarea?.value.trim();
      sendBtn.textContent = this.streaming ? '■' : '➤';
      sendBtn.title = this.streaming ? 'Stop generating' : 'Send message';
      sendBtn.setAttribute('aria-label', this.streaming ? 'Stop generating' : 'Send message');
      sendBtn.classList.toggle('input-area__send--stop', this.streaming);
    }

    if (hint) {
      hint.textContent = this.streaming
        ? 'Generating response. Stop if you want to keep the partial answer.'
        : this.apiConfigured
          ? 'Press Enter to send, Shift+Enter for a new line.'
          : 'Requires Gemini. Press Enter to send, Shift+Enter for a new line.';
    }
  }

  focus() {
    document.getElementById('chat-input')?.focus();
  }
}
