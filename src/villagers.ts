import * as THREE from 'three';
import { Block, isBarrier, isSolid } from './blocks';
import { columnRandom } from './noise';
import { type Species, buildVillagerModel } from './villagerModel';
import { type MysteryKind, SEA_LEVEL, type Plot, type World } from './world';

export type Personality = 'alegre' | 'gruñón' | 'dormilón' | 'presumido' | 'deportista' | 'dulce';
export type { Species };

/** Cómo se dice cada personalidad, para la ficha del vecino. */
export const PERSONALITY_NAMES: Record<Personality, string> = {
  alegre: 'Alegre', 'gruñón': 'Gruñón', 'dormilón': 'Dormilón', presumido: 'Presumido', deportista: 'Deportista', dulce: 'Dulce',
};

export const SPECIES_NAMES: Record<Species, string> = {
  gato: 'Gato', conejo: 'Conejo', oso: 'Oso', pato: 'Pato', perro: 'Perro', rana: 'Rana', ardilla: 'Ardilla', tortuga: 'Tortuga',
  oveja: 'Oveja', cerdo: 'Cerdo', 'pingüino': 'Pingüino', koala: 'Koala', zorro: 'Zorro', elefante: 'Elefante',
};

export interface Profile {
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
  /** No pasea: se queda en la puerta (la dependienta y la conservadora). */
  stationary?: boolean;
  role?: 'shop' | 'museum' | 'pilot';
  /** Cumpleaños: [mes, día]. */
  birthday: [number, number];
  /** Lo que más le gusta hacer. */
  hobby: string;
  /** Color de pelo propio (si no, el de su especie). */
  fur?: number;
  pattern?: 'rayas' | 'lunares';
}

/** La conservadora del museo, que está siempre abierto. */
const CURATOR: Profile = {
  name: 'Matilde', species: 'tortuga', personality: 'dormilón', catchphrase: 'ejem', shirt: 0x6a5acd,
  likes: 'conchas', sleep: [0, 0], stationary: true, role: 'museum', birthday: [6, 5], hobby: 'ordenar fósiles',
};

/** La dependienta de la tienda, abierta de 8:00 a 22:00. */
const SHOPKEEPER: Profile = {
  name: 'Avellana', species: 'ardilla', personality: 'alegre', catchphrase: 'cric', shirt: 0x3f8f5a,
  likes: 'fruta', sleep: [22, 8], stationary: true, role: 'shop', birthday: [9, 18], hobby: 'contar bayas',
};

/** El piloto de la avioneta, que espera siempre junto al avión. */
export const PILOT: Profile = {
  name: 'Plumas', species: 'pato', personality: 'alegre', catchphrase: 'vrum', shirt: 0x2f6fb0,
  likes: 'conchas', sleep: [0, 0], stationary: true, role: 'pilot', birthday: [7, 17], hobby: 'mirar las nubes',
};

