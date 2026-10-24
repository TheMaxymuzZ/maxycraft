import * as THREE from 'three';
import { isSolid } from './blocks';
import type { World } from './world';

const HALF_WIDTH = 0.3;
const HEIGHT = 1.8;
const EYE = 1.62;
const GRAVITY = 28;
const JUMP_SPEED = 8.6;
const WALK = 4.3;
const SPRINT = 6.2;

export class Player {
  /** Posición de los pies. */
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  onGround = false;

  private keys = new Set<string>();

  constructor(private world: World, readonly camera: THREE.PerspectiveCamera) {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  look(dx: number, dy: number) {
    const sens = 0.0022;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    const limit = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
  }

  update(dt: number) {
    const forward = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const strafe = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? SPRINT : WALK;

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    let mx = -sin * forward + cos * strafe;
    let mz = -cos * forward - sin * strafe;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx = (mx / len) * speed;
      mz = (mz / len) * speed;
    }
    // Aceleración suave: en el suelo responde rápido, en el aire se controla menos.
    const accel = this.onGround ? 18 : 6;
    const k = 1 - Math.exp(-accel * dt);
    this.velocity.x += (mx - this.velocity.x) * k;
    this.velocity.z += (mz - this.velocity.z) * k;

    if (this.onGround && this.keys.has('Space')) {
      this.velocity.y = JUMP_SPEED;
      this.onGround = false;
    }
    this.velocity.y = Math.max(this.velocity.y - GRAVITY * dt, -40);

    // Pasos pequeños para no atravesar bloques con fotogramas lentos.
    const steps = Math.ceil(dt / 0.016);
    const sdt = dt / steps;
    this.onGround = false;
    for (let i = 0; i < steps; i++) {
      this.moveAxis(0, this.velocity.x * sdt);
      this.moveAxis(1, this.velocity.y * sdt);
      this.moveAxis(2, this.velocity.z * sdt);
    }

    // Si cae fuera del mundo, vuelve arriba.
    if (this.position.y < -20) this.spawnAt(this.position.x, this.position.z);

    this.camera.position.set(this.position.x, this.position.y + EYE, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  spawnAt(x: number, z: number) {
    const bx = Math.floor(x);
    const bz = Math.floor(z);
    let y = 63;
    while (y > 0 && !isSolid(this.world.getBlock(bx, y, bz))) y--;
    this.position.set(bx + 0.5, y + 1, bz + 0.5);
    this.velocity.set(0, 0, 0);
  }

  /** True si el jugador ocuparía el bloque (x, y, z). */
  intersectsBlock(x: number, y: number, z: number): boolean {
    const p = this.position;
    return (
      x + 1 > p.x - HALF_WIDTH && x < p.x + HALF_WIDTH &&
      y + 1 > p.y && y < p.y + HEIGHT &&
      z + 1 > p.z - HALF_WIDTH && z < p.z + HALF_WIDTH
    );
  }

  private moveAxis(axis: 0 | 1 | 2, delta: number) {
    if (delta === 0) return;
    const p = this.position;
    p.setComponent(axis, p.getComponent(axis) + delta);

    const minX = Math.floor(p.x - HALF_WIDTH);
    const maxX = Math.floor(p.x + HALF_WIDTH - 1e-6);
    const minY = Math.floor(p.y);
    const maxY = Math.floor(p.y + HEIGHT - 1e-6);
    const minZ = Math.floor(p.z - HALF_WIDTH);
    const maxZ = Math.floor(p.z + HALF_WIDTH - 1e-6);

    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          if (!isSolid(this.world.getBlock(x, y, z))) continue;
          const eps = 1e-4;
          if (axis === 0) p.x = delta > 0 ? x - HALF_WIDTH - eps : x + 1 + HALF_WIDTH + eps;
          else if (axis === 2) p.z = delta > 0 ? z - HALF_WIDTH - eps : z + 1 + HALF_WIDTH + eps;
          else {
            if (delta > 0) p.y = y - HEIGHT - eps;
            else {
              p.y = y + 1;
              this.onGround = true;
            }
          }
          this.velocity.setComponent(axis, 0);
          return;
        }
      }
    }
  }
}
