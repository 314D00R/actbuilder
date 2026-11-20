/* ===== SPELLCHECK (LanguageTool, uk-UA) — застосовується до ВСІХ textarea та input[type=text] ===== */
const spellState = {}; // fieldId -> { matches, timer, badge, overlay }
let spellQueue = [];
let spellQueueBusy = false;
let spellAutoId = 0;
const SPELL_DEBOUNCE_MS = 1000;
const SPELL_MIN_GAP_MS = 1200; // пауза між запитами до LanguageTool
const SPELL_EXCLUDE_IDS = new Set(["auth-email", "auth-pass", "db-search"]);
const CYRILLIC_RE = /[а-яіїєґА-ЯІЇЄҐ]{3,}/; // перевіряємо лише поля, де є реальні слова

function initSpellcheck() {
  scanForSpellFields(document.body);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mut) => {
      mut.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        scanForSpellFields(node);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", repositionAllSpellOverlays);
}

function scanForSpellFields(root) {
  const candidates = [];
  if (root.matches && root.matches('textarea, input[type="text"]')) candidates.push(root);
  if (root.querySelectorAll) candidates.push(...root.querySelectorAll('textarea, input[type="text"]'));
  candidates.forEach((el) => {
    if (el.closest && el.closest("#login-screen, #p-photos, #photo-editor-overlay, #photo-size-popover")) return;
    if (SPELL_EXCLUDE_IDS.has(el.id)) return;
    setupSpellField(el);
  });
}

function setupSpellField(el) {
  if (el.dataset.spellInit) return;
  el.dataset.spellInit = "1";
  if (!el.id) el.id = "spell-auto-" + ++spellAutoId;

  const parent = el.parentElement;
  if (!parent) return;
  if (getComputedStyle(parent).position === "static") {
    parent.style.position = "relative";
  }

  const overlay = document.createElement("div");
  overlay.className = "spell-overlay";
  parent.insertBefore(overlay, el);

  const badge = document.createElement("span");
  badge.className = "spell-indicator";
  badge.textContent = "0";
  badge.title = "Помилки правопису — натисніть для перегляду";
  badge.onclick = (e) => {
    e.stopPropagation();
    toggleSpellPopover(el, badge);
  };
  parent.appendChild(badge);

  spellState[el.id] = { matches: [], badge, overlay, timer: null };

  syncOverlayGeometry(el);
  el.addEventListener("input", () => {
    scheduleSpellCheck(el);
    syncOverlayGeometry(el);
  });
  el.addEventListener("scroll", () => {
    overlay.scrollTop = el.scrollTop;
    overlay.scrollLeft = el.scrollLeft;
  });
  if (window.ResizeObserver) {
    new ResizeObserver(() => syncOverlayGeometry(el)).observe(el);
  }
}

function syncOverlayGeometry(el) {
  const st = spellState[el.id];
  if (!st) return;
  const overlay = st.overlay;
  const badge = st.badge;
  const cs = getComputedStyle(el);
  [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderStyle",
    "boxSizing",
    "textAlign",
  ].forEach((p) => (overlay.style[p] = cs[p]));
  overlay.style.borderColor = "transparent";
  overlay.style.left = el.offsetLeft + "px";
  overlay.style.top = el.offsetTop + "px";
  overlay.style.width = el.offsetWidth + "px";
  overlay.style.height = el.offsetHeight + "px";
  overlay.style.whiteSpace = el.tagName === "TEXTAREA" ? "pre-wrap" : "pre";
  overlay.style.wordWrap = "break-word";
  overlay.style.overflow = "hidden";
  el.style.position = "relative";
  el.style.background = "transparent";
  el.style.zIndex = "2";
  badge.style.left = el.offsetLeft + el.offsetWidth - 22 + "px";
  badge.style.top = el.offsetTop + el.offsetHeight - 22 + "px";
}

function repositionAllSpellOverlays() {
  Object.keys(spellState).forEach((id) => {
    const el = document.getElementById(id);
    if (el) syncOverlayGeometry(el);
  });
}

function scheduleSpellCheck(el) {
  const st = spellState[el.id];
  if (!st) return;
  clearTimeout(st.timer);
  st.timer = setTimeout(() => enqueueSpellCheck(el), SPELL_DEBOUNCE_MS);
}

function enqueueSpellCheck(el) {
  spellQueue = spellQueue.filter((id) => id !== el.id);
  spellQueue.push(el.id);
  processSpellQueue();
}

async function processSpellQueue() {
  if (spellQueueBusy || spellQueue.length === 0) return;
  spellQueueBusy = true;
  const id = spellQueue.shift();
  const el = document.getElementById(id);
  if (el) await runSpellCheck(el);
  setTimeout(() => {
    spellQueueBusy = false;
    processSpellQueue();
  }, SPELL_MIN_GAP_MS);
}

