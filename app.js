'use strict';
const R = window.RANGES, RANGES = R.ranges, SECTIONS = R.sections;
const L = window.Logic;
const { CELLS, WEIGHTED, actionList, actionsOf, acceptable, scenarioName, PRESETS, ACT_RU, ACT_CLS } = L;
const VER = '2026-09-17.4';
const STORE = 'preflopTrainerStats_v1', SETSTORE = 'preflopTrainerSet_v1', DAYSTORE = 'preflopTrainerDays_v1';
const $ = (s) => document.querySelector(s);
const state = { scens: [], scen: null, hand: null, answered: false, ok: null };

/* ---- набор спотов ---- */
function defaultSet() { return (PRESETS[0] && PRESETS[0].items.length) ? PRESETS[0].items.slice() : Object.keys(RANGES).slice(); }
function loadSet() {
  try {
    const s = JSON.parse(localStorage.getItem(SETSTORE));
    if (Array.isArray(s) && s.length) return s.filter(k => RANGES[k]);
  } catch (e) {}
  return defaultSet();
}
function saveSet() { try { localStorage.setItem(SETSTORE, JSON.stringify(state.scens)); } catch (e) {} }
function presetOfSet() {
  const a = state.scens.slice().sort().join(',');
  for (const p of PRESETS) if (p.items.slice().sort().join(',') === a) return p.key;
  return 'custom';
}
function pickScenario() { return state.scens[Math.floor(Math.random() * state.scens.length)]; }

/* ---- статистика ---- */
function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
let stats = load();
function save() { try { localStorage.setItem(STORE, JSON.stringify(stats)); } catch (e) {} }
function bump(scen, hand, wrong) {
  const k = scen + '|' + hand, o = stats[k] || { t: 0, w: 0 };
  o.t++; if (wrong) o.w++;
  stats[k] = o; save();
}
function totals() {
  let t = 0, w = 0;
  for (const k in stats) { t += stats[k].t; w += stats[k].w; }
  return { t, w };
}

/* ---- история по дням ---- */
function loadDays() { try { return JSON.parse(localStorage.getItem(DAYSTORE)) || {}; } catch (e) { return {}; } }
let days = loadDays();
function saveDays() { try { localStorage.setItem(DAYSTORE, JSON.stringify(days)); } catch (e) {} }
function todayKey(d) {
  const x = d || new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}
function logAnswer(scen, hand, wrong) {
  const k = todayKey(), o = days[k] || (days[k] = { t: 0, w: 0, s: {}, h: {} });
  o.t++; if (wrong) o.w++;
  o.s[scen] = o.s[scen] || [0, 0]; o.s[scen][0]++; if (wrong) o.s[scen][1]++;
  o.h[hand] = o.h[hand] || [0, 0]; o.h[hand][0]++; if (wrong) o.h[hand][1]++;
  saveDays();
}
function acc(o) { return o.t ? 100 * (o.t - o.w) / o.t : 0; }

/* ---- сетка ---- */
function gridHTML(scen, markHand) {
  let h = '<div class="grid">';
  for (const c of CELLS) {
    const acts = actionsOf(scen, c.hand).filter(a => a !== 'mixed');
    const cls = acts.length ? (ACT_CLS[acts[0]] || 'a-open') : '';
    const sel = markHand && c.hand === markHand ? ' sel' : '';
    h += '<div class="' + cls + sel + '" data-h="' + c.hand + '">' + c.hand + '</div>';
  }
  return h + '</div>';
}
function legendHTML() {
  return '<div class="legend">'
    + '<span><i style="background:#2ea043"></i>рейз/бет</span>'
    + '<span><i style="background:#2f6fd0"></i>колл</span>'
    + '<span><i style="background:#d9534f"></i>3-бет</span>'
    + '<span><i style="background:#8957e5"></i>4-бет/5-бет</span>'
    + '<span><i style="background:#3b4048"></i>фолд</span>'
    + '<span><i style="background:linear-gradient(45deg,#2ea043 45%,#2f6fd0 55%)"></i>смешанная</span></div>';
}

