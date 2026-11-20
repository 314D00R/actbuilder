// ═══════════════════════════════════════════════════════════════════
// ДИНАМІЧНІ БЛОКИ — власники, підписи, будівлі, вікна, зони, інженерія
// ═══════════════════════════════════════════════════════════════════
function addOwner() {
  ownerCount++;
  const n = ownerCount;
  const html = `<div class="dynamic-block" id="owner-block-${n}">
    <div class="dynamic-block-header">
        <span class="block-num">Власник №${n}</span>
        <select id="ow_type_${n}" onchange="checkOwnerType(this)" style="width:165px;flex-shrink:0"><option value="власник">Власник (Фіз)</option><option value="співвласник">Співвласник (Фіз)</option><option value="управитель">Управитель (Фіз)</option><option value="юридична особа">Юридична особа</option><option value="custom" class="custom-opt">✏ Вписати своє...</option></select>
        <input type="text" id="ow_name_${n}" class="block-title-input" placeholder="ПІБ / Назва компанії..." oninput="saveData()">
        ${n > 1 ? `<button class="block-del-btn" onclick="document.getElementById('owner-block-${n}').remove();saveData()">✖</button>` : ""}
    </div>
    <div class="form-row">
        <div class="f"><label>Паспорт / ЄДРПОУ</label><input type="text" id="ow_doc_${n}" placeholder="СЕ 123456" oninput="saveData()"></div>
        <div class="f"><label>Ким виданий</label><input type="text" id="ow_org_${n}" value="Іллічівським МВ ГУМВС України в Одеській обл." oninput="saveData()"></div>
        <div class="f-sm"><label>Дата видачі</label><input type="text" id="ow_pass_date_${n}" placeholder="12.12.2012" oninput="saveData()"></div>
        <div class="f-sm"><label>РНОКПП</label><input type="text" id="ow_rnokpp_${n}" placeholder="123456789" oninput="saveData()"></div>
    </div>
</div>`;
  document.getElementById("owners-container").insertAdjacentHTML("beforeend", html);
  saveData();
}

// ── Drag-and-drop для блоків підписантів ──────────────────────────
let _dndDragging = null;

function initSignDnd() {
  const container = document.getElementById("signatures-container");
  if (!container) return;

  container.addEventListener("dragstart", (e) => {
    const block = e.target.closest(".sign-draggable");
    if (!block) return;
    _dndDragging = block;
    block.style.opacity = "0.45";
    e.dataTransfer.effectAllowed = "move";
  });

  container.addEventListener("dragend", (e) => {
    const block = e.target.closest(".sign-draggable");
    if (!block) return;
    block.setAttribute("draggable", "false");
    block.style.opacity = "";
    _dndDragging = null;
    container.querySelectorAll(".sign-draggable").forEach(b => b.classList.remove("dnd-over"));
    saveStatic();
  });

  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const block = e.target.closest(".sign-draggable");
    if (!block || block === _dndDragging) return;
    container.querySelectorAll(".sign-draggable").forEach(b => b.classList.remove("dnd-over"));
    block.classList.add("dnd-over");
    const rect = block.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (e.clientY < mid) {
      container.insertBefore(_dndDragging, block);
    } else {
      container.insertBefore(_dndDragging, block.nextSibling);
    }
  });

  container.addEventListener("dragleave", (e) => {
    const block = e.target.closest(".sign-draggable");
    if (block) block.classList.remove("dnd-over");
  });

  container.addEventListener("drop", (e) => {
    e.preventDefault();
    container.querySelectorAll(".sign-draggable").forEach(b => b.classList.remove("dnd-over"));
  });
}

function addSignature() {
  signCount++;
  const n = signCount;
  const html = `<div class="dynamic-block sign-draggable" id="sign-block-${n}" style="padding:12px 14px;margin-bottom:7px" draggable="false">
    <div class="form-row" style="margin-bottom:0;align-items:center">
        <div class="sign-drag-handle" title="Перетягни для сортування" style="flex-shrink:0;cursor:grab;color:var(--text3);font-size:18px;padding:2px 5px;line-height:1;user-select:none;align-self:center;display:flex;align-items:center;justify-content:center;height:36px" onmousedown="this.closest('.sign-draggable').setAttribute('draggable','true')" onmouseup="this.closest('.sign-draggable').setAttribute('draggable','false')">⠿</div>
        <div class="f-sm"><label>Роль</label><select id="sign_role_${n}" onchange="saveStatic()"><option value="Заступник голови комісії">Заступник</option><option value="Секретар комісії">Секретар</option><option value="Член комісії">Член комісії</option></select></div>
        <div class="f"><label>ПІБ (Називний)</label><input type="text" id="sign_name_${n}" placeholder="Ольга Субботкіна" oninput="saveStatic()"></div>
        <button class="block-del-btn" style="margin-top:18px" onclick="document.getElementById('sign-block-${n}').remove();saveStatic()">✖</button>
    </div>
</div>`;
  document.getElementById("signatures-container").insertAdjacentHTML("beforeend", html);
  if (!_loadingStatic) saveStatic();
}

