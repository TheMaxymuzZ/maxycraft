import { Block, flowingWater, isSolid, isWater, isWaterSource, waterLevel } from './blocks';

/**
 * Física del agua (v3.8), con las mismas reglas que Minecraft:
 * - El agua quieta (fuente) no se acaba nunca. El agua que corre baja un nivel por bloque (de 1 a 7) y luego se para.
 * - Primero cae: si debajo hay hueco, el agua baja como agua que cae, y al llegar al suelo se vuelve a extender.
 * - Hacia los lados va por el camino más corto a un desnivel (mira hasta 4 bloques), como hace Minecraft.
 * - Si quitas la fuente, el agua que corría se va secando poco a poco.
 * - Fuente infinita: un hueco con dos fuentes al lado y suelo firme debajo se convierte en fuente.
 * El agua solo cambia cuando algo cambia a su lado (no se recalcula todo el mar), en pasos de un cuarto de segundo.
 */

export interface FluidWorld {
  getBlock(x: number, y: number, z: number): number;
  /** Cambia un bloque (en una partida con amigos, para todos). */
  setBlock(x: number, y: number, z: number, b: Block): void;
  /** Si esa columna está cargada: el agua no corre hacia trozos de isla que aún no existen. */
  loaded(x: number, z: number): boolean;
}

/** Segundos entre dos pasos del agua (5 «ticks» de Minecraft). */
export const FLUID_STEP = 0.25;
/** Bloques de agua que se mueven como mucho en cada paso; el resto espera al siguiente. */
const MAX_PER_STEP = 3000;
/** Hasta dónde busca el agua un desnivel hacia el que correr. */
const SLOPE_FIND = 4;
const SIDES: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

export class Fluids {
  /** En una partida con amigos solo mueve el agua el anfitrión; a los demás les llegan los bloques. */
  enabled = true;
  private pending = new Map<string, [number, number, number]>();
  private timer = 0;

  constructor(private w: FluidWorld) {}

  /** Bloques de agua esperando a moverse. */
  get busy(): number {
    return this.pending.size;
  }

  /** Algo ha cambiado en (x, y, z): ese bloque y los de alrededor se revisan en el siguiente paso. */
  wake(x: number, y: number, z: number) {
    if (!this.enabled) return;
    this.add(x, y, z);
    this.add(x + 1, y, z);
    this.add(x - 1, y, z);
    this.add(x, y + 1, z);
    this.add(x, y - 1, z);
    this.add(x, y, z + 1);
    this.add(x, y, z - 1);
  }

  private add(x: number, y: number, z: number) {
    if (y < 0) return;
    this.pending.set(key(x, y, z), [x, y, z]);
  }

  update(dt: number) {
    if (!this.enabled) {
      this.pending.clear();
      return;
    }
    this.timer += dt;
    if (this.timer < FLUID_STEP) return;
    this.timer = 0;
    this.step();
  }

  /** Un paso del agua: cada bloque pendiente se mueve una vez. Lo que cambia ahora se mueve en el paso siguiente. */
  step() {
    if (!this.pending.size) return;
    const now = this.pending;
    this.pending = new Map();
    let n = 0;
    for (const [k, p] of now) {
      if (n++ >= MAX_PER_STEP) {
        this.pending.set(k, p);
        continue;
      }
      this.tick(p[0], p[1], p[2]);
    }
  }

  /** Lo que debería haber en un bloque de agua que no es fuente, según lo que tiene alrededor. */
  private desired(x: number, y: number, z: number): Block {
    if (isWater(this.w.getBlock(x, y + 1, z))) return Block.WaterFall;
    let min = 8;
    let sources = 0;
    for (const [dx, dz] of SIDES) {
      const n = this.w.getBlock(x + dx, y, z + dz);
      const level = waterLevel(n);
      if (level < 0) continue;
      if (isWaterSource(n)) sources++;
      min = Math.min(min, level);
    }
    const below = this.w.getBlock(x, y - 1, z);
    if (sources >= 2 && (isSolid(below) || isWaterSource(below))) return Block.Water;
    return min + 1 <= 7 ? flowingWater(min + 1) : Block.Air;
  }

