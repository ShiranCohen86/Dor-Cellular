/**
 * Database seeding script.
 *
 * Two usages:
 *   1) From the CLI:                   `npm run seed`
 *   2) Programmatically from server:   `require('./seed/seed').seedIfEmpty()`
 *
 * Creates: 2 branches, 5 users, 9 categories, 4 suppliers, 15 products,
 * 10 customers, ~31 orders, 20 repairs, 6 purchase orders,
 * ~20 stock movements, 11 notifications, and 25 audit log entries.
 */
/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../src/config/env');
const {
  User, Branch, Category, Product, Customer, Supplier,
  Order, Repair, PurchaseOrder, StockMovement, Notification, AuditLog,
} = require('../src/models');

/** Returns a Date that is `n` days + `h` hours in the past (negative h = further back). */
const daysAgo = (n, hOffset = 0) =>
  new Date(Date.now() - n * 86400000 - hOffset * 3600000);

/**
 * Compute order totals from raw items and payments.
 * lineTotal = unitPrice * quantity - perItemDiscount  (VAT-inclusive)
 */
function calcOrder(rawItems, payments = [], discType = 'none', discVal = 0) {
  const items = rawItems.map((it) => ({
    ...it,
    taxRate: it.taxRate ?? 17,
    lineTotal: parseFloat(
      (it.unitPrice * it.quantity - (it.discount || 0)).toFixed(2),
    ),
  }));
  const subtotal = parseFloat(
    items.reduce((s, it) => s + it.lineTotal, 0).toFixed(2),
  );
  const taxAmount = parseFloat(
    items
      .reduce((s, it) => s + (it.lineTotal * it.taxRate) / (100 + it.taxRate), 0)
      .toFixed(2),
  );
  let discountAmount = 0;
  if (discType === 'fixed') discountAmount = discVal;
  else if (discType === 'percent')
    discountAmount = parseFloat((subtotal * discVal / 100).toFixed(2));
  const total = parseFloat((subtotal - discountAmount).toFixed(2));
  const paidAmount = parseFloat(
    payments.reduce((s, p) => s + p.amount, 0).toFixed(2),
  );
  const balanceDue = parseFloat((total - paidAmount).toFixed(2));
  return { items, subtotal, taxAmount, discountAmount, total, paidAmount, balanceDue };
}

