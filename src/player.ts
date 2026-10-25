import * as THREE from 'three';
import { type Box, collisionBoxes, isSolid } from './blocks';
import { type KeyMap, defaultKeys } from './keys';
import type { World } from './world';

const HALF_WIDTH = 0.3;
const HEIGHT = 1.8;
const EYE = 1.62;
const GRAVITY = 28;
const JUMP_SPEED = 8.6;
const WALK = 4.3;
const SPRINT = 6.2;
/** Altura que se sube andando, sin saltar (una losa o un escalón). */
const STEP = 0.55;

export class Player {
  /** Posición de los pies. */
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  onGround = false;
  /** El cuerpo está metido en el agua: se nada en vez de caminar. */
  inWater = false;
  /** Multiplicador de las opciones: más alto, se gira más rápido. */
  sensitivity = 1;

  private keys = new Set<string>();
  /** Teclas elegidas en las opciones. Las flechas siempre sirven para andar. */
  bindings: KeyMap = defaultKeys();
  /** Mando táctil: palanca (-1 a 1 en cada eje) y botón de saltar. */
  readonly touch = { forward: 0, strafe: 0, jump: false };

  constructor(private world: World, readonly camera: THREE.PerspectiveCamera) {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  look(dx: number, dy: number) {
    const sens = 0.0022 * this.sensitivity;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    const limit = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
  }

  update(dt: number) {
    const keys = this.bindings;
    const down = (code: string, arrow: string) => this.keys.has(code) || this.keys.has(arrow);
    const forward = (down(keys.forward, 'ArrowUp') ? 1 : 0) - (down(keys.back, 'ArrowDown') ? 1 : 0) + this.touch.forward;
    const strafe = (down(keys.right, 'ArrowRight') ? 1 : 0) - (down(keys.left, 'ArrowLeft') ? 1 : 0) + this.touch.strafe;
    const jump = this.keys.has(keys.jump) || this.touch.jump;
    // Con la palanca táctil casi al tope también se corre.
    const pushed = Math.hypot(this.touch.forward, this.touch.strafe) > 0.92;
    // Solo se nada en agua de verdad (mar o río), no en una cueva por debajo del nivel del mar.
    const surface = this.world.waterSurface(Math.floor(this.position.x), Math.floor(this.position.z));
    this.inWater = this.position.y + 0.8 < surface && !!this.world.waterKind(Math.floor(this.position.x), Math.floor(this.position.z));
    let speed = this.keys.has(keys.sprint) || pushed ? SPRINT : WALK;
    if (this.inWater) speed *= 0.55;

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    let mx = -sin * forward + cos * strafe;
    let mz = -cos * forward - sin * strafe;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      // La palanca táctil permite ir despacio; el teclado siempre va a tope.
      const amount = Math.min(1, len);
      mx = (mx / len) * speed * amount;
      mz = (mz / len) * speed * amount;
    }
    // Aceleración suave: en el suelo responde rápido, en el aire se controla menos.
    const accel = this.onGround || this.inWater ? 18 : 6;
    const k = 1 - Math.exp(-accel * dt);
    this.velocity.x += (mx - this.velocity.x) * k;
    this.velocity.z += (mz - this.velocity.z) * k;

    if (this.inWater) {
      // En el agua se flota despacio; con Espacio se nada hacia arriba.
      // Cerca de la superficie, Espacio da un impulso para subir a la orilla.
      if (jump && this.position.y > surface - 1.2) this.velocity.y = 7.5;
      else if (jump) this.velocity.y = Math.min(this.velocity.y + 30 * dt, 3.2);
      else this.velocity.y = Math.max(this.velocity.y - 8 * dt, -2);
    } else {
      if (this.onGround && jump) {
        this.velocity.y = JUMP_SPEED;
        this.onGround = false;
      }
      this.velocity.y = Math.max(this.velocity.y - GRAVITY * dt, -40);
    }

    // Pasos pequeños para no atravesar bloques con fotogramas lentos.
    const steps = Math.ceil(dt / 0.016);
    const sdt = dt / steps;
    const wasOnGround = this.onGround;
    this.onGround = false;
    for (let i = 0; i < steps; i++) {
      const grounded = wasOnGround || this.onGround;
      this.moveAxis(0, this.velocity.x * sdt, grounded);
      this.moveAxis(2, this.velocity.z * sdt, grounded);
      this.moveAxis(1, this.velocity.y * sdt, grounded);
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

  /** Primera caja del mundo que se mete dentro del cuerpo del jugador, o null si no choca con nada. */
  private overlap(): Box | null {
    const p = this.position;
    const x0 = p.x - HALF_WIDTH, x1 = p.x + HALF_WIDTH;
    const y0 = p.y, y1 = p.y + HEIGHT;
    const z0 = p.z - HALF_WIDTH, z1 = p.z + HALF_WIDTH;
    // Se mira un bloque más abajo: las vallas miden bloque y medio.
    for (let y = Math.floor(y0) - 1; y <= Math.floor(y1 - 1e-6); y++) {
      for (let z = Math.floor(z0); z <= Math.floor(z1 - 1e-6); z++) {
        for (let x = Math.floor(x0); x <= Math.floor(x1 - 1e-6); x++) {
          for (const [bx0, by0, bz0, bx1, by1, bz1] of collisionBoxes(this.world.getBlock(x, y, z))) {
            if (x + bx1 > x0 && x + bx0 < x1 && y + by1 > y0 && y + by0 < y1 && z + bz1 > z0 && z + bz0 < z1) {
              return [x + bx0, y + by0, z + bz0, x + bx1, y + by1, z + bz1];
            }
          }
        }
      }
    }
    return null;
  }

  private moveAxis(axis: 0 | 1 | 2, delta: number, grounded: boolean) {
    if (delta === 0) return;
    const p = this.position;
    p.setComponent(axis, p.getComponent(axis) + delta);
    for (let tries = 0; tries < 4; tries++) {
      const hit = this.overlap();
      if (!hit) return;
      const [x0, y0, z0, x1, y1, z1] = hit;
      // Medio bloque (losas y escalones) se sube andando, sin saltar.
      if (axis !== 1 && grounded && y1 - p.y > 0 && y1 - p.y <= STEP) {
        const before = p.y;
        p.y = y1;
        if (!this.overlap()) return;
        p.y = before;
      }
      const eps = 1e-4;
      if (axis === 0) p.x = delta > 0 ? x0 - HALF_WIDTH - eps : x1 + HALF_WIDTH + eps;
      else if (axis === 2) p.z = delta > 0 ? z0 - HALF_WIDTH - eps : z1 + HALF_WIDTH + eps;
      else if (delta > 0) p.y = y0 - HEIGHT - eps;
      else {
        p.y = y1;
        this.onGround = true;
      }
      this.velocity.setComponent(axis, 0);
    }
  }
}
