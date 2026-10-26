// Control de población (v4.7): cuántas criaturas puede haber a la vez, por zona y en total, para que el mundo
// nunca se quede vacío ni se llene de más. Cuando atrapas una, esa zona tarda un rato en reponerla.
// Lo usan los insectos; los animales salvajes y la vida marina (v4.23) se apuntarán aquí con sus grupos.

/** Lado de cada zona, en bloques. */
export const ZONE = 32;

export interface PopulationRule {
  /** Como mucho en cada zona. */
  perZone: number;
  /** Como mucho en total alrededor del jugador. */
  total: number;
  /** Segundos que tarda una zona en reponer una criatura atrapada. */
  respawn: number;
}

export function zoneOf(x: number, z: number): string {
  return `${Math.floor(x / ZONE)},${Math.floor(z / ZONE)}`;
}

export class Population {
  private counts = new Map<string, number>();
  private totals = new Map<string, number>();
  /** Zonas esperando a reponer: "grupo|zona" → segundos que faltan (uno por criatura atrapada). */
  private waits = new Map<string, number[]>();

  constructor(private rules: Record<string, PopulationRule>) {}

  private rule(group: string): PopulationRule {
    const r = this.rules[group];
    if (!r) throw new Error(`Grupo de criaturas desconocido: ${group}`);
    return r;
  }

  /** Cuántas hay ahora de ese grupo (en total, o en la zona de x, z). */
  count(group: string, x?: number, z?: number): number {
    if (x === undefined || z === undefined) return this.totals.get(group) ?? 0;
    return this.counts.get(`${group}|${zoneOf(x, z)}`) ?? 0;
  }

  /** Si puede aparecer una criatura del grupo en (x, z). */
  canSpawn(group: string, x: number, z: number): boolean {
    const r = this.rule(group);
    if ((this.totals.get(group) ?? 0) >= r.total) return false;
    const k = `${group}|${zoneOf(x, z)}`;
    const waiting = this.waits.get(k)?.length ?? 0;
    return (this.counts.get(k) ?? 0) + waiting < r.perZone;
  }

  /** Apunta una criatura nueva. Devuelve su zona, para borrarla luego aunque se haya movido. */
  add(group: string, x: number, z: number): string {
    const zone = zoneOf(x, z);
    const k = `${group}|${zone}`;
    this.counts.set(k, (this.counts.get(k) ?? 0) + 1);
    this.totals.set(group, (this.totals.get(group) ?? 0) + 1);
    return zone;
  }

  /**
   * Quita una criatura. `caught`: la ha atrapado el jugador, así que su zona tarda en reponerla.
   * Si solo se ha ido (lejos o al acabar su rato), su sitio queda libre enseguida.
   */
  remove(group: string, zone: string, caught = false) {
    const k = `${group}|${zone}`;
    const n = (this.counts.get(k) ?? 0) - 1;
    if (n > 0) this.counts.set(k, n);
    else this.counts.delete(k);
    this.totals.set(group, Math.max(0, (this.totals.get(group) ?? 0) - 1));
    if (caught) {
      const list = this.waits.get(k) ?? [];
      list.push(this.rule(group).respawn);
      this.waits.set(k, list);
    }
  }

  update(dt: number) {
    for (const [k, list] of this.waits) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i] -= dt;
        if (list[i] <= 0) list.splice(i, 1);
      }
      if (!list.length) this.waits.delete(k);
    }
  }
}
