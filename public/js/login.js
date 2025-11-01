// ===============================
// Footer year
// ===============================
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===============================
// Inline error helpers
// ===============================
function ensureErrorNode(input) {
  let node = input.parentElement.querySelector('.kc-error');
  if (!node) {
    node = document.createElement('div');
    node.className = 'kc-error';
    input.parentElement.appendChild(node);
  }
  return node;
}
function showError(input, text) {
  const node = ensureErrorNode(input);
  node.textContent = text;
  input.classList.add('error');
  input.classList.remove('success');
}
function clearError(input) {
  const node = input.parentElement.querySelector('.kc-error');
  if (node) node.textContent = '';
  input.classList.remove('error');
  input.classList.add('success');
}

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ===============================
// Elements
// ===============================
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

function clearBothErrors() {
  if (emailInput) clearError(emailInput);
  if (passwordInput) clearError(passwordInput);
}

// ===============================
// Client-side validation
// ===============================
function validateEmail() {
  const v = (emailInput.value || '').trim();
  if (!v) { showError(emailInput, 'Email is required.'); return false; }
  if (!emailRx.test(v)) { showError(emailInput, 'Please enter a valid email.'); return false; }
  clearError(emailInput); return true;
}
function validatePassword() {
  const v = (passwordInput.value || '').trim();
  if (!v) { showError(passwordInput, 'Password is required.'); return false; }
  if (v.length < 8) { showError(passwordInput, 'Password must be at least 8 characters.'); return false; }
  clearError(passwordInput); return true;
}

if (emailInput) {
  emailInput.addEventListener('blur', validateEmail);
  emailInput.addEventListener('input', () => {
    // live-clear when user fixes it
    if (emailRx.test(emailInput.value.trim())) clearError(emailInput);
  });
}
if (passwordInput) {
  passwordInput.addEventListener('blur', validatePassword);
  passwordInput.addEventListener('input', () => {
    if ((passwordInput.value || '').trim().length >= 8) clearError(passwordInput);
  });
}

// ===============================
// Submit: validate -> fetch -> show server errors inline
// ===============================
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // always prevent navigation

    // 1) client-side validation
    const ok = [validateEmail(), validatePassword()].every(Boolean);
    if (!ok) return;

    // 2) submit via fetch (keep user on the page if server fails)
    clearBothErrors();
    const body = new URLSearchParams({
      email: emailInput.value.trim(),
      password: passwordInput.value.trim()
    });

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });

      if (res.ok) {
        // success → follow server redirect or go /home
        if (res.redirected) window.location.href = res.url;
        else window.location.href = '/home';
        return;
      }

      // 3) server-side validation/auth errors → inline under inputs
      const text = (await res.text() || '').trim();
      const msg = text || 'Login failed.';

      // Common patterns
      if (/invalid/i.test(msg)) {
        showError(emailInput, 'Invalid email or password.');
        showError(passwordInput, 'Invalid email or password.');
      } else if (/email/i.test(msg)) {
        showError(emailInput, msg);
      } else if (/password/i.test(msg)) {
        showError(passwordInput, msg);
      } else {
        // Fallback: attach to password field
        showError(passwordInput, msg);
      }
    } catch (err) {
      console.error('Login error:', err);
      showError(passwordInput, 'Network error. Try again.');
    }
  });
}

// ===============================
// Forgot password (OTP modal)
// ===============================
const forgotLink = document.getElementById('forgotLink');
const modal = document.getElementById('resetModal');
const mEmail = document.getElementById('mEmail');
const mCode = document.getElementById('mCode');
const mPwd = document.getElementById('mPwd');
const statusEl = document.getElementById('status');
const stepCode = document.getElementById('stepCode');
const stepPwd = document.getElementById('stepPwd');
const modalNote = document.getElementById('modalNote');

function openModal(email) {
  mEmail.value = email;
  mCode.value = '';
  mPwd.value = '';
  statusEl.textContent = '';
  statusEl.className = 'kc-help';
  stepCode.classList.remove('hidden');
  stepPwd.classList.add('hidden');
  modalNote.textContent = 'We’ve sent a 6-digit code to your email. Enter it below.';
  modal.style.display = 'flex';
  mCode.focus();
}
function closeModal() { modal.style.display = 'none'; }

const btnClose1 = document.getElementById('btnClose1');
const btnClose2 = document.getElementById('btnClose2');
if (btnClose1) btnClose1.onclick = closeModal;
if (btnClose2) btnClose2.onclick = closeModal;

if (forgotLink) {
  forgotLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;
    const email = emailInput.value.trim();
    try {
      await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email })
      });
      openModal(email);
    } catch {
      openModal(email); // allow entering code even if request failed in dev
    }
  });
}

const btnVerify = document.getElementById('btnVerify');
if (btnVerify) {
  btnVerify.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = mEmail.value;
    const code = mCode.value.trim();
    if (!/^\d{6}$/.test(code)) {
      statusEl.textContent = 'Enter the 6-digit code.';
      statusEl.className = 'kc-help warn';
      return;
    }
    try {
      const r = await fetch('/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, code })
      });
      if (r.ok) {
        modalNote.textContent = 'Code verified. Set your new password.';
        statusEl.textContent = 'Code accepted.';
        statusEl.className = 'kc-help ok';
        stepCode.classList.add('hidden');
        stepPwd.classList.remove('hidden');
        mPwd.focus();
      } else {
        statusEl.textContent = (await r.text()) || 'Invalid or expired code.';
        statusEl.className = 'kc-help warn';
      }
    } catch {
      statusEl.textContent = 'Network error. Try again.';
      statusEl.className = 'kc-help warn';
    }
  });
}

const btnSetPwd = document.getElementById('btnSetPwd');
if (btnSetPwd) {
  btnSetPwd.addEventListener('click', async (e) => {
    e.preventDefault();
    const pwd = mPwd.value.trim();
    if (pwd.length < 8) {
      statusEl.textContent = 'Password too short.';
      statusEl.className = 'kc-help warn';
      return;
    }
    try {
      const r = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ password: pwd })
      });
      if (r.ok) {
        modalNote.textContent = 'Password updated. You can now log in.';
        statusEl.textContent = '';
        stepPwd.classList.add('hidden');
        setTimeout(closeModal, 800);
      } else {
        statusEl.textContent = (await r.text()) || 'Could not update password.';
        statusEl.className = 'kc-help warn';
      }
    } catch {
      statusEl.textContent = 'Network error. Try again.';
      statusEl.className = 'kc-help warn';
    }
  });
}
