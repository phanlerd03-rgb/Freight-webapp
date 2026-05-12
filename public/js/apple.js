/* ===== APPLE-STYLE SCROLL REVEAL ===== */

(function () {
  'use strict';

  // ---- Auto-tag elements for reveal ----
  function tagRevealTargets() {
    // Section headers
    document.querySelectorAll('.section-header').forEach((el, i) => {
      el.classList.add('ap-reveal');
    });

    // Cards — stagger siblings within the same grid
    const gridSelectors = [
      '.services-grid',
      '.integrations-grid',
      '.why-grid',
      '.latest-blogs-grid',
      '.blog-grid-inner',
      '#blogGrid',
    ];
    gridSelectors.forEach(sel => {
      const grid = document.querySelector(sel);
      if (!grid) return;
      Array.from(grid.children).forEach((child, i) => {
        child.classList.add('ap-reveal', `ap-d${Math.min(i + 1, 6)}`);
      });
    });

    // Individual prominent cards / blocks
    document.querySelectorAll(
      '.quote-form-card, .booking-card, .contact-form-card, ' +
      '.quote-info .info-card, .tracking-box, .contact-grid > *'
    ).forEach((el, i) => {
      el.classList.add('ap-reveal', `ap-d${Math.min(i + 1, 4)}`);
    });

    // Latest-blog section header row
    document.querySelectorAll('.latest-blogs-header').forEach(el => {
      el.classList.add('ap-reveal');
    });
  }

  // ---- IntersectionObserver ----
  function initObserver() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('ap-visible');
          io.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px',
    });

    document.querySelectorAll('.ap-reveal').forEach(el => io.observe(el));

    // Re-observe dynamically loaded cards (blog grid mutation)
    const blogGrid = document.getElementById('blogGrid') || document.getElementById('latestBlogsGrid');
    if (blogGrid) {
      const mo = new MutationObserver(() => {
        blogGrid.querySelectorAll(':scope > *:not(.ap-reveal)').forEach((child, i) => {
          child.classList.add('ap-reveal', `ap-d${Math.min(i + 1, 6)}`);
          io.observe(child);
        });
      });
      mo.observe(blogGrid, { childList: true });
    }
  }

  // ---- Navbar scroll state ----
  function initNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    const update = () => nav.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // ---- Init ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tagRevealTargets();
      initObserver();
      initNavbar();
    });
  } else {
    tagRevealTargets();
    initObserver();
    initNavbar();
  }
})();
