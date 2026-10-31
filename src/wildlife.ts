// Fauna salvaje (v4.23): animales que viven sueltos según el bioma (ciervos en el bosque, camellos en el desierto,
// pingüinos en el glaciar…) y vida marina alrededor de la isla (delfines que saltan junto al barco, tortugas y
// cangrejos en la playa, medusas que brillan de noche, rayas y alguna ballena a lo lejos). Son de adorno: huyen
// si te acercas y cada jugador ve los suyos. Aparecen y se van alrededor del jugador, con tope por zona
// (Population), para que nunca haya ni demasiados ni ninguno.
import * as THREE from 'three';
import { Population, type PopulationRule } from './population';
import { type Biome, SEA_LEVEL } from './world';
import { seaModel } from './seaFauna';

export type WildKind =
  | 'ciervo' | 'conejo' | 'zorro' | 'cabra' | 'camello' | 'suricata' | 'loro' | 'rana' | 'pinguino' | 'foca' | 'oso_polar' | 'buho'
  | 'delfin' | 'tortuga' | 'cangrejo' | 'medusa' | 'raya' | 'ballena';

/** Dónde vive: en tierra, en la orilla (arena junto al mar) o en el mar. */
export type WildPlace = 'tierra' | 'orilla' | 'mar';

export type Part = { s: [number, number, number]; p: [number, number, number]; c: number; leg?: 1 | -1; glow?: boolean; wing?: 1 | -1 };

export interface WildDef {
  name: string;
  place: WildPlace;
  /** Biomas donde sale (en tierra y en la orilla); sin lista, en cualquiera. */
  biomes?: Biome[];
  /** Solo de noche (el búho) o solo de día. */
  time?: 'noche' | 'dia';
  /** Cómo se mueve: andando, a saltitos, nadando en la superficie, bajo el agua o volando bajo. */
  move: 'anda' | 'salta' | 'nada' | 'bucea' | 'vuela';
  speed: number;
  /** Lo que dice la wiki. */
  text: string;
  parts: Part[];
}

const COLD: Biome[] = ['tundra', 'glaciar', 'picos', 'taiga'];

/** Patas de un cuadrúpedo: cuatro, de ancho `w`, a lo largo `l`, altas `h`. */
function legs(w: number, l: number, h: number, c: number, t = 0.12): Part[] {
  return [
    { s: [t, h, t], p: [-w, h, l], c, leg: 1 }, { s: [t, h, t], p: [w, h, l], c, leg: -1 },
    { s: [t, h, t], p: [-w, h, -l], c, leg: -1 }, { s: [t, h, t], p: [w, h, -l], c, leg: 1 },
  ];
}

