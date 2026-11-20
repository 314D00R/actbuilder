/**
 * ActPhotosDB — IndexedDB storage layer for compressed photos and layout settings.
 * Keeps all binary image data completely out of localStorage to preserve Act autosave.
 */
(function (global) {
  "use strict";

  const DB_NAME = "ActBuilderPhotosDB";
  const DB_VERSION = 1;
  const STORE_PHOTOS = "photos";
  const STORE_SETTINGS = "settings";
  const SETTINGS_KEY = "layout";

  const DEFAULT_SETTINGS = {
    key: SETTINGS_KEY,
    mode: "auto", // "auto" | "preset" | "manual"
    photosPerPage: 4,
    asymmetricMode: "top-big", // "top-big" | "left-big" | "equal-rows"
    showBorders: false,
    autoSyncPhotoPages: true,
  };

  let _dbPromise = null;

  function open() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error("IndexedDB не підтримується цим браузером."));
        return;
      }
      const req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
          const store = db.createObjectStore(STORE_PHOTOS, { keyPath: "id" });
          store.createIndex("by_order", "order", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          _dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        _dbPromise = null;
        reject(req.error || new Error("Не вдалося відкрити IndexedDB."));
      };
    });
    return _dbPromise;
  }

  function txPromise(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Помилка транзакції IndexedDB."));
      tx.onabort = () => reject(tx.error || new Error("Транзакцію IndexedDB скасовано."));
    });
  }

  function reqPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Помилка запиту IndexedDB."));
    });
  }

  async function getAllPhotos() {
    const db = await open();
    const tx = db.transaction(STORE_PHOTOS, "readonly");
    const store = tx.objectStore(STORE_PHOTOS);
    const items = await reqPromise(store.getAll());
    items.sort((a, b) => {
      const oa = typeof a.order === "number" ? a.order : 0;
      const ob = typeof b.order === "number" ? b.order : 0;
      if (oa !== ob) return oa - ob;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
    return items;
  }

  async function getPhoto(id) {
    const db = await open();
    const tx = db.transaction(STORE_PHOTOS, "readonly");
    return reqPromise(tx.objectStore(STORE_PHOTOS).get(id));
  }

  async function putPhoto(record) {
    const db = await open();
    const tx = db.transaction(STORE_PHOTOS, "readwrite");
    tx.objectStore(STORE_PHOTOS).put(record);
    await txPromise(tx);
    return record;
  }

  async function putPhotosBatch(records) {
    if (!records || records.length === 0) return;
    const db = await open();
    const tx = db.transaction(STORE_PHOTOS, "readwrite");
    const store = tx.objectStore(STORE_PHOTOS);
    for (const rec of records) {
      store.put(rec);
    }
    await txPromise(tx);
  }

  async function updatePhoto(id, patch) {
    const db = await open();
    const tx = db.transaction(STORE_PHOTOS, "readwrite");
    const store = tx.objectStore(STORE_PHOTOS);
    const existing = await reqPromise(store.get(id));
    if (!existing) return null;
    const updated = Object.assign({}, existing, patch);
    store.put(updated);
    await txPromise(tx);
    return updated;
  }

  async function updateOrders(orderedIds) {
    if (!orderedIds || orderedIds.length === 0) return;
    const db = await open();
    const tx = db.transaction(STORE_PHOTOS, "readwrite");
    const store = tx.objectStore(STORE_PHOTOS);
    const all = await reqPromise(store.getAll());
    const map = new Map(all.map((p) => [p.id, p]));
    orderedIds.forEach((id, idx) => {
      const rec = map.get(id);
      if (rec && rec.order !== idx) {
        rec.order = idx;
        store.put(rec);
      }
    });
    await txPromise(tx);
  }

  async function deletePhoto(id) {
    const db = await open();
    const tx = db.transaction(STORE_PHOTOS, "readwrite");
    tx.objectStore(STORE_PHOTOS).delete(id);
    await txPromise(tx);
  }

  async function clearPhotos() {
    const db = await open();
    const tx = db.transaction(STORE_PHOTOS, "readwrite");
    tx.objectStore(STORE_PHOTOS).clear();
    await txPromise(tx);
  }

  async function getSettings() {
    try {
      const db = await open();
      const tx = db.transaction(STORE_SETTINGS, "readonly");
      const saved = await reqPromise(tx.objectStore(STORE_SETTINGS).get(SETTINGS_KEY));
      return Object.assign({}, DEFAULT_SETTINGS, saved || {}, { key: SETTINGS_KEY });
    } catch (e) {
      console.warn("ActPhotosDB.getSettings fallback:", e);
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  async function saveSettings(partial) {
    const current = await getSettings();
    const merged = Object.assign({}, current, partial, { key: SETTINGS_KEY });
    const db = await open();
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    tx.objectStore(STORE_SETTINGS).put(merged);
    await txPromise(tx);
    return merged;
  }

  global.ActPhotosDB = {
    DB_NAME,
    DEFAULT_SETTINGS,
    open,
    getAllPhotos,
    getPhoto,
    putPhoto,
    putPhotosBatch,
    updatePhoto,
    updateOrders,
    deletePhoto,
    clearPhotos,
    getSettings,
    saveSettings,
  };
})(window);
