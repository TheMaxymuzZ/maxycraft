// Figuras en 3D de los peces y los insectos (v5.4), hechas de cubitos a partir de su dibujo (critterArt):
// el cuerpo es más gordo por el centro y fino por los bordes, las aletas y las patas son de un cubito y las alas
// van aparte para que puedan aletear. Las partes que brillan (la luciérnaga, el pez linterna...) no se apagan de noche.
// Cada especie se construye una sola vez y todas sus copias comparten la geometría.

import * as THREE from 'three';
import { type Creature } from './creatures';
import { type CritterArt, Part, critterArt } from './critterArt';

const N = 16;
/** Capas de grosor (la del medio es la 3). */
const D = 7;
const MID = 3;
const P = 1 / N;

export interface CritterGeometry {
  body: THREE.BufferGeometry;
  glow: THREE.BufferGeometry | null;
  /** Alas: geometría con el origen en la bisagra, y dónde va la bisagra. */
  wings: { geo: THREE.BufferGeometry; pivot: number }[];
  /** Todo junto, para la mano y los objetos del suelo. */
  merged: THREE.BufferGeometry;
}

type Group = 'body' | 'glow' | 'wingL' | 'wingR';

function thickness(art: CritterArt): Uint8Array {
  const t = new Uint8Array(N * N);
  // Distancia de cada píxel del cuerpo al borde (en cuadros, contando diagonales).
  const dist = new Uint8Array(N * N);
  const solid = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= N || y >= N) return false;
    const p = art.part[y * N + x];
    return p === Part.Body || p === Part.Glow;
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!solid(x, y)) continue;
      let d = 1;
      search: for (; d < 4; d++) {
        for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (!solid(x + dx, y + dy)) break search;
      }
      dist[y * N + x] = d;
    }
  }
  for (let i = 0; i < N * N; i++) {
    const p = art.part[i];
    if (p === Part.Empty) continue;
    t[i] = p === Part.Thin || p === Part.Wing ? 1 : 2 * Math.min(dist[i], art.depth) + 1;
  }
  return t;
}

function groupOf(art: CritterArt, x: number, y: number, wingSplit: number): Group | null {
  const p = art.part[y * N + x];
  if (p === Part.Empty) return null;
  if (p === Part.Glow) return 'glow';
  if (p === Part.Wing) return x < wingSplit ? 'wingL' : 'wingR';
  return 'body';
}

function build(art: CritterArt): CritterGeometry {
  const t = thickness(art);
  // Las alas se reparten a cada lado del cuerpo; la bisagra va pegada al cuerpo.
  let bodyMin = N, bodyMax = -1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const p = art.part[y * N + x];
    if (p === Part.Body) { bodyMin = Math.min(bodyMin, x); bodyMax = Math.max(bodyMax, x); }
  }
  const wingSplit = (bodyMin + bodyMax + 1) / 2;
  let pivotL = 0, pivotR = N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (art.part[y * N + x] !== Part.Wing) continue;
    if (x < wingSplit) pivotL = Math.max(pivotL, x + 1);
    else pivotR = Math.min(pivotR, x);
  }
  const filled = (x: number, y: number, k: number): Group | null => {
    if (x < 0 || y < 0 || x >= N || y >= N || k < 0 || k >= D) return null;
    const th = t[y * N + x];
    if (!th || Math.abs(k - MID) > (th - 1) / 2) return null;
    return groupOf(art, x, y, wingSplit);
  };
  const out: Record<Group, { pos: number[]; nor: number[]; col: number[] }> = {
    body: { pos: [], nor: [], col: [] }, glow: { pos: [], nor: [], col: [] }, wingL: { pos: [], nor: [], col: [] }, wingR: { pos: [], nor: [], col: [] },
  };
  const c = new THREE.Color();
  // Caras: dirección en la rejilla (x, y de la imagen hacia abajo, capa), normal en 3D, sombra.
  const DIRS: [number, number, number, [number, number, number], number][] = [
    [0, 0, 1, [0, 0, 1], 1], [0, 0, -1, [0, 0, -1], 1],
    [1, 0, 0, [1, 0, 0], 0.8], [-1, 0, 0, [-1, 0, 0], 0.8],
    [0, -1, 0, [0, 1, 0], 0.92], [0, 1, 0, [0, -1, 0], 0.62],
  ];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const rgb = art.color[y * N + x];
    if (!rgb) continue;
    c.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
    for (let k = 0; k < D; k++) {
      const g = filled(x, y, k);
      if (!g) continue;
      const o = out[g];
      const ox = g === 'wingL' ? pivotL : g === 'wingR' ? pivotR : 0;
      const x0 = (x - ox) * P - (g === 'wingL' || g === 'wingR' ? 0 : 0.5);
      const x1 = x0 + P;
      const y1 = 0.5 - y * P;
      const y0 = y1 - P;
      const z0 = (k - D / 2) * P;
      const z1 = z0 + P;
      for (const [dx, dy, dk, n, s] of DIRS) {
        const other = filled(x + dx, y + dy, k + dk);
        // Se tapa con lo que está pegado, salvo entre el ala y el cuerpo (el ala se mueve).
        if (other && (other === g || ((g === 'body' || g === 'glow') && (other === 'body' || other === 'glow')))) continue;
        let quad: number[][];
        if (dk === 1) quad = [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
        else if (dk === -1) quad = [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]];
        else if (dx === 1) quad = [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]];
        else if (dx === -1) quad = [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]];
        else if (dy === -1) quad = [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]];
        else quad = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
        const sh = g === 'glow' ? 1 : s;
        for (const v of [0, 1, 2, 0, 2, 3]) {
          o.pos.push(...quad[v]);
          o.nor.push(...n);
          o.col.push(c.r * sh, c.g * sh, c.b * sh);
        }
      }
    }
  }
  const geo = (g: { pos: number[]; nor: number[]; col: number[] }, shift = 0) => {
    if (!g.pos.length) return null;
    const pos = shift ? g.pos.map((v, i) => (i % 3 === 0 ? v + shift : v)) : g.pos;
    const b = new THREE.BufferGeometry();
    b.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    b.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3));
    b.setAttribute('color', new THREE.Float32BufferAttribute(g.col, 3));
    b.computeBoundingSphere();
    return b;
  };
  const wings: CritterGeometry['wings'] = [];
  const wl = geo(out.wingL);
  const wr = geo(out.wingR);
  if (wl) wings.push({ geo: wl, pivot: pivotL * P - 0.5 });
  if (wr) wings.push({ geo: wr, pivot: pivotR * P - 0.5 });
  // Todo junto (las alas, en su sitio).
  const all = { pos: [] as number[], nor: [] as number[], col: [] as number[] };
  const add = (g: { pos: number[]; nor: number[]; col: number[] }, shift: number) => {
    all.pos.push(...g.pos.map((v, i) => (i % 3 === 0 ? v + shift : v)));
    all.nor.push(...g.nor);
    all.col.push(...g.col);
  };
  add(out.body, 0);
  add(out.glow, 0);
  add(out.wingL, pivotL * P - 0.5);
  add(out.wingR, pivotR * P - 0.5);
  return { body: geo(out.body) ?? new THREE.BufferGeometry(), glow: geo(out.glow), wings, merged: geo(all)! };
}

