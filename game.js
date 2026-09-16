const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const toast = document.querySelector('#toast');
const moneyEl = document.querySelector('#money');
const seedEl = document.querySelector('#seed-count');
const progressBar = document.querySelector('#progress-bar');
const progressLabel = document.querySelector('#progress-label');
const xpLabel = document.querySelector('#xp-label');

const world = { width: 960, height: 600, tile: 40 };
const keys = new Set();
const player = { x: 208, y: 350, speed: 3.2, direction: 'down', frame: 0 };
const field = { x: 576, y: 144, columns: 9, rows: 9, tile: 36 };
const farm = {
  money: 420,
  seeds: 3,
  fertilizer: 0,
  water: 3,
  day: 1,
  harvested: false,
  plots: Array.from({ length: field.columns * field.rows }, (_, index) => ({
    x: field.x + (index % field.columns) * field.tile,
    y: field.y + Math.floor(index / field.columns) * field.tile,
    state: 'empty',
    growth: 0
  }))
};
const trees = [
  [80, 82], [144, 90], [850, 96], [906, 150], [92, 510], [850, 490], [780, 535], [390, 82]
];
const rocks = [[285, 108], [520, 505], [900, 370], [350, 550]];
const playerRadius = 13;
const fixedColliders = [
  { x: 174, y: 62, width: 192, height: 186 },
  { x: 438, y: 102, width: 60, height: 60 }
];

function money(value) { return `R$ ${value.toLocaleString('pt-BR')}`; }
function showToast(message) { toast.textContent = message; toast.classList.remove('hidden'); clearTimeout(showToast.timeout); showToast.timeout = setTimeout(() => toast.classList.add('hidden'), 2600); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function activePlot() { return farm.plots.find(plot => distance(player, { x: plot.x + field.tile / 2, y: plot.y + field.tile / 2 }) < 42); }
function colliders() {
  const emptyPlots = farm.plots.filter(plot => plot.state === 'empty');
  return fixedColliders.concat(emptyPlots.map(plot => ({ x: plot.x - 3, y: plot.y - 3, width: field.tile + 6, height: field.tile + 6 })));
}
function overlapsCollider(x, y) {
  return colliders().some(collider => {
    const closestX = Math.max(collider.x, Math.min(x, collider.x + collider.width));
    const closestY = Math.max(collider.y, Math.min(y, collider.y + collider.height));
    return Math.hypot(x - closestX, y - closestY) < playerRadius;
  });
}
function tryMove(x, y) {
  if (!overlapsCollider(x, y)) { player.x = x; player.y = y; }
}
function damageCropsUnderPlayer() {
  const crop = farm.plots.find(plot => {
    const insideX = player.x > plot.x - playerRadius && player.x < plot.x + field.tile + playerRadius;
    const insideY = player.y > plot.y - playerRadius && player.y < plot.y + field.tile + playerRadius;
    return insideX && insideY && plot.state !== 'empty';
  });
  if (crop) {
    crop.state = 'empty';
    showToast('A plantação foi pisoteada neste quadrado.');
    updateHud();
  }
}
function stepsDone() { return farm.plots.filter(plot => plot.state === 'seed' || plot.state === 'ready').length + (farm.harvested ? 1 : 0); }
function updateHud() {
  moneyEl.textContent = money(farm.money); seedEl.textContent = farm.seeds; document.querySelector('#fertilizer-count').textContent = farm.fertilizer;
  const done = Math.min(3, stepsDone()); progressBar.style.width = `${done / 3 * 100}%`; progressLabel.textContent = `${done} de 3 etapas`; xpLabel.textContent = `+${done * 50} XP`;
}
function interact() {
  const plot = activePlot();
  const nearWell = distance(player, { x: 468, y: 132 }) < 60;
  if (plot) {
    if (plot.state === 'empty' && farm.seeds > 0) { plot.state = 'seed'; farm.seeds--; showToast('Semente plantada. Agora regue o canteiro!'); }
    else if (plot.state === 'seed' && farm.water > 0) { plot.state = 'ready'; farm.water--; showToast('Canteiro regado. A cenoura está pronta!'); }
    else if (plot.state === 'seed' && farm.fertilizer > 0) { plot.state = 'ready'; farm.fertilizer--; showToast('Adubo aplicado. A cenoura cresceu!'); }
    else if (plot.state === 'ready') { farm.money += 85; farm.harvested = true; plot.state = 'empty'; showToast('Colheita vendida por R$ 85. Bom trabalho!'); }
    else if (!farm.seeds) showToast('Você ficou sem sementes. Compre mais na bolsa.');
    else showToast('Você precisa buscar água no poço.');
    updateHud(); return;
  }
  if (nearWell) { farm.water = 3; showToast('Baldes cheios. Volte aos canteiros!'); return; }
  showToast('Aproxime-se de um canteiro, do poço ou do galpão.');
}
function buySeeds() { if (farm.money >= 45) { farm.money -= 45; farm.seeds += 3; showToast('Mais 3 sementes na sua bolsa.'); updateHud(); } else showToast('Saldo insuficiente para comprar sementes.'); }
function buyFertilizer() { if (farm.money >= 60) { farm.money -= 60; farm.fertilizer += 2; showToast('Você comprou 2 sacos de adubo.'); updateHud(); } else showToast('Saldo insuficiente para comprar adubo.'); }
document.querySelector('#buy-seeds').addEventListener('click', buySeeds);
document.querySelector('#buy-fertilizer').addEventListener('click', buyFertilizer);
window.addEventListener('keydown', event => { keys.add(event.key.toLowerCase()); if (event.key.toLowerCase() === 'e' || event.key === ' ') { event.preventDefault(); interact(); } });
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));

