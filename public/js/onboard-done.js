window.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const total = 3; // seconds
  const tick = 100; // ms
  let left = total;

  const sec  = document.getElementById('sec');
  const prog = document.getElementById('prog');
  const goNow = document.getElementById('goNow');

  // Start entrance animations
  document.body.classList.add('kc-animate-in');

  // Timer + progress
  const iv = setInterval(() => {
    left = Math.max(0, left - tick / 1000);
    if (sec) sec.textContent = Math.ceil(left);
    if (prog) prog.style.width = `${((total - left) / total) * 100}%`;

    if (left <= 0) {
      clearInterval(iv);
      window.location.href = '/home';
    }
  }, tick);

  // If user clicks "Go now", stop timer and go immediately
  if (goNow) {
    goNow.addEventListener('click', (e) => {
      // allow default link nav OR uncomment the next two lines
      // e.preventDefault();
      clearInterval(iv);
      // window.location.href = '/home';
    });
  }
});