/* ---- тренировка ---- */
function renderQuiz() {
  const scen = state.scen;
  $('#hand').textContent = state.hand || '—';
  $('#spot').textContent = scenarioName(scen);
  const acts = Object.keys(RANGES[scen] || {}).filter(a => a !== 'mixed');
  const btns = acts.map(a => ({ k: a, label: ACT_RU[a] || a, cls: a === 'call' ? 'c' : 'r' }));
  if (!btns.some(b => b.k === 'call')) btns.push({ k: 'call', label: 'Колл', cls: 'c' });
  btns.push({ k: 'fold', label: 'Фолд', cls: 'f' });
  $('#btns').innerHTML = btns.map(b => '<button class="' + b.cls + '" data-act="' + b.k + '">' + b.label + '</button>').join('');
  const res = $('#res');
  if (!state.answered) res.innerHTML = '';
  else {
    const acc = acceptable(scen, state.hand);
    const names = acc.length ? acc.map(a => ACT_RU[a] || a).join(' / ') : 'Фолд';
    res.innerHTML = state.ok
      ? '<span class="ok">Верно</span> <span class="dim">(' + names + ')</span>'
      : '<span class="bad">Ошибка</span> <span class="dim">надо: ' + names + '</span>';
  }
  const t = totals();
  $('#score').innerHTML = 'Раздач: <b>' + t.t + '</b> · ошибок: <b>' + t.w + '</b>'
    + (t.t ? ' · точность: <b>' + (100 * (t.t - t.w) / t.t).toFixed(1) + ' %</b>' : '')
    + '<br><span class="dim">Набор: ' + state.scens.length + ' спотов</span>';
  if ($('#chartBox').style.display !== 'none') $('#chartBox').innerHTML = gridHTML(scen, state.hand) + legendHTML();
}
function nextHand() {
  if (!state.scens.length) state.scens = defaultSet();
  state.scen = pickScenario();
  state.hand = WEIGHTED[Math.floor(Math.random() * WEIGHTED.length)];
  state.answered = false; state.ok = null;
  renderQuiz();
}
function answer(act) {
  if (state.answered) { nextHand(); return; }
  const acc = acceptable(state.scen, state.hand);
  const ok = acc.length ? acc.indexOf(act) >= 0 : act === 'fold';
  state.answered = true; state.ok = ok;
  bump(state.scen, state.hand, !ok);
  logAnswer(state.scen, state.hand, !ok);
  renderQuiz();
}

/* ---- чарты ---- */
function renderCharts() {
  const scen = $('#scen2').value || state.scen;
  $('#chartFull').innerHTML = '<div class="spot" style="margin-bottom:8px">' + scenarioName(scen) + '</div>'
    + gridHTML(scen, null) + legendHTML();
}

/* ---- ошибки ---- */
function renderErrors() {
  const rows = Object.keys(stats).map(k => {
    const p = k.split('|');
    return { s: p[0], h: p[1], w: stats[k].w, t: stats[k].t };
  }).filter(r => r.w > 0).sort((a, b) => b.w - a.w || b.t - a.t).slice(0, 25);
  if (!rows.length) { $('#errList').innerHTML = 'Пока нет ошибок — потренируйся, и здесь появятся проблемные споты.'; return; }
  $('#errList').innerHTML = '<table><tr><th>Рука</th><th>Спот</th><th class="n">Ошибок</th><th class="n">Всего</th></tr>'
    + rows.map(r => '<tr><td><b>' + r.h + '</b></td><td>' + scenarioName(r.s) + '</td>'
      + '<td class="n bad">' + r.w + '</td><td class="n">' + r.t + '</td></tr>').join('') + '</table>';
}