const optFnd = `<option value="-">-</option><option value="Залізобетонні">Залізобетонні</option><option value="Бетонні">Бетонні</option><option value="Палі">Палі</option><option value="Монолітні">Монолітні</option><option value="Бутові">Бутові</option><option value="custom" class="custom-opt">✏ Вписати свій...</option>`;
const optWall = `<option value="-">-</option><option value="цегла">цегла</option><option value="черепашник">черепашник</option><option value="газобетон">газобетон</option><option value="металеві">металеві</option><option value="дерев'яні">дерев'яні</option><option value="бутові">бутові</option><option value="панельні">панельні</option><option value="блоки">блоки</option><option value="custom" class="custom-opt">✏ Вписати свій...</option>`;
const optInWall = `<option value="-">-</option><option value="цегла">цегла</option><option value="черепашник">черепашник</option><option value="газобетон">газобетон</option><option value="металеві">металеві</option><option value="дерев'яні">дерев'яні</option><option value="панельні">панельні</option><option value="гіпсокартон">гіпсокартон</option><option value="шпалери">шпалери</option><option value="оштукатурені, пофарбовані">оштукатурені, пофарбовані</option><option value="custom" class="custom-opt">✏ Вписати свій...</option>`;
const optOver = `<option value="-">-</option><option value="з/б плити">з/б плити</option><option value="монолітні">монолітні</option><option value="дерев'яні">дерев'яні</option><option value="custom" class="custom-opt">✏ Вписати свій...</option>`;
const optCover = `<option value="-">-</option><option value="цементна стяжка">цементна стяжка</option><option value="плитка">плитка</option><option value="дорожні плити">дорожні плити</option><option value="custom" class="custom-opt">✏ Вписати свій...</option>`;
const optRoof = `<option value="-">-</option><option value="рулонна">рулонна</option><option value="бітумна черепиця">бітумна черепиця</option><option value="металочерепиця">металочерепиця</option><option value="металопрофіль">металопрофіль</option><option value="шифер">шифер</option><option value="custom" class="custom-opt">✏ Вписати свій...</option>`;
const optWin = `<option value="-">-</option><option value="дерев'яні">дерев'яні</option><option value="металопластикові">металопластикові</option><option value="металеві">металеві</option><option value="custom" class="custom-opt">✏ Вписати свій...</option>`;
const optDoor = `<option value="-">-</option><option value="дерев'яні">дерев'яні</option><option value="металопластикові">металопластикові</option><option value="металеві">металеві</option><option value="custom" class="custom-opt">✏ Вписати свій...</option>`;
const optFac = `<option value="-">-</option><option value="оштукатурені, пофарбовані">оштукатурені, пофарбовані</option><option value="цегла">цегла</option><option value="утеплені пенопластом">утеплені пенопластом</option><option value="утеплені мін. ватою">утеплені мін. ватою</option><option value="custom" class="custom-opt">✏ Вписати свій...</option>`;
const optFlr = `<option value="-">-</option><option value="лінолеум">лінолеум</option><option value="плитка">плитка</option><option value="цементна стяжка">цементна стяжка</option><option value="ламінат">ламінат</option><option value="паркет">паркет</option><option value="дощаті">дощаті</option><option value="custom" class="custom-opt">✏ Вписати свій...</option>`;
const optCeil = `<option value="-">-</option><option value="гіпсокартон">гіпсокартон</option><option value="підвісна">підвісна</option><option value="оштукатурені, пофарбовані">оштукатурені, пофарбовані</option><option value="шпалери">шпалери</option><option value="custom" class="custom-opt">✏ Вписати свій...</option>`;
const optYN = `<option value="так">так</option><option value="ні">ні</option><option value="-">-</option><option value="custom" class="custom-opt">✏ Вписати свій...</option>`;

