/**
 * dashboard.js â€” CMS Application Controller
 * ==========================================
 * Single-page admin app for Bu Khusnul Khotimah's educational portfolio.
 * Requires: store.js (loaded before this file)
 *
 * Access URL: /dashboard.html  (not linked from public site)
 * Default credentials:
 *   Username: admin
 *   Password: mitchell2026
 *
 * Architecture:
 *   AUTH     â€” login/logout/session
 *   ROUTER   â€” hash-based view routing
 *   VIEWS    â€” overview, articles, article editor, categories, images
 *   RTE      â€” rich text editor (contenteditable + execCommand)
 *   MODALS   â€” confirm, image picker, add category
 *   TOAST    â€” notification system
 */

'use strict';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 1 â€” Constants & App State
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const CREDENTIALS = { username: 'admin', password: 'admin123' };
const SESSION_KEY  = 'msm_session';
const SESSION_TTL  = 8 * 60 * 60 * 1000; // 8 hours

let AppState = {
  view:        'overview',
  editId:      null,
  artFilter:   { search: '', category: '', status: '' },
  imgFilter:   '',
  rte:         null,
  pickerCb:    null,   // callback for image picker
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 2 â€” Auth
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function isLoggedIn() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    return s.ok && (Date.now() < s.exp);
  } catch { return false; }
}

function doLogin(u, p) {
  if (u === CREDENTIALS.username && p === CREDENTIALS.password) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, exp: Date.now() + SESSION_TTL }));
    return true;
  }
  return false;
}

function doLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  showLoginScreen();
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 3 â€” Screen Switching
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').classList.remove('show');
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.add('show');
  seedArticlesFromStatic();   // seed on first visit
  Categories.getAll();        // ensure defaults seeded
  Images.getAll();            // ensure defaults seeded
  router();
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 4 â€” Router
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function router() {
  const hash  = location.hash.slice(1) || 'overview';
  const parts = hash.split('/');
  const view  = parts[0];
  const param = parts[1];

  AppState.view   = view;
  AppState.editId = param || null;

  // Update sidebar active state
  document.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });

  switch (view) {
    case 'overview':      renderOverview();              break;
    case 'articles':      renderArticleList();           break;
    case 'article-new':   renderArticleEditor(null);     break;
    case 'article-edit':  renderArticleEditor(param);    break;
    case 'categories':    renderCategories();            break;
    case 'images':        renderImages();                break;
    default:              renderOverview();
  }
}

