// El astillero en la partida (v4.21): lo construye el anfitrión en ruinas la primera vez, pone a Bartolo en el
// taller y a Brújula en el muelle, cobra las etapas, los barcos y las mejoras, y lleva tu barco: subir, navegar,
// la bodega y bajar en la orilla. Lo que no depende de la partida está en shipyard.ts y boat.ts.
import * as THREE from 'three';
import { Block, isSolid, isWater } from '../blocks';
import { Boat } from '../boat';
import type { BuildWorld } from '../buildings';
import { Furniture } from '../furniture';
import type { Inventory } from '../inventory';
import { itemDef } from '../items';
import type { MapMarker } from '../map';
import type { Cell } from '../pathfind';
import {
  BOAT_SPOT, type BoatKind, type BoatSave, type Cost, HOME_STAGE, KIOSK_KEEPER, KIOSK_SPOT, MAX_STAGE, SHIPWRIGHT, SHIPWRIGHT_SPOT, STAGE_COSTS,
  type ShipyardSite, type UpgradeId, boatModel, buildShipyard, buildWorkersHome, costText, findShipyardSite, findWorkersHome, isBoatSave, isShipyardSite,
  shipyardCell, shipyardCenter, shipyardPoint, shipyardSeaward, upgradeOf, windOf, workerBeds,
} from '../shipyard';
import { type Profile, Villager, type VillagerMemory } from '../villagers';
import { SEA_LEVEL, type World } from '../world';

export interface ShipyardDeps {
  world: World;
  villagers: Villager[];
  scene: THREE.Scene;
  /** Pone un bloque para todos los jugadores (WorldSync). */
  put(x: number, y: number, z: number, b: Block): void;
  memories: Record<string, VillagerMemory>;
  /** En tu isla: el único que construye y el dueño del barco. */
  host: boolean;
  inventory: Inventory;
  wallet(): number;
  pay(n: number): void;
  /** Para la luz de los muebles (las camas de la casa de los del astillero no alumbran, pero así es como las demás). */
  lampHook?: (x: number, y: number, z: number, level: number) => void;
}

export class ShipyardGame {
  site: ShipyardSite | null;
  boat: Boat | null = null;
  /** Vas en el barco. */
  sailing = false;
  private workers = new Map<string, Villager>();
  private box = new THREE.Box3();
  private seat = new THREE.Vector3();
  private windDay = '';
  private windNow = { angle: 0, strength: 0.5 };
  /** Las camas de su casa (v5.1): no se guardan, salen cada vez. */
  private fixtures: Furniture;
  private bedsPlaced = false;

  /**
   * `saved`: el astillero de la partida o de la isla del amigo. Si no hay y es tu isla, se busca una playa (la
   * del otro lado de la isla que la avioneta, lejos de la terminal) y se levantan las ruinas.
   */
  constructor(private deps: ShipyardDeps, saved: unknown, boat: unknown, beaches: { x: number; z: number; dx: number; dz: number }[]) {
    this.site = isShipyardSite(saved) ? { ...saved } : null;
    if (!this.site && deps.host && beaches.length) {
      this.site = findShipyardSite(this.buildWorld(), beaches[0]);
      buildShipyard(this.buildWorld(), this.site);
    }
    if (isBoatSave(boat)) this.setBoat(new Boat(boat));
    this.fixtures = new Furniture([], deps.lampHook ?? null);
    deps.scene.add(this.fixtures.group);
    // Partidas de antes de la v5.1 con el astillero ya arreglado: la casa sale ahora.
    this.buildHome();
    this.spawn();
  }

  /**
   * Casa de Bartolo y Brújula (v5.1): aparece al arreglar el astillero, detrás de él, y allí se van a dormir al
   * cerrar (andando, como los demás tenderos) en vez de desaparecer.
   */
  private buildHome() {
    const s = this.site;
    if (!s || s.home || !this.deps.host || s.stage < HOME_STAGE) return;
    const home = findWorkersHome(this.buildWorld(), s);
    if (!home) return;
    buildWorkersHome(this.buildWorld(), home);
    s.home = home;
  }

  get stage(): number {
    return this.site?.stage ?? 0;
  }

  private buildWorld(): BuildWorld {
    const { world } = this.deps;
    return {
      getBlock: (x, y, z) => world.getBlock(x, y, z),
      setBlock: (x, y, z, b) => this.deps.put(x, y, z, b),
      heightAt: (x, z) => world.heightAt(x, z),
      isEdited: (x, y, z) => world.isEdited(x, y, z),
      plotAt: (x, z, m) => world.plotAt(x, z, m),
    };
  }

  private setBoat(b: Boat) {
    if (this.boat) this.deps.scene.remove(this.boat.group);
    this.boat = b;
    this.deps.scene.add(b.group);
  }

