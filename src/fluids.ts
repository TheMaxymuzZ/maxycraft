import { Block, burnt, flowingLava, flowingWater, isLava, isLavaSource, isSolid, isWater, isWaterSource, lavaLevel, waterLevel } from './blocks';

/**
 * Física del agua (v3.8), con las mismas reglas que Minecraft:
 * - El agua quieta (fuente) no se acaba nunca. El agua que corre baja un nivel por bloque (de 1 a 7) y luego se para.
 * - Primero cae: si debajo hay hueco, el agua baja como agua que cae, y al llegar al suelo se vuelve a extender.
 * - Hacia los lados va por el camino más corto a un desnivel (mira hasta 4 bloques), como hace Minecraft.
 * - Si quitas la fuente, el agua que corría se va secando poco a poco.
 * - Fuente infinita: un hueco con dos fuentes al lado y suelo firme debajo se convierte en fuente.
 * El agua solo cambia cuando algo cambia a su lado (no se recalcula todo el mar), en pasos de un cuarto de segundo.
 *
 * Desde la v4.20 la lava usa las mismas reglas con otros números: va a un tercio de la velocidad, solo llega a 3
 * bloques y no hace fuentes infinitas. Al tocar agua se vuelve lava petrificada (obsidiana si era una fuente),
 * y quema las plantas y la madera que tiene al lado.
 */

/** Un líquido: agua o lava. */
interface Liquid {
  is(b: number): boolean;
  source: Block;
  fall: Block;
  level(b: number): number;
  flow(level: number): Block;
  /** Nivel más bajo antes de pararse. */
  max: number;
  /** Fuente infinita con dos fuentes al lado. */
  infinite: boolean;
}

const WATER: Liquid = { is: isWater, source: Block.Water, fall: Block.WaterFall, level: waterLevel, flow: flowingWater, max: 7, infinite: true };
const LAVA: Liquid = { is: isLava, source: Block.Lava, fall: Block.LavaFall, level: lavaLevel, flow: flowingLava, max: 3, infinite: false };
/** La lava se mueve uno de cada tres pasos. */
export const LAVA_SLOWNESS = 3;
/** Probabilidad de que la lava queme algo de al lado en cada paso suyo. */
const BURN_CHANCE = 0.2;

