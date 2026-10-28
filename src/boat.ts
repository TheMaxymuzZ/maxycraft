// Tu barco (v4.21): balsa, velero o barco de expedición. Flota en el agua, se lleva con el timón (adelante y
// atrás para la vela o el remo, izquierda y derecha para girar), el viento ayuda o frena y se para al tocar
// tierra. Tiene bodega y, con las mejoras, farol y litera. Aquí está el dibujo y cómo se mueve.

import * as THREE from 'three';
import { isSolid, isWater } from './blocks';
import { type BoatKind, type BoatSave, type UpgradeId, boatSpeed, holdSize, windFactor } from './shipyard';
import { SEA_LEVEL, WATER_SURFACE } from './world';

/** Lo que el barco necesita saber del mundo: qué bloque hay en cada sitio. */
export interface Sea {
  getBlock(x: number, y: number, z: number): number;
}

/** Si el barco cabe en (x, z): agua debajo y nada sólido a la altura del casco. */
export function navigable(sea: Sea, x: number, z: number): boolean {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  if (!isWater(sea.getBlock(bx, SEA_LEVEL, bz))) return false;
  const above = sea.getBlock(bx, SEA_LEVEL + 1, bz);
  return !isSolid(above) || isWater(above);
}

/**
 * Altura del barco sobre la superficie del agua (v5.1: antes iba medio hundido) y de su cubierta, donde se
 * apoyan los pies de quien va a bordo.
 */
const FLOAT: Record<BoatKind, number> = { balsa: 0.04, velero: 0.06, expedicion: 0.06 };
const DECK: Record<BoatKind, number> = { balsa: 0.2, velero: 0.32, expedicion: 0.32 };

/** Medio largo del casco de cada barco (para mirar la proa al chocar). */
const HALF_LENGTH: Record<BoatKind, number> = { balsa: 1, velero: 1.6, expedicion: 2.3 };

/**
 * Un paso del barco: `throttle` de -1 (atrás) a 1 (adelante), `turn` de -1 (izquierda) a 1 (derecha).
 * Devuelve la nueva posición, rumbo y velocidad. Se para (y rebota un poco) si la proa toca tierra.
 */
export function stepBoat(
  sea: Sea,
  s: { x: number; z: number; yaw: number; speed: number },
  kind: BoatKind,
  upgrades: BoatSave['upgrades'],
  wind: { angle: number; strength: number },
  throttle: number,
  turn: number,
  dt: number,
): { x: number; z: number; yaw: number; speed: number; bumped: boolean } {
  const top = boatSpeed(kind, upgrades, windFactor(s.yaw, wind));
  const target = throttle >= 0 ? throttle * top : throttle * top * 0.4;
  // Coge velocidad poco a poco y se frena solo al soltar.
  const k = 1 - Math.exp(-(throttle ? 1.2 : 0.6) * dt);
  let speed = s.speed + (target - s.speed) * k;
  // Gira más cuanto más rápido va (con un mínimo para poder girar parado).
  const yaw = s.yaw - turn * dt * (0.6 + Math.min(1, Math.abs(speed) / 4) * 0.8);
  const dx = -Math.sin(yaw);
  const dz = -Math.cos(yaw);
  const nx = s.x + dx * speed * dt;
  const nz = s.z + dz * speed * dt;
  const ahead = HALF_LENGTH[kind] * Math.sign(speed || 1);
  const ok = navigable(sea, nx + dx * ahead, nz + dz * ahead) && navigable(sea, nx, nz);
  if (!ok) {
    // El casco reforzado rebota menos.
    speed = -speed * (upgrades.casco ? 0.1 : 0.3);
    return { x: s.x, z: s.z, yaw, speed, bumped: Math.abs(s.speed) > 1.5 };
  }
  return { x: nx, z: nz, yaw, speed, bumped: false };
}

export class Boat {
  readonly group = new THREE.Group();
  private hull = new THREE.Group();
  private sail: THREE.Mesh | null = null;
  readonly light = new THREE.PointLight(0xffd890, 0, 12, 1.5);
  kind: BoatKind;
  upgrades: Partial<Record<UpgradeId, number>>;
  x: number;
  z: number;
  yaw: number;
  speed = 0;
  /** Lo que lleva en la bodega. */
  hold: BoatSave['hold'];

  constructor(save: BoatSave) {
    this.kind = save.kind;
    this.upgrades = { ...save.upgrades };
    this.x = save.x;
    this.z = save.z;
    this.yaw = save.yaw;
    this.hold = [];
    this.resizeHold(save.hold);
    this.group.add(this.hull);
    this.light.position.set(0, 1.6, -1.6);
    this.group.add(this.light);
    this.rebuild();
  }

  /** La bodega con el tamaño que toca (al mejorarla se hace más grande sin perder nada). */
  resizeHold(from: BoatSave['hold'] = this.hold) {
    const size = holdSize(this.kind, this.upgrades);
    this.hold = Array.from({ length: Math.max(size, from.length) }, (_, i) => (from[i] && typeof from[i]!.id === 'string' && from[i]!.count > 0 ? { ...from[i]! } : null));
  }

  /** Cambia de barco (o le pone una mejora) y vuelve a dibujarlo. */
  refit(kind: BoatKind, upgrades = this.upgrades) {
    this.kind = kind;
    this.upgrades = { ...upgrades };
    this.resizeHold();
    this.rebuild();
  }

  /** Dónde va sentado quien lo lleva. */
  seat(out: THREE.Vector3): THREE.Vector3 {
    const back = this.kind === 'balsa' ? 0.3 : this.kind === 'velero' ? 1.1 : 1.8;
    return out.set(this.x + Math.sin(this.yaw) * back, WATER_SURFACE + FLOAT[this.kind] + DECK[this.kind], this.z + Math.cos(this.yaw) * back);
  }

