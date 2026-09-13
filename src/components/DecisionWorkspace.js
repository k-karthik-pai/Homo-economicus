import { STORAGE_KEY, exampleDecision, validateDecision, rankDecision, decisionReport } from '../decision/matrix.js';

export function downloadText(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class DecisionWorkspace {
  constructor(onDiscuss) {
    this.onDiscuss = onDiscuss;
    this.decision = exampleDecision();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (validateDecision(saved)) this.decision = saved;
    } catch { /* Start from the example when storage is unavailable or malformed. */ }
  }

  render() {
    this.element = document.createElement('section');
    this.element.className = 'decision-workspace';
    this.element.setAttribute('aria-label', 'Decision comparison');
    this.draw();
    return this.element;
  }

  draw() {
    const d = this.decision;
    this.element.innerHTML = `
      <div class="workspace-heading"><div><p class="workspace-kicker">DECISION LAB / LOCAL WORKSPACE</p>
        <h1>Make the trade-offs visible.</h1>
        <p>Compare your options, weight what matters, and see what changes the result.</p></div>
        <span class="workspace-badge">No account or API key needed</span></div>
      <div class="decision-title-row"><label>Decision<input id="decision-title" maxlength="120"></label>
        <button type="button" id="export-decision">Download report</button></div>
      <div class="matrix-layout"><section class="matrix-editor" aria-label="Scores and priorities">
        <div class="section-heading"><h2>Scores & priorities</h2><span>0 = worst / 10 = best</span></div>
        <div class="matrix-scroll"><table><caption class="sr-only">Option scores and criterion weights</caption><thead><tr><th scope="col">Criterion</th><th scope="col">Weight</th>
          ${d.options.map((_, i) => `<th scope="col"><input data-option="${i}" aria-label="Option ${i + 1} name" maxlength="60"><button type="button" class="remove" data-remove-option="${i}" aria-label="Remove option ${i + 1}" ${d.options.length <= 2 ? 'disabled' : ''}>&times;</button></th>`).join('')}
          <th scope="col"><span class="sr-only">Remove criterion</span></th></tr></thead><tbody>
          ${d.criteria.map((c, i) => `<tr><th scope="row"><input data-criterion="${i}" aria-label="Criterion ${i + 1} name" maxlength="60"></th>
            <td><input type="number" min="0" max="100" step="1" data-weight="${i}" aria-label="Criterion ${i + 1} weight" value="${c.weight}"></td>
            ${c.scores.map((s, j) => `<td><input type="number" min="0" max="10" step="0.5" data-score="${i},${j}" aria-label="Criterion ${i + 1}, option ${j + 1} score" value="${s}"></td>`).join('')}
            <td><button type="button" class="remove" data-remove-criterion="${i}" aria-label="Remove criterion ${i + 1}" ${d.criteria.length <= 1 ? 'disabled' : ''}>&times;</button></td></tr>`).join('')}
        </tbody></table></div>
        <div class="matrix-actions"><button id="add-option" type="button" ${d.options.length >= 5 ? 'disabled' : ''}>+ Option</button>
          <button id="add-criterion" type="button" ${d.criteria.length >= 8 ? 'disabled' : ''}>+ Criterion</button>
          <span id="save-state" role="status">Saved on this device</span></div>
      </section><aside class="matrix-results" aria-label="Comparison results"><p class="workspace-kicker">WEIGHTED RANKING</p><div id="ranking" aria-live="polite"></div>
        <p class="method-note">Your priorities drive this result. It is a comparison of your inputs, not a prediction.</p>
        <button type="button" id="discuss-decision" class="primary-action">Discuss with Gemini</button></aside></div>
      <details class="method-details"><summary>How the comparison works</summary><p>Each option's score is the sum of its weighted criterion scores divided by the total weight. Weights do not need to add to 100. Give higher scores to better outcomes, including lower cost or lower risk. A zero weight excludes that criterion.</p><p>This additive model assumes independent criteria. It does not account for hard constraints, uncertainty, or interactions between criteria. Change a weight or score to test how stable your ranking is.</p></details>
      <p class="workspace-footer">Illustrative career example preloaded. All fields are editable. <a href="https://github.com/k-karthik-pai/Homo-economicus" target="_blank" rel="noreferrer">Source on GitHub</a></p>`;
    const q = s => this.element.querySelector(s);
    q('#decision-title').value = d.title;
    this.element.querySelectorAll('[data-option]').forEach(e => { e.value = d.options[Number(e.dataset.option)]; });
    this.element.querySelectorAll('[data-criterion]').forEach(e => { e.value = d.criteria[Number(e.dataset.criterion)].name; });
    this.element.oninput = event => {
      const e = event.target;
      if (e.type === 'number' && !e.validity.valid) return;
      if (e.id === 'decision-title') d.title = e.value;
      if (e.dataset.option !== undefined) d.options[Number(e.dataset.option)] = e.value;
      if (e.dataset.criterion !== undefined) d.criteria[Number(e.dataset.criterion)].name = e.value;
      if (e.dataset.weight !== undefined) d.criteria[Number(e.dataset.weight)].weight = Number(e.value);
      if (e.dataset.score !== undefined) {
        const [i, j] = e.dataset.score.split(',').map(Number);
        d.criteria[i].scores[j] = Number(e.value);
      }
      this.save();
      this.updateRanking();
    };
    this.element.onchange = event => {
      if (event.target.type === 'number' && !event.target.validity.valid) {
        event.target.reportValidity();
        this.draw();
      }
    };
    q('#add-option').onclick = () => {
      d.options.push(`Option ${d.options.length + 1}`);
      d.criteria.forEach(c => c.scores.push(5));
      this.save(); this.draw();
    };
    q('#add-criterion').onclick = () => {
      d.criteria.push({ name: 'New criterion', weight: 20, scores: d.options.map(() => 5) });
      this.save(); this.draw();
    };
    this.element.querySelectorAll('[data-remove-option]').forEach(e => { e.onclick = () => {
      const i = Number(e.dataset.removeOption);
      d.options.splice(i, 1); d.criteria.forEach(c => c.scores.splice(i, 1)); this.save(); this.draw();
    }; });
    this.element.querySelectorAll('[data-remove-criterion]').forEach(e => { e.onclick = () => {
      d.criteria.splice(Number(e.dataset.removeCriterion), 1); this.save(); this.draw();
    }; });
    q('#export-decision').onclick = () => downloadText(decisionReport(d), 'decision-report.md');
    q('#discuss-decision').onclick = () => this.onDiscuss(`Help me critically evaluate this decision. Challenge my assumptions, ask about missing constraints, and explain what could change the ranking.\n\n${decisionReport(d)}`);
    this.updateRanking();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.decision));
      this.element.querySelector('#save-state').textContent = 'Saved on this device';
    } catch {
      this.element.querySelector('#save-state').textContent = 'Storage unavailable. Download a report to keep your work.';
    }
  }

  updateRanking() {
    const ranking = rankDecision(this.decision);
    const element = this.element.querySelector('#ranking');
    element.replaceChildren();
    if (!ranking.length) { element.textContent = 'Add a positive weight to see results.'; return; }
    const heading = document.createElement('h2');
    const tied = Math.abs(ranking[0].score - ranking[1].score) < 0.000001;
    heading.textContent = tied ? 'A shared lead' : ranking[0].name;
    element.append(heading);
    const gap = document.createElement('p');
    gap.className = 'ranking-gap';
    gap.textContent = tied ? 'Your top options are tied.' : `${(ranking[0].score - ranking[1].score).toFixed(2)} points ahead of the next option`;
    element.append(gap);
    ranking.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'rank-row';
      const label = document.createElement('span');
      label.textContent = `${i + 1}. ${r.name}`;
      const value = document.createElement('strong');
      value.textContent = `${r.score.toFixed(2)} / 10`;
      const bar = document.createElement('progress');
      bar.max = 10; bar.value = r.score; bar.setAttribute('aria-label', `${r.name} score`);
      row.append(label, value, bar); element.append(row);
    });
  }
}
