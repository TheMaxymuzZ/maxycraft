// Combate (v4.24): lo que hace cada arma, cuánto para un escudo y lo que sueltan las criaturas al vencerlas.
// Es sencillo a propósito: golpe, golpe cargado (mantén el clic), esquiva y bloqueo con escudo.
// Aquí está lo que no depende de la partida; las criaturas están en hostiles.ts.
import { type Rarity, itemDef } from './items';

export type WeaponKind = 'espada' | 'arco' | 'escudo';

export interface WeaponStats {
  damage: number;
  /** Segundos entre golpe y golpe. */
  cooldown: number;
  /** Bloques de alcance. */
  reach: number;
}

/** Con la mano (o con cualquier cosa que no sea un arma). */
export const FISTS: WeaponStats = { damage: 1, cooldown: 0.4, reach: 2.8 };

/** Segundos que hay que mantener el clic para un golpe cargado. */
export const CHARGE_TIME = 0.7;
export const CHARGE_BONUS = 1.8;

/** Lo que hace el arma que llevas en la mano. */
export function weaponStats(id: string | undefined | null): WeaponStats {
  const d = id ? itemDef(id) : undefined;
  if (!d || d.weapon !== 'espada') return FISTS;
  return { damage: d.damage ?? 1, cooldown: d.cooldown ?? 0.5, reach: 3.2 };
}

/** Daño de un golpe: el cargado hace casi el doble. */
export function hitDamage(stats: WeaponStats, held: number): number {
  return held >= CHARGE_TIME ? Math.round(stats.damage * CHARGE_BONUS) : stats.damage;
}

/** Daño de una flecha según lo que hayas tensado el arco (de 0 a 1). */
export function arrowDamage(bowId: string, draw: number): number {
  const base = itemDef(bowId).damage ?? 3;
  return Math.max(1, Math.round(base * (0.4 + Math.min(1, draw) * 0.6)));
}

/** Parte del daño que pasa el escudo cuando bloqueas mirando hacia el golpe. */
export function shieldBlock(id: string | undefined | null): number {
  if (id === 'escudo_hierro') return 0.15;
  if (id === 'escudo') return 0.3;
  return 1;
}

/** Segundos que dura la esquiva (no te hacen daño) y lo que tarda en poder repetirse. */
export const DODGE_TIME = 0.35;
export const DODGE_COOLDOWN = 1.2;
export const DODGE_SPEED = 11;

// --- Botín ---

/** Probabilidad de cada rareza en el botín: lo común casi siempre, lo legendario muy de vez en cuando. */
export const LOOT_CHANCE: Record<Rarity, number> = { comun: 0.9, raro: 0.3, epico: 0.08, legendario: 0.015 };

/** Lo que sale de cada criatura, ordenado de más común a más raro. */
export function rollLoot(table: string[], random: () => number = Math.random): { id: string; count: number }[] {
  const out: { id: string; count: number }[] = [];
  for (const id of table) {
    const r = itemDef(id).rarity;
    if (random() < LOOT_CHANCE[r]) out.push({ id, count: r === 'comun' ? 1 + Math.floor(random() * 2) : 1 });
  }
  return out;
}
