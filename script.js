// Cat Clicker with custom button + floating +X numbers

const STORAGE_KEY = "catclicker_v1";

const defaultState = {
  points: 0,
  clickPower: 1,
  items: [],
  lastTick: Date.now()
};

const ITEM_DEFS = [
  { id: "autoPurr", name: "Auto-Purr", desc: "Small auto purrs", baseCost: 10, baseCps: 0.1, emoji: "😺" },
  { id: "catnipFarm", name: "Catnip Farm", desc: "Produces cat points", baseCost: 120, baseCps: 1, emoji: "🌿" },
  { id: "laserFactory", name: "Laser Factory", desc: "High output lasers", baseCost: 1500, baseCps: 12, emoji: "🔦" },
  { id: "meowTeam", name: "Meow Team", desc: "Team of meowing cats", baseCost: 10000, baseCps: 80, emoji: "🎤" }
];

let state = null;
let tickInterval = null;

const catBtn = document.getElementById("catButton");
const catPointsEl = document.getElementById("catPoints");
const cpsEl = document.getElementById("cps");
const shopList = document.getElementById("shopList");
const clickPowerEl = document.getElementById("clickPower");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const bigClickBoost = document.getElementById("bigClickBoost");
const floatContainer = document.getElementById("floatContainer");

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    state = JSON.parse(raw);
  } else {
    state = JSON.parse(JSON.stringify(defaultState));
    state.items = ITEM_DEFS.map(it => ({ id: it.id, amount: 0 }));
  }
  if (!state.items || state.items.length !== ITEM_DEFS.length) {
    state.items = ITEM_DEFS.map(it => ({ id: it.id, amount: 0 }));
  }
}

function saveState() {
  state.lastTick = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  if (!confirm("Reset your game?")) return;
  localStorage.removeItem(STORAGE_KEY);
  loadState();
  renderAll();
}

function getItemCount(id) {
  const it = state.items.find(x => x.id === id);
  return it ? it.amount : 0;
}

function getCps() {
  return ITEM_DEFS.reduce((sum, def) => {
    return sum + def.baseCps * getItemCount(def.id);
  }, 0);
}

function formatNumber(v) {
  if (v < 1000) return Math.floor(v).toString();
  const units = ["K","M","B","T"];
  let u = -1;
  let n = v;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  return `${parseFloat(n.toFixed(2))}${units[u]}`;
}

function getCost(def) {
  const owned = getItemCount(def.id);
  return Math.floor(def.baseCost * Math.pow(1.15, owned));
}

function renderAll() {
  catPointsEl.textContent = formatNumber(state.points);
  cpsEl.textContent = formatNumber(getCps());
  clickPowerEl.textContent = state.clickPower;

  shopList.innerHTML = "";
  ITEM_DEFS.forEach(def => {
    const cost = getCost(def);
    const owned = getItemCount(def.id);

    const itemEl = document.createElement("div");
    itemEl.className = "shop-item";
    itemEl.innerHTML = `
      <div class="item-icon">${def.emoji}</div>
      <div class="item-body">
        <div class="item-name">${def.name} <span style="color: var(--muted); font-weight:500; font-size:12px">x${owned}</span></div>
        <div class="item-desc">${def.desc} · ${def.baseCps}/s each</div>
      </div>
      <div class="item-right">
        <div style="font-weight:700">${formatNumber(cost)}</div>
        <button class="btn small buy" data-id="${def.id}">Buy</button>
      </div>
    `;
    shopList.appendChild(itemEl);
  });

  document.querySelectorAll(".buy").forEach(btn => {
    btn.addEventListener("click", () => {
      buyItem(btn.dataset.id);
    });
  });
}

function buyItem(id) {
  const def = ITEM_DEFS.find(d => d.id === id);
  const cost = getCost(def);
  if (state.points < cost) {
    flashBuyFail();
    return;
  }
  state.points -= cost;
  const slot = state.items.find(x => x.id === id);
  slot.amount++;
  renderAll();
  saveState();
}

function flashBuyFail() {
  catPointsEl.style.transition = "none";
  catPointsEl.style.color = "#ff6b6b";
  setTimeout(() => {
    catPointsEl.style.transition = "";
    catPointsEl.style.color = "";
  }, 300);
}

function clickCat() {
  state.points += state.clickPower;
  showFloatingNumber(`+${state.clickPower}`);
  animateClick();
  renderAll();
}

function animateClick() {
  catBtn.animate([
    { transform: "scale(1) rotate(0deg)" },
    { transform: "scale(0.9) rotate(-2deg)" },
    { transform: "scale(1.02) rotate(2deg)" },
    { transform: "scale(1) rotate(0deg)" }
  ], { duration: 200, easing: "cubic-bezier(.2,.9,.2,1)" });
}

function showFloatingNumber(text) {
  const el = document.createElement("div");
  el.className = "floating-number";
  el.textContent = text;
  // random horizontal position within the button
  const rect = catBtn.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  // position relative to container
  const parentRect = floatContainer.getBoundingClientRect();
  el.style.left = `${x - parentRect.left}px`;
  el.style.top = `${y - parentRect.top}px`;
  floatContainer.appendChild(el);

  el.addEventListener("animationend", () => {
    el.remove();
  });
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    clickCat();
  }
});

bigClickBoost.addEventListener("click", () => {
  const cost = Math.floor(50 * Math.pow(2, state.clickPower - 1));
  if (state.points < cost) {
    flashBuyFail();
    return;
  }
  state.points -= cost;
  state.clickPower += 1;
  renderAll();
  saveState();
});

saveBtn.addEventListener("click", () => {
  saveState();
  saveBtn.textContent = "Saved ✓";
  setTimeout(() => saveBtn.textContent = "Save", 1200);
});

resetBtn.addEventListener("click", resetState);

catBtn.addEventListener("click", clickCat);

function gameTick() {
  const now = Date.now();
  const dt = (now - state.lastTick) / 1000;
  state.lastTick = now;

  const cps = getCps();
  const gain = cps * dt;
  if (gain > 0) {
    state.points += gain;
  }
  renderAll();
}

function start() {
  loadState();
  renderAll();
  tickInterval = setInterval(gameTick, 500);
  window.addEventListener("beforeunload", saveState);
}

start();