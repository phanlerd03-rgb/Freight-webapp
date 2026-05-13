/* ===== PIT FREIGHT BLOG ===== */

let blogPage = 1;
let blogCategory = '';
let blogLang = '';
let blogSearch = '';
let blogHasMore = false;
let searchTimer = null;

// UI text helper — switches based on active language filter
function ui(th, en) {
  return blogLang === 'en' ? en : th;
}

// Debounced search (350ms)
function debouncedSearch(val) {
  clearTimeout(searchTimer);
  const clearBtn = document.getElementById('blogSearchClear');
  if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
  searchTimer = setTimeout(() => {
    blogSearch = val.trim();
    loadBlog(true);
  }, 350);
}

// Clear search
function clearBlogSearch() {
  const input = document.getElementById('blogSearchInput');
  const clearBtn = document.getElementById('blogSearchClear');
  if (input) input.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  blogSearch = '';
  loadBlog(true);
}

// Format date TH/EN
function formatBlogDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'th';
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'th-TH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

// Category emoji map
function categoryEmoji(cat) {
  const map = { 'คู่มือ': '📘', 'ราคา & โปรโมชัน': '💰', 'ข่าวสาร': '📰', 'กฎระเบียบ': '⚖️', 'เคล็ดลับ': '💡' };
  return map[cat] || '📄';
}

