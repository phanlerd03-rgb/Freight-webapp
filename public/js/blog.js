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
          <span class="blog-card-read">อ่านต่อ →</span>
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
      </div>`;
  } catch (err) {
    content.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444">⚠️ ไม่สามารถโหลดบทความได้</div>`;
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
});