  /** Bartolo está desde las ruinas; Brújula llega cuando el muelle se puede pisar (etapa 1). */
  private spawn() {
    const s = this.site;
    if (!s) return;
    const [sx, sz] = shipyardSeaward(s);
    this.worker(SHIPWRIGHT, SHIPWRIGHT_SPOT, [sx, sz]);
    if (s.stage >= 1) this.worker(KIOSK_KEEPER, KIOSK_SPOT, [-sx, -sz]);
    if (!s.home) return;
    const beds = workerBeds(s.home);
    if (!this.bedsPlaced) {
      this.bedsPlaced = true;
      for (const b of beds) this.fixtures.place('cama', ...b, 0);
    }
    const bartolo = this.workers.get(SHIPWRIGHT.name);
    const brujula = this.workers.get(KIOSK_KEEPER.name);
    if (bartolo) bartolo.rest = beds[0];
    if (brujula) brujula.rest = beds[1];
  }

  /** Dónde está la casa de los del astillero (para el mapa). */
  get home() {
    return this.site?.home ?? null;
  }

  private worker(profile: Profile, at: Cell, look: [number, number]) {
    if (this.workers.has(profile.name)) return;
    const [x, y, z] = shipyardCell(this.site!, ...at);
    const spot = { kind: 'house' as const, x, z: z - 3, y: y - 1, roof: Block.RoofBlue, door: [x, y, z] as Cell };
    const v = new Villager(profile, spot, this.deps.world, this.deps.memories[profile.name] ?? { friendship: 0 });
    v.lookAt = look;
    this.deps.villagers.push(v);
    this.deps.scene.add(v.group, v.extras);
    this.workers.set(profile.name, v);
  }

  /** El viento de hoy (cambia cada día). */
  wind(today: string) {
    if (today !== this.windDay) {
      this.windDay = today;
      this.windNow = windOf(today);
    }
    return this.windNow;
  }

  // --- Lo que se paga a Bartolo ---

  /** Lo que falta para pagar algo, o null si lo llevas todo. */
  private missing(c: Cost): string | null {
    for (const [id, n] of Object.entries(c.items ?? {})) {
      if (this.deps.inventory.countOf(id) < n) return `Te falta: ${itemDef(id).name.toLowerCase()} (${this.deps.inventory.countOf(id)} de ${n})`;
    }
    if ((c.bayas ?? 0) > this.deps.wallet()) return 'No llevas bayas suficientes';
    return null;
  }

  private charge(c: Cost) {
    for (const [id, n] of Object.entries(c.items ?? {})) this.deps.inventory.remove(id, n);
    if (c.bayas) this.deps.pay(c.bayas);
  }

  costText(c: Cost): string {
    return costText(c, (id) => itemDef(id).name);
  }

  /** Paga la siguiente etapa y la construye. */
  repair(): string | null {
    const s = this.site;
    if (!s || !this.deps.host) return 'Eso solo se hace en tu isla';
    if (s.stage >= MAX_STAGE) return 'El astillero ya está entero';
    const c = STAGE_COSTS[s.stage];
    const problem = this.missing(c);
    if (problem) return problem;
    this.charge(c);
    s.stage++;
    buildShipyard(this.buildWorld(), s);
    this.buildHome();
    this.spawn();
    return null;
  }

  /** Hace un barco nuevo (el de antes se cambia, con su bodega y sus mejoras). */
  build(kind: BoatKind): string | null {
    const s = this.site;
    if (!s || !this.deps.host) return 'Eso solo se hace en tu isla';
    const m = boatModel(kind);
    if (s.stage < m.stage) return 'El astillero aún no está para eso';
    const problem = this.missing(m.cost);
    if (problem) return problem;
    this.charge(m.cost);
    this.makeBoat(kind);
    return null;
  }

  private makeBoat(kind: BoatKind) {
    const s = this.site!;
    if (this.boat) {
      this.boat.refit(kind);
      if (!this.sailing) this.moor();
    } else {
      const [x, z] = shipyardPoint(s, ...BOAT_SPOT);
      const [dx, dz] = shipyardSeaward(s);
      this.setBoat(new Boat({ kind, upgrades: {}, x, z, yaw: Math.atan2(-dx, -dz), hold: [] }));
    }
  }

  // --- Modo tester (v5.1): sin cobrar ---

  /** Arregla el astillero hasta la etapa `stage` (de 0 a 4) de golpe. */
  setStage(stage: number): string | null {
    const s = this.site;
    if (!s || !this.deps.host) return 'Aquí no hay astillero';
    const to = Math.max(0, Math.min(MAX_STAGE, stage));
    while (s.stage < to) {
      s.stage++;
      buildShipyard(this.buildWorld(), s);
    }
    this.buildHome();
    this.spawn();
    return null;
  }

  /** Te da ese barco (y arregla el astillero lo que haga falta para él). */
  giveBoat(kind: BoatKind): string | null {
    const problem = this.setStage(Math.max(this.stage, boatModel(kind).stage));
    if (problem) return problem;
    this.makeBoat(kind);
    return null;
  }

