// El ayuntamiento en la partida (v4.13): dónde está, a qué nivel, el alcalde y el urbanista en su puerta,
// las obras públicas y las rampas de las islas de antes. Lo que no depende de la partida está en townhall.ts.
import type * as THREE from 'three';
import type { Block } from '../blocks';
import type { BuildWorld } from '../buildings';
import type { TownActions } from '../dialog';
import type { Inventory } from '../inventory';
import { itemDef } from '../items';
import type { MapMarker } from '../map';
import type { Rating } from '../rating';
import {
  FLAG_COLORS, HALL_LEVELS, PUBLIC_WORKS, type TownSave, buildHall, buildRamp, findHallSite, hallDoor, placeFlag, planBridge,
} from '../townhall';
import { MAYOR, PLANNER, Villager, type VillagerMemory, errandPlaces } from '../villagers';
import type { Plot, World } from '../world';

export interface TownDeps {
  world: World;
  villagers: Villager[];
  scene: THREE.Scene;
  /** Pone un bloque para todos los jugadores (WorldSync). */
  put(x: number, y: number, z: number, b: Block): void;
  placeFurniture(id: string, x: number, y: number, z: number, rot: number): void;
  inventory: Inventory;
  wallet(): number;
  pay(amount: number): void;
  memories: Record<string, VillagerMemory>;
  rating(): Rating;
  /** Avisos de hoy que no son del ayuntamiento (cumpleaños, fiestas, tienda). */
  notices(): string[];
  /** Se puede construir: en tu isla, no de visita ni de viaje. */
  host: boolean;
  /** Avellana deja de vender planos cuando llega el urbanista. */
  changed(): void;
  toast(text: string): void;
  persist(): void;
  /** Lugares que no se pueden ocupar (solares del jugador). */
  avoid?: (x: number, z: number) => boolean;
  /** Vuelve a dejar esas casillas como las genera la isla, para todos los jugadores. */
  clearEdits?(cells: [number, number, number][]): void;
}

/** Nombres que propone el alcalde para la isla. */
const NAMES = ['Isla Bonita', 'Bahía Serena', 'Villa Coral', 'Puerto Brisa', 'Isla Rumor', 'Cala Dorada'];

export class Town {
  state: TownSave | null;
  mayor: Villager | null = null;
  planner: Villager | null = null;
  private build: BuildWorld & { islets: World['islets']; waterKind: World['waterKind'] };

  constructor(private deps: TownDeps, saved?: TownSave | null) {
    const { world } = deps;
    this.state = saved ? { ...saved, works: [...saved.works] } : null;
    this.build = {
      getBlock: (x, y, z) => world.getBlock(x, y, z),
      setBlock: (x, y, z, b) => deps.put(x, y, z, b),
      heightAt: (x, z) => world.heightAt(x, z),
      isEdited: (x, y, z) => world.isEdited(x, y, z),
      plotAt: (x, z, m) => world.plotAt(x, z, m),
      islets: world.islets,
      waterKind: (x, z) => world.waterKind(x, z),
    };
    if (deps.host) {
      if (!this.state) this.found();
      if (this.state && !this.state.ramps) this.ramps();
      else if (this.state) {
        if (!this.state.museum) this.bigBuildingRamp('museum');
        if (!this.state.shop) this.bigBuildingRamp('shop');
      }
    }
    this.spawnStaff();
  }

  /** Coloca la caseta de obras cerca de la plaza (en las islas nuevas y en las de antes). */
  private found() {
    const [px, pz] = this.deps.world.findSpawn(0, 0);
    const avoid = (x: number, z: number) => Math.hypot(x - px, z - pz) < 8 || !!this.deps.avoid?.(x, z);
    const site = findHallSite(this.build, px, pz, avoid);
    if (!site) return;
    const [x, y, z] = site;
    this.state = { level: 1, x, y, z, works: [] };
    buildHall(this.build, this.state, 1);
  }

