import * as THREE from 'three';
import './style.css';
import { BLOCKS, Block, FRUITS, HOUSE_BLOCKS, createAtlasCanvas, createAtlasTexture, isCross } from './blocks';
import { Dialog } from './dialog';
import { Drops } from './drops';
import { Hud } from './hud';
import { Inventory, starterKit } from './inventory';
import { SHELLS, breakInfo, dropFor, fruitItemFor, itemDef, toolNameFor } from './items';
import { Player } from './player';
import { raycast } from './raycast';
import { deleteGame, loadGame, saveGame } from './save';
import { Shop, formatBerries } from './shop';
import { Sky } from './sky';
import { type Villager, createVillagers } from './villagers';
import { WATER_SURFACE, World } from './world';

const RENDER_RADIUS = 6;
const REACH = 6;
const FOG_NEAR = RENDER_RADIUS * 16 * 0.55;
const FOG_FAR = RENDER_RADIUS * 16 * 0.95;
/** Días reales que tarda en volver a salir la fruta de un árbol, como en Animal Crossing. */
const FRUIT_REGROW_DAYS = 3;
const SHELLS_PER_DAY = 7;

// Para probar otras horas: ?hora=21.5
const params = new URLSearchParams(location.search);
const hourOverride = params.has('hora') && Number.isFinite(Number(params.get('hora'))) ? Number(params.get('hora')) : null;

// --- Escena ---

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const fog = new THREE.Fog(0xa8dcf5, FOG_NEAR, FOG_FAR);
scene.fog = fog;
scene.background = fog.color;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);

const hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a9a7a, 1.6);
const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.4);
scene.add(hemi, sunLight);
const sky = new Sky(scene, hemi, sunLight);

const atlas = createAtlasCanvas();
const material = new THREE.MeshLambertMaterial({
  map: createAtlasTexture(atlas),
  vertexColors: true,
  alphaTest: 0.5,
  side: THREE.DoubleSide, // las plantas se ven por los dos lados
});

// --- Partida guardada ---

const save = loadGame();
const seed = save?.seed ?? Math.floor(Math.random() * 1e9);
const world = new World(seed, material, save?.edits ?? {});
scene.add(world.group);

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

// La fruta cogida hace días vuelve a crecer en el mismo sitio.
const harvested: Record<string, number> = { ...(save?.harvested ?? {}) };
for (const [k, t] of Object.entries(harvested)) {
  if (Date.now() - t < FRUIT_REGROW_DAYS * 86_400_000) continue;
  const [x, y, z] = k.split(',').map(Number);
  world.clearEdit(x, y, z);
  delete harvested[k];
}
const shellsTaken = new Set(save?.shells?.day === today ? save.shells.taken : []);
const branchTrees = new Set(save?.branches?.day === today ? save.branches.trees : []);

const player = new Player(world, camera);
if (save?.player) {
  player.position.set(save.player.x, save.player.y, save.player.z);
  player.yaw = save.player.yaw;
  player.pitch = save.player.pitch;
} else {
  const [sx, sz] = world.findSpawn(0, 0);
  player.spawnAt(sx, sz);
}

const villagers = createVillagers(world, save?.villagers ?? {});
for (const v of villagers) scene.add(v.group);

const inventory = new Inventory();
if (save?.inventory) inventory.load(save.inventory);
else starterKit(inventory);

let wallet = save?.wallet ?? 500;
const walletEl = document.querySelector<HTMLSpanElement>('#wallet-amount')!;
function setWallet(n: number) {
  wallet = n;
  walletEl.textContent = formatBerries(n);
}
setWallet(wallet);

let savedRevision = world.revision;
let saving = true;
function persist() {
  if (!saving) return;
  const p = player.position;
  saveGame({
    version: 1,
    seed,
    edits: world.exportEdits(),
    player: { x: p.x, y: p.y, z: p.z, yaw: player.yaw, pitch: player.pitch },
    inventory: inventory.serialize(),
    harvested,
    shells: { day: today, taken: [...shellsTaken] },
    branches: { day: today, trees: [...branchTrees] },
    villagers: Object.fromEntries(villagers.map((v) => [v.name, v.memory])),
    wallet,
  });
  savedRevision = world.revision;
}
setInterval(persist, 10_000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persist();
});
window.addEventListener('pagehide', persist);

