import * as THREE from 'three';
import { FRUITS, type Block } from './blocks';
import type { SeaIslandType } from './archipelago';
import { MYSTERY_KINDS, type MysteryKind } from './world';
import { VoxelKit } from './voxelKit';

/** Un viaje a una isla misteriosa. Dura hasta volver a casa o cerrar el juego. */
export interface Trip {
  /** La isla de casa (hueco de guardado) desde la que se salió. */
  slot: number;
  seed: number;
  kind: MysteryKind;
  fruit: Block;
  /** Quien está de vacaciones allí, o null si ya viven todos en tu isla. */
  visitor: string | null;
  /** Cuántas casas construidas y libres había en casa al salir. */
  room: number;
  /** Viaje en barco a una isla del archipiélago (v4.22). Sin esto, es un viaje en avioneta. */
  sea?: SeaTrip;
}

export interface SeaTrip {
  island: string;
  name: string;
  type: SeaIslandType;
  /** Plumas está de paso en la isla y te puede llevar a casa en avioneta. */
  plumas: boolean;
}

const KEY = 'maxycraft.viaje';

export const MYSTERY_NAMES: Record<MysteryKind, string> = {
  frutas: 'Isla de los frutales',
  flores: 'Isla de las flores',
  minerales: 'Isla de las rocas',
  bambu: 'Isla del bambú',
  volcan: 'Isla del volcán',
  cristal: 'Isla de los cristales',
  nieve: 'Isla nevada',
  setas: 'Isla de las setas',
};

/** Prepara una isla misteriosa al azar: su tipo y una fruta que no es la de casa. */
export function planTrip(slot: number, homeFruit: Block, visitor: string | null, room: number, random: () => number = Math.random): Trip {
  const others = FRUITS.filter((f) => f !== homeFruit);
  return {
    slot,
    seed: Math.floor(random() * 1e9),
    kind: MYSTERY_KINDS[Math.floor(random() * MYSTERY_KINDS.length)],
    fruit: others[Math.floor(random() * others.length)],
    visitor,
    room,
  };
}

// Se guarda en la sesión: si se cierra el juego en pleno viaje, al volver a abrirlo estás en casa.
export function loadTrip(slot: number): Trip | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Trip | null;
    if (!t || t.slot !== slot || !MYSTERY_KINDS.includes(t.kind) || !Number.isFinite(t.seed)) return null;
    return t;
  } catch {
    return null;
  }
}

export function saveTrip(t: Trip | null) {
  try {
    if (t) sessionStorage.setItem(KEY, JSON.stringify(t));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Sin almacenamiento no se puede viajar, pero el juego sigue.
  }
}

/** Segundos que tarda en amarizar. */
const LANDING_SECONDS = 4;

/** Avioneta de cubos que flota en el agua junto a la playa, con la hélice girando. */
export class Seaplane {
  readonly group = new THREE.Group();
  private propeller = new THREE.Group();
  private takeoff = -1;
  private landing = -1;
  private base = new THREE.Vector3();

