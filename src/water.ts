import * as THREE from 'three';

/**
 * Agua animada: olas suaves que suben y bajan, manchas más claras que se mueven y brillos del sol.
 * Es el material de agua de siempre con unos añadidos en el shader, así sigue recibiendo luz y niebla.
 */
export class Water {
  readonly material: THREE.MeshLambertMaterial;
  private uniforms = {
    uTime: { value: 0 },
    /** Altura de las olas (0 en calidad baja). */
    uWave: { value: 0.06 },
    /** Fuerza de los brillos: de noche y con lluvia casi no hay. */
    uSparkle: { value: 1 },
  };

  constructor() {
    this.material = new THREE.MeshLambertMaterial({ color: 0x3fa9d6, transparent: true, opacity: 0.74, depthWrite: false, side: THREE.DoubleSide });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uTime;
uniform float uWave;
varying vec3 vWaterPos;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
transformed.y += uWave * (sin(wp.x * 0.9 + uTime * 1.4) + sin(wp.z * 0.7 - uTime * 1.1)) - uWave * 1.2;
vWaterPos = wp;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uTime;
uniform float uSparkle;
varying vec3 vWaterPos;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
// Manchas más claras y más oscuras que se desplazan, como el reflejo del cielo en el agua.
float ripple = sin(vWaterPos.x * 0.55 + uTime * 0.9) * sin(vWaterPos.z * 0.6 - uTime * 0.7)
  + 0.5 * sin((vWaterPos.x + vWaterPos.z) * 1.3 - uTime * 1.6);
diffuseColor.rgb *= 0.94 + 0.08 * ripple;`,
        )
        .replace(
          '#include <opaque_fragment>',
          `// Brillos pequeños que aparecen y desaparecen, en cuadraditos para que pegue con los píxeles.
vec2 cell = floor(vWaterPos.xz * 4.0);
float twinkle = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
float spark = step(0.985, twinkle) * max(0.0, sin(uTime * 2.5 + twinkle * 60.0));
outgoingLight += vec3(spark * uSparkle * 0.55);
#include <opaque_fragment>`,
        );
    };
  }

  /** `waves`: si hay olas (no en calidad baja). `sparkle`: de 0 a 1. */
  update(seconds: number, waves: boolean, sparkle: number) {
    this.uniforms.uTime.value = seconds;
    this.uniforms.uWave.value = waves ? 0.05 : 0;
    this.uniforms.uSparkle.value = sparkle;
  }
}
