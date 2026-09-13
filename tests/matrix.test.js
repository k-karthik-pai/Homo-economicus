import test from 'node:test';
import assert from 'node:assert/strict';
import { exampleDecision, rankDecision, validateDecision, decisionReport } from '../src/decision/matrix.js';

test('weighted ranking uses normalized priorities', () => {
  const decision = exampleDecision();
  const ranking = rankDecision(decision);
  assert.equal(ranking[0].name, 'Established company');
  assert.equal(ranking[0].score, 7.15);
  decision.criteria.forEach(c => { c.weight /= 2; });
  assert.deepEqual(rankDecision(decision), ranking);
});
test('changing a priority can change the leader', () => {
  const decision = exampleDecision();
  decision.criteria.forEach(c => { c.weight = c.name === 'Autonomy' ? 100 : 0; });
  assert.equal(rankDecision(decision)[0].name, 'Freelance');
});
test('zero weights have no ranking and no NaN report', () => {
  const decision = exampleDecision();
  decision.criteria.forEach(c => { c.weight = 0; });
  assert.deepEqual(rankDecision(decision), []);
  assert.match(decisionReport(decision), /positive weight/);
});
test('malformed and out-of-range stored matrices are rejected', () => {
  assert.equal(Boolean(validateDecision(null)), false);
  const decision = exampleDecision();
  decision.criteria[0].scores[0] = 11;
  assert.equal(validateDecision(decision), false);
  assert.throws(() => rankDecision(decision));
});
