import type { Block } from '../blocks';

/**
 * Un cambio del mundo. Todo lo que pone, quita o restaura bloques pasa por aquí,
 * para que el mismo cambio se pueda aplicar igual en el ordenador de otro jugador.
 */
export type WorldAction =
  | { t: 'bloque'; x: number; y: number; z: number; b: number }
  /** Vuelve a dejar el bloque como lo generó la isla (por ejemplo, una fruta que ha vuelto a crecer). */
  | { t: 'restaurar'; x: number; y: number; z: number }
  /** Pone un mueble, o cambia el que ya hay ahí (al girarlo o escribir en un cartel). Desde la v2.11. */
  | { t: 'mueble'; x: number; y: number; z: number; id: string; rot: number; text?: string }
  /** Quita el mueble de esa casilla. */
  | { t: 'sin_mueble'; x: number; y: number; z: number };

/** Lo mínimo que hace falta de World para aplicar cambios (así las pruebas pueden usar un mundo falso). */
export interface BlockWorld {
  getBlock(x: number, y: number, z: number): number;
  setBlock(x: number, y: number, z: number, b: Block): void;
  clearEdit(x: number, y: number, z: number): void;
}

/** Un mueble colocado, como lo guarda Furniture. */
export interface PlacedThing {
  id: string;
  x: number;
  y: number;
  z: number;
  rot: number;
  text?: string;
}

/** Lo mínimo que hace falta de Furniture para poner y quitar muebles. */
export interface FurnitureWorld {
  at(x: number, y: number, z: number): PlacedThing | undefined;
  place(id: string, x: number, y: number, z: number, rot: number, text?: string): void;
  remove(f: PlacedThing): void;
  /** Si existe un mueble con ese nombre (lo que llega por la red puede no existir). */
  known(id: string): boolean;
}

export const MAX_SIGN = 40;

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
  if (a.t === 'mueble') {
    return typeof a.id === 'string' && a.id.length > 0 && a.id.length <= 40 && isInt(a.rot, 3) && (a.rot as number) >= 0
      && (a.text === undefined || (typeof a.text === 'string' && a.text.length <= MAX_SIGN));
  }
  return a.t === 'restaurar' || a.t === 'sin_mueble';
}

export function applyAction(world: BlockWorld, a: WorldAction, furniture: FurnitureWorld | null = null) {
  switch (a.t) {
    case 'bloque':
      world.setBlock(a.x, a.y, a.z, a.b as Block);
      return;
    case 'restaurar':
      world.clearEdit(a.x, a.y, a.z);
      return;
    case 'mueble': {
      if (!furniture?.known(a.id)) return;
      const old = furniture.at(a.x, a.y, a.z);
      if (old) furniture.remove(old);
      furniture.place(a.id, a.x, a.y, a.z, a.rot, a.text);
      return;
    }
    case 'sin_mueble': {
      const old = furniture?.at(a.x, a.y, a.z);
      if (old) furniture!.remove(old);
      return;
    }
  }
}

type Listener = (a: WorldAction) => void;

/**
 * Envoltorio del mundo por el que pasan todos los cambios del juego.
 * Los cambios propios avisan a quien escuche (la conexión con otros jugadores);
 * los que llegan de fuera se aplican sin volver a avisar, para que no reboten.
 */
export class WorldSync implements BlockWorld {
  private listeners = new Set<Listener>();

  constructor(readonly world: BlockWorld, public furniture: FurnitureWorld | null = null) {}

  getBlock(x: number, y: number, z: number): number {
    return this.world.getBlock(x, y, z);
  }

  setBlock(x: number, y: number, z: number, b: Block) {
    this.dispatch({ t: 'bloque', x, y, z, b });
  }

  clearEdit(x: number, y: number, z: number) {
    this.dispatch({ t: 'restaurar', x, y, z });
  }

  /** Pone un mueble, o cambia el que hay en esa casilla (girado o con otro texto). */
  placeFurniture(id: string, x: number, y: number, z: number, rot: number, text?: string) {
    const clean = text?.trim().slice(0, MAX_SIGN);
    this.dispatch(clean ? { t: 'mueble', x, y, z, id, rot, text: clean } : { t: 'mueble', x, y, z, id, rot });
  }

  removeFurniture(x: number, y: number, z: number) {
    this.dispatch({ t: 'sin_mueble', x, y, z });
  }

  /** Un cambio hecho en este ordenador. */
  dispatch(a: WorldAction) {
    applyAction(this.world, a, this.furniture);
    for (const l of this.listeners) l(a);
  }

  /** Un cambio que llega de otro jugador. */
  receive(a: WorldAction) {
    applyAction(this.world, a, this.furniture);
  }

  /** Escucha los cambios propios. Devuelve la función para dejar de escuchar. */
  onAction(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}
