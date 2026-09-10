import assert from 'node:assert/strict';

import { ChatEngine } from '../src/chat/ChatEngine.js';
import { InputArea } from '../src/components/InputArea.js';
import {
  API_KEY_STORAGE_KEY,
  clearApiKey,
  getApiKey,
  initializeApiKey,
  saveApiKey,
} from '../src/api/gemini.js';

class MemoryStorage {
  constructor() {
    this.items = new Map();
  }

  getItem(key) {
    return this.items.get(key) || null;
  }

  setItem(key, value) {
    this.items.set(key, String(value));
  }

  removeItem(key) {
    this.items.delete(key);
  }
}

globalThis.localStorage = new MemoryStorage();

await verifiesCancelledStreamIsSavedAsPartial();
await verifiesDesktopKeyMigration();
verifiesRejectedSendKeepsDraft();
verifiesStopButtonStaysEnabledDuringStreaming();
verifiesComposerReflectsGeminiStatus();

console.log('Smoke checks passed.');

async function verifiesCancelledStreamIsSavedAsPartial() {
  localStorage.setItem(API_KEY_STORAGE_KEY, 'test-key');
  localStorage.setItem('homo_economicus_accounts', '{"legacy":true}');

  let abortSignal;
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    abortSignal = options.signal;
    const encoder = new TextEncoder();
    const firstChunk = `data: ${JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Partial recommendation with useful context.' }] } }],
    })}\n\n`;

    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(firstChunk));
        abortSignal.addEventListener('abort', () => {
          controller.error(new DOMException('Aborted', 'AbortError'));
        });
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  };

  const engine = new ChatEngine();
  assert.equal(localStorage.getItem('homo_economicus_accounts'), null);
  const sawChunk = new Promise(resolve => {
    engine.onStreamChunk = resolve;
  });

  let cancelledMessage = null;
  engine.onStreamCancelled = message => {
    cancelledMessage = message;
  };

  await engine.sendMessage('Should I accept the new job?');
  await sawChunk;

  assert.doesNotMatch(requestUrl, /test-key/);
  assert.equal(requestOptions.headers['x-goog-api-key'], 'test-key');
  assert.equal(engine.cancelStream(), true);
  assert.equal(engine.isStreaming, false);
  assert.equal(cancelledMessage?.interrupted, true);
  assert.match(cancelledMessage?.content || '', /Partial recommendation/);

  const conversation = engine.getActiveConversation();
  assert.equal(conversation.messages.length, 2);
  assert.equal(conversation.messages[1].interrupted, true);

  const deleted = engine.deleteConversation(conversation.id);
  assert.equal(deleted.id, conversation.id);
  assert.equal(engine.getActiveConversation(), null);
  assert.equal(engine.restoreConversation(deleted), true);
  assert.equal(engine.getActiveConversation().id, conversation.id);
}

async function verifiesDesktopKeyMigration() {
  let secureValue = '';
  const calls = [];
  globalThis.window = {
    homoEconomicusDesktop: {
      apiKey: {
        get: async () => secureValue,
        set: async (key) => {
          calls.push(['set', key]);
          secureValue = key;
        },
        clear: async () => {
          calls.push(['clear']);
          secureValue = '';
        },
      },
    },
  };

  localStorage.setItem(API_KEY_STORAGE_KEY, 'legacy-browser-key');
  await initializeApiKey();

  assert.equal(getApiKey(), 'legacy-browser-key');
  assert.equal(localStorage.getItem(API_KEY_STORAGE_KEY), null);
  assert.deepEqual(calls[0], ['set', 'legacy-browser-key']);

  await saveApiKey('replacement-key');
  assert.equal(getApiKey(), 'replacement-key');
  assert.deepEqual(calls[1], ['set', 'replacement-key']);

  await clearApiKey();
  assert.equal(getApiKey(), '');
  assert.deepEqual(calls[2], ['clear']);

  delete globalThis.window;
}

function verifiesRejectedSendKeepsDraft() {
  const controls = installFakeComposerDom('Do not delete this draft');
  const input = new InputArea({ onSend: () => false });

  input._send(controls.textarea);

  assert.equal(controls.textarea.value, 'Do not delete this draft');
}

function verifiesStopButtonStaysEnabledDuringStreaming() {
  const controls = installFakeComposerDom('Analyze this');
  let input;
  input = new InputArea({
    onSend: () => {
      input.setStreaming(true);
      return true;
    },
    onCancel: () => {},
  });

  input._send(controls.textarea);

  assert.equal(controls.textarea.value, '');
  assert.equal(controls.textarea.disabled, true);
  assert.equal(controls.sendButton.disabled, false);
  assert.equal(controls.sendButton.textContent, '■');
  assert.equal(controls.sendButton.title, 'Stop generating');
  assert.equal(controls.hint.textContent, 'Generating response. Stop if you want to keep the partial answer.');
}

function verifiesComposerReflectsGeminiStatus() {
  const controls = installFakeComposerDom('');
  const input = new InputArea({ onSend: () => true });

  input.setApiConfigured(true);

  assert.equal(controls.hint.textContent, 'Press Enter to send, Shift+Enter for a new line.');
}

function installFakeComposerDom(value) {
  const textarea = {
    value,
    disabled: false,
    style: { height: 'auto' },
  };
  const sendButton = {
    disabled: false,
    textContent: '',
    title: '',
    attributes: {},
    setAttribute(name, nextValue) {
      this.attributes[name] = nextValue;
    },
    classList: {
      values: new Set(),
      toggle(name, force) {
        if (force) {
          this.values.add(name);
        } else {
          this.values.delete(name);
        }
      },
    },
  };
  const hint = { textContent: '' };

  globalThis.document = {
    getElementById(id) {
      if (id === 'chat-input') return textarea;
      if (id === 'btn-send') return sendButton;
      if (id === 'input-hint') return hint;
      return null;
    },
  };

  return { textarea, sendButton, hint };
}
