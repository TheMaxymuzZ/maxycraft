import * as THREE from 'three';

/** Lado del cuadrado de cielo con nubes alrededor del jugador. */
const FIELD = 420;
/** Bloques por segundo que el viento mueve las nubes. */
const DRIFT = 1.6;

interface Cloud {
  group: THREE.Group;
  /** Posición dentro del cuadrado de nubes (sin contar el viento). */
  x: number;
  z: number;
  /** Cada nube aparece y se deshace despacio: de 0 (no se ve) a 1. */
  fade: number;
  /** Cuánto le importa a esta nube que el cielo esté despejado: las de valor alto solo salen con el cielo cubierto. */
  rank: number;
  /** Cada nube crece y mengua un poco con el tiempo, como las de verdad. */
  pulse: number;
}

/**
 * Nubes de bloques que pasan con el viento (v4.0). Cada nube que sale por un lado vuelve a entrar por el otro
 * con otra forma, y según el día el cielo está más despejado o más cubierto, así nunca se ve el mismo cielo.
 */
export class Clouds {
  readonly group = new THREE.Group();
  private material = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.55, transparent: true, opacity: 0.85, fog: false });
  private geo = new THREE.BoxGeometry(1, 1, 1);
  private tint = new THREE.Color();
  private clouds: Cloud[] = [];
  private drift = 0;
  private lastSeconds: number | null = null;

  constructor(count = 40, private random: () => number = Math.random) {
    for (let i = 0; i < count; i++) {
      const cloud: Cloud = { group: new THREE.Group(), x: (random() - 0.5) * FIELD, z: (random() - 0.5) * FIELD, fade: 0, rank: i / count, pulse: random() * Math.PI * 2 };
      this.reshape(cloud);
      cloud.fade = cloud.rank < 0.6 ? 1 : 0;
      this.group.add(cloud.group);
      this.clouds.push(cloud);
    }
  }

  /** Le da a la nube una forma nueva: una base ancha y plana y encima unos bultos más pequeños. */
  private reshape(c: Cloud) {
    const r = this.random;
    c.group.clear();
    const w = 8 + r() * 18;
    const d = 6 + r() * 11;
    const parts: [number, number, number, number, number, number][] = [[0, 0, 0, w, 2, d]];
    const bumps = 1 + Math.floor(r() * 3);
    for (let b = 0; b < bumps; b++) {
      const bw = w * (0.3 + r() * 0.35);
      const bd = d * (0.35 + r() * 0.35);
      parts.push([(r() - 0.5) * (w - bw), 1.5, (r() - 0.5) * (d - bd), bw, 1.5 + r(), bd]);
    }
    // A veces un trozo más pegado a un lado, para que no todas sean simétricas.
    if (r() < 0.5) parts.push([(r() < 0.5 ? -1 : 1) * w * 0.5, 0, (r() - 0.5) * d * 0.5, w * 0.4, 1.5, d * 0.5]);
    for (const [x, y, z, sx, sy, sz] of parts) {
      const m = new THREE.Mesh(this.geo, this.material);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      c.group.add(m);
    }
    c.group.position.y = 68 + r() * 12;
    c.group.rotation.y = r() < 0.5 ? 0 : Math.PI / 2;
    c.fade = 0;
  }

  /**
   * `night` y `gloom` van de 0 a 1: de noche y con mal tiempo se ven más oscuras.
   * `glow` y `glowColor`: al amanecer y al atardecer se tiñen de naranja.
   * `center`: dónde está el jugador, para que siempre haya nubes encima.
   * `cover`: cuánto cielo tapan las nubes (de 0, despejado, a 1, cubierto).
   */
  update(seconds: number, night: number, gloom: number, glow = 0, glowColor?: THREE.Color, center?: THREE.Vector3, cover = 0.6) {
    const dt = this.lastSeconds === null ? 0 : Math.max(0, Math.min(0.5, seconds - this.lastSeconds));
    this.lastSeconds = seconds;
    this.drift += dt * DRIFT * (1 + gloom);
    const cx = center?.x ?? 0;
    const cz = center?.z ?? 0;
    const half = FIELD / 2;
    const wanted = Math.max(cover, gloom);
    for (const c of this.clouds) {
      // Posición respecto al jugador, dando la vuelta al cuadrado: la que sale por un lado entra por el otro.
      let rx = c.x + this.drift - cx;
      let rz = c.z - cz;
      const wrapX = Math.floor((rx + half) / FIELD);
      const wrapZ = Math.floor((rz + half) / FIELD);
      if (wrapX || wrapZ) {
        c.x -= wrapX * FIELD;
        c.z -= wrapZ * FIELD;
        rx -= wrapX * FIELD;
        rz -= wrapZ * FIELD;
        this.reshape(c);
      }
      c.group.position.x = cx + rx;
      c.group.position.z = cz + rz;
      // Solo se ven tantas nubes como diga lo cubierto que está el cielo; aparecen y se van poco a poco.
      const show = c.rank < wanted ? 1 : 0;
      c.fade += (show - c.fade) * Math.min(1, dt * 0.25);
      // Cerca del borde se deshacen, para que no aparezcan de golpe.
      const edge = Math.min(1, (half - Math.max(Math.abs(rx), Math.abs(rz))) / 30);
      const s = c.fade * Math.max(0, edge);
      const breathe = 1 + Math.sin(seconds * 0.05 + c.pulse) * 0.08;
      c.group.scale.set(s * breathe, Math.max(0.001, s), s * (2 - breathe));
      c.group.visible = s > 0.02;
    }
    const light = (1 - night * 0.65) * (1 - gloom * 0.35);
    this.tint.setScalar(1);
    if (glowColor) this.tint.lerp(glowColor, glow * 0.6);
    this.material.emissive.copy(this.tint).multiplyScalar(light);
    this.material.color.copy(this.tint).multiplyScalar(light * 0.5);
    this.material.opacity = 0.85 + gloom * 0.15;
  }

  /** Cuántas nubes se ven ahora mismo (para las pruebas). */
  get visibleCount(): number {
    return this.clouds.filter((c) => c.group.visible).length;
  }
}

/** Lo cubierto que está el cielo según el día y la hora: cambia despacio, unos días más despejado y otros más nublado. */
export function cloudCover(day: number, hour: number, seed: number): number {
  const at = (d: number) => {
    const x = Math.sin((d + seed * 0.001) * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const t = hour / 24;
  // Mezcla suave entre el valor de hoy y el de mañana.
  const k = t * t * (3 - 2 * t);
  const base = at(day) * (1 - k) + at(day + 1) * k;
  return 0.2 + base * 0.7;
}