  bounds(out: THREE.Box3): THREE.Box3 {
    return out.setFromObject(this.hull);
  }

  save(): BoatSave {
    return { kind: this.kind, upgrades: { ...this.upgrades }, x: this.x, z: this.z, yaw: this.yaw, hold: this.hold.map((s) => (s ? { ...s } : null)) };
  }

  /** Mueve el barco un paso; devuelve true si ha chocado fuerte con la orilla. */
  drive(sea: Sea, wind: { angle: number; strength: number }, throttle: number, turn: number, dt: number): boolean {
    const r = stepBoat(sea, this, this.kind, this.upgrades, wind, throttle, turn, dt);
    this.x = r.x;
    this.z = r.z;
    this.yaw = r.yaw;
    this.speed = r.speed;
    return r.bumped;
  }

  /** Mece el barco en las olas y orienta la vela al viento. `night` de 0 a 1 enciende el farol. */
  update(seconds: number, night: number, wind: { angle: number }) {
    this.group.position.set(this.x, WATER_SURFACE + FLOAT[this.kind] + Math.sin(seconds * 1.6) * 0.04, this.z);
    this.group.rotation.set(Math.sin(seconds * 1.1) * 0.03, this.yaw, Math.sin(seconds * 1.3 + 1) * 0.04);
    if (this.sail) this.sail.rotation.y = Math.max(-0.6, Math.min(0.6, Math.sin(wind.angle + this.yaw) * 0.6));
    this.light.intensity = this.upgrades.farol ? night * 2.2 : 0;
  }

  private rebuild() {
    this.hull.clear();
    this.sail = null;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const mats = new Map<number, THREE.MeshLambertMaterial>();
    const part = (color: number, sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
      let m = mats.get(color);
      if (!m) mats.set(color, (m = new THREE.MeshLambertMaterial({ color })));
      const mesh = new THREE.Mesh(box, m);
      mesh.scale.set(sx, sy, sz);
      mesh.position.set(x, y, z);
      this.hull.add(mesh);
      return mesh;
    };
    const wood = 0xa8783e;
    const dark = 0x6a4a28;
    const iron = 0x8a8e96;
    // Todos miran hacia -z: la proa va delante.
    if (this.kind === 'balsa') {
      for (const x of [-0.6, -0.2, 0.2, 0.6]) part(x === -0.2 || x === 0.6 ? wood : dark, 0.38, 0.3, 2.2, x, 0, 0);
      part(dark, 1.6, 0.12, 0.2, 0, 0.18, -0.8);
      part(dark, 1.6, 0.12, 0.2, 0, 0.18, 0.8);
      part(wood, 0.08, 0.08, 1.6, 0.9, 0.4, 0.2).rotation.x = 0.3; // remo
    } else {
      const big = this.kind === 'expedicion';
      const L = big ? 4.6 : 3.2;
      const Wd = big ? 2 : 1.5;
      const hullColor = this.upgrades.casco ? 0x4a5a6a : big ? 0x7a2a2a : 0xf2f0ea;
      part(hullColor, Wd, 0.5, L, 0, 0, 0);
      part(dark, Wd + 0.06, 0.12, L + 0.04, 0, 0.28, 0); // borda
      part(wood, Wd - 0.3, 0.06, L - 0.3, 0, 0.26, 0); // cubierta
      part(hullColor, Wd * 0.6, 0.4, 0.6, 0, 0.05, -L / 2 - 0.2); // proa
      part(hullColor, Wd * 0.3, 0.35, 0.4, 0, 0.1, -L / 2 - 0.55);
      if (this.upgrades.casco) for (const x of [-Wd / 2, Wd / 2]) part(iron, 0.04, 0.3, L * 0.8, x, -0.05, 0);
      // Mástil y vela (la grande es más alta y de rayas).
      const tall = (big ? 3.6 : 2.6) + (this.upgrades.vela ? 0.6 : 0);
      part(dark, 0.14, tall + 1.4, 0.14, 0, (tall + 1.4) / 2 + 0.3, -0.2);
      const sailMat = new THREE.MeshLambertMaterial({ color: this.upgrades.vela ? 0xe8524a : 0xfaf6ea, side: THREE.DoubleSide });
      // La vela empieza por encima de la cabeza de quien lleva el timón, para que se vea por debajo.
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(Wd * 0.9, tall * 0.5), sailMat);
      sail.geometry.translate(0, 0, 0.3);
      sail.position.set(0, 2.5 + tall * 0.25, -0.2);
      sail.rotation.order = 'YXZ';
      this.hull.add(sail);
      this.sail = sail;
      // Timón detrás.
      part(dark, 0.1, 0.5, 0.1, 0, 0.55, L / 2 - 0.3);
      part(wood, 0.5, 0.5, 0.06, 0, 0.85, L / 2 - 0.3);
      if (big) {
        // Camarote con ventanas.
        part(wood, 1.4, 0.8, 1.2, 0, 0.7, L / 2 - 1.3);
        part(0xa8d8f0, 1.42, 0.25, 0.6, 0, 0.8, L / 2 - 1.3);
        part(0x2f6fb0, 1.6, 0.12, 1.4, 0, 1.15, L / 2 - 1.3);
      }
    }
    if (this.upgrades.farol) {
      part(iron, 0.06, 0.6, 0.06, 0, 0.6, this.kind === 'balsa' ? -1 : -1.4);
      part(0xffe08a, 0.22, 0.26, 0.22, 0, 1, this.kind === 'balsa' ? -1 : -1.4);
    }
    if (this.upgrades.cama) part(0xd04a4a, 0.7, 0.12, 1.1, this.kind === 'balsa' ? 0 : -0.3, 0.32, 0.6);
  }
}