function addBuilding() {
  bldCount++;
  const n = bldCount;
  const html = `<div class="dynamic-block bld-block" id="bld-block-${n}" data-id="${n}">
    <div class="dynamic-block-header">
        <span class="block-num">Будівля №${n}</span>
        <input type="text" class="bld-name block-title-input" id="bld_name_${n}" placeholder="Літера (напр. Літ. 2Х)" oninput="updateBuildingDropdowns();saveData()">
        ${n > 1 ? `<button class="block-del-btn" onclick="document.getElementById('bld-block-${n}').remove();updateBuildingDropdowns();saveData()">✖</button>` : ""}
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.6px;padding:4px 0 8px;border-bottom:1px solid var(--border);margin-bottom:10px">📐 Загальні характеристики</div>
    <div class="form-row" style="flex-wrap:nowrap">
        <div style="flex:3;min-width:0"><label>Пам'ятка спадщини</label><input type="text" id="bld_heritage_${n}" value="відсутні" oninput="saveData()"></div>
        <div style="flex:0 0 120px"><label>Рік будівництва</label><input type="text" id="bld_year_built_${n}" placeholder="1990" oninput="saveData()"></div>
        <div style="flex:0 0 120px"><label>Заг. площа, м²</label><input type="text" id="bld_total_area_${n}" placeholder="100" oninput="saveData()"></div>
    </div>
    <div class="form-row" style="flex-wrap:nowrap">
        <div style="flex:2;min-width:0"><label>Поверхів (загалом)</label><input type="text" id="bld_floors_total_${n}" value="1" oninput="saveData()"></div>
        <div style="flex:0 0 90px"><label>Наземних</label><input type="text" id="bld_floors_over_${n}" placeholder="1" oninput="saveData()"></div>
        <div style="flex:0 0 100px"><label>Підземних</label><input type="text" id="bld_floors_under_${n}" value="відсутні" oninput="saveData()"></div>
        <div style="flex:0 0 100px"><label>Мансардних</label><input type="text" id="bld_mansard_${n}" value="відсутні" oninput="saveData()"></div>
        <div style="flex:0 0 100px"><label>К-сть секцій</label><input type="text" id="bld_sections_${n}" value="відсутні" oninput="saveData()"></div>
        <div style="flex:0 0 110px"><label>К-сть квартир</label><input type="text" id="bld_apartments_${n}" value="відсутні" oninput="saveData()"></div>
        <div style="flex:0 0 120px"><label>нежитлових, м²</label><input type="text" id="bld_built_in_area_${n}" value="0" oninput="saveData()"></div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.6px;padding:10px 0 8px;border-bottom:1px solid var(--border);margin-bottom:10px">🏗️ Конструктивні елементи</div>
    <div class="form-row"><div class="f"><label>Фундаменти</label><select id="bld_fnd_${n}" onchange="checkCustom(this)">${optFnd}</select></div><div class="f"><label>Стіни зовнішні</label><select id="bld_wall_${n}" onchange="checkCustom(this)">${optWall}</select></div><div class="f"><label>Стіни внутрішні</label><select id="bld_in_wall_${n}" onchange="checkCustom(this)">${optInWall}</select></div></div>
    <div class="form-row"><div class="f"><label>Перекриття (1 пов.)</label><select id="bld_over1_${n}" onchange="checkCustom(this)">${optOver}</select></div><div class="f"><label>Перекриття (Міжпов.)</label><select id="bld_overm_${n}" onchange="checkCustom(this)">${optOver}</select></div><div class="f"><label>Перекриття (Горище)</label><select id="bld_overa_${n}" onchange="checkCustom(this)">${optOver}</select></div></div>
    <div class="form-row"><div class="f"><label>Покриття</label><select id="bld_cover_${n}" onchange="checkCustom(this)">${optCover}</select></div><div class="f"><label>Покрівлі</label><select id="bld_roof_${n}" onchange="checkCustom(this)">${optRoof}</select></div><div class="f"><label>Вікна</label><select id="bld_win_${n}" onchange="checkCustom(this)">${optWin}</select></div><div class="f"><label>Двері вхідні</label><select id="bld_door_${n}" onchange="checkCustom(this)">${optDoor}</select></div></div>
    <div class="form-row"><div class="f"><label>Фасад</label><select id="bld_fac_${n}" onchange="checkCustom(this)">${optFac}</select></div><div class="f"><label>Підлоги</label><select id="bld_flr_${n}" onchange="checkCustom(this)">${optFlr}</select></div><div class="f"><label>Стеля</label><select id="bld_ceil_${n}" onchange="checkCustom(this)">${optCeil}</select></div></div>
    <div class="form-row" style="background:var(--surface);padding:9px;border-radius:7px;border:1px solid var(--border)">
        <div class="f-sm"><label>Електро</label><select id="bld_el_${n}" onchange="checkCustom(this)">${optYN}</select></div>
        <div class="f-sm"><label>Водопостач.</label><select id="bld_w_${n}" onchange="checkCustom(this)">${optYN}</select></div>
        <div class="f-sm"><label>Газ</label><select id="bld_g_${n}" onchange="checkCustom(this)">${optYN}</select></div>
        <div class="f-sm"><label>Каналізація</label><select id="bld_kan_${n}" onchange="checkCustom(this)">${optYN}</select></div>
        <div class="f-sm"><label>Опалення</label><select id="bld_op_${n}" onchange="checkCustom(this)">${optYN}</select></div>
    </div>
</div>`;
  document.getElementById("buildings-container").insertAdjacentHTML("beforeend", html);
  updateBuildingDropdowns();
  saveData();
}

function getBuildingOptions() {
  let options = '<option value="">(Без літери / Квартира)</option>';
  document.querySelectorAll(".bld-name").forEach((input) => {
    let val = input.value.trim();
    if (val) options += `<option value="${escapeHtml(val)}">${escapeHtml(val)}</option>`;
  });
  return options;
}
function updateBuildingDropdowns() {
  let options = getBuildingOptions();
  document.querySelectorAll(".bld-select").forEach((select) => {
    let cur = select.value;
    select.innerHTML = options;
    select.value = cur;
  });
}

