window.addEventListener('DOMContentLoaded', () => {
  const yc = document.getElementById('year');
  if (yc) yc.textContent = new Date().getFullYear();

  const rows = document.getElementById('rows');
  const addBtn = document.getElementById('add');
  const form = document.getElementById('centersForm');

  if (!rows || !addBtn || !form) {
    console.warn('Onboarding: required elements not found');
    return;
  }

  function ensureErr(input){
    let el = input.parentElement.querySelector('.kc-error');
    if (!el){ el=document.createElement('div'); el.className='kc-error'; input.parentElement.appendChild(el); }
    return el;
  }
  function showErr(i,m){ ensureErr(i).textContent=m; i.classList.add('error'); i.classList.remove('success'); }
  function clearErr(i){ const el=i.parentElement.querySelector('.kc-error'); if(el) el.textContent=''; i.classList.remove('error'); i.classList.add('success'); }

  // add one row; "isRequired" applies required to code & name only for the first row
  function addRow(isRequired = false) {
    const wrap = document.createElement('div');
    if (rows.children.length > 0) wrap.classList.add('cc-row');

    wrap.classList.add('kc-field');
    wrap.innerHTML = `
      <div style="display:grid;grid-template-columns:160px 1fr;gap:12px">
        <div class="cc-col"><input class="kc-input" name="code[]" placeholder="CC-001" ${isRequired ? 'required' : ''} /></div>
        <div class="cc-col"><input class="kc-input" name="name[]" placeholder="Production" ${isRequired ? 'required' : ''} /></div>
      </div>
      <div class="cc-col"><input class="kc-input" name="desc[]" placeholder="Optional description" /></div>
    `;
    rows.appendChild(wrap);
  }

  // first row only (required)
  addRow(true);

  // click to add optional rows (not required)
  addBtn.addEventListener('click', () => addRow(false));

  // Submit as JSON; with validation
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate first row (required)
    const first = rows.querySelector('.kc-field');
    const code0 = first.querySelector('input[name="code[]"]');
    const name0 = first.querySelector('input[name="name[]"]');

    let ok = true;
    if (!code0.value.trim()) { showErr(code0, 'Code is required.'); ok = false; } else clearErr(code0);
    if (!name0.value.trim()) { showErr(name0, 'Name is required.'); ok = false; } else clearErr(name0);

    // Optional rows: if one of code/name filled, require both
    rows.querySelectorAll('.kc-field').forEach((wrap, i) => {
      if (!i) return;
      const c = wrap.querySelector('input[name="code[]"]');
      const n = wrap.querySelector('input[name="name[]"]');
      if (c.value.trim() || n.value.trim()) {
        if (!c.value.trim()) { showErr(c, 'Code required if name provided.'); ok = false; } else clearErr(c);
        if (!n.value.trim()) { showErr(n, 'Name required if code provided.'); ok = false; } else clearErr(n);
      } else {
        c.classList.remove('error','success');
        n.classList.remove('error','success');
      }
    });

    if (!ok) return;

    const codes = [...form.querySelectorAll('input[name="code[]"]')].map(i => i.value.trim());
    const names = [...form.querySelectorAll('input[name="name[]"]')].map(i => i.value.trim());
    const descs = [...form.querySelectorAll('input[name="desc[]"]')].map(i => i.value.trim());

    const centers = codes
      .map((c, i) => ({ code: c, name: names[i] || '', desc: descs[i] || '' }))
      .filter((row, idx) => idx === 0 ? true : (row.code !== '' || row.name !== ''));

    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ centers })
    });

    if (res.redirected) window.location = res.url;
    else if (res.ok) window.location = '/onboarding/done';
    else alert(await res.text());
  });
});
