import { Block, LEAF_BLOCKS } from './blocks';

interface BlockSource {
  getBlock(x: number, y: number, z: number): number;
}

/** Tronco de árbol frutal más cercano, para saber qué árbol se ha sacudido. */
export function findTrunk(world: BlockSource, x: number, y: number, z: number) {
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

/** Un bloque de un árbol, relativo a la base del tronco: [dx, dy, dz, bloque, sustituye lo que haya]. */
export type TreeBlock = [number, number, number, Block, boolean];

/** Sitios bajo la copa donde cuelga la fruta. */
const FRUIT_SPOTS = [[-1, -2], [2, 0], [0, 2], [-2, 1], [1, -1]];

/** Árbol frutal: tronco de 4, copa redonda y tres frutas colgando. `start` elige dónde van las frutas (0 a 1). */
export function fruitTreeShape(fruit: Block, start: number): TreeBlock[] {
  const out: TreeBlock[] = [];
  const top = 4;
  for (let y = top - 2; y <= top + 1; y++) {
    const r = y >= top ? 1 : 2;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        out.push([dx, y, dz, Block.Leaves, false]);
      }
    }
  }
  const first = Math.floor(start * FRUIT_SPOTS.length);
  for (let i = 0; i < 3; i++) {
    const [dx, dz] = FRUIT_SPOTS[(first + i) % FRUIT_SPOTS.length];
    out.push([dx, top - 3, dz, fruit, false]);
  }
  for (let y = 0; y < top; y++) out.push([0, y, 0, Block.Log, true]);
  return out;
}

/** Palmera: tronco de 5, hojas en cruz y dos cocos. */
export function palmShape(): TreeBlock[] {
  const top = 5;
  const out: TreeBlock[] = [];
  for (let y = 0; y < top; y++) out.push([0, y, 0, Block.PalmLog, true]);
  out.push([0, top, 0, Block.PalmLeaves, true]);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    out.push([dx, top, dz, Block.PalmLeaves, false]);
    out.push([dx * 2, top - 1, dz * 2, Block.PalmLeaves, false]);
  }
  out.push([1, top - 1, 1, Block.Coconut, false]);
  out.push([-1, top - 1, 0, Block.Coconut, false]);
  return out;
}

/** Pino: tronco de 6 y copa en cono, más estrecha arriba. No da fruta. */
export function pineShape(): TreeBlock[] {
  const out: TreeBlock[] = [];
  const top = 6;
  // Por capas: [altura, alcance de las hojas medido en pasos].
  for (const [y, reach] of [[2, 3], [3, 2], [4, 2], [5, 1], [6, 1], [7, 0]]) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dz) > reach || (y < top && !dx && !dz)) continue;
        out.push([dx, y, dz, Block.PineLeaves, false]);
      }
    }
  }
  for (let y = 0; y < top; y++) out.push([0, y, 0, Block.Log, true]);
  return out;
}

// --- Árboles de los climas (v4.19) ---

/** Capa redonda de hojas de radio r a la altura y (sin las esquinas si es grande). */
function disc(out: TreeBlock[], y: number, r: number, leaf: Block, corners = r < 2) {
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      if (!corners && Math.abs(dx) === r && Math.abs(dz) === r) continue;
      out.push([dx, y, dz, leaf, false]);
    }
  }
}

/** Acacia de la sabana: tronco torcido y copa plana y ancha. `lean` (0 a 3) elige hacia dónde se inclina. */
export function acaciaShape(lean = 0): TreeBlock[] {
  const [sx, sz] = [[1, 0], [0, 1], [-1, 0], [0, -1]][lean % 4];
  const out: TreeBlock[] = [];
  disc(out, 5, 3, Block.AcaciaLeaves);
  disc(out, 6, 1, Block.AcaciaLeaves, true);
  for (const [dx, dy, dz] of [[0, 0, 0], [0, 1, 0], [0, 2, 0], [sx, 3, sz], [sx, 4, sz]]) out.push([dx, dy, dz, Block.Log, true]);
  return out.map(([dx, dy, dz, b, r]) => (dy >= 5 ? [dx + sx, dy, dz + sz, b, r] : [dx, dy, dz, b, r]));
}

