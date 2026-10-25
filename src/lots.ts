import * as THREE from 'three';
import { BLOCKS, Block, isDoor, isFullBlock } from './blocks';
import type { Plot } from './world';

/**
 * Solares (v2.10): el jugador marca un sitio con un plano de casa y la construye bloque a bloque.
 * Cuando la casa está completa queda libre, a la espera de un vecino que hay que ir a buscar a una isla misteriosa.
 */
export interface Lot {
  /** Centro de la casa y altura del suelo. */
  x: number;
  y: number;
  z: number;
  /** Hacia dónde mira la puerta: 0 +z, 1 +x, 2 -z, 3 -x. */
  dir: number;
  /** La casa está terminada (y se queda así aunque luego viva alguien y la decore). */
  done?: boolean;
}

/** Qué va en cada casilla del plano. */
export type PlanPart = 'floor' | 'wall' | 'door' | 'roof' | 'inside';

export interface PlanCell {
  x: number;
  y: number;
  z: number;
  part: PlanPart;
}

/** Cuántos solares se pueden tener a la vez. */
export const MAX_LOTS = 8;
/** Medio lado de la casa del plano (5x5). */
const HALF = 2;

/** Gira (dx, dz) para que el frente del plano (+z) mire hacia `dir`. */
export function rotate(dx: number, dz: number, dir: number): [number, number] {
  switch (dir & 3) {
    // + 0 para que no salga -0.
    case 1: return [dz, -dx + 0];
    case 2: return [-dx + 0, -dz + 0];
    case 3: return [-dz + 0, dx];
    default: return [dx, dz];
  }
}

/** Casa de 5x5: suelo, paredes de 3 de alto con la puerta delante, tejado plano encima y el interior despejado. */
export function lotPlan(lot: Lot): PlanCell[] {
  const cells: PlanCell[] = [];
  const add = (dx: number, h: number, dz: number, part: PlanPart) => {
    const [rx, rz] = rotate(dx, dz, lot.dir);
    cells.push({ x: lot.x + rx, y: lot.y + h, z: lot.z + rz, part });
  };
  for (let dz = -HALF; dz <= HALF; dz++) {
    for (let dx = -HALF; dx <= HALF; dx++) {
      add(dx, 0, dz, 'floor');
      const edge = Math.abs(dx) === HALF || Math.abs(dz) === HALF;
      for (let h = 1; h <= 3; h++) add(dx, h, dz, !edge ? 'inside' : dx === 0 && dz === HALF && h <= 2 ? 'door' : 'wall');
      add(dx, 4, dz, 'roof');
    }
  }
  return cells;
}

const LEAVES = new Set<number>([Block.Leaves, Block.PalmLeaves, Block.PineLeaves]);

/** Si el bloque `b` vale para esa casilla del plano. Paredes y tejado admiten cualquier bloque de construcción, también cristal. */
export function fits(part: PlanPart, b: number): boolean {
  switch (part) {
    case 'door': return isDoor(b);
    case 'inside': return !isFullBlock(b);
    case 'floor': return isFullBlock(b);
    case 'wall': return isFullBlock(b) && !LEAVES.has(b);
    case 'roof': return b !== Block.Air && !LEAVES.has(b) && ['cube', 'slab', 'stairs'].includes(BLOCKS[b].shape);
  }
}

export interface LotProgress {
  /** Casillas que aún no están bien (bloques que faltan, o que sobran dentro). */
  missing: PlanCell[];
  /** Casillas que hay que llenar en total. */
  total: number;
}

export function lotProgress(lot: Lot, getBlock: (x: number, y: number, z: number) => number): LotProgress {
  const plan = lotPlan(lot);
  return {
    missing: plan.filter((c) => !fits(c.part, getBlock(c.x, c.y, c.z))),
    total: plan.filter((c) => c.part !== 'inside').length,
  };
}