function addWindow() {
  windowCount++;
  const id = windowCount;
  const html = `<div class="dynamic-block win-block" id="win-block-${id}" data-id="${id}">
    <div class="dynamic-block-header">
        <span class="block-num">Блок №${id}</span>
        <select id="bld_sel_win_${id}" class="bld-select bld-select-inline" onchange="saveData()">${getBuildingOptions()}</select>
        <input type="text" id="name_win_${id}" class="block-title-input" placeholder="Назва зони (напр. Вікна м/п кімната 1)" oninput="saveData()">
        <label class="act-toggle" title="Акт + чеклист / Тільки чеклист" style="flex-shrink:0">
          <input type="checkbox" id="in_act_win_${id}" checked onchange="saveData()">
          <span class="act-toggle-track">
            <span class="act-toggle-thumb"></span>
            <span class="act-toggle-ton">📋 Акт + чеклист</span>
            <span class="act-toggle-toff">🧮 Тільки чеклист</span>
          </span>
        </label>
        <button class="block-copy-btn" title="Копіювати зону" onclick="duplicateWindow(${id})">⧉</button>
        <button class="block-del-btn" onclick="removeWindow(${id})">✖</button>
    </div>
    <div class="form-row" style="align-items:flex-end;flex-wrap:wrap">
        <div class="f-xs"><label>К-сть</label><input type="number" id="q-win-${id}" value="1" oninput="calcWinArea(${id})"></div>
        <div class="f"><label>Тип</label><div style="display:flex;align-items:center;gap:6px"><select id="w-type-${id}" onchange="toggleWinType(${id});calcAll()" style="flex:1"><option value="glass">п.8 — Вікно: тільки скло (м²)</option><option value="frame">п.9+10 — Вікно: рама + укоси (м²)</option><option value="door_mp">п.9 — Двері м/п (без укосів, м²)</option><option value="door_in_6">п.6 — Двері міжкімнатні (шт)</option><option value="door_out_7">п.7 — Двері вхідні метал. (шт)</option></select><span class="item-info-btn" onclick="showItemInfo(getWinTypeItemKey(${id}),event)">ℹ</span></div></div>
        <div id="slope-type-container-${id}" class="f-sm" style="display:none"><label>Тип укосів</label><div style="display:flex;align-items:center;gap:6px"><select id="s-type-${id}" onchange="calcAll()" style="flex:1"><option value="10">Штукатурка</option><option value="30">Гіпсокартон</option></select><span class="item-info-btn" onclick="showItemInfo(document.getElementById('s-type-${id}').value,event)">ℹ</span></div></div>
    </div>
    <div class="calc-strip">
        <span id="area-input-box-${id}" style="display:flex;align-items:center;gap:7px">
            <label>Ш:</label><input type="number" id="w_${id}" oninput="calcWinArea(${id})" placeholder="0">
            <span class="math">×</span>
            <label>В:</label><input type="number" id="h_${id}" oninput="calcWinArea(${id})" placeholder="0">
            <span class="math">=</span>
            <label>ПЛОЩА:</label><input type="number" id="res_w_${id}" class="result-input" oninput="calcAll()" placeholder="0.00"> <span style="color:var(--text3);font-size:12px">м²</span>
        </span>
        <span id="slope-input-box-${id}" style="display:none;align-items:center;gap:7px;margin-left:8px;padding-left:8px;border-left:1px solid var(--border2)">
            <label>Глиб:</label><input type="number" id="d_${id}" value="0.3" oninput="calcWinArea(${id})" style="width:56px">
            <span class="math">→</span>
            <label>Укоси:</label><input type="number" id="res_s_${id}" class="result-input" oninput="calcAll()" placeholder="0.00"> <span style="color:var(--text3);font-size:12px">м²</span>
        </span>
    </div>
    <input type="text" id="desc_win_${id}" style="width:100%" placeholder="Опис пошкодження для Акта..." oninput="saveData()">
</div>`;
  document.getElementById("windows-container").insertAdjacentHTML("beforeend", html);
  renumberWindows();
  calcAll();
}
function renumberWindows() {
  document.querySelectorAll(".win-block").forEach((block, idx) => {
    const numEl = block.querySelector(".block-num");
    if (numEl) numEl.textContent = "Блок №" + (idx + 1);
  });
}
function removeWindow(id) {
  const container = document.getElementById("windows-container");
  if (!container) return;
  if (container.querySelectorAll(".win-block").length <= 1) {
    alert("Неможливо видалити — це єдина зона цього типу.");
    return;
  }
  document.getElementById("win-block-" + id)?.remove();
  renumberWindows();
  calcAll();
}
function duplicateWindow(id) {
  const src = document.getElementById("win-block-" + id);
  if (!src) return;
  addWindow();
  const newId = windowCount;
  const dst = document.getElementById("win-block-" + newId);
  if (!dst) return;
  copyZoneFieldValues(src, dst);
  toggleWinType(newId);
  calcWinArea(newId);
  saveData();
  calcAll();
}
function renumberZoneBlocks(type) {
  document.querySelectorAll('.zone-block[data-type="' + type + '"]').forEach((block, idx) => {
    const numEl = block.querySelector(".block-num");
    if (numEl) numEl.textContent = numEl.textContent.replace(/№\d+$/, "№" + (idx + 1));
  });
}
function renumberKonstZones(section) {
  document.querySelectorAll('.konst-zone[data-section="' + section + '"]').forEach((block, idx) => {
    const numEl = block.querySelector(".block-num");
    if (numEl) numEl.textContent = numEl.textContent.replace(/№\d+$/, "№" + (idx + 1));
  });
}
function removeZone(type, id) {
  const container = document.getElementById(type + "-container");
  if (!container) return;
  if (container.querySelectorAll(".zone-block").length <= 1) {
    alert("Неможливо видалити — це єдина зона цього типу.");
    return;
  }
  document.getElementById("zone-" + type + "-" + id)?.remove();
  renumberZoneBlocks(type);
  calcAll();
}
function copyZoneFieldValues(src, dst) {
  const srcFields = src.querySelectorAll("input, select, textarea");
  const dstFields = dst.querySelectorAll("input, select, textarea");
  srcFields.forEach((el, i) => {
    const target = dstFields[i];
    if (!target) return;
    if (el.type === "checkbox" || el.type === "radio") target.checked = el.checked;
    else target.value = el.value;
  });
}
function duplicateZone(type, id) {
  const src = document.getElementById("zone-" + type + "-" + id);
  if (!src) return;
  addZone(type);
  const newId = zoneCounts[type];
  const dst = document.getElementById("zone-" + type + "-" + newId);
  if (!dst) return;
  copyZoneFieldValues(src, dst);
  saveData();
  calcAll();
}
function removeKonstZone(section, delId) {
  const container = document.getElementById(KONST_CONTAINER_IDS[section]);
  if (!container) return;
  if (container.querySelectorAll(".konst-zone").length <= 1) {
    alert("Неможливо видалити — це єдина зона цього типу.");
    return;
  }
  document.getElementById(delId)?.remove();
  renumberKonstZones(section);
  calcAll();
}
function duplicateKonstZone(section, srcId) {
  const src = document.getElementById(srcId);
  if (!src) return;
  addConstZone(section);
  const newIdx = manualZoneCounts[section];
  const containerId = KONST_CONTAINER_IDS[section];
  const dst = document.querySelector('#' + containerId + ' .konst-zone[data-idx="' + newIdx + '"]');
  if (!dst) return;
  copyZoneFieldValues(src, dst);
  saveData();
  calcAll();
}
function getWinTypeItemKey(id) {
  const type = document.getElementById("w-type-" + id)?.value;
  const map = { glass: "8", frame: "9", door_mp: "9", door_in_6: "6", door_out_7: "7" };
  return map[type] || "8";
}
function toggleWinType(id) {
  const type = document.getElementById("w-type-" + id).value,
    isFrame = type === "frame",
    isCountedDoor = type === "door_in_6" || type === "door_out_7";
  const sc = document.getElementById("slope-type-container-" + id),
    sb = document.getElementById("slope-input-box-" + id);
  if (sc) sc.style.display = isFrame ? "" : "none";
  if (sb) sb.style.display = isFrame ? "flex" : "none";
  const areaBox = document.getElementById("area-input-box-" + id);
  if (areaBox) areaBox.style.display = isCountedDoor ? "none" : "flex";
  if (isCountedDoor) {
    // п.6/п.7 рахуються тільки в штуках — прибираємо залишкові розміри, щоб не потрапили в Акт
    ["w_", "h_", "d_", "res_w_", "res_s_"].forEach((prefix) => {
      const el = document.getElementById(prefix + id);
      if (el && prefix !== "d_") el.value = "";
    });
  }
}
function calcWinArea(id) {
  const qty = parseFloat(document.getElementById("q-win-" + id).value) || 1,
    w = parseFloat(document.getElementById("w_" + id).value) || 0,
    h = parseFloat(document.getElementById("h_" + id).value) || 0,
    d = parseFloat(document.getElementById("d_" + id).value) || 0;
  if (w > 0 && h > 0) {
    document.getElementById("res_w_" + id).value = (w * h * qty).toFixed(2);
    document.getElementById("res_s_" + id).value = ((2 * h + w) * d * qty).toFixed(2);
  }
  calcAll();
}

