// Figuras de la fauna de tierra (v5.6): cada animal hecho de cubitos de un píxel (1/16 de bloque), como un
// modelo de Minecraft, con su pelaje pintado píxel a píxel (manchas de la vaca, lomo y tripa de distinto color,
// rayas, pezuñas, ojos con su brillo…). Cada parte que se mueve (cabeza, cuello, patas, cola, orejas, alas,
// párpados) va en su propia pieza con la bisagra en su sitio, para que el animal pueda pastar, mirar a los lados,
// mover la cola y las orejas y parpadear.
//
// Cada especie se construye una sola vez: todas sus copias comparten la geometría y un único material con los
// colores en los vértices, así que un animal cuesta lo mismo que antes (una malla por pieza) aunque tenga muchos
// más detalles.
import * as THREE from 'three';

export type V3 = [number, number, number];
/** Color fijo, o un color para cada píxel según dónde está (en píxeles del modelo) y hacia dónde mira la cara. */
export type Paint = number | ((x: number, y: number, z: number, n: V3) => number);

export type Role = 'body' | 'head' | 'neck' | 'leg' | 'wing' | 'tail' | 'ear' | 'lid' | 'jaw' | 'throat' | 'extra';

interface PartDef {
  name: string;
  parent: string | null;
  /** Bisagra, en píxeles del modelo. */
  pivot: V3;
  /** Giro en reposo. */
  rest: V3;
  role: Role;
  side: 1 | -1 | 0;
}

interface BoxDef {
  part: string;
  paint: Paint;
  from: V3;
  to: V3;
  /** Giro de la caja sobre `origin` (si no, sobre su centro). */
  rot?: V3;
  origin?: V3;
  glow?: boolean;
  /** Cuánto cambia el color de un píxel a otro (0: nada). */
  grain: number;
}

export interface BoxOpts {
  rot?: V3;
  origin?: V3;
  glow?: boolean;
  grain?: number;
}

/** Ruido fijo por píxel (de -1 a 1). */
export function hash3(x: number, y: number, z: number, seed = 0): number {
  let h = (Math.floor(x) * 374761393 + Math.floor(y) * 668265263 + Math.floor(z) * 1274126177 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h & 0xffff) / 0xffff) * 2 - 1;
}

/** Ruido suave (para manchas grandes): mezcla de los valores de una rejilla de `size` píxeles. */
export function blob(x: number, y: number, z: number, size: number, seed = 0): number {
  const fx = x / size, fy = y / size, fz = z / size;
  const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
  const tx = fx - ix, ty = fy - iy, tz = fz - iz;
  const s = (t: number) => t * t * (3 - 2 * t);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * s(t);
  const v = (dx: number, dy: number, dz: number) => hash3(ix + dx, iy + dy, iz + dz, seed);
  return lerp(
    lerp(lerp(v(0, 0, 0), v(1, 0, 0), tx), lerp(v(0, 1, 0), v(1, 1, 0), tx), ty),
    lerp(lerp(v(0, 0, 1), v(1, 0, 1), tx), lerp(v(0, 1, 1), v(1, 1, 1), tx), ty),
    tz,
  );
}

/** Mezcla dos colores. */
export function mix(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Un color más claro (f > 1) o más oscuro (f < 1). */
export function tone(c: number, f: number): number {
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * f)));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * Esqueleto de un animal: piezas (con su bisagra) y las cajas de cada pieza. Todo se escribe en píxeles del modelo,
 * con los pies en y = 0 y mirando hacia +z.
 */
export class Rig {
  readonly parts = new Map<string, PartDef>();
  readonly boxes: BoxDef[] = [];

  constructor(bodyPivot: V3 = [0, 0, 0]) {
    this.part('body', null, bodyPivot, 'body');
  }

  part(name: string, parent: string | null, pivot: V3, role: Role = 'extra', side: 1 | -1 | 0 = 0, rest: V3 = [0, 0, 0]): this {
    this.parts.set(name, { name, parent, pivot, rest, role, side });
    return this;
  }

  /** Una caja de `from` a `to` (esquinas, en píxeles). */
  box(part: string, paint: Paint, from: V3, to: V3, o: BoxOpts = {}): this {
    if (!this.parts.has(part)) throw new Error(`pieza ${part}`);
    this.boxes.push({ part, paint, from, to, rot: o.rot, origin: o.origin, glow: o.glow, grain: o.grain ?? 0.06 });
    return this;
  }

