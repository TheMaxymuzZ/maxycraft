import { dailyRandom } from './clock';

/** Cosas que hace el jugador y que cuentan para las tareas y los logros. */
export type MissionEvent =
  | 'pescar' | 'insecto' | 'vender' | 'sacudir' | 'regar' | 'charlar' | 'concha' | 'fabricar'
  | 'mueble' | 'romper' | 'cosechar' | 'granja' | 'viajar' | 'donar' | 'regalar' | 'tareas';

export interface TaskDef {
  id: string;
  event: MissionEvent;
  goal: number;
  text: string;
  points: number;
}

/** Tareas del día: cada día salen tres distintas, iguales para toda la isla. */
export const TASKS: TaskDef[] = [
  { id: 'pescar', event: 'pescar', goal: 2, text: 'Pesca 2 peces', points: 150 },
  { id: 'insecto', event: 'insecto', goal: 2, text: 'Atrapa 2 insectos', points: 150 },
  { id: 'vender', event: 'vender', goal: 1000, text: 'Gana 1.000 bayas en la tienda', points: 100 },
  { id: 'sacudir', event: 'sacudir', goal: 3, text: 'Sacude 3 árboles', points: 80 },
  { id: 'regar', event: 'regar', goal: 3, text: 'Riega 3 plantas del huerto', points: 100 },
  { id: 'charlar', event: 'charlar', goal: 3, text: 'Habla con 3 vecinos', points: 80 },
  { id: 'concha', event: 'concha', goal: 3, text: 'Recoge 3 conchas en la playa', points: 80 },
  { id: 'fabricar', event: 'fabricar', goal: 2, text: 'Fabrica 2 cosas', points: 100 },
  { id: 'mueble', event: 'mueble', goal: 1, text: 'Coloca un mueble', points: 80 },
  { id: 'romper', event: 'romper', goal: 20, text: 'Rompe 20 bloques', points: 100 },
  { id: 'cosechar', event: 'cosechar', goal: 1, text: 'Cosecha algo del huerto', points: 120 },
  { id: 'granja', event: 'granja', goal: 1, text: 'Recoge un huevo o leche', points: 100 },
  { id: 'regalar', event: 'regalar', goal: 1, text: 'Haz un regalo a un vecino', points: 100 },
];

export interface AchievementDef {
  id: string;
  name: string;
  text: string;
  event: MissionEvent;
  goal: number;
  points: number;
}

/** Logros para siempre: se consiguen una vez y dan muchos puntos. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'pez1', name: 'Primera pesca', text: 'Pesca tu primer pez', event: 'pescar', goal: 1, points: 100 },
  { id: 'pez50', name: 'Lobo de mar', text: 'Pesca 50 peces', event: 'pescar', goal: 50, points: 1000 },
  { id: 'bicho1', name: 'Cazabichos', text: 'Atrapa tu primer insecto', event: 'insecto', goal: 1, points: 100 },
  { id: 'bicho50', name: 'Entomóloga, entomólogo', text: 'Atrapa 50 insectos', event: 'insecto', goal: 50, points: 1000 },
  { id: 'museo10', name: 'Amistad con el museo', text: 'Dona 10 cosas al museo', event: 'donar', goal: 10, points: 500 },
  { id: 'bayas10k', name: 'Buen negocio', text: 'Gana 10.000 bayas en la tienda', event: 'vender', goal: 10000, points: 300 },
  { id: 'bayas100k', name: 'Millonaria, millonario', text: 'Gana 100.000 bayas en la tienda', event: 'vender', goal: 100000, points: 2000 },
  { id: 'cosecha20', name: 'Mano verde', text: 'Cosecha 20 veces', event: 'cosechar', goal: 20, points: 500 },
  { id: 'granja20', name: 'Granja feliz', text: 'Recoge 20 huevos o leches', event: 'granja', goal: 20, points: 500 },
  { id: 'viaje1', name: 'Despegue', text: 'Vuela a una isla misteriosa', event: 'viajar', goal: 1, points: 200 },
  { id: 'viaje10', name: 'Trotamundos', text: 'Vuela 10 veces', event: 'viajar', goal: 10, points: 1000 },
  { id: 'mueble20', name: 'Decoradora, decorador', text: 'Coloca 20 muebles', event: 'mueble', goal: 20, points: 500 },
  { id: 'fabricar30', name: 'Manitas', text: 'Fabrica 30 cosas', event: 'fabricar', goal: 30, points: 500 },
  { id: 'romper500', name: 'Constructora, constructor', text: 'Rompe 500 bloques', event: 'romper', goal: 500, points: 500 },
  { id: 'regalos10', name: 'Detallista', text: 'Haz 10 regalos', event: 'regalar', goal: 10, points: 400 },
  { id: 'tareas10', name: 'Constancia', text: 'Completa 10 tareas del día', event: 'tareas', goal: 10, points: 500 },
  { id: 'tareas50', name: 'Imparable', text: 'Completa 50 tareas del día', event: 'tareas', goal: 50, points: 2000 },
];

export interface Prize {
  id: string;
  count: number;
  cost: number;
}

/** Lo que se puede canjear con los puntos. El trofeo y la fuente solo salen de aquí. */
export const PRIZES: Prize[] = [
  { id: 'billete', count: 1, cost: 300 },
  { id: 'semillas_tomate', count: 5, cost: 150 },
  { id: 'amatista', count: 1, cost: 400 },
  { id: 'pepita_oro', count: 1, cost: 600 },
  { id: 'fuente', count: 1, cost: 1500 },
  { id: 'trofeo', count: 1, cost: 3000 },
];

