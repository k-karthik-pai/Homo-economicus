export const STORAGE_KEY = 'homo_economicus_matrix_v1';

export function exampleDecision() {
  return {
    title: 'Choose my next role',
    options: ['Product startup', 'Established company', 'Freelance'],
    criteria: [
      { name: 'Learning & growth', weight: 35, scores: [9, 6, 8] },
      { name: 'Financial stability', weight: 30, scores: [5, 9, 4] },
      { name: 'Work-life balance', weight: 20, scores: [5, 8, 7] },
      { name: 'Autonomy', weight: 15, scores: [8, 5, 10] },
    ],
  };
}

export function validateDecision(value) {
  return value && typeof value.title === 'string' && value.title.length <= 120
    && Array.isArray(value.options) && value.options.length >= 2 && value.options.length <= 5
    && value.options.every(name => typeof name === 'string' && name.length <= 60)
    && Array.isArray(value.criteria) && value.criteria.length >= 1 && value.criteria.length <= 8
    && value.criteria.every(c => c && typeof c.name === 'string' && c.name.length <= 60
      && Number.isFinite(c.weight) && c.weight >= 0 && c.weight <= 100
      && Array.isArray(c.scores) && c.scores.length === value.options.length
      && c.scores.every(n => Number.isFinite(n) && n >= 0 && n <= 10));
}

export function rankDecision(decision) {
  if (!validateDecision(decision)) throw new Error('Invalid decision matrix.');
  const totalWeight = decision.criteria.reduce((sum, c) => sum + c.weight, 0);
  if (!totalWeight) return [];
  return decision.options.map((name, index) => ({
    name: name.trim() || `Option ${index + 1}`,
    index,
    score: decision.criteria.reduce((sum, c) => sum + c.weight * c.scores[index], 0) / totalWeight,
  })).sort((a, b) => b.score - a.score || a.index - b.index);
}

export function decisionReport(decision) {
  const ranking = rankDecision(decision);
  return `# ${decision.title || 'Decision comparison'}\n\n` +
    'Weighted decision matrix. Higher scores are better; scores and weights are subjective inputs.\n\n' +
    decision.criteria.map(c => `- ${c.name || 'Criterion'} (weight ${c.weight}): ` +
      decision.options.map((name, i) => `${name || `Option ${i + 1}`} ${c.scores[i]}/10`).join('; ')).join('\n') +
    '\n\n## Ranking\n\n' + (ranking.length
      ? ranking.map((r, i) => `${i + 1}. ${r.name}: ${r.score.toFixed(2)}/10`).join('\n')
      : 'Set at least one positive weight to calculate a ranking.') +
    '\n\nMethod: sum(weight * score) / sum(weights). This comparison is not a prediction or professional advice.\n';
}