/** Texto corto con lo que falta, para enseñarlo al lado del solar. */
export function describeMissing(missing: PlanCell[]): string {
  const count = (part: PlanPart) => missing.filter((c) => c.part === part).length;
  const parts: string[] = [];
  const floor = count('floor');
  const wall = count('wall');
  const door = count('door');
  const roof = count('roof');
  const inside = count('inside');
  if (floor) parts.push(`${floor} de suelo`);
  if (wall) parts.push(`${wall} de pared`);
  if (door) parts.push(door === 2 ? 'la puerta' : 'media puerta');
  if (roof) parts.push(`${roof} de tejado`);
  if (inside) parts.push(`quitar ${inside} de dentro`);
  return parts.join(', ');
}

/** Puerta y casilla de delante de la puerta, donde el vecino entra y sale. */
export function lotPlot(lot: Lot): Plot {
  const [fx, fz] = rotate(0, HALF + 1, lot.dir);
  return { kind: 'house', x: lot.x, z: lot.z, y: lot.y, roof: Block.RoofRed, door: [lot.x + fx, lot.y + 1, lot.z + fz], guest: true };
}

/** Si (x, z) está dentro del solar (con un margen). */
export function inLot(lot: Lot, x: number, z: number, margin = 0): boolean {
  return Math.abs(x - lot.x) <= HALF + margin && Math.abs(z - lot.z) <= HALF + margin;
}

/**
 * Dónde queda el solar si se marca desde el bloque (x, y, z) del suelo: la puerta da a ese bloque y la casa se
 * extiende hacia el otro lado, lejos del jugador que está en (px, pz).
 */
export function lotFrom(x: number, y: number, z: number, px: number, pz: number): Lot {
  const ddx = px - (x + 0.5);
  const ddz = pz - (z + 0.5);
  const dir = Math.abs(ddz) >= Math.abs(ddx) ? (ddz > 0 ? 0 : 2) : ddx > 0 ? 1 : 3;
  const [fx, fz] = rotate(0, HALF + 1, dir);
  return { x: x - fx, y, z: z - fz, dir };
}

/** Por qué no se puede poner ahí el solar, o null si se puede. */
export function lotProblem(
  lot: Lot,
  getBlock: (x: number, y: number, z: number) => number,
  others: { plots: Plot[]; lots: Lot[] },
): string | null {
  if (others.lots.length >= MAX_LOTS) return `Ya tienes ${MAX_LOTS} planos marcados`;
  if (others.plots.some((p) => Math.abs(p.x - lot.x) < 10 && Math.abs(p.z - lot.z) < 10)) return 'Está demasiado cerca de otra casa';
  if (others.lots.some((l) => Math.abs(l.x - lot.x) < 7 && Math.abs(l.z - lot.z) < 7)) return 'Está demasiado cerca de otro plano';
  for (let dz = -HALF; dz <= HALF; dz++) {
    for (let dx = -HALF; dx <= HALF; dx++) {
      // El suelo tiene que ser firme: se admite algún hoyo de un bloque, que se rellena.
      if (!isFullBlock(getBlock(lot.x + dx, lot.y, lot.z + dz)) && !isFullBlock(getBlock(lot.x + dx, lot.y - 1, lot.z + dz))) {
        return 'El suelo tiene que ser llano y firme';
      }
    }
  }
  return null;
}

const COLORS: Record<PlanPart, number> = { floor: 0xc8a070, wall: 0x9fd4ff, door: 0xffb347, roof: 0xff7a7a, inside: 0xff4040 };

/** Bloques fantasma con lo que falta de cada plano. */
export class LotGhosts {
  readonly group = new THREE.Group();
  private mesh: THREE.InstancedMesh | null = null;
  private material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.32, depthWrite: false, vertexColors: false });
  private geometry = new THREE.BoxGeometry(1.002, 1.002, 1.002);

  show(cells: PlanCell[]) {
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.dispose();
      this.mesh = null;
    }
    if (!cells.length) return;
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, cells.length);
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    cells.forEach((c, i) => {
      // Lo que sobra dentro se marca algo más grande, para que se vea por fuera del bloque.
      const s = c.part === 'inside' ? 1.06 : 0.9;
      m.makeScale(s, s, s).setPosition(c.x + 0.5, c.y + 0.5, c.z + 0.5);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.setHex(COLORS[c.part]));
    });
    mesh.renderOrder = 2;
    this.mesh = mesh;
    this.group.add(mesh);
  }
}
