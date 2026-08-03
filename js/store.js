/**
 * store.js — Cloud Data Layer (Firebase Firestore)
 * =================================================
 * Replaces the old localStorage-based DataStore.
 * All CRUD operations are async (return Promises).
 *
 * Firestore Collections:
 *   articles   — all blog articles
 *   categories — content categories
 *
 * Images stay in localStorage (can be large base64 blobs).
 *
 * Public API (all async):
 *   Articles.getAll()           → Promise<Article[]>
 *   Articles.getById(id)        → Promise<Article|null>
 *   Articles.add(data)          → Promise<Article>
 *   Articles.update(id, patch)  → Promise<void>
 *   Articles.remove(id)         → Promise<void>
 *
 *   Categories — same API
 *   Images     — synchronous (localStorage)
 *
 *   seedArticlesFromStatic()    → Promise<void>  (run once on first dashboard visit)
 *   seedCategoriesFromDefault() → Promise<void>
 */

'use strict';

/* ─── Collection Names ──────────────────────────────────────────────── */
const COLLECTIONS = {
  ARTICLES:   'articles',
  CATEGORIES: 'categories',
};

/* ─── Default Categories ────────────────────────────────────────────── */
const DEFAULT_CATEGORIES = [
  { id: 'dcat-1', name: 'Algebra',              slug: 'algebra' },
  { id: 'dcat-2', name: 'Geometry',             slug: 'geometry' },
  { id: 'dcat-3', name: 'Fractions',            slug: 'fractions' },
  { id: 'dcat-4', name: 'Statistics',           slug: 'statistics' },
  { id: 'dcat-5', name: 'Learning Tips',        slug: 'learning-tips' },
  { id: 'dcat-6', name: 'Interactive Learning', slug: 'interactive-learning' },
  { id: 'dcat-7', name: 'Examinations',         slug: 'examinations' },
];

/* ─── System Images (localStorage only) ────────────────────────────── */
const SYSTEM_IMAGES = [
  { id: 'simg-1', name: 'Teacher Portrait',   url: 'images/bu_khusnul_portrait.png',   type: 'system', addedAt: '2026-08-01' },
  { id: 'simg-2', name: 'Classroom Teaching', url: 'images/classroom_teaching.png',     type: 'system', addedAt: '2026-08-01' },
  { id: 'simg-3', name: 'Algebra Cover',      url: 'images/article_algebra.png',        type: 'system', addedAt: '2026-08-01' },
  { id: 'simg-4', name: 'Geometry Cover',     url: 'images/article_geometry.png',       type: 'system', addedAt: '2026-08-01' },
  { id: 'simg-5', name: 'Fractions Cover',    url: 'images/article_fractions.png',      type: 'system', addedAt: '2026-08-01' },
  { id: 'simg-6', name: 'Statistics Cover',   url: 'images/article_statistics.png',     type: 'system', addedAt: '2026-08-01' },
];

/* ═══════════════════════════════════════════════════════════════════════
   FirestoreStore — async CRUD wrapper for a Firestore collection
   ═══════════════════════════════════════════════════════════════════════ */
class FirestoreStore {
  constructor(collectionName) {
    this.col = collectionName;
  }

