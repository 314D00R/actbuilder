/**
 * ActPhotosEditor — Compact modal mini-editor with real-time WYSIWYG Canvas preview
 * (brightness, contrast, saturation, sharpness, ±90° rotation, reset) and deterministic
 * pixel-level Canvas baking for Word (.docx) export.
 */
(function (global) {
  "use strict";

  const DEFAULT_EDITS = {
    brightness: 100, // 20..200 (%)
    contrast: 100,   // 20..200 (%)
    saturate: 100,   // 0..200 (%)
    sharpness: 0,    // 0..100
    rotate: 0,       // 0 | 90 | 180 | 270
  };

  function clamp(val, min, max, fallback) {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function normalizeRotate(deg) {
    const n = Math.round(Number(deg) || 0);
    const mod = ((n % 360) + 360) % 360;
    if (mod === 90 || mod === 180 || mod === 270) return mod;
    return 0;
  }

  function normalizeEdits(edits) {
    const src = edits || {};
    return {
      brightness: Math.round(clamp(src.brightness, 20, 200, 100)),
      contrast: Math.round(clamp(src.contrast, 20, 200, 100)),
      saturate: Math.round(clamp(src.saturate, 0, 200, 100)),
      sharpness: Math.round(clamp(src.sharpness, 0, 100, 0)),
      rotate: normalizeRotate(src.rotate),
    };
  }

  function hasEdits(edits) {
    const e = normalizeEdits(edits);
    return (
      e.brightness !== 100 ||
      e.contrast !== 100 ||
      e.saturate !== 100 ||
      e.sharpness !== 0 ||
      e.rotate !== 0
    );
  }

  function getEffectiveDimensions(width, height, rotate) {
    const r = normalizeRotate(rotate);
    if (r === 90 || r === 270) {
      return { width: height, height: width };
    }
    return { width, height };
  }

  function clampByte(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
  }

  /**
   * Deterministic pixel-level brightness, contrast, saturation & 3x3 sharpen convolution.
   * Works identically across Chrome, Firefox, Edge, Safari, and headless Chromium.
   */
  function applyPixelEdits(ctx, width, height, edits) {
    const e = normalizeEdits(edits);
    const needColor = e.brightness !== 100 || e.contrast !== 100 || e.saturate !== 100;
    const needSharp = e.sharpness > 0;
    if (!needColor && !needSharp) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    if (needColor) {
      const bMul = e.brightness / 100;
      const cMul = e.contrast / 100;
      const sMul = e.saturate / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness
        if (bMul !== 1) {
          r *= bMul;
          g *= bMul;
          b *= bMul;
        }
        // Contrast (centered at 128)
        if (cMul !== 1) {
          r = (r - 128) * cMul + 128;
          g = (g - 128) * cMul + 128;
          b = (b - 128) * cMul + 128;
        }
        // Saturation (Rec.709 luma)
        if (sMul !== 1) {
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = lum + (r - lum) * sMul;
          g = lum + (g - lum) * sMul;
          b = lum + (b - lum) * sMul;
        }

        data[i] = clampByte(r + 0.5) | 0;
        data[i + 1] = clampByte(g + 0.5) | 0;
        data[i + 2] = clampByte(b + 0.5) | 0;
      }
    }

    if (needSharp && width >= 3 && height >= 3) {
      const copy = new Uint8ClampedArray(data);
      const amount = (e.sharpness / 100) * 1.4;
      const centerW = 1 + 4 * amount;
      const sideW = -amount;
      const rowStride = width * 4;

      for (let y = 1; y < height - 1; y++) {
        const rowOff = y * rowStride;
        for (let x = 1; x < width - 1; x++) {
          const idx = rowOff + x * 4;
          const up = idx - rowStride;
          const dn = idx + rowStride;
          const lt = idx - 4;
          const rt = idx + 4;

          data[idx] = clampByte(
            copy[idx] * centerW + (copy[up] + copy[dn] + copy[lt] + copy[rt]) * sideW
          );
          data[idx + 1] = clampByte(
            copy[idx + 1] * centerW +
              (copy[up + 1] + copy[dn + 1] + copy[lt + 1] + copy[rt + 1]) * sideW
          );
          data[idx + 2] = clampByte(
            copy[idx + 2] * centerW +
              (copy[up + 2] + copy[dn + 2] + copy[lt + 2] + copy[rt + 2]) * sideW
          );
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function decodeBlob(blob) {
    if (typeof global.createImageBitmap === "function") {
      return global.createImageBitmap(blob).then((bmp) => ({ source: bmp, isBitmap: true }));
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ source: img, isBitmap: false });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Не вдалося декодувати фото"));
      };
      img.src = url;
    });
  }

  function drawSourceToCanvas(source, edits, maxDim, targetCanvas) {
    const e = normalizeEdits(edits);
    const srcW = source.naturalWidth || source.width;
    const srcH = source.naturalHeight || source.height;
    const scale = maxDim ? Math.min(1, maxDim / Math.max(srcW, srcH)) : 1;
    const drawW = Math.max(1, Math.round(srcW * scale));
    const drawH = Math.max(1, Math.round(srcH * scale));
    const swapped = e.rotate === 90 || e.rotate === 270;
    const outW = swapped ? drawH : drawW;
    const outH = swapped ? drawW : drawH;

    const canvas = targetCanvas || document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    if (e.rotate !== 0) {
      ctx.rotate((e.rotate * Math.PI) / 180);
    }
    ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    applyPixelEdits(ctx, outW, outH, e);
    return { canvas, width: outW, height: outH };
  }

  function canvasToJpegBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Помилка кодування JPEG"));
        },
        "image/jpeg",
        quality
      );
    });
  }

  /**
   * Generate a 400px thumbnail Blob with current edits & rotation baked in.
   */
  async function bakeEditedThumb(blob, edits) {
    const decoded = await decodeBlob(blob);
    try {
      const { canvas } = drawSourceToCanvas(decoded.source, edits, 400);
      return await canvasToJpegBlob(canvas, 0.76);
    } finally {
      if (decoded.isBitmap && decoded.source.close) {
        try { decoded.source.close(); } catch (_) {}
      }
    }
  }

  /**
   * Bake full-resolution photo into JPEG Uint8Array for Word (.docx) export.
   * Supports optional center-crop zoom when scalePct > 100% inside a known cell box
   * ({ cellInnerW, cellInnerH, scalePct }), matching the UI preview 1:1.
   * Unedited JPEG photos with scalePct <= 100% reuse stored binary bytes directly.
   */
  async function bakePhotoForExport(photo, exportOptions) {
    const edits = normalizeEdits(photo.edits);
    const opts = exportOptions || {};
    const scalePct = clamp(
      opts.scalePct !== undefined ? opts.scalePct : photo.scalePct,
      40,
      250,
      100
    );
    const cellInnerW = Number(opts.cellInnerW) || 0;
    const cellInnerH = Number(opts.cellInnerH) || 0;
    const needsCropZoom = scalePct > 100 && cellInnerW > 0 && cellInnerH > 0;

    if (!hasEdits(edits) && !needsCropZoom && photo.blob && photo.blob.type === "image/jpeg") {
      const buf = await photo.blob.arrayBuffer();
      return {
        bytes: new Uint8Array(buf),
        width: photo.width,
        height: photo.height,
      };
    }

    const decoded = await decodeBlob(photo.blob);
    try {
      const rendered = drawSourceToCanvas(decoded.source, edits, null);
      let finalCanvas = rendered.canvas;
      let outW = rendered.width;
      let outH = rendered.height;
      let targetDxaW = null;
      let targetDxaH = null;

      if (needsCropZoom) {
        const fitRatio = Math.min(cellInnerW / outW, cellInnerH / outH);
        const virtW = outW * fitRatio * (scalePct / 100);
        const virtH = outH * fitRatio * (scalePct / 100);
        const visW = Math.min(cellInnerW, virtW);
        const visH = Math.min(cellInnerH, virtH);
        const visFracX = Math.min(1, visW / virtW);
        const visFracY = Math.min(1, visH / virtH);

        const cropW = Math.max(1, Math.round(outW * visFracX));
        const cropH = Math.max(1, Math.round(outH * visFracY));
        const cropX = Math.max(0, Math.floor((outW - cropW) / 2));
        const cropY = Math.max(0, Math.floor((outH - cropH) / 2));

        if (cropW < outW || cropH < outH) {
          const croppedCanvas = document.createElement("canvas");
          croppedCanvas.width = cropW;
          croppedCanvas.height = cropH;
          const cCtx = croppedCanvas.getContext("2d", { alpha: false });
          cCtx.fillStyle = "#ffffff";
          cCtx.fillRect(0, 0, cropW, cropH);
          cCtx.drawImage(rendered.canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          finalCanvas = croppedCanvas;
          outW = cropW;
          outH = cropH;
        }
        targetDxaW = visW;
        targetDxaH = visH;
      }

      const bakedBlob = await canvasToJpegBlob(finalCanvas, 0.85);
      const buf = await bakedBlob.arrayBuffer();
      return {
        bytes: new Uint8Array(buf),
        width: outW,
        height: outH,
        targetDxaW,
        targetDxaH,
      };
    } finally {
      if (decoded.isBitmap && decoded.source.close) {
        try { decoded.source.close(); } catch (_) {}
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // MODAL MINI-EDITOR UI (Hidden by default; opened via card button)
  // ═══════════════════════════════════════════════════════════════════
  let _overlayEl = null;
  let _activePhoto = null;
  let _draftEdits = null;
  let _previewBitmap = null;
  let _onChangeCallback = null;
  let _rafId = null;
  let _saveTimer = null;

  function ensureModalDom() {
    if (_overlayEl) return _overlayEl;
    const html = `
      <div class="photo-editor-overlay" id="photo-editor-overlay" role="dialog" aria-modal="true" aria-label="Міні-редактор фото">
        <div class="photo-editor-modal">
          <div class="photo-editor-header">
            <div class="photo-editor-title">🎨 Міні-редактор фото <span class="photo-editor-meta" id="pe-meta"></span></div>
            <button type="button" class="photo-editor-close" id="pe-close-btn" title="Закрити (Esc)">✕</button>
          </div>
          <div class="photo-editor-body">
            <div class="photo-editor-stage">
              <canvas id="photo-editor-canvas"></canvas>
            </div>
            <div class="photo-editor-controls">
              <div class="pe-control">
                <div class="pe-control-head">
                  <label for="pe-brightness">Яскравість</label>
                  <span class="pe-val" id="pe-brightness-val">100%</span>
                </div>
                <input type="range" id="pe-brightness" min="20" max="200" step="1" value="100" />
              </div>
              <div class="pe-control">
                <div class="pe-control-head">
                  <label for="pe-contrast">Контраст</label>
                  <span class="pe-val" id="pe-contrast-val">100%</span>
                </div>
                <input type="range" id="pe-contrast" min="20" max="200" step="1" value="100" />
              </div>
              <div class="pe-control">
                <div class="pe-control-head">
                  <label for="pe-saturate">Насиченість</label>
                  <span class="pe-val" id="pe-saturate-val">100%</span>
                </div>
                <input type="range" id="pe-saturate" min="0" max="200" step="1" value="100" />
              </div>
              <div class="pe-control">
                <div class="pe-control-head">
                  <label for="pe-sharpness">Різкість</label>
                  <span class="pe-val" id="pe-sharpness-val">0</span>
                </div>
                <input type="range" id="pe-sharpness" min="0" max="100" step="1" value="0" />
              </div>
              <div class="pe-rotate-row">
                <button type="button" class="btn btn-surface pe-rot-btn" id="pe-rot-left">↶ -90°</button>
                <button type="button" class="btn btn-surface pe-rot-btn" id="pe-rot-right">↷ +90°</button>
              </div>
              <div class="pe-rot-status" id="pe-rot-status">Поворот: 0°</div>
            </div>
          </div>
          <div class="photo-editor-footer">
            <button type="button" class="btn btn-danger" id="pe-reset-btn">↺ Скинути</button>
            <button type="button" class="btn btn-accent" id="pe-done-btn">✓ Готово</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
    _overlayEl = document.getElementById("photo-editor-overlay");

    _overlayEl.addEventListener("click", (e) => {
      if (e.target === _overlayEl) close();
    });
    document.getElementById("pe-close-btn").addEventListener("click", close);
    document.getElementById("pe-done-btn").addEventListener("click", close);

    ["brightness", "contrast", "saturate", "sharpness"].forEach((key) => {
      const inp = document.getElementById("pe-" + key);
      inp.addEventListener("input", () => {
        if (!_draftEdits) return;
        _draftEdits[key] = parseInt(inp.value, 10);
        syncLabels();
        schedulePreviewRender();
        schedulePersist();
      });
    });

    document.getElementById("pe-rot-left").addEventListener("click", () => {
      if (!_draftEdits) return;
      _draftEdits.rotate = normalizeRotate(_draftEdits.rotate - 90);
      syncLabels();
      schedulePreviewRender();
      commitEditsNow();
    });

    document.getElementById("pe-rot-right").addEventListener("click", () => {
      if (!_draftEdits) return;
      _draftEdits.rotate = normalizeRotate(_draftEdits.rotate + 90);
      syncLabels();
      schedulePreviewRender();
      commitEditsNow();
    });

    document.getElementById("pe-reset-btn").addEventListener("click", () => {
      if (!_draftEdits) return;
      _draftEdits = Object.assign({}, DEFAULT_EDITS);
      syncInputsFromDraft();
      syncLabels();
      schedulePreviewRender();
      commitEditsNow();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && _overlayEl && _overlayEl.classList.contains("open")) {
        close();
      }
    });

    return _overlayEl;
  }

  function syncInputsFromDraft() {
    if (!_draftEdits) return;
    document.getElementById("pe-brightness").value = _draftEdits.brightness;
    document.getElementById("pe-contrast").value = _draftEdits.contrast;
    document.getElementById("pe-saturate").value = _draftEdits.saturate;
    document.getElementById("pe-sharpness").value = _draftEdits.sharpness;
  }

  function syncLabels() {
    if (!_draftEdits) return;
    document.getElementById("pe-brightness-val").textContent = _draftEdits.brightness + "%";
    document.getElementById("pe-contrast-val").textContent = _draftEdits.contrast + "%";
    document.getElementById("pe-saturate-val").textContent = _draftEdits.saturate + "%";
    document.getElementById("pe-sharpness-val").textContent = String(_draftEdits.sharpness);
    document.getElementById("pe-rot-status").textContent = "Поворот: " + _draftEdits.rotate + "°";
    if (_activePhoto) {
      const dims = getEffectiveDimensions(_activePhoto.width, _activePhoto.height, _draftEdits.rotate);
      document.getElementById("pe-meta").textContent = `· ${dims.width}×${dims.height} px`;
    }
  }

  function schedulePreviewRender() {
    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(() => {
      _rafId = null;
      renderPreviewNow();
    });
  }

  function renderPreviewNow() {
    if (!_previewBitmap || !_draftEdits) return;
    const canvas = document.getElementById("photo-editor-canvas");
    if (!canvas) return;
    drawSourceToCanvas(_previewBitmap.source, _draftEdits, 760, canvas);
  }

  function schedulePersist() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(commitEditsNow, 180);
  }

  function commitEditsNow() {
    clearTimeout(_saveTimer);
    _saveTimer = null;
    if (!_activePhoto || !_draftEdits || typeof _onChangeCallback !== "function") return;
    const editsCopy = normalizeEdits(_draftEdits);
    _onChangeCallback(_activePhoto.id, editsCopy);
  }

  async function open(photo, onChange) {
    if (!photo || !photo.blob) return;
    const overlay = ensureModalDom();
    releaseBitmap();

    _activePhoto = photo;
    _draftEdits = normalizeEdits(photo.edits);
    _onChangeCallback = onChange;

    syncInputsFromDraft();
    syncLabels();
    overlay.classList.add("open");

    try {
      _previewBitmap = await decodeBlob(photo.blob);
      renderPreviewNow();
    } catch (err) {
      console.error("Photo editor decode error:", err);
      if (typeof global.showToast === "function") {
        global.showToast("Не вдалося відкрити фото у редакторі", "error");
      }
      close();
    }
  }

  function releaseBitmap() {
    if (_previewBitmap && _previewBitmap.isBitmap && _previewBitmap.source && _previewBitmap.source.close) {
      try { _previewBitmap.source.close(); } catch (_) {}
    }
    _previewBitmap = null;
  }

  function close() {
    if (_saveTimer) {
      commitEditsNow();
    }
    if (_rafId) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
    if (_overlayEl) {
      _overlayEl.classList.remove("open");
    }
    releaseBitmap();
    _activePhoto = null;
    _draftEdits = null;
    _onChangeCallback = null;
  }

  global.ActPhotosEditor = {
    DEFAULT_EDITS,
    normalizeEdits,
    hasEdits,
    getEffectiveDimensions,
    applyPixelEdits,
    bakeEditedThumb,
    bakePhotoForExport,
    open,
    close,
  };
})(window);
