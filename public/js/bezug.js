// ===============================
// Footer year
// ===============================
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

const $  = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>[...r.querySelectorAll(s)];
const resultEl = $('#result');

// ===============================
// Helpers
// ===============================
function r2(n){ return Math.round((Number(n)||0)*100)/100; }
function r4(n){ return Math.round((Number(n)||0)*10000)/10000; }

// v.h. (von hundert): percentage *of* base
const vh = (base, pct) => (Number(base)||0) * ((Number(pct)||0)/100);

// i.h. (in hundert): reverse a deduction of x%
const ih = (amount, pct) => {
  const f = 1 - ((Number(pct)||0)/100);
  return f <= 0 ? 0 : (Number(amount)||0) / f;
};

// ===============================
// Progressive (forward)
// ===============================
function calcProgressive(i){
  const qty   = +i.qty || 0;
  const inv   = +i.invoice || 0;

  const dTrade   = +i.dTrade   || 0;
  const dSpecial = +i.dSpecial || 0;
  const dQty     = +i.dQty     || 0;

  const fakPack = +i.fakPack || 0;
  const fakFre  = +i.fakFre  || 0;
  const skonto  = +i.skonto  || 0;

  const ownFreight = +i.ownFreight || 0;
  const ownIns     = +i.ownIns     || 0;
  const ownOther   = +i.ownOther   || 0;

  const discTrade   = r2(vh(inv, dTrade));
  const afterTrade  = r2(inv - discTrade);

  const discSpecial = r2(vh(afterTrade, dSpecial));
  const afterSpec   = r2(afterTrade - discSpecial);

  const discQty     = r2(vh(afterSpec, dQty));
  const discounted  = r2(afterSpec - discQty);

  const sellerCharges = r2(fakPack + fakFre);
  const target = r2(discounted + sellerCharges);

  const skontoAmt = r2(vh(target, skonto));
  const cash = r2(target - skontoAmt);

  const own = r2(ownFreight + ownIns + ownOther);
  const epTotal = r2(cash + own);
  const epUnit  = qty > 0 ? r4(epTotal / qty) : 0;

  return {
    parts: {
      inv, discTrade, discSpecial, discQty,
      discounted, sellerCharges, target, skontoAmt, cash, own,
      epTotal, epUnit
    }
  };
}

// ===============================
// Retrograde (backward)
// ===============================
function calcRetrograde(i){
  const qty = +i.qty || 0;

  const epTotal = (+i.epTotal > 0)
    ? +i.epTotal
    : (+i.epUnit > 0 && qty > 0 ? r2(+i.epUnit * qty) : 0);

  const own    = +i.own || 0;
  const skonto = +i.skonto || 0;
  const fakPack = +i.fakPack || 0;
  const fakFre  = +i.fakFre  || 0;

  const dTrade   = +i.dTrade   || 0;
  const dSpecial = +i.dSpecial || 0;
  const dQty     = +i.dQty     || 0;

  const cash = r2(epTotal - own);                // remove own expenses
  const target = r2(ih(cash, skonto));           // add back skonto (i.h.)
  const discounted = r2(target - (fakPack + fakFre)); // remove seller charges
  const afterSpec = r2(ih(discounted, dQty));    // undo quantity discount
  const afterTrade = r2(ih(afterSpec, dSpecial));// undo special discount
  const invoice = r2(ih(afterTrade, dTrade));    // undo trade discount

  // deltas for display (can be zero)
  const dSkonto   = r2(target - cash);
  const dSeller   = r2(-(fakPack + fakFre));
  const dQtyIH    = r2(afterSpec - discounted);
  const dSpecIH   = r2(afterTrade - afterSpec);
  const dTradeIH  = r2(invoice - afterTrade);

  return {
    parts: {
      epTotal, own, cash, target, discounted, afterSpec, afterTrade, invoice,
      dSkonto, dSeller, dQtyIH, dSpecIH, dTradeIH,
      perUnit: (qty>0 ? r4(invoice/qty) : 0)
    }
  };
}

// ===============================
// Rendering (diagram style)
// ===============================
function fmt(curr, v, digits=2){
  return `${curr} ${Number(v).toLocaleString(undefined, { minimumFractionDigits:digits, maximumFractionDigits:digits })}`;
}

// helper: only render step if amount !== 0
function stepHTML({label, hint, value, delta}, opts={retro:false, curr:'€'}) {
  const showValue = typeof value === 'number';
  const showDelta = typeof delta === 'number' && delta !== 0;

  if (!showValue && !showDelta) return ''; // hide zero-only rows

  const laneClass = opts.retro ? 'retro' : '';
  const deltaHTML = showDelta
    ? `<span class="delta ${delta<0?'minus':'plus'}">${delta<0?'-':'+'} ${fmt(opts.curr, Math.abs(delta))}</span>`
    : '';

  const valueHTML = showValue ? fmt(opts.curr, value) : '';

  return `
    <div class="step">
      <span class="dot"></span>
      <div>${label}${hint ? `<span class="badge">${hint}</span>` : ''}</div>
      <div class="amount">${valueHTML}${deltaHTML}</div>
    </div>`;
}

