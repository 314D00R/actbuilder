// ═══════════════════════════════════════════════════════════════════
// UI HELPERS — екранування, toast, autoResize, тема, навігація, custom select
// ═══════════════════════════════════════════════════════════════════

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function escapeAttr(s) {
  return String(s).replace(/'/g, "\\'");
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function showToast(msg, type = "info", duration = 3500) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastOut 0.25s ease forwards";
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function openPage(id, btn) {
  document.querySelectorAll(".page").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (btn) btn.classList.add("active");
  document.getElementById("topbar-title").textContent = PAGE_TITLES[id] || id;
  updateBuildingDropdowns();
  if (id === "p-volumes") updateVolumesTable();
  if (id === "p-photos" && window.ActPhotos) ActPhotos.render();
  if (id === "p-export") validateForm();
}

function setSaveIndicator(state) {
  const el = document.getElementById("save-indicator");
  if (!el) return;
  el.className = "save-indicator " + state;
  el.textContent = state === "saving" ? "⏳ Збереження..." : state === "error" ? "✗ Помилка!" : "✓ Збережено";
}

function copySum() {
  const sum = document.getElementById("master_total_sidebar").innerText;
  navigator.clipboard.writeText(sum + " грн").then(() => {
    const btn = document.querySelector(".copy-sum-btn");
    const orig = btn.textContent;
    btn.textContent = "✓";
    setTimeout(() => (btn.textContent = orig), 1500);
  });
}

function formatSum(num) {
  let rounded = Math.round(num * 100) / 100;
  return rounded.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toggleTheme() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const newTheme = isLight ? "" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  document.getElementById("theme-btn").textContent = newTheme === "light" ? "🌙" : "☀️";
  localStorage.setItem(STORAGE_KEY_THEME, newTheme);
}

// ── CUSTOM SELECT (єдина логіка для всіх випадаючих списків) ────────
// checkCustom    — загальні списки (тип об'єкту, матеріали і т.д.)
// checkOwnerType — список «Тип власника» (той самий механізм, інший placeholder)
function _openCustomInput(sel, placeholder, extraClass) {
  sel.selectedIndex = 0;
  const findClass = extraClass || "custom-input-row";
  if (sel.parentNode.querySelector("." + findClass)) return;
  const row = document.createElement("div");
  row.className = "custom-input-row" + (extraClass ? " " + extraClass : "");
  row.innerHTML =
    `<input type="text" placeholder="${placeholder}"/>` +
    `<button class="btn btn-accent" style="padding:6px 11px;font-size:12px" onclick="applyCustom(this)">✓</button>` +
    `<button class="btn btn-surface" style="padding:6px 11px;font-size:12px" onclick="cancelCustom(this)">✕</button>`;
  sel.parentNode.appendChild(row);
  const inp = row.querySelector("input");
  inp.focus();
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyCustom(row.querySelector(".btn-accent"));
    if (e.key === "Escape") cancelCustom(row.querySelector(".btn-surface"));
  });
}

function checkCustom(sel) {
  if (sel.value === "custom") _openCustomInput(sel, "Впишіть свій варіант...");
  else saveData();
}

function checkOwnerType(sel) {
  if (sel.value === "custom") _openCustomInput(sel, "Вкажіть тип власника...", "owner-type-custom");
  else saveData();
}

function applyCustom(btn) {
  const row = btn.closest(".custom-input-row");
  const sel = row.parentNode.querySelector("select");
  const val = row.querySelector("input").value.trim();
  if (val) {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    sel.insertBefore(opt, sel.lastElementChild);
    sel.value = val;
  } else {
    sel.selectedIndex = 0;
  }
  row.remove();
  saveData();
}

function cancelCustom(btn) {
  const row = btn.closest(".custom-input-row");
  row.parentNode.querySelector("select").selectedIndex = 0;
  row.remove();
}

// applyOwnerType збережено для сумісності — applyCustom обробляє обидва випадки
function applyOwnerType(btn) {
  applyCustom(btn);
}

function setSelectValue(sel, val) {
  if (!sel || val === undefined || val === null) return;
  let exists = false;
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === val) {
      exists = true;
      break;
    }
  }
  if (!exists && val !== "") {
    let opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    sel.insertBefore(opt, sel.lastElementChild);
  }
  sel.value = val;
}

// Заборона від'ємних чисел у числових полях форми
document.addEventListener("input", function (e) {
  if (e.target.type === "number" && e.target.value !== "" && parseFloat(e.target.value) < 0) {
    e.target.value = "";
  }
});