/** Vecinos que solo se encuentran de vacaciones en las islas misteriosas. */
const VISITORS: Profile[] = [
  { name: 'Nube', species: 'conejo', personality: 'dormilón', catchphrase: 'puf', shirt: 0x8fc6e8, likes: 'flores', birthday: [5, 8], hobby: 'echarse la siesta al sol' },
  { name: 'Trufa', species: 'perro', personality: 'gruñón', catchphrase: 'grr', shirt: 0x7a5a8a, fur: 0x8a6a52, likes: 'madera', birthday: [12, 3], hobby: 'arreglar cosas' },
  { name: 'Mora', species: 'gato', personality: 'presumido', catchphrase: 'chic', shirt: 0xd04a7a, fur: 0x4a4250, pattern: 'lunares', likes: 'conchas', birthday: [2, 19], hobby: 'probarse ropa' },
  { name: 'Bombón', species: 'oso', personality: 'alegre', catchphrase: 'mmm', shirt: 0xf0b040, likes: 'fruta', birthday: [6, 24], hobby: 'hacer pasteles' },
  { name: 'Saltarín', species: 'rana', personality: 'alegre', catchphrase: 'hop', shirt: 0x4ab0a0, likes: 'flores', birthday: [4, 1], hobby: 'saltar charcos' },
  { name: 'Castaña', species: 'ardilla', personality: 'presumido', catchphrase: 'tic', shirt: 0xb05a3a, likes: 'fruta', birthday: [10, 12], hobby: 'decorar su casa' },
  { name: 'Lenta', species: 'tortuga', personality: 'dormilón', catchphrase: 'zzz', shirt: 0x6a9a5a, fur: 0xb4cc96, likes: 'madera', birthday: [8, 30], hobby: 'mirar el mar' },
  // Personajes nuevos (v2.7): se encuentran de vacaciones en las islas misteriosas.
  { name: 'Algodón', species: 'oveja', personality: 'dulce', catchphrase: 'bee', shirt: 0xf0a0c0, likes: 'flores', birthday: [3, 3], hobby: 'tejer bufandas' },
  { name: 'Rizos', species: 'oveja', personality: 'presumido', catchphrase: 'divino', shirt: 0x6a4ab0, likes: 'conchas', birthday: [11, 21], hobby: 'peinarse', pattern: 'rayas' },
  { name: 'Chispa', species: 'zorro', personality: 'deportista', catchphrase: 'zas', shirt: 0x3a7ad0, likes: 'madera', birthday: [7, 4], hobby: 'escalar montañas', pattern: 'rayas' },
  { name: 'Rubí', species: 'zorro', personality: 'presumido', catchphrase: 'ay', shirt: 0xc83a4a, likes: 'conchas', birthday: [1, 12], hobby: 'hacerse fotos', fur: 0xd0603a },
  { name: 'Rosita', species: 'cerdo', personality: 'alegre', catchphrase: 'oinc', shirt: 0x7ad0c0, likes: 'fruta', birthday: [5, 20], hobby: 'cantar', pattern: 'lunares' },
  { name: 'Pancho', species: 'cerdo', personality: 'gruñón', catchphrase: 'grunf', shirt: 0x5a6a3a, likes: 'madera', birthday: [9, 2], hobby: 'cocinar', fur: 0xe0a0a8 },
  { name: 'Hielo', species: 'pingüino', personality: 'deportista', catchphrase: 'brr', shirt: 0xe04a3a, likes: 'conchas', birthday: [1, 25], hobby: 'nadar en agua fría' },
  { name: 'Copito', species: 'pingüino', personality: 'dulce', catchphrase: 'pío', shirt: 0x8ad0f0, likes: 'flores', birthday: [12, 18], hobby: 'hacer muñecos de nieve', fur: 0x3a4a6a, pattern: 'lunares' },
  { name: 'Eucalipto', species: 'koala', personality: 'dormilón', catchphrase: 'mmh', shirt: 0x7aa05a, likes: 'madera', birthday: [8, 15], hobby: 'abrazar árboles' },
  { name: 'Kiwi', species: 'koala', personality: 'alegre', catchphrase: 'yuju', shirt: 0xf0c040, likes: 'fruta', birthday: [4, 9], hobby: 'pintar', fur: 0xb0a8a0, pattern: 'rayas' },
  { name: 'Trompi', species: 'elefante', personality: 'dulce', catchphrase: 'tuuu', shirt: 0xf09a50, likes: 'fruta', birthday: [6, 11], hobby: 'regar flores' },
  { name: 'Duque', species: 'elefante', personality: 'presumido', catchphrase: 'oh là', shirt: 0x3a3a6a, likes: 'conchas', birthday: [10, 3], hobby: 'leer poesía', fur: 0xc0b0d0 },
  { name: 'Rayo', species: 'perro', personality: 'deportista', catchphrase: 'guay', shirt: 0xf05a3a, likes: 'madera', birthday: [3, 28], hobby: 'correr', fur: 0xf0e0c8, pattern: 'rayas' },
  { name: 'Bigotes', species: 'gato', personality: 'gruñón', catchphrase: 'mrr', shirt: 0x4a5a7a, likes: 'conchas', birthday: [2, 2], hobby: 'pescar de noche', fur: 0x9a9aa4 },
];

