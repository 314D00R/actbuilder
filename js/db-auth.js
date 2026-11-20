// ═══════════════════════════════════════════════════════════════════
// АВТОРИЗАЦІЯ ТА БАЗА ДАНИХ (Supabase SDK)
// Усі запити до таблиць profiles та acts йдуть через офіційний клієнт
// _supabase з автоматичним оновленням JWT-токенів і коректною обробкою помилок.
// ═══════════════════════════════════════════════════════════════════

const _supabase = supabase.createClient(SUPABASE_URL, SB_KEY);
let _currentUser = null;
let dbAllRecords = [];

async function initAuth() {
  const {
    data: { session },
  } = await _supabase.auth.getSession();
  if (session) {
    _currentUser = session.user;
    showApp();
    await checkAdminRole();
  } else {
    showLoginScreen();
  }
}

async function checkAdminRole() {
  const { data } = await _supabase.from("profiles").select("role").eq("id", _currentUser.id).single();
  _currentUser.role = data?.role || "user";
  document.getElementById("user-info").textContent =
    `👤 ${_currentUser.email} ${_currentUser.role === "admin" ? "(адмін)" : ""}`;
  if (_currentUser.role !== "admin") {
    document.querySelectorAll(".admin-only").forEach((el) => (el.style.display = "none"));
  }
}

async function authLogin() {
  const email = document.getElementById("auth-email").value.trim();
  const pass = document.getElementById("auth-pass").value.trim();

  if (!email || !pass) {
    showToast("Будь ласка, введіть Email та пароль", "error");
    return;
  }

  const { data, error } = await _supabase.auth.signInWithPassword({ email, password: pass });
  if (error) {
    showToast(error.message, "error");
    return;
  }

  _currentUser = data.user;
  await _supabase.from("profiles").upsert({ id: _currentUser.id }, { onConflict: "id" });

  showApp();
  await checkAdminRole();
}

async function authRegister() {
  const email = document.getElementById("auth-email").value.trim();
  const pass = document.getElementById("auth-pass").value.trim();

  if (!email || !pass) {
    showToast("Будь ласка, введіть Email та пароль", "error");
    return;
  }

  if (pass.length < 8) {
    showToast("Пароль має містити мінімум 8 символів", "error");
    return;
  }

  const redirectTo =
    window.location.protocol.startsWith("http")
      ? window.location.origin + window.location.pathname
      : "https://314d00r.github.io/actbuilder";

  const { error } = await _supabase.auth.signUp({
    email,
    password: pass,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    showToast(error.message, "error");
    return;
  }
  showToast("Реєстрація успішна! Можете увійти.", "success");
}

async function authLogout() {
  await _supabase.auth.signOut();
  _currentUser = null;
  showLoginScreen();
}

function showLoginScreen() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("app-root").style.display = "none";
}

function showApp() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app-root").style.display = "flex";
}

async function dbSave() {
  _calcAllNow();
  const allData = localStorage.getItem(STORAGE_KEY_MAIN);
  const staticData = localStorage.getItem(STORAGE_KEY_STATIC);
  const cityVal = document.getElementById("addr_city")?.value || "";
  const strVal = document.getElementById("addr_street")?.value || "";
  const hseVal = document.getElementById("addr_house")?.value || "";
  const address = `${cityVal}, ${strVal}, ${hseVal}`.trim();
  let ownerVal = "";
  const firstOwnerBlock = document.querySelector('[id^="owner-block"]');
  if (firstOwnerBlock) {
    const ownerId = firstOwnerBlock.id.split("-")[2];
    ownerVal = document.getElementById("ow_name_" + ownerId)?.value.trim() || "";
  }

  // Перевіряємо чи вже є відкритий запис у базі
  const existingId = document.getElementById("db-current-id")?.value;
  const nowIso = new Date().toISOString();

  const payload = {
    address: address,
    owner: ownerVal,
    data: { main: allData, static: staticData },
    updated_at: nowIso,
    user_id: _currentUser?.id,
  };

  try {
    let res;
    if (existingId) {
      res = await _supabase.from("acts").update(payload).eq("id", existingId).select();
    } else {
      payload.created_at = nowIso;
      res = await _supabase.from("acts").insert(payload).select();
    }
    if (res.error) throw res.error;

    const result = res.data;
    if (result && result[0] && result[0].id) {
      let hiddenEl = document.getElementById("db-current-id");
      if (!hiddenEl) {
        hiddenEl = document.createElement("input");
        hiddenEl.type = "hidden";
        hiddenEl.id = "db-current-id";
        document.body.appendChild(hiddenEl);
      }
      hiddenEl.value = result[0].id;
    }
    showToast("Збережено в базу!", "success");
    await dbLoad();
  } catch (e) {
    showToast("Помилка збереження: " + (e.message || e), "error");
  }
}

