/**
 * Local decision advisor
 *
 * Gives the prototype a useful offline mode when no Gemini key is configured
 * or when the remote model is temporarily unavailable.
 */

const THEORY_DETAILS = {
  'rational-choice': {
    label: 'Rational Choice Theory',
    insight: 'compare the options against the same goals, constraints, and utility criteria instead of reacting to the loudest feeling in the moment',
  },
  'game-theory': {
    label: 'Game Theory',
    insight: 'map the incentives of the other people involved so your move remains strong after they respond',
  },
  'prospect-theory': {
    label: 'Prospect Theory',
    insight: 'separate real downside from loss aversion, fear of regret, and the pull of the current reference point',
  },
  bayesian: {
    label: 'Bayesian Decision Theory',
    insight: 'treat uncertainty as something to update with evidence rather than something to solve by guessing harder',
  },
  'nudge-theory': {
    label: 'Nudge Theory',
    insight: 'change the environment so the rational choice becomes easier to repeat',
  },
  'expected-utility': {
    label: 'Expected Utility Theory',
    insight: 'weigh upside, downside, probability, and personal value before picking the highest headline payoff',
  },
  minimax: {
    label: 'Minimax / Maximin',
    insight: 'protect against the worst acceptable outcome when the probabilities are too murky to trust',
  },
  pareto: {
    label: 'Pareto Optimality',
    insight: 'look for agreements where at least one party improves without making another party worse off',
  },
  'sunk-cost': {
    label: 'Sunk Cost Awareness',
    insight: 'ignore money, time, or effort that cannot be recovered and judge the decision from today forward',
  },
  'opportunity-cost': {
    label: 'Opportunity Cost Analysis',
    insight: 'make the next-best alternative explicit so the true cost of the choice is visible',
  },
};

const THEORY_ORDER = [
  'rational-choice',
  'expected-utility',
  'bayesian',
  'game-theory',
  'pareto',
  'prospect-theory',
  'minimax',
  'nudge-theory',
  'sunk-cost',
  'opportunity-cost',
];

const CATEGORY_RULES = [
  {
    id: 'negotiation',
    pattern: /\b(negotiate|negotiation|salary|raise|boss|offer|deal|contract|client|vendor)\b/i,
  },
  {
    id: 'finance',
    pattern: /\b(invest|investment|stocks?|debt|loan|mortgage|savings?|money|price|cost|salary|pay|budget|rent)\b/i,
  },
  {
    id: 'career',
    pattern: /\b(job|career|company|startup|promotion|quit|resign|offer|manager|work|role|passion)\b/i,
  },
  {
    id: 'shared',
    pattern: /\b(roommate|partner|spouse|friend|family|team|cofounder|split|fair|shared|together)\b/i,
  },
  {
    id: 'uncertain',
    pattern: /\b(uncertain|probability|chance|likely|risk|unknown|evidence|data|forecast|assume|estimate)\b/i,
  },
  {
    id: 'habit',
    pattern: /\b(habit|routine|diet|exercise|study|sleep|focus|procrastinate|discipline|environment)\b/i,
  },
  {
    id: 'commitment',
    pattern: /\b(already|spent|invested|years?|months?|deposit|nonrefundable|too late|wasted|sunk)\b/i,
  },
];

export function streamLocalAnalysis(conversationHistory, onChunk, onComplete, onError, options = {}) {
  const { signal, reason = 'no-key' } = options;

  try {
    const response = buildLocalAnalysis(conversationHistory, reason);
    const chunks = chunkText(response);
    let fullText = '';
    let index = 0;

    const emit = () => {
      if (signal?.aborted) return;

      if (index >= chunks.length) {
        onComplete(fullText);
        return;
      }

      const chunk = chunks[index];
      index += 1;
      fullText += chunk;
      onChunk(chunk, fullText);
      window.setTimeout(emit, 18);
    };

    window.setTimeout(emit, 120);
  } catch (error) {
    onError(error);
  }
}

export function buildLocalAnalysis(conversationHistory, reason = 'no-key') {
  const scenario = getLatestUserMessage(conversationHistory);
  const categories = detectCategories(scenario);
  const theories = selectTheories(categories, scenario);
  const recommendation = buildRecommendation(categories, scenario);
  const tradeoffs = buildTradeoffs(categories);
  const biases = buildBiases(categories);
  const note = getModeNote(reason);

  return `${note}
### 🎯 Rational Recommendation
${recommendation}

### 📐 Theories Applied
${theories.map(id => `- **${THEORY_DETAILS[id].label}**: Use this to ${THEORY_DETAILS[id].insight}.`).join('\n')}

### ⚖️ Trade-off Analysis
${tradeoffs.map(item => `- ${item}`).join('\n')}

### 🧠 Cognitive Biases to Watch
${biases.map(item => `- ${item}`).join('\n')}

THEORIES_USED: ${theories.join(', ')}`;
}

function getLatestUserMessage(conversationHistory) {
  const latest = [...conversationHistory].reverse().find(message => message.role === 'user');
  return latest?.content?.trim() || 'I need help making a rational decision.';
}

function detectCategories(scenario) {
  const categories = new Set();

  CATEGORY_RULES.forEach(rule => {
    if (rule.pattern.test(scenario)) categories.add(rule.id);
  });

  if (categories.size === 0) categories.add('general');
  return categories;
}

