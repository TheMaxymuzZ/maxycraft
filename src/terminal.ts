// La terminal de la avioneta (v4.16): una caseta de madera sobre pilotes en la playa, con sala de espera,
// mostrador de billetes, panel de salidas y báscula, y un muelle hasta el agua con un faro pequeño al final.
// La avioneta queda amarrada junto al muelle. Se construye una vez (como el ayuntamiento) en la playa de la
// avioneta, también en las islas de antes; aquí está el edificio y dónde va cada cosa.

import { Block, isSolid, isWater } from './blocks';
import { type BuildWorld, type BuildingTemplate, rotateCell, templateCells, templateSize } from './buildings';
import type { Cell } from './pathfind';
import type { Fixture } from './shopBuilding';
import { SEA_LEVEL } from './world';

/** El suelo de la terminal y del muelle: a ras de la playa. */
export const DECK_Y = SEA_LEVEL + 1;

const LEGEND: Record<string, Block> = {
  K: Block.BridgeDeck,
  H: Block.Wall,
  L: Block.Log,
  W: Block.Glass,
  D: Block.Door,
  T: Block.DoorTop,
  F: Block.BridgeRail,
  B: Block.RoofBlue,
  R: Block.RoofRed,
  I: Block.LightBlock,
};

/** Ancho (x) y largo (z) sin girar. La sala va de z = 0 a 6 y el muelle sigue hasta z = 13, hacia el mar (+z). */
const W = 9;
const D = 14;
const HALL = 6;

function build(): string[][] {
  const H = 8;
  const grid: string[][][] = Array.from({ length: H }, () => Array.from({ length: D }, () => Array(W).fill(' ')));
  const set = (x: number, y: number, z: number, c: string) => {
    if (y >= 0 && y < H && x >= 0 && x < W && z >= 0 && z < D) grid[y][z][x] = c;
  };
  // Tarima: la sala entera y el muelle de tres de ancho.
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (z <= HALL || (x >= 3 && x <= 5)) set(x, 0, z, 'K');
  // Paredes blancas con ventanales y dos puertas: a la playa (z = 0) y al muelle (z = 6).
  for (let y = 1; y <= 3; y++) {
    for (let z = 0; z <= HALL; z++) {
      for (let x = 0; x < W; x++) {
        const edge = x === 0 || x === W - 1 || z === 0 || z === HALL;
        const corner = (x === 0 || x === W - 1) && (z === 0 || z === HALL);
        if (!edge) set(x, y, z, '.');
        else if (corner) set(x, y, z, 'L');
        else if (y === 2 && (x === 0 || x === W - 1) && z % 2 === 1) set(x, y, z, 'W');
        else if (y >= 2 && z === HALL && x !== 4) set(x, y, z, 'W');
        else set(x, y, z, 'H');
      }
    }
  }
  for (const z of [0, HALL]) {
    set(4, 1, z, 'D');
    set(4, 2, z, 'T');
  }
  // Tejado azul a dos aguas (cae hacia los lados) con luz dentro.
  for (let z = -1; z <= HALL + 1; z++) {
    for (let x = 0; x < W; x++) set(x, 4, z, 'B');
    for (let x = 1; x < W - 1; x++) set(x, 5, z, 'B');
    for (let x = 3; x < W - 3; x++) set(x, 6, z, 'B');
  }
  set(4, 3, 3, 'I');
  // Barandillas del muelle (la derecha se deja abierta donde amarra la avioneta).
  for (let z = HALL + 1; z < D; z++) {
    set(3, 1, z, z >= D - 2 ? ' ' : 'F');
    if (z < HALL + 3) set(5, 1, z, 'F');
  }
  // Faro al final del muelle, a rayas rojas y blancas, con la luz arriba.
  for (let y = 1; y <= 4; y++) set(3, y, D - 1, y % 2 ? 'H' : 'R');
  set(3, 5, D - 1, 'I');
  set(3, 6, D - 1, 'R');
  return grid.map((layer) => layer.map((row) => row.join('')));
}

export const TERMINAL: BuildingTemplate = {
  id: 'terminal',
  name: 'Terminal',
  legend: LEGEND,
  layers: build(),
  door: [4, 1, -1],
  rooms: [{ name: 'Sala de espera', floor: 1, area: [1, 1, 7, 5] }],
  slots: [],
};

