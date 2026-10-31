import * as THREE from 'three';
import { LIGHT_COLORS } from './blocks';

/**
 * Luz de los seres y las cosas (v5.0.1): vecinos, animales, criaturas, objetos del suelo, muebles...
 * Antes solo los alumbraban las luces de la escena (el sol y el cielo), así que de noche o en una habitación oscura
 * una antorcha al lado no les hacía nada. Ahora cada uno mira la luz del sitio donde está, como los bloques:
 * la del cielo los oscurece bajo techo y en las cuevas, y la de las antorchas (o la que llevas en la mano) los alumbra
 * aunque sea de noche.
 *
 * Cada ser lleva su copia de los materiales (para tener su propia luz); los cambios que el juego haga en el material
 * de siempre (un destello al recibir un golpe, el color de una prenda) se copian en cada repaso.
 */

interface LitUniforms {
  uSky: { value: number };
  uGlow: { value: THREE.Color };
}

type Lit = THREE.MeshLambertMaterial | THREE.MeshPhongMaterial | THREE.MeshStandardMaterial;

/** Copia de material → material de siempre. */
const originals = new WeakMap<THREE.Material, Lit>();
const uniformsOf = new WeakMap<THREE.Material, LitUniforms>();

const TORCH = new THREE.Color(...LIGHT_COLORS[0]);
// En espacio lineal, igual que el mínimo del mundo: nunca negro del todo.
const MIN_LIGHT = new THREE.Color(0.045, 0.05, 0.068);

function litCopy(m: Lit): Lit {
  const c = m.clone() as Lit;
  const u: LitUniforms = { uSky: { value: 1 }, uGlow: { value: new THREE.Color() } };
  const before = m.onBeforeCompile.bind(m);
  c.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSky;\nuniform vec3 uGlow;')
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
// La luz del cielo se apaga bajo techo; la de las antorchas no se suma, se queda la más fuerte (como en el mundo).
reflectedLight.directDiffuse = max((reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) * uSky, diffuseColor.rgb * uGlow);
reflectedLight.indirectDiffuse = vec3(0.0);`,
      );
  };
  c.customProgramCacheKey = () => `${m.customProgramCacheKey()}|luz-seres`;
  originals.set(c, m);
  uniformsOf.set(c, u);
  return c;
}

/**
 * Material para muchos muebles juntos en una sola malla (v5.3.1): la misma luz que `litCopy`, pero cada mueble lleva
 * la suya en sus vértices (atributo `aLit`: cielo y el color de la antorcha) en vez de en el material.
 */
const batchCopies = new WeakMap<THREE.Material, Lit>();
export function litBatchMaterial(m: THREE.MeshLambertMaterial): THREE.MeshLambertMaterial {
  let c = batchCopies.get(m) as THREE.MeshLambertMaterial | undefined;
  if (c) return c;
  c = m.clone();
  c.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aLit;\nvarying vec4 vLit;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLit = aLit;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vLit;')
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
reflectedLight.directDiffuse = max((reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) * vLit.x, diffuseColor.rgb * vLit.yzw);
reflectedLight.indirectDiffuse = vec3(0.0);`,
      );
  };
  c.customProgramCacheKey = () => 'luz-seres-juntos';
  batchCopies.set(m, c);
  originals.set(c, m);
  return c;
}

/** Copia en el material de muebles juntos lo que haya cambiado en el de siempre (el brillo de las lámparas de noche). */
export function syncBatch(c: THREE.Material) {
  const orig = originals.get(c);
  if (orig) sync(c as Lit, orig);
}

/** Luz que le toca a una cosa: cielo (0..1) y color de la antorcha. Lo usan los muebles juntos en una malla. */
export type LitHook = (sky: number, glow: THREE.Color) => void;

function isLit(m: THREE.Material): m is Lit {
  return (m as THREE.MeshLambertMaterial).isMeshLambertMaterial || (m as THREE.MeshPhongMaterial).isMeshPhongMaterial || (m as THREE.MeshStandardMaterial).isMeshStandardMaterial;
}

/** Copia del material de siempre lo que el juego haya cambiado en él (color, destellos, transparencia). */
function sync(c: Lit, m: Lit) {
  if (!c.color.equals(m.color)) c.color.copy(m.color);
  if (!c.emissive.equals(m.emissive)) c.emissive.copy(m.emissive);
  c.emissiveIntensity = m.emissiveIntensity;
  c.opacity = m.opacity;
  c.visible = m.visible;
  if (c.map !== m.map) c.map = m.map;
}

/** Luz de un sitio: [cielo 0..1, antorcha 0..1]. */
export type LightSample = (p: THREE.Vector3) => [number, number];

export class EntityLight {
  private p = new THREE.Vector3();

  constructor(private sample: LightSample, private hand: (p: THREE.Vector3) => number) {}

  private light = new THREE.Color();

  /** Pone a `root` (un ser o una cosa) la luz del sitio donde está. */
  apply(root: THREE.Object3D) {
    if (!root.visible || root.userData.noEntityLight) return;
    root.getWorldPosition(this.p);
    this.p.y += 0.6;
    const [sky, glow] = this.sample(this.p);
    const torch = Math.max(glow, this.hand(this.p));
    const skyLight = Math.max(0.02, sky * Math.sqrt(sky));
    const t2 = torch * torch;
    const light = this.light.setRGB(TORCH.r * t2 + MIN_LIGHT.r, TORCH.g * t2 + MIN_LIGHT.g, TORCH.b * t2 + MIN_LIGHT.b);
    (root.userData.onLit as LitHook | undefined)?.(skyLight, light);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.userData.noEntityLight) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (let i = 0; i < list.length; i++) {
        let mat = list[i];
        const orig = originals.get(mat);
        if (orig) sync(mat as Lit, orig);
        else if (isLit(mat)) {
          mat = litCopy(mat);
          if (Array.isArray(mesh.material)) mesh.material[i] = mat;
          else mesh.material = mat;
        } else continue;
        const u = uniformsOf.get(mat);
        if (!u) continue;
        u.uSky.value = skyLight;
        u.uGlow.value.copy(light);
      }
    });
  }

  /** Lo mismo para cada hijo de un grupo (cada hijo es un ser o una cosa). */
  applyAll(group: THREE.Object3D) {
    for (const child of group.children) this.apply(child);
  }
}
