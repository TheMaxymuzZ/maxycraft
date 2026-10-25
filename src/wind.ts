import type * as THREE from 'three';

/**
 * Viento: la parte de arriba de la hierba alta, las flores y el bambú se balancea.
 * Usa el atributo `sway` de las mallas del mundo (1 en los vértices que se mueven).
 */
export class Wind {
  private uniforms = {
    uWindTime: { value: 0 },
    uWindStrength: { value: 1 },
  };

  constructor(material: THREE.Material) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
attribute float sway;
uniform float uWindTime;
uniform float uWindStrength;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
if (sway > 0.0) {
  vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
  // Ráfagas que recorren la isla: cada planta va un poco desfasada de su vecina.
  float gust = sin(uWindTime * 1.7 + wp.x * 0.35 + wp.z * 0.25) + 0.4 * sin(uWindTime * 3.1 + wp.x * 1.3);
  transformed.x += gust * 0.07 * uWindStrength;
  transformed.z += gust * 0.04 * uWindStrength;
}`,
        );
    };
  }

  /** `strength`: 1 normal, más con lluvia. */
  update(seconds: number, strength: number) {
    this.uniforms.uWindTime.value = seconds;
    this.uniforms.uWindStrength.value = strength;
  }
}