/** Ceiba de la selva: muy alta, con dos copas y lianas que cuelgan. */
export function ceibaShape(): TreeBlock[] {
  const out: TreeBlock[] = [];
  const top = 9;
  disc(out, 4, 2, Block.JungleLeaves);
  disc(out, top - 1, 3, Block.JungleLeaves);
  disc(out, top, 2, Block.JungleLeaves);
  disc(out, top + 1, 1, Block.JungleLeaves, true);
  for (const [dx, dz, len] of [[3, 0, 3], [-3, 1, 2], [0, -3, 3], [1, 3, 2], [-2, -2, 2]]) {
    for (let k = 1; k <= len; k++) out.push([dx, top - 1 - k, dz, Block.Vine, false]);
  }
  for (let y = 0; y < top; y++) out.push([0, y, 0, Block.Log, true]);
  return out;
}

/** Cerezo en flor: copa rosa y redonda, más ancha que alta. */
export function blossomShape(): TreeBlock[] {
  const out: TreeBlock[] = [];
  disc(out, 3, 2, Block.CherryLeaves);
  disc(out, 4, 3, Block.CherryLeaves);
  disc(out, 5, 2, Block.CherryLeaves);
  for (let y = 0; y < 4; y++) out.push([0, y, 0, Block.Log, true]);
  return out;
}

/** Sauce del pantano: copa ancha con ramas que caen casi hasta el suelo. */
export function willowShape(): TreeBlock[] {
  const out: TreeBlock[] = [];
  disc(out, 5, 3, Block.WillowLeaves);
  disc(out, 6, 2, Block.WillowLeaves);
  for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, -2], [2, -2], [-2, 2]]) {
    for (let y = 2; y < 5; y++) out.push([dx, y, dz, Block.WillowLeaves, false]);
  }
  for (let y = 0; y < 5; y++) out.push([0, y, 0, Block.Log, true]);
  return out;
}

/** Árbol luminoso del bosque bioluminiscente (v4.20): copa redonda de hojas que brillan, con ramas que cuelgan. */
export function glowShape(): TreeBlock[] {
  const out: TreeBlock[] = [];
  disc(out, 5, 2, Block.GlowLeaves);
  disc(out, 6, 2, Block.GlowLeaves);
  disc(out, 7, 1, Block.GlowLeaves, true);
  for (const [dx, dz, len] of [[2, 0, 3], [-2, 0, 2], [0, 2, 3], [0, -2, 2], [2, 2, 2], [-2, -2, 3]]) {
    for (let k = 1; k <= len; k++) out.push([dx, 5 - k, dz, Block.GlowLeaves, false]);
  }
  for (let y = 0; y < 6; y++) out.push([0, y, 0, Block.Log, true]);
  return out;
}

/** Abeto nevado: como el pino, más alto y con nieve en las ramas. */
export function firShape(): TreeBlock[] {
  return pineShape().flatMap(([dx, dy, dz, b, r]): TreeBlock[] => (b === Block.PineLeaves ? [[dx, dy + 1, dz, Block.SnowLeaves, r]] : dy === 5 ? [[dx, dy, dz, b, r], [dx, dy + 1, dz, b, r]] : [[dx, dy, dz, b, r]]));
}

// --- Árboles de Maxycraft (v5.9) ---
// Árboles con su propia forma, para no parecerse a los de Minecraft: copas redondeadas hechas de bolas que se
// juntan, troncos que se tuercen un poco y alturas muy distintas de un árbol a otro. Todos caben en 4 bloques
// alrededor del tronco (lo que el mundo mira de los trozos vecinos) y con el tronco dentro de la copa, para que al
// talarlos caiga el árbol entero y al sacudirlos se encuentre la fruta.

