import * as THREE from 'three';
import type { DecorPiece } from './decor';
import { Block, isDoor } from './blocks';
import { columnRandom } from './noise';
import { type Cell, pathsFor, standable } from './pathfind';
import { type Activity, type AgendaItem, type Errand, activityAt, agendaFor } from './schedule';
import { type Species, buildVillagerModel } from './villagerModel';
import { type MysteryKind, type Plot, type World } from './world';
import { SHOPKEEPER_BED, SHOPKEEPER_SPOT, shopOrigin } from './shopBuilding';

export type Personality = 'alegre' | 'gruñón' | 'dormilón' | 'presumido' | 'deportista' | 'dulce';
export type { Species };

/** Cómo se dice cada personalidad, para la ficha del vecino. */
export const PERSONALITY_NAMES: Record<Personality, string> = {
  alegre: 'Alegre', 'gruñón': 'Gruñón', 'dormilón': 'Dormilón', presumido: 'Presumido', deportista: 'Deportista', dulce: 'Dulce',
};

export const SPECIES_NAMES: Record<Species, string> = {
  gato: 'Gato', conejo: 'Conejo', oso: 'Oso', pato: 'Pato', perro: 'Perro', rana: 'Rana', ardilla: 'Ardilla', tortuga: 'Tortuga',
  oveja: 'Oveja', cerdo: 'Cerdo', 'pingüino': 'Pingüino', koala: 'Koala', zorro: 'Zorro', elefante: 'Elefante',
  'búho': 'Búho', castor: 'Castor',
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
  role?: 'shop' | 'museum' | 'pilot' | 'mayor' | 'planner';
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

/** El alcalde (v4.13): un búho que no duerme nunca y está siempre a la puerta del ayuntamiento. */
export const MAYOR: Profile = {
  name: 'Don Gregorio', species: 'búho', personality: 'dulce', catchphrase: 'uhú', shirt: 0x3a4a7a,
  likes: 'madera', sleep: [0, 0], stationary: true, role: 'mayor', birthday: [11, 2], hobby: 'leer actas de plenos',
};

/** El urbanista (v4.13): un castor que llega cuando el ayuntamiento es una oficina. */
export const PLANNER: Profile = {
  name: 'Ladrillo', species: 'castor', personality: 'deportista', catchphrase: 'toc', shirt: 0xd08a2a,
  likes: 'madera', sleep: [22, 8], stationary: true, role: 'planner', birthday: [4, 22], hobby: 'dibujar planos',
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

/** Lo que contestan si llamas a su puerta de noche (v4.11). La coletilla se añade al final. */
export const KNOCK_REPLIES: Record<Personality, string[]> = {
  alegre: ['Mmm… ¿quién es? ¡Mañana jugamos, prometido!', 'Zzz… ¡ah, hola! Estaba soñando con una fiesta'],
  'gruñón': ['¿Sabes qué hora es? Vuelve mañana', 'Grmf… estoy durmiendo, ¿no lo ves?'],
  'dormilón': ['Zzz… zzz… cinco minutitos más…', 'Mmmh… ¿ya es de día? No, ¿verdad?'],
  presumido: ['¡No me puedes ver sin peinar! Mañana, por favor', 'Necesito mis horas de sueño para estar radiante'],
  deportista: ['¡Hay que descansar para entrenar mañana!', 'Zzz… cien abdominales… zzz'],
  dulce: ['Ay, hola… ¿todo bien? Ve a dormir tú también', 'Mmm… buenas noches, que descanses'],
};

/** Respuesta de un vecino dormido al llamar a su puerta. */
export function knockReply(v: Villager, random = Math.random): string {
  const list = KNOCK_REPLIES[v.profile.personality];
  return `${v.name}: «${list[Math.floor(random() * list.length)]}, ${v.profile.catchphrase}»`;
}

/** Horas en las que cada personalidad está en casa durmiendo. */
export const SLEEP: Record<Personality, [number, number]> = {
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
  /** Último día en que te contó algo nuevo de sí mismo (v4.0: uno al día como mucho). */
  aboutDay?: string;
  /** Muebles que le has regalado, en los huecos de su casa (v4.12). */
  decor?: DecorPiece[];
  /** Nivel de casa que ya te ha enseñado (0 casita, 1 casa, 2 casa grande). */
  houseLevel?: number;
  /** Tejado elegido para su casa grande (índice de ROOFS). */
  roof?: number;
  /** Ya te ha contado qué negocio quiere abrir. */
  business?: boolean;
}

const WALK_SPEED = 1.4;
/** Lo lejos que pasea alrededor de su casa. */
const WANDER_RADIUS = 10;
/** Más lejos que esto del jugador, el vecino va en línea recta sin buscar camino: nadie le ve y así no hace falta
 * tener cargada esa parte de la isla. */
const FAR = 56;

/** Estado de un vecino que manda el anfitrión a los invitados (v4.8). */
export interface VillagerState {
  n: string;
  x: number;
  y: number;
  z: number;
  /** Hacia dónde mira, en radianes. */
  f: number;
  /** Está fuera de casa. */
  v: boolean;
  /** Va andando. */
  w: boolean;
  /** Está tumbado en la cama (v4.11). */
  b?: boolean;
}

/** El tiempo que hace, para el paraguas, la bufanda y para que los dormilones se refugien (v4.11). */
export const villagerWeather = { rain: false, snow: false };

export class Villager {
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3();
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
  /** Está dentro de su casa (durmiendo o cenando): no se ve. */
  asleep = false;
  greeted = false;

  // --- Caminos y agenda (v4.8) ---
  /** Casillas por las que va pasando y por cuál va. */
  private path: Cell[] | null = null;
  private step = 0;
  /** Altura de la casilla de la que viene, para subir y bajar escalones suavemente. */
  private fromY = 0;
  /** Adónde va y para qué. */
  private goal: { cell: Cell; kind: 'casa' | 'recado' | 'pasear' } | null = null;
  private cancelSearch: (() => void) | null = null;
  /** Sitios a los que puede ir de recado (puerta de la tienda, del museo, la plaza). */
  private places: Partial<Record<Errand, Cell>> = {};
  private agenda: AgendaItem[] | null = null;
  private agendaDay = -1;
  /** Lo que está haciendo ahora según su agenda. */
  activity: Activity = 'pasear';
  /** En multijugador, en casa de un amigo: lo mueve el anfitrión y aquí solo se sigue (v4.8). */
  remote: VillagerState | null = null;

  /** Cama de los que viven donde trabajan (Avellana, v4.16): de noche se tumba allí en vez de desaparecer. */
  rest?: Cell;
  /** Hacia dónde mira el que está quieto en su puesto (por defecto, +z). */
  lookAt?: [number, number];

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

  get isMayor() {
    return this.profile.role === 'mayor';
  }

  get isPlanner() {
    return this.profile.role === 'planner';
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
    // Paraguas para la lluvia y bufanda para la nieve (v4.11), escondidos hasta que hagan falta.
    const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c });
    const umbrella = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), mat(0x5a3a22));
    stick.position.set(0.32, 1.5, 0.1);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.32, 8), mat(this.profile.shirt));
    top.position.set(0.32, 2.05, 0.1);
    umbrella.add(stick, top);
    umbrella.visible = false;
    this.umbrella = umbrella;
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.42), mat(0xd04a3a));
    scarf.position.set(0, 0.98, 0);
    scarf.visible = false;
    this.scarf = scarf;
    this.group.add(umbrella, scarf);
    this.zzz = textSprite('Zzz', '#ffffff', 0.9);
    this.bubble = textSprite('💬', '#ffffff', 0.7);
    for (const o of [this.zzz, this.bubble]) if (o) this.extras.add(o);
  }

  private lampOn = false;

  /** La luz de dentro de casa: encendida mientras está despierto en casa, apagada al dormirse. */
  private setLight(on: boolean) {
    if (on === this.lampOn || this.home.kind !== 'house') return;
    this.lampOn = on;
    const [x, y, z] = this.home.door;
    this.world.setLamp(x, y + 1, z - 3, on ? 11 : 0);
  }

  /** Caja para saber si el jugador está apuntando al vecino. */
  bounds(out: THREE.Box3): THREE.Box3 {
    const p = this.position;
    return out.set(new THREE.Vector3(p.x - 0.4, p.y, p.z - 0.4), new THREE.Vector3(p.x + 0.4, p.y + 1.6, p.z + 0.4));
  }

  /** Horas de dormir: las suyas o las de su personalidad. */
  get sleepHours(): [number, number] {
    return this.profile.sleep ?? SLEEP[this.profile.personality];
  }

  isSleepTime(hour: number): boolean {
    if (this.visitor) return false; // de vacaciones no se va a dormir
    const [from, to] = this.sleepHours;
    return from > to ? hour >= from || hour < to : hour >= from && hour < to;
  }

  /** Dónde está la tienda, el museo y la plaza de la isla, para ir de recado. */
  setPlaces(places: Partial<Record<Errand, Cell>>) {
    this.places = places;
    this.agenda = null;
  }

  /** La agenda de hoy (cambia el recado según el día de la semana). */
  agendaFor(weekday: number): AgendaItem[] {
    if (!this.agenda || this.agendaDay !== weekday) {
      const places = (Object.keys(this.places) as Errand[]).filter((k) => this.places[k]);
      this.agenda = agendaFor({ name: this.name, sleep: this.sleepHours, works: !!this.profile.role }, weekday, places.length ? places : ['plaza']);
      this.agendaDay = weekday;
    }
    return this.agenda;
  }

  /** Va andando hasta esa casilla por el mejor camino (para pruebas y para quien quiera llamarle). */
  goTo(cell: Cell, kind: 'casa' | 'recado' | 'pasear' = 'pasear') {
    this.goal = { cell, kind };
    this.dropPath();
  }

  /** Ha llegado (o no tiene adónde ir). */
  get idle(): boolean {
    return !this.goal && !this.path;
  }

  private dropPath() {
    this.cancelSearch?.();
    this.cancelSearch = null;
    this.path = null;
  }

  /** Estado para mandar a los invitados (v4.8). */
  state(): VillagerState {
    const r = (n: number) => Math.round(n * 100) / 100;
    return { n: this.name, x: r(this.position.x), y: r(this.position.y), z: r(this.position.z), f: r(this.facing), v: !this.asleep, w: !!this.path, b: this.inBed || undefined };
  }

  /** Está lejos del jugador (ver FAR). */
  private far = false;

  // --- Rutina en casa (v4.11) ---
  /** Está dentro de su casa. */
  get inside(): boolean {
    return this.asleep;
  }
  /** Está durmiendo en la cama. */
  get sleeping(): boolean {
    return this.asleep && this.activity === 'dormir' && this.inBed;
  }
  /** Ha llegado a la cama (se tumba). */
  private inBed = false;
  /** Segundos que le quedan estirándose al salir de la cama. */
  private stretch = 0;
  /** Puerta que ha abierto al pasar y que tiene que cerrar. */
  private openedDoor: Cell | null = null;
  /** Otros vecinos de la isla, para pararse a charlar. */
  neighbors: Villager[] = [];
  /** Con quién está charlando y cuánto le queda. */
  private chat: { with: Villager; time: number } | null = null;
  /** Lo que sale encima: "Zzz" en la puerta, bocadillo al charlar, paraguas… (lo añade main a la escena). */
  readonly extras = new THREE.Group();
  private zzz: THREE.Object3D | null = null;
  private bubble: THREE.Object3D | null = null;
  private umbrella: THREE.Object3D | null = null;
  private scarf: THREE.Object3D | null = null;

  /** Casilla nada más pasar la puerta, por dentro. */
  get insideCell(): Cell {
    const [x, y, z] = this.home.door;
    return [x, y, z - 2];
  }

  /** Donde está la cama: en la esquina del fondo a la izquierda (si cabe; si no, en medio). */
  get bedCell(): Cell {
    const [x, y, z] = this.home.door;
    const bed: Cell = [x - 1, y, z - 4];
    return standable(this.world, ...bed) ? bed : this.insideCell;
  }

  /** Si el jugador está dentro de esta casa. */
  private playerInside(player: THREE.Vector3): boolean {
    const [x, y, z] = this.home.door;
    return Math.abs(player.x - (x + 0.5)) < 2 && player.z < z - 0.5 && player.z > z - 5 && player.y >= y - 0.5 && player.y < y + 3;
  }

  update(dt: number, hour: number, player: THREE.Vector3, weekday = 0) {
    if (this.remote) return this.follow(dt, this.remote, hour, weekday, player);
    const far = Math.hypot(player.x - this.position.x, player.z - this.position.z) > FAR;
    if (far !== this.far) {
      this.far = far;
      this.dropPath(); // el camino se vuelve a pedir (o se deja de buscar) según dónde esté
    }
    this.closeDoorBehind();

    if (this.talking) {
      this.inBed = false;
      this.faceTowards(player.x, player.z, dt * 8);
      this.animate(dt, false);
      this.pose(player);
      return;
    }

    if (this.profile.stationary) return this.stand(dt, hour);

    const item = this.visitor ? { from: 0, activity: 'pasear' as Activity } : activityAt(this.agendaFor(weekday), hour);
    // Con lluvia, los dormilones se vuelven a casa en vez de pasear.
    const shelter = villagerWeather.rain && item.activity === 'pasear' && this.profile.personality === 'dormilón';
    this.activity = shelter ? 'casa' : item.activity;
    const atHome = this.activity === 'dormir' || this.activity === 'casa';

    if (this.asleep && !atHome) {
      // Sale de casa: si estaba en la cama, se levanta y se estira antes de salir.
      this.asleep = false;
      if (this.inBed) this.stretch = 1.6;
      this.inBed = false;
      this.dropPath();
      this.goal = null;
      this.lingering = false;
    }

    if (this.stretch > 0) {
      this.stretch -= dt;
      this.animate(dt, false);
      this.stretchPose(Math.max(0, this.stretch));
      this.pose(player);
      return;
    }

    // Qué quiere hacer ahora: si ha cambiado de actividad, cambia de destino.
    if (atHome) {
      const target = this.activity === 'dormir' ? this.bedCell : this.insideCell;
      const there = this.asleep && !this.goal && !this.path && Math.hypot(this.position.x - target[0] - 0.5, this.position.z - target[2] - 0.5) < 0.2;
      if (!there && (this.goal?.kind !== 'casa' || this.goal.cell.join() !== target.join())) {
        this.chat = null;
        this.goTo(target, 'casa');
      }
    } else if (item.activity === 'recado' && this.goal?.kind !== 'recado' && !this.lingering) {
      const place = item.errand && this.places[item.errand];
      if (place) this.goTo(place, 'recado');
    }

    if (this.chat) this.chatting(dt);
    else if (!this.goal && !this.path) {
      this.wait -= dt;
      if (!this.asleep && this.wait <= 0) {
        if (!this.startChat()) this.wander(item.activity === 'recado');
      }
      this.animate(dt, false);
    } else this.walk(dt);
    this.inBed = this.asleep && this.activity === 'dormir' && !this.goal && !this.path && this.position.distanceTo(new THREE.Vector3(this.bedCell[0] + 0.5, this.bedCell[1], this.bedCell[2] + 0.5)) < 0.2;
    this.pose(player);
  }

  /** Coloca el modelo: de pie, tumbado en la cama, y qué se ve encima (Zzz, paraguas…). */
  private pose(player: THREE.Vector3) {
    this.group.position.copy(this.position);
    if (this.inBed) {
      // Tumbado boca arriba, con la cabeza hacia el fondo de la casa.
      this.group.rotation.set(-Math.PI / 2, 0, 0);
      this.group.position.set(this.position.x, this.position.y + 0.55, this.position.z + 0.75);
    } else if (this.group.rotation.x !== 0) this.group.rotation.set(0, this.facing, 0);
    // Desde fuera no se ve lo de dentro de las casas.
    this.group.visible = this.asleep ? this.playerInside(player) : true;
    this.setLight(this.asleep && this.activity === 'casa');
    const outside = !this.asleep;
    if (this.umbrella) this.umbrella.visible = outside && villagerWeather.rain;
    if (this.scarf) this.scarf.visible = villagerWeather.snow;
    if (this.zzz) {
      this.zzz.visible = this.sleeping;
      const [x, y, z] = this.home.door;
      this.zzz.position.set(x + 0.5, y + 2.6, z - 0.4);
    }
    if (this.bubble) {
      this.bubble.visible = !!this.chat;
      this.bubble.position.set(this.position.x, this.position.y + 2.1, this.position.z);
    }
  }

  /** Estirarse al salir de la cama: brazos arriba y vuelta a su sitio. */
  private stretchPose(left: number) {
    const up = Math.sin(Math.min(1, left / 1.6) * Math.PI) * 2.6;
    this.arms[0].rotation.x = -up;
    this.arms[1].rotation.x = -up;
  }

  /** Abre la puerta por la que va a pasar (y la cierra después, en closeDoorBehind). */
  private openDoorAhead(cell: Cell) {
    if (this.far || this.openedDoor) return;
    const [x, y, z] = cell;
    if (this.world.getBlock(x, y, z) !== Block.Door) return;
    this.world.setBlock(x, y, z, Block.DoorOpen);
    if (this.world.getBlock(x, y + 1, z) === Block.DoorTop) this.world.setBlock(x, y + 1, z, Block.DoorTopOpen);
    this.openedDoor = cell;
  }

  private closeDoorBehind() {
    const d = this.openedDoor;
    if (!d) return;
    if (Math.abs(this.position.x - d[0] - 0.5) < 1.1 && Math.abs(this.position.z - d[2] - 0.5) < 1.1) return;
    const [x, y, z] = d;
    // Solo si sigue como la dejó (si el jugador la ha cerrado o cambiado, no se toca).
    if (this.world.getBlock(x, y, z) === Block.DoorOpen) {
      this.world.setBlock(x, y, z, Block.Door);
      this.world.clearEdit(x, y, z);
      if (this.world.getBlock(x, y + 1, z) === Block.DoorTopOpen) {
        this.world.setBlock(x, y + 1, z, Block.DoorTop);
        this.world.clearEdit(x, y + 1, z);
      }
    }
    this.openedDoor = null;
  }

  /** Si hay otro vecino paseando cerca, se paran a charlar un rato. */
  private startChat(): boolean {
    if (this.asleep || this.visitor || Math.random() > 0.35) return false;
    for (const o of this.neighbors) {
      if (o === this || o.chat || o.asleep || o.talking || o.profile.stationary || o.goal || o.path) continue;
      if (o.position.distanceTo(this.position) > 4) continue;
      const time = 5 + Math.random() * 5;
      this.chat = { with: o, time };
      o.chat = { with: this, time };
      return true;
    }
    return false;
  }

  private chatting(dt: number) {
    const c = this.chat!;
    c.time -= dt;
    this.faceTowards(c.with.position.x, c.with.position.z, dt * 6);
    this.animate(dt, false);
    if (c.time <= 0 || c.with.chat?.with !== this) {
      this.chat = null;
      this.wait = 3 + Math.random() * 4;
    }
  }

  /** Ya ha llegado al sitio del recado y da vueltas por allí. */
  private lingering = false;

  /** La dependienta, la conservadora y el piloto: en su puerta, mirando al frente; de noche, dentro. */
  private stand(dt: number, hour: number) {
    const sleepy = this.isSleepTime(hour);
    this.asleep = sleepy;
    this.group.visible = !sleepy;
    this.activity = sleepy ? 'dormir' : 'trabajo';
    if (sleepy && this.rest) {
      // Duerme en su cama, tumbado, y se le ve si subes (v4.16).
      const [bx, by, bz] = this.rest;
      this.position.set(bx + 0.5, by, bz + 0.5);
      this.group.visible = true;
      this.group.rotation.set(-Math.PI / 2, 0, 0);
      this.group.position.set(this.position.x, this.position.y + 0.55, this.position.z + 0.75);
      if (this.zzz) {
        this.zzz.visible = true;
        this.zzz.position.set(bx + 0.5, by + 1.6, bz + 0.5);
      }
      return;
    }
    if (this.group.rotation.x !== 0) this.group.rotation.set(0, this.facing, 0);
    if (this.zzz && this.rest) this.zzz.visible = false;
    if (!sleepy) {
      const [dx, dy, dz] = this.home.door;
      this.position.set(dx + 0.5, dy, dz + 0.5);
      this.faceTowards(this.position.x + (this.lookAt?.[0] ?? 0), this.position.z + (this.lookAt?.[1] ?? 1), dt * 4);
      this.animate(dt, false);
      this.group.position.copy(this.position);
    }
  }

  /** Elige un sitio cerca para dar un paseo (o, si está de recado, cerca del sitio del recado). */
  private wander(nearErrand: boolean) {
    const around = nearErrand && this.lastErrand ? this.lastErrand : null;
    const cx = around ? around[0] : this.home.x;
    const cz = around ? around[2] : this.home.z + 4;
    const radius = around ? 3 : WANDER_RADIUS;
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 2 + Math.random() * radius;
      const x = Math.floor(cx + Math.cos(a) * d);
      const z = Math.floor(cz + Math.sin(a) * d);
      const y = this.groundNear(x, Math.floor(this.position.y), z);
      if (y !== null) {
        this.goTo([x, y, z], 'pasear');
        return;
      }
    }
    this.wait = 1;
  }

  private lastErrand: Cell | null = null;

  private groundNear(x: number, y: number, z: number): number | null {
    if (this.far) return this.world.heightAt(x, z) + 1;
    for (const dy of [0, 1, -1, 2, -2, 3, -3]) if (standable(this.world, x, y + dy, z)) return y + dy;
    return null;
  }

  /** Una casilla donde se pueda estar de pie, al lado de `cell` si esa no vale. */
  private snap(cell: Cell): Cell | null {
    for (let r = 0; r <= 2; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const y = this.groundNear(cell[0] + dx, cell[1], cell[2] + dz);
          if (y !== null) return [cell[0] + dx, y, cell[2] + dz];
        }
      }
    }
    return null;
  }

  /** Anda por el camino; si aún no lo tiene, lo pide. */
  private walk(dt: number) {
    if (!this.path && this.far && this.goal) {
      // Lejos del jugador: en línea recta (nadie lo ve y no hace falta cargar esa parte de la isla).
      const [x, , z] = this.goal.cell;
      this.path = [[x, this.world.heightAt(x, z) + 1, z]];
      this.step = 0;
      this.fromY = this.position.y;
    }
    if (!this.path) {
      if (!this.cancelSearch && this.goal) {
        const from: Cell = [Math.floor(this.position.x), Math.round(this.position.y), Math.floor(this.position.z)];
        const goal = this.goal;
        const to = this.snap(goal.cell);
        if (!to) return this.arrive(false);
        this.cancelSearch = pathsFor(this.world).request(from, to, (path) => {
          this.cancelSearch = null;
          if (this.goal !== goal) return;
          if (path) {
            this.path = path;
            this.step = 0;
            this.fromY = this.position.y;
          } else this.arrive(false);
        });
      }
      this.animate(dt, false);
      return;
    }
    const cell = this.path[this.step];
    if (isDoor(this.world.getBlock(...cell))) this.openDoorAhead(cell);
    const tx = cell[0] + 0.5;
    const tz = cell[2] + 0.5;
    const ddx = tx - this.position.x;
    const ddz = tz - this.position.z;
    const dist = Math.hypot(ddx, ddz);
    if (dist < 0.08) {
      this.position.set(tx, cell[1], tz);
      this.fromY = cell[1];
      this.step++;
      if (this.step >= this.path.length) {
        this.path = null;
        this.arrive(true);
      } else if (!this.far && !standable(this.world, ...this.path[this.step])) {
        // Alguien ha puesto algo en medio: busca otro camino.
        this.path = null;
      }
      this.animate(dt, true);
      return;
    }
    const stepLen = Math.min(dist, WALK_SPEED * dt);
    const nx = this.position.x + (ddx / dist) * stepLen;
    const nz = this.position.z + (ddz / dist) * stepLen;
    // Sube o baja el escalón a mitad de camino entre casilla y casilla.
    const t = 1 - Math.min(1, (dist - stepLen) / 1);
    const y = this.fromY + (cell[1] - this.fromY) * Math.min(1, t * 1.6);
    this.position.set(nx, y, nz);
    this.faceTowards(tx, tz, dt * 6);
    this.animate(dt, true);
  }

  /** Ha llegado al destino (o no hay camino). */
  private arrive(reached: boolean) {
    const goal = this.goal;
    this.goal = null;
    this.wait = 2 + Math.random() * 5;
    if (!goal) return;
    if (goal.kind === 'casa') {
      // Ya está dentro. Si no había camino (una valla delante de la puerta, por ejemplo), entra igualmente.
      this.asleep = true;
      if (!reached) {
        const [x, y, z] = goal.cell;
        this.position.set(x + 0.5, y, z + 0.5);
      }
    } else if (goal.kind === 'recado') {
      this.lingering = true;
      this.lastErrand = reached ? goal.cell : null;
    } else if (this.activity !== 'recado') this.lingering = false;
    if (!reached && goal.kind !== 'casa') this.wait = 1;
  }

  /** En casa de un amigo: va hacia donde dice el anfitrión (y lo de dentro de casa se calcula igual que allí). */
  private follow(dt: number, s: VillagerState, hour: number, weekday: number, player: THREE.Vector3) {
    this.asleep = !s.v;
    if (!this.profile.stationary && !this.visitor) this.activity = activityAt(this.agendaFor(weekday), hour).activity;
    const ddx = s.x - this.position.x;
    const ddz = s.z - this.position.z;
    const far = Math.hypot(ddx, ddz) > 4 || Math.abs(s.y - this.position.y) > 3;
    if (far) this.position.set(s.x, s.y, s.z);
    else {
      const k = Math.min(1, dt * 8);
      this.position.set(this.position.x + ddx * k, this.position.y + (s.y - this.position.y) * k, this.position.z + ddz * k);
    }
    let diff = s.f - this.facing;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.facing += diff * Math.min(1, dt * 8);
    this.group.rotation.y = this.facing;
    this.animate(dt, s.w);
    this.inBed = !!s.b;
    this.pose(player);
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

/** Un letrero que siempre mira a la cámara (Zzz, bocadillo). Sin canvas (en las pruebas) no hay letrero. */
function textSprite(text: string, color: string, size: number): THREE.Sprite | null {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = '700 44px Nunito, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(40, 30, 60, .85)';
  ctx.strokeText(text, 64, 34);
  ctx.fillStyle = color;
  ctx.fillText(text, 64, 34);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
  sprite.scale.set(size, size / 2, 1);
  sprite.visible = false;
  return sprite;
}

/** Todos los vecinos que pueden vivir en una isla (los de siempre y los de las islas misteriosas). */
export const RESIDENT_NAMES = [...PROFILES, ...VISITORS].map((p) => p.name);

/** Los que solo se encuentran de vacaciones (no viven en las islas nuevas desde el principio). */
export const VISITOR_NAMES: ReadonlySet<string> = new Set(VISITORS.map((p) => p.name));

/** Todos los personajes, con la dependienta, la conservadora y el piloto, para el álbum de vecinos. */
export const ALL_PROFILES: Profile[] = [SHOPKEEPER, CURATOR, PILOT, MAYOR, PLANNER, ...PROFILES, ...VISITORS];

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

/** Casilla de la tienda en el mundo. */
function atShop(shop: Plot, [x, y, z]: Cell): Cell {
  const [ox, oy, oz] = shopOrigin(shop);
  return [ox + x, oy + y, oz + z];
}

/**
 * Elige vecinos para las casas de la isla, siempre los mismos para cada semilla.
 * `guests`: los invitados desde islas misteriosas, cada uno en su parcela nueva.
 * `built`: las casas que construyó el jugador (v2.10), para los invitados que viven en ellas.
 */
export function createVillagers(world: World, memories: Record<string, VillagerMemory>, guests: Guest[] = [], built: Plot[] = []): Villager[] {
  const pool = [...PROFILES];
  const shop = world.plots.find((p) => p.kind === 'shop');
  // Desde la v4.16 Avellana atiende detrás del mostrador y por la noche sube a dormir a su casa, encima de la tienda.
  const keeper = shop ? [new Villager(SHOPKEEPER, { ...shop, door: atShop(shop, SHOPKEEPER_SPOT) }, world, memories[SHOPKEEPER.name] ?? { friendship: 0 })] : [];
  if (shop) keeper[0].rest = atShop(shop, SHOPKEEPER_BED);
  const museum = world.plots.find((p) => p.kind === 'museum');
  // Desde la v4.15 Matilde espera dentro del museo, en la recepción, mirando a la puerta.
  const curator = museum ? [new Villager(CURATOR, { ...museum, door: [museum.x + 2, museum.y + 1, museum.z + 2] }, world, memories[CURATOR.name] ?? { friendship: 0 })] : [];
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
  const all = [...keeper, ...curator, ...locals, ...newcomers];
  const places = errandPlaces(world);
  for (const v of all) {
    v.setPlaces(places);
    v.neighbors = all;
  }
  return all;
}

/** Los sitios de la isla a los que los vecinos van de recado (v4.8): delante de la tienda y del museo, y la plaza. */
export function errandPlaces(world: World): Partial<Record<Errand, Cell>> {
  const out: Partial<Record<Errand, Cell>> = {};
  const front = (p: Plot | undefined): Cell | undefined => (p ? [p.door[0], p.door[1], p.door[2] + 2] : undefined);
  out.tienda = front(world.plots.find((p) => p.kind === 'shop'));
  out.museo = front(world.plots.find((p) => p.kind === 'museum'));
  const [px, pz] = world.findSpawn(0, 0);
  out.plaza = [px, world.heightAt(px, pz) + 1, pz];
  return out;
}
