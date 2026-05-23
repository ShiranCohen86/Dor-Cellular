/**
 * seed-products.js
 * Upserts categories and ~65 products into MongoDB Atlas.
 * Run: node backend/scripts/seed-products.js
 * Existing docs are updated in-place (no deletions).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

// ── Inline schemas (avoid circular imports) ──────────────────────────────────

const CategorySchema = new mongoose.Schema({
  name:     { type: String, required: true },
  slug:     { type: String, required: true, unique: true },
  type:     { type: String, enum: ['smartphone','tablet','charger','case','screen_protector','sim','esim','repair_part','accessory','other'] },
  isActive: { type: Boolean, default: true },
});
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

const ProductSchema = new mongoose.Schema({
  sku:           { type: String, required: true, unique: true, trim: true, uppercase: true },
  name:          { type: String, required: true, trim: true },
  brand:         { type: String, required: true, trim: true },
  model:         { type: String, trim: true },
  description:   String,
  categoryId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  purchasePrice: { type: Number, required: true, min: 0 },
  salePrice:     { type: Number, required: true, min: 0 },
  color:         String,
  storageGB:     Number,
  totalStock:    { type: Number, default: 0 },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// ── Seed data ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { slug: 'smartphones',       name: 'סמארטפונים',  type: 'smartphone' },
  { slug: 'tablets',           name: 'טאבלטים',     type: 'tablet' },
  { slug: 'chargers',          name: 'מטענים',      type: 'charger' },
  { slug: 'cases',             name: 'כיסויים',     type: 'case' },
  { slug: 'screen-protectors', name: 'מגני מסך',    type: 'screen_protector' },
  { slug: 'sim-cards',         name: 'כרטיסי SIM',  type: 'sim' },
  { slug: 'accessories',       name: 'אביזרים',     type: 'accessory' },
  { slug: 'repair-parts',      name: 'חלקי תיקון',  type: 'repair_part' },
];

// Products: [sku, categorySlug, brand, name, model, purchasePrice, salePrice, storageGB?, color?]
const PRODUCTS_RAW = [
  // ── iPhones ──────────────────────────────────────────────────────────────
  ['IP12-128-BLK',  'smartphones', 'Apple', 'אייפון 12 128GB שחור',     'iPhone 12',   680,  1099, 128, 'שחור'],
  ['IP12-128-WHT',  'smartphones', 'Apple', 'אייפון 12 128GB לבן',      'iPhone 12',   680,  1099, 128, 'לבן'],
  ['IP13-128-BLK',  'smartphones', 'Apple', 'אייפון 13 128GB שחור',     'iPhone 13',   950,  1549, 128, 'שחור'],
  ['IP13-128-PNK',  'smartphones', 'Apple', 'אייפון 13 128GB ורוד',     'iPhone 13',   950,  1549, 128, 'ורוד'],
  ['IP13-256-BLK',  'smartphones', 'Apple', 'אייפון 13 256GB שחור',     'iPhone 13',  1100,  1799, 256, 'שחור'],
  ['IP14-128-BLK',  'smartphones', 'Apple', 'אייפון 14 128GB שחור',     'iPhone 14',  1350,  2199, 128, 'שחור'],
  ['IP14-128-BLU',  'smartphones', 'Apple', 'אייפון 14 128GB כחול',     'iPhone 14',  1350,  2199, 128, 'כחול'],
  ['IP14-256-BLK',  'smartphones', 'Apple', 'אייפון 14 256GB שחור',     'iPhone 14',  1550,  2499, 256, 'שחור'],
  ['IP15-128-BLK',  'smartphones', 'Apple', 'אייפון 15 128GB שחור',     'iPhone 15',  1850,  2899, 128, 'שחור'],
  ['IP15-128-YLW',  'smartphones', 'Apple', 'אייפון 15 128GB צהוב',     'iPhone 15',  1850,  2899, 128, 'צהוב'],
  ['IP15-256-BLK',  'smartphones', 'Apple', 'אייפון 15 256GB שחור',     'iPhone 15',  2100,  3299, 256, 'שחור'],
  ['IP15P-256-BLK', 'smartphones', 'Apple', 'אייפון 15 Pro 256GB שחור', 'iPhone 15 Pro', 2500, 3899, 256, 'שחור טיטניום'],
  ['IP16-128-BLK',  'smartphones', 'Apple', 'אייפון 16 128GB שחור',     'iPhone 16',  2450,  3799, 128, 'שחור'],
  ['IP16-128-WHT',  'smartphones', 'Apple', 'אייפון 16 128GB לבן',      'iPhone 16',  2450,  3799, 128, 'לבן'],
  ['IP16-256-BLK',  'smartphones', 'Apple', 'אייפון 16 256GB שחור',     'iPhone 16',  2750,  4299, 256, 'שחור'],
  ['IP16P-256-BLK', 'smartphones', 'Apple', 'אייפון 16 Pro 256GB שחור', 'iPhone 16 Pro', 3100, 4799, 256, 'שחור טיטניום'],

  // ── Samsung ───────────────────────────────────────────────────────────────
  ['SS-S22-128-BLK', 'smartphones', 'Samsung', 'סמסונג גלקסי S22 128GB שחור',      'Galaxy S22',     1100, 1799, 128, 'שחור'],
  ['SS-S23-128-CRM', 'smartphones', 'Samsung', 'סמסונג גלקסי S23 128GB קרם',       'Galaxy S23',     1550, 2499, 128, 'קרם'],
  ['SS-S23-256-BLK', 'smartphones', 'Samsung', 'סמסונג גלקסי S23 256GB שחור',      'Galaxy S23',     1750, 2799, 256, 'שחור'],
  ['SS-S24-128-BLK', 'smartphones', 'Samsung', 'סמסונג גלקסי S24 128GB שחור',      'Galaxy S24',     2100, 3299, 128, 'שחור'],
  ['SS-S24-256-VIO', 'smartphones', 'Samsung', 'סמסונג גלקסי S24 256GB סגול',      'Galaxy S24',     2350, 3699, 256, 'סגול'],
  ['SS-S24U-256-BLK','smartphones', 'Samsung', 'סמסונג גלקסי S24 Ultra 256GB שחור','Galaxy S24 Ultra',2900, 4499, 256, 'שחור'],
  ['SS-A35-128-BLK', 'smartphones', 'Samsung', 'סמסונג גלקסי A35 128GB שחור',      'Galaxy A35',      780, 1249, 128, 'שחור'],
  ['SS-A35-256-BLU', 'smartphones', 'Samsung', 'סמסונג גלקסי A35 256GB כחול',      'Galaxy A35',      900, 1449, 256, 'כחול'],
  ['SS-A55-128-BLK', 'smartphones', 'Samsung', 'סמסונג גלקסי A55 128GB שחור',      'Galaxy A55',      950, 1499, 128, 'שחור'],
  ['SS-ZF5-256-BLK', 'smartphones', 'Samsung', 'סמסונג גלקסי Z Fold5 256GB שחור',  'Galaxy Z Fold5', 3200, 4999, 256, 'שחור'],
  ['SS-ZF5-512-CRM', 'smartphones', 'Samsung', 'סמסונג גלקסי Z Fold5 512GB קרם',   'Galaxy Z Fold5', 3600, 5599, 512, 'קרם'],

  // ── Xiaomi ────────────────────────────────────────────────────────────────
  ['XM14-256-BLK',   'smartphones', 'Xiaomi', 'שיאומי 14 256GB שחור',         'Xiaomi 14',          1750, 2749, 256, 'שחור'],
  ['XM14-512-WHT',   'smartphones', 'Xiaomi', 'שיאומי 14 512GB לבן',          'Xiaomi 14',          2000, 3149, 512, 'לבן'],
  ['RN13-128-BLK',   'smartphones', 'Xiaomi', 'שיאומי Redmi Note 13 128GB שחור','Redmi Note 13',     480,   799, 128, 'שחור'],
  ['RN13P-256-BLU',  'smartphones', 'Xiaomi', 'שיאומי Redmi Note 13 Pro 256GB כחול','Redmi Note 13 Pro',720, 1149, 256, 'כחול'],

  // ── Google Pixel ──────────────────────────────────────────────────────────
  ['GP8-128-OBS',    'smartphones', 'Google', 'גוגל פיקסל 8 128GB שחור',      'Pixel 8',            1550, 2449, 128, 'שחור'],
  ['GP8A-128-BLK',   'smartphones', 'Google', 'גוגל פיקסל 8a 128GB שחור',     'Pixel 8a',           1200, 1899, 128, 'שחור'],

  // ── OnePlus ───────────────────────────────────────────────────────────────
  ['OP12-256-BLK',   'smartphones', 'OnePlus', 'וואן פלוס 12 256GB שחור',     'OnePlus 12',         1700, 2699, 256, 'שחור'],

  // ── Tablets ───────────────────────────────────────────────────────────────
  ['IPAD10-64-BLU',  'tablets', 'Apple',   'אייפד דור 10 64GB כחול',          'iPad 10th Gen',      1100, 1749,  64, 'כחול'],
  ['IPAD10-256-SLV', 'tablets', 'Apple',   'אייפד דור 10 256GB כסף',          'iPad 10th Gen',      1450, 2299, 256, 'כסף'],
  ['IPADAIR-256-BLU','tablets', 'Apple',   'אייפד אייר M2 256GB כחול',        'iPad Air M2',        1900, 2999, 256, 'כחול'],
  ['IPADPRO-256-SLV','tablets', 'Apple',   'אייפד פרו 11" M4 256GB כסף',      'iPad Pro 11" M4',    2800, 4399, 256, 'כסף'],
  ['SS-TABA9-64-GRY','tablets', 'Samsung', 'סמסונג גלקסי Tab A9 64GB אפור',   'Galaxy Tab A9',       550,  899,  64, 'אפור'],
  ['XM-PAD6-128-GRY','tablets', 'Xiaomi',  'שיאומי Pad 6 128GB אפור',         'Xiaomi Pad 6',        650, 1049, 128, 'אפור'],

  // ── Chargers ──────────────────────────────────────────────────────────────
  ['CHR-APPLE-20W',  'chargers', 'Apple',   'מטען Apple USB-C 20W',            'USB-C 20W',           50,   99],
  ['CHR-APPLE-30W',  'chargers', 'Apple',   'מטען Apple USB-C 30W',            'USB-C 30W',           70,  139],
  ['CHR-SAMSUNG-25W','chargers', 'Samsung', 'מטען Samsung Super Fast Charging 25W','Super Fast 25W',  40,   79],
  ['CHR-SAMSUNG-45W','chargers', 'Samsung', 'מטען Samsung Super Fast Charging 45W','Super Fast 45W',  60,  119],
  ['CHR-USBC-65W',   'chargers', 'Generic', 'מטען GaN USB-C 65W',              'GaN 65W',             65,  129],
  ['CBL-USBC-1M',    'chargers', 'Generic', 'כבל USB-C ל-USB-C 1 מטר',        'USB-C Cable 1m',      12,   49],
  ['CBL-USBC-2M',    'chargers', 'Generic', 'כבל USB-C ל-USB-C 2 מטר',        'USB-C Cable 2m',      18,   69],
  ['CBL-LTNG-1M',    'chargers', 'Apple',   'כבל Lightning ל-USB-C 1 מטר',    'Lightning 1m',        25,   79],
  ['CBL-MSAFE-1M',   'chargers', 'Apple',   'כבל MagSafe 1 מטר',              'MagSafe 1m',          55,  129],

  // ── Power banks (accessories) ─────────────────────────────────────────────
  ['PB-10K-BLK',    'accessories', 'Anker',   'בנק מתח Anker 10,000mAh שחור', 'PowerCore 10K',       65,  149],
  ['PB-20K-BLK',    'accessories', 'Anker',   'בנק מתח Anker 20,000mAh שחור', 'PowerCore 20K',      110,  249],
  ['PB-10K-WHT',    'accessories', 'Generic', 'בנק מתח 10,000mAh לבן',        'Power Bank 10K',      40,   99],

  // ── Earphones ─────────────────────────────────────────────────────────────
  ['AP-PRO2-WHT',   'accessories', 'Apple',   'אייפודס פרו דור 2 לבן',        'AirPods Pro 2',      850, 1499],
  ['AP-3-WHT',      'accessories', 'Apple',   'אייפודס דור 3 לבן',            'AirPods 3rd Gen',    550,  999],
  ['SS-BUDS2PRO-BLK','accessories','Samsung', 'גלקסי באדס2 פרו שחור',         'Galaxy Buds2 Pro',   450,  849],

  // ── Cases ─────────────────────────────────────────────────────────────────
  ['CASE-IP16-CLR',  'cases', 'Generic', 'כיסוי שקוף אייפון 16',           'iPhone 16 Clear Case',   15,   49],
  ['CASE-IP16-BLK',  'cases', 'Generic', 'כיסוי שחור מחוזק אייפון 16',     'iPhone 16 Black Case',   20,   59],
  ['CASE-IP15-CLR',  'cases', 'Generic', 'כיסוי שקוף אייפון 15',           'iPhone 15 Clear Case',   12,   45],
  ['CASE-SS24-BLK',  'cases', 'Generic', 'כיסוי שחור Samsung S24',          'Galaxy S24 Black Case',  18,   55],
  ['CASE-SS24-CLR',  'cases', 'Generic', 'כיסוי שקוף Samsung S24',          'Galaxy S24 Clear Case',  14,   49],

  // ── Screen protectors ─────────────────────────────────────────────────────
  ['SP-IP16-PRIV',  'screen-protectors', 'Generic', 'מגן מסך Privacy זכוכית אייפון 16',   'iPhone 16 Privacy',   25,   69],
  ['SP-IP16-STD',   'screen-protectors', 'Generic', 'מגן מסך זכוכית אייפון 16',           'iPhone 16 Glass',     15,   49],
  ['SP-IP15-STD',   'screen-protectors', 'Generic', 'מגן מסך זכוכית אייפון 15',           'iPhone 15 Glass',     13,   45],
  ['SP-SS24-STD',   'screen-protectors', 'Generic', 'מגן מסך זכוכית Samsung S24',          'Galaxy S24 Glass',    15,   49],

  // ── SIM cards ─────────────────────────────────────────────────────────────
  ['SIM-CELLCOM',   'sim-cards', 'Cellcom', 'כרטיס SIM סלקום',  'SIM Standard',  5,  29],
  ['SIM-HOT',       'sim-cards', 'Hot Mobile', 'כרטיס SIM הוט מובייל', 'SIM Standard', 5, 29],
  ['SIM-PARTNER',   'sim-cards', 'Partner',    'כרטיס SIM פרטנר',     'SIM Standard',  5, 29],
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Connecting to Atlas…');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  // 1. Upsert categories and build slug→_id map
  const catMap = {};
  for (const cat of CATEGORIES) {
    const doc = await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $set: { name: cat.name, type: cat.type, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    catMap[cat.slug] = doc._id;
    console.log(`  category: ${cat.slug} → ${doc._id}`);
  }

  // 2. Upsert products
  let inserted = 0; let updated = 0;
  for (const row of PRODUCTS_RAW) {
    const [sku, catSlug, brand, name, model, purchasePrice, salePrice, storageGB, color] = row;
    const categoryId = catMap[catSlug];
    if (!categoryId) { console.warn(`  SKIP ${sku}: unknown category ${catSlug}`); continue; }

    const payload = { brand, name, model, purchasePrice, salePrice, categoryId, isActive: true };
    if (storageGB) payload.storageGB = storageGB;
    if (color)     payload.color = color;

    const res = await Product.updateOne(
      { sku: sku.toUpperCase() },
      { $set: payload, $setOnInsert: { sku: sku.toUpperCase(), totalStock: 0 } },
      { upsert: true },
    );
    if (res.upsertedCount) { inserted++; console.log(`  + ${sku}`); }
    else                   { updated++;  console.log(`  ~ ${sku}`); }
  }

  console.log(`\nDone. Inserted: ${inserted}  Updated: ${updated}`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
