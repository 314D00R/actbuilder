/**
 * ActPhotosDocx — Pure OpenXML generator that appends borderless A4 photo tables
 * directly into the rendered Act PizZip (.docx) after the commission/owner signatures block.
 * Requires zero manual template edits and zero third-party docxtemplater image modules.
 */
(function (global) {
  "use strict";

  // Usable A4 portrait dimensions derived from actBase64 w:pgSz (11906x16838)
  // and w:pgMar (top=993, bottom=851, left=720, right=720):
  // Width = 11906 - 720 - 720 = 10466 dxa (~184.6 mm)
  // Height = 16838 - 993 - 851 = 14994 dxa (~264.5 mm); reserve 194 dxa for mandatory trailing <w:p/>
  const PAGE_W_DXA = 10466;
  const PAGE_H_DXA = 14800;
  const EMU_PER_DXA = 635;

  const REL_IMAGE_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

  function splitTotal(total, parts) {
    const base = Math.floor(total / parts);
    const rem = total - base * parts;
    const arr = [];
    for (let i = 0; i < parts; i++) {
      arr.push(i === parts - 1 ? base + rem : base);
    }
    return arr;
  }

  function sumRange(arr, start, count) {
    let s = 0;
    for (let i = start; i < start + count && i < arr.length; i++) {
      s += arr[i];
    }
    return s;
  }

  function buildPageBreakParagraph() {
    return (
      '<w:p>' +
      '<w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr>' +
      '<w:r><w:br w:type="page"/></w:r>' +
      '</w:p>'
    );
  }

  function buildTrailingParagraph() {
    return (
      '<w:p>' +
      '<w:pPr>' +
      '<w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>' +
      '<w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>' +
      '</w:pPr>' +
      '</w:p>'
    );
  }

  function buildDrawingXml(rId, docPrId, fileName, cx, cy) {
    const safeName = String(fileName || "photo.jpg").replace(/[&<>"']/g, "");
    return (
      '<w:drawing>' +
      '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
      `<wp:extent cx="${cx}" cy="${cy}"/>` +
      '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
      `<wp:docPr id="${docPrId}" name="Photo ${docPrId}"/>` +
      '<wp:cNvGraphicFramePr>' +
      '<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>' +
      '</wp:cNvGraphicFramePr>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
      '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:nvPicPr>' +
      `<pic:cNvPr id="${docPrId}" name="${safeName}"/>` +
      '<pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr>' +
      '</pic:nvPicPr>' +
      '<pic:blipFill>' +
      `<a:blip r:embed="${rId}"/>` +
      '<a:stretch><a:fillRect/></a:stretch>' +
      '</pic:blipFill>' +
      '<pic:spPr bwMode="auto">' +
      '<a:xfrm>' +
      '<a:off x="0" y="0"/>' +
      `<a:ext cx="${cx}" cy="${cy}"/>` +
      '</a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' +
      '</pic:spPr>' +
      '</pic:pic>' +
      '</a:graphicData>' +
      '</a:graphic>' +
      '</wp:inline>' +
      '</w:drawing>'
    );
  }

  function buildBordersXml(showBorders) {
    if (showBorders) {
      return (
        '<w:tblBorders>' +
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>' +
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>' +
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>' +
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>' +
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>' +
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>' +
        '</w:tblBorders>'
      );
    }
    return (
      '<w:tblBorders>' +
      '<w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
      '<w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
      '<w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
      '<w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
      '<w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
      '<w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
      '</w:tblBorders>'
    );
  }

  function ensureJpegContentType(zip) {
    const ctPath = "[Content_Types].xml";
    const file = zip.file(ctPath);
    if (!file) return;
    let xml = file.asText();
    if (!/Extension="jpe?g"/i.test(xml)) {
      xml = xml.replace(
        /<\/Types>\s*$/,
        '<Default Extension="jpg" ContentType="image/jpeg"/></Types>'
      );
      zip.file(ctPath, xml);
    }
  }

  function findMaxRelId(relsXml) {
    let maxId = 0;
    const re = /Id="rId(\d+)"/g;
    let m;
    while ((m = re.exec(relsXml)) !== null) {
      const n = parseInt(m[1], 10);
      if (n > maxId) maxId = n;
    }
    return maxId;
  }

  function findMaxDocPrId(docXml) {
    let maxId = 10000;
    const re = /docPr[^>]*\bid="(\d+)"/g;
    let m;
    while ((m = re.exec(docXml)) !== null) {
      const n = parseInt(m[1], 10);
      if (n > maxId) maxId = n;
    }
    return maxId;
  }

  function buildPageTableXml(page, imageMetaMap, options, nextDocPrIdFn) {
    const cols = page.cols;
    const rows = page.rows;
    const colWidths = splitTotal(PAGE_W_DXA, cols);
    const rowHeights = splitTotal(PAGE_H_DXA, rows);
    const cellPadDxa = cols * rows >= 16 ? 35 : 55;
    const showBorders = !!(options && options.showBorders);

    // Check which rows participate in any vertical merge (rowSpan > 1)
    const rowHasVMerge = new Array(rows).fill(false);
    for (const p of page.placements) {
      if (p.rowSpan > 1) {
        for (let r = p.row; r < p.row + p.rowSpan && r < rows; r++) {
          rowHasVMerge[r] = true;
        }
      }
    }

    const tblGridXml =
      "<w:tblGrid>" +
      colWidths.map((w) => `<w:gridCol w:w="${w}"/>`).join("") +
      "</w:tblGrid>";

    const tblPrXml =
      "<w:tblPr>" +
      `<w:tblW w:w="${PAGE_W_DXA}" w:type="dxa"/>` +
      '<w:jc w:val="center"/>' +
      '<w:tblLayout w:type="fixed"/>' +
      buildBordersXml(showBorders) +
      "<w:tblCellMar>" +
      `<w:top w:w="${cellPadDxa}" w:type="dxa"/>` +
      `<w:left w:w="${cellPadDxa}" w:type="dxa"/>` +
      `<w:bottom w:w="${cellPadDxa}" w:type="dxa"/>` +
      `<w:right w:w="${cellPadDxa}" w:type="dxa"/>` +
      "</w:tblCellMar>" +
      "</w:tblPr>";

    let rowsXml = "";
    const matrix = page.gridMatrix;

    for (let r = 0; r < rows; r++) {
      const hRule = rowHasVMerge[r] ? "atLeast" : "exact";
      const trPr =
        "<w:trPr>" +
        "<w:cantSplit/>" +
        `<w:trHeight w:val="${rowHeights[r]}" w:hRule="${hRule}"/>` +
        "</w:trPr>";

      let cellsXml = "";
      let c = 0;
      while (c < cols) {
        const cell = matrix[r][c];

        if (cell.type === "origin") {
          const p = cell.placement;
          const spanW = sumRange(colWidths, c, p.colSpan);
          const spanH = sumRange(rowHeights, r, p.rowSpan);
          const meta = imageMetaMap.get(p.photo.id);

          let tcPr = `<w:tcW w:w="${spanW}" w:type="dxa"/>`;
          if (p.colSpan > 1) tcPr += `<w:gridSpan w:val="${p.colSpan}"/>`;
          if (p.rowSpan > 1) tcPr += '<w:vMerge w:val="restart"/>';
          tcPr += '<w:vAlign w:val="center"/>';

          let pContent = "";
          if (meta) {
            const innerW = Math.max(200, spanW - cellPadDxa * 2 - 20);
            const innerH = Math.max(200, spanH - cellPadDxa * 2 - 20);
            const scaleFactor = Math.max(0.4, Math.min(1, (p.scalePct || 100) / 100));
            const maxW_emu = Math.round(innerW * EMU_PER_DXA * scaleFactor);
            const maxH_emu = Math.round(innerH * EMU_PER_DXA * scaleFactor);
            const imgW = Math.max(1, meta.width || 1);
            const imgH = Math.max(1, meta.height || 1);
            const fitRatio = Math.min(maxW_emu / imgW, maxH_emu / imgH);
            const cx = Math.max(EMU_PER_DXA * 10, Math.round(imgW * fitRatio));
            const cy = Math.max(EMU_PER_DXA * 10, Math.round(imgH * fitRatio));
            const docPrId = nextDocPrIdFn();
            pContent = `<w:r>${buildDrawingXml(meta.rId, docPrId, meta.mediaName, cx, cy)}</w:r>`;
          }

          cellsXml +=
            `<w:tc><w:tcPr>${tcPr}</w:tcPr>` +
            '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>' +
            pContent +
            "</w:p></w:tc>";

          c += p.colSpan;
        } else if (cell.type === "covered-v") {
          const spanCols = cell.colSpan || 1;
          const spanW = sumRange(colWidths, c, spanCols);
          let tcPr = `<w:tcW w:w="${spanW}" w:type="dxa"/>`;
          if (spanCols > 1) tcPr += `<w:gridSpan w:val="${spanCols}"/>`;
          tcPr += "<w:vMerge/>";
          cellsXml +=
            `<w:tc><w:tcPr>${tcPr}</w:tcPr>` +
            '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p></w:tc>';
          c += spanCols;
        } else if (cell.type === "covered-h") {
          c += 1;
        } else {
          const w = colWidths[c];
          cellsXml +=
            `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>` +
            '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p></w:tc>';
          c += 1;
        }
      }

      rowsXml += `<w:tr>${trPr}${cellsXml}</w:tr>`;
    }

    return `<w:tbl>${tblPrXml}${tblGridXml}${rowsXml}</w:tbl>`;
  }

  /**
   * Append all photo pages to a rendered Act PizZip archive.
   * @param {PizZip} zip - Rendered docx zip from docxtemplater
   * @param {Array} photos - Ordered photo records from IndexedDB
   * @param {Object} settings - Layout settings
   * @param {Function} onProgress - Optional progress callback ({ completed, total })
   */
  async function appendPhotosToActZip(zip, photos, settings, onProgress) {
    if (!zip || !Array.isArray(photos) || photos.length === 0) return { appendedPages: 0, appendedPhotos: 0 };

    const layout = global.ActPhotosLayout.buildPages(photos, settings);
    if (!layout.pages || layout.pages.length === 0) return { appendedPages: 0, appendedPhotos: 0 };

    const relsPath = "word/_rels/document.xml.rels";
    const docPath = "word/document.xml";
    const relsFile = zip.file(relsPath);
    const docFile = zip.file(docPath);
    if (!relsFile || !docFile) {
      throw new Error("Некоректна структура Word-шаблону (відсутній document.xml або .rels).");
    }

    ensureJpegContentType(zip);

    let relsXml = relsFile.asText();
    let docXml = docFile.asText();

    let nextRelNum = findMaxRelId(relsXml) + 1;
    let nextDocPrId = findMaxDocPrId(docXml) + 1;

    const imageMetaMap = new Map();
    let newRelsXml = "";
    const total = photos.length;

    // Bake & write each photo into word/media/
    for (let i = 0; i < total; i++) {
      const photo = photos[i];
      const baked = await global.ActPhotosEditor.bakePhotoForExport(photo);
      const mediaName = `photo_${i + 1}.jpg`;
      const mediaPath = `word/media/${mediaName}`;
      const rId = `rId${nextRelNum++}`;

      zip.file(mediaPath, baked.bytes, { binary: true });
      newRelsXml += `<Relationship Id="${rId}" Type="${REL_IMAGE_TYPE}" Target="media/${mediaName}"/>`;
      imageMetaMap.set(photo.id, {
        rId,
        mediaName,
        width: baked.width,
        height: baked.height,
      });

      if (typeof onProgress === "function") {
        onProgress({ completed: i + 1, total });
      }
    }

    // Update word/_rels/document.xml.rels
    relsXml = relsXml.replace(/<\/Relationships>\s*$/, `${newRelsXml}</Relationships>`);
    zip.file(relsPath, relsXml);

    // Build OOXML for all A4 photo sheets (page break after signatures, and between sheets)
    const tableOptions = { showBorders: !!(settings && settings.showBorders) };
    let appendixXml = "";
    layout.pages.forEach((page) => {
      appendixXml += buildPageBreakParagraph();
      appendixXml += buildPageTableXml(page, imageMetaMap, tableOptions, () => nextDocPrId++);
    });
    // Mandatory minimal paragraph after the final table before <w:sectPr>
    appendixXml += buildTrailingParagraph();

    // Inject right before the final <w:sectPr ...> inside <w:body>
    const sectIdx = docXml.lastIndexOf("<w:sectPr");
    if (sectIdx !== -1) {
      docXml = docXml.slice(0, sectIdx) + appendixXml + docXml.slice(sectIdx);
    } else {
      const bodyCloseIdx = docXml.lastIndexOf("</w:body>");
      if (bodyCloseIdx === -1) {
        throw new Error("Не вдалося знайти </w:body> у Word-документі.");
      }
      docXml = docXml.slice(0, bodyCloseIdx) + appendixXml + docXml.slice(bodyCloseIdx);
    }

    zip.file(docPath, docXml);

    return {
      appendedPages: layout.pages.length,
      appendedPhotos: total,
    };
  }

  global.ActPhotosDocx = {
    PAGE_W_DXA,
    PAGE_H_DXA,
    EMU_PER_DXA,
    appendPhotosToActZip,
  };
})(window);