export const WILDLIFE: Record<WildKind, WildDef> = {
  ciervo: {
    name: 'Ciervo', place: 'tierra', biomes: ['bosque', 'taiga', 'pradera', 'cerezos'], move: 'anda', speed: 2.2,
    text: 'Pasta en los claros del bosque y sale corriendo al menor ruido.',
    parts: [
      { s: [0.5, 0.5, 1.1], p: [0, 0.95, 0], c: 0x9a6a3a }, { s: [0.3, 0.6, 0.3], p: [0, 1.35, 0.5], c: 0x9a6a3a },
      { s: [0.3, 0.3, 0.45], p: [0, 1.65, 0.7], c: 0x8a5c30 }, { s: [0.06, 0.4, 0.06], p: [-0.12, 2, 0.6], c: 0xd8c8a0 },
      { s: [0.06, 0.4, 0.06], p: [0.12, 2, 0.6], c: 0xd8c8a0 }, { s: [0.14, 0.14, 0.1], p: [0, 1.05, -0.58], c: 0xf0e8d8 },
      ...legs(0.16, 0.42, 0.7, 0x7a5028),
    ],
  },
  conejo: {
    name: 'Conejo', place: 'tierra', biomes: ['pradera', 'bosque', 'cerezos', 'tundra', 'playa'], move: 'salta', speed: 2.6,
    text: 'Va a saltitos entre la hierba. En la tundra es blanco como la nieve.',
    parts: [
      { s: [0.3, 0.3, 0.42], p: [0, 0.22, 0], c: 0xb89a7a }, { s: [0.24, 0.24, 0.24], p: [0, 0.4, 0.22], c: 0xb89a7a },
      { s: [0.06, 0.26, 0.06], p: [-0.07, 0.62, 0.2], c: 0xc8aa8a }, { s: [0.06, 0.26, 0.06], p: [0.07, 0.62, 0.2], c: 0xc8aa8a },
      { s: [0.12, 0.12, 0.08], p: [0, 0.28, -0.24], c: 0xf8f8f8 },
    ],
  },
  zorro: {
    name: 'Zorro', place: 'tierra', biomes: ['bosque', 'taiga', 'tundra'], move: 'anda', speed: 2.8,
    text: 'Curioso pero desconfiado: te mira desde lejos y se escabulle entre los árboles.',
    parts: [
      { s: [0.36, 0.34, 0.8], p: [0, 0.5, 0], c: 0xd8702a }, { s: [0.32, 0.3, 0.32], p: [0, 0.66, 0.5], c: 0xd8702a },
      { s: [0.16, 0.14, 0.18], p: [0, 0.6, 0.72], c: 0xf4ece0 }, { s: [0.08, 0.14, 0.06], p: [-0.1, 0.88, 0.48], c: 0x3a2a20 },
      { s: [0.08, 0.14, 0.06], p: [0.1, 0.88, 0.48], c: 0x3a2a20 }, { s: [0.18, 0.18, 0.5], p: [0, 0.56, -0.6], c: 0xd8702a },
      { s: [0.16, 0.16, 0.12], p: [0, 0.56, -0.88], c: 0xf4ece0 }, ...legs(0.12, 0.28, 0.34, 0x3a2a20, 0.09),
    ],
  },
  cabra: {
    name: 'Cabra montesa', place: 'tierra', biomes: ['montaña', 'picos', 'cañon'], move: 'anda', speed: 2,
    text: 'Trepa por las rocas más empinadas como si nada.',
    parts: [
      { s: [0.42, 0.42, 0.8], p: [0, 0.8, 0], c: 0xd8d0c0 }, { s: [0.26, 0.3, 0.36], p: [0, 1.15, 0.48], c: 0xd0c8b8 },
      { s: [0.07, 0.3, 0.07], p: [-0.08, 1.4, 0.36], c: 0x5a4a3a }, { s: [0.07, 0.3, 0.07], p: [0.08, 1.4, 0.36], c: 0x5a4a3a },
      { s: [0.08, 0.16, 0.06], p: [0, 0.94, 0.62], c: 0xb0a898 }, ...legs(0.14, 0.3, 0.6, 0x8a8070),
    ],
  },
  camello: {
    name: 'Camello', place: 'tierra', biomes: ['desierto', 'sabana'], move: 'anda', speed: 1.6,
    text: 'Cruza las dunas despacio. Guarda la grasa en la joroba para los días sin agua.',
    parts: [
      { s: [0.6, 0.6, 1.3], p: [0, 1.4, 0], c: 0xc8a060 }, { s: [0.44, 0.4, 0.5], p: [0, 1.85, 0], c: 0xc09858 },
      { s: [0.24, 0.8, 0.24], p: [0, 1.8, 0.7], c: 0xc8a060 }, { s: [0.28, 0.26, 0.46], p: [0, 2.2, 0.85], c: 0xc09858 },
      ...legs(0.2, 0.48, 1.1, 0xb08850, 0.14),
    ],
  },
  suricata: {
    name: 'Suricata', place: 'tierra', biomes: ['desierto', 'sabana', 'cañon'], move: 'salta', speed: 2.4,
    text: 'Se pone de pie para vigilar. Si te ve, se esconde dando saltitos.',
    parts: [
      { s: [0.2, 0.46, 0.2], p: [0, 0.3, 0], c: 0xc8a878 }, { s: [0.18, 0.16, 0.2], p: [0, 0.6, 0.04], c: 0xc8a878 },
      { s: [0.1, 0.08, 0.04], p: [0, 0.62, 0.15], c: 0x3a2a20 }, { s: [0.06, 0.3, 0.06], p: [0, 0.12, -0.14], c: 0x8a7050 },
    ],
  },
  loro: {
    name: 'Loro', place: 'tierra', biomes: ['selva', 'bambu'], move: 'vuela', speed: 3.5,
    text: 'Vuela bajo entre los árboles de la selva, chillando de colores.',
    parts: [
      { s: [0.22, 0.26, 0.4], p: [0, 0, 0], c: 0xe03030 }, { s: [0.2, 0.2, 0.2], p: [0, 0.14, 0.24], c: 0xe03030 },
      { s: [0.08, 0.1, 0.1], p: [0, 0.1, 0.38], c: 0xf0d040 }, { s: [0.4, 0.04, 0.26], p: [-0.28, 0.06, 0], c: 0x3060e0, wing: -1 },
      { s: [0.4, 0.04, 0.26], p: [0.28, 0.06, 0], c: 0x3060e0, wing: 1 }, { s: [0.12, 0.04, 0.36], p: [0, -0.04, -0.34], c: 0x30a040 },
    ],
  },
  rana: {
    name: 'Rana', place: 'tierra', biomes: ['pantano', 'selva', 'luminoso'], move: 'salta', speed: 2,
    text: 'Croa en los charcos del pantano. En la selva las hay de colores chillones.',
    parts: [
      { s: [0.3, 0.18, 0.32], p: [0, 0.12, 0], c: 0x58a040 }, { s: [0.08, 0.08, 0.08], p: [-0.09, 0.24, 0.1], c: 0xf0f0d0 },
      { s: [0.08, 0.08, 0.08], p: [0.09, 0.24, 0.1], c: 0xf0f0d0 }, { s: [0.1, 0.08, 0.2], p: [-0.18, 0.05, -0.08], c: 0x4a8834 },
      { s: [0.1, 0.08, 0.2], p: [0.18, 0.05, -0.08], c: 0x4a8834 },
    ],
  },
  pinguino: {
    name: 'Pingüino', place: 'orilla', biomes: ['glaciar', 'tundra', 'picos'], move: 'anda', speed: 1.2,
    text: 'Anda a pasitos por el hielo y se tira al agua de cabeza.',
    parts: [
      { s: [0.34, 0.56, 0.3], p: [0, 0.36, 0], c: 0x202430 }, { s: [0.24, 0.4, 0.06], p: [0, 0.32, 0.15], c: 0xf4f4f4 },
      { s: [0.26, 0.22, 0.24], p: [0, 0.74, 0.02], c: 0x202430 }, { s: [0.08, 0.06, 0.12], p: [0, 0.72, 0.18], c: 0xf0a020 },
      { s: [0.06, 0.3, 0.16], p: [-0.2, 0.4, 0], c: 0x202430, wing: -1 }, { s: [0.06, 0.3, 0.16], p: [0.2, 0.4, 0], c: 0x202430, wing: 1 },
      { s: [0.1, 0.04, 0.14], p: [-0.08, 0.04, 0.06], c: 0xf0a020 }, { s: [0.1, 0.04, 0.14], p: [0.08, 0.04, 0.06], c: 0xf0a020 },
    ],
  },
  foca: {
    name: 'Foca', place: 'orilla', biomes: COLD, move: 'anda', speed: 0.8,
    text: 'Toma el sol en la orilla helada y se arrastra hasta el agua si te acercas.',
    parts: [
      { s: [0.44, 0.34, 1], p: [0, 0.18, 0], c: 0x8a8e96 }, { s: [0.32, 0.3, 0.3], p: [0, 0.32, 0.56], c: 0x8a8e96 },
      { s: [0.06, 0.06, 0.04], p: [0, 0.3, 0.72], c: 0x202020 }, { s: [0.4, 0.06, 0.18], p: [0, 0.04, -0.56], c: 0x70747c },
    ],
  },
  oso_polar: {
    name: 'Oso polar', place: 'tierra', biomes: ['glaciar', 'tundra', 'picos'], move: 'anda', speed: 1.4,
    text: 'Grande, blanco y tranquilo. Mejor mirarlo de lejos.',
    parts: [
      { s: [0.8, 0.76, 1.4], p: [0, 1, 0], c: 0xf0f0ea }, { s: [0.5, 0.46, 0.5], p: [0, 1.22, 0.86], c: 0xf0f0ea },
      { s: [0.22, 0.2, 0.2], p: [0, 1.12, 1.16], c: 0xe0e0d8 }, { s: [0.08, 0.06, 0.04], p: [0, 1.16, 1.27], c: 0x202020 },
      ...legs(0.26, 0.48, 0.66, 0xe8e8e0, 0.24),
    ],
  },
  buho: {
    name: 'Búho', place: 'tierra', biomes: ['bosque', 'taiga', 'setas', 'luminoso', 'cerezos'], time: 'noche', move: 'vuela', speed: 2.8,
    text: 'Solo sale de noche. Vuela sin hacer ruido entre los árboles.',
    parts: [
      { s: [0.3, 0.36, 0.28], p: [0, 0, 0], c: 0x8a6a48 }, { s: [0.28, 0.24, 0.26], p: [0, 0.28, 0.02], c: 0x8a6a48 },
      { s: [0.08, 0.08, 0.04], p: [-0.07, 0.3, 0.15], c: 0xf0c020, glow: true }, { s: [0.08, 0.08, 0.04], p: [0.07, 0.3, 0.15], c: 0xf0c020, glow: true },
      { s: [0.5, 0.04, 0.24], p: [-0.38, 0.06, 0], c: 0x7a5a3a, wing: -1 }, { s: [0.5, 0.04, 0.24], p: [0.38, 0.06, 0], c: 0x7a5a3a, wing: 1 },
    ],
  },
  delfin: {
    name: 'Delfín', place: 'mar', move: 'nada', speed: 5,
    text: 'Nada en grupo cerca de la costa y salta junto a tu barco cuando navegas.',
    parts: [
      { s: [0.4, 0.4, 1.5], p: [0, 0, 0], c: 0x7a8ea8 }, { s: [0.2, 0.16, 0.36], p: [0, -0.08, 0.9], c: 0x7a8ea8 },
      { s: [0.08, 0.34, 0.3], p: [0, 0.32, -0.1], c: 0x6a7e98 }, { s: [0.6, 0.06, 0.2], p: [0, 0, -0.84], c: 0x6a7e98 },
      { s: [0.36, 0.12, 1.2], p: [0, -0.16, 0.04], c: 0xd8e0e8 },
    ],
  },
  tortuga: {
    name: 'Tortuga marina', place: 'orilla', biomes: ['playa', 'selva', 'sabana', 'desierto'], move: 'anda', speed: 0.5,
    text: 'Sale a la arena de la playa a descansar. Va despacito, pero en el agua es rapidísima.',
    parts: [
      { s: [0.7, 0.26, 0.8], p: [0, 0.22, 0], c: 0x5a7a40 }, { s: [0.56, 0.12, 0.66], p: [0, 0.38, 0], c: 0x6a8a48 },
      { s: [0.22, 0.18, 0.24], p: [0, 0.2, 0.5], c: 0x8aa070 }, { s: [0.3, 0.06, 0.16], p: [-0.42, 0.12, 0.2], c: 0x8aa070 },
      { s: [0.3, 0.06, 0.16], p: [0.42, 0.12, 0.2], c: 0x8aa070 },
    ],
  },
  cangrejo: {
    name: 'Cangrejo', place: 'orilla', move: 'anda', speed: 1.2,
    text: 'Corre de lado por la arena de la playa y se mete bajo las piedras.',
    parts: [
      { s: [0.36, 0.14, 0.26], p: [0, 0.12, 0], c: 0xd04a2a }, { s: [0.12, 0.1, 0.12], p: [-0.24, 0.16, 0.16], c: 0xe05a3a },
      { s: [0.12, 0.1, 0.12], p: [0.24, 0.16, 0.16], c: 0xe05a3a }, { s: [0.04, 0.08, 0.04], p: [-0.06, 0.24, 0.1], c: 0x202020 },
      { s: [0.04, 0.08, 0.04], p: [0.06, 0.24, 0.1], c: 0x202020 }, { s: [0.5, 0.04, 0.04], p: [0, 0.05, -0.04], c: 0xb03a20 },
    ],
  },
  medusa: {
    name: 'Medusa', place: 'mar', move: 'bucea', speed: 0.4,
    text: 'Flota bajo la superficie. De noche brilla con una luz azulada.',
    parts: [
      { s: [0.5, 0.3, 0.5], p: [0, 0, 0], c: 0xc0a0f0, glow: true }, { s: [0.04, 0.5, 0.04], p: [-0.12, -0.38, 0.1], c: 0xd8c0ff, glow: true },
      { s: [0.04, 0.6, 0.04], p: [0.12, -0.42, -0.08], c: 0xd8c0ff, glow: true }, { s: [0.04, 0.45, 0.04], p: [0.02, -0.36, 0.14], c: 0xd8c0ff, glow: true },
    ],
  },
  raya: {
    name: 'Raya', place: 'mar', move: 'bucea', speed: 1.8,
    text: 'Planea bajo el agua batiendo las aletas despacio, como si volara.',
    parts: [
      { s: [0.5, 0.1, 0.7], p: [0, 0, 0], c: 0x5a6a7a }, { s: [0.5, 0.06, 0.5], p: [-0.46, 0, -0.04], c: 0x5a6a7a, wing: -1 },
      { s: [0.5, 0.06, 0.5], p: [0.46, 0, -0.04], c: 0x5a6a7a, wing: 1 }, { s: [0.04, 0.04, 0.8], p: [0, 0, -0.74], c: 0x4a5a6a },
    ],
  },
  ballena: {
    name: 'Ballena', place: 'mar', move: 'nada', speed: 1.5,
    text: 'Se ve a lo lejos, en mar abierto: asoma el lomo y echa un chorro de agua.',
    parts: [
      { s: [2.4, 2, 7], p: [0, -0.6, 0], c: 0x3a4a6a }, { s: [2, 1, 2.4], p: [0, -1.2, 3.6], c: 0x3a4a6a },
      { s: [2.2, 0.6, 5], p: [0, -1.5, 0.6], c: 0xc8ccd4 }, { s: [3.4, 0.2, 1.2], p: [0, -0.6, -4.2], c: 0x2e3e5e },
      { s: [1.2, 0.16, 0.6], p: [-1.6, -1, 1.4], c: 0x2e3e5e, wing: -1 }, { s: [1.2, 0.16, 0.6], p: [1.6, -1, 1.4], c: 0x2e3e5e, wing: 1 },
    ],
  },
};