async function dbLoad() {
  try {
    const isAdmin = _currentUser?.role === "admin";
    let query = _supabase.from("acts").select("*").order("updated_at", { ascending: false }).limit(200);
    if (!isAdmin && _currentUser?.id) {
      query = query.eq("user_id", _currentUser.id);
    }
    const { data, error } = await query;
    if (error) throw error;
    dbAllRecords = Array.isArray(data) ? data : [];
    dbRender(dbAllRecords);
  } catch (e) {
    showToast("Помилка завантаження: " + (e.message || e), "error");
  }
}

function dbSearch() {
  const q = document.getElementById("db-search").value.toLowerCase();
  if (!q) {
    dbRender(dbAllRecords);
    return;
  }
  const filtered = dbAllRecords.filter(
    (r) => (r.address || "").toLowerCase().includes(q) || (r.owner || "").toLowerCase().includes(q)
  );
  dbRender(filtered);
}

function dbRender(records) {
  const wrap = document.getElementById("db-list");
  if (!records || records.length === 0) {
    wrap.innerHTML = '<p style="color:var(--text3);font-size:13px;padding:12px 0">Записів не знайдено.</p>';
    return;
  }
  wrap.innerHTML = records
    .map((r) => {
      const date = new Date(r.updated_at).toLocaleDateString("uk-UA");
      const currentId = document.getElementById("db-current-id")?.value;
      const isActive = currentId === r.id;
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${isActive ? "var(--accent-glow)" : "var(--surface2)"};border:1px solid ${isActive ? "var(--accent)" : "var(--border)"};border-radius:var(--radius-sm);margin-bottom:6px;gap:10px">
        <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--text)">${escapeHtml(r.address || "—")}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">${escapeHtml(r.owner || "—")} · ${date}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-surface" style="padding:5px 10px;font-size:11px" onclick="dbLoadRecord('${escapeAttr(r.id)}')">📂 Завантажити</button>
            <button class="btn btn-danger" style="padding:5px 10px;font-size:11px" onclick="dbDelete('${escapeAttr(r.id)}')">🗑️</button>
        </div>
    </div>`;
    })
    .join("");
}

async function dbLoadRecord(id) {
  const record = dbAllRecords.find((r) => r.id === id);
  if (!record) return;
  if (
    !confirm(
      `Завантажити "${record.address}"?\n\nПоточні незбережені дані та фотогалерея поточного об'єкта будуть замінені.`
    )
  ) {
    return;
  }

  if (window.ActPhotos) {
    try {
      await ActPhotos.clearAll(true);
    } catch (e) {
      console.error(e);
    }
  }

  if (record.data?.main) localStorage.setItem(STORAGE_KEY_MAIN, record.data.main);
  if (record.data?.static) localStorage.setItem(STORAGE_KEY_STATIC, record.data.static);

  let hiddenEl = document.getElementById("db-current-id");
  if (!hiddenEl) {
    hiddenEl = document.createElement("input");
    hiddenEl.type = "hidden";
    hiddenEl.id = "db-current-id";
    document.body.appendChild(hiddenEl);
  }
  hiddenEl.value = id;

  // Перезавантажуємо форму
  document
    .querySelectorAll(
      '.zone-block,.win-block,.bld-block,.dynamic-block[id^="owner-block"],.dynamic-block[id^="sign-block"],.eng-block'
    )
    .forEach((el) => el.remove());
  windowCount = 0;
  bldCount = 0;
  ownerCount = 0;
  signCount = 0;
  engCount = 0;
  zoneCounts = { roof: 0, over: 0, wall: 0, ceil: 0, flr: 0, fac: 0, fnd: 0 };
  loadData();
  loadStatic();
  openPage("p-general", document.querySelector(".nav-item"));
  showToast("Завантажено: " + record.address, "success");
}

async function dbDelete(id) {
  const record = dbAllRecords.find((r) => r.id === id);
  if (!confirm(`Видалити "${record?.address}"?\n\nЦю дію не можна скасувати.`)) return;
  try {
    const { error } = await _supabase.from("acts").delete().eq("id", id);
    if (error) throw error;
    const currentId = document.getElementById("db-current-id")?.value;
    if (currentId === id) {
      const el = document.getElementById("db-current-id");
      if (el) el.value = "";
    }
    await dbLoad();
  } catch (e) {
    showToast("Помилка видалення: " + (e.message || e), "error");
  }
}
