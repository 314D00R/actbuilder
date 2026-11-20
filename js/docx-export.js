// ═══════════════════════════════════════════════════════════════════
// ГЕНЕРАЦІЯ WORD-ДОКУМЕНТІВ (.docx — Акт + Чек-лист)
// ═══════════════════════════════════════════════════════════════════

function formatDamageText(qty, l, w, area, desc) {
  let text = "";
  if (l > 0 && w > 0) {
    text += `Розміром ${l}м х ${w}м, `;
    if (qty > 1) text += `у кількості ${qty} шт., `;
    text += `загальною площею ${area.toFixed(2)} кв. м.`;
  } else if (area > 0) {
    if (qty > 1) text += `у кількості ${qty} шт., `;
    text += `загальною площею ${area.toFixed(2)} кв. м.`;
  } else if (qty > 0 && qty !== 1) {
    text += `У кількості ${qty} шт.`;
  }
  let cleanDesc = (desc || "").trim();
  if (cleanDesc && cleanDesc !== "-") text += (text ? "; " : "") + cleanDesc;
  return text ? text + ";" : "";
}

function buildSmartLists(data, forAct) {
  let lists = { fnd: {}, fac: {}, roof: {}, wall: {}, ceil: {}, flr: {}, win_door: {}, eng: {} };
  (data.zones || []).forEach((z) => {
    if (forAct && z.inAct === false) return;
    let area = parseFloat(z.res) || 0;
    if (area <= 0 && !z.desc) return;
    let target = "";
    if (z.type === "fnd") target = "fnd";
    else if (z.type === "fac") target = "fac";
    else if (z.type === "roof" || z.type === "over") target = "roof";
    else if (z.type === "wall") {
      target = z.wallSide === "external" ? "fac" : "wall";
    } else if (z.type === "ceil") target = "ceil";
    else if (z.type === "flr") target = "flr";
    if (target) {
      let bld = z.bld || "no_bld";
      if (!lists[target][bld])
        lists[target][bld] = { letter_text: z.bld ? `Літ. «${z.bld}»:` : "", show_letter: !!z.bld, rooms: [] };
      let dmgText = formatDamageText(z.qty, z.l, z.w, area, z.desc);
      if (dmgText && z.name && z.name.trim()) {
  lists[target][bld].rooms.push({ room_name: z.name.trim(), text: dmgText });
} else if (dmgText) {
  lists[target][bld].rooms.push({ room_name: null, text: dmgText });
}
    }
  });
  (data.windows || []).forEach((w) => {
    let area = parseFloat(w.res_w) || 0;
    let slopeArea = parseFloat(w.res_s) || 0;
    let isDoor = w.type === "door_in_6" || w.type === "door_out_7";
    let isFrame = w.type === "frame";
    // Двері (п.6/п.7) рахуються лише в штуках — розміри для них не вводяться
    let qty = parseFloat(w.qty) || 0;
    // Пропускаємо блок якщо немає жодних даних
    let hasData = area > 0 || slopeArea > 0 || (isDoor && qty > 0) || (w.desc && w.desc.trim() && w.desc.trim() !== "-");
    if (!hasData) return;
    let winText = isDoor
      ? qty > 0
        ? `У кількості ${qty} шт.;`
        : ""
      : formatDamageText(w.qty, w.w, w.h, area, "");
    let slopeText = isFrame && slopeArea > 0 ? `загальна площа укосів — ${slopeArea.toFixed(2)} кв. м;` : "";
    let cleanDesc = (w.desc || "").trim();
    let descText = cleanDesc && cleanDesc !== "-" ? cleanDesc + ";" : "";
    let parts = [winText, slopeText, descText].filter(Boolean);
    let textOutput = parts.join(" ");
    if (!textOutput) return;
    let bld = w.bld || "no_bld";
    if (!lists.win_door[bld])
      lists.win_door[bld] = { letter_text: w.bld ? `Літ. «${w.bld}»:` : "", show_letter: !!w.bld, rooms: [] };
    lists.win_door[bld].rooms.push({ room_name: (w.name && w.name.trim()) ? w.name.trim() : null, text: textOutput });
  });
  (data.eng || []).forEach((e) => {
    let arr = [];
    const labels = {
      "46_1": "п.46.1 Водопровід (місць)",
      "46_2": "п.46.2 Каналізація (місць)",
      "46_3": "п.46.3 Опалення (місць)",
      "46_4": "п.46.4 Газопостачання (місць)",
      "46_5": "п.46.5 Електропостачання (місць)",
      47: "п.47 Унітаз з бачком (шт)",
      48: "п.48 Умивальник зі змішувачем (шт)",
      49: "п.49 Умивальник без змішувача (шт)",
      50: "п.50 Ванна купальна (шт)",
      51: "п.51 Піддон душовий (шт)",
      52: "п.52 Змішувач з душем (шт)",
      53: "п.53 Мийка кухонна (шт)",
      54: "п.54 Змішувач кухонний (шт)",
      55: "п.55 Бойлер (шт)",
      56: "п.56 Колонка газова (шт)",
      57: "п.57 Котел двоконтурний (шт)",
      58: "п.58 Вентил./димохідні канали (пм)",
      59: "п.59 Каналізаційна мережа (пм)",
    };
    for (let k in labels) {
      if (parseFloat(e[k]) > 0) arr.push(labels[k] + " - " + e[k]);
    }
    if (arr.length === 0 && !e.desc) return;
    let txt = arr.join(", ");
    if (e.desc) txt += `; ${e.desc}`;
    txt += ";";
    let bld = e.bld || "no_bld";
    if (!lists.eng[bld])
      lists.eng[bld] = { letter_text: e.bld ? `Літ. «${e.bld}»:` : "", show_letter: !!e.bld, rooms: [] };
    if (txt && txt !== ";") lists.eng[bld].rooms.push({ room_name: (e.name && e.name.trim()) ? e.name.trim() : null, text: txt });
  });
  // Динамічні зони: Крокви / Конструктив стін / Окремі роботи — кожна зона formує свій запис в Акті
  const constZoneMeta = {
    krokvy: { target: "roof", label: "п.2. Заміна кроквяних ніг із брусів", volKey: "2" },
    wallsConst: { target: "wall", label: "Конструктивні роботи (стіни)", volKeys: ["20", "21", "22", "23"] },
    flrManual: { target: "flr", label: "п.43. Заміна окремих дощок у підлогах", volKey: "43" },
  };
  (data.constZones || []).forEach((z) => {
    if (forAct && z.inAct === false) return;
    const meta = constZoneMeta[z.section];
    if (!meta) return;
    const items = z.items || {};
    let hasVol = false;
    if (meta.volKey) hasVol = (parseFloat(items[meta.volKey]) || 0) > 0;
    if (meta.volKeys) hasVol = meta.volKeys.some((k) => (parseFloat(items[k]) || 0) > 0);
    const desc = (z.desc || "").trim();
    if (!hasVol && !desc) return;
    let txt = "";
    if (meta.volKey) {
      const v = parseFloat(items[meta.volKey]) || 0;
      if (v > 0) txt += `${meta.label}: ${v.toFixed(2)} пм`;
    }
    if (meta.volKeys) {
      const parts = meta.volKeys
        .filter((k) => (parseFloat(items[k]) || 0) > 0)
        .map((k) => `${DB_LABELS[k] || "п." + k}: ${parseFloat(items[k]).toFixed(2)}`);
      if (parts.length) txt += parts.join(", ");
    }
    if (desc) txt += (txt ? "; " : "") + desc;
    txt += ";";
    const bld = z.bld || "no_bld";
    if (!lists[meta.target][bld])
      lists[meta.target][bld] = { letter_text: z.bld ? `Літ. «${z.bld}»:` : "", show_letter: !!z.bld, rooms: [] };
    const name = (z.name || "").trim();
    lists[meta.target][bld].rooms.push({ room_name: name ? name : null, text: txt });
  });
  let finalLists = {};
  for (let key in lists) {
    finalLists["dam_" + key] = Object.values(lists[key]).filter((g) => g.rooms && g.rooms.length > 0);
  }
  return finalLists;
}

