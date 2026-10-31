// Fauna del mar en 3D (v5.5): el delfín, la ballena, la tortuga, el cangrejo, la medusa, la raya y la foca ya no
// son cuatro cajas de colores. Cada uno es una figura de cubitos esculpida a mano (como los peces de la v5.4):
// cuerpo redondeado, aletas con su forma, ojos, boca, manchas, escudos, rayas… y partes que se mueven (la cola del
// delfín sube y baja, la raya ondula las alas, el cangrejo mueve las ocho patas y abre las pinzas, la medusa late y
// los tentáculos se mecen).
//
// Rendimiento: cada especie se esculpe una sola vez (la primera vez que sale) y todas sus copias comparten la
// geometría y el material; cada parte que se mueve es una sola malla.
import * as THREE from 'three';
import type { PartsModel, WildKind } from './wildlife';

type V3 = [number, number, number];
type MatKind = 'solido' | 'gelatina' | 'brillo' | 'tentaculo';

interface SegDef {
  name: string;
  /** Punto sobre el que gira la parte (en bloques, en el sitio de la figura). */
  pivot: V3;
  parent?: string;
  mat?: MatKind;
}

/** Un cubito: a qué parte va, su color y (si es distinto) el color de su cara de abajo. */
type Vox = [seg: number, color: number, below?: number];

interface Spec {
  /** Tamaño del cubito, en bloques. */
  v: number;
  min: V3;
  max: V3;
  segs: SegDef[];
  /** Qué hay en el punto (x, y, z): nada o un cubito. `n` es un número al azar (fijo) de ese cubito, 0..1. */
  at(x: number, y: number, z: number, n: number): Vox | null;
}

// --- Ayudas para esculpir ---

function hash3(i: number, j: number, k: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Distancia (al cuadrado, normalizada) al centro de un elipsoide: ≤ 1 dentro. */
function ell(x: number, y: number, z: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number): number {
  const a = (x - cx) / rx;
  const b = (y - cy) / ry;
  const c = (z - cz) / rz;
  return a * a + b * b + c * c;
}

/** Distancia de un punto a un segmento. */
function segDist(x: number, y: number, z: number, a: V3, b: V3): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const l = dx * dx + dy * dy + dz * dz;
  let t = l ? ((x - a[0]) * dx + (y - a[1]) * dy + (z - a[2]) * dz) / l : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t, z - a[2] - dz * t);
}

/** Manchas repartidas sin orden: true si (a, b) cae en una (celdas de `cell`, radio `r`, una de cada `chance`). */
function spots(a: number, b: number, cell: number, r: number, chance = 0.7, seed = 0): boolean {
  const ca = Math.floor(a / cell);
  const cb = Math.floor(b / cell);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const ia = ca + i, jb = cb + j;
    if (hash3(ia, jb, seed) > chance) continue;
    const px = (ia + 0.2 + 0.6 * hash3(ia, jb, seed + 1)) * cell;
    const pz = (jb + 0.2 + 0.6 * hash3(ia, jb, seed + 2)) * cell;
    const rr = r * (0.7 + 0.6 * hash3(ia, jb, seed + 3));
    if ((a - px) ** 2 + (b - pz) ** 2 < rr * rr) return true;
  }
  return false;
}

const frac = (v: number) => v - Math.floor(v);

/** Índice de cada parte por su nombre. */
function segIndex(segs: SegDef[]): Record<string, number> {
  return Object.fromEntries(segs.map((s, i) => [s.name, i]));
}

// --- Delfín ---

const DELFIN_SEGS: SegDef[] = [
  { name: 'cuerpo', pivot: [0, 0, 0] },
  { name: 'cola', pivot: [0, 0, -0.32], parent: 'cuerpo' },
  { name: 'aleta', pivot: [0, 0, -0.88], parent: 'cola' },
  { name: 'pecL', pivot: [-0.13, -0.1, 0.3], parent: 'cuerpo' },
  { name: 'pecR', pivot: [0.13, -0.1, 0.3], parent: 'cuerpo' },
];

function delfinR(z: number): number {
  if (z < -0.88 || z > 0.72) return 0;
  const u = (z + 0.88) / 1.6;
  return 0.22 * Math.pow(Math.sin(Math.PI * Math.pow(u, 1.3)), 0.6);
}

const delfin: Spec = (() => {
  const S = segIndex(DELFIN_SEGS);
  const DARK = 0x56697f, MID = 0x8496ab, BELLY = 0xe4e9ee, FIN = 0x4f6176;
  const shade = (y: number, z: number, r: number) => {
    const k = Math.max(r, 0.07);
    if (y > k * 0.32 + 0.025 * Math.sin(z * 9)) return DARK;
    if (y > -k * 0.3 + 0.02 * Math.sin(z * 7 + 1)) return MID;
    return BELLY;
  };
  const body = (x: number, y: number, z: number) => {
    const r = delfinR(z);
    // El pedúnculo de la cola es estrecho y alto.
    const rx = z < -0.45 ? r * 0.62 : r * 0.88;
    const ry = z < -0.45 ? r * 1.12 : r;
    if (r > 0 && (x / rx) ** 2 + (y / ry) ** 2 <= 1) return true;
    // El melón (la frente redonda) y el hocico.
    if (ell(x, y, z, 0, 0.02, 0.5, 0.13, 0.14, 0.2) <= 1) return true;
    if (z > 0.55 && z < 0.92) {
      const t = z > 0.84 ? 1 - (z - 0.84) / 0.1 : 1;
      if ((x / (0.058 * t)) ** 2 + ((y + 0.075) / (0.05 * t)) ** 2 <= 1) return true;
    }
    return false;
  };
  return {
    v: 1 / 16, min: [-0.5, -0.45, -1.2], max: [0.5, 0.5, 1],
    segs: DELFIN_SEGS,
    at(x, y, z, n) {
      const ax = Math.abs(x);
      if (body(x, y, z)) {
        const r = Math.max(delfinR(z), z > 0.5 ? 0.13 : 0);
        // El hocico: gris por arriba y claro por abajo.
        let c = z > 0.66 ? (y > -0.08 ? MID : BELLY) : shade(y, z, r);
        // Ojo (con el contorno oscuro), espiráculo, la boca que sonríe.
        if (z > 0.48 && z < 0.6 && y > -0.035 && y < 0.04 && !body(x + Math.sign(x) * 0.07, y, z)) c = z > 0.51 && z < 0.57 && y > -0.01 ? 0x101418 : 0x3c4858;
        else if (z > 0.38 && z < 0.44 && ax < 0.04 && !body(x, y + 0.07, z)) c = 0x26303a;
        else if (z > 0.6 && Math.abs(y + 0.08 - (z - 0.6) * 0.05) < 0.02 && !body(x + Math.sign(x) * 0.07, y, z)) c = 0x3a4652;
        else if (n > 0.93 && c !== BELLY) c = 0x6f8298;
        return [z < -0.32 ? S.cola : S.cuerpo, c];
      }
      // Aleta de la espalda, curvada hacia atrás.
      if (ax < 0.04 && y > 0.1 && y < 0.44) {
        const h = y - 0.12;
        if (z > -0.22 - 0.55 * h && z < 0.12 - 1.1 * h) return [S.cuerpo, FIN];
      }
      // Aletas de la cola (horizontales, en media luna con muesca).
      if (Math.abs(y) < 0.05 && ax <= 0.36 && z < -0.82) {
        const zF = -0.86 - 0.4 * ax;
        let zB = -1.06 - 0.22 * ax - (ax > 0.3 ? -(ax - 0.3) * 1.5 : 0);
        if (ax < 0.06) zB += 0.07;
        if (z <= zF && z >= zB) return [S.aleta, FIN, MID];
      }
      // Aletas del pecho: hacia fuera, atrás y abajo.
      const lx = ax - 0.12;
      if (lx > 0 && lx < 0.27) {
        const zc = 0.3 - lx * 0.75;
        const yc = -0.1 - lx * 0.4;
        const chord = 0.13 * (1 - lx / 0.3) + 0.03;
        if (Math.abs(y - yc) < 0.04 && z < zc + chord * 0.4 && z > zc - chord * 0.6) return [x < 0 ? S.pecL : S.pecR, FIN, MID];
      }
      return null;
    },
  };
})();

