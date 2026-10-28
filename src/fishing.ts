import * as THREE from 'three';
import { type Creature, type Habitat, fightOf, pickCreature, rollSize, sizeRange } from './creatures';
import { Block, isSolid, isWater } from './blocks';
import { type Biome, SEA_LEVEL, type World } from './world';

const CAST_RANGE = 12;
/** Segundos para reaccionar cuando pica. */
const BITE_WINDOW = 1.1;
/** Cuántos de la misma especie se pueden sacar de una zona en un día antes de que se agoten (v4.23). */
export const ZONE_CAP = 3;
/** Lado de cada zona de pesca, en bloques. */
const ZONE = 32;

type Phase = 'idle' | 'waiting' | 'bite' | 'reel';

export type FishingResult =
  | { kind: 'cast' }
  | { kind: 'no-water' }
  | { kind: 'reeled' }
  | { kind: 'hooked'; creature: Creature }
  | { kind: 'pull' }
  | { kind: 'too-early' };

/** Cómo es cada caña (v4.23): `bite` acorta la espera, `pull` es lo que recoge cada tirón y `strain` lo que tensa. */
export interface RodStats {
  bite: number;
  pull: number;
  strain: number;
}

export const RODS: Record<string, RodStats> = {
  cana: { bite: 1, pull: 0.12, strain: 0.16 },
  cana_hierro: { bite: 0.85, pull: 0.15, strain: 0.14 },
  cana_cristal: { bite: 0.7, pull: 0.18, strain: 0.12 },
  cana_legendaria: { bite: 0.5, pull: 0.22, strain: 0.09 },
};

export function rodStats(id: string | undefined): RodStats {
  return RODS[id ?? ''] ?? RODS.cana;
}

export type ReelEnd = 'caught' | 'snapped' | 'escaped';

/**
 * El minijuego de recoger el sedal (v4.23). Cada tirón acerca el pez (progreso) pero tensa el hilo; si la tensión
 * llega al tope, el hilo se rompe, y si dejas de tirar el pez se aleja hasta escaparse. Los peces grandes pelean
 * más: tiran del hilo a golpes (tensión de repente) y cuestan más de acercar.
 */
export class Reel {
  progress = 0.3;
  tension = 0;
  /** Un golpe del pez ahora mismo (para que la barra tiemble). */
  surge = 0;

  constructor(readonly fight: number, readonly rod: RodStats, private random: () => number = Math.random) {}

  pull() {
    this.progress += this.rod.pull * (1 - this.fight * 0.5);
    this.tension += this.rod.strain * (0.6 + this.fight * 0.8);
  }

  tick(dt: number): ReelEnd | null {
    this.tension = Math.max(0, this.tension - 0.45 * dt);
    this.progress -= (0.02 + this.fight * 0.06) * dt;
    this.surge = Math.max(0, this.surge - dt);
    if (this.random() < (0.3 + this.fight * 0.6) * dt) {
      this.tension += 0.08 + this.fight * 0.12;
      this.progress -= 0.03;
      this.surge = 0.3;
    }
    if (this.tension >= 1) return 'snapped';
    if (this.progress >= 1) return 'caught';
    if (this.progress <= 0) return 'escaped';
    return null;
  }
}

/** Lo que se sabe al lanzar: dónde estás y con qué pescas. */
export interface CastContext {
  hour: number;
  /** Caña que llevas en la mano. */
  rod?: string;
  biome?: Biome | null;
  /** Llevas señuelo: los raros pican más (v4.23). */
  lure?: boolean;
  /** Vas en el barco: en el mar salen también los de alta mar. */
  aboard?: boolean;
  /** Día de hoy, para el tope por zona. */
  today?: string;
}

/** Pescar: lanzar el corcho al agua, esperar a que pique, tirar a tiempo y recoger el sedal. */
export class Fishing {
  private phase: Phase = 'idle';
  private timer = 0;
  private spot = new THREE.Vector3();
  private fish: Creature | null = null;
  readonly bobber = new THREE.Group();
  /** La sombra del pez que se acerca al corcho (más grande cuanto más grande es el pez). */
  readonly shadow: THREE.Mesh;
  private t = 0;
  private shadowAngle = 0;
  reel: Reel | null = null;
  /** El último pez sacado y lo que medía. */
  landed: { creature: Creature; size: number } | null = null;
  private rod: RodStats = RODS.cana;
  /** Capturas de hoy por zona y especie: "zona|id" → cuántas (se repone al día siguiente). */
  private taken = new Map<string, number>();
  private takenDay = '';
  private zone = '';