// ── ГЕНЕРАЦІЯ ДОКУМЕНТІВ ─────────────────────────────────────────────
function collectWordData(docType) {
  const saved  = JSON.parse(localStorage.getItem(STORAGE_KEY_MAIN) || "{}");
  const sStatic = JSON.parse(localStorage.getItem(STORAGE_KEY_STATIC) || '{"signs":[]}');
  const g = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };

  // Адреса
  const cityInput = g("addr_city"), strT = g("addr_str_type"),
        str = g("addr_street"), hse = g("addr_house"), apt = g("addr_apt");
  let fullAddr = `Одеська обл., Одеський р-н, ${cityInput}, ${strT}${str}, ${hse}`;
  if (apt.trim()) fullAddr += `, кв. ${apt}`;

  // Рішення
  const oNo = g("order_no");
  const orderText = oNo || "";

  const data = {
    address: fullAddr, city: cityInput,
    object_type: g("object_type"),
    q_1: g("q_1"), q_2: g("q_2"), q_3: g("q_3"),
    total_sum: document.getElementById("master_total_sidebar").innerText,
    act_date: g("act_date"), cadastral: g("cadastral"),
    ownership_type: g("ownership_type"),
    order_doc: orderText, order_name: g("order_name"),
    comm_head_nom: g("comm_head_nom"), comm_head_gen: g("comm_head_gen"),
    comm_deputy: g("comm_deputy"), comm_sec: g("comm_sec"), comm_members: g("comm_members"),
    zayava_info: g("zayava_info"), present_list_text: g("present_manual"),
    dam_date: g("dam_date"), dam_reason: g("dam_reason"),
    conclusions: g("conclusions"), extra_info: g("extra_info"),
    legal_docs: g("legal_docs"),
    photo_pages_text: (() => { const v = parseInt(g("photo_pages")) || 0; return v > 0 ? `(${v} арк.)` : ""; })(),
    // будуть перезаписані нижче по будівлях
    heritage_info: "-", year_built: "-", total_area: "-",
    floors_total: "-", floors_over: "-", floors_under: "-",
    mansard: "-", sections: "-", apartments: "-", built_in_area: "-",
    commission_signs: sStatic.signs,
  };

  // Власники
  let ownersText = "", ownersSigns = [];
  if (saved.owners && saved.owners.length > 0) {
    data.owner_name_check = saved.owners[0].name;
    const typeMap = { власник: "Власник", співвласник: "Співвласник", управитель: "Управитель", "юридична особа": "Представник юридичної особи" };
    const firstOwner = saved.owners[0];
    data.title = typeMap[firstOwner.type] || (firstOwner.type ? firstOwner.type.charAt(0).toUpperCase() + firstOwner.type.slice(1) : "Власник");
    data.owner_name = saved.owners.filter((o) => o.type !== "управитель").map((o) => o.name).filter(Boolean).join(", ");
    const ownersList  = saved.owners.filter((o) => o.type === "власник");
    const coOwnersList = saved.owners.filter((o) => o.type === "співвласник");
    const jurList     = saved.owners.filter((o) => o.type === "юридична особа");
    data.checklist_owner   = ownersList.length === 1 ? "Власник: " + ownersList[0].name
                           : ownersList.length > 1  ? "Власники: " + ownersList.map((o) => o.name).join(", ")
                           : jurList.length > 0     ? "Юридична особа: " + jurList.map((o) => o.name).join(", ")
                           : "";
    data.checklist_coowners = coOwnersList.length > 0 ? "Співвласники: " + coOwnersList.map((o) => o.name).join(", ") : "";
    saved.owners.forEach((ow, idx) => {
      const sep = idx === saved.owners.length - 1 ? "" : "; ";
      if (ow.type === "юридична особа") {
        ownersText += `представника юридичної особи ${ow.name}, ЄДРПОУ: ${ow.doc}${sep}`;
        ownersSigns.push({ title: "Представник" });
      } else {
        const rnokpp = ow.rnokpp && ow.rnokpp.includes("РНОКПП:") ? ow.rnokpp.split("РНОКПП:")[1].trim() : ow.rnokpp || "";
        const typeLabel = ow.type.charAt(0).toUpperCase() + ow.type.slice(1);
        ownersText += `${typeLabel} ${ow.name}, паспорт ${ow.doc}, виданий ${ow.org} від ${ow.pass_date}; РНОКПП: ${rnokpp}${sep}`;
        ownersSigns.push({ title: typeLabel });
      }
    });
  }
  data.owner_info_full = ownersText;
  data.owners_signs    = ownersSigns;

  // Техпаспорт: конструктивні елементи
  const techKeys = ["fnd","wall","in_wall","over_first","over_mid","over_attic","cover","roof","win","door","fac","flr","ceil","el","w","g","kan","op"];
  const tech = Object.fromEntries(techKeys.map((k) => [k, []]));
  const bldPropToTech = { fnd:"fnd", wall:"wall", in_wall:"in_wall", over1:"over_first", overm:"over_mid", overa:"over_attic", cover:"cover", roof:"roof", win:"win", door:"door", fac:"fac", flr:"flr", ceil:"ceil", el:"el", w:"w", g:"g", kan:"kan", op:"op" };
  if (saved.buildings) {
    saved.buildings.forEach((b) => {
      const pfx = b.name ? `Літ. ${b.name} - ` : "";
      for (const [bProp, tKey] of Object.entries(bldPropToTech)) {
        if (b[bProp] && b[bProp] !== "-") tech[tKey].push(pfx + b[bProp]);
      }
    });
    // Загальні характеристики (перший рядок або з літерами)
    const isMultiBld = saved.buildings.length > 1;
    [["heritage_info","heritage"],["year_built","year_built"],["total_area","total_area"],
     ["floors_total","floors_total"],["floors_over","floors_over"],["floors_under","floors_under"],
     ["mansard","mansard"],["sections","sections"],["apartments","apartments"],["built_in_area","built_in_area"],
    ].forEach(([wordKey, bldProp]) => {
      const lines = saved.buildings
        .filter((b) => b[bldProp] && String(b[bldProp]).trim() !== "" && String(b[bldProp]).trim() !== "-")
        .map((b) => isMultiBld && b.name ? `Літ. ${b.name} - ${b[bldProp]}` : String(b[bldProp]));
      data[wordKey] = lines.length === 0 ? "-" : lines.length === 1 ? lines[0] : "\n" + lines.join("\n");
    });
  }
  for (const k in tech) data["tech_" + k] = tech[k].length > 0 ? tech[k].join("\n") : "-";
  data.eng_el  = tech.el.length  > 0 ? tech.el.join("; ")  : "ні";
  data.eng_w   = tech.w.length   > 0 ? tech.w.join("; ")   : "ні";
  data.eng_g   = tech.g.length   > 0 ? tech.g.join("; ")   : "ні";
  data.eng_kan = tech.kan.length  > 0 ? tech.kan.join("; ") : "ні";
  data.eng_op  = tech.op.length  > 0 ? tech.op.join("; ")  : "ні";

  // Списки пошкоджень
  const smartLists = buildSmartLists(saved, docType === "act");
  Object.assign(data, smartLists);
  function flattenList(arr) {
    if (!arr || arr.length === 0) return "";
    const lines = [];
    arr.forEach((g) => {
      if (g.show_letter && g.letter_text) lines.push(g.letter_text);
      (g.rooms || []).forEach((r) => {
        if (r.room_name) lines.push(r.room_name + ":");
        lines.push(" - " + r.text);
      });
    });
    return "\n" + lines.join("\n");
  }
  data.text_fnd      = flattenList(smartLists.dam_fnd)    || "-";
  data.text_fac      = flattenList(smartLists.dam_fac)    || "-";
  data.text_roof_ceil = flattenList([...(smartLists.dam_roof || []), ...(smartLists.dam_ceil || [])]) || "-";
  data.text_wall     = flattenList(smartLists.dam_wall)   || "-";
  data.text_flr      = flattenList(smartLists.dam_flr)    || "-";
  data.text_win      = flattenList(smartLists.dam_win_door) || "-";
  data.text_eng      = flattenList(smartLists.dam_eng)    || "-";

  // Текст конструктивних ремонтів
  const repairParts = [];
  ["roof","wall","flr"].forEach((t) => {
    const el = document.getElementById("desc_" + t + "_manual");
    if (el && el.value.trim()) repairParts.push(el.value.trim());
  });
  data.text_repair = repairParts.length > 0 ? repairParts.join("\n") : "-";
  data.text_other  = "-";

  // Обсяги і суми по DB
  for (const key in DB) {
    const vol = volumes[key] || 0;
    data["v_" + key] = vol > 0 ? vol.toFixed(2).replace(".", ",") : "";
    data["s_" + key] = vol > 0 ? formatSum(vol * DB[key]) : "";
  }

  // Для імені файлу
  data._str = str; data._hse = hse; data._apt = apt;
  return data;
}