const PROFILES: Profile[] = [
  { name: 'Canela', species: 'gato', personality: 'alegre', catchphrase: 'miau', shirt: 0xe86a8a, likes: 'flores', birthday: [3, 14], hobby: 'bailar' },
  { name: 'Bruno', species: 'oso', personality: 'dormilón', catchphrase: 'ñam', shirt: 0x5b8bd6, likes: 'fruta', birthday: [11, 2], hobby: 'comer fruta' },
  { name: 'Pelusa', species: 'conejo', personality: 'presumido', catchphrase: 'boing', shirt: 0x9b6bd6, likes: 'conchas', birthday: [4, 22], hobby: 'coleccionar conchas' },
  { name: 'Ramón', species: 'rana', personality: 'gruñón', catchphrase: 'croac', shirt: 0xd9a441, likes: 'madera', birthday: [8, 9], hobby: 'pescar' },
  { name: 'Lola', species: 'perro', personality: 'alegre', catchphrase: 'guau', shirt: 0x5fb07a, pattern: 'rayas', likes: 'fruta', birthday: [10, 27], hobby: 'correr por la playa' },
  { name: 'Toto', species: 'pato', personality: 'dormilón', catchphrase: 'cuac', shirt: 0xe0704a, likes: 'conchas', birthday: [1, 30], hobby: 'dormir la siesta' },
];

/** Horas en las que cada personalidad está en casa durmiendo. */
const SLEEP: Record<Personality, [number, number]> = {
  alegre: [22, 7],
  'gruñón': [0, 8],
  'dormilón': [20, 10],
  presumido: [23, 9],
  deportista: [22, 6],
  dulce: [21, 7],
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
  private eyes: THREE.Object3D[] = [];
  /** Segundos hasta el próximo parpadeo. */
  private blink = 2 + Math.random() * 3;
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
    return this.profile.role === 'shop';
  }

  get isCurator() {
    return this.profile.role === 'museum';
  }

  get isPilot() {
    return this.profile.role === 'pilot';
  }

  /** Está de vacaciones en una isla misteriosa y se le puede invitar. */
  visitor = false;

  isBirthday(date: Date): boolean {
    return this.profile.birthday[0] === date.getMonth() + 1 && this.profile.birthday[1] === date.getDate();
  }

  /** Gorro de fiesta para el día de su cumpleaños. */
  addPartyHat() {
    const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c });
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 4), mat(0xf2c94c));
    hat.position.set(0.08, 1.54, 0);
    hat.rotation.set(0, Math.PI / 4, -0.2);
    const pom = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), mat(0xe8505b));
    pom.position.set(0.12, 1.74, 0);
    this.group.add(hat, pom);
  }

  // --- Modelo de bloques: cabeza grande, como los vecinos de Animal Crossing (villagerModel.ts) ---

  private buildModel() {
    const model = buildVillagerModel(this.profile);
    this.group.add(...model.group.children);
    this.legs = model.legs;
    this.arms = model.arms;
    this.eyes = model.eyes;
  }

  /** Caja para saber si el jugador está apuntando al vecino. */
  bounds(out: THREE.Box3): THREE.Box3 {
    const p = this.position;
    return out.set(new THREE.Vector3(p.x - 0.4, p.y, p.z - 0.4), new THREE.Vector3(p.x + 0.4, p.y + 1.6, p.z + 0.4));
  }

  isSleepTime(hour: number): boolean {
    if (this.visitor) return false; // de vacaciones no se va a dormir
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
          // Si de noche no puede llegar a su puerta (por una valla, por ejemplo), entra igualmente.
          if (sleepy) {
            this.asleep = true;
            this.group.visible = false;
          }
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
      if (y < SEA_LEVEL + 1 || this.world.waterKind(bx, bz)) return null; // no se meten en el agua
      if (isSolid(this.world.getBlock(bx, y + 1, bz)) || isSolid(this.world.getBlock(bx, y + 2, bz))) return null;
      const top = this.world.getBlock(bx, y, bz);
      // No se suben a los árboles ni saltan vallas o puertas cerradas.
      if (top === Block.Leaves || top === Block.PalmLeaves || top === Block.PineLeaves || isBarrier(top)) return null;
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
    // Parpadea de vez en cuando.
    this.blink -= dt;
    if (this.blink < -0.12) this.blink = 2 + Math.random() * 4;
    for (const e of this.eyes) e.scale.y = this.blink < 0 ? 0.15 : 1;
  }
}