function navigate(path) {
  location.hash = path;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 5 â€” Utility
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return 'â€”';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function setContent(html) {
  document.getElementById('content-area').innerHTML = html;
}

function setTopbar(title, actionsHtml = '') {
  document.getElementById('topbar-title').textContent   = title;
  document.getElementById('topbar-actions').innerHTML   = actionsHtml;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 6 â€” Overview View
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function renderOverview() {
  setTopbar('Dashboard');

  const all       = Articles.getAll();
  const pub       = all.filter(a => a.status === 'published').length;
  const draft     = all.filter(a => a.status === 'draft').length;
  const cats      = Categories.getAll().length;
  const recent    = all.slice(0, 6);

  setContent(`
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total Articles</div>
        <div class="stat-value">${all.length}</div>
        <div class="stat-sub">All time</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Published</div>
        <div class="stat-value">${pub}</div>
        <div class="stat-sub">Live on website</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Drafts</div>
        <div class="stat-value">${draft}</div>
        <div class="stat-sub">Not yet published</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Categories</div>
        <div class="stat-value">${cats}</div>
        <div class="stat-sub">Active topics</div>
      </div>
    </div>

    <div class="section-header">
      <h2 class="section-h">Recent Articles</h2>
      <button class="btn btn-primary btn-sm" onclick="navigate('#article-new')">+ New Article</button>
    </div>

    <div class="table-wrap">
      <table class="dash-table">
        <thead>
          <tr>
            <th>Article</th>
            <th>Category</th>
            <th>Status</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${recent.length === 0
            ? `<tr><td colspan="5" class="table-empty">No articles yet. <button class="btn btn-ghost btn-sm" onclick="navigate('#article-new')">Create your first â†’</button></td></tr>`
            : recent.map(a => `
              <tr>
                <td style="display:flex;align-items:center;gap:12px;">
                  ${a.coverImage
                    ? `<img class="table-thumb" src="${escHtml(a.coverImage)}" alt="" onerror="this.style.display='none'">`
                    : `<div class="table-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;">ðŸ“„</div>`}
                  <div>
                    <div class="table-title">${escHtml(a.title)}</div>
                    <div class="table-excerpt">${escHtml(a.excerpt)}</div>
                  </div>
                </td>
                <td><span class="badge badge-featured" style="text-transform:none;">${escHtml(a.category)}</span></td>
                <td><span class="badge ${a.status === 'published' ? 'badge-published' : 'badge-draft'}">${a.status}</span></td>
                <td class="text-muted">${fmtDate(a.publishDate)}</td>
                <td class="table-actions">
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="navigate('#article-edit/${escHtml(a.id)}')" title="Edit">âœŽ</button>
                </td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>

    ${all.length > 6 ? `<div style="text-align:center;padding:16px 0;">
      <button class="btn btn-outline btn-sm" onclick="navigate('#articles')">View all ${all.length} articles â†’</button>
    </div>` : ''}
  `);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 7 â€” Article List View
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function renderArticleList() {
  setTopbar('Articles', `
    <button class="btn btn-primary btn-sm" onclick="navigate('#article-new')">+ New Article</button>
  `);

  const cats = Categories.getAll();

  setContent(`
    <div class="filter-bar">
      <input
        class="form-input filter-search"
        id="art-search"
        type="search"
        placeholder="Search articlesâ€¦"
        value="${escHtml(AppState.artFilter.search)}"
      />
      <select class="form-select" id="art-cat-filter" style="width:auto;">
        <option value="">All Categories</option>
        ${cats.map(c => `<option value="${escHtml(c.name)}" ${AppState.artFilter.category === c.name ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('')}
      </select>
      <select class="form-select" id="art-status-filter" style="width:auto;">
        <option value="">All Status</option>
        <option value="published" ${AppState.artFilter.status === 'published' ? 'selected' : ''}>Published</option>
        <option value="draft"     ${AppState.artFilter.status === 'draft'     ? 'selected' : ''}>Draft</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="dash-table">
        <thead>
          <tr>
            <th>Article</th>
            <th>Category</th>
            <th>Status</th>
            <th>Flags</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="art-list-body"></tbody>
      </table>
    </div>
  `);

  // Bind filter events
  document.getElementById('art-search').addEventListener('input', e => {
    AppState.artFilter.search = e.target.value;
    refreshArticleListBody();
  });
  document.getElementById('art-cat-filter').addEventListener('change', e => {
    AppState.artFilter.category = e.target.value;
    refreshArticleListBody();
  });
  document.getElementById('art-status-filter').addEventListener('change', e => {
    AppState.artFilter.status = e.target.value;
    refreshArticleListBody();
  });

  refreshArticleListBody();
}

function refreshArticleListBody() {
  const { search, category, status } = AppState.artFilter;
  const q = search.toLowerCase();

  let list = Articles.getAll().filter(a => {
    if (q && !a.title.toLowerCase().includes(q) && !a.excerpt.toLowerCase().includes(q)) return false;
    if (category && a.category !== category) return false;
    if (status   && a.status   !== status)   return false;
    return true;
  });

  const tbody = document.getElementById('art-list-body');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No articles match your filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => `
    <tr>
      <td style="display:flex;align-items:center;gap:12px;min-width:260px;">
        ${a.coverImage
          ? `<img class="table-thumb" src="${escHtml(a.coverImage)}" alt="" onerror="this.style.display='none'">`
          : `<div class="table-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;background:var(--c-bg);">ðŸ“„</div>`}
        <div>
          <div class="table-title">${escHtml(a.title)}</div>
          <div class="table-excerpt">${escHtml(a.excerpt)}</div>
        </div>
      </td>
      <td><span class="cat ${escHtml(a.catClass)}">${escHtml(a.category)}</span></td>
      <td><span class="badge ${a.status === 'published' ? 'badge-published' : 'badge-draft'}">${a.status}</span></td>
      <td style="white-space:nowrap;font-size:0.75rem;color:var(--c-text-3);">
        ${a.featured ? 'â­ Featured ' : ''}${a.popular ? 'ðŸ”¥ Popular ' : ''}${a.latest ? 'ðŸ†• Latest' : ''}
      </td>
      <td class="text-muted">${fmtDate(a.publishDate)}</td>
      <td class="table-actions">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="navigate('#article-edit/${escHtml(a.id)}')" title="Edit">âœŽ</button>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="toggleArticleStatus('${escHtml(a.id)}')" title="${a.status === 'published' ? 'Unpublish' : 'Publish'}">${a.status === 'published' ? 'â¸' : 'â–¶'}</button>
        <button class="btn btn-ghost btn-sm btn-icon" style="color:var(--c-danger);" onclick="confirmDeleteArticle('${escHtml(a.id)}')" title="Delete">ðŸ—‘</button>
      </td>
    </tr>
  `).join('');
}

function toggleArticleStatus(id) {
  const art = Articles.getById(id);
  if (!art) return;
  const next = art.status === 'published' ? 'draft' : 'published';
  Articles.update(id, { status: next, updatedAt: todayISO() });
  refreshArticleListBody();
  toast(`Article ${next === 'published' ? 'published' : 'moved to draft'}.`, 'success');
}

function confirmDeleteArticle(id) {
  const art = Articles.getById(id);
  if (!art) return;
  showConfirmModal(
    'Delete Article',
    `Are you sure you want to delete "<strong>${escHtml(art.title)}</strong>"? This cannot be undone.`,
    () => {
      Articles.remove(id);
      refreshArticleListBody();
      toast('Article deleted.', 'success');
    }
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 8 â€” Article Editor View
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function renderArticleEditor(id) {
  const art  = id ? Articles.getById(id) : null;
  const cats = Categories.getAll();
  const isNew = !art;

  setTopbar(
    isNew ? 'New Article' : 'Edit Article',
    `
      <button class="btn btn-outline btn-sm" onclick="navigate('#articles')">â† Back</button>
      <button class="btn btn-outline btn-sm" id="btn-save-draft">Save Draft</button>
      <button class="btn btn-primary btn-sm" id="btn-publish">Publish</button>
    `
  );

  const tagsStr = (art?.tags || []).join(', ');

  setContent(`
    <form id="article-form" onsubmit="return false;">
      <div class="editor-layout">

        <!-- LEFT: Main content -->
        <div class="editor-main">

          <!-- Title -->
          <input
            class="form-input title-input"
            type="text"
            id="f-title"
            placeholder="Article titleâ€¦"
            value="${escHtml(art?.title || '')}"
            autocomplete="off"
          />

          <!-- Slug -->
          <div class="section-card" style="padding:12px 16px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="text-muted">Slug:</span>
              <input
                class="form-input"
                type="text"
                id="f-slug"
                placeholder="auto-generated-from-title"
                value="${escHtml(art?.slug || '')}"
                style="flex:1;border:none;background:transparent;box-shadow:none;padding:2px 4px;font-family:monospace;font-size:0.88rem;"
              />
            </div>
          </div>

          <!-- Excerpt -->
          <div class="section-card">
            <div class="section-card-title">Short Excerpt</div>
            <textarea
              class="form-textarea"
              id="f-excerpt"
              rows="2"
              placeholder="A brief summary shown on article cards and search resultsâ€¦"
            >${escHtml(art?.excerpt || '')}</textarea>
          </div>

          <!-- Cover Image -->
          <div class="section-card">
            <div class="section-card-title">Cover Image</div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input
                class="form-input"
                type="text"
                id="f-cover"
                placeholder="Image URL or pathâ€¦"
                value="${escHtml(art?.coverImage || '')}"
                style="flex:1;"
              />
              <button type="button" class="btn btn-outline btn-sm" onclick="openImagePicker('cover')">Browse</button>
            </div>
            <img id="cover-preview" class="cover-preview ${art?.coverImage ? 'show' : ''}"
                 src="${escHtml(art?.coverImage || '')}" alt="Cover preview" />
          </div>

          <!-- Rich Text Editor -->
          <div class="section-card" style="padding:0;">
            <div class="rte-wrapper" id="rte-wrapper">
              <!-- Toolbar injected by initRTE() -->
            </div>
          </div>

        </div>

        <!-- RIGHT: Sidebar settings -->
        <div class="editor-sidebar">

          <!-- Status & Publish Date -->
          <div class="section-card">
            <div class="section-card-title">Publication</div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-select" id="f-status">
                <option value="draft"     ${(art?.status === 'draft'     || isNew) ? 'selected' : ''}>Draft</option>
                <option value="published" ${art?.status === 'published'            ? 'selected' : ''}>Published</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Publish Date</label>
              <input class="form-input" type="date" id="f-date"
                     value="${art?.publishDate || todayISO()}" />
            </div>
          </div>

          <!-- Category & Tags -->
          <div class="section-card">
            <div class="section-card-title">Classification</div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="form-select" id="f-category">
                <option value="">â€” Select â€”</option>
                ${cats.map(c => `<option value="${escHtml(c.name)}" ${art?.category === c.name ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Tags</label>
              <input class="form-input" type="text" id="f-tags"
                     placeholder="Algebra, Grade 8, Visual Learning"
                     value="${escHtml(tagsStr)}" />
              <div class="form-hint">Comma-separated list of tags</div>
            </div>
          </div>

          <!-- Homepage Display Flags -->
          <div class="section-card">
            <div class="section-card-title">Homepage Display</div>
            <div class="toggle-row">
              <div>
                <div class="toggle-label">Featured</div>
                <div class="toggle-desc">Main hero article on homepage</div>
              </div>
              <label class="toggle">
                <input type="checkbox" id="f-featured" ${art?.featured ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="toggle-row">
              <div>
                <div class="toggle-label">Latest</div>
                <div class="toggle-desc">Appears in Latest column</div>
              </div>
              <label class="toggle">
                <input type="checkbox" id="f-latest" ${art?.latest ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="toggle-row">
              <div>
                <div class="toggle-label">Popular</div>
                <div class="toggle-desc">Appears in Popular sidebar</div>
              </div>
              <label class="toggle">
                <input type="checkbox" id="f-popular" ${art?.popular ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <!-- SEO -->
          <div class="section-card">
            <div class="section-card-title">SEO</div>
            <div class="form-group">
              <label class="form-label">SEO Title</label>
              <input class="form-input" type="text" id="f-seo-title"
                     placeholder="Leave blank to use article title"
                     value="${escHtml(art?.seoTitle || '')}" />
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Meta Description</label>
              <textarea class="form-textarea" id="f-seo-desc" rows="3"
                        placeholder="Brief description for search enginesâ€¦">${escHtml(art?.seoDescription || '')}</textarea>
            </div>
          </div>

          <!-- Reading Time (auto) -->
          <div class="section-card" style="padding:12px 16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="text-muted">Estimated Read Time</span>
              <span id="read-time-display" style="font-weight:600;font-size:0.88rem;">${art?.readingTime || 'â€”'}</span>
            </div>
          </div>

        </div>
      </div>
    </form>
  `);

  // Init rich text editor
  AppState.rte = initRTE(
    document.getElementById('rte-wrapper'),
    art?.content || ''
  );

  // Auto-generate slug from title
  document.getElementById('f-title').addEventListener('input', e => {
    const slugInput = document.getElementById('f-slug');
    if (!art) slugInput.value = toSlug(e.target.value);
  });

  // Cover image preview on URL change
  document.getElementById('f-cover').addEventListener('input', e => {
    const preview = document.getElementById('cover-preview');
    preview.src = e.target.value;
    preview.classList.toggle('show', !!e.target.value);
  });

  // Auto-update reading time when content changes
  document.getElementById('rte-wrapper').addEventListener('input', () => {
    const content = AppState.rte.getContent();
    document.getElementById('read-time-display').textContent = calcReadTime(content);
  });

  // Topbar action buttons
  document.getElementById('btn-save-draft').onclick = () => saveArticle('draft');
  document.getElementById('btn-publish').onclick    = () => saveArticle('published');
}

function collectArticleForm(status) {
  const title    = document.getElementById('f-title').value.trim();
  const category = document.getElementById('f-category').value;

  if (!title)    { toast('Please enter a title.', 'error'); return null; }
  if (!category) { toast('Please select a category.', 'error'); return null; }

  const content = AppState.rte ? AppState.rte.getContent() : '';
  const tags    = document.getElementById('f-tags').value
                    .split(',').map(t => t.trim()).filter(Boolean);

  return {
    title,
    slug:           document.getElementById('f-slug').value.trim() || toSlug(title),
    excerpt:        document.getElementById('f-excerpt').value.trim(),
    coverImage:     document.getElementById('f-cover').value.trim(),
    category,
    catClass:       getCatClass(category),
    tags,
    featured:       document.getElementById('f-featured').checked,
    latest:         document.getElementById('f-latest').checked,
    popular:        document.getElementById('f-popular').checked,
    publishDate:    document.getElementById('f-date').value,
    status,
    content,
    readingTime:    calcReadTime(content),
    seoTitle:       document.getElementById('f-seo-title').value.trim(),
    seoDescription: document.getElementById('f-seo-desc').value.trim(),
    author:         'Bu Khusnul Khotimah',
    updatedAt:      todayISO(),
  };
}

function saveArticle(status) {
  const data = collectArticleForm(status);
  if (!data) return;

  if (AppState.editId) {
    Articles.update(AppState.editId, data);
    toast(`Article ${status === 'published' ? 'published' : 'saved as draft'}.`, 'success');
  } else {
    const created = Articles.add({ ...data, createdAt: todayISO() });
    AppState.editId = created.id;
    // Update URL without reload
    history.replaceState(null, '', `#article-edit/${created.id}`);
    toast('Article created!', 'success');
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 9 â€” Categories View
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function renderCategories() {
  setTopbar('Categories', `
    <button class="btn btn-primary btn-sm" onclick="openAddCategoryModal()">+ Add Category</button>
  `);

  rebuildCategoryTable();
}

function rebuildCategoryTable() {
  const cats    = Categories.getAll();
  const articles = Articles.getAll();

  setContent(`
    <div class="table-wrap">
      <div class="cat-list">
        ${cats.length === 0
          ? `<div class="table-empty">No categories yet.</div>`
          : cats.map(c => {
              const count = articles.filter(a => a.category === c.name).length;
              return `
                <div class="cat-row">
                  <div class="cat-name">${escHtml(c.name)}</div>
                  <div class="cat-slug">${escHtml(c.slug)}</div>
                  <div class="cat-count">${count} article${count !== 1 ? 's' : ''}</div>
                  <div class="table-actions">
                    <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditCategoryModal('${escHtml(c.id)}')" title="Edit">âœŽ</button>
                    <button class="btn btn-ghost btn-sm btn-icon" style="color:var(--c-danger);" onclick="confirmDeleteCategory('${escHtml(c.id)}')" title="Delete">ðŸ—‘</button>
                  </div>
                </div>
              `;
            }).join('')}
      </div>
    </div>
  `);
}

function openAddCategoryModal() {
  openModal('Add Category', `
    <div class="form-group">
      <label class="form-label">Name</label>
      <input class="form-input" type="text" id="cat-name-input" placeholder="e.g. Trigonometry" />
    </div>
    <div class="form-group">
      <label class="form-label">Slug <span class="text-muted">(auto-generated)</span></label>
      <input class="form-input" type="text" id="cat-slug-input" placeholder="trigonometry" />
    </div>
  `, [
    { label: 'Cancel', cls: 'btn-outline', action: closeModal },
    { label: 'Add Category', cls: 'btn-primary', action: () => {
      const name = document.getElementById('cat-name-input').value.trim();
      if (!name) { toast('Name is required.', 'error'); return; }
      const slug = document.getElementById('cat-slug-input').value.trim() || toSlug(name);
      Categories.add({ name, slug });
      closeModal();
      rebuildCategoryTable();
      toast('Category added.', 'success');
    }},
  ]);

  document.getElementById('cat-name-input').addEventListener('input', e => {
    document.getElementById('cat-slug-input').value = toSlug(e.target.value);
  });
  document.getElementById('cat-name-input').focus();
}

function openEditCategoryModal(id) {
  const cat = Categories.getById(id);
  if (!cat) return;

  openModal('Edit Category', `
    <div class="form-group">
      <label class="form-label">Name</label>
      <input class="form-input" type="text" id="cat-name-input" value="${escHtml(cat.name)}" />
    </div>
    <div class="form-group">
      <label class="form-label">Slug</label>
      <input class="form-input" type="text" id="cat-slug-input" value="${escHtml(cat.slug)}" />
    </div>
  `, [
    { label: 'Cancel', cls: 'btn-outline', action: closeModal },
    { label: 'Save', cls: 'btn-primary', action: () => {
      const name = document.getElementById('cat-name-input').value.trim();
      const slug = document.getElementById('cat-slug-input').value.trim();
      if (!name) { toast('Name is required.', 'error'); return; }
      Categories.update(id, { name, slug });
      closeModal();
      rebuildCategoryTable();
      toast('Category updated.', 'success');
    }},
  ]);
}

function confirmDeleteCategory(id) {
  const cat = Categories.getById(id);
  if (!cat) return;
  showConfirmModal('Delete Category', `Delete "<strong>${escHtml(cat.name)}</strong>"? Articles using this category will not be deleted.`, () => {
    Categories.remove(id);
    rebuildCategoryTable();
    toast('Category deleted.', 'success');
  });
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 10 â€” Images View
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function renderImages() {
  setTopbar('Images');

  setContent(`
    <!-- Upload zone -->
    <div class="upload-zone" id="upload-zone" onclick="document.getElementById('file-upload-input').click()">
      <div class="upload-zone-title">Click to upload images</div>
      <div class="upload-zone-sub">PNG, JPG, GIF, WebP â€” stored locally in your browser</div>
    </div>
    <input type="file" id="file-upload-input" accept="image/*" multiple />

    <!-- Add by URL -->
    <div class="url-add-row">
      <input class="form-input" type="url" id="img-url-input" placeholder="Or paste an image URLâ€¦" />
      <input class="form-input" type="text" id="img-name-input" placeholder="Image name" style="max-width:180px;" />
      <button class="btn btn-outline btn-sm" onclick="addImageByUrl()">Add URL</button>
    </div>

    <!-- Image grid -->
    <div class="image-grid" id="image-grid"></div>
  `);

  refreshImageGrid();

  // File upload handler
  document.getElementById('file-upload-input').addEventListener('change', handleFileUpload);

  // Drag-and-drop on upload zone
  const zone = document.getElementById('upload-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag');
    handleFiles(e.dataTransfer.files);
  });
}

function refreshImageGrid() {
  const grid = document.getElementById('image-grid');
  if (!grid) return;
  const imgs = Images.getAll();

  if (imgs.length === 0) {
    grid.innerHTML = `<p class="text-muted">No images yet.</p>`;
    return;
  }

  grid.innerHTML = imgs.map(img => `
    <div class="image-card">
      <img class="image-card-thumb" src="${escHtml(img.url)}" alt="${escHtml(img.name)}" loading="lazy"
           onerror="this.style.background='var(--c-bg)'; this.style.height='60px';" />
      <div class="image-card-overlay">
        <button class="btn btn-ghost btn-sm btn-icon" style="color:#fff;background:rgba(255,255,255,0.15);"
                onclick="copyImageUrl('${escHtml(img.url)}')" title="Copy URL">âŽ˜</button>
        ${img.type !== 'system' ? `
          <button class="btn btn-ghost btn-sm btn-icon" style="color:#ff9999;background:rgba(255,255,255,0.15);"
                  onclick="confirmDeleteImage('${escHtml(img.id)}')" title="Delete">ðŸ—‘</button>
        ` : ''}
      </div>
      <div class="image-card-info">
        <div class="image-card-name">${escHtml(img.name)}</div>
        <div class="image-card-type">${img.type === 'system' ? 'System' : 'Uploaded'}</div>
      </div>
    </div>
  `).join('');
}

function handleFileUpload(e) {
  handleFiles(e.target.files);
  e.target.value = '';
}

function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      Images.add({ name: file.name, url: e.target.result, type: 'uploaded', addedAt: todayISO() });
      refreshImageGrid();
      toast(`Image "${file.name}" uploaded.`, 'success');
    };
    reader.readAsDataURL(file);
  });
}

function addImageByUrl() {
  const url  = document.getElementById('img-url-input').value.trim();
  const name = document.getElementById('img-name-input').value.trim() || url.split('/').pop() || 'image';
  if (!url) { toast('Please enter an image URL.', 'error'); return; }
  Images.add({ name, url, type: 'url', addedAt: todayISO() });
  document.getElementById('img-url-input').value  = '';
  document.getElementById('img-name-input').value = '';
  refreshImageGrid();
  toast('Image added.', 'success');
}

function copyImageUrl(url) {
  navigator.clipboard?.writeText(url).then(() => toast('URL copied!', 'success'));
}

function confirmDeleteImage(id) {
  const img = Images.getById(id);
  if (!img) return;
  showConfirmModal('Delete Image', `Delete image "<strong>${escHtml(img.name)}</strong>"?`, () => {
    Images.remove(id);
    refreshImageGrid();
    toast('Image deleted.', 'success');
  });
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 11 â€” Rich Text Editor (RTE)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function initRTE(wrapper, initialContent) {
  if (!wrapper) return null;

  wrapper.innerHTML = `
    <div class="rte-toolbar" id="rte-toolbar">
      <!-- Format -->
      <select class="rte-format-select" id="rte-format" title="Block format">
        <option value="p">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="blockquote">Quote</option>
        <option value="pre">Code Block</option>
      </select>

      <div class="rte-sep"></div>

      <!-- Inline formatting -->
      <button type="button" class="rte-btn" data-cmd="bold"           title="Bold"><b>B</b></button>
      <button type="button" class="rte-btn" data-cmd="italic"         title="Italic"><em>I</em></button>
      <button type="button" class="rte-btn" data-cmd="underline"      title="Underline"><u>U</u></button>

      <div class="rte-sep"></div>

      <!-- Lists -->
      <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Bullet List">â‰¡</button>
      <button type="button" class="rte-btn" data-cmd="insertOrderedList"   title="Numbered List">1.</button>

      <div class="rte-sep"></div>

      <!-- Alignment -->
      <button type="button" class="rte-btn" data-cmd="justifyLeft"    title="Align Left">â¬¡L</button>
      <button type="button" class="rte-btn" data-cmd="justifyCenter"  title="Align Center">â¬¡C</button>
      <button type="button" class="rte-btn" data-cmd="justifyRight"   title="Align Right">â¬¡R</button>

      <div class="rte-sep"></div>

      <!-- Insert -->
      <button type="button" class="rte-btn" id="rte-link"  title="Insert Link">ðŸ”— Link</button>
      <button type="button" class="rte-btn" id="rte-img"   title="Insert Image">ðŸ“· Image</button>
      <button type="button" class="rte-btn" id="rte-table" title="Insert Table">âŠž Table</button>
      <button type="button" class="rte-btn" id="rte-hr"    title="Horizontal Rule">â€” Rule</button>
    </div>

    <div
      class="rte-body"
      id="rte-body"
      contenteditable="true"
      spellcheck="true"
      aria-label="Article content editor"
    ></div>
  `;

  const body = wrapper.querySelector('#rte-body');
  body.innerHTML = initialContent || '<p><br></p>';

  // Block format dropdown
  wrapper.querySelector('#rte-format').addEventListener('change', function () {
    const tag = this.value;
    body.focus();
    if (tag === 'pre') {
      rteInsertBlock('<pre><br></pre>');
    } else {
      document.execCommand('formatBlock', false, `<${tag}>`);
    }
    this.value = 'p'; // reset selector
  });

  // Inline command buttons
  wrapper.querySelectorAll('.rte-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      body.focus();
      document.execCommand(btn.dataset.cmd, false, null);
      body.focus();
    });
  });

  // Link
  wrapper.querySelector('#rte-link').addEventListener('click', () => {
    const url = prompt('Enter URL:');
    if (url) { body.focus(); document.execCommand('createLink', false, url); }
  });

  // Image (opens image picker)
  wrapper.querySelector('#rte-img').addEventListener('click', () => {
    openImagePicker('rte');
  });

  // Table
  wrapper.querySelector('#rte-table').addEventListener('click', () => {
    const rows = parseInt(prompt('Number of rows:', '3') || '3');
    const cols = parseInt(prompt('Number of columns:', '3') || '3');
    if (rows > 0 && cols > 0) {
      const header = `<tr>${Array(cols).fill('<th>Header</th>').join('')}</tr>`;
      const rowsHtml = Array(rows - 1).fill(`<tr>${Array(cols).fill('<td>Cell</td>').join('')}</tr>`).join('');
      rteInsertBlock(`<table>${header}${rowsHtml}</table>`);
    }
  });

  // Horizontal rule
  wrapper.querySelector('#rte-hr').addEventListener('click', () => {
    body.focus();
    document.execCommand('insertHorizontalRule');
  });

  return {
    getContent: () => body.innerHTML,
    setContent: (html) => { body.innerHTML = html || '<p><br></p>'; },
    focus:      () => body.focus(),
  };
}

function rteInsertBlock(html) {
  const body = document.getElementById('rte-body');
  if (!body) return;
  body.focus();
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.collapse(false);
    const el = document.createElement('div');
    el.innerHTML = html;
    const frag = document.createDocumentFragment();
    let last;
    while (el.firstChild) {
      last = frag.appendChild(el.firstChild);
    }
    range.insertNode(frag);
    if (last) {
      const r = range.cloneRange();
      r.setStartAfter(last);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  } else {
    body.innerHTML += html;
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 12 â€” Image Picker Modal
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/**
 * Open image picker.
 * target: 'cover' = sets cover image input
 *         'rte'   = embeds <img> at cursor in RTE
 */
function openImagePicker(target) {
  const imgs = Images.getAll();

  openModal('Select Image', `
    <div class="img-picker-grid" id="img-picker-grid">
      ${imgs.map(img => `
        <div class="img-picker-item" data-url="${escHtml(img.url)}" data-name="${escHtml(img.name)}">
          <img src="${escHtml(img.url)}" alt="${escHtml(img.name)}" loading="lazy"
               onerror="this.style.display='none'" />
          <div class="img-picker-item-name">${escHtml(img.name)}</div>
        </div>
      `).join('')}
    </div>
  `, [
    { label: 'Cancel', cls: 'btn-outline', action: closeModal },
  ], true /* large modal */);

  // Bind item clicks
  document.querySelectorAll('.img-picker-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      if (target === 'cover') {
        document.getElementById('f-cover').value = url;
        const preview = document.getElementById('cover-preview');
        if (preview) { preview.src = url; preview.classList.add('show'); }
      } else if (target === 'rte' && AppState.rte) {
        const imgHtml = `<img src="${url}" alt="" style="max-width:100%;" />`;
        document.getElementById('rte-body').focus();
        rteInsertBlock(imgHtml);
      }
      closeModal();
      toast('Image selected.', 'success');
    });
  });
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 13 â€” Modal System
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function openModal(title, bodyHtml, buttons = [], large = false) {
  const overlay = document.getElementById('modal-overlay');
  overlay.querySelector('.modal-box').className = `modal-box${large ? ' modal-lg' : ''}`;
  overlay.querySelector('#modal-title').textContent = title;
  overlay.querySelector('#modal-body').innerHTML    = bodyHtml;

  const footer = overlay.querySelector('#modal-footer');
  footer.innerHTML = buttons.map((b, i) =>
    `<button class="btn ${b.cls}" id="modal-btn-${i}">${b.label}</button>`
  ).join('');

  buttons.forEach((b, i) => {
    document.getElementById(`modal-btn-${i}`).addEventListener('click', b.action);
  });

  overlay.classList.add('open');
}

function showConfirmModal(title, message, onConfirm) {
  openModal(title, `<p style="line-height:1.6;">${message}</p>`, [
    { label: 'Cancel',  cls: 'btn-outline', action: closeModal },
    { label: 'Confirm', cls: 'btn-danger',  action: () => { onConfirm(); closeModal(); } },
  ]);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 14 â€” Toast Notifications
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function toast(message, type = 'default') {
  const stack = document.getElementById('toast-stack');
  const el    = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 15 â€” Login Form Handler
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function setupLogin() {
  const form  = document.getElementById('login-form');
  const err   = document.getElementById('login-error');

  form.addEventListener('submit', e => {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    if (doLogin(u, p)) {
      err.classList.remove('show');
      showApp();
    } else {
      err.textContent = 'Incorrect username or password.';
      err.classList.add('show');
      document.getElementById('login-password').value = '';
      document.getElementById('login-password').focus();
    }
  });
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 16 â€” Sidebar Nav
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function setupSidebarNav() {
  document.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.addEventListener('click', () => {
      navigate(`#${el.dataset.view}`);
    });
  });
  document.getElementById('logout-btn').addEventListener('click', doLogout);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION 17 â€” Init
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

document.addEventListener('DOMContentLoaded', () => {
  setupLogin();
  setupSidebarNav();

  // Modal close button & backdrop click
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  // Keyboard: Escape closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Route on hash change
  window.addEventListener('hashchange', () => {
    if (isLoggedIn()) router();
  });

  // Check if already logged in
  if (isLoggedIn()) {
    showApp();
  } else {
    showLoginScreen();
    document.getElementById('login-username').focus();
  }
});
