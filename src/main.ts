import * as THREE from 'three';
import './style.css';
import { BLOCKS, Block, HOTBAR, blockIcon, createAtlasCanvas, createAtlasTexture } from './blocks';
import { Player } from './player';
import { raycast } from './raycast';
import { World } from './world';

const RENDER_RADIUS = 6;
const REACH = 6;
const SKY = 0xa8dcf5;

// --- Escena ---

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, RENDER_RADIUS * 16 * 0.55, RENDER_RADIUS * 16 * 0.95);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);

scene.add(new THREE.HemisphereLight(0xfff4e0, 0x8a9a7a, 1.6));
const sun = new THREE.DirectionalLight(0xfff1d6, 1.4);
sun.position.set(0.6, 1, 0.35);
scene.add(sun);

const atlas = createAtlasCanvas();
const material = new THREE.MeshLambertMaterial({
  map: createAtlasTexture(atlas),
  vertexColors: true,
  alphaTest: 0.5,
  side: THREE.FrontSide,
});

const seed = 20261024;
const world = new World(seed, material);
scene.add(world.group);

const player = new Player(world, camera);
const [spawnX, spawnZ] = world.findSpawn(8, 8);
player.spawnAt(spawnX, spawnZ);

// Nubes de bloques que pasan despacio.
const clouds = new THREE.Group();
{
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: false });
  const r = (n: number) => {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < 40; i++) {
    const c = new THREE.Mesh(geo, mat);
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
const hotbarEl = document.querySelector<HTMLDivElement>('#hotbar')!;
const blockName = document.querySelector<HTMLDivElement>('#block-name')!;
const debugEl = document.querySelector<HTMLDivElement>('#debug')!;

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

// --- Ratón y bloqueo del puntero ---

overlay.addEventListener('click', () => canvas.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  overlay.hidden = document.pointerLockElement === canvas;
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) player.look(e.movementX, e.movementY);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== canvas) return;
  const hit = currentHit();
  if (!hit) return;
  if (e.button === 0) {
    const [x, y, z] = hit.block;
    if (y > 0) world.setBlock(x, y, z, Block.Air); // la capa del fondo no se rompe
  } else if (e.button === 2) {
    const [x, y, z] = hit.place;
    if (!player.intersectsBlock(x, y, z)) world.setBlock(x, y, z, HOTBAR[selected]);
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

// --- Bucle principal ---

let last = performance.now();
let frames = 0;
let fpsTime = 0;
let fps = 0;
let spawned = false;

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  world.update(player.position.x, player.position.z, RENDER_RADIUS);

  // Esperar a que el suelo bajo el jugador exista antes de aplicar la gravedad.
  if (!spawned && world.isReady(player.position.x, player.position.z)) {
    player.spawnAt(player.position.x, player.position.z);
    spawned = true;
  }
  if (spawned) player.update(dt);
  else player.update(0);

  clouds.position.x = (now / 1000) * 1.2 % 300;

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
    debugEl.textContent = `${fps} fps · x ${p.x.toFixed(1)} y ${p.y.toFixed(1)} z ${p.z.toFixed(1)}`;
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Acceso desde la consola del navegador mientras se desarrolla.
if (import.meta.env.DEV) Object.assign(window, { game: { world, player, camera } });