  /** Rampas y pasarelas para que se llegue andando de la plaza a la tienda y al museo. */
  private ramps() {
    const places = errandPlaces(this.deps.world);
    const made = [places.tienda, places.museo].filter((p) => !!p && !!places.plaza).map((p) => buildRamp(this.build, p!, places.plaza!).length);
    this.state!.ramps = true;
    this.state!.museum = true;
    this.state!.shop = true;
    if (made.some((n) => n > 0)) this.deps.toast('Se han hecho rampas para que los vecinos lleguen a la tienda y al museo');
  }

  /**
   * En las islas de antes el museo (hasta la v4.15) y la tienda (hasta la v4.16) eran casitas y la rampa llegaba
   * a su puerta. Los edificios nuevos ocupan la parcela entera: se quita lo que hubiera dentro (la rampa vieja)
   * y se hace otra hasta la puerta nueva.
   */
  private bigBuildingRamp(kind: 'museum' | 'shop') {
    const { world } = this.deps;
    const plot = world.plots.find((p) => p.kind === kind);
    if (plot) {
      const cells = world.editsIn(plot.x - 5, plot.z - 5, plot.x + 5, plot.z + 5).map(([x, y, z]) => [x, y, z] as [number, number, number]);
      if (cells.length) this.deps.clearEdits?.(cells);
      const places = errandPlaces(world);
      const to = kind === 'museum' ? places.museo : places.tienda;
      if (to && places.plaza) buildRamp(this.build, to, places.plaza);
    }
    this.state![kind] = true;
  }

  /** El parcelo del ayuntamiento, con la puerta del nivel de ahora, para que el alcalde y el urbanista estén en ella. */
  private plot(): Plot | null {
    const s = this.state;
    if (!s) return null;
    return { kind: 'townhall', x: s.x + 5, z: s.z + 5, y: s.y, roof: FLAG_COLORS[0][1], door: hallDoor(s, s.level) };
  }

  private spawnStaff() {
    const plot = this.plot();
    if (!plot) return;
    const add = (profile: typeof MAYOR, dx: number) => {
      const v = new Villager(profile, { ...plot, door: [plot.door[0] + dx, plot.door[1], plot.door[2]] }, this.deps.world, this.deps.memories[profile.name] ?? { friendship: 0 });
      this.deps.villagers.push(v);
      this.deps.scene.add(v.group, v.extras);
      return v;
    };
    this.mayor ??= add(MAYOR, -1);
    // Desde la v4.14 el urbanista está desde la caseta de obras: lleva las parcelas.
    this.planner ??= add(PLANNER, 1);
  }

  /** Mueve al alcalde y al urbanista a la puerta nueva al ampliar. */
  private moveStaff() {
    const plot = this.plot()!;
    for (const [v, dx] of [[this.mayor, -1], [this.planner, 1]] as [Villager | null, number][]) {
      if (!v) continue;
      v.home.door[0] = plot.door[0] + dx;
      v.home.door[1] = plot.door[1];
      v.home.door[2] = plot.door[2];
    }
    this.spawnStaff();
  }

  get level(): number {
    return this.state?.level ?? 0;
  }

  /** Nombre de la isla, si se le ha puesto. */
  get name(): string | undefined {
    return this.state?.name;
  }

  /** Obras hechas, para la valoración de la isla. */
  get worksDone(): number {
    return (this.state?.works.length ?? 0) + Math.max(0, this.level - 1);
  }

  /** Para el mapa: el ayuntamiento y los islotes. */
  markers(): MapMarker[] {
    const out: MapMarker[] = [];
    if (this.state) out.push({ x: this.state.x + 5, z: this.state.z + 5, icon: '🏛️', label: HALL_LEVELS[this.level - 1].name, kind: 'edificios' });
    this.deps.world.islets.forEach((i, n) => out.push({ x: i.x, z: i.z, icon: '🏝️', label: `Islote ${n + 1}`, kind: 'edificios' }));
    return out;
  }

  private canPay(amount: number): boolean {
    if (this.deps.wallet() < amount) return false;
    this.deps.pay(amount);
    return true;
  }

