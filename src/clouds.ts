import * as THREE from 'three';

/** Nubes de bloques que pasan despacio, hechas de varias piezas para que no parezcan cajas sueltas. */
export class Clouds {
  readonly group = new THREE.Group();
  private material = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.55, transparent: true, opacity: 0.85, fog: false });
  private tint = new THREE.Color();

  constructor(count = 32) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const r = (n: number) => {
      const x = Math.sin(n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < count; i++) {
      const cloud = new THREE.Group();
      const w = 10 + r(i) * 14;
      const d = 7 + r(i + 50) * 9;
      // Una base ancha y plana, y encima uno o dos bultos más pequeños.
      const parts: [number, number, number, number, number, number][] = [[0, 0, 0, w, 2, d]];
      const bumps = 1 + Math.floor(r(i + 400) * 2);
      for (let b = 0; b < bumps; b++) {
        const bw = w * (0.35 + r(i * 7 + b) * 0.3);
        const bd = d * (0.4 + r(i * 11 + b) * 0.3);
        parts.push([(r(i * 13 + b) - 0.5) * (w - bw), 1.5, (r(i * 17 + b) - 0.5) * (d - bd), bw, 1.5, bd]);
      }
      for (const [x, y, z, sx, sy, sz] of parts) {
        const m = new THREE.Mesh(geo, this.material);
        m.position.set(x, y, z);
        m.scale.set(sx, sy, sz);
        cloud.add(m);
      }
      cloud.position.set((r(i + 100) - 0.5) * 300, 70 + r(i + 200) * 8, (r(i + 300) - 0.5) * 300);
      this.group.add(cloud);
    }
  }

  /**
   * `night` y `gloom` van de 0 a 1: de noche y con mal tiempo se ven más oscuras.
   * `glow` y `glowColor`: al amanecer y al atardecer se tiñen de naranja.
   */
  update(seconds: number, night: number, gloom: number, glow = 0, glowColor?: THREE.Color) {
    this.group.position.x = (seconds * 1.2) % 300;
    const light = (1 - night * 0.65) * (1 - gloom * 0.35);
    this.tint.setScalar(1);
    if (glowColor) this.tint.lerp(glowColor, glow * 0.6);
    this.material.emissive.copy(this.tint).multiplyScalar(light);
    this.material.color.copy(this.tint).multiplyScalar(light * 0.5);
    this.material.opacity = 0.85 + gloom * 0.15;
  }
}