// --- Ballena (yubarta) ---

const BALLENA_SEGS: SegDef[] = [
  { name: 'cuerpo', pivot: [0, -0.65, 0] },
  { name: 'cola', pivot: [0, -0.65, -1.1], parent: 'cuerpo' },
  { name: 'aleta', pivot: [0, -0.65, -3.75], parent: 'cola' },
  { name: 'pecL', pivot: [-0.78, -1.15, 1.5], parent: 'cuerpo' },
  { name: 'pecR', pivot: [0.78, -1.15, 1.5], parent: 'cuerpo' },
];

const W_CY = -0.65;
function ballenaR(z: number): number {
  if (z < -3.4 || z > 3.95) return 0;
  const u = (z + 3.4) / 7.35;
  return 1.05 * Math.pow(Math.sin(Math.PI * Math.pow(u, 1.25)), 0.55);
}

const ballena: Spec = (() => {
  const S = segIndex(BALLENA_SEGS);
  const BLACK = 0x283040, FLANK = 0x4c5668, WHITE = 0xdfe3e6, GROOVE = 0x98a2b0;
  const inside = (x: number, y: number, z: number) => {
    const r = ballenaR(z);
    if (r > 0 && (x / r) ** 2 + ((y - W_CY) / (r * 0.85)) ** 2 <= 1) return true;
    // La cabeza, ancha y plana.
    if (ell(x, y, z, 0, -0.82, 2.45, 0.8, 0.62, 1.5) <= 1) return true;
    // El pedúnculo de la cola, más alto que ancho.
    if (z > -4 && z < -2.5) {
      const k = z + 4;
      if (Math.abs(x) <= 0.2 + k * 0.2 && Math.abs(y - W_CY) <= 0.26 + k * 0.3) return true;
    }
    return false;
  };
  return {
    v: 1 / 8, min: [-3.6, -2.4, -5], max: [3.6, 0.9, 4.1],
    segs: BALLENA_SEGS,
    at(x, y, z, n) {
      const ax = Math.abs(x);
      const seg = z < -1.1 ? S.cola : S.cuerpo;
      if (inside(x, y, z)) {
        const r = Math.max(ballenaR(z), z > 1.5 ? 0.62 : 0.3);
        const t = (y - W_CY) / (r * 0.85);
        let c = t > -0.05 ? BLACK : t > -0.5 ? (n > 0.55 + t ? FLANK : BLACK) : WHITE;
        const side = !inside(x + Math.sign(x) * 0.13, y, z);
        // Los surcos de la garganta, a rayas.
        if (z > 0.6 && z < 3.9 && t < -0.4) c = Math.floor(x / 0.125 + 100) % 2 ? WHITE : GROOVE;
        // Ojo, boca y espiráculos.
        if (side && z > 1.62 && z < 1.88 && t > -0.45 && t < -0.15) c = 0x0c0e12;
        else if (side && z > 1.9 && Math.abs(y - (W_CY - 0.12 - (3.95 - z) * 0.1)) < 0.07) c = 0x161a22;
        else if (z > 1.85 && z < 2.1 && ax > 0.05 && ax < 0.2 && !inside(x, y + 0.13, z)) c = 0x0e1116;
        // Percebes en la barbilla.
        if (z > 3 && t < -0.15 && n > 0.78) c = 0xc9c3b4;
        return [seg, c];
      }
      // Bultitos en la cabeza.
      if (z > 2.3 && z < 3.9 && ax < 0.55 && inside(x, y - 0.125, z) && spots(x, z, 0.32, 0.09, 0.75, 4)) return [S.cuerpo, 0x1c222c];
      // La jorobita de la espalda.
      if (z > -2.3 && z < -1.4 && ax < 0.13) {
        const top = W_CY + ballenaR(z) * 0.85;
        if (y > top - 0.1 && y < top + 0.3 * (1 - Math.abs(z + 1.85) / 0.45)) return [S.cola, BLACK];
      }
      // La cola, ancha y con el borde dentado; por debajo blanca con manchas negras.
      if (Math.abs(y - W_CY) <= 0.13 && ax <= 1.95 && z < -3.6) {
        const zF = -3.75 - 0.32 * ax - (ax > 1.5 ? (ax - 1.5) * 1.1 : 0);
        let zB = -4.35 - 0.12 * ax + (Math.floor(ax / 0.25) % 2) * 0.1 + (ax > 1.4 ? (ax - 1.4) * 0.9 : 0);
        if (ax < 0.25) zB += 0.22;
        if (z <= zF && z >= zB) return [S.aleta, BLACK, spots(x, z, 0.35, 0.12, 0.6, 9) ? 0x1c222c : WHITE];
      }
      // Las aletas del pecho: larguísimas, blancas y con bultitos en el borde.
      const lx = ax - 0.75;
      if (lx > 0 && lx < 2.75) {
        const zc = 1.5 - lx * 0.6;
        const yc = -1.15 - lx * 0.32;
        const chord = 0.25 + 0.35 * Math.sqrt(Math.max(0, 1 - (lx / 2.75) ** 2));
        const bump = Math.floor(lx / 0.3) % 2 === 0 ? 0.1 : 0;
        if (Math.abs(y - yc) <= 0.13 - lx * 0.02 && z > zc - chord * 0.7 && z < zc + chord * 0.3 + bump) {
          const top = lx < 0.9 && n > 0.45 ? FLANK : 0xe4e7ea;
          return [x < 0 ? S.pecL : S.pecR, top, WHITE];
        }
      }
      return null;
    },
  };
})();

