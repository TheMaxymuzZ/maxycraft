import * as THREE from 'three';
// Las letras van dentro del juego (sin Google Fonts) para que se vean también sin internet.
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './style.css';
import { Sound, materialOf } from './audio';
import { BLOCKS, Block, FRUITS, ROOFS, SWAYING, applySeason, createAtlasCanvas, createAtlasTexture, isCross, isDoor, isDoorTop, isGround, isPath, isSolid, isStairs, isTargetable, isWater, isWaterSource, stairsFacing, toggled } from './blocks';
import { Fluids } from './fluids';
import { Breaker } from './breaking';
import { Birds } from './birds';
import { Bugs } from './bugs';
import { GameClock, dailyRandom, dayKey, timeOverrides } from './clock';
import { Clouds, cloudCover } from './clouds';
import { Collection } from './collection';
import { calendar, creature } from './creatures';
import { Dialog, HOUSE_COSTS, HOUSE_NAMES, KNOW } from './dialog';
import { Drops } from './drops';
import { Fishing } from './fishing';
import { Furniture, type PlacedFurniture, paintFurnitureIcons } from './furniture';
import { HeldItem } from './held';
import { ItemModels } from './itemModels';
import { Hud } from './hud';
import { checkForUpdates, setupInstall } from './install';
import { Islands } from './islands';
import { NameTags } from './labels';
import { WorldSync } from './net/actions';
import { loadIdentity, renameIdentity, tabIdentity } from './net/identity';
import type { Snapshot } from './net/protocol';
import { NetSession, type SessionEvents } from './net/session';
import { TabTransport } from './net/transport';
import { newInviteCode, normalizeCode } from './net/code';
import { openRoom } from './net/rtc';
import { FriendsUI, GESTURE_LOOK } from './friends';
import { RemotePlayers } from './remotePlayers';
import { Menu } from './menu';
import { Animals, MAX_ANIMALS, type AnimalKind } from './animals';
import { Farm, cropForSeed, cropOfBlock, isFarmland } from './farm';
import { Inventory, starterKit } from './inventory';
import { type Action, keyLabel } from './keys';
import { hasUnseenNews, markNewsSeen } from './changelog';
import { type MissionEvent, Missions } from './missions';
import { MissionsPanel } from './missionsPanel';
import { countPlaced, rateIsland } from './rating';
import { LEAF_BRANCH_CHANCE, SHELLS, dropFor, fruitItemFor, hasItem, itemDef } from './items';
import { Player } from './player';
import { raycast } from './raycast';
import { type SaveData, activeSlot, loadGame, saveGame, setActiveSlot } from './save';
import { Shop, formatBerries } from './shop';
import { WEATHER_TEXT, holidayOf, seasonOf, weatherAt } from './seasons';
import { PIXEL_RATIO, RENDER_RADIUS, type Settings, loadSettings, uiScaleFor } from './settings';
import { Sky } from './sky';
import { SunShadows } from './shadows';
import { TouchControls } from './touch';
import { fellTree, findTrunk } from './trees';
import { CONTAINERS, Storage, StoragePanel, isContainer } from './storage';
import { Orchard, canPlantOn, isSapling, treeKindOfFruit, treeKindOfSapling } from './orchard';
import { TUTORIAL_REWARD, Tutorial } from './tutorial';
import { MYSTERY_NAMES, Seaplane, loadTrip, planTrip, saveTrip } from './travel';
import { LotGhosts, type Lot, describeMissing, inLot, lotFrom, lotPlot, lotProblem, lotProgress } from './lots';
import { type Guest, PILOT, type Villager, createVillagers, createVisitor, pickVisitor } from './villagers';
import { WeatherFx } from './weather';
import { Workbench } from './workbench';
import { Water } from './water';
import { Portraits } from './portraits';
import { Wind } from './wind';
import { HAND_LIGHT, Lighting } from './lighting';
import { MAX_HUNGER, Vitals, type HurtCause, faintLoss, isFood } from './vitals';
import { VitalsHud } from './vitalsHud';
import { BIOME_NAMES, type Biome, HEIGHT, SEA_LEVEL, TERRAIN_VERSION, World } from './world';

/** Pantalla táctil (móvil o tableta): se juega con botones en vez de ratón. Para probar: ?tactil */
const touchMode = matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).has('tactil');
// Los estilos del mando y de la interfaz para el móvil van con esta clase (también al probar con ?tactil).
document.documentElement.classList.toggle('tactil', touchMode);
// Opciones del jugador; en el móvil, por defecto, se ve algo menos lejos para que vaya fluido.
const settings = loadSettings(touchMode);
let renderRadius = RENDER_RADIUS[settings.quality];
const REACH = 6;
const fogNear = () => renderRadius * 16 * 0.55;
const fogFar = () => renderRadius * 16 * 0.95;
/** Días de juego que tarda en volver a salir la fruta de un árbol, como en Animal Crossing. */
const FRUIT_REGROW_DAYS = 3;
const SHELLS_PER_DAY = 7;

// Para probar otras horas y días: ?hora=21.5 y ?fecha=2026-12-24
const params = new URLSearchParams(location.search);
const overrides = timeOverrides(params);

// --- Escena ---

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO[settings.quality]));
renderer.setSize(window.innerWidth, window.innerHeight);
// Los brillos fuertes (antorchas, el sol en la arena) se suavizan en vez de quemarse en blanco (v3.2).
renderer.toneMapping = THREE.NeutralToneMapping;

const scene = new THREE.Scene();
const fog = new THREE.Fog(0xa8dcf5, fogNear(), fogFar());
scene.fog = fog;
scene.background = fog.color;

const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 400);

const hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a9a7a, 1.6);
const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.4);
scene.add(hemi, sunLight);
const sky = new Sky(scene, hemi, sunLight);
const shadows = new SunShadows(renderer, sunLight, scene);

const atlas = createAtlasCanvas();
paintFurnitureIcons(atlas);
const atlasTexture = createAtlasTexture(atlas);
const material = new THREE.MeshLambertMaterial({
  map: atlasTexture,
  vertexColors: true,
  alphaTest: 0.5,
  side: THREE.DoubleSide, // las plantas se ven por los dos lados
});

// --- Jugar con amigos ---
// Con un código (?isla=ABC234) se entra en la isla de un amigo, de ordenador a ordenador (v2.11).
// Para probar en un solo navegador sigue valiendo ?pruebared=anfitrion en una pestaña y ?pruebared=invitado en otra.
// El invitado juega en la isla del anfitrión: de lo suyo solo usa y guarda los bolsillos, las bayas y la enciclopedia.

