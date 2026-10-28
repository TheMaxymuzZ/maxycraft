// El astillero (v4.21): unas ruinas en la playa del otro lado de la isla que se arreglan en cuatro etapas
// (limpiar escombros, grada de madera, taller y grúa). Lo lleva Bartolo, una morsa carpintera de ribera, que
// construye barcos y les pone mejoras. En el muelle, Brújula (una nutria) vende cosas de navegar y pescar.
// Aquí está lo que no depende de la partida: los edificios de cada etapa, dónde va, los precios y los barcos.

import { Block, isSolid, isWater } from './blocks';
import { type BuildWorld, type BuildingTemplate, rotateCell, templateCells } from './buildings';
import type { ShopDef } from './economy';
import type { Cell } from './pathfind';
import { rotationFacing } from './terminal';
import type { Profile } from './villagers';
import { SEA_LEVEL } from './world';

/** El suelo del astillero y del muelle: a ras de la playa. */
export const DECK_Y = SEA_LEVEL + 1;

/** Ancho (x) y largo (z) sin girar. El taller va de z = 0 a 6 y el muelle y la grada siguen hacia el mar (+z). */
const W = 11;
const D = 18;
const HALL = 6;

const LEGEND: Record<string, Block> = {
  K: Block.BridgeDeck,
  P: Block.Planks,
  L: Block.Log,
  H: Block.Planks,
  W: Block.Glass,
  D: Block.Door,
  T: Block.DoorTop,
  F: Block.BridgeRail,
  B: Block.RoofBlue,
  I: Block.LightBlock,
  C: Block.Cobble,
  X: Block.Crate,
  S: Block.PlanksSlab,
  G: Block.Fence,
  O: Block.PolishedStone,
};

/** Las etapas del astillero, de las ruinas (0) a la grúa (4). */
export const STAGES = [
  { name: 'Ruinas', text: 'Tablas rotas y escombros por todas partes.' },
  { name: 'Escombros limpios', text: 'El taller tiene paredes otra vez y el muelle se puede pisar.' },
  { name: 'Grada de madera', text: 'Una rampa hasta el agua para botar barcos: ya se puede hacer una balsa.' },
  { name: 'Taller', text: 'Tejado, luz y herramientas: velero y mejoras.' },
  { name: 'Grúa', text: 'Una grúa para los cascos grandes: el barco de expedición.' },
] as const;
export const MAX_STAGE = STAGES.length - 1;

