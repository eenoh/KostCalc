const yr = document.getElementById('year');
if (yr) yr.textContent = new Date().getFullYear();

const regForm = document.querySelector('form[action="/auth/register"]');
const firstName = document.getElementById('firstName');
const lastName  = document.getElementById('lastName');
const regEmail  = document.getElementById('email');
const regPwd    = document.getElementById('password');
const regCfm    = document.getElementById('confirm');

function ensureErr(i){ 
  let n=i.parentElement.querySelector('.kc-error'); if(!n){ n=document.createElement('div'); n.className='kc-error'; i.parentElement.appendChild(n);} return n; 
}

function showErr(i,m){ 
  ensureErr(i).textContent=m; i.classList.add('error'); i.classList.remove('success'); 
}

function clearErr(i){ 
  const n=i.parentElement.querySelector('.kc-error'); if(n) n.textContent=''; i.classList.remove('error'); i.classList.add('success'); 
}

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function vFirst(){ 
  const v=(firstName.value||'').trim(); if(v.length<2){ showErr(firstName,'Please enter at least 2 characters.'); return false;} clearErr(firstName); return true; 
}

function vLast(){ 
  const v=(lastName.value||'').trim(); if(v.length<2){ showErr(lastName,'Please enter at least 2 characters.'); return false;} clearErr(lastName); return true; 
}

function vEmail(){ 
  const v=(regEmail.value||'').trim(); if(!emailRx.test(v)){ showErr(regEmail,'Please enter a valid email.'); return false;} clearErr(regEmail); return true; 
}
function vPwd(){ 
  const v=regPwd.value||''; if(v.length<8){ showErr(regPwd,'Minimum 8 characters.'); return false;} clearErr(regPwd); return true; 
}

function vCfm(){ 
  if(regCfm.value!==regPwd.value){ showErr(regCfm,'Passwords do not match.'); return false;} clearErr(regCfm); return true; 
}

[firstName,lastName,regEmail,regPwd,regCfm].forEach(el => el && el.addEventListener('blur', () => {}));
firstName.addEventListener('blur', vFirst);
lastName.addEventListener('blur', vLast);
regEmail.addEventListener('blur', vEmail);
regPwd.addEventListener('blur', vPwd);
regCfm.addEventListener('blur', vCfm);

if (regForm) {
  regForm.addEventListener('submit', (e) => {
    const ok = [vFirst(), vLast(), vEmail(), vPwd(), vCfm()].every(Boolean);
    if (!ok) e.preventDefault();
  });
}
