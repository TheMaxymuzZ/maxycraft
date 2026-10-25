import * as THREE from 'three';
import { isSolid } from './blocks';
import type { ItemModels } from './itemModels';
import type { World } from './world';

interface Drop {
  id: string;
  /** El objeto en 3D (gira) y su sombrita redonda en el suelo, dentro de un grupo que se mueve. */
  obj: THREE.Group;
  model: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  shadow: THREE.Mesh;
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

/** Sombrita redonda que llevan los objetos del suelo, para ver dónde están. */
function blobTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
  g.addColorStop(0, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

/** Objetos tirados por el suelo: en 3D, giran, flotan un poco y se recogen al pasar cerca (v3.3). */
export class Drops {
  private drops: Drop[] = [];
  readonly group = new THREE.Group();
  private shadowGeo = new THREE.PlaneGeometry(0.5, 0.5).rotateX(-Math.PI / 2);
  private shadowMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false });

  constructor(private world: World, private models: ItemModels) {}

  /** Quita los objetos con esa etiqueta que nadie ha recogido (las conchas de ayer, por ejemplo). */
  clear(tag: string) {
    this.drops = this.drops.filter((d) => {
      if (d.tag !== tag) return true;
      this.group.remove(d.obj);
      return false;
    });
  }

  spawn(id: string, x: number, y: number, z: number, opts: { burst?: boolean; onPickup?: () => void; tag?: string } = {}) {
    // Cada objeto tiene su material, para oscurecerlo si está en una cueva.
    const cube = this.models.isCube(id);
    const base = cube ? this.models.blockMaterial : this.models.voxelMaterial;
    const model = this.models.mesh(id, base.clone()) as Drop['model'];
    model.scale.setScalar(cube ? 0.3 : 0.45);
    model.rotation.y = Math.random() * Math.PI * 2;
    // La sombrita ya dice dónde está; la sombra del sol de algo tan pequeño solo haría ruido.
    model.userData.noShadow = true;
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    shadow.renderOrder = 1;
    const obj = new THREE.Group().add(model, shadow);
    obj.position.set(x, y, z);
    this.group.add(obj);
    const velocity = opts.burst
      ? new THREE.Vector3((Math.random() - 0.5) * 2.5, 3 + Math.random() * 1.5, (Math.random() - 0.5) * 2.5)
      : new THREE.Vector3();
    this.drops.push({ id, obj, model, shadow, velocity, age: 0, resting: false, onPickup: opts.onPickup, tag: opts.tag });
  }

  /** Mueve los objetos y entrega los que el jugador toca. `take` devuelve false si no caben. */
  update(dt: number, player: THREE.Vector3, take: (id: string) => boolean, light: (p: THREE.Vector3) => number) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.age += dt;
      if (d.full && (d.retry = (d.retry ?? 0) - dt) <= 0) d.full = false;
      const p = d.obj.position;

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
      d.model.material.color.setScalar(light(p));
      d.model.rotation.y += dt * 1.6;
      // La sombrita se queda en el suelo que hay debajo, también mientras cae.
      let ground = Math.floor(p.y - 0.3);
      while (ground > p.y - 5 && !isSolid(this.world.getBlock(Math.floor(p.x), ground, Math.floor(p.z)))) ground--;
      d.shadow.visible = ground > p.y - 5;
      d.shadow.position.y = ground + 1.02 - p.y;

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
    const d = this.drops[i];
    this.group.remove(d.obj);
    d.model.material.dispose();
    this.drops.splice(i, 1);
  }
}