function addZone(type) {
  zoneCounts[type]++;
  const id = zoneCounts[type];
  let title = "",
    dim2Label = "Ширина",
    dim2Id = "w",
    cbsHTML = "";
  const mkCb = (cbtype, zone, cbid, label) =>
    `<label class="cb-item"><input type="checkbox" class="cb-inp" data-type="${cbtype}" data-zone="${zone}" data-id="${cbid}" onchange="calcAll()"><div class="cb-box"></div><span class="cb-text">${label}</span><span class="item-info-btn" onclick="showItemInfo('${cbid}',event)">ℹ</span></label>`;
  if (type === "roof") {
    title = "Дах";
    cbsHTML =
      mkCb(type, id, 1, "п.1. Локально шифер/черепиця") +
      mkCb(type, id, 3, "п.3. Заміна без крокв") +
      mkCb(type, id, 4, "п.4. З кроквами до 25%") +
      mkCb(type, id, 5, "п.5. З кроквами більше 25%");
  } else if (type === "over") {
    title = "Перекриття";
    cbsHTML =
      mkCb(type, id, 16, "п.16. Розбирання дерев'яних") +
      mkCb(type, id, 17, "п.17. Влаштування дерев'яних") +
      mkCb(type, id, 18, "п.18. Розбирання з/б") +
      mkCb(type, id, 19, "п.19. Відновлення з/б");
  } else if (type === "wall") {
    title = "Стіни";
    dim2Label = "Висота";
    dim2Id = "h";
    cbsHTML =
      mkCb(type, id, 24, "п.24. Штукатурення") +
      mkCb(type, id, 26, "п.26. Фарбування") +
      mkCb(type, id, 27, "п.27. Шпалери") +
      mkCb(type, id, 28, "п.28. Плитка") +
      mkCb(type, id, 29, "п.29. Гіпсокартон (фальшстіни)");
  } else if (type === "ceil") {
    title = "Стеля";
    cbsHTML =
      mkCb(type, id, 25, "п.25. Підготовка (розчищення)") +
      mkCb(type, id, 32, "п.32. Фарбування") +
      mkCb(type, id, 33, "п.33. Шпалери") +
      mkCb(type, id, 34, "п.34. Підвісні/натяжні/гіпсокартон");
  } else if (type === "flr") {
    title = "Підлога";
    cbsHTML =
      mkCb(type, id, 35, "п.35. Розбирання стяжки") +
      mkCb(type, id, 36, "п.36. Гідроізоляція") +
      mkCb(type, id, 37, "п.37. Стяжка цементна") +
      mkCb(type, id, 41, "п.41. Стяжка самовирівнювальна") +
      mkCb(type, id, 38, "п.38. Плитка") +
      mkCb(type, id, 39, "п.39. Ламінат") +
      mkCb(type, id, 42, "п.42. Лінолеум") +
      mkCb(type, id, 44, "п.44. Відновлення дощатих");
  } else if (type === "fac") {
    title = "Фасад";
    dim2Label = "Висота";
    dim2Id = "h";
    cbsHTML =
      mkCb(type, id, 12, "п.12. З утепленням") +
      mkCb(type, id, 13, "п.13. Без утеплення (опорядження)") +
      mkCb(type, id, 14, "п.14. Штукатурення без утеплення") +
      mkCb(type, id, 15, "п.15. Фарбування") +
      mkCb(type, id, 11, "п.11. Відновлення укосів");
  } else if (type === "fnd") {
    title = "Фундамент";
    cbsHTML =
      mkCb(type, id, 60, "п.60. Захисний шар") +
      mkCb(type, id, 61, "п.61. Гідроізоляція") +
      mkCb(type, id, 63, "п.63. Вимощення асфальт") +
      mkCb(type, id, 64, "п.64. Вимощення бетон");
  }

  const html = `<div class="dynamic-block zone-block" id="zone-${type}-${id}" data-type="${type}" data-id="${id}">
    <div class="dynamic-block-header">
        <span class="block-num">${title} №${id}</span>
        <select id="bld_sel_${type}_${id}" class="bld-select bld-select-inline" onchange="saveData()">${getBuildingOptions()}</select>
        <input type="text" id="name_${type}_${id}" class="block-title-input" placeholder="Назва зони пошкодження" oninput="saveData()">
        <label class="act-toggle" title="Акт + чеклист / Тільки чеклист" style="flex-shrink:0">
          <input type="checkbox" id="in_act_${type}_${id}" checked onchange="saveData()">
          <span class="act-toggle-track">
            <span class="act-toggle-thumb"></span>
            <span class="act-toggle-ton">📋 Акт + чеклист</span>
            <span class="act-toggle-toff">🧮 Тільки чеклист</span>
          </span>
        </label>
        <button class="block-copy-btn" title="Копіювати зону" onclick="duplicateZone('${type}',${id})">⧉</button>
        <button class="block-del-btn" onclick="removeZone('${type}',${id})">✖</button>
    </div>
    <div class="calc-strip">
        <label>К-сть:</label><input type="number" id="q_${type}_${id}" value="1" oninput="calcZoneArea('${type}',${id})" style="width:52px">
        <span class="math">|</span>
        <label>Д:</label><input type="number" id="l_${type}_${id}" oninput="calcZoneArea('${type}',${id})" placeholder="0">
        <span class="math">×</span>
        <label>${dim2Label.charAt(0)}:</label><input type="number" id="${dim2Id}_${type}_${id}" oninput="calcZoneArea('${type}',${id})" placeholder="0">
        <span class="math">=</span>
        <label>ПЛОЩА:</label><input type="number" id="res_${type}_${id}" class="result-input" oninput="calcAll()" placeholder="0.00"> <span style="color:var(--text3);font-size:12px">м²</span>
    </div>
    ${type === "wall" ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <label class="wall-toggle" title="Внутрішні / Зовнішні стіни">
          <input type="checkbox" id="wall_side_toggle_${id}" onchange="saveData()">
          <span class="wall-toggle-track">
            <span class="wall-toggle-thumb"></span>
            <span class="wall-toggle-ton">🏛️ Зовнішні</span>
            <span class="wall-toggle-toff">🏠 Внутрішні</span>
          </span>
        </label>
    </div>` : ""}
    <div class="cb-grid">${cbsHTML}</div>
    <input type="text" id="desc_${type}_${id}" style="width:100%;margin-top:9px" placeholder="Опис пошкодження для Акта..." oninput="saveData()">
