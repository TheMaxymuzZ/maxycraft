import * as THREE from 'three';
// Las letras van dentro del juego (sin Google Fonts) para que se vean también sin internet.
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './style.css';
import { Sound, materialOf } from './audio';
import { BLOCKS, Block, FRUITS, ROOFS, SWAYING, applySeason, createAtlasCanvas, createAtlasTexture, isCross, isSolid } from './blocks';
import { Breaker } from './breaking';
import { Birds } from './birds';
import { Bugs } from './bugs';
import { dailyRandom, dayKey, gameDate as dateWith, timeOverrides } from './clock';
import { Clouds } from './clouds';
import { Collection } from './collection';
import { calendar, creature } from './creatures';
import { Dialog, HOUSE_COSTS, HOUSE_NAMES } from './dialog';
import { Drops } from './drops';
import { Fishing } from './fishing';
import { Furniture, paintFurnitureIcons } from './furniture';
import { HeldItem } from './held';
import { Hud } from './hud';
import { setupInstall } from './install';
import { Islands } from './islands';
import { NameTags } from './labels';
import { Menu } from './menu';
import { Animals, MAX_ANIMALS, type AnimalKind } from './animals';
import { Farm, cropForSeed, cropOfBlock, isFarmland } from './farm';
import { Inventory, starterKit } from './inventory';
import { SHELLS, dropFor, fruitItemFor, itemDef } from './items';
import { Player } from './player';
import { raycast } from './raycast';
import { type SaveData, activeSlot, loadGame, saveGame, setActiveSlot } from './save';
import { Shop, formatBerries } from './shop';
import { WEATHER_TEXT, holidayOf, seasonOf, weatherAt } from './seasons';
import { PIXEL_RATIO, RENDER_RADIUS, type Settings, loadSettings } from './settings';
import { Sky } from './sky';
import { TouchControls } from './touch';
import { findTrunk } from './trees';
import { TUTORIAL_REWARD, Tutorial } from './tutorial';
import { type Villager, createVillagers } from './villagers';
import { WeatherFx } from './weather';
import { Workbench } from './workbench';
import { Water } from './water';
import { Waterfalls } from './waterfall';
import { Wind } from './wind';
import { WATER_SURFACE, World } from './world';

/** Pantalla táctil (móvil o tableta): se juega con botones en vez de ratón. Para probar: ?tactil */
const touchMode = matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).has('tactil');
// Opciones del jugador; en el móvil, por defecto, se ve algo menos lejos para que vaya fluido.
const settings = loadSettings(touchMode);
let renderRadius = RENDER_RADIUS[settings.quality];
const REACH = 6;
const fogNear = () => renderRadius * 16 * 0.55;
const fogFar = () => renderRadius * 16 * 0.95;
/** Días reales que tarda en volver a salir la fruta de un árbol, como en Animal Crossing. */
const FRUIT_REGROW_DAYS = 3;
const SHELLS_PER_DAY = 7;

// Para probar otras horas y días: ?hora=21.5 y ?fecha=2026-12-24
const params = new URLSearchParams(location.search);
const overrides = timeOverrides(params);
const gameDate = () => dateWith(overrides);
const startDate = gameDate();
const season = seasonOf(startDate);
const holiday = holidayOf(startDate);
calendar.month = startDate.getMonth() + 1;

// --- Escena ---

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO[settings.quality]));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const fog = new THREE.Fog(0xa8dcf5, fogNear(), fogFar());
scene.fog = fog;
scene.background = fog.color;

const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 400);

const hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a9a7a, 1.6);
const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.4);
scene.add(hemi, sunLight);
const sky = new Sky(scene, hemi, sunLight);

const atlas = createAtlasCanvas();
paintFurnitureIcons(atlas);
applySeason(atlas, season);
const material = new THREE.MeshLambertMaterial({
  map: createAtlasTexture(atlas),
  vertexColors: true,
  alphaTest: 0.5,
  side: THREE.DoubleSide, // las plantas se ven por los dos lados
});

// --- Partida guardada ---

const save = loadGame();
const seed = save?.seed ?? Math.floor(Math.random() * 1e9);
const sound = new Sound(seed);
sound.season = season;
const world = new World(seed, material, save?.edits ?? {});
scene.add(world.group);
const water = new Water();
world.waterMaterial = water.material;
const wind = new Wind(material);
const waterfalls = new Waterfalls(world.waterfallSpots(2));
scene.add(waterfalls.group);
const birds = new Birds();
scene.add(birds.group);

const today = dayKey(startDate);

// La fruta cogida hace días vuelve a crecer en el mismo sitio.
const harvested: Record<string, number> = { ...(save?.harvested ?? {}) };
for (const [k, t] of Object.entries(harvested)) {
  if (Date.now() - t < FRUIT_REGROW_DAYS * 86_400_000) continue;
  const [x, y, z] = k.split(',').map(Number);
  world.clearEdit(x, y, z);
  delete harvested[k];
}
let bottleTaken = save?.bottle?.day === today && save.bottle.taken;
const shellsTaken = new Set(save?.shells?.day === today ? save.shells.taken : []);
const branchTrees = new Set(save?.branches?.day === today ? save.branches.trees : []);

// El huerto y la granja.
const farm = new Farm(save?.farm);
farm.sync(world, today);
const animals = new Animals(world, save?.animals);
scene.add(animals.group);