function liquidOf(b: number): Liquid | null {
  return isWater(b) ? WATER : isLava(b) ? LAVA : null;
}

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
  private steps = 0;
  /** Para el chisporroteo: se avisa al apagar lava con agua (x, y, z). */
  onQuench: (x: number, y: number, z: number) => void = () => {};

  constructor(private w: FluidWorld, private random: () => number = Math.random) {}

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
    const lavaTurn = this.steps++ % LAVA_SLOWNESS === 0;
    let n = 0;
    for (const [k, p] of now) {
      // La lava espera su turno (si su trozo no está cargado da igual: no se mueve).
      if (!lavaTurn && this.w.loaded(p[0], p[2]) && isLava(this.w.getBlock(p[0], p[1], p[2]))) {
        this.pending.set(k, p);
        continue;
      }
      if (n++ >= MAX_PER_STEP) {
        this.pending.set(k, p);
        continue;
      }
      this.tick(p[0], p[1], p[2]);
    }
  }

  /** Lo que debería haber en un bloque de líquido que no es fuente, según lo que tiene alrededor. */
  private desired(liquid: Liquid, x: number, y: number, z: number): Block {
    if (liquid.is(this.w.getBlock(x, y + 1, z))) return liquid.fall;
    let min = 8;
    let sources = 0;
    for (const [dx, dz] of SIDES) {
      const n = this.w.getBlock(x + dx, y, z + dz);
      if (!liquid.is(n)) continue;
      if (n === liquid.source) sources++;
      min = Math.min(min, liquid.level(n));
    }
    const below = this.w.getBlock(x, y - 1, z);
    if (liquid.infinite && sources >= 2 && (isSolid(below) || below === liquid.source)) return liquid.source;
    return min + 1 <= liquid.max ? liquid.flow(min + 1) : Block.Air;
  }

  /** Lava que toca agua (al lado o encima): se enfría. Devuelve si se ha apagado. */
  private quench(x: number, y: number, z: number, b: number): boolean {
    const touches = isWater(this.w.getBlock(x, y + 1, z)) || (y > 0 && isWater(this.w.getBlock(x, y - 1, z))) || SIDES.some(([dx, dz]) => isWater(this.w.getBlock(x + dx, y, z + dz)));
    if (!touches) return false;
    this.w.setBlock(x, y, z, isLavaSource(b) ? Block.Obsidian : Block.PetrifiedLava);
    this.onQuench(x, y, z);
    return true;
  }

  /** La lava quema algo de lo que tiene al lado, encima o debajo. */
  private burn(x: number, y: number, z: number) {
    if (this.random() >= BURN_CHANCE) return;
    const around: [number, number, number][] = [[x, y + 1, z], [x, y - 1, z], ...SIDES.map(([dx, dz]): [number, number, number] => [x + dx, y, z + dz]), ...SIDES.map(([dx, dz]): [number, number, number] => [x + dx, y + 1, z + dz])];
    const [bx, by, bz] = around[Math.floor(this.random() * around.length)];
    if (!this.w.loaded(bx, bz)) return;
    const after = burnt(this.w.getBlock(bx, by, bz));
    if (after !== null) this.w.setBlock(bx, by, bz, after);
    // Sigue mirando: la lava quema poco a poco mientras haya algo que arda.
    this.add(x, y, z);
  }

  private tick(x: number, y: number, z: number) {
    // Sin mirar el bloque si su trozo aún no existe, que si no se crearía aquí.
    if (!this.w.loaded(x, z)) return;
    const b = this.w.getBlock(x, y, z);
    const liquid = liquidOf(b);
    if (!liquid) return;
    if (liquid === LAVA) {
      if (this.quench(x, y, z, b)) return;
      if (this.hasFuel(x, y, z)) this.burn(x, y, z);
    }

    // El líquido que corre o cae se recalcula: crece, se seca o se vuelve fuente. Si cambia, se volverá a mirar.
    if (b !== liquid.source) {
      const want = this.desired(liquid, x, y, z);
      if (want !== b) {
        this.w.setBlock(x, y, z, want);
        return;
      }
    }

    // Primero cae.
    const below = y > 0 ? this.w.getBlock(x, y - 1, z) : Block.Stone;
    if (y > 0 && canFill(liquid, below, liquid.fall)) this.w.setBlock(x, y - 1, z, liquid.fall);
    // Hacia los lados solo si es fuente o si debajo no puede seguir cayendo (suelo, o líquido que ya está ahí).
    const canFall = y > 0 && (below === Block.Air || liquid.is(below));
    if (b !== liquid.source && canFall) return;
    const next = liquid.level(b) + 1;
    if (next > liquid.max) return;
    const flow = liquid.flow(next);
    for (const [dx, dz] of this.spreadSides(liquid, x, y, z)) {
      const nx = x + dx;
      const nz = z + dz;
      if (!this.w.loaded(nx, nz)) continue;
      if (canFill(liquid, this.w.getBlock(nx, y, nz), flow)) this.w.setBlock(nx, y, nz, flow);
    }
  }

  /** Hay algo que arde junto a la lava. */
  private hasFuel(x: number, y: number, z: number): boolean {
    if (burnt(this.w.getBlock(x, y + 1, z)) !== null || burnt(this.w.getBlock(x, y - 1, z)) !== null) return true;
    return SIDES.some(([dx, dz]) => burnt(this.w.getBlock(x + dx, y, z + dz)) !== null || burnt(this.w.getBlock(x + dx, y + 1, z + dz)) !== null);
  }

  /** Hacia qué lados corre: hacia el desnivel más cercano (hasta 4 bloques); si no hay ninguno, hacia todos. */
  private spreadSides(liquid: Liquid, x: number, y: number, z: number): [number, number][] {
    let best = Infinity;
    let sides: [number, number][] = [];
    for (const side of SIDES) {
      const nx = x + side[0];
      const nz = z + side[1];
      if (!passable(liquid, this.w.getBlock(nx, y, nz))) continue;
      const d = this.isHole(liquid, nx, y, nz) ? 0 : this.holeDistance(liquid, nx, y, nz, side, 1);
      if (d < best) {
        best = d;
        sides = [side];
      } else if (d === best) sides.push(side);
    }
    return sides;
  }

  /** El agua de (x, y, z) podría caer hacia abajo. */
  private isHole(liquid: Liquid, x: number, y: number, z: number): boolean {
    if (y <= 0) return false;
    const below = this.w.getBlock(x, y - 1, z);
    return below === Block.Air || liquid.is(below);
  }

  /** Bloques hasta el desnivel más cercano desde (x, y, z), sin volver por donde ha venido; Infinity si no hay. */
  private holeDistance(liquid: Liquid, x: number, y: number, z: number, from: [number, number], depth: number): number {
    if (depth > SLOPE_FIND) return Infinity;
    let best = Infinity;
    for (const side of SIDES) {
      if (side[0] === -from[0] && side[1] === -from[1]) continue;
      const nx = x + side[0];
      const nz = z + side[1];
      if (!passable(liquid, this.w.getBlock(nx, y, nz))) continue;
      if (this.isHole(liquid, nx, y, nz)) return depth;
      if (depth < SLOPE_FIND) best = Math.min(best, this.holeDistance(liquid, nx, y, nz, side, depth + 1));
    }
    return best;
  }
}

/** Por ahí puede pasar el líquido: aire o el mismo líquido que no es fuente. */
function passable(liquid: Liquid, b: number): boolean {
  return b === Block.Air || (liquid.is(b) && b !== liquid.source);
}

/** Se puede poner el líquido `flow` en un bloque que tiene `b`: si está vacío o si tiene del mismo, más flojo. */
function canFill(liquid: Liquid, b: number, flow: Block): boolean {
  if (b === Block.Air) return true;
  if (!liquid.is(b) || b === liquid.source || b === liquid.fall) return false;
  // Lo que cae lo llena todo; lo que corre solo sustituye a otro más bajo (más lejos de su fuente).
  return flow === liquid.fall || liquid.level(b) > liquid.level(flow);
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