function update() {
  let dx = 0, dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy--; if (keys.has('s') || keys.has('arrowdown')) dy++; if (keys.has('a') || keys.has('arrowleft')) dx--; if (keys.has('d') || keys.has('arrowright')) dx++;
  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    const moveX = dx / length * player.speed;
    const moveY = dy / length * player.speed;
    tryMove(player.x + moveX, player.y);
    tryMove(player.x, player.y + moveY);
    damageCropsUnderPlayer();
    player.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); player.frame += .15;
  }
  player.x = Math.max(28, Math.min(world.width - 28, player.x)); player.y = Math.max(28, Math.min(world.height - 28, player.y));
}
function roundedRect(x, y, w, h, r, fill, stroke) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } }
function drawTree(x, y) { ctx.fillStyle = '#795337'; ctx.fillRect(x - 5, y + 20, 10, 24); ctx.fillStyle = '#356b48'; ctx.beginPath(); ctx.arc(x, y + 13, 25, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4e8754'; ctx.beginPath(); ctx.arc(x - 14, y + 4, 15, 0, Math.PI * 2); ctx.arc(x + 13, y + 2, 17, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#709f5a'; ctx.beginPath(); ctx.arc(x - 5, y - 1, 7, 0, Math.PI * 2); ctx.fill(); }
function drawWorld() {
  ctx.fillStyle = '#83ad6c'; ctx.fillRect(0, 0, world.width, world.height);
  ctx.fillStyle = 'rgba(255,255,255,.06)'; for (let x = 0; x < world.width; x += 80) ctx.fillRect(x, 0, 2, world.height);
  ctx.fillStyle = '#d4bd82'; ctx.fillRect(0, 300, world.width, 64); ctx.fillStyle = '#e2cc91'; ctx.fillRect(0, 325, world.width, 9);
  ctx.fillStyle = '#6e9e62'; ctx.fillRect(0, 364, world.width, 3);
  // pond and dock
  ctx.fillStyle = '#559ba8'; ctx.beginPath(); ctx.ellipse(785, 310, 105, 66, -.12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(220,246,236,.4)'; ctx.beginPath(); ctx.ellipse(770, 293, 52, 11, -.1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#98724c'; for (let i = 0; i < 4; i++) ctx.fillRect(723 + i * 15, 350, 13, 56);
  // barn
  ctx.fillStyle = '#bf6045'; ctx.fillRect(190, 128, 160, 120); ctx.fillStyle = '#e0a06a'; ctx.beginPath(); ctx.moveTo(174, 128); ctx.lineTo(270, 62); ctx.lineTo(366, 128); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#a54e3c'; ctx.fillRect(246, 170, 48, 78); ctx.strokeStyle = '#803f35'; ctx.lineWidth = 3; ctx.strokeRect(246, 170, 48, 78); ctx.fillStyle = '#f2d477'; ctx.fillRect(205, 157, 28, 25); ctx.fillRect(307, 157, 28, 25); ctx.fillStyle = '#fff2c1'; ctx.fillRect(216, 166, 6, 7); ctx.fillRect(318, 166, 6, 7);
  // well
  ctx.fillStyle = '#d9e0d2'; ctx.beginPath(); ctx.arc(468, 132, 28, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#659da1'; ctx.beginPath(); ctx.arc(468, 132, 19, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#8c6a4b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(442, 112); ctx.lineTo(494, 112); ctx.moveTo(447, 101); ctx.lineTo(447, 143); ctx.moveTo(489, 101); ctx.lineTo(489, 143); ctx.stroke(); ctx.fillStyle = '#5c8f55'; ctx.font = 'bold 11px DM Sans'; ctx.fillText('POÇO', 448, 179);
  trees.forEach(tree => drawTree(...tree)); rocks.forEach(([x, y]) => { ctx.fillStyle = '#8b9a82'; ctx.beginPath(); ctx.ellipse(x, y, 15, 9, -.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#a8b6a0'; ctx.beginPath(); ctx.ellipse(x - 4, y - 3, 6, 3, -.2, 0, Math.PI * 2); ctx.fill(); });
  farm.plots.forEach(plot => { roundedRect(plot.x, plot.y, field.tile, field.tile, 3, '#936a46', '#725037'); ctx.strokeStyle = '#b78a5b'; ctx.lineWidth = 2; for (let line = 0; line < 3; line++) { ctx.beginPath(); ctx.moveTo(plot.x + 5, plot.y + 9 + line * 9); ctx.lineTo(plot.x + field.tile - 5, plot.y + 9 + line * 9); ctx.stroke(); } if (plot.state === 'seed' || plot.state === 'ready') { ctx.fillStyle = plot.state === 'ready' ? '#efa63e' : '#6e9c48'; for (let i = 0; i < (plot.state === 'ready' ? 4 : 2); i++) { const px = plot.x + 10 + (i % 2) * 16, py = plot.y + 12 + Math.floor(i / 2) * 15; ctx.beginPath(); ctx.arc(px, py, plot.state === 'ready' ? 6 : 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#477c47'; ctx.fillRect(px - 2, py - 8, 4, 8); ctx.fillStyle = plot.state === 'ready' ? '#efa63e' : '#6e9c48'; } } if (activePlot() === plot) { ctx.strokeStyle = '#f9d872'; ctx.lineWidth = 3; ctx.strokeRect(plot.x - 3, plot.y - 3, field.tile + 6, field.tile + 6); } });
}
function drawPlayer() { const bob = Math.sin(player.frame) * 1.5; ctx.save(); ctx.translate(player.x, player.y + bob); ctx.fillStyle = 'rgba(30,50,30,.2)'; ctx.beginPath(); ctx.ellipse(0, 15, 14, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#304c3a'; ctx.fillRect(-10, 2, 8, 14); ctx.fillRect(2, 2, 8, 14); ctx.fillStyle = '#e3aa69'; ctx.beginPath(); ctx.arc(0, -8, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d38d48'; ctx.beginPath(); ctx.arc(0, -14, 14, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#577f4a'; ctx.fillRect(-15, -13, 30, 4); ctx.fillStyle = '#273a2e'; ctx.beginPath(); ctx.arc(player.direction === 'left' ? -5 : 5, -8, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
function draw() { ctx.clearRect(0, 0, world.width, world.height); drawWorld(); drawPlayer(); requestAnimationFrame(loop); }
function loop() { update(); draw(); }
updateHud(); showToast('Use WASD ou as setas para andar'); requestAnimationFrame(loop);
