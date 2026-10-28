import * as THREE from 'three';
import type { FxWeather } from './biomeFx';
import type { World } from './world';

const COUNT = 1600;
/** Gotas de lluvia: menos que copos, porque cada una es una raya. */
const RAIN_COUNT = 1400;
const AREA = 28;
const TOP = 18;
/** Largo de una gota (bloques) y lo que la tuerce el viento. */
const DROP_LENGTH = 0.7;
const DROP_SLANT = 0.08;

/**
 * Lluvia y nieve (y, desde la v4.19, tormentas de arena y ventiscas): partículas que caen alrededor del jugador.
 * v5.0.1: las partículas viven en el mundo (no pegadas al jugador), así al andar no se van con él; las que se
 * quedan atrás reaparecen delante. La lluvia son rayas alargadas, no puntos como la nieve.
 */
export class WeatherFx {
  /** Todo lo que se añade a la escena (copos y gotas). */
  readonly group = new THREE.Group();
  /** Copos, arena, ceniza, luces y esporas. */
  readonly points: THREE.Points;
  /** Gotas de lluvia. */
  readonly drops: THREE.LineSegments;
  private positions: Float32Array;
  private speeds: Float32Array;
  private dropPos: Float32Array;
  private dropLines: Float32Array;
  private material: THREE.PointsMaterial;
  private kind: FxWeather = 'sol';
  private time = 0;
  /** Altura del techo por columna, guardada un rato para no preguntar al mundo por cada partícula cada vez. */
  private roofs = new Map<number, number>();
  private roofAge = 0;
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

