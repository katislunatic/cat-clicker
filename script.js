/* Cat Clicker with Slide-Out Shop */

const STORAGE_KEY = "catclicker_v1_v2";
const ITEM_DEFS = [
  { id: "autoPurr", name: "Auto-Purr", desc: "Small auto purrs", baseCost: 10, baseCps: 0.1, emoji: "😺" },
  { id: "catnipFarm", name: "Catnip Farm", desc: "Produces cat points", baseCost: 120, baseCps: 1, emoji: "🌿" },
  { id: "laserFactory", name: "Laser Factory", desc: "Laser pointers", baseCost: 1500, baseCps: 12, emoji: "🔦" },
  { id: "meowTeam", name: "Meow Team", desc: "Team of meowing cats", baseCost: 10000, baseCps: 80, emoji: "🎤" }
];

const defaultState = {
  points: 0,
  clickPower: 1,
  items: ITEM_DEFS.map(it => ({ id: it.id, amount: 0 })),
  lastTick: Date.now()
};

let state = null;
let tickTimer = null;

/* --- DOM Elements --- */
const catBtn = document.getElementById('catButton');
const catImg = document.getElementById('catImg');
const pointsEl = document.getElementById('catPoints');
const cpsEl = document.getElementById('cps');
const shopList = document.getElementById('shopList');
const clickPowerEl = document.getElementById('clickPower');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const bigClickBoost = document.getElementById('bigClickBoost');
const effectsLayer = document.getElementById('effects');
const shopToggle = document.getElementById('shopToggle');
const shopPanel = document.querySelector('.shop');
const mainPanel = document.querySelector('.main');

/* --- Load / Save --- */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaultState));
    if (!state.items || state.items.length !== ITEM_DEFS.length) state.items = ITEM_DEFS.map(it => ({ id: it.id, amount: 0 }));
  } catch (err) {
    console.error("Failed to load state:", err);
    state = JSON.parse(JSON.stringify(defaultState));
  }
}

function saveState() {
  state.lastTick = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn(err);
  }
}

function resetState() {
  if (!confirm("Reset your game? This will clear progress.")) return;
  localStorage.removeItem(STORAGE_KEY);
  loadState();
  renderAll();
}

/* --- Game logic --- */
function getItemCount(id) {
  const it = state.items.find(x => x.id === id);
  return it ? it.amount : 0;
}

function getCps() {
  return ITEM_DEFS.reduce((sum, d) => sum + d.baseCps * getItemCount(d.id), 0);
}

function getCost(def) {
  const owned = getItemCount(def.id);
  return Math.floor(def.baseCost * Math.pow(1.15, owned));
}

function formatNumber(v) {
  if (v < 1000) return Math.floor(v).toString();
  const units = ["K", "M", "B", "T", "Qa", "Qi"];
  let u = -1, n = v;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return `${parseFloat(n.toFixed(2))}${units[u]}`;
}

/* --- Rendering --- */
function renderAll() {
  pointsEl.textContent = formatNumber(state.points);
  cpsEl.textContent = formatNumber(getCps());
  clickPowerEl.textContent = state.clickPower;

  shopList.innerHTML = '';
  ITEM_DEFS.forEach(def => {
    const cost = getCost(def);
    const owned = getItemCount(def.id);
    const itemEl = document.createElement('div');
    itemEl.className = 'shop-item';
    itemEl.innerHTML = `
      <div class="item-icon">${def.emoji}</div>
      <div class="item-body">
        <div class="item-name">${def.name} <span style="color:var(--muted); font-weight:500; font-size:12px">x${owned}</span></div>
        <div class="item-desc">${def.desc} · ${def.baseCps}/s each</div>
      </div>
      <div class="item-right">
        <div style="font-weight:700">${formatNumber(cost)}</div>
        <button class="btn small buy" data-id="${def.id}">Buy</button>
      </div>
    `;
    shopList.appendChild(itemEl);
  });

  document.querySelectorAll('.buy').forEach(b => b.addEventListener('click', () => buyItem(b.dataset.id)));
}

