import * as THREE from 'three';

export type Species =
  | 'gato' | 'conejo' | 'oso' | 'pato' | 'perro' | 'rana' | 'ardilla' | 'tortuga'
  | 'oveja' | 'cerdo' | 'pingüino' | 'koala' | 'zorro' | 'elefante'
  // El alcalde y el urbanista (v4.13).
  | 'búho' | 'castor'
  // Los comercios del campo y la mina (v4.17).
  | 'cabra' | 'caballo' | 'topo'
  // Moda, muebles y mobiliario urbano (v4.18).
  | 'alpaca' | 'mapache' | 'jirafa';

export interface SpeciesLook {
  /** Color del pelo (o plumas, o piel). */
  fur: number;
  /** Hocico, tripa y el interior de las orejas. */
  belly: number;
  /** Cara, si es de otro color que el pelo (la oveja). */
  face?: number;
  /** Pies, si no son del color del pelo. */
  feet?: number;
}

export const LOOKS: Record<Species, SpeciesLook> = {
  gato: { fur: 0xf2a65a, belly: 0xfff1dc },
  conejo: { fur: 0xf4f0ec, belly: 0xffd9e0 },
  oso: { fur: 0x9a6a44, belly: 0xd9b48a },
  pato: { fur: 0xfbf7ee, belly: 0xffffff, feet: 0xf5a623 },
  perro: { fur: 0xd8b07a, belly: 0xfff4e0 },
  rana: { fur: 0x7cc46a, belly: 0xe8f5c8 },
  ardilla: { fur: 0xb8743a, belly: 0xf4dcb8 },
  tortuga: { fur: 0x9cc48a, belly: 0xf0ecc8 },
  oveja: { fur: 0xfaf6ee, belly: 0xffe4e4, face: 0xf3dcc4 },
  cerdo: { fur: 0xf6b8c4, belly: 0xffd8de },
  pingüino: { fur: 0x2e3440, belly: 0xffffff, feet: 0xf5a623 },
  koala: { fur: 0x9aa0a8, belly: 0xf2f2f2 },
  zorro: { fur: 0xe8823a, belly: 0xfff6ea },
  elefante: { fur: 0x9fb4c8, belly: 0xe8d8e0 },
  'búho': { fur: 0x8a6a4a, belly: 0xf0e2c4, feet: 0xe0a040 },
  castor: { fur: 0x7a5034, belly: 0xd8b890, feet: 0x4a3020 },
  cabra: { fur: 0xe8e0d0, belly: 0xfaf6ee, feet: 0x5a4a3a },
  caballo: { fur: 0xa86a3a, belly: 0xe8c8a0, feet: 0x3a2a1a },
  topo: { fur: 0x4a4048, belly: 0xc8b8c0, feet: 0xf0b0b8 },
  alpaca: { fur: 0xf6ecdc, belly: 0xfffaf0, feet: 0x8a7060 },
  mapache: { fur: 0x8a8a92, belly: 0xe0e0e4, feet: 0x3a3a40 },
  jirafa: { fur: 0xf0c060, belly: 0xfff0c8, feet: 0x6a4a2a },
};

/** Lo que hace falta para dibujar a un vecino. */
export interface ModelSpec {
  species: Species;
  shirt: number;
  /** Color de pelo propio, para que dos vecinos de la misma especie no sean iguales. */
  fur?: number;
  pattern?: 'rayas' | 'lunares';
}

export interface VillagerModel {
  group: THREE.Group;
  legs: THREE.Mesh[];
  arms: THREE.Mesh[];
  eyes: THREE.Object3D[];
}

const DARK = 0x1d1d1d;
const PINK = 0xf28a9a;
const WHITE = 0xffffff;

/** Un color un poco más oscuro (k < 1) o más claro (k > 1). */
function shade(color: number, k: number): number {
  const c = new THREE.Color(color);
  if (k < 1) c.multiplyScalar(k);
  else c.lerp(new THREE.Color(WHITE), k - 1);
  return c.getHex();
}

/**
 * Vecino hecho de bloques, con cabeza grande y redondeada como en Animal Crossing.
 * Cada especie tiene lo suyo (orejas, hocico, cola…) para reconocerla de lejos.
 * El origen está en los pies y la cara mira hacia +z.
 */
