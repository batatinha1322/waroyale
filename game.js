/* ========== Protótipo básico de War Royale ========== 
   - Canvas single-lane
   - Elixir regen
   - 8 cards (Arena1)
   - Units move -> attack -> die
   - Simple AI spawns
*/

/* ---------- CONFIG ---------- */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_W = canvas.width;
const GAME_H = canvas.height;

let lastTime = 0;

/* ---------- TOWER / GAME STATE ---------- */
const leftTower = { x: 40, y: GAME_H/2 - 60, w: 80, h: 120, hp: 3000, team:'player' };
const rightTower = { x: GAME_W - 120, y: GAME_H/2 - 60, w: 80, h: 120, hp: 3000, team:'enemy' };

document.getElementById('left-tower-hp').innerText = leftTower.hp;
document.getElementById('right-tower-hp').innerText = rightTower.hp;

/* ---------- ELIXIR ---------- */
let elixir = 0;
const MAX_ELIXIR = 10;
const ELIXIR_PER_SEC = 1; // regen speed
const ELIXIR_TICK_MS = 250; // update step

setInterval(() => {
  elixir = Math.min(MAX_ELIXIR, elixir + (ELIXIR_PER_SEC * ELIXIR_TICK_MS/1000));
  updateElixirUI();
}, ELIXIR_TICK_MS);

function updateElixirUI(){
  const value = Math.floor(elixir);
  document.getElementById('elixir-value').innerText = value;
  const pct = Math.max(0, Math.min(1, elixir / MAX_ELIXIR));
  document.getElementById('elixir-fill').style.width = `${pct * 100}%`;
  // also update cards disabled state
  document.querySelectorAll('.card').forEach(c => {
    const cost = parseInt(c.dataset.cost,10);
    if (elixir >= cost) c.classList.remove('disabled'); else c.classList.add('disabled');
  });
}

/* ---------- UNIT DEFINITIONS (Arena 1) ---------- */
/* Using the stats you approved */
const UNIT_DEFS = {
  'Soldado': { cost:3, hp:650, dmg:120, atkSpeed:1.1, speed:48, range:20, target:'ground', size:20 },
  'Arqueira': { cost:2, hp:280, dmg:85, atkSpeed:1.0, speed:52, range:160, target:'air_ground', size:18, isRanged:true },
  'EsquadrãoGoblin': { cost:3, hp:150, dmg:60, atkSpeed:1.0, speed:96, range:20, target:'ground', size:12, group:3 },
  'Cannon': { cost:3, hp:900, dmg:110, atkSpeed:0.9, speed:0, range:160, target:'ground', size:22, isStructure:true, duration:30000 },
  'Cavaleiro': { cost:4, hp:1300, dmg:140, atkSpeed:1.2, speed:36, range:20, target:'ground', size:24 },
  'Feiticeiro': { cost:4, hp:480, dmg:110, atkSpeed:1.4, speed:40, range:140, target:'air_ground', size:18, isRanged:true },
  'Bombardeiro': { cost:5, hp:900, dmg:240, atkSpeed:1.6, speed:32, range:26, target:'ground', size:28, aoe:30 },
  'Guardiao': { cost:5, hp:1000, dmg:170, atkSpeed:1.0, speed:64, range:22, target:'ground', size:26, critChance:0.2, critMult:2.5 }
};

/* ---------- ENTITIES ---------- */
const entities = []; // units in field

function spawnUnit(key, team){
  const def = UNIT_DEFS[key];
  if (!def) return;
  // if group (EsquadrãoGoblin), spawn 3 close units
  if (def.group && def.group > 1){
    for (let i=0;i<def.group;i++){
      const e = createEntity(def, team, i);
      entities.push(e);
    }
    return;
  }
  const e = createEntity(def, team, 0);
  entities.push(e);
}

function createEntity(def, team, idx){
  const side = (team==='player') ? 1 : -1;
  const spawnX = (team==='player') ? leftTower.x + leftTower.w + 30 + idx*6 : rightTower.x - 30 - idx*6;
  const spawnY = GAME_H/2 + (Math.random()*40 - 20);
  return {
    key:null,
    def,
    x: spawnX,
    y: spawnY,
    vx: (team==='player') ? def.speed/60 : -def.speed/60,
    hp: def.hp,
    team,
    target:null,
    lastAtk:0,
    created:performance.now(),
    size: def.size || 18,
    aoe: def.aoe || 0,
    isRanged: def.isRanged || false,
    isStructure: def.isStructure || false,
    duration: def.duration || 0
  };
}