// --- Mar ---

const water = new THREE.Mesh(
  new THREE.PlaneGeometry(1200, 1200),
  new THREE.MeshLambertMaterial({ color: 0x3fa9d6, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide }),
);
water.rotation.x = -Math.PI / 2;
water.position.y = WATER_SURFACE;
water.renderOrder = 1;
scene.add(water);

// Nubes de bloques que pasan despacio.
const clouds = new THREE.Group();
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: false });
{
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const r = (n: number) => {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < 40; i++) {
    const c = new THREE.Mesh(geo, cloudMat);
    c.scale.set(8 + r(i) * 14, 2, 6 + r(i + 50) * 10);
    c.position.set((r(i + 100) - 0.5) * 300, 70 + r(i + 200) * 6, (r(i + 300) - 0.5) * 300);
    clouds.add(c);
  }
}
scene.add(clouds);

// Contorno del bloque al que apuntas.
const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
  new THREE.LineBasicMaterial({ color: 0x1b2a14, transparent: true, opacity: 0.6 }),
);
highlight.visible = false;
scene.add(highlight);

// --- Objetos por el suelo ---

const drops = new Drops(world, atlas);
scene.add(drops.group);

// Cada día real aparecen conchas nuevas en la playa.
{
  let s = (seed ^ Number(today.replace(/-/g, ''))) >>> 0;
  const random = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  world.beachSpots(SHELLS_PER_DAY, random).forEach(([x, y, z], i) => {
    if (shellsTaken.has(i)) return;
    const id = SHELLS[Math.floor(random() * SHELLS.length)];
    drops.spawn(id, x + 0.5, y + 0.3, z + 0.5, { onPickup: () => shellsTaken.add(i) });
  });
}

// --- Interfaz ---

const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const playButton = document.querySelector<HTMLButtonElement>('#play')!;
const newIslandButton = document.querySelector<HTMLButtonElement>('#new-island')!;
const islandInfo = document.querySelector<HTMLParagraphElement>('#island-info')!;
const debugEl = document.querySelector<HTMLDivElement>('#debug')!;
const clockTime = document.querySelector<HTMLSpanElement>('#clock-time')!;
const clockDate = document.querySelector<HTMLSpanElement>('#clock-date')!;
const underwater = document.querySelector<HTMLDivElement>('#underwater')!;

playButton.textContent = save ? 'Volver a la isla' : 'Haz clic para jugar';
islandInfo.textContent = `Fruta de la isla: ${BLOCKS[world.fruit].name.toLowerCase()}`;

const hud = new Hud(inventory, atlas);
hud.select(0);

/** Mete un objeto en los bolsillos y lo anuncia. Devuelve false si no cabe. */
function take(id: string): boolean {
  if (inventory.add(id) > 0) {
    hud.toast('No te caben más cosas en los bolsillos');
    return false;
  }
  hud.toast(`Has conseguido: ${itemDef(id).name.toLowerCase()}`);
  return true;
}

// --- Bolsillos, conversaciones y bloqueo del puntero ---

/** Ventana abierta encima del juego (con el ratón libre), o null si se está jugando. */
let panel: 'inventory' | 'dialog' | 'shop' | null = null;
let currentHour = 12;

function openInventory() {
  panel = 'inventory';
  hud.openInventory();
  document.exitPointerLock();
}

function closeInventory() {
  hud.closeInventory();
  if (!hud.inventoryEl.hidden) return; // aún lleva algo en la mano
  panel = null;
  canvas.requestPointerLock();
}

const dialog = new Dialog({
  inventory,
  selectedSlot: () => hud.selected,
  today,
  get hour() {
    return currentHour;
  },
  fruitName: BLOCKS[world.fruit].name.toLowerCase(),
  toast: (t) => hud.toast(t),
  onClose: () => {
    panel = null;
    canvas.requestPointerLock();
  },
  openShop: () => {
    panel = 'shop';
    shop.open();
  },
});

const shop = new Shop({
  inventory,
  atlas,
  today,
  islandFruit: fruitItemFor(world.fruit) ?? '',
  getWallet: () => wallet,
  setWallet,
  toast: (t) => hud.toast(t),
});