  /** La caja y su reflejo al otro lado (x → -x). */
  pair(part: string, paint: Paint, from: V3, to: V3, o: BoxOpts = {}): this {
    this.box(part, paint, from, to, o);
    const rot = o.rot ? ([o.rot[0], -o.rot[1], -o.rot[2]] as V3) : undefined;
    const origin = o.origin ? ([-o.origin[0], o.origin[1], o.origin[2]] as V3) : undefined;
    return this.box(part, paint, [-to[0], from[1], from[2]], [-from[0], to[1], to[2]], { ...o, rot, origin });
  }

  /** Un palo cuadrado de grosor `t` de `a` a `b` (cuernos, astas, colas finas). */
  rod(part: string, paint: Paint, a: V3, b: V3, t: number, o: BoxOpts = {}): this {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    return this.box(part, paint, [mid[0] - t / 2, mid[1] - len / 2, mid[2] - t / 2], [mid[0] + t / 2, mid[1] + len / 2, mid[2] + t / 2], {
      ...o, rot: [e.x, e.y, e.z], origin: mid,
    });
  }
}

const P = 1 / 16;

export interface FaunaPartGeo {
  name: string;
  parent: string | null;
  /** Bisagra relativa a la de la pieza madre (en bloques). */
  offset: THREE.Vector3;
  rest: THREE.Euler;
  role: Role;
  side: 1 | -1 | 0;
  geo: THREE.BufferGeometry | null;
  glow: THREE.BufferGeometry | null;
}

export interface FaunaGeometry {
  parts: FaunaPartGeo[];
  /** La misma figura con píxeles de 2 en 2, para media distancia (v5.10). */
  mid?: FaunaGeometry;
  /** La misma figura con píxeles de 4 en 4, para cuando se ve de lejos (muchos menos vértices). */
  far?: FaunaGeometry;
  /** Cuántos vértices tiene en total (para las pruebas y el panel de rendimiento). */
  vertices: number;
  /** Alto total, en bloques. */
  height: number;
}

// Sombra de cada cara (además de la luz del sol): arriba la que más, abajo la que menos.
function faceShade(n: V3): number {
  if (n[1] > 0.5) return 1;
  if (n[1] < -0.5) return 0.68;
  return Math.abs(n[2]) > 0.5 ? 0.93 : 0.86;
}

const tmpC = new THREE.Color();
const COVER = [[0.5, 0.5], [0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]];

/**
 * Convierte el esqueleto en geometrías (una por pieza, más la que brilla). `cell`: tamaño de cada píxel pintado
 * (1 de cerca; más grande para la versión de lejos).
 */
