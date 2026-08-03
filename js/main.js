/**
 * main.js — Public Homepage Controller
 * =========================================================================
 * Reads published articles from Firebase Firestore.
 * Falls back to static ARTICLES array only if Firestore is unavailable.
 *
 * Renders: featured, latest, popular articles, article modal reader.
 * Handles: contact form, mobile nav, smooth scroll, scroll spy.
 */

'use strict';

/* ─── Data Layer: Retrieve Published Articles from Firestore ──────── */

async function getPublishedArticles() {
  try {
    const snap = await db.collection('articles')
      .where('status', '==', 'published')
      .get();

    const articles = snap.docs.map(d => ({ ...d.data(), id: d.id }));

    // Sort by publishDate descending
    articles.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

    if (articles.length > 0) return articles;
  } catch (e) {
    console.warn('Firestore error, falling back to static articles:', e);
  }

  // Fallback to static ARTICLES from js/articles.js
  if (typeof ARTICLES !== 'undefined' && Array.isArray(ARTICLES)) {
    return ARTICLES;
  }

  return [];
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { month: 'long', day: 'numeric', year: 'numeric' });
}

function metaHTML(article) {
  return `
    <div class="meta">
      <span class="cat ${article.catClass || 'cat-algebra'}">${article.category}</span>
      <span class="meta-dot"></span>
      <span>${formatDate(article.publishDate)}</span>
      <span class="meta-dot"></span>
      <span>${article.readingTime || '5 min read'}</span>
    </div>
  `;
}

/* ─── Data Selectors ─────────────────────────────────────────────── */

function getFeaturedArticle(articles) {
  return articles.find(a => a.featured) || articles[0];
}

function getLatestArticles(articles, count = 2) {
  const latest = articles.filter(a => a.latest);
  if (latest.length > 0) {
    return [...latest]
      .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
      .slice(0, count);
  }
  return articles.slice(0, count);
}

function getPopularArticles(articles, count = 3) {
  const popular = articles.filter(a => a.popular);
  return popular.length > 0 ? popular.slice(0, count) : articles.slice(0, count);
}

function getAllArticlesSorted(articles) {
  return [...articles].sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
}

/* ─── Render: Featured Article ────────────────────────────────────── */

function renderFeaturedArticle(articles) {
  const article = getFeaturedArticle(articles);
  const el = document.getElementById('featured-article');
  if (!el) return;

  if (!article) {
    el.innerHTML = '<p style="color:var(--text-3); padding:20px;">Belum ada artikel yang dipublikasikan.</p>';
    return;
  }

  el.innerHTML = `
    ${article.coverImage ? `
      <img class="feature-image" src="${article.coverImage}" alt="${article.title}" loading="lazy" />
    ` : ''}
    <div class="feature-meta">${metaHTML(article)}</div>
    <h2 class="feature-title">${article.title}</h2>
    <p class="feature-excerpt">${article.excerpt || ''}</p>
    <button class="btn btn--ghost read-trigger" data-id="${article.id}">
      Baca Artikel
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>
  `;
}

/* ─── Render: Latest Articles ─────────────────────────────────────── */

function renderLatestArticles(articles) {
  const latest = getLatestArticles(articles, 2);
  const el = document.getElementById('latest-articles');
  if (!el) return;

  if (latest.length === 0) {
    el.innerHTML = '<p style="color:var(--text-3); font-size:0.9rem;">Belum ada artikel.</p>';
    return;
  }

  el.innerHTML = latest.map(art => `
    <div class="article-stub read-trigger" data-id="${art.id}" role="button" tabindex="0"
         aria-label="Baca: ${art.title}">
      <span class="cat ${art.catClass || 'cat-algebra'}">${art.category}</span>
      ${metaHTML(art)}
      <h3 class="stub-title">${art.title}</h3>
      <p class="stub-excerpt">${art.excerpt || ''}</p>
      <span class="btn btn--ghost">
        Baca Artikel
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </span>
    </div>
  `).join('');
}

/* ─── Render: Popular Articles ────────────────────────────────────── */