function closeShop() {
  shop.close();
  panel = null;
  canvas.requestPointerLock();
}
document.querySelector('#shop-close')!.addEventListener('click', closeShop);

function talkTo(v: Villager) {
  panel = 'dialog';
  breaking = false;
  dialog.start(v);
  document.exitPointerLock();
}

window.addEventListener('keydown', (e) => {
  if (panel === 'dialog') {
    if (e.code === 'Escape') dialog.finish();
    return;
  }
  if (panel === 'shop') {
    if (e.code === 'Escape' || e.code === 'KeyE') closeShop();
    return;
  }
  if (e.code === 'KeyE') {
    if (panel === 'inventory') closeInventory();
    else if (document.pointerLockElement === canvas) openInventory();
    return;
  }
  if (e.code === 'Escape' && panel === 'inventory') {
    closeInventory();
    return;
  }
  if (/^Digit[0-9]$/.test(e.code)) {
    const n = Number(e.code.slice(5));
    hud.select(n === 0 ? 9 : n - 1);
  }
  if (e.code === 'F3' || e.code === 'KeyF') {
    e.preventDefault();
    debugEl.hidden = !debugEl.hidden;
  }
});
window.addEventListener('wheel', (e) => {
  if (document.pointerLockElement !== canvas) return;
  hud.select(hud.selected + (e.deltaY > 0 ? 1 : -1));
});

// Empezar una isla nueva pide un segundo clic para confirmar.
let confirmNew = false;
function resetNewIslandButton() {
  confirmNew = false;
  newIslandButton.textContent = 'Empezar una isla nueva';
  newIslandButton.classList.remove('danger');
}
newIslandButton.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!confirmNew) {
    confirmNew = true;
    newIslandButton.textContent = 'Se borrará tu isla. Pulsa otra vez para confirmar';
    newIslandButton.classList.add('danger');
    return;
  }
  saving = false;
  deleteGame();
  location.reload();
});

overlay.addEventListener('click', () => canvas.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (locked) {
    overlay.hidden = true;
    if (panel === 'inventory') hud.inventoryEl.hidden = true;
    if (panel === 'dialog') dialog.finish();
    if (panel === 'shop') shop.close();
    panel = null;
    return;
  }
  breaking = false;
  if (panel) return; // se ve la ventana abierta en vez del menú
  overlay.hidden = false;
  persist();
  playButton.textContent = 'Volver a la isla';
  resetNewIslandButton();
});
// Si el navegador no deja volver a bloquear el ratón enseguida, se muestra el menú.
document.addEventListener('pointerlockerror', () => {
  if (!panel) overlay.hidden = false;
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) player.look(e.movementX, e.movementY);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// --- Romper, colocar y sacudir ---

const isFruit = (b: number) => (FRUITS as readonly number[]).includes(b) || b === Block.Coconut;
const posKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

let breaking = false;
let breakKey = '';
let breakProgress = 0;
let breakCooldown = 0;
let warnedKey = '';

canvas.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== canvas) return;
  if (e.button === 0) breaking = true;
  else if (e.button === 2) useItem();
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) breaking = false;
});

function removeBlock(x: number, y: number, z: number, b: number, burst: boolean) {
  world.setBlock(x, y, z, Block.Air);
  if (isFruit(b)) harvested[posKey(x, y, z)] = Date.now();
  const id = dropFor(b);
  if (id) drops.spawn(id, x + 0.5, y + 0.5, z + 0.5, { burst });
}

