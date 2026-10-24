import * as THREE from 'three';

// Color del cielo a lo largo del día, por hora local. Se interpola entre puntos.
const SKY_KEYS: [number, number][] = [
  [0, 0x1b2a4a],
  [5, 0x1b2a4a],
  [6, 0xf2b38a],
  [7.5, 0xa8dcf5],
  [17, 0xa8dcf5],
  [18.5, 0xf39a7a],
  [19.5, 0x3b3f6e],
  [20.5, 0x1b2a4a],
  [24, 0x1b2a4a],
];

// Cuánta luz hay (1 de día, menos de noche pero sin llegar a ver negro).
const LIGHT_KEYS: [number, number][] = [
  [0, 0.38],
  [5, 0.38],
  [7, 1],
  [18, 1],
  [20, 0.38],
  [24, 0.38],
];

const SUNRISE = 6;
const SUNSET = 19;

function sample<T>(keys: [number, T][], h: number, lerp: (a: T, b: T, t: number) => T): T {
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, v0] = keys[i];
    const [h1, v1] = keys[i + 1];
    if (h >= h0 && h <= h1) return lerp(v0, v1, (h - h0) / (h1 - h0));
  }
  return keys[keys.length - 1][1];
}

const ca = new THREE.Color();
const cb = new THREE.Color();
function lerpColor(a: number, b: number, t: number): number {
  return ca.setHex(a).lerp(cb.setHex(b), t).getHex();
}

export class Sky {
  readonly color = new THREE.Color();
  /** 0 de día, 1 de noche cerrada. */
  night = 0;
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private stars: THREE.Points;
  private group = new THREE.Group();

  constructor(scene: THREE.Scene, private hemi: THREE.HemisphereLight, private sun: THREE.DirectionalLight) {
    const sq = new THREE.PlaneGeometry(1, 1);
    this.sunMesh = new THREE.Mesh(sq, new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }));
    this.sunMesh.scale.setScalar(36);
    this.moonMesh = new THREE.Mesh(sq, new THREE.MeshBasicMaterial({ color: 0xe8ecf5, fog: false }));
    this.moonMesh.scale.setScalar(24);

    const pts: number[] = [];
    for (let i = 0; i < 500; i++) {
      // Puntos repartidos en la media esfera de arriba.
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * 0.9 + 0.08;
      const r = 300;
      pts.push(Math.cos(u) * Math.cos(v * Math.PI / 2) * r, Math.sin(v * Math.PI / 2) * r, Math.sin(u) * Math.cos(v * Math.PI / 2) * r);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }),
    );

    this.group.add(this.sunMesh, this.moonMesh, this.stars);
    scene.add(this.group);
  }

  /** Hora local en horas decimales (por ejemplo 14.5 son las 14:30). */
  static hourOf(date: Date): number {
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  }

  update(hour: number, camera: THREE.Camera) {
    this.color.setHex(sample(SKY_KEYS, hour, lerpColor));
    const light = sample(LIGHT_KEYS, hour, (a, b, t) => a + (b - a) * t);
    this.night = 1 - (light - 0.38) / 0.62;

    // El sol cruza el cielo de este a oeste entre el amanecer y el atardecer.
    const day = (hour - SUNRISE) / (SUNSET - SUNRISE);
    const angle = day * Math.PI;
    const sunDir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0.35).normalize();

    this.group.position.copy(camera.position);
    this.sunMesh.position.copy(sunDir).multiplyScalar(250);
    this.moonMesh.position.copy(sunDir).multiplyScalar(-250);
    this.sunMesh.lookAt(camera.position);
    this.moonMesh.lookAt(camera.position);
    this.sunMesh.visible = sunDir.y > -0.1;
    this.moonMesh.visible = sunDir.y < 0.1;
    (this.stars.material as THREE.PointsMaterial).opacity = this.night;
    this.stars.visible = this.night > 0.02;

    // Luces: de noche, un tono azulado suave para que se siga viendo la isla.
    this.hemi.intensity = 0.55 + light * 1.05;
    this.hemi.color.setHex(lerpColor(0x9fb4ff, 0xfff4e0, light));
    this.sun.intensity = Math.max(0, sunDir.y) * 1.4 * light + 0.15;
    if (sunDir.y > 0) this.sun.position.copy(sunDir);
    else this.sun.position.copy(sunDir).negate(); // de noche ilumina la luna
    this.sun.color.setHex(sunDir.y > 0 ? 0xfff1d6 : 0xbfcaf0);
  }
}