/** Bancos de la sala de espera, el mostrador de billetes, el panel de salidas y la báscula. */
export const TERMINAL_FIXTURES: Fixture[] = [
  ['banco', 1, 1, 2, 1], ['banco', 1, 1, 3, 1], ['banco', 1, 1, 4, 1],
  ['mostrador', 5, 1, 2, 0], ['mostrador', 6, 1, 2, 0], ['mostrador', 7, 1, 2, 0],
  ['bascula', 7, 1, 4, 3],
  ['panel_salidas', 2, 1, 1, 0],
  ['planta', 1, 1, 5, 0], ['planta', 7, 1, 5, 0],
];

// --- La terminal nueva (v5.3) ---
// Mismo solar que la de antes (9 × 14), pero menos tosca: suelo de baldosas, pilastras de tronco, ventanales hacia
// el mar, tejado azul a dos aguas con escaleras de teja que vuela sobre un porche con bancos, una viga con
// lámparas colgantes, el mostrador bajo de Plumas y un faro de piedra al final del muelle.

const LEGEND_V2: Record<string, Block> = {
  ...LEGEND,
  Q: Block.Tiles,
  O: Block.PolishedStone,
  G: Block.Glass,
  V: Block.Window,
  '<': (Block.RoofBlueStairs + 1) as Block,
  '>': (Block.RoofBlueStairs + 3) as Block,
  b: Block.RoofBlueSlab,
  r: Block.RoofRedSlab,
};

function buildV2(): string[][] {
  const H = 9;
  const grid: string[][][] = Array.from({ length: H }, () => Array.from({ length: D }, () => Array(W).fill(' ')));
  const set = (x: number, y: number, z: number, c: string) => {
    if (y >= 0 && y < H && x >= 0 && x < W && z >= 0 && z < D) grid[y][z][x] = c;
  };
  // Suelo: baldosas dentro, tablones en el borde, en el porche (z = 7) y en el muelle.
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      if (z <= HALL + 1 || (x >= 3 && x <= 5)) set(x, 0, z, x > 0 && x < W - 1 && z > 0 && z < HALL ? 'Q' : 'K');
    }
  }
  // Paredes de la sala.
  for (let y = 1; y <= 3; y++) {
    for (let z = 0; z <= HALL; z++) {
      for (let x = 0; x < W; x++) {
        const side = x === 0 || x === W - 1;
        const end = z === 0 || z === HALL;
        if (!side && !end) {
          set(x, y, z, '.');
          continue;
        }
        let c = 'H';
        if ((side && end) || (side && z === 3)) c = 'L'; // esquinas y pilastra en medio de los lados
        else if (side) c = y === 2 ? 'V' : 'H'; // ventanas a los lados
        else if (z === 0) c = y === 2 && (x === 2 || x === 6) ? 'V' : 'H';
        else c = y >= 2 ? 'G' : 'H'; // ventanal hacia el mar
        set(x, y, z, c);
      }
    }
  }
  for (const z of [0, HALL]) {
    set(4, 1, z, 'D');
    set(4, 2, z, 'T');
    set(4, 3, z, 'H');
  }
  // Viga de lado a lado en el medio, de donde cuelgan las lámparas.
  for (let x = 1; x < W - 1; x++) set(x, 4, 3, 'L');
  // Tejado a dos aguas con la cumbrera de la playa al mar; vuela sobre el porche (z = 7) apoyado en dos postes.
  for (let k = 0; k <= 4; k++) {
    const off = 4 - k;
    for (let z = 0; z <= HALL + 1; z++) {
      if (off === 0) {
        set(4, 4 + k, z, 'b');
        set(4, 3 + k, z, 'B');
        continue;
      }
      set(4 - off, 4 + k, z, '<');
      set(4 + off, 4 + k, z, '>');
    }
    if (k === 0) continue;
    // Hastiales: pared con ventana hacia la playa, cristal hacia el mar.
    for (let x = 4 - off + 1; x <= 4 + off - 1; x++) {
      set(x, 3 + k, 0, k === 2 && x === 4 ? 'V' : 'H');
      set(x, 3 + k, HALL, k <= 2 && Math.abs(x - 4) <= 1 ? 'G' : 'H');
    }
  }
  for (let y = 1; y <= 3; y++) {
    set(0, y, HALL + 1, 'L');
    set(W - 1, y, HALL + 1, 'L');
  }
  // Barandillas del muelle (a la derecha, abierto donde amarra la avioneta).
  for (let z = HALL + 2; z < D; z++) {
    set(3, 1, z, z >= D - 2 ? ' ' : 'F');
    if (z === HALL + 2) set(5, 1, z, 'F');
  }
  // Faro al final del muelle: base de piedra, rayas rojas y blancas, la luz y un sombrerito rojo.
  for (let y = 1; y <= 4; y++) set(3, y, D - 1, y === 1 ? 'O' : y % 2 ? 'H' : 'R');
  set(3, 5, D - 1, 'I');
  set(3, 6, D - 1, 'r');
  return grid.map((layer) => layer.map((row) => row.join('')));
}