export interface MissionsSave {
  day: string;
  /** Avance de las tareas del día (por id). */
  progress: Record<string, number>;
  /** Tareas del día ya cumplidas. */
  done: string[];
  points: number;
  /** Totales de siempre, para los logros. */
  totals: Partial<Record<MissionEvent, number>>;
  achievements: string[];
}

export function dailyTasks(seed: number, day: string, count = 3): TaskDef[] {
  const random = dailyRandom(seed + 7, day);
  const pool = [...TASKS];
  const out: TaskDef[] = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return out;
}

export interface MissionResult {
  tasks: TaskDef[];
  achievements: AchievementDef[];
}

/** Tareas del día, puntos y logros. */
export class Missions {
  points: number;
  readonly totals: Partial<Record<MissionEvent, number>>;
  readonly achievements: Set<string>;
  private day = '';
  private progress: Record<string, number> = {};
  private done = new Set<string>();
  tasks: TaskDef[] = [];

  constructor(private seed: number, save: Partial<MissionsSave> | undefined, today: string) {
    this.points = Math.max(0, save?.points ?? 0);
    this.totals = { ...save?.totals };
    this.achievements = new Set(save?.achievements ?? []);
    this.setDay(today, save?.day === today ? save : undefined);
  }

  /** Cambia de día: tareas nuevas y el avance a cero. */
  setDay(day: string, keep?: Partial<MissionsSave>) {
    if (day === this.day) return;
    this.day = day;
    this.tasks = dailyTasks(this.seed, day);
    this.progress = { ...keep?.progress };
    this.done = new Set(keep?.done ?? []);
  }

  progressOf(t: TaskDef): number {
    return Math.min(t.goal, this.progress[t.id] ?? 0);
  }

  isDone(t: TaskDef): boolean {
    return this.done.has(t.id);
  }

  /** Apunta algo que ha hecho el jugador. Devuelve las tareas y logros que acaba de cumplir. */
  record(event: MissionEvent, n = 1): MissionResult {
    const result: MissionResult = { tasks: [], achievements: [] };
    if (n <= 0) return result;
    for (const t of this.tasks) {
      if (t.event !== event || this.done.has(t.id)) continue;
      this.progress[t.id] = (this.progress[t.id] ?? 0) + n;
      if (this.progress[t.id] >= t.goal) {
        this.done.add(t.id);
        this.points += t.points;
        result.tasks.push(t);
      }
    }
    this.count(event, n, result);
    // Cumplir tareas también cuenta para sus logros.
    if (result.tasks.length) this.count('tareas', result.tasks.length, result);
    return result;
  }

  private count(event: MissionEvent, n: number, result: MissionResult) {
    const total = (this.totals[event] = (this.totals[event] ?? 0) + n);
    for (const a of ACHIEVEMENTS) {
      if (a.event !== event || this.achievements.has(a.id) || total < a.goal) continue;
      this.achievements.add(a.id);
      this.points += a.points;
      result.achievements.push(a);
    }
  }

  /** Gasta puntos en un premio. Devuelve false si no llegan. */
  spend(cost: number): boolean {
    if (this.points < cost) return false;
    this.points -= cost;
    return true;
  }

  serialize(): MissionsSave {
    return {
      day: this.day,
      progress: { ...this.progress },
      done: [...this.done],
      points: this.points,
      totals: { ...this.totals },
      achievements: [...this.achievements],
    };
  }
}
