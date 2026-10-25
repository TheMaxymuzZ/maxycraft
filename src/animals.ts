import * as THREE from 'three';
import { Block, isBarrier, isSolid } from './blocks';
import { SEA_LEVEL, type World } from './world';

export type AnimalKind = 'gallina' | 'vaca';

export interface AnimalSave {
  kind: AnimalKind;
  /** Sitio donde se soltó: pasea cerca de allí. */
  x: number;
  y: number;
  z: number;
  /** Último día (AAAA-MM-DD) en que dio su huevo o su leche. */
  given?: string;
}

/** Lo que da cada animal una vez al día. */
export const PRODUCT: Record<AnimalKind, string> = { gallina: 'huevo', vaca: 'leche' };
export const MAX_ANIMALS = 8;
const ROAM = 5;

const box = new THREE.BoxGeometry(1, 1, 1);
const mats = new Map<number, THREE.MeshLambertMaterial>();
function part(color: number, sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.Mesh {
  let m = mats.get(color);
  if (!m) mats.set(color, (m = new THREE.MeshLambertMaterial({ color })));
  const mesh = new THREE.Mesh(box, m);
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Modelos de cubos, mirando hacia -z como los vecinos. Devuelve el grupo y las patas para animarlas. */
function build(kind: AnimalKind): { group: THREE.Group; legs: THREE.Object3D[]; head: THREE.Object3D } {
  const group = new THREE.Group();
  const head = new THREE.Group();
  const legs: THREE.Object3D[] = [];
  const leg = (color: number, w: number, h: number, x: number, z: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, h, z);
    pivot.add(part(color, w, h, w, 0, -h / 2, 0));
    legs.push(pivot);
    group.add(pivot);
  };
  if (kind === 'gallina') {
    group.add(part(0xf8f6f0, 0.36, 0.3, 0.46, 0, 0.36, 0.04));
    group.add(part(0xe8e4dc, 0.06, 0.2, 0.3, -0.2, 0.38, 0.06), part(0xe8e4dc, 0.06, 0.2, 0.3, 0.2, 0.38, 0.06));
    group.add(part(0xf8f6f0, 0.24, 0.16, 0.12, 0, 0.52, 0.28));
    head.position.set(0, 0.62, -0.18);
    head.add(part(0xf8f6f0, 0.24, 0.26, 0.22, 0, 0, 0));
    head.add(part(0xf0a020, 0.12, 0.07, 0.12, 0, -0.02, -0.16));
    head.add(part(0xde3a3a, 0.06, 0.1, 0.14, 0, 0.17, 0), part(0xde3a3a, 0.08, 0.09, 0.05, 0, -0.1, -0.12));
    head.add(part(0x1e1e1e, 0.25, 0.05, 0.05, 0, 0.04, -0.08));
    leg(0xf0a020, 0.06, 0.22, -0.09, 0.04);
    leg(0xf0a020, 0.06, 0.22, 0.09, 0.04);
  } else {
    group.add(part(0xf6f6f2, 0.78, 0.62, 1.2, 0, 0.92, 0.05));
    // Manchas negras.
    group.add(part(0x2a2a2e, 0.8, 0.34, 0.4, 0, 1.04, 0.25), part(0x2a2a2e, 0.8, 0.3, 0.3, 0.12, 0.84, -0.3), part(0x2a2a2e, 0.8, 0.22, 0.24, -0.1, 0.76, 0.48));
    group.add(part(0xf4b4b4, 0.24, 0.1, 0.24, 0, 0.6, 0.3));
    head.position.set(0, 1.12, -0.66);
    head.add(part(0xf6f6f2, 0.56, 0.5, 0.42, 0, 0, 0));
    head.add(part(0xf4b4b4, 0.44, 0.22, 0.12, 0, -0.14, -0.24));
    head.add(part(0x1e1e1e, 0.58, 0.07, 0.07, 0, 0.08, -0.18), part(0x2a2a2e, 0.3, 0.26, 0.44, 0.14, 0.14, 0.02));
    head.add(part(0xdcd2b4, 0.08, 0.16, 0.08, -0.22, 0.32, 0.06), part(0xdcd2b4, 0.08, 0.16, 0.08, 0.22, 0.32, 0.06));
    head.add(part(0x2a2a2e, 0.14, 0.08, 0.1, -0.34, 0.12, 0.06), part(0x2a2a2e, 0.14, 0.08, 0.1, 0.34, 0.12, 0.06));
    for (const [x, z] of [[-0.24, -0.4], [0.24, -0.4], [-0.24, 0.48], [0.24, 0.48]]) leg(0xf6f6f2, 0.2, 0.62, x, z);
  }
  group.add(head);
  return { group, legs, head };
}

export class Animal {
  readonly group: THREE.Group;
  readonly position = new THREE.Vector3();
  private legs: THREE.Object3D[];
  private head: THREE.Object3D;
  private target: THREE.Vector3 | null = null;
  private wait = Math.random() * 3;
  private walkTime = 0;
  private hop = 0;
  /** Cada cuánto picotea o pasta. */
  private peck = 0;

  constructor(private world: World, readonly data: AnimalSave) {
    const model = build(data.kind);
    this.group = model.group;
    this.legs = model.legs;
    this.head = model.head;
    this.position.set(data.x + 0.5, data.y, data.z + 0.5);
    this.group.position.copy(this.position);
    this.group.rotation.y = Math.random() * Math.PI * 2;
  }

  get height(): number {
    return this.data.kind === 'vaca' ? 1.45 : 0.8;
  }

  bounds(out: THREE.Box3): THREE.Box3 {
    const p = this.position;
    const r = this.data.kind === 'vaca' ? 0.6 : 0.3;
    return out.set(new THREE.Vector3(p.x - r, p.y, p.z - r), new THREE.Vector3(p.x + r, p.y + this.height, p.z + r));
  }

  /** Da un saltito de alegría (al recoger su huevo o su leche, o al acariciarlo). */
  happy() {
    this.hop = 1;
  }

  update(dt: number) {
    if (this.hop > 0) this.hop = Math.max(0, this.hop - dt * 2.5);
    const speed = this.data.kind === 'vaca' ? 0.9 : 1.3;
    let walking = false;
    if (!this.target) {
      this.wait -= dt;
      if (this.wait <= 0) this.pickTarget();
    } else {
      const dx = this.target.x - this.position.x;
      const dz = this.target.z - this.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.1) {
        this.target = null;
        this.wait = 2 + Math.random() * 6;
        this.peck = 1.5;
      } else {
        const step = Math.min(dist, speed * dt);
        const nx = this.position.x + (dx / dist) * step;
        const nz = this.position.z + (dz / dist) * step;
        const ground = this.groundAt(nx, nz, this.position.y);
        if (ground === null || Math.abs(ground - this.position.y) > 1.01) {
          this.target = null;
          this.wait = 0.5;
        } else {
          this.position.set(nx, ground, nz);
          const want = Math.atan2(-dx, -dz);
          let diff = want - this.group.rotation.y;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          this.group.rotation.y += diff * Math.min(1, dt * 6);
          walking = true;
        }
      }
    }
    this.walkTime += walking ? dt * speed * 6 : 0;
    const swing = walking ? Math.sin(this.walkTime) * 0.6 : 0;
    this.legs.forEach((l, i) => (l.rotation.x = i % 2 === (i < 2 ? 0 : 1) ? swing : -swing));
    // Al pararse, agacha la cabeza a picotear o a comer hierba.
    if (this.peck > 0) this.peck -= dt;
    this.head.rotation.x = this.peck > 0 ? Math.abs(Math.sin(this.peck * (this.data.kind === 'gallina' ? 9 : 2))) * 0.6 : 0;
    this.group.position.set(this.position.x, this.position.y + Math.sin(this.hop * Math.PI) * 0.35, this.position.z);
  }

  private pickTarget() {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 1 + Math.random() * ROAM;
      const x = this.data.x + 0.5 + Math.cos(a) * d;
      const z = this.data.z + 0.5 + Math.sin(a) * d;
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
      if (y < SEA_LEVEL + 1) return null;
      if (isSolid(this.world.getBlock(bx, y + 1, bz)) || (this.data.kind === 'vaca' && isSolid(this.world.getBlock(bx, y + 2, bz)))) return null;
      const top = this.world.getBlock(bx, y, bz);
      // No se suben a los árboles ni saltan vallas o puertas cerradas.
      if (top === Block.Leaves || top === Block.PalmLeaves || isBarrier(top)) return null;
      return y + 1;
    }
    return null;
  }
}

