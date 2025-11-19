// ================================
// CONFIGURAÇÕES
// ================================
const MAX_ELIXIR = 10;
const ELIXIR_PER_SEC = 1;
const ELIXIR_TICK_MS = 500;

// Elixir separado para jogador e inimigo
let playerElixir = 0;
let enemyElixir = 0;

// ================================
// DEFINIÇÃO DAS CARTAS
// ================================
const UNIT_DEFS = {
  "Guerreiro": { hp: 200, dmg: 40, spd: 1, cost: 3, color: "#c33" },
  "Arqueiro":  { hp: 100, dmg: 25, spd: 1.2, cost: 2, color: "#3c3" },
  "Boblin": {
    hp: 50, dmg: 10, spd: 1.6, cost: 3, color: "#5bc",
    spawnCount: 3
  }
};

const DECK = ["Guerreiro","Arqueiro","Boblin"];

// ================================
// INTERFACE DAS CARTAS
// ================================
const cardsDiv = document.getElementById("cards");

DECK.forEach(name => {
  const c = document.createElement("div");
  c.className = "card disabled";
  c.dataset.cost = UNIT_DEFS[name].cost;

  c.innerHTML = `
    <div class="name">${name}</div>
    <div class="art">${name}</div>
    <div class="cost">${UNIT_DEFS[name].cost}</div>
  `;

  c.addEventListener("click", () => {
    const cost = UNIT_DEFS[name].cost;
    if (playerElixir < cost) return;

    playerElixir -= cost;
    spawnUnit(name, "player");
    updateElixirUI();
  });

  cardsDiv.appendChild(c);
});

// ================================
// FUNÇÃO DE ATUALIZAR O ELIXIR
// ================================
function updateElixirUI(){
  const value = Math.floor(playerElixir);
  document.getElementById("elixir-value").innerText = value;

  const pct = value / MAX_ELIXIR;
  document.getElementById("elixir-fill").style.width = `${pct * 100}%`;

  document.querySelectorAll(".card").forEach(c => {
    const cost = parseInt(c.dataset.cost);
    if (playerElixir >= cost) c.classList.remove("disabled");
    else c.classList.add("disabled");
  });
}

// ================================
// REGENERAÇÃO AUTOMÁTICA DE ELIXIR
// ================================
setInterval(() => {
  const inc = ELIXIR_PER_SEC * (ELIXIR_TICK_MS/1000);

  playerElixir = Math.min(MAX_ELIXIR, playerElixir + inc);
  enemyElixir  = Math.min(MAX_ELIXIR, enemyElixir  + inc);

  updateElixirUI();
}, ELIXIR_TICK_MS);

// ================================
// CANVAS / RENDERIZAÇÃO
// ================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let units = [];

// ================================
// SPAWN DE UNIDADE
// ================================
function spawnUnit(name, owner){
  const def = UNIT_DEFS[name];

  const x = owner === "player" ? 200 : 800;
  const y = 200;

  const count = def.spawnCount || 1;

  for (let i = 0; i < count; i++){
    units.push({
      name,
      owner,
      x: x + i * 20,
      y,
      hp: def.hp,
      dmg: def.dmg,
      spd: def.spd,
      color: def.color
    });
  }
}

// ================================
// IA INIMIGA (usa elixir separado)
// ================================
setInterval(() => {
  if (enemyElixir < 2) return;

  const affordable = DECK.filter(n => UNIT_DEFS[n].cost <= enemyElixir);
  if (affordable.length === 0) return;

  const choice = affordable[Math.floor(Math.random()*affordable.length)];
  enemyElixir -= UNIT_DEFS[choice].cost;
  spawnUnit(choice, "enemy");
}, 2000);

// ================================
// LOOP DO JOGO
// ================================
function loop(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  units.forEach(u => {
    u.x += u.owner === "player" ? u.spd : -u.spd;

    ctx.fillStyle = u.color;
    ctx.fillRect(u.x - 10, u.y - 10, 20, 20);
  });

  requestAnimationFrame(loop);
}

loop();