  constructor() {
    const kit = new VoxelKit(this.group);
    const yellow = 0xf2c230;
    const cream = 0xfaf6ea;
    const blue = 0x2f6fb0;
    const metal = 0x8a8e96;
    const glass = 0x9fd4ee;
    // Mira hacia -z: la hélice va delante. Fuselaje en rebanadas: redondo delante y afinándose hacia la cola.
    const n = 18;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1); // 0 morro, 1 cola
      const z = -2.0 + t * 4.4;
      const w = t < 0.45 ? 1.1 : 1.1 - (t - 0.45) / 0.55 * 0.7;
      const h = t < 0.45 ? 1.05 : 1.05 - (t - 0.45) / 0.55 * 0.65;
      const y = 1.5 + (t < 0.45 ? 0 : (t - 0.45) / 0.55 * 0.3);
      kit.box(yellow, w, h, 0.26, 0, y, z);
      kit.box(blue, w + 0.02, 0.14, 0.26, 0, y - h * 0.22, z); // franja azul
      kit.box(cream, w * 0.8, 0.12, 0.26, 0, y - h / 2 + 0.06, z); // panza clara
    }
    // Capó del motor, con rejilla y tubos de escape, y la cabina de cristal con su marco.
    kit.box(cream, 1.0, 0.9, 0.5, 0, 1.5, -2.25);
    kit.box(0x3a3e44, 0.7, 0.5, 0.04, 0, 1.45, -2.51);
    for (const side of [-1, 1]) kit.box(0x5a5e66, 0.08, 0.08, 0.3, side * 0.42, 1.18, -2.0);
    kit.box(glass, 0.98, 0.42, 0.7, 0, 2.15, -1.25);
    kit.box(glass, 1.13, 0.38, 1.0, 0, 1.95, -0.55);
    kit.box(0x3a3e44, 1.14, 0.06, 0.06, 0, 2.15, -1.08);
    for (const z of [-0.85, -0.25]) kit.box(yellow, 1.14, 0.4, 0.06, 0, 1.95, z);
    // Puerta con su ventanita y el número en el costado.
    for (const side of [-1, 1]) {
      kit.box(0xd8a820, 0.02, 0.7, 0.55, side * 0.555, 1.55, 0.15);
      kit.box(glass, 0.02, 0.22, 0.3, side * 0.56, 1.75, 0.15);
      for (const [k, z] of [0.75, 0.95, 1.15].entries()) kit.box(0x1f3f5f, 0.02, k === 1 ? 0.06 : 0.22, 0.12, side * 0.5, 1.6, z);
    }
    // Ala alta con las puntas azules, alerones, luces de posición y dos puntales a cada lado.
    kit.box(cream, 7.0, 0.16, 1.3, 0, 2.42, -0.6);
    kit.box(yellow, 6.0, 0.1, 1.32, 0, 2.53, -0.6);
    for (const side of [-1, 1]) {
      kit.box(blue, 0.5, 0.18, 1.32, side * 3.25, 2.44, -0.6);
      kit.box(0xd8a820, 1.6, 0.06, 0.3, side * 2.2, 2.38, 0.1);
      kit.glow(side < 0 ? 0xff4a3a : 0x4aff6a, 0.12, 0.12, 0.2, side * 3.52, 2.44, -0.9);
      kit.rod(metal, 0.07, [side * 0.5, 1.15, -0.6], [side * 2.0, 2.34, -0.75]);
      kit.rod(metal, 0.07, [side * 0.5, 1.15, -0.2], [side * 2.0, 2.34, -0.35]);
    }
    // Cola: estabilizador con timones de profundidad y deriva con el timón a rayas.
    kit.box(yellow, 2.6, 0.12, 0.7, 0, 1.85, 2.15);
    for (const side of [-1, 1]) kit.box(blue, 0.9, 0.1, 0.24, side * 0.75, 1.85, 2.58);
    kit.box(yellow, 0.12, 1.2, 0.8, 0, 2.4, 2.2);
    kit.box(blue, 0.13, 0.9, 0.25, 0, 2.45, 2.62);
    kit.box(cream, 0.14, 0.18, 0.26, 0, 2.6, 2.62);
    kit.glow(0xffffff, 0.08, 0.08, 0.08, 0, 1.95, 2.7);
    // Flotadores: más estrechos y levantados delante, con el escalón debajo, y los puntales con travesaños.
    for (const x of [-1.25, 1.25]) {
      for (let i = 0; i < 8; i++) {
        const t = i / 7; // 0 delante, 1 detrás
        const z = -2.1 + t * 3.8;
        const lift = t < 0.25 ? (0.25 - t) * 0.8 : 0;
        const w = t < 0.25 ? 0.38 + t * 0.6 : t > 0.8 ? 0.53 - (t - 0.8) * 0.8 : 0.53;
        kit.box(cream, w, 0.36 - lift * 0.4, 0.52, x, 0.22 + lift, z);
        kit.box(blue, w + 0.02, 0.06, 0.52, x, 0.32 + lift * 0.8, z);
      }
      kit.rod(metal, 0.08, [x, 0.4, -1.1], [x * 0.35, 1.15, -1.1]);
      kit.rod(metal, 0.08, [x, 0.4, 0.6], [x * 0.35, 1.15, 0.5]);
      kit.rod(metal, 0.06, [x, 0.4, -1.1], [x * 0.35, 1.15, 0.5]);
    }
    for (const z of [-1.1, 0.6]) kit.box(metal, 2.5, 0.06, 0.06, 0, 0.42, z);
    // Hélice de dos palas con su buje.
    this.propeller.position.set(0, 1.5, -2.62);
    kit.box(0xe8524a, 0.3, 0.3, 0.3, 0, 0, 0, this.propeller);
    kit.box(0xe8524a, 0.16, 0.16, 0.2, 0, 0, -0.18, this.propeller);
    kit.box(0x2a2e34, 0.18, 2.0, 0.06, 0, 0, 0.06, this.propeller);
    for (const y of [-0.92, 0.92]) kit.box(0xf2c230, 0.19, 0.14, 0.07, 0, y, 0.06, this.propeller);
    this.group.add(this.propeller);
  }

  /** Coloca el avión en el agua en (x, y, z), con el morro hacia el mar (dx, dz). */
  place(x: number, y: number, z: number, dx: number, dz: number) {
    this.base.set(x, y, z);
    this.group.position.copy(this.base);
    this.group.rotation.y = Math.atan2(-dx, -dz);
  }

  /** Llega volando desde el mar y amariza en su sitio (al volver de un viaje). */
  land() {
    this.landing = 0;
  }

  /** Empieza a despegar: avanza hacia el mar y sube. */
  fly() {
    this.takeoff = 0;
  }

  bounds(out: THREE.Box3): THREE.Box3 {
    return out.setFromObject(this.group);
  }

  update(dt: number, seconds: number) {
    if (this.takeoff >= 0) {
      this.takeoff += dt;
      const t = this.takeoff;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
      this.group.position.copy(this.base).addScaledVector(forward, t * t * 6);
      this.group.position.y = this.base.y + Math.max(0, t - 0.8) ** 2 * 3;
      this.group.rotation.x = Math.min(0.3, Math.max(0, t - 0.8) * 0.3);
      this.propeller.rotation.z += dt * 40;
      return;
    }
    if (this.landing >= 0) {
      // Llega por detrás, por encima de la isla, bajando hacia el mar, y frena al tocar el agua.
      this.landing += dt;
      const left = Math.max(0, 1 - this.landing / LANDING_SECONDS);
      const back = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
      this.group.position.copy(this.base).addScaledVector(back, left * left * 60);
      this.group.position.y = this.base.y + left * left * 18;
      this.group.rotation.x = -Math.min(0.15, left * 0.3);
      this.propeller.rotation.z += dt * 30;
      if (left <= 0) {
        this.landing = -1;
        this.group.rotation.x = 0;
      }
      return;
    }
    // Se mece un poco con las olas y la hélice gira despacio.
    this.group.position.y = this.base.y + Math.sin(seconds * 1.3) * 0.06;
    this.propeller.rotation.z += dt * 3;
  }
}