/** Azar sencillo a partir de un número de 0 a 1 (cada árbol tiene el suyo): da otro número de 0 a 1 por cada `i`. */
function pick(rand: number, i: number): number {
  const v = Math.sin((rand * 1000 + i * 12.9898) * 43.758) * 43758.5453;
  return v - Math.floor(v);
}

/** Bola de hojas aplastada (más ancha que alta) centrada en (cx, cy, cz), con el borde algo mordido. */
function blob(out: TreeBlock[], cx: number, cy: number, cz: number, rx: number, ry: number, leaf: Block, rand: number) {
  const R = Math.ceil(rx);
  const H = Math.ceil(ry);
  for (let dy = -H; dy <= H; dy++) {
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const d = (dx * dx + dz * dz) / (rx * rx) + (dy * dy) / (ry * ry);
        if (d > 1.05) continue;
        // El borde se muerde un poco al azar: así no salen bolas perfectas.
        if (d > 0.7 && pick(rand, (dx + 7) * 131 + (dy + 7) * 17 + (dz + 7)) < 0.28) continue;
        out.push([cx + dx, cy + dy, cz + dz, leaf, false]);
      }
    }
  }
}

/** Línea de tronco de (x0, y0, z0) a (x1, y1, z1), bloque a bloque y siempre unido por las caras. */
function limb(out: TreeBlock[], from: [number, number, number], to: [number, number, number], log: Block) {
  let [x, y, z] = from;
  out.push([x, y, z, log, true]);
  while (x !== to[0] || y !== to[1] || z !== to[2]) {
    // Se avanza por el eje que más falta, de uno en uno, para que los bloques se toquen por una cara.
    const gaps = [Math.abs(to[0] - x), Math.abs(to[1] - y), Math.abs(to[2] - z)];
    const axis = gaps.indexOf(Math.max(...gaps));
    if (axis === 0) x += Math.sign(to[0] - x);
    else if (axis === 1) y += Math.sign(to[1] - y);
    else z += Math.sign(to[2] - z);
    out.push([x, y, z, log, true]);
  }
}

/** Fruta colgando bajo la copa, cerca del tronco (a 2 bloques como mucho), donde la encuentra la sacudida. */
function hangFruit(out: TreeBlock[], fruit: Block, y: number, start: number, cx = 0, cz = 0) {
  const first = Math.floor(start * FRUIT_SPOTS.length);
  for (let i = 0; i < 3; i++) {
    const [dx, dz] = FRUIT_SPOTS[(first + i) % FRUIT_SPOTS.length];
    out.push([cx + dx, y, cz + dz, fruit, false]);
  }
}

/** Quita los bloques repetidos (el último manda) para no dibujar dos veces lo mismo. */
function tidy(out: TreeBlock[]): TreeBlock[] {
  const seen = new Map<string, TreeBlock>();
  for (const b of out) {
    const k = `${b[0]},${b[1]},${b[2]}`;
    const prev = seen.get(k);
    // Un tronco nunca lo tapa una hoja.
    if (prev && prev[4] && !b[4]) continue;
    seen.set(k, b);
  }
  return [...seen.values()];
}

/**
 * Árbol nube (el frutal de Maxycraft): tronco de 3 a 7 que a veces se tuerce a media altura y una copa de dos o
 * tres bolas redondas que se juntan, como una nube. La fruta cuelga por debajo. `rand` (0 a 1) lo decide todo.
 */
