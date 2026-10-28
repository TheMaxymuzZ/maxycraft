import { Block } from './blocks';

/** Lo que cuenta para la valoración de la isla. */
export interface IslandStats {
  /** Flores plantadas por el jugador. */
  flowers: number;
  /** Vallas y caminos (tablones y piedra) puestos por el jugador. */
  fences: number;
  /** Antorchas puestas. */
  lights: number;
  furniture: number;
  /** Nivel de la casa (0 es la tienda de campaña). */
  house: number;
  /** Vecinos invitados que viven en la isla. */
  guests: number;
  donated: number;
  /** Plantas del huerto y animales de la granja. */
  farm: number;
  /** Obras públicas y mejoras del ayuntamiento (v4.13). */
  works?: number;
}

export interface Rating {
  stars: number;
  score: number;
  tip: string;
}

const FLOWERS = new Set<number>([Block.FlowerRed, Block.FlowerYellow, Block.FlowerWhite, Block.FlowerBlue, Block.FlowerPink]);
const FENCES = new Set<number>([Block.Fence, Block.WhiteFence]);

/** Cuenta lo que el jugador ha puesto en la isla a partir de sus cambios guardados. */
export function countPlaced(edits: Record<string, Record<number, number>>): Pick<IslandStats, 'flowers' | 'fences' | 'lights'> {
  const out = { flowers: 0, fences: 0, lights: 0 };
  for (const chunk of Object.values(edits)) {
    for (const b of Object.values(chunk)) {
      if (FLOWERS.has(b)) out.flowers++;
      else if (FENCES.has(b)) out.fences++;
      else if (b === Block.Torch) out.lights++;
    }
  }
  return out;
}

// Cada cosa suma hasta un tope, para que haya que cuidar un poco de todo.
const PARTS: { key: keyof IslandStats; per: number; max: number; tip: string }[] = [
  { key: 'flowers', per: 1.5, max: 40, tip: 'Planta flores por la isla: alegran mucho.' },
  { key: 'furniture', per: 2, max: 30, tip: 'Pon más muebles, dentro o fuera de casa.' },
  { key: 'house', per: 20, max: 3, tip: 'Amplía tu parcela hablando con Ladrillo, el urbanista del ayuntamiento.' },
  { key: 'fences', per: 1, max: 40, tip: 'Unas vallas ordenan mucho los jardines.' },
  { key: 'lights', per: 3, max: 10, tip: 'Pon antorchas para que la isla luzca de noche.' },
  { key: 'guests', per: 15, max: 3, tip: 'Invita vecinos nuevos desde las islas misteriosas.' },
  { key: 'donated', per: 1, max: 40, tip: 'Dona peces e insectos al museo.' },
  { key: 'farm', per: 1.5, max: 20, tip: 'Cuida un huerto o una granja.' },
  { key: 'works', per: 8, max: 6, tip: 'Encarga obras públicas al alcalde: fuentes, farolas y bancos.' },
];

export const MAX_SCORE = PARTS.reduce((s, p) => s + p.per * p.max, 0);
const THRESHOLDS = [40, 100, 180, 270];

/** Valoración de la isla de 1 a 5 estrellas, con un consejo para mejorarla. */
export function rateIsland(stats: IslandStats): Rating {
  let score = 0;
  let worst = PARTS[0];
  let worstFill = Infinity;
  for (const p of PARTS) {
    const n = Math.min(p.max, Math.max(0, stats[p.key] ?? 0));
    score += n * p.per;
    const fill = n / p.max;
    if (fill < worstFill) {
      worstFill = fill;
      worst = p;
    }
  }
  score = Math.round(score);
  const stars = 1 + THRESHOLDS.filter((t) => score >= t).length;
  return { stars, score, tip: stars === 5 ? '¡Tu isla es perfecta! Todo el mundo quiere venir a verla.' : worst.tip };
}
