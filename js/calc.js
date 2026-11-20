// ═══════════════════════════════════════════════════════════════════
// РОЗРАХУНКИ — calcAll, підсумки, значки, таблиця обсягів
// ═══════════════════════════════════════════════════════════════════
function calcAll() {
  clearTimeout(_calcTimer);
  _calcTimer = setTimeout(_calcAllNow, 80);
}

function calcF(idPrefix) {
  const l = parseFloat(document.getElementById("l_" + idPrefix).value) || 0;
  const w =
    parseFloat((document.getElementById("w_" + idPrefix) || document.getElementById("h_" + idPrefix)).value) ||
    0;
  document.getElementById("t_" + idPrefix).value = l > 0 && w > 0 ? (l * w).toFixed(2) : "";
  calcAll();
}
function calcV(idPrefix) {
  const l = parseFloat(document.getElementById("l_" + idPrefix).value) || 0;
  const h = parseFloat(document.getElementById("h_" + idPrefix).value) || 0;
  const d = parseFloat(document.getElementById("d_" + idPrefix).value) || 0;
  document.getElementById("t_" + idPrefix).value = l > 0 && h > 0 && d > 0 ? (l * h * d).toFixed(2) : "";
  calcAll();
}

// Єдине джерело заокруглення для однієї позиції: спершу округлюємо суму по
// конкретній позиції до 2 знаків, і лише потім підсумовуємо округлені значення.
// Використовується в _calcAllNow (сайдбар), updateTabSubtotals (плашки вкладок)
// і updateVolumesTable (таблиця обсягів), щоб суми завжди сходились копійка в копійку.
function roundedItemValue(key) {
  return Math.round((volumes[key] || 0) * (DB[key] || 0) * 100) / 100;
}

function _calcAllNow() {
  volumes = {};
  let masterTotal = 0;
  document.querySelectorAll(".win-block").forEach((block) => {
    const id = block.dataset.id,
      qty = parseFloat(document.getElementById("q-win-" + id).value) || 1,
      type = document.getElementById("w-type-" + id).value,
      winAreaTotal = parseFloat(document.getElementById("res_w_" + id).value) || 0,
      slopeAreaTotal = parseFloat(document.getElementById("res_s_" + id).value) || 0;
    if (type === "door_in_6") {
      volumes[6] = (volumes[6] || 0) + qty;
    } else if (type === "door_out_7") {
      volumes[7] = (volumes[7] || 0) + qty;
    } else if (type === "frame") {
      volumes[9] = (volumes[9] || 0) + winAreaTotal;
      const sKey = document.getElementById("s-type-" + id).value;
      volumes[sKey] = (volumes[sKey] || 0) + slopeAreaTotal;
    } else if (type === "door_mp") {
      volumes[9] = (volumes[9] || 0) + winAreaTotal;
    } else {
      volumes[8] = (volumes[8] || 0) + winAreaTotal;
    }
  });
  document.querySelectorAll(".zone-block").forEach((block) => {
    const type = block.dataset.type,
      id = block.dataset.id,
      areaTotal = parseFloat(document.getElementById("res_" + type + "_" + id)?.value) || 0;
    if (areaTotal > 0) {
      block.querySelectorAll('input[type="checkbox"].cb-inp').forEach((cb) => {
        if (cb.checked) {
          const key = cb.dataset.id;
          volumes[key] = (volumes[key] || 0) + areaTotal;
        }
      });
    }
  });
  document.querySelectorAll(".eng-block").forEach((block) => {
    const id = block.dataset.id;
    ENG_CODES.forEach((code) => {
      let el = document.getElementById("e_" + code + "_" + id);
      if (!el) return;
      let v = parseFloat(el.value) || 0;
      if (v > 0) volumes[code] = (volumes[code] || 0) + v;
    });
  });
  document.querySelectorAll(".single-inp").forEach((inp) => {
    const val = parseFloat(inp.value) || 0;
    if (val > 0) volumes[inp.dataset.id] = (volumes[inp.dataset.id] || 0) + val;
  });
  for (let key in volumes) {
    if (volumes[key] > 0 && DB[key]) masterTotal += roundedItemValue(key);
  }
  document.getElementById("master_total_sidebar").innerText = formatSum(masterTotal);
  updateTabSubtotals();
  updateNavBadges();
  _saveDataNow();
}