const netTest = params.get('pruebared');
const inviteCode = normalizeCode(params.get('isla') ?? '');
/** Servidores de señalización propios (?rele=wss://…), por si los públicos no funcionan. */
const relays = (params.get('rele') ?? '').split(',').filter((u) => /^wss?:\/\//.test(u));
const identity = netTest ? tabIdentity(loadIdentity()) : null;
/** Lo que pasa en la partida con amigos; se rellena cuando ya existen el HUD y los jugadores. */
const netEvents: SessionEvents = {};
let netError = '';
async function joinIsland(): Promise<{ session: NetSession; snapshot: Snapshot } | null> {
  const text = document.querySelector('#splash-text');
  if (text) text.textContent = inviteCode ? `Buscando la isla ${inviteCode}…` : 'Buscando la isla del anfitrión…';
  try {
    if (inviteCode) {
      const transport = await openRoom(inviteCode, relays);
      // Hay que dar tiempo a que los dos ordenadores se encuentren por internet.
      return await NetSession.join(transport, { ...loadIdentity(), id: transport.selfId }, netEvents, 30_000);
    }
    return await NetSession.join(new TabTransport(identity!.id), identity!, netEvents);
  } catch (e) {
    netError = (e as Error).message;
    return null;
  } finally {
    // Si no se pudo entrar, al recargar se vuelve a la isla propia.
    if (inviteCode) {
      const url = new URL(location.href);
      url.searchParams.delete('isla');
      history.replaceState(null, '', url);
    }
  }
}
const joined = netTest === 'invitado' || inviteCode ? await joinIsland() : null;

// --- Partida guardada ---

const save = joined ? null : loadGame();
/** De visita en otra isla, los bolsillos, las bayas y la enciclopedia son los de tu isla. */
const pockets = joined ? loadGame() : save;
const seed = joined?.snapshot.seed ?? save?.seed ?? Math.floor(Math.random() * 1e9);
/** Las islas guardadas conservan su terreno; las nuevas son grandes y con biomas (v2.6). */
const terrain = save ? save.terrain ?? 1 : TERRAIN_VERSION;
// De viaje en una isla misteriosa: se juega en otra isla, pero los bolsillos y las bayas son los de casa.
const trip = save ? loadTrip(activeSlot()) : null;
/** Vecinos invitados desde las islas misteriosas, que viven (o vivirán) en la isla de casa. */
const guests: Guest[] = (joined?.snapshot.guests ?? save?.guests ?? []).map((g) => ({ ...g }));
/** Casas que construye el jugador para vecinos nuevos (v2.10). */
const lots: Lot[] = (joined?.snapshot.lots ?? save?.lots ?? []).map((l) => ({ ...l }));
/** Casas terminadas en las que aún no vive nadie. */
const freeLots = () => lots.filter((l) => l.done && !guests.some((g) => g.lot && g.x === l.x && g.z === l.z));
/** El reloj de la isla: días de unos minutos y estaciones de una semana de juego (v2.4). */
const clock = new GameClock(joined?.snapshot.clock ?? save?.clock, overrides, settings.dayLength);
const gameDate = () => clock.date();
const startDate = gameDate();
let season = seasonOf(startDate);
let holiday = holidayOf(startDate);
calendar.month = startDate.getMonth() + 1;
applySeason(atlas, season);

const sound = new Sound(seed);
sound.season = season;
const world = joined
  ? new World(joined.snapshot.seed, material, joined.snapshot.edits, joined.snapshot.options)
  : trip
  ? new World(trip.seed, material, {}, { mystery: { kind: trip.kind, fruit: trip.fruit } })
  : new World(seed, material, save?.edits ?? {}, { terrain, guests: guests.flatMap((g) => (g.x !== undefined && g.z !== undefined && !g.lot ? [[g.x, g.z] as [number, number]] : [])) });
/** Todos los cambios de bloques pasan por aquí, para poder compartirlos con otros jugadores. */
const sync = new WorldSync(world);
/**
 * El agua se mueve sola (v3.8) cuando algo cambia a su lado. En una partida con amigos la mueve el anfitrión
 * y los bloques nuevos les llegan a los demás como cualquier otro cambio.
 */
const fluids = new Fluids({
  getBlock: (x, y, z) => world.getBlock(x, y, z),
  setBlock: (x, y, z, b) => sync.setBlock(x, y, z, b),
  loaded: (x, z) => world.hasColumn(x, z),
});
fluids.enabled = !joined;
world.onBlockChange = (x, y, z) => fluids.wake(x, y, z);
// Los invitados antes de la v2.10 se mudan al volver a casa: se les busca sitio una vez y se guarda.
// Desde la v2.10 cada invitado ya trae su casa: la que construyó el jugador.
if (!trip && !joined) {
  for (const g of guests) {
    if (g.x !== undefined) continue;
    const [spot] = world.findGuestSpots(1);
    if (!spot) break;
    [g.x, g.z] = spot;
    world.addGuestPlot(spot[0], spot[1]);
  }
}
scene.add(world.group);
const water = new Water();
world.waterMaterial = water.material;
const wind = new Wind(material);
const lighting = new Lighting(material);
const birds = new Birds();
/** Lo alto de cada columna, para los pájaros; se vuelve a mirar cada poco por si alguien ha construido. */
const tops = new Map<number, number>();
let topsAge = 0;
const birdWorld = {
  topAt(x: number, z: number): number {
    if (!world.hasColumn(x, z)) return SEA_LEVEL + 30; // donde aún no hay isla, ni se acercan
    const k = (x + 4096) * 8192 + (z + 4096);
    let top = tops.get(k);
    if (top === undefined) {
      top = HEIGHT - 1;
      while (top > 0 && !isSolid(world.getBlock(x, top, z)) && !isWater(world.getBlock(x, top, z))) top--;
      tops.set(k, top);
    }
    return top;
  },
  seaAt: (x: number, z: number) => world.waterKind(x, z) === 'mar',
  waterAt: (x: number, z: number) => world.waterTop(x, z) !== null,
};
/** Dónde está cada ser vivo de la isla: tú, tus amigos, los vecinos y los animales (los pájaros se espantan). */
function livingBeings(): THREE.Vector3[] {
  topsAge += 1;
  if (topsAge > 120) {
    topsAge = 0;
    tops.clear();
  }
  const out = [player.position];
  for (const r of remotes.players.values()) out.push(r.position);
  for (const v of villagers) if (v.group.visible) out.push(v.position);
  for (const a of animals.list) out.push(a.position);
  return out;
}
scene.add(birds.group);

let today = dayKey(startDate);

// Árboles plantados con brotes: crecen con los días y su fruta también vuelve a salir.
const orchard = new Orchard(trip ? [] : save?.orchard);

// La fruta cogida hace días vuelve a crecer en el mismo sitio.
const harvested: Record<string, number> = { ...(save?.harvested ?? {}) };
/** Vuelve a poner la fruta cogida hace FRUIT_REGROW_DAYS días (o más). */
function regrowFruit() {
  const now = clock.dayNumber();
  for (const [k, t] of Object.entries(harvested)) {
    // Antes de la v2.4 se guardaba la hora real en milisegundos; también vale si se cambió el reloj.
    if (t <= now && now - t < FRUIT_REGROW_DAYS) continue;
    const [x, y, z] = k.split(',').map(Number);
    const planted = orchard.fruitAt(x, y, z);
    if (planted) {
      if (world.getBlock(x, y, z) === Block.Air) sync.setBlock(x, y, z, planted);
    } else sync.clearEdit(x, y, z);
    delete harvested[k];
  }
}
if (!joined) regrowFruit();
let bottleTaken = save?.bottle?.day === today && save.bottle.taken;
const shellsTaken = new Set(save?.shells?.day === today ? save.shells.taken : []);
const branchTrees = new Set(save?.branches?.day === today ? save.branches.trees : []);

// El huerto y la granja.
const farm = new Farm(trip ? {} : save?.farm);
farm.sync(sync, today);
if (!joined) orchard.sync(sync, today);
const animals = new Animals(world, trip ? [] : save?.animals);
scene.add(animals.group);

// La avioneta: en casa, en la playa más cercana a la tienda; en las islas misteriosas, donde se aterriza.
const shopPlot = world.plots.find((p) => p.kind === 'shop');
const airport = world.findAirport(shopPlot ? Math.atan2(shopPlot.z, shopPlot.x) : 0);
const plane = new Seaplane();
if (airport) {
  plane.place(airport.x + 0.5 + airport.dx * 5, SEA_LEVEL + 0.7, airport.z + 0.5 + airport.dz * 5, airport.dx, airport.dz);
  scene.add(plane.group);
}

const player = new Player(world, camera);
// El piloto espera en la playa a un lado del avión (donde también haya playa).
const pilotSpot = airport && [1, -1].map((side) => [airport.x + Math.round(-airport.dz * side), airport.z + Math.round(airport.dx * side)])
  .find(([x, z]) => world.heightAt(x, z) === SEA_LEVEL + 1) || (airport && [airport.x, airport.z]);
if (joined?.snapshot.spawn) {
  // De visita se aparece al lado de quien invita.
  player.spawnAt(...joined.snapshot.spawn);
} else if (trip && airport) {
  // Se aterriza en la playa, junto a la avioneta.
  player.spawnAt(airport.x, airport.z);
  player.yaw = Math.atan2(airport.dx, airport.dz);
} else if (trip) {
  const [sx, sz] = world.findSpawn(0, 0);
  player.spawnAt(sx, sz);
} else if (save?.player) {
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

// Las farolas y lámparas alumbran como las antorchas.
const lampHook = (x: number, y: number, z: number, level: number) => world.setLamp(x, y, z, level);
const furniture = new Furniture(trip ? [] : joined?.snapshot.furniture ?? save?.furniture ?? [], lampHook);
// Los muebles también se comparten con los demás jugadores.
sync.furniture = furniture;
scene.add(furniture.group);

// Adornos de las fiestas (se ponen con placeHolidayDecor).
const decor = new Furniture([], lampHook);
scene.add(decor.group);
placeHolidayDecor();
// En la tienda de campaña hay una cama para empezar.
if (!save && !joined && world.playerPlot) furniture.place('cama', world.playerPlot.x, world.playerPlot.y + 1, world.playerPlot.z, 0);
// En las islas nuevas, la tienda y el museo tienen farolas a los lados de la puerta.
if (!save && !joined && !trip) {
  for (const plot of world.plots.filter((p) => p.kind === 'shop' || p.kind === 'museum')) {
    const [dx, dy, dz] = plot.door;
    for (const side of [-2, 2]) {
      const [x, z] = [dx + side, dz + 1];
      if (world.getBlock(x, dy, z) === Block.Air && isSolid(world.getBlock(x, dy - 1, z))) furniture.place('farola', x, dy, z, 0);
    }
  }
}

const villagers = createVillagers(world, save?.villagers ?? {}, guests, trip ? [] : lots.map(lotPlot));
// El piloto espera en la playa junto a la avioneta; en las islas misteriosas hay alguien de vacaciones.
let pilot: Villager | null = null;
if (airport) {
  pilot = createVisitor(world, PILOT.name, pilotSpot![0], airport.y, pilotSpot![1], save?.villagers?.[PILOT.name] ?? { friendship: 0 });
  if (pilot) villagers.push(pilot);
}
/** Quien está de vacaciones en la isla misteriosa (también si has venido de viaje con un amigo). */
const visitorName = trip?.visitor ?? joined?.snapshot.visitor ?? null;
if (visitorName) {
  const [vx, vz] = world.findSpawn(0, 0);
  const visitor = createVisitor(world, visitorName, vx, world.heightAt(vx, vz) + 1, vz, save?.villagers?.[visitorName] ?? { friendship: 0 });
  if (visitor) villagers.push(visitor);
}
for (const v of villagers) {
  scene.add(v.group);
  if (v.isBirthday(startDate)) v.addPartyHat();
}

const inventory = new Inventory();
if (pockets?.inventory) inventory.load(pockets.inventory);
else starterKit(inventory);
inventory.loadOffhand(pockets?.offhand);

const collection = new Collection(pockets?.caught ?? [], pockets?.donated ?? [], atlas, pockets?.met, pockets?.learned);
const portraits = new Portraits(renderer);
collection.portrait = (name, spec) => portraits.get(name, spec);

// Tareas del día, puntos y logros.
const missions = new Missions(seed, save?.missions, today);
/** Apunta algo para las tareas y avisa de lo que se acaba de cumplir. */
function record(event: MissionEvent, n = 1) {
  const r = missions.record(event, n);
  for (const t of r.tasks) hud.toast(`¡Tarea cumplida: ${t.text.toLowerCase()}! +${t.points} puntos`);
  for (const a of r.achievements) hud.toast(`🏆 ¡Logro: ${a.name}! +${a.points} puntos`);
  if (r.tasks.length || r.achievements.length) sound.fanfare();
  if (panel === 'missions') missionsPanel.render();
}

let wallet = pockets?.wallet ?? 500;
/** Vida y hambre (v4.1). Son tuyas: también cuando juegas en la isla de un amigo. */
const vitals = new Vitals(pockets?.vitals);
const walletEl = document.querySelector<HTMLSpanElement>('#wallet-amount')!;
function setWallet(n: number) {
  if (n !== wallet) sound.coin();
  // Vender en la tienda cuenta para el tutorial.
  if (n > wallet && panel === 'shop') {
    tutorial.complete('vender');
    record('vender', n - wallet);
  }
  wallet = n;
  walletEl.textContent = formatBerries(n);
}
setWallet(wallet);

let savedRevision = world.revision;
let saving = true;
/** Lo último que se guardó, para avisar solo cuando de verdad hay algo nuevo. */
let lastSaved = save ? JSON.stringify({ ...save, savedAt: 0 }) : '';
let saveFailed = false;
const saveIndicator = document.querySelector<HTMLElement>('#save-indicator')!;
function showSaveIndicator(text: string, error = false) {
  saveIndicator.textContent = text;
  saveIndicator.classList.toggle('error', error);
  saveIndicator.classList.remove('show');
  void saveIndicator.offsetWidth; // para que la animación vuelva a empezar
  saveIndicator.classList.add('show');
}
function persist() {
  if (!saving || netTest === 'invitado') return;
  const p = player.position;
  const memories = Object.fromEntries(villagers.map((v) => [v.name, v.memory]));
  // De visita en la isla de un amigo solo se guarda lo tuyo: bolsillos, bayas, enciclopedia y recetas.
  const own = joined ? loadGame() : null;
  if (joined && !own) return;
  // De viaje solo se guarda lo que te llevas: la isla de casa se queda como estaba.
  const homeSave = trip ? loadGame() ?? save : null;
  const data: SaveData = own ? {
    ...own,
    inventory: inventory.serialize(),
    offhand: inventory.offhand,
    wallet,
    caught: [...collection.caught],
    met: [...collection.met],
    learned: { ...collection.learned },
    vitals: vitals.serialize(),
    donated: [...collection.donated],
    recipes: [...workbench.known],
    savedAt: 0,
  } : homeSave ? {
    ...homeSave,
    inventory: inventory.serialize(),
    offhand: inventory.offhand,
    villagers: { ...homeSave.villagers, ...memories },
    wallet,
    caught: [...collection.caught],
    met: [...collection.met],
    learned: { ...collection.learned },
    vitals: vitals.serialize(),
    donated: [...collection.donated],
    tutorial: tutorial.serialize(),
    tutorialDone: tutorial.finished,
    recipes: [...workbench.known],
    guests,
    missions: missions.serialize(),
    clock: clock.serialize(),
    savedAt: 0,
  } : {
    version: 1,
    seed,
    terrain,
    edits: world.exportEdits(),
    player: { x: p.x, y: p.y, z: p.z, yaw: player.yaw, pitch: player.pitch },
    inventory: inventory.serialize(),
    offhand: inventory.offhand,
    harvested,
    shells: { day: today, taken: [...shellsTaken] },
    branches: { day: today, trees: [...branchTrees] },
    villagers: memories,
    wallet,
    caught: [...collection.caught],
    met: [...collection.met],
    learned: { ...collection.learned },
    vitals: vitals.serialize(),
    donated: [...collection.donated],
    home,
    furniture: furniture.serialize(),
    tutorial: tutorial.serialize(),
    tutorialDone: tutorial.finished,
    recipes: [...workbench.known],
    bottle: { day: today, taken: bottleTaken },
    farm: farm.serialize(),
    orchard: orchard.serialize(),
    storage: storage.serialize(),
    animals: animals.serialize(),
    guests,
    lots,
    missions: missions.serialize(),
    clock: clock.serialize(),
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

const itemModels = new ItemModels(atlas, atlasTexture);
const drops = new Drops(world, itemModels);
scene.add(drops.group);
const bugs = new Bugs(world, atlas);
scene.add(bugs.group);
const fishing = new Fishing(world);
scene.add(fishing.bobber);

// Cada día aparecen conchas nuevas en la playa.
function spawnBeachFinds() {
  drops.clear('playa');
  const random = dailyRandom(seed, today);
  world.beachSpots(SHELLS_PER_DAY, random).forEach(([x, y, z], i) => {
    if (shellsTaken.has(i)) return;
    const id = SHELLS[Math.floor(random() * SHELLS.length)];
    drops.spawn(id, x + 0.5, y + 0.3, z + 0.5, {
      tag: 'playa',
      onPickup: () => {
        shellsTaken.add(i);
        record('concha');
      },
    });
  });
  // Y una botella con una receta dentro.
  const [bottle] = world.beachSpots(1, random);
  if (bottle && !bottleTaken) {
    drops.spawn('botella', bottle[0] + 0.5, bottle[1] + 0.3, bottle[2] + 0.5, { tag: 'playa', onPickup: () => (bottleTaken = true) });
  }
}
spawnBeachFinds();

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
/** Avisa de que han cambiado las teclas (el tutorial, que se crea más abajo, se apunta aquí). */
let keysChanged = () => {};
function applySettings(s: Settings) {
  sound.setVolumes(s.music / 100, s.sfx / 100);
  player.sensitivity = s.sensitivity;
  player.bindings = s.keys;
  for (const el of document.querySelectorAll<HTMLElement>('[data-key]')) el.textContent = keyLabel(s.keys[el.dataset.key as Action]);
  keysChanged();
  document.documentElement.classList.toggle('texto-grande', s.bigText);
  applyUiScale();
  document.documentElement.classList.toggle('daltonico', s.colorblind);
  camera.fov = s.fov;
  camera.updateProjectionMatrix();
  renderRadius = RENDER_RADIUS[s.quality];
  shadows.setQuality(s.quality);
  clock.dayLength = s.dayLength;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO[s.quality]));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
/** Tamaño de la interfaz (v3.7): el elegido, sin pasarse de lo que cabe; el CSS lo multiplica por el del texto grande. */
function applyUiScale() {
  const ui = uiScaleFor(settings.uiScale, window.innerWidth, window.innerHeight, touchMode);
  document.documentElement.style.setProperty('--ui', String(ui));
  document.documentElement.classList.toggle('ui-escalada', ui !== 1 || settings.bigText);
  const hint = document.querySelector<HTMLElement>('#opt-uiScale-hint');
  if (hint) {
    hint.textContent = ui * 100 < settings.uiScale - 1
      ? `En esta pantalla no cabe más grande: se ve al ${Math.round(ui * 100)}%. Gira el móvil o usa una pantalla mayor.`
      : 'Botones, barra rápida, avisos y ventanas más grandes o más pequeños.';
  }
}
window.addEventListener('resize', applyUiScale);
const menu = new Menu(settings, touchMode, applySettings);
// Después de una actualización, la portada enseña primero las novedades.
if (hasUnseenNews(!!save)) menu.show('news');
markNewsSeen();
applySettings(settings);

const hud = new Hud(inventory, atlas);
hud.select(0);
const held = new HeldItem(itemModels);
setupInstall((t) => hud.toast(t));
// Buscar versión nueva ahora mismo, desde Opciones (v3.9).
const updateButton = document.querySelector<HTMLButtonElement>('#check-update')!;
const updateHint = document.querySelector<HTMLParagraphElement>('#check-update-hint')!;
updateButton.addEventListener('click', async () => {
  updateButton.disabled = true;
  updateHint.textContent = 'Buscando…';
  // Se guarda antes, por si hay versión nueva y el juego se recarga.
  persist();
  const result = await checkForUpdates();
  if (result === 'nueva') {
    updateHint.textContent = '¡Hay versión nueva! Recargando…';
    return;
  }
  updateButton.disabled = false;
  updateHint.textContent = result === 'al-dia' ? `Ya tienes la última versión (v${__APP_VERSION__}).` : 'No se ha podido mirar: comprueba que tienes internet.';
});

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
let panel: 'inventory' | 'dialog' | 'shop' | 'collection' | 'workbench' | 'missions' | 'storage' | 'sign' | 'chat' | 'gestures' | 'faint' | null = null;
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

const tutorial = new Tutorial(pockets?.tutorial, pockets ? (pockets.tutorialDone ?? pockets.tutorial === undefined) : false, touchMode, () => {
  setWallet(wallet + TUTORIAL_REWARD);
  hud.toast(`¡Primeros pasos completados! Avellana te regala ${formatBerries(TUTORIAL_REWARD)} bayas`);
  persist();
});
tutorial.keyName = (a) => keyLabel(settings.keys[a as Action] ?? a);
tutorial.refresh();
keysChanged = () => tutorial.refresh();
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

const workbench = new Workbench({ inventory, atlas, toast: (t) => hud.toast(t) }, pockets?.recipes);

// Cofres, baúles y cajas: lo guardado vive en la partida (en un viaje no se ve lo de casa).
const storage = new Storage(trip ? {} : save?.storage);
const storagePanel = new StoragePanel(inventory, atlas, (t) => hud.toast(t));

function openStorage(x: number, y: number, z: number, b: number) {
  const c = CONTAINERS[b as Block]!;
  panel = 'storage';
  breaker.active = false;
  storagePanel.open(c.name, storage.open(x, y, z, c.size));
  sound.place();
  unlockInput();
}

// --- Carteles: se escribe lo que pone ---
const signEl = document.querySelector<HTMLDivElement>('#sign')!;
const signInput = document.querySelector<HTMLInputElement>('#sign-text')!;
let signTarget: PlacedFurniture | null = null;

function openSign(f: PlacedFurniture) {
  signTarget = f;
  panel = 'sign';
  breaker.active = false;
  signInput.value = f.text ?? '';
  signEl.hidden = false;
  unlockInput();
  signInput.focus();
}

function closeSign(save: boolean) {
  if (save && signTarget) sync.placeFurniture(signTarget.id, signTarget.x, signTarget.y, signTarget.z, signTarget.rot, signInput.value);
  signTarget = null;
  signEl.hidden = true;
  panel = null;
  lockInput();
  if (save) persist();
}
document.querySelector('#sign-save')!.addEventListener('click', () => closeSign(true));
document.querySelector('#sign-cancel')!.addEventListener('click', () => closeSign(false));
signInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') closeSign(true);
  if (e.key === 'Escape') closeSign(false);
});

function closeStorage() {
  storagePanel.close();
  panel = null;
  lockInput();
  persist();
}
document.querySelector('#storage-close')!.addEventListener('click', closeStorage);

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
const VOICES: Record<string, number> = {
  gato: 760, oso: 260, conejo: 900, rana: 380, perro: 560, pato: 820, ardilla: 1050, tortuga: 220,
  oveja: 680, cerdo: 420, 'pingüino': 940, koala: 330, zorro: 720, elefante: 180,
};

/** Despega la avioneta, funde la pantalla y recarga en la otra isla. */
function takeOff(text: string, next: () => void) {
  persist();
  saving = false;
  // Con amigos en la isla, se vienen todos: la isla se vuelve a abrir con el mismo código al llegar.
  if (net?.role === 'anfitrion' && netCode) {
    net.travel(`${net.self.name} os lleva en avioneta…`);
    try {
      sessionStorage.setItem(REOPEN_KEY, netCode);
    } catch {
      // sin almacenamiento, cada uno vuelve a su isla
    }
  }
  plane.fly();
  sound.fanfare();
  document.querySelector('#travel-text')!.textContent = text;
  document.querySelector<HTMLDivElement>('#travel-fade')!.hidden = false;
  window.setTimeout(() => {
    next();
    location.reload();
  }, 2700);
}

const dialog = new Dialog({
  travel: {
    away: !!trip,
    tickets: () => inventory.countOf('billete'),
    fly: () => {
      if (joined) {
        hud.toast('Solo quien te ha invitado puede llevaros de viaje');
        return;
      }
      if (!inventory.remove('billete', 1)) return;
      record('viajar');
      const residents = [...villagers.filter((v) => !v.profile.role).map((v) => v.name), ...guests.map((g) => g.name)];
      // Se mira antes de salir cuántas casas libres hay, para no invitar a quien no tendría dónde vivir.
      checkLots();
      const trip = planTrip(activeSlot(), world.fruit, null, freeLots().length);
      trip.visitor = pickVisitor(residents, Math.random, trip.kind);
      saveTrip(trip);
      takeOff('Volando a una isla misteriosa…', () => {});
    },
    goHome: () => takeOff('Volviendo a casa…', () => saveTrip(null)),
  },
  invite: (v) => {
    if (joined) return 'visita';
    if (guests.some((g) => g.name === v.name)) return 'already';
    // Solo se puede invitar si en casa hay una casa construida y libre esperándole.
    const lot = freeLots()[0];
    if (!lot) return 'full';
    guests.push({ name: v.name, x: lot.x, z: lot.z, lot: true });
    hud.toast(`¡${v.name} se mudará a la casa que construiste!`);
    persist();
    return 'ok';
  },
  voice: (v) => sound.voice(VOICES[v.profile.species] ?? 500),
  learnRecipe: () => workbench.learnRandom(),
  get holiday() {
    return holiday;
  },
  isBirthday: (v) => v.isBirthday(gameDate()),
  known: (v) => (collection.met.has(v.name) ? collection.learned[v.name] ?? KNOW.met : 0),
  learn: (v, step) => {
    collection.learned[v.name] = Math.max(collection.learned[v.name] ?? 0, step);
  },
  met: (v) => {
    if (collection.met.has(v.name)) return;
    collection.met.add(v.name);
    hud.toast(`${v.name} se ha añadido a tu álbum de vecinos (C)`);
  },
  inventory,
  selectedSlot: () => hud.selected,
  get today() {
    return today;
  },
  get hour() {
    return currentHour;
  },
  fruitName: BLOCKS[world.fruit].name.toLowerCase(),
  toast: (t) => hud.toast(t),
  onClose: () => {
    if (panel === 'faint') return;
    panel = null;
    lockInput();
  },
  openShop: () => {
    panel = 'shop';
    shop.open();
  },
  donatable: () => collection.donatable(inventory),
  donate: (id) => {
    const ok = collection.donate(inventory, id);
    if (ok) record('donar');
    return ok;
  },
  gifted: () => record('regalar'),
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
      world.buildPlayerHouse(home.level, ROOFS[roof], (x, y, z, b) => sync.setBlock(x, y, z, b));
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

/** Valoración de la isla de casa (de viaje se mira lo guardado). */
function islandRating() {
  const saved = trip ? save : null;
  return rateIsland({
    ...countPlaced(saved ? saved.edits : world.exportEdits()),
    furniture: saved ? saved.furniture?.length ?? 0 : furniture.serialize().length,
    house: saved ? saved.home?.level ?? 0 : home.level,
    guests: guests.length,
    donated: collection.donated.size,
    farm: saved ? Object.keys(saved.farm ?? {}).length + (saved.animals?.length ?? 0) : farm.crops.size + animals.list.length,
  });
}

const missionsPanel = new MissionsPanel({
  missions,
  inventory,
  atlas,
  rating: islandRating,
  toast: (t) => hud.toast(t),
  redeemed: () => {
    sound.coin();
    persist();
  },
});

function openMissions() {
  panel = 'missions';
  breaker.active = false;
  missionsPanel.open();
  unlockInput();
}

function closeMissions() {
  missionsPanel.close();
  panel = null;
  lockInput();
}
document.querySelector('#missions-close')!.addEventListener('click', closeMissions);

// Fabricar (en los bolsillos o en la mesa de trabajo) cuenta para las tareas.
const craft = inventory.craft.bind(inventory);
inventory.craft = (r) => {
  const ok = craft(r);
  if (ok) record('fabricar');
  return ok;
};

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
  get today() {
    return today;
  },
  islandFruit: fruitItemFor(world.fruit) ?? '',
  get holiday() {
    return holiday?.id ?? null;
  },
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
      missions: () => openMissions(),
      rotate: () => {
        const f = furnitureInSight();
        if (f) rotateFurniture(f.furniture);
      },
      pause: () => unlockInput(),
    })
  : null;
if (touch) document.body.appendChild(touch.el);

function talkTo(v: Villager) {
  if (!v.profile.role && v.memory.talkedDay !== dayKey(gameDate())) record('charlar');
  tutorial.complete('hablar');
  panel = 'dialog';
  breaker.active = false;
  dialog.start(v);
  unlockInput();
}

window.addEventListener('keydown', (e) => {
  // Escribiendo en un buscador, las letras no son atajos del juego.
  if (e.target instanceof HTMLInputElement && e.target.type !== 'checkbox' && e.code !== 'Escape') return;
  const keys = settings.keys;
  if (!menu.hidden) {
    if (e.code === 'Escape' && menu.view !== 'main') menu.back();
    if (e.code === keys.sound) toggleSound();
    return;
  }
  if (panel === 'dialog') {
    if (e.code === 'Escape') dialog.finish();
    return;
  }
  if (panel === 'shop') {
    if (e.code === 'Escape' || e.code === keys.inventory) closeShop();
    return;
  }
  if (panel === 'collection') {
    if (e.code === 'Escape' || e.code === keys.collection) closeCollection();
    return;
  }
  if (panel === 'missions') {
    if (e.code === 'Escape' || e.code === keys.missions) closeMissions();
    return;
  }
  if (e.code === keys.missions && isPlaying()) {
    openMissions();
    return;
  }
  if (panel === 'workbench') {
    if (e.code === 'Escape' || e.code === keys.inventory) closeWorkbench();
    return;
  }
  if (panel === 'storage') {
    if (e.code === 'Escape' || e.code === keys.inventory) closeStorage();
    return;
  }
  if (panel === 'sign') {
    if (e.code === 'Escape') closeSign(false);
    return;
  }
  if (panel === 'chat' || panel === 'faint') return;
  if (panel === 'gestures') {
    if (e.code === 'Escape' || e.code === keys.gesture) friends.closeGestures();
    else friends.gestureKey(e.code);
    return;
  }
  if (e.code === keys.chat && isPlaying()) {
    e.preventDefault();
    panel = 'chat';
    breaker.active = false;
    unlockInput();
    friends.openChat();
    return;
  }
  if (e.code === keys.gesture && isPlaying()) {
    panel = 'gestures';
    breaker.active = false;
    unlockInput();
    friends.openGestures();
    return;
  }
  if (e.code === keys.collection && isPlaying()) {
    openCollection();
    return;
  }
  if (e.code === keys.inventory) {
    if (panel === 'inventory') closeInventory();
    else if (isPlaying()) openInventory();
    return;
  }
  if (e.code === 'Escape' && panel === 'inventory') {
    closeInventory();
    return;
  }
  if (e.code === keys.offhand && isPlaying()) {
    hud.swapHands();
    return;
  }
  if (e.code === keys.rotate && isPlaying()) {
    const f = furnitureInSight();
    if (f) rotateFurniture(f.furniture);
    return;
  }
  if (e.code === keys.sound) {
    toggleSound();
    return;
  }
  if (e.code === keys.help) {
    tutorial.toggle();
    return;
  }
  if (/^Digit[0-9]$/.test(e.code)) {
    const n = Number(e.code.slice(5));
    hud.select(n === 0 ? 9 : n - 1);
  }
  if (e.code === 'F3' || e.code === keys.debug) {
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
  stopSaving: () => {
    saving = false;
    saveTrip(null);
  },
  switchTo: (slot) => {
    persist();
    saveTrip(null);
    saving = false;
    setActiveSlot(slot);
    location.reload();
  },
  toast: (t) => hud.toast(t),
});
menu.onView = (v) => {
  islands.reset();
  if (v === 'islands') islands.render();
  if (v === 'friends') friends.render();
};

playButton.addEventListener('click', () => lockInput());
/** Cierra la ventana que haya abierta encima del juego (al volver a jugar, o al desmayarse). */
function closeAnyPanel() {
  if (panel === 'inventory') hud.inventoryEl.hidden = true;
  if (panel === 'dialog') dialog.finish();
  if (panel === 'shop') shop.close();
  if (panel === 'collection') collection.close();
  if (panel === 'workbench') workbench.close();
  if (panel === 'missions') missionsPanel.close();
  if (panel === 'storage') storagePanel.close();
  if (panel === 'sign') signEl.hidden = true;
  if (panel === 'chat') friends.closeChat();
  if (panel === 'gestures') friends.closeGestures();
  if (panel === 'faint') wakeUpAtHome();
  panel = null;
}
let arrived = false;
function onInputChange() {
  const locked = isPlaying();
  touch?.show(locked);
  if (locked) {
    menu.close();
    if (trip && !arrived) {
      arrived = true;
      hud.toast(`¡Bienvenida, bienvenido a la ${MYSTERY_NAMES[trip.kind]}! Habla con Plumas para volver a casa`);
    }
    closeAnyPanel();
    return;
  }
  breaker.active = false;
  player.releaseKeys();
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
    record('romper');
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
  // Al cortar un tronco cae todo lo que hay encima: el resto del tronco, la copa y la fruta.
  if (b === Block.Log || b === Block.PalmLog) {
    fell(x, y, z);
    return;
  }
  if (isSapling(b)) {
    const t = orchard.remove(x, y, z);
    sync.setBlock(x, y, z, Block.Air);
    sound.rustle();
    drops.spawn(t?.sapling ?? (b === Block.PalmSapling ? 'brote_palmera' : b === Block.PineSapling ? 'brote_pino' : treeKindOfFruit(world.fruit)?.sapling ?? 'brote_manzano'), x + 0.5, y + 0.5, z + 0.5, { burst });
    return;
  }
  // Al romper un cofre sale todo lo que tenía dentro.
  if (isContainer(b)) for (const s of storage.empty(x, y, z)) for (let i = 0; i < s.count; i++) drops.spawn(s.id, x + 0.5, y + 0.5, z + 0.5, { burst: true });
  // Las dos mitades de la puerta van juntas.
  if (isDoor(b)) {
    const other = isDoorTop(b) ? y - 1 : y + 1;
    if (isDoor(world.getBlock(x, other, z))) sync.setBlock(x, other, z, Block.Air);
  }
  // Quitar la tierra de cultivo arranca lo que hubiera plantado encima.
  if (isFarmland(b) && farm.has(x, y + 1, z)) harvestCrop(x, y + 1, z, true);
  if (cropOfBlock(b)) {
    sync.setBlock(x, y, z, Block.Air);
    harvestCrop(x, y, z, burst);
    return;
  }
  sync.setBlock(x, y, z, Block.Air);
  if (!burst) sound.dig(materialOf(BLOCKS[b].name));
  // Un mueble sin suelo debajo se cae y se puede recoger.
  const above = furniture.at(x, y + 1, z);
  if (above) {
    sync.removeFurniture(above.x, above.y, above.z);
    drops.spawn(above.id, x + 0.5, y + 1.3, z + 0.5, { burst: true });
  }
  if (isFruit(b)) harvested[posKey(x, y, z)] = clock.dayNumber();
  const id = dropFor(b);
  if (id) drops.spawn(id, x + 0.5, y + 0.5, z + 0.5, { burst });
  else if (isLeaves(b) && Math.random() < LEAF_BRANCH_CHANCE) drops.spawn('rama', x + 0.5, y + 0.5, z + 0.5, { burst });
}

function isLeaves(b: number): boolean {
  return b === Block.Leaves || b === Block.PalmLeaves || b === Block.PineLeaves;
}

/** Tala el árbol desde el tronco (x, y, z): todo lo de encima cae y suelta madera, fruta y un brote. */
function fell(x: number, y: number, z: number) {
  const felled = fellTree(world, x, y, z);
  const planted = orchard.at(x, y, z);
  // El brote es del mismo árbol: de su fruta, o del tipo plantado, o de la fruta de la isla.
  const fruitKind = felled.fruits.length ? treeKindOfFruit(felled.fruits[0][3]) : undefined;
  const palm = felled.logs.some(([, , , lb]) => lb === Block.PalmLog);
  const pine = felled.leaves.some(([, , , lb]) => lb === Block.PineLeaves);
  const kind = fruitKind ?? (planted && treeKindOfSapling(planted.sapling)) ?? (pine ? treeKindOfSapling('brote_pino') : treeKindOfFruit(palm ? Block.Coconut : world.fruit));
  const all = [...felled.fruits, ...felled.leaves, ...felled.logs.reverse()];
  for (const [bx, by, bz] of all) sync.setBlock(bx, by, bz, Block.Air);
  for (const [bx, by, bz, lb] of felled.logs) drops.spawn(dropFor(lb)!, bx + 0.5, by + 0.5, bz + 0.5, { burst: true });
  for (const [bx, by, bz, fb] of felled.fruits) {
    const id = dropFor(fb);
    if (id) drops.spawn(id, bx + 0.5, by + 0.5, bz + 0.5, { burst: true });
  }
  // Un árbol entero (con copa) da brotes para replantarlo, y de la copa caen unas ramas (v4.0).
  if (felled.leaves.length && kind) {
    const n = 1 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) drops.spawn(kind.sapling, x + 0.5, y + 0.5, z + 0.5, { burst: true });
  }
  if (felled.leaves.length) {
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) drops.spawn('rama', x + 0.5, y + 1.5, z + 0.5, { burst: true });
  }
  // La fruta que se cogió de este árbol ya no vuelve a salir: no hay árbol.
  for (const k of Object.keys(harvested)) {
    const [hx, hy, hz] = k.split(',').map(Number);
    if (Math.abs(hx - x) <= 3 && Math.abs(hz - z) <= 3 && hy >= y - 1 && hy <= y + 8) delete harvested[k];
  }
  if (felled.logs.some(([lx, ly, lz]) => orchard.at(lx, ly, lz))) for (const [lx, ly, lz] of felled.logs) orchard.remove(lx, ly, lz);
  sound.dig('madera');
  if (felled.logs.length > 1) sound.rustle();
}

