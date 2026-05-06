/**
 * Gemini API Integration
 * 
 * Handles communication with Google's Gemini API.
 * Supports both streaming and non-streaming responses.
 */

import { SYSTEM_PROMPT } from './systemPrompt.js';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.0-flash';

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

  if (!API_KEY || API_KEY === 'your_api_key_here') {
    onError(new Error('API key not configured. Please add your Gemini API key to the .env file.'));
    return controller;
  }

  const contents = conversationHistory.map(msg => ({
    role: msg.role === 'ai' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents,
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 4096,
    },
  };

  const url = `${API_BASE}/${MODEL}:streamGenerateContent?alt=sse&key=${API_KEY}`;

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.error?.message || `API error: ${response.status} ${response.statusText}`
        );
      }

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
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }

      onComplete(fullText);
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    });

  return controller;
}

/**
 * Check if the API key is configured
 */
export function isApiKeyConfigured() {
  return API_KEY && API_KEY !== 'your_api_key_here';
}
