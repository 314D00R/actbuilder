/**
 * ActPhotos — Main UI controller for the «Фотофіксація» page (#p-photos).
 * Coordinates Dropzone uploads, background Worker compression with auto-portrait rotation,
 * IndexedDB persistence, flexible A4 sheet rendering, >100% scale zoom/crop,
 * Drag & Drop reordering, per-cell sizing, mini-editor, and #photo_pages sync.
 */
(function (global) {
  "use strict";

  let _photos = [];
  let _settings = null;
  let _initialized = false;
  let _initPromise = null;
  let _isUploading = false;
  let _dragPhotoId = null;
  let _sizePopPhotoId = null;
  let _lastRenderedGrid = { cols: 2, rows: 2, effectivePerPage: 4, pageCount: 0 };

  // Managed ObjectURL cache: photoId -> { url, blobRef }
  const _thumbUrls = new Map();

  function formatBytes(bytes) {
    const b = Number(bytes) || 0;
    if (b < 1024) return b + " Б";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " КБ";
    return (b / (1024 * 1024)).toFixed(2) + " МБ";
  }

  function genPhotoId() {
    return "ph_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  function getThumbUrl(photo) {
    const blob = photo.thumbBlob || photo.blob;
    if (!blob) return "";
    const cached = _thumbUrls.get(photo.id);
    if (cached && cached.blobRef === blob) {
      return cached.url;
    }
    if (cached && cached.url) {
      URL.revokeObjectURL(cached.url);
    }
    const url = URL.createObjectURL(blob);
    _thumbUrls.set(photo.id, { url, blobRef: blob });
    return url;
  }

  function revokeMissingUrls(validIds) {
    for (const [id, entry] of _thumbUrls.entries()) {
      if (!validIds.has(id)) {
        URL.revokeObjectURL(entry.url);
        _thumbUrls.delete(id);
      }
    }
  }

  function revokeAllUrls() {
    for (const entry of _thumbUrls.values()) {
      URL.revokeObjectURL(entry.url);
    }
    _thumbUrls.clear();
  }

  function notifyToast(msg, type) {
    if (typeof global.showToast === "function") {
      global.showToast(msg, type || "info");
    }
  }

  function getPhotoEffectiveDims(photo) {
    const rot = photo && photo.edits ? photo.edits.rotate || 0 : 0;
    return global.ActPhotosEditor.getEffectiveDimensions(photo.width || 1, photo.height || 1, rot);
  }

  function countLandscapePhotos() {
    let n = 0;
    for (const p of _photos) {
      const d = getPhotoEffectiveDims(p);
      if (d.width > d.height) n++;
    }
    return n;
  }

  function computeFillScalePct(photo) {
    const dims = getPhotoEffectiveDims(photo);
    const cols = _lastRenderedGrid.cols || 2;
    const rows = _lastRenderedGrid.rows || 2;
    const cSpan = Math.min(cols, Math.max(1, photo.colSpan || 1));
    const rSpan = Math.min(rows, Math.max(1, photo.rowSpan || 1));
    const cellW = (global.ActPhotosDocx.PAGE_W_DXA / cols) * cSpan;
    const cellH = (global.ActPhotosDocx.PAGE_H_DXA / rows) * rSpan;
    const cellRatio = cellW / Math.max(1, cellH);
    const imgRatio = dims.width / Math.max(1, dims.height);
    const coverMult = Math.max(cellRatio / imgRatio, imgRatio / cellRatio);
    return Math.min(250, Math.max(100, Math.ceil((coverMult * 100) / 5) * 5));
  }

  function ensureShellDom() {
    const root = document.getElementById("p-photos");
    if (!root || root.dataset.photosMounted === "1") return;
    root.dataset.photosMounted = "1";

    const presetButtonsHtml = global.ActPhotosLayout.PRESETS.map(
      (n) => `<button type="button" class="photo-preset-btn" data-preset="${n}">${n}</button>`
    ).join("");

    root.innerHTML = `
      <div class="card accent">
        <div class="card-header">
          <div class="card-title">📷 Завантаження та оптимізація фото</div>
          <button type="button" class="btn btn-danger" id="photo-clear-btn" style="padding:5px 12px;font-size:12px" disabled>
            🗑 Очистити галерею
          </button>
        </div>

        <div class="photo-stats-bar">
          <div class="photo-stats-pills">
            <span class="photo-stat-pill accent">Фото: <strong id="photo-stat-count">0</strong></span>
            <span class="photo-stat-pill green">Вага після стиснення: <strong id="photo-stat-size">0 Б</strong></span>
            <span class="photo-stat-pill">Аркушів А4: <strong id="photo-stat-pages">0</strong></span>
          </div>
          <span style="font-size:11px;color:var(--text3)" id="photo-stat-saved"></span>
        </div>

        <div class="photo-dropzone" id="photo-dropzone" tabindex="0" role="button" aria-label="Завантажити фотографії">
          <div class="photo-dropzone-icon">🖼️</div>
          <div class="photo-dropzone-title">Перетягніть фото сюди або натисніть для вибору файлів</div>
          <div class="photo-dropzone-sub">Підтримується масове завантаження (до 100+ фото) · Автоматичне стиснення до 1600px у фоні · Збереження в IndexedDB</div>
          <input type="file" id="photo-file-input" accept="image/*" multiple style="display:none" />
        </div>

        <div class="photo-orient-row">
          <label class="photo-toggle-inline" title="Автоматично повертати горизонтальні (альбомні) фото на 90° у книжковий формат А4 при завантаженні">
            <input type="checkbox" id="photo-auto-portrait-cb" checked />
            <span>↻ Автоповорот горизонтальних у книжковий формат (А4)</span>
          </label>
          <button type="button" class="btn btn-surface" id="photo-rotate-landscape-btn" style="padding:5px 11px;font-size:12px;display:none">
            ↻ Повернути горизонтальні (0)
          </button>
        </div>

        <div class="photo-progress-wrap" id="photo-progress-wrap">
          <div class="photo-progress-head">
            <span id="photo-progress-label">Стиснення фото...</span>
            <span id="photo-progress-pct">0%</span>
          </div>
          <div class="photo-progress-track">
            <div class="photo-progress-fill" id="photo-progress-fill"></div>
          </div>
        </div>
      </div>

      <div class="card accent">
        <div class="card-header">
          <div class="card-title">📐 Компоновка сітки на аркуш А4</div>
          <button type="button" class="btn btn-surface" id="photo-reset-spans-btn" style="padding:5px 11px;font-size:12px;display:none">
            ↺ Скинути розміри та масштаб
          </button>
        </div>

        <div class="photo-layout-row">
          <div class="photo-presets-bar" id="photo-presets-bar">
            <button type="button" class="photo-preset-btn auto-btn" id="photo-auto-btn" title="Автоматичний підбір кількості фото на аркуш">Авто</button>
            ${presetButtonsHtml}
          </div>
          <div class="photo-manual-box">
            <label for="photo-per-page-input">Фото на аркуш:</label>
            <input type="number" id="photo-per-page-input" min="1" max="64" step="1" value="4" />
          </div>
        </div>

        <div class="photo-asym-row" id="photo-asym-row">
          <span class="photo-asym-label">Асиметрична розкладка:</span>
          <button type="button" class="photo-preset-btn" data-asym="top-big">1 велике зверху + дрібні</button>
          <button type="button" class="photo-preset-btn" data-asym="left-big">1 велике зліва + дрібні</button>
          <button type="button" class="photo-preset-btn" data-asym="equal-rows">Рівні комірки</button>
        </div>

        <div class="photo-extra-controls">
          <div class="photo-global-scale">
            <span class="photo-global-scale-lbl">🔍 Загальний масштаб фото:</span>
            <input type="range" id="photo-global-scale" min="40" max="250" step="5" value="100" />
            <span class="photo-global-scale-val" id="photo-global-scale-val">100%</span>
            <button type="button" class="photo-scale-chip" data-gscale="100">100%</button>
            <button type="button" class="photo-scale-chip" data-gscale="125">125%</button>
            <button type="button" class="photo-scale-chip" data-gscale="150">150%</button>
            <button type="button" class="photo-scale-chip" data-gscale="200">200%</button>
          </div>
        </div>

        <div class="photo-layout-hint">
          Масштаб &gt;100% збільшує та обрізає фото по центру комірки (без виходу за межі аркуша — у Word зберігається точно так само). Натисніть <b>⤢</b> для налаштування окремої комірки або <b>🎨</b> для міні-редактора.
        </div>
      </div>

      <div class="photo-pages-list" id="photo-pages-list"></div>
    `;

    ensureSizePopoverDom();
    bindStaticEvents();
  }

  function ensureSizePopoverDom() {
    if (document.getElementById("photo-size-popover")) return;
    const html = `
      <div class="photo-size-popover" id="photo-size-popover">
        <div class="photo-size-pop-head">
          <span>⤢ Розмір та масштаб комірки</span>
          <button type="button" class="photo-size-pop-close" id="psp-close">✕</button>
        </div>
        <div class="photo-size-quick">
          <button type="button" data-qspan="1x1">1×1 Стандарт</button>
          <button type="button" data-qspan="2x1">2×1 Широке</button>
          <button type="button" data-qspan="1x2">1×2 Високе</button>
          <button type="button" data-qspan="2x2">2×2 Велике</button>
        </div>
        <div class="photo-size-steppers">
          <div class="photo-stepper">
            <div class="photo-stepper-lbl">Колонок</div>
            <div class="photo-stepper-row">
              <button type="button" id="psp-col-dec">−</button>
              <span id="psp-col-val">1</span>
              <button type="button" id="psp-col-inc">+</button>
            </div>
          </div>
          <div class="photo-stepper">
            <div class="photo-stepper-lbl">Рядків</div>
            <div class="photo-stepper-row">
              <button type="button" id="psp-row-dec">−</button>
              <span id="psp-row-val">1</span>
              <button type="button" id="psp-row-inc">+</button>
            </div>
          </div>
        </div>
        <div class="photo-scale-block">
          <div class="pe-control-head">
            <label for="psp-scale">Масштаб (40%–250%)</label>
            <span class="pe-val" id="psp-scale-val">100%</span>
          </div>
          <input type="range" id="psp-scale" min="40" max="250" step="5" value="100" />
          <div class="photo-scale-chips">
            <button type="button" class="photo-scale-chip" data-pscale="80">80%</button>
            <button type="button" class="photo-scale-chip" data-pscale="100">100%</button>
            <button type="button" class="photo-scale-chip" data-pscale="125">125%</button>
            <button type="button" class="photo-scale-chip" data-pscale="150">150%</button>
            <button type="button" class="photo-scale-chip" data-pscale="200">200%</button>
            <button type="button" class="photo-scale-chip" id="psp-fill-btn" title="Автоматично заповнити всю комірку без білих полів">Заповнити</button>
          </div>
        </div>
        <button type="button" class="btn btn-surface" id="psp-reset" style="width:100%;justify-content:center;padding:6px 10px;font-size:12px">
          ↺ Авто-розмір комірки
        </button>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);

    const pop = document.getElementById("photo-size-popover");
    document.getElementById("psp-close").addEventListener("click", closeSizePopover);

    pop.querySelectorAll("[data-qspan]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [c, r] = btn.dataset.qspan.split("x").map(Number);
        applyCellSizePatch({
          colSpan: Math.min(c, _lastRenderedGrid.cols),
          rowSpan: Math.min(r, _lastRenderedGrid.rows),
        });
      });
    });

    document.getElementById("psp-col-dec").addEventListener("click", () => stepCellSpan("colSpan", -1));
    document.getElementById("psp-col-inc").addEventListener("click", () => stepCellSpan("colSpan", 1));
    document.getElementById("psp-row-dec").addEventListener("click", () => stepCellSpan("rowSpan", -1));
    document.getElementById("psp-row-inc").addEventListener("click", () => stepCellSpan("rowSpan", 1));

    const scaleEl = document.getElementById("psp-scale");
    scaleEl.addEventListener("input", () => {
      const val = parseInt(scaleEl.value, 10) || 100;
      document.getElementById("psp-scale-val").textContent = val + "%";
      applyCellSizePatch({ scalePct: val });
    });

    pop.querySelectorAll("[data-pscale]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = parseInt(btn.dataset.pscale, 10) || 100;
        applyCellSizePatch({ scalePct: val });
      });
    });

    document.getElementById("psp-fill-btn").addEventListener("click", () => {
      const photo = _photos.find((p) => p.id === _sizePopPhotoId);
      if (!photo) return;
      applyCellSizePatch({ scalePct: computeFillScalePct(photo) });
    });

    document.getElementById("psp-reset").addEventListener("click", () => {
      applyCellSizePatch({ colSpan: null, rowSpan: null, scalePct: null });
    });

    document.addEventListener("click", (e) => {
      if (!pop.classList.contains("open")) return;
      if (pop.contains(e.target)) return;
      if (e.target.closest && e.target.closest(".photo-act-resize")) return;
      closeSizePopover();
    });
  }

  function bindStaticEvents() {
    const dropzone = document.getElementById("photo-dropzone");
    const fileInput = document.getElementById("photo-file-input");

    dropzone.addEventListener("click", () => {
      if (!_isUploading) fileInput.click();
    });
    dropzone.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !_isUploading) {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener("change", (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFilesUpload(files);
      }
      e.target.value = "";
    });

    ["dragenter", "dragover"].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        if (_dragPhotoId) return;
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("drag-over");
      });
    });

    ["dragleave", "dragend"].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dropzone.contains(e.relatedTarget)) {
          dropzone.classList.remove("drag-over");
        }
      });
    });

    dropzone.addEventListener("drop", (e) => {
      if (_dragPhotoId) return;
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("drag-over");
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFilesUpload(files);
      }
    });

    document.getElementById("photo-clear-btn").addEventListener("click", () => {
      clearAll(false);
    });

    document.getElementById("photo-auto-portrait-cb").addEventListener("change", async (e) => {
      await updateSettings({ autoPortrait: Boolean(e.target.checked) });
    });

    document.getElementById("photo-rotate-landscape-btn").addEventListener("click", () => {
      rotateAllLandscapeToPortrait();
    });

    document.getElementById("photo-auto-btn").addEventListener("click", async () => {
      await updateSettings({ mode: "auto" });
    });

    document.getElementById("photo-presets-bar").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-preset]");
      if (!btn) return;
      const n = parseInt(btn.dataset.preset, 10);
      if (!Number.isFinite(n)) return;
      await updateSettings({ mode: "preset", photosPerPage: n });
    });

    const perPageInput = document.getElementById("photo-per-page-input");
    perPageInput.addEventListener("input", async () => {
      const raw = perPageInput.value.trim();
      if (!raw) return;
      const val = Math.max(1, Math.min(64, parseInt(raw, 10) || 1));
      const isPreset = global.ActPhotosLayout.PRESETS.includes(val);
      await updateSettings({
        mode: isPreset ? "preset" : "manual",
        photosPerPage: val,
      });
    });
    perPageInput.addEventListener("blur", () => {
      perPageInput.value = String(_lastRenderedGrid.effectivePerPage);
    });

    document.getElementById("photo-asym-row").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-asym]");
      if (!btn) return;
      await updateSettings({ asymmetricMode: btn.dataset.asym });
    });

    // Global scale slider & quick chips
    const gScaleEl = document.getElementById("photo-global-scale");
    gScaleEl.addEventListener("input", async () => {
      const val = Math.max(40, Math.min(250, parseInt(gScaleEl.value, 10) || 100));
      await applyGlobalScale(val);
    });
    document.querySelectorAll("[data-gscale]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const val = parseInt(btn.dataset.gscale, 10) || 100;
        await applyGlobalScale(val);
      });
    });

    document.getElementById("photo-reset-spans-btn").addEventListener("click", async () => {
      let changed = false;
      for (const p of _photos) {
        if (p.colSpan || p.rowSpan || p.scalePct != null) {
          p.colSpan = null;
          p.rowSpan = null;
          p.scalePct = null;
          changed = true;
        }
      }
      if (changed) {
        await global.ActPhotosDB.putPhotosBatch(_photos);
      }
      if (_settings && _settings.globalScalePct !== 100) {
        _settings = await global.ActPhotosDB.saveSettings({ globalScalePct: 100 });
        changed = true;
      }
      if (changed) {
        render();
        syncPhotoPagesField(true);
        notifyToast("Розміри та масштаб скинуто до 100%", "info");
      }
    });

    // Delegate Drag & Drop and card button clicks on #photo-pages-list
    const pagesList = document.getElementById("photo-pages-list");

    pagesList.addEventListener("click", (e) => {
      const btn = e.target.closest(".photo-act-btn");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const cell = btn.closest(".photo-cell");
      const id = cell && cell.dataset.photoId;
      if (!id) return;

      if (btn.classList.contains("photo-act-edit")) {
        openMiniEditor(id);
      } else if (btn.classList.contains("photo-act-resize")) {
        openSizePopover(id, btn);
      } else if (btn.classList.contains("photo-act-first")) {
        movePhotoToPosition(id, 0);
      } else if (btn.classList.contains("photo-act-last")) {
        movePhotoToPosition(id, _photos.length - 1);
      } else if (btn.classList.contains("photo-act-del")) {
        deleteSinglePhoto(id);
      }
    });

    pagesList.addEventListener("dragstart", (e) => {
      const cell = e.target.closest(".photo-cell");
      if (!cell) return;
      if (e.target.closest(".photo-cell-actions")) {
        e.preventDefault();
        return;
      }
      _dragPhotoId = cell.dataset.photoId;
      cell.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", _dragPhotoId);
      }
    });

    pagesList.addEventListener("dragover", (e) => {
      if (!_dragPhotoId) return;
      const targetCell = e.target.closest(".photo-cell");
      if (!targetCell) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      if (targetCell.dataset.photoId === _dragPhotoId) return;
      pagesList.querySelectorAll(".photo-cell.drag-target").forEach((el) => {
        if (el !== targetCell) el.classList.remove("drag-target");
      });
      targetCell.classList.add("drag-target");
    });

    pagesList.addEventListener("dragleave", (e) => {
      const targetCell = e.target.closest(".photo-cell");
      if (targetCell && !targetCell.contains(e.relatedTarget)) {
        targetCell.classList.remove("drag-target");
      }
    });

    pagesList.addEventListener("drop", async (e) => {
      if (!_dragPhotoId) return;
      const targetCell = e.target.closest(".photo-cell");
      if (!targetCell) return;
      e.preventDefault();
      e.stopPropagation();
      const sourceId = _dragPhotoId || (e.dataTransfer && e.dataTransfer.getData("text/plain"));
      const targetId = targetCell.dataset.photoId;
      pagesList.querySelectorAll(".photo-cell.drag-target").forEach((el) => el.classList.remove("drag-target"));
      if (sourceId && targetId && sourceId !== targetId) {
        await reorderPhotos(sourceId, targetId);
      }
    });

    pagesList.addEventListener("dragend", () => {
      _dragPhotoId = null;
      pagesList.querySelectorAll(".photo-cell.dragging, .photo-cell.drag-target").forEach((el) => {
        el.classList.remove("dragging", "drag-target");
      });
    });
  }

  async function applyGlobalScale(val) {
    const prevGlobal = (_settings && _settings.globalScalePct) || 100;
    // Migrate legacy photos stored with default scalePct=100 so they inherit global scale smoothly
    const toUpdate = [];
    for (const p of _photos) {
      if (p.scalePct === prevGlobal) {
        p.scalePct = null;
        toUpdate.push(p);
      }
    }
    if (toUpdate.length > 0) {
      await global.ActPhotosDB.putPhotosBatch(toUpdate);
    }
    _settings = await global.ActPhotosDB.saveSettings({ globalScalePct: val });
    render();
  }

  async function rotateAllLandscapeToPortrait() {
    const targets = _photos.filter((p) => {
      const d = getPhotoEffectiveDims(p);
      return d.width > d.height;
    });
    if (targets.length === 0) return;

    const btn = document.getElementById("photo-rotate-landscape-btn");
    if (btn) btn.disabled = true;

    try {
      for (const photo of targets) {
        const curEdits = global.ActPhotosEditor.normalizeEdits(photo.edits);
        curEdits.rotate = (curEdits.rotate + 90) % 360;
        photo.edits = curEdits;
        photo.thumbBlob = await global.ActPhotosEditor.bakeEditedThumb(photo.blob, curEdits);
      }
      await global.ActPhotosDB.putPhotosBatch(targets);
      render();
      notifyToast(`Повернуто у книжковий формат: ${targets.length} фото`, "success");
    } catch (err) {
      console.error("Batch landscape rotation failed:", err);
      notifyToast("Помилка масового повороту фото", "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function handleFilesUpload(fileList) {
    if (_isUploading) {
      notifyToast("Зачекайте завершення поточного стиснення фото", "info");
      return;
    }

    const wrap = document.getElementById("photo-progress-wrap");
    const fill = document.getElementById("photo-progress-fill");
    const label = document.getElementById("photo-progress-label");
    const pctEl = document.getElementById("photo-progress-pct");

    _isUploading = true;
    wrap.classList.add("show");
    fill.style.width = "0%";
    label.textContent = "Підготовка зображень...";
    pctEl.textContent = "0%";

    const autoPortrait = _settings ? _settings.autoPortrait !== false : true;

    try {
      const { results, failedCount, skippedCount, autoRotatedCount } =
        await global.ActPhotosWorker.compressBatch(
          fileList,
          ({ completed, total, originalBytes, compressedBytes }) => {
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            fill.style.width = pct + "%";
            pctEl.textContent = pct + "%";
            label.textContent = `Стиснення фото: ${completed} / ${total} · ${formatBytes(originalBytes)} → ${formatBytes(compressedBytes)}`;
          },
          { autoPortrait }
        );

      if (results.length > 0) {
        const baseOrder = _photos.length;
        const now = Date.now();
        const newRecords = results.map((entry, idx) => ({
          id: genPhotoId(),
          order: baseOrder + idx,
          name: (entry.file && entry.file.name) || `photo_${baseOrder + idx + 1}.jpg`,
          blob: entry.result.blob,
          thumbBlob: entry.result.thumbBlob,
          width: entry.result.width,
          height: entry.result.height,
          originalSize: entry.result.originalSize,
          compressedSize: entry.result.compressedSize,
          colSpan: null,
          rowSpan: null,
          scalePct: null, // inherits settings.globalScalePct
          edits: Object.assign({}, global.ActPhotosEditor.DEFAULT_EDITS),
          createdAt: now + idx,
        }));

        await global.ActPhotosDB.putPhotosBatch(newRecords);
        _photos = _photos.concat(newRecords);
        render();
        syncPhotoPagesField(true);

        const origSum = newRecords.reduce((s, p) => s + (p.originalSize || 0), 0);
        const compSum = newRecords.reduce((s, p) => s + (p.compressedSize || 0), 0);
        const rotNote = autoRotatedCount > 0 ? ` · ↻ у книжковий: ${autoRotatedCount}` : "";
        notifyToast(
          `Додано фото: ${newRecords.length} (${formatBytes(origSum)} → ${formatBytes(compSum)}${rotNote})`,
          "success"
        );
      }

      if (skippedCount > 0) {
        notifyToast(`Пропущено не-зображень: ${skippedCount}`, "info");
      }
      if (failedCount > 0) {
        notifyToast(`Не вдалося обробити файлів: ${failedCount}`, "error");
      }
    } catch (err) {
      console.error("Upload/compression error:", err);
      notifyToast("Помилка збереження фото: " + (err && err.message ? err.message : ""), "error");
    } finally {
      _isUploading = false;
      setTimeout(() => {
        if (!_isUploading && wrap) wrap.classList.remove("show");
      }, 650);
    }
  }

  async function updateSettings(patch) {
    _settings = await global.ActPhotosDB.saveSettings(patch);
    render();
    syncPhotoPagesField(true);
  }

  async function reorderPhotos(sourceId, targetId) {
    const fromIdx = _photos.findIndex((p) => p.id === sourceId);
    const toIdx = _photos.findIndex((p) => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

    const [moved] = _photos.splice(fromIdx, 1);
    _photos.splice(toIdx, 0, moved);
    _photos.forEach((p, i) => (p.order = i));

    await global.ActPhotosDB.updateOrders(_photos.map((p) => p.id));
    render();
    syncPhotoPagesField(true);
  }

  async function movePhotoToPosition(photoId, newIndex) {
    const fromIdx = _photos.findIndex((p) => p.id === photoId);
    if (fromIdx === -1) return;
    const clamped = Math.max(0, Math.min(_photos.length - 1, newIndex));
    if (fromIdx === clamped) return;

    const [moved] = _photos.splice(fromIdx, 1);
    _photos.splice(clamped, 0, moved);
    _photos.forEach((p, i) => (p.order = i));

    await global.ActPhotosDB.updateOrders(_photos.map((p) => p.id));
    render();
    syncPhotoPagesField(true);
  }

  async function deleteSinglePhoto(photoId) {
    const idx = _photos.findIndex((p) => p.id === photoId);
    if (idx === -1) return;
    _photos.splice(idx, 1);
    _photos.forEach((p, i) => (p.order = i));

    await global.ActPhotosDB.deletePhoto(photoId);
    if (_photos.length > 0) {
      await global.ActPhotosDB.updateOrders(_photos.map((p) => p.id));
    }
    if (_sizePopPhotoId === photoId) closeSizePopover();
    render();
    syncPhotoPagesField(true);
  }

  async function clearAll(skipConfirm) {
    if (_photos.length === 0 && !skipConfirm) return;
    if (
      !skipConfirm &&
      !confirm(`Очистити всю фотогалерею (${_photos.length} фото)?\n\nЦю дію не можна скасувати.`)
    ) {
      return;
    }
    closeSizePopover();
    global.ActPhotosEditor.close();
    await global.ActPhotosDB.clearPhotos();
    _photos = [];
    revokeAllUrls();
    render();
    syncPhotoPagesField(true);
    if (!skipConfirm) {
      notifyToast("Фотогалерею очищено", "info");
    }
  }

  function openMiniEditor(photoId) {
    const photo = _photos.find((p) => p.id === photoId);
    if (!photo) return;
    closeSizePopover();

    global.ActPhotosEditor.open(photo, async (id, newEdits) => {
      const target = _photos.find((p) => p.id === id);
      if (!target) return;
      target.edits = newEdits;
      try {
        const editedThumb = await global.ActPhotosEditor.bakeEditedThumb(target.blob, newEdits);
        target.thumbBlob = editedThumb;
        await global.ActPhotosDB.updatePhoto(id, {
          edits: newEdits,
          thumbBlob: editedThumb,
        });
        const cell = document.querySelector(`.photo-cell[data-photo-id="${id}"]`);
        if (cell) {
          const img = cell.querySelector(".photo-cell-img");
          if (img) img.src = getThumbUrl(target);
          const editBtn = cell.querySelector(".photo-act-edit");
          if (editBtn) editBtn.classList.toggle("edited", global.ActPhotosEditor.hasEdits(newEdits));
        }
        syncLandscapeButton();
      } catch (err) {
        console.error("Failed to save mini-editor changes:", err);
      }
    });
  }

  function openSizePopover(photoId, anchorBtn) {
    const photo = _photos.find((p) => p.id === photoId);
    if (!photo) return;
    _sizePopPhotoId = photoId;
    const pop = document.getElementById("photo-size-popover");
    syncSizePopoverValues(photo);

    pop.classList.add("open");
    const rect = anchorBtn.getBoundingClientRect();
    const pw = 250;
    const ph = pop.offsetHeight || 260;
    let left = rect.right - pw;
    let top = rect.bottom + 6;
    if (left < 10) left = 10;
    if (left + pw > window.innerWidth - 10) left = window.innerWidth - pw - 10;
    if (top + ph > window.innerHeight - 10) top = Math.max(10, rect.top - ph - 6);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  }

  function closeSizePopover() {
    _sizePopPhotoId = null;
    const pop = document.getElementById("photo-size-popover");
    if (pop) pop.classList.remove("open");
  }

  function syncSizePopoverValues(photo) {
    const curCol = Math.min(_lastRenderedGrid.cols, Math.max(1, photo.colSpan || 1));
    const curRow = Math.min(_lastRenderedGrid.rows, Math.max(1, photo.rowSpan || 1));
    const globalScale = (_settings && _settings.globalScalePct) || 100;
    const curScale = Math.max(40, Math.min(250, photo.scalePct != null ? photo.scalePct : globalScale));

    document.getElementById("psp-col-val").textContent = String(curCol);
    document.getElementById("psp-row-val").textContent = String(curRow);
    document.getElementById("psp-scale").value = curScale;
    document.getElementById("psp-scale-val").textContent = curScale + "%";

    const pop = document.getElementById("photo-size-popover");
    pop.querySelectorAll("[data-qspan]").forEach((btn) => {
      const [c, r] = btn.dataset.qspan.split("x").map(Number);
      const possible = c <= _lastRenderedGrid.cols && r <= _lastRenderedGrid.rows;
      btn.disabled = !possible;
      btn.style.opacity = possible ? "" : "0.4";
      btn.classList.toggle("active", photo.colSpan === c && photo.rowSpan === r);
    });
    pop.querySelectorAll("[data-pscale]").forEach((btn) => {
      btn.classList.toggle("active", parseInt(btn.dataset.pscale, 10) === curScale);
    });
  }

  function stepCellSpan(prop, delta) {
    const photo = _photos.find((p) => p.id === _sizePopPhotoId);
    if (!photo) return;
    const maxVal = prop === "colSpan" ? _lastRenderedGrid.cols : _lastRenderedGrid.rows;
    const cur = photo[prop] || 1;
    const next = Math.max(1, Math.min(maxVal, cur + delta));
    const patch = {
      colSpan: prop === "colSpan" ? next : photo.colSpan || 1,
      rowSpan: prop === "rowSpan" ? next : photo.rowSpan || 1,
    };
    applyCellSizePatch(patch);
  }

  async function applyCellSizePatch(patch) {
    const photo = _photos.find((p) => p.id === _sizePopPhotoId);
    if (!photo) return;
    Object.assign(photo, patch);
    await global.ActPhotosDB.updatePhoto(photo.id, {
      colSpan: photo.colSpan,
      rowSpan: photo.rowSpan,
      scalePct: photo.scalePct,
    });
    render();
    syncSizePopoverValues(photo);
    syncPhotoPagesField(true);
  }

  function syncSidebarBadge() {
    const badge = document.getElementById("badge-photos");
    if (!badge) return;
    if (_photos.length > 0) {
      badge.textContent = String(_photos.length);
      badge.style.display = "";
    } else {
      badge.style.display = "none";
    }
  }

  function syncLandscapeButton() {
    const btn = document.getElementById("photo-rotate-landscape-btn");
    if (!btn) return;
    const count = countLandscapePhotos();
    if (count > 0) {
      btn.textContent = `↻ Повернути горизонтальні (${count})`;
      btn.style.display = "";
    } else {
      btn.style.display = "none";
    }
  }

  function syncPhotoPagesField(forceOnZero) {
    if (!_settings || _settings.autoSyncPhotoPages === false) return;
    const input = document.getElementById("photo_pages");
    if (!input) return;
    const pages = _lastRenderedGrid.pageCount || 0;
    if (pages === 0 && !forceOnZero) return;
    const nextVal = pages > 0 ? String(pages) : "";
    if (input.value !== nextVal) {
      input.value = nextVal;
      if (typeof global._saveDataNow === "function") {
        global._saveDataNow();
      } else if (typeof global.saveData === "function") {
        global.saveData();
      }
    }
  }

  function render() {
    ensureShellDom();
    if (!_settings) _settings = Object.assign({}, global.ActPhotosDB.DEFAULT_SETTINGS);

    const layout = global.ActPhotosLayout.buildPages(_photos, _settings);
    _lastRenderedGrid = {
      cols: layout.cols,
      rows: layout.rows,
      effectivePerPage: layout.effectivePerPage,
      pageCount: layout.pages.length,
    };

    const validIds = new Set(_photos.map((p) => p.id));
    revokeMissingUrls(validIds);

    const totalCompressed = _photos.reduce((s, p) => s + (p.compressedSize || (p.blob ? p.blob.size : 0)), 0);
    const totalOriginal = _photos.reduce((s, p) => s + (p.originalSize || 0), 0);

    document.getElementById("photo-stat-count").textContent = String(_photos.length);
    document.getElementById("photo-stat-size").textContent = formatBytes(totalCompressed);
    document.getElementById("photo-stat-pages").textContent = String(layout.pages.length);

    const savedEl = document.getElementById("photo-stat-saved");
    if (totalOriginal > totalCompressed && _photos.length > 0) {
      const pct = Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100);
      savedEl.textContent = `Стиснуто з ${formatBytes(totalOriginal)} (−${pct}%)`;
    } else {
      savedEl.textContent = "";
    }

    document.getElementById("photo-clear-btn").disabled = _photos.length === 0;
    document.getElementById("photo-auto-portrait-cb").checked = _settings.autoPortrait !== false;
    syncLandscapeButton();

    // Presets & manual input sync
    const autoBtn = document.getElementById("photo-auto-btn");
    autoBtn.classList.toggle("active", _settings.mode === "auto");

    document.querySelectorAll("#photo-presets-bar [data-preset]").forEach((btn) => {
      const n = parseInt(btn.dataset.preset, 10);
      btn.classList.toggle("active", _settings.mode !== "auto" && layout.effectivePerPage === n);
    });

    const perPageInput = document.getElementById("photo-per-page-input");
    if (document.activeElement !== perPageInput) {
      perPageInput.value = String(layout.effectivePerPage);
    }

    // Global scale controls sync
    const globalScale = Math.max(40, Math.min(250, _settings.globalScalePct || 100));
    document.getElementById("photo-global-scale").value = String(globalScale);
    document.getElementById("photo-global-scale-val").textContent = globalScale + "%";
    document.querySelectorAll("[data-gscale]").forEach((btn) => {
      btn.classList.toggle("active", parseInt(btn.dataset.gscale, 10) === globalScale);
    });

    // Asymmetric mode switcher visibility
    const asymRow = document.getElementById("photo-asym-row");
    const showAsym = global.ActPhotosLayout.supportsAsymmetricChoice(layout.effectivePerPage);
    asymRow.classList.toggle("show", showAsym);
    asymRow.querySelectorAll("[data-asym]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.asym === (_settings.asymmetricMode || "top-big"));
    });

    // Reset custom cell sizes/scale button
    const hasCustomSizes =
      globalScale !== 100 ||
      _photos.some(
        (p) =>
          (p.colSpan && p.colSpan > 0) ||
          (p.rowSpan && p.rowSpan > 0) ||
          (p.scalePct != null && p.scalePct !== 100)
      );
    document.getElementById("photo-reset-spans-btn").style.display = hasCustomSizes ? "" : "none";

    syncSidebarBadge();

    const listEl = document.getElementById("photo-pages-list");
    if (_photos.length === 0) {
      listEl.innerHTML =
        '<div class="photo-empty-state">Фотографії ще не додані. Перетягніть файли у зону вище або натисніть на неї для вибору.</div>';
      return;
    }

    const isDense = layout.cols * layout.rows >= 16;
    const sheetsHtml = layout.pages
      .map((page) => {
        const cellsHtml = page.placements
          .map((pl) => {
            const p = pl.photo;
            const url = getThumbUrl(p);
            const isEdited = global.ActPhotosEditor.hasEdits(p.edits);
            const isResized =
              (p.colSpan && p.colSpan > 0) ||
              (p.rowSpan && p.rowSpan > 0) ||
              (p.scalePct != null && p.scalePct !== globalScale);
            const spanBadge =
              pl.colSpan > 1 || pl.rowSpan > 1 || pl.scalePct !== 100
                ? `<span class="photo-cell-span-badge">${pl.colSpan}×${pl.rowSpan}${pl.scalePct !== 100 ? " · " + pl.scalePct + "%" : ""}</span>`
                : "";

            const imgStyle =
              pl.scalePct > 100
                ? `max-width:100%;max-height:100%;transform:scale(${(pl.scalePct / 100).toFixed(3)});transform-origin:center center`
                : `max-width:${pl.scalePct}%;max-height:${pl.scalePct}%`;

            return `
              <div
                class="photo-cell"
                draggable="true"
                data-photo-id="${p.id}"
                data-global-idx="${pl.globalIndex}"
                data-col-span="${pl.colSpan}"
                data-row-span="${pl.rowSpan}"
                data-scale-pct="${pl.scalePct}"
                style="grid-column:${pl.col + 1} / span ${pl.colSpan};grid-row:${pl.row + 1} / span ${pl.rowSpan}"
              >
                <div class="photo-cell-img-wrap">
                  <img class="photo-cell-img" src="${url}" alt="" draggable="false" style="${imgStyle}" />
                </div>
                <span class="photo-cell-num">${pl.globalIndex + 1}</span>
                ${spanBadge}
                <div class="photo-cell-actions">
                  <button type="button" class="photo-act-btn photo-act-edit ${isEdited ? "edited" : ""}" title="Міні-редактор (яскравість, контраст, поворот)" draggable="false">🎨</button>
                  <button type="button" class="photo-act-btn photo-act-resize ${isResized ? "resized" : ""}" title="Розмір та масштаб комірки" draggable="false">⤢</button>
                  <button type="button" class="photo-act-btn photo-act-extra photo-act-first" title="На початок" draggable="false">⇤</button>
                  <button type="button" class="photo-act-btn photo-act-extra photo-act-last" title="У кінець" draggable="false">⇥</button>
                  <button type="button" class="photo-act-btn photo-act-extra del photo-act-del" title="Видалити фото" draggable="false">✕</button>
                </div>
              </div>
            `;
          })
          .join("");

        return `
          <div class="photo-sheet-wrap" data-page-index="${page.pageIndex}">
            <div class="photo-sheet-header">
              <span>📄 Аркуш А4 №${page.pageIndex + 1}</span>
              <span class="photo-sheet-sub">${page.placements.length} фото · сітка ${page.cols}×${page.rows}</span>
            </div>
            <div
              class="photo-a4-sheet ${isDense ? "dense" : ""}"
              style="grid-template-columns:repeat(${page.cols}, minmax(0, 1fr));grid-template-rows:repeat(${page.rows}, minmax(0, 1fr))"
            >
              ${cellsHtml}
            </div>
          </div>
        `;
      })
      .join("");

    listEl.innerHTML = sheetsHtml;
  }

  async function init() {
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
      ensureShellDom();
      try {
        await global.ActPhotosDB.open();
        const [photos, settings] = await Promise.all([
          global.ActPhotosDB.getAllPhotos(),
          global.ActPhotosDB.getSettings(),
        ]);
        _photos = photos;
        _settings = settings;
        _initialized = true;
        render();
        if (_photos.length > 0) {
          const ppEl = document.getElementById("photo_pages");
          if (ppEl && (!ppEl.value || ppEl.value === "0")) {
            syncPhotoPagesField(false);
          }
        }
      } catch (err) {
        console.error("ActPhotos.init failed:", err);
        _photos = [];
        _settings = Object.assign({}, global.ActPhotosDB.DEFAULT_SETTINGS);
        _initialized = true;
        render();
      }
    })();
    return _initPromise;
  }

  async function exportIntoActZip(zip, onProgress) {
    if (!_initialized) {
      await init();
    }
    if (_photos.length === 0) {
      return { appendedPages: 0, appendedPhotos: 0 };
    }
    return global.ActPhotosDocx.appendPhotosToActZip(zip, _photos, _settings, onProgress);
  }

  global.ActPhotos = {
    init,
    render,
    clearAll,
    exportIntoActZip,
    rotateAllLandscapeToPortrait,
    getPhotos: () => _photos.slice(),
    getSettings: () => Object.assign({}, _settings || global.ActPhotosDB.DEFAULT_SETTINGS),
    getPhotoCount: () => _photos.length,
    getPageCount: () => _lastRenderedGrid.pageCount || 0,
  };
})(window);