export const TERMINAL_V2: BuildingTemplate = {
  ...TERMINAL,
  legend: LEGEND_V2,
  layers: buildV2(),
};

/** Muebles de la terminal nueva: mostrador bajo con caja, bancos, maletas, lámparas, y en el muelle salvavidas y manga de viento. */
export const TERMINAL_FIXTURES_V2: Fixture[] = [
  ['mostrador_bajo', 5, 1, 2, 0], ['caja_mostrador', 6, 1, 2, 0], ['mostrador_bajo', 7, 1, 2, 0],
  ['panel_salidas', 2, 1, 1, 0], ['planta', 1, 1, 1, 0],
  ['banco', 1, 1, 3, 1], ['banco', 1, 1, 4, 1], ['maletas', 1, 1, 5, 1],
  ['bascula', 7, 1, 4, 3], ['maletas', 6, 1, 5, 0], ['planta', 7, 1, 5, 0],
  ['lampara_techo', 2, 3, 3, 0], ['lampara_techo', 6, 3, 3, 0],
  ['banco', 1, 1, 7, 0], ['banco', 2, 1, 7, 0], ['banco', 6, 1, 7, 0], ['banco', 7, 1, 7, 0],
  ['salvavidas', 5, 1, 9, 1], ['manga_viento', 5, 1, 13, 0], ['rollo_cuerda', 5, 1, 12, 0],
];

/** Versión del edificio de la terminal: la nueva es la 2 (v5.3). */
export const TERMINAL_VERSION = 2;

/** La plantilla de la terminal de ese sitio (la de antes si aún no se ha rehecho). */
export function terminalTemplate(site: TerminalSite): BuildingTemplate {
  return site.v === TERMINAL_VERSION ? TERMINAL_V2 : TERMINAL;
}

/** Los muebles de la terminal de ese sitio. */
export function terminalFixtures(site: TerminalSite): Fixture[] {
  return site.v === TERMINAL_VERSION ? TERMINAL_FIXTURES_V2 : TERMINAL_FIXTURES;
}

/** Plumas atiende detrás del mostrador. */
export const PILOT_SPOT: Cell = [6, 1, 1];
/** Donde queda amarrada la avioneta: a la derecha del final del muelle (con decimales). */
export const PLANE_SPOT: [number, number] = [8.2, 11.5];

/** Si lo que llega (de la partida o de la red) tiene forma de sitio de terminal. */
export function isTerminalSite(v: unknown): v is TerminalSite {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return Number.isInteger(t.x) && Number.isInteger(t.z) && Number.isInteger(t.rotation) && (t.rotation as number) >= 0 && (t.rotation as number) < 4
    && Math.abs(t.x as number) < 10_000 && Math.abs(t.z as number) < 10_000
    && (t.y === undefined || (Number.isInteger(t.y) && (t.y as number) >= DECK_Y && (t.y as number) <= DECK_MAX))
    && (t.v === undefined || t.v === TERMINAL_VERSION);
}

/** Hacia dónde mira el muelle (hacia el mar). */
export function seaward(site: TerminalSite): [number, number] {
  return site.rotation === 0 ? [0, 1] : site.rotation === 1 ? [-1, 0] : site.rotation === 2 ? [0, -1] : [1, 0];
}

export interface TerminalSite {
  /** Esquina del solar ya girado y giro (cuartos de vuelta). */
  x: number;
  z: number;
  rotation: number;
  /** Altura de la tarima (v5.0.1). Las terminales de antes no la tienen y están a DECK_Y. */
  y?: number;
  /** Versión del edificio (v5.3): 2 es la terminal nueva; sin ella, la de antes. */
  v?: number;
}

