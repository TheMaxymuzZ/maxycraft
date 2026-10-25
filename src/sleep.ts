// Dormir (v4.2): te metes en la cama, eliges a qué hora quieres despertarte y el reloj salta hasta entonces.
// Con amigos, el reloj es el de la isla de todos: solo salta cuando todos están en la cama, y os despertáis
// a la hora más temprana que haya elegido alguien (así nadie se pierde nada).

import type { ClockSave } from './clock';

const DAY = 1440;

/** Horas que se ofrecen al acostarse, con su nombre. */
export const WAKE_CHOICES: { hour: number; name: string }[] = [
  { hour: 6, name: 'Al amanecer' },
  { hour: 8, name: 'Por la mañana' },
  { hour: 12, name: 'A mediodía' },
  { hour: 16, name: 'Por la tarde' },
  { hour: 19, name: 'Al atardecer' },
  { hour: 22, name: 'Por la noche' },
];

/** Minutos que faltan desde `now` hasta la próxima vez que sea `wake` (si es la misma hora, un día entero). */
export function minutesUntil(now: number, wake: number): number {
  const d = (((wake - now) % DAY) + DAY) % DAY;
  return d === 0 ? DAY : d;
}

/** La hora de despertar que llega antes, de todas las elegidas. */
export function earliestWake(now: number, wakes: number[]): number {
  return wakes.reduce((best, w) => (minutesUntil(now, w) < minutesUntil(now, best) ? w : best));
}

/** Día y minuto al despertar a la hora `wake`, durmiendo desde `from`. */
export function wakeClock(from: ClockSave, wake: number): ClockSave & { newDay: boolean } {
  const total = from.minute + minutesUntil(from.minute, wake);
  return { day: from.day + Math.floor(total / DAY), minute: total % DAY, newDay: total >= DAY };
}

/**
 * Quién está en la cama y a qué hora se quiere despertar. Lo lleva quien manda en la isla
 * (el anfitrión, o tú si juegas solo).
 */
export class Beds {
  private wakes = new Map<string, number>();

  set(id: string, wake: number | null) {
    if (wake === null) this.wakes.delete(id);
    else this.wakes.set(id, ((Math.round(wake) % DAY) + DAY) % DAY);
  }

  has(id: string): boolean {
    return this.wakes.has(id);
  }

  get count(): number {
    return this.wakes.size;
  }

  clear() {
    this.wakes.clear();
  }

  /** Quita a quien ya no está en la partida. */
  keepOnly(players: string[]) {
    for (const id of [...this.wakes.keys()]) if (!players.includes(id)) this.wakes.delete(id);
  }

  /** Si están todos en la cama, la hora a la que se despiertan; si falta alguien, null. */
  ready(players: string[], now: number): number | null {
    if (!players.length || !players.every((id) => this.wakes.has(id))) return null;
    return earliestWake(now, players.map((id) => this.wakes.get(id)!));
  }
}

/** "8:00", "16:30"… */
export function hourText(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = Math.floor(minute % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}
