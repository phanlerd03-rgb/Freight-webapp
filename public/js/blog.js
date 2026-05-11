/* ===== PIT FREIGHT BLOG ===== */

let blogPage = 1;
let blogCategory = '';
let blogHasMore = false;

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
          <span class="blog-card-date">${formatBlogDate(post.date)}</span>
        </div>
        <div class="blog-card-title">${post.title}</div>
        <div class="blog-card-summary">${post.summary || ''}</div>
        <div class="blog-card-footer">
          <div class="blog-card-tags">${tags}</div>
          <div class="blog-card-actions">
            <button class="blog-share-btn" onclick="event.stopPropagation();shareFacebook('${post.slug}','${post.title.replace(/'/g,"\\'")}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              แชร์
            </button>
            <span class="blog-card-read">อ่านต่อ →</span>
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
    grid.innerHTML = `<div class="blog-loading"><div class="spinner"></div><p>กำลังโหลดบทความ...</p></div>`;
  }

  try {
    const params = new URLSearchParams({ limit: 6, page: blogPage });
    if (blogCategory) params.set('category', blogCategory);

    const res = await fetch(`/api/blog?${params}`);
    const data = await res.json();

    if (reset) grid.innerHTML = '';

    if (!data.posts?.length && reset) {
      grid.innerHTML = `<div class="blog-loading"><p>ยังไม่มีบทความในหมวดนี้</p></div>`;
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
    grid.innerHTML = `<div class="blog-loading"><p>⚠️ ไม่สามารถโหลดบทความได้</p></div>`;
  }
}

// Filter by category
function filterBlog(btn, category) {
  document.querySelectorAll('.blog-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  blogCategory = category;
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

  content.innerHTML = `<div style="padding:60px;text-align:center"><div class="spinner" style="margin:0 auto 16px;border-top-color:var(--primary)"></div><p style="color:#64748b">กำลังโหลด...</p></div>`;

  try {
    const res = await fetch(`/api/blog/${slug}`);
    const post = await res.json();

    const cover = post.cover
      ? `<img class="blog-post-cover" src="${post.cover}" alt="${post.title}">`
      : '';

    const tags = post.tags.map(t => `<span class="blog-post-tag">${t}</span>`).join('');

    content.innerHTML = `
      ${cover}
      <div class="blog-post-body">
        <div class="blog-post-meta">
          ${post.category ? `<span class="blog-post-category">${categoryEmoji(post.category)} ${post.category}</span>` : ''}
          <span class="blog-post-date">${formatBlogDate(post.date)}</span>
          ${post.author ? `<span class="blog-post-author">✍️ ${post.author}</span>` : ''}
        </div>
        <h1 class="blog-post-title">${post.title}</h1>
        ${post.summary ? `<p class="blog-post-summary">${post.summary}</p>` : ''}
        ${tags ? `<div class="blog-post-tags">${tags}</div>` : ''}
        <div class="blog-post-html">${post.content || '<p>ไม่มีเนื้อหา</p>'}</div>
        <div class="blog-post-share">
          <span class="blog-post-share-label">แชร์บทความนี้</span>
          <button class="blog-share-btn blog-share-btn--large" onclick="shareFacebook('${post.slug}','${(post.title||'').replace(/'/g,"\\'")}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            แชร์ไป Facebook
          </button>
        </div>
      </div>`;
  } catch (err) {
    content.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444">⚠️ ไม่สามารถโหลดบทความได้</div>`;
  }
}

// Share to Facebook — ใช้ /blog/:slug เพื่อให้ Facebook scrape OG tags ได้
function shareFacebook(slug, title) {
  const url = encodeURIComponent(`${location.origin}/blog/${slug}`);
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  window.open(fbUrl, '_blank', 'width=620,height=450,noopener');
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
              <button class="blog-share-btn" onclick="event.stopPropagation();shareFacebook('${post.slug}','${post.title.replace(/'/g,"\\'")}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                แชร์
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
