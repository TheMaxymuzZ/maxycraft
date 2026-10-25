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
export class SunShadows {
  private timer = 0;
  private range = 0;

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
  }
}
