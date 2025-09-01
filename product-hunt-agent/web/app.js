/* global confetti */

const API = window.PH_AGENT_API || 'http://localhost:8787';

const dateInput = document.getElementById('dateInput');
const loadTopBtn = document.getElementById('loadTopBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const topList = document.getElementById('topList');
const searchList = document.getElementById('searchList');
const launchBtn = document.getElementById('launchBtn');

const chatToggle = document.getElementById('chatToggle');
const chatPanel = document.getElementById('chatPanel');
const chatClose = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatText = document.getElementById('chatText');
const chatSend = document.getElementById('chatSend');

// Default date = today
const today = new Date();
dateInput.value = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 10);

function card(post) {
  const votes = post.votesCount != null ? `• ${post.votesCount} votes` : '';
  const link = post.url || post.website || '#';
  const thumb = post.thumbnail || '';
  return `
    <div class="ph-card">
      <div class="ph-thumb">${thumb ? `<img src="${thumb}" alt="${post.name}"/>` : ''}</div>
      <div class="ph-meta">
        <div class="ph-title">${post.name}</div>
        <div class="ph-tagline">${post.tagline || ''}</div>
        <div class="ph-row"><a href="${link}" target="_blank" rel="noreferrer">View</a> ${votes}</div>
      </div>
    </div>
  `;
}

async function loadTop() {
  const date = dateInput.value || new Date().toISOString().slice(0, 10);
  topList.innerHTML = '<div class="ph-card">Loading…</div>';
  try {
    const r = await fetch(`${API}/api/top?date=${encodeURIComponent(date)}`);
    const j = await r.json();
    const posts = j.posts || [];
    topList.innerHTML = posts.map(card).join('') || '<div class="ph-card">No results</div>';
  } catch (e) {
    topList.innerHTML = '<div class="ph-card">Failed to load top posts.</div>';
  }
}

async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  searchList.innerHTML = '<div class="ph-card">Searching…</div>';
  try {
    const r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    const hits = j.hits || [];
    searchList.innerHTML = hits.map(card).join('') || '<div class="ph-card">No results</div>';
  } catch (e) {
    searchList.innerHTML = '<div class="ph-card">Search failed.</div>';
  }
}

function addMsg(text, who = 'bot') {
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendChat() {
  const text = chatText.value.trim();
  if (!text) return;
  addMsg(text, 'user');
  chatText.value = '';
  try {
    const r = await fetch(`${API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const j = await r.json();
    if (j.reply) addMsg(j.reply, 'bot');
    else addMsg('No reply', 'bot');
  } catch (e) {
    addMsg('Chat failed. Is the server running?', 'bot');
  }
}

// Confetti
function launchConfetti() {
  const duration = 1500;
  const end = Date.now() + duration;
  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// Events
loadTopBtn.addEventListener('click', loadTop);
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
launchBtn.addEventListener('click', launchConfetti);

chatToggle.addEventListener('click', () => chatPanel.classList.toggle('hidden'));
chatClose.addEventListener('click', () => chatPanel.classList.add('hidden'));
chatSend.addEventListener('click', sendChat);
chatText.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

// Initial
loadTop();