// ===== SHARE (Web Share API + Copy Link fallback) =====
async function shareBlog(slug, title) {
  const url = `${location.origin}/blog/${slug}`;

  // มือถือ: ใช้ native share sheet (TikTok, LINE, Facebook, ฯลฯ)
  if (navigator.share) {
    try {
      await navigator.share({ title: title, text: title + ' — PIT Freight', url: url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // user ยกเลิกเอง
    }
  }

  // Desktop fallback: copy link
  try {
    await navigator.clipboard.writeText(url);
  } catch (e) {
    prompt('คัดลอก link นี้:', url);
    return;
  }
  showShareToast();
}

function showShareToast() {
  const existing = document.getElementById('shareToast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'shareToast';
  t.textContent = '✅ คัดลอก Link แล้ว!';
  t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1e3a5f;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.25);transition:opacity .3s';
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2200);
}

// Share icon SVG
const shareIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;

// Language flag badge
function langBadge(lang) {
  if (lang === 'en') return '<span class="blog-lang-badge blog-lang-badge--en">🇬🇧 EN</span>';
  if (lang === 'both') return '<span class="blog-lang-badge blog-lang-badge--both">🇹🇭🇬🇧</span>';
  return '<span class="blog-lang-badge blog-lang-badge--th">🇹🇭 TH</span>';
}

// Read label based on language
function readLabel(lang) {
  return lang === 'en' ? 'Read more →' : 'อ่านต่อ →';
}

// Render a single blog card
function renderBlogCard(post) {
  const cover = post.cover
    ? `<img class="blog-card-cover" src="${post.cover}" alt="${post.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'blog-card-cover-placeholder\\'>${categoryEmoji(post.category)}</div>'">`
    : `<div class="blog-card-cover-placeholder">${categoryEmoji(post.category)}</div>`;

  const tags = post.tags.slice(0, 3).map(t => `<span class="blog-card-tag">${t}</span>`).join('');

  return `
    <div class="blog-card" onclick="openBlogPost('${post.slug}')">
      ${cover}
      <div class="blog-card-body">
        <div class="blog-card-meta">
          ${post.category ? `<span class="blog-card-category">${categoryEmoji(post.category)} ${post.category}</span>` : ''}
          ${langBadge(post.language)}
          <span class="blog-card-date">${formatBlogDate(post.date)}</span>
        </div>
        <div class="blog-card-title">${post.title}</div>
        <div class="blog-card-summary">${post.summary || ''}</div>
        <div class="blog-card-footer">
          <div class="blog-card-tags">${tags}</div>
          <div class="blog-card-actions">
            <button class="blog-share-btn" onclick="event.stopPropagation();shareBlog('${post.slug}','${post.title.replace(/'/g,"\\'")}')">
              ${shareIcon} ${post.language === 'en' ? 'Share' : 'แชร์'}
            </button>
            <span class="blog-card-read">${readLabel(post.language)}</span>
          </div>
        </div>
      </div>
    </div>`;
}

// Load blog posts
async function loadBlog(reset = false) {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  if (reset) {
    blogPage = 1;
    grid.innerHTML = `<div class="blog-loading"><div class="spinner"></div><p>${ui('กำลังโหลดบทความ...', 'Loading articles...')}</p></div>`;
  }

  try {
    const params = new URLSearchParams({ limit: 6, page: blogPage });
    if (blogCategory) params.set('category', blogCategory);
    if (blogLang) params.set('lang', blogLang);
    if (blogSearch) params.set('search', blogSearch);

    const res = await fetch(`/api/blog?${params}`);
    const data = await res.json();

    if (reset) grid.innerHTML = '';

    if (!data.posts?.length && reset) {
      const emptyMsg = blogSearch
        ? ui(`ไม่พบบทความที่ตรงกับ "${blogSearch}"`, `No articles found for "${blogSearch}"`)
        : ui('ยังไม่มีบทความในหมวดนี้', 'No articles found in this category.');
      grid.innerHTML = `<div class="blog-loading"><p>🔍 ${emptyMsg}</p></div>`;
      document.getElementById('blogLoadMore').style.display = 'none';
      return;
    }

    data.posts.forEach(post => {
      grid.insertAdjacentHTML('beforeend', renderBlogCard(post));
    });

    blogHasMore = data.hasMore;
    const loadMoreEl = document.getElementById('blogLoadMore');
    if (loadMoreEl) loadMoreEl.style.display = blogHasMore ? 'block' : 'none';

  } catch (err) {
    grid.innerHTML = `<div class="blog-loading"><p>⚠️ ${ui('ไม่สามารถโหลดบทความได้', 'Unable to load articles.')}</p></div>`;
  }

  // Update Load More button text
  const loadMoreSpan = document.querySelector('#blogLoadMore span');
  if (loadMoreSpan) loadMoreSpan.textContent = ui('โหลดเพิ่มเติม', 'Load more');
}

// Filter by category
function filterBlog(btn, category) {
  document.querySelectorAll('.blog-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  blogCategory = category;
  loadBlog(true);
}

// Filter by language — also update section UI text
function filterBlogLang(btn, lang) {
  document.querySelectorAll('.blog-lang-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  blogLang = lang;

  // Update section subtitle
  const subtitle = document.querySelector('#blog .section-subtitle');
  if (subtitle) subtitle.textContent = lang === 'en'
    ? 'Knowledge, guides and latest updates from PIT Freight team'
    : 'ความรู้ คู่มือ และราคาล่าสุดจากทีมงาน PIT Freight';

  // Update category filter labels
  const allBtn = document.querySelector('.blog-filter-btn[data-category=""]');
  if (allBtn) allBtn.innerHTML = `<span>${lang === 'en' ? 'All' : 'ทั้งหมด'}</span>`;

  loadBlog(true);
}

// Load more
function loadMoreBlog() {
  blogPage++;
  loadBlog(false);
}

// Open blog post modal
async function openBlogPost(slug) {
  const modal = document.getElementById('blogModal');
  const content = document.getElementById('blogModalContent');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  content.innerHTML = `<div style="padding:60px;text-align:center"><div class="spinner" style="margin:0 auto 16px;border-top-color:var(--primary)"></div><p style="color:#64748b">${ui('กำลังโหลด...', 'Loading...')}</p></div>`;

  try {
    const res = await fetch(`/api/blog/${slug}`);
    const post = await res.json();
    const isEn = post.language === 'en';

    const cover = post.cover
      ? `<img class="blog-post-cover" src="${post.cover}" alt="${post.title}">`
      : '';

    const tags = post.tags.map(t => `<span class="blog-post-tag">${t}</span>`).join('');

    content.innerHTML = `
      ${cover}
      <div class="blog-post-body">
        <div class="blog-post-meta">
          ${post.category ? `<span class="blog-post-category">${categoryEmoji(post.category)} ${post.category}</span>` : ''}
          ${langBadge(post.language)}
          <span class="blog-post-date">${formatBlogDate(post.date)}</span>
          ${post.author ? `<span class="blog-post-author">✍️ ${post.author}</span>` : ''}
        </div>
        <h1 class="blog-post-title">${post.title}</h1>
        ${post.summary ? `<p class="blog-post-summary">${post.summary}</p>` : ''}
        ${tags ? `<div class="blog-post-tags">${tags}</div>` : ''}
        <div class="blog-post-html">${post.content || `<p>${isEn ? 'No content available.' : 'ไม่มีเนื้อหา'}</p>`}</div>
        <div class="blog-post-share">
          <span class="blog-post-share-label">${isEn ? 'Share this article' : 'แชร์บทความนี้'}</span>
          <button class="blog-share-btn blog-share-btn--large" onclick="shareBlog('${post.slug}','${(post.title||'').replace(/'/g,"\\'")}')">
            ${shareIcon} ${isEn ? 'Share article' : 'แชร์บทความ'}
          </button>
        </div>
      </div>`;
  } catch (err) {
    content.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444">⚠️ ${ui('ไม่สามารถโหลดบทความได้', 'Unable to load article.')}</div>`;
  }
}

// Close modal
function closeBlogModal() {
  document.getElementById('blogModal').style.display = 'none';
  document.body.style.overflow = '';
}

// Close modal on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeBlogModal();
});

// Init: load blog when section enters viewport
const blogObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadBlog(true);
      blogObserver.disconnect();
    }
  });
}, { threshold: 0.1 });