const player = new Player(world, camera);
if (save?.player) {
  player.position.set(save.player.x, save.player.y, save.player.z);
  player.yaw = save.player.yaw;
  player.pitch = save.player.pitch;
} else if (world.playerPlot) {
  // Se empieza delante de la tienda de campaña, mirándola.
  player.spawnAt(world.playerPlot.x, world.playerPlot.z + 4);
} else {
  const [sx, sz] = world.findSpawn(0, 0);
  player.spawnAt(sx, sz);
}

// La casa del jugador: nivel (0 es la tienda de campaña), lo que falta por pagar y el tejado.
const home = { level: 0, debt: 0, roof: 0, ...save?.home };
if (world.playerPlot && home.level > 0) world.playerPlot.roof = ROOFS[home.roof];

const furniture = new Furniture(save?.furniture ?? []);
scene.add(furniture.group);

// Adornos de las fiestas: calabazas en las puertas o un árbol junto a la tienda. No se guardan.
const decor = new Furniture([]);
scene.add(decor.group);
for (const p of world.plots) {
  const [dx, dy, dz] = p.door;
  if (holiday?.id === 'halloween' && p.kind !== 'player') {
    decor.place('calabaza', dx - 2, dy, dz, 0);
    decor.place('calabaza', dx + 2, dy, dz, 0);
  }
  if (holiday?.id === 'navidad' && p.kind === 'shop') decor.place('arbol_navidad', dx + 3, dy, dz + 1, 0);
}
// En la tienda de campaña hay una cama para empezar.
if (!save && world.playerPlot) furniture.place('cama', world.playerPlot.x, world.playerPlot.y + 1, world.playerPlot.z, 0);

const villagers = createVillagers(world, save?.villagers ?? {});
for (const v of villagers) {
  scene.add(v.group);
  if (v.isBirthday(startDate)) v.addPartyHat();
}

const inventory = new Inventory();
if (save?.inventory) inventory.load(save.inventory);
else starterKit(inventory);

const collection = new Collection(save?.caught ?? [], save?.donated ?? [], atlas);

let wallet = save?.wallet ?? 500;
const walletEl = document.querySelector<HTMLSpanElement>('#wallet-amount')!;
function setWallet(n: number) {
  if (n !== wallet) sound.coin();
  // Vender en la tienda cuenta para el tutorial.
  if (n > wallet && panel === 'shop') tutorial.complete('vender');
  wallet = n;
  walletEl.textContent = formatBerries(n);
}
setWallet(wallet);

let savedRevision = world.revision;
let saving = true;
/** Lo último que se guardó, para avisar solo cuando de verdad hay algo nuevo. */
let lastSaved = save ? JSON.stringify({ ...save, savedAt: 0 }) : '';
let saveFailed = false;
const saveIndicator = document.querySelector<HTMLDivElement>('#save-indicator')!;
function showSaveIndicator(text: string, error = false) {
  saveIndicator.textContent = text;
  saveIndicator.classList.toggle('error', error);
  saveIndicator.classList.remove('show');
  void saveIndicator.offsetWidth; // para que la animación vuelva a empezar
  saveIndicator.classList.add('show');
}
function persist() {
  if (!saving) return;
  const p = player.position;
  const data: SaveData = {
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
    caught: [...collection.caught],
    donated: [...collection.donated],
    home,
    furniture: furniture.serialize(),
    tutorial: tutorial.serialize(),
    tutorialDone: tutorial.finished,
    recipes: [...workbench.known],
    bottle: { day: today, taken: bottleTaken },
    farm: farm.serialize(),
    animals: animals.serialize(),
    savedAt: 0,
  };
  const text = JSON.stringify(data);
  if (text === lastSaved) return;
  data.savedAt = Date.now();
  if (!saveGame(data)) {
    // Solo se avisa una vez: el navegador no deja guardar (modo privado o sin espacio).
    if (!saveFailed) showSaveIndicator('No se puede guardar en este navegador', true);
    saveFailed = true;
    return;
  }
  lastSaved = text;
  savedRevision = world.revision;
  showSaveIndicator('Guardado');
}
setInterval(persist, 10_000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persist();
});
window.addEventListener('pagehide', persist);

const clouds = new Clouds();
scene.add(clouds.group);

// Contorno del bloque al que apuntas.
const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
  new THREE.LineBasicMaterial({ color: 0x1b2a14, transparent: true, opacity: 0.6 }),
);
highlight.visible = false;
scene.add(highlight);

// --- Objetos por el suelo ---

const weather = new WeatherFx(world);
scene.add(weather.points);

const drops = new Drops(world, atlas);
scene.add(drops.group);
const bugs = new Bugs(world, atlas);
scene.add(bugs.group);
const fishing = new Fishing(world);
scene.add(fishing.bobber);

// Cada día real aparecen conchas nuevas en la playa.
{
  const random = dailyRandom(seed, today);
  world.beachSpots(SHELLS_PER_DAY, random).forEach(([x, y, z], i) => {
    if (shellsTaken.has(i)) return;
    const id = SHELLS[Math.floor(random() * SHELLS.length)];
    drops.spawn(id, x + 0.5, y + 0.3, z + 0.5, { onPickup: () => shellsTaken.add(i) });
  });
  // Y una botella con una receta dentro.
  const [bottle] = world.beachSpots(1, random);
  if (bottle && !bottleTaken) {
    drops.spawn('botella', bottle[0] + 0.5, bottle[1] + 0.3, bottle[2] + 0.5, { onPickup: () => (bottleTaken = true) });
  }
}

