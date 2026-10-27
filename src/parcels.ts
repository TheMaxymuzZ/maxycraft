// Parcelas (v4.14). Cada jugador tiene un terreno cuadrado donde solo construye él (y a quien deje).
// El de quien vive en la isla, "Tu hogar", es gratis desde el principio; los amigos llegan como invitados
// y, si compran el permiso de tienda de campaña al urbanista, pasan a residentes con su parcela pequeña.
// Aquí está lo que no depende de la partida: tamaños, precios, reglas y comprobaciones.

import { SEA_LEVEL } from './world';

/** Lado de la parcela en cada tamaño. */
export const PARCEL_SIZES = [9, 13, 17, 23, 31] as const;
/** Lo que cuesta llegar a cada tamaño (el primero es gratis). */
export const PARCEL_PRICES = [0, 20_000, 60_000, 150_000, 400_000] as const;
/** El permiso de mudanza. */
export const MOVE_PRICE = 30_000;
/** El permiso de tienda de campaña para los amigos invitados. */
export const TENT_PERMIT = 3_000;
/** Dueño de la parcela de quien vive en la isla (los amigos se guardan por su id). */
export const HOST = 'yo';
/** Como mucho, tantas parcelas de amigos a la vez. */
export const MAX_FRIEND_PARCELS = 5;

export interface Parcel {
  /** HOST o el id de siempre del amigo. */
  owner: string;
  /** Nombre de quien la tiene, para los carteles y los avisos. */
  name: string;
  /** Centro. */
  x: number;
  z: number;
  /** Índice en PARCEL_SIZES. */
  size: number;
  /** Mejoras compradas (ids de PERKS). */
  perks?: string[];
  /** Amigos (ids) a los que el dueño deja construir dentro. */
  builders?: string[];
}

export interface Perk {
  id: string;
  name: string;
  cost: number;
  /** Lo que hace, para el urbanista y la wiki. */
  text: string;
}

export const PERKS: Perk[] = [
  { id: 'cartel', name: 'Cartel con tu nombre', cost: 500, text: 'Un cartel en la entrada de la parcela con tu nombre, para que todos sepan de quién es.' },
  { id: 'buzon', name: 'Buzón propio', cost: 3_000, text: 'Cada día llega una carta de un vecino, a veces con un regalo dentro.' },
  { id: 'huerto', name: 'Huerto que se riega solo', cost: 8_000, text: 'Los cultivos de tu parcela amanecen regados todos los días, llueva o no.' },
];

export type Role = 'anfitrion' | 'residente' | 'invitado';

export const ROLE_NAMES: Record<Role, string> = { anfitrion: 'Anfitrión', residente: 'Residente', invitado: 'Invitado' };

export interface Bounds {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Medio lado (sin contar la casilla del centro). */
export function parcelHalf(size: number): number {
  return (PARCEL_SIZES[Math.max(0, Math.min(PARCEL_SIZES.length - 1, size))] - 1) / 2;
}

export function parcelBounds(p: Pick<Parcel, 'x' | 'z' | 'size'>, size = p.size): Bounds {
  const h = parcelHalf(size);
  return { x0: p.x - h, z0: p.z - h, x1: p.x + h, z1: p.z + h };
}

export function inBounds(b: Bounds, x: number, z: number, margin = 0): boolean {
  return x >= b.x0 - margin && x <= b.x1 + margin && z >= b.z0 - margin && z <= b.z1 + margin;
}

export function parcelAt(list: readonly Parcel[], x: number, z: number): Parcel | undefined {
  return list.find((p) => inBounds(parcelBounds(p), x, z));
}

/** El tamaño de la casa de antes (tienda, casa pequeña, mediana, grande) pasa a ser el de la parcela. */
export function sizeForHouse(level: number): number {
  return Math.max(0, Math.min(3, Math.floor(level)));
}

/** Cómo se llama una parcela para quien la mira. */
export function parcelTitle(p: Parcel, viewer: string): string {
  if (p.owner === viewer) return 'Tu hogar';
  return `Parcela de ${p.name}`;
}

/** Algo que no puede quedar dentro de una parcela: su centro, cuánto ocupa y qué es. */
export interface Obstacle {
  x: number;
  z: number;
  r: number;
  what: string;
}

export interface ParcelSite {
  /** Altura del suelo, para saber si es tierra firme. */
  heightAt(x: number, z: number): number;
  obstacles: Obstacle[];
}

/** Por qué no vale una parcela en ese sitio y con ese tamaño, o null si vale. */
export function parcelProblem(list: readonly Parcel[], p: Parcel, site: ParcelSite): string | null {
  const b = parcelBounds(p);
  const land = (x: number, z: number) => site.heightAt(x, z) > SEA_LEVEL;
  const corners: [number, number][] = [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1], [p.x, p.z]];
  if (corners.some(([x, z]) => !land(x, z))) return 'No cabe: se saldría al mar';
  for (const o of list) {
    if (o === p || o.owner === p.owner) continue;
    const ob = parcelBounds(o);
    if (b.x0 <= ob.x1 + 1 && b.x1 >= ob.x0 - 1 && b.z0 <= ob.z1 + 1 && b.z1 >= ob.z0 - 1) return `Se mete en la parcela de ${o.name}`;
  }
  for (const o of site.obstacles) {
    if (inBounds(b, o.x, o.z, o.r)) return `Ahí está ${o.what}`;
  }
  return null;
}

/**
 * Si alguien puede poner o quitar algo en (x, z). Dentro de una parcela solo su dueño y quien él deje;
 * fuera, todos pueden recoger, pero los invitados no construyen. Devuelve por qué no, o null si puede.
 */
export function buildProblem(list: readonly Parcel[], who: string, role: Role, x: number, z: number, action: 'poner' | 'quitar'): string | null {
  const p = parcelAt(list, x, z);
  if (p) {
    if (p.owner === who || p.builders?.includes(who)) return null;
    return `Es la parcela de ${p.name}. Pídele permiso para construir`;
  }
  if (role === 'invitado' && action === 'poner') return 'Los invitados no construyen. Habla con Ladrillo, el urbanista, para tener tu parcela';
  return null;
}

export function isParcel(v: unknown): v is Parcel {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  const int = (n: unknown) => Number.isInteger(n) && Math.abs(n as number) < 100_000;
  const ids = (a: unknown) => a === undefined || (Array.isArray(a) && a.length <= 20 && a.every((s) => typeof s === 'string' && s.length > 0 && s.length <= 40));
  return typeof p.owner === 'string' && p.owner.length > 0 && p.owner.length <= 40 && typeof p.name === 'string' && p.name.length <= 24
    && int(p.x) && int(p.z) && Number.isInteger(p.size) && (p.size as number) >= 0 && (p.size as number) < PARCEL_SIZES.length && ids(p.perks) && ids(p.builders);
}

/** Lista de parcelas recibida (por la red o de una partida guardada), sin fiarse. */
export function isParcelList(v: unknown): v is Parcel[] {
  return Array.isArray(v) && v.length <= MAX_FRIEND_PARCELS + 1 && v.every(isParcel);
}
