// Estaciones, tiempo y fiestas según la fecha real, como en Animal Crossing (hemisferio norte).

export type Season = 'primavera' | 'verano' | 'otoño' | 'invierno';
export type Weather = 'sol' | 'nubes' | 'lluvia' | 'nieve';

export function seasonOf(date: Date): Season {
  const m = date.getMonth(); // 0 = enero
  if (m >= 2 && m <= 4) return 'primavera';
  if (m >= 5 && m <= 7) return 'verano';
  if (m >= 8 && m <= 10) return 'otoño';
  return 'invierno';
}

export interface Holiday {
  id: 'año_nuevo' | 'san_valentin' | 'halloween' | 'navidad' | 'nochevieja';
  name: string;
  /** Frase con la que saludan los vecinos ese día ({c} es su coletilla). */
  greeting: string;
}

const HOLIDAYS: { from: [number, number]; to: [number, number]; holiday: Holiday }[] = [
  { from: [1, 1], to: [1, 1], holiday: { id: 'año_nuevo', name: 'Año Nuevo', greeting: '¡Feliz año nuevo! Este año va a ser genial, {c}.' } },
  { from: [2, 14], to: [2, 14], holiday: { id: 'san_valentin', name: 'San Valentín', greeting: '¡Feliz San Valentín! Hoy es un buen día para regalar flores, {c}.' } },
  // Halloween dura la última semana de octubre, para que dé tiempo a ver las calabazas.
  { from: [10, 24], to: [10, 31], holiday: { id: 'halloween', name: 'Halloween', greeting: '¡Buuu! ¿Te he asustado? Ya casi es Halloween. ¡Mira qué calabazas tan bonitas, {c}!' } },
  { from: [12, 20], to: [12, 26], holiday: { id: 'navidad', name: 'Navidad', greeting: '¡Feliz Navidad! ¿Has visto el árbol que hemos puesto junto a la tienda, {c}?' } },
  { from: [12, 31], to: [12, 31], holiday: { id: 'nochevieja', name: 'Nochevieja', greeting: '¡Hoy es el último día del año! ¿Qué deseo vas a pedir para el año nuevo, {c}?' } },
];

export function holidayOf(date: Date): Holiday | null {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  for (const h of HOLIDAYS) {
    if (md >= h.from[0] * 100 + h.from[1] && md <= h.to[0] * 100 + h.to[1]) return h.holiday;
  }
  return null;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100003) / 100003;
}

/** Probabilidad de que llueva (o nieve) en cada estación. */
const WET: Record<Season, number> = { primavera: 0.3, verano: 0.12, 'otoño': 0.3, invierno: 0.35 };

/**
 * El tiempo cambia cada tres horas y es el mismo para todos los que juegan esa isla ese día.
 * En Navidad siempre nieva, que para algo es Navidad.
 */
export function weatherAt(date: Date, seed: number): Weather {
  const season = seasonOf(date);
  if (holidayOf(date)?.id === 'navidad') return 'nieve';
  const slot = Math.floor(date.getHours() / 3);
  const r = hash(`${seed}:${date.getFullYear()}-${date.getMonth()}-${date.getDate()}:${slot}`);
  if (r < WET[season]) return season === 'invierno' ? 'nieve' : 'lluvia';
  if (r < WET[season] + 0.25) return 'nubes';
  return 'sol';
}

export const WEATHER_TEXT: Record<Weather, string> = { sol: 'soleado', nubes: 'nublado', lluvia: 'lluvia', nieve: 'nieve' };

/** Para probar: ?fecha=2026-12-24 cambia el día (la hora sigue siendo la real o la de ?hora). */
export function dateOverride(params: URLSearchParams): Date | null {
  const v = params.get('fecha');
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
