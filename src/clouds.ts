import * as THREE from 'three';

/** Nubes de bloques que pasan despacio. */
export class Clouds {
  readonly group = new THREE.Group();
  private material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: false });

  constructor(count = 40) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const r = (n: number) => {
      const x = Math.sin(n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < count; i++) {
      const c = new THREE.Mesh(geo, this.material);
      c.scale.set(8 + r(i) * 14, 2, 6 + r(i + 50) * 10);
      c.position.set((r(i + 100) - 0.5) * 300, 70 + r(i + 200) * 6, (r(i + 300) - 0.5) * 300);
      this.group.add(c);
    }
  }

  /** `night` y `gloom` van de 0 a 1: de noche y con mal tiempo se ven más oscuras. */
  update(seconds: number, night: number, gloom: number) {
    this.group.position.x = (seconds * 1.2) % 300;
    this.material.color.setScalar((1 - night * 0.6) * (1 - gloom * 0.35));
    this.material.opacity = 0.8 + gloom * 0.2;
  }
}
