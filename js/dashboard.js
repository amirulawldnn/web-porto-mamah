/**
 * dashboard.js — CMS Application Controller (Firebase Firestore)
 * ===============================================================
 * All CRUD operations are async (Firestore).
 * Auth: session-based (sessionStorage).
 * Images: still localStorage (can be large base64 blobs).
 *
 * Access URL: /dashboard.html  (not linked from public site)
 * Credentials: admin / admin123
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 1 — Constants & App State
   ═══════════════════════════════════════════════════════════════════════ */

const CREDENTIALS = { username: 'admin', password: 'admin123' };
const SESSION_KEY  = 'msm_session';
const SESSION_TTL  = 8 * 60 * 60 * 1000; // 8 hours

let AppState = {
  view:      'overview',
  editId:    null,
  artFilter: { search: '', category: '', status: '' },
  rte:       null,
};

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 2 — Auth
   ═══════════════════════════════════════════════════════════════════════ */

function isLoggedIn() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    return s.ok && Date.now() < s.exp;
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

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 3 — Screen Switching
   ═══════════════════════════════════════════════════════════════════════ */

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').classList.remove('show');
}

async function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.add('show');

  // Seed Firestore on first visit
  await seedArticlesFromStatic();
  await seedCategoriesFromDefault();

  router();
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 4 — Router
   ═══════════════════════════════════════════════════════════════════════ */

async function router() {
  const hash  = location.hash.slice(1) || 'overview';
  const parts = hash.split('/');
  const view  = parts[0];
  const param = parts[1];

  AppState.view   = view;
  AppState.editId = param || null;

  document.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });

  showLoading();

  switch (view) {
    case 'overview':     await renderOverview();           break;
    case 'articles':     await renderArticleList();        break;
    case 'article-new':  await renderArticleEditor(null);  break;
    case 'article-edit': await renderArticleEditor(param); break;
    case 'categories':   await renderCategories();         break;
    case 'images':            renderImages();              break;
    default:             await renderOverview();
  }
}

function navigate(path) {
  location.hash = path;
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 5 — Utility
   ═══════════════════════════════════════════════════════════════════════ */

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' });
}

function setContent(html) {
  document.getElementById('content-area').innerHTML = html;
}