/** La tarima más alta: si la playa sube mucho, la terminal no se sube más (se rebaja la tierra de alrededor). */
export const DECK_MAX = SEA_LEVEL + 3;

/** Altura de la tarima de una terminal. */
export function deckOf(site: TerminalSite): number {
  return site.y ?? DECK_Y;
}

/** Giro para que el muelle (+z de la plantilla) mire hacia (dx, dz), redondeando al eje más cercano. */
export function rotationFacing(dx: number, dz: number): number {
  if (Math.abs(dz) >= Math.abs(dx)) return dz >= 0 ? 0 : 2;
  return dx >= 0 ? 3 : 1;
}

/** Casilla de la plantilla (x, z) en el mundo, con el solar ya colocado. */
export function terminalCell(site: TerminalSite, x: number, y: number, z: number): Cell {
  const [rx, rz] = rotateCell(x, z, W, D, site.rotation);
  return [site.x + rx, deckOf(site) + y, site.z + rz];
}

/** Punto (con decimales) de la plantilla en el mundo. */
export function terminalPoint(site: TerminalSite, x: number, z: number): [number, number] {
  // Se gira como una casilla y luego se suma la parte decimal en la dirección que toca.
  const [cx, cz] = rotateCell(Math.floor(x), Math.floor(z), W, D, site.rotation);
  const fx = x - Math.floor(x);
  const fz = z - Math.floor(z);
  const r = ((site.rotation % 4) + 4) % 4;
  const [ox, oz] = r === 0 ? [fx, fz] : r === 1 ? [1 - fz, fx] : r === 2 ? [1 - fx, 1 - fz] : [fz, 1 - fx];
  return [site.x + cx + ox, site.z + cz + oz];
}

/**
 * Busca dónde poner la terminal en la playa de la avioneta: con la sala sobre la orilla y el muelle sobre el
 * agua. Prueba a correrla un poco hacia tierra o hacia el mar y se queda con la que menos terreno pisa.
 */
