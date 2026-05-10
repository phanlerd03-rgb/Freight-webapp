/* ===== PIT FREIGHT AI CHATBOT ===== */

const chatMessages = [];
let isChatOpen = false;
let isTyping = false;

const chatUI = `
<div id="chatWidget" class="chat-widget">
  <!-- Bubble Button -->
  <button class="chat-bubble" id="chatBubble" onclick="toggleChat()">
    <span class="chat-bubble-icon">💬</span>
    <span class="chat-bubble-close hidden">✕</span>
    <span class="chat-unread" id="chatUnread" style="display:none">1</span>
  </button>

  <!-- Chat Window -->
  <div class="chat-window hidden" id="chatWindow">
    <div class="chat-header">
      <div class="chat-header-avatar">🤖</div>
      <div class="chat-header-info">
        <div class="chat-header-name">PIT Freight Assistant</div>
        <div class="chat-header-status">
          <span class="chat-status-dot"></span>
          <span id="chatStatusText">Online — พร้อมช่วยเหลือ</span>
        </div>
      </div>
      <button class="chat-header-close" onclick="toggleChat()">✕</button>
    </div>

    <div class="chat-messages" id="chatMessages">
      <div class="chat-welcome">
        <div class="chat-welcome-icon">🚢</div>
        <p id="chatWelcomeText">สวัสดีครับ! ผมคือ AI Assistant ของ PIT Freight<br>พร้อมช่วยเรื่องขนส่งสินค้าระหว่างประเทศ 🌏</p>
        <div class="chat-quick-btns" id="chatQuickBtns">
          <button onclick="sendQuick('ราคาขนส่งไปญี่ปุ่น')">🇯🇵 ราคาไปญี่ปุ่น</button>
          <button onclick="sendQuick('บริการขนส่งทางเรือ')">🚢 ขนส่งทางเรือ</button>
          <button onclick="sendQuick('ติดตามสินค้า')">🔍 ติดตามสินค้า</button>
          <button onclick="sendQuick('ติดต่อเจ้าหน้าที่')">📞 ติดต่อเรา</button>
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <input type="text" id="chatInput" placeholder="พิมพ์ข้อความ..."
        onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();sendChat()}">
      <button class="chat-send-btn" id="chatSendBtn" onclick="sendChat()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
    <div class="chat-footer">Powered by Claude AI · <a href="https://pitfreight.com" target="_blank">pitfreight.com</a></div>
  </div>
</div>`;

function initChat() {
  const div = document.createElement('div');
  div.innerHTML = chatUI;
  document.body.appendChild(div.firstElementChild);

  // Show unread badge after 3 sec
  setTimeout(() => {
    if (!isChatOpen) {
      document.getElementById('chatUnread').style.display = 'flex';
    }
  }, 3000);
}

function toggleChat() {
  isChatOpen = !isChatOpen;
  const win = document.getElementById('chatWindow');
  const icon = document.querySelector('.chat-bubble-icon');
  const close = document.querySelector('.chat-bubble-close');
  const unread = document.getElementById('chatUnread');

  win.classList.toggle('hidden', !isChatOpen);
  icon.classList.toggle('hidden', isChatOpen);
  close.classList.toggle('hidden', !isChatOpen);
  if (isChatOpen) { unread.style.display = 'none'; document.getElementById('chatInput').focus(); }

  // Update lang on open
  if (isChatOpen) updateChatLang();
}

