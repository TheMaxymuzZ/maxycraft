import * as THREE from 'three';
import { Block, isSolid } from './blocks';
import { columnRandom } from './noise';
import { SEA_LEVEL, type Plot, type World } from './world';

export type Personality = 'alegre' | 'gruñón' | 'dormilón' | 'presumido';
type Species = 'gato' | 'conejo' | 'oso' | 'pato' | 'perro' | 'rana' | 'ardilla';

interface SpeciesLook {
  fur: number;
  belly: number;
  ears: 'punta' | 'largas' | 'redondas' | 'caidas' | 'ninguna';
  beak?: number;
}

const LOOKS: Record<Species, SpeciesLook> = {
  gato: { fur: 0xf2a65a, belly: 0xfff1dc, ears: 'punta' },
  conejo: { fur: 0xf4f0ec, belly: 0xffd9e0, ears: 'largas' },
  oso: { fur: 0x9a6a44, belly: 0xd9b48a, ears: 'redondas' },
  pato: { fur: 0xfbf7ee, belly: 0xffffff, ears: 'ninguna', beak: 0xf5a623 },
  perro: { fur: 0xd8b07a, belly: 0xfff4e0, ears: 'caidas' },
  rana: { fur: 0x7cc46a, belly: 0xe8f5c8, ears: 'ninguna' },
  ardilla: { fur: 0xb8743a, belly: 0xf4dcb8, ears: 'punta' },
};

interface Profile {
  name: string;
  species: Species;
  personality: Personality;
  /** Coletilla que repite al final de las frases, como en Animal Crossing. */
  catchphrase: string;
  shirt: number;
  /** Objetos que más le gustan como regalo. */
  likes: 'fruta' | 'conchas' | 'flores' | 'madera';
  /** Horario propio de sueño; si no, el de su personalidad. */
  sleep?: [number, number];
  /** No pasea: se queda en la puerta (la dependienta de la tienda). */
  stationary?: boolean;
}

/** La dependienta de la tienda, abierta de 8:00 a 22:00. */
const SHOPKEEPER: Profile = {
  name: 'Avellana', species: 'ardilla', personality: 'alegre', catchphrase: 'cric', shirt: 0x3f8f5a,
  likes: 'fruta', sleep: [22, 8], stationary: true,
};

const PROFILES: Profile[] = [
  { name: 'Canela', species: 'gato', personality: 'alegre', catchphrase: 'miau', shirt: 0xe86a8a, likes: 'flores' },
  { name: 'Bruno', species: 'oso', personality: 'dormilón', catchphrase: 'ñam', shirt: 0x5b8bd6, likes: 'fruta' },
  { name: 'Pelusa', species: 'conejo', personality: 'presumido', catchphrase: 'boing', shirt: 0x9b6bd6, likes: 'conchas' },
  { name: 'Ramón', species: 'rana', personality: 'gruñón', catchphrase: 'croac', shirt: 0xd9a441, likes: 'madera' },
  { name: 'Lola', species: 'perro', personality: 'alegre', catchphrase: 'guau', shirt: 0x5fb07a, likes: 'fruta' },
  { name: 'Toto', species: 'pato', personality: 'dormilón', catchphrase: 'cuac', shirt: 0xe0704a, likes: 'conchas' },
];

/** Horas en las que cada personalidad está en casa durmiendo. */
const SLEEP: Record<Personality, [number, number]> = {
  alegre: [22, 7],
  'gruñón': [0, 8],
  'dormilón': [20, 10],
  presumido: [23, 9],
};

export interface VillagerMemory {
  friendship: number;
  talkedDay?: string;
  giftDay?: string;
}

const WALK_SPEED = 1.4;

export class Villager {
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3();
  private target: THREE.Vector3 | null = null;
  private wait = 0;
  private legs: THREE.Mesh[] = [];
  private arms: THREE.Mesh[] = [];
  private walkPhase = 0;
  private facing = 0;
  /** Está hablando con el jugador: se para y le mira. */
  talking = false;
  asleep = false;
  greeted = false;

  constructor(readonly profile: Profile, readonly home: Plot, private world: World, public memory: VillagerMemory) {
    this.buildModel();
    const [dx, dy, dz] = home.door;
    this.position.set(dx + 0.5, dy, dz + 0.5);
    this.group.position.copy(this.position);
  }

  get name() {
    return this.profile.name;
  }

  get isShopkeeper() {
    return !!this.profile.stationary;
  }