/** El astillero en una etapa: el taller (x 0..4), el muelle (x 1..3) y la grada (x 6..9). */
function build(stage: number): string[][] {
  const H = 9;
  const grid: string[][][] = Array.from({ length: H }, () => Array.from({ length: D }, () => Array(W).fill(' ')));
  const set = (x: number, y: number, z: number, c: string) => {
    if (y >= 0 && y < H && x >= 0 && x < W && z >= 0 && z < D) grid[y][z][x] = c;
  };
  // Tarima de la explanada (todo el taller y su lado) y el muelle de tres de ancho. En ruinas le faltan tablas.
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      const dock = x >= 1 && x <= 3;
      if (z > HALL && !dock) continue;
      if (stage === 0 && ((x * 5 + z * 3) % 4 === 0 || z > HALL + 5)) continue;
      set(x, 0, z, 'K');
    }
  }
  if (stage === 0) {
    // Ruinas: esquinas del taller a medio caer, montones de piedra y cajas rotas.
    for (const [x, z, h] of [[0, 0, 2], [4, 0, 1], [0, HALL, 1], [4, HALL, 3]]) for (let y = 1; y <= h; y++) set(x, y, z, 'L');
    for (const [x, z] of [[1, 0], [2, 0], [0, 2], [0, 3]]) set(x, 1, z, 'H');
    for (const [x, z, c] of [[2, 3, 'C'], [3, 3, 'C'], [2, 4, 'C'], [7, 2, 'C'], [8, 5, 'C'], [6, 4, 'X'], [9, 1, 'X'], [1, 5, 'X']] as const) set(x, 1, z, c);
    set(3, 2, 3, 'C');
    return grid.map((layer) => layer.map((row) => row.join('')));
  }
  // El taller: paredes de tablones con ventanas, puertas a la playa (z = 0) y al muelle (z = 6).
  for (let y = 1; y <= 3; y++) {
    for (let z = 0; z <= HALL; z++) {
      for (let x = 0; x <= 4; x++) {
        const edge = x === 0 || x === 4 || z === 0 || z === HALL;
        const corner = (x === 0 || x === 4) && (z === 0 || z === HALL);
        if (!edge) set(x, y, z, '.');
        else if (corner) set(x, y, z, 'L');
        else if (y === 2 && (x === 0 || x === 4) && z % 2 === 1) set(x, y, z, stage >= 3 ? 'W' : '.');
        else set(x, y, z, 'H');
      }
    }
  }
  for (const z of [0, HALL]) {
    set(2, 1, z, 'D');
    set(2, 2, z, 'T');
  }
  if (stage >= 3) {
    // Tejado azul a dos aguas y luz dentro.
    for (let z = -1; z <= HALL + 1; z++) {
      for (let x = -1; x <= 5; x++) set(x, 4, z, 'B');
      for (let x = 0; x <= 4; x++) set(x, 5, z, 'B');
      set(2, 6, z, 'B');
    }
    set(2, 3, 3, 'I');
  } else {
    // Techo provisional de tablas.
    for (let z = 0; z <= HALL; z++) for (let x = 0; x <= 4; x++) set(x, 4, z, 'S');
  }
  // Barandillas del muelle, con una farola al final.
  for (let z = HALL + 1; z < D; z++) {
    set(1, 1, z, 'F');
    if (z < D - 3) set(3, 1, z, 'F');
  }
  set(1, 2, D - 1, 'G');
  set(1, 3, D - 1, stage >= 3 ? 'I' : 'G');
  if (stage >= 2) {
    // La grada: una rampa de tablones desde la explanada hasta el agua, con calzos de tronco.
    for (let z = 0; z < D; z++) for (let x = 6; x <= 9; x++) set(x, 0, z, 'P');
    for (const z of [2, 5, 8, 11]) {
      set(6, 1, z, 'L');
      set(9, 1, z, 'L');
    }
    for (let z = 0; z < HALL; z++) set(10, 1, z, 'G');
  }
  if (stage >= 4) {
    // La grúa: una torre de piedra con un brazo de troncos sobre la grada y un gancho.
    for (let y = 1; y <= 7; y++) set(10, y, HALL + 1, y === 1 ? 'O' : 'L');
    for (let x = 6; x <= 10; x++) set(x, 8, HALL + 1, 'L');
    for (let y = 5; y <= 7; y++) set(7, y, HALL + 1, 'G');
    set(10, 1, HALL + 1, 'O');
  }
  return grid.map((layer) => layer.map((row) => row.join('')));
}

export function shipyardTemplate(stage: number): BuildingTemplate {
  return {
    id: 'astillero',
    name: 'Astillero',
    legend: LEGEND,
    layers: build(Math.max(0, Math.min(MAX_STAGE, stage))),
    door: [2, 1, -1],
    rooms: [{ name: 'Taller', floor: 1, area: [1, 1, 3, 5] }],
    slots: [],
  };
}

/** Bartolo trabaja dentro del taller; Brújula atiende al final del muelle. */
export const SHIPWRIGHT_SPOT: Cell = [2, 1, 3];
export const KIOSK_SPOT: Cell = [2, 1, D - 3];
/** Donde queda amarrado tu barco: al lado de la grada, en el agua (con decimales). */
export const BOAT_SPOT: [number, number] = [7.5, D + 1.5];

export interface ShipyardSite {
  /** Esquina del solar ya girado y giro (cuartos de vuelta). */
  x: number;
  z: number;
  rotation: number;
  /** Etapa de la reparación (0 son las ruinas). */
  stage: number;
}

/** Si lo que llega (de la partida o de la red) tiene forma de astillero. */
export function isShipyardSite(v: unknown): v is ShipyardSite {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return Number.isInteger(t.x) && Number.isInteger(t.z) && Number.isInteger(t.rotation) && (t.rotation as number) >= 0 && (t.rotation as number) < 4
    && Math.abs(t.x as number) < 10_000 && Math.abs(t.z as number) < 10_000
    && Number.isInteger(t.stage) && (t.stage as number) >= 0 && (t.stage as number) <= MAX_STAGE;
}

/** Hacia dónde mira el muelle (hacia el mar). */
export function shipyardSeaward(site: ShipyardSite): [number, number] {
  return site.rotation === 0 ? [0, 1] : site.rotation === 1 ? [-1, 0] : site.rotation === 2 ? [0, -1] : [1, 0];
}