export function buildRig(rig: Rig, cell = 1): FaunaGeometry {
  type Buf = { pos: number[]; nor: number[]; col: number[] };
  const bufs = new Map<string, { solid: Buf; glow: Buf }>();
  for (const name of rig.parts.keys()) bufs.set(name, { solid: { pos: [], nor: [], col: [] }, glow: { pos: [], nor: [], col: [] } });
  let maxY = 0;
  const m = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const nv = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  // Cada caja de la pieza, en su sitio, para no dibujar las caras que quedan tapadas dentro de otra.
  const solids = new Map<string, { inv: THREE.Matrix4; from: V3; to: V3; box: BoxDef }[]>();
  for (const b of rig.boxes) {
    if (b.glow) continue;
    const inv = new THREE.Matrix4();
    if (b.rot) {
      const o = b.origin ?? ([(b.from[0] + b.to[0]) / 2, (b.from[1] + b.to[1]) / 2, (b.from[2] + b.to[2]) / 2] as V3);
      inv.makeTranslation(o[0], o[1], o[2])
        .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...b.rot)))
        .multiply(new THREE.Matrix4().makeTranslation(-o[0], -o[1], -o[2]))
        .invert();
    }
    let list = solids.get(b.part);
    if (!list) solids.set(b.part, (list = []));
    list.push({ inv, from: b.from, to: b.to, box: b });
  }
  const q = new THREE.Vector3();
  const hidden = (part: string, self: BoxDef, p: THREE.Vector3) => {
    for (const o of solids.get(part) ?? []) {
      if (o.box === self) continue;
      q.copy(p).applyMatrix4(o.inv);
      if (q.x > o.from[0] && q.x < o.to[0] && q.y > o.from[1] && q.y < o.to[1] && q.z > o.from[2] && q.z < o.to[2]) return true;
    }
    return false;
  };
  for (const b of rig.boxes) {
    const pd = rig.parts.get(b.part)!;
    const buf = b.glow ? bufs.get(b.part)!.glow : bufs.get(b.part)!.solid;
    const size: V3 = [b.to[0] - b.from[0], b.to[1] - b.from[1], b.to[2] - b.from[2]];
    // Cuántos píxeles tiene cada lado (al menos uno).
    const cells = size.map((s) => Math.max(1, Math.round(s / cell))) as V3;
    m.identity();
    if (b.rot) {
      const o = b.origin ?? ([(b.from[0] + b.to[0]) / 2, (b.from[1] + b.to[1]) / 2, (b.from[2] + b.to[2]) / 2] as V3);
      m.makeTranslation(o[0], o[1], o[2])
        .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...b.rot)))
        .multiply(new THREE.Matrix4().makeTranslation(-o[0], -o[1], -o[2]));
    }
    nm.getNormalMatrix(m);
    // Las 6 caras: eje que no cambia, su signo, y los dos ejes de la cara.
    for (let axis = 0; axis < 3; axis++) {
      const ua = (axis + 1) % 3;
      const va = (axis + 2) % 3;
      for (const sign of [-1, 1]) {
        const n: V3 = [0, 0, 0];
        n[axis] = sign;
        nv.set(...n).applyMatrix3(nm).normalize();
        const wn: V3 = [nv.x, nv.y, nv.z];
        const shade = b.glow ? 1 : faceShade(wn);
        const fixed = sign > 0 ? b.to[axis] : b.from[axis];
        const du = size[ua] / cells[ua];
        const dv = size[va] / cells[va];
        for (let i = 0; i < cells[ua]; i++) {
          for (let j = 0; j < cells[va]; j++) {
            const u0 = b.from[ua] + i * du, u1 = u0 + du;
            const v0 = b.from[va] + j * dv, v1 = v0 + dv;
            const corner = (u: number, w: number): V3 => {
              const p: V3 = [0, 0, 0];
              p[axis] = fixed;
              p[ua] = u;
              p[va] = w;
              return p;
            };
            // Orden de los vértices para que la cara mire hacia fuera.
            const quad = sign > 0
              ? [corner(u0, v0), corner(u1, v0), corner(u1, v1), corner(u0, v1)]
              : [corner(u0, v0), corner(u0, v1), corner(u1, v1), corner(u1, v0)];
            // Color del píxel: en su centro (un poco hacia dentro, para que las caras de una arista no se mezclen).
            const center: V3 = [0, 0, 0];
            center[axis] = fixed - sign * 0.25;
            center[ua] = (u0 + u1) / 2;
            center[va] = (v0 + v1) / 2;
            // Si justo fuera de la cara (en el centro y cerca de las cuatro esquinas) hay otra caja de la misma pieza,
            // la cara no se ve.
            let covered = true;
            for (const [fu, fv] of COVER) {
              const out: V3 = [0, 0, 0];
              out[axis] = fixed + sign * 0.2;
              out[ua] = u0 + (u1 - u0) * fu;
              out[va] = v0 + (v1 - v0) * fv;
              v.set(...out).applyMatrix4(m);
              if (!hidden(b.part, b, v)) {
                covered = false;
                break;
              }
            }
            if (covered) continue;
            v.set(...center).applyMatrix4(m);
            const hex = typeof b.paint === 'number' ? b.paint : b.paint(v.x, v.y, v.z, wn);
            const g = 1 + hash3(v.x * 1.01, v.y * 1.01, v.z * 1.01, axis * 2 + (sign > 0 ? 1 : 0)) * b.grain;
            tmpC.setHex(hex);
            const f = shade * g;
            for (const k of [0, 1, 2, 0, 2, 3]) {
              v.set(...quad[k]).applyMatrix4(m);
              maxY = Math.max(maxY, v.y);
              buf.pos.push((v.x - pd.pivot[0]) * P, (v.y - pd.pivot[1]) * P, (v.z - pd.pivot[2]) * P);
              buf.nor.push(nv.x, nv.y, nv.z);
              buf.col.push(tmpC.r * f, tmpC.g * f, tmpC.b * f);
            }
          }
        }
      }
    }
  }
  const geo = (b: Buf) => {
    if (!b.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
    g.computeBoundingSphere();
    return g;
  };
  let vertices = 0;
  const parts: FaunaPartGeo[] = [];
  for (const pd of rig.parts.values()) {
    const parent = pd.parent ? rig.parts.get(pd.parent)! : null;
    const pp = parent?.pivot ?? [0, 0, 0];
    const b = bufs.get(pd.name)!;
    const g = geo(b.solid);
    const gl = geo(b.glow);
    vertices += (b.solid.pos.length + b.glow.pos.length) / 3;
    parts.push({
      name: pd.name, parent: pd.parent, role: pd.role, side: pd.side,
      offset: new THREE.Vector3((pd.pivot[0] - pp[0]) * P, (pd.pivot[1] - pp[1]) * P, (pd.pivot[2] - pp[2]) * P),
      rest: new THREE.Euler(...pd.rest),
      geo: g, glow: gl,
    });
  }
  const out: FaunaGeometry = { parts, vertices, height: maxY * P };
  if (cell === 1) {
    out.mid = buildRig(rig, 2);
    out.far = buildRig(rig, 4);
  }
  return out;
}

