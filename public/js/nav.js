// Persist collapsed state in localStorage
const KEY = 'kc.sidebar.collapsed';

function applySidebarState(collapsed){
  document.body.classList.toggle('sidebar-collapsed', !!collapsed);
}

function readPref(){
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

function writePref(v){
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch {}
}

// Init
applySidebarState(readPref());

// Hook button
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('#navToggle');
  if(!btn) return;
  const next = !document.body.classList.contains('sidebar-collapsed');
  applySidebarState(next);
  writePref(next);
});