  /** Lo que hacen el alcalde y el urbanista en la conversación. */
  actions(): TownActions {
    const d = this.deps;
    return {
      level: () => this.level,
      rating: () => d.rating(),
      notices: () => {
        const out = [...d.notices()];
        const next = HALL_LEVELS[this.level];
        if (next) out.push(`Se busca: ${next.name.toLowerCase()} (habla con el alcalde)`);
        const works = this.available();
        if (works.length) out.push(`Obras que se pueden encargar: ${works.map((w) => w.name.toLowerCase()).join(', ')}`);
        return out;
      },
      works: () => this.available(),
      order: (id) => {
        const w = this.available().find((x) => x.id === id);
        if (!w || !this.canPay(w.cost)) return 'money';
        this.doWork(id);
        return 'ok';
      },
      next: () => {
        const next = HALL_LEVELS[this.level];
        if (!next) return null;
        const missing = next.materials.filter(([id, n]) => d.inventory.countOf(id) < n).map(([id, n]) => `${n - d.inventory.countOf(id)} de ${itemDef(id).name.toLowerCase()}`);
        return { name: next.name, cost: next.cost, missing, opens: next.opens };
      },
      upgrade: () => {
        const next = HALL_LEVELS[this.level];
        if (!next) return 'ok';
        if (next.materials.some(([id, n]) => d.inventory.countOf(id) < n)) return 'materials';
        if (!this.canPay(next.cost)) return 'money';
        for (const [id, n] of next.materials) d.inventory.remove(id, n);
        this.upgrade();
        return 'ok';
      },
      names: () => NAMES,
      setName: (name) => {
        this.state!.name = name;
        d.persist();
      },
      setFlag: (color) => {
        this.state!.flag = color;
        placeFlag(this.build, this.state!, this.level, color);
        d.persist();
      },
      buyBlueprint: () => {
        if (!this.canPay(itemDef('plano_casa').buy ?? 1000)) return 'money';
        if (d.inventory.add('plano_casa', 1) > 0) d.toast('No te cabe en los bolsillos: se ha caído al suelo');
        d.persist();
        return 'ok';
      },
    };
  }

  /** Obras que se pueden encargar ahora. */
  available() {
    if (!this.state) return [];
    const done = new Set(this.state.works);
    // v5.0.1: los puentes a los islotes ya no se encargan; los construyen los jugadores (los ya hechos se quedan).
    return PUBLIC_WORKS.filter((w) => !done.has(w.id) && w.level <= this.level);
  }

  /** Hace una obra (ya pagada). */
  doWork(id: string) {
    const s = this.state!;
    const [dx, , dz] = hallDoor(s, 4);
    const ground = (x: number, z: number) => this.deps.world.heightAt(x, z) + 1;
    if (id.startsWith('puente-')) {
      const plan = planBridge(this.build, Number(id.slice(7)));
      for (const [x, y, z, b] of plan?.blocks ?? []) this.deps.put(x, y, z, b);
    } else if (id === 'fuente') {
      this.deps.placeFurniture('fuente_plaza', dx, ground(dx, dz + 3), dz + 3, 0);
    } else if (id === 'farolas') {
      for (const [x, z] of [[s.x - 1, s.z - 1], [s.x + 11, s.z - 1], [s.x - 1, s.z + 11], [s.x + 11, s.z + 11]]) {
        this.deps.placeFurniture('farola', x, ground(x, z), z, 0);
      }
    } else if (id === 'bancos') {
      this.deps.placeFurniture('banco', dx - 3, ground(dx - 3, dz + 3), dz + 3, 0);
      this.deps.placeFurniture('banco', dx + 3, ground(dx + 3, dz + 3), dz + 3, 0);
    }
    s.works.push(id);
    this.deps.persist();
  }

  /** Sube un nivel el ayuntamiento (ya pagado). */
  upgrade() {
    const s = this.state!;
    const previous = s.level;
    s.level = Math.min(HALL_LEVELS.length, s.level + 1);
    buildHall(this.build, s, s.level, previous);
    if (s.flag !== undefined && s.level >= 3) placeFlag(this.build, s, s.level, s.flag);
    this.moveStaff();
    this.deps.changed();
    this.deps.persist();
  }
}
