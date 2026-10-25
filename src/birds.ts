import * as THREE from 'three';
import { SEA_LEVEL } from './world';

interface Bird {
  mesh: THREE.Group;
  wings: THREE.Object3D[];
  /** Vuelo en círculo alrededor del centro de su bandada. */
  radius: number;
  speed: number;
  phase: number;
  height: number;
  flock: number;
}

interface Flock {
  kind: 'pajaro' | 'gaviota';
  center: THREE.Vector3;
  target: THREE.Vector3;
}

/** Pájaros que vuelan en círculos sobre la isla y gaviotas sobre el mar. Solo de día y solo de adorno. */
export class Birds {
  readonly group = new THREE.Group();
  private birds: Bird[] = [];
  private flocks: Flock[] = [];
  private timer = 0;

  constructor() {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const mat = (color: number) => new THREE.MeshLambertMaterial({ color });
    const looks = {
      pajaro: { body: mat(0x7a5a3a), wing: mat(0x5e4630), beak: mat(0xe8b040), size: 0.7 },
      gaviota: { body: mat(0xf4f4f0), wing: mat(0xb8bec8), beak: mat(0xf0a020), size: 1 },
    };
    const kinds: Flock['kind'][] = ['pajaro', 'pajaro', 'gaviota'];
    kinds.forEach((kind, f) => {
      this.flocks.push({ kind, center: new THREE.Vector3(), target: new THREE.Vector3() });
      const look = looks[kind];
      for (let i = 0; i < 4; i++) {
        const bird = new THREE.Group();
        const body = new THREE.Mesh(box, look.body);
        body.scale.set(0.22, 0.18, 0.5);
        const beak = new THREE.Mesh(box, look.beak);
        beak.scale.set(0.08, 0.06, 0.12);
        beak.position.set(0, 0, -0.3);
        const wings = [-1, 1].map((side) => {
          // Cada ala gira desde el hombro: se mueve la caja hacia fuera dentro de un grupo pivote.
          const w = new THREE.Mesh(box, look.wing);
          w.scale.set(0.42, 0.04, 0.24);
          w.position.x = side * 0.21;
          const pivot = new THREE.Group();
          pivot.add(w);
          pivot.position.x = side * 0.1;
          bird.add(pivot);
          return pivot;
        });
        bird.add(body, beak);
        bird.scale.setScalar(look.size);
        this.group.add(bird);
        this.birds.push({ mesh: bird, wings, radius: 5 + Math.random() * 6, speed: 0.5 + Math.random() * 0.3, phase: Math.random() * Math.PI * 2, height: Math.random() * 3, flock: f });
      }
    });
  }

  /** `night` de 0 a 1: de noche se van a dormir. `seaAt` dice si una columna es mar, para las gaviotas. */
  update(dt: number, seconds: number, player: THREE.Vector3, night: number, seaAt: (x: number, z: number) => boolean) {
    this.group.visible = night < 0.6;
    if (!this.group.visible) return;

    // Cada rato cada bandada elige otro sitio cerca del jugador para ir hacia allí.
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 12;
      for (const f of this.flocks) {
        for (let tries = 0; tries < 20; tries++) {
          const a = Math.random() * Math.PI * 2;
          const d = 15 + Math.random() * 30;
          const x = player.x + Math.cos(a) * d;
          const z = player.z + Math.sin(a) * d;
          if ((f.kind === 'gaviota') !== seaAt(Math.floor(x), Math.floor(z)) && tries < 19) continue;
          f.target.set(x, SEA_LEVEL + (f.kind === 'gaviota' ? 12 : 18), z);
          break;
        }
        if (f.center.lengthSq() === 0) f.center.copy(f.target);
      }
    }
    for (const f of this.flocks) f.center.lerp(f.target, Math.min(1, dt * 0.08));

    for (const b of this.birds) {
      const c = this.flocks[b.flock].center;
      const angle = seconds * b.speed + b.phase;
      const x = c.x + Math.cos(angle) * b.radius;
      const z = c.z + Math.sin(angle) * b.radius;
      b.mesh.position.set(x, c.y + b.height + Math.sin(seconds * 1.3 + b.phase) * 0.6, z);
      // Mirando hacia donde vuela (tangente al círculo).
      b.mesh.rotation.y = Math.PI - angle;
      const flap = Math.sin(seconds * 10 + b.phase * 3) * 0.7;
      b.wings[0].rotation.z = -flap;
      b.wings[1].rotation.z = flap;
    }
  }
}