export function buildVillagerModel(spec: ModelSpec): VillagerModel {
  const base = LOOKS[spec.species];
  const fur = spec.fur ?? base.fur;
  const face = base.face ?? fur;
  const belly = base.belly;
  const group = new THREE.Group();
  const mats = new Map<number, THREE.MeshLambertMaterial>();
  const mat = (c: number) => {
    let m = mats.get(c);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: c });
      mats.set(c, m);
    }
    return m;
  };
  const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number, parent: THREE.Object3D = group) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  // Las piernas y los brazos giran desde arriba, así que la geometría cuelga del punto de giro.
  const limb = (w: number, h: number, color: number, x: number, y: number) => {
    const g = new THREE.BoxGeometry(w, h, w);
    g.translate(0, -h / 2, 0);
    const m = new THREE.Mesh(g, mat(color));
    m.position.set(x, y, 0);
    group.add(m);
    return m;
  };

  // --- Cuerpo ---
  const legs = [limb(0.16, 0.28, fur, -0.11, 0.28), limb(0.16, 0.28, fur, 0.11, 0.28)];
  for (const leg of legs) box(0.18, 0.06, 0.22, base.feet ?? shade(fur, 0.8), 0, -0.25, 0.03, leg);
  box(0.46, 0.38, 0.32, spec.shirt, 0, 0.47, 0);
  box(0.3, 0.05, 0.33, WHITE, 0, 0.64, 0); // cuello de la camiseta
  if (spec.pattern === 'rayas') {
    for (const y of [0.4, 0.52]) box(0.47, 0.05, 0.33, shade(spec.shirt, 1.45), 0, y, 0);
  } else if (spec.pattern === 'lunares') {
    for (const [x, y] of [[-0.12, 0.52], [0.1, 0.42], [-0.04, 0.36], [0.14, 0.56]]) box(0.06, 0.06, 0.02, WHITE, x, y, 0.165);
  }
  if (spec.species === 'pingüino') box(0.3, 0.3, 0.02, belly, 0, 0.45, 0.165); // pechera blanca
  const arms = [limb(0.13, 0.3, spec.shirt, -0.3, 0.64), limb(0.13, 0.3, spec.shirt, 0.3, 0.64)];
  for (const arm of arms) box(0.12, 0.1, 0.12, fur, 0, -0.27, 0, arm);

  // --- Cabeza: una caja ancha y otra más alta y estrecha dan un contorno redondeado ---
  const y = 1.0;
  const front = 0.32;
  box(0.78, 0.58, 0.64, face, 0, y, 0);
  box(0.68, 0.68, 0.56, face, 0, y, 0);
  box(0.7, 0.5, 0.7, face, 0, y - 0.02, 0);

  // Ojos con brillo; se cierran al parpadear y al dormir.
  const eyes: THREE.Object3D[] = [];
  const eye = (x: number, ey: number, z = front + 0.04) => {
    const g = new THREE.Group();
    g.position.set(x, ey, z);
    box(0.09, 0.13, 0.02, DARK, 0, 0, 0, g);
    box(0.035, 0.035, 0.01, WHITE, 0.02, 0.035, 0.012, g);
    group.add(g);
    eyes.push(g);
  };
  const cheeks = () => {
    box(0.1, 0.05, 0.02, PINK, -0.26, y - 0.1, front + 0.04);
    box(0.1, 0.05, 0.02, PINK, 0.26, y - 0.1, front + 0.04);
  };
  const mouth = (w = 0.08) => box(w, 0.025, 0.02, 0x7a3a3a, 0, y - 0.18, front + 0.04);
  const ear = (w: number, h: number, d: number, x: number, ey: number, outer: number, inner: number | null) => {
    box(w, h, d, outer, x, ey, 0);
    if (inner !== null) box(w * 0.5, h * 0.6, 0.02, inner, x, ey - h * 0.05, d / 2 + 0.01);
  };
  const tail = (w: number, h: number, d: number, color: number, ty: number, tz: number, tilt = 0) => {
    const t = box(w, h, d, color, 0, ty, tz);
    t.rotation.x = tilt;
    return t;
  };

  switch (spec.species) {
    case 'gato':
      eye(-0.15, y + 0.03);
      eye(0.15, y + 0.03);
      cheeks();
      box(0.24, 0.12, 0.04, belly, 0, y - 0.12, front + 0.04);
      box(0.06, 0.04, 0.02, PINK, 0, y - 0.07, front + 0.07);
      for (const sx of [-1, 1]) for (const wy of [-0.1, -0.14]) box(0.16, 0.015, 0.01, DARK, sx * 0.33, y + wy, front + 0.06);
      ear(0.18, 0.2, 0.1, -0.24, y + 0.42, fur, PINK);
      ear(0.18, 0.2, 0.1, 0.24, y + 0.42, fur, PINK);
      tail(0.08, 0.08, 0.42, fur, 0.5, -0.32, -0.7);
      break;
    case 'perro':
      eye(-0.16, y + 0.05);
      eye(0.16, y + 0.05);
      cheeks();
      box(0.3, 0.16, 0.1, belly, 0, y - 0.12, front + 0.06);
      box(0.1, 0.07, 0.04, DARK, 0, y - 0.07, front + 0.12);
      mouth(0.06);
      box(0.14, 0.36, 0.22, shade(fur, 0.75), -0.44, y + 0.02, 0);
      box(0.14, 0.36, 0.22, shade(fur, 0.75), 0.44, y + 0.02, 0);
      tail(0.08, 0.24, 0.08, fur, 0.62, -0.2, 0.5);
      break;
    case 'oso':
      eye(-0.16, y + 0.06);
      eye(0.16, y + 0.06);
      cheeks();
      box(0.32, 0.2, 0.1, belly, 0, y - 0.12, front + 0.06);
      box(0.12, 0.07, 0.04, DARK, 0, y - 0.06, front + 0.12);
      mouth(0.06);
      ear(0.2, 0.18, 0.12, -0.3, y + 0.38, fur, belly);
      ear(0.2, 0.18, 0.12, 0.3, y + 0.38, fur, belly);
      tail(0.12, 0.12, 0.1, fur, 0.4, -0.2);
      break;
    case 'conejo':
      eye(-0.15, y + 0.03);
      eye(0.15, y + 0.03);
      cheeks();
      box(0.05, 0.04, 0.02, PINK, 0, y - 0.07, front + 0.05);
      box(0.08, 0.06, 0.02, WHITE, 0, y - 0.14, front + 0.05); // dientes
      ear(0.13, 0.46, 0.08, -0.14, y + 0.56, fur, belly);
      ear(0.13, 0.46, 0.08, 0.14, y + 0.56, fur, belly);
      tail(0.16, 0.16, 0.14, WHITE, 0.38, -0.22);
      break;
    case 'pato':
      eye(-0.17, y + 0.06);
      eye(0.17, y + 0.06);
      cheeks();
      box(0.28, 0.1, 0.18, 0xf5a623, 0, y - 0.1, front + 0.1);
      box(0.06, 0.14, 0.06, fur, 0, y + 0.4, 0.04); // plumita en la cabeza
      tail(0.22, 0.08, 0.14, fur, 0.42, -0.2, -0.4);
      break;
    case 'rana': {
      // Ojos saltones encima de la cabeza.
      for (const sx of [-1, 1]) {
        box(0.22, 0.18, 0.22, fur, sx * 0.2, y + 0.38, 0.1);
        eye(sx * 0.2, y + 0.39, 0.22);
      }
      cheeks();
      box(0.42, 0.03, 0.02, 0x7a3a3a, 0, y - 0.12, front + 0.04);
      break;
    }
    case 'ardilla':
      eye(-0.15, y + 0.04);
      eye(0.15, y + 0.04);
      cheeks();
      box(0.24, 0.12, 0.04, belly, 0, y - 0.12, front + 0.04);
      box(0.06, 0.04, 0.02, DARK, 0, y - 0.07, front + 0.07);
      ear(0.14, 0.2, 0.1, -0.22, y + 0.42, fur, belly);
      ear(0.14, 0.2, 0.1, 0.22, y + 0.42, fur, belly);
      box(0.3, 0.7, 0.24, fur, 0, 0.75, -0.34); // cola grande
      box(0.3, 0.24, 0.3, fur, 0, 1.18, -0.42);
      box(0.32, 0.14, 0.26, belly, 0, 1.28, -0.44);
      break;
    case 'tortuga':
      eye(-0.16, y + 0.04);
      eye(0.16, y + 0.04);
      cheeks();
      mouth(0.14);
      box(0.62, 0.5, 0.26, 0x6b8e4e, 0, 0.6, -0.28); // caparazón
      box(0.5, 0.06, 0.2, 0x4f6e38, 0, 0.7, -0.42);
      box(0.2, 0.18, 0.04, 0x4f6e38, -0.14, 0.52, -0.42);
      box(0.2, 0.18, 0.04, 0x4f6e38, 0.14, 0.52, -0.42);
      break;
    case 'oveja':
      eye(-0.15, y + 0.0);
      eye(0.15, y + 0.0);
      cheeks();
      box(0.06, 0.04, 0.02, PINK, 0, y - 0.1, front + 0.05);
      // Lana: un gorro esponjoso de bloques y bolitas a los lados.
      box(0.86, 0.26, 0.74, fur, 0, y + 0.3, -0.02);
      for (const sx of [-1, 1]) box(0.16, 0.3, 0.5, fur, sx * 0.42, y + 0.12, -0.04);
      box(0.4, 0.12, 0.06, fur, 0, y + 0.2, front + 0.06);
      box(0.2, 0.08, 0.12, face, -0.46, y - 0.02, 0.06);
      box(0.2, 0.08, 0.12, face, 0.46, y - 0.02, 0.06);
      box(0.56, 0.42, 0.4, fur, 0, 0.48, 0); // lana del cuerpo, por encima de la camiseta
      tail(0.16, 0.16, 0.12, fur, 0.4, -0.24);
      break;
    case 'cerdo':
      eye(-0.17, y + 0.06);
      eye(0.17, y + 0.06);
      cheeks();
      box(0.22, 0.16, 0.08, shade(fur, 0.88), 0, y - 0.1, front + 0.07);
      box(0.04, 0.06, 0.02, 0x8a4a5a, -0.05, y - 0.1, front + 0.115);
      box(0.04, 0.06, 0.02, 0x8a4a5a, 0.05, y - 0.1, front + 0.115);
      // Orejas dobladas hacia delante.
      for (const sx of [-1, 1]) {
        const e = box(0.18, 0.16, 0.06, shade(fur, 0.92), sx * 0.25, y + 0.38, 0.1);
        e.rotation.x = 0.5;
      }
      tail(0.06, 0.12, 0.06, fur, 0.48, -0.2, 0.8);
      break;
    case 'pingüino':
      box(0.5, 0.42, 0.02, belly, 0, y - 0.04, front + 0.03); // cara blanca
      eye(-0.14, y + 0.04, front + 0.05);
      eye(0.14, y + 0.04, front + 0.05);
      box(0.1, 0.05, 0.02, PINK, -0.24, y - 0.1, front + 0.05);
      box(0.1, 0.05, 0.02, PINK, 0.24, y - 0.1, front + 0.05);
      box(0.16, 0.07, 0.14, 0xf5a623, 0, y - 0.1, front + 0.1);
      tail(0.18, 0.06, 0.12, fur, 0.36, -0.2, -0.3);
      break;
    case 'koala':
      eye(-0.15, y + 0.04);
      eye(0.15, y + 0.04);
      cheeks();
      box(0.14, 0.2, 0.06, DARK, 0, y - 0.08, front + 0.06); // narizota
      for (const sx of [-1, 1]) {
        box(0.3, 0.3, 0.12, fur, sx * 0.44, y + 0.24, 0);
        box(0.18, 0.18, 0.02, belly, sx * 0.44, y + 0.22, 0.07);
      }
      break;
    case 'zorro':
      eye(-0.16, y + 0.05);
      eye(0.16, y + 0.05);
      box(0.32, 0.16, 0.14, belly, 0, y - 0.12, front + 0.08);
      box(0.07, 0.05, 0.04, DARK, 0, y - 0.07, front + 0.16);
      ear(0.2, 0.24, 0.1, -0.24, y + 0.44, fur, belly);
      ear(0.2, 0.24, 0.1, 0.24, y + 0.44, fur, belly);
      box(0.2, 0.06, 0.1, DARK, -0.24, y + 0.58, 0);
      box(0.2, 0.06, 0.1, DARK, 0.24, y + 0.58, 0);
      tail(0.2, 0.2, 0.42, fur, 0.42, -0.36, -0.5);
      box(0.2, 0.2, 0.12, WHITE, 0, 0.56, -0.58);
      break;
    case 'elefante':
      eye(-0.17, y + 0.06);
      eye(0.17, y + 0.06);
      cheeks();
      // Trompa que cae y se curva un poco hacia delante.
      box(0.14, 0.26, 0.12, fur, 0, y - 0.18, front + 0.08);
      box(0.12, 0.1, 0.16, fur, 0, y - 0.32, front + 0.12);
      for (const sx of [-1, 1]) {
        box(0.08, 0.44, 0.38, fur, sx * 0.44, y + 0.02, -0.04);
        box(0.02, 0.3, 0.24, belly, sx * 0.47, y + 0.02, 0);
      }
      tail(0.05, 0.22, 0.05, fur, 0.42, -0.18, 0.4);
      break;
    case 'búho':
      // Ojos grandes con un aro claro alrededor, pico pequeño y dos penachos de plumas.
      for (const sx of [-1, 1]) {
        box(0.26, 0.26, 0.02, belly, sx * 0.17, y + 0.04, front + 0.02);
        eye(sx * 0.17, y + 0.04, front + 0.05);
        box(0.1, 0.16, 0.1, fur, sx * 0.26, y + 0.4, 0.02);
      }
      box(0.1, 0.12, 0.08, 0xe0a040, 0, y - 0.12, front + 0.05);
      tail(0.3, 0.16, 0.1, shade(fur, 0.8), 0.36, -0.2, -0.3);
      break;
    case 'castor':
      eye(-0.15, y + 0.05);
      eye(0.15, y + 0.05);
      cheeks();
      box(0.26, 0.14, 0.08, belly, 0, y - 0.12, front + 0.05);
      box(0.08, 0.05, 0.03, DARK, 0, y - 0.06, front + 0.09);
      box(0.1, 0.08, 0.02, WHITE, 0, y - 0.21, front + 0.08); // dientes de roer
      ear(0.12, 0.1, 0.08, -0.3, y + 0.32, fur, belly);
      ear(0.12, 0.1, 0.08, 0.3, y + 0.32, fur, belly);
      // Cola plana y ancha, con dibujo de escamas.
      box(0.34, 0.06, 0.46, 0x4a3020, 0, 0.12, -0.38);
      box(0.24, 0.065, 0.02, 0x5c3c28, 0, 0.12, -0.3);
      break;
    case 'cabra':
      // Cuernos curvos hacia atrás, perilla y orejas de lado.
      eye(-0.15, y + 0.06);
      eye(0.15, y + 0.06);
      cheeks();
      box(0.24, 0.14, 0.08, belly, 0, y - 0.12, front + 0.05);
      box(0.06, 0.04, 0.02, DARK, 0, y - 0.07, front + 0.09);
      box(0.1, 0.16, 0.06, WHITE, 0, y - 0.3, front + 0.02); // perilla
      for (const sx of [-1, 1]) {
        box(0.08, 0.2, 0.08, 0x9a8a70, sx * 0.16, y + 0.42, -0.02);
        box(0.08, 0.08, 0.16, 0x9a8a70, sx * 0.16, y + 0.5, -0.12);
        const e = box(0.22, 0.08, 0.1, fur, sx * 0.44, y + 0.14, 0);
        e.rotation.z = sx * -0.4;
      }
      tail(0.1, 0.12, 0.06, fur, 0.44, -0.22, 0.6);
      break;
    case 'caballo':
      // Hocico largo, crin oscura que baja por la nuca y orejas tiesas.
      eye(-0.17, y + 0.08);
      eye(0.17, y + 0.08);
      box(0.34, 0.26, 0.18, belly, 0, y - 0.14, front + 0.1);
      box(0.04, 0.05, 0.02, DARK, -0.08, y - 0.12, front + 0.2);
      box(0.04, 0.05, 0.02, DARK, 0.08, y - 0.12, front + 0.2);
      ear(0.1, 0.2, 0.08, -0.2, y + 0.44, fur, belly);
      ear(0.1, 0.2, 0.08, 0.2, y + 0.44, fur, belly);
      box(0.14, 0.2, 0.5, 0x3a2a1a, 0, y + 0.38, -0.08); // crin
      box(0.14, 0.4, 0.12, 0x3a2a1a, 0, y + 0.1, -0.36);
      tail(0.14, 0.5, 0.14, 0x3a2a1a, 0.5, -0.3, 0.3);
      break;
    case 'topo':
      // Ojitos pequeños casi cerrados, nariz rosa grande y manos de cavar.
      eye(-0.15, y + 0.04);
      eye(0.15, y + 0.04);
      for (const e of eyes) e.scale.set(1, 0.3, 1);
      cheeks();
      box(0.18, 0.14, 0.12, 0xf0b0b8, 0, y - 0.1, front + 0.08);
      box(0.4, 0.06, 0.4, 0xd8a020, 0, y + 0.4, 0); // casco de minero
      box(0.12, 0.1, 0.04, 0xfff2a0, 0, y + 0.36, front + 0.04);
      tail(0.06, 0.06, 0.12, fur, 0.4, -0.22);
      break;
    case 'alpaca':
      // Flequillo de lana esponjosa, hocico claro y orejas largas de punta.
      eye(-0.15, y + 0.02);
      eye(0.15, y + 0.02);
      cheeks();
      box(0.26, 0.16, 0.08, belly, 0, y - 0.14, front + 0.05);
      box(0.06, 0.03, 0.02, DARK, 0, y - 0.1, front + 0.1);
      box(0.6, 0.2, 0.5, WHITE, 0, y + 0.34, 0.06); // flequillo
      box(0.4, 0.14, 0.4, WHITE, 0, y + 0.46, 0.02);
      ear(0.1, 0.24, 0.08, -0.26, y + 0.46, fur, PINK);
      ear(0.1, 0.24, 0.08, 0.26, y + 0.46, fur, PINK);
      tail(0.14, 0.14, 0.14, WHITE, 0.4, -0.22);
      break;
    case 'mapache':
      // Antifaz oscuro, hocico claro y cola a rayas.
      box(0.56, 0.16, 0.02, 0x3a3a40, 0, y + 0.04, front + 0.03);
      eye(-0.15, y + 0.04, front + 0.05);
      eye(0.15, y + 0.04, front + 0.05);
      box(0.26, 0.14, 0.08, belly, 0, y - 0.13, front + 0.05);
      box(0.08, 0.05, 0.03, DARK, 0, y - 0.08, front + 0.1);
      ear(0.16, 0.16, 0.08, -0.26, y + 0.38, fur, 0x3a3a40);
      ear(0.16, 0.16, 0.08, 0.26, y + 0.38, fur, 0x3a3a40);
      for (const [i, c] of [fur, 0x3a3a40, fur, 0x3a3a40].entries()) box(0.14, 0.14, 0.12, c, 0, 0.36 + i * 0.02, -0.24 - i * 0.12);
      break;
    case 'jirafa':
      // Cuernecitos con bola, manchas y orejas de lado.
      eye(-0.15, y + 0.06);
      eye(0.15, y + 0.06);
      cheeks();
      box(0.28, 0.18, 0.08, belly, 0, y - 0.14, front + 0.05);
      box(0.04, 0.04, 0.02, DARK, -0.06, y - 0.1, front + 0.1);
      box(0.04, 0.04, 0.02, DARK, 0.06, y - 0.1, front + 0.1);
      for (const sx of [-1, 1]) {
        box(0.06, 0.2, 0.06, fur, sx * 0.12, y + 0.42, 0);
        box(0.1, 0.1, 0.1, 0x8a5a30, sx * 0.12, y + 0.54, 0);
        const e = box(0.2, 0.08, 0.1, fur, sx * 0.42, y + 0.2, 0);
        e.rotation.z = sx * 0.3;
      }
      for (const [x, sy, z] of [[-0.2, 0.14, 0.33], [0.22, -0.02, 0.33], [0.36, 0.18, 0.1], [-0.36, 0, -0.1]]) box(0.12, 0.1, 0.02, 0xb07a38, x, y + sy, z);
      tail(0.06, 0.3, 0.06, fur, 0.48, -0.2, 0.3);
      break;
  }
  return { group, legs, arms, eyes };
}
