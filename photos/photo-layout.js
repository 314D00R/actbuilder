/**
 * ActPhotosLayout — Flexible A4 portrait photo grid & pagination engine.
 * Supports standard presets (1, 2, 4, 6, 8, 9, 12, 16, 24, 32), automatic count
 * selection, arbitrary manual counts (e.g. 3 -> asymmetric 1 big + 2 small),
 * and per-photo colSpan / rowSpan / scalePct overrides.
 */
(function (global) {
  "use strict";

  const PRESETS = [1, 2, 4, 6, 8, 9, 12, 16, 24, 32];

  const PRESET_GRIDS = {
    1: { cols: 1, rows: 1 },
    2: { cols: 1, rows: 2 },
    4: { cols: 2, rows: 2 },
    6: { cols: 2, rows: 3 },
    8: { cols: 2, rows: 4 },
    9: { cols: 3, rows: 3 },
    12: { cols: 3, rows: 4 },
    16: { cols: 4, rows: 4 },
    24: { cols: 4, rows: 6 },
    32: { cols: 4, rows: 8 },
  };

  // A4 usable portrait ratio in Act template: 14800 / 10466 ≈ 1.414
  const A4_RATIO = 14800 / 10466;

  function clampInt(val, min, max, fallback) {
    const n = parseInt(val, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  /**
   * Smart automatic photos-per-page calculation based on total uploaded photos.
   */
  function computeAutoPhotosPerPage(totalCount) {
    if (totalCount <= 1) return 1;
    if (totalCount === 2) return 2;
    if (totalCount === 3) return 3;
    if (totalCount === 4) return 4;
    if (totalCount <= 6) return 6;
    if (totalCount <= 8) return 8;
    if (totalCount === 9) return 9;
    if (totalCount <= 12) return 12;
    return 6; // Comfortable 2x3 layout for multi-page reports (>12 photos)
  }

  /**
   * Determine base (cols, rows) matrix for a given target photos-per-page count.
   */
  function getGridDimensions(photosPerPage, asymmetricMode) {
    const n = clampInt(photosPerPage, 1, 64, 4);

    if (PRESET_GRIDS[n]) {
      return { cols: PRESET_GRIDS[n].cols, rows: PRESET_GRIDS[n].rows };
    }

    if (n === 3) {
      if (asymmetricMode === "equal-rows") {
        return { cols: 1, rows: 3 };
      }
      // Default asymmetric 2x2: 1 large half-page photo + 2 smaller photos
      return { cols: 2, rows: 2 };
    }

    // Search best portrait-friendly (cols, rows) for arbitrary N
    let best = { cols: 2, rows: Math.ceil(n / 2), score: Infinity };
    const maxCols = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(n)) + 1));

    for (let cols = 1; cols <= maxCols; cols++) {
      const rows = Math.ceil(n / cols);
      if (rows < cols && n > 2) continue; // Prefer portrait layout rows >= cols
      const waste = cols * rows - n;
      const ratio = rows / cols;
      const ratioDiff = Math.abs(Math.log(ratio / A4_RATIO));
      // Penalize excessive waste and extreme aspect ratios
      const score = waste * 1.35 + ratioDiff * 1.1;
      if (score < best.score) {
        best = { cols, rows, score };
      }
    }

    return { cols: best.cols, rows: best.rows };
  }

  function supportsAsymmetricChoice(photosPerPage) {
    const n = clampInt(photosPerPage, 1, 64, 4);
    if (n === 3) return true;
    const g = getGridDimensions(n, "top-big");
    return g.cols * g.rows > n && n >= 2;
  }

  function createEmptyOccupancy(rows, cols) {
    const occ = [];
    for (let r = 0; r < rows; r++) {
      occ.push(new Array(cols).fill(false));
    }
    return occ;
  }

  function canPlace(occ, rows, cols, startR, startC, rSpan, cSpan) {
    if (startR + rSpan > rows || startC + cSpan > cols) return false;
    for (let r = startR; r < startR + rSpan; r++) {
      for (let c = startC; c < startC + cSpan; c++) {
        if (occ[r][c]) return false;
      }
    }
    return true;
  }

  function markPlaced(occ, startR, startC, rSpan, cSpan) {
    for (let r = startR; r < startR + rSpan; r++) {
      for (let c = startC; c < startC + cSpan; c++) {
        occ[r][c] = true;
      }
    }
  }

  function findFirstFit(occ, rows, cols, rSpan, cSpan) {
    for (let r = 0; r <= rows - rSpan; r++) {
      for (let c = 0; c <= cols - cSpan; c++) {
        if (canPlace(occ, rows, cols, r, c, rSpan, cSpan)) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  /**
   * Build matrix representation for clean OOXML table generation.
   * Each cell is one of:
   *  - { type: "origin", placement }
   *  - { type: "covered-h" }
   *  - { type: "covered-v", colSpan }
   *  - { type: "empty" }
   */
  function buildGridMatrix(rows, cols, placements) {
    const matrix = [];
    for (let r = 0; r < rows; r++) {
      const rowArr = [];
      for (let c = 0; c < cols; c++) {
        rowArr.push({ type: "empty" });
      }
      matrix.push(rowArr);
    }

    for (const p of placements) {
      matrix[p.row][p.col] = { type: "origin", placement: p };
      for (let c = p.col + 1; c < p.col + p.colSpan; c++) {
        matrix[p.row][c] = { type: "covered-h" };
      }
      for (let r = p.row + 1; r < p.row + p.rowSpan; r++) {
        matrix[r][p.col] = { type: "covered-v", colSpan: p.colSpan };
        for (let c = p.col + 1; c < p.col + p.colSpan; c++) {
          matrix[r][c] = { type: "covered-h" };
        }
      }
    }
    return matrix;
  }

  /**
   * Paginate photos into A4 sheets with exact 2D cell coordinates.
   */
  function buildPages(photos, settings) {
    const list = Array.isArray(photos) ? photos : [];
    const cfg = settings || {};
    const mode = cfg.mode || "auto";
    const asymmetricMode = cfg.asymmetricMode || "top-big";

    const effectivePerPage =
      mode === "auto"
        ? computeAutoPhotosPerPage(list.length)
        : clampInt(cfg.photosPerPage, 1, 64, 4);

    const { cols, rows } = getGridDimensions(effectivePerPage, asymmetricMode);

    if (list.length === 0) {
      return {
        effectivePerPage,
        cols,
        rows,
        pages: [],
      };
    }

    const pages = [];
    let currentPage = {
      pageIndex: 0,
      cols,
      rows,
      placements: [],
      occ: createEmptyOccupancy(rows, cols),
    };

    const finalizePage = (page) => {
      if (page.placements.length === 0) return;
      pages.push({
        pageIndex: pages.length,
        cols: page.cols,
        rows: page.rows,
        placements: page.placements,
        gridMatrix: buildGridMatrix(page.rows, page.cols, page.placements),
      });
    };

    for (let i = 0; i < list.length; i++) {
      const photo = list[i];
      const hasManualSpan =
        (typeof photo.colSpan === "number" && photo.colSpan > 0) ||
        (typeof photo.rowSpan === "number" && photo.rowSpan > 0);

      let cSpan = hasManualSpan ? clampInt(photo.colSpan, 1, cols, 1) : 1;
      let rSpan = hasManualSpan ? clampInt(photo.rowSpan, 1, rows, 1) : 1;
      let isAutoAsymmetric = false;

      // Apply smart asymmetric auto-span to the first photo on a fresh page
      // when target photosPerPage < cols * rows (e.g. N=3 on 2x2 -> 1 big + 2 small)
      const computeAutoSpanForFreshPage = () => {
        if (hasManualSpan || asymmetricMode === "equal-rows") return { c: cSpan, r: rSpan, auto: false };
        const remaining = list.length - i;
        const capacitySlots = cols * rows;
        const targetOnPage = Math.min(effectivePerPage, remaining);
        const spareSlots = capacitySlots - targetOnPage;
        if (effectivePerPage < capacitySlots && spareSlots > 0 && targetOnPage >= 2) {
          if (asymmetricMode === "top-big" && cols >= 2) {
            return { c: Math.min(cols, 1 + spareSlots), r: 1, auto: true };
          }
          if (asymmetricMode === "left-big" && rows >= 2) {
            return { c: 1, r: Math.min(rows, 1 + spareSlots), auto: true };
          }
        }
        return { c: 1, r: 1, auto: false };
      };

      if (currentPage.placements.length === 0) {
        const autoSpan = computeAutoSpanForFreshPage();
        cSpan = autoSpan.c;
        rSpan = autoSpan.r;
        isAutoAsymmetric = autoSpan.auto;
      }

      let fit = null;
      if (currentPage.placements.length < effectivePerPage) {
        fit = findFirstFit(currentPage.occ, rows, cols, rSpan, cSpan);
      }

      if (!fit) {
        finalizePage(currentPage);
        currentPage = {
          pageIndex: pages.length,
          cols,
          rows,
          placements: [],
          occ: createEmptyOccupancy(rows, cols),
        };
        const autoSpan = computeAutoSpanForFreshPage();
        cSpan = autoSpan.c;
        rSpan = autoSpan.r;
        isAutoAsymmetric = autoSpan.auto;
        fit = findFirstFit(currentPage.occ, rows, cols, rSpan, cSpan) || { row: 0, col: 0 };
      }

      markPlaced(currentPage.occ, fit.row, fit.col, rSpan, cSpan);
      currentPage.placements.push({
        photo,
        globalIndex: i,
        row: fit.row,
        col: fit.col,
        rowSpan: rSpan,
        colSpan: cSpan,
        isAutoAsymmetric,
        scalePct: clampInt(photo.scalePct, 40, 100, 100),
      });
    }

    finalizePage(currentPage);

    return {
      effectivePerPage,
      cols,
      rows,
      pages,
    };
  }

  global.ActPhotosLayout = {
    PRESETS,
    PRESET_GRIDS,
    computeAutoPhotosPerPage,
    getGridDimensions,
    supportsAsymmetricChoice,
    buildPages,
  };
})(window);