const built = new Map<string, CritterGeometry>();

/** Las piezas en 3D de un pez o insecto (null para los fósiles). En el plano del dibujo, con el grosor en z. */
export function critterGeometry(c: Creature): CritterGeometry | null {
  let g = built.get(c.id);
  if (!g) {
    const art = critterArt(c);
    if (!art) return null;
    built.set(c.id, (g = build(art)));
  }
  return g;
}

export const critterMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
/** Lo que brilla: no le afecta la luz. */
export const critterGlowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });

/** Cómo se mueve cada insecto. */
export type CritterPose = 'nada' | 'vuela' | 'tronco' | 'suelo';

const FLYERS = new Set(['mariposa', 'libelula', 'luciernaga']);

export function critterPose(c: Creature): CritterPose {
  if (c.kind === 'pez') return 'nada';
  if (FLYERS.has(c.sprite)) return 'vuela';
  return c.habitat === 'árboles' ? 'tronco' : 'suelo';
}

/** Un pez o insecto en 3D: `root` se coloca y gira; dentro va la figura, tumbada si es un insecto. */
export class CritterModel {
  readonly root = new THREE.Group();
  private pose = new THREE.Group();
  private wings: THREE.Object3D[] = [];
  private yaw = 0;
  private last = new THREE.Vector3();
  private moved = false;
  readonly mode: CritterPose;

  constructor(readonly creature: Creature, scale: number, mode: CritterPose = critterPose(creature)) {
    this.mode = mode;
    const g = critterGeometry(creature)!;
    this.root.add(this.pose);
    this.pose.scale.setScalar(scale);
    this.pose.add(new THREE.Mesh(g.body, critterMaterial));
    if (g.glow) {
      const glow = new THREE.Mesh(g.glow, critterGlowMaterial);
      glow.userData.noEntityLight = true;
      this.pose.add(glow);
    }
    for (const w of g.wings) {
      const hinge = new THREE.Group();
      hinge.position.x = w.pivot;
      hinge.userData.left = w.pivot < 0;
      hinge.add(new THREE.Mesh(w.geo, critterMaterial));
      this.pose.add(hinge);
      this.wings.push(hinge);
    }
    // Los insectos, tumbados: la cabeza (arriba en el dibujo) mirando hacia delante y el lomo hacia arriba.
    if (mode === 'vuela' || mode === 'suelo') this.pose.rotation.x = -Math.PI / 2;
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  /** Mira hacia donde se mueve y bate las alas. Llamar después de mover `position`. */
  animate(dt: number, phase: number) {
    const p = this.root.position;
    if (this.moved) {
      const vx = p.x - this.last.x;
      const vz = p.z - this.last.z;
      if (vx * vx + vz * vz > 1e-7 && this.mode !== 'tronco') {
        // Los peces llevan la cabeza hacia -x; los insectos tumbados, hacia -z.
        const target = this.mode === 'nada' ? Math.atan2(vz, -vx) : Math.atan2(-vx, -vz);
        let d = target - this.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.yaw += d * Math.min(1, dt * 6);
        this.root.rotation.y = this.yaw;
      }
    }
    this.last.copy(p);
    this.moved = true;
    const kind = this.creature.sprite;
    let flap = 0;
    if (kind === 'mariposa') flap = 0.35 + Math.sin(phase * 14) * 0.75;
    else if (kind === 'libelula') flap = Math.sin(phase * 40) * 0.22;
    else if (kind === 'luciernaga') flap = 0.3 + Math.sin(phase * 30) * 0.35;
    // Las alas giran sobre el eje del cuerpo: hacia arriba las dos a la vez.
    for (const w of this.wings) w.rotation.y = w.userData.left ? flap : -flap;
    // Los peces mueven la cola: la figura entera se balancea un poco.
    if (this.mode === 'nada') this.pose.rotation.y = Math.sin(phase * 6) * 0.12;
  }

  /** Para colocar uno quieto mirando a un lado. */
  face(yaw: number) {
    this.yaw = yaw;
    this.root.rotation.y = yaw;
  }
}