export const WILD_KINDS = Object.keys(WILDLIFE) as WildKind[];

/** Los animales que pueden salir en un sitio: según lo que hay (tierra, orilla o mar), el bioma y si es de noche. */
export function wildFor(place: WildPlace, biome: Biome | null, night: boolean): WildKind[] {
  return WILD_KINDS.filter((k) => {
    const d = WILDLIFE[k];
    if (d.place !== place) return false;
    if (d.time === 'noche' && !night) return false;
    if (d.time === 'dia' && night) return false;
    return !d.biomes || (biome !== null && d.biomes.includes(biome));
  });
}

/** Cuántos puede haber: en tierra (con la orilla) y en el mar. */
export const WILD_RULES: Record<'tierra' | 'mar', PopulationRule> = {
  tierra: { perZone: 2, total: 8, respawn: 90 },
  mar: { perZone: 2, total: 6, respawn: 90 },
};

/** Lo que la fauna necesita saber del mundo. */
export interface WildWorld {
  /** Altura del bloque más alto (sólido o agua) de la columna. */
  topAt(x: number, z: number): number;
  seaAt(x: number, z: number): boolean;
  waterAt(x: number, z: number): boolean;
  biomeAt(x: number, z: number): Biome | null;
}

/** Monta el modelo de cubos de un animal, mirando hacia +z. */
export function wildModel(kind: WildKind): PartsModel {
  const sea = seaModel(kind); if (sea) return sea;
  return partsModel(WILDLIFE[kind].parts, kind === 'medusa' ? 0.75 : 1);
}

