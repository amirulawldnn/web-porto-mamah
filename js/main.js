/**
 * main.js â€” Public Homepage Controller
 * =========================================================================
 * Reads article data dynamically:
 * - Automatically seeds localStorage from static ARTICLES if empty on first load.
 * - Reads from localStorage ('msm_articles') and filters only 'published' articles.
 * - Listens for window 'storage' events so real-time CRUD updates in the dashboard
 *   instantly re-render the public landing page!
 *
 * Renders: featured article, latest articles, popular articles, resource grid, topic chips.
 * Handles: article modal reader, contact form, mobile menu navigation.
 */

'use strict';

/* â”€â”€â”€ Data Layer: Retrieve Published Articles with Auto-Seed â”€â”€â”€â”€â”€â”€â”€â”€ */

function seedIfEmpty() {
  try {
    if (localStorage.getItem('msm_articles') === null && typeof ARTICLES !== 'undefined' && Array.isArray(ARTICLES)) {
      const seeded = ARTICLES.map(a => ({
        id:             a.id,
        title:          a.title            || 'Untitled',
        slug:           a.slug             || (a.title || '').toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-'),
        coverImage:     a.coverImage       || '',
        category:       a.category         || '',
        catClass:       a.catClass         || 'cat-algebra',
        author:         a.author           || 'Bu Khusnul Khotimah',
        publishDate:    a.publishDate      || new Date().toISOString().slice(0, 10),
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
        createdAt:      a.publishDate      || new Date().toISOString().slice(0, 10),
        updatedAt:      a.publishDate      || new Date().toISOString().slice(0, 10),
      }));
      localStorage.setItem('msm_articles', JSON.stringify(seeded));
    }
  } catch (e) {
    console.warn('LocalStorage error during seed check:', e);
  }
}

function getPublishedArticles() {
  seedIfEmpty();

  try {
    const raw = localStorage.getItem('msm_articles');
    if (raw) {
      const all = JSON.parse(raw);
      if (Array.isArray(all) && all.length > 0) {
        return all.filter(a => a.status === 'published');
      }
    }
  } catch (e) {
    console.warn('LocalStorage error, falling back to static articles:', e);
  }

  // Fallback to static ARTICLES from js/articles.js
  if (typeof ARTICLES !== 'undefined' && Array.isArray(ARTICLES)) {
    return ARTICLES;
  }

  return [];
}

/* â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Format ISO date to "Aug 1, 2026" */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Build a meta row HTML string */
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