/* ---------- SIMPLE AI ---------- */
const enemyAI = {
  deck:['Soldado','Arqueira','Cavaleiro','Feiticeiro','EsquadrãoGoblin','Cannon','Bombardeiro','Guardiao'],
  chooseAndPlay(){
    // pick a random card affordable
    const affordable = this.deck.filter(k => UNIT_DEFS[k].cost <= Math.floor(elixir));
    if (affordable.length === 0) return;
    const choice = affordable[Math.floor(Math.random()*affordable.length)];
    // spend elixir and spawn on enemy side
    elixir -= UNIT_DEFS[choice].cost;
    spawnUnit(choice, 'enemy');
    updateElixirUI();
  },
  thinkInterval: 1400,
  start(){
    setInterval(() => this.chooseAndPlay(), this.thinkInterval + Math.random()*800);
  }
};
enemyAI.start();

/* ---------- CARDS UI ---------- */
const arena1Cards = ['Soldado','Arqueira','EsquadrãoGoblin','Cannon','Cavaleiro','Feiticeiro','Bombardeiro','Guardiao'];
const cardsContainer = document.getElementById('cards');

arena1Cards.forEach(name => {
  const def = UNIT_DEFS[name];
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.unit = name;
  card.dataset.cost = def.cost;
  card.innerHTML = `
    <div class="art">${name}</div>
    <div class="name">${name}</div>
    <div class="cost">${def.cost}</div>
  `;
  card.addEventListener('click', () => {
    if (elixir < def.cost) return;
    // spend and spawn
    elixir -= def.cost;
    spawnUnit(name, 'player');
    updateElixirUI();
  });
  cardsContainer.appendChild(card);
});


/* ---------- GAME LOOP ---------- */

function update(dt) {
  // update entities
  const now = performance.now();

  // remove expired structures
  for (let i=entities.length-1;i>=0;i--){
    const e = entities[i];
    if (e.isStructure && e.duration){
      if (now - e.created > e.duration) entities.splice(i,1);
    }
    if (e.hp <= 0) entities.splice(i,1);
  }

  // movement and basic combat: find nearest enemy in front within range, else move
  for (let i=0;i<entities.length;i++){
    const e = entities[i];
    if (e.team === 'player' && e.x > rightTower.x) continue; // reached enemy tower
    if (e.team === 'enemy' && e.x < leftTower.x + leftTower.w) continue;
    // if unit is ranged, check for targets in range else move; melee similar but shorter
    const target = findTarget(e);
    if (target){
      // attack if cooldown passed
      if (now - e.lastAtk >= (e.def.atkSpeed || e.def.atkSpeed === 0 ? e.def.atkSpeed*1000 : 1000)){
        e.lastAtk = now;
        // damage logic
        const damage = e.def.dmg * ( (Math.random() < (e.def.critChance||0)) ? (e.def.critMult||2) : 1 );
        applyDamageToTarget(target, damage, e);
      }
    } else {
      // move
      if (!e.isStructure){
        e.x += e.vx * dt*0.06; // scale motion
      }
    }
    // if reaches towers, attack tower
    if (e.team === 'player' && e.x + e.size/2 >= rightTower.x){
      // attack tower
      const diff = Math.max(0, (performance.now() - e.lastAtk));
      if (now - e.lastAtk >= (e.def.atkSpeed*1000)){
        e.lastAtk = now;
        rightTower.hp -= e.def.dmg;
        if (rightTower.hp < 0) rightTower.hp = 0;
        document.getElementById('right-tower-hp').innerText = Math.floor(rightTower.hp);
      }
    }
    if (e.team === 'enemy' && e.x - e.size/2 <= leftTower.x + leftTower.w){
      if (now - e.lastAtk >= (e.def.atkSpeed*1000)){
        e.lastAtk = now;
        leftTower.hp -= e.def.dmg;
        if (leftTower.hp < 0) leftTower.hp = 0;
        document.getElementById('left-tower-hp').innerText = Math.floor(leftTower.hp);
      }
    }
  }
}