export function cloudTreeShape(fruit: Block | null, rand: number): TreeBlock[] {
  const out: TreeBlock[] = [];
  const trunk = 3 + Math.floor(pick(rand, 1) * 5);
  // Torcido: a media altura el tronco se va un bloque hacia un lado.
  const bend = pick(rand, 2) < 0.55 && trunk >= 4;
  const [bx, bz] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(pick(rand, 3) * 4)];
  const mid = Math.floor(trunk / 2);
  const top: [number, number, number] = bend ? [bx, trunk, bz] : [0, trunk, 0];
  if (bend) {
    limb(out, [0, 0, 0], [0, mid, 0], Block.Log);
    limb(out, [bx, mid, bz], top, Block.Log);
  } else limb(out, [0, 0, 0], top, Block.Log);
  const big = 2.3 + pick(rand, 4) * 0.8;
  blob(out, top[0], trunk + 1, top[2], big, 1.9, Block.Leaves, rand);
  // Una o dos bolas más pequeñas a los lados, un poco más bajas, con su rama.
  const extra = 1 + Math.floor(pick(rand, 5) * 2);
  for (let i = 0; i < extra; i++) {
    const a = pick(rand, 6 + i) * Math.PI * 2;
    const ox = top[0] + Math.round(Math.cos(a) * 2);
    const oz = top[2] + Math.round(Math.sin(a) * 2);
    const oy = trunk - (pick(rand, 8 + i) < 0.5 ? 1 : 0);
    limb(out, [top[0], oy - 1, top[2]], [ox, oy, oz], Block.Log);
    blob(out, ox, oy + 1, oz, 1.7, 1.4, Block.Leaves, rand + i * 0.37);
  }
  if (fruit) hangFruit(out, fruit, trunk - 1, pick(rand, 10), top[0], top[2]);
  return tidy(out);
}

/**
 * Álamo: muy alto y estrecho, de 9 a 13 bloques, con la copa en forma de llama (ancha abajo, en punta arriba).
 * Se ve de lejos y le da altura al bosque.
 */
export function poplarShape(rand: number): TreeBlock[] {
  const out: TreeBlock[] = [];
  const tall = 8 + Math.floor(pick(rand, 1) * 5);
  const start = 2 + Math.floor(pick(rand, 2) * 2);
  for (let y = start; y <= tall; y++) {
    // De 0 (abajo) a 1 (arriba): el radio crece un poco y luego se cierra en punta.
    const t = (y - start) / (tall - start);
    const r = t < 0.35 ? 1.3 + t * 2 : (2 * (1 - t)) / 0.65 + 0.5;
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        const d = Math.hypot(dx, dz);
        if (d > r) continue;
        if (d > 1 && d > r - 0.5 && pick(rand, y * 25 + (dx + 2) * 5 + dz + 2) < 0.25) continue;
        out.push([dx, y, dz, Block.Leaves, false]);
      }
    }
  }
  out.push([0, tall + 1, 0, Block.Leaves, false]);
  limb(out, [0, 0, 0], [0, tall - 2, 0], Block.Log);
  return tidy(out);
}

/**
 * Pino de pisos: de 2 a 4 faldas de ramas separadas, más anchas abajo, con las puntas un poco caídas y el tronco
 * a la vista entre una y otra, como un abeto de cuento. De 9 a 15 bloques de alto.
 */
export function tieredPineShape(rand: number, leaf: Block = Block.PineLeaves): TreeBlock[] {
  const out: TreeBlock[] = [];
  const tiers = 2 + Math.floor(pick(rand, 1) * 3);
  const step = tiers >= 4 ? 3 : 4;
  let y = 2 + Math.floor(pick(rand, 3) * 2);
  for (let i = 0; i < tiers; i++) {
    const r = 1.6 + (tiers - 1 - i) * 0.75;
    // La falda: un disco con el borde un bloque más abajo (si es ancha) y encima discos cada vez más estrechos.
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        const d = Math.hypot(dx, dz);
        if (d > r) continue;
        const rim = d > r - 0.8;
        out.push([dx, rim && r >= 2 ? y - 1 : y, dz, leaf, false]);
        if (d <= r - 1) out.push([dx, y + 1, dz, leaf, false]);
        if (d <= r - 2) out.push([dx, y + 2, dz, leaf, false]);
      }
    }
    if (i < tiers - 1) y += step;
  }
  // La punta, encima de la última falda.
  out.push([0, y + 1, 0, leaf, false], [0, y + 2, 0, leaf, false]);
  limb(out, [0, 0, 0], [0, y, 0], Block.Log);
  return tidy(out);
}