function selectTheories(categories, scenario) {
  const selected = new Set(['rational-choice', 'opportunity-cost']);

  if (categories.has('finance')) {
    selected.add('expected-utility');
    selected.add('prospect-theory');
  }

  if (categories.has('career')) {
    selected.add('expected-utility');
    selected.add('prospect-theory');
  }

  if (categories.has('negotiation')) {
    selected.add('game-theory');
    selected.add('pareto');
  }

  if (categories.has('shared')) {
    selected.add('game-theory');
    selected.add('pareto');
  }

  if (categories.has('uncertain') || /\?/.test(scenario)) {
    selected.add('bayesian');
    selected.add('minimax');
  }

  if (categories.has('habit')) {
    selected.add('nudge-theory');
  }

  if (categories.has('commitment')) {
    selected.add('sunk-cost');
  }

  return THEORY_ORDER.filter(id => selected.has(id)).slice(0, 6);
}

function buildRecommendation(categories, scenario) {
  const normalizedScenario = scenario.replace(/\s+/g, ' ').trim();

  if (categories.has('negotiation')) {
    return `Treat this as a cooperative negotiation, not a one-shot demand. Before acting, define your walk-away point, your ideal outcome, and two package offers that trade low-cost items for high-value gains. Then open with objective evidence and ask for a specific next step. For this scenario: "${normalizedScenario}", the rational move is to prepare your alternatives first, then negotiate from documented value rather than urgency.`;
  }

  if (categories.has('shared')) {
    return `Make the rule explicit before debating the outcome. List each person's constraints, define what "fair" means, and propose a transparent rule that can be reused later. For this scenario: "${normalizedScenario}", the rational move is to choose a rule everyone would accept before knowing whether it favors them this time.`;
  }

  if (categories.has('finance')) {
    return `Do not choose by headline payoff alone. Build a three-column comparison: expected financial value, downside risk, and flexibility preserved. Pick the option that gives the best risk-adjusted outcome while keeping enough liquidity for emergencies. For this scenario: "${normalizedScenario}", the rational move is to quantify the downside first, then only pursue upside that you can survive being wrong about.`;
  }

  if (categories.has('career')) {
    return `Run a 12-month utility test. Score each path on learning, income stability, energy, future optionality, and reputation capital. Choose the path with the highest total score after removing sunk costs and fear of disappointing others. For this scenario: "${normalizedScenario}", the rational move is to prefer the option that expands future choices without violating your non-negotiable constraints.`;
  }

  if (categories.has('habit')) {
    return `Do not rely on willpower as the main strategy. Shrink the desired action, attach it to an existing routine, and remove one friction point that keeps pulling you toward the old behavior. For this scenario: "${normalizedScenario}", the rational move is to redesign the environment so the better choice becomes the default.`;
  }

  return `Use a reversible test instead of trying to solve the whole decision in your head. Define the main options, choose the one with the best expected upside-to-regret ratio, and run the smallest experiment that would reveal new information. For this scenario: "${normalizedScenario}", the rational move is to act in a way that buys information while limiting irreversible downside.`;
}

function buildTradeoffs(categories) {
  if (categories.has('negotiation')) {
    return [
      'You gain leverage and clarity, but you may slow the conversation while preparing evidence.',
      'You preserve the relationship by offering packages, but you give up the simplicity of a single hard demand.',
      'A clear walk-away point reduces panic, but it may reveal that no acceptable deal is available.',
    ];
  }

  if (categories.has('shared')) {
    return [
      'A reusable fairness rule lowers future conflict, but it may not maximize your one-time advantage.',
      'Transparency builds trust, but it can surface uncomfortable differences in priorities.',
      'A Pareto-improving compromise may be less emotionally satisfying than "winning" the argument.',
    ];
  }

  if (categories.has('finance')) {
    return [
      'You reduce catastrophic downside, but you may pass on an option with attractive upside.',
      'Keeping liquidity protects flexibility, but it can feel inefficient when returns elsewhere look tempting.',
      'Quantifying probabilities improves discipline, but the estimates will still be imperfect.',
    ];
  }

  if (categories.has('career')) {
    return [
      'Optimizing for future optionality may beat short-term comfort, but it can require temporary uncertainty.',
      'A scorecard makes trade-offs visible, but it cannot fully capture identity, energy, or meaning.',
      'Choosing one path means deliberately giving up the learning and network effects of the other.',
    ];
  }

  return [
    'A small experiment reduces regret, but it may delay a final commitment.',
    'Prioritizing reversibility preserves options, but some high-upside choices require commitment.',
    'Making criteria explicit improves rationality, but it can expose that your preferences are in tension.',
  ];
}

function buildBiases(categories) {
  const biases = [
    '**Status quo bias**: Do not treat the current path as safer simply because it is familiar.',
    '**Confirmation bias**: Look for evidence that would change your mind, not just evidence that comforts you.',
  ];

  if (categories.has('finance') || categories.has('career')) {
    biases.push('**Loss aversion**: A possible loss can feel larger than an equal or greater gain, so compare actual magnitudes.');
  }

  if (categories.has('commitment')) {
    biases.push('**Sunk cost fallacy**: Past effort is not a reason to keep paying future costs.');
  }

  if (categories.has('shared') || categories.has('negotiation')) {
    biases.push('**Reactive devaluation**: Do not undervalue a good proposal just because it comes from the other side.');
  }

  if (biases.length < 4) {
    biases.push('**Planning fallacy**: Add a margin for time, complexity, and emotional friction.');
  }

  return biases.slice(0, 4);
}

function getModeNote(reason) {
  if (reason === 'demo') {
    return '> Prototype note: Demo Advisor mode is active, so this answer was generated by the built-in local advisor.';
  }

  if (reason === 'remote-unavailable') {
    return '> Prototype note: Gemini was unavailable, so this answer was generated by the built-in local advisor.';
  }

  return '> Prototype note: No Gemini API key is configured, so this answer was generated by the built-in local advisor.';
}

function chunkText(text) {
  return text.match(/[\s\S]{1,28}/g) || [text];
}