function renderProgressiveSchema(calc, curr) {
  const p = calc.parts;

  const stepsHTML = [
    stepHTML({ label:'Invoice amount', value:p.inv }, { curr }),
    stepHTML({ label:'Trade discount',  hint:'v.h.', delta: -p.discTrade }, { curr }),
    stepHTML({ label:'Special discount',hint:'v.h.', delta: -p.discSpecial }, { curr }),
    stepHTML({ label:'Quantity discount',hint:'v.h.', delta: -p.discQty }, { curr }),
    stepHTML({ label:'Discounted price', value:p.discounted }, { curr }),
    stepHTML({ label:'Seller charges (packing + freight)', delta: p.sellerCharges }, { curr }),
    stepHTML({ label:'Target price (net)', value:p.target }, { curr }),
    stepHTML({ label:'Cash discount', hint:'v.h.', delta: -p.skontoAmt }, { curr }),
    stepHTML({ label:'Cash price', value:p.cash }, { curr }),
    stepHTML({ label:'Own purchasing expenses', delta: p.own }, { curr })
  ].join('');

  return `
    <div class="calc-grid">
      <div class="lane">
        <h3>Progressive calculation</h3>
        <div class="vline"></div>
        ${stepsHTML}
        <div class="total"><span>Total purchase price</span><span>${fmt(curr, p.epTotal)}</span></div>
        ${p.epUnit ? `<div class="small-note">Per unit: <b>${fmt(curr, p.epUnit, 4)}</b></div>` : ''}
      </div>
    </div>`;
}

function renderRetrogradeSchema(calc, curr) {
  const p = calc.parts;

  const stepsHTML = [
    stepHTML({ label:'Target total purchase price', value:p.epTotal }, { curr, retro:true }),
    stepHTML({ label:'Own purchasing expenses', delta: -p.own }, { curr, retro:true }),
    stepHTML({ label:'Cash price', value:p.cash }, { curr, retro:true }),
    stepHTML({ label:'Cash discount', hint:'i.h.', delta: p.dSkonto }, { curr, retro:true }),
    stepHTML({ label:'Target price (net)', value:p.target }, { curr, retro:true }),
    stepHTML({ label:'Seller charges (packing + freight)', delta: p.dSeller }, { curr, retro:true }),
    stepHTML({ label:'Discounted price', value:p.discounted }, { curr, retro:true }),
    stepHTML({ label:'Quantity discount', hint:'i.h.', delta: p.dQtyIH }, { curr, retro:true }),
    stepHTML({ label:'Special discount',  hint:'i.h.', delta: p.dSpecIH }, { curr, retro:true }),
    stepHTML({ label:'Trade discount',    hint:'i.h.', delta: p.dTradeIH }, { curr, retro:true })
  ].join('');

  return `
    <div class="calc-grid">
      <div class="lane retro">
        <h3>Retrograde calculation</h3>
        <div class="vline"></div>
        ${stepsHTML}
        <div class="total"><span>Maximum invoice amount</span><span>${fmt(curr, p.invoice)}</span></div>
        ${p.perUnit ? `<div class="small-note">Maximum per unit: <b>${fmt(curr, p.perUnit, 4)}</b></div>` : ''}
      </div>
    </div>`;
}

// ===============================
// Tabs
// ===============================
$$('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('.tab').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $('#formProg').classList.toggle('hidden', tab!=='prog');
    $('#formRetro').classList.toggle('hidden', tab!=='retro');
    resultEl.innerHTML = '';
  });
});

// ===============================
// Buttons
// ===============================
$('#btnProg').addEventListener('click', ()=>{
  const out = calcProgressive({
    qty: $('#p_qty').value,
    invoice: $('#p_invoice_total').value,
    dTrade: $('#p_disc_trade').value,
    dSpecial: $('#p_disc_special').value,
    dQty: $('#p_disc_qty').value,
    fakPack: $('#p_fak_packing').value,
    fakFre: $('#p_fak_freight').value,
    skonto: $('#p_skonto').value,
    ownFreight: $('#p_own_freight').value,
    ownIns: $('#p_own_ins').value,
    ownOther: $('#p_own_other').value
  });
  resultEl.innerHTML = renderProgressiveSchema(out, $('#p_curr').value || '€');
});

$('#btnRetro').addEventListener('click', ()=>{
  const out = calcRetrograde({
    qty: $('#r_qty').value,
    epTotal: $('#r_target_ep_total').value,
    epUnit: $('#r_target_ep_unit').value,
    dTrade: $('#r_disc_trade').value,
    dSpecial: $('#r_disc_special').value,
    dQty: $('#r_disc_qty').value,
    skonto: $('#r_skonto').value,
    fakPack: $('#r_fak_packing').value,
    fakFre: $('#r_fak_freight').value,
    own: $('#r_bezug').value
  });
  resultEl.innerHTML = renderRetrogradeSchema(out, $('#r_curr').value || '€');
});
