'use strict';
/* Чистая логика: сетка, диапазоны, допустимые ответы. Работает в браузере и в node. */
(function () {
  const R = (typeof window !== 'undefined' ? window.RANGES : global.window.RANGES);
  const RANGES = R.ranges, SECTIONS = R.sections;
  const RANKS = 'AKQJT98765432';
  const ACT_RU = { open: 'Рейз', '3bet': '3-бет', '4bet': '4-бет', '5bet': '5-бет', call: 'Колл' };
  const ACT_CLS = { open: 'a-open', '3bet': 'a-3bet', '4bet': 'a-4bet', '5bet': 'a-5bet', call: 'a-call' };

  const CELLS = [];
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
    const hand = i === j ? RANKS[i] + RANKS[j] : (i < j ? RANKS[i] + RANKS[j] + 's' : RANKS[j] + RANKS[i] + 'o');
    CELLS.push({ i, j, hand });
  }
  const combos = (h) => h.length === 2 ? 6 : (h.endsWith('s') ? 4 : 12);
  const WEIGHTED = CELLS.flatMap(c => Array(combos(c.hand)).fill(c.hand));

  const actionList = (scen, action) => (RANGES[scen] && RANGES[scen][action]) || [];
  function actionsOf(scen, hand) {
    const o = RANGES[scen] || {}, out = [];
    for (const a in o) if (o[a].indexOf(hand) >= 0) out.push(a);
    return out;
  }
  function acceptable(scen, hand) {
    const acts = actionsOf(scen, hand).filter(a => a !== 'mixed');
    if (acts.length) return acts;
    if (actionsOf(scen, hand).indexOf('mixed') >= 0) return Object.keys(RANGES[scen] || {}).filter(a => a !== 'mixed');
    return [];
  }
  function scenarioName(key) {
    for (const s of SECTIONS) for (const it of s.items) if (it.key === key) return it.name;
    return key;
  }
  function pctOfHands(list) { return list.reduce((n, h) => n + combos(h), 0) / 1326 * 100; }
  function chartPct(scen) { return pctOfHands(actionList(scen, 'open')); }
  function actionPct(scen, action) { return pctOfHands(actionList(scen, action)); }
  function scenariosIn(sectionKey) {
    const s = SECTIONS.find(x => x.key === sectionKey);
    return s ? s.items.map(i => i.key) : [];
  }

  const API = { RANGES, SECTIONS, RANKS, ACT_RU, ACT_CLS, CELLS, WEIGHTED, combos,
    actionList, actionsOf, acceptable, scenarioName, chartPct, actionPct, scenariosIn };
  if (typeof window !== 'undefined') window.Logic = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
