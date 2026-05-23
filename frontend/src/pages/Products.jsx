import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  loadProductsIfStale, loadProducts,
  invalidateProductsCache,
  selectAllProducts, selectProductsStatus,
} from '../store/slices/productsSlice.js';
import { loadCategoriesIfStale, selectAllCategories } from '../store/slices/categoriesSlice.js';
import { createProduct, updateProduct, bulkImportProducts } from '../api/products.api.js';
import { splitByQuery } from '../utils/searchUtils.js';

const PRODUCT_FIELDS = ['name', 'sku', 'brand', 'model', 'barcode'];

function resizeImage(file, maxPx = 900, quality = 0.78) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const CSV_HEADERS = ['name', 'brand', 'model', 'sku', 'salePrice', 'color', 'storageGB', 'description'];

function downloadCsvTemplate() {
  const example = 'iPhone 15,Apple,iPhone 15 128GB,APL-IP15-128,3999,שחור,128,';
  const blob = new Blob([`﻿${CSV_HEADERS.join(',')}\n${example}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'products-template.csv'; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, i) => { if (values[i] !== undefined && values[i] !== '') row[h] = values[i]; });
    if (row.salePrice) row.salePrice = Number(row.salePrice);
    if (row.storageGB) row.storageGB = Number(row.storageGB);
    return row;
  });
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-muted)' };
const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', boxSizing: 'border-box' };

// ── Image upload shared UI ────────────────────────────────────────────────
function ImageUpload({ inputId, imagePreview, imgLoading, onFile, onRemove }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={lbl}>תמונת מוצר</label>
      <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
      <label
        htmlFor={inputId}
        style={{ border: '2px dashed var(--border)', borderRadius: 10, cursor: 'pointer', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', overflow: 'hidden' }}
      >
        {imgLoading && <span className="muted">טוען...</span>}
        {!imgLoading && imagePreview && <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
        {!imgLoading && !imagePreview && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 26 }}>📷</div>
            <div style={{ fontSize: 13, marginTop: 5 }}>לחץ להעלאת תמונה</div>
          </div>
        )}
      </label>
      {imagePreview && (
        <button type="button" className="btn-ghost" onClick={onRemove} style={{ fontSize: 12, marginTop: 6, padding: '3px 10px' }}>
          ✕ הסר תמונה
        </button>
      )}
    </div>
  );
}

// ── Product form fields (shared between new-inline and edit-modal) ────────
function ProductFields({ form, set, categories }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={lbl}>שם המוצר *</label>
        <input value={form.name} onChange={set('name')} required style={inp} />
      </div>
      <div>
        <label style={lbl}>מותג</label>
        <input value={form.brand} onChange={set('brand')} style={inp} />
      </div>
      <div>
        <label style={lbl}>דגם</label>
        <input value={form.model} onChange={set('model')} style={inp} />
      </div>
      <div>
        <label style={lbl}>מחיר (₪)</label>
        <input type="number" min="0" step="0.01" value={form.salePrice} onChange={set('salePrice')} style={inp} />
      </div>
      <div>
        <label style={lbl}>קטגוריה</label>
        <select value={form.categoryId} onChange={set('categoryId')} style={inp}>
          <option value="">-- בחר --</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label style={lbl}>SKU</label>
        <input value={form.sku} onChange={set('sku')} style={inp} />
      </div>
      <div>
        <label style={lbl}>צבע</label>
        <input value={form.color} onChange={set('color')} style={inp} />
      </div>
      <div>
        <label style={lbl}>אחסון (GB)</label>
        <input type="number" min="0" value={form.storageGB} onChange={set('storageGB')} style={inp} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={lbl}>תיאור</label>
        <textarea value={form.description} onChange={set('description')} rows={3} style={{ ...inp, resize: 'vertical' }} />
      </div>
    </div>
  );
}

// ── Inline "new product" form (no overlay) ────────────────────────────────
function NewProductInline({ categories, initialData, onClose, onSaved }) {
  const isDuplicate = !!(initialData?.name);
  const [form, setForm] = useState({
    name:        initialData?.name        || '',
    brand:       initialData?.brand       || '',
    model:       initialData?.model       || '',
    sku:         '',
    categoryId:  initialData?.categoryId?._id || initialData?.categoryId || '',
    salePrice:   initialData?.salePrice   ?? '',
    color:       initialData?.color       || '',
    storageGB:   initialData?.storageGB   || '',
    description: initialData?.description || '',
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [imgLoading, setImgLoading]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState(null);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgLoading(true);
    try { const b64 = await resizeImage(file); setImagePreview(b64); }
    finally { setImgLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = {
      ...form,
      salePrice: form.salePrice !== '' ? Number(form.salePrice) : undefined,
      storageGB: form.storageGB ? Number(form.storageGB) : undefined,
      images:    imagePreview ? [imagePreview] : [],
    };
    try {
      await createProduct(payload);
      onSaved();
    } catch (err) {
      setError(err.message || 'שגיאה בשמירה');
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: '20px 20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <strong style={{ fontSize: 16 }}>{isDuplicate ? '⧉ שכפול מוצר' : '+ מוצר חדש'}</strong>
        <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '2px 8px', fontSize: 18 }}>✕</button>
      </div>
      <form onSubmit={handleSubmit}>
        <ImageUpload
          inputId="new-product-img"
          imagePreview={imagePreview}
          imgLoading={imgLoading}
          onFile={handleImageChange}
          onRemove={() => setImagePreview(null)}
        />
        <ProductFields form={form} set={set} categories={categories} />
        {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>⚠ {error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px 0', fontWeight: 700 }}>
            {saving ? 'שומר...' : 'צור מוצר'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1, padding: '11px 0' }}>ביטול</button>
        </div>
      </form>
    </div>
  );
}

// ── Edit overlay modal ────────────────────────────────────────────────────
function EditProductModal({ product, categories, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:        product.name             || '',
    brand:       product.brand            || '',
    model:       product.model            || '',
    sku:         product.sku              || '',
    categoryId:  product.categoryId?._id || product.categoryId || '',
    salePrice:   product.salePrice        ?? '',
    color:       product.color            || '',
    storageGB:   product.storageGB        || '',
    description: product.description      || '',
  });
  const [imagePreview, setImagePreview] = useState(product.images?.[0] || null);
  const [imgLoading, setImgLoading]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState(null);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgLoading(true);
    try { const b64 = await resizeImage(file); setImagePreview(b64); }
    finally { setImgLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = {
      ...form,
      salePrice: form.salePrice !== '' ? Number(form.salePrice) : undefined,
      storageGB: form.storageGB ? Number(form.storageGB) : undefined,
      images:    imagePreview ? [imagePreview] : [],
    };
    try {
      await updateProduct(product._id, payload);
      onSaved();
    } catch (err) {
      setError(err.message || 'שגיאה בשמירה');
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '16px 12px' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div className="card" style={{ position: 'relative', width: 'min(480px, 100%)', padding: '24px 20px', marginTop: 'auto', marginBottom: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <strong style={{ fontSize: 17 }}>עריכת מוצר</strong>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '2px 8px', fontSize: 18 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <ImageUpload
            inputId="edit-product-img"
            imagePreview={imagePreview}
            imgLoading={imgLoading}
            onFile={handleImageChange}
            onRemove={() => setImagePreview(null)}
          />
          <ProductFields form={form} set={set} categories={categories} />
          {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>⚠ {error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px 0', fontWeight: 700 }}>
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1, padding: '11px 0' }}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── CSV import modal ──────────────────────────────────────────────────────
function CsvImportModal({ onClose, onImported }) {
  const [preview, setPreview]     = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) { setError('הקובץ ריק או פורמט לא תקין'); return; }
      setPreview(rows); setError(null);
    } catch { setError('שגיאה בקריאת הקובץ'); }
  }

  async function handleImport() {
    if (!preview?.length) return;
    setImporting(true); setError(null);
    try {
      const res = await bulkImportProducts(preview);
      setResult(res);
    } catch (err) {
      setError(err.message || 'שגיאה בייבוא');
    } finally { setImporting(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div className="card" style={{ position: 'relative', width: 'min(580px, 92vw)', maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <strong style={{ fontSize: 17 }}>ייבוא מוצרים מ-CSV</strong>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '2px 8px', fontSize: 18 }}>✕</button>
        </div>

        {result ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>הייבוא הושלם!</div>
            <div className="muted">נוצרו: {result.created ?? 0} · עודכנו: {result.updated ?? 0}</div>
            {result.errors?.length > 0 && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>שגיאות: {result.errors.length}</div>}
            <button onClick={() => { onImported(); onClose(); }} style={{ marginTop: 20, padding: '10px 32px' }}>סגור</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>עמודות: {CSV_HEADERS.join(', ')}</span>
              <button type="button" className="btn-ghost" onClick={downloadCsvTemplate} style={{ fontSize: 13, whiteSpace: 'nowrap' }}>⬇ הורד תבנית</button>
            </div>

            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFile} />
            <button type="button" className="btn-secondary" onClick={() => fileRef.current.click()} style={{ width: '100%', padding: '12px 0', marginBottom: 14, fontSize: 14 }}>
              📂 בחר קובץ CSV
            </button>

            {preview && (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{preview.length} שורות — תצוגה מקדימה (5 ראשונות):</div>
                <div style={{ overflowX: 'auto', marginBottom: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--surface-2)' }}>
                      <tr>{Object.keys(preview[0]).map((k) => <th key={k} style={{ padding: '6px 10px', textAlign: 'start', whiteSpace: 'nowrap' }}>{k}</th>)}</tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                          {Object.values(row).map((v, j) => <td key={j} style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{String(v)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={handleImport} disabled={importing} style={{ width: '100%', padding: '12px 0', fontWeight: 700, fontSize: 15 }}>
                  {importing ? 'מייבא...' : `ייבא ${preview.length} מוצרים`}
                </button>
              </>
            )}

            {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>⚠ {error}</div>}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Products() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const productList   = useSelector(selectAllProducts);
  const loadingStatus = useSelector(selectProductsStatus);
  const categories    = useSelector(selectAllCategories);

  const [searchQuery,   setSearchQuery]   = useState('');
  const [showNewForm,   setShowNewForm]   = useState(false);
  const [newFormData,   setNewFormData]   = useState(null);
  const [editProduct,   setEditProduct]   = useState(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  useEffect(() => { dispatch(loadProductsIfStale()); }, [dispatch]);
  useEffect(() => { dispatch(loadCategoriesIfStale()); }, [dispatch]);

  useEffect(() => {
    if (searchParams.get('new') === '1') { setShowNewForm(true); setNewFormData(null); }
  }, [searchParams]);

  const { matched, rest } = useMemo(
    () => splitByQuery(productList, searchQuery, PRODUCT_FIELDS),
    [productList, searchQuery],
  );

  const handleSaved = () => {
    dispatch(invalidateProductsCache());
    dispatch(loadProducts());
    setShowNewForm(false);
    setNewFormData(null);
    setEditProduct(null);
  };

  function duplicateProduct(product) {
    setNewFormData({ ...product, _id: undefined, sku: '' });
    setShowNewForm(true);
  }

  const renderRow = (product, dimmed) => (
    <tr
      key={product._id}
      style={dimmed ? { opacity: 0.4 } : undefined}
      className="product-row"
      onClick={() => setEditProduct(product)}
    >
      <td className="col-hide-mobile">{product.sku || '—'}</td>
      <td>{product.name}</td>
      <td className="col-hide-mobile">{product.brand}{product.model ? ` ${product.model}` : ''}</td>
      <td>₪{Number(product.salePrice || 0).toLocaleString('he-IL')}</td>
      <td className="col-actions col-hide-mobile" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn-ghost" onClick={() => setEditProduct(product)}>{t('common.edit')}</button>
        <button className="btn-ghost" onClick={() => duplicateProduct(product)} title="שכפל מוצר">⧉</button>
      </td>
    </tr>
  );

  return (
    <div className="page">
      <div className="toolbar">
        <input
          placeholder={t('common.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 280 }}
        />
        {searchQuery && (
          <button className="btn-ghost" onClick={() => setSearchQuery('')} style={{ padding: '4px 10px' }}>✕</button>
        )}
        <div className="spacer-flex" />
        <button className="btn-secondary" onClick={() => setShowCsvImport(true)} style={{ fontSize: 13 }}>⬆ ייבוא CSV</button>
        <button onClick={() => { setShowNewForm(true); setNewFormData(null); }} disabled={showNewForm}>{t('products.new')}</button>
      </div>

      {showNewForm && (
        <NewProductInline
          categories={categories}
          initialData={newFormData}
          onClose={() => { setShowNewForm(false); setNewFormData(null); }}
          onSaved={handleSaved}
        />
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="col-hide-mobile">{t('products.sku')}</th>
              <th>{t('common.name')}</th>
              <th className="col-hide-mobile">{t('products.brand')}</th>
              <th>{t('products.salePrice')}</th>
              <th className="col-hide-mobile">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loadingStatus === 'loading' ? (
              <tr><td colSpan="5">{t('common.loading')}</td></tr>
            ) : matched.length === 0 && rest.length === 0 ? (
              <tr><td colSpan="5" className="muted">{t('common.noData')}</td></tr>
            ) : (
              <>
                {matched.map((p) => renderRow(p, false))}
                {searchQuery && rest.length > 0 && (
                  <>
                    <tr>
                      <td colSpan="5" style={{ padding: '4px 14px', background: 'var(--surface-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                          <span>כל הפריטים · {rest.length}</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>
                      </td>
                    </tr>
                    {rest.map((p) => renderRow(p, true))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {editProduct && (
        <EditProductModal
          product={editProduct}
          categories={categories}
          onClose={() => setEditProduct(null)}
          onSaved={handleSaved}
        />
      )}

      {showCsvImport && (
        <CsvImportModal
          onClose={() => setShowCsvImport(false)}
          onImported={handleSaved}
        />
      )}
    </div>
  );
}