function updateBreaking(dt: number) {
  breakCooldown = Math.max(0, breakCooldown - dt);
  const hit = breaking ? currentHit() : null;
  if (!hit || breakCooldown > 0) {
    breakProgress = 0;
    breakKey = '';
    hud.setProgress(null);
    return;
  }
  const [x, y, z] = hit.block;
  const key = posKey(x, y, z);
  if (key !== breakKey) {
    breakKey = key;
    breakProgress = 0;
  }
  if (y === 0) return; // la capa del fondo no se rompe

  const b = world.getBlock(x, y, z);
  if (HOUSE_BLOCKS.includes(b) && world.plotAt(x, z)) {
    if (warnedKey !== key) hud.toast('Es la casa de un vecino. Mejor no tocarla');
    warnedKey = key;
    return;
  }
  const stack = hud.selectedStack;
  const tool = stack ? itemDef(stack.id).tool : undefined;
  const info = breakInfo(b, tool);
  if (!info.allowed) {
    if (warnedKey !== key) hud.toast(`Necesitas ${toolNameFor(b)} para romper esto`);
    warnedKey = key;
    hud.setProgress(null);
    return;
  }

  breakProgress += info.seconds > 0 ? dt / info.seconds : 1;
  hud.setProgress(info.seconds > 0.15 ? Math.min(breakProgress, 1) : null);
  if (breakProgress < 1) return;

  removeBlock(x, y, z, b, false);
  breakProgress = 0;
  breakKey = '';
  breakCooldown = 0.15;
  hud.setProgress(null);
  if (info.usesTool && stack && inventory.wearTool(hud.selected)) {
    hud.toast(`¡Tu ${itemDef(stack.id).name.toLowerCase()} se ha roto!`);
  }
}

const villagerBox = new THREE.Box3();
const ray = new THREE.Ray();
const rayHit = new THREE.Vector3();

/** Vecino al que apunta la mira, si está más cerca que el bloque apuntado. */
function villagerInSight(blockDistance: number): Villager | null {
  camera.getWorldDirection(dir);
  ray.set(camera.position, dir);
  let best: Villager | null = null;
  let bestDist = Math.min(blockDistance, REACH);
  for (const v of villagers) {
    if (!v.group.visible) continue;
    if (!ray.intersectBox(v.bounds(villagerBox), rayHit)) continue;
    const d = rayHit.distanceTo(camera.position);
    if (d < bestDist) {
      best = v;
      bestDist = d;
    }
  }
  return best;
}

function useItem() {
  const hit = currentHit();
  const blockDist = hit ? camera.position.distanceTo(new THREE.Vector3(hit.block[0] + 0.5, hit.block[1] + 0.5, hit.block[2] + 0.5)) : Infinity;
  const villager = villagerInSight(blockDist);
  if (villager) {
    talkTo(villager);
    return;
  }
  if (!hit) return;
  const [bx, by, bz] = hit.block;
  const target = world.getBlock(bx, by, bz);
  const stack = hud.selectedStack;
  const def = stack ? itemDef(stack.id) : null;

  if (def?.block !== undefined) {
    // Colocar sobre hierba alta o una flor la sustituye, como en Minecraft.
    const replace = isCross(target) && !isFruit(target);
    const [x, y, z] = replace ? hit.block : hit.place;
    if (!isCross(def.block) && player.intersectsBlock(x, y, z)) return;
    world.setBlock(x, y, z, def.block);
    delete harvested[posKey(x, y, z)];
    inventory.consume(hud.selected);
    return;
  }

  if (isFruit(target)) {
    removeBlock(bx, by, bz, target, true);
    return;
  }
  if (target === Block.Log || target === Block.PalmLog || target === Block.Leaves || target === Block.PalmLeaves) {
    shakeTree(bx, by, bz);
  }
}

/** Sacudir un árbol, como en Animal Crossing: cae la fruta y, una vez al día, una rama. */
function shakeTree(x: number, y: number, z: number) {
  const fruits = world.treeFruitsNear(x, y, z);
  for (const [fx, fy, fz] of fruits) removeBlock(fx, fy, fz, world.getBlock(fx, fy, fz), true);

  const trunk = findTrunk(x, y, z);
  let branch = false;
  if (trunk && !branchTrees.has(trunk.key)) {
    branchTrees.add(trunk.key);
    drops.spawn('rama', trunk.x + 0.5, trunk.y + 0.5, trunk.z + 0.5, { burst: true });
    branch = true;
  }
  if (!fruits.length && !branch) hud.toast('No ha caído nada');
}

/** Tronco de árbol frutal más cercano, para saber qué árbol se ha sacudido. */
function findTrunk(x: number, y: number, z: number) {
  for (let r = 0; r <= 3; r++) {
    for (let dy = -6; dy <= 2; dy++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (world.getBlock(x + dx, y + dy, z + dz) !== Block.Log) continue;
          // Bajar hasta la base del tronco para que todo el árbol cuente como uno.
          let by = y + dy;
          while (world.getBlock(x + dx, by - 1, z + dz) === Block.Log) by--;
          return { x: x + dx, y: by, z: z + dz, key: `${x + dx},${z + dz}` };
        }
      }
    }
  }
  return null;
}