/* --- Buying --- */
function buyItem(id) {
  const def = ITEM_DEFS.find(d => d.id === id);
  const cost = getCost(def);
  if (state.points < cost) { flashBuyFail(); return; }
  state.points -= cost;
  const slot = state.items.find(x => x.id === id);
  slot.amount++;
  renderAll();
  saveState();
}

function flashBuyFail() {
  pointsEl.style.transition = 'none';
  pointsEl.style.color = '#ff6b6b';
  setTimeout(() => { pointsEl.style.transition = ''; pointsEl.style.color = ''; }, 300);
}

/* --- Click behavior --- */
function clickCat() {
  state.points += state.clickPower;
  showFloatingNumber(`+${state.clickPower}`);
  spawnFallingCat();
  animateButton();
  renderAll();
}

function animateButton() {
  catBtn.animate([
    { transform: 'scale(1) rotate(0deg)' },
    { transform: 'scale(0.92) rotate(-6deg)' },
    { transform: 'scale(1.06) rotate(6deg)' },
    { transform: 'scale(1) rotate(0deg)' }
  ], { duration: 260, easing: 'cubic-bezier(.2,.9,.2,1)' });

  const ring = catBtn.querySelector('.ring');
  ring.style.transition = 'none';
  ring.style.opacity = '0.14';
  setTimeout(() => { ring.style.transition = 'opacity 420ms ease'; ring.style.opacity = '0'; }, 60);
}

function showFloatingNumber(text) {
  const el = document.createElement('div');
  el.className = 'floating-number';
  el.textContent = text;

  const btnRect = catBtn.getBoundingClientRect();
  const parentRect = document.querySelector('.center').getBoundingClientRect();
  const centerX = btnRect.left + btnRect.width / 2 - parentRect.left;
  const centerY = btnRect.top + btnRect.height * 0.28 - parentRect.top;
  const offsetX = (Math.random() - 0.5) * 80;
  el.style.left = `${centerX + offsetX}px`;
  el.style.top = `${centerY}px`;
  el.style.fontSize = `${14 + Math.random() * 8}px`;

  effectsLayer.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function spawnFallingCat() {
  const img = document.createElement('img');
  img.className = 'falling-cat';
  img.src = 'cat.png';
  img.draggable = false;

  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const startX = Math.random() * vw;
  const scale = 0.8 + Math.random() * 1.6;
  img.style.width = `${64 * scale}px`;

  const dur = 1400 + Math.random() * 900;
  img.style.animationDuration = `${dur}ms`;
  img.style.left = `${startX - (32 * scale)}px`;

  document.body.appendChild(img);
  setTimeout(() => img.remove(), dur + 80);
}

/* --- Keyboard & UI --- */
window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); clickCat(); } });

bigClickBoost.addEventListener('click', () => {
  const cost = Math.floor(50 * Math.pow(2, state.clickPower - 1));
  if (state.points < cost) { flashBuyFail(); return; }
  state.points -= cost;
  state.clickPower++;
  renderAll();
  saveState();
});

saveBtn.addEventListener('click', () => {
  saveState(); saveBtn.textContent = 'Saved ✓';
  setTimeout(() => saveBtn.textContent = 'Save', 1200);
});

resetBtn.addEventListener('click', resetState);
catBtn.addEventListener('click', clickCat);

/* --- Shop toggle --- */
shopToggle.addEventListener('click', () => {
  const isOpen = shopPanel.classList.toggle('open');
  mainPanel.classList.toggle('shifted', isOpen);
});

/* --- Game Tick --- */
function gameTick() {
  const now = Date.now();
  const dt = (now - state.lastTick) / 1000;
  state.lastTick = now;
  const gain = getCps() * dt;
  if (gain > 0) state.points += gain;
  renderAll();
}

/* --- Start --- */
function start() {
  loadState();
  renderAll();
  tickTimer = setInterval(gameTick, 500);
  window.addEventListener('beforeunload', saveState);
}

start();