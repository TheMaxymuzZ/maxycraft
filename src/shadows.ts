import * as THREE from 'three';
import type { Quality } from './settings';

/** Tamaño del mapa de sombras y cuántos bloques alrededor del jugador tienen sombra, según la calidad. */
const SHADOW: Record<Quality, { size: number; range: number } | null> = {
  baja: null,
  media: { size: 1024, range: 40 },
  alta: { size: 2048, range: 64 },
};

/**
 * Sombras del sol y de la luna (v3.2): los árboles, las casas, los vecinos y los muebles dejan sombra en el suelo.
 * La luz sigue al jugador, y solo se calcula la sombra cerca de él para que el juego vaya fluido.
 */
const axisX = new THREE.Vector3();
const axisY = new THREE.Vector3();
const axisZ = new THREE.Vector3();
const mid = new THREE.Vector3();

export class SunShadows {
  private timer = 0;
  private range = 0;
  /**
   * Grupo cuyos hijos (los chunks del mundo) solo dan sombra si caen dentro del mapa de sombras (v5.10). Antes, por lo
   * grandes que son, three.js los metía casi todos en la pasada de sombras: dibujaba más triángulos para las sombras
   * que para la pantalla.
   */
  limited: THREE.Object3D | null = null;
  /** Cuántos de esos hijos dan sombra ahora (para las pruebas). */
  casting = 0;

  constructor(private renderer: THREE.WebGLRenderer, private light: THREE.DirectionalLight, private scene: THREE.Scene) {
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // La luz apunta a un objetivo que va con el jugador; tiene que estar en la escena para moverse.
    scene.add(light.target);
    const cam = light.shadow.camera;
    cam.near = 1;
    cam.far = 260;
    // Sin esto, las caras de los bloques se manchan de rayas ("acné" de sombra).
    light.shadow.bias = -0.0006;
    light.shadow.normalBias = 0.04;
  }

  setQuality(quality: Quality) {
    const conf = SHADOW[quality];
    const enabled = !!conf;
    if (this.renderer.shadowMap.enabled !== enabled) {
      this.renderer.shadowMap.enabled = enabled;
      // Los materiales ya compilados tienen que volver a hacerlo con (o sin) sombras.
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (!m) return;
        for (const mat of Array.isArray(m) ? m : [m]) mat.needsUpdate = true;
      });
    }
    this.light.castShadow = enabled;
    if (!conf) return;
    this.range = conf.range;
    const cam = this.light.shadow.camera;
    cam.left = cam.bottom = -conf.range;
    cam.right = cam.top = conf.range;
    cam.updateProjectionMatrix();
    if (this.light.shadow.mapSize.x !== conf.size) {
      this.light.shadow.mapSize.set(conf.size, conf.size);
      this.light.shadow.map?.dispose();
      this.light.shadow.map = null;
    }
  }

  /** `center`: dónde está el jugador; `dir`: hacia dónde está el sol (o la luna). */
  update(dt: number, center: THREE.Vector3, dir: THREE.Vector3) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 1;
      // Los objetos nuevos (vecinos, muebles, chunks recién dibujados) se apuntan solos a las sombras.
      this.scene.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh || o.castShadow) return;
        const m = (o as THREE.Mesh).material as THREE.Material;
        // Lo transparente (agua, nubes, fantasmas de las casas) y lo que no recibe luz no da sombra.
        if (o.userData.noShadow || Array.isArray(m) || m.transparent || !(m as THREE.MeshLambertMaterial).isMeshLambertMaterial) return;
        o.castShadow = o.receiveShadow = true;
      });
    }
    if (!this.light.castShadow) return;
    // La luz se mueve a saltos de un texel del mapa: así las sombras no tiemblan al andar.
    const step = (this.range * 2) / this.light.shadow.mapSize.x;
    const snap = (v: number) => Math.round(v / step) * step;
    this.light.target.position.set(snap(center.x), snap(center.y), snap(center.z));
    this.light.position.copy(this.light.target.position).addScaledVector(dir, 120);
    this.light.target.updateMatrixWorld();
    if (this.limited) this.limit(this.limited.children);
  }

  /**
   * Deja dar sombra solo a lo que cae dentro del cuadrado que cubre el mapa de sombras, mirado desde el sol: la caja de
   * cada malla se proyecta en los dos ejes de la luz y se compara con el cuadrado (con un pequeño margen).
   */
  private limit(list: THREE.Object3D[]) {
    axisZ.copy(this.light.position).sub(this.light.target.position).normalize();
    axisX.set(0, 1, 0).cross(axisZ);
    if (axisX.lengthSq() < 1e-6) axisX.set(1, 0, 0);
    axisX.normalize();
    axisY.crossVectors(axisZ, axisX);
    const t = this.light.target.position;
    const cx = t.dot(axisX);
    const cy = t.dot(axisY);
    const reach = this.range + 2;
    let n = 0;
    for (const o of list) {
      const geo = (o as THREE.Mesh).geometry;
      if (!geo) continue;
      if (!geo.boundingBox) geo.computeBoundingBox();
      const b = geo.boundingBox!;
      mid.addVectors(b.min, b.max).multiplyScalar(0.5).add(o.position);
      const hx = (b.max.x - b.min.x) / 2;
      const hy = (b.max.y - b.min.y) / 2;
      const hz = (b.max.z - b.min.z) / 2;
      const ex = Math.abs(axisX.x) * hx + Math.abs(axisX.y) * hy + Math.abs(axisX.z) * hz;
      const ey = Math.abs(axisY.x) * hx + Math.abs(axisY.y) * hy + Math.abs(axisY.z) * hz;
      const on = Math.abs(mid.dot(axisX) - cx) <= reach + ex && Math.abs(mid.dot(axisY) - cy) <= reach + ey;
      o.castShadow = on;
      if (on) n++;
    }
    this.casting = n;
  }
}
