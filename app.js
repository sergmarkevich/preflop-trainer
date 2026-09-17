'use strict';
const R = window.RANGES, RANGES = R.ranges, SECTIONS = R.sections;
const L = window.Logic;
const { CELLS, WEIGHTED, actionList, actionsOf, acceptable, scenarioName, PRESETS, ACT_RU, ACT_CLS } = L;
const STORE = 'preflopTrainerStats_v1', SETSTORE = 'preflopTrainerSet_v1';
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
  ['quiz', 'charts', 'err'].forEach(k => { $('#v-' + k).style.display = (k === v ? '' : 'none'); });
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === 'charts') renderCharts();
  if (v === 'err') renderErrors();
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
  $('#resetErr').addEventListener('click', () => { if (confirm('Обнулить статистику ошибок?')) { stats = {}; save(); renderErrors(); } });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  nextHand();
}
document.addEventListener('DOMContentLoaded', init);
