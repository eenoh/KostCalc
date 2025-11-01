const y1 = document.getElementById('year');
if (y1) y1.textContent = new Date().getFullYear();

const formCompany = document.querySelector('form[action="/onboarding/company"]');
const companyName = document.getElementById('companyName');

function ensureErr(input){
  let el = input.parentElement.querySelector('.kc-error');
  if (!el) { el = document.createElement('div'); el.className = 'kc-error'; input.parentElement.appendChild(el); }
  return el;
}
function showErr(i,m){ ensureErr(i).textContent = m; i.classList.add('error'); i.classList.remove('success'); }
function clearErr(i){ const el = i.parentElement.querySelector('.kc-error'); if (el) el.textContent=''; i.classList.remove('error'); i.classList.add('success'); }

function validateCompany(){
  const v = (companyName.value || '').trim();
  if (v.length < 2) { showErr(companyName, 'Please enter at least 2 characters.'); return false; }
  clearErr(companyName); return true;
}

if (companyName) companyName.addEventListener('blur', validateCompany);

if (formCompany) formCompany.addEventListener('submit', (e) => {
  if (!validateCompany()) e.preventDefault();
});