/* ---- прогресс ---- */
function topTable(map, label, lim) {
  const rows = Object.keys(map).map(k => ({ k: k, t: map[k][0], w: map[k][1] }))
    .filter(r => r.w > 0).sort((a, b) => (b.w / b.t - a.w / a.t) || (b.w - a.w) || (b.t - a.t)).slice(0, lim || 10);
  if (!rows.length) return '<div class="dim">Ошибок нет.</div>';
  return '<table><tr><th>Что</th><th class="n">Ошибок</th><th class="n">Всего</th><th class="n">Точность</th></tr>'
    + rows.map(r => '<tr><td>' + label(r.k) + '</td><td class="n bad">' + r.w + '</td><td class="n">' + r.t
      + '</td><td class="n">' + (100 * (r.t - r.w) / r.t).toFixed(1) + ' %</td></tr>').join('') + '</table>';
}
function renderProgress() {
  const box = $('#progress'); if (!box) return;
  const ks = Object.keys(days).sort();
  if (!ks.length) {
    box.innerHTML = 'Данных пока нет. История копится с сегодняшнего дня: порешай раздач двадцать, и здесь появится точность по дням, худшие споты и руки.';
    return;
  }
  const sum = (arr) => arr.reduce((a, k) => ({ t: a.t + days[k].t, w: a.w + days[k].w }), { t: 0, w: 0 });
  const r = sum(ks.slice(-3)), b = sum(ks.slice(-6, -3));
  let h = '';
  if (b.t && r.t) {
    const d = acc(r) - acc(b);
    h += '<div class="dim" style="margin-bottom:10px">За последние 3 дня: <b>' + acc(r).toFixed(1) + ' %</b> против <b>'
      + acc(b).toFixed(1) + ' %</b> за предыдущие 3 — <b class="' + (d >= 0 ? 'ok' : 'bad') + '">' + (d >= 0 ? '+' : '') + d.toFixed(1) + ' п.п.</b></div>';
  }
  h += '<table><tr><th>День</th><th class="n">Раздач</th><th class="n">Ош.</th><th class="n">Точность</th><th></th></tr>';
  ks.slice(-14).reverse().forEach(k => {
    const o = days[k], a = acc(o);
    h += '<tr><td>' + k.split('-').reverse().join('.') + '</td><td class="n">' + o.t + '</td><td class="n bad">' + o.w
      + '</td><td class="n">' + a.toFixed(1) + ' %</td>'
      + '<td style="width:110px"><i style="display:inline-block;height:10px;border-radius:5px;vertical-align:middle;background:linear-gradient(90deg,#d9534f,#e0b341,#2ea043);width:'
      + Math.max(4, Math.round(a)) + '%"></i></td></tr>';
  });
  h += '</table>';
  const byScen = {}, byHand = {};
  ks.forEach(k => {
    const o = days[k];
    for (const s in o.s) { const x = byScen[s] || (byScen[s] = [0, 0]); x[0] += o.s[s][0]; x[1] += o.s[s][1]; }
    for (const q in o.h) { const x = byHand[q] || (byHand[q] = [0, 0]); x[0] += o.h[q][0]; x[1] += o.h[q][1]; }
  });
  h += '<h2 style="margin:16px 0 8px">Худшие споты</h2>' + topTable(byScen, scenarioName);
  h += '<h2 style="margin:16px 0 8px">Худшие руки</h2>' + topTable(byHand, (x) => x);
  box.innerHTML = h;
}

