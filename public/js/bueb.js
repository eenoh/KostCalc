// footer year
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

const $  = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>[...r.querySelectorAll(s)];

const tbody  = $('#rows');
const period = $('#period');

function fmt(n){ return Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}); }
function parse(v){ const n = Number(String(v).replace(',','.')); return isFinite(n) ? n : 0; }

function newRow() {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="kc-input acc-no" placeholder="e.g., 6000"/></td>
    <td>
      <div class="searchbox">
        <input class="kc-input acc-label" placeholder="Type to search…"/>
        <div class="results hidden"></div>
      </div>
    </td>
    <td><input class="kc-input num exp"  inputmode="decimal" /></td>
    <td><input class="kc-input num minu" inputmode="decimal" /></td>
    <td><input class="kc-input num plus" inputmode="decimal" /></td>
    <td class="right cost">0.00</td>
  `;
  tbody.appendChild(tr);
  hookRow(tr);
}

function hookRow(tr){
  const accNo   = $('.acc-no', tr);
  const accLbl  = $('.acc-label', tr);
  const results = $('.results', tr);
  const exp     = $('.exp', tr);
  const minu    = $('.minu', tr);
  const plus    = $('.plus', tr);
  const cost    = $('.cost', tr);

  // typeahead
  let tid = null;
  accLbl.addEventListener('input', () => {
    const q = accLbl.value.trim();
    if (tid) clearTimeout(tid);
    if (!q) { results.classList.add('hidden'); results.innerHTML=''; return; }
    tid = setTimeout(async () => {
      const res = await fetch(`/cost-types/api/search?q=${encodeURIComponent(q)}`);
      const list = await res.json();
      results.innerHTML = list.map(a => `
        <div class="item" data-no="${a.number}" data-label="${a.label}">
          <b>${a.number}</b> – ${a.label} <span class="muted">(${a.name})</span>
        </div>
      `).join('') || `<div class="item muted">No matches</div>`;
      results.classList.remove('hidden');
    }, 180);
  });

  results.addEventListener('click', (e) => {
    const el = e.target.closest('.item');
    if (!el) return;
    accNo.value = el.dataset.no || '';
    accLbl.value = el.dataset.label || '';
    results.classList.add('hidden');
    results.innerHTML = '';
  });

  document.addEventListener('click', (e) => {
    if (!results.contains(e.target) && e.target !== accLbl) {
      results.classList.add('hidden');
    }
  });

  function recalc(){
    const c = parse(exp.value) - parse(minu.value) + parse(plus.value);
    cost.textContent = fmt(c);
    totals();
  }
  exp.addEventListener('input', recalc);
  minu.addEventListener('input', recalc);
  plus.addEventListener('input', recalc);
}

function totals(){
  let tExp = 0, tMin = 0, tPlu = 0;

  // Sum column inputs
  $$('tr', tbody).forEach(tr => {
    tExp += parse($('.exp',  tr)?.value);
    tMin += parse($('.minu', tr)?.value);
    tPlu += parse($('.plus', tr)?.value);
  });

  // Grand total costs by formula (not by summing the rightmost cells)
  const tCost = tExp - tMin + tPlu;

  // Render
  $('#t_exp').textContent  = fmt(tExp);
  $('#t_min').textContent  = fmt(tMin);
  $('#t_plu').textContent  = fmt(tPlu);
  $('#t_cost').textContent = fmt(tCost);
}


$('#addRow').addEventListener('click', newRow);
newRow(); // start with one

$('#save').addEventListener('click', async () => {
  const p = (period.value || '').trim();
  if (!p) { alert('Please enter a period (e.g., 2025-05).'); return; }

  const rows = $$('tr', tbody).map(tr => ({
    account_no: $('.acc-no', tr)?.value?.trim(),
    account_label: $('.acc-label', tr)?.value?.trim(),
    expense: parse($('.exp', tr)?.value),
    minus: parse($('.minu', tr)?.value),
    plus: parse($('.plus', tr)?.value),
    cost: parse($('.cost', tr)?.textContent),
  })).filter(r => r.account_no || r.account_label || r.expense || r.minus || r.plus);

  if (!rows.length) { alert('Add at least one line.'); return; }

  const res = await fetch('/cost-types/api/bueb/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period: p, rows })
  });

  if (res.ok) {
    const data = await res.json();
    window.location.href = data.next || '/home';
  } else {
    alert(await res.text());
  }
});

tbody.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('num')) {
    e.preventDefault();
    newRow();
    const last = tbody.lastElementChild;
    $('.acc-label', last)?.focus();
  }
});
