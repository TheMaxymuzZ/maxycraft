// Agenda diaria de los vecinos (v4.8). Cada vecino se levanta, desayuna en casa, sale a pasear, hace un recado
// (a la tienda, al museo o a la plaza), vuelve a cenar y se acuesta. Las horas dependen de su personalidad y cada
// uno tiene sus manías (un poco antes o después, según su nombre), así no van todos a la vez como un rebaño.
// El día de la semana cambia adónde va de recado.

export type Activity = 'dormir' | 'casa' | 'pasear' | 'recado' | 'trabajo';

/** Adónde se puede ir de recado. Las islas sin museo o sin tienda se lo saltan. */
export type Errand = 'tienda' | 'museo' | 'plaza';

export interface AgendaItem {
  /** Hora de empezar (con decimales: 7.5 son las 7:30). */
  from: number;
  activity: Activity;
  errand?: Errand;
}

export interface AgendaOwner {
  name: string;
  /** Horas de dormir: [se acuesta, se levanta]. */
  sleep: [number, number];
  /** Trabaja en un sitio fijo (dependienta, conservadora, piloto): no pasea ni hace recados. */
  works?: boolean;
}

/** Un número fijo entre 0 y 1 para cada nombre. */
function nameHash(name: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10007) / 10007;
}

const wrap = (h: number) => ((h % 24) + 24) % 24;

/** Recados de cada día de la semana (0 = domingo): de los lugares que haya, el que toque. */
const ERRANDS: Errand[] = ['tienda', 'plaza', 'museo', 'tienda', 'plaza', 'museo', 'plaza'];

/**
 * La agenda de un vecino para un día, ordenada por hora desde las 0:00.
 * `places` son los sitios que hay en la isla para ir de recado.
 */
export function agendaFor(owner: AgendaOwner, weekday: number, places: Errand[] = ['tienda', 'museo', 'plaza']): AgendaItem[] {
  const [bed, wake] = owner.sleep;
  if (owner.works) {
    if (bed === wake) return [{ from: 0, activity: 'trabajo' }];
    return sorted([
      { from: wake, activity: 'trabajo' },
      { from: bed, activity: 'dormir' },
    ]);
  }
  const k = nameHash(owner.name);
  const breakfast = 0.5 + k * 0.5; // de media hora a una hora en casa al levantarse
  const errandAt = wrap(wake + 2 + nameHash(owner.name, 1) * 4); // a media mañana o al mediodía
  const errandLen = 1 + nameHash(owner.name, 2);
  const dinner = wrap(bed - 1 - k * 0.5); // cena en casa antes de acostarse
  const pick = ERRANDS[(weekday + Math.floor(k * 7)) % 7];
  const errand = places.includes(pick) ? pick : places[Math.floor(k * places.length)] ?? 'plaza';
  return sorted([
    { from: wake, activity: 'casa' },
    { from: wrap(wake + breakfast), activity: 'pasear' },
    { from: errandAt, activity: 'recado', errand },
    { from: wrap(errandAt + errandLen), activity: 'pasear' },
    { from: dinner, activity: 'casa' },
    { from: bed, activity: 'dormir' },
  ]);
}

function sorted(items: AgendaItem[]): AgendaItem[] {
  return items.map((i) => ({ ...i, from: Math.round(wrap(i.from) * 100) / 100 })).sort((a, b) => a.from - b.from);
}

/** Qué toca a esta hora según la agenda (lo último que ha empezado; antes de lo primero, lo último de ayer). */
export function activityAt(agenda: AgendaItem[], hour: number): AgendaItem {
  const h = wrap(hour);
  let current = agenda[agenda.length - 1];
  for (const item of agenda) if (item.from <= h) current = item;
  return current;
}

/** La hora de un AgendaItem en texto, para la ficha del vecino: "7:30". */
export function hourText(h: number): string {
  const total = Math.round(wrap(h) * 60);
  return `${Math.floor(total / 60) % 24}:${String(total % 60).padStart(2, '0')}`;
}
