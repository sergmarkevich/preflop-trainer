'use strict';
const R = window.RANGES, RANGES = R.ranges, SECTIONS = R.sections;
const { CELLS, WEIGHTED, combos, actionList, actionsOf, acceptable, scenarioName,
        chartPct, actionPct, ACT_RU, ACT_CLS } = window.Logic;
const STORE = 'preflopTrainerStats_v1';
const $ = (s) => document.querySelector(s);

/* ---- статистика ошибок ---- */
function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
let stats = load();
function save() { try { localStorage.setItem(STORE, JSON.stringify(stats)); } catch (e) {} }
function keyOf(scen, hand) { return scen + '|' + hand; }
function bump(scen, hand, wrong) {
  const k = keyOf(scen, hand);
  const o = stats[k] || { t: 0, w: 0 };
  o.t++; if (wrong) o.w++;
  stats[k] = o; save();
}
function totals() {
  let t = 0, w = 0, scen = {};
  for (const k in stats) {
    const [s] = k.split('|');
    t += stats[k].t; w += stats[k].w;
    scen[s] = scen[s] || { t: 0, w: 0 };
    scen[s].t += stats[k].t; scen[s].w += stats[k].w;
  }
  return { t, w, scen };
}

/* ---- состояние ---- */
let state = { scen: null, hand: null, answered: false, ok: null };

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
  if (!state.answered) { res.innerHTML = ''; }
  else {
    const acc = acceptable(scen, state.hand);
    const names = acc.length ? acc.map(a => ACT_RU[a] || a).join(' / ') : 'Фолд';
    res.innerHTML = state.ok
      ? '<span class="ok">Верно</span> <span class="dim">(' + names + ')</span>'
      : '<span class="bad">Ошибка</span> <span class="dim">надо: ' + names + '</span>';
  }
  const t = totals();
  $('#score').innerHTML = 'Раздач: <b>' + t.t + '</b> · ошибок: <b>' + t.w + '</b>'
    + (t.t ? ' · точность: <b>' + (100 * (t.t - t.w) / t.t).toFixed(1) + ' %</b>' : '');
  if ($('#chartBox').style.display !== 'none') $('#chartBox').innerHTML = gridHTML(scen, state.hand) + legendHTML();
}

function nextHand() {
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

/* ---- вкладки ---- */
function show(v) {
  ['quiz', 'charts', 'err', 'fact'].forEach(k => { $('#v-' + k).style.display = (k === v ? '' : 'none'); });
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === 'charts') renderCharts();
  if (v === 'err') renderErrors();
  if (v === 'fact') renderFacts();
}

function renderErrors() {
  const rows = Object.keys(stats).map(k => {
    const [s, h] = k.split('|');
    return { s, h, w: stats[k].w, t: stats[k].t };
  }).filter(r => r.w > 0).sort((a, b) => b.w - a.w || b.t - a.t).slice(0, 25);
  if (!rows.length) { $('#errList').innerHTML = 'Пока нет ошибок — потренируйся, и здесь появятся проблемные споты.'; return; }
  $('#errList').innerHTML = '<table><tr><th>Рука</th><th>Спот</th><th class="n">Ошибок</th><th class="n">Всего</th></tr>'
    + rows.map(r => '<tr><td><b>' + r.h + '</b></td><td>' + scenarioName(r.s) + '</td>'
      + '<td class="n bad">' + r.w + '</td><td class="n">' + r.t + '</td></tr>').join('') + '</table>';
}

function renderCharts() {
  const scen = $('#scen2').value || state.scen;
  $('#chartFull').innerHTML = '<div class="spot" style="margin-bottom:8px">' + scenarioName(scen) + '</div>'
    + gridHTML(scen, null) + legendHTML();
}
function renderFacts() {
  const open = [['UTG', 12.5, 29.5], ['MP/HJ', 20.1, 31.4], ['CO', 29.4, 38.1], ['BTN', 43.9, 50.2], ['SB', 63.8, 42.2]];
  $('#factOpen').innerHTML = '<table><tr><th>Позиция</th><th class="n">Чарт</th><th class="n">Ты</th><th class="n">Разница</th></tr>'
    + open.map(r => '<tr><td>' + r[0] + '</td><td class="n">' + r[1].toFixed(1) + ' %</td><td class="n">'
      + r[2].toFixed(1) + ' %</td><td class="n ' + (r[2] > r[1] ? 'bad' : 'ok') + '">'
      + (r[2] - r[1] > 0 ? '+' : '') + (r[2] - r[1]).toFixed(1) + '</td></tr>').join('') + '</table>';
  const fac = [['BTN', 1427, 18.1, 6.9, 75.0, 14.2, 2.7], ['BB', 2236, 10.3, 46.0, 43.7, 23.5, 3.6]];
  $('#factFacing').innerHTML = '<table><tr><th>Поз.</th><th class="n">Раз</th><th class="n">3-бет</th><th class="n">Колл</th>'
    + '<th class="n">Фолд</th><th class="n">Чарт 3-бет<br>агр./пасс.</th></tr>'
    + fac.map(r => '<tr><td>' + r[0] + '</td><td class="n">' + r[1] + '</td><td class="n">' + r[2].toFixed(1)
      + ' %</td><td class="n">' + r[3].toFixed(1) + ' %</td><td class="n">' + r[4].toFixed(1) + ' %</td><td class="n">'
      + r[5].toFixed(1) + ' / ' + r[6].toFixed(1) + '</td></tr>').join('') + '</table>';
}

function fillSelects() {
  const a = $('#scen'), b = $('#scen2');
  let ha = '', hb = '';
  for (const s of SECTIONS) {
    ha += '<optgroup label="' + s.name + '">';
    hb += '<optgroup label="' + s.name + '">';
    for (const it of s.items) {
      ha += '<option value="' + it.key + '">' + it.name + '</option>';
      hb += '<option value="' + it.key + '">' + it.name + '</option>';
    }
    ha += '</optgroup>'; hb += '</optgroup>';
  }
  a.innerHTML = ha; b.innerHTML = hb;
  a.value = 'ep_open';      // по умолчанию — открытия UTG
  b.value = 'btn_vs_aggro_open';
}

function init() {
  fillSelects();
  state.scen = $('#scen').value;
  $('#scen').addEventListener('change', e => { state.scen = e.target.value; nextHand(); });
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
    const hand = c.dataset.h;
    document.querySelectorAll('#chartFull .grid div.sel').forEach(d => d.classList.remove('sel'));
    c.classList.add('sel');
    const acts = actionsOf($('#scen2').value, hand).filter(a => a !== 'mixed');
    const mixed = actionsOf($('#scen2').value, hand).indexOf('mixed') >= 0 ? ' (смешанная: играть в половине случаев)' : '';
    $('#cellInfo').innerHTML = '<b>' + hand + '</b>: ' + (acts.length ? acts.map(a => ACT_RU[a] || a).join(' / ') : 'Фолд') + mixed;
  });
  document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => show(b.dataset.v)));
  $('#resetErr').addEventListener('click', () => {
    if (confirm('Обнулить статистику ошибок?')) { stats = {}; save(); renderErrors(); }
  });
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(() => {}); }
  nextHand();
}
document.addEventListener('DOMContentLoaded', init);