let _generatingWord = false;
async function generateWord(docType) {
  if (_generatingWord) return;
  _calcAllNow();
  const templateBase64 = docType === "checklist" ? checklistBase64 : actBase64;
  if (!templateBase64 || templateBase64.includes("ТУТ_КОД_")) {
    alert("Помилка! Додайте код шаблону у Base64.");
    return;
  }
  _generatingWord = true;
  try {
    const zip = new PizZip(templateBase64, { base64: true });
    const doc = new window.docxtemplater(zip, {
      paragraphLoop: true, linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
    });
    const dataToWord = collectWordData(docType);
    doc.render(dataToWord);
    const renderedZip = doc.getZip();
    if (docType === "act" && window.ActPhotos && ActPhotos.getPhotoCount() > 0) {
      const totalPhotos = ActPhotos.getPhotoCount();
      showToast(`Формування фототаблиці (${totalPhotos} фото)...`, "info", 2500);
      await ActPhotos.exportIntoActZip(renderedZip);
    }
    const out = renderedZip.generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const lastName    = (dataToWord.owner_name_check || "Акт").split(" ")[0];
    const cityFileName = dataToWord.city.replace(/м\. |сел\. |с\. /g, "").trim();
    const baseFileName = `${cityFileName} ${dataToWord._str.trim()} ${dataToWord._hse}${dataToWord._apt.trim() ? " кв " + dataToWord._apt.trim() : ""}  ${lastName}`;
    const fileName    = `${docType === "checklist" ? "Чеклист" : "Акт"} ${baseFileName}.docx`;
    saveAs(out, fileName.replace(/\s+/g, " "));
  } catch (error) {
    alert("Помилка генерації шаблону!\n" + (error.message || ""));
    console.error(error);
  } finally {
    _generatingWord = false;
  }
}