function updateTabSubtotals() {
  for (const [name, keys] of Object.entries(SECTION_ITEM_MAPS)) {
    const bar = document.getElementById("subtotal-" + name);
    const valEl = document.getElementById("subtotal-" + name + "-val");
    if (!bar) continue;
    let sub = 0;
    keys.forEach((k) => {
      if (volumes[k] && DB[k]) sub += roundedItemValue(k);
    });
    if (sub > 0) {
      bar.classList.add("show");
      if (valEl) valEl.textContent = formatSum(sub) + " грн";
    } else {
      bar.classList.remove("show");
    }
  }
}

function updateNavBadges() {
  for (const [name, keys] of Object.entries(SECTION_ITEM_MAPS)) {
    const id = "badge-" + name;
    const el = document.getElementById(id);
    if (!el) continue;
    let count = keys.filter((k) => volumes[k] > 0).length;
    if (count > 0) {
      el.textContent = count;
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  }
}

function updateVolumesTable() {
  const wrap = document.getElementById("volumes-table-wrap");
  if (!wrap) return;
  const entries = Object.entries(volumes).filter(([k, v]) => v > 0 && DB[k]);
  if (entries.length === 0) {
    wrap.innerHTML =
      '<p style="color:var(--text3);font-size:13px;padding:18px 0">Поки немає жодного обсягу. Заповніть вкладки з пошкодженнями.</p>';
    return;
  }
  let html = `<table class="vol-table"><thead><tr><th>Позиція</th><th style="text-align:right">Обсяг</th><th style="text-align:right">Ціна/од</th><th>Сума, грн</th></tr></thead><tbody>`;
  let total = 0;
  entries.forEach(([k, v]) => {
    const price = DB[k],
      sum = roundedItemValue(k);
    total += sum;
    html += `<tr><td>${DB_LABELS[k] || "п." + k}</td><td style="text-align:right">${parseFloat(v).toFixed(2)}</td><td style="text-align:right;color:var(--text3)">${formatSum(price)}</td><td>${formatSum(sum)}</td></tr>`;
  });
  html += `</tbody><tfoot><tr><td colspan="3" style="padding:10px 13px">ЗАГАЛЬНА СУМА:</td><td>${formatSum(total)} грн</td></tr></tfoot></table>`;
  wrap.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════
// ВАЛІДАЦІЯ ФОРМИ
// ═══════════════════════════════════════════════════════════════════
function validateForm() {
  // Кожен запис — { msg, id } де id (опційно) — id поля, яке буде підсвічене
  // класом field-error і на яке скролить/фокусить клік по пункту списку.
  const errors = [],
    warnings = [];
  const addErr = (msg, id) => errors.push({ msg, id });
  const addWarn = (msg, id) => warnings.push({ msg, id });

  const cityVal = document.getElementById("addr_city")?.value;
  if (!cityVal || cityVal === "custom") addErr("Місто/Село — не заповнено", "addr_city");
  const strTypeVal = document.getElementById("addr_str_type")?.value;
  if (!strTypeVal || strTypeVal === "custom") addErr("Тип вулиці — не обрано", "addr_str_type");
  if (!document.getElementById("addr_street")?.value.trim()) addErr("Назва вулиці — не заповнена", "addr_street");
  if (!document.getElementById("addr_house")?.value.trim()) addErr("Будинок — не заповнений", "addr_house");
  let ownerHasName = false, firstOwnerId = null;
  document.querySelectorAll('[id^="owner-block"]').forEach((b) => {
    const id = b.id.split("-")[2];
    if (firstOwnerId === null) firstOwnerId = id;
    const nameEl = document.getElementById("ow_name_" + id);
    if (nameEl && nameEl.value.trim()) ownerHasName = true;
  });
  if (!ownerHasName) addErr("ПІБ / Назва компанії власника — не заповнено", firstOwnerId ? "ow_name_" + firstOwnerId : undefined);
  if (!document.getElementById("act_date")?.value.trim()) addWarn("Дата Акта — незаповнена", "act_date");
  if (!document.getElementById("cadastral")?.value.trim()) addWarn("Кадастровий номер — незаповнений", "cadastral");
  document.querySelectorAll('[id^="owner-block"]').forEach((b) => {
    const id = b.id.split("-")[2];
    const nameEl = document.getElementById("ow_name_" + id);
    const name = nameEl ? nameEl.value.trim() : "";
    if (!name) return;
    if (!document.getElementById("ow_doc_" + id)?.value.trim())
      addWarn("Власник " + name + ": Паспорт/ЄДРПОУ", "ow_doc_" + id);
    if (!document.getElementById("ow_rnokpp_" + id)?.value.trim())
      addWarn("Власник " + name + ": РНОКПП", "ow_rnokpp_" + id);
  });
  if (!document.getElementById("present_manual")?.value.trim()) addWarn('"У присутності" — незаповнено', "present_manual");
  if (!document.getElementById("zayava_info")?.value.trim()) addWarn('"На підставі заяви" — незаповнено', "zayava_info");
  if (!document.getElementById("comm_head_nom")?.value.trim()) addWarn("Голова комісії — незаповнено", "comm_head_nom");
  if (!document.getElementById("comm_head_gen")?.value.trim())
    addWarn("Голова комісії (Родовий) — незаповнено", "comm_head_gen");
  if (!document.getElementById("order_no")?.value.trim()) addWarn("Номер рішення — незаповнений", "order_no");
  let signHasName = false, firstSignId = null;
  document.querySelectorAll('[id^="sign-block-"]').forEach((b) => {
    const id = b.id.split("-")[2];
    if (firstSignId === null) firstSignId = id;
    if (document.getElementById("sign_name_" + id)?.value.trim()) signHasName = true;
  });
  if (!signHasName) addWarn("Підписи комісії — жодного підпису не додано", firstSignId ? "sign_name_" + firstSignId : undefined);
  let yearFilled = false, areaFilled = false, firstBldId = null;
  document.querySelectorAll(".bld-block").forEach((b) => {
    const id = b.dataset.id;
    if (firstBldId === null) firstBldId = id;
    if (document.getElementById("bld_year_built_" + id)?.value.trim()) yearFilled = true;
    if (document.getElementById("bld_total_area_" + id)?.value.trim()) areaFilled = true;
  });
  if (!yearFilled) addWarn("Рік будівництва — незаповнений (у жодній літері)", firstBldId ? "bld_year_built_" + firstBldId : undefined);
  if (!areaFilled) addWarn("Загальна площа — незаповнена (у жодній літері)", firstBldId ? "bld_total_area_" + firstBldId : undefined);
  if (!document.getElementById("legal_docs")?.value.trim())
    addWarn("Правовстановлюючі документи — незаповнені", "legal_docs");
  let bldFilled = false;
  document.querySelectorAll(".bld-block").forEach((b) => {
    const id = b.dataset.id;
    ["fnd", "wall", "in_wall", "roof"].forEach((prop) => {
      const el = document.getElementById("bld_" + prop + "_" + id);
      if (el && el.value && el.value !== "-") bldFilled = true;
    });
  });
  if (!bldFilled) addWarn("Конструктивні елементи (Техпаспорт) — не заповнені");
  if (!document.getElementById("dam_date")?.value.trim()) addWarn("Дата пошкодження — незаповнена", "dam_date");
  if (!document.getElementById("conclusions")?.value.trim()) addWarn("Висновки комісії — незаповнені", "conclusions");

  document.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error"));
  [...errors, ...warnings].forEach((item) => {
    if (!item.id) return;
    document.getElementById(item.id)?.classList.add("field-error");
  });

  const renderItem = (item) => {
    const attr = item.id ? ` data-field-id="${escapeAttr(item.id)}" onclick="focusValidationField('${escapeAttr(item.id)}')"` : "";
    return `<li${attr}>${escapeHtml(item.msg)}</li>`;
  };

  const msgEl = document.getElementById("validation-msg");
  const errHead = document.getElementById("val-err-head"),
    errList = document.getElementById("val-errors-list");
  const warnHead = document.getElementById("val-warn-head"),
    warnList = document.getElementById("val-warnings-list");
  if (errors.length > 0 || warnings.length > 0) {
    msgEl.classList.add("show");
    errHead.style.display = errors.length > 0 ? "block" : "none";
    errList.innerHTML = errors.map(renderItem).join("");
    warnHead.style.display = warnings.length > 0 ? "block" : "none";
    warnList.innerHTML = warnings.map(renderItem).join("");
  } else {
    msgEl.classList.remove("show");
  }
  return errors.length === 0;
}
function focusValidationField(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  const pageEl = el.closest(".page");
  if (pageEl && !pageEl.classList.contains("active")) {
    const navBtn = document.querySelector('.nav-item[onclick*="\'' + pageEl.id + '\'"]');
    openPage(pageEl.id, navBtn);
  }
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus();
  });
}

