import * as THREE from 'three';
import { FRUITS, type Block } from './blocks';
import { MYSTERY_KINDS, type MysteryKind } from './world';

/** Un viaje a una isla misteriosa. Dura hasta volver a casa o cerrar el juego. */
export interface Trip {
  /** La isla de casa (hueco de guardado) desde la que se salió. */
  slot: number;
  seed: number;
  kind: MysteryKind;
  fruit: Block;
  /** Quien está de vacaciones allí, o null si ya viven todos en tu isla. */
  visitor: string | null;
  /** Cuántos invitados caben en total en la isla de casa. */
  room: number;
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

/** Avioneta de cubos que flota en el agua junto a la playa, con la hélice girando. */
export class Seaplane {
  readonly group = new THREE.Group();
  private propeller = new THREE.Group();
  private takeoff = -1;
  private base = new THREE.Vector3();

  constructor() {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const mats = new Map<number, THREE.MeshLambertMaterial>();
    const part = (color: number, sx: number, sy: number, sz: number, x: number, y: number, z: number, parent: THREE.Object3D = this.group) => {
      let m = mats.get(color);
      if (!m) mats.set(color, (m = new THREE.MeshLambertMaterial({ color })));
      const mesh = new THREE.Mesh(box, m);
      mesh.scale.set(sx, sy, sz);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };
    const yellow = 0xf2c230;
    const blue = 0x2f6fb0;
    // Mira hacia -z: la hélice va delante.
    part(yellow, 1.1, 1, 4.2, 0, 1.5, 0); // fuselaje
    part(0xa8d8f0, 1.12, 0.45, 0.9, 0, 2.05, -0.6); // ventanas de la cabina
    part(blue, 1.14, 0.2, 4.22, 0, 1.2, 0); // franja
    part(yellow, 6.4, 0.18, 1.2, 0, 2.05, -0.3); // ala
    part(blue, 0.3, 0.2, 1.22, -3.1, 2.06, -0.3);
    part(blue, 0.3, 0.2, 1.22, 3.1, 2.06, -0.3);
    part(yellow, 2.4, 0.14, 0.7, 0, 1.75, 1.85); // cola
    part(blue, 0.14, 1, 0.8, 0, 2.3, 1.85);
    part(0x555560, 0.5, 0.5, 0.3, 0, 1.5, -2.2); // morro
    // Flotadores.
    for (const x of [-1.2, 1.2]) {
      part(0xf4f4f0, 0.5, 0.4, 3.6, x, 0.2, -0.2);
      part(0x777780, 0.1, 0.8, 0.1, x * 0.8, 0.8, -1);
      part(0x777780, 0.1, 0.8, 0.1, x * 0.8, 0.8, 0.8);
    }
    this.propeller.position.set(0, 1.5, -2.4);
    part(0x333338, 0.16, 1.8, 0.08, 0, 0, 0, this.propeller);
    part(0x333338, 1.8, 0.16, 0.08, 0, 0, 0, this.propeller);
    this.group.add(this.propeller);
  }

  /** Coloca el avión en el agua en (x, y, z), con el morro hacia el mar (dx, dz). */
  place(x: number, y: number, z: number, dx: number, dz: number) {
    this.base.set(x, y, z);
    this.group.position.copy(this.base);
    this.group.rotation.y = Math.atan2(-dx, -dz);
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
    // Se mece un poco con las olas y la hélice gira despacio.
    this.group.position.y = this.base.y + Math.sin(seconds * 1.3) * 0.06;
    this.propeller.rotation.z += dt * 3;
  }
}
