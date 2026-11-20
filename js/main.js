// ═══════════════════════════════════════════════════════════════════
// ТОЧКА ВХОДУ — ініціалізація додатку при завантаженні сторінки
// ═══════════════════════════════════════════════════════════════════

window.onload = function () {
  initAuth();
  initSignDnd();
  initSpellcheck();
  const t = localStorage.getItem(STORAGE_KEY_THEME);
  if (t) {
    document.documentElement.setAttribute("data-theme", t);
    const btn = document.getElementById("theme-btn");
    if (btn) btn.textContent = t === "light" ? "🌙" : "☀️";
  }
  loadData();
  if (window.ActPhotos) ActPhotos.init();
};