/** Desde dónde se mira (la cámara): de lejos los animales se dibujan con menos detalle. */
export const faunaEye = new THREE.Vector3(0, 1e6, 0);
/**
 * v5.10: el detalle baja en dos pasos y más lejos que antes (antes, de golpe a 22 bloques). Hasta 32 bloques, la
 * figura entera; hasta 64, con píxeles de 2 en 2; más allá, de 4 en 4. Los animales grandes guardan el detalle más lejos.
 */
export const FAUNA_LOD = [32, 64] as const;
/** Margen (en bloques) para no cambiar de figura una y otra vez si el animal se mueve justo en el límite. */
const LOD_MARGIN = 3;

/** Cuánto más lejos guarda el detalle una figura de `height` bloques de alto (los grandes, hasta el doble). */
export function faunaReach(height: number): number {
  return Math.max(1, Math.min(2, height / 1.5));
}

/** Qué figura toca en `p` (0 entera, 1 media, 2 de lejos) si ahora se ve la `now`. */
export function faunaLevel(p: THREE.Vector3, now: number, reach = 1): number {
  const d = Math.sqrt((p.x - faunaEye.x) ** 2 + (p.y - faunaEye.y) ** 2 + (p.z - faunaEye.z) ** 2) / reach;
  const want = d > FAUNA_LOD[1] ? 2 : d > FAUNA_LOD[0] ? 1 : 0;
  if (want === now) return now;
  // Justo en el límite entre las dos, se queda como está.
  if (Math.abs(d - FAUNA_LOD[Math.min(want, now)]) * reach < LOD_MARGIN) return now;
  return want;
}

/**
 * Las tres figuras de una pieza, colgadas del mismo sitio (así se mueven igual): solo se ve la que toca.
 * Si a una especie le falta alguna (las de antes de la v5.10 no tienen la media), se usa la siguiente.
 */
export class FaunaLods {
  readonly levels: THREE.Mesh[][] = [[], [], []];
  level = 0;

  /** Pasa a la figura `level` (si es otra). */
  show(level: number) {
    if (level === this.level) return;
    this.level = level;
    const pick = this.pick(level);
    this.levels.forEach((list, i) => {
      for (const m of list) m.visible = i === pick;
    });
  }

  /** La que se ve de verdad para `level`: la más cercana que exista, hacia menos detalle. */
  private pick(level: number): number {
    for (let i = level; i < this.levels.length; i++) if (this.levels[i].length) return i;
    for (let i = level; i >= 0; i--) if (this.levels[i].length) return i;
    return 0;
  }
}

/** El material de toda la fauna: colores en los vértices. */
export const faunaMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
/** Lo que brilla (los ojos del búho): no le afecta la luz. */
export const faunaGlowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });

/** Cómo se mueve cada animal cuando está quieto. */
export interface FaunaHabits {
  /** Baja la cabeza a pastar o picotear. */
  graze?: 'pasta' | 'picotea';
  /** Cuánto mueve la cola (radianes) y si de lado (y) o arriba y abajo (x). */
  tail?: { amp: number; speed: number; axis?: 'x' | 'y' | 'z' };
  /** Mueve las orejas de vez en cuando. */
  ears?: boolean;
  /** Mira a los lados (radianes). */
  look?: number;
  /** Se balancea al andar (pingüino). */
  waddle?: number;
  /** Se pone de pie quieto y se agacha al correr (suricata): cuánto se inclina el cuerpo. */
  crouch?: number;
  /** Infla la garganta (rana). */
  croak?: boolean;
}

