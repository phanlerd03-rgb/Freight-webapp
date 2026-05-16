/**
 * ===== PIT FREIGHT — Facebook Page Auto-Poster =====
 * โพสต์บทความลง Facebook Page อัตโนมัติ
 * ต้องการ: FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN ใน environment variables
 */

const axios = require('axios');

const SITE_URL = process.env.SITE_URL || 'https://pitfreight.com';

/**
 * โพสต์บทความลง Facebook Page
 * @param {Object} post - ข้อมูลบทความ
 * @param {string} post.title - ชื่อบทความ
 * @param {string} post.summary - สรุปบทความ
 * @param {string} post.slug - slug ของบทความ
 * @param {string} post.category - หมวดหมู่
 * @param {string} [post.cover] - URL รูปภาพ (optional)
 */
async function postBlogToFacebook({ title, summary, slug, category, cover }) {
  const pageId = process.env.FB_PAGE_ID;
  const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    throw new Error('ยังไม่ได้ตั้งค่า FB_PAGE_ID หรือ FB_PAGE_ACCESS_TOKEN');
  }

  const blogUrl = `${SITE_URL}/blog/${slug}`;

  // emoji map ตาม category
  const emojiMap = {
    'คู่มือ':           '📋',
    'ข่าวสาร':          '📰',
    'กฎระเบียบ':        '⚖️',
    'ราคา & โปรโมชัน': '🏷️',
    'เคล็ดลับ':         '💡',
  };
  const emoji = emojiMap[category] || '📄';

  // สร้างข้อความโพสต์
  const message = [
    `${emoji} ${title}`,
    '',
    summary,
    '',
    `📌 อ่านบทความเต็มได้ที่: ${blogUrl}`,
    '',
    '─────────────────────',
    '🚢 PIT Freight — ขนส่งสินค้าระหว่างประเทศ',
    '📞 063-236-2365  |  💬 LINE: @pitfreight',
    '🌐 pitfreight.com',
    '',
    '#นำเข้าส่งออก #FreightForwarder #PITFreight #ขนส่งสินค้า #ศุลกากร',
  ].join('\n');

  // โพสต์ผ่าน Graph API — ใช้ link เพื่อให้ Facebook ดึง OG preview อัตโนมัติ
  const response = await axios.post(
    `https://graph.facebook.com/v19.0/${pageId}/feed`,
    {
      message,
      link: blogUrl,
      access_token: accessToken,
    }
  );

  return {
    success: true,
    postId: response.data.id,
    url: `https://www.facebook.com/${response.data.id}`,
  };
}

/**
 * โพสต์ข่าวสั้น (สำหรับ DFT/Customs auto-news)
 */
async function postNewsToFacebook({ title, summary, slug, category }) {
  return postBlogToFacebook({ title, summary, slug, category });
}

module.exports = { postBlogToFacebook, postNewsToFacebook };
