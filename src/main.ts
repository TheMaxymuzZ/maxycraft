import * as THREE from 'three';
import './style.css';
import { BLOCKS, Block, FRUITS, HOTBAR, blockIcon, createAtlasCanvas, createAtlasTexture, isCross } from './blocks';
import { Player } from './player';
import { raycast } from './raycast';
import { deleteGame, loadGame, saveGame } from './save';
import { Sky } from './sky';
import { WATER_SURFACE, World } from './world';

const RENDER_RADIUS = 6;
const REACH = 6;
const FOG_NEAR = RENDER_RADIUS * 16 * 0.55;
const FOG_FAR = RENDER_RADIUS * 16 * 0.95;

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

const player = new Player(world, camera);
if (save?.player) {
  player.position.set(save.player.x, save.player.y, save.player.z);
  player.yaw = save.player.yaw;
  player.pitch = save.player.pitch;
} else {
  const [sx, sz] = world.findSpawn(0, 0);
  player.spawnAt(sx, sz);
}

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

// --- Interfaz ---

const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const playButton = document.querySelector<HTMLButtonElement>('#play')!;
const newIslandButton = document.querySelector<HTMLButtonElement>('#new-island')!;
const islandInfo = document.querySelector<HTMLParagraphElement>('#island-info')!;
const hotbarEl = document.querySelector<HTMLDivElement>('#hotbar')!;
const blockName = document.querySelector<HTMLDivElement>('#block-name')!;
const debugEl = document.querySelector<HTMLDivElement>('#debug')!;
const clockTime = document.querySelector<HTMLSpanElement>('#clock-time')!;
const clockDate = document.querySelector<HTMLSpanElement>('#clock-date')!;
const underwater = document.querySelector<HTMLDivElement>('#underwater')!;

playButton.textContent = save ? 'Volver a la isla' : 'Haz clic para jugar';
islandInfo.textContent = `Fruta de la isla: ${BLOCKS[world.fruit].name.toLowerCase()}`;

let selected = 0;
const slots = HOTBAR.map((b, i) => {
  const slot = document.createElement('div');
  slot.className = 'slot';
  slot.innerHTML = `<img alt="" src="${blockIcon(atlas, b)}"><span>${i + 1}</span>`;
  slot.title = BLOCKS[b].name;
  hotbarEl.appendChild(slot);
  return slot;
});

let nameTimer = 0;
function select(i: number) {
  selected = (i + HOTBAR.length) % HOTBAR.length;
  slots.forEach((s, j) => s.classList.toggle('active', j === selected));
  blockName.textContent = BLOCKS[HOTBAR[selected]].name;
  blockName.classList.add('show');
  clearTimeout(nameTimer);
  nameTimer = window.setTimeout(() => blockName.classList.remove('show'), 1200);
}
select(0);

window.addEventListener('keydown', (e) => {
  const n = Number(e.key);
  if (n >= 1 && n <= HOTBAR.length) select(n - 1);
  if (e.code === 'F3' || e.code === 'KeyF') {
    e.preventDefault();
    debugEl.hidden = !debugEl.hidden;
  }
});
window.addEventListener('wheel', (e) => {
  if (document.pointerLockElement !== canvas) return;
  select(selected + (e.deltaY > 0 ? 1 : -1));
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

// --- Ratón y bloqueo del puntero ---

overlay.addEventListener('click', () => canvas.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  overlay.hidden = locked;
  if (!locked) {
    persist();
    playButton.textContent = 'Volver a la isla';
    resetNewIslandButton();
  }
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) player.look(e.movementX, e.movementY);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const isFruit = (b: number) => (FRUITS as readonly number[]).includes(b) || b === Block.Coconut;

canvas.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== canvas) return;
  const hit = currentHit();
  if (!hit) return;
  const [bx, by, bz] = hit.block;
  if (e.button === 0) {
    if (by > 0) world.setBlock(bx, by, bz, Block.Air); // la capa del fondo no se rompe
  } else if (e.button === 2) {
    // Colocar sobre hierba alta o una flor la sustituye, como en Minecraft.
    const target = world.getBlock(bx, by, bz);
    const replace = isCross(target) && !isFruit(target);
    const [x, y, z] = replace ? hit.block : hit.place;
    const block = HOTBAR[selected];
    if (isCross(block) || !player.intersectsBlock(x, y, z)) world.setBlock(x, y, z, block);
  }
});

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

  const date = new Date();
  if (hourOverride !== null) date.setHours(Math.floor(hourOverride), (hourOverride % 1) * 60, 0);
  const hour = Sky.hourOf(date);
  sky.update(hour, camera);
  updateClock(date);

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
if (import.meta.env.DEV) Object.assign(window, { game: { world, player, camera, persist } });
