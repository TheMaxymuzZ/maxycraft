import * as THREE from 'three';
import { isSolid, tileCanvas } from './blocks';
import { itemDef } from './items';
import type { World } from './world';

interface Drop {
  id: string;
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  age: number;
  resting: boolean;
  /** No cupo en los bolsillos; se vuelve a intentar pasado `retry`. */
  full?: boolean;
  retry?: number;
  onPickup?: () => void;
  tag?: string;
}

const PICKUP_RADIUS = 0.9;
/** Desde esta distancia el objeto vuela hacia el jugador. */
const MAGNET_RADIUS = 3;
const GRAVITY = 20;

/** Objetos tirados por el suelo: giran, flotan un poco y se recogen al pasar cerca. */
export class Drops {
  private drops: Drop[] = [];
  private materials = new Map<string, THREE.SpriteMaterial>();
  readonly group = new THREE.Group();

  constructor(private world: World, private atlas: HTMLCanvasElement) {}

  private material(id: string): THREE.SpriteMaterial {
    let m = this.materials.get(id);
    if (!m) {
      const tex = new THREE.CanvasTexture(tileCanvas(this.atlas, itemDef(id).tile));
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      m = new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5 });
      this.materials.set(id, m);
    }
    return m;
  }

  /** Quita los objetos con esa etiqueta que nadie ha recogido (las conchas de ayer, por ejemplo). */
  clear(tag: string) {
    this.drops = this.drops.filter((d) => {
      if (d.tag !== tag) return true;
      this.group.remove(d.sprite);
      return false;
    });
  }

  spawn(id: string, x: number, y: number, z: number, opts: { burst?: boolean; onPickup?: () => void; tag?: string } = {}) {
    const sprite = new THREE.Sprite(this.material(id));
    sprite.scale.setScalar(0.45);
    sprite.position.set(x, y, z);
    this.group.add(sprite);
    const velocity = opts.burst
      ? new THREE.Vector3((Math.random() - 0.5) * 2.5, 3 + Math.random() * 1.5, (Math.random() - 0.5) * 2.5)
      : new THREE.Vector3();
    this.drops.push({ id, sprite, velocity, age: 0, resting: false, onPickup: opts.onPickup, tag: opts.tag });
  }

  /** Mueve los objetos y entrega los que el jugador toca. `take` devuelve false si no caben. */
  update(dt: number, player: THREE.Vector3, take: (id: string) => boolean, light: (p: THREE.Vector3) => number) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.age += dt;
      if (d.full && (d.retry = (d.retry ?? 0) - dt) <= 0) d.full = false;
      const p = d.sprite.position;

      if (!d.resting) {
        d.velocity.y -= GRAVITY * dt;
        const nx = p.x + d.velocity.x * dt;
        const nz = p.z + d.velocity.z * dt;
        if (!isSolid(this.world.getBlock(Math.floor(nx), Math.floor(p.y), Math.floor(nz)))) {
          p.x = nx;
          p.z = nz;
        } else {
          d.velocity.x = d.velocity.z = 0;
        }
        const ny = p.y + d.velocity.y * dt;
        const floor = Math.floor(ny - 0.25);
        if (d.velocity.y < 0 && isSolid(this.world.getBlock(Math.floor(p.x), floor, Math.floor(p.z)))) {
          p.y = floor + 1.25;
          d.velocity.set(0, 0, 0);
          d.resting = true;
        } else {
          p.y = ny;
        }
        if (p.y < -10) this.remove(i);
      } else {
        // Se balancea despacio, como los objetos en Minecraft.
        p.y += Math.sin(d.age * 2.5) * 0.12 * dt;
        // Si quitan el bloque de debajo, vuelve a caer.
        if (!isSolid(this.world.getBlock(Math.floor(p.x), Math.floor(p.y - 0.4), Math.floor(p.z)))) d.resting = false;
      }
      d.sprite.material.color.setScalar(light(p));

      const dx = player.x - p.x;
      const dy = player.y + 0.9 - p.y;
      const dz = player.z - p.z;
      const dist = Math.hypot(dx, dy, dz);
      if (d.age < 0.5 || dist > MAGNET_RADIUS || d.full) continue;
      if (dist < PICKUP_RADIUS) {
        if (take(d.id)) {
          d.onPickup?.();
          this.remove(i);
        } else {
          d.full = true; // no cabe: se queda en el suelo hasta que haya sitio
          d.retry = 2;
        }
        continue;
      }
      const step = Math.min(dist, 9 * dt);
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      p.z += (dz / dist) * step;
      d.resting = true;
    }
  }

  private remove(i: number) {
    this.group.remove(this.drops[i].sprite);
    this.drops.splice(i, 1);
  }
}
