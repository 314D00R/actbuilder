// ═══════════════════════════════════════════════════════════════════
// КОНФІГУРАЦІЯ ТА СПІЛЬНИЙ СТАН ДОДАТКУ
// Усі ключі сховища, зовнішні сервіси та константи розділів в одному місці.
// ═══════════════════════════════════════════════════════════════════

const ACTBUILDER_CONFIG = {
  supabaseUrl: "https://tsxluggkjfqvvqfvkjnl.supabase.co",
  supabaseKey: "sb_publishable_jmq44zoOsK0vYM4DgDC5xA_bmVDXL3Q",
  languageToolUrl: "https://api.languagetool.org/v2/check",
  storageKeys: {
    main: "evidnovlennya_save_v14",
    static: "evidnovlennya_static_v14",
    theme: "ev_theme",
  },
};

const SUPABASE_URL = ACTBUILDER_CONFIG.supabaseUrl;
const SB_KEY = ACTBUILDER_CONFIG.supabaseKey;
const STORAGE_KEY_MAIN = ACTBUILDER_CONFIG.storageKeys.main;
const STORAGE_KEY_STATIC = ACTBUILDER_CONFIG.storageKeys.static;
const STORAGE_KEY_THEME = ACTBUILDER_CONFIG.storageKeys.theme;

// Лічильники та динамічний стан форми
let volumes = {};
let windowCount = 0,
  bldCount = 0,
  ownerCount = 0,
  signCount = 0,
  engCount = 0;
let zoneCounts = { roof: 0, over: 0, wall: 0, ceil: 0, flr: 0, fac: 0, fnd: 0 };
let manualZoneCounts = { wallsConst: 1, krokvy: 1, flrManual: 1 };
let _calcTimer = null,
  _saveTimer = null,
  _loadingStatic = false;

const PAGE_TITLES = {
  "p-general": "Загальні дані",
  "p-static": "Комісія (Сталі дані)",
  "p-techpass": "Техпаспорт",
  "p-roof": "Дах / Перекриття",
  "p-windows": "Вікна / Двері",
  "p-walls": "Стіни / Стеля",
  "p-floors": "Підлоги",
  "p-facade": "Фасад / Фундамент",
  "p-eng": "Інженерія",
  "p-volumes": "Зведена таблиця",
  "p-photos": "Фотофіксація",
  "p-export": "Висновки / Експорт",
  "p-database": "База об'єктів",
};

// Карта позицій прайсу DB по вкладках (спільна для підсумків і бейджів)
const SECTION_ITEM_MAPS = {
  roof: [1, 2, 3, 4, 5, 16, 17, 18, 19],
  windows: [6, 7, 8, 9, 10, 30],
  walls: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 32, 33, 34],
  floors: [35, 36, 37, 38, 39, 41, 42, 43, 44],
  facade: [11, 12, 13, 14, 15, 60, 61, 63, 64],
  eng: [
    "46_1", "46_2", "46_3", "46_4", "46_5",
    47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
  ],
};

// SOURCE OF TRUTH: поля що зберігаються/відновлюються у localStorage
// Якщо додаєш нове поле до будівлі або власника — достатньо додати його сюди,
// _saveDataNow і loadData підхоплять автоматично.
const BLD_PROPS = [
  "name", "heritage", "year_built", "total_area",
  "floors_total", "floors_over", "floors_under", "mansard",
  "sections", "apartments", "built_in_area",
  "fnd", "wall", "in_wall",
  "over1", "overm", "overa",
  "cover", "roof", "win", "door",
  "fac", "flr", "ceil",
  "el", "w", "g", "kan", "op",
];

const OWNER_PROPS = ["type", "name", "doc", "org", "pass_date", "rnokpp"];

const ENG_CODES = [
  "46_1", "46_2", "46_3", "46_4", "46_5",
  "47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59",
];

const KONST_CONTAINER_IDS = {
  wallsConst: "walls-const-container",
  krokvy: "krokvy-container",
  flrManual: "flr-manual-container",
};