</div>`;
  document.getElementById(type + "-container").insertAdjacentHTML("beforeend", html);
  calcAll();
}
function calcZoneArea(type, id) {
  const qty = parseFloat(document.getElementById("q_" + type + "_" + id).value) || 1,
    l = parseFloat(document.getElementById("l_" + type + "_" + id).value) || 0,
    secondEl =
      document.getElementById("w_" + type + "_" + id) || document.getElementById("h_" + type + "_" + id),
    w = secondEl ? parseFloat(secondEl.value) || 0 : 0;
  if (l > 0 && w > 0) document.getElementById("res_" + type + "_" + id).value = (l * w * qty).toFixed(2);
  calcAll();
}

function constZoneHeader(section, idx, title, delId) {
  return `<div class="dynamic-block-header">
          <span class="block-num">${title} №${idx}</span>
          <select id="bld_sel_${section}_${idx}" class="bld-select bld-select-inline konst-input" onchange="saveData()">${getBuildingOptions()}</select>
          <input type="text" id="name_${section}_${idx}" class="block-title-input konst-input" placeholder="Назва зони пошкодження" oninput="saveData()">
          <label class="act-toggle" title="Акт + чеклист / Тільки чеклист" style="flex-shrink:0">
            <input type="checkbox" id="in_act_${section}_${idx}" class="konst-check" checked onchange="saveData()">
            <span class="act-toggle-track">
              <span class="act-toggle-thumb"></span>
              <span class="act-toggle-ton">📋 Акт + чеклист</span>
              <span class="act-toggle-toff">🧮 Тільки чеклист</span>
            </span>
          </label>
          <button class="block-copy-btn" title="Копіювати зону" onclick="duplicateKonstZone('${section}','${delId}')">⧉</button>
          <button class="block-del-btn" onclick="removeKonstZone('${section}','${delId}')">✖</button>
      </div>`;
}
function addConstZone(section) {
  manualZoneCounts[section]++;
  const idx = manualZoneCounts[section];
  if (section === "wallsConst") {
    const html = `<div class="konst-zone dynamic-block" data-section="wallsConst" data-idx="${idx}" id="walls-const-zone-${idx}">
      ${constZoneHeader("wallsConst", idx, "Стіни (конструктив)", "walls-const-zone-" + idx)}
      <div class="work-item-row">
        <div class="wi-top">
          <span class="wi-label" style="display:flex;align-items:center">п.20. Розбирання пошкоджених стін<span class="item-info-btn" onclick="showItemInfo('20',event)">ℹ</span></span
          ><input type="number" class="single-inp wi-input" data-id="20" id="t_c20_${idx}" oninput="calcAll()" />
        </div>
        <div class="inline-calc">
          <label>Д:</label><input type="number" class="constcalc-inp" id="l_c20_${idx}" oninput="calcV('c20_${idx}')" /><label>× В:</label
          ><input type="number" class="constcalc-inp" id="h_c20_${idx}" oninput="calcV('c20_${idx}')" /><label>× Товщ:</label
          ><input type="number" class="constcalc-inp" id="d_c20_${idx}" oninput="calcV('c20_${idx}')" /> м³
        </div>
      </div>
      <div class="work-item-row">
        <div class="wi-top">
          <span class="wi-label" style="display:flex;align-items:center">п.21. Мурування стін<span class="item-info-btn" onclick="showItemInfo('21',event)">ℹ</span></span
          ><input type="number" class="single-inp wi-input" data-id="21" id="t_c21_${idx}" oninput="calcAll()" />
        </div>
        <div class="inline-calc">
          <label>Д:</label><input type="number" class="constcalc-inp" id="l_c21_${idx}" oninput="calcV('c21_${idx}')" /><label>× В:</label
          ><input type="number" class="constcalc-inp" id="h_c21_${idx}" oninput="calcV('c21_${idx}')" /><label>× Товщ:</label
          ><input type="number" class="constcalc-inp" id="d_c21_${idx}" oninput="calcV('c21_${idx}')" /> м³
        </div>
      </div>
      <div class="work-item-row">
        <div class="wi-top">
          <span class="wi-label" style="display:flex;align-items:center">п.22. Мурування внутрішніх перегородок<span class="item-info-btn" onclick="showItemInfo('22',event)">ℹ</span></span
          ><input type="number" class="single-inp wi-input" data-id="22" id="t_c22_${idx}" oninput="calcAll()" />
        </div>
        <div class="inline-calc">
          <label>Д:</label><input type="number" class="constcalc-inp" id="l_c22_${idx}" oninput="calcF('c22_${idx}')" /><label>× В:</label
          ><input type="number" class="constcalc-inp" id="w_c22_${idx}" oninput="calcF('c22_${idx}')" /> м²
        </div>
      </div>
      <div class="work-item-row">
        <div class="wi-top">
          <span class="wi-label" style="display:flex;align-items:center">п.23. Відбивання штукатурки<span class="item-info-btn" onclick="showItemInfo('23',event)">ℹ</span></span
          ><input type="number" class="single-inp wi-input" data-id="23" id="t_c23_${idx}" oninput="calcAll()" />
        </div>
        <div class="inline-calc">
          <label>Д:</label><input type="number" class="constcalc-inp" id="l_c23_${idx}" oninput="calcF('c23_${idx}')" /><label>× В:</label
          ><input type="number" class="constcalc-inp" id="w_c23_${idx}" oninput="calcF('c23_${idx}')" /> м²
        </div>
      </div>
      <input type="text" id="desc_wallsConst_${idx}" class="konst-input" style="width:100%;margin-top:9px" placeholder="Опис пошкодження для Акта..." oninput="saveData()">
    </div>`;
    document.getElementById("walls-const-container").insertAdjacentHTML("beforeend", html);
  } else if (section === "krokvy") {
    const html = `<div class="konst-zone dynamic-block" data-section="krokvy" data-idx="${idx}" id="krokvy-zone-${idx}">
      ${constZoneHeader("krokvy", idx, "Крокви", "krokvy-zone-" + idx)}
      <div class="work-item-row">
        <div class="wi-top">
          <span class="wi-label" style="display:flex;align-items:center">п.2. Заміна кроквяних ніг із брусів<span class="item-info-btn" onclick="showItemInfo('2',event)">ℹ</span></span
          ><input type="number" class="single-inp wi-input" data-id="2" id="t_krokvy_${idx}" oninput="calcAll()" />
        </div>
      </div>
      <input type="text" id="desc_krokvy_${idx}" class="konst-input" style="width:100%;margin-top:9px" placeholder="Опис пошкодження для Акта..." oninput="saveData()">
    </div>`;
    document.getElementById("krokvy-container").insertAdjacentHTML("beforeend", html);
  } else if (section === "flrManual") {
    const html = `<div class="konst-zone dynamic-block" data-section="flrManual" data-idx="${idx}" id="flr-manual-zone-${idx}">
      ${constZoneHeader("flrManual", idx, "Окремі роботи", "flr-manual-zone-" + idx)}
      <div class="work-item-row">
        <div class="wi-top">
          <span class="wi-label" style="display:flex;align-items:center">п.43. Заміна окремих дощок у підлогах<span class="item-info-btn" onclick="showItemInfo('43',event)">ℹ</span></span
          ><input type="number" class="single-inp wi-input" data-id="43" id="t_flrman_${idx}" oninput="calcAll()" />
        </div>
      </div>
      <input type="text" id="desc_flrManual_${idx}" class="konst-input" style="width:100%;margin-top:9px" placeholder="Опис пошкодження для Акта..." oninput="saveData()">
    </div>`;
    document.getElementById("flr-manual-container").insertAdjacentHTML("beforeend", html);
  }
  calcAll();
}

function addEngZone() {
  engCount++;
  const id = engCount;
  const html = `<div class="dynamic-block eng-block" id="eng-block-${id}" data-id="${id}">
    <div class="dynamic-block-header">
        <span class="block-num">Зона №${id}</span>
        <select id="bld_sel_eng_${id}" class="bld-select bld-select-inline" onchange="saveData()">${getBuildingOptions()}</select>
        <input type="text" id="name_eng_${id}" class="block-title-input" placeholder="Назва кімнати/зони" oninput="saveData()">
        ${id > 1 ? `<button class="block-del-btn" onclick="document.getElementById('eng-block-${id}').remove();calcAll()">✖</button>` : ""}
    </div>
    <div class="eng-grid">
        <div class="eng-section-title">Інженерні мережі — Відновлення (Місця)</div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.46.1 Водопровід<span class="item-info-btn" onclick="showItemInfo('46_1',event)">ℹ</span></span><input type="number" id="e_46_1_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.46.2 Каналізація<span class="item-info-btn" onclick="showItemInfo('46_2',event)">ℹ</span></span><input type="number" id="e_46_2_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.46.3 Опалення<span class="item-info-btn" onclick="showItemInfo('46_3',event)">ℹ</span></span><input type="number" id="e_46_3_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.46.4 Газопостач.<span class="item-info-btn" onclick="showItemInfo('46_4',event)">ℹ</span></span><input type="number" id="e_46_4_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.46.5 Електропостач.<span class="item-info-btn" onclick="showItemInfo('46_5',event)">ℹ</span></span><input type="number" id="e_46_5_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-section-title">Сантехнічні прилади (Штуки)</div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.47 Унітаз з бачком<span class="item-info-btn" onclick="showItemInfo('47',event)">ℹ</span></span><input type="number" id="e_47_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.48 Умивальник зі змішувачем<span class="item-info-btn" onclick="showItemInfo('48',event)">ℹ</span></span><input type="number" id="e_48_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.49 Умивальник без змішувача<span class="item-info-btn" onclick="showItemInfo('49',event)">ℹ</span></span><input type="number" id="e_49_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.50 Ванна купальна<span class="item-info-btn" onclick="showItemInfo('50',event)">ℹ</span></span><input type="number" id="e_50_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.51 Піддон душовий<span class="item-info-btn" onclick="showItemInfo('51',event)">ℹ</span></span><input type="number" id="e_51_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.52 Змішувач з душем<span class="item-info-btn" onclick="showItemInfo('52',event)">ℹ</span></span><input type="number" id="e_52_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.53 Мийка кухонна<span class="item-info-btn" onclick="showItemInfo('53',event)">ℹ</span></span><input type="number" id="e_53_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.54 Змішувач кухонний<span class="item-info-btn" onclick="showItemInfo('54',event)">ℹ</span></span><input type="number" id="e_54_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.55 Бойлер<span class="item-info-btn" onclick="showItemInfo('55',event)">ℹ</span></span><input type="number" id="e_55_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.56 Колонка газова<span class="item-info-btn" onclick="showItemInfo('56',event)">ℹ</span></span><input type="number" id="e_56_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.57 Котел двоконтурний<span class="item-info-btn" onclick="showItemInfo('57',event)">ℹ</span></span><input type="number" id="e_57_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-section-title">Прочищення мереж (Погонні метри)</div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.58 Вентил./димохідні<span class="item-info-btn" onclick="showItemInfo('58',event)">ℹ</span></span><input type="number" id="e_58_${id}" oninput="calcAll()" placeholder="0"></div>
        <div class="eng-item"><span style="display:flex;align-items:center">п.59 Каналізаційна мережа<span class="item-info-btn" onclick="showItemInfo('59',event)">ℹ</span></span><input type="number" id="e_59_${id}" oninput="calcAll()" placeholder="0"></div>
    </div>
    <input type="text" id="desc_eng_${id}" style="width:100%;margin-top:9px" placeholder="Опис пошкодження для Акта" oninput="saveData()">
</div>`;
  document.getElementById("eng-container").insertAdjacentHTML("beforeend", html);
  calcAll();
}

// NOTE: ключі localStorage ("evidnovlennya_save_v14", "evidnovlennya_static_v14") жорстко
// зашиті без версійної міграції. Якщо в майбутньому зміниться структура даних (нові/перейменовані
// поля тощо), потрібно передбачити міграцію старих збережень під новий формат або хоча б
// попередження користувачу про несумісність версії — інакше стара збережена робота може зламатись.