const dir = new THREE.Vector3();
function currentHit() {
  camera.getWorldDirection(dir);
  return raycast(world, camera.position, dir, REACH);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Nombre encima de cada vecino cercano.
const labelsEl = document.querySelector<HTMLDivElement>('#labels')!;
const labels = villagers.map((v) => {
  const el = document.createElement('div');
  el.className = 'name-tag';
  el.textContent = v.name;
  labelsEl.appendChild(el);
  return el;
});
const projected = new THREE.Vector3();
function updateLabels() {
  villagers.forEach((v, i) => {
    const el = labels[i];
    const dist = v.position.distanceTo(player.position);
    projected.copy(v.position).setY(v.position.y + 1.85).project(camera);
    const show = v.group.visible && dist < 8 && projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1;
    el.hidden = !show;
    if (!show) return;
    el.style.transform = `translate(${((projected.x + 1) / 2) * window.innerWidth}px, ${((1 - projected.y) / 2) * window.innerHeight}px) translate(-50%, -100%)`;
  });
}

// --- Reloj con la hora local, como en Animal Crossing ---

const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'short' });
let lastClock = '';
function updateClock(now: Date) {
  const t = timeFormat.format(now);
  if (t === lastClock) return;
  lastClock = t;
  clockTime.textContent = t;
  clockDate.textContent = dateFormat.format(now);
}

// --- Bucle principal ---

let last = performance.now();
let frames = 0;
let fpsTime = 0;
let fps = 0;
let spawned = !!save?.player;

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  world.update(player.position.x, player.position.z, RENDER_RADIUS);

  // Esperar a que el suelo bajo el jugador exista antes de aplicar la gravedad.
  if (!spawned && world.isReady(player.position.x, player.position.z)) {
    player.spawnAt(player.position.x, player.position.z);
    spawned = true;
  }
  player.update(spawned && world.isReady(player.position.x, player.position.z) ? dt : 0);
  updateBreaking(dt);

  const date = new Date();
  if (hourOverride !== null) date.setHours(Math.floor(hourOverride), (hourOverride % 1) * 60, 0);
  const hour = Sky.hourOf(date);
  currentHour = hour;
  sky.update(hour, camera);
  for (const v of villagers) v.update(dt, hour, player.position);
  updateLabels();
  updateClock(date);
  drops.update(dt, player.position, take, 1 - sky.night * 0.5);

  // Bajo el agua todo se ve azul y cerca.
  const submerged = camera.position.y < WATER_SURFACE;
  underwater.hidden = !submerged;
  if (submerged) {
    fog.color.setHex(0x2a6d99);
    fog.near = 1;
    fog.far = 22;
  } else {
    fog.color.copy(sky.color);
    fog.near = FOG_NEAR;
    fog.far = FOG_FAR;
  }

  water.position.x = camera.position.x;
  water.position.z = camera.position.z;
  clouds.position.x = ((now / 1000) * 1.2) % 300;
  cloudMat.color.setScalar(1 - sky.night * 0.6);

  const hit = currentHit();
  if (hit) {
    highlight.position.set(hit.block[0] + 0.5, hit.block[1] + 0.5, hit.block[2] + 0.5);
    highlight.visible = true;
  } else {
    highlight.visible = false;
  }

  renderer.render(scene, camera);

  frames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    fps = Math.round(frames / fpsTime);
    frames = 0;
    fpsTime = 0;
  }
  if (!debugEl.hidden) {
    const p = player.position;
    const unsaved = world.revision !== savedRevision ? ' · sin guardar' : '';
    debugEl.textContent = `${fps} fps · x ${p.x.toFixed(1)} y ${p.y.toFixed(1)} z ${p.z.toFixed(1)} · semilla ${seed}${unsaved}`;
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Acceso desde la consola del navegador mientras se desarrolla.
if (import.meta.env.DEV) {
  Object.assign(window, {
    game: { world, player, camera, villagers, talkTo, dialog, shop, get wallet() { return wallet; }, persist, inventory, hud, drops, shakeTree, openInventory, closeInventory, currentHit, get breaking() { return breaking; }, get breakProgress() { return breakProgress; } },
  });
}