// --- Tortuga marina ---

const TORTUGA_SEGS: SegDef[] = [
  { name: 'cuerpo', pivot: [0, 0, 0] },
  { name: 'cabeza', pivot: [0, 0.17, 0.36], parent: 'cuerpo' },
  { name: 'alL', pivot: [-0.24, 0.11, 0.2], parent: 'cuerpo' },
  { name: 'alR', pivot: [0.24, 0.11, 0.2], parent: 'cuerpo' },
  { name: 'patL', pivot: [-0.15, 0.1, -0.34], parent: 'cuerpo' },
  { name: 'patR', pivot: [0.15, 0.1, -0.34], parent: 'cuerpo' },
];

const tortuga: Spec = (() => {
  const S = segIndex(TORTUGA_SEGS);
  const SKIN_TOP = 0x6e5a30, SKIN_LINE = 0xc8b46a, SKIN_BELOW = 0xd8cc98;
  /** Piel de escamas: marrones con el borde amarillo, como las de verdad. */
  const scales = (x: number, z: number, n: number) => (spots(x, z, 0.07, 0.03, 0.9, 2) ? SKIN_TOP : n > 0.7 ? 0x8a7038 : SKIN_LINE);
  const shellTop = (x: number, z: number) => {
    const d = (x / 0.33) ** 2 + ((z + 0.02) / 0.41) ** 2;
    return d > 1 ? -1 : 0.15 + 0.2 * Math.pow(1 - d, 0.6);
  };
  return {
    v: 1 / 16, min: [-0.72, 0, -0.62], max: [0.72, 0.45, 0.75],
    segs: TORTUGA_SEGS,
    at(x, y, z, n) {
      const ax = Math.abs(x);
      const top = shellTop(x, z);
      if (top > 0 && y >= 0.07 && y <= top) {
        const d = (x / 0.33) ** 2 + ((z + 0.02) / 0.41) ** 2;
        if (y < 0.12) return [S.cuerpo, 0xd8c890];
        // Escudos del caparazón: los del centro en fila, los de los lados más anchos y el borde a trocitos.
        if (d > 0.8) {
          const th = Math.atan2(z, x);
          return [S.cuerpo, frac((th * 11) / Math.PI) < 0.14 ? 0x3a2a12 : n > 0.7 ? 0x86683a : 0x6e5426, 0xd8c890];
        }
        // Cada escudo: borde oscuro, luego marrón y el centro ámbar con vetas (como el carey).
        let e: number;
        if (ax < 0.1) {
          const w = frac((z + 0.45) / 0.16);
          e = Math.min(1 - ax / 0.1, w, 1 - w);
        } else {
          const w = frac((z + 0.42) / 0.2);
          e = Math.min((ax - 0.1) / 0.1, w, 1 - w, (1 - d) * 2);
        }
        const fill = e < 0.16 ? 0x3a2a12 : e < 0.36 ? 0x5e4620 : n > 0.8 ? 0xb48c44 : 0x94702e;
        return [S.cuerpo, fill, 0xd8c890];
      }
      // Cabeza con pico, y el cuello.
      const head = ell(x, y, z, 0, 0.2, 0.53, 0.1, 0.085, 0.13) <= 1;
      const neck = ell(x, y, z, 0, 0.17, 0.4, 0.085, 0.07, 0.1) <= 1;
      if ((head || neck) && z > 0.3) {
        let c = y > 0.21 ? scales(x, z, n) : SKIN_BELOW;
        if (z > 0.62) c = 0x5c5236;
        if (ax > 0.05 && y > 0.19 && y < 0.25 && z > 0.53 && z < 0.6) c = 0x101010;
        return [z > 0.36 ? S.cabeza : S.cuerpo, c, SKIN_BELOW];
      }
      // Aletas de delante, largas como remos.
      const lf = ax - 0.24;
      if (lf > 0 && lf < 0.44 && z < 0.4) {
        const zc = 0.2 - lf * 0.5;
        const chord = 0.16 * Math.sqrt(1 - lf / 0.46) + 0.03;
        if (Math.abs(y - (0.11 - lf * 0.08)) <= 0.035 && z > zc - chord * 0.75 && z < zc + chord * 0.25) {
          const claw = lf > 0.08 && lf < 0.14 && z > zc + chord * 0.05;
          return [x < 0 ? S.alL : S.alR, claw ? 0x3a3020 : scales(x, z, n), SKIN_BELOW];
        }
      }
      // Aletas de atrás, pequeñas.
      const lr = ax - 0.14;
      if (lr > 0 && lr < 0.17 && z < -0.25) {
        const zc = -0.38 - lr * 0.5;
        if (Math.abs(y - 0.09) <= 0.035 && z > zc - 0.07 && z < zc + 0.04) return [x < 0 ? S.patL : S.patR, scales(x, z, n), SKIN_BELOW];
      }
      // Colita.
      if (ax < 0.035 && Math.abs(y - 0.1) < 0.035 && z > -0.52 && z < -0.4) return [S.cuerpo, SKIN_LINE];
      return null;
    },
  };
})();