  /** Returns all documents sorted by createdAt desc safely in memory */
  async getAll() {
    try {
      const snap = await db.collection(this.col).get();
      const items = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      items.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt) : 0;
        const db_ = b.createdAt ? new Date(b.createdAt) : 0;
        return db_ - da;
      });
      return items;
    } catch (err) {
      console.error(`FirestoreStore.getAll error for ${this.col}:`, err);
      return [];
    }
  }

  /** Fetch a single document by id */
  async getById(id) {
    try {
      const doc = await db.collection(this.col).doc(id).get();
      return doc.exists ? { ...doc.data(), id: doc.id } : null;
    } catch (err) {
      console.error(`FirestoreStore.getById error for ${this.col}/${id}:`, err);
      return null;
    }
  }

  /** Insert a new document. Uses provided id or auto-generates one. */
  async add(item) {
    const id   = item.id || storeGenId();
    const data = { ...item, id, createdAt: item.createdAt || todayISO() };
    await db.collection(this.col).doc(id).set(data);
    return data;
  }

  /** Merge patch into an existing document */
  async update(id, patch) {
    await db.collection(this.col).doc(id).update(patch);
  }

  /** Delete a document by id */
  async remove(id) {
    await db.collection(this.col).doc(id).delete();
  }

  /** Count documents in this collection */
  async count() {
    const snap = await db.collection(this.col).get();
    return snap.size;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   LocalImageStore — images stay in localStorage (potentially large blobs)
   ═══════════════════════════════════════════════════════════════════════ */
class LocalImageStore {
  constructor(key, defaults = []) {
    this.key      = key;
    this.defaults = defaults;
  }

  _read() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw !== null ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  _write(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      alert('Storage limit reached. Please delete some uploaded images to free space.');
    }
    return data;
  }

  getAll() {
    const data = this._read();
    if (data === null) {
      this._write(this.defaults);
      return [...this.defaults];
    }
    return data;
  }

  getById(id) {
    return this.getAll().find(x => x.id === id) || null;
  }

  add(item) {
    const list    = this.getAll();
    const newItem = { ...item, id: item.id || storeGenId() };
    list.unshift(newItem);
    this._write(list);
    return newItem;
  }

  update(id, patch) {
    const list = this.getAll();
    const idx  = list.findIndex(x => x.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    this._write(list);
    return list[idx];
  }

  remove(id) {
    this._write(this.getAll().filter(x => x.id !== id));
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Utility Functions (shared with dashboard.js)
   ═══════════════════════════════════════════════════════════════════════ */

function storeGenId() {
  return 'msm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function toSlug(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function calcReadTime(htmlStr) {
  const text  = (htmlStr || '').replace(/<[^>]*>/g, '');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins  = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

function getCatClass(catName) {
  const MAP = {
    'algebra':              'cat-algebra',
    'geometry':             'cat-geometry',
    'fractions':            'cat-fractions',
    'statistics':           'cat-statistics',
    'learning tips':        'cat-tips',
    'interactive learning': 'cat-interactive',
    'examinations':         'cat-exam',
  };
  return MAP[(catName || '').toLowerCase()] || 'cat-algebra';
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* ═══════════════════════════════════════════════════════════════════════
   First-Run Seeding — runs once when Firestore is empty
   ═══════════════════════════════════════════════════════════════════════ */

async function seedArticlesFromStatic() {
  // Check if articles collection already has data
  const snap = await db.collection(COLLECTIONS.ARTICLES).limit(1).get();
  if (!snap.empty) return; // Already seeded, skip

  const source = (typeof ARTICLES !== 'undefined') ? ARTICLES : [];
  if (source.length === 0) return;

  // Use Firestore batch write for atomicity
  const batch = db.batch();

  source.forEach(a => {
    const ref = db.collection(COLLECTIONS.ARTICLES).doc(a.id);
    batch.set(ref, {
      id:             a.id,
      title:          a.title            || 'Untitled',
      slug:           a.slug             || toSlug(a.title || ''),
      coverImage:     a.coverImage       || '',
      category:       a.category         || '',
      catClass:       a.catClass         || getCatClass(a.category),
      author:         a.author           || 'Bu Khusnul Khotimah',
      publishDate:    a.publishDate      || todayISO(),
      readingTime:    a.readingTime      || '5 min read',
      excerpt:        a.excerpt          || '',
      tags:           a.tags             || [],
      featured:       !!a.featured,
      popular:        !!a.popular,
      latest:         !!a.latest,
      content:        (a.content         || '').trim(),
      status:         'published',
      seoTitle:       a.title            || '',
      seoDescription: a.excerpt          || '',
      createdAt:      a.publishDate      || todayISO(),
      updatedAt:      a.publishDate      || todayISO(),
    });
  });

  await batch.commit();
  console.log(`[Store] Seeded ${source.length} articles to Firestore.`);
}

async function seedCategoriesFromDefault() {
  const snap = await db.collection(COLLECTIONS.CATEGORIES).limit(1).get();
  if (!snap.empty) return;

  const batch = db.batch();
  DEFAULT_CATEGORIES.forEach(c => {
    const ref = db.collection(COLLECTIONS.CATEGORIES).doc(c.id);
    batch.set(ref, { ...c, createdAt: todayISO() });
  });
  await batch.commit();
  console.log('[Store] Seeded default categories to Firestore.');
}

/* ─── Store Instances ───────────────────────────────────────────────── */
const Articles   = new FirestoreStore(COLLECTIONS.ARTICLES);
const Categories = new FirestoreStore(COLLECTIONS.CATEGORIES);
const Images     = new LocalImageStore('msm_images', SYSTEM_IMAGES);