function findTarget(e){
  // prioritize enemy units in front within range; otherwise towers
  let candidates = entities.filter(o => o.team !== e.team);
  // find nearest within range
  for (let o of candidates){
    const dist = Math.abs(o.x - e.x);
    if (dist <= (e.isRanged ? e.def.range : 26 + (e.size/2))) return o;
  }
  // if no units, return tower if in range
  if (e.team === 'player'){
    const distToTower = Math.abs(rightTower.x - e.x);
    if (distToTower <= (e.def.range || 26)) return rightTower;
  } else {
    const distToTower = Math.abs(leftTower.x + leftTower.w - e.x);
    if (distToTower <= (e.def.range || 26)) return leftTower;
  }
  return null;
}

function applyDamageToTarget(target, damage, attacker){
  if (target.isTower || target === leftTower || target === rightTower){
    if (target === leftTower || target === rightTower){
      if (target === leftTower){ leftTower.hp -= damage; if (leftTower.hp<0) leftTower.hp=0; document.getElementById('left-tower-hp').innerText = Math.floor(leftTower.hp); }
      if (target === rightTower){ rightTower.hp -= damage; if (rightTower.hp<0) rightTower.hp=0; document.getElementById('right-tower-hp').innerText = Math.floor(rightTower.hp); }
    }
    return;
  }
  target.hp -= damage;
  // if target dies, give small effect (handled by cleanup)
}

/* ---------- RENDER ---------- */
function render(){
  // clear
  ctx.clearRect(0,0,GAME_W,GAME_H);
  // draw ground lane
  ctx.fillStyle = '#0c0c0d';
  ctx.fillRect(0,GAME_H/2+60,GAME_W,60);
  // draw towers
  drawTower(leftTower);
  drawTower(rightTower);
  // draw entities
  for (let e of entities){
    drawEntity(e);
  }
}

function drawTower(t){
  ctx.save();
  ctx.fillStyle = (t.team==='player') ? '#162b1b' : '#2b1212';
  ctx.fillRect(t.x, t.y, t.w, t.h);
  // hp bar
  const pct = Math.max(0, Math.min(1, t.hp / 3000));
  ctx.fillStyle = '#222';
  ctx.fillRect(t.x, t.y-10, t.w, 6);
  ctx.fillStyle = '#ffdd66';
  ctx.fillRect(t.x, t.y-10, t.w * pct, 6);
  ctx.restore();
}

function drawEntity(e){
  ctx.save();
  const isPlayer = e.team === 'player';
  // body
  ctx.beginPath();
  ctx.fillStyle = isPlayer ? '#8fe88f' : '#e88f8f';
  ctx.arc(e.x, e.y, e.size, 0, Math.PI*2);
  ctx.fill();
  // hp bar
  ctx.fillStyle = '#222';
  ctx.fillRect(e.x - e.size, e.y - e.size - 8, e.size*2, 5);
  ctx.fillStyle = '#ffdd66';
  const pct = Math.max(0, Math.min(1, e.hp / e.def.hp));
  ctx.fillRect(e.x - e.size, e.y - e.size - 8, e.size*2 * pct, 5);
  ctx.restore();
}

/* ---------- LOOP ---------- */
function gameLoop(timestamp){
  if (!lastTime) lastTime = timestamp;
  const dt = timestamp - lastTime;
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

/* ---------- helper: spawn enemy periodically if few units ---------- */
setInterval(()=>{
  // if no enemy units on field, spawn a small wave
  const enemyUnits = entities.filter(e => e.team === 'enemy');
  if (enemyUnits.length < 3 && elixir >= 2){
    // spawn a random affordable enemy card sometimes
    const affordable = Object.keys(UNIT_DEFS).filter(k => UNIT_DEFS[k].cost <= Math.floor(elixir));
    if (affordable.length > 0){
      const choice = affordable[Math.floor(Math.random()*affordable.length)];
      elixir -= UNIT_DEFS[choice].cost;
      spawnUnit(choice,'enemy');
      updateElixirUI();
    }
  }
}, 2000);
