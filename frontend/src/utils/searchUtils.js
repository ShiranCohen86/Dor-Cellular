/**
 * Client-side search helpers with Hebrew ↔ English alias expansion.
 *
 * When a user types "אייפון" the query is expanded to also match "iphone",
 * and vice-versa, so results appear regardless of which script was used.
 */

/**
 * Bidirectional alias table: every entry is applied in both directions.
 * Keys / values must be lowercase.
 */
const ALIAS_PAIRS = [
  // Apple devices
  ['אייפון',  'iphone'],
  ['אייפד',   'ipad'],
  ['אפל',     'apple'],
  ['מקבוק',   'macbook'],
  ['אפל ווטש', 'apple watch'],
  // Samsung
  ['סמסונג',  'samsung'],
  ['גלקסי',   'galaxy'],
  // Xiaomi / Redmi / Poco
  ['שיאומי',  'xiaomi'],
  ['רדמי',    'redmi'],
  ['פוקו',    'poco'],
  // Other brands
  ['הואווי',  'huawei'],
  ['מוטורולה', 'motorola'],
  ['נוקיה',   'nokia'],
  ['סוני',    'sony'],
  ['אל-ג\'י', 'lg'],
  ['ואן פלוס', 'oneplus'],
  ['גוגל',    'google'],
  ['פיקסל',   'pixel'],
  // Accessories / parts
  ['כיסוי',   'case'],
  ['מגן מסך', 'screen protector'],
  ['מגן',     'protector'],
  ['מטען',    'charger'],
  ['סוללה',   'battery'],
  ['מסך',     'screen'],
  ['מצלמה',   'camera'],
  ['אוזניות', 'earphones'],
  ['אוזניות', 'airpods'],
  ['טבלט',    'tablet'],
  ['שעון',    'watch'],
  ['ממיר',    'adapter'],
  ['כבל',     'cable'],
];

/** Flat map: term → [aliases]. Built once at module load. */
const ALIAS_MAP = new Map();
for (const [he, en] of ALIAS_PAIRS) {
  if (!ALIAS_MAP.has(he)) ALIAS_MAP.set(he, []);
  ALIAS_MAP.get(he).push(en);
  if (!ALIAS_MAP.has(en)) ALIAS_MAP.set(en, []);
  ALIAS_MAP.get(en).push(he);
}

/**
 * Expand `query` into an array of equivalent search terms.
 * e.g. "אייפון 15" → ["אייפון 15", "iphone 15"]
 */
export function expandQuery(query) {
  const q = query.trim().toLowerCase();
  const variants = new Set([q]);
  for (const [term, aliases] of ALIAS_MAP) {
    if (q.includes(term)) {
      for (const alias of aliases) {
        variants.add(q.replaceAll(term, alias));
      }
    }
  }
  return [...variants];
}

/**
 * Split `items` into those matching `query` and the rest.
 *
 * @param {object[]} items       - Full list of objects.
 * @param {string}   query       - Raw user input (any language).
 * @param {string[]} fieldNames  - Object keys to search across.
 * @returns {{ matched: object[], rest: object[] }}
 */
export function splitByQuery(items, query, fieldNames) {
  const q = query.trim().toLowerCase();
  if (!q) return { matched: items, rest: [] };
  const queries = expandQuery(q);
  const matched = [], rest = [];
  for (const item of items) {
    const haystack = fieldNames.map((f) => item[f] ?? '').join(' ').toLowerCase();
    const isMatch = queries.some((variant) => haystack.includes(variant));
    (isMatch ? matched : rest).push(item);
  }
  return { matched, rest };
}