/** Todos los vecinos que pueden vivir en una isla (los de siempre y los de las islas misteriosas). */
export const RESIDENT_NAMES = [...PROFILES, ...VISITORS].map((p) => p.name);

/** Todos los personajes, con la dependienta, la conservadora y el piloto, para el álbum de vecinos. */
export const ALL_PROFILES: Profile[] = [SHOPKEEPER, CURATOR, PILOT, ...PROFILES, ...VISITORS];

export function profileNamed(name: string): Profile | undefined {
  return [...PROFILES, ...VISITORS].find((p) => p.name === name);
}

/** Elige quién está de vacaciones en una isla misteriosa: alguien que no viva ya en tu isla. */
export function pickVisitor(residents: string[], random: () => number, kind?: MysteryKind): string | null {
  const pool = RESIDENT_NAMES.filter((n) => !residents.includes(n));
  // Cada isla especial tiene sus visitantes favoritos: pingüinos en la nevada, ranas en la de las setas…
  const likes = kind ? ISLAND_SPECIES[kind] : undefined;
  const fans = likes ? pool.filter((n) => likes.includes(profileNamed(n)!.species)) : [];
  if (fans.length && random() < 0.6) return fans[Math.floor(random() * fans.length)];
  return pool.length ? pool[Math.floor(random() * pool.length)] : null;
}

/** Especies a las que más les gusta cada tipo de isla misteriosa. */
const ISLAND_SPECIES: Partial<Record<MysteryKind, Species[]>> = {
  nieve: ['pingüino', 'oso', 'oveja'],
  setas: ['rana', 'ardilla', 'koala'],
  cristal: ['gato', 'zorro', 'conejo'],
  volcan: ['elefante', 'perro', 'cerdo'],
  flores: ['conejo', 'oveja'],
  bambu: ['koala', 'oso'],
};

/** Un vecino que espera en un sitio concreto (el piloto, o quien está de vacaciones), sin casa. */
export function createVisitor(world: World, name: string, x: number, y: number, z: number, memory: VillagerMemory): Villager | null {
  const profile = name === PILOT.name ? PILOT : profileNamed(name);
  if (!profile) return null;
  const spot: Plot = { kind: 'house', x, z: z - 3, y: y - 1, roof: Block.RoofRed, door: [x, y, z] };
  const v = new Villager(profile, spot, world, memory);
  v.visitor = !profile.role;
  return v;
}

/** Un vecino invitado desde una isla misteriosa y dónde está su casa (cuando ya se ha encontrado sitio). */
export interface Guest {
  name: string;
  x?: number;
  z?: number;
  /** Vive en una casa que construyó el jugador (v2.10), en el solar con ese centro. */
  lot?: boolean;
}

/**
 * Elige vecinos para las casas de la isla, siempre los mismos para cada semilla.
 * `guests`: los invitados desde islas misteriosas, cada uno en su parcela nueva.
 * `built`: las casas que construyó el jugador (v2.10), para los invitados que viven en ellas.
 */
export function createVillagers(world: World, memories: Record<string, VillagerMemory>, guests: Guest[] = [], built: Plot[] = []): Villager[] {
  const pool = [...PROFILES];
  const shop = world.plots.find((p) => p.kind === 'shop');
  const keeper = shop ? [new Villager(SHOPKEEPER, shop, world, memories[SHOPKEEPER.name] ?? { friendship: 0 })] : [];
  const museum = world.plots.find((p) => p.kind === 'museum');
  const curator = museum ? [new Villager(CURATOR, museum, world, memories[CURATOR.name] ?? { friendship: 0 })] : [];
  const locals = world.plots.filter((p) => p.kind === 'house' && !p.guest).map((plot, i) => {
    const pick = Math.floor(columnRandom(i, 99, world.seed) * pool.length);
    const profile = pool.splice(pick, 1)[0];
    return new Villager(profile, plot, world, memories[profile.name] ?? { friendship: 0 });
  });
  const newcomers = guests.flatMap((g) => {
    const profile = profileNamed(g.name);
    const plot = (g.lot ? built : world.plots).find((p) => p.guest && p.x === g.x && p.z === g.z);
    return profile && plot ? [new Villager(profile, plot, world, memories[profile.name] ?? { friendship: 0 })] : [];
  });
  return [...keeper, ...curator, ...locals, ...newcomers];
}
