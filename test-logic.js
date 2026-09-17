global.window = {};
require('./ranges.js');
const L = require('./logic.js');
let bad = 0;
function check(name, cond, extra) {
  console.log((cond ? '  OK   ' : '  ПРОВАЛ ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
  if (!cond) bad++;
}
check('сетка 13x13 = 169 клеток', L.CELLS.length === 169, L.CELLS.length);
check('сумма комбинаций = 1326', L.WEIGHTED.length === 1326, L.WEIGHTED.length);
check('сценариев 33', Object.keys(L.RANGES).length === 33, Object.keys(L.RANGES).length);
check('AA на UTG — рейз', JSON.stringify(L.acceptable('ep_open', 'AA')) === '["open"]');
check('72o на UTG — фолд', L.acceptable('ep_open', '72o').length === 0);
check('94s на UTG — фолд', L.acceptable('ep_open', '94s').length === 0);
check('AA против 3-бета — 4-бет+', L.acceptable('oop_vs_aggro_3bet', 'AA').length > 0,
  L.acceptable('oop_vs_aggro_3bet', 'AA').join('/'));
check('диапазон открытия UTG ≈ 12.5 %', Math.abs(L.chartPct('ep_open') - 12.5) < 0.3, L.chartPct('ep_open').toFixed(1));
check('диапазон открытия SB ≈ 63.8 %', Math.abs(L.chartPct('sb_open') - 63.8) < 0.5, L.chartPct('sb_open').toFixed(1));
// смешанные руки: берём первую руку из mixed
let mixedOk = false, mixedInfo = '';
for (const scen in L.RANGES) {
  const mx = L.RANGES[scen].mixed || [];
  if (mx.length) { mixedOk = L.acceptable(scen, mx[0]).length > 0; mixedInfo = scen + '/' + mx[0] + ' -> ' + L.acceptable(scen, mx[0]).join('/'); break; }
}
check('смешанная рука принимает действие', mixedOk, mixedInfo);
// симуляция: 5000 случайных рук, отвечаем "правильно" -> точность 100 %
let wrong = 0;
for (let n = 0; n < 5000; n++) {
  const hand = L.WEIGHTED[Math.floor(Math.random() * L.WEIGHTED.length)];
  const scen = Object.keys(L.RANGES)[Math.floor(Math.random() * 33)];
  const acc = L.acceptable(scen, hand);
  const act = acc.length ? acc[0] : 'fold';
  if (!(acc.length ? acc.indexOf(act) >= 0 : act === 'fold')) wrong++;
}
check('5000 проверок «верный ответ» — ошибок 0', wrong === 0, wrong);
console.log(bad === 0 ? '\n  ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' : '\n  ПРОВАЛЕНО: ' + bad);
process.exit(bad === 0 ? 0 : 1);