// --- Interfaz ---

const playButton = document.querySelector<HTMLButtonElement>('#play')!;
const islandInfo = document.querySelector<HTMLParagraphElement>('#island-info')!;
const debugEl = document.querySelector<HTMLDivElement>('#debug')!;
const clockTime = document.querySelector<HTMLSpanElement>('#clock-time')!;
const clockDate = document.querySelector<HTMLSpanElement>('#clock-date')!;
const underwater = document.querySelector<HTMLDivElement>('#underwater')!;

document.querySelector('#version')!.textContent = `v${__APP_VERSION__}`;
playButton.textContent = save ? 'Continuar' : 'Empezar en la isla';
islandInfo.textContent = `Fruta de la isla: ${BLOCKS[world.fruit].name.toLowerCase()}`;

/** Aplica las opciones al momento, sin recargar. */
function applySettings(s: Settings) {
  sound.setVolumes(s.music / 100, s.sfx / 100);
  player.sensitivity = s.sensitivity;
  camera.fov = s.fov;
  camera.updateProjectionMatrix();
  renderRadius = RENDER_RADIUS[s.quality];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO[s.quality]));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
const menu = new Menu(settings, touchMode, applySettings);
applySettings(settings);

const hud = new Hud(inventory, atlas);
hud.select(0);
const held = new HeldItem(atlas, material.map!);
setupInstall((t) => hud.toast(t));

/** Mete un objeto en los bolsillos y lo anuncia. Devuelve false si no cabe. */
function take(id: string): boolean {
  if (inventory.add(id) > 0) {
    hud.toast('No te caben más cosas en los bolsillos');
    return false;
  }
  hud.toast(`Has conseguido: ${itemDef(id).name.toLowerCase()}`);
  sound.pickup();
  return true;
}

// --- Bolsillos, conversaciones y bloqueo del puntero ---

// Con ratón se bloquea el puntero; en pantallas táctiles basta con saber si se está jugando.
let touchPlaying = false;
function isPlaying(): boolean {
  return touchMode ? touchPlaying : document.pointerLockElement === canvas;
}
let welcomed = !!save;
function lockInput() {
  sound.start();
  if (!welcomed) {
    welcomed = true;
    hud.toast('¡Bienvenida, bienvenido a tu isla! Sigue los primeros pasos de la izquierda');
  }
  if (!touchMode) {
    canvas.requestPointerLock();
    return;
  }
  if (touchPlaying) return;
  touchPlaying = true;
  onInputChange();
}
function unlockInput() {
  if (!touchMode) {
    document.exitPointerLock();
    return;
  }
  if (!touchPlaying) return;
  touchPlaying = false;
  onInputChange();
}

/** Ventana abierta encima del juego (con el ratón libre), o null si se está jugando. */
let panel: 'inventory' | 'dialog' | 'shop' | 'collection' | 'workbench' | null = null;
let currentHour = 12;

function openInventory() {
  panel = 'inventory';
  hud.openInventory();
  unlockInput();
}

function closeInventory() {
  hud.closeInventory();
  if (!hud.inventoryEl.hidden) return; // aún lleva algo en la mano
  panel = null;
  lockInput();
}

const tutorial = new Tutorial(save?.tutorial, save ? (save.tutorialDone ?? save.tutorial === undefined) : false, touchMode, () => {
  setWallet(wallet + TUTORIAL_REWARD);
  hud.toast(`¡Primeros pasos completados! Avellana te regala ${formatBerries(TUTORIAL_REWARD)} bayas`);
  persist();
});
// Fabricar, en los bolsillos o en la mesa de trabajo, también cuenta.
{
  const craft = inventory.craft.bind(inventory);
  inventory.craft = (r) => {
    const ok = craft(r);
    if (ok) tutorial.complete('fabricar');
    return ok;
  };
}

const soundButton = document.querySelector<HTMLButtonElement>('#sound-toggle')!;
soundButton.textContent = sound.enabled ? 'Sonido: sí' : 'Sonido: no';
soundButton.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleSound();
});
document.querySelector('#inventory-close')!.addEventListener('click', () => closeInventory());

const workbench = new Workbench({ inventory, atlas, toast: (t) => hud.toast(t) }, save?.recipes);

function openWorkbench() {
  panel = 'workbench';
  breaker.active = false;
  workbench.open();
  unlockInput();
}

function closeWorkbench() {
  workbench.close();
  panel = null;
  lockInput();
}
document.querySelector('#workbench-close')!.addEventListener('click', closeWorkbench);

// Voz de cada especie, más aguda o más grave.
const VOICES: Record<string, number> = { gato: 760, oso: 260, conejo: 900, rana: 380, perro: 560, pato: 820, ardilla: 1050, tortuga: 220 };