/**
 * Roble ancho: el árbol grande del bosque. Tronco grueso con raíces que asoman, se abre en tres o cuatro ramas
 * gordas y cada una lleva su copa redonda: más ancho que alto, una sombrilla para descansar debajo.
 */
export function broadOakShape(fruit: Block | null, rand: number): TreeBlock[] {
  const out: TreeBlock[] = [];
  const trunk = 4 + Math.floor(pick(rand, 1) * 3);
  // Tronco de 2 x 2 y raíces.
  for (const [x, z] of [[0, 0], [1, 0], [0, 1], [1, 1]]) limb(out, [x, 0, z], [x, trunk, z], Block.Log);
  for (const [x, z] of [[-1, 0], [2, 1], [1, -1], [0, 2]]) if (pick(rand, 2 + x * 3 + z) < 0.7) out.push([x, 0, z, Block.Log, true]);
  const arms = 3 + Math.floor(pick(rand, 3) * 2);
  const turn = pick(rand, 4) * Math.PI * 2;
  for (let i = 0; i < arms; i++) {
    const a = turn + (i / arms) * Math.PI * 2;
    const ex = Math.round(0.5 + Math.cos(a) * 2.6);
    const ez = Math.round(0.5 + Math.sin(a) * 2.6);
    const ey = trunk + 1 + Math.floor(pick(rand, 5 + i) * 2);
    limb(out, [Math.max(0, Math.min(1, ex)), trunk, Math.max(0, Math.min(1, ez))], [ex, ey, ez], Block.Log);
    blob(out, ex, ey + 1, ez, 1.9 + pick(rand, 9 + i) * 0.5, 1.5, Block.Leaves, rand + i * 0.21);
  }
  blob(out, 0.5 as number, trunk + 3, 0.5 as number, 2.2, 1.4, Block.Leaves, rand + 0.9);
  if (fruit) hangFruit(out, fruit, trunk, pick(rand, 10), 0, 0);
  return tidy(out.map(([x, y, z, b, r]): TreeBlock => [Math.round(x), y, Math.round(z), b, r]));
}

/** Arbusto: una mata redonda de hojas de uno o dos bloques de alto, sin tronco, para rellenar entre los árboles. */
export function bushShape(rand: number): TreeBlock[] {
  const out: TreeBlock[] = [];
  const r = 1 + pick(rand, 1) * 0.8;
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > r) continue;
      out.push([dx, 0, dz, Block.Leaves, false]);
      if (d < r - 0.7 && pick(rand, (dx + 2) * 5 + dz + 2) < 0.8) out.push([dx, 1, dz, Block.Leaves, false]);
    }
  }
  return out;
}

/**
 * El mismo árbol pero `extra` bloques más alto: todo lo que está por encima del arranque de la copa sube y el
 * tronco crece lo que falta. Sirve para que los árboles de los climas (cerezos, sauces, palmeras…) no sean
 * todos de la misma altura. El tronco tiene que empezar en (0, 0, 0).
 */
export function taller(shape: TreeBlock[], extra: number): TreeBlock[] {
  if (extra <= 0) return shape;
  const trunk = shape.find(([x, y, z]) => !x && !y && !z)?.[3];
  if (trunk === undefined) return shape;
  const cut = Math.min(...shape.filter((b) => b[3] !== trunk).map((b) => b[1]));
  const out: TreeBlock[] = shape.map(([x, y, z, b, r]) => (y >= cut ? [x, y + extra, z, b, r] : [x, y, z, b, r]));
  for (let y = cut; y < cut + extra; y++) out.push([0, y, 0, trunk, true]);
  return out;
}

