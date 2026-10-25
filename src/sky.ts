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

// Cúpula del cielo: degradado del horizonte (el color de la niebla) a lo alto, con un resplandor junto al sol al amanecer y al atardecer.
const DOME_VERTEX = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const DOME_FRAGMENT = `
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uGlowColor;
uniform vec3 uSunDir;
uniform float uGlow;
varying vec3 vDir;
void main() {
  float h = max(vDir.y, 0.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
  // El resplandor es más fuerte cerca del sol y del horizonte.
  float toSun = max(dot(normalize(vec3(vDir.x, 0.0, vDir.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0);
  float glow = uGlow * pow(toSun, 3.0) * (1.0 - smoothstep(0.0, 0.45, h));
  col = mix(col, uGlowColor, glow);
  gl_FragColor = vec4(col, 1.0);
}`;

// Color de lo alto del cielo a lo largo del día.
const ZENITH_KEYS: [number, number][] = [
  [0, 0x070d22],
  [5, 0x070d22],
  [6, 0x5a6fa8],
  [7.5, 0x4a90d8],
  [17, 0x4a90d8],
  [18.5, 0x5a5f9e],
  [19.5, 0x1a1d45],
  [20.5, 0x070d22],
  [24, 0x070d22],
];

export class Sky {
  readonly color = new THREE.Color();
  /** 0 de día, 1 de noche cerrada. */
  night = 0;
  /** Resplandor del amanecer o del atardecer, de 0 a 1, y su color: tiñe también las nubes. */
  glow = 0;
  readonly glowColor = new THREE.Color(0xffb070);
  /** Hacia dónde está la luz que da sombras: el sol de día y la luna de noche (v3.2). */
  readonly lightDir = new THREE.Vector3(0, 1, 0);
  readonly dome: THREE.Mesh;
  private domeUniforms = {
    uHorizon: { value: new THREE.Color() },
    uZenith: { value: new THREE.Color() },
    uGlowColor: { value: this.glowColor },
    uSunDir: { value: new THREE.Vector3(1, 0, 0) },
    uGlow: { value: 0 },
  };
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

    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(340, 24, 12),
      new THREE.ShaderMaterial({
        vertexShader: DOME_VERTEX,
        fragmentShader: DOME_FRAGMENT,
        uniforms: this.domeUniforms,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    this.dome.renderOrder = -1;
    this.group.add(this.dome, this.sunMesh, this.moonMesh, this.stars);
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
    // Cielo: el horizonte es el color de siempre (y de la niebla) y lo alto va más azul.
    // El resplandor sale cuando el sol está cerca del horizonte, y se apaga de noche.
    this.glow = Math.max(0, 1 - Math.abs(sunDir.y) * 3.2) * (1 - Math.max(0, this.night - 0.5) * 2);
    this.domeUniforms.uZenith.value.setHex(sample(ZENITH_KEYS, hour, lerpColor));
    this.domeUniforms.uSunDir.value.copy(sunDir);
    this.domeUniforms.uGlow.value = this.glow * 0.55;
    this.sunMesh.visible = sunDir.y > -0.1;
    this.moonMesh.visible = sunDir.y < 0.1;
    (this.stars.material as THREE.PointsMaterial).opacity = this.night;
    this.stars.visible = this.night > 0.02;

    // Luces (v3.2): el cielo ilumina con su color (azul de día, dorado al atardecer, azul marino de noche)
    // y el suelo devuelve un poco de luz cálida, así las caras de abajo no quedan grises.
    this.hemi.intensity = 0.5 + light * 0.6;
    this.hemi.color.setHex(lerpColor(lerpColor(0x8fa6f0, 0xfff4e0, light), 0xffc89a, this.glow * 0.6));
    this.hemi.groundColor.setHex(lerpColor(0x2a3350, 0x9a9070, light));
    // El sol bajo pierde fuerza poco a poco; la luna da una luz fría y suave que también hace sombra.
    const height = Math.abs(sunDir.y);
    const fade = Math.min(1, height * 4);
    this.sun.intensity = sunDir.y > 0 ? (0.3 + 1.9 * fade) * light : 0.4 * fade;
    this.lightDir.copy(sunDir);
    if (sunDir.y <= 0) this.lightDir.negate(); // de noche ilumina la luna
    this.sun.position.copy(this.lightDir);
    // El sol bajo da una luz más anaranjada.
    this.sun.color.setHex(sunDir.y > 0 ? lerpColor(0xfff1d6, 0xffa060, this.glow) : 0xa9bdf5);
    (this.sunMesh.material as THREE.MeshBasicMaterial).color.setHex(lerpColor(0xfff3b0, 0xffb060, this.glow));
  }

  /**
   * El horizonte de la cúpula sigue al color del cielo, que la lluvia puede oscurecer después de `update`.
   * `gloom` (0 a 1) apaga también lo alto del cielo.
   */
  syncDome(gloom: number) {
    this.domeUniforms.uHorizon.value.copy(this.color);
    this.domeUniforms.uZenith.value.lerp(this.color, Math.min(1, gloom * 1.1));
    this.domeUniforms.uGlow.value *= 1 - gloom;
    // Encapotado (v3.9): con lluvia o nieve las nubes tapan el sol, la luna y las estrellas.
    const clear = Math.max(0, 1 - gloom * 1.4);
    for (const m of [this.sunMesh, this.moonMesh]) {
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.transparent = true;
      mat.opacity = clear;
      if (clear <= 0) m.visible = false;
    }
    (this.stars.material as THREE.PointsMaterial).opacity *= clear;
    if (clear <= 0) this.stars.visible = false;
  }
}