/**
 * Un animal de la fauna de tierra montado: `group` se coloca y se gira; las patas (`legs`) y las alas (`wings`) las
 * mueve quien lo usa, como antes, y `animate` hace todo lo demás (cabeza, cola, orejas, parpadeo…).
 */
export class FaunaModel {
  readonly group = new THREE.Group();
  /** Lo que se gira y se inclina dentro de `group` (el balanceo del pingüino, el agacharse de la suricata). */
  readonly pose = new THREE.Group();
  readonly legs: THREE.Object3D[] = [];
  readonly wings: THREE.Object3D[] = [];
  /** Para que encaje con los modelos de antes (no tiene materiales propios que brillen de noche). */
  readonly glow: THREE.MeshLambertMaterial[] = [];
  readonly mats: THREE.MeshLambertMaterial[] = [];
  readonly byName = new Map<string, THREE.Object3D>();
  /** La geometría y el material son de toda la especie: al quitarlo no hay nada que liberar. */
  readonly dispose = () => {};
  private heads: THREE.Object3D[] = [];
  private necks: THREE.Object3D[] = [];
  private tails: THREE.Object3D[] = [];
  private ears: THREE.Object3D[] = [];
  private lids: THREE.Object3D[] = [];
  private throats: THREE.Object3D[] = [];
  private body: THREE.Object3D;
  private seed = Math.random() * 100;
  private blinkIn = 1 + Math.random() * 4;
  private lookIn = Math.random() * 3;
  private lookFrom = 0;
  private lookTo = 0;
  private lookT = 1;
  private grazeLeft = 0;
  private grazeIn = 2 + Math.random() * 6;
  private earIn = Math.random() * 4;
  private earT = 1;
  private crouchNow = 0;
  private lods = new FaunaLods();
  private reach: number;

  constructor(readonly geometry: FaunaGeometry, readonly habits: FaunaHabits = {}, facing: 1 | -1 = 1, scale = 1) {
    this.reach = faunaReach(geometry.height * scale);
    this.group.add(this.pose);
    // Tamaño real respecto al jugador (1,8 bloques): los píxeles se encogen o se agrandan, el dibujo es el mismo.
    this.pose.scale.setScalar(scale);
    // Los modelos miran hacia +z; los de la granja y los pájaros, hacia -z.
    if (facing < 0) this.pose.rotation.y = Math.PI;
    geometry.parts.forEach((p, i) => {
      const o = new THREE.Group();
      o.name = p.name;
      o.position.copy(p.offset);
      o.rotation.copy(p.rest);
      o.userData.rest = p.rest.clone();
      o.userData.side = p.side;
      if (p.geo) {
        [p.geo, geometry.mid?.parts[i].geo, geometry.far?.parts[i].geo].forEach((g, level) => {
          if (!g) return;
          const mesh = new THREE.Mesh(g, faunaMaterial);
          mesh.visible = level === 0;
          o.add(mesh);
          this.lods.levels[level].push(mesh);
        });
      }
      if (p.glow) {
        const g = new THREE.Mesh(p.glow, faunaGlowMaterial);
        g.userData.noEntityLight = true;
        o.add(g);
      }
      (p.parent ? this.byName.get(p.parent)! : this.pose).add(o);
      this.byName.set(p.name, o);
      if (p.role === 'leg') this.legs.push(o);
      else if (p.role === 'wing') this.wings.push(o);
      else if (p.role === 'head') this.heads.push(o);
      else if (p.role === 'neck') this.necks.push(o);
      else if (p.role === 'tail') this.tails.push(o);
      else if (p.role === 'ear') this.ears.push(o);
      else if (p.role === 'lid') {
        o.visible = false;
        this.lids.push(o);
      } else if (p.role === 'throat') this.throats.push(o);
    });
    this.body = this.byName.get('body')!;
  }

  /** Que baje la cabeza a comer o a picotear un rato (al pararse). */
  graze(seconds = 2) {
    if (this.habits.graze) this.grazeLeft = seconds;
  }

  /** Qué figura se ve ahora: 0 entera, 1 media, 2 de lejos (para las pruebas). */
  get lodLevel(): number {
    return this.lods.level;
  }