// --- Cangrejo (mirando hacia +z; anda de lado) ---

const CRAB_LEGS = [0, 1, 2, 3];
const CANGREJO_SEGS: SegDef[] = [
  { name: 'cuerpo', pivot: [0, 0, 0] },
  ...CRAB_LEGS.flatMap((i): SegDef[] => [
    { name: `pataL${i}`, pivot: [-0.15, 0.1, 0.07 - i * 0.065], parent: 'cuerpo' },
    { name: `pataR${i}`, pivot: [0.15, 0.1, 0.07 - i * 0.065], parent: 'cuerpo' },
  ]),
  { name: 'brazoL', pivot: [-0.1, 0.11, 0.12], parent: 'cuerpo' },
  { name: 'brazoR', pivot: [0.1, 0.11, 0.12], parent: 'cuerpo' },
  { name: 'dedoL', pivot: [-0.18, 0.17, 0.31], parent: 'brazoL' },
  { name: 'dedoR', pivot: [0.18, 0.17, 0.31], parent: 'brazoR' },
];

const cangrejo: Spec = (() => {
  const S = segIndex(CANGREJO_SEGS);
  const legs = CRAB_LEGS.flatMap((i) => [-1, 1].map((sg) => {
    const a: V3 = [sg * 0.15, 0.1, 0.07 - i * 0.065];
    const dz = (1.5 - i) * 0.06;
    const k: V3 = [sg * 0.27, 0.17, a[2] + dz * 0.6];
    const f: V3 = [sg * 0.36, 0.01, a[2] + dz];
    return { seg: S[`pata${sg < 0 ? 'L' : 'R'}${i}`], a, k, f };
  }));
  return {
    v: 1 / 20, min: [-0.42, 0, -0.32], max: [0.42, 0.3, 0.48],
    segs: CANGREJO_SEGS,
    at(x, y, z, n) {
      const ax = Math.abs(x);
      const sg = x < 0 ? -1 : 1;
      // Caparazón: ancho, abombado y con pinchitos en el borde de delante.
      const d = (x / 0.19) ** 2 + (z / 0.145) ** 2;
      if (d <= 1 && y >= 0.05 && y <= 0.145 + 0.06 * Math.sqrt(1 - d)) {
        let c = d > 0.6 ? 0xb53a20 : 0xd8532c;
        if (d < 0.6 && Math.abs(ax - 0.05) < 0.02 && z < 0.02) c = 0x9a2e18;
        else if (n > 0.86) c = 0xf08a5a;
        return [S.cuerpo, y < 0.09 ? 0xf2dcc0 : c, 0xf2dcc0];
      }
      if (d > 0.85 && d < 1.3 && z > -0.02 && Math.abs(y - 0.11) < 0.03 && frac((Math.atan2(z, x) * 5) / Math.PI) < 0.4) return [S.cuerpo, 0xb53a20];
      // Ojos en sus palitos.
      if (Math.abs(ax - 0.05) < 0.026 && z > 0.11 && z < 0.17) {
        if (y > 0.14 && y < 0.22) return [S.cuerpo, 0xc84a2a];
        if (y >= 0.22 && y < 0.28) return [S.cuerpo, 0x111111];
      }
      // Pinzas: brazo, mano gorda y dos dedos (el de arriba se abre).
      const arm = segDist(x, y, z, [sg * 0.1, 0.11, 0.12], [sg * 0.17, 0.14, 0.22]) < 0.035;
      const palm = ell(x, y, z, sg * 0.18, 0.14, 0.27, 0.065, 0.055, 0.075) <= 1;
      const low = segDist(x, y, z, [sg * 0.19, 0.115, 0.31], [sg * 0.2, 0.12, 0.42]) < 0.03;
      if (arm || palm || low) {
        let c = arm ? 0xc84a28 : n > 0.8 ? 0xf09060 : 0xe05a32;
        if (z > 0.38) c = 0x3a1c12;
        return [sg < 0 ? S.brazoL : S.brazoR, c, 0xf2dcc0];
      }
      if (segDist(x, y, z, [sg * 0.18, 0.17, 0.31], [sg * 0.19, 0.16, 0.42]) < 0.03) return [sg < 0 ? S.dedoL : S.dedoR, z > 0.38 ? 0x3a1c12 : 0xe05a32];
      // Ocho patas dobladas, con las rodillas más claras y la punta oscura.
      for (const l of legs) {
        if (Math.sign(l.a[0]) !== sg) continue;
        if (segDist(x, y, z, l.a, l.k) < 0.035 || segDist(x, y, z, l.k, l.f) < 0.033) {
          const knee = Math.hypot(x - l.k[0], y - l.k[1], z - l.k[2]) < 0.04;
          return [l.seg, y < 0.05 ? 0x5a2214 : knee ? 0xf0a070 : 0xcf4a26];
        }
      }
      return null;
    },
  };
})();

// --- Medusa ---

const MEDUSA_SEGS: SegDef[] = [
  { name: 'campana', pivot: [0, -0.1, 0], mat: 'gelatina' },
  { name: 'luz', pivot: [0, -0.1, 0], parent: 'campana', mat: 'brillo' },
  { name: 'tentaculos', pivot: [0, -0.1, 0], mat: 'tentaculo' },
];