/** Recoge una planta del huerto: la cosecha si está madura o la semilla si no. */
function harvestCrop(x: number, y: number, z: number, burst: boolean) {
  const h = farm.harvest(x, y, z, dayKey(gameDate()));
  if (world.getBlock(x, y, z) !== Block.Air) sync.setBlock(x, y, z, Block.Air);
  if (!h) return;
  sound.rustle();
  for (let i = 0; i < h.count; i++) drops.spawn(h.produce!, x + 0.5, y + 0.5, z + 0.5, { burst: true });
  // Al cosechar a veces sale una semilla de más.
  const seeds = h.seeds + (h.produce && Math.random() < 0.3 ? 1 : 0);
  for (let i = 0; i < seeds; i++) drops.spawn(h.seed, x + 0.5, y + 0.5, z + 0.5, { burst: burst || !!h.produce });
  if (h.produce) {
    hud.toast(`¡Has cosechado ${h.count} ${itemDef(h.produce).name.toLowerCase()}!`);
    record('cosechar');
  }
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
    farm.sync(sync, day);
    record('regar');
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
    if (above === Block.TallGrass) sync.setBlock(x, y + 1, z, Block.Air);
    sync.setBlock(x, y, z, Block.Farmland);
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
    sync.setBlock(x, y + 1, z, seed.stages[0]);
    farm.sync(sync, day);
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
  if (isSolid(world.getBlock(x, y, z)) || !isSolid(world.getBlock(x, y - 1, z)) || isWater(world.getBlock(x, y, z)) || isWater(world.getBlock(x, y - 1, z))) {
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
const planeBox = new THREE.Box3();
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
  // A otro jugador se le da lo que tienes en la mano.
  const friend = remotes.pick(aimRay(), Math.min(blockDist, REACH));
  if (friend && giveTo(friend)) return;
  // La avioneta: se habla con el piloto.
  if (pilot && aimRay().intersectBox(plane.bounds(planeBox), rayHit) && rayHit.distanceTo(camera.position) < Math.min(blockDist, REACH + 3)) {
    talkTo(pilot);
    return;
  }
  const animal = animals.pick(aimRay(), Math.min(blockDist, REACH));
  if (animal) {
    const product = animals.collect(animal, dayKey(gameDate()));
    if (!product) hud.toast(animal.data.kind === 'gallina' ? 'Ya ha puesto su huevo hoy. ¡Vuelve mañana!' : 'Ya te ha dado su leche hoy. ¡Vuelve mañana!');
    else {
      drops.spawn(product, animal.position.x, animal.position.y + 0.6, animal.position.z, { burst: true });
      record('granja');
      sound.coin();
    }
    return;
  }
  // Los carteles se escriben con clic derecho.
  const aimed = furnitureInSight();
  if (aimed?.furniture.id === 'cartel') {
    openSign(aimed.furniture);
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
  if (def?.tool === 'bucket') {
    useBucket(def.id === 'cubo_agua');
    return;
  }

  // Comer (v4.1): con hambre, lo que llevas en la mano se come (salvo si apuntas a una puerta, un cofre…).
  if (def && isFood(def.id) && vitals.hunger < MAX_HUNGER && !(hit && isInteractive(world.getBlock(...hit.block)))) {
    eat(def.id);
    return;
  }

  if (!hit) return;
  const [bx, by, bz] = hit.block;
  const target = world.getBlock(bx, by, bz);

  if (target === Block.Workbench) {
    openWorkbench();
    return;
  }
  if (isContainer(target)) {
    // Lo que hay en los cofres está en el ordenador del anfitrión.
    if (joined) hud.toast('Los cofres son de quien vive en esta isla');
    else openStorage(bx, by, bz, target);
    return;
  }

  // Abrir y cerrar puertas (las dos mitades a la vez).
  const swapped = toggled(target);
  if (swapped !== undefined) {
    sync.setBlock(bx, by, bz, swapped);
    if (isDoor(target)) {
      const other = isDoorTop(target) ? by - 1 : by + 1;
      const ob = world.getBlock(bx, other, bz);
      if (isDoor(ob)) sync.setBlock(bx, other, bz, toggled(ob)!);
    }
    sound.place();
    return;
  }

  if (def?.id === 'plano_casa') {
    useBlueprint(bx, by, bz);
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

  // Los caminos sustituyen al suelo en vez de ponerse encima, para que queden a ras.
  if (def?.block !== undefined && isPath(def.block) && isGround(target) && hit.place[1] > hit.block[1]) {
    const above = world.getBlock(bx, by + 1, bz);
    if (isCross(above) && !isFruit(above)) sync.setBlock(bx, by + 1, bz, Block.Air);
    sync.setBlock(bx, by, bz, def.block);
    inventory.consume(hud.selected);
    sound.place();
    return;
  }

  if (def?.block !== undefined) {
    // Colocar sobre hierba alta o una flor la sustituye, como en Minecraft.
    const replace = isCross(target) && !isFruit(target);
    const [x, y, z] = replace ? hit.block : hit.place;
    if (!isCross(def.block) && player.intersectsBlock(x, y, z)) return;
    if (furniture.at(x, y, z)) return;
    // La puerta de casa ocupa dos bloques: hace falta hueco encima.
    if (def.block === Block.Door) {
      const above = world.getBlock(x, y + 1, z);
      if ((above !== Block.Air && !isCross(above)) || player.intersectsBlock(x, y + 1, z) || furniture.at(x, y + 1, z)) {
        hud.toast('La puerta necesita dos bloques de alto');
        return;
      }
      sync.setBlock(x, y + 1, z, Block.DoorTop);
    }
    // Los brotes se plantan en tierra, hierba o arena, y se apuntan para que crezcan.
    if (isSapling(def.block)) {
      if (!canPlantOn(world.getBlock(x, y - 1, z))) {
        hud.toast('Los brotes se plantan en tierra, hierba o arena');
        return;
      }
      orchard.plant(x, y, z, def.id, dayKey(gameDate()));
      sound.rustle();
    }
    // Las escaleras suben hacia donde mira quien las pone.
    const fx = -Math.sin(player.yaw);
    const fz = -Math.cos(player.yaw);
    const facing = Math.abs(fz) > Math.abs(fx) ? (fz < 0 ? 0 : 2) : fx > 0 ? 1 : 3;
    sync.setBlock(x, y, z, isStairs(def.block) ? stairsFacing(def.block, facing) : def.block);
    delete harvested[posKey(x, y, z)];
    inventory.consume(hud.selected);
    sound.place();
    return;
  }

  if (isFruit(target)) {
    removeBlock(bx, by, bz, target, true);
    return;
  }
  if (target === Block.Log || target === Block.PalmLog || target === Block.Leaves || target === Block.PalmLeaves || target === Block.PineLeaves) {
    shakeTree(bx, by, bz);
  }
}

/** Bloques que hacen algo al usarlos (abrir, mirar dentro…): con comida en la mano se usan en vez de comer. */
function isInteractive(b: number): boolean {
  return b === Block.Workbench || isContainer(b) || toggled(b) !== undefined;
}

// --- Vida, hambre y desmayos (v4.1) ---

const vitalsHud = new VitalsHud(document.querySelector<HTMLDivElement>('#hotbar')!);
const faintEl = document.querySelector<HTMLDivElement>('#faint')!;
const HURT_TEXT: Record<HurtCause, string> = {
  caida: 'Te has caído desde muy alto',
  agua: 'Te has quedado sin aire bajo el agua',
  magma: 'Te has quemado con la roca de magma',
  hambre: 'Tenías mucha hambre',
};
vitals.onHurt = () => {
  vitalsHud.hurt();
  sound.hurt();
};
vitals.onFaint = (cause) => faint(cause);

function eat(id: string) {
  if (!vitals.eat(id)) return;
  inventory.consume(hud.selected);
  sound.eat();
  const full = vitals.hunger >= MAX_HUNGER;
  hud.toast(`¡Ñam! Te has comido: ${itemDef(id).name.toLowerCase()}${full ? '. Ya estás llena, lleno' : ''}`);
}

/** Cada fotograma: el hambre baja, la vida sube con la tripa llena, y caer, ahogarse o quemarse hace daño. */
function updateVitals(dt: number) {
  vitalsHud.update(vitals);
  const fall = player.takeFall();
  const jumps = player.jumps;
  player.jumps = 0;
  if (!menu.hidden || !spawned || vitals.fainted) return;
  for (let i = 0; i < jumps; i++) vitals.exert('jump');
  if (fall > 0) vitals.fall(fall);
  const p = player.position;
  const under = world.getBlock(Math.floor(p.x), Math.floor(p.y - 0.05), Math.floor(p.z));
  vitals.update(dt, {
    moving: Math.hypot(player.velocity.x, player.velocity.z) > 0.5,
    sprinting: player.sprinting,
    underwater: world.inWater(camera.position.x, camera.position.y, camera.position.z),
    burning: player.onGround && under === Block.Magma,
  });
}

/** Te desmayas: pierdes unas pocas cosas y algo de dinero, y despiertas en casa. */
function faint(cause: HurtCause) {
  breaker.active = false;
  fishing.stop();
  if (panel === 'dialog') dialog.finish(true);
  // Se cierra lo que hubiera abierto, sin volver a jugar: primero se marca el desmayo.
  const was = panel;
  panel = 'faint';
  if (was === 'chat') friends.closeChat();
  else if (was === 'gestures') friends.closeGestures();
  else if (was && was !== 'faint') {
    panel = was;
    closeAnyPanel();
    panel = 'faint';
  }
  const loss = faintLoss(wallet, inventory.slots, (id) => !!itemDef(id).tool);
  for (const l of loss.items) {
    const s = inventory.slots[l.slot];
    if (!s) continue;
    s.count -= l.count;
    if (s.count <= 0) inventory.slots[l.slot] = null;
  }
  inventory.changed();
  if (loss.berries) setWallet(wallet - loss.berries);
  const list = faintEl.querySelector('ul')!;
  list.innerHTML = '';
  const line = (text: string) => list.appendChild(Object.assign(document.createElement('li'), { textContent: text }));
  if (loss.berries) line(`${formatBerries(loss.berries)} bayas`);
  for (const l of loss.items) line(`${l.count} × ${itemDef(l.id).name.toLowerCase()}`);
  if (!loss.berries && !loss.items.length) line('¡Nada! Tenías los bolsillos vacíos');
  faintEl.querySelector('#faint-cause')!.textContent = `${HURT_TEXT[cause]}.`;
  faintEl.querySelector<HTMLButtonElement>('#faint-wake')!.textContent = trip ? 'Despertar' : 'Despertar en casa';
  faintEl.hidden = false;
  unlockInput();
  faintEl.querySelector<HTMLButtonElement>('#faint-wake')!.focus();
  persist();
}

/** Sitio donde se despierta tras desmayarse: delante de tu casa (de viaje, donde aterrizaste). */
function homeSpot(): [number, number] {
  if (trip || joined) return [spawnPoint.x, spawnPoint.z];
  const plot = world.playerPlot;
  return plot ? [plot.x, plot.z + home.level + 3] : [spawnPoint.x, spawnPoint.z];
}

function wakeUpAtHome() {
  if (faintEl.hidden) return;
  faintEl.hidden = true;
  vitals.revive();
  player.spawnAt(...homeSpot());
  player.velocity.set(0, 0, 0);
  hud.toast(trip ? 'Te has despertado. ¡Ten más cuidado!' : 'Te has despertado en casa. ¡Ten más cuidado!');
}

document.querySelector('#faint-wake')!.addEventListener('click', () => {
  if (panel !== 'faint') return;
  panel = null;
  wakeUpAtHome();
  lockInput();
});

/** Mueble al que apunta la mira, si está más cerca que el bloque apuntado. */
function furnitureInSight() {
  const hit = currentHit();
  const blockDist = hit ? camera.position.distanceTo(new THREE.Vector3(hit.block[0] + 0.5, hit.block[1] + 0.5, hit.block[2] + 0.5)) : Infinity;
  return furniture.pick(aimRay(), Math.min(blockDist, REACH));
}

/** Gira un mueble un cuarto de vuelta (para todos los jugadores). */
function rotateFurniture(f: PlacedFurniture) {
  sync.placeFurniture(f.id, f.x, f.y, f.z, (f.rot + 1) % 4, f.text);
}

function pickUpFurniture(): boolean {
  const f = furnitureInSight();
  if (!f) return false;
  if (!take(f.furniture.id)) return true;
  sync.removeFurniture(f.furniture.x, f.furniture.y, f.furniture.z);
  return true;
}

// --- Casas para vecinos nuevos (v2.10) ---

const lotGhosts = new LotGhosts();
scene.add(lotGhosts.group);
const lotStatus = document.querySelector<HTMLDivElement>('#lot-status')!;
/** Lo que faltaba la última vez, para no rehacer los fantasmas si nada ha cambiado. */
let lotKey = '';

/** Marca un solar con el plano de casa, o lo quita si se usa sobre uno sin terminar. */
function useBlueprint(x: number, y: number, z: number) {
  if (trip || joined) {
    hud.toast('Los planos de casa se usan en tu isla');
    return;
  }
  const old = lots.find((l) => !l.done && inLot(l, x, z));
  if (old) {
    lots.splice(lots.indexOf(old), 1);
    hud.toast('Has quitado el plano. Te lo devuelvo');
    checkLots();
    persist();
    return;
  }
  const lot = lotFrom(x, y, z, player.position.x, player.position.z);
  const problem = lotProblem(lot, (bx, by, bz) => world.getBlock(bx, by, bz), { plots: world.plots, lots });
  if (problem) {
    hud.toast(problem);
    return;
  }
  inventory.remove('plano_casa', 1);
  lots.push(lot);
  sound.place();
  hud.toast('¡Solar marcado! Pon bloques donde ves los fantasmas');
  checkLots();
  persist();
}

/** Mira cómo van las casas a medio construir: fantasmas de lo que falta y aviso al terminar. */
function checkLots() {
  if (trip || joined) return;
  const ghosts: ReturnType<typeof lotProgress>['missing'] = [];
  let near: { left: number; text: string } | null = null;
  const free = freeLots();
  for (const lot of lots) {
    // Una casa con vecino ya es suya; una libre se vuelve a mirar por si se ha roto algo.
    if (lot.done && !free.includes(lot)) continue;
    const { missing } = lotProgress(lot, (x, y, z) => world.getBlock(x, y, z));
    if (lot.done) {
      if (missing.length) lot.done = false;
      else continue;
    }
    if (!missing.length) {
      lot.done = true;
      sound.coin();
      record('construir_casa');
      hud.toast('¡Casa terminada! Ve a una isla misteriosa a buscar a quien viva en ella');
      persist();
      continue;
    }
    ghosts.push(...missing);
    if (inLot(lot, player.position.x, player.position.z, 10)) near = { left: missing.length, text: describeMissing(missing) };
  }
  const key = ghosts.map((c) => `${c.x},${c.y},${c.z}`).join(';');
  if (key !== lotKey) {
    lotKey = key;
    lotGhosts.show(ghosts);
  }
  lotStatus.hidden = !near;
  if (near) lotStatus.textContent = `Plano de casa · faltan ${near.left}: ${near.text}`;
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
  if (here !== Block.Air) sync.setBlock(x, y, z, Block.Air);
  // El mueble mira hacia quien lo coloca.
  const rot = ((Math.round(player.yaw / (Math.PI / 2)) % 4) + 4) % 4;
  sync.placeFurniture(id, x, y, z, rot);
  inventory.consume(hud.selected);
  sound.place();
  tutorial.complete('mueble');
  record('mueble');
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
  record(tool === 'cana' ? 'pescar' : 'insecto');
  sound.fanfare();
  tutorial.complete('criatura');
  hud.toast(`¡${verb} ${c.name.toLowerCase()}!${first ? ' Nuevo en la enciclopedia.' : ''}`);
  if (inventory.wearTool(hud.selected)) hud.toast(`¡Tu ${itemDef(tool).name.toLowerCase()} se ha roto!`);
}

/**
 * Cubo (v3.8), como en Minecraft: el vacío coge un bloque de agua quieta (el agua que corre no se puede coger)
 * y el lleno la echa delante del bloque al que apuntas, donde se pone a correr.
 */
function useBucket(full: boolean) {
  camera.getWorldDirection(dir);
  const swap = (id: string) => {
    inventory.slots[hud.selected] = { id, count: 1 };
    hud.render();
    sound.splash();
  };
  if (!full) {
    const hit = raycast(world, camera.position, dir, REACH, (b) => isTargetable(b) || isWater(b));
    if (!hit || !isWater(world.getBlock(...hit.block))) return;
    if (!isWaterSource(world.getBlock(...hit.block))) {
      hud.toast('Esa agua corre: busca agua quieta para llenar el cubo');
      return;
    }
    sync.setBlock(...hit.block, Block.Air);
    swap('cubo_agua');
    return;
  }
  const hit = raycast(world, camera.position, dir, REACH);
  if (!hit) return;
  const [x, y, z] = hit.place;
  const here = world.getBlock(x, y, z);
  if ((here !== Block.Air && !isWater(here)) || furniture.at(x, y, z)) return;
  sync.setBlock(x, y, z, Block.Water);
  swap('cubo');
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
  record('sacudir');
  const fruits = world.treeFruitsNear(x, y, z);
  for (const [fx, fy, fz] of fruits) removeBlock(fx, fy, fz, world.getBlock(fx, fy, fz), true);

  const trunk = findTrunk(world, x, y, z);
  let branch = false;
  if (trunk && !branchTrees.has(trunk.key)) {
    branchTrees.add(trunk.key);
    // Una o dos ramas por árbol y día (v4.0: antes solo una).
    const n = Math.random() < 0.5 ? 2 : 1;
    for (let i = 0; i < n; i++) drops.spawn('rama', trunk.x + 0.5, trunk.y + 0.5, trunk.z + 0.5, { burst: true });
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

// Los demás jugadores de la partida.
const remotes = new RemotePlayers(nameTags);
scene.add(remotes.group);
Object.assign(netEvents, {
  join: (p) => {
    remotes.add(p);
    hud.toast(`${p.name} ha llegado a la isla`);
    sound.coin();
    friendsChanged();
  },
  leave: (p) => {
    remotes.remove(p.id);
    hud.toast(`${p.name} se ha ido`);
    friendsChanged();
  },
  pose: (id, pose) => remotes.setPose(id, pose),
  chat: (p, text) => {
    friends.addLine(p.name, text, p.color);
    sound.voice(620);
  },
  gesture: (p, g) => {
    remotes.gesture(p.id, GESTURE_LOOK[g].emoji);
    if (g === 'saludo') hud.toast(`${p.name} te saluda`);
  },
  gift: (p, item) => receiveGift(p.name, item.id, item.count),
  closed: (deliberate) => {
    persist();
    saving = false;
    if (deliberate || !netCode) {
      hud.toast('Tu amigo ha cerrado su isla. Vuelves a la tuya…');
      window.setTimeout(() => location.reload(), 3000);
      return;
    }
    // Se ha cortado la conexión: se intenta volver a entrar con el mismo código.
    hud.toast('Se ha cortado la conexión. Volviendo a entrar…');
    window.setTimeout(() => rejoin(netCode!), 2000);
  },
  travel: (text) => {
    persist();
    saving = false;
    plane.fly();
    sound.fanfare();
    document.querySelector('#travel-text')!.textContent = text;
    document.querySelector<HTMLDivElement>('#travel-fade')!.hidden = false;
    // El anfitrión tarda unos segundos en llegar y volver a abrir la isla.
    window.setTimeout(() => rejoin(netCode!), 5000);
  },
} satisfies SessionEvents);

/** Vuelve a cargar el juego entrando en la isla del código (tras un corte o un viaje en grupo). */
function rejoin(code: string) {
  const url = new URL(location.href);
  url.searchParams.set('isla', code);
  location.href = url.toString();
}

/** Lo que el anfitrión manda a quien entra: su isla tal como está ahora. */
function islandSnapshot(): Snapshot {
  return {
    seed: world.seed,
    edits: world.exportEdits(),
    options: trip ? { mystery: { kind: trip.kind, fruit: trip.fruit } } : { terrain, guests: guests.flatMap((g) => (g.x !== undefined && g.z !== undefined && !g.lot ? [[g.x, g.z] as [number, number]] : [])) },
    clock: clock.serialize(),
    furniture: furniture.serialize(),
    guests: trip ? [] : guests,
    lots: trip ? [] : lots,
    visitor: trip?.visitor ?? null,
    spawn: [Math.floor(player.position.x), Math.floor(player.position.z)],
  };
}

let net: NetSession | null = null;
/** Código de la isla que hay que volver a abrir al llegar de un viaje en grupo. */
const REOPEN_KEY = 'maxycraft.amigos';
/** Cuenta a los demás dónde estás. También va con un temporizador: con la pestaña escondida no se pinta, pero la partida sigue viva. */
function updateNet(now: number) {
  net?.update(now, { x: player.position.x, y: player.position.y, z: player.position.z, yaw: player.yaw, pitch: player.pitch });
}
window.setInterval(() => updateNet(performance.now()), 1000);
/** Código de la isla abierta a amigos. */
let netCode: string | null = null;
let netBusy = false;

/** Empieza a jugar con otros: los que ya estaban aparecen y los cambios del mundo se comparten. */
function startSession(session: NetSession, code: string | null) {
  net = session;
  netCode = code;
  for (const p of session.peers.values()) remotes.add(p);
  session.attach(sync);
  window.addEventListener('pagehide', () => session.close());
  friendsChanged();
}

/** Abre tu isla para que entren amigos con un código (el de antes, al volver de un viaje en grupo). */
async function hostIsland(again?: string) {
  if (net || netBusy) return;
  netBusy = true;
  friendsChanged();
  try {
    const code = again ?? newInviteCode();
    const transport = await openRoom(code, relays);
    startSession(NetSession.host(transport, { ...loadIdentity(), id: transport.selfId }, islandSnapshot, netEvents), code);
    hud.toast(`Isla abierta. Código: ${code}`);
  } catch {
    hud.toast('No se ha podido abrir la isla. ¿Hay conexión a internet?');
  } finally {
    netBusy = false;
    friendsChanged();
  }
}

/** Cierra tu isla a los amigos, o deja la de un amigo y vuelve a la tuya. */
function leaveFriends() {
  if (!net) return;
  if (net.role === 'invitado') {
    persist();
    saving = false;
    net.close();
    location.reload();
    return;
  }
  net.close();
  try {
    sessionStorage.removeItem(REOPEN_KEY);
  } catch {
    // nada que borrar
  }
  for (const id of [...remotes.players.keys()]) remotes.remove(id);
  net = null;
  netCode = null;
  hud.toast('Has cerrado la isla a los amigos');
  friendsChanged();
}

/** Regalo de otro jugador: a los bolsillos, y lo que no quepa, al suelo. */
function receiveGift(from: string, id: string, count: number) {
  if (!hasItem(id)) return;
  const left = inventory.add(id, count);
  const p = player.position;
  for (let i = 0; i < left; i++) drops.spawn(id, p.x, p.y + 1, p.z, { burst: true });
  hud.toast(`${from} te ha regalado ${count > 1 ? `${count} × ` : ''}${itemDef(id).name.toLowerCase()}`);
  sound.fanfare();
  persist();
}

/** Da lo que tienes en la mano al amigo que miras. */
function giveTo(id: string): boolean {
  const stack = hud.selectedStack;
  const peer = net?.peers.get(id);
  if (!net || !peer) return false;
  if (!stack) {
    hud.toast(`Coge algo en la mano para regalárselo a ${peer.name}`);
    return true;
  }
  // Se copia antes de sacarlo de los bolsillos, que vacían la casilla.
  const gift = { id: stack.id, count: stack.count };
  if (!inventory.remove(gift.id, gift.count)) return true;
  net.give(id, gift);
  hud.toast(`Le has dado ${gift.count > 1 ? `${gift.count} × ` : ''}${itemDef(gift.id).name.toLowerCase()} a ${peer.name}`);
  sound.pickup();
  persist();
  return true;
}

const friends = new FriendsUI({
  state: () => ({
    role: net?.role ?? 'solo',
    code: netCode,
    players: net ? [net.self, ...net.peers.values()].map(({ id, name, color }) => ({ id, name, color })) : [],
    busy: netBusy,
  }),
  name: () => loadIdentity().name,
  rename: (n) => {
    hud.toast(`Te llamarás ${renameIdentity(n).name}`);
  },
  host: () => void hostIsland(),
  join: (code) => {
    persist();
    saving = false;
    const url = new URL(location.href);
    url.searchParams.set('isla', code);
    location.href = url.toString();
  },
  leave: leaveFriends,
  say: (text) => {
    if (!net) {
      hud.toast('Abre tu isla a amigos para chatear (menú › Jugar con amigos)');
      return;
    }
    net.say(text);
    friends.addLine(net.self.name, text, net.self.color);
  },
  gesture: (g) => {
    if (net) net.gesture(g);
    held.use();
    hud.toast(`${GESTURE_LOOK[g].emoji} ${GESTURE_LOOK[g].name}`);
  },
  toast: (t) => hud.toast(t),
});
friends.onClose = () => {
  if (panel === 'faint') return;
  if (panel === 'chat' || panel === 'gestures') panel = null;
  lockInput();
};
const friendsBadge = document.querySelector<HTMLSpanElement>('#friends-badge')!;
function friendsChanged() {
  if (!menu.hidden && menu.view === 'friends') friends.render();
  // Junto a las bayas: cuántos sois y el código, para pasárselo a quien llegue tarde.
  friendsBadge.hidden = !net;
  if (net) friendsBadge.textContent = `👥 ${net.peers.size + 1}${netCode ? ` · ${netCode}` : ''}`;
}

if (joined) {
  startSession(joined.session, inviteCode);
  hud.toast(`Has entrado como ${joined.session.self.name}`);
} else if (netTest === 'anfitrion') {
  startSession(NetSession.host(new TabTransport(identity!.id), identity!, islandSnapshot, netEvents), null);
  hud.toast('Isla abierta: abre otra pestaña con ?pruebared=invitado');
} else if (netError) {
  hud.toast(`${netError}. Juegas en tu isla.`);
} else {
  // Vuelta de un viaje en grupo: se abre otra vez la isla con el mismo código para que entren los amigos.
  let again: string | null = null;
  try {
    again = sessionStorage.getItem(REOPEN_KEY);
    sessionStorage.removeItem(REOPEN_KEY);
  } catch {
    // sin almacenamiento no se reabre
  }
  if (again) void hostIsland(again);
}

// --- Reloj con la hora local, como en Animal Crossing ---

const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'short' });
let lastClock = '';
const gloomColor = new THREE.Color();
function updateClock(now: Date) {
  const t = timeFormat.format(now);
  if (t === lastClock) return;
  lastClock = t;
  clockTime.textContent = t;
  const seasonText = season.charAt(0).toUpperCase() + season.slice(1);
  clockDate.textContent = `${dateFormat.format(now)} · ${holiday ? holiday.name : seasonText}`;
}

/** Adornos de las fiestas: calabazas en las puertas o un árbol junto a la tienda. No se guardan. */
function placeHolidayDecor() {
  decor.clear();
  for (const p of world.plots) {
    const [dx, dy, dz] = p.door;
    if (holiday?.id === 'halloween' && p.kind !== 'player') {
      decor.place('calabaza', dx - 2, dy, dz, 0);
      decor.place('calabaza', dx + 2, dy, dz, 0);
    }
    if (holiday?.id === 'navidad' && p.kind === 'shop') decor.place('arbol_navidad', dx + 3, dy, dz + 1, 0);
  }
}

/**
 * Empieza un día nuevo de juego mientras se juega: conchas y botella nuevas, la tienda cambia,
 * la fruta vuelve a salir y, si toca, cambian la estación y las fiestas.
 */
function newDay() {
  const date = gameDate();
  today = dayKey(date);
  calendar.month = date.getMonth() + 1;
  shellsTaken.clear();
  branchTrees.clear();
  bottleTaken = false;
  spawnBeachFinds();
  shop.restock();
  if (!joined) regrowFruit();
  const nextSeason = seasonOf(date);
  if (nextSeason !== season) {
    season = nextSeason;
    sound.season = season;
    // Se repinta el atlas desde cero con los colores de la estación nueva.
    const fresh = createAtlasCanvas();
    paintFurnitureIcons(fresh);
    applySeason(fresh, season);
    const ctx = atlas.getContext('2d')!;
    ctx.clearRect(0, 0, atlas.width, atlas.height);
    ctx.drawImage(fresh, 0, 0);
    atlasTexture.needsUpdate = true;
    hud.toast(`¡Ha llegado ${season === 'otoño' ? 'el otoño' : season === 'invierno' ? 'el invierno' : season === 'verano' ? 'el verano' : 'la primavera'}!`);
  }
  const nextHoliday = holidayOf(date);
  if (nextHoliday?.id !== holiday?.id) {
    holiday = nextHoliday;
    placeHolidayDecor();
    if (holiday) hud.toast(`¡Hoy es ${holiday.name}!`);
  }
  lastClock = '';
  persist();
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

/** Bioma por el que va el jugador, para avisar al entrar en otro (solo en las islas grandes). */
let biomeHere: Biome | null = null;
let biomeCheck = 0;
function checkBiome(dt: number) {
  biomeCheck -= dt;
  if (biomeCheck > 0) return;
  biomeCheck = 0.5;
  const b = world.biomeAt(Math.floor(player.position.x), Math.floor(player.position.z));
  if (!b || b === biomeHere) return;
  if (biomeHere && isPlaying()) hud.toast(BIOME_NAMES[b]);
  biomeHere = b;
}

let lotTimer = 0;
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
  player.update(spawned && world.isReady(player.position.x, player.position.z) ? dt : 0, isPlaying());
  if (spawned) checkBiome(dt);
  updateVitals(dt);
  // En la portada la cámara da vueltas despacio por encima de la isla.
  if (!menu.hidden && menu.isTitle) {
    const a = now / 1000 * 0.08;
    camera.position.set(player.position.x + Math.sin(a) * 16, player.position.y + 9, player.position.z + Math.cos(a) * 16);
    camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
  }
  breaker.update(dt, breaker.active ? currentHit()?.block ?? null : null);
  updateSteps(dt);

  // El reloj de la isla solo corre mientras se juega (no en la portada ni en pausa).
  if (menu.hidden && clock.tick(dt)) newDay();
  // El agua también se para en la pausa.
  // Las cascadas de los trozos de isla recién cargados empiezan a caer (v3.9).
  for (const [x, y, z] of world.takeSpills()) fluids.wake(x, y, z);
  if (menu.hidden) fluids.update(dt);
  const date = gameDate();
  const hour = Sky.hourOf(date);
  currentHour = hour;
  sky.update(hour, camera);
  // Con lluvia o nieve el día se oscurece y la niebla se vuelve gris.
  const nowWeather = params.get('tiempo') as keyof typeof WEATHER_TEXT | null;
  weather.set(nowWeather && nowWeather in WEATHER_TEXT ? nowWeather : weatherAt(date, seed));
  weather.update(dt, camera.position);
  hemi.intensity *= 1 - weather.gloom * 0.3;
  // Encapotado (v3.9): sin sol directo casi no hay sombras, y el cielo se vuelve gris del todo.
  sunLight.intensity *= 1 - weather.gloom * 0.85;
  sky.color.lerp(gloomColor.setRGB(0.52, 0.55, 0.58).multiplyScalar(1 - sky.night * 0.8), weather.gloom * 0.95);
  sky.syncDome(weather.gloom);
  shadows.update(dt, player.position, sky.lightDir);
  lighting.update(now / 1000);
  adaptEyes(dt);
  water.update(now / 1000, settings.quality !== 'baja', (1 - sky.night) * (1 - weather.gloom));
  wind.update(now / 1000, 1 + weather.gloom * 1.5);
  birds.update(dt, now / 1000, player.position, Math.max(sky.night, weather.raining ? 0.7 : 0), birdWorld, livingBeings());
  for (const v of villagers) v.update(dt, hour, player.position);
  plane.update(dt, now / 1000);
  animals.update(dt, player.position);
  // Cada segundo el huerto crece si ha cambiado el día, y la lluvia lo riega.
  farmTimer -= dt;
  if (farmTimer <= 0) {
    farmTimer = 1;
    const day = dayKey(date);
    if (weather.raining) farm.waterAll(day);
    missions.setDay(day);
    // Lo que crece solo lo decide el anfitrión; a los invitados les llegan los bloques.
    if (!joined) {
      farm.sync(sync, day);
      orchard.sync(sync, day);
    }
  }
  lotTimer -= dt;
  if (lotTimer <= 0) {
    lotTimer = 0.4;
    checkLots();
  }
  updateNet(now);
  remotes.update(dt);
  nameTags.update(camera, player.position);
  updateClock(date);
  const daylight = 1 - sky.night * 0.5;
  // Lo que cae al suelo se ve tan iluminado como el sitio donde está: oscuro en una cueva, claro junto a una antorcha.
  // La hora ya la ponen las luces de la escena, que también lo alumbran.
  drops.update(dt, player.position, take, (p) => brightnessAt(p, 1));
  bugs.update(dt, hour, player.position, daylight);
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
  const submerged = world.inWater(camera.position.x, camera.position.y, camera.position.z);
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

  clouds.update(now / 1000, sky.night, weather.gloom, sky.glow * (1 - weather.gloom), sky.glowColor, camera.position, cloudCover(clock.dayNumber(), hour, seed));

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

  // Una antorcha en cualquiera de las dos manos alumbra alrededor.
  lighting.setHand(camera.position, carriedLight());
  renderer.render(scene, camera);
  // La mano va encima de todo, en otra pasada, y no se ve en la portada ni con el menú abierto.
  if (menu.hidden && !panel) {
    const walking = player.onGround ? Math.hypot(player.velocity.x, player.velocity.z) : 0;
    held.update(dt, camera, hud.selectedStack?.id ?? null, inventory.offhand?.id ?? null, breaker.active && !!hit, walking, brightnessAt(camera.position, 1 - sky.night * 0.6));
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

/**
 * Los ojos se acostumbran a la oscuridad (v3.2): dentro de una cueva o de noche la imagen se aclara poco a poco,
 * y al salir al sol vuelve a lo normal. Sin pasarse, para que una cueva siga pareciendo una cueva.
 */
let exposure = 1;
function adaptEyes(dt: number) {
  const here = brightnessAt(camera.position, 1 - sky.night * 0.5);
  const target = 1 + 0.45 * (1 - Math.min(1, here / 0.6));
  exposure += (target - exposure) * Math.min(1, dt * (target > exposure ? 0.6 : 2));
  renderer.toneMappingExposure = exposure;
}

/** Alcance de la luz que llevas en cualquiera de las dos manos (0 si no llevas ninguna). */
function carriedLight(): number {
  return Math.max(HAND_LIGHT[hud.selectedStack?.id ?? ''] ?? 0, HAND_LIGHT[inventory.offhand?.id ?? ''] ?? 0);
}

/**
 * Lo iluminado que está un punto, de 0 a 1 (v3.1): la luz del cielo según la hora (`daylight`),
 * la de las antorchas de alrededor o la que llevas en la mano, la que más alumbre.
 */
function brightnessAt(p: THREE.Vector3, daylight: number): number {
  const [skyLevel, glow] = world.lightAt(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
  const reach = carriedLight();
  const hand = reach ? Math.max(0, 1 - p.distanceTo(camera.position) / reach) : 0;
  const torch = Math.max(glow, hand);
  return Math.max(skyLevel * Math.sqrt(skyLevel) * daylight, torch * Math.sqrt(torch), 0.12);
}

// Acceso desde la consola del navegador mientras se desarrolla.
if (import.meta.env.DEV) {
  Object.assign(window, {
    game: { vitals, world, fluids, shadows, renderer, sunLight, lots, useBlueprint, checkLots, lighting, sync, get net() { return net; }, hostIsland, leaveFriends, friends, giveTo, remotes, orchard, removeBlock, player, farm, animals, useItem, missions, openMissions, record, trip, plane, get pilot() { return pilot; }, guests, takeOff, birds, held, sound, tutorial, touch, lockInput, unlockInput, isPlaying, weather, decor, get season() { return season; }, get holiday() { return holiday; }, clock, newDay, openStorage, workbench, openWorkbench, readBottle, furniture, home, setWallet, placeFurniture, pickUpFurniture, furnitureInSight, camera, villagers, bugs, fishing, collection, useRod, useNet, talkTo, dialog, shop, get wallet() { return wallet; }, persist, inventory, hud, drops, shakeTree, openInventory, closeInventory, currentHit, breaker, get breaking() { return breaker.active; }, get breakProgress() { return breaker.progress; } },
  });
}
