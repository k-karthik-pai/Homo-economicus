/**
 * Gemini API Integration
 * 
 * Handles communication with Google's Gemini API.
 * Supports both streaming and non-streaming responses.
 */

import { SYSTEM_PROMPT } from './systemPrompt.js';

// Retrieve API key from localStorage (set via ApiKeyModal). Fallback to env for legacy support.
function getApiKey() {
  const stored = localStorage.getItem('gemini_api_key');
  if (stored) return stored;
  // fallback to env variable (if still present)
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// Ordered list from most capable to least capable (only models with non‑zero quota)
const MODELS = [
  'gemini-3.5-flash',
  'gemini-3-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
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
    onError(new Error('API key not configured. Please enter your Gemini API key.'));
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

  // Recursive attempt that falls back through MODELS when a rate‑limit error occurs.
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
        // If we hit a quota or rate‑limit error, try the next model.
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error?.message || `API error: ${response.status} ${response.statusText}`;
        if (response.status === 429 || /quota|rate limit/i.test(msg)) {
          if (modelIndex + 1 < MODELS.length) {
            return attempt(modelIndex + 1); // fallback to next model
          }
        }
        throw new Error(msg);
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
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullText += text;
                onChunk(text, fullText);
              }
            } catch { /* ignore malformed chunks */ }
          }
        }
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
  // Returns true if an API key is present either in localStorage or env
  return !!getApiKey();
}