    this.dropPos = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.dropPos[i * 3] = (Math.random() - 0.5) * AREA * 2;
      this.dropPos[i * 3 + 1] = Math.random() * TOP * 2 - TOP;
      this.dropPos[i * 3 + 2] = (Math.random() - 0.5) * AREA * 2;
    }
    this.dropLines = new Float32Array(RAIN_COUNT * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(this.dropLines, 3));
    this.drops = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0xa9c4e0, transparent: true, opacity: 0.6, depthWrite: false }));
    this.drops.frustumCulled = false;
    this.drops.visible = false;
    this.group.add(this.points, this.drops);
  }

  get raining() {
    return this.kind === 'lluvia';
  }

  get snowing() {
    return this.kind === 'nieve' || this.kind === 'ventisca';
  }

  get current(): FxWeather {
    return this.kind;
  }

  set(kind: FxWeather) {
    if (kind === this.kind) return;
    this.kind = kind;
    const COLORS: Partial<Record<FxWeather, number>> = { arena: 0xd8b273, ceniza: 0x6a6460, luces: 0x9ff0ff, esporas: 0xe6d2f4 };
    this.material.color.setHex(COLORS[kind] ?? 0xffffff);
    this.material.size = kind === 'arena' || kind === 'luces' ? 0.14 : kind === 'esporas' ? 0.1 : 0.2;
  }

  /** Altura (relativa a nada: del mundo) por encima de la cual cae la lluvia en la columna (x, z). */
  private roof(x: number, z: number): number {
    const key = (x & 0xffff) * 65536 + (z & 0xffff);
    let h = this.roofs.get(key);
    if (h === undefined) {
      h = this.world.skyHeight(x, z) + 1;
      this.roofs.set(key, h);
    }
    return h;
  }

  update(dt: number, center: THREE.Vector3) {
    this.time += dt;
    // Con lluvia o nieve el cielo se cubre del todo (v3.9); con nubes, solo un poco.
    const target = this.kind === 'lluvia' || this.kind === 'nieve' || this.kind === 'ventisca' ? 1 : this.kind === 'arena' || this.kind === 'ceniza' ? 0.6 : this.kind === 'nubes' ? 0.35 : 0;
    this.gloom += (target - this.gloom) * Math.min(1, dt * 0.5);
    const rain = this.kind === 'lluvia';
    const falling = this.kind !== 'sol' && this.kind !== 'nubes';
    this.points.visible = falling && !rain;
    this.drops.visible = rain;
    if (!falling) return;
    // Lo que se construye o se rompe cambia los techos: se vuelven a mirar cada poco.
    this.roofAge += dt;
    if (this.roofAge > 1 || this.roofs.size > 8000) {
      this.roofAge = 0;
      this.roofs.clear();
    }
    if (rain) this.updateRain(dt, center);
    else this.updateFlakes(dt, center);
  }

  /** Vuelve a meter en el cuadro alrededor del jugador lo que se ha quedado atrás (sin moverlo con él). */
  private wrap(p: Float32Array, k: number, center: THREE.Vector3): boolean {
    let moved = false;
    for (const a of [0, 2]) {
      const lo = (a === 0 ? center.x : center.z) - AREA;
      const v = p[k + a];
      if (v >= lo && v < lo + AREA * 2) continue;
      p[k + a] = lo + ((((v - lo) % (AREA * 2)) + AREA * 2) % (AREA * 2));
      moved = true;
    }
    return moved;
  }

  private updateRain(dt: number, center: THREE.Vector3) {
    const p = this.dropPos;
    const l = this.dropLines;
    for (let i = 0; i < RAIN_COUNT; i++) {
      const k = i * 3;
      p[k + 1] -= 18 * dt;
      p[k] += 18 * DROP_SLANT * dt;
      const moved = this.wrap(p, k, center);
      const ground = this.roof(Math.floor(p[k]), Math.floor(p[k + 2]));
      // Bajo techo (o al tocar el suelo) la gota vuelve a empezar arriba.
      if (p[k + 1] < Math.max(center.y - TOP, ground) || p[k + 1] > center.y + TOP + 4 || (moved && p[k + 1] < ground)) {
        p[k + 1] = Math.max(center.y + TOP * (0.3 + Math.random() * 0.7), ground + 1);
      }
      const j = i * 6;
      l[j] = p[k];
      l[j + 1] = p[k + 1];
      l[j + 2] = p[k + 2];
      l[j + 3] = p[k] - DROP_LENGTH * DROP_SLANT;
      l[j + 4] = p[k + 1] + DROP_LENGTH;
      l[j + 5] = p[k + 2];
    }
    (this.drops.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateFlakes(dt: number, center: THREE.Vector3) {
    const p = this.positions;
    // La arena y la ventisca van casi de lado, empujadas por el viento.
    const gale = this.kind === 'arena' || this.kind === 'ventisca';
    // Las luces y las esporas flotan despacio y suben un poco; la ceniza cae muy despacio.
    const floating = this.kind === 'luces' || this.kind === 'esporas';
    const fall = gale ? 1.2 : floating ? -0.25 : this.kind === 'ceniza' ? 0.9 : 2.2;
    for (let i = 0; i < COUNT; i++) {
      const k = i * 3;
      p[k + 1] -= fall * this.speeds[i] * dt;
      if (floating) {
        p[k] += Math.sin(this.time * 0.7 + i) * 0.5 * dt;
        p[k + 2] += Math.cos(this.time * 0.6 + i * 1.3) * 0.5 * dt;
      } else if (gale) p[k] += 14 * this.speeds[i] * dt;
      else p[k] += Math.sin(this.time * 1.3 + i) * 0.3 * dt; // la nieve baila un poco
      this.wrap(p, k, center);
      const ground = this.roof(Math.floor(p[k]), Math.floor(p[k + 2]));
      if (p[k + 1] < Math.max(center.y - TOP, ground) || p[k + 1] > center.y + TOP + 4) {
        // Lo que flota vuelve a salir cerca del suelo; lo que cae, desde arriba.
        p[k + 1] = floating ? ground + Math.random() * 8 : Math.max(center.y + TOP * (0.3 + Math.random() * 0.7), ground + 1);
      }
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
