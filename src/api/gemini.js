/**
 * Gemini API Integration
 * 
 * Handles communication with Google's Gemini API.
 * Supports both streaming and non-streaming responses.
 */

import { SYSTEM_PROMPT } from './systemPrompt.js';

export const API_KEY_STORAGE_KEY = 'gemini_api_key';

// Retrieve API key from localStorage (set via ApiKeyModal).
export function getApiKey() {
  const stored = readStorage(API_KEY_STORAGE_KEY);
  if (stored) return stored;
  return '';
}

export function saveApiKey(key) {
  if (!key?.trim()) return;
  writeStorage(API_KEY_STORAGE_KEY, key.trim());
}

export function clearApiKey() {
  removeStorage(API_KEY_STORAGE_KEY);
}

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Ordered from preferred stable model to lower-cost fallbacks.
const MODELS = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

// Helper to get model by index (fallback sequence)
function getModel(index) {
  return MODELS[index] || MODELS[MODELS.length - 1];
}

/**
 * Send a message to Gemini and stream the response.
 * 
 * @param {Array<{role: string, content: string}>} conversationHistory - Chat history
 * @param {function} onChunk - Callback for each text chunk received
 * @param {function} onComplete - Callback when streaming is complete
 * @param {function} onError - Callback on error
 * @returns {AbortController} - Controller to cancel the request
 */
export function streamMessage(conversationHistory, onChunk, onComplete, onError) {
  const controller = new AbortController();
  const currentApiKey = getApiKey();

  if (!currentApiKey) {
    const error = new Error('Gemini API key required. Add your key in Settings to start an analysis.');
    error.code = 'API_KEY_MISSING';
    onError(error);
    return controller;
  }

  // Prepare the request payload (shared for all models)
  const contents = conversationHistory.map(msg => ({
    role: msg.role === 'ai' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const requestBody = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 4096,
    },
  };

  // Recursive attempt that falls back through MODELS when a transient model/API issue occurs.
  const attempt = async (modelIndex = 0) => {
    const model = getModel(modelIndex);
    const url = `${API_BASE}/${model}:streamGenerateContent?alt=sse&key=${currentApiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error?.message || `API error: ${response.status} ${response.statusText}`;
        const error = new Error(msg);
        error.status = response.status;

        if (shouldTryNextModel(error)) {
          if (modelIndex + 1 < MODELS.length) {
            return attempt(modelIndex + 1); // fallback to next model
          }
        }

        throw error;
      }

      if (!response.body) {
        const error = new Error('Gemini returned an empty streaming response.');
        error.status = response.status;
        throw error;
      }

      // ---------- STREAMING RESPONSE ----------
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const parts = parsed?.candidates?.[0]?.content?.parts || [];
              const text = parts.map(part => part.text || '').join('');
              if (text) {
                fullText += text;
                onChunk(text, fullText);
              }
            } catch { /* ignore malformed chunks */ }
          }
        }
      }

      if (!fullText.trim()) {
        const error = new Error('Gemini did not return any text.');
        error.status = response.status;
        throw error;
      }

      onComplete(fullText);
    } catch (err) {
      if (err.name === 'AbortError') return; // request was cancelled
      onError(err);
    }
  };

  // Kick‑off the first attempt (most capable model).
  attempt();

  return controller;
}

/**
 * Check if the API key is configured
 */
export function isApiKeyConfigured() {
  return !!getApiKey();
}

function shouldTryNextModel(error) {
  return error.status === 404
    || error.status === 429
    || error.status >= 500
    || /quota|rate limit|not found|unavailable|overloaded/i.test(error.message);
}

function readStorage(key) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch { /* storage unavailable */ }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch { /* storage unavailable */ }
}
