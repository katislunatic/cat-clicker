// Cat Clicker - script.js
// Clean, simple clicker engine. Stores in localStorage.

const STORAGE_KEY = "catclicker_v1";

const defaultState = {
  points: 0,
  totalClicks: 0,
  clickPower: 1, // points per tap
  items: [],     // filled from ITEM_DEFS on load
  purchasedUpgrades: {},
  lastTick: Date.now(),
  totalEarned: 0
};

const ITEM_DEFS = [
  { id: "autoPurr", name: "Auto-Purr", desc: "Small auto cat purrs", baseCost: 10, baseCps: 0.1, emoji: "😺" },
  { id: "catnipFarm", name: "Catnip Farm", desc: "Produces cat points", baseCost: 120, baseCps: 1, emoji: "🌿" },
  { id: "laserFactory", name: "Laser Factory", desc: "High output laser pointers", baseCost: 1500, baseCps: 12, emoji: "🔦" },
  { id: "meowTeam", name: "Meow Team", desc: "Team of cats that meow", baseCost: 10000, baseCps: 80, emoji: "🎤" }
];

// state
let state = null;
let tickInterval = null;

// DOM
const catBtn = document.getElementById("catButton");
const catPointsEl = document.getElementById("catPoints");
const cpsEl = document.getElementById("cps");
const shopList = document.getElementById("shopList");
const clickPowerEl = document.getElementById("clickPower");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const bigClickBoost = document.getElementById("bigClickBoost");

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw){
      const parsed = JSON.parse(raw);
      // merge with defaults
      state = Object.assign({}, defaultState, parsed);
    } else {
      state = JSON.parse(JSON.stringify(defaultState));
    }
  } catch(e){
    console.error("Load state failed:", e);
    state = JSON.parse(JSON.stringify(defaultState));
  }

  // initialize items from defs (count and multiplier)
  if (!state.items || state.items.length !== ITEM_DEFS.length){
    state.items = ITEM_DEFS.map(it => ({ id: it.id, amount: 0 }));
  }
}

function saveState(){
  state.lastTick = Date.now();
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch(e){
    console.warn("Save failed:", e);
  }
}

function resetState(){
  if (!confirm("Reset your game? This will clear saved progress.")) return;
  localStorage.removeItem(STORAGE_KEY);
  loadState();
  renderAll();
}

// game math
function getItemCount(id){
  const it = state.items.find(x=>x.id===id);
  return it ? it.amount : 0;
}
function getCps(){
  // sum item cps
  let sum = 0;
  for (const def of ITEM_DEFS){
    const count = getItemCount(def.id);
    if (count <= 0) continue;
    // cost scaling for price calculation uses exponential growth in store, but cps is linear
    sum += def.baseCps * count;
  }
  return sum;
}

function formatNumber(v){
  if (v < 1000) return Math.floor(v).toString();
  const units = ["K","M","B","T","Qa","Qi"];
  let u = -1;
  let n = v;
  while(n >= 1000 && u < units.length-1){
    n /= 1000;
    u++;
  }
  return `${parseFloat(n.toFixed(2))}${units[u]}`;
}

// shop cost formula: baseCost * 1.15^owned
function getCost(def){
  const owned = getItemCount(def.id);
  return Math.floor(def.baseCost * Math.pow(1.15, owned));
}

// UI rendering
function renderAll(){
  catPointsEl.textContent = formatNumber(state.points);
  cpsEl.textContent = formatNumber(getCps());
  clickPowerEl.textContent = state.clickPower;

  // render shop items
  shopList.innerHTML = "";
  for (const def of ITEM_DEFS){
    const cost = getCost(def);
    const owned = getItemCount(def.id);
    const itemEl = document.createElement("div");
    itemEl.className = "shop-item";

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
  }

  // wire buy buttons
  document.querySelectorAll(".buy").forEach(btn=>{
    btn.addEventListener("click", ()=>buyItem(btn.dataset.id));
  });
}

function buyItem(id){
  const def = ITEM_DEFS.find(d=>d.id===id);
  if (!def) return;
  const cost = getCost(def);
  if (state.points < cost){
    // optionally flash UI
    flashBuyFail();
    return;
  }
  state.points -= cost;
  state.totalEarned += 0;
  const slot = state.items.find(x=>x.id===id);
  slot.amount += 1;
  renderAll();
  saveState();
}

function flashBuyFail(){
  // quick red flash on points element
  catPointsEl.style.transition = "none";
  catPointsEl.style.color = "#ff6b6b";
  setTimeout(()=>{ catPointsEl.style.transition = ""; catPointsEl.style.color = ""; }, 300);
}

// Click handling
function clickCat(){
  state.points += state.clickPower;
  state.totalClicks++;
  // tiny wiggle animation
  catBtn.animate([
    { transform: "translateY(0px) scale(1)" },
    { transform: "translateY(-6px) scale(1.03)" },
    { transform: "translateY(0px) scale(1)" }
  ], { duration: 220, easing: "cubic-bezier(.2,.9,.2,1)" });
  renderAll();
}

// periodic tick: smooth accrual sub-second
let accumulated = 0;
function gameTick(){
  const now = Date.now();
  const dt = (now - state.lastTick) / 1000; // seconds
  state.lastTick = now;

  const cps = getCps();
  const gain = cps * dt;
  if (gain > 0){
    state.points += gain;
    state.totalEarned += gain;
  }

  // auto-save less frequently is okay, but do a short debounce
  accumulated += dt;
  if (accumulated >= 3){
    saveState();
    accumulated = 0;
  }

  renderAll();
}

// keyboard space for clicking
window.addEventListener("keydown", (e)=>{
  if (e.code === "Space"){
    e.preventDefault();
    clickCat();
  }
});

// upgrade click power button (cheap)
bigClickBoost.addEventListener("click", ()=>{
  const cost = Math.floor(50 * Math.pow(2, state.clickPower-1));
  if (state.points < cost) { flashBuyFail(); return; }
  state.points -= cost;
  state.clickPower += 1;
  renderAll();
  saveState();
});

// manual save/reset
saveBtn.addEventListener("click", ()=>{
  saveState();
  saveBtn.textContent = "Saved ✓";
  setTimeout(()=>saveBtn.textContent = "Save", 1200);
});
resetBtn.addEventListener("click", resetState);

// attach click
catBtn.addEventListener("click", clickCat);

// initialize
function start(){
  loadState();
  renderAll();

  // run tick every 500ms for snappy UI
  tickInterval = setInterval(gameTick, 500);

  // ensure save on unload
  window.addEventListener("beforeunload", saveState);
}

start();
