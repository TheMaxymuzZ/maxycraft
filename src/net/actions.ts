import type { Block } from '../blocks';

/**
 * Un cambio del mundo. Todo lo que pone, quita o restaura bloques pasa por aquí,
 * para que el mismo cambio se pueda aplicar igual en el ordenador de otro jugador.
 */
export type WorldAction =
  | { t: 'bloque'; x: number; y: number; z: number; b: number }
  /** Vuelve a dejar el bloque como lo generó la isla (por ejemplo, una fruta que ha vuelto a crecer). */
  | { t: 'restaurar'; x: number; y: number; z: number };

/** Lo mínimo que hace falta de World para aplicar cambios (así las pruebas pueden usar un mundo falso). */
export interface BlockWorld {
  getBlock(x: number, y: number, z: number): number;
  setBlock(x: number, y: number, z: number, b: Block): void;
  clearEdit(x: number, y: number, z: number): void;
}

const MAX_COORD = 4096;
const MAX_Y = 256;
const MAX_BLOCK = 1024;

const isInt = (v: unknown, max: number): v is number => Number.isInteger(v) && Math.abs(v as number) <= max;

/** Comprueba que algo recibido por la red es un cambio válido, sin fiarse de quien lo manda. */
export function isWorldAction(v: unknown): v is WorldAction {
  if (!v || typeof v !== 'object') return false;
  const a = v as Record<string, unknown>;
  if (!isInt(a.x, MAX_COORD) || !isInt(a.z, MAX_COORD) || !isInt(a.y, MAX_Y)) return false;
  if (a.t === 'bloque') return isInt(a.b, MAX_BLOCK) && (a.b as number) >= 0;
  return a.t === 'restaurar';
}

export function applyAction(world: BlockWorld, a: WorldAction) {
  if (a.t === 'bloque') world.setBlock(a.x, a.y, a.z, a.b as Block);
  else world.clearEdit(a.x, a.y, a.z);
}

type Listener = (a: WorldAction) => void;

/**
 * Envoltorio del mundo por el que pasan todos los cambios del juego.
 * Los cambios propios avisan a quien escuche (la conexión con otros jugadores);
 * los que llegan de fuera se aplican sin volver a avisar, para que no reboten.
 */
export class WorldSync implements BlockWorld {
  private listeners = new Set<Listener>();

  constructor(readonly world: BlockWorld) {}

  getBlock(x: number, y: number, z: number): number {
    return this.world.getBlock(x, y, z);
  }

  setBlock(x: number, y: number, z: number, b: Block) {
    this.dispatch({ t: 'bloque', x, y, z, b });
  }

  clearEdit(x: number, y: number, z: number) {
    this.dispatch({ t: 'restaurar', x, y, z });
  }

  /** Un cambio hecho en este ordenador. */
  dispatch(a: WorldAction) {
    applyAction(this.world, a);
    for (const l of this.listeners) l(a);
  }

  /** Un cambio que llega de otro jugador. */
  receive(a: WorldAction) {
    applyAction(this.world, a);
  }

  /** Escucha los cambios propios. Devuelve la función para dejar de escuchar. */
  onAction(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}