/** Casilla de la plantilla en el mundo. */
export function shipyardCell(site: ShipyardSite, x: number, y: number, z: number): Cell {
  const [rx, rz] = rotateCell(x, z, W, D, site.rotation);
  return [site.x + rx, DECK_Y + y, site.z + rz];
}

/** Punto (con decimales) de la plantilla en el mundo; puede caer fuera del solar (el barco amarrado). */
export function shipyardPoint(site: ShipyardSite, x: number, z: number): [number, number] {
  const r = ((site.rotation % 4) + 4) % 4;
  // Se gira alrededor de la esquina como las casillas: (x, z) → (D - z, x) en cada cuarto de vuelta.
  let [px, pz, w, d] = [x, z, W, D];
  for (let i = 0; i < r; i++) {
    [px, pz] = [d - pz, px];
    [w, d] = [d, w];
  }
  return [site.x + px, site.z + pz];
}

/** Centro del astillero en el mundo, para el mapa y el aviso de la isla. */
export function shipyardCenter(site: ShipyardSite): [number, number] {
  return shipyardPoint(site, W / 2, HALL);
}

/**
 * Busca sitio para el astillero en una playa (la del otro lado de la isla que la avioneta): el taller sobre la
 * orilla y el muelle y la grada sobre el agua. Prueba a correrlo hacia tierra o hacia el mar y se queda con el
 * que menos terreno pisa.
 */
export function findShipyardSite(world: BuildWorld, beach: { x: number; z: number; dx: number; dz: number }): ShipyardSite {
  const rotation = rotationFacing(beach.dx, beach.dz);
  const [sx, sz] = rotation === 0 ? [0, 1] : rotation === 1 ? [-1, 0] : rotation === 2 ? [0, -1] : [1, 0];
  let best: ShipyardSite | null = null;
  let bestScore = Infinity;
  for (let shift = -3; shift <= 3; shift++) {
    const [ax, az] = [beach.x + sx * shift, beach.z + sz * shift];
    const [rx, rz] = rotateCell(2, HALL, W, D, rotation);
    const site = { x: ax - rx, z: az - rz, rotation, stage: 0 };
    let score = 0;
    for (let z = 0; z < D; z++) {
      for (let x = 0; x < W; x++) {
        const [cx, , cz] = shipyardCell(site, x, 0, z);
        const ground = world.heightAt(cx, cz);
        score += Math.max(0, ground - DECK_Y) * 3;
        if (z > HALL + 2 && ground >= DECK_Y) score += 4;
        if (world.isEdited?.(cx, ground, cz) || world.plotAt?.(cx, cz, 1)) score += 50;
      }
    }
    if (score < bestScore) {
      bestScore = score;
      best = site;
    }
  }
  return best!;
}

/** Construye (o rehace) el astillero en su etapa: pilotes hasta el fondo, la tarima y lo de encima. */
export function buildShipyard(world: BuildWorld, site: ShipyardSite) {
  const t = shipyardTemplate(site.stage);
  const tall = t.layers.length;
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      const floor = t.layers[0][z][x];
      const [cx, , cz] = shipyardCell(site, x, 0, z);
      if (floor !== ' ') {
        const pillar = (x === 0 || x === 4 || x === 1 || x === 3 || x === 6 || x === 9) && z % 3 === 0;
        for (let y = DECK_Y - 1; y > 0; y--) {
          const b = world.getBlock(cx, y, cz);
          if (isSolid(b) && !isWater(b)) break;
          if (pillar) world.setBlock(cx, y, cz, Block.BridgePillar);
          else if (!isWater(b)) world.setBlock(cx, y, cz, Block.Sand);
          else break;
        }
      }
      // Lo que sobra por encima de la tarima (arena, flores o la etapa de antes) se quita.
      for (let y = DECK_Y + 1; y < DECK_Y + tall; y++) {
        const free = (t.layers[y - DECK_Y][z]?.[x] ?? ' ') === ' ';
        const b = world.getBlock(cx, y, cz);
        if (free && b !== Block.Air && !isWater(b)) world.setBlock(cx, y, cz, Block.Air);
      }
    }
  }
  // Las tejas que vuelan por fuera del solar (el alero) también se ponen.
  for (const [x, y, z, b] of templateCells(t, site.rotation)) {
    if (b === null) continue;
    const at = [site.x + x, DECK_Y + y, site.z + z] as const;
    if (world.getBlock(...at) !== b) world.setBlock(...at, b);
  }
}