export interface PartsModel {
  group: THREE.Group;
  legs: THREE.Object3D[];
  wings: THREE.Object3D[];
  glow: THREE.MeshLambertMaterial[];
  mats: THREE.MeshLambertMaterial[];
  animate?: (dt: number, seconds: number, moving: boolean, night: number) => void;
  dispose?: () => void;
}

/** Un modelo de cubos a partir de sus piezas (lo usan también las criaturas hostiles de la v4.24). */
export function partsModel(parts: Part[], opacity = 1): PartsModel {
  const group = new THREE.Group();
  const legs: THREE.Object3D[] = [];
  const wings: THREE.Object3D[] = [];
  const glow: THREE.MeshLambertMaterial[] = [];
  const mats: THREE.MeshLambertMaterial[] = [];
  for (const part of parts) {
    const mat = new THREE.MeshLambertMaterial({ color: part.c, transparent: opacity < 1, opacity });
    mats.push(mat);
    if (part.glow) {
      mat.emissive.setHex(part.c);
      glow.push(mat);
    }
    const mesh = new THREE.Mesh(BOX, mat);
    mesh.scale.set(...part.s);
    if (part.leg) {
      // Las patas giran desde arriba.
      const pivot = new THREE.Group();
      pivot.position.set(...part.p);
      mesh.position.y = -part.s[1] / 2;
      pivot.add(mesh);
      pivot.userData.side = part.leg;
      group.add(pivot);
      legs.push(pivot);
    } else {
      mesh.position.set(...part.p);
      if (part.wing) {
        mesh.userData.side = part.wing;
        wings.push(mesh);
      }
      group.add(mesh);
    }
  }
  return { group, legs, wings, glow, mats };
}