  private tick(x: number, y: number, z: number) {
    // Sin mirar el bloque si su trozo aún no existe, que si no se crearía aquí.
    if (!this.w.loaded(x, z)) return;
    const b = this.w.getBlock(x, y, z);
    if (!isWater(b)) return;

    // El agua que corre o cae se recalcula: crece, se seca o se vuelve fuente. Si cambia, se volverá a mirar.
    if (!isWaterSource(b)) {
      const want = this.desired(x, y, z);
      if (want !== b) {
        this.w.setBlock(x, y, z, want);
        return;
      }
    }

    // Primero cae.
    const below = y > 0 ? this.w.getBlock(x, y - 1, z) : Block.Stone;
    if (y > 0 && canFill(below, Block.WaterFall)) this.w.setBlock(x, y - 1, z, Block.WaterFall);
    // Hacia los lados solo si es fuente o si debajo no puede seguir cayendo (suelo, o agua que ya está ahí).
    const canFall = y > 0 && (below === Block.Air || isWater(below));
    if (!isWaterSource(b) && canFall) return;
    const next = waterLevel(b) + 1;
    if (next > 7) return;
    const flow = flowingWater(next);
    for (const [dx, dz] of this.spreadSides(x, y, z)) {
      const nx = x + dx;
      const nz = z + dz;
      if (!this.w.loaded(nx, nz)) continue;
      if (canFill(this.w.getBlock(nx, y, nz), flow)) this.w.setBlock(nx, y, nz, flow);
    }
  }

  /** Hacia qué lados corre: hacia el desnivel más cercano (hasta 4 bloques); si no hay ninguno, hacia todos. */
  private spreadSides(x: number, y: number, z: number): [number, number][] {
    let best = Infinity;
    let sides: [number, number][] = [];
    for (const side of SIDES) {
      const nx = x + side[0];
      const nz = z + side[1];
      if (!passable(this.w.getBlock(nx, y, nz))) continue;
      const d = this.isHole(nx, y, nz) ? 0 : this.holeDistance(nx, y, nz, side, 1);
      if (d < best) {
        best = d;
        sides = [side];
      } else if (d === best) sides.push(side);
    }
    return sides;
  }

  /** El agua de (x, y, z) podría caer hacia abajo. */
  private isHole(x: number, y: number, z: number): boolean {
    if (y <= 0) return false;
    const below = this.w.getBlock(x, y - 1, z);
    return below === Block.Air || isWater(below);
  }

  /** Bloques hasta el desnivel más cercano desde (x, y, z), sin volver por donde ha venido; Infinity si no hay. */
  private holeDistance(x: number, y: number, z: number, from: [number, number], depth: number): number {
    if (depth > SLOPE_FIND) return Infinity;
    let best = Infinity;
    for (const side of SIDES) {
      if (side[0] === -from[0] && side[1] === -from[1]) continue;
      const nx = x + side[0];
      const nz = z + side[1];
      if (!passable(this.w.getBlock(nx, y, nz))) continue;
      if (this.isHole(nx, y, nz)) return depth;
      if (depth < SLOPE_FIND) best = Math.min(best, this.holeDistance(nx, y, nz, side, depth + 1));
    }
    return best;
  }
}

/** Por ahí puede pasar el agua: aire o agua que no es fuente. */
function passable(b: number): boolean {
  return b === Block.Air || (isWater(b) && !isWaterSource(b));
}

/** Se puede poner el agua `flow` en un bloque que tiene `b`: si está vacío o si tiene agua más floja. */
function canFill(b: number, flow: Block): boolean {
  if (b === Block.Air) return true;
  if (!isWater(b) || isWaterSource(b) || b === Block.WaterFall) return false;
  // El agua que cae lo llena todo; el agua que corre solo sustituye a otra más baja (más lejos de su fuente).
  return flow === Block.WaterFall || waterLevel(b) > waterLevel(flow);
}

/**
 * Hacia dónde empuja el agua en un bloque (x, z), de -1 a 1, y si tira hacia abajo:
 * va de donde hay más agua a donde hay menos, como la corriente de Minecraft.
 */
export function waterFlow(get: (x: number, y: number, z: number) => number, x: number, y: number, z: number): { x: number; z: number; down: boolean } {
  const b = get(x, y, z);
  const level = waterLevel(b);
  if (level < 0) return { x: 0, z: 0, down: false };
  // La fuente quieta no empuja (salvo que haya un borde donde se derrama, que se nota en el agua de al lado).
  let fx = 0;
  let fz = 0;
  for (const [dx, dz] of SIDES) {
    const n = get(x + dx, y, z + dz);
    const nl = waterLevel(n);
    if (nl >= 0) {
      const diff = nl - level;
      fx += dx * diff;
      fz += dz * diff;
    } else if (!isSolid(n) && isWater(get(x + dx, y - 1, z + dz))) {
      // Al lado hay hueco con agua debajo: el agua se va hacia allí.
      fx += dx * (8 - level);
      fz += dz * (8 - level);
    }
  }
  if (isWaterSource(b)) {
    fx = 0;
    fz = 0;
  }
  const len = Math.hypot(fx, fz);
  return { x: len ? fx / len : 0, z: len ? fz / len : 0, down: b === Block.WaterFall };
}