// --- Lo que cuesta cada cosa ---

export interface Cost {
  bayas?: number;
  items?: Record<string, number>;
}

/** Lo que pide Bartolo para pasar de una etapa a la siguiente (índice: la etapa a la que se llega - 1). */
export const STAGE_COSTS: Cost[] = [
  { bayas: 5000, items: { rama: 10 } },
  { items: { tablones: 40, tronco: 10 } },
  { bayas: 8000, items: { tablones: 30, adoquin: 20, cristal: 4 } },
  { bayas: 15000, items: { tronco: 20, pepita_hierro: 10, lana: 5 } },
];

export type BoatKind = 'balsa' | 'velero' | 'expedicion';
export const BOAT_KINDS: BoatKind[] = ['balsa', 'velero', 'expedicion'];

export interface BoatModel {
  kind: BoatKind;
  name: string;
  /** Etapa del astillero que hace falta. */
  stage: number;
  cost: Cost;
  /** Bloques por segundo a todo trapo, sin viento. */
  speed: number;
  /** Casillas de la bodega sin mejorar. */
  hold: number;
  text: string;
}

export const BOATS: BoatModel[] = [
  { kind: 'balsa', name: 'Balsa', stage: 2, cost: { items: { tablones: 20, rama: 10 } }, speed: 4, hold: 9, text: 'Troncos atados y un remo. Lenta, pero flota.' },
  { kind: 'velero', name: 'Velero', stage: 3, cost: { bayas: 12000, items: { tablones: 40, lana: 6, pepita_hierro: 5 } }, speed: 7, hold: 18, text: 'Casco de madera y vela blanca: aprovecha el viento.' },
  { kind: 'expedicion', name: 'Barco de expedición', stage: 4, cost: { bayas: 30000, items: { tablones: 60, pepita_hierro: 20, lana: 10 } }, speed: 9, hold: 27, text: 'Grande, rápido y con camarote. Para ir lejos.' },
];

export function boatModel(kind: BoatKind): BoatModel {
  return BOATS.find((b) => b.kind === kind)!;
}

export type UpgradeId = 'vela' | 'bodega' | 'casco' | 'farol' | 'cama';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  text: string;
  cost: Cost;
  /** Veces que se puede poner (la bodega crece de 9 en 9). */
  max: number;
  /** Etapa del astillero que hace falta. */
  stage: number;
}

export const UPGRADES: Upgrade[] = [
  { id: 'vela', name: 'Vela grande', text: 'Más rápido, y mucho más con el viento a favor.', cost: { bayas: 10000, items: { lana: 8 } }, max: 1, stage: 3 },
  { id: 'bodega', name: 'Bodega más grande', text: 'Nueve casillas más para guardar cosas.', cost: { bayas: 5000, items: { tablones: 20 } }, max: 3, stage: 3 },
  { id: 'casco', name: 'Casco reforzado', text: 'Chapas de hierro: frena menos al tocar la orilla y aguanta las olas.', cost: { bayas: 20000, items: { pepita_hierro: 10 } }, max: 1, stage: 4 },
  { id: 'farol', name: 'Farol de proa', text: 'Una luz para navegar de noche.', cost: { items: { antorcha: 2, pepita_hierro: 1 } }, max: 1, stage: 3 },
  { id: 'cama', name: 'Litera', text: 'Para dormir a bordo cuando se hace de noche.', cost: { bayas: 3000, items: { cama: 1 } }, max: 1, stage: 3 },
];

export function upgradeOf(id: UpgradeId): Upgrade {
  return UPGRADES.find((u) => u.id === id)!;
}

/** El barco del jugador, tal como se guarda. */
export interface BoatSave {
  kind: BoatKind;
  upgrades: Partial<Record<UpgradeId, number>>;
  x: number;
  z: number;
  yaw: number;
  hold: ({ id: string; count: number; wear?: number } | null)[];
}

export function isBoatSave(v: unknown): v is BoatSave {
  if (typeof v !== 'object' || v === null) return false;
  const b = v as Record<string, unknown>;
  return BOAT_KINDS.includes(b.kind as BoatKind) && typeof b.upgrades === 'object' && b.upgrades !== null
    && Number.isFinite(b.x) && Number.isFinite(b.z) && Number.isFinite(b.yaw) && Array.isArray(b.hold);
}