  upgrade(id: UpgradeId): string | null {
    const b = this.boat;
    if (!b || !this.deps.host) return 'Primero necesitas un barco';
    const u = upgradeOf(id);
    if ((b.upgrades[id] ?? 0) >= u.max) return 'Ya la lleva';
    if (this.stage < u.stage) return 'El astillero aún no está para eso';
    const problem = this.missing(u.cost);
    if (problem) return problem;
    this.charge(u.cost);
    b.refit(b.kind, { ...b.upgrades, [id]: (b.upgrades[id] ?? 0) + 1 });
    return null;
  }

  /** Deja el barco en el agua en (x, z) mirando hacia (dx, dz): al llegar navegando a otra isla (v4.22). */
  anchorAt(x: number, z: number, dx: number, dz: number) {
    if (!this.boat) return;
    this.boat.x = x;
    this.boat.z = z;
    this.boat.yaw = Math.atan2(-dx, -dz);
    this.boat.speed = 0;
  }

  /** Vuelve a dejar el barco amarrado junto a la grada. */
  moor() {
    const s = this.site;
    if (!s || !this.boat) return;
    const [x, z] = shipyardPoint(s, ...BOAT_SPOT);
    const [dx, dz] = shipyardSeaward(s);
    this.boat.x = x;
    this.boat.z = z;
    this.boat.yaw = Math.atan2(-dx, -dz);
    this.boat.speed = 0;
  }

  // --- Ir en barco ---

  /** Si el rayo apunta al barco (más cerca que `max`). */
  aimed(ray: THREE.Ray, max: number): boolean {
    if (!this.boat) return false;
    const hit = ray.intersectBox(this.boat.bounds(this.box), new THREE.Vector3());
    return !!hit && hit.distanceTo(ray.origin) < max;
  }

  /** Te sientas en el barco. Devuelve dónde quedas sentado. */
  board(): THREE.Vector3 | null {
    if (!this.boat) return null;
    this.sailing = true;
    return this.boat.seat(this.seat).clone();
  }

  /** Busca dónde bajar: suelo firme con sitio encima, a menos de tres bloques del barco. */
  landing(): [number, number, number] | null {
    if (!this.boat) return null;
    const { world } = this.deps;
    let best: [number, number, number] | null = null;
    let bestD = Infinity;
    const bx = Math.floor(this.boat.x);
    const bz = Math.floor(this.boat.z);
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        for (let y = SEA_LEVEL + 3; y >= SEA_LEVEL; y--) {
          const b = world.getBlock(bx + dx, y, bz + dz);
          if (!isSolid(b) || isWater(b)) continue;
          const free = !isSolid(world.getBlock(bx + dx, y + 1, bz + dz)) && !isSolid(world.getBlock(bx + dx, y + 2, bz + dz))
            && !isWater(world.getBlock(bx + dx, y + 1, bz + dz));
          const d = dx * dx + dz * dz;
          if (free && d < bestD) {
            bestD = d;
            best = [bx + dx + 0.5, y + 1, bz + dz + 0.5];
          }
          break;
        }
      }
    }
    return best;
  }

  /** Te bajas en la orilla (si la hay). */
  leave(): [number, number, number] | null {
    const spot = this.landing();
    if (spot) this.sailing = false;
    return spot;
  }

  /** Un fotograma: el barco avanza con lo que pulsas y se mece. Devuelve si ha chocado fuerte. */
  update(dt: number, seconds: number, night: number, today: string, drive: { throttle: number; turn: number } | null): boolean {
    const b = this.boat;
    if (!b) return false;
    const w = this.wind(today);
    const bumped = this.sailing && drive ? b.drive(this.deps.world, w, drive.throttle, drive.turn, dt) : false;
    b.update(seconds, night, w);
    return bumped;
  }

  /** Dónde va sentado ahora quien lleva el barco. */
  seatNow(out: THREE.Vector3): THREE.Vector3 | null {
    return this.boat ? this.boat.seat(out) : null;
  }

  markers(): MapMarker[] {
    const out: MapMarker[] = [];
    if (this.site) {
      const [x, z] = shipyardCenter(this.site);
      out.push({ x, z, icon: '⚓', label: this.site.stage ? 'Astillero' : 'Ruinas del astillero', kind: 'edificios' });
      if (this.site.home) out.push({ x: this.site.home[0], z: this.site.home[2], icon: '🏠', label: 'Casa de Bartolo y Brújula', kind: 'vecinos' });
    }
    if (this.boat) out.push({ x: this.boat.x, z: this.boat.z, icon: '⛵', label: `Tu ${boatModel(this.boat.kind).name.toLowerCase()}`, kind: 'edificios' });
    return out;
  }

  /** Para la partida guardada y la foto de la isla que se manda a los amigos. */
  save(): { shipyard?: ShipyardSite; boat?: BoatSave } {
    return { shipyard: this.site ?? undefined, boat: this.boat?.save() };
  }
}