export function findTerminalSite(world: BuildWorld, airport: { x: number; z: number; dx: number; dz: number }): TerminalSite {
  const rotation = rotationFacing(airport.dx, airport.dz);
  const [sx, sz] = rotation === 0 ? [0, 1] : rotation === 1 ? [-1, 0] : rotation === 2 ? [0, -1] : [1, 0];
  let best: TerminalSite | null = null;
  let bestScore = Infinity;
  for (let shift = -3; shift <= 3; shift++) {
    // La puerta del muelle (z = HALL) cae en la casilla de la playa corrida `shift` hacia el mar.
    const [ax, az] = [airport.x + sx * shift, airport.z + sz * shift];
    const [rx, rz] = rotateCell(4, HALL, W, D, rotation);
    const site = { x: ax - rx, z: az - rz, rotation };
    let score = 0;
    for (let z = 0; z < D; z++) {
      for (let x = 0; x < W; x++) {
        const [cx, , cz] = terminalCell(site, x, 0, z);
        const ground = world.heightAt(cx, cz);
        // Tierra por encima del suelo: hay que cavarla (malo). El muelle sobre tierra: no llega al agua (peor).
        score += Math.max(0, ground - DECK_Y) * 3;
        if (z > HALL && ground >= DECK_Y) score += 4;
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

/**
 * Altura a la que va la tarima (v5.0.1): a ras de la tierra que hay junto a la puerta de la playa, para que la sala
 * no quede hundida cuando la playa sube un poco. Nunca por debajo de DECK_Y ni por encima de DECK_MAX.
 */
export function terminalDeckFor(world: BuildWorld, site: TerminalSite): number {
  let top = DECK_Y;
  for (let x = 2; x <= 6; x++) {
    for (const z of [-1, -2]) {
      const [cx, , cz] = terminalCell({ ...site, y: DECK_Y }, x, 0, z);
      top = Math.max(top, world.heightAt(cx, cz));
    }
  }
  return Math.min(DECK_MAX, top);
}

/** Quita una terminal ya construida (para volver a levantarla a otra altura, v5.0.1). */
export function eraseTerminal(world: BuildWorld, site: TerminalSite) {
  const deck = deckOf(site);
  for (const [x, y, z, b] of templateCells(terminalTemplate(site), site.rotation)) {
    if (b === null) continue;
    const at = [site.x + x, deck + y, site.z + z] as const;
    if (world.getBlock(...at) === b) world.setBlock(...at, Block.Air);
  }
}

/** Construye la terminal: pilotes hasta el fondo, la tarima, la sala, el muelle y el faro. */
export function buildTerminal(world: BuildWorld, site: TerminalSite) {
  const t = terminalTemplate(site);
  const [w, , d] = templateSize(t);
  const deck = deckOf(site);
  for (let z = 0; z < d; z++) {
    for (let x = 0; x < w; x++) {
      if (t.layers[0][z][x] === ' ') continue;
      const [cx, , cz] = terminalCell(site, x, 0, z);
      // Pilotes en las esquinas de la sala y a lo largo del muelle; bajo lo demás, arena si debajo hay tierra.
      const pillar = (x === 0 || x === w - 1 || x === 3 || x === 5) && z % 3 === 0;
      let floor = deck - 1;
      while (floor > 0 && world.getBlock(cx, floor, cz) === Block.Air) floor--;
      const overWater = isWater(world.getBlock(cx, floor, cz));
      for (let y = deck - 1; y > 0; y--) {
        const b = world.getBlock(cx, y, cz);
        if (isSolid(b) && !isWater(b)) break;
        if (pillar) world.setBlock(cx, y, cz, Block.BridgePillar);
        else if (!overWater && !isWater(b)) world.setBlock(cx, y, cz, Block.Sand);
        else if (isWater(b)) break;
      }
      // Lo que hubiera por encima de la tarima donde la plantilla no pone nada (arena, hierba, flores) se quita.
      for (let y = deck + 1; y < deck + t.layers.length; y++) {
        const free = (t.layers[y - deck][z]?.[x] ?? ' ') === ' ';
        const b = world.getBlock(cx, y, cz);
        if (free && b !== Block.Air && !isWater(b)) world.setBlock(cx, y, cz, Block.Air);
      }
    }
  }
  for (const [x, y, z, b] of templateCells(t, site.rotation)) {
    if (b === null) continue;
    const at = [site.x + x, deck + y, site.z + z] as const;
    if (world.getBlock(...at) !== b) world.setBlock(...at, b);
  }
}

/**
 * Despeja la tierra que tapa la terminal (v5.0.1): si la playa sube detrás de la sala, la puerta quedaba enterrada.
 * Rebaja a la altura de la tarima un margen de dos bloques alrededor de la sala y abre una bajada de tres de ancho
 * desde la puerta de la playa, un escalón cada dos bloques. No toca lo que haya construido el jugador.
 * Se puede llamar en cada carga: lo ya despejado no se vuelve a tocar.
 */
export function clearTerminalSurroundings(world: BuildWorld, site: TerminalSite): number {
  const MARGIN = 2;
  const DECK = deckOf(site);
  const PATH = 10;
  let changed = 0;
  for (let z = -PATH; z <= HALL; z++) {
    for (let x = -MARGIN; x < W + MARGIN; x++) {
      if (x >= 0 && x < W && z >= 0) continue; // la sala
      const path = x >= 3 && x <= 5 && z < 0;
      const d = Math.max(x < 0 ? -x : x >= W ? x - W + 1 : 0, z < 0 ? -z : 0);
      if (!path && d > MARGIN) continue;
      // Altura hasta la que se deja tierra: a ras de la tarima cerca de la sala y subiendo poco a poco por la bajada.
      const top = DECK + (path ? Math.max(0, Math.floor((d - MARGIN + 1) / 2)) : 0);
      const [cx, , cz] = terminalCell(site, x, 0, z);
      if (world.plotAt?.(cx, cz, 0)) continue;
      let cut = false;
      for (let y = DECK + 10; y > top; y--) {
        const b = world.getBlock(cx, y, cz);
        if (b === Block.Air || isWater(b) || world.isEdited?.(cx, y, cz)) continue;
        world.setBlock(cx, y, cz, Block.Air);
        changed++;
        cut = true;
      }
      // La tierra que queda al aire vuelve a tener hierba.
      if (cut && world.getBlock(cx, top, cz) === Block.Dirt) world.setBlock(cx, top, cz, Block.Grass);
    }
  }
  return changed;
}
