import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatEngine } from '../src/chat/ChatEngine.js';

function setup() {
  const data = new Map([['gemini_api_key', 'test-key']]);
  globalThis.localStorage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  return data;
}
test('missing key completes the error lifecycle', async () => {
  const data = setup(); data.delete('gemini_api_key');
  const engine = new ChatEngine();
  const error = new Promise(resolve => { engine.onStreamError = resolve; });
  await engine.sendMessage('Hello');
  assert.equal((await error).code, 'API_KEY_MISSING');
  assert.equal(engine.isStreaming, false);
});
test('rate limits do not retry another model', async () => {
  setup(); let requests = 0;
  globalThis.fetch = async () => { requests++; return new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), { status: 429 }); };
  const engine = new ChatEngine();
  const error = new Promise(resolve => { engine.onStreamError = resolve; });
  await engine.sendMessage('Hello');
  assert.equal((await error).code, 'RATE_LIMITED'); assert.equal(requests, 1);
});
test('fragmented SSE decodes Unicode and excludes thought parts', async () => {
  setup();
  const bytes = new TextEncoder().encode(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ thought: true, text: 'private thought' }, { text: 'Consider caf\u00e9 costs.\nTHEORIES_USED: opportunity-cost' }] } }] })}\n\n`);
  globalThis.fetch = async () => new Response(new ReadableStream({ start(c) { for (const b of bytes) c.enqueue(new Uint8Array([b])); c.close(); } }));
  const engine = new ChatEngine();
  const done = new Promise(resolve => { engine.onStreamComplete = resolve; });
  await engine.sendMessage('Hello');
  const message = await done;
  assert.equal(message.content, 'Consider caf\u00e9 costs.');
  assert.deepEqual(message.theories, ['opportunity-cost']);
});
test('network failure retains the partial answer as incomplete', async () => {
  setup(); let stream;
  globalThis.fetch = async () => new Response(new ReadableStream({ start(c) { stream = c; c.enqueue(new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"Useful partial answer"}]}}]}\n\n')); } }));
  const engine = new ChatEngine();
  engine.onStreamChunk = () => stream.error(new TypeError('network disconnected'));
  const failed = new Promise(resolve => { engine.onStreamError = resolve; });
  await engine.sendMessage('Hello'); await failed;
  assert.equal(engine.getActiveMessages()[1].content, 'Useful partial answer');
  assert.equal(engine.getActiveMessages()[1].interrupted, true);
  assert.equal(engine.isStreaming, false);
});