async function runSpellCheck(el) {
  const st = spellState[el.id];
  if (!st) return;
  const text = el.value || "";
  if (!CYRILLIC_RE.test(text)) {
    st.matches = [];
    updateSpellField(el);
    return;
  }
  st.badge.classList.add("checking");
  try {
    const resp = await fetch(ACTBUILDER_CONFIG.languageToolUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text, language: "uk-UA" }),
    });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const data = await resp.json();
    st.matches = (data.matches || []).sort((a, b) => a.offset - b.offset);
  } catch (e) {
    console.warn("Помилка перевірки правопису для поля", el.id, e);
    st.matches = [];
  }
  st.badge.classList.remove("checking");
  updateSpellField(el);
}

function updateSpellField(el) {
  const st = spellState[el.id];
  if (!st) return;
  const count = st.matches.length;
  st.badge.textContent = count > 9 ? "9+" : String(count);
  st.badge.classList.toggle("show", count > 0);
  el.classList.toggle("spell-has-errors", count > 0);
  renderOverlay(el);
  const pop = document.getElementById("spell-popover");
  if (pop && pop.dataset.forField === el.id) renderSpellPopover(el);
}

function renderOverlay(el) {
  const st = spellState[el.id];
  if (!st) return;
  const text = el.value || "";
  if (!st.matches.length) {
    st.overlay.innerHTML = "";
    return;
  }
  let html = "";
  let pos = 0;
  st.matches.forEach((m) => {
    html += escapeHtml(text.substring(pos, m.offset));
    const word = text.substring(m.offset, m.offset + m.length);
    html += `<span class="spell-mark">${escapeHtml(word)}</span>`;
    pos = m.offset + m.length;
  });
  html += escapeHtml(text.substring(pos));
  st.overlay.innerHTML = html;
}

function toggleSpellPopover(el, badge) {
  let pop = document.getElementById("spell-popover");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "spell-popover";
    pop.className = "spell-popover";
    document.body.appendChild(pop);
  }
  if (pop.classList.contains("show") && pop.dataset.forField === el.id) {
    pop.classList.remove("show");
    return;
  }
  const rect = badge.getBoundingClientRect();
  pop.style.left = Math.max(8, rect.left - 250) + "px";
  pop.style.top = rect.bottom + 6 + "px";
  pop.dataset.forField = el.id;
  pop.classList.add("show");
  renderSpellPopover(el);
}

function renderSpellPopover(el) {
  const pop = document.getElementById("spell-popover");
  if (!pop) return;
  const st = spellState[el.id];
  if (!st || st.matches.length === 0) {
    pop.innerHTML =
      '<button class="spell-popover-close" onclick="this.parentElement.classList.remove(\'show\')">✕</button><div class="spell-popover-empty">Помилок не знайдено ✅</div>';
    return;
  }
  const text = el.value || "";
  let html = '<button class="spell-popover-close" onclick="this.parentElement.classList.remove(\'show\')">✕</button>';
  st.matches.forEach((m, idx) => {
    const word = text.substring(m.offset, m.offset + m.length);
    const suggestions = (m.replacements || []).slice(0, 4);
    html += `<div class="spell-issue">
      <div class="spell-issue-msg"><span class="spell-issue-word">${escapeHtml(word)}</span> — ${escapeHtml(m.message || "")}</div>
      <div class="spell-sugg-row">
        ${suggestions.map((s) => `<button class="spell-sugg-btn" onclick="applySpellSuggestion('${el.id}',${idx},'${escapeAttr(s.value)}')">${escapeHtml(s.value)}</button>`).join("")}
        ${suggestions.length === 0 ? '<span style="font-size:11px;color:var(--text3)">без пропозицій</span>' : ""}
        <button class="spell-ignore-btn" onclick="ignoreSpellIssue('${el.id}',${idx})">Ігнорувати</button>
      </div>
    </div>`;
  });
  pop.innerHTML = html;
}


function applySpellSuggestion(fieldId, matchIdx, value) {
  const el = document.getElementById(fieldId);
  const st = spellState[fieldId];
  if (!el || !st) return;
  const m = st.matches[matchIdx];
  if (!m) return;
  const before = el.value.substring(0, m.offset);
  const after = el.value.substring(m.offset + m.length);
  el.value = before + value + after;
  const diff = value.length - m.length;
  st.matches.splice(matchIdx, 1);
  st.matches.forEach((other) => {
    if (other.offset > m.offset) other.offset += diff;
  });
  el.dispatchEvent(new Event("input", { bubbles: true }));
  updateSpellField(el);
  scheduleSpellCheck(el);
}

function ignoreSpellIssue(fieldId, matchIdx) {
  const st = spellState[fieldId];
  if (!st) return;
  st.matches.splice(matchIdx, 1);
  const el = document.getElementById(fieldId);
  updateSpellField(el);
}

document.addEventListener("click", (e) => {
  const pop = document.getElementById("spell-popover");
  if (pop && pop.classList.contains("show") && !pop.contains(e.target) && !e.target.classList.contains("spell-indicator")) {
    pop.classList.remove("show");
  }
});