const BOX = new THREE.BoxGeometry(1, 1, 1);

interface Wild {
  kind: WildKind;
  group: 'tierra' | 'mar';
  zone: string;
  model: PartsModel;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  yaw: number;
  phase: number;
  /** Segundos hasta cambiar de rumbo. */
  timer: number;
  /** Huyendo: corre más y lejos de ti. */
  fleeing: number;
  /** Salto del delfín o chorro de la ballena en curso (0 si nada). */
  leap: number;
  /** Segundos que lleva el delfín acompañando al barco (v5.1: al rato se cansa y se va). */
  follow: number;
  /** A qué lado del barco nada (-1 babor, 1 estribor). */
  side: number;
  spout?: THREE.Mesh;
}

const NEAR = 18;
const FAR = 44;
const GONE = 62;
/** Las ballenas salen más lejos, en mar abierto. */
const WHALE_NEAR = 40;
const WHALE_FAR = 58;
const WHALE_GONE = 90;
const SCARE = 5;
/** Segundos que un delfín acompaña al barco antes de irse (v5.1). */
const DOLPHIN_ESCORT = 25;

export class Wildlife {
  readonly group = new THREE.Group();
  readonly list: Wild[] = [];
  private spawnTimer = 0;
  private population = new Population(WILD_RULES);
  private lastBoat = new THREE.Vector3();
  private heading: [number, number] = [0, -1];

