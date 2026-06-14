/**
 * WelcomeScreen — Landing state with example scenario cards
 */

const EXAMPLES = [
  {
    label: 'Career',
    text: 'Should I accept a lower-paying job that I\'m passionate about?',
  },
  {
    label: 'Fairness',
    text: 'How do I split costs fairly with my roommates?',
  },
  {
    label: 'Capital',
    text: 'Should I invest in stocks or pay off my student debt first?',
  },
  {
    label: 'Strategy',
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
      <div class="welcome__eyebrow">
        <span class="welcome__eyebrow-dot"></span>
        Decision intelligence for high-stakes trade-offs
      </div>
      <h1 class="welcome__title">What decision are we optimizing?</h1>
      <p class="welcome__subtitle">
        Bring the messy context. Homo Economicus will pressure-test incentives, uncertainty,
        trade-offs, and cognitive bias through rigorous decision theory.
      </p>
      <div class="welcome__frameworks" aria-label="Supported decision frameworks">
        <span>Game Theory</span>
        <span>Bayesian</span>
        <span>Prospect Theory</span>
        <span>Expected Utility</span>
      </div>
      <div class="welcome__cards">
        ${EXAMPLES.map((ex, i) => `
          <button class="welcome__card" data-index="${i}">
            <div class="welcome__card-label">${ex.label}</div>
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