const LOGS: ReadonlySet<number> = new Set([Block.Log, Block.PalmLog]);
const CROWN: ReadonlySet<number> = new Set([...LEAF_BLOCKS, Block.Vine, Block.Coconut, Block.Apple, Block.Orange, Block.Pear, Block.Peach, Block.Cherry]);
const FRUIT_BLOCKS: ReadonlySet<number> = new Set([Block.Coconut, Block.Apple, Block.Orange, Block.Pear, Block.Peach, Block.Cherry]);

export interface Felled {
  /** Troncos por encima del que se ha roto (incluido). */
  logs: [number, number, number, number][];
  leaves: [number, number, number, number][];
  fruits: [number, number, number, number][];
}

/**
 * Lo que cae al talar un árbol desde el tronco (x, y, z): los troncos de ese bloque hacia arriba
 * y la copa que cuelga de ellos. Lo de debajo (el tocón) se queda. Las hojas de un árbol vecino
 * que estén más cerca de otro tronco no se tocan.
 */
export function fellTree(world: BlockSource, x: number, y: number, z: number): Felled {
  const out: Felled = { logs: [], leaves: [], fruits: [] };
  const start = world.getBlock(x, y, z);
  if (!LOGS.has(start)) return out;
  const seen = new Set<string>();
  const k = (a: number, b: number, c: number) => `${a},${b},${c}`;

  // Troncos conectados, sin bajar del bloque roto.
  const stack: [number, number, number][] = [[x, y, z]];
  seen.add(k(x, y, z));
  while (stack.length && out.logs.length < 64) {
    const [cx, cy, cz] = stack.pop()!;
    out.logs.push([cx, cy, cz, world.getBlock(cx, cy, cz)]);
    for (const [dx, dy, dz] of [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
      const [nx, ny, nz] = [cx + dx, cy + dy, cz + dz];
      if (ny < y || seen.has(k(nx, ny, nz)) || !LOGS.has(world.getBlock(nx, ny, nz))) continue;
      seen.add(k(nx, ny, nz));
      stack.push([nx, ny, nz]);
    }
  }
  const ours = new Set(out.logs.map(([a, b, c]) => k(a, b, c)));

  // ¿Hay otro tronco (que no cae) más cerca de este bloque de copa que los nuestros?
  const closerToOther = (lx: number, ly: number, lz: number, mine: number) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -mine + 1; dz < mine; dz++) {
        for (let dx = -mine + 1; dx < mine; dx++) {
          if (Math.abs(dx) + Math.abs(dz) >= mine) continue;
          const [ox, oy, oz] = [lx + dx, ly + dy, lz + dz];
          if (!ours.has(k(ox, oy, oz)) && LOGS.has(world.getBlock(ox, oy, oz))) return true;
        }
      }
    }
    return false;
  };

  // La copa: bloques de hoja o fruta a poca distancia de nuestros troncos.
  for (const [lx, ly, lz] of out.logs) {
    for (let dy = -2; dy <= 3; dy++) {
      for (let dz = -3; dz <= 3; dz++) {
        for (let dx = -3; dx <= 3; dx++) {
          const [cx, cy, cz] = [lx + dx, ly + dy, lz + dz];
          if (cy < y - 1 || seen.has(k(cx, cy, cz))) continue;
          const b = world.getBlock(cx, cy, cz);
          if (!CROWN.has(b)) continue;
          const mine = Math.abs(dx) + Math.abs(dz);
          if (closerToOther(cx, cy, cz, mine)) continue;
          seen.add(k(cx, cy, cz));
          (FRUIT_BLOCKS.has(b) ? out.fruits : out.leaves).push([cx, cy, cz, b]);
        }
      }
    }
  }
  return out;
}