/* ---- выбор спотов ---- */
function fillControls() {
  $('#preset').innerHTML = '<option value="custom">Свой набор</option>'
    + PRESETS.map(p => '<option value="' + p.key + '">' + p.name + '</option>').join('');
  let h = '';
  for (const s of SECTIONS) {
    h += '<div class="dim" style="margin:8px 0 2px">' + s.name + '</div>';
    for (const it of s.items) {
      h += '<label style="display:block;padding:3px 0"><input type="checkbox" value="' + it.key + '"'
        + (state.scens.indexOf(it.key) >= 0 ? ' checked' : '') + '> ' + it.name + '</label>';
    }
  }
  $('#spotList').innerHTML = h;
  const a = $('#scen2');
  let hb = '';
  for (const s of SECTIONS) {
    hb += '<optgroup label="' + s.name + '">';
    for (const it of s.items) hb += '<option value="' + it.key + '">' + it.name + '</option>';
    hb += '</optgroup>';
  }
  a.innerHTML = hb;
  a.value = 'btn_vs_aggro_open';
  syncSetUI();
}
function syncSetUI() {
  document.querySelectorAll('#spotList input').forEach(i => { i.checked = state.scens.indexOf(i.value) >= 0; });
  $('#preset').value = presetOfSet();
  $('#setInfo').innerHTML = 'Спотов в наборе: <b>' + state.scens.length + '</b>';
}
function readChecks() {
  const a = [];
  document.querySelectorAll('#spotList input:checked').forEach(i => a.push(i.value));
  return a;
}
function applySet(set) {
  state.scens = set.length ? set : defaultSet();
  saveSet(); syncSetUI(); nextHand();
}

/* ---- вкладки и запуск ---- */
function show(v) {
  ['quiz', 'charts', 'err', 'progress'].forEach(k => { $('#v-' + k).style.display = (k === v ? '' : 'none'); });
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === 'charts') renderCharts();
  if (v === 'err') renderErrors();
  if (v === 'progress') renderProgress();
}
function init() {
  state.scens = loadSet();
  fillControls();
  $('#preset').addEventListener('change', e => {
    const p = PRESETS.find(x => x.key === e.target.value);
    if (p) applySet(p.items.slice());
  });
  $('#spotList').addEventListener('change', () => applySet(readChecks()));
  $('#scen2').addEventListener('change', renderCharts);
  $('#btns').addEventListener('click', e => { const b = e.target.closest('button'); if (b) answer(b.dataset.act); });
  $('#showChart').addEventListener('click', () => {
    const box = $('#chartBox'), open = box.style.display === 'none';
    box.style.display = open ? '' : 'none';
    $('#showChart').textContent = open ? 'Скрыть чарт' : 'Показать чарт этого спота';
    if (open) box.innerHTML = gridHTML(state.scen, state.hand) + legendHTML();
  });
  $('#chartFull').addEventListener('click', e => {
    const c = e.target.closest('div[data-h]'); if (!c) return;
    const scen = $('#scen2').value, hand = c.dataset.h;
    document.querySelectorAll('#chartFull .grid div.sel').forEach(d => d.classList.remove('sel'));
    c.classList.add('sel');
    const acts = actionsOf(scen, hand).filter(a => a !== 'mixed');
    const mixed = actionsOf(scen, hand).indexOf('mixed') >= 0 ? ' (смешанная: играть в половине случаев)' : '';
    $('#cellInfo').innerHTML = '<b>' + hand + '</b>: ' + (acts.length ? acts.map(a => ACT_RU[a] || a).join(' / ') : 'Фолд') + mixed;
  });
  document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => show(b.dataset.v)));
  if ($('#ver')) $('#ver').textContent = VER;
  if ($('#updateApp')) $('#updateApp').addEventListener('click', () => {
    if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then(r => {
      if (r) r.update();
      setTimeout(() => location.reload(), 800);
    }); else location.reload();
  });
  $('#resetErr').addEventListener('click', () => { if (confirm('Обнулить всю статистику: ошибки и историю по дням?')) { stats = {}; days = {}; save(); saveDays(); renderErrors(); renderProgress(); } });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  }
  nextHand();
}
document.addEventListener('DOMContentLoaded', init);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { answer, nextHand, show, renderProgress, renderErrors, state, todayKey,
    getStats: () => stats, getDays: () => days };
}