/* â”€â”€â”€ Data Selectors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
  return [...articles]
    .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
    .slice(0, count);
}

function getPopularArticles(articles, count = 3) {
  const popular = articles.filter(a => a.popular);
  if (popular.length > 0) {
    return popular.slice(0, count);
  }
  return articles.slice(0, count);
}

function getAllArticlesSorted(articles) {
  return [...articles].sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
}

/* â”€â”€â”€ Render: Featured Article (Center Editorial Column) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function renderFeaturedArticle(articles) {
  const article = getFeaturedArticle(articles);
  const el = document.getElementById('featured-article');
  if (!el) return;

  if (!article) {
    el.innerHTML = '<p style="color:var(--text-3); padding:20px;">No featured article published yet.</p>';
    return;
  }

  el.innerHTML = `
    ${article.coverImage ? `
      <img
        class="feature-image"
        src="${article.coverImage}"
        alt="${article.title}"
        loading="lazy"
      />
    ` : ''}
    <div class="feature-meta">${metaHTML(article)}</div>
    <h2 class="feature-title">${article.title}</h2>
    <p class="feature-excerpt">${article.excerpt || ''}</p>
    <button class="btn btn--ghost read-trigger" data-id="${article.id}">
      Read Article
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>
  `;
}

/* â”€â”€â”€ Render: Latest Articles (Left Editorial Column) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function renderLatestArticles(articles) {
  const latest = getLatestArticles(articles, 2);
  const el = document.getElementById('latest-articles');
  if (!el) return;

  if (latest.length === 0) {
    el.innerHTML = '<p style="color:var(--text-3); font-size:0.9rem;">No articles available.</p>';
    return;
  }

  el.innerHTML = latest.map(art => `
    <div class="article-stub read-trigger" data-id="${art.id}" role="button" tabindex="0"
         aria-label="Read: ${art.title}">
      <span class="cat ${art.catClass || 'cat-algebra'}">${art.category}</span>
      ${metaHTML(art)}
      <h3 class="stub-title">${art.title}</h3>
      <p class="stub-excerpt">${art.excerpt || ''}</p>
      <span class="btn btn--ghost">
        Read Article
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </span>
    </div>
  `).join('');
}

/* â”€â”€â”€ Render: Popular Articles (Right Editorial Column) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function renderPopularArticles(articles) {
  const popular = getPopularArticles(articles, 3);
  const el = document.getElementById('popular-articles');
  if (!el) return;

  if (popular.length === 0) {
    el.innerHTML = '<p style="color:var(--text-3); font-size:0.88rem;">No popular articles available.</p>';
    return;
  }

  el.innerHTML = popular.map(art => `
    <div class="popular-item read-trigger" data-id="${art.id}" role="button" tabindex="0"
         aria-label="Read: ${art.title}">
      ${art.coverImage ? `
        <img class="popular-thumb" src="${art.coverImage}" alt="${art.title}" loading="lazy" />
      ` : '<div class="popular-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--surface);">ðŸ“„</div>'}
      <div>
        <p class="popular-title">${art.title}</p>
        <span class="popular-date">${formatDate(art.publishDate)}</span>
      </div>
    </div>
  `).join('');
}

/* â”€â”€â”€ Render: Article Grid (Learning Resources Section) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function renderArticleGrid(articles) {
  const el = document.getElementById('article-grid');
  if (!el) return;

  if (articles.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <h3>No articles found</h3>
        <p>Try a different topic filter above.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = articles.map(art => `
    <article class="article-card read-trigger" data-id="${art.id}"
             role="button" tabindex="0" aria-label="Read: ${art.title}">
      ${art.coverImage ? `
        <img
          class="article-card-image"
          src="${art.coverImage}"
          alt="${art.title}"
          loading="lazy"
        />
      ` : ''}
      <span class="cat ${art.catClass || 'cat-algebra'}">${art.category}</span>
      ${metaHTML(art)}
      <h3 class="article-card-title">${art.title}</h3>
      <p class="article-card-excerpt">${art.excerpt || ''}</p>
      <span class="btn btn--ghost" style="margin-top: auto;">
        Read Article
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </span>
    </article>
  `).join('');
}

/* â”€â”€â”€ Topic Filter Chips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function buildTopicCounts(articles) {
  const counts = { All: articles.length };
  articles.forEach(art => {
    const tags = Array.isArray(art.tags) ? art.tags : [];
    tags.forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });
  return counts;
}

function setupTopicFilter(articles) {
  const bar = document.getElementById('topics-bar');
  if (!bar) return;

  const counts = buildTopicCounts(articles);
  const allTags = ['All', ...new Set(articles.flatMap(a => Array.isArray(a.tags) ? a.tags : []))];

  bar.innerHTML = allTags.map((tag, i) => `
    <button class="topic-btn ${i === 0 ? 'active' : ''}" data-filter="${tag}">
      ${tag}
      <span class="topic-count">${counts[tag] || 0}</span>
    </button>
  `).join('');

  bar.onclick = null; // reset handler
  bar.addEventListener('click', e => {
    const btn = e.target.closest('.topic-btn');
    if (!btn) return;

    bar.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    const all = getAllArticlesSorted(articles);

    if (filter === 'All') {
      renderArticleGrid(all);
    } else {
      const filtered = all.filter(a => Array.isArray(a.tags) && a.tags.includes(filter));
      renderArticleGrid(filtered);
    }

    const gridSection = document.getElementById('resources-section');
    if (gridSection) {
      gridSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

/* â”€â”€â”€ Article Modal Reader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
      <span style="font-size:0.8rem; color:var(--text-3);">${formatDate(article.publishDate)} Â· ${article.readingTime || '5 min read'} Â· By ${article.author || 'Bu Khusnul Khotimah'}</span>
    `;
  }

  document.getElementById('modal-title').textContent = article.title;
  document.getElementById('modal-content').innerHTML = article.content || '<p>No content available.</p>';

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

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeModal();
  });

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

/* â”€â”€â”€ Contact Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function setupContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name  = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();

    if (!name || !email) {
      showToast('Please fill in your name and email.');
      return;
    }

    form.reset();
    showToast('Message sent. Thank you for reaching out!');
  });
}

/* â”€â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

/* â”€â”€â”€ Mobile Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function setupMobileNav() {
  const btn   = document.getElementById('nav-mobile-btn');
  const links = document.getElementById('nav-links');
  if (!btn || !links) return;

  btn.addEventListener('click', () => links.classList.toggle('open'));

  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

/* â”€â”€â”€ Smooth Scroll â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* â”€â”€â”€ Synchronize Page Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function refreshPageContent() {
  const publishedArticles = getPublishedArticles();
  currentActiveArticles = publishedArticles;
  const sortedArticles = getAllArticlesSorted(publishedArticles);

  renderFeaturedArticle(publishedArticles);
  renderLatestArticles(publishedArticles);
  renderPopularArticles(publishedArticles);
  renderArticleGrid(sortedArticles);
  setupTopicFilter(publishedArticles);
}

/* â”€â”€â”€ ScrollSpy & Header Shadow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function setupScrollSpyAndHeader() {
  const header = document.querySelector('.site-header');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    // Header shadow on scroll
    if (header) {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }

    // ScrollSpy active link highlight
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      const sectionHeight = section.offsetHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    if (current) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
          link.classList.add('active');
        }
      });
    }
  });
}

/* â”€â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

document.addEventListener('DOMContentLoaded', () => {
  refreshPageContent();

  // Modal and interactions
  setupModal();
  setupReadTriggers();
  setupContactForm();
  setupMobileNav();
  setupSmoothScroll();
  setupScrollSpyAndHeader();

  // Real-time synchronization when CRUD changes happen in dashboard (multi-tab / cross-window)
  window.addEventListener('storage', (e) => {
    if (e.key === 'msm_articles' || e.key === 'msm_categories') {
      refreshPageContent();
    }
  });

  // Re-sync when page regains focus
  window.addEventListener('focus', () => {
    refreshPageContent();
  });
});