/** Las gallinas y vacas de la granja. */
export class Animals {
  readonly group = new THREE.Group();
  readonly list: Animal[] = [];
  private tmpBox = new THREE.Box3();
  private hit = new THREE.Vector3();

  constructor(private world: World, saved: AnimalSave[] = []) {
    for (const a of saved) {
      if ((a.kind === 'gallina' || a.kind === 'vaca') && [a.x, a.y, a.z].every(Number.isFinite)) this.add({ ...a });
    }
  }

  get full(): boolean {
    return this.list.length >= MAX_ANIMALS;
  }

  add(data: AnimalSave): Animal {
    const a = new Animal(this.world, data);
    this.list.push(a);
    this.group.add(a.group);
    return a;
  }

  update(dt: number, player: THREE.Vector3) {
    for (const a of this.list) {
      // Los que están lejos no se mueven, para no gastar.
      const far = Math.abs(a.position.x - player.x) > 64 || Math.abs(a.position.z - player.z) > 64;
      a.group.visible = !far;
      if (!far) a.update(dt);
    }
  }

  /** Animal al que apunta el rayo, si está más cerca que `maxDist`. */
  pick(ray: THREE.Ray, maxDist: number): Animal | null {
    let best: Animal | null = null;
    let bestDist = maxDist;
    for (const a of this.list) {
      if (!a.group.visible || !ray.intersectBox(a.bounds(this.tmpBox), this.hit)) continue;
      const d = this.hit.distanceTo(ray.origin);
      if (d < bestDist) {
        best = a;
        bestDist = d;
      }
    }
    return best;
  }

  /** Recoge el huevo o la leche del día. Devuelve el objeto, o null si ya lo dio hoy. */
  collect(a: Animal, today: string): string | null {
    a.happy();
    if (a.data.given === today) return null;
    a.data.given = today;
    return PRODUCT[a.data.kind];
  }

  serialize(): AnimalSave[] {
    return this.list.map((a) => ({ ...a.data }));
  }
}