function updateChatLang() {
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'th';
  const statusEl = document.getElementById('chatStatusText');
  const welcomeEl = document.getElementById('chatWelcomeText');
  const inputEl = document.getElementById('chatInput');
  const btns = document.getElementById('chatQuickBtns');

  if (lang === 'en') {
    if (statusEl) statusEl.textContent = 'Online — Ready to help';
    if (welcomeEl) welcomeEl.innerHTML = "Hello! I'm PIT Freight AI Assistant.<br>Ready to help with international shipping 🌏";
    if (inputEl) inputEl.placeholder = 'Type your message...';
    if (btns) btns.innerHTML = `
      <button onclick="sendQuick('Shipping cost to Japan')">🇯🇵 Price to Japan</button>
      <button onclick="sendQuick('Sea freight service')">🚢 Sea Freight</button>
      <button onclick="sendQuick('Track my shipment')">🔍 Track Shipment</button>
      <button onclick="sendQuick('Contact staff')">📞 Contact Us</button>`;
  } else {
    if (statusEl) statusEl.textContent = 'Online — พร้อมช่วยเหลือ';
    if (welcomeEl) welcomeEl.innerHTML = 'สวัสดีครับ! ผมคือ AI Assistant ของ PIT Freight<br>พร้อมช่วยเรื่องขนส่งสินค้าระหว่างประเทศ 🌏';
    if (inputEl) inputEl.placeholder = 'พิมพ์ข้อความ...';
    if (btns) btns.innerHTML = `
      <button onclick="sendQuick('ราคาขนส่งไปญี่ปุ่น')">🇯🇵 ราคาไปญี่ปุ่น</button>
      <button onclick="sendQuick('บริการขนส่งทางเรือ')">🚢 ขนส่งทางเรือ</button>
      <button onclick="sendQuick('ติดตามสินค้า')">🔍 ติดตามสินค้า</button>
      <button onclick="sendQuick('ติดต่อเจ้าหน้าที่')">📞 ติดต่อเรา</button>`;
  }
}

function sendQuick(text) {
  document.getElementById('chatInput').value = text;
  sendChat();
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || isTyping) return;
  input.value = '';

  // Add user message
  chatMessages.push({ role: 'user', content: text });
  appendMessage('user', text);

  // Hide quick buttons after first message
  const qbtns = document.getElementById('chatQuickBtns');
  if (qbtns) qbtns.style.display = 'none';

  // Show typing
  isTyping = true;
  const typingId = showTyping();
  document.getElementById('chatSendBtn').disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatMessages }),
    });

    if (!res.ok) throw new Error('Service unavailable');

    removeTyping(typingId);
    const msgEl = appendMessage('assistant', '');
    let fullText = '';

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              fullText += data.text;
              msgEl.querySelector('.chat-text').innerHTML = formatMsg(fullText);
              scrollChat();
            }
          } catch {}
        }
      }
    }

    chatMessages.push({ role: 'assistant', content: fullText });
  } catch (err) {
    removeTyping(typingId);
    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'th';
    appendMessage('assistant', lang === 'en'
      ? '❌ Sorry, AI service is temporarily unavailable. Please contact Ms. Thanyalak at +66 63 446 7735'
      : '❌ ขออภัย ระบบ AI ชั่วคราวไม่พร้อมใช้งาน กรุณาติดต่อ คุณธัญลักษณ์ โทร +66 63 446 7735');
  } finally {
    isTyping = false;
    document.getElementById('chatSendBtn').disabled = false;
    input.focus();
  }
}

function appendMessage(role, text) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg-${role}`;
  div.innerHTML = `
    ${role === 'assistant' ? '<div class="chat-msg-avatar">🤖</div>' : ''}
    <div class="chat-bubble-msg">
      <div class="chat-text">${formatMsg(text)}</div>
      <div class="chat-time">${new Date().toLocaleTimeString('th-TH', {hour:'2-digit',minute:'2-digit'})}</div>
    </div>`;
  container.appendChild(div);
  scrollChat();
  return div;
}

function showTyping() {
  const id = 'typing-' + Date.now();
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg chat-msg-assistant';
  div.id = id;
  div.innerHTML = `<div class="chat-msg-avatar">🤖</div><div class="chat-bubble-msg"><div class="chat-typing"><span></span><span></span><span></span></div></div>`;
  container.appendChild(div);
  scrollChat();
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

function scrollChat() {
  const c = document.getElementById('chatMessages');
  c.scrollTop = c.scrollHeight;
}

function formatMsg(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
    .replace(/\n/g, '<br>');
}

// Init on load
document.addEventListener('DOMContentLoaded', initChat);
