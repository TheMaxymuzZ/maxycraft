import * as THREE from 'three';

/**
 * Luz del mundo: mezcla la luz del cielo (que cambia con la hora) con la de antorchas y bloques de luz,
 * que no depende de la hora. Usa el atributo `light` de las mallas del mundo: [cielo, antorchas], de 0 a 1.
 * Nada queda negro del todo: siempre hay un poco de luz para ver por dónde vas.
 */
export class Lighting {
  readonly uniforms = {
    /** Antorcha en la mano: posición y alcance en bloques (0 = no llevas luz). */
    uHand: { value: new THREE.Vector4(0, 0, 0, 0) },
    uTorchColor: { value: new THREE.Color(1.15, 0.92, 0.62) },
    // En espacio lineal: 0.05 se ve como un gris oscuro, no negro.
    uMinLight: { value: 0.05 },
  };

  constructor(material: THREE.Material) {
    const before = material.onBeforeCompile.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      before(shader, renderer);
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
attribute vec2 light;
varying vec2 vLight;
varying vec3 vWorldPos;`,
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
vLight = light;
vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec2 vLight;
varying vec3 vWorldPos;
uniform vec4 uHand;
uniform vec3 uTorchColor;
uniform float uMinLight;`,
        )
        .replace(
          '#include <opaque_fragment>',
          `float hand = uHand.w > 0.0 ? clamp(1.0 - distance(vWorldPos, uHand.xyz) / uHand.w, 0.0, 1.0) : 0.0;
float glow = max(vLight.y, hand);
// La luz de las antorchas no se suma a la del sol: se queda con la más fuerte, como en Minecraft.
outgoingLight = max(outgoingLight * vLight.x, diffuseColor.rgb * (glow * glow * uTorchColor + uMinLight));
#include <opaque_fragment>`,
        );
    };
  }

  /** `radius`: alcance de la luz que llevas en la mano (0 si no llevas). */
  setHand(position: THREE.Vector3, radius: number) {
    this.uniforms.uHand.value.set(position.x, position.y, position.z, radius);
  }
}

/** Objetos que alumbran al llevarlos en la mano, y hasta dónde (en bloques). */
export const HAND_LIGHT: Record<string, number> = { antorcha: 10, bloque_luz: 12, farol: 10, lampara: 8 };
