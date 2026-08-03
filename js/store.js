/**
 * store.js — Persistent Data Layer for Mrs. Sarah Mitchell CMS
 * =============================================================
 * Wraps localStorage for Articles, Categories, and Images.
 * Must be loaded AFTER js/articles.js on the dashboard page.
 *
 * Public API:
 *   Articles.getAll()          — all articles (newest first)
 *   Articles.getById(id)
 *   Articles.add(data)         — returns created article
 *   Articles.update(id, patch) — returns updated article
 *   Articles.remove(id)
 *
 *   Categories / Images — same API
 *
 *   seedArticlesFromStatic()   — run once on first dashboard visit
 */

'use strict';

/* ─── Storage Keys ──────────────────────────────────────────────────── */
const STORE_KEYS = {
  ARTICLES:   'msm_articles',
  CATEGORIES: 'msm_categories',
  IMAGES:     'msm_images',
};

/* ─── Default Categories (seeded on first run) ──────────────────────── */
const DEFAULT_CATEGORIES = [
  { id: 'dcat-1', name: 'Algebra',             slug: 'algebra' },
  { id: 'dcat-2', name: 'Geometry',            slug: 'geometry' },
  { id: 'dcat-3', name: 'Fractions',           slug: 'fractions' },
  { id: 'dcat-4', name: 'Statistics',          slug: 'statistics' },
  { id: 'dcat-5', name: 'Learning Tips',       slug: 'learning-tips' },
  { id: 'dcat-6', name: 'Interactive Learning', slug: 'interactive-learning' },
  { id: 'dcat-7', name: 'Examinations',        slug: 'examinations' },
];

/* ─── Default System Images (always available) ──────────────────────── */
const SYSTEM_IMAGES = [
  { id: 'simg-1', name: 'Teacher Portrait',   url: 'images/teacher_portrait.png',   type: 'system', addedAt: '2026-08-01' },
  { id: 'simg-2', name: 'Classroom Teaching', url: 'images/classroom_teaching.png', type: 'system', addedAt: '2026-08-01' },
  { id: 'simg-3', name: 'Algebra Cover',      url: 'images/article_algebra.png',    type: 'system', addedAt: '2026-08-01' },
  { id: 'simg-4', name: 'Geometry Cover',     url: 'images/article_geometry.png',   type: 'system', addedAt: '2026-08-01' },
  { id: 'simg-5', name: 'Fractions Cover',    url: 'images/article_fractions.png',  type: 'system', addedAt: '2026-08-01' },
  { id: 'simg-6', name: 'Statistics Cover',   url: 'images/article_statistics.png', type: 'system', addedAt: '2026-08-01' },
];

/* ═══════════════════════════════════════════════════════════════════════
   DataStore — Generic localStorage CRUD
   ═══════════════════════════════════════════════════════════════════════ */
class DataStore {
  constructor(key, defaults = []) {
    this.key      = key;
    this.defaults = defaults;
  }

  /* Internal read — returns parsed array or null on first run */
  _read() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw !== null ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /* Internal write — serializes to localStorage */
  _write(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      alert('Storage limit reached. Please delete some uploaded images to free space.');
    }
    return data;
  }

  /* Read all records. Seeds defaults on first call. */
  getAll() {
    const data = this._read();
    if (data === null) {
      this._write(this.defaults);
      return [...this.defaults];
    }
    return data;
  }

  /* Find a single record by id */
  getById(id) {
    return this.getAll().find(item => item.id === id) || null;
  }

  /* Insert a new record. Auto-generates id if not provided. */
  add(item) {
    const list    = this.getAll();
    const newItem = { ...item, id: item.id || storeGenId() };
    list.unshift(newItem);
    this._write(list);
    return newItem;
  }

  /* Merge patch into existing record */
  update(id, patch) {
    const list = this.getAll();
    const idx  = list.findIndex(x => x.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    this._write(list);
    return list[idx];
  }

  /* Delete a record by id */
  remove(id) {
    this._write(this.getAll().filter(x => x.id !== id));
  }

  /* Count all records */
  count() {
    return this.getAll().length;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Shared Utility Functions
   ═══════════════════════════════════════════════════════════════════════ */

function storeGenId() {
  return 'msm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Convert any string to a URL-safe slug */
function toSlug(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

/** Estimate reading time from HTML content */
function calcReadTime(htmlStr) {
  const text  = (htmlStr || '').replace(/<[^>]*>/g, '');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins  = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

/** Map category name to CSS class name */
function getCatClass(catName) {
  const MAP = {
    'algebra':             'cat-algebra',
    'geometry':            'cat-geometry',
    'fractions':           'cat-fractions',
    'statistics':          'cat-statistics',
    'learning tips':       'cat-tips',
    'interactive learning': 'cat-interactive',
    'examinations':        'cat-exam',
  };
  return MAP[(catName || '').toLowerCase()] || 'cat-algebra';
}

/* ═══════════════════════════════════════════════════════════════════════
   First-Run Article Seeding
   Converts static ARTICLES constant (articles.js) to CMS format.
   Runs only once — subsequent visits use the localStorage copy.
   ═══════════════════════════════════════════════════════════════════════ */
function seedArticlesFromStatic() {
  if (localStorage.getItem(STORE_KEYS.ARTICLES) !== null) return;

  const source = (typeof ARTICLES !== 'undefined') ? ARTICLES : [];

  const seeded = source.map(a => ({
    id:             a.id,
    title:          a.title            || 'Untitled',
    slug:           a.slug             || toSlug(a.title || ''),
    coverImage:     a.coverImage       || '',
    category:       a.category         || '',
    catClass:       a.catClass         || getCatClass(a.category),
    author:         a.author           || 'Mrs. Sarah Mitchell',
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
  }));

  localStorage.setItem(STORE_KEYS.ARTICLES, JSON.stringify(seeded));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* ─── Store Instances ───────────────────────────────────────────────── */
const Articles   = new DataStore(STORE_KEYS.ARTICLES,   []);
const Categories = new DataStore(STORE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
const Images     = new DataStore(STORE_KEYS.IMAGES,     SYSTEM_IMAGES);
