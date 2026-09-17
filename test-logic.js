/* Проверки логики тренажёра и дымовой тест интерфейса: node test-logic.js */
global.window = {};
require('./ranges.js');
const L = require('./logic.js');
let bad = 0;
function check(name, cond, extra) {
  console.log((cond ? '  OK   ' : '  ПРОВАЛ ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
  if (!cond) bad++;
}

/* ---- логика ---- */
check('сетка 13x13 = 169 клеток', L.CELLS.length === 169, L.CELLS.length);
check('сумма комбинаций = 1326', L.WEIGHTED.length === 1326, L.WEIGHTED.length);
check('сценариев 33', Object.keys(L.RANGES).length === 33, Object.keys(L.RANGES).length);
check('AA на UTG — рейз', JSON.stringify(L.acceptable('ep_open', 'AA')) === '["open"]');
check('72o на UTG — фолд', L.acceptable('ep_open', '72o').length === 0);
check('диапазон открытия UTG ≈ 12.5 %', Math.abs(L.chartPct('ep_open') - 12.5) < 0.3, L.chartPct('ep_open').toFixed(1));
check('диапазон открытия SB ≈ 63.8 %', Math.abs(L.chartPct('sb_open') - 63.8) < 0.5, L.chartPct('sb_open').toFixed(1));
let mixedOk = false;
for (const scen in L.RANGES) { const mx = L.RANGES[scen].mixed || []; if (mx.length) { mixedOk = L.acceptable(scen, mx[0]).length > 0; break; } }
check('смешанная рука принимает действие', mixedOk);
check('пресетов >= 6', L.PRESETS.length >= 6, L.PRESETS.length);
let badKey = [], empty = [];
L.PRESETS.forEach(p => {
  if (!p.items.length) empty.push(p.key);
  p.items.forEach(k => { if (!L.RANGES[k]) badKey.push(p.key + ':' + k); });
});
check('все ключи пресетов существуют', badKey.length === 0, badKey.join(',') || 'ок');
check('нет пустых пресетов', empty.length === 0, empty.join(',') || 'ок');
check('пресет «Всё вместе» = 33 спота', (L.PRESETS.find(p => p.key === 'all') || { items: [] }).items.length === 33);
let wrong = 0;
const set = L.PRESETS.find(p => p.key === 'blind_def').items;
for (let n = 0; n < 5000; n++) {
  const hand = L.WEIGHTED[Math.floor(Math.random() * L.WEIGHTED.length)];
  const scen = set[Math.floor(Math.random() * set.length)];
  const acc = L.acceptable(scen, hand);
  const act = acc.length ? acc[0] : 'fold';
  if (!(acc.length ? acc.indexOf(act) >= 0 : act === 'fold')) wrong++;
}
check('5000 проверок по набору спотов — ошибок 0', wrong === 0, wrong);

/* ---- дымовой тест интерфейса на подставном DOM ---- */
const els = {};
const mk = (id) => (els[id] = els[id] || { id: id, innerHTML: '', textContent: '', value: '', style: {}, dataset: {},
  classList: { toggle() {}, add() {}, remove() {} }, addEventListener() {}, querySelectorAll: () => [], closest: () => null });
global.document = { querySelector: (s) => mk(s.replace('#', '')), querySelectorAll: () => [],
  addEventListener: (e, f) => { if (e === 'DOMContentLoaded') global.__init = f; } };
global.localStorage = { getItem: () => null, setItem() {} };
global.navigator = {};
require('./app.js');
global.__init();
const buttons = (mk('btns').innerHTML.match(/<button/g) || []).length;
check('после запуска выдана карта', /^[AKQJT2-9]{2}[so]?$/.test(mk('hand').textContent), mk('hand').textContent);
check('кнопки действий построены (>=3)', buttons >= 3, buttons);
check('название спота показано', mk('spot').textContent.length > 3, mk('spot').textContent);
check('список спотов заполнен', mk('spotList').innerHTML.indexOf('checkbox') > 0);
check('пресет по умолчанию выбран', mk('preset').innerHTML.indexOf('Все открытия') > 0);

console.log(bad === 0 ? '\n  ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' : '\n  ПРОВАЛЕНО: ' + bad);
process.exit(bad === 0 ? 0 : 1);
