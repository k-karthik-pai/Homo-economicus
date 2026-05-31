/**
 * WelcomeScreen — Landing state with example scenario cards
 */

const EXAMPLES = [
  {
    icon: '💼',
    text: 'Should I accept a lower-paying job that I\'m passionate about?',
  },
  {
    icon: '🏠',
    text: 'How do I split costs fairly with my roommates?',
  },
  {
    icon: '📈',
    text: 'Should I invest in stocks or pay off my student debt first?',
  },
  {
    icon: '🤝',
    text: 'How should I negotiate a salary raise with my boss?',
  },
];

export class WelcomeScreen {
  constructor({ onExampleClick }) {
    this.onExampleClick = onExampleClick;
  }

  render() {
    const welcome = document.createElement('div');
    welcome.className = 'welcome';
    welcome.id = 'welcome-screen';

    welcome.innerHTML = `
      <div class="welcome__icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
      </div>
      <h1 class="welcome__title">Homo Economicus</h1>
      <p class="welcome__subtitle">The rational mind for irrational times</p>
      <div class="welcome__cards">
        ${EXAMPLES.map((ex, i) => `
          <button class="welcome__card" data-index="${i}">
            <div class="welcome__card-icon">${ex.icon}</div>
            <div class="welcome__card-text">${ex.text}</div>
          </button>
        `).join('')}
      </div>
    `;

    // Attach click handlers
    welcome.querySelectorAll('.welcome__card').forEach(card => {
      card.addEventListener('click', () => {
        const index = parseInt(card.dataset.index);
        this.onExampleClick(EXAMPLES[index].text);
      });
    });

    return welcome;
  }
}