const dialog = new Dialog({
  voice: (v) => sound.voice(VOICES[v.profile.species] ?? 500),
  learnRecipe: () => workbench.learnRandom(),
  holiday,
  isBirthday: (v) => v.isBirthday(gameDate()),
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
    lockInput();
  },
  openShop: () => {
    panel = 'shop';
    shop.open();
  },
  donatable: () => collection.donatable(inventory),
  donate: (id) => collection.donate(inventory, id),
  openCollection: () => {
    panel = 'collection';
    collection.open();
  },
  home: {
    available: !!world.playerPlot,
    state: () => ({ level: home.level, debt: home.debt, wallet }),
    upgrade: (roof) => {
      if (home.debt > 0 || home.level >= HOUSE_COSTS.length) return;
      home.debt += HOUSE_COSTS[home.level];
      home.level++;
      home.roof = roof;
      world.buildPlayerHouse(home.level, ROOFS[roof]);
      hud.toast(`¡Tienes una ${HOUSE_NAMES[home.level]}!`);
      persist();
    },
    pay: (amount) => {
      if (amount > wallet || amount > home.debt) return;
      setWallet(wallet - amount);
      home.debt -= amount;
      persist();
    },
  },
});

function openCollection() {
  panel = 'collection';
  collection.open();
  unlockInput();
}

function closeCollection() {
  collection.close();
  panel = null;
  lockInput();
}
document.querySelector('#collection-close')!.addEventListener('click', closeCollection);

const shop = new Shop({
  inventory,
  atlas,
  today,
  islandFruit: fruitItemFor(world.fruit) ?? '',
  holiday: holiday?.id ?? null,
  getWallet: () => wallet,
  setWallet,
  toast: (t) => hud.toast(t),
});

function closeShop() {
  shop.close();
  panel = null;
  lockInput();
}
document.querySelector('#shop-close')!.addEventListener('click', closeShop);

const touch = touchMode
  ? new TouchControls({
      player,
      use: () => useItem(),
      setBreaking: (on) => {
        if (on && pickUpFurniture()) return;
        breaker.active = on;
      },
      inventory: () => openInventory(),
      collection: () => openCollection(),
      rotate: () => {
        const f = furnitureInSight();
        if (f) furniture.rotate(f.furniture);
      },
      pause: () => unlockInput(),
    })
  : null;
if (touch) document.body.appendChild(touch.el);

function talkTo(v: Villager) {
  tutorial.complete('hablar');
  panel = 'dialog';
  breaker.active = false;
  dialog.start(v);
  unlockInput();
}

