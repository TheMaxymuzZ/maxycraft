import * as THREE from 'three';
import { Block, isBarrier, isSolid } from './blocks';
import type { FaunaModel } from './landFauna';
import { landModel } from './landFaunaShapes';
import { SEA_LEVEL, type World } from './world';

export type AnimalKind = 'gallina' | 'vaca' | 'oveja';
export const ANIMAL_KINDS: AnimalKind[] = ['gallina', 'vaca', 'oveja'];

export interface AnimalSave {
  kind: AnimalKind;
  /** Sitio donde se soltó: pasea cerca de allí. */
  x: number;
  y: number;
  z: number;
  /** Último día (AAAA-MM-DD) en que dio su huevo o su leche. */
  given?: string;
  /** Último día en que comió pienso (v4.17): ese día da otra vez lo suyo. */
  fed?: string;
}

/** Lo que da cada animal una vez al día. */
export const PRODUCT: Record<AnimalKind, string> = { gallina: 'huevo', vaca: 'leche', oveja: 'lana' };
export const MAX_ANIMALS = 8;
const ROAM = 5;

/** Desde la v5.6, cada animal de la granja es una figura de cubitos de un píxel (landFaunaShapes), mirando hacia -z. */
function build(kind: AnimalKind): FaunaModel {
  return landModel(kind, -1)!;
}

export class Animal {
  readonly group: THREE.Group;
  readonly position = new THREE.Vector3();
  private model: FaunaModel;
  private target: THREE.Vector3 | null = null;
  private wait = Math.random() * 3;
  private walkTime = 0;
  private hop = 0;
  private time = Math.random() * 100;

  constructor(private world: World, readonly data: AnimalSave) {
    this.model = build(data.kind);
    this.group = this.model.group;
    this.position.set(data.x + 0.5, data.y, data.z + 0.5);
    this.group.position.copy(this.position);
    this.group.rotation.y = Math.random() * Math.PI * 2;
  }

  get height(): number {
    return this.data.kind === 'vaca' ? 1.45 : this.data.kind === 'oveja' ? 1.1 : 0.65;
  }

  bounds(out: THREE.Box3): THREE.Box3 {
    const p = this.position;
    const r = this.data.kind === 'vaca' ? 0.6 : this.data.kind === 'oveja' ? 0.45 : 0.25;
    return out.set(new THREE.Vector3(p.x - r, p.y, p.z - r), new THREE.Vector3(p.x + r, p.y + this.height, p.z + r));
  }

  /** Da un saltito de alegría (al recoger su huevo o su leche, o al acariciarlo). */
  happy() {
    this.hop = 1;
  }

  update(dt: number) {
    if (this.hop > 0) this.hop = Math.max(0, this.hop - dt * 2.5);
    const speed = this.data.kind === 'vaca' ? 0.9 : this.data.kind === 'oveja' ? 1 : 1.3;
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
        // Al pararse, agacha la cabeza a picotear o a comer hierba.
        this.model.graze(1.5);
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
    for (const l of this.model.legs) l.rotation.x = swing * (l.userData.side as number);
    // Las alas de la gallina, pegadas al cuerpo; las agita al saltar de alegría.
    for (const w of this.model.wings) w.rotation.z = this.hop > 0 ? Math.abs(Math.sin(this.hop * 20)) * 0.8 * (w.userData.side as number) : 0;
    this.time += dt;
    this.model.animate(dt, this.time, walking);
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
      if (ANIMAL_KINDS.includes(a.kind) && [a.x, a.y, a.z].every(Number.isFinite)) this.add({ ...a });
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

  /** Le da pienso (v4.17): si ya había dado lo suyo hoy, lo vuelve a dar. Una vez al día. Devuelve si lo ha comido. */
  feed(a: Animal, today: string): boolean {
    if (a.data.fed === today) return false;
    a.data.fed = today;
    if (a.data.given === today) delete a.data.given;
    a.happy();
    return true;
  }

  serialize(): AnimalSave[] {
    return this.list.map((a) => ({ ...a.data }));
  }
}