  // --- Modelo de bloques: cabeza grande, como los vecinos de Animal Crossing ---

  private buildModel() {
    const look = LOOKS[this.profile.species];
    const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c });
    const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
      m.position.set(x, y, z);
      this.group.add(m);
      return m;
    };
    // Las piernas y los brazos giran desde arriba, así que la geometría cuelga del punto de giro.
    const limb = (w: number, h: number, color: number, x: number, y: number) => {
      const g = new THREE.BoxGeometry(w, h, w);
      g.translate(0, -h / 2, 0);
      const m = new THREE.Mesh(g, mat(color));
      m.position.set(x, y, 0);
      this.group.add(m);
      return m;
    };

    this.legs.push(limb(0.18, 0.32, look.fur, -0.12, 0.32), limb(0.18, 0.32, look.fur, 0.12, 0.32));
    box(0.5, 0.42, 0.34, this.profile.shirt, 0, 0.53, 0);
    this.arms.push(limb(0.14, 0.34, this.profile.shirt, -0.32, 0.72), limb(0.14, 0.34, this.profile.shirt, 0.32, 0.72));

    const headY = 1.05;
    box(0.72, 0.62, 0.62, look.fur, 0, headY, 0);
    box(0.4, 0.22, 0.04, look.belly, 0, headY - 0.14, 0.31); // hocico
    box(0.08, 0.12, 0.03, 0x1d1d1d, -0.16, headY + 0.04, 0.32);
    box(0.08, 0.12, 0.03, 0x1d1d1d, 0.16, headY + 0.04, 0.32);
    box(0.1, 0.06, 0.03, 0xf28a9a, -0.26, headY - 0.08, 0.32); // mejillas
    box(0.1, 0.06, 0.03, 0xf28a9a, 0.26, headY - 0.08, 0.32);
    if (look.beak) box(0.26, 0.1, 0.16, look.beak, 0, headY - 0.1, 0.36);
    else box(0.08, 0.06, 0.04, 0x5a3a2a, 0, headY - 0.07, 0.34); // nariz

    if (this.profile.species === 'ardilla') {
      box(0.3, 0.7, 0.24, look.fur, 0, 0.75, -0.34); // cola grande
      box(0.3, 0.24, 0.3, look.fur, 0, 1.18, -0.42);
    }

    switch (look.ears) {
      case 'punta':
        box(0.16, 0.18, 0.1, look.fur, -0.22, headY + 0.38, 0);
        box(0.16, 0.18, 0.1, look.fur, 0.22, headY + 0.38, 0);
        break;
      case 'largas':
        box(0.12, 0.42, 0.08, look.fur, -0.14, headY + 0.5, 0);
        box(0.12, 0.42, 0.08, look.fur, 0.14, headY + 0.5, 0);
        box(0.06, 0.3, 0.02, look.belly, -0.14, headY + 0.5, 0.05);
        box(0.06, 0.3, 0.02, look.belly, 0.14, headY + 0.5, 0.05);
        break;
      case 'redondas':
        box(0.18, 0.16, 0.1, look.fur, -0.28, headY + 0.34, 0);
        box(0.18, 0.16, 0.1, look.fur, 0.28, headY + 0.34, 0);
        break;
      case 'caidas':
        box(0.12, 0.34, 0.2, 0x8a5a36, -0.42, headY, 0);
        box(0.12, 0.34, 0.2, 0x8a5a36, 0.42, headY, 0);
        break;
      case 'ninguna':
        if (this.profile.species === 'rana') {
          box(0.2, 0.16, 0.2, look.fur, -0.2, headY + 0.36, 0.12);
          box(0.2, 0.16, 0.2, look.fur, 0.2, headY + 0.36, 0.12);
        }
        break;
    }
  }

  /** Caja para saber si el jugador está apuntando al vecino. */
  bounds(out: THREE.Box3): THREE.Box3 {
    const p = this.position;
    return out.set(new THREE.Vector3(p.x - 0.4, p.y, p.z - 0.4), new THREE.Vector3(p.x + 0.4, p.y + 1.6, p.z + 0.4));
  }

  isSleepTime(hour: number): boolean {
    const [from, to] = this.profile.sleep ?? SLEEP[this.profile.personality];
    return from > to ? hour >= from || hour < to : hour >= from && hour < to;
  }

  update(dt: number, hour: number, player: THREE.Vector3) {
    const sleepy = this.isSleepTime(hour);
    const [dx, dy, dz] = this.home.door;

    if (this.asleep) {
      if (sleepy) return;
      // Sale de casa por la mañana.
      this.asleep = false;
      this.group.visible = true;
      this.position.set(dx + 0.5, dy, dz + 0.5);
      this.target = null;
    }

    if (this.talking) {
      this.faceTowards(player.x, player.z, dt * 8);
      this.animate(dt, false);
      this.group.position.copy(this.position);
      return;
    }

    if (sleepy && !this.target) this.target = new THREE.Vector3(dx + 0.5, dy, dz + 0.5);

    if (!this.target) {
      this.wait -= dt;
      if (this.profile.stationary) this.faceTowards(this.position.x, this.position.z + 1, dt * 4);
      else if (this.wait <= 0) this.pickTarget();
      this.animate(dt, false);
    } else {
      const to = this.target;
      const ddx = to.x - this.position.x;
      const ddz = to.z - this.position.z;
      const dist = Math.hypot(ddx, ddz);
      if (dist < 0.15) {
        this.target = null;
        this.wait = 2 + Math.random() * 5;
        if (sleepy) {
          // Ha llegado a la puerta: entra a dormir.
          this.asleep = true;
          this.group.visible = false;
        }
      } else {
        const step = Math.min(dist, WALK_SPEED * dt);
        const nx = this.position.x + (ddx / dist) * step;
        const nz = this.position.z + (ddz / dist) * step;
        const ground = this.groundAt(nx, nz, this.position.y);
        if (ground === null || Math.abs(ground - this.position.y) > 1.01) {
          this.target = null; // camino cortado: busca otro sitio
          this.wait = 0.5;
        } else {
          this.position.set(nx, ground, nz);
          this.faceTowards(to.x, to.z, dt * 6);
        }
        this.animate(dt, true);
      }
    }
    this.group.position.copy(this.position);
  }

  private pickTarget() {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 2 + Math.random() * 10;
      const x = this.home.x + Math.cos(a) * d;
      const z = this.home.z + 4 + Math.sin(a) * d;
      const g = this.groundAt(x, z, this.position.y);
      if (g !== null) {
        this.target = new THREE.Vector3(x, g, z);
        return;
      }
    }
    this.wait = 1;
  }

  /** Altura donde se pisa en (x, z), o null si es agua, un hueco o un muro. */
  private groundAt(x: number, z: number, fromY: number): number | null {
    const bx = Math.floor(x);
    const bz = Math.floor(z);
    for (let y = Math.floor(fromY) + 1; y >= Math.floor(fromY) - 2; y--) {
      if (!isSolid(this.world.getBlock(bx, y, bz))) continue;
      if (y < SEA_LEVEL + 1) return null; // no se meten en el agua
      if (isSolid(this.world.getBlock(bx, y + 1, bz)) || isSolid(this.world.getBlock(bx, y + 2, bz))) return null;
      const top = this.world.getBlock(bx, y, bz);
      if (top === Block.Leaves || top === Block.PalmLeaves) return null;
      return y + 1;
    }
    return null;
  }

  private faceTowards(x: number, z: number, t: number) {
    const want = Math.atan2(x - this.position.x, z - this.position.z);
    let diff = want - this.facing;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.facing += diff * Math.min(1, t);
    this.group.rotation.y = this.facing;
  }

  private animate(dt: number, walking: boolean) {
    if (walking) this.walkPhase += dt * 9;
    else this.walkPhase *= Math.pow(0.001, dt);
    const swing = Math.sin(this.walkPhase) * (walking ? 0.6 : 0);
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing * 0.8;
    this.arms[1].rotation.x = swing * 0.8;
  }
}

/** Elige vecinos para las casas de la isla, siempre los mismos para cada semilla. */
export function createVillagers(world: World, memories: Record<string, VillagerMemory>): Villager[] {
  const pool = [...PROFILES];
  const shop = world.plots.find((p) => p.kind === 'shop');
  const keeper = shop ? [new Villager(SHOPKEEPER, shop, world, memories[SHOPKEEPER.name] ?? { friendship: 0 })] : [];
  return [...keeper, ...world.plots.filter((p) => p.kind === 'house').map((plot, i) => {
    const pick = Math.floor(columnRandom(i, 99, world.seed) * pool.length);
    const profile = pool.splice(pick, 1)[0];
    return new Villager(profile, plot, world, memories[profile.name] ?? { friendship: 0 });
  })];
}