const medusa: Spec = (() => {
  const S = segIndex(MEDUSA_SEGS);
  return {
    v: 1 / 24, min: [-0.33, -0.98, -0.33], max: [0.33, 0.2, 0.33],
    segs: MEDUSA_SEGS,
    at(x, y, z, n) {
      const rho = Math.hypot(x, z);
      const th = Math.atan2(z, x);
      const turn = (th + Math.PI) / (Math.PI * 2);
      // La campana: una cúpula hueca por debajo.
      const outer = (rho / 0.27) ** 2 + ((y + 0.1) / 0.24) ** 2 <= 1;
      const cavity = (rho / 0.21) ** 2 + ((y + 0.1) / 0.17) ** 2 < 1;
      // Dentro, cuatro anillos que brillan (como un trébol).
      if (y > -0.01 && y < 0.07) {
        for (let k = 0; k < 4; k++) {
          const a = Math.PI / 4 + (k * Math.PI) / 2;
          const dd = Math.hypot(x - Math.cos(a) * 0.1, z - Math.sin(a) * 0.1);
          if (Math.abs(dd - 0.045) < 0.024) return [S.luz, 0xff9ae6];
        }
      }
      if (y >= -0.1 && outer && !cavity) {
        let c = frac(turn * 16) < 0.16 ? 0xa888e0 : 0xd4bcf6;
        if (rho < 0.08 && y > 0.08) c = 0xe8c8f4;
        return [S.campana, c];
      }
      // El borde, ondulado, con ocho puntitos de luz.
      if (y >= -0.15 && y < -0.1 && rho > 0.2 && rho < 0.285) {
        const s = Math.round(turn * 8) / 8;
        const pa = s * Math.PI * 2 - Math.PI;
        if (Math.hypot(x - Math.cos(pa) * 0.25, z - Math.sin(pa) * 0.25) < 0.035) return [S.luz, 0x9ae6ff];
        if (frac(turn * 16) < 0.7) return [S.campana, 0xe0d0ff];
      }
      // Cuatro brazos con volantes en el centro.
      if (y < -0.06 && y > -0.5) {
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 2;
          const rc = 0.035 + 0.04 * -y;
          const cx = Math.cos(a) * rc + 0.02 * Math.sin(y * 18 + k);
          const cz = Math.sin(a) * rc + 0.02 * Math.cos(y * 18 + k);
          if (Math.hypot(x - cx, z - cz) < 0.035 + 0.018 * Math.sin(y * 30 + k * 2)) return [S.tentaculos, n > 0.7 ? 0xf8d0f0 : 0xf0b0e6];
        }
      }
      // Tentáculos finos que cuelgan del borde, cada uno de su largo.
      if (y < -0.12) {
        const j = Math.round(((th + Math.PI) / (Math.PI * 2)) * 12) % 12;
        const a = (j / 12) * Math.PI * 2 - Math.PI;
        const len = 0.5 + 0.38 * hash3(j, 3, 7);
        const r = 0.235 - 0.05 * (-0.12 - y);
        if (y > -0.12 - len && Math.hypot(x - Math.cos(a) * r, z - Math.sin(a) * r) < 0.03) {
          return [S.tentaculos, y < -0.12 - len * 0.7 ? 0xf6eeff : 0xe2ccff];
        }
      }
      return null;
    },
  };
})();

// --- Raya ---

const RAYA_SEGS: SegDef[] = [
  { name: 'cuerpo', pivot: [0, 0, 0] },
  { name: 'alaL1', pivot: [-0.2, 0, 0.02], parent: 'cuerpo' },
  { name: 'alaL2', pivot: [-0.48, 0, 0], parent: 'alaL1' },
  { name: 'alaR1', pivot: [0.2, 0, 0.02], parent: 'cuerpo' },
  { name: 'alaR2', pivot: [0.48, 0, 0], parent: 'alaR1' },
  { name: 'cola1', pivot: [0, 0, -0.3], parent: 'cuerpo' },
  { name: 'cola2', pivot: [0, 0, -0.72], parent: 'cola1' },
];

const raya: Spec = (() => {
  const S = segIndex(RAYA_SEGS);
  const TOP = 0x34404e, EDGE = 0x28323e, SPOT = 0xe6ecf0, BELLY = 0xe8ecee;
  return {
    v: 1 / 16, min: [-0.85, -0.13, -1.25], max: [0.85, 0.13, 0.55],
    segs: RAYA_SEGS,
    at(x, y, z) {
      const s = Math.abs(x);
      const L = x < 0;
      const wingSeg = s < 0.2 ? S.cuerpo : s < 0.48 ? (L ? S.alaL1 : S.alaR1) : L ? S.alaL2 : S.alaR2;
      // El disco: alas en punta, el borde de delante abombado y el de atrás hacia dentro.
      if (s <= 0.8) {
        const zF = 0.3 - 0.42 * s + 0.06 * Math.sin((Math.PI * s) / 0.8);
        const zB = -0.26 + 0.27 * s - 0.1 * Math.sin((Math.PI * s) / 0.8);
        const half = 0.075 * Math.pow(Math.max(0, 1 - s / 0.85), 0.8) + 0.015;
        const yc = 0.015 * (1 - s);
        if (z <= zF && z >= zB && Math.abs(y - yc) <= half) {
          if (y < yc - 0.02) return [wingSeg, BELLY];
          let c = s > 0.62 || z - zB < 0.05 ? EDGE : TOP;
          if (spots(x, z, 0.11, 0.028, 0.8, 5) && s > 0.06) c = SPOT;
          // Ojos arriba, a los lados de la cabeza, y los respiraderos detrás.
          if (s > 0.09 && s < 0.14 && z > 0.2 && z < 0.27 && y > 0) c = 0x0c0e10;
          else if (s > 0.06 && s < 0.13 && z > 0.14 && z < 0.2 && y > 0) c = 0x1e252e;
          return [wingSeg, c, BELLY];
        }
      }
      // El hocico, como un pico de pato.
      if (z > 0.22 && z < 0.46 && s < 0.1 - (z - 0.3) * 0.3 && Math.abs(y) < 0.05) return [S.cuerpo, y > 0 ? TOP : BELLY, BELLY];
      // Aletas pequeñas de atrás.
      if (z > -0.38 && z < -0.22 && s < 0.13 && Math.abs(y) < 0.03) return [S.cuerpo, EDGE, BELLY];
      // La cola: larguísima y fina, con su pincho.
      if (s < 0.03 && Math.abs(y) < 0.03 && z > -1.2 && z < -0.24) return [z < -0.72 ? S.cola2 : z < -0.3 ? S.cola1 : S.cuerpo, 0x2a3440];
      if (s < 0.03 && y > 0.03 && y < 0.09 && z > -0.46 && z < -0.38) return [S.cola1, 0x8a8070];
      return null;
    },
  };
})();

// --- Foca (de puerto, con manchitas) ---

const FOCA_SEGS: SegDef[] = [
  { name: 'cuerpo', pivot: [0, 0, 0] },
  { name: 'cabeza', pivot: [0, 0.22, 0.36], parent: 'cuerpo' },
  { name: 'aleL', pivot: [-0.16, 0.06, 0.2], parent: 'cuerpo' },
  { name: 'aleR', pivot: [0.16, 0.06, 0.2], parent: 'cuerpo' },
  { name: 'cola', pivot: [0, 0.1, -0.42], parent: 'cuerpo' },
];