/** Removes every record from all seedable collections. */
async function clearAll() {
  await Promise.all([
    User.deleteMany({}),
    Branch.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Customer.deleteMany({}),
    Supplier.deleteMany({}),
    Order.deleteMany({}),
    Repair.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    StockMovement.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
}

/**
 * Populates the DB with realistic demo data.
 * @param {Object}  [opts]
 * @param {boolean} [opts.clearFirst=true]
 */
async function runSeed({ clearFirst = true } = {}) {
  if (clearFirst) await clearAll();

  // -----------------------------------------------------------------------
  // Branches
  // -----------------------------------------------------------------------
  const [tlvBranch, hfaBranch] = await Branch.create([
    { name: 'Tel Aviv Main', code: 'TLV', city: 'Tel Aviv', phone: '03-5550001' },
    { name: 'Haifa Center',  code: 'HFA', city: 'Haifa',    phone: '04-5550002' },
  ]);

  // -----------------------------------------------------------------------
  // Users
  // -----------------------------------------------------------------------
  const userSpecs = [
    { name: 'Admin Dor',        email: 'admin@dor-store.test',   password: 'admin1234',   role: 'admin',       branchId: tlvBranch._id },
    { name: 'Manager Maya',     email: 'manager@dor-store.test', password: 'manager1234', role: 'manager',     branchId: tlvBranch._id },
    { name: 'Salesperson Sam',  email: 'sales@dor-store.test',   password: 'sales1234',   role: 'salesperson', branchId: tlvBranch._id },
    { name: 'Technician Tomer', email: 'tech@dor-store.test',    password: 'tech1234',    role: 'technician',  branchId: tlvBranch._id },
    { name: 'Salesperson Hila', email: 'hila@dor-store.test',    password: 'sales1234',   role: 'salesperson', branchId: hfaBranch._id },
  ];
  const savedUsers = [];
  for (const spec of userSpecs) {
    const user = new User({
      name: spec.name, email: spec.email, role: spec.role,
      branchId: spec.branchId, phone: '050-1234567',
    });
    await user.setPassword(spec.password);
    await user.save();
    savedUsers.push(user);
  }
  const [admin, manager, salesSam, techTomer, salesHila] = savedUsers;

  // -----------------------------------------------------------------------
  // Categories
  // -----------------------------------------------------------------------
  const categoriesCreated = await Category.create([
    { name: 'Smartphones',       slug: 'smartphones',       type: 'smartphone' },
    { name: 'Tablets',           slug: 'tablets',           type: 'tablet' },
    { name: 'Chargers',          slug: 'chargers',          type: 'charger' },
    { name: 'Cases',             slug: 'cases',             type: 'case' },
    { name: 'Screen Protectors', slug: 'screen-protectors', type: 'screen_protector' },
    { name: 'SIM Cards',         slug: 'sim',               type: 'sim' },
    { name: 'eSIM',              slug: 'esim',              type: 'esim' },
    { name: 'Repair Parts',      slug: 'repair-parts',      type: 'repair_part' },
    { name: 'Accessories',       slug: 'accessories',       type: 'accessory' },
  ]);
  const catBySlug = Object.fromEntries(categoriesCreated.map((c) => [c.slug, c]));

  // -----------------------------------------------------------------------
  // Suppliers
  // -----------------------------------------------------------------------
  const suppliersCreated = await Supplier.create([
    { name: 'Apple IL',       contactPerson: 'Yossi Levy',  email: 'apple@supplier.test',   phone: '03-1112222', paymentTerms: 'Net 30' },
    { name: 'Samsung IL',     contactPerson: 'Ronit Cohen', email: 'samsung@supplier.test', phone: '03-3334444', paymentTerms: 'Net 30' },
    { name: 'Xiaomi IL',      contactPerson: 'Daniel Mor',  email: 'xiaomi@supplier.test',  phone: '03-5556666', paymentTerms: 'Net 45' },
    { name: 'AccessoriesPro', contactPerson: 'Tal R.',      email: 'access@supplier.test',  phone: '03-7778888', paymentTerms: 'Net 14' },
  ]);
  const supByName = Object.fromEntries(suppliersCreated.map((s) => [s.name, s]));

  // -----------------------------------------------------------------------
  // Products
  // -----------------------------------------------------------------------
  const dist = (qty) => ({
    [String(tlvBranch._id)]: qty,
    [String(hfaBranch._id)]: Math.floor(qty / 2),
  });

  const productSpecs = [
    { sku: 'IP15PRO-256-BLK', barcode: '194253433345', imei: '350123451234567',
      name: 'iPhone 15 Pro 256GB Black', brand: 'Apple', model: '15 Pro',
      categoryId: catBySlug['smartphones']._id, supplierId: supByName['Apple IL']._id,
      purchasePrice: 3400, salePrice: 4490, color: 'Black', storageGB: 256, ramGB: 8, warrantyMonths: 12,
      minStockAlert: 3, isTrackedBySerial: true, stockByBranch: dist(8) },
    { sku: 'IP15-128-BLU', barcode: '194253433346',
      name: 'iPhone 15 128GB Blue', brand: 'Apple', model: '15',
      categoryId: catBySlug['smartphones']._id, supplierId: supByName['Apple IL']._id,
      purchasePrice: 2800, salePrice: 3690, color: 'Blue', storageGB: 128, ramGB: 6, warrantyMonths: 12,
      minStockAlert: 3, isTrackedBySerial: true, stockByBranch: dist(12) },
    { sku: 'GS24U-512-TIT', barcode: '887276765432',
      name: 'Galaxy S24 Ultra 512GB Titanium', brand: 'Samsung', model: 'S24 Ultra',
      categoryId: catBySlug['smartphones']._id, supplierId: supByName['Samsung IL']._id,
      purchasePrice: 3300, salePrice: 4290, color: 'Titanium', storageGB: 512, ramGB: 12, warrantyMonths: 12,
      minStockAlert: 3, isTrackedBySerial: true, stockByBranch: dist(6) },
    { sku: 'GA15-128-BLK', barcode: '887276765433',
      name: 'Galaxy A15 128GB Black', brand: 'Samsung', model: 'A15',
      categoryId: catBySlug['smartphones']._id, supplierId: supByName['Samsung IL']._id,
      purchasePrice: 500, salePrice: 799, color: 'Black', storageGB: 128, ramGB: 4, warrantyMonths: 12,
      minStockAlert: 5, isTrackedBySerial: false, stockByBranch: dist(20) },
    { sku: 'REDMI13-256-GRN',
      name: 'Redmi Note 13 256GB Green', brand: 'Xiaomi', model: 'Note 13',
      categoryId: catBySlug['smartphones']._id, supplierId: supByName['Xiaomi IL']._id,
      purchasePrice: 600, salePrice: 1099, color: 'Green', storageGB: 256, ramGB: 8, warrantyMonths: 12,
      minStockAlert: 5, stockByBranch: dist(15) },
    { sku: 'IPAD-AIR-256',
      name: 'iPad Air 11" 256GB', brand: 'Apple', model: 'Air',
      categoryId: catBySlug['tablets']._id, supplierId: supByName['Apple IL']._id,
      purchasePrice: 2500, salePrice: 3290, storageGB: 256, warrantyMonths: 12,
      minStockAlert: 2, stockByBranch: dist(4) },
    { sku: 'CHRG-USBC-20W',
      name: 'USB-C 20W Charger', brand: 'Apple',
      categoryId: catBySlug['chargers']._id, supplierId: supByName['Apple IL']._id,
      purchasePrice: 50, salePrice: 99, warrantyMonths: 12,
      minStockAlert: 10, stockByBranch: dist(50) },
    { sku: 'CASE-IP15PRO-CLR',
      name: 'iPhone 15 Pro Clear Case', brand: 'AccessoriesPro',
      categoryId: catBySlug['cases']._id, supplierId: supByName['AccessoriesPro']._id,
      purchasePrice: 15, salePrice: 49, minStockAlert: 10, stockByBranch: dist(40) },
    { sku: 'CASE-GS24U-LTR',
      name: 'Galaxy S24 Ultra Leather Case', brand: 'AccessoriesPro',
      categoryId: catBySlug['cases']._id, supplierId: supByName['AccessoriesPro']._id,
      purchasePrice: 25, salePrice: 89, minStockAlert: 10, stockByBranch: dist(30) },
    { sku: 'SP-GLS-IP15',
      name: 'Tempered Glass Screen Protector iPhone 15', brand: 'AccessoriesPro',
      categoryId: catBySlug['screen-protectors']._id, supplierId: supByName['AccessoriesPro']._id,
      purchasePrice: 10, salePrice: 39, minStockAlert: 20, stockByBranch: dist(80) },
    { sku: 'SIM-CELLCOM',
      name: 'Cellcom SIM Card', brand: 'Cellcom',
      categoryId: catBySlug['sim']._id,
      purchasePrice: 5, salePrice: 29, minStockAlert: 25, stockByBranch: dist(100) },
    { sku: 'ESIM-PARTNER',
      name: 'Partner eSIM Voucher', brand: 'Partner',
      categoryId: catBySlug['esim']._id,
      purchasePrice: 10, salePrice: 49, minStockAlert: 25, stockByBranch: dist(50) },
    { sku: 'PART-IP14-BATT',
      name: 'iPhone 14 Battery (replacement)', brand: 'Apple',
      categoryId: catBySlug['repair-parts']._id, supplierId: supByName['Apple IL']._id,
      purchasePrice: 90, salePrice: 249, minStockAlert: 8, stockByBranch: dist(15) },
    { sku: 'PART-GS22-SCRN',
      name: 'Galaxy S22 Screen (replacement)', brand: 'Samsung',
      categoryId: catBySlug['repair-parts']._id, supplierId: supByName['Samsung IL']._id,
      purchasePrice: 280, salePrice: 599, minStockAlert: 4, stockByBranch: dist(7) },
    // Intentionally low-stock to demo the low-stock alert.
    { sku: 'POWERBANK-20K',
      name: '20,000mAh Powerbank', brand: 'AccessoriesPro',
      categoryId: catBySlug['accessories']._id, supplierId: supByName['AccessoriesPro']._id,
      purchasePrice: 60, salePrice: 149, minStockAlert: 10,
      stockByBranch: { [String(tlvBranch._id)]: 2 } },
  ];
  const savedProducts = [];
  for (const spec of productSpecs) {
    const p = new Product(spec);
    p.recomputeTotalStock();
    await p.save();
    savedProducts.push(p);
  }
  const [
    ip15Pro, ip15, gs24u, ga15, redmi13, ipadAir,
    charger, caseIp15, caseGs24u, spIp15,
    simCellcom, esimPartner, battIp14, scrnGs22, powerbank,
  ] = savedProducts;

  // -----------------------------------------------------------------------
  // Customers (10 Hebrew names)
  // -----------------------------------------------------------------------
  const customersCreated = await Customer.create([
    { name: 'אבי כהן',       phone: '050-1111111', email: 'avi@example.com',    isVip: true, marketingConsent: true, birthday: new Date('1985-06-12'), loyaltyPoints: 340 },
    { name: 'נועה לוי',      phone: '052-2222222', email: 'noa@example.com',                 marketingConsent: true, birthday: new Date('1992-03-04'), loyaltyPoints: 120 },
    { name: 'דוד מזרחי',     phone: '054-3333333', email: 'david@example.com',  outstandingDebt: 350 },
    { name: 'שרה פרידמן',    phone: '058-4444444', isVip: true, loyaltyPoints: 920 },
    { name: 'יוסי פרץ',      phone: '050-5555555', email: 'yossi@example.com',  marketingConsent: true },
    { name: 'לימור גולדברג', phone: '052-6666666', email: 'limor@example.com',  isVip: true, loyaltyPoints: 180 },
    { name: 'משה אבוטבול',   phone: '054-7777777', email: 'moshe@example.com',  outstandingDebt: 799 },
    { name: 'תמר בן-דוד',   phone: '056-8888888', email: 'tamar@example.com' },
    { name: 'אלי שמר',       phone: '050-9999999', email: 'eli@example.com' },
    { name: 'רחל כץ',        phone: '052-0000000', email: 'rachel@example.com', loyaltyPoints: 30 },
  ]);
  const [
    cstAvi, cstNoa, cstDavid, cstSara, cstYossi,
    cstLimor, cstMoshe, cstTamar, cstEli, cstRachel,
  ] = customersCreated;

  // -----------------------------------------------------------------------
  // Orders (~31 orders, last 90 days)
  // -----------------------------------------------------------------------
  let invSeq = 1000;
  const mkInvNum = (dAgo) => {
    const d = daysAgo(dAgo);
    return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${++invSeq}`;
  };

  const mkOrder = (dAgo, customer, salesperson, branch, rawItems, payments, opts = {}) => {
    const { discType = 'none', discVal = 0, status = 'completed', notes } = opts;
    const calc = calcOrder(rawItems, payments, discType, discVal);
    return {
      invoiceNumber: mkInvNum(dAgo),
      branchId: branch._id,
      customerId: customer._id,
      salespersonId: salesperson._id,
      ...calc,
      discountType: discType,
      discountValue: discVal,
      status,
      notes,
      createdAt: daysAgo(dAgo, 2),
      updatedAt: daysAgo(dAgo, 1),
    };
  };

  const orderDocs = [];

  // --- 90–60 days ago ---
  orderDocs.push(mkOrder(87, cstAvi, salesSam, tlvBranch,
    [{ productId: ip15Pro._id, name: ip15Pro.name, sku: ip15Pro.sku, quantity: 1, unitPrice: 4490, warrantyMonths: 12 }],
    [{ method: 'credit_card', amount: 4490, paidAt: daysAgo(87) }]));

  orderDocs.push(mkOrder(85, cstNoa, salesSam, tlvBranch,
    [{ productId: ip15._id,    name: ip15.name,    sku: ip15.sku,    quantity: 1, unitPrice: 3690, warrantyMonths: 12 },
     { productId: caseIp15._id, name: caseIp15.name, sku: caseIp15.sku, quantity: 1, unitPrice: 49 }],
    [{ method: 'cash', amount: 3739, paidAt: daysAgo(85) }]));

  orderDocs.push(mkOrder(82, cstDavid, salesSam, tlvBranch,
    [{ productId: gs24u._id, name: gs24u.name, sku: gs24u.sku, quantity: 1, unitPrice: 4290, warrantyMonths: 12 }],
    [{ method: 'credit_card', amount: 3940, paidAt: daysAgo(82) }],
    { notes: 'שילם חלק, יתרה 350 ₪' }));

  orderDocs.push(mkOrder(80, cstSara, salesHila, hfaBranch,
    [{ productId: ipadAir._id, name: ipadAir.name, sku: ipadAir.sku, quantity: 1, unitPrice: 3290, warrantyMonths: 12 }],
    [{ method: 'bit', amount: 3125, paidAt: daysAgo(80) }],
    { discType: 'percent', discVal: 5 }));

  orderDocs.push(mkOrder(76, cstYossi, salesSam, tlvBranch,
    [{ productId: ga15._id,   name: ga15.name,   sku: ga15.sku,   quantity: 1, unitPrice: 799, warrantyMonths: 12 },
     { productId: spIp15._id, name: spIp15.name, sku: spIp15.sku, quantity: 1, unitPrice: 39 }],
    [{ method: 'cash', amount: 838, paidAt: daysAgo(76) }]));

  orderDocs.push(mkOrder(72, cstLimor, salesHila, hfaBranch,
    [{ productId: ip15Pro._id, name: ip15Pro.name, sku: ip15Pro.sku, quantity: 1, unitPrice: 4490, warrantyMonths: 12 }],
    [{ method: 'installments', amount: 4290, installments: 12, paidAt: daysAgo(72) }],
    { discType: 'fixed', discVal: 200 }));

  // Draft order
  orderDocs.push(mkOrder(68, cstMoshe, salesSam, tlvBranch,
    [{ productId: redmi13._id, name: redmi13.name, sku: redmi13.sku, quantity: 1, unitPrice: 1099 }],
    [],
    { status: 'draft', notes: 'ממתין לאישור לקוח' }));

  orderDocs.push(mkOrder(65, cstAvi, salesSam, tlvBranch,
    [{ productId: charger._id,  name: charger.name,  sku: charger.sku,  quantity: 2, unitPrice: 99 },
     { productId: caseIp15._id, name: caseIp15.name, sku: caseIp15.sku, quantity: 1, unitPrice: 49 }],
    [{ method: 'cash', amount: 247, paidAt: daysAgo(65) }]));

  orderDocs.push(mkOrder(62, cstTamar, salesSam, tlvBranch,
    [{ productId: ip15._id, name: ip15.name, sku: ip15.sku, quantity: 1, unitPrice: 3690, warrantyMonths: 12 }],
    [{ method: 'credit_card', amount: 3690, paidAt: daysAgo(62) }]));

  // --- 60–30 days ago ---
  orderDocs.push(mkOrder(58, cstEli, salesHila, hfaBranch,
    [{ productId: ga15._id, name: ga15.name, sku: ga15.sku, quantity: 2, unitPrice: 799, warrantyMonths: 12 }],
    [{ method: 'bit', amount: 1598, paidAt: daysAgo(58) }]));

  orderDocs.push(mkOrder(55, cstRachel, salesSam, tlvBranch,
    [{ productId: simCellcom._id,  name: simCellcom.name,  sku: simCellcom.sku,  quantity: 1, unitPrice: 29 },
     { productId: esimPartner._id, name: esimPartner.name, sku: esimPartner.sku, quantity: 1, unitPrice: 49 }],
    [{ method: 'cash', amount: 78, paidAt: daysAgo(55) }]));

  orderDocs.push(mkOrder(52, cstNoa, salesSam, tlvBranch,
    [{ productId: caseGs24u._id, name: caseGs24u.name, sku: caseGs24u.sku, quantity: 1, unitPrice: 89 }],
    [{ method: 'cash', amount: 89, paidAt: daysAgo(52) }]));

  orderDocs.push(mkOrder(48, cstDavid, salesHila, hfaBranch,
    [{ productId: gs24u._id, name: gs24u.name, sku: gs24u.sku, quantity: 1, unitPrice: 4290, warrantyMonths: 12 }],
    [{ method: 'credit_card', amount: 4290, paidAt: daysAgo(48) }]));

  // Refunded
  const refCalc = calcOrder(
    [{ productId: ip15._id, name: ip15.name, sku: ip15.sku, quantity: 1, unitPrice: 3690, taxRate: 17 }],
    [{ method: 'credit_card', amount: 3690 }],
  );
  orderDocs.push({
    invoiceNumber: mkInvNum(45),
    branchId: tlvBranch._id, customerId: cstYossi._id, salespersonId: salesSam._id,
    ...refCalc,
    discountType: 'none', discountValue: 0,
    status: 'refunded', refundedAmount: 3690,
    refundReason: 'לקוח לא מרוצה מהמוצר', refundedAt: daysAgo(43),
    createdAt: daysAgo(45, 2), updatedAt: daysAgo(43),
  });

  orderDocs.push(mkOrder(42, cstAvi, salesSam, tlvBranch,
    [{ productId: ipadAir._id, name: ipadAir.name, sku: ipadAir.sku, quantity: 1, unitPrice: 3290, warrantyMonths: 12 }],
    [{ method: 'installments', amount: 2961, installments: 12, paidAt: daysAgo(42) }],
    { discType: 'percent', discVal: 10 }));

  orderDocs.push(mkOrder(38, cstLimor, salesHila, hfaBranch,
    [{ productId: redmi13._id, name: redmi13.name, sku: redmi13.sku, quantity: 1, unitPrice: 1099, warrantyMonths: 12 },
     { productId: spIp15._id,  name: spIp15.name,  sku: spIp15.sku,  quantity: 1, unitPrice: 39 }],
    [{ method: 'credit_card', amount: 1138, paidAt: daysAgo(38) }]));

  orderDocs.push(mkOrder(35, cstSara, salesSam, tlvBranch,
    [{ productId: ip15Pro._id,  name: ip15Pro.name,  sku: ip15Pro.sku,  quantity: 1, unitPrice: 4490, warrantyMonths: 12 },
     { productId: caseIp15._id, name: caseIp15.name, sku: caseIp15.sku, quantity: 1, unitPrice: 49 },
     { productId: charger._id,  name: charger.name,  sku: charger.sku,  quantity: 1, unitPrice: 99 }],
    [{ method: 'store_credit', amount: 4638, paidAt: daysAgo(35) }]));

  // Cancelled
  const cancelCalc = calcOrder(
    [{ productId: powerbank._id, name: powerbank.name, sku: powerbank.sku, quantity: 1, unitPrice: 149, taxRate: 17 }],
    [],
  );
  orderDocs.push({
    invoiceNumber: mkInvNum(33),
    branchId: tlvBranch._id, customerId: cstMoshe._id, salespersonId: salesSam._id,
    ...cancelCalc,
    discountType: 'none', discountValue: 0,
    status: 'cancelled', notes: 'הזמנה בוטלה על ידי הלקוח',
    createdAt: daysAgo(33, 2), updatedAt: daysAgo(33),
  });

  orderDocs.push(mkOrder(30, cstTamar, salesSam, tlvBranch,
    [{ productId: ga15._id, name: ga15.name, sku: ga15.sku, quantity: 1, unitPrice: 799, warrantyMonths: 12 }],
    [{ method: 'cash', amount: 799, paidAt: daysAgo(30) }]));

  // --- 30–0 days ago ---
  orderDocs.push(mkOrder(27, cstRachel, salesHila, hfaBranch,
    [{ productId: charger._id,   name: charger.name,   sku: charger.sku,   quantity: 1, unitPrice: 99 },
     { productId: caseGs24u._id, name: caseGs24u.name, sku: caseGs24u.sku, quantity: 1, unitPrice: 89 }],
    [{ method: 'bit', amount: 188, paidAt: daysAgo(27) }]));

  orderDocs.push(mkOrder(24, cstEli, salesSam, tlvBranch,
    [{ productId: ip15._id, name: ip15.name, sku: ip15.sku, quantity: 1, unitPrice: 3690, warrantyMonths: 12 }],
    [{ method: 'credit_card', amount: 3690, paidAt: daysAgo(24) }]));

  orderDocs.push(mkOrder(21, cstAvi, salesSam, tlvBranch,
    [{ productId: gs24u._id, name: gs24u.name, sku: gs24u.sku, quantity: 1, unitPrice: 4290, warrantyMonths: 12 }],
    [{ method: 'installments', amount: 4290, installments: 24, paidAt: daysAgo(21) }]));

  orderDocs.push(mkOrder(18, cstNoa, salesHila, hfaBranch,
    [{ productId: esimPartner._id, name: esimPartner.name, sku: esimPartner.sku, quantity: 2, unitPrice: 49 },
     { productId: simCellcom._id,  name: simCellcom.name,  sku: simCellcom.sku,  quantity: 1, unitPrice: 29 }],
    [{ method: 'cash', amount: 127, paidAt: daysAgo(18) }]));

  // Partially refunded
  const partRefCalc = calcOrder(
    [{ productId: gs24u._id,    name: gs24u.name,    sku: gs24u.sku,    quantity: 1, unitPrice: 4290, taxRate: 17, warrantyMonths: 12 },
     { productId: caseGs24u._id, name: caseGs24u.name, sku: caseGs24u.sku, quantity: 1, unitPrice: 89, taxRate: 17 }],
    [{ method: 'credit_card', amount: 4379 }],
  );
  orderDocs.push({
    invoiceNumber: mkInvNum(15),
    branchId: hfaBranch._id, customerId: cstDavid._id, salespersonId: salesHila._id,
    ...partRefCalc,
    discountType: 'none', discountValue: 0,
    status: 'partially_refunded', refundedAmount: 89,
    refundReason: 'הכיסוי היה פגום', refundedAt: daysAgo(13),
    createdAt: daysAgo(15, 2), updatedAt: daysAgo(13),
  });

  orderDocs.push(mkOrder(12, cstSara, salesSam, tlvBranch,
    [{ productId: ip15Pro._id, name: ip15Pro.name, sku: ip15Pro.sku, quantity: 1, unitPrice: 4490, warrantyMonths: 12 }],
    [{ method: 'store_credit', amount: 4490, paidAt: daysAgo(12) }]));

  orderDocs.push(mkOrder(9, cstLimor, salesSam, tlvBranch,
    [{ productId: charger._id, name: charger.name, sku: charger.sku, quantity: 3, unitPrice: 99 }],
    [{ method: 'cash', amount: 297, paidAt: daysAgo(9) }]));

  orderDocs.push(mkOrder(6, cstYossi, salesSam, tlvBranch,
    [{ productId: redmi13._id, name: redmi13.name, sku: redmi13.sku, quantity: 1, unitPrice: 1099, warrantyMonths: 12 },
     { productId: spIp15._id,  name: spIp15.name,  sku: spIp15.sku,  quantity: 1, unitPrice: 39 }],
    [{ method: 'credit_card', amount: 1138, paidAt: daysAgo(6) }]));

  orderDocs.push(mkOrder(4, cstAvi, salesSam, tlvBranch,
    [{ productId: ga15._id, name: ga15.name, sku: ga15.sku, quantity: 1, unitPrice: 799, warrantyMonths: 12 }],
    [{ method: 'bit', amount: 799, paidAt: daysAgo(4) }]));

  orderDocs.push(mkOrder(2, cstTamar, salesHila, hfaBranch,
    [{ productId: ip15._id, name: ip15.name, sku: ip15.sku, quantity: 1, unitPrice: 3690, warrantyMonths: 12 }],
    [{ method: 'credit_card', amount: 3690, paidAt: daysAgo(2) }]));

  orderDocs.push(mkOrder(1, cstNoa, salesSam, tlvBranch,
    [{ productId: ipadAir._id, name: ipadAir.name, sku: ipadAir.sku, quantity: 1, unitPrice: 3290, warrantyMonths: 12 }],
    [{ method: 'installments', amount: 3190, installments: 6, paidAt: daysAgo(1) }],
    { discType: 'fixed', discVal: 100 }));

  // Today's orders
  orderDocs.push(mkOrder(0, cstEli, salesSam, tlvBranch,
    [{ productId: ip15Pro._id, name: ip15Pro.name, sku: ip15Pro.sku, quantity: 1, unitPrice: 4490, warrantyMonths: 12 },
     { productId: charger._id, name: charger.name, sku: charger.sku, quantity: 1, unitPrice: 99 }],
    [{ method: 'credit_card', amount: 4589, paidAt: new Date() }]));

  const savedOrders = await Order.insertMany(orderDocs);

  // -----------------------------------------------------------------------
  // Repairs (20 total across all statuses)
  // -----------------------------------------------------------------------
  let rprSeq = 100;
  const mkRprNum = (dAgo) => {
    const d = daysAgo(dAgo);
    return `RPR-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${++rprSeq}`;
  };

  const repairDocs = [
    // --- DELIVERED (5) ---
    {
      ticketNumber: mkRprNum(80), branchId: tlvBranch._id, customerId: cstAvi._id, technicianId: techTomer._id,
      deviceBrand: 'Apple', deviceModel: 'iPhone 14', imei: '350123451234500', color: 'Space Black',
      accessories: 'מטען מקורי',
      faultDescription: 'מסך שבור לאחר נפילה', diagnosis: 'מסך ראשי ניזוק מנפילה', technicianNotes: 'הוחלף מסך מקורי Apple',
      status: 'delivered',
      history: [
        { status: 'received',   changedBy: salesSam._id,  at: daysAgo(80) },
        { status: 'diagnosed',  changedBy: techTomer._id, at: daysAgo(79) },
        { status: 'in_repair',  changedBy: techTomer._id, at: daysAgo(78) },
        { status: 'ready',      changedBy: techTomer._id, at: daysAgo(77) },
        { status: 'delivered',  changedBy: salesSam._id,  at: daysAgo(75) },
      ],
      estimatedCost: 350, finalCost: 350, partsCost: 200, laborCost: 150, paid: true,
      promisedDate: daysAgo(77), deliveredAt: daysAgo(75),
      createdAt: daysAgo(80), updatedAt: daysAgo(75),
    },
    {
      ticketNumber: mkRprNum(70), branchId: tlvBranch._id, customerId: cstNoa._id, technicianId: techTomer._id,
      deviceBrand: 'Samsung', deviceModel: 'Galaxy S22', color: 'Phantom Black',
      faultDescription: 'לא מטען', diagnosis: 'יציאת טעינה USB-C תקולה', technicianNotes: 'הוחלפה יציאת USB-C',
      status: 'delivered',
      history: [
        { status: 'received',   changedBy: salesSam._id,  at: daysAgo(70) },
        { status: 'diagnosed',  changedBy: techTomer._id, at: daysAgo(69) },
        { status: 'in_repair',  changedBy: techTomer._id, at: daysAgo(68) },
        { status: 'ready',      changedBy: techTomer._id, at: daysAgo(67) },
        { status: 'delivered',  changedBy: salesSam._id,  at: daysAgo(65) },
      ],
      estimatedCost: 180, finalCost: 180, partsCost: 80, laborCost: 100, paid: true,
      promisedDate: daysAgo(67), deliveredAt: daysAgo(65),
      createdAt: daysAgo(70), updatedAt: daysAgo(65),
    },
    {
      ticketNumber: mkRprNum(55), branchId: hfaBranch._id, customerId: cstDavid._id,
      deviceBrand: 'Apple', deviceModel: 'iPhone 13', color: 'Midnight',
      faultDescription: 'מצלמה אחורית לא עובדת', diagnosis: 'מצלמה אחורית תקולה', technicianNotes: 'הוחלפה מצלמה אחורית',
      status: 'delivered',
      history: [
        { status: 'received',         changedBy: salesHila._id, at: daysAgo(55) },
        { status: 'diagnosed',        at: daysAgo(54) },
        { status: 'waiting_for_parts', at: daysAgo(53) },
        { status: 'in_repair',        at: daysAgo(50) },
        { status: 'ready',            at: daysAgo(48) },
        { status: 'delivered',        changedBy: salesHila._id, at: daysAgo(46) },
      ],
      estimatedCost: 400, finalCost: 420, partsCost: 280, laborCost: 140, paid: true,
      promisedDate: daysAgo(50), deliveredAt: daysAgo(46),
      createdAt: daysAgo(55), updatedAt: daysAgo(46),
    },
    {
      ticketNumber: mkRprNum(40), branchId: tlvBranch._id, customerId: cstSara._id, technicianId: techTomer._id,
      deviceBrand: 'Xiaomi', deviceModel: 'Redmi Note 12', color: 'Onyx Black',
      faultDescription: 'טלפון לא נדלק', diagnosis: 'סוללה תקולה', technicianNotes: 'הוחלפה סוללה מקורית',
      status: 'delivered',
      history: [
        { status: 'received',  changedBy: salesSam._id,  at: daysAgo(40) },
        { status: 'diagnosed', changedBy: techTomer._id, at: daysAgo(39) },
        { status: 'in_repair', changedBy: techTomer._id, at: daysAgo(38) },
        { status: 'ready',     changedBy: techTomer._id, at: daysAgo(37) },
        { status: 'delivered', changedBy: salesSam._id,  at: daysAgo(35) },
      ],
      estimatedCost: 250, finalCost: 250, partsCost: 120, laborCost: 130, paid: true,
      promisedDate: daysAgo(38), deliveredAt: daysAgo(35),
      createdAt: daysAgo(40), updatedAt: daysAgo(35),
    },
    {
      ticketNumber: mkRprNum(28), branchId: tlvBranch._id, customerId: cstYossi._id, technicianId: techTomer._id,
      deviceBrand: 'Apple', deviceModel: 'iPhone 15', color: 'Pink',
      faultDescription: 'כפתור בית לא מגיב', diagnosis: 'כפתור מכני ניזוק', technicianNotes: 'כפתור תוקן',
      status: 'delivered',
      history: [
        { status: 'received',  changedBy: salesSam._id,  at: daysAgo(28) },
        { status: 'diagnosed', changedBy: techTomer._id, at: daysAgo(27) },
        { status: 'in_repair', changedBy: techTomer._id, at: daysAgo(26) },
        { status: 'ready',     changedBy: techTomer._id, at: daysAgo(25) },
        { status: 'delivered', changedBy: salesSam._id,  at: daysAgo(24) },
      ],
      estimatedCost: 150, finalCost: 150, partsCost: 50, laborCost: 100, paid: true,
      promisedDate: daysAgo(26), deliveredAt: daysAgo(24),
      createdAt: daysAgo(28), updatedAt: daysAgo(24),
    },
    // --- READY FOR PICKUP (4) ---
    {
      ticketNumber: mkRprNum(10), branchId: tlvBranch._id, customerId: cstLimor._id, technicianId: techTomer._id,
      deviceBrand: 'Samsung', deviceModel: 'Galaxy A54', color: 'Awesome White',
      faultDescription: 'מסך לא מגיב למגע', diagnosis: 'ממשק מגע תקול', technicianNotes: 'הוחלף LCD + digitizer',
      status: 'ready',
      history: [
        { status: 'received',  changedBy: salesSam._id,  at: daysAgo(10) },
        { status: 'diagnosed', changedBy: techTomer._id, at: daysAgo(9) },
        { status: 'in_repair', changedBy: techTomer._id, at: daysAgo(8) },
        { status: 'ready',     changedBy: techTomer._id, at: daysAgo(7) },
      ],
      estimatedCost: 300, finalCost: 320, partsCost: 200, laborCost: 120, paid: false,
      promisedDate: daysAgo(7),
      createdAt: daysAgo(10), updatedAt: daysAgo(7),
    },
    {
      ticketNumber: mkRprNum(8), branchId: hfaBranch._id, customerId: cstMoshe._id,
      deviceBrand: 'Apple', deviceModel: 'iPad Air 5', color: 'Blue',
      faultDescription: 'מסך שבור לאחר נפילה', diagnosis: 'זכוכית ראשית נשברה',
      status: 'ready',
      history: [
        { status: 'received',  changedBy: salesHila._id, at: daysAgo(8) },
        { status: 'diagnosed', at: daysAgo(7) },
        { status: 'in_repair', at: daysAgo(6) },
        { status: 'ready',     at: daysAgo(5) },
      ],
      estimatedCost: 650, finalCost: 680, partsCost: 450, laborCost: 230, paid: false,
      promisedDate: daysAgo(5),
      createdAt: daysAgo(8), updatedAt: daysAgo(5),
    },
    {
      ticketNumber: mkRprNum(6), branchId: tlvBranch._id, customerId: cstTamar._id, technicianId: techTomer._id,
      deviceBrand: 'Samsung', deviceModel: 'Galaxy S23', color: 'Cream',
      faultDescription: 'מצלמה קדמית לא עובדת', diagnosis: 'מצלמה קדמית תקולה',
      status: 'ready',
      history: [
        { status: 'received',  changedBy: salesSam._id,  at: daysAgo(6) },
        { status: 'diagnosed', changedBy: techTomer._id, at: daysAgo(5) },
        { status: 'in_repair', changedBy: techTomer._id, at: daysAgo(4) },
        { status: 'ready',     changedBy: techTomer._id, at: daysAgo(3) },
      ],
      estimatedCost: 220, finalCost: 220, partsCost: 120, laborCost: 100, paid: false,
      promisedDate: daysAgo(3),
      createdAt: daysAgo(6), updatedAt: daysAgo(3),
    },
    {
      ticketNumber: mkRprNum(5), branchId: tlvBranch._id, customerId: cstEli._id, technicianId: techTomer._id,
      deviceBrand: 'Apple', deviceModel: 'iPhone 14 Pro', color: 'Deep Purple',
      faultDescription: 'רמקול תחתון לא עובד', diagnosis: 'רמקול תחתון תקול',
      status: 'ready',
      history: [
        { status: 'received',  changedBy: salesSam._id,  at: daysAgo(5) },
        { status: 'diagnosed', changedBy: techTomer._id, at: daysAgo(4) },
        { status: 'in_repair', changedBy: techTomer._id, at: daysAgo(3) },
        { status: 'ready',     changedBy: techTomer._id, at: daysAgo(2) },
      ],
      estimatedCost: 200, finalCost: 200, partsCost: 100, laborCost: 100, paid: false,
      promisedDate: daysAgo(2),
      createdAt: daysAgo(5), updatedAt: daysAgo(2),
    },
    // --- IN REPAIR (4) ---
    {
      ticketNumber: mkRprNum(4), branchId: tlvBranch._id, customerId: cstRachel._id, technicianId: techTomer._id,
      deviceBrand: 'Xiaomi', deviceModel: 'Poco X5 Pro', color: 'Yellow',
      faultDescription: 'טלפון לא נטען', diagnosis: 'יציאת טעינה תקולה',
      status: 'in_repair',
      history: [
        { status: 'received',  changedBy: salesSam._id,  at: daysAgo(4) },
        { status: 'diagnosed', changedBy: techTomer._id, at: daysAgo(3) },
        { status: 'in_repair', changedBy: techTomer._id, at: daysAgo(2) },
      ],
      estimatedCost: 160, partsCost: 60, laborCost: 100,
      promisedDate: daysAgo(-1),
      createdAt: daysAgo(4), updatedAt: daysAgo(2),
    },
    {
      ticketNumber: mkRprNum(3), branchId: hfaBranch._id, customerId: cstNoa._id,
      deviceBrand: 'Samsung', deviceModel: 'Galaxy Z Flip 5', color: 'Graphite',
      faultDescription: 'מסך מתקפל פגום', diagnosis: 'פגיעה מכנית בציר המתקפל',
      status: 'in_repair',
      history: [
        { status: 'received',  changedBy: salesHila._id, at: daysAgo(3) },
        { status: 'diagnosed', at: daysAgo(2) },
        { status: 'in_repair', at: daysAgo(1) },
      ],
      estimatedCost: 800, partsCost: 500, laborCost: 300,
      promisedDate: daysAgo(-3),
      createdAt: daysAgo(3), updatedAt: daysAgo(1),
    },
    {
      ticketNumber: mkRprNum(2), branchId: tlvBranch._id, customerId: cstAvi._id, technicianId: techTomer._id,
      deviceBrand: 'Apple', deviceModel: 'iPhone 15 Pro', color: 'Black Titanium',
      faultDescription: 'כפתורי עוצמת קול לא עובדים', diagnosis: 'כפתורים מכניים ניזוקו',
      status: 'in_repair',
      history: [
        { status: 'received',  changedBy: salesSam._id,  at: daysAgo(2) },
        { status: 'diagnosed', changedBy: techTomer._id, at: daysAgo(1) },
        { status: 'in_repair', changedBy: techTomer._id, at: daysAgo(0) },
      ],
      estimatedCost: 180, partsCost: 80, laborCost: 100,
      promisedDate: daysAgo(-2),
      createdAt: daysAgo(2), updatedAt: daysAgo(0),
    },
    {
      ticketNumber: mkRprNum(2), branchId: tlvBranch._id, customerId: cstDavid._id, technicianId: techTomer._id,
      deviceBrand: 'Samsung', deviceModel: 'Galaxy S24', color: 'Marble Gray',
      faultDescription: 'כיסוי אחורי שבור', diagnosis: 'כיסוי אחורי ניזוק מנפילה',
      status: 'in_repair',
      history: [
        { status: 'received',  changedBy: salesSam._id,  at: daysAgo(2) },
        { status: 'diagnosed', changedBy: techTomer._id, at: daysAgo(1) },
        { status: 'in_repair', changedBy: techTomer._id, at: daysAgo(0) },
      ],
      estimatedCost: 200, partsCost: 100, laborCost: 100,
      promisedDate: daysAgo(-1),
      createdAt: daysAgo(2), updatedAt: daysAgo(0),
    },
    // --- WAITING FOR PARTS (3) ---
    {
      ticketNumber: mkRprNum(7), branchId: tlvBranch._id, customerId: cstLimor._id, technicianId: techTomer._id,
      deviceBrand: 'Apple', deviceModel: 'MacBook Air M2', color: 'Space Gray',
      faultDescription: 'מקלדת לא עובדת', diagnosis: 'ממברנת מקלדת שרופה - ממתין לחלק חלופי',
      status: 'waiting_for_parts',
      history: [
        { status: 'received',         changedBy: salesSam._id,  at: daysAgo(7) },
        { status: 'diagnosed',        changedBy: techTomer._id, at: daysAgo(6) },
        { status: 'waiting_for_parts', changedBy: techTomer._id, at: daysAgo(5) },
      ],
      estimatedCost: 900, partsCost: 700, laborCost: 200,
      createdAt: daysAgo(7), updatedAt: daysAgo(5),
    },
    {
      ticketNumber: mkRprNum(5), branchId: hfaBranch._id, customerId: cstMoshe._id,
      deviceBrand: 'Samsung', deviceModel: 'Galaxy Tab S9', color: 'Beige',
      faultDescription: 'מסך שבור', diagnosis: 'מסך AMOLED ניזוק - ממתין להזמנת חלק',
      status: 'waiting_for_parts',
      history: [
        { status: 'received',          changedBy: salesHila._id, at: daysAgo(5) },
        { status: 'diagnosed',         at: daysAgo(4) },
        { status: 'waiting_for_parts', at: daysAgo(3) },
      ],
      estimatedCost: 750, partsCost: 550, laborCost: 200,
      createdAt: daysAgo(5), updatedAt: daysAgo(3),
    },
    {
      ticketNumber: mkRprNum(9), branchId: tlvBranch._id, customerId: cstEli._id, technicianId: techTomer._id,
      deviceBrand: 'Apple', deviceModel: 'iPhone 12', color: 'Product Red',
      faultDescription: 'כפתורי ווליום שבורים', diagnosis: 'כפתורים מכניים - ממתין לחלקים',
      status: 'waiting_for_parts',
      history: [
        { status: 'received',          changedBy: salesSam._id,  at: daysAgo(9) },
        { status: 'diagnosed',         changedBy: techTomer._id, at: daysAgo(8) },
        { status: 'waiting_for_parts', changedBy: techTomer._id, at: daysAgo(7) },
      ],
      estimatedCost: 140,
      createdAt: daysAgo(9), updatedAt: daysAgo(7),
    },
    // --- DIAGNOSED (2) ---
    {
      ticketNumber: mkRprNum(1), branchId: tlvBranch._id, customerId: cstSara._id, technicianId: techTomer._id,
      deviceBrand: 'Apple', deviceModel: 'iPhone 15 Pro Max', color: 'Natural Titanium',
      faultDescription: 'מסך מהבהב', diagnosis: 'בעיה בכבל מסך פנימי - ממתין לאישור לקוח על עלות',
      status: 'diagnosed',
      history: [
        { status: 'received',  changedBy: salesSam._id,  at: daysAgo(1) },
        { status: 'diagnosed', changedBy: techTomer._id, at: daysAgo(0) },
      ],
      estimatedCost: 300,
      createdAt: daysAgo(1), updatedAt: daysAgo(0),
    },
    {
      ticketNumber: mkRprNum(1), branchId: hfaBranch._id, customerId: cstRachel._id,
      deviceBrand: 'Xiaomi', deviceModel: 'Redmi Note 13 Pro', color: 'Aurora Purple',
      faultDescription: 'Wi-Fi לא עובד', diagnosis: 'שבב רשת תקול - בבדיקה',
      status: 'diagnosed',
      history: [
        { status: 'received',  changedBy: salesHila._id, at: daysAgo(1) },
        { status: 'diagnosed', at: daysAgo(0) },
      ],
      estimatedCost: 350,
      createdAt: daysAgo(1), updatedAt: daysAgo(0),
    },
    // --- RECEIVED TODAY (2) ---
    {
      ticketNumber: mkRprNum(0), branchId: tlvBranch._id, customerId: cstTamar._id, technicianId: techTomer._id,
      deviceBrand: 'Apple', deviceModel: 'iPhone 14', color: 'Midnight',
      accessories: 'מטען, אוזניות',
      faultDescription: 'מסך שחור לאחר נפילה',
      status: 'received',
      history: [{ status: 'received', changedBy: salesSam._id, at: new Date() }],
      estimatedCost: 400,
      promisedDate: daysAgo(-3),
      createdAt: new Date(), updatedAt: new Date(),
    },
    {
      ticketNumber: mkRprNum(0), branchId: hfaBranch._id, customerId: cstYossi._id,
      deviceBrand: 'Samsung', deviceModel: 'Galaxy S21', color: 'Phantom Violet',
      faultDescription: 'סוללה מתרוקנת מהר מאוד',
      status: 'received',
      history: [{ status: 'received', changedBy: salesHila._id, at: new Date() }],
      estimatedCost: 200,
      promisedDate: daysAgo(-2),
      createdAt: new Date(), updatedAt: new Date(),
    },
  ];
  const savedRepairs = await Repair.insertMany(repairDocs);

  // -----------------------------------------------------------------------
  // Purchase Orders (6)
  // -----------------------------------------------------------------------
  let poSeq = 10;
  const mkPoNum = (dAgo) => {
    const d = daysAgo(dAgo);
    return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${++poSeq}`;
  };

  const po1Total = 10 * 3400 + 15 * 2800 + 30 * 50;  // 77500
  const po2Total = 8 * 3300 + 20 * 500;               // 36400
  const po3Total = 50 * 15 + 30 * 25 + 100 * 10 + 15 * 60; // 3400
  const po4Total = 12 * 600;                           // 7200
  const po5Total = 5 * 3400 + 20 * 90;                // 18800
  const po6Total = 5 * 280;                            // 1400

  const poDocs = [
    {
      poNumber: mkPoNum(85), supplierId: supByName['Apple IL']._id, branchId: tlvBranch._id, createdBy: admin._id,
      items: [
        { productId: ip15Pro._id, name: ip15Pro.name, sku: ip15Pro.sku, quantity: 10, receivedQuantity: 10, unitCost: 3400 },
        { productId: ip15._id,    name: ip15.name,    sku: ip15.sku,    quantity: 15, receivedQuantity: 15, unitCost: 2800 },
        { productId: charger._id, name: charger.name, sku: charger.sku, quantity: 30, receivedQuantity: 30, unitCost: 50 },
      ],
      status: 'received', subtotal: po1Total, tax: 0, total: po1Total,
      expectedDate: daysAgo(78), receivedAt: daysAgo(80),
      notes: 'הזמנה ראשונה של הסתיו',
      createdAt: daysAgo(85), updatedAt: daysAgo(80),
    },
    {
      poNumber: mkPoNum(60), supplierId: supByName['Samsung IL']._id, branchId: tlvBranch._id, createdBy: manager._id,
      items: [
        { productId: gs24u._id, name: gs24u.name, sku: gs24u.sku, quantity: 8,  receivedQuantity: 8,  unitCost: 3300 },
        { productId: ga15._id,  name: ga15.name,  sku: ga15.sku,  quantity: 20, receivedQuantity: 20, unitCost: 500 },
      ],
      status: 'received', subtotal: po2Total, tax: 0, total: po2Total,
      expectedDate: daysAgo(55), receivedAt: daysAgo(57),
      createdAt: daysAgo(60), updatedAt: daysAgo(57),
    },
    {
      poNumber: mkPoNum(40), supplierId: supByName['AccessoriesPro']._id, branchId: tlvBranch._id, createdBy: manager._id,
      items: [
        { productId: caseIp15._id,  name: caseIp15.name,  sku: caseIp15.sku,  quantity: 50,  receivedQuantity: 50,  unitCost: 15 },
        { productId: caseGs24u._id, name: caseGs24u.name, sku: caseGs24u.sku, quantity: 30,  receivedQuantity: 30,  unitCost: 25 },
        { productId: spIp15._id,    name: spIp15.name,    sku: spIp15.sku,    quantity: 100, receivedQuantity: 100, unitCost: 10 },
        { productId: powerbank._id, name: powerbank.name, sku: powerbank.sku, quantity: 15,  receivedQuantity: 15,  unitCost: 60 },
      ],
      status: 'received', subtotal: po3Total, tax: 0, total: po3Total,
      expectedDate: daysAgo(35), receivedAt: daysAgo(37),
      createdAt: daysAgo(40), updatedAt: daysAgo(37),
    },
    {
      poNumber: mkPoNum(20), supplierId: supByName['Xiaomi IL']._id, branchId: hfaBranch._id, createdBy: manager._id,
      items: [
        { productId: redmi13._id, name: redmi13.name, sku: redmi13.sku, quantity: 12, receivedQuantity: 12, unitCost: 600 },
      ],
      status: 'received', subtotal: po4Total, tax: 0, total: po4Total,
      expectedDate: daysAgo(15), receivedAt: daysAgo(17),
      createdAt: daysAgo(20), updatedAt: daysAgo(17),
    },
    // Sent — awaiting delivery
    {
      poNumber: mkPoNum(5), supplierId: supByName['Apple IL']._id, branchId: tlvBranch._id, createdBy: admin._id,
      items: [
        { productId: ip15Pro._id,  name: ip15Pro.name,  sku: ip15Pro.sku,  quantity: 5,  receivedQuantity: 0, unitCost: 3400 },
        { productId: battIp14._id, name: battIp14.name, sku: battIp14.sku, quantity: 20, receivedQuantity: 0, unitCost: 90 },
      ],
      status: 'sent', subtotal: po5Total, tax: 0, total: po5Total,
      expectedDate: daysAgo(-7),
      notes: 'ממתין לאישור Apple IL',
      createdAt: daysAgo(5), updatedAt: daysAgo(5),
    },
    // Draft
    {
      poNumber: mkPoNum(1), supplierId: supByName['Samsung IL']._id, branchId: tlvBranch._id, createdBy: manager._id,
      items: [
        { productId: scrnGs22._id, name: scrnGs22.name, sku: scrnGs22.sku, quantity: 5, receivedQuantity: 0, unitCost: 280 },
      ],
      status: 'draft', subtotal: po6Total, tax: 0, total: po6Total,
      notes: 'טיוטה - לאישור מנהל',
      createdAt: daysAgo(1), updatedAt: daysAgo(1),
    },
  ];
  await PurchaseOrder.insertMany(poDocs);

  // -----------------------------------------------------------------------
  // Stock Movements
  // -----------------------------------------------------------------------
  const movementDocs = [
    // Purchases
    { productId: ip15Pro._id, branchId: tlvBranch._id, type: 'purchase', quantity:  10, refType: 'PurchaseOrder', performedBy: admin._id,   createdAt: daysAgo(80) },
    { productId: ip15._id,    branchId: tlvBranch._id, type: 'purchase', quantity:  15, refType: 'PurchaseOrder', performedBy: admin._id,   createdAt: daysAgo(80) },
    { productId: charger._id, branchId: tlvBranch._id, type: 'purchase', quantity:  30, refType: 'PurchaseOrder', performedBy: admin._id,   createdAt: daysAgo(80) },
    { productId: gs24u._id,   branchId: tlvBranch._id, type: 'purchase', quantity:   8, refType: 'PurchaseOrder', performedBy: manager._id, createdAt: daysAgo(57) },
    { productId: ga15._id,    branchId: tlvBranch._id, type: 'purchase', quantity:  20, refType: 'PurchaseOrder', performedBy: manager._id, createdAt: daysAgo(57) },
    { productId: caseIp15._id, branchId: tlvBranch._id, type: 'purchase', quantity: 50, refType: 'PurchaseOrder', performedBy: manager._id, createdAt: daysAgo(37) },
    { productId: redmi13._id, branchId: hfaBranch._id, type: 'purchase', quantity:  12, refType: 'PurchaseOrder', performedBy: manager._id, createdAt: daysAgo(17) },
    // Sales
    { productId: ip15Pro._id, branchId: tlvBranch._id, type: 'sale', quantity:  -1, refType: 'Order', performedBy: salesSam._id,  createdAt: daysAgo(87) },
    { productId: ip15._id,    branchId: tlvBranch._id, type: 'sale', quantity:  -1, refType: 'Order', performedBy: salesSam._id,  createdAt: daysAgo(85) },
    { productId: gs24u._id,   branchId: tlvBranch._id, type: 'sale', quantity:  -1, refType: 'Order', performedBy: salesSam._id,  createdAt: daysAgo(82) },
    { productId: ga15._id,    branchId: tlvBranch._id, type: 'sale', quantity:  -2, refType: 'Order', performedBy: salesSam._id,  createdAt: daysAgo(76) },
    { productId: redmi13._id, branchId: hfaBranch._id, type: 'sale', quantity:  -1, refType: 'Order', performedBy: salesHila._id, createdAt: daysAgo(38) },
    { productId: ip15Pro._id, branchId: tlvBranch._id, type: 'sale', quantity:  -1, refType: 'Order', performedBy: salesSam._id,  createdAt: daysAgo(35) },
    { productId: ip15._id,    branchId: tlvBranch._id, type: 'sale', quantity:  -1, refType: 'Order', performedBy: salesSam._id,  createdAt: daysAgo(24) },
    { productId: gs24u._id,   branchId: tlvBranch._id, type: 'sale', quantity:  -1, refType: 'Order', performedBy: salesSam._id,  createdAt: daysAgo(21) },
    { productId: ip15Pro._id, branchId: tlvBranch._id, type: 'sale', quantity:  -1, refType: 'Order', performedBy: salesSam._id,  createdAt: daysAgo(12) },
    // Return (refunded order)
    { productId: ip15._id, branchId: tlvBranch._id, type: 'return', quantity: 1, refType: 'Order', performedBy: salesSam._id, createdAt: daysAgo(43) },
    // Damaged goods
    { productId: powerbank._id, branchId: tlvBranch._id, type: 'damaged', quantity: -3, performedBy: admin._id,   reason: 'נזק מים במחסן', createdAt: daysAgo(20) },
    // Manual adjustment (inventory count)
    { productId: charger._id, branchId: tlvBranch._id, type: 'adjustment', quantity: -5, performedBy: manager._id, reason: 'ספירת מלאי - הפרש', createdAt: daysAgo(15) },
    // Branch transfer
    { productId: ga15._id, branchId: tlvBranch._id, type: 'transfer_out', quantity: -3, refType: 'Transfer', performedBy: admin._id, createdAt: daysAgo(30) },
    { productId: ga15._id, branchId: hfaBranch._id, type: 'transfer_in',  quantity:  3, refType: 'Transfer', performedBy: admin._id, createdAt: daysAgo(30) },
  ];
  await StockMovement.insertMany(movementDocs);

  // -----------------------------------------------------------------------
  // Notifications (11)
  // -----------------------------------------------------------------------
  const notifDocs = [
    { type: 'low_stock', title: 'מלאי נמוך — Powerbank 20K', message: 'נותרו רק 2 יחידות של 20,000mAh Powerbank בסניף ת"א. מינימום הוא 10.', severity: 'critical', targetRole: 'manager', branchId: tlvBranch._id, refType: 'Product', refId: powerbank._id, isRead: false, createdAt: daysAgo(1) },
    { type: 'low_stock', title: 'מלאי נמוך — iPhone 15 Pro', message: 'נותרו 3 יחידות של iPhone 15 Pro בסניף ת"א. מינימום הוא 3.', severity: 'warning', targetRole: 'manager', branchId: tlvBranch._id, refType: 'Product', refId: ip15Pro._id, isRead: false, createdAt: daysAgo(2) },
    { type: 'low_stock', title: 'מלאי נמוך — Galaxy S24 Ultra', message: 'נותרו 2 יחידות של Galaxy S24 Ultra בסניף ת"א.', severity: 'warning', targetRole: 'manager', branchId: tlvBranch._id, refType: 'Product', refId: gs24u._id, isRead: true, readAt: daysAgo(1), createdAt: daysAgo(3) },
    { type: 'repair_status', title: 'תיקון מוכן לאיסוף — לימור גולדברג', message: 'Samsung Galaxy A54 עבור לימור גולדברג מוכן לאיסוף. עלות: ₪320.', severity: 'info', targetRole: 'salesperson', branchId: tlvBranch._id, isRead: false, createdAt: daysAgo(7) },
    { type: 'repair_status', title: 'תיקון מוכן לאיסוף — משה אבוטבול', message: 'iPad Air 5 עבור משה אבוטבול מוכן לאיסוף בסניף חיפה.', severity: 'info', targetRole: 'salesperson', branchId: hfaBranch._id, isRead: false, createdAt: daysAgo(5) },
    { type: 'repair_status', title: 'ממתין לחלקים — MacBook Air M2', message: 'MacBook Air M2 של לימור גולדברג ממתין לחלק חלופי. עדכן לקוח.', severity: 'warning', targetRole: 'technician', branchId: tlvBranch._id, isRead: true, readAt: daysAgo(4), createdAt: daysAgo(5) },
    { type: 'overdue_payment', title: 'חוב פתוח — דוד מזרחי', message: 'לדוד מזרחי יתרת חוב של ₪350. מעל 60 יום ללא תשלום.', severity: 'warning', targetRole: 'manager', branchId: tlvBranch._id, isRead: false, createdAt: daysAgo(10) },
    { type: 'overdue_payment', title: 'חוב פתוח — משה אבוטבול', message: 'למשה אבוטבול יתרת חוב של ₪799. דרוש טיפול דחוף.', severity: 'critical', targetRole: 'manager', branchId: tlvBranch._id, isRead: false, createdAt: daysAgo(5) },
    { type: 'system', title: 'גיבוי מסד הנתונים הושלם', message: 'גיבוי אוטומטי הושלם בהצלחה ב-03:00.', severity: 'info', targetRole: 'admin', isRead: true, readAt: daysAgo(0), createdAt: daysAgo(1) },
    { type: 'system', title: 'עדכון מערכת זמין', message: 'גרסה 2.4.1 זמינה. מומלץ לעדכן בשעות הלילה.', severity: 'info', targetRole: 'admin', isRead: false, createdAt: daysAgo(3) },
    { type: 'audit_alert', title: 'כניסה ממיקום חריג', message: 'זוהתה כניסה לחשבון admin@dor-store.test מכתובת IP חדשה (185.220.101.45 — Amsterdam).', severity: 'warning', targetRole: 'admin', isRead: false, createdAt: daysAgo(2) },
  ];
  await Notification.insertMany(notifDocs);

  // -----------------------------------------------------------------------
  // Audit Logs (25 entries)
  // -----------------------------------------------------------------------
  const auditDocs = [
    // Auth — logins
    { userId: admin._id,    action: 'auth.login', ip: '82.80.12.45',    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0', meta: { email: 'admin@dor-store.test',   name: 'Admin Dor' },        createdAt: daysAgo(90) },
    { userId: manager._id,  action: 'auth.login', ip: '82.80.12.46',    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) Chrome/120.0', meta: { email: 'manager@dor-store.test', name: 'Manager Maya' },  createdAt: daysAgo(88) },
    { userId: salesSam._id, action: 'auth.login', ip: '212.143.10.22',  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',  meta: { email: 'sales@dor-store.test',   name: 'Salesperson Sam' }, createdAt: daysAgo(87) },
    { userId: salesSam._id, action: 'auth.login', ip: '212.143.10.22',  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/122.0',  meta: { email: 'sales@dor-store.test',   name: 'Salesperson Sam' }, createdAt: daysAgo(1) },
    { userId: techTomer._id, action: 'auth.login', ip: '77.125.55.88', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2) AppleWebKit/605.1 Safari/604.1', meta: { email: 'tech@dor-store.test', name: 'Technician Tomer' }, createdAt: daysAgo(1) },
    { userId: salesHila._id, action: 'auth.login', ip: '80.74.15.33',  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/120.0',       meta: { email: 'hila@dor-store.test',    name: 'Salesperson Hila' }, createdAt: daysAgo(1) },
    { userId: admin._id,    action: 'auth.login', ip: '82.80.12.45',    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0',    meta: { email: 'admin@dor-store.test',   name: 'Admin Dor' },        createdAt: daysAgo(2) },
    // Auth — failed logins
    { action: 'auth.login.failed', ip: '185.220.101.45', userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/119.0', meta: { email: 'admin@dor-store.test',   reason: 'invalid_password' }, createdAt: daysAgo(2) },
    { action: 'auth.login.failed', ip: '91.108.4.50',    userAgent: 'python-requests/2.31.0',                        meta: { email: 'manager@dor-store.test', reason: 'invalid_password' }, createdAt: daysAgo(0) },
    // Auth — logout
    { userId: admin._id,    action: 'auth.logout', ip: '82.80.12.45',   meta: { email: 'admin@dor-store.test' },   createdAt: daysAgo(88) },
    { userId: salesSam._id, action: 'auth.logout', ip: '212.143.10.22', meta: { email: 'sales@dor-store.test' },   createdAt: daysAgo(85) },
    // User management
    { userId: admin._id, action: 'auth.user.registered', entity: 'User',     meta: { email: 'tech@dor-store.test',    name: 'Technician Tomer', role: 'technician' },  createdAt: daysAgo(95) },
    { userId: admin._id, action: 'auth.password.changed', entity: 'User',    meta: { email: 'admin@dor-store.test',   name: 'Admin Dor' },                              createdAt: daysAgo(60) },
    // Orders
    { userId: salesSam._id, action: 'order.created',    entity: 'Order', meta: { invoiceNumber: 'INV-202602-1001', total: 4490, items: 1 }, createdAt: daysAgo(87) },
    { userId: salesSam._id, action: 'order.created',    entity: 'Order', meta: { invoiceNumber: 'INV-202602-1002', total: 3739, items: 2 }, createdAt: daysAgo(85) },
    { userId: salesSam._id, action: 'order.refunded',   entity: 'Order', meta: { invoiceNumber: 'INV-202603-1014', amount: 3690, reason: 'לקוח לא מרוצה מהמוצר' }, createdAt: daysAgo(43) },
    { userId: salesSam._id, action: 'order.created',    entity: 'Order', meta: { invoiceNumber: 'INV-202604-1025', total: 4638, items: 3 }, createdAt: daysAgo(35) },
    { userId: salesSam._id, action: 'order.cancelled',  entity: 'Order', meta: { invoiceNumber: 'INV-202604-1017', total: 149 }, createdAt: daysAgo(33) },
    // Repairs
    { userId: salesSam._id,  action: 'repair.created',        entity: 'Repair', meta: { ticketNumber: 'RPR-202602-0101', deviceBrand: 'Apple',   deviceModel: 'iPhone 14' },           createdAt: daysAgo(80) },
    { userId: techTomer._id, action: 'repair.status.changed', entity: 'Repair', meta: { ticketNumber: 'RPR-202602-0101', status: 'in_repair',    notes: 'הוחלף מסך מקורי Apple' },     createdAt: daysAgo(78) },
    { userId: salesSam._id,  action: 'repair.delivered',      entity: 'Repair', meta: { ticketNumber: 'RPR-202602-0101', deviceBrand: 'Apple',   deviceModel: 'iPhone 14' },           createdAt: daysAgo(75) },
    // Customer
    { userId: admin._id,   action: 'customer.created', entity: 'Customer', meta: { name: 'אבי כהן',         phone: '050-1111111' }, createdAt: daysAgo(100) },
    // Product
    { userId: manager._id, action: 'product.updated',  entity: 'Product',  meta: { name: 'iPhone 15 Pro 256GB Black', sku: 'IP15PRO-256-BLK' }, createdAt: daysAgo(30) },
    // Supplier / POs
    { userId: admin._id, action: 'supplier.po.created',  entity: 'PurchaseOrder', meta: { poNumber: 'PO-202602-0011', total: po1Total, items: 3 }, createdAt: daysAgo(85) },
    { userId: admin._id, action: 'supplier.po.received', entity: 'PurchaseOrder', meta: { poNumber: 'PO-202602-0011', status: 'received' },        createdAt: daysAgo(80) },
  ];
  await AuditLog.insertMany(auditDocs);

  return {
    users: userSpecs.length,
    products: productSpecs.length,
    customers: customersCreated.length,
    orders: savedOrders.length,
    repairs: savedRepairs.length,
    purchaseOrders: poDocs.length,
    stockMovements: movementDocs.length,
    notifications: notifDocs.length,
    auditLogs: auditDocs.length,
  };
}

/**
 * Auto-seed helper. Runs the seed ONLY if there are zero users in the DB.
 * Safe to call on every boot.
 * @returns {Promise<boolean>} true if seeded, false if already populated.
 */
async function seedIfEmpty() {
  const userCount = await User.countDocuments({});
  if (userCount > 0) return false;
  await runSeed({ clearFirst: false });
  return true;
}

/** Called only when executed via `npm run seed`. */
async function cli() {
  console.log('Connecting to MongoDB:', env.MONGO_URI.replace(/\/\/.+@/, '//<credentials>@'));
  await mongoose.connect(env.MONGO_URI);
  const stats = await runSeed({ clearFirst: true });
  console.log('\nSeed complete:');
  console.log(`  Users:           ${stats.users}`);
  console.log(`  Products:        ${stats.products}`);
  console.log(`  Customers:       ${stats.customers}`);
  console.log(`  Orders:          ${stats.orders}`);
  console.log(`  Repairs:         ${stats.repairs}`);
  console.log(`  Purchase Orders: ${stats.purchaseOrders}`);
  console.log(`  Stock Movements: ${stats.stockMovements}`);
  console.log(`  Notifications:   ${stats.notifications}`);
  console.log(`  Audit Logs:      ${stats.auditLogs}`);
  console.log('\nTest users (email / password):');
  console.log('  admin@dor-store.test    / admin1234   (admin)');
  console.log('  manager@dor-store.test  / manager1234 (manager)');
  console.log('  sales@dor-store.test    / sales1234   (salesperson)');
  console.log('  tech@dor-store.test     / tech1234    (technician)');
  console.log('  hila@dor-store.test     / sales1234   (salesperson - Haifa)');
  await mongoose.disconnect();
}

module.exports = { runSeed, seedIfEmpty };

if (require.main === module) {
  cli().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
}