  constructor(private random: () => number = Math.random) {}

  /**
   * Un fotograma. `player`: dónde estás; `boat`: dónde va tu barco si navegas (los delfines lo siguen y saltan).
   */
  update(dt: number, seconds: number, player: THREE.Vector3, night: number, world: WildWorld, boat: THREE.Vector3 | null) {
    this.population.update(dt);
    // Hacia dónde va el barco, para que los delfines naden a su lado y no detrás.
    if (boat) {
      const dx = boat.x - this.lastBoat.x;
      const dz = boat.z - this.lastBoat.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.02 && d < 5) this.heading = [dx / d, dz / d];
      this.lastBoat.copy(boat);
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 0.7;
      this.trySpawn(player, night > 0.5, world);
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const w = this.list[i];
      const far = w.kind === 'ballena' ? WHALE_GONE : GONE;
      const nocturnal = WILDLIFE[w.kind].time === 'noche';
      if (Math.hypot(w.pos.x - player.x, w.pos.z - player.z) > far || (nocturnal && night < 0.3)) {
        this.despawn(i);
        continue;
      }
      this.step(w, dt, seconds, player, night, world, boat);
    }
  }

  private trySpawn(player: THREE.Vector3, night: boolean, world: WildWorld) {
    const whale = this.random() < 0.08;
    const a = this.random() * Math.PI * 2;
    const d = whale ? WHALE_NEAR + this.random() * (WHALE_FAR - WHALE_NEAR) : NEAR + this.random() * (FAR - NEAR);
    const x = Math.floor(player.x + Math.cos(a) * d);
    const z = Math.floor(player.z + Math.sin(a) * d);
    const sea = world.seaAt(x, z);
    let place: WildPlace;
    if (sea) place = 'mar';
    else if (world.waterAt(x, z)) return;
    else {
      const top = world.topAt(x, z);
      if (top < SEA_LEVEL) return;
      // La orilla: tierra baja con mar al lado.
      const shore = top <= SEA_LEVEL + 2 && [[3, 0], [-3, 0], [0, 3], [0, -3]].some(([dx, dz]) => world.seaAt(x + dx, z + dz));
      place = shore && this.random() < 0.6 ? 'orilla' : 'tierra';
    }
    const group = place === 'mar' ? 'mar' : 'tierra';
    if (!this.population.canSpawn(group, x, z)) return;
    let options = wildFor(place, world.biomeAt(x, z), night);
    if (place === 'mar') options = options.filter((k) => (k === 'ballena') === whale);
    if (!options.length) return;
    const kind = options[Math.floor(this.random() * options.length)];
    if (kind === 'ballena' && this.list.some((w) => w.kind === 'ballena')) return;
    const model = wildModel(kind);
    const pos = new THREE.Vector3(x + 0.5, this.groundY(kind, x, z, world), z + 0.5);
    model.group.position.copy(pos);
    this.group.add(model.group);
    const w: Wild = {
      kind, group, zone: this.population.add(group, x, z), model, pos, target: pos.clone(), yaw: this.random() * Math.PI * 2,
      phase: this.random() * 10, timer: 0, fleeing: 0, leap: 0, follow: 0, side: this.random() < 0.5 ? -1 : 1,
    };
    if (kind === 'ballena') {
      w.spout = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.7 }));
      w.spout.visible = false;
      model.group.add(w.spout);
    }
    this.list.push(w);
  }

  /** A qué altura va cada uno: en el suelo, flotando, bajo el agua o volando. */
  private groundY(kind: WildKind, x: number, z: number, world: WildWorld): number {
    const move = WILDLIFE[kind].move;
    if (move === 'nada') return SEA_LEVEL + 0.75;
    if (move === 'bucea') return SEA_LEVEL - 0.6;
    const top = world.topAt(x, z) + 1;
    return move === 'vuela' ? top + 2.5 : top;
  }

  private step(w: Wild, dt: number, seconds: number, player: THREE.Vector3, night: number, world: WildWorld, boat: THREE.Vector3 | null) {
    const def = WILDLIFE[w.kind];
    const marine = def.place === 'mar';
    const dx = w.pos.x - player.x;
    const dz = w.pos.z - player.z;
    const dist = Math.hypot(dx, dz);
    // Los de tierra huyen si te acercas (los del mar, no: los delfines incluso se acercan al barco).
    if (!marine && dist < SCARE && w.fleeing <= 0) {
      w.fleeing = 3;
      w.target.set(w.pos.x + (dx / (dist || 1)) * 10, w.pos.y, w.pos.z + (dz / (dist || 1)) * 10);
    }
    w.fleeing = Math.max(0, w.fleeing - dt);
    w.timer -= dt;
    const escort = w.kind === 'delfin' && boat && w.follow < DOLPHIN_ESCORT && Math.hypot(w.pos.x - boat.x, w.pos.z - boat.z) < 30;
    if (escort && boat) {
      // Junto al barco (v5.1): nada a un lado, a unos metros, un poco por delante; salta de vez en cuando y al
      // rato se cansa y se va. Si el barco corre más que él, se queda atrás.
      const [fx, fz] = this.heading;
      // Se queda por el lado del barco por el que ha llegado (sin cruzar por debajo).
      if (w.follow === 0) w.side = -fz * (w.pos.x - boat.x) + fx * (w.pos.z - boat.z) >= 0 ? 1 : -1;
      w.follow += dt;
      w.target.set(boat.x + fx * 3 - fz * w.side * 7, w.pos.y, boat.z + fz * 3 + fx * w.side * 7);
      if (w.leap <= 0 && this.random() < dt * 0.12) w.leap = 1;
      if (w.follow >= DOLPHIN_ESCORT) {
        // Se despide: se aleja hacia su lado.
        w.target.set(w.pos.x - fz * w.side * 25, w.pos.y, w.pos.z + fx * w.side * 25);
        w.timer = 8;
      }
    } else if (w.timer <= 0 && w.fleeing <= 0) {
      w.timer = 3 + this.random() * 5;
      const a = this.random() * Math.PI * 2;
      const r = 2 + this.random() * 6;
      w.target.set(w.pos.x + Math.cos(a) * r, w.pos.y, w.pos.z + Math.sin(a) * r);
      if (w.kind === 'ballena' && w.leap <= 0) w.leap = 2.5;
    }
    const tx = w.target.x - w.pos.x;
    const tz = w.target.z - w.pos.z;
    const left = Math.hypot(tx, tz);
    const speed = def.speed * (w.fleeing > 0 ? 2 : 1) * (escort ? 1.3 : 1);
    let moving = false;
    if (left > 0.3) {
      const step = Math.min(left, speed * dt);
      const nx = w.pos.x + (tx / left) * step;
      const nz = w.pos.z + (tz / left) * step;
      const sea = world.seaAt(Math.floor(nx), Math.floor(nz));
      // Los de mar no salen del mar y los de tierra no se meten en el agua (ni suben paredes de más de un bloque).
      const ok = marine ? sea : !world.waterAt(Math.floor(nx), Math.floor(nz))
        && (def.move === 'vuela' || Math.abs(world.topAt(Math.floor(nx), Math.floor(nz)) + 1 - w.pos.y) <= 1.2);
      if (ok) {
        w.pos.x = nx;
        w.pos.z = nz;
        moving = true;
        w.yaw = Math.atan2(tx, tz);
      } else {
        w.target.copy(w.pos);
        w.timer = 0;
      }
    }
    const base = this.groundY(w.kind, Math.floor(w.pos.x), Math.floor(w.pos.z), world);
    w.phase += dt * (moving ? 8 : 2);
    let y = base;
    if (def.move === 'salta' && moving) y += Math.abs(Math.sin(w.phase * 0.8)) * 0.35;
    if (def.move === 'vuela') y += Math.sin(seconds * 1.5 + w.phase) * 0.3;
    if (def.move === 'bucea') y += Math.sin(seconds * 0.8 + w.phase) * 0.15;
    if (def.move === 'nada') y += Math.sin(seconds * 2 + w.phase) * 0.1;
    let pitch = 0;
    if (w.leap > 0) {
      w.leap = Math.max(0, w.leap - dt);
      if (w.kind === 'delfin') {
        // Un salto corto que sale del agua y vuelve a entrar (antes parecía que volaban).
        const t = 1 - w.leap;
        y += Math.sin(t * Math.PI) * 1.1;
        pitch = -Math.cos(t * Math.PI) * 0.6;
      } else if (w.spout) {
        // La ballena asoma el lomo y echa el chorro.
        y += Math.sin((w.leap / 2.5) * Math.PI) * 0.6;
        w.spout.visible = w.leap < 2;
        w.spout.scale.set(0.4, 0.5 + (2 - w.leap) * 2, 0.4);
        w.spout.position.set(0, 0.6 + w.spout.scale.y / 2, 2);
      }
    } else if (w.spout) w.spout.visible = false;
    if (w.kind === 'ballena') y -= 0.4;
    w.pos.y = base;
    const g = w.model.group;
    g.position.set(w.pos.x, y, w.pos.z);
    g.rotation.set(pitch, w.yaw, 0, 'YXZ');
    const swing = moving ? Math.sin(w.phase) * 0.5 : 0;
    for (const leg of w.model.legs) leg.rotation.x = swing * leg.userData.side;
    const flap = def.move === 'vuela' ? Math.sin(seconds * 14 + w.phase) * 0.6 : Math.sin(seconds * 3 + w.phase) * 0.25;
    for (const wing of w.model.wings) wing.rotation.z = flap * wing.userData.side;
    // Las medusas brillan de noche (y los ojos del búho).
    for (const m of w.model.glow) m.emissiveIntensity = 0.15 + night * 0.85;
    w.model.animate?.(dt, seconds, moving, night);
  }

  private despawn(i: number) {
    const w = this.list[i];
    this.group.remove(w.model.group);
    this.population.remove(w.group, w.zone);
    if (w.model.dispose) w.model.dispose();
    else {
      for (const o of w.model.group.children) {
        const mesh = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh) : (o.children[0] as THREE.Mesh | undefined);
        (mesh?.material as THREE.Material | undefined)?.dispose();
      }
    }
    this.list.splice(i, 1);
  }

  /** Quita a todos (al viajar a otra isla). */
  clear() {
    for (let i = this.list.length - 1; i >= 0; i--) this.despawn(i);
  }
}
