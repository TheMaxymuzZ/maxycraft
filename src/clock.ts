import { dateOverride } from './seasons';

/** Cambios de fecha y hora para probar, leídos de la dirección: ?hora=21.5 y ?fecha=2026-12-24. */
export interface TimeOverrides {
  hour: number | null;
  day: Date | null;
}

export function timeOverrides(params: URLSearchParams): TimeOverrides {
  const h = params.get('hora');
  const hour = h !== null && h !== '' && Number.isFinite(Number(h)) ? Number(h) : null;
  return { hour, day: dateOverride(params) };
}

/** Fecha y hora del juego: las reales, salvo que se hayan cambiado para probar. */
export function gameDate(o: TimeOverrides, now = new Date()): Date {
  const d = new Date(now);
  if (o.day) d.setFullYear(o.day.getFullYear(), o.day.getMonth(), o.day.getDate());
  if (o.hour !== null) d.setHours(Math.floor(o.hour), (o.hour % 1) * 60, 0);
  return d;
}

/** El día como texto AAAA-MM-DD, para saber qué cosas diarias ya se han hecho. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Números al azar que salen iguales todo el día en la misma isla (conchas, botellas). */
export function dailyRandom(seed: number, day: string): () => number {
  let s = (seed ^ Number(day.replace(/-/g, ''))) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
