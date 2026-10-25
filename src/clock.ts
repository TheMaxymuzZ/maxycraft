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

// --- Calendario de la isla (v2.4) ---
// El día y las estaciones son de mentira: un día dura unos minutos y cada estación, una semana de juego.
// Cada día del año de la isla corresponde a una fecha elegida para que no se salte ninguna fiesta.

/** Días de juego que dura cada estación. */
export const SEASON_DAYS = 7;
/** Fecha [mes, día] de cada día del año de la isla, empezando en primavera. */
export const CALENDAR: [number, number][] = [
  [3, 5], [3, 20], [4, 5], [4, 20], [5, 5], [5, 20], [5, 31],
  [6, 5], [6, 20], [7, 5], [7, 20], [8, 5], [8, 20], [8, 31],
  [9, 5], [9, 20], [10, 5], [10, 18], [10, 28], [11, 10], [11, 25],
  [12, 5], [12, 24], [12, 31], [1, 1], [1, 20], [2, 14], [2, 25],
];
export const YEAR_DAYS = CALENDAR.length;
const BASE_YEAR = 2026;
const DAY_MINUTES = 1440;

/** Fecha del calendario de la isla para el día de juego `day` (0 = primer día) y el minuto del día. */
export function calendarDate(day: number, minute: number): Date {
  const i = ((day % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS;
  const [m, d] = CALENDAR[i];
  // El año de la isla empieza en primavera: enero y febrero ya cuentan como el año siguiente.
  const year = BASE_YEAR + Math.floor(day / YEAR_DAYS) + (m <= 2 ? 1 : 0);
  const h = Math.floor(minute / 60);
  const min = Math.floor(minute % 60);
  return new Date(year, m - 1, d, h, min, Math.floor((minute % 1) * 60));
}

/** Día del año de la isla (0 a 27) más parecido a una fecha real, para empezar en la misma estación. */
export function nearestCalendarDay(date: Date): number {
  const doy = (m: number, d: number) => (m - 1) * 31 + d;
  const target = doy(date.getMonth() + 1, date.getDate());
  let best = 0;
  let bestDist = Infinity;
  CALENDAR.forEach(([m, d], i) => {
    const diff = Math.abs(doy(m, d) - target);
    const dist = Math.min(diff, 372 - diff);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

export interface ClockSave {
  /** Días de juego desde el principio de la partida. */
  day: number;
  /** Minuto del día (0 a 1439,99). */
  minute: number;
}

/** Duraciones del día que se pueden elegir en las opciones, en minutos reales (0 = la hora real). */
export const DAY_LENGTHS: { minutes: number; name: string }[] = [
  { minutes: 12, name: 'Corto (12 min)' },
  { minutes: 24, name: 'Normal (24 min)' },
  { minutes: 48, name: 'Largo (48 min)' },
  { minutes: 0, name: 'Hora real' },
];

/**
 * El reloj de la isla. El tiempo solo pasa mientras se juega, como en Minecraft.
 * Con "Hora real" se usa la fecha y la hora del ordenador, como antes de la v2.4.
 */
export class GameClock {
  day: number;
  minute: number;

  constructor(saved: ClockSave | undefined, private o: TimeOverrides, public dayLength = 24, now = new Date()) {
    const valid = saved && Number.isFinite(saved.day) && Number.isFinite(saved.minute);
    this.day = valid ? Math.max(0, Math.floor(saved.day)) : nearestCalendarDay(now);
    this.minute = valid ? Math.min(DAY_MINUTES - 0.01, Math.max(0, saved.minute)) : 8 * 60;
    // Para probar: ?fecha= salta al día del calendario más parecido; ?hora= deja la hora quieta.
    if (o.day) this.day = this.day - (this.day % YEAR_DAYS) + nearestCalendarDay(o.day);
    if (o.hour !== null) this.minute = o.hour * 60;
  }

  get real(): boolean {
    return this.dayLength === 0;
  }

  /** Avanza el reloj `seconds` segundos reales. Devuelve true si ha empezado un día nuevo. */
  tick(seconds: number): boolean {
    if (this.real || this.o.hour !== null) return false;
    this.minute += (seconds * DAY_MINUTES) / (this.dayLength * 60);
    let newDay = false;
    while (this.minute >= DAY_MINUTES) {
      this.minute -= DAY_MINUTES;
      this.day++;
      newDay = true;
    }
    return newDay;
  }

  /** Fecha y hora que se ven en el juego. */
  date(now = new Date()): Date {
    return this.real ? gameDate(this.o, now) : calendarDate(this.day, this.minute);
  }

  /** Número de día para contar días que pasan (la fruta que vuelve a crecer, por ejemplo). */
  dayNumber(now = new Date()): number {
    return this.real ? Math.floor(this.date(now).getTime() / 86_400_000) : this.day;
  }

  serialize(): ClockSave {
    return { day: this.day, minute: this.minute };
  }
}
