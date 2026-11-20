/**
 * ActPhotosWorker — Client-side background image compression using a bounded
 * Blob Web Worker + OffscreenCanvas pool, with automatic async <canvas> fallback.
 * Resizes long side to <=1600px JPEG (q=0.82) and generates 400px thumbnails.
 */
(function (global) {
  "use strict";

  const MAX_LONG_SIDE = 1600;
  const JPEG_QUALITY = 0.82;
  const THUMB_LONG_SIDE = 400;
  const THUMB_QUALITY = 0.72;
  const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|bmp|avif|jfif)$/i;

  const WORKER_SOURCE = `
    self.onmessage = async function (e) {
      const { taskId, file, maxDim, quality, thumbDim, thumbQuality } = e.data;
      let bitmap = null;
      try {
        try {
          bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        } catch (_) {
          bitmap = await createImageBitmap(file);
        }

        const srcW = bitmap.width;
        const srcH = bitmap.height;
        const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
        const outW = Math.max(1, Math.round(srcW * scale));
        const outH = Math.max(1, Math.round(srcH * scale));

        const canvas = new OffscreenCanvas(outW, outH);
        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outW, outH);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(bitmap, 0, 0, outW, outH);

        bitmap.close();
        bitmap = null;

        const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });

        const tScale = Math.min(1, thumbDim / Math.max(outW, outH));
        const tW = Math.max(1, Math.round(outW * tScale));
        const tH = Math.max(1, Math.round(outH * tScale));
        const tCanvas = new OffscreenCanvas(tW, tH);
        const tCtx = tCanvas.getContext("2d", { alpha: false });
        tCtx.fillStyle = "#ffffff";
        tCtx.fillRect(0, 0, tW, tH);
        tCtx.imageSmoothingEnabled = true;
        tCtx.imageSmoothingQuality = "high";
        tCtx.drawImage(canvas, 0, 0, tW, tH);

        const thumbBlob = await tCanvas.convertToBlob({ type: "image/jpeg", quality: thumbQuality });

        self.postMessage({
          taskId,
          ok: true,
          blob,
          thumbBlob,
          width: outW,
          height: outH,
          originalSize: file.size || 0,
          compressedSize: blob.size || 0,
        });
      } catch (err) {
        if (bitmap) {
          try { bitmap.close(); } catch (_) {}
        }
        self.postMessage({
          taskId,
          ok: false,
          error: (err && err.message) || "Помилка стиснення зображення",
        });
      }
    };
  `;

  function isImageFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith("image/")) return true;
    return IMAGE_EXT_RE.test(file.name || "");
  }

  function supportsOffscreenWorker() {
    return (
      typeof global.Worker === "function" &&
      typeof global.OffscreenCanvas === "function" &&
      typeof global.OffscreenCanvas.prototype.convertToBlob === "function" &&
      typeof global.createImageBitmap === "function"
    );
  }

  function loadImageViaElement(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Не вдалося декодувати зображення: " + (file.name || "")));
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Не вдалося закодувати JPEG"));
        },
        "image/jpeg",
        quality
      );
    });
  }

  async function compressOnMainThread(file, opts) {
    const maxDim = (opts && opts.maxDim) || MAX_LONG_SIDE;
    const quality = (opts && opts.quality) || JPEG_QUALITY;
    const thumbDim = (opts && opts.thumbDim) || THUMB_LONG_SIDE;
    const thumbQuality = (opts && opts.thumbQuality) || THUMB_QUALITY;

    let src = null;
    let isBitmap = false;
    try {
      if (typeof global.createImageBitmap === "function") {
        try {
          src = await global.createImageBitmap(file, { imageOrientation: "from-image" });
        } catch (_) {
          src = await global.createImageBitmap(file);
        }
        isBitmap = true;
      } else {
        src = await loadImageViaElement(file);
      }

      const srcW = src.naturalWidth || src.width;
      const srcH = src.naturalHeight || src.height;
      const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
      const outW = Math.max(1, Math.round(srcW * scale));
      const outH = Math.max(1, Math.round(srcH * scale));

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src, 0, 0, outW, outH);

      if (isBitmap && src.close) {
        src.close();
        src = null;
      }

      const blob = await canvasToBlob(canvas, quality);

      const tScale = Math.min(1, thumbDim / Math.max(outW, outH));
      const tW = Math.max(1, Math.round(outW * tScale));
      const tH = Math.max(1, Math.round(outH * tScale));
      const tCanvas = document.createElement("canvas");
      tCanvas.width = tW;
      tCanvas.height = tH;
      const tCtx = tCanvas.getContext("2d", { alpha: false });
      tCtx.fillStyle = "#ffffff";
      tCtx.fillRect(0, 0, tW, tH);
      tCtx.imageSmoothingEnabled = true;
      tCtx.imageSmoothingQuality = "high";
      tCtx.drawImage(canvas, 0, 0, tW, tH);
      const thumbBlob = await canvasToBlob(tCanvas, thumbQuality);

      return {
        blob,
        thumbBlob,
        width: outW,
        height: outH,
        originalSize: file.size || 0,
        compressedSize: blob.size || 0,
      };
    } finally {
      if (isBitmap && src && src.close) {
        try { src.close(); } catch (_) {}
      }
    }
  }

  /**
   * Compress a batch of image File objects with bounded worker concurrency.
   * Calls onProgress({ completed, total, originalBytes, compressedBytes, failed }) after each image.
   * Returns { results: Array<{ file, result }>, failedCount, skippedCount }.
   */
  async function compressBatch(fileList, onProgress, options) {
    const files = Array.from(fileList || []);
    const validFiles = [];
    let skippedCount = 0;

    for (const f of files) {
      if (isImageFile(f)) validFiles.push(f);
      else skippedCount++;
    }

    const total = validFiles.length;
    if (total === 0) {
      return { results: [], failedCount: 0, skippedCount };
    }

    const opts = Object.assign(
      {
        maxDim: MAX_LONG_SIDE,
        quality: JPEG_QUALITY,
        thumbDim: THUMB_LONG_SIDE,
        thumbQuality: THUMB_QUALITY,
      },
      options || {}
    );

    const results = new Array(total);
    let completed = 0;
    let failedCount = 0;
    let originalBytes = 0;
    let compressedBytes = 0;

    const notify = () => {
      if (typeof onProgress === "function") {
        onProgress({
          completed,
          total,
          originalBytes,
          compressedBytes,
          failedCount,
        });
      }
    };

    notify();

    let useWorker = supportsOffscreenWorker();
    let workerUrl = null;
    const workers = [];

    if (useWorker) {
      try {
        const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
        workerUrl = URL.createObjectURL(blob);
        const hw = navigator.hardwareConcurrency || 2;
        const poolSize = Math.min(3, Math.max(1, Math.min(total, Math.ceil(hw / 2))));
        for (let i = 0; i < poolSize; i++) {
          workers.push(new Worker(workerUrl));
        }
      } catch (e) {
        console.warn("ActPhotosWorker fallback to main thread:", e);
        useWorker = false;
        workers.forEach((w) => {
          try { w.terminate(); } catch (_) {}
        });
        workers.length = 0;
        if (workerUrl) {
          URL.revokeObjectURL(workerUrl);
          workerUrl = null;
        }
      }
    }

    try {
      if (useWorker && workers.length > 0) {
        let nextIndex = 0;

        const runWorkerLoop = (worker) =>
          new Promise((resolve) => {
            const dispatchNext = () => {
              if (nextIndex >= total) {
                resolve();
                return;
              }
              const idx = nextIndex++;
              const file = validFiles[idx];
              const taskId = idx;

              worker.onmessage = (ev) => {
                const msg = ev.data;
                if (!msg || msg.taskId !== taskId) return;
                if (msg.ok) {
                  results[idx] = { file, result: msg };
                  originalBytes += msg.originalSize || 0;
                  compressedBytes += msg.compressedSize || 0;
                } else {
                  failedCount++;
                  console.warn("Worker compress error for", file.name, msg.error);
                }
                completed++;
                notify();
                dispatchNext();
              };

              worker.onerror = (err) => {
                console.warn("Worker runtime error for", file.name, err);
                // Retry this file on main thread so user doesn't lose photo
                compressOnMainThread(file, opts)
                  .then((res) => {
                    results[idx] = { file, result: res };
                    originalBytes += res.originalSize || 0;
                    compressedBytes += res.compressedSize || 0;
                  })
                  .catch(() => {
                    failedCount++;
                  })
                  .finally(() => {
                    completed++;
                    notify();
                    dispatchNext();
                  });
              };

              worker.postMessage({
                taskId,
                file,
                maxDim: opts.maxDim,
                quality: opts.quality,
                thumbDim: opts.thumbDim,
                thumbQuality: opts.thumbQuality,
              });
            };

            dispatchNext();
          });

        await Promise.all(workers.map(runWorkerLoop));
      } else {
        for (let idx = 0; idx < total; idx++) {
          const file = validFiles[idx];
          try {
            const res = await compressOnMainThread(file, opts);
            results[idx] = { file, result: res };
            originalBytes += res.originalSize || 0;
            compressedBytes += res.compressedSize || 0;
          } catch (err) {
            failedCount++;
            console.warn("Main-thread compress error for", file.name, err);
          }
          completed++;
          notify();
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    } finally {
      workers.forEach((w) => {
        try { w.terminate(); } catch (_) {}
      });
      if (workerUrl) {
        URL.revokeObjectURL(workerUrl);
      }
    }

    return {
      results: results.filter(Boolean),
      failedCount,
      skippedCount,
    };
  }

  global.ActPhotosWorker = {
    MAX_LONG_SIDE,
    JPEG_QUALITY,
    THUMB_LONG_SIDE,
    THUMB_QUALITY,
    isImageFile,
    supportsOffscreenWorker,
    compressBatch,
  };
})(window);
