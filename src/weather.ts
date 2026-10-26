import * as THREE from 'three';
import type { Weather } from './seasons';
import type { World } from './world';

const COUNT = 1600;
const AREA = 28;
const TOP = 18;

/** Lluvia y nieve: partículas que caen alrededor del jugador. */
export class WeatherFx {
  readonly points: THREE.Points;
  private positions: Float32Array;
  private speeds: Float32Array;
  private material: THREE.PointsMaterial;
  private kind: Weather = 'sol';
  private time = 0;
  /** Lo nublado que está (0 despejado, 1 tormenta), suavizado para que no cambie de golpe. */
  gloom = 0;

  constructor(private world: World) {
    this.positions = new Float32Array(COUNT * 3);
    this.speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * AREA * 2;
      this.positions[i * 3 + 1] = Math.random() * TOP * 2 - TOP;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * AREA * 2;
      this.speeds[i] = 0.8 + Math.random() * 0.4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.85, depthWrite: false });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  get raining() {
    return this.kind === 'lluvia';
  }

  get snowing() {
    return this.kind === 'nieve';
  }

  set(kind: Weather) {
    if (kind === this.kind) return;
    this.kind = kind;
    const rain = kind === 'lluvia';
    this.material.color.setHex(rain ? 0x7fa6cc : 0xffffff);
    this.material.size = rain ? 0.12 : 0.2;
  }

  update(dt: number, center: THREE.Vector3) {
    this.time += dt;
    // Con lluvia o nieve el cielo se cubre del todo (v3.9); con nubes, solo un poco.
    const target = this.kind === 'lluvia' || this.kind === 'nieve' ? 1 : this.kind === 'nubes' ? 0.35 : 0;
    this.gloom += (target - this.gloom) * Math.min(1, dt * 0.5);
    const falling = this.kind === 'lluvia' || this.kind === 'nieve';
    this.points.visible = falling;
    if (!falling) return;

    const rain = this.kind === 'lluvia';
    const p = this.positions;
    this.points.position.set(Math.floor(center.x), Math.floor(center.y), Math.floor(center.z));
    const base = this.points.position;
    for (let i = 0; i < COUNT; i++) {
      const k = i * 3;
      p[k + 1] -= (rain ? 16 : 2.2) * this.speeds[i] * dt;
      if (!rain) p[k] += Math.sin(this.time * 1.3 + i) * 0.3 * dt; // la nieve baila un poco
      const wx = Math.floor(base.x + p[k]);
      const wz = Math.floor(base.z + p[k + 2]);
      // Bajo techo (o al tocar el suelo) la gota vuelve a empezar arriba.
      const ground = this.world.skyHeight(wx, wz) + 1 - base.y;
      if (p[k + 1] < Math.max(-TOP, ground)) {
        p[k] = (Math.random() - 0.5) * AREA * 2;
        p[k + 2] = (Math.random() - 0.5) * AREA * 2;
        p[k + 1] = TOP + Math.random() * 4;
      }
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