document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('blog');
  if (section) blogObserver.observe(section);
  loadLatestBlogs();
});

// ===== LATEST BLOGS (หน้าแรก) =====
async function loadLatestBlogs() {
  const grid = document.getElementById('latestBlogsGrid');
  if (!grid) return;

  try {
    const r = await fetch('/api/blog?limit=3');
    const data = await r.json();
    const posts = data.posts || [];

    if (!posts.length) {
      grid.innerHTML = '<p style="color:#64748b;grid-column:1/-1;text-align:center">ยังไม่มีบทความ</p>';
      return;
    }

    grid.innerHTML = posts.map((post, i) => {
      const cover = post.cover
        ? `<img class="latest-blog-cover" src="${post.cover}" alt="${post.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : '';
      const placeholder = `<div class="latest-blog-cover-placeholder" ${post.cover ? 'style="display:none"' : ''}>${categoryEmoji(post.category)}</div>`;
      const isFeature = i === 0;

      return `
        <div class="latest-blog-card ${isFeature ? 'latest-blog-card--feature' : ''}" onclick="openBlogPost('${post.slug}')">
          ${cover}${placeholder}
          <div class="latest-blog-body">
            <div class="latest-blog-meta">
              ${post.category ? `<span class="blog-card-category">${categoryEmoji(post.category)} ${post.category}</span>` : ''}
              <span class="blog-card-date">${formatBlogDate(post.date)}</span>
            </div>
            <h3 class="latest-blog-title">${post.title}</h3>
            ${isFeature ? `<p class="latest-blog-summary">${post.summary || ''}</p>` : ''}
            <div class="latest-blog-footer">
              <button class="blog-share-btn" onclick="event.stopPropagation();shareBlog('${post.slug}','${post.title.replace(/'/g,"\\'")}')">
                ${shareIcon} แชร์
              </button>
              <span class="blog-card-read">อ่านต่อ →</span>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    if (grid) grid.innerHTML = '';
  }
}
