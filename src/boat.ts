// Tu barco (v4.21): balsa, velero o barco de expedición. Flota en el agua, se lleva con el timón (adelante y
// atrás para la vela o el remo, izquierda y derecha para girar), el viento ayuda o frena y se para al tocar
// tierra. Tiene bodega y, con las mejoras, farol y litera. Aquí está el dibujo y cómo se mueve.

import * as THREE from 'three';
import { isSolid, isWater } from './blocks';
import { VoxelKit, hullWidth } from './voxelKit';
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
  /** Las velas (cada una gira con el viento alrededor de su mástil). */
  private sails: THREE.Object3D[] = [];
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
    const swing = Math.max(-0.6, Math.min(0.6, Math.sin(wind.angle + this.yaw) * 0.6));
    for (const sail of this.sails) sail.rotation.y = swing;
    this.light.intensity = this.upgrades.farol ? night * 2.2 : 0;
  }

  private rebuild() {
    this.hull.clear();
    this.sails = [];
    const kit = new VoxelKit(this.hull);
    const wood = 0xb9824f;
    const dark = 0x6a4a28;
    const rope = 0xd8c08a;
    const iron = 0x8a8e96;
    const lantern = (z: number, y: number) => {
      kit.box(iron, 0.06, 0.6, 0.06, 0, y + 0.3, z);
      kit.box(0x3a3e44, 0.26, 0.04, 0.26, 0, y + 0.62, z);
      kit.glow(0xffe08a, 0.18, 0.2, 0.18, 0, y + 0.74, z);
      kit.box(0x3a3e44, 0.24, 0.05, 0.24, 0, y + 0.86, z);
    };
    // Todos miran hacia -z: la proa va delante.
    if (this.kind === 'balsa') {
      // Cinco troncos atados con cuerda, con los cortes claros; un remo, un banderín y una caja.
      [-0.64, -0.32, 0, 0.32, 0.64].forEach((x, i) => {
        const len = i === 0 || i === 4 ? 2.0 : 2.2;
        kit.box(i % 2 ? 0x8a5a32 : 0x9a6a3a, 0.32, 0.3, len, x, 0, 0);
        for (const z of [-len / 2, len / 2]) kit.box(0xd8b07a, 0.26, 0.24, 0.02, x, 0, z);
      });
      for (const z of [-0.7, 0.7]) kit.box(rope, 1.66, 0.06, 0.1, 0, 0.16, z);
      kit.box(0xc8a070, 0.4, 0.3, 0.36, -0.4, 0.3, -0.55);
      kit.box(dark, 0.42, 0.04, 0.04, -0.4, 0.38, -0.55);
      kit.box(dark, 0.06, 1.3, 0.06, 0.6, 0.8, -0.85);
      kit.box(0xe8524a, 0.02, 0.24, 0.36, 0.6, 1.3, -0.68);
      kit.rod(wood, 0.07, [0.85, 0.75, 0.6], [1.0, -0.1, -0.5]);
      kit.box(wood, 0.04, 0.3, 0.18, 1.0, -0.12, -0.55);
    } else {
      const big = this.kind === 'expedicion';
      const L = big ? 4.6 : 3.2;
      const Wd = big ? 2 : 1.5;
      const top = this.upgrades.casco ? 0x5a6a7a : big ? 0x1f3f5f : 0xf4f1ea;
      const stripe = big ? 0xf4f1ea : 0x2f6fb0;
      const bottom = big ? 0x7a2a2a : 0xc0392b;
      // El casco, en rebanadas que se estrechan hacia la proa: costado, franja, obra viva roja, cubierta y regala.
      const n = Math.round(L / 0.2);
      const s = L / n;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const z = L / 2 - (i + 0.5) * s;
        const w = Wd * hullWidth(t);
        kit.box(top, w, 0.4, s + 0.01, 0, 0.06, z);
        kit.box(stripe, w + 0.02, 0.07, s + 0.01, 0, 0.12, z);
        kit.box(bottom, w * 0.74, 0.24, s + 0.01, 0, -0.2, z);
        kit.box(dark, w * 0.2, 0.12, s + 0.01, 0, -0.36, z); // quilla
        kit.box(i % 2 ? 0xc89a64 : 0xbf8f58, Math.max(0.05, w - 0.16), 0.04, s + 0.01, 0, 0.28, z);
        for (const side of [-1, 1]) kit.box(big ? wood : dark, 0.08, 0.1, s + 0.01, side * (w / 2 - 0.04), 0.33, z);
        if (this.upgrades.casco && i % 3 === 1) kit.box(0x3a4048, w + 0.04, 0.3, 0.04, 0, 0.02, z);
        if (big && i % 3 === 1 && t > 0.15 && t < 0.8) for (const side of [-1, 1]) kit.box(0x22303a, 0.02, 0.1, 0.1, side * (w / 2 + 0.005), 0.02, z);
      }
      // Espejo de popa, roda y botalón.
      kit.box(dark, Wd * 0.86, 0.44, 0.06, 0, 0.1, L / 2);
      kit.rod(dark, 0.1, [0, -0.3, -L / 2 + 0.05], [0, 0.42, -L / 2 - 0.12]);
      kit.rod(wood, 0.07, [0, 0.36, -L / 2 + 0.3], [0, 0.55, -L / 2 - 0.8]);
      // Mástiles con la vela mayor (gira con el viento) y la botavara por encima de quien lleva el timón.
      const tall = (big ? 3.4 : 2.6) + (this.upgrades.vela ? 0.6 : 0);
      const cloth = this.upgrades.vela ? 0xe8524a : 0xfaf6ea;
      const masts = big ? [{ z: -0.5, h: tall, boom: 1.6 }, { z: -1.6, h: tall * 0.7, boom: 0.9 }] : [{ z: -0.2, h: tall, boom: 1.3 }];
      const foot = 2.5;
      for (const [k, m] of masts.entries()) {
        const head = foot + m.h * 0.75;
        kit.box(dark, 0.14, head + 0.5, 0.14, 0, (head + 0.5) / 2 + 0.3, m.z);
        const sail = new THREE.Group();
        sail.position.set(0, 0, m.z);
        sail.rotation.order = 'YXZ';
        kit.tri(cloth, [0, foot, 0.08], [0, head, 0.08], [0, foot, m.boom], sail);
        if (this.upgrades.vela) kit.tri(0xfaf6ea, [0.005, foot + (head - foot) * 0.35, 0.08], [0.005, foot + (head - foot) * 0.5, 0.08], [0.005, foot + (head - foot) * 0.35, m.boom * 0.65], sail);
        kit.rod(dark, 0.08, [0, foot - 0.05, 0.05], [0, foot - 0.05, m.boom + 0.05], sail);
        this.hull.add(sail);
        this.sails.push(sail);
        // Obenques a los costados y un estay a la proa (o al otro palo).
        for (const side of [-1, 1]) kit.rod(0x4a3a2a, 0.025, [0, head, m.z], [side * Wd * 0.45, 0.36, m.z + 0.25]);
        if (k === masts.length - 1) kit.rod(0x4a3a2a, 0.025, [0, head, m.z], [0, 0.55, -L / 2 - 0.8]);
        // Banderín arriba.
        kit.box(k === 0 ? 0xf2c230 : 0xe8524a, 0.02, 0.18, 0.4, 0, head + 0.55, m.z + 0.22);
      }
      if (big) {
        // Cofa del palo mayor.
        const head = foot + tall * 0.75;
        kit.box(wood, 0.5, 0.1, 0.5, 0, head + 0.1, -0.5);
        for (const [x, z] of [[-0.22, 0], [0.22, 0], [0, -0.22], [0, 0.22]]) kit.box(dark, x ? 0.06 : 0.5, 0.18, z ? 0.06 : 0.5, x, head + 0.24, -0.5 + z);
        // Camarote con ventanas, puerta, tejado blanco y chimenea.
        const cz = 0.7;
        kit.box(0xa8783e, 1.3, 0.8, 1.1, 0, 0.7, cz);
        for (const side of [-1, 1]) for (const z of [cz - 0.25, cz + 0.25]) kit.box(0xa8d8f0, 0.02, 0.26, 0.3, side * 0.66, 0.82, z);
        kit.box(dark, 0.4, 0.6, 0.02, 0, 0.6, cz - 0.56);
        kit.box(0xf2c230, 0.05, 0.05, 0.02, 0.12, 0.6, cz - 0.575);
        kit.box(0xf4f1ea, 1.5, 0.08, 1.3, 0, 1.14, cz);
        kit.box(0x2f6fb0, 1.52, 0.04, 1.32, 0, 1.1, cz);
        kit.box(0x3a3e44, 0.14, 0.4, 0.14, 0.4, 1.36, cz + 0.3);
        // Salvavidas a los lados del camarote.
        for (const side of [-1, 1]) {
          const x = side * 0.67;
          kit.box(0xe8524a, 0.04, 0.06, 0.3, x, 0.92, cz + 0.05);
          kit.box(0xe8524a, 0.04, 0.06, 0.3, x, 0.66, cz + 0.05);
          kit.box(0xf4f1ea, 0.04, 0.2, 0.06, x, 0.79, cz - 0.08);
          kit.box(0xf4f1ea, 0.04, 0.2, 0.06, x, 0.79, cz + 0.18);
        }
        // Rueda del timón.
        kit.box(dark, 0.12, 0.7, 0.12, 0, 0.65, 1.55);
        const wz = 1.49;
        kit.box(wood, 0.62, 0.06, 0.05, 0, 1.0 + 0.28, wz);
        kit.box(wood, 0.62, 0.06, 0.05, 0, 1.0 - 0.28, wz);
        kit.box(wood, 0.06, 0.62, 0.05, -0.28, 1.0, wz);
        kit.box(wood, 0.06, 0.62, 0.05, 0.28, 1.0, wz);
        kit.box(dark, 0.8, 0.04, 0.04, 0, 1.0, wz - 0.01);
        kit.box(dark, 0.04, 0.8, 0.04, 0, 1.0, wz - 0.01);
        // Ancla a babor y barriles en cubierta.
        kit.box(0x3a3e44, 0.04, 0.3, 0.06, -Wd * 0.36, 0.2, -L / 2 + 0.7);
        kit.box(0x3a3e44, 0.04, 0.06, 0.22, -Wd * 0.36, 0.06, -L / 2 + 0.7);
        for (const x of [-0.55, 0.55]) {
          kit.box(0xa8743e, 0.3, 0.36, 0.3, x, 0.48, -1.0);
          kit.box(0x50555c, 0.32, 0.03, 0.32, x, 0.42, -1.0);
          kit.box(0x50555c, 0.32, 0.03, 0.32, x, 0.58, -1.0);
        }
      } else {
        // Caña del timón, la pala detrás y una bañera de madera para el patrón.
        kit.box(dark, 0.06, 0.5, 0.3, 0, -0.05, L / 2 + 0.12);
        kit.rod(wood, 0.06, [0, 0.42, L / 2 + 0.05], [0, 0.55, L / 2 - 0.65]);
        kit.box(0x8a5a32, 0.9, 0.08, 0.6, 0, 0.33, L / 2 - 0.65);
        kit.box(0xf4f1ea, 0.7, 0.24, 0.5, 0, 0.42, -0.85);
        kit.box(0xa8d8f0, 0.02, 0.1, 0.24, 0.355, 0.46, -0.85);
        kit.box(0xa8d8f0, 0.02, 0.1, 0.24, -0.355, 0.46, -0.85);
      }
    }
    if (this.upgrades.farol) lantern(this.kind === 'balsa' ? -0.95 : this.kind === 'velero' ? -1.35 : -1.9, this.kind === 'balsa' ? 0.15 : 0.3);
    if (this.upgrades.cama) {
      const [x, z] = this.kind === 'balsa' ? [0, 0.3] : this.kind === 'velero' ? [-0.35, 0.45] : [0, -0.2];
      kit.box(dark, 0.74, 0.1, 1.14, x, 0.33, z);
      kit.box(0xf4f1e8, 0.66, 0.08, 1.06, x, 0.41, z);
      kit.box(0xd04a4a, 0.68, 0.06, 0.7, x, 0.47, z + 0.17);
      kit.box(0xffffff, 0.4, 0.08, 0.22, x, 0.48, z - 0.38);
    }
  }
}