  constructor(private world: World) {
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.22), new THREE.MeshLambertMaterial({ color: 0xe23b3b }));
    const white = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.22), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    red.position.y = 0.13;
    this.bobber.add(red, white);
    this.bobber.visible = false;
    const shape = new THREE.CircleGeometry(0.5, 12);
    shape.rotateX(-Math.PI / 2);
    shape.scale(0.6, 1, 1.3);
    this.shadow = new THREE.Mesh(shape, new THREE.MeshBasicMaterial({ color: 0x0b1a26, transparent: true, opacity: 0.45, depthWrite: false }));
    this.shadow.visible = false;
  }

  get active() {
    return this.phase !== 'idle';
  }

  get reeling() {
    return this.phase === 'reel';
  }

  /** Clic derecho con la caña: lanza, recoge, engancha cuando ha picado o da un tirón al sedal. */
  use(ray: THREE.Ray, ctx: CastContext | number): FishingResult {
    const c: CastContext = typeof ctx === 'number' ? { hour: ctx } : ctx;
    if (this.phase === 'reel') {
      this.reel!.pull();
      return { kind: 'pull' };
    }
    if (this.phase === 'bite') {
      const fish = this.fish!;
      this.phase = 'reel';
      this.reel = new Reel(fightOf(fish), this.rod);
      this.shadow.visible = false;
      return { kind: 'hooked', creature: fish };
    }
    if (this.phase === 'waiting') {
      this.stop();
      return { kind: 'too-early' };
    }

    // Punto donde el rayo de la mira corta la superficie del agua.
    // El agua puede estar a distintas alturas (el río baja por terrazas): se avanza por el rayo hasta tocarla.
    // Desde la v4.23 también se pesca en el hielo, por un agujero: hielo con agua debajo.
    if (ray.direction.y >= -0.01) return { kind: 'no-water' };
    const p = new THREE.Vector3();
    let kind: 'mar' | 'río' | null = null;
    for (let t = 0; t <= CAST_RANGE; t += 0.2) {
      ray.at(t, p);
      const x = Math.floor(p.x);
      const z = Math.floor(p.z);
      const y = Math.floor(p.y);
      const b = this.world.getBlock(x, y, z);
      if (isSolid(b)) {
        if (b === Block.Ice && isWater(this.world.getBlock(x, y - 1, z))) {
          kind = y - 1 > SEA_LEVEL ? 'río' : 'mar';
          p.set(x + 0.5, y + 1, z + 0.5);
        }
        break;
      }
      const surface = this.world.waterSurface(x, z);
      if (p.y > surface) continue;
      kind = this.world.waterKind(x, z);
      p.y = surface;
      break;
    }
    if (!kind) return { kind: 'no-water' };

    if (c.today && c.today !== this.takenDay) {
      this.takenDay = c.today;
      this.taken.clear();
    }
    this.zone = `${Math.floor(p.x / ZONE)},${Math.floor(p.z / ZONE)}`;
    const habitats: Habitat[] = kind === 'mar' && c.aboard ? ['mar', 'alta_mar'] : [kind];
    this.spot.copy(p);
    this.fish = pickCreature(habitats, c.hour, Math.random, c.biome ?? null, !!c.lure, (f) => (this.taken.get(`${this.zone}|${f.id}`) ?? 0) >= ZONE_CAP);
    if (!this.fish) return { kind: 'no-water' };
    this.rod = rodStats(c.rod);
    this.phase = 'waiting';
    this.timer = (2 + Math.random() * 6) * this.rod.bite;
    this.bobber.visible = true;
    this.bobber.position.copy(p);
    // La sombra del pez: su tamaño según lo grande que es la especie.
    const big = Math.min(3, Math.max(0.5, sizeRange(this.fish)[1] / 60));
    this.shadow.scale.setScalar(big);
    this.shadow.visible = true;
    this.shadowAngle = Math.random() * Math.PI * 2;
    return { kind: 'cast' };
  }

  /** Con cebo (v4.21): pica mucho antes. */
  hurry() {
    if (this.phase === 'waiting') this.timer = Math.min(this.timer, 1 + Math.random() * 1.5);
  }

  /**
   * Devuelve 'bite' cuando pica y 'escaped' si no se tira a tiempo. Recogiendo el sedal: 'caught' (queda en
   * `landed`), 'snapped' si se rompe el hilo o 'escaped' si se aleja.
   */
  update(dt: number, player: THREE.Vector3): 'bite' | 'escaped' | 'cancelled' | 'caught' | 'snapped' | null {
    if (this.phase === 'idle') return null;
    this.t += dt;
    if (this.spot.distanceTo(player) > CAST_RANGE + 4) {
      this.stop();
      return 'cancelled';
    }
    this.timer -= dt;
    const y = this.world.waterSurface(Math.floor(this.spot.x), Math.floor(this.spot.z)) - 0.06;
    const surface = Math.max(y, this.spot.y - 0.06);
    if (this.phase === 'waiting') {
      this.bobber.position.y = surface + Math.sin(this.t * 2.5) * 0.03;
      // Pequeños toques antes de picar de verdad.
      if (this.timer < 1.5 && Math.sin(this.t * 9) > 0.95) this.bobber.position.y -= 0.05;
      // La sombra da vueltas cada vez más cerca del corcho.
      const r = Math.min(3, 0.4 + this.timer * 0.5);
      this.shadowAngle += dt * 0.8;
      this.shadow.position.set(this.spot.x + Math.cos(this.shadowAngle) * r, surface - 0.02, this.spot.z + Math.sin(this.shadowAngle) * r);
      this.shadow.rotation.y = -this.shadowAngle;
      if (this.timer <= 0) {
        this.phase = 'bite';
        this.timer = BITE_WINDOW;
        return 'bite';
      }
    } else if (this.phase === 'bite') {
      this.bobber.position.y = surface - 0.22;
      if (this.timer <= 0) {
        this.stop();
        return 'escaped';
      }
    } else if (this.phase === 'reel') {
      const reel = this.reel!;
      this.bobber.position.y = surface - 0.15 - reel.surge * 0.3;
      const end = reel.tick(dt);
      if (end === 'caught') {
        const fish = this.fish!;
        const k = `${this.zone}|${fish.id}`;
        this.taken.set(k, (this.taken.get(k) ?? 0) + 1);
        this.landed = { creature: fish, size: rollSize(fish) };
      }
      if (end) {
        this.stop();
        return end;
      }
    }
    return null;
  }

  stop() {
    this.phase = 'idle';
    this.fish = null;
    this.reel = null;
    this.bobber.visible = false;
    this.shadow.visible = false;
  }
}