  /** Un fotograma de vida: llamar después de mover el grupo. */
  animate(dt: number, seconds: number, moving: boolean, _night = 0) {
    const h = this.habits;
    // De lejos, la figura con menos detalle, poco a poco (no se nota y cuesta mucho menos).
    this.lods.show(faunaLevel(this.group.position, this.lods.level, this.reach));
    // Parpadeo.
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) this.blinkIn = 2 + Math.random() * 4;
    const blink = this.blinkIn < 0.13;
    for (const l of this.lids) l.visible = blink;
    // Pastar o picotear: solo quieto.
    if (moving) this.grazeLeft = 0;
    else if (h.graze) {
      this.grazeIn -= dt;
      if (this.grazeIn <= 0) {
        this.grazeIn = 4 + Math.random() * 8;
        this.grazeLeft = 1.5 + Math.random() * 3;
      }
    }
    this.grazeLeft = Math.max(0, this.grazeLeft - dt);
    const grazing = this.grazeLeft > 0;
    // Mirar a los lados.
    this.lookIn -= dt;
    if (this.lookIn <= 0) {
      this.lookIn = 1.5 + Math.random() * 3.5;
      this.lookFrom = this.lookFrom + (this.lookTo - this.lookFrom) * this.ease(this.lookT);
      this.lookTo = moving || grazing ? 0 : (Math.random() * 2 - 1) * (h.look ?? 0.5);
      this.lookT = 0;
    }
    this.lookT = Math.min(1, this.lookT + dt * 2.5);
    const look = this.lookFrom + (this.lookTo - this.lookFrom) * this.ease(this.lookT);
    const bob = moving ? Math.sin(seconds * 9 + this.seed) * 0.06 : 0;
    // Al pastar baja el cuello (si tiene) o la cabeza; al picotear, golpecitos rápidos.
    const peck = h.graze === 'picotea' ? Math.abs(Math.sin(this.grazeLeft * 9)) * 0.9 : 0;
    const down = grazing ? (h.graze === 'picotea' ? peck : 1) : 0;
    for (const n of this.necks) {
      const r = n.userData.rest as THREE.Euler;
      n.rotation.x = this.approach(n.rotation.x, r.x + down * 0.9 + bob, dt * 4);
      n.rotation.y = r.y + look * 0.4;
    }
    for (const hd of this.heads) {
      const r = hd.userData.rest as THREE.Euler;
      const extra = this.necks.length ? down * 0.35 : down * 0.75;
      hd.rotation.x = h.graze === 'picotea' && grazing ? r.x + peck * 0.8 : this.approach(hd.rotation.x, r.x + extra + (this.necks.length ? 0 : bob), dt * 5);
      hd.rotation.y = r.y + look * (this.necks.length ? 0.6 : 1);
      // Algún animal ladea la cabeza al mirar.
      hd.rotation.z = r.z + look * 0.15;
    }
    // Cola.
    if (h.tail) {
      const sp = h.tail.speed * (moving ? 1.6 : 1);
      const a = Math.sin(seconds * sp + this.seed) * h.tail.amp;
      for (const t of this.tails) {
        const r = t.userData.rest as THREE.Euler;
        const ax = h.tail.axis ?? 'y';
        t.rotation.set(r.x + (ax === 'x' ? a : 0), r.y + (ax === 'y' ? a : 0), r.z + (ax === 'z' ? a : 0));
      }
    }
    // Orejas: un respingo de vez en cuando.
    if (h.ears && this.ears.length) {
      this.earIn -= dt;
      if (this.earIn <= 0) {
        this.earIn = 2 + Math.random() * 5;
        this.earT = 0;
      }
      this.earT = Math.min(1, this.earT + dt * 4);
      const flick = Math.sin(this.earT * Math.PI) * 0.45;
      for (const e of this.ears) {
        const r = e.userData.rest as THREE.Euler;
        e.rotation.z = r.z + flick * (e.userData.side as number);
        e.rotation.x = r.x + (moving ? -0.25 : 0);
      }
    }
    // Garganta de la rana.
    for (const t of this.throats) {
      const s = 1 + Math.max(0, Math.sin(seconds * 3 + this.seed)) ** 6 * 0.9;
      t.scale.set(s, s, s);
    }
    // Balanceo del pingüino.
    if (h.waddle) this.pose.rotation.z = moving ? Math.sin(seconds * 8 + this.seed) * h.waddle : 0;
    // La suricata: de pie quieta y agachada al correr.
    if (h.crouch) {
      this.crouchNow = this.approach(this.crouchNow, moving ? 1 : 0, dt * 6);
      const r = this.body.userData.rest as THREE.Euler;
      this.body.rotation.x = r.x + this.crouchNow * h.crouch;
    }
  }

  private ease(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private approach(from: number, to: number, k: number): number {
    return from + (to - from) * Math.min(1, k);
  }
}