function focaR(z: number): number {
  if (z < -0.5 || z > 0.45) return 0;
  const u = (z + 0.5) / 0.95;
  return 0.21 * Math.pow(Math.sin(Math.PI * (u * 0.92 + 0.04)), 0.5);
}

const foca: Spec = (() => {
  const S = segIndex(FOCA_SEGS);
  const FUR = 0x8e96a0, SPOT = 0x4a5058, BELLY = 0xc0c6cc, FLIP = 0x5c626c;
  const body = (x: number, y: number, z: number) => {
    const r = focaR(z);
    return r > 0 && (x / r) ** 2 + ((y - r * 0.82) / (r * 0.82)) ** 2 <= 1;
  };
  const head = (x: number, y: number, z: number) =>
    ell(x, y, z, 0, 0.3, 0.5, 0.135, 0.125, 0.14) <= 1 || ell(x, y, z, 0, 0.26, 0.63, 0.08, 0.06, 0.07) <= 1;
  return {
    v: 1 / 16, min: [-0.4, 0, -0.88], max: [0.4, 0.5, 0.8],
    segs: FOCA_SEGS,
    at(x, y, z) {
      const ax = Math.abs(x);
      if (head(x, y, z)) {
        let c = y > 0.27 && spots(x * 1.3, z, 0.07, 0.02, 0.5, 11) ? SPOT : y < 0.24 ? BELLY : FUR;
        if (z > 0.67 && y > 0.25 && y < 0.31 && ax < 0.04) c = 0x1a1a1e;
        else if (ax > 0.06 && ax < 0.14 && y > 0.3 && y < 0.38 && z > 0.53 && z < 0.62) c = 0x0e0e12;
        return [S.cabeza, c];
      }
      if (body(x, y, z)) {
        const r = focaR(z);
        let c = y > r * 0.82 && spots(x * 1.2, z, 0.09, 0.022, 0.65, 12) ? SPOT : y < r * 0.4 ? BELLY : FUR;
        return [z > 0.38 ? S.cabeza : z < -0.42 ? S.cola : S.cuerpo, c];
      }
      // Bigotes blancos.
      if (Math.abs(y - 0.25) < 0.02 && Math.abs(z - 0.625) < 0.02 && ax > 0.08 && ax < 0.2) return [S.cabeza, 0xf2f2f2];
      // Aletas de delante, en el suelo.
      const lf = ax - 0.17;
      if (lf > 0 && lf < 0.14) {
        const zc = 0.2 - lf * 0.7;
        if (Math.abs(y - 0.05) <= 0.035 && z > zc - 0.05 && z < zc + 0.04) return [x < 0 ? S.aleL : S.aleR, lf > 0.1 ? 0x2e3036 : FLIP];
      }
      // Las de atrás, juntas y abiertas en abanico.
      if (z > -0.84 && z < -0.4) {
        const k = -0.4 - z;
        const cx = 0.05 + k * 0.25;
        if (Math.abs(ax - cx) < 0.04 + k * 0.12 && Math.abs(y - 0.09) <= 0.035) return [S.cola, frac(ax / 0.04) < 0.3 ? 0x484c54 : FLIP];
      }
      return null;
    },
  };
})();

const SPECS: Partial<Record<WildKind, Spec>> = { delfin, ballena, tortuga, cangrejo, medusa, raya, foca };

export const SEA_KINDS = Object.keys(SPECS) as WildKind[];

/**
 * Tamaño de verdad (un bloque es un metro, como tú mides casi dos): la yubarta mide unos 14 m, el delfín 2,5 m,
 * la raya casi 2,5 m de ala a ala, la foca y la tortuga algo más de un metro.
 */
export const SEA_SCALE: Partial<Record<WildKind, number>> = { ballena: 1.6, delfin: 1.2, raya: 1.4 };

// --- De los cubitos a las mallas ---

export interface SeaGeometry {
  segs: { def: SegDef; geo: THREE.BufferGeometry | null }[];
  /** Caras en total (para vigilar que no pesen). */
  faces: number;
}

const SHADE = { px: 0.84, nx: 0.84, py: 1, ny: 0.66, pz: 0.9, nz: 0.9 };

function build(spec: Spec): SeaGeometry {
  const { v, min, max, segs } = spec;
  // Los cubitos tienen el centro en múltiplos de v (así hay una fila justo en el centro).
  const i0 = Math.round(min[0] / v), j0 = Math.round(min[1] / v), k0 = Math.round(min[2] / v);
  const nx = Math.round(max[0] / v) - i0 + 1, ny = Math.round(max[1] / v) - j0 + 1, nz = Math.round(max[2] / v) - k0 + 1;
  const seg = new Int8Array(nx * ny * nz).fill(-1);
  const col = new Uint32Array(nx * ny * nz);
  const below = new Int32Array(nx * ny * nz).fill(-1);
  const idx = (i: number, j: number, k: number) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const vox = spec.at((i + i0) * v, (j + j0) * v, (k + k0) * v, hash3(i + i0, j + j0, k + k0));
    if (!vox) continue;
    const id = idx(i, j, k);
    seg[id] = vox[0];
    col[id] = vox[1];
    if (vox[2] !== undefined) below[id] = vox[2];
  }
  const out = segs.map(() => ({ pos: [] as number[], nor: [] as number[], col: [] as number[], ind: [] as number[] }));
  const c = new THREE.Color();
  const h = v / 2;
  let faces = 0;
  // Las seis caras: eje, sentido y sombra.
  const DIRS: [number, 1 | -1, number][] = [[0, 1, SHADE.px], [0, -1, SHADE.nx], [1, 1, SHADE.py], [1, -1, SHADE.ny], [2, 1, SHADE.pz], [2, -1, SHADE.nz]];
  const n = [0, 0, 0];
  const p = [0, 0, 0];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const id = idx(i, j, k);
    const s = seg[id];
    if (s < 0) continue;
    const o = out[s];
    const pv = segs[s].pivot;
    const glow = segs[s].mat === 'brillo';
    const noise = 0.93 + 0.14 * hash3(i + i0 + 17, j + j0, k + k0);
    const cx = (i + i0) * v, cy = (j + j0) * v, cz = (k + k0) * v;
    for (const [axis, sign, shade] of DIRS) {
      const ni = i + (axis === 0 ? sign : 0), nj = j + (axis === 1 ? sign : 0), nk = k + (axis === 2 ? sign : 0);
      // Se tapa con lo de la misma parte; entre partes distintas se deja (al moverse no queda hueco).
      if (ni >= 0 && nj >= 0 && nk >= 0 && ni < nx && nj < ny && nk < nz && seg[idx(ni, nj, nk)] === s) continue;
      faces++;
      const hex = axis === 1 && sign < 0 && below[id] >= 0 ? below[id] : col[id];
      c.setHex(hex);
      const m = glow ? 1 : shade * noise;
      const u = (axis + 1) % 3, w = (axis + 2) % 3;
      n[0] = n[1] = n[2] = 0;
      n[axis] = sign;
      const base = o.pos.length / 3;
      const corners = sign > 0 ? [[-1, -1], [1, -1], [1, 1], [-1, 1]] : [[-1, -1], [-1, 1], [1, 1], [1, -1]];
      for (const [cu, cw] of corners) {
        p[0] = cx; p[1] = cy; p[2] = cz;
        p[axis] += sign * h;
        p[u] += cu * h;
        p[w] += cw * h;
        o.pos.push(p[0] - pv[0], p[1] - pv[1], p[2] - pv[2]);
        o.nor.push(n[0], n[1], n[2]);
        o.col.push(c.r * m, c.g * m, c.b * m);
      }
      o.ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  return {
    faces,
    segs: segs.map((def, s) => {
      const o = out[s];
      if (!o.pos.length) return { def, geo: null };
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(o.nor, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(o.col, 3));
      geo.setIndex(o.ind);
      geo.computeBoundingSphere();
      return { def, geo };
    }),
  };
}

