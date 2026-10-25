import * as THREE from 'three';
import { type Box, collisionBoxes, isSolid } from './blocks';
import { waterFlow } from './fluids';
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
/** Fuerza con la que arrastra la corriente del agua (v3.8): unos 2 bloques por segundo si no te mueves. */
const FLOW_PUSH = 36;

/** Si la tecla se ha pulsado escribiendo en un cuadro de texto. */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
}

export class Player {
  /** Posición de los pies. */
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  onGround = false;
  /** El cuerpo está metido en el agua: se nada en vez de caminar. */
  inWater = false;
  /** Bloques que ha caído al tocar el suelo por última vez (v4.1, para el daño); se pone a 0 al leerlo. */
  private landedFrom = 0;
  /** Lo más alto que ha llegado desde que dejó el suelo. */
  private peakY: number | null = null;
  /** Saltos desde la última vez que se miró (cansan un poco). */
  jumps = 0;
  /** Va corriendo ahora mismo. */
  sprinting = false;
  /** Multiplicador de las opciones: más alto, se gira más rápido. */
  sensitivity = 1;

  private keys = new Set<string>();
  /** Teclas elegidas en las opciones. Las flechas siempre sirven para andar. */
  bindings: KeyMap = defaultKeys();
  /** Mando táctil: palanca (-1 a 1 en cada eje) y botón de saltar. */
  readonly touch = { forward: 0, strafe: 0, jump: false };

  constructor(private world: World, readonly camera: THREE.PerspectiveCamera) {
    window.addEventListener('keydown', (e) => {
      // Lo que se escribe en el chat o en un cartel no mueve al jugador (v4.0).
      if (isTyping(e.target)) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Suelta todas las teclas, por ejemplo al abrir el chat o cualquier ventana. */
  releaseKeys() {
    this.keys.clear();
    this.touch.forward = 0;
    this.touch.strafe = 0;
    this.touch.jump = false;
  }

  look(dx: number, dy: number) {
    const sens = 0.0022 * this.sensitivity;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    const limit = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
  }

  /**
   * `controls` es false mientras hay una ventana abierta (el chat, los bolsillos…): el jugador sigue
   * cayendo y nadando, pero no anda aunque se pulsen teclas.
   */
  update(dt: number, controls = true) {
    const keys = this.bindings;
    const down = (code: string, arrow: string) => controls && (this.keys.has(code) || this.keys.has(arrow));
    const stick = controls ? this.touch : { forward: 0, strafe: 0 };
    const forward = (down(keys.forward, 'ArrowUp') ? 1 : 0) - (down(keys.back, 'ArrowDown') ? 1 : 0) + stick.forward;
    const strafe = (down(keys.right, 'ArrowRight') ? 1 : 0) - (down(keys.left, 'ArrowLeft') ? 1 : 0) + stick.strafe;
    const jump = controls && (this.keys.has(keys.jump) || this.touch.jump);
    // Con la palanca táctil casi al tope también se corre.
    const pushed = Math.hypot(stick.forward, stick.strafe) > 0.92;
    // Se nada con el agua por la cintura (v3.8: el agua son bloques, también la que corre o la que echas con un cubo).
    const p = this.position;
    this.inWater = this.world.inWater(p.x, p.y + 0.8, p.z);
    const surface = this.world.waterSurfaceAbove(p.x, p.y + 0.8, p.z);
    // Con los pies en agua que corre, la corriente te lleva; el agua que cae te empuja hacia abajo.
    const feet = this.world.inWater(p.x, p.y + 0.1, p.z) ? waterFlow((x, y, z) => this.world.getBlock(x, y, z), Math.floor(p.x), Math.floor(p.y + 0.1), Math.floor(p.z)) : null;
    let speed = controls && (this.keys.has(keys.sprint) || pushed) ? SPRINT : WALK;
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
    if (feet) {
      this.velocity.x += feet.x * FLOW_PUSH * dt;
      this.velocity.z += feet.z * FLOW_PUSH * dt;
    }

    if (this.inWater) {
      // En el agua se flota despacio; con Espacio se nada hacia arriba.
      // Cerca de la superficie, Espacio da un impulso para subir a la orilla.
      if (jump && this.position.y > surface - 1.2) this.velocity.y = 7.5;
      else if (jump) this.velocity.y = Math.min(this.velocity.y + 30 * dt, 3.2);
      else this.velocity.y = Math.max(this.velocity.y - 8 * dt, -2);
      if (feet?.down && !jump) this.velocity.y = Math.max(this.velocity.y - 30 * dt, -5);
    } else {
      if (this.onGround && jump) {
        this.velocity.y = JUMP_SPEED;
        this.onGround = false;
        this.jumps++;
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

    // Altura de la caída: desde lo más alto hasta donde se toca el suelo. En el agua no cuenta.
    this.sprinting = speed > WALK && len > 0;
    if (this.onGround || this.inWater) {
      if (this.peakY !== null && this.onGround && !this.inWater) this.landedFrom = Math.max(this.landedFrom, this.peakY - this.position.y);
      this.peakY = null;
    } else this.peakY = Math.max(this.peakY ?? this.position.y, this.position.y);

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
    this.forgetFall();
  }

  /** Lo que ha caído desde la última vez (y lo olvida). */
  takeFall(): number {
    const d = this.landedFrom;
    this.landedFrom = 0;
    return d;
  }

  /** Al ponerle en otro sitio (reaparecer, viajar…) no cuenta como caída. */
  forgetFall() {
    this.peakY = null;
    this.landedFrom = 0;
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