function showLoading() {
  document.getElementById('content-area').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;padding:80px;color:var(--c-text-3);">
      <span style="font-size:1.4rem;">⏳ Memuat...</span>
    </div>
  `;
}

function setTopbar(title, actionsHtml = '') {
  document.getElementById('topbar-title').textContent = title;
  document.getElementById('topbar-actions').innerHTML  = actionsHtml;
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 6 — Overview View
   ═══════════════════════════════════════════════════════════════════════ */

async function renderOverview() {
  setTopbar('Dashboard');

  const [all, cats] = await Promise.all([
    Articles.getAll(),
    Categories.getAll(),
  ]);

  const pub    = all.filter(a => a.status === 'published').length;
  const draft  = all.filter(a => a.status === 'draft').length;
  const recent = all.slice(0, 6);

  setContent(`
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total Artikel</div>
        <div class="stat-value">${all.length}</div>
        <div class="stat-sub">Semua waktu</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Dipublikasikan</div>
        <div class="stat-value">${pub}</div>
        <div class="stat-sub">Tampil di website</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Draft</div>
        <div class="stat-value">${draft}</div>
        <div class="stat-sub">Belum dipublikasikan</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Kategori</div>
        <div class="stat-value">${cats.length}</div>
        <div class="stat-sub">Topik aktif</div>
      </div>
    </div>

    <div class="section-header">
      <h2 class="section-h">Artikel Terbaru</h2>
      <button class="btn btn-primary btn-sm" onclick="navigate('#article-new')">+ Artikel Baru</button>
    </div>

    <div class="table-wrap">
      <table class="dash-table">
        <thead>
          <tr><th>Artikel</th><th>Kategori</th><th>Status</th><th>Tanggal</th><th></th></tr>
        </thead>
        <tbody>
          ${recent.length === 0
            ? `<tr><td colspan="5" class="table-empty">Belum ada artikel. <button class="btn btn-ghost btn-sm" onclick="navigate('#article-new')">Buat sekarang →</button></td></tr>`
            : recent.map(a => `
              <tr>
                <td style="display:flex;align-items:center;gap:12px;">
                  ${a.coverImage
                    ? `<img class="table-thumb" src="${escHtml(a.coverImage)}" alt="" onerror="this.style.display='none'">`
                    : `<div class="table-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;">📄</div>`}
                  <div>
                    <div class="table-title">${escHtml(a.title)}</div>
                    <div class="table-excerpt">${escHtml(a.excerpt)}</div>
                  </div>
                </td>
                <td><span class="badge badge-featured">${escHtml(a.category)}</span></td>
                <td><span class="badge ${a.status === 'published' ? 'badge-published' : 'badge-draft'}">${a.status}</span></td>
                <td class="text-muted">${fmtDate(a.publishDate)}</td>
                <td class="table-actions">
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="navigate('#article-edit/${escHtml(a.id)}')" title="Edit">✎</button>
                </td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
  `);
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 7 — Article List View
   ═══════════════════════════════════════════════════════════════════════ */

async function renderArticleList() {
  setTopbar('Artikel', `
    <button class="btn btn-primary btn-sm" onclick="navigate('#article-new')">+ Artikel Baru</button>
  `);

  const [all, cats] = await Promise.all([Articles.getAll(), Categories.getAll()]);

  setContent(`
    <div class="filter-bar">
      <input class="form-input filter-search" id="art-search" type="search"
             placeholder="Cari artikel…" value="${escHtml(AppState.artFilter.search)}" />
      <select class="form-select" id="art-cat-filter" style="width:auto;">
        <option value="">Semua Kategori</option>
        ${cats.map(c => `<option value="${escHtml(c.name)}" ${AppState.artFilter.category === c.name ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('')}
      </select>
      <select class="form-select" id="art-status-filter" style="width:auto;">
        <option value="">Semua Status</option>
        <option value="published" ${AppState.artFilter.status === 'published' ? 'selected' : ''}>Dipublikasikan</option>
        <option value="draft"     ${AppState.artFilter.status === 'draft'     ? 'selected' : ''}>Draft</option>
      </select>
    </div>
    <div class="table-wrap">
      <table class="dash-table">
        <thead>
          <tr><th>Artikel</th><th>Kategori</th><th>Status</th><th>Flag</th><th>Tanggal</th><th>Aksi</th></tr>
        </thead>
        <tbody id="art-list-body"></tbody>
      </table>
    </div>
  `);

  renderArticleListBody(all);

  document.getElementById('art-search').addEventListener('input', e => {
    AppState.artFilter.search = e.target.value;
    renderArticleListBody(all);
  });
  document.getElementById('art-cat-filter').addEventListener('change', e => {
    AppState.artFilter.category = e.target.value;
    renderArticleListBody(all);
  });
  document.getElementById('art-status-filter').addEventListener('change', e => {
    AppState.artFilter.status = e.target.value;
    renderArticleListBody(all);
  });
}

function renderArticleListBody(all) {
  const { search, category, status } = AppState.artFilter;
  const q = search.toLowerCase();

  const list = all.filter(a => {
    if (q && !a.title.toLowerCase().includes(q) && !(a.excerpt||'').toLowerCase().includes(q)) return false;
    if (category && a.category !== category) return false;
    if (status   && a.status   !== status)   return false;
    return true;
  });

  const tbody = document.getElementById('art-list-body');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Tidak ada artikel yang cocok.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => `
    <tr>
      <td style="display:flex;align-items:center;gap:12px;min-width:260px;">
        ${a.coverImage
          ? `<img class="table-thumb" src="${escHtml(a.coverImage)}" alt="" onerror="this.style.display='none'">`
          : `<div class="table-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;background:var(--c-bg);">📄</div>`}
        <div>
          <div class="table-title">${escHtml(a.title)}</div>
          <div class="table-excerpt">${escHtml(a.excerpt)}</div>
        </div>
      </td>
      <td><span class="badge badge-featured" style="text-transform:none;">${escHtml(a.category)}</span></td>
      <td><span class="badge ${a.status === 'published' ? 'badge-published' : 'badge-draft'}">${a.status}</span></td>
      <td style="white-space:nowrap;font-size:0.75rem;color:var(--c-text-3);">
        ${a.featured ? '⭐ ' : ''}${a.popular ? '🔥 ' : ''}${a.latest ? '🆕' : ''}
      </td>
      <td class="text-muted">${fmtDate(a.publishDate)}</td>
      <td class="table-actions">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="navigate('#article-edit/${escHtml(a.id)}')" title="Edit">✎</button>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="toggleArticleStatus('${escHtml(a.id)}','${a.status}')" title="${a.status === 'published' ? 'Jadikan Draft' : 'Publikasikan'}">${a.status === 'published' ? '⏸' : '▶'}</button>
        <button class="btn btn-ghost btn-sm btn-icon" style="color:var(--c-danger);" onclick="confirmDeleteArticle('${escHtml(a.id)}','${escHtml(a.title)}')" title="Hapus">🗑</button>
      </td>
    </tr>
  `).join('');
}

async function toggleArticleStatus(id, currentStatus) {
  const next = currentStatus === 'published' ? 'draft' : 'published';
  try {
    await Articles.update(id, { status: next, updatedAt: todayISO() });
    toast(`Artikel ${next === 'published' ? 'dipublikasikan' : 'dijadikan draft'}.`, 'success');
    await renderArticleList();
  } catch (e) {
    toast('Gagal mengubah status artikel.', 'error');
  }
}

function confirmDeleteArticle(id, title) {
  showConfirmModal(
    'Hapus Artikel',
    `Yakin ingin menghapus "<strong>${escHtml(title)}</strong>"? Tindakan ini tidak dapat dibatalkan.`,
    async () => {
      try {
        await Articles.remove(id);
        toast('Artikel dihapus.', 'success');
        await renderArticleList();
      } catch (e) {
        toast('Gagal menghapus artikel.', 'error');
      }
    }
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 8 — Article Editor View
   ═══════════════════════════════════════════════════════════════════════ */

async function renderArticleEditor(id) {
  const [art, cats] = await Promise.all([
    id ? Articles.getById(id) : Promise.resolve(null),
    Categories.getAll(),
  ]);

  const isNew    = !art;
  const tagsStr  = (art?.tags || []).join(', ');

  setTopbar(
    isNew ? 'Artikel Baru' : 'Edit Artikel',
    `
      <button class="btn btn-outline btn-sm" onclick="navigate('#articles')">← Kembali</button>
      <button class="btn btn-outline btn-sm" id="btn-save-draft">Simpan Draft</button>
      <button class="btn btn-primary btn-sm" id="btn-publish">Publikasikan</button>
    `
  );

  setContent(`
    <form id="article-form" onsubmit="return false;">
      <div class="editor-layout">

        <!-- LEFT: Main content -->
        <div class="editor-main">
          <input class="form-input title-input" type="text" id="f-title"
                 placeholder="Judul artikel…" value="${escHtml(art?.title || '')}" autocomplete="off" />

          <div class="section-card" style="padding:12px 16px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="text-muted">Slug:</span>
              <input class="form-input" type="text" id="f-slug"
                     placeholder="otomatis-dari-judul" value="${escHtml(art?.slug || '')}"
                     style="flex:1;border:none;background:transparent;box-shadow:none;padding:2px 4px;font-family:monospace;font-size:0.88rem;" />
            </div>
          </div>

          <div class="section-card">
            <div class="section-card-title">Ringkasan Singkat</div>
            <textarea class="form-textarea" id="f-excerpt" rows="2"
                      placeholder="Ringkasan singkat yang tampil di kartu artikel…">${escHtml(art?.excerpt || '')}</textarea>
          </div>

          <div class="section-card">
            <div class="section-card-title">Gambar Cover</div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input class="form-input" type="text" id="f-cover"
                     placeholder="URL gambar…" value="${escHtml(art?.coverImage || '')}" style="flex:1;" />
              <button type="button" class="btn btn-outline btn-sm" onclick="openImagePicker()">Pilih</button>
            </div>
            <img id="cover-preview" class="cover-preview ${art?.coverImage ? 'show' : ''}"
                 src="${escHtml(art?.coverImage || '')}" alt="Preview" />
          </div>

          <div class="section-card" style="padding:0;">
            <div class="rte-wrapper" id="rte-wrapper"></div>
          </div>
        </div>

        <!-- RIGHT: Sidebar -->
        <div class="editor-sidebar">
          <div class="section-card">
            <div class="section-card-title">Publikasi</div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-select" id="f-status">
                <option value="draft"     ${(art?.status === 'draft' || isNew) ? 'selected' : ''}>Draft</option>
                <option value="published" ${art?.status === 'published'         ? 'selected' : ''}>Dipublikasikan</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Tanggal Publikasi</label>
              <input class="form-input" type="date" id="f-date" value="${art?.publishDate || todayISO()}" />
            </div>
          </div>

          <div class="section-card">
            <div class="section-card-title">Klasifikasi</div>
            <div class="form-group">
              <label class="form-label">Kategori</label>
              <select class="form-select" id="f-category">
                <option value="">— Pilih Kategori —</option>
                ${cats.map(c => `<option value="${escHtml(c.name)}" ${art?.category === c.name ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Tag</label>
              <input class="form-input" type="text" id="f-tags"
                     placeholder="Aljabar, Kelas 8, Visual" value="${escHtml(tagsStr)}" />
              <div class="form-hint">Pisahkan dengan koma</div>
            </div>
          </div>

          <div class="section-card">
            <div class="section-card-title">Tampil di Beranda</div>
            <div class="toggle-row">
              <div><div class="toggle-label">Unggulan</div><div class="toggle-desc">Artikel utama di beranda</div></div>
              <label class="toggle">
                <input type="checkbox" id="f-featured" ${art?.featured ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="toggle-row">
              <div><div class="toggle-label">Terbaru</div><div class="toggle-desc">Tampil di kolom Terbaru</div></div>
              <label class="toggle">
                <input type="checkbox" id="f-latest" ${art?.latest ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="toggle-row">
              <div><div class="toggle-label">Populer</div><div class="toggle-desc">Tampil di sidebar Populer</div></div>
              <label class="toggle">
                <input type="checkbox" id="f-popular" ${art?.popular ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="section-card">
            <div class="section-card-title">SEO</div>
            <div class="form-group">
              <label class="form-label">Judul SEO</label>
              <input class="form-input" type="text" id="f-seo-title"
                     placeholder="Biarkan kosong untuk pakai judul artikel"
                     value="${escHtml(art?.seoTitle || '')}" />
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Deskripsi Meta</label>
              <textarea class="form-textarea" id="f-seo-desc" rows="3"
                        placeholder="Deskripsi singkat untuk mesin pencari…">${escHtml(art?.seoDescription || '')}</textarea>
            </div>
          </div>

          <div class="section-card" style="padding:12px 16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="text-muted">Estimasi Baca</span>
              <span id="read-time-display" style="font-weight:600;font-size:0.88rem;">${art?.readingTime || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  `);

  AppState.rte = initRTE(document.getElementById('rte-wrapper'), art?.content || '');

  document.getElementById('f-title').addEventListener('input', e => {
    if (!art) document.getElementById('f-slug').value = toSlug(e.target.value);
  });

  document.getElementById('f-cover').addEventListener('input', e => {
    const preview = document.getElementById('cover-preview');
    preview.src = e.target.value;
    preview.classList.toggle('show', !!e.target.value);
  });

  document.getElementById('rte-wrapper').addEventListener('input', () => {
    document.getElementById('read-time-display').textContent = calcReadTime(AppState.rte.getContent());
  });

  document.getElementById('btn-save-draft').onclick = () => saveArticle('draft');
  document.getElementById('btn-publish').onclick    = () => saveArticle('published');
}

function collectArticleForm(status) {
  const title    = document.getElementById('f-title').value.trim();
  const category = document.getElementById('f-category').value;
  if (!title)    { toast('Harap masukkan judul artikel.', 'error'); return null; }
  if (!category) { toast('Harap pilih kategori.', 'error'); return null; }

  const content = AppState.rte ? AppState.rte.getContent() : '';
  const tags    = document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean);

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

async function saveArticle(status) {
  const data = collectArticleForm(status);
  if (!data) return;

  const btn = document.getElementById(status === 'published' ? 'btn-publish' : 'btn-save-draft');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan…'; }

  try {
    if (AppState.editId) {
      await Articles.update(AppState.editId, data);
      toast(`Artikel ${status === 'published' ? 'dipublikasikan' : 'disimpan sebagai draft'}.`, 'success');
    } else {
      const created = await Articles.add({ ...data, createdAt: todayISO() });
      AppState.editId = created.id;
      history.replaceState(null, '', `#article-edit/${created.id}`);
      toast('Artikel berhasil dibuat!', 'success');
    }
  } catch (e) {
    toast('Gagal menyimpan artikel. Periksa koneksi internet.', 'error');
    console.error(e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = status === 'published' ? 'Publikasikan' : 'Simpan Draft'; }
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 9 — Categories View
   ═══════════════════════════════════════════════════════════════════════ */

async function renderCategories() {
  setTopbar('Kategori', `
    <button class="btn btn-primary btn-sm" onclick="openAddCategoryModal()">+ Tambah Kategori</button>
  `);
  await rebuildCategoryTable();
}

async function rebuildCategoryTable() {
  const [cats, articles] = await Promise.all([Categories.getAll(), Articles.getAll()]);

  setContent(`
    <div class="table-wrap">
      <div class="cat-list">
        ${cats.length === 0
          ? `<div class="table-empty">Belum ada kategori.</div>`
          : cats.map(c => {
              const count = articles.filter(a => a.category === c.name).length;
              return `
                <div class="cat-row">
                  <div class="cat-name">${escHtml(c.name)}</div>
                  <div class="cat-slug">${escHtml(c.slug)}</div>
                  <div class="cat-count">${count} artikel</div>
                  <div class="table-actions">
                    <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditCategoryModal('${escHtml(c.id)}')" title="Edit">✎</button>
                    <button class="btn btn-ghost btn-sm btn-icon" style="color:var(--c-danger);" onclick="confirmDeleteCategory('${escHtml(c.id)}','${escHtml(c.name)}')" title="Hapus">🗑</button>
                  </div>
                </div>
              `;
            }).join('')}
      </div>
    </div>
  `);
}

function openAddCategoryModal() {
  openModal('Tambah Kategori', `
    <div class="form-group">
      <label class="form-label">Nama</label>
      <input class="form-input" type="text" id="cat-name-input" placeholder="contoh: Trigonometri" />
    </div>
    <div class="form-group">
      <label class="form-label">Slug</label>
      <input class="form-input" type="text" id="cat-slug-input" placeholder="trigonometri" />
    </div>
  `, [
    { label: 'Batal',  cls: 'btn-outline', action: closeModal },
    { label: 'Tambah', cls: 'btn-primary', action: async () => {
      const name = document.getElementById('cat-name-input').value.trim();
      if (!name) { toast('Nama wajib diisi.', 'error'); return; }
      const slug = document.getElementById('cat-slug-input').value.trim() || toSlug(name);
      try {
        await Categories.add({ name, slug });
        closeModal();
        await rebuildCategoryTable();
        toast('Kategori ditambahkan.', 'success');
      } catch (e) { toast('Gagal menambah kategori.', 'error'); }
    }},
  ]);
  document.getElementById('cat-name-input').addEventListener('input', e => {
    document.getElementById('cat-slug-input').value = toSlug(e.target.value);
  });
  document.getElementById('cat-name-input').focus();
}

function openEditCategoryModal(id) {
  Categories.getById(id).then(cat => {
    if (!cat) return;
    openModal('Edit Kategori', `
      <div class="form-group">
        <label class="form-label">Nama</label>
        <input class="form-input" type="text" id="cat-name-input" value="${escHtml(cat.name)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Slug</label>
        <input class="form-input" type="text" id="cat-slug-input" value="${escHtml(cat.slug)}" />
      </div>
    `, [
      { label: 'Batal', cls: 'btn-outline', action: closeModal },
      { label: 'Simpan', cls: 'btn-primary', action: async () => {
        const name = document.getElementById('cat-name-input').value.trim();
        const slug = document.getElementById('cat-slug-input').value.trim();
        if (!name) { toast('Nama wajib diisi.', 'error'); return; }
        try {
          await Categories.update(id, { name, slug });
          closeModal();
          await rebuildCategoryTable();
          toast('Kategori diperbarui.', 'success');
        } catch (e) { toast('Gagal memperbarui kategori.', 'error'); }
      }},
    ]);
  });
}

function confirmDeleteCategory(id, name) {
  showConfirmModal('Hapus Kategori', `Hapus "<strong>${escHtml(name)}</strong>"? Artikel dengan kategori ini tidak ikut terhapus.`, async () => {
    try {
      await Categories.remove(id);
      await rebuildCategoryTable();
      toast('Kategori dihapus.', 'success');
    } catch (e) { toast('Gagal menghapus kategori.', 'error'); }
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 10 — Images View (localStorage only)
   ═══════════════════════════════════════════════════════════════════════ */

function renderImages() {
  setTopbar('Perpustakaan Media');

  setContent(`
    <div class="upload-zone" id="upload-zone" onclick="document.getElementById('file-upload-input').click()">
      <div class="upload-zone-title">Klik untuk unggah gambar</div>
      <div class="upload-zone-sub">PNG, JPG, GIF, WebP — disimpan lokal di browser</div>
    </div>
    <input type="file" id="file-upload-input" accept="image/*" multiple />

    <div class="url-add-row">
      <input class="form-input" type="url" id="img-url-input" placeholder="Atau tempelkan URL gambar…" />
      <input class="form-input" type="text" id="img-name-input" placeholder="Nama gambar" style="max-width:180px;" />
      <button class="btn btn-outline btn-sm" onclick="addImageByUrl()">Tambah URL</button>
    </div>

    <div class="image-grid" id="image-grid"></div>
  `);

  refreshImageGrid();

  document.getElementById('file-upload-input').addEventListener('change', handleFileUpload);
  const zone = document.getElementById('upload-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); handleFiles(e.dataTransfer.files); });
}

function refreshImageGrid() {
  const grid = document.getElementById('image-grid');
  if (!grid) return;
  const imgs = Images.getAll();

  if (imgs.length === 0) {
    grid.innerHTML = `<p class="text-muted">Belum ada gambar.</p>`;
    return;
  }

  grid.innerHTML = imgs.map(img => `
    <div class="image-card">
      <img class="image-card-thumb" src="${escHtml(img.url)}" alt="${escHtml(img.name)}" loading="lazy"
           onerror="this.style.background='var(--c-bg)'; this.style.height='60px';" />
      <div class="image-card-overlay">
        <button class="btn btn-ghost btn-sm btn-icon" style="color:#fff;background:rgba(255,255,255,0.15);"
                onclick="copyImageUrl('${escHtml(img.url)}')" title="Salin URL">⎘</button>
        ${img.type !== 'system' ? `
          <button class="btn btn-ghost btn-sm btn-icon" style="color:#ff9999;background:rgba(255,255,255,0.15);"
                  onclick="confirmDeleteImage('${escHtml(img.id)}')" title="Hapus">🗑</button>
        ` : ''}
      </div>
      <div class="image-card-info">
        <div class="image-card-name">${escHtml(img.name)}</div>
        <div class="image-card-type">${img.type === 'system' ? 'Sistem' : 'Diunggah'}</div>
      </div>
    </div>
  `).join('');
}

function handleFileUpload(e) { handleFiles(e.target.files); e.target.value = ''; }

function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      Images.add({ name: file.name, url: e.target.result, type: 'uploaded', addedAt: todayISO() });
      refreshImageGrid();
      toast(`Gambar "${file.name}" diunggah.`, 'success');
    };
    reader.readAsDataURL(file);
  });
}

function addImageByUrl() {
  const url  = document.getElementById('img-url-input').value.trim();
  const name = document.getElementById('img-name-input').value.trim() || url.split('/').pop() || 'gambar';
  if (!url) { toast('Masukkan URL gambar.', 'error'); return; }
  Images.add({ name, url, type: 'url', addedAt: todayISO() });
  document.getElementById('img-url-input').value  = '';
  document.getElementById('img-name-input').value = '';
  refreshImageGrid();
  toast('Gambar ditambahkan.', 'success');
}

function copyImageUrl(url) {
  navigator.clipboard?.writeText(url).then(() => toast('URL disalin!', 'success'));
}

function confirmDeleteImage(id) {
  const img = Images.getById(id);
  if (!img) return;
  showConfirmModal('Hapus Gambar', `Hapus gambar "<strong>${escHtml(img.name)}</strong>"?`, () => {
    Images.remove(id);
    refreshImageGrid();
    toast('Gambar dihapus.', 'success');
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 11 — Rich Text Editor (RTE)
   ═══════════════════════════════════════════════════════════════════════ */

function initRTE(wrapper, initialContent) {
  if (!wrapper) return null;

  wrapper.innerHTML = `
    <div class="rte-toolbar" id="rte-toolbar">
      <select class="rte-format-select" id="rte-format" title="Format blok">
        <option value="p">Paragraf</option>
        <option value="h1">Judul 1</option>
        <option value="h2">Judul 2</option>
        <option value="h3">Judul 3</option>
        <option value="blockquote">Kutipan</option>
        <option value="pre">Kode</option>
      </select>
      <div class="rte-sep"></div>
      <button type="button" class="rte-btn" data-cmd="bold"               title="Tebal"><b>B</b></button>
      <button type="button" class="rte-btn" data-cmd="italic"             title="Miring"><em>I</em></button>
      <button type="button" class="rte-btn" data-cmd="underline"          title="Garis Bawah"><u>U</u></button>
      <div class="rte-sep"></div>
      <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Daftar Poin">≡</button>
      <button type="button" class="rte-btn" data-cmd="insertOrderedList"   title="Daftar Nomor">1.</button>
      <div class="rte-sep"></div>
      <button type="button" class="rte-btn" data-cmd="justifyLeft"         title="Rata Kiri">⬡L</button>
      <button type="button" class="rte-btn" data-cmd="justifyCenter"       title="Tengah">⬡C</button>
      <button type="button" class="rte-btn" data-cmd="justifyRight"        title="Rata Kanan">⬡R</button>
      <div class="rte-sep"></div>
      <button type="button" class="rte-btn" id="rte-link"  title="Sisipkan Tautan">🔗 Tautan</button>
      <button type="button" class="rte-btn" id="rte-img"   title="Sisipkan Gambar">📷 Gambar</button>
      <button type="button" class="rte-btn" id="rte-table" title="Sisipkan Tabel">⊞ Tabel</button>
      <button type="button" class="rte-btn" id="rte-hr"    title="Garis Pemisah">— Garis</button>
    </div>
    <div class="rte-body" id="rte-body" contenteditable="true" spellcheck="true" aria-label="Editor konten artikel"></div>
  `;

  const body = wrapper.querySelector('#rte-body');
  body.innerHTML = initialContent || '<p><br></p>';

  wrapper.querySelector('#rte-format').addEventListener('change', function() {
    const tag = this.value;
    body.focus();
    if (tag === 'pre') rteInsertBlock('<pre><br></pre>');
    else document.execCommand('formatBlock', false, `<${tag}>`);
    this.value = 'p';
  });

  wrapper.querySelectorAll('.rte-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => { body.focus(); document.execCommand(btn.dataset.cmd, false, null); });
  });

  wrapper.querySelector('#rte-link').addEventListener('click', () => {
    const url = prompt('Masukkan URL:');
    if (url) { body.focus(); document.execCommand('createLink', false, url); }
  });

  wrapper.querySelector('#rte-img').addEventListener('click', () => openImagePicker(true));

  wrapper.querySelector('#rte-table').addEventListener('click', () => {
    const rows = parseInt(prompt('Jumlah baris:', '3') || '3');
    const cols = parseInt(prompt('Jumlah kolom:', '3') || '3');
    if (rows > 0 && cols > 0) {
      const header = `<tr>${Array(cols).fill('<th>Judul</th>').join('')}</tr>`;
      const rowsHtml = Array(rows - 1).fill(`<tr>${Array(cols).fill('<td>Sel</td>').join('')}</tr>`).join('');
      rteInsertBlock(`<table>${header}${rowsHtml}</table>`);
    }
  });

  wrapper.querySelector('#rte-hr').addEventListener('click', () => {
    body.focus(); document.execCommand('insertHorizontalRule');
  });

  return {
    getContent: () => body.innerHTML,
    setContent: html => { body.innerHTML = html || '<p><br></p>'; },
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
    while (el.firstChild) last = frag.appendChild(el.firstChild);
    range.insertNode(frag);
    if (last) {
      const r = range.cloneRange();
      r.setStartAfter(last); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
    }
  } else {
    body.innerHTML += html;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 12 — Image Picker Modal
   ═══════════════════════════════════════════════════════════════════════ */

function openImagePicker(forRTE = false) {
  const imgs = Images.getAll();

  openModal('Pilih Gambar', `
    <div class="img-picker-grid" id="img-picker-grid">
      ${imgs.map(img => `
        <div class="img-picker-item" data-url="${escHtml(img.url)}" data-name="${escHtml(img.name)}">
          <img src="${escHtml(img.url)}" alt="${escHtml(img.name)}" loading="lazy"
               onerror="this.style.display='none'" />
          <div class="img-picker-item-name">${escHtml(img.name)}</div>
        </div>
      `).join('')}
    </div>
  `, [{ label: 'Batal', cls: 'btn-outline', action: closeModal }], true);

  document.querySelectorAll('.img-picker-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      if (forRTE && AppState.rte) {
        document.getElementById('rte-body').focus();
        rteInsertBlock(`<img src="${url}" alt="" style="max-width:100%;" />`);
      } else {
        const coverInput = document.getElementById('f-cover');
        if (coverInput) {
          coverInput.value = url;
          const preview = document.getElementById('cover-preview');
          if (preview) { preview.src = url; preview.classList.add('show'); }
        }
      }
      closeModal();
      toast('Gambar dipilih.', 'success');
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 13 — Modal System
   ═══════════════════════════════════════════════════════════════════════ */

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
    { label: 'Batal',   cls: 'btn-outline', action: closeModal },
    { label: 'Konfirmasi', cls: 'btn-danger', action: () => { onConfirm(); closeModal(); } },
  ]);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 14 — Toast
   ═══════════════════════════════════════════════════════════════════════ */

function toast(message, type = 'default') {
  const stack = document.getElementById('toast-stack');
  const el    = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 15 — Login
   ═══════════════════════════════════════════════════════════════════════ */

function setupLogin() {
  const form = document.getElementById('login-form');
  const err  = document.getElementById('login-error');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    if (doLogin(u, p)) {
      err.classList.remove('show');
      await showApp();
    } else {
      err.textContent = 'Username atau password salah.';
      err.classList.add('show');
      document.getElementById('login-password').value = '';
      document.getElementById('login-password').focus();
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 16 — Sidebar Nav
   ═══════════════════════════════════════════════════════════════════════ */

function setupSidebarNav() {
  document.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.addEventListener('click', () => navigate(`#${el.dataset.view}`));
  });
  document.getElementById('logout-btn').addEventListener('click', doLogout);
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 17 — Init
   ═══════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  setupLogin();
  setupSidebarNav();

  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  window.addEventListener('hashchange', () => {
    if (isLoggedIn()) router();
  });

  if (isLoggedIn()) {
    showApp();
  } else {
    showLoginScreen();
    document.getElementById('login-username').focus();
  }
});