const built = new Map<WildKind, SeaGeometry>();

/** Las piezas de un animal del mar (se esculpen la primera vez). null si no es del mar. */
export function seaGeometry(kind: WildKind): SeaGeometry | null {
  const spec = SPECS[kind];
  if (!spec) return null;
  let g = built.get(kind);
  if (!g) built.set(kind, (g = build(spec)));
  return g;
}

// --- Materiales (compartidos por todas las copias) ---

/** El reloj de los tentáculos (se mecen en la tarjeta gráfica, sin coste en el juego). */
const SEA_TIME = { value: 0 };

const MATS: Record<MatKind, THREE.MeshLambertMaterial | THREE.MeshBasicMaterial> = {
  solido: new THREE.MeshLambertMaterial({ vertexColors: true }),
  gelatina: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false }),
  brillo: new THREE.MeshBasicMaterial({ vertexColors: true }),
  tentaculo: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.82, depthWrite: false }),
};
const SHARED = new Set<THREE.Material>(Object.values(MATS));

{
  const t = MATS.tentaculo as THREE.MeshLambertMaterial;
  t.onBeforeCompile = (shader) => {
    shader.uniforms.uSeaTime = SEA_TIME;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSeaTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
// Cuanto más abajo, más se mece (y cada medusa a su ritmo, según dónde está).
float seaDepth = max(0.0, -0.04 - transformed.y);
float seaPhase = modelMatrix[3].x * 1.7 + modelMatrix[3].z * 1.3;
transformed.x += sin(uSeaTime * 2.0 + transformed.y * 7.0 + seaPhase) * 0.09 * seaDepth;
transformed.z += cos(uSeaTime * 1.6 + transformed.y * 6.0 + seaPhase) * 0.09 * seaDepth;`,
      );
  };
  t.customProgramCacheKey = () => 'medusa-tentaculos';
}

/** De noche la medusa se ilumina. */
function setNight(night: number) {
  const k = 0.12 + night * 0.88;
  (MATS.gelatina as THREE.MeshLambertMaterial).emissive.setRGB(0.42 * k, 0.28 * k, 0.75 * k);
  (MATS.tentaculo as THREE.MeshLambertMaterial).emissive.setRGB(0.45 * k, 0.3 * k, 0.7 * k);
  (MATS.brillo as THREE.MeshBasicMaterial).color.setScalar(0.55 + 0.45 * night);
}

// --- Cómo se mueve cada uno ---

type Parts = Record<string, THREE.Group>;
interface AnimState { t: number; phase: number }
type Anim = (p: Parts, pose: THREE.Group, s: AnimState, dt: number, seconds: number, moving: boolean, night: number) => void;

const ANIMS: Partial<Record<WildKind, Anim>> = {
  delfin(p, _pose, s, dt, _sec, moving) {
    s.t += dt * (moving ? 7 : 2.5);
    p.cola.rotation.x = Math.sin(s.t) * 0.22;
    p.aleta.rotation.x = Math.sin(s.t - 1) * 0.38;
    const f = 0.12 + Math.sin(s.t * 0.5) * 0.08;
    p.pecL.rotation.z = -f;
    p.pecR.rotation.z = f;
  },
  ballena(p, _pose, s, dt, _sec, moving) {
    s.t += dt * (moving ? 1.6 : 0.9);
    p.cola.rotation.x = Math.sin(s.t) * 0.08;
    p.aleta.rotation.x = Math.sin(s.t - 0.9) * 0.2;
    const f = 0.06 + Math.sin(s.t * 0.5 + 1) * 0.1;
    p.pecL.rotation.z = -f;
    p.pecR.rotation.z = f;
  },
  tortuga(p, pose, s, dt, seconds, moving) {
    if (moving) s.t += dt * 4;
    // Al andar por la arena mueve las dos aletas de delante a la vez, como remando.
    const sweep = moving ? Math.sin(s.t) * 0.45 : 0;
    const lift = moving ? Math.max(0, Math.cos(s.t)) * 0.22 : 0;
    p.alL.rotation.set(0, sweep, -lift);
    p.alR.rotation.set(0, -sweep, lift);
    const back = moving ? Math.sin(s.t + Math.PI) * 0.25 : 0;
    p.patL.rotation.y = back;
    p.patR.rotation.y = -back;
    pose.position.y = moving ? Math.abs(Math.sin(s.t)) * 0.015 : 0;
    p.cabeza.rotation.y = moving ? 0 : Math.sin(seconds * 0.5 + s.phase) * 0.35;
    p.cabeza.rotation.x = Math.sin(seconds * 0.7 + s.phase) * 0.08;
  },
  cangrejo(p, pose, s, dt, seconds, moving) {
    if (moving) s.t += dt * 14;
    pose.position.y = moving ? Math.abs(Math.sin(s.t)) * 0.01 : 0;
    for (const i of CRAB_LEGS) {
      for (const side of [-1, 1]) {
        // Patas alternas: unas levantadas mientras las otras apoyan.
        const off = (i + (side < 0 ? 0 : 1)) % 2 ? Math.PI : 0;
        const leg = p[`pata${side < 0 ? 'L' : 'R'}${i}`];
        leg.rotation.z = moving ? side * Math.max(0, Math.sin(s.t + off)) * 0.35 : 0;
        leg.rotation.y = moving ? Math.cos(s.t + off) * 0.18 : 0;
      }
    }
    // Las pinzas se abren y cierran; los brazos suben y bajan despacio.
    const open = Math.max(0, Math.sin(seconds * 3 + s.phase)) * 0.5;
    p.dedoL.rotation.x = -open;
    p.dedoR.rotation.x = -Math.max(0, Math.sin(seconds * 3 + s.phase + 1.3)) * 0.5;
    p.brazoL.rotation.x = Math.sin(seconds * 0.8 + s.phase) * 0.12;
    p.brazoR.rotation.x = Math.sin(seconds * 0.8 + s.phase + 0.6) * 0.12;
  },
  medusa(p, pose, s, dt, seconds, _moving, night) {
    s.t += dt * 2.2;
    // Late: la campana se encoge y se abre, y con cada latido sube un poco.
    const k = Math.pow(Math.max(0, Math.sin(s.t)), 2);
    p.campana.scale.set(1 + 0.08 * k, 1 - 0.13 * k, 1 + 0.08 * k);
    pose.position.y = Math.sin(s.t - 1) * 0.03;
    SEA_TIME.value = seconds;
    setNight(night);
  },
  raya(p, _pose, s, dt, _sec, moving) {
    s.t += dt * (moving ? 3.2 : 1.6);
    // Las alas ondulan como una ola: la punta va un poco por detrás.
    const w1 = Math.sin(s.t) * 0.28;
    const w2 = Math.sin(s.t - 0.9) * 0.35;
    p.alaL1.rotation.z = -w1;
    p.alaR1.rotation.z = w1;
    p.alaL2.rotation.z = -w2;
    p.alaR2.rotation.z = w2;
    p.cola1.rotation.y = Math.sin(s.t * 0.6) * 0.12;
    p.cola2.rotation.y = Math.sin(s.t * 0.6 - 0.8) * 0.22;
  },
  foca(p, pose, s, dt, seconds, moving) {
    if (moving) {
      // Se arrastra a saltitos: el cuerpo se arquea y la cola y la cabeza siguen el ritmo.
      s.t += dt * 6;
      pose.position.y = Math.max(0, Math.sin(s.t)) * 0.03;
      pose.rotation.x = Math.sin(s.t) * 0.06;
      p.cola.rotation.x = 0.1 - Math.sin(s.t) * 0.2;
      p.cabeza.rotation.set(-Math.sin(s.t) * 0.08, 0, 0);
      const f = Math.sin(s.t) * 0.4;
      p.aleL.rotation.y = f;
      p.aleR.rotation.y = -f;
    } else {
      // Tumbada al sol: levanta la cola y mira a su alrededor.
      pose.position.y = 0;
      pose.rotation.x = 0;
      p.cola.rotation.x = 0.18 + Math.sin(seconds * 0.9 + s.phase) * 0.1;
      p.cabeza.rotation.set(-0.12 + Math.sin(seconds * 0.6) * 0.05, Math.sin(seconds * 0.4 + s.phase) * 0.4, 0);
      p.aleL.rotation.y = 0;
      p.aleR.rotation.y = 0;
    }
  },
};

/** El modelo 3D de un animal del mar (o null si no es del mar), listo para Wildlife. Mira hacia +z. */
export function seaModel(kind: WildKind): PartsModel | null {
  const geo = seaGeometry(kind);
  if (!geo) return null;
  const group = new THREE.Group();
  const pose = new THREE.Group();
  group.add(pose);
  // El cangrejo anda de lado: la figura va girada para que avance con un costado por delante.
  if (kind === 'cangrejo') pose.rotation.y = Math.PI / 2;
  pose.scale.setScalar(SEA_SCALE[kind] ?? 1);
  const parts: Parts = {};
  for (const { def, geo: g } of geo.segs) {
    const node = new THREE.Group();
    const parent = def.parent ? parts[def.parent] : pose;
    const pp = def.parent ? geo.segs.find((s) => s.def.name === def.parent)!.def.pivot : [0, 0, 0];
    node.position.set(def.pivot[0] - pp[0], def.pivot[1] - pp[1], def.pivot[2] - pp[2]);
    parent.add(node);
    node.userData.part = def.name;
    parts[def.name] = node;
    if (g) {
      const mesh = new THREE.Mesh(g, MATS[def.mat ?? 'solido']);
      if (def.mat === 'brillo') mesh.userData.noEntityLight = true;
      if (def.mat === 'gelatina' || def.mat === 'tentaculo') mesh.renderOrder = 1;
      node.add(mesh);
    }
  }
  const state: AnimState = { t: Math.random() * 10, phase: Math.random() * 10 };
  const anim = ANIMS[kind];
  return {
    group, legs: [], wings: [], glow: [], mats: [],
    animate(dt, seconds, moving, night) {
      anim?.(parts, pose, state, dt, seconds, moving, night);
    },
    dispose() {
      // La geometría y los materiales de siempre se comparten; solo se tiran las copias con luz propia.
      group.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m && !SHARED.has(m)) m.dispose();
      });
    },
  };
}

// Se esculpen con calma al arrancar, en los ratos libres (la ballena tarda un poco), para que no den un tirón
// la primera vez que salen.
if (typeof requestIdleCallback === 'function') {
  const queue = [...SEA_KINDS];
  const next = () => {
    const k = queue.shift();
    if (!k) return;
    seaGeometry(k);
    requestIdleCallback(next, { timeout: 4000 });
  };
  requestIdleCallback(next, { timeout: 4000 });
}