/** Casillas de la bodega con las mejoras puestas. */
export function holdSize(kind: BoatKind, upgrades: BoatSave['upgrades']): number {
  return boatModel(kind).hold + 9 * Math.min(upgradeOf('bodega').max, upgrades.bodega ?? 0);
}

/** Velocidad a todo trapo: la del barco, más la vela y el viento (de -1 en contra a 1 a favor). */
export function boatSpeed(kind: BoatKind, upgrades: BoatSave['upgrades'], wind: number): number {
  const base = boatModel(kind).speed;
  // La balsa va a remo: el viento casi no le importa. Con vela grande se nota mucho más.
  const sail = kind === 'balsa' ? 0.05 : upgrades.vela ? 0.45 : 0.2;
  return base * (1 + (upgrades.vela ? 0.25 : 0)) * (1 + sail * wind);
}

/** El viento de hoy: hacia dónde sopla (ángulo) y cuánto (0..1). Cambia cada día. */
export function windOf(today: string): { angle: number; strength: number } {
  let h = 2166136261;
  for (const ch of today) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const u = (h >>> 0) / 4294967296;
  const v = ((h >>> 8) & 0xffff) / 0xffff;
  return { angle: u * Math.PI * 2, strength: 0.4 + v * 0.6 };
}

/** Viento a favor (1), de lado (0) o en contra (-1) para un barco que mira hacia `yaw` (hacia -z con yaw 0). */
export function windFactor(yaw: number, wind: { angle: number; strength: number }): number {
  // El barco avanza hacia (-sin yaw, -cos yaw); el viento sopla hacia (cos a, sin a).
  const dot = -Math.sin(yaw) * Math.cos(wind.angle) - Math.cos(yaw) * Math.sin(wind.angle);
  return dot * wind.strength;
}

/** Texto de lo que cuesta, para el diálogo y la wiki. */
export function costText(c: Cost, names: (id: string) => string): string {
  const parts = Object.entries(c.items ?? {}).map(([id, n]) => `${n} × ${names(id).toLowerCase()}`);
  if (c.bayas) parts.push(`${c.bayas.toLocaleString('es-ES')} bayas`);
  return parts.join(', ');
}

// --- Los vecinos del astillero ---

/** Bartolo, la morsa carpintera de ribera: no duerme mucho y siempre huele a brea. */
export const SHIPWRIGHT: Profile = {
  name: 'Bartolo', species: 'morsa', personality: 'gruñón', catchphrase: 'bfff', shirt: 0x2f4a6a,
  likes: 'madera', sleep: [23, 6], stationary: true, role: 'shipwright', birthday: [9, 7], hobby: 'calafatear cascos',
};

/** Brújula, la nutria del muelle: vende cañas, cebos y todo lo de navegar. */
export const KIOSK_KEEPER: Profile = {
  name: 'Brújula', species: 'nutria', personality: 'alegre', catchphrase: 'chap', shirt: 0xe0a030,
  likes: 'conchas', sleep: [21, 6], stationary: true, role: 'shop', shop: 'pesca', birthday: [6, 8], hobby: 'flotar boca arriba',
};

/** El puesto del muelle de Brújula: abre cuando el muelle se puede pisar (etapa 1). */
export const BRUJULA: ShopDef = {
  id: 'pesca',
  name: 'Puesto de Brújula',
  owner: 'Brújula',
  hours: Array.from({ length: 7 }, () => [6, 21] as [number, number]),
  stock: [
    { pick: (d) => d.seller === 'pesca' },
    { ids: ['cana', 'red'], pick: () => true },
  ],
  buys: (d) => d.kind === 'criatura' || d.id === 'concha' || d.id === 'cebo' || d.id === 'senuelo',
  specialty: { pick: (d) => d.kind === 'criatura', bonus: 1.15 },
  margin: 1,
  offers: true,
};

export const KIOSK_GREETINGS = [
  '¡{saludo}! El mar está precioso hoy. ¿Cebos, una caña nueva, un catalejo, {c}?',
  'Con cebo pican antes. ¡Palabra de nutria, {c}!',
  'La carta náutica enseña las islas del mar. ¡Hay nueve ahí fuera, {c}!',
];
