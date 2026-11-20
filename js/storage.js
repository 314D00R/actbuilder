function saveData() {
  setSaveIndicator("saving");
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_saveDataNow, 300);
}


// NOTE: ключі localStorage (STORAGE_KEY_MAIN, STORAGE_KEY_STATIC) жорстко
// зашиті без версійної міграції. Якщо в майбутньому зміниться структура даних (нові/перейменовані
// поля тощо), потрібно передбачити міграцію старих збережень під новий формат або хоча б
// попередження користувачу про несумісність версії — інакше стара збережена робота може зламатись.
function saveStatic() {
  const sData = { signs: [], inputs: {} };
  [
    "order_no",
    "order_name",
    "comm_head_nom",
    "comm_head_gen",
    "comm_deputy",
    "comm_sec",
    "comm_members",
  ].forEach((id) => {
    if (document.getElementById(id)) sData.inputs[id] = document.getElementById(id).value;
  });
  document.querySelectorAll('div[id^="sign-block-"]').forEach((b) => {
    let id = b.id.split("-")[2];
    sData.signs.push({
      role: document.getElementById("sign_role_" + id).value,
      name: document.getElementById("sign_name_" + id).value,
    });
  });
  localStorage.setItem(STORAGE_KEY_STATIC, JSON.stringify(sData));
}
function loadStatic() {
  const s = localStorage.getItem(STORAGE_KEY_STATIC);
  document.getElementById("signatures-container").innerHTML = "";
  signCount = 0;
  if (s) {
    const sData = JSON.parse(s);
    for (let id in sData.inputs) {
      if (document.getElementById(id)) {
        document.getElementById(id).value = sData.inputs[id];
        const el = document.getElementById(id);
        if (el.tagName === 'TEXTAREA') autoResize(el);
      }
    }
    if (sData.signs) {
      _loadingStatic = true;
      sData.signs.forEach((si) => {
        addSignature();
        let id = signCount;
        document.getElementById("sign_role_" + id).value = si.role;
        document.getElementById("sign_name_" + id).value = si.name;
      });
      _loadingStatic = false;
      saveStatic();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// ЗБЕРЕЖЕННЯ / ЗАВАНТАЖЕННЯ / СКИДАННЯ ДАНИХ
// ═══════════════════════════════════════════════════════════════════
// ── SOURCE OF TRUTH: поля що зберігаються/відновлюються ─────────────
// Якщо додаєш нове поле до будівлі або власника — достатньо додати його сюди,
// _saveDataNow і loadData підхоплять автоматично.

function _saveDataNow() {
  try {
    const data = { inputs: {}, windows: [], zones: [], buildings: [], owners: [], eng: [], constZones: [] };
    document
      .querySelectorAll(
        "#p-general input,#p-general select,#p-general textarea,#p-techpass input,#p-techpass select,#p-techpass textarea,#p-export input,#p-export select",
      )
      .forEach((el) => {
        if (!el.id.startsWith("bld_") && !el.id.startsWith("ow_")) data.inputs[el.id] = el.value;
      });
    document
      .querySelectorAll("#p-roof .single-inp,#p-walls .single-inp,#p-floors .single-inp")
      .forEach((el) => (data.inputs[el.id || "si_" + el.dataset.id] = el.value));
    document.querySelectorAll("#p-walls .constcalc-inp").forEach((el) => {
      if (el.id) data.inputs[el.id] = el.value;
    });
    document
      .querySelectorAll("#p-roof .konst-input,#p-walls .konst-input,#p-floors .konst-input")
      .forEach((el) => {
        if (el.id) data.inputs[el.id] = el.value;
      });
    document
      .querySelectorAll("#p-roof .konst-check,#p-walls .konst-check,#p-floors .konst-check")
      .forEach((el) => {
        if (el.id) data.inputs[el.id] = el.checked;
      });
    data.inputs["_mz_wallsConst"] = manualZoneCounts.wallsConst;
    data.inputs["_mz_krokvy"] = manualZoneCounts.krokvy;
    data.inputs["_mz_flrManual"] = manualZoneCounts.flrManual;
    document.querySelectorAll(".konst-zone").forEach((block) => {
      const section = block.dataset.section,
        idx = block.dataset.idx;
      const inActEl = document.getElementById("in_act_" + section + "_" + idx);
      let items = {};
      if (section === "krokvy") {
        items["2"] = document.getElementById("t_krokvy_" + idx)?.value || "";
      } else if (section === "wallsConst") {
        ["20", "21", "22", "23"].forEach((code) => {
          items[code] = document.getElementById("t_c" + code + "_" + idx)?.value || "";
        });
      } else if (section === "flrManual") {
        items["43"] = document.getElementById("t_flrman_" + idx)?.value || "";
      }
      data.constZones.push({
        section,
        idx,
        bld: document.getElementById("bld_sel_" + section + "_" + idx)?.value || "",
        name: document.getElementById("name_" + section + "_" + idx)?.value || "",
        desc: document.getElementById("desc_" + section + "_" + idx)?.value || "",
        inAct: inActEl ? inActEl.checked : true,
        items,
      });
    });
    document.querySelectorAll(".bld-block").forEach((block) => {
      const id = block.dataset.id;
      let bld = { id };
      BLD_PROPS.forEach((prop) => {
        let el = document.getElementById("bld_" + prop + "_" + id);
        if (el) bld[prop] = el.value;
      });
      data.buildings.push(bld);
    });
    document.querySelectorAll('.dynamic-block[id^="owner-block"]').forEach((block) => {
      const id = block.id.split("-")[2];
      let ow = {};
      OWNER_PROPS.forEach((prop) => {
        let el = document.getElementById("ow_" + prop + "_" + id);
        if (el) ow[prop] = el.value;
      });
      data.owners.push(ow);
    });
    document.querySelectorAll(".win-block").forEach((block) => {
      const id = block.dataset.id;
      const inActEl = document.getElementById("in_act_win_" + id);
      data.windows.push({
        bld: document.getElementById("bld_sel_win_" + id).value,
        name: document.getElementById("name_win_" + id).value,
        desc: document.getElementById("desc_win_" + id).value,
        qty: document.getElementById("q-win-" + id).value,
        type: document.getElementById("w-type-" + id).value,
        sType: document.getElementById("s-type-" + id).value,
        w: document.getElementById("w_" + id).value,
        h: document.getElementById("h_" + id).value,
        d: document.getElementById("d_" + id).value,
        res_w: document.getElementById("res_w_" + id).value,
        res_s: document.getElementById("res_s_" + id).value,
        inAct: inActEl ? inActEl.checked : true,
      });
    });
    document.querySelectorAll(".zone-block").forEach((block) => {
      const type = block.dataset.type,
        id = block.dataset.id;
      let cbs = {};
      block.querySelectorAll('input[type="checkbox"].cb-inp').forEach((cb) => {
        cbs[cb.dataset.id] = cb.checked;
      });
      const secondEl =
        document.getElementById("w_" + type + "_" + id) || document.getElementById("h_" + type + "_" + id);
      let wallSide = "internal";
      if (type === "wall") {
        const tog = document.getElementById("wall_side_toggle_" + id);
        if (tog && tog.checked) wallSide = "external";
      }
      const inActEl = document.getElementById("in_act_" + type + "_" + id);
      data.zones.push({
        type,
        bld: document.getElementById("bld_sel_" + type + "_" + id).value,
        name: document.getElementById("name_" + type + "_" + id).value,
        desc: document.getElementById("desc_" + type + "_" + id).value,
        qty: document.getElementById("q_" + type + "_" + id).value,
        l: document.getElementById("l_" + type + "_" + id).value,
        w: secondEl ? secondEl.value : 0,
        res: document.getElementById("res_" + type + "_" + id).value,
        cbs,
        wallSide,
        inAct: inActEl ? inActEl.checked : true,
      });
    });
    document.querySelectorAll(".eng-block").forEach((block) => {
      const id = block.dataset.id;
      let eObj = {
        bld: document.getElementById("bld_sel_eng_" + id).value,
        name: document.getElementById("name_eng_" + id).value,
        desc: document.getElementById("desc_eng_" + id).value,
      };
      ENG_CODES.forEach((code) => {
        let el = document.getElementById("e_" + code + "_" + id);
        eObj[code] = el ? el.value : "";
      });
      data.eng.push(eObj);
    });
    localStorage.setItem(STORAGE_KEY_MAIN, JSON.stringify(data));
    setSaveIndicator("saved");
  } catch (e) {
    setSaveIndicator("error");
    console.error(e);
  }
}

function populateDefaults() {
  if (!document.getElementById("act_date").value) {
    let t = new Date();
    document.getElementById("act_date").value =
      String(t.getDate()).padStart(2, "0") +
      "." +
      String(t.getMonth() + 1).padStart(2, "0") +
      "." +
      t.getFullYear();
  }
}
function ensureDefaults() {
  if (document.querySelectorAll(".win-block").length === 0) addWindow();
  if (document.querySelectorAll(".eng-block").length === 0) addEngZone();
  if (document.querySelectorAll(".bld-block").length === 0) addBuilding();
  if (document.querySelectorAll('[id^="owner-block"]').length === 0) addOwner();
  ["roof", "over", "wall", "ceil", "flr", "fac", "fnd"].forEach((t) => {
    if (document.querySelectorAll('.zone-block[data-type="' + t + '"]').length === 0) addZone(t);
  });
  ["wallsConst", "krokvy", "flrManual"].forEach((t) => {
    if (document.querySelectorAll('.konst-zone[data-section="' + t + '"]').length === 0) {
      manualZoneCounts[t] = 0;
      addConstZone(t);
    }
  });
  if (
    document.querySelectorAll('[id^="sign-block-"]').length === 0 &&
    !localStorage.getItem(STORAGE_KEY_STATIC)
  )
    addSignature();
}

function loadData() {
  loadStatic();
  document.getElementById("windows-container").innerHTML = "";
  windowCount = 0;
  document.getElementById("buildings-container").innerHTML = "";
  bldCount = 0;
  document.getElementById("owners-container").innerHTML = "";
  ownerCount = 0;
  document.getElementById("eng-container").innerHTML = "";
  engCount = 0;
  ["roof", "over", "wall", "ceil", "flr", "fac", "fnd"].forEach(
    (t) => (document.getElementById(t + "-container").innerHTML = ""),
  );
  zoneCounts = { roof: 0, over: 0, wall: 0, ceil: 0, flr: 0, fac: 0, fnd: 0 };
  document.querySelectorAll(".konst-zone").forEach((el) => el.remove());
  manualZoneCounts = { wallsConst: 0, krokvy: 0, flrManual: 0 };
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MAIN);
    if (saved) {
      const data = JSON.parse(saved);
      const hasSavedConstZones = Array.isArray(data.constZones) && data.constZones.length > 0;
      const restoredConstBlds = [];

      if (hasSavedConstZones) {
        data.constZones.forEach((z) => {
          if (!KONST_CONTAINER_IDS[z.section]) return;
          addConstZone(z.section);
          const newIdx = manualZoneCounts[z.section];
          const oldIdx = z.idx;
          const nameEl = document.getElementById("name_" + z.section + "_" + newIdx);
          if (nameEl) nameEl.value = z.name || "";
          const descEl = document.getElementById("desc_" + z.section + "_" + newIdx);
          if (descEl) descEl.value = z.desc || "";
          const inActEl = document.getElementById("in_act_" + z.section + "_" + newIdx);
          if (inActEl) inActEl.checked = z.inAct !== undefined ? z.inAct : true;
          const items = z.items || {};
          if (z.section === "krokvy") {
            const el = document.getElementById("t_krokvy_" + newIdx);
            if (el && items["2"] !== undefined) el.value = items["2"];
          } else if (z.section === "wallsConst") {
            ["20", "21", "22", "23"].forEach((code) => {
              const el = document.getElementById("t_c" + code + "_" + newIdx);
              if (el && items[code] !== undefined) el.value = items[code];
              if (data.inputs && oldIdx != null) {
                ["l", "h", "d", "w"].forEach((dim) => {
                  const oldKey = `${dim}_c${code}_${oldIdx}`;
                  const dimEl = document.getElementById(`${dim}_c${code}_${newIdx}`);
                  if (dimEl && data.inputs[oldKey] !== undefined) dimEl.value = data.inputs[oldKey];
                });
              }
            });
          } else if (z.section === "flrManual") {
            const el = document.getElementById("t_flrman_" + newIdx);
            if (el && items["43"] !== undefined) el.value = items["43"];
          }
          restoredConstBlds.push({ section: z.section, idx: newIdx, bld: z.bld || "" });
        });
      } else if (data.inputs) {
        const mzWallsConst = parseInt(data.inputs["_mz_wallsConst"]) || 1;
        const mzKrokvy = parseInt(data.inputs["_mz_krokvy"]) || 1;
        const mzFlrManual = parseInt(data.inputs["_mz_flrManual"]) || 1;
        for (let i = 0; i < mzWallsConst; i++) addConstZone("wallsConst");
        for (let i = 0; i < mzKrokvy; i++) addConstZone("krokvy");
        for (let i = 0; i < mzFlrManual; i++) addConstZone("flrManual");
      }

      if (data.inputs) {
        for (let id in data.inputs) {
          if (
            hasSavedConstZones &&
            /^(bld_sel_|name_|desc_|in_act_)(wallsConst|krokvy|flrManual)_|^(t_krokvy_|t_flrman_|[tlhdw]_c2[0-3]_)/.test(id)
          ) {
            continue;
          }
          const el = document.getElementById(id);
          if (el) {
            if (el.tagName.toLowerCase() === "select") setSelectValue(el, data.inputs[id]);
            else {
              el.value = data.inputs[id];
              if (el.tagName.toLowerCase() === "textarea") autoResize(el);
            }
          }
        }
      }
      if (data.buildings) {
        data.buildings.forEach((b) => {
          addBuilding();
          const id = bldCount;
          BLD_PROPS.forEach((prop) => {
            let el = document.getElementById("bld_" + prop + "_" + id);
            if (el && b[prop] !== undefined) {
              if (el.tagName.toLowerCase() === "select") setSelectValue(el, b[prop]);
              else el.value = b[prop];
            }
          });
        });
      }
      if (data.owners) {
        data.owners.forEach((o) => {
          addOwner();
          const id = ownerCount;
          OWNER_PROPS.forEach((prop) => {
            let el = document.getElementById("ow_" + prop + "_" + id);
            if (el && o[prop] !== undefined) {
              if (el.tagName.toLowerCase() === "select") setSelectValue(el, o[prop]);
              else el.value = o[prop];
            }
          });
        });
      }
      updateBuildingDropdowns();
      // відновлюємо збережені значення селектів літер зон Крокви/Конструктив/Окремі роботи після оновлення дропдаунів
      if (hasSavedConstZones) {
        restoredConstBlds.forEach((item) => {
          const sel = document.getElementById("bld_sel_" + item.section + "_" + item.idx);
          if (sel && item.bld) setSelectValue(sel, item.bld);
        });
      } else {
        document
          .querySelectorAll("#p-roof .konst-input,#p-walls .konst-input,#p-floors .konst-input")
          .forEach((el) => {
            if (data.inputs && data.inputs[el.id] !== undefined) {
              if (el.tagName.toLowerCase() === "select") setSelectValue(el, data.inputs[el.id]);
              else el.value = data.inputs[el.id];
            }
          });
        // чекбокси "Акт+чеклист / Тільки чеклист" не є select/text, відновлюємо окремо
        document
          .querySelectorAll("#p-roof .konst-check,#p-walls .konst-check,#p-floors .konst-check")
          .forEach((el) => {
            if (data.inputs && data.inputs[el.id] !== undefined)
              el.checked = data.inputs[el.id] === true || data.inputs[el.id] === "true";
            else el.checked = true;
          });
      }
      if (data.windows) {
        data.windows.forEach((win) => {
          addWindow();
          const id = windowCount;
          if (win.bld) document.getElementById("bld_sel_win_" + id).value = win.bld;
          const inActEl = document.getElementById("in_act_win_" + id);
          if (inActEl) inActEl.checked = win.inAct !== undefined ? win.inAct : true;
          document.getElementById("name_win_" + id).value = win.name || "";
          document.getElementById("desc_win_" + id).value = win.desc || "";
          document.getElementById("q-win-" + id).value = win.qty;
          document.getElementById("w-type-" + id).value = win.type;
          document.getElementById("s-type-" + id).value = win.sType;
          document.getElementById("w_" + id).value = win.w || "";
          document.getElementById("h_" + id).value = win.h || "";
          document.getElementById("d_" + id).value = win.d || "0.3";
          document.getElementById("res_w_" + id).value = win.res_w || "";
          document.getElementById("res_s_" + id).value = win.res_s || "";
          toggleWinType(id);
        });
      }
      if (data.zones) {
        data.zones.forEach((z) => {
          addZone(z.type);
          const id = zoneCounts[z.type];
          if (z.bld) document.getElementById("bld_sel_" + z.type + "_" + id).value = z.bld;
          document.getElementById("name_" + z.type + "_" + id).value = z.name || "";
          document.getElementById("desc_" + z.type + "_" + id).value = z.desc || "";
          document.getElementById("q_" + z.type + "_" + id).value = z.qty;
          document.getElementById("l_" + z.type + "_" + id).value = z.l;
          const secondEl =
            document.getElementById("w_" + z.type + "_" + id) ||
            document.getElementById("h_" + z.type + "_" + id);
          if (secondEl) secondEl.value = z.w;
          const resEl = document.getElementById("res_" + z.type + "_" + id);
          if (resEl) resEl.value = z.res || "";
          const zoneBlock = document.getElementById("zone-" + z.type + "-" + id);
          if (zoneBlock) {
            const inActEl = document.getElementById("in_act_" + z.type + "_" + id);
            if (inActEl) inActEl.checked = z.inAct !== undefined ? z.inAct : true;
            zoneBlock.querySelectorAll('input[type="checkbox"].cb-inp').forEach((cb) => {
              if (z.cbs && z.cbs[cb.dataset.id] !== undefined) cb.checked = z.cbs[cb.dataset.id];
            });
            if (z.type === "wall" && z.wallSide) {
              const tog = document.getElementById("wall_side_toggle_" + id);
              if (tog) tog.checked = z.wallSide === "external";
            }
          }
        });
      }
      if (data.eng) {
        data.eng.forEach((e) => {
          addEngZone();
          const id = engCount;
          if (e.bld) document.getElementById("bld_sel_eng_" + id).value = e.bld;
          document.getElementById("name_eng_" + id).value = e.name || "";
          document.getElementById("desc_eng_" + id).value = e.desc || "";
          ENG_CODES.forEach((code) => {
            let el = document.getElementById("e_" + code + "_" + id);
            if (el) el.value = e[code] || "";
          });
        });
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    populateDefaults();
    ensureDefaults();
    calcAll();
  }
}

async function resetData() {
  if (confirm("Всі дані об'єкта та фотогалерея будуть видалені (крім Сталих даних Комісії). Продовжити?")) {
    if (window.ActPhotos) {
      try { await ActPhotos.clearAll(true); } catch (e) { console.error(e); }
    }
    localStorage.removeItem(STORAGE_KEY_MAIN);
    location.reload();
  }
}

async function duplicateForNewObject() {
  if (
    !confirm(
      "Підготувати форму для нового об'єкта?\n\nБудуть очищені адреса, власник, площі, описи та фотогалерея.\nЗалишаться: конструктив будівель та сталі дані комісії.",
    )
  )
    return;
  if (window.ActPhotos) {
    try { await ActPhotos.clearAll(true); } catch (e) { console.error(e); }
  }
  [
    "act_date",
    "addr_street",
    "addr_house",
    "addr_apt",
    "cadastral",
    "present_manual",
    "zayava_info",
    "dam_date",
    "dam_reason",
    "conclusions",
    "extra_info",
    "photo_pages",
    "obj_notes",
    "legal_docs",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("owners-container").innerHTML = "";
  ownerCount = 0;
  addOwner();
  document.querySelectorAll(".zone-block").forEach((block) => {
    const type = block.dataset.type,
      id = block.dataset.id;
    ["l_", "w_", "h_", "res_"].forEach((p) => {
      const el = document.getElementById(p + type + "_" + id);
      if (el) el.value = "";
    });
    const qEl = document.getElementById("q_" + type + "_" + id);
    if (qEl) qEl.value = "1";
    const descEl = document.getElementById("desc_" + type + "_" + id);
    if (descEl) descEl.value = "";
    const nameEl = document.getElementById("name_" + type + "_" + id);
    if (nameEl) nameEl.value = "";
    block.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
  });
  document.querySelectorAll(".win-block").forEach((block) => {
    const id = block.dataset.id;
    ["w_", "h_", "d_", "res_w_", "res_s_"].forEach((prefix) => {
      const el = document.getElementById(prefix + id);
      if (el) el.value = prefix === "d_" ? "0.3" : "";
    });
    const qEl = document.getElementById("q-win-" + id);
    if (qEl) qEl.value = "1";
    const descEl = document.getElementById("desc_win_" + id);
    if (descEl) descEl.value = "";
    const nameEl = document.getElementById("name_win_" + id);
    if (nameEl) nameEl.value = "";
  });
  document.querySelectorAll(".single-inp").forEach((el) => (el.value = ""));
  document
    .querySelectorAll("#p-roof .konst-input,#p-walls .konst-input,#p-floors .konst-input")
    .forEach((el) => (el.value = ""));
  document
    .querySelectorAll("#p-roof .konst-check,#p-walls .konst-check,#p-floors .konst-check")
    .forEach((el) => (el.checked = true));
  document.querySelectorAll("#p-walls .constcalc-inp").forEach((el) => (el.value = ""));
  document.querySelectorAll(".eng-block").forEach((block) => {
    const id = block.dataset.id;
    ENG_CODES.forEach((code) => {
      const el = document.getElementById("e_" + code + "_" + id);
      if (el) el.value = "";
    });
    const d = document.getElementById("desc_eng_" + id);
    if (d) d.value = "";
    const n = document.getElementById("name_eng_" + id);
    if (n) n.value = "";
  });
  populateDefaults();
  calcAll();
  alert("Форму очищено для нового об'єкта.");
}

function exportBackupToFile() {
  _saveDataNow();
  saveStatic();
  const backup = {
    main: localStorage.getItem(STORAGE_KEY_MAIN) || "{}",
    static: localStorage.getItem(STORAGE_KEY_STATIC) || "{}",
    exported_at: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `evidnovlennya-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importBackupFromFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const backup = JSON.parse(reader.result);
      if (!backup || (!backup.main && !backup.static)) {
        alert("Файл не схожий на резервну копію застосунку.");
        return;
      }
      if (!confirm("Завантажити дані з файлу?\n\nПоточні незбережені дані будуть замінені.")) return;
      if (backup.main) localStorage.setItem(STORAGE_KEY_MAIN, backup.main);
      if (backup.static) localStorage.setItem(STORAGE_KEY_STATIC, backup.static);
      loadData();
      loadStatic();
      showToast("Резервну копію завантажено", "success");
    } catch (e) {
      alert("Не вдалося прочитати файл: некоректний JSON.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

