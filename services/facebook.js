/**
 * ===== PIT FREIGHT — Facebook Page Auto-Poster =====
 * โพสต์บทความลง Facebook Page อัตโนมัติ (รองรับหลาย Pages)
 */

const axios = require('axios');

const SITE_URL = process.env.SITE_URL || 'https://pitfreight.com';

function getPages() {
  return [
    { id: process.env.FB_PAGE_ID,  token: process.env.FB_PAGE_ACCESS_TOKEN },
    { id: process.env.FB_PAGE2_ID, token: process.env.FB_PAGE2_ACCESS_TOKEN },
  ].filter(p => p.id && p.token);
}

async function postToSinglePage({ pageId, accessToken, message, blogUrl }) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${pageId}/feed`,
      { message, link: blogUrl, access_token: accessToken },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return { success: true, pageId, postId: response.data.id, url: `https://www.facebook.com/${response.data.id}` };
  } catch (err) {
    const fbError = err.response?.data?.error?.message || err.message;
    throw new Error(`Page ${pageId}: ${fbError}`);
  }
}

async function postBlogToFacebook({ title, summary, slug, category, cover }) {
  const pages = getPages();
  if (!pages.length) throw new Error('ยังไม่ได้ตั้งค่า FB_PAGE_ID หรือ FB_PAGE_ACCESS_TOKEN');

  const blogUrl = `${SITE_URL}/blog/${slug}`;

  const emojiMap = {
    'คู่มือ': '📋', 'ข่าวสาร': '📰', 'กฎระเบียบ': '⚖️',
    'ราคา & โปรโมชัน': '🏷️', 'เคล็ดลับ': '💡',
  };
  const emoji = emojiMap[category] || '📄';

  const message = [
    `${emoji} ${title}`, '',
    summary, '',
    `📌 อ่านบทความเต็มได้ที่: ${blogUrl}`, '',
    '─────────────────────',
    '🚢 PIT Freight — ขนส่งสินค้าระหว่างประเทศ',
    '📞 063-236-2365  |  💬 LINE: @pitfreight',
    '🌐 pitfreight.com', '',
    '#นำเข้าส่งออก #FreightForwarder #PITFreight #ขนส่งสินค้า #ศุลกากร',
  ].join('\n');

  const results = await Promise.allSettled(
    pages.map(p => postToSinglePage({ pageId: p.id, accessToken: p.token, message, blogUrl }))
  );

  const successes = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  const failures  = results.filter(r => r.status === 'rejected').map(r => r.reason?.message);

  if (!successes.length) throw new Error('โพสต์ไม่สำเร็จทุก Page: ' + failures.join(', '));

  return { success: true, pages: successes, errors: failures };
}

async function postNewsToFacebook({ title, summary, slug, category }) {
  return postBlogToFacebook({ title, summary, slug, category });
}

module.exports = { postBlogToFacebook, postNewsToFacebook };
