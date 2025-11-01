const yrp = document.getElementById('year');
if (yrp) yrp.textContent = new Date().getFullYear();

// Put ?token=... into the hidden field (used when using link-based reset)
const params = new URLSearchParams(location.search);
const token = params.get('token');
const tokenEl = document.getElementById('token');
if (tokenEl) tokenEl.value = token || '';

const form = document.getElementById('resetForm');
const pwd = document.getElementById('password');

function ensureErr(i){ let n=i.parentElement.querySelector('.kc-error'); if(!n){ n=document.createElement('div'); n.className='kc-error'; i.parentElement.appendChild(n);} return n; }
function showErr(i,m){ ensureErr(i).textContent=m; i.classList.add('error'); i.classList.remove('success'); }
function clearErr(i){ const n=i.parentElement.querySelector('.kc-error'); if(n) n.textContent=''; i.classList.remove('error'); i.classList.add('success'); }

function validatePwd(){
  const v = pwd.value || '';
  if (v.length < 8) { showErr(pwd, 'Minimum 8 characters.'); return false; }
  clearErr(pwd); return true;
}
pwd.addEventListener('blur', validatePwd);

if (form) {
  form.addEventListener('submit', (e) => {
    if (!validatePwd()) e.preventDefault();
  });
}
