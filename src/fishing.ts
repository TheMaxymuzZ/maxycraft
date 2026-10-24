import * as THREE from 'three';
import { type Creature, pickCreature } from './creatures';
import { WATER_SURFACE, type World } from './world';

const CAST_RANGE = 12;
/** Segundos para reaccionar cuando pica. */
const BITE_WINDOW = 1.1;

type Phase = 'idle' | 'waiting' | 'bite';

export type FishingResult =
  | { kind: 'cast' }
  | { kind: 'no-water' }
  | { kind: 'reeled' }
  | { kind: 'caught'; creature: Creature }
  | { kind: 'too-early' };

/** Pescar: lanzar el corcho al agua, esperar a que pique y tirar a tiempo. */
export class Fishing {
  private phase: Phase = 'idle';
  private timer = 0;
  private spot = new THREE.Vector3();
  private fish: Creature | null = null;
  readonly bobber = new THREE.Group();
  private t = 0;

  constructor(private world: World) {
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.22), new THREE.MeshLambertMaterial({ color: 0xe23b3b }));
    const white = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.22), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    red.position.y = 0.13;
    this.bobber.add(red, white);
    this.bobber.visible = false;
  }

  get active() {
    return this.phase !== 'idle';
  }

  /** Clic derecho con la caña: lanza, recoge o tira cuando ha picado. */
  use(ray: THREE.Ray, hour: number): FishingResult {
    if (this.phase === 'bite') {
      const fish = this.fish!;
      this.stop();
      return { kind: 'caught', creature: fish };
    }
    if (this.phase === 'waiting') {
      this.stop();
      return { kind: 'too-early' };
    }

    // Punto donde el rayo de la mira corta la superficie del agua.
    if (ray.direction.y >= -0.01) return { kind: 'no-water' };
    const t = (WATER_SURFACE - ray.origin.y) / ray.direction.y;
    if (t < 0 || t > CAST_RANGE) return { kind: 'no-water' };
    const p = ray.at(t, new THREE.Vector3());
    const kind = this.world.waterKind(Math.floor(p.x), Math.floor(p.z));
    if (!kind) return { kind: 'no-water' };

    this.spot.copy(p);
    this.fish = pickCreature([kind], hour);
    if (!this.fish) return { kind: 'no-water' };
    this.phase = 'waiting';
    this.timer = 2 + Math.random() * 6;
    this.bobber.visible = true;
    this.bobber.position.copy(p);
    return { kind: 'cast' };
  }

  /** Devuelve 'bite' cuando pica y 'escaped' si no se tira a tiempo. */
  update(dt: number, player: THREE.Vector3): 'bite' | 'escaped' | 'cancelled' | null {
    if (this.phase === 'idle') return null;
    this.t += dt;
    if (this.spot.distanceTo(player) > CAST_RANGE + 4) {
      this.stop();
      return 'cancelled';
    }
    this.timer -= dt;
    const y = WATER_SURFACE - 0.06;
    if (this.phase === 'waiting') {
      this.bobber.position.y = y + Math.sin(this.t * 2.5) * 0.03;
      // Pequeños toques antes de picar de verdad.
      if (this.timer < 1.5 && Math.sin(this.t * 9) > 0.95) this.bobber.position.y -= 0.05;
      if (this.timer <= 0) {
        this.phase = 'bite';
        this.timer = BITE_WINDOW;
        return 'bite';
      }
    } else if (this.phase === 'bite') {
      this.bobber.position.y = y - 0.22;
      if (this.timer <= 0) {
        this.stop();
        return 'escaped';
      }
    }
    return null;
  }

  stop() {
    this.phase = 'idle';
    this.fish = null;
    this.bobber.visible = false;
  }
}