window.addEventListener('keydown', (e) => {
  if (!menu.hidden) {
    if (e.code === 'Escape' && menu.view !== 'main') menu.show('main');
    if (e.code === 'KeyM') toggleSound();
    return;
  }
  if (panel === 'dialog') {
    if (e.code === 'Escape') dialog.finish();
    return;
  }
  if (panel === 'shop') {
    if (e.code === 'Escape' || e.code === 'KeyE') closeShop();
    return;
  }
  if (panel === 'collection') {
    if (e.code === 'Escape' || e.code === 'KeyC') closeCollection();
    return;
  }
  if (panel === 'workbench') {
    if (e.code === 'Escape' || e.code === 'KeyE') closeWorkbench();
    return;
  }
  if (e.code === 'KeyC' && isPlaying()) {
    openCollection();
    return;
  }
  if (e.code === 'KeyE') {
    if (panel === 'inventory') closeInventory();
    else if (isPlaying()) openInventory();
    return;
  }
  if (e.code === 'Escape' && panel === 'inventory') {
    closeInventory();
    return;
  }
  if (e.code === 'KeyR' && isPlaying()) {
    const f = furnitureInSight();
    if (f) furniture.rotate(f.furniture);
    return;
  }
  if (e.code === 'KeyM') {
    toggleSound();
    return;
  }
  if (e.code === 'KeyH') {
    tutorial.toggle();
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
  if (!isPlaying()) return;
  hud.select(hud.selected + (e.deltaY > 0 ? 1 : -1));
});

// Varias islas y copias de seguridad.
const islands = new Islands({
  active: activeSlot(),
  flush: persist,
  stopSaving: () => (saving = false),
  switchTo: (slot) => {
    persist();
    saving = false;
    setActiveSlot(slot);
    location.reload();
  },
  toast: (t) => hud.toast(t),
});
menu.onView = (v) => {
  islands.reset();
  if (v === 'islands') islands.render();
};

playButton.addEventListener('click', () => lockInput());
function onInputChange() {
  const locked = isPlaying();
  touch?.show(locked);
  if (locked) {
    menu.close();
    if (panel === 'inventory') hud.inventoryEl.hidden = true;
    if (panel === 'dialog') dialog.finish();
    if (panel === 'shop') shop.close();
    if (panel === 'collection') collection.close();
    if (panel === 'workbench') workbench.close();
    panel = null;
    return;
  }
  breaker.active = false;
  if (panel) return; // se ve la ventana abierta en vez del menú
  menu.open();
  persist();
  playButton.textContent = 'Volver a la isla';
}
document.addEventListener('pointerlockchange', onInputChange);
// Si el navegador no deja volver a bloquear el ratón enseguida, se muestra el menú.
document.addEventListener('pointerlockerror', () => {
  if (!panel) menu.open();
});
document.addEventListener('mousemove', (e) => {
  if (isPlaying()) player.look(e.movementX, e.movementY);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// --- Romper, colocar y sacudir ---

const isFruit = (b: number) => (FRUITS as readonly number[]).includes(b) || b === Block.Coconut;
const posKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

const breaker = new Breaker({
  getBlock: (x, y, z) => world.getBlock(x, y, z),
  plotAt: (x, z) => world.plotAt(x, z),
  held: () => hud.selectedStack,
  toast: (t) => hud.toast(t),
  progress: (p) => hud.setProgress(p),
  broken: (x, y, z, b, usedTool) => {
    const stack = hud.selectedStack;
    removeBlock(x, y, z, b, false);
    tutorial.complete('romper');
    if (usedTool && stack && inventory.wearTool(hud.selected)) {
      hud.toast(`¡Tu ${itemDef(stack.id).name.toLowerCase()} se ha roto!`);
    }
  },
});

canvas.addEventListener('mousedown', (e) => {
  if (!isPlaying()) return;
  if (e.button === 0) {
    if (!pickUpFurniture()) breaker.active = true;
  } else if (e.button === 2) useItem();
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) breaker.active = false;
});

function removeBlock(x: number, y: number, z: number, b: number, burst: boolean) {
  // Quitar la tierra de cultivo arranca lo que hubiera plantado encima.
  if (isFarmland(b) && farm.has(x, y + 1, z)) harvestCrop(x, y + 1, z, true);
  if (cropOfBlock(b)) {
    world.setBlock(x, y, z, Block.Air);
    harvestCrop(x, y, z, burst);
    return;
  }
  world.setBlock(x, y, z, Block.Air);
  if (!burst) sound.dig(materialOf(BLOCKS[b].name));
  // Un mueble sin suelo debajo se cae y se puede recoger.
  const above = furniture.at(x, y + 1, z);
  if (above) {
    furniture.remove(above);
    drops.spawn(above.id, x + 0.5, y + 1.3, z + 0.5, { burst: true });
  }
  if (isFruit(b)) harvested[posKey(x, y, z)] = Date.now();
  const id = dropFor(b);
  if (id) drops.spawn(id, x + 0.5, y + 0.5, z + 0.5, { burst });
}

/** Recoge una planta del huerto: la cosecha si está madura o la semilla si no. */
function harvestCrop(x: number, y: number, z: number, burst: boolean) {
  const h = farm.harvest(x, y, z, dayKey(gameDate()));
  if (world.getBlock(x, y, z) !== Block.Air) world.setBlock(x, y, z, Block.Air);
  if (!h) return;
  sound.rustle();
  for (let i = 0; i < h.count; i++) drops.spawn(h.produce!, x + 0.5, y + 0.5, z + 0.5, { burst: true });
  // Al cosechar a veces sale una semilla de más.
  const seeds = h.seeds + (h.produce && Math.random() < 0.3 ? 1 : 0);
  for (let i = 0; i < seeds; i++) drops.spawn(h.seed, x + 0.5, y + 0.5, z + 0.5, { burst: burst || !!h.produce });
  if (h.produce) hud.toast(`¡Has cosechado ${h.count} ${itemDef(h.produce).name.toLowerCase()}!`);
}

/** Usar algo en el huerto: labrar con la pala, plantar semillas, regar o cosechar. Devuelve si ha hecho algo. */
function useFarm(def: ReturnType<typeof itemDef> | null, x: number, y: number, z: number, target: number): boolean {
  const day = dayKey(gameDate());
  const crop = cropOfBlock(target);
  // Lo maduro se cosecha con la mano o con cualquier cosa (menos la regadera).
  if (crop && crop.stage === 3 && def?.tool !== 'can') {
    removeBlock(x, y, z, target, true);
    return true;
  }
  if (def?.tool === 'can') {
    const [cx, cy, cz] = crop ? [x, y, z] : [x, y + 1, z];
    if (!crop && !isFarmland(target)) {
      hud.toast('Riega las plantas del huerto');
      return true;
    }
    if (!farm.has(cx, cy, cz)) {
      hud.toast('Aquí no hay nada plantado');
      return true;
    }
    sound.splash();
    if (!farm.water(cx, cy, cz, day)) {
      hud.toast('Ya está regada hoy. ¡Mañana habrá crecido!');
      return true;
    }
    farm.sync(world, day);
    if (inventory.wearTool(hud.selected)) hud.toast('¡Tu regadera se ha roto!');
    return true;
  }
  if (def?.tool === 'shovel' && (target === Block.Grass || target === Block.Dirt)) {
    const above = world.getBlock(x, y + 1, z);
    if (above !== Block.Air && above !== Block.TallGrass) return false;
    // En el terreno de un vecino o de la tienda no; en el tuyo sí.
    const plot = world.plotAt(x, z);
    if (plot && plot.kind !== 'player') {
      hud.toast('Aquí no se puede hacer un huerto');
      return true;
    }
    if (above === Block.TallGrass) world.setBlock(x, y + 1, z, Block.Air);
    world.setBlock(x, y, z, Block.Farmland);
    sound.dig('hierba');
    if (inventory.wearTool(hud.selected)) hud.toast('¡Tu pala se ha roto!');
    return true;
  }
  const seed = def ? cropForSeed(def.id) : null;
  if (seed) {
    if (!isFarmland(target) || world.getBlock(x, y + 1, z) !== Block.Air) {
      hud.toast('Las semillas van en tierra de cultivo: labra la hierba con la pala (clic derecho)');
      return true;
    }
    farm.plant(x, y + 1, z, seed.id);
    world.setBlock(x, y + 1, z, seed.stages[0]);
    farm.sync(world, day);
    inventory.consume(hud.selected);
    sound.place();
    return true;
  }
  return false;
}

/** Suelta una gallina o una vaca donde se apunta. */
function placeAnimal(kind: AnimalKind, hit: { block: [number, number, number]; place: [number, number, number] }) {
  if (animals.full) {
    hud.toast(`Ya tienes ${MAX_ANIMALS} animales: ¡no caben más en la granja!`);
    return;
  }
  const [x, y, z] = hit.place;
  if (isSolid(world.getBlock(x, y, z)) || !isSolid(world.getBlock(x, y - 1, z)) || world.waterKind(x, z) && y <= WATER_SURFACE + 1) {
    hud.toast('Suéltala en el suelo, en un sitio despejado');
    return;
  }
  const a = animals.add({ kind, x, y, z });
  a.happy();
  inventory.consume(hud.selected);
  sound.fanfare();
  hud.toast(kind === 'gallina' ? 'La gallina pondrá un huevo cada día' : 'La vaca te dará leche cada día');
  persist();
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
  held.use();
  const hit = currentHit();
  const blockDist = hit ? camera.position.distanceTo(new THREE.Vector3(hit.block[0] + 0.5, hit.block[1] + 0.5, hit.block[2] + 0.5)) : Infinity;
  const villager = villagerInSight(blockDist);
  if (villager) {
    talkTo(villager);
    return;
  }
  const animal = animals.pick(aimRay(), Math.min(blockDist, REACH));
  if (animal) {
    const product = animals.collect(animal, dayKey(gameDate()));
    if (!product) hud.toast(animal.data.kind === 'gallina' ? 'Ya ha puesto su huevo hoy. ¡Vuelve mañana!' : 'Ya te ha dado su leche hoy. ¡Vuelve mañana!');
    else {
      drops.spawn(product, animal.position.x, animal.position.y + 0.6, animal.position.z, { burst: true });
      sound.coin();
    }
    return;
  }
  const stack = hud.selectedStack;
  const def = stack ? itemDef(stack.id) : null;

  if (def?.id === 'botella') {
    readBottle();
    return;
  }

  if (def?.tool === 'rod') {
    useRod(blockDist);
    return;
  }
  if (def?.tool === 'net') {
    useNet();
    return;
  }

  if (!hit) return;
  const [bx, by, bz] = hit.block;
  const target = world.getBlock(bx, by, bz);

  if (target === Block.Workbench) {
    openWorkbench();
    return;
  }

  if (useFarm(def, bx, by, bz, target)) return;

  if (def?.id === 'gallina' || def?.id === 'vaca') {
    placeAnimal(def.id, hit);
    return;
  }

  if (def?.furniture) {
    placeFurniture(def.id, hit);
    return;
  }

  if (def?.block !== undefined) {
    // Colocar sobre hierba alta o una flor la sustituye, como en Minecraft.
    const replace = isCross(target) && !isFruit(target);
    const [x, y, z] = replace ? hit.block : hit.place;
    if (!isCross(def.block) && player.intersectsBlock(x, y, z)) return;
    if (furniture.at(x, y, z)) return;
    world.setBlock(x, y, z, def.block);
    delete harvested[posKey(x, y, z)];
    inventory.consume(hud.selected);
    sound.place();
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

/** Mueble al que apunta la mira, si está más cerca que el bloque apuntado. */
function furnitureInSight() {
  const hit = currentHit();
  const blockDist = hit ? camera.position.distanceTo(new THREE.Vector3(hit.block[0] + 0.5, hit.block[1] + 0.5, hit.block[2] + 0.5)) : Infinity;
  return furniture.pick(aimRay(), Math.min(blockDist, REACH));
}

function pickUpFurniture(): boolean {
  const f = furnitureInSight();
  if (!f) return false;
  if (!take(f.furniture.id)) return true;
  furniture.remove(f.furniture);
  return true;
}

function placeFurniture(id: string, hit: { block: [number, number, number]; place: [number, number, number] }) {
  // Sobre hierba alta o una flor, el mueble la sustituye.
  const target = world.getBlock(...hit.block);
  const [x, y, z] = isCross(target) && !isFruit(target) ? hit.block : hit.place;
  const here = world.getBlock(x, y, z);
  if ((here !== Block.Air && !isCross(here)) || isFruit(here) || furniture.at(x, y, z)) return;
  if (!isSolid(world.getBlock(x, y - 1, z))) {
    hud.toast('Los muebles tienen que ir sobre el suelo');
    return;
  }
  if (here !== Block.Air) world.setBlock(x, y, z, Block.Air);
  // El mueble mira hacia quien lo coloca.
  const rot = ((Math.round(player.yaw / (Math.PI / 2)) % 4) + 4) % 4;
  furniture.place(id, x, y, z, rot);
  inventory.consume(hud.selected);
  sound.place();
  tutorial.complete('mueble');
  persist();
}

function readBottle() {
  const name = workbench.learnRandom();
  if (!name) {
    hud.toast('Ya te sabes todas las recetas de las botellas');
    return;
  }
  inventory.consume(hud.selected);
  hud.toast(`¡Una receta dentro de la botella! Has aprendido: ${name.toLowerCase()}`);
}

function aimRay(): THREE.Ray {
  camera.getWorldDirection(dir);
  return ray.set(camera.position, dir);
}

/** Mete una criatura en los bolsillos y la apunta en la enciclopedia. */
function keepCreature(id: string, verb: string, tool: string) {
  const c = creature(id)!;
  if (inventory.add(id) > 0) {
    hud.toast(`No te cabe en los bolsillos. Lo dejas ir`);
    return;
  }
  const first = collection.register(id);
  sound.fanfare();
  tutorial.complete('criatura');
  hud.toast(`¡${verb} ${c.name.toLowerCase()}!${first ? ' Nuevo en la enciclopedia.' : ''}`);
  if (inventory.wearTool(hud.selected)) hud.toast(`¡Tu ${itemDef(tool).name.toLowerCase()} se ha roto!`);
}

function useRod(blockDist: number) {
  const r = fishing.use(aimRay(), currentHour);
  // Si hay un bloque delante más cerca que el agua, no se puede lanzar ahí.
  if (r.kind === 'cast' && fishing.bobber.position.distanceTo(camera.position) > blockDist) {
    fishing.stop();
    hud.toast('Apunta al agua para pescar');
    return;
  }
  if (r.kind === 'no-water') hud.toast('Apunta al agua para pescar');
  else if (r.kind === 'too-early') hud.toast('Has tirado demasiado pronto…');
  else if (r.kind === 'caught') keepCreature(r.creature.id, 'Has pescado:', 'cana');
}

function useNet() {
  const c = bugs.catch(aimRay(), 4.5);
  if (c) keepCreature(c.id, 'Has atrapado:', 'red');
  else hud.toast('No hay ningún insecto ahí');
}

/** Sacudir un árbol, como en Animal Crossing: cae la fruta y, una vez al día, una rama. */
function shakeTree(x: number, y: number, z: number) {
  sound.rustle();
  tutorial.complete('sacudir');
  const fruits = world.treeFruitsNear(x, y, z);
  for (const [fx, fy, fz] of fruits) removeBlock(fx, fy, fz, world.getBlock(fx, fy, fz), true);

  const trunk = findTrunk(world, x, y, z);
  let branch = false;
  if (trunk && !branchTrees.has(trunk.key)) {
    branchTrees.add(trunk.key);
    drops.spawn('rama', trunk.x + 0.5, trunk.y + 0.5, trunk.z + 0.5, { burst: true });
    branch = true;
  }
  if (!fruits.length && !branch) hud.toast('No ha caído nada');
}

// Pasos: un sonido cada poco más de un bloque andado, según lo que haya bajo los pies.
let stepDistance = 0;
let farmTimer = 0;
let rainTimer = 0;
const spawnPoint = player.position.clone();
function updateSteps(dt: number) {
  const speed = Math.hypot(player.velocity.x, player.velocity.z);
  if (player.inWater && speed > 0.5) {
    // Nadando: una brazada cada poco.
    stepDistance += speed * dt;
    if (stepDistance > 1.4) {
      stepDistance = 0;
      sound.swim();
    }
    return;
  }
  if (!player.onGround || speed < 1) return;
  stepDistance += speed * dt;
  if (stepDistance < 1.7) return;
  stepDistance = 0;
  const [fx, fy, fz] = [Math.floor(player.position.x), Math.floor(player.position.y), Math.floor(player.position.z)];
  const below = world.getBlock(fx, Math.floor(player.position.y - 0.1), fz);
  // Pasar entre hierba alta, flores o bambú suena a hojas; en invierno la hierba y la arena crujen.
  if (SWAYING.has(world.getBlock(fx, fy, fz))) sound.step('plantas');
  else if (below) {
    const m = materialOf(BLOCKS[below].name);
    sound.step(season === 'invierno' && (m === 'hierba' || m === 'arena') ? 'nieve' : m);
  }
  if (Math.hypot(player.position.x - spawnPoint.x, player.position.z - spawnPoint.z) > 8) tutorial.complete('mover');
}

function toggleSound() {
  const on = sound.toggle();
  soundButton.textContent = on ? 'Sonido: sí' : 'Sonido: no';
  hud.toast(on ? 'Sonido activado' : 'Sonido desactivado');
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

const nameTags = new NameTags(villagers, document.querySelector<HTMLDivElement>('#labels')!);

// --- Reloj con la hora local, como en Animal Crossing ---

const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'short' });
let lastClock = '';
const gloomColor = new THREE.Color();
const seasonText = season.charAt(0).toUpperCase() + season.slice(1);
function updateClock(now: Date) {
  const t = timeFormat.format(now);
  if (t === lastClock) return;
  lastClock = t;
  clockTime.textContent = t;
  clockDate.textContent = `${dateFormat.format(now)} · ${holiday ? holiday.name : seasonText}`;
}

// --- Bucle principal ---

let last = performance.now();
let frames = 0;
let fpsTime = 0;
let fps = 0;
let spawned = !!save?.player;

// Pantalla de carga: se quita cuando ya se ve la isla alrededor (o, como mucho, a los 20 segundos).
const splash = document.querySelector<HTMLDivElement>('#splash');
const splashBar = splash?.querySelector<HTMLElement>('#splash-bar i');
if (splash) splash.querySelector('#splash-text')!.textContent = 'Preparando tu isla…';
function updateSplash(now: number) {
  if (!splash || splash.classList.contains('done')) return;
  const loaded = world.loadedFraction(player.position.x, player.position.z, Math.min(renderRadius, 3));
  splashBar!.style.width = `${Math.round(20 + loaded * 80)}%`;
  if (loaded < 1 && now < 20_000) return;
  splash.classList.add('done');
  setTimeout(() => splash.remove(), 500);
}

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  world.update(player.position.x, player.position.z, renderRadius);

  // Esperar a que el suelo bajo el jugador exista antes de aplicar la gravedad.
  updateSplash(now);
  if (!spawned && world.isReady(player.position.x, player.position.z)) {
    player.spawnAt(player.position.x, player.position.z);
    spawned = true;
  }
  player.update(spawned && world.isReady(player.position.x, player.position.z) ? dt : 0);
  // En la portada la cámara da vueltas despacio por encima de la isla.
  if (!menu.hidden && menu.isTitle) {
    const a = now / 1000 * 0.08;
    camera.position.set(player.position.x + Math.sin(a) * 16, player.position.y + 9, player.position.z + Math.cos(a) * 16);
    camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
  }
  breaker.update(dt, breaker.active ? currentHit()?.block ?? null : null);
  updateSteps(dt);

  const date = gameDate();
  const hour = Sky.hourOf(date);
  currentHour = hour;
  sky.update(hour, camera);
  // Con lluvia o nieve el día se oscurece y la niebla se vuelve gris.
  const nowWeather = params.get('tiempo') as keyof typeof WEATHER_TEXT | null;
  weather.set(nowWeather && nowWeather in WEATHER_TEXT ? nowWeather : weatherAt(date, seed));
  weather.update(dt, camera.position);
  hemi.intensity *= 1 - weather.gloom * 0.3;
  sunLight.intensity *= 1 - weather.gloom * 0.7;
  sky.color.lerp(gloomColor.setRGB(0.55, 0.6, 0.65).multiplyScalar(1 - sky.night * 0.8), weather.gloom * 0.75);
  sky.syncDome(weather.gloom);
  water.update(now / 1000, settings.quality !== 'baja', (1 - sky.night) * (1 - weather.gloom));
  wind.update(now / 1000, 1 + weather.gloom * 1.5);
  waterfalls.update(now / 1000);
  birds.update(dt, now / 1000, player.position, Math.max(sky.night, weather.raining ? 0.7 : 0), (x, z) => world.waterKind(x, z) === 'mar');
  for (const v of villagers) v.update(dt, hour, player.position);
  animals.update(dt, player.position);
  // Cada segundo el huerto crece si ha cambiado el día, y la lluvia lo riega.
  farmTimer -= dt;
  if (farmTimer <= 0) {
    farmTimer = 1;
    const day = dayKey(date);
    if (weather.raining) farm.waterAll(day);
    farm.sync(world, day);
  }
  nameTags.update(camera, player.position);
  updateClock(date);
  drops.update(dt, player.position, take, 1 - sky.night * 0.5);
  bugs.update(dt, hour, player.position, 1 - sky.night * 0.5);
  furniture.setNight(sky.night);
  sound.setHour(hour);
  rainTimer -= dt;
  if (rainTimer <= 0) {
    rainTimer = 0.5;
    sound.setRain(weather.raining ? weather.gloom : 0);
  }
  if (fishing.active && hud.selectedStack?.id !== 'cana') fishing.stop();
  const fish = fishing.update(dt, player.position);
  if (fish === 'bite') {
    sound.splash();
    hud.toast(touchMode ? '¡Ha picado! Pulsa Usar, ¡rápido!' : '¡Ha picado! Clic derecho, ¡rápido!');
  }
  else if (fish === 'escaped') hud.toast('Se ha escapado…');

  // Bajo el agua todo se ve azul y cerca.
  const submerged = camera.position.y < WATER_SURFACE && !!world.waterKind(Math.floor(camera.position.x), Math.floor(camera.position.z));
  underwater.hidden = !submerged;
  sky.dome.visible = !submerged;
  if (submerged) {
    fog.color.setHex(0x2a6d99);
    fog.near = 1;
    fog.far = 22;
  } else {
    fog.color.copy(sky.color);
    fog.near = fogNear();
    fog.far = fogFar();
  }

  clouds.update(now / 1000, sky.night, weather.gloom, sky.glow, sky.glowColor);

  const hit = currentHit();
  const aimed = furnitureInSight();
  if (aimed) {
    aimed.box.getCenter(highlight.position);
    aimed.box.getSize(highlight.scale);
    highlight.visible = true;
  } else if (hit) {
    highlight.position.set(hit.block[0] + 0.5, hit.block[1] + 0.5, hit.block[2] + 0.5);
    highlight.scale.set(1, 1, 1);
    highlight.visible = true;
  } else {
    highlight.visible = false;
  }

  renderer.render(scene, camera);
  // La mano va encima de todo, en otra pasada, y no se ve en la portada ni con el menú abierto.
  if (menu.hidden && !panel) {
    const walking = player.onGround ? Math.hypot(player.velocity.x, player.velocity.z) : 0;
    held.update(dt, camera, hud.selectedStack?.id ?? null, breaker.active && !!hit, walking, 1 - sky.night * 0.6);
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(held.scene, camera);
    renderer.autoClear = true;
  }

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
    game: { world, player, farm, animals, useItem, birds, waterfalls, held, sound, tutorial, touch, lockInput, unlockInput, isPlaying, weather, decor, season, holiday, workbench, openWorkbench, readBottle, furniture, home, setWallet, placeFurniture, pickUpFurniture, furnitureInSight, camera, villagers, bugs, fishing, collection, useRod, useNet, talkTo, dialog, shop, get wallet() { return wallet; }, persist, inventory, hud, drops, shakeTree, openInventory, closeInventory, currentHit, breaker, get breaking() { return breaker.active; }, get breakProgress() { return breaker.progress; } },
  });
}