function renderPopularArticles(articles) {
  const popular = getPopularArticles(articles, 3);
  const el = document.getElementById('popular-articles');
  if (!el) return;

  if (popular.length === 0) {
    el.innerHTML = '<p style="color:var(--text-3); font-size:0.88rem;">Belum ada artikel populer.</p>';
    return;
  }

  el.innerHTML = popular.map(art => `
    <div class="popular-item read-trigger" data-id="${art.id}" role="button" tabindex="0"
         aria-label="Baca: ${art.title}">
      ${art.coverImage
        ? `<img class="popular-thumb" src="${art.coverImage}" alt="${art.title}" loading="lazy" />`
        : `<div class="popular-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--surface);">📄</div>`
      }
      <div>
        <p class="popular-title">${art.title}</p>
        <span class="popular-date">${formatDate(art.publishDate)}</span>
      </div>
    </div>
  `).join('');
}

/* ─── Article Modal Reader ────────────────────────────────────────── */

let currentActiveArticles = [];

function openModal(articleId) {
  const article = currentActiveArticles.find(a => a.id === articleId);
  if (!article) return;

  const backdrop = document.getElementById('article-modal');
  if (!backdrop) return;

  const coverImg = document.getElementById('modal-cover');
  if (coverImg) {
    if (article.coverImage) {
      coverImg.src = article.coverImage;
      coverImg.alt = article.title;
      coverImg.style.display = 'block';
    } else {
      coverImg.style.display = 'none';
    }
  }

  const metaEl = document.getElementById('modal-meta');
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="cat ${article.catClass || 'cat-algebra'}">${article.category}</span>
      <span class="meta-dot"></span>
      <span style="font-size:0.8rem; color:var(--text-3);">
        ${formatDate(article.publishDate)} · ${article.readingTime || '5 min read'} · Oleh ${article.author || 'Bu Khusnul Khotimah'}
      </span>
    `;
  }

  document.getElementById('modal-title').textContent   = article.title;
  document.getElementById('modal-content').innerHTML   = article.content || '<p>Konten belum tersedia.</p>';

  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('modal-close').focus();
}

function closeModal() {
  const backdrop = document.getElementById('article-modal');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
}

function setupModal() {
  const backdrop = document.getElementById('article-modal');
  const closeBtn = document.getElementById('modal-close');
  if (!backdrop || !closeBtn) return;

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && backdrop.classList.contains('open')) closeModal();
  });
}

function setupReadTriggers() {
  document.addEventListener('click', e => {
    const trigger = e.target.closest('.read-trigger');
    if (!trigger) return;
    const id = trigger.dataset.id;
    if (id) openModal(id);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const trigger = e.target.closest('.read-trigger');
      if (!trigger) return;
      e.preventDefault();
      const id = trigger.dataset.id;
      if (id) openModal(id);
    }
  });
}

/* ─── Contact Form ────────────────────────────────────────────────── */

function setupContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name  = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    if (!name || !email) { showToast('Harap isi nama dan email Anda.'); return; }
    form.reset();
    showToast('Pesan terkirim. Terima kasih telah menghubungi!');
  });
}

/* ─── Toast ───────────────────────────────────────────────────────── */

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

/* ─── Mobile Navigation ───────────────────────────────────────────── */

function setupMobileNav() {
  const btn   = document.getElementById('nav-mobile-btn');
  const links = document.getElementById('nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

/* ─── Smooth Scroll ───────────────────────────────────────────────── */

function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
      const id = this.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
}

/* ─── ScrollSpy & Header Shadow ───────────────────────────────────── */

function setupScrollSpyAndHeader() {
  const header   = document.querySelector('.site-header');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 20);

    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 100;
      if (window.scrollY >= top && window.scrollY < top + section.offsetHeight) {
        current = section.getAttribute('id');
      }
    });

    if (current) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) link.classList.add('active');
      });
    }
  });
}

/* ─── Synchronize Page (re-fetch from Firestore) ─────────────────── */

async function refreshPageContent() {
  const publishedArticles = await getPublishedArticles();
  currentActiveArticles   = publishedArticles;

  renderFeaturedArticle(publishedArticles);
  renderLatestArticles(publishedArticles);
  renderPopularArticles(publishedArticles);
}

/* ─── Init ────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  await refreshPageContent();

  setupModal();
  setupReadTriggers();
  setupContactForm();
  setupMobileNav();
  setupSmoothScroll();
  setupScrollSpyAndHeader();

  // Re-fetch when tab regains focus
  window.addEventListener('focus', refreshPageContent);
});
