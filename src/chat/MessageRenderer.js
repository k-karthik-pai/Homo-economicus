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
      <div class="message__bubble">${escapeHtml(message.content)}</div>
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
      <div class="message__bubble">${formatMarkdown(message.content)}</div>
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
      <div class="message__bubble streaming-cursor"></div>
    </div>
  `;
  return div;
}

/**
 * Update the streaming message content
 */
export function updateStreamingMessage(fullText) {
  const el = document.querySelector('#streaming-message .message__bubble');
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
  const content = el.querySelector('.message__bubble');
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
  return text.replace(/\n?THEORIES_USED:\s*[a-z0-9,\-\s]+$/i, '').trim();
}

/**
 * Simple markdown to HTML converter
 */
function formatMarkdown(text) {
  if (!text) return '';

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let listType = null;
  let codeLines = [];
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${paragraph.join('<br>')}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  const openList = (type) => {
    flushParagraph();
    if (listType === type) return;
    closeList();
    listType = type;
    html.push(`<${type}>`);
  };

  const closeCodeBlock = () => {
    html.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
    codeLines = [];
    inCodeBlock = false;
  };

  lines.forEach(rawLine => {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        closeCodeBlock();
      } else {
        flushParagraph();
        closeList();
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(escapeHtml(rawLine));
      return;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      return;
    }

    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      html.push(`<h3>${formatInline(heading[1])}</h3>`);
      return;
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      openList('ul');
      html.push(`<li>${formatInline(unordered[1])}</li>`);
      return;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      openList('ol');
      html.push(`<li>${formatInline(ordered[1])}</li>`);
      return;
    }

    const quote = trimmed.match(/^>\s+(.+)$/);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${formatInline(quote[1])}</blockquote>`);
      return;
    }

    closeList();
    paragraph.push(formatInline(trimmed));
  });

  if (inCodeBlock) closeCodeBlock();
  flushParagraph();
  closeList();

  return html.join('\n');
}

function formatInline(text) {
  const codeSpans = [];
  let html = escapeHtml(text);

  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@CODE_${codeSpans.length}@@`;
    codeSpans.push(`<code>${code}</code>`);
    return token;
  });

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  codeSpans.forEach((code, index) => {
    html = html.replace(`@@CODE_${index}@@`, code);
  });

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
