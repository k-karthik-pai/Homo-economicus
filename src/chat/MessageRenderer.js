/**
 * MessageRenderer — Renders chat messages to the DOM
 * 
 * Handles markdown-like formatting, theory badges,
 * typing indicators, and streaming text display.
 */

import { THEORY_MAP } from '../api/systemPrompt.js';

/**
 * Render a user message bubble
 */
export function renderUserMessage(message) {
  const div = document.createElement('div');
  div.className = 'message message--user';
  div.id = message.id;
  div.innerHTML = `
    <div class="message__avatar">
      <span>U</span>
    </div>
    <div class="message__body">
      <div class="message__content">${escapeHtml(message.content)}</div>
    </div>
  `;
  return div;
}

/**
 * Render an AI message bubble (complete)
 */
export function renderAiMessage(message) {
  const div = document.createElement('div');
  div.className = 'message message--ai';
  div.id = message.id;

  const theoriesHtml = renderTheoryBadges(message.theories || []);

  div.innerHTML = `
    <div class="message__avatar">
      <span>⚖</span>
    </div>
    <div class="message__body">
      <div class="message__content">${formatMarkdown(message.content)}</div>
      ${theoriesHtml ? `<div class="message__theories">${theoriesHtml}</div>` : ''}
    </div>
  `;
  return div;
}

/**
 * Create a streaming AI message container (initially empty)
 */
export function createStreamingMessage() {
  const div = document.createElement('div');
  div.className = 'message message--ai';
  div.id = 'streaming-message';
  div.innerHTML = `
    <div class="message__avatar">
      <span>⚖</span>
    </div>
    <div class="message__body">
      <div class="message__content streaming-cursor"></div>
    </div>
  `;
  return div;
}

/**
 * Update the streaming message content
 */
export function updateStreamingMessage(fullText) {
  const el = document.querySelector('#streaming-message .message__content');
  if (el) {
    el.innerHTML = formatMarkdown(cleanStreamingContent(fullText));
  }
}

/**
 * Finalize the streaming message — remove cursor, add theories
 */
export function finalizeStreamingMessage(message) {
  const el = document.getElementById('streaming-message');
  if (!el) return;

  el.id = message.id;
  const content = el.querySelector('.message__content');
  if (content) {
    content.classList.remove('streaming-cursor');
    content.innerHTML = formatMarkdown(message.content);
  }

  // Add theory badges
  if (message.theories?.length > 0) {
    const theoriesDiv = document.createElement('div');
    theoriesDiv.className = 'message__theories';
    theoriesDiv.innerHTML = renderTheoryBadges(message.theories);
    el.querySelector('.message__body').appendChild(theoriesDiv);
  }
}

/**
 * Create a typing indicator
 */
export function createTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'typing-indicator';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="typing-indicator__avatar">
      <span>⚖</span>
    </div>
    <div class="typing-indicator__dots">
      <div class="typing-indicator__dot"></div>
      <div class="typing-indicator__dot"></div>
      <div class="typing-indicator__dot"></div>
    </div>
  `;
  return div;
}

/**
 * Remove the typing indicator
 */
export function removeTypingIndicator() {
  document.getElementById('typing-indicator')?.remove();
}

/**
 * Render theory badges HTML
 */
function renderTheoryBadges(theories) {
  return theories
    .map(theoryId => {
      const theory = THEORY_MAP[theoryId];
      if (!theory) return '';
      return `
        <span class="theory-badge ${theory.cssClass}">
          <span>${theory.emoji}</span>
          <span>${theory.name}</span>
          <span class="theory-badge__tooltip">${theory.tooltip}</span>
        </span>
      `;
    })
    .join('');
}

/**
 * Clean THEORIES_USED line from streaming content
 */
function cleanStreamingContent(text) {
  return text.replace(/\n?THEORIES_USED:\s*.*/i, '').trim();
}

/**
 * Simple markdown to HTML converter
 */
function formatMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h3>$1</h3>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists (numbered)
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Paragraphs — wrap remaining text blocks
  html = html
    .split('\n\n')
    .map(block => {
      block = block.trim();
      if (!block) return '';
      if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol') || block.startsWith('<blockquote') || block.startsWith('<pre')) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
