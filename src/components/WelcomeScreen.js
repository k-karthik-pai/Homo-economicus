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
      <div class="welcome__icon">⚖</div>
      <h1 class="welcome__title">Homo Economicus</h1>
      <p class="welcome__tagline">"The rational mind for irrational times"</p>
      <div class="welcome__examples">
        ${EXAMPLES.map((ex, i) => `
          <button class="welcome__example-card" data-index="${i}">
            <div class="welcome__example-icon">${ex.icon}</div>
            <div>${ex.text}</div>
          </button>
        `).join('')}
      </div>
    `;

    // Attach click handlers
    welcome.querySelectorAll('.welcome__example-card').forEach(card => {
      card.addEventListener('click', () => {
        const index = parseInt(card.dataset.index);
        this.onExampleClick(EXAMPLES[index].text);
      });
    });

    return welcome;
  }
}
