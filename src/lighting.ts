import * as THREE from 'three';
import { LIGHT_COLORS } from './blocks';

/**
 * Luz del mundo: mezcla la luz del cielo (que cambia con la hora) con la de antorchas y bloques de luz,
 * que no depende de la hora. Usa el atributo `light` de las mallas del mundo: [cielo, antorchas], de 0 a 1.
 * Nada queda negro del todo: siempre hay un poco de luz para ver por dónde vas.
 */
export class Lighting {
  readonly uniforms = {
    /** Antorcha en la mano: posición y alcance en bloques (0 = no llevas luz). */
    uHand: { value: new THREE.Vector4(0, 0, 0, 0) },
    uTorchColor: { value: new THREE.Color(...LIGHT_COLORS[0]) },
    /** Las llamas titilan: la luz sube y baja un poco. */
    uFlicker: { value: 1 },
    // En espacio lineal: así de poco se ve como un gris oscuro azulado, no negro.
    uMinLight: { value: new THREE.Color(0.045, 0.05, 0.068) },
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
attribute vec3 lightColor;
varying vec2 vLight;
varying vec3 vLightColor;
varying vec3 vWorldPos;`,
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
vLight = light;
vLightColor = lightColor;
vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec2 vLight;
varying vec3 vLightColor;
varying vec3 vWorldPos;
uniform float uFlicker;
uniform vec4 uHand;
uniform vec3 uTorchColor;
uniform vec3 uMinLight;`,
        )
        .replace(
          '#include <opaque_fragment>',
          `float hand = uHand.w > 0.0 ? clamp(1.0 - distance(vWorldPos, uHand.xyz) / uHand.w, 0.0, 1.0) : 0.0;
float glow = max(vLight.y, hand);
// Cada luz tiene su color (la lava roja, los cristales azules); la que llevas en la mano es una llama.
vec3 tint = (hand > vLight.y ? uTorchColor : vLightColor) * uFlicker;
// Cada nivel de luz que se pierde se nota igual: la boca de una cueva se oscurece poco a poco (v3.1).
float sky = vLight.x * sqrt(vLight.x);
// La luz de las antorchas no se suma a la del sol: se queda con la más fuerte, como en Minecraft.
outgoingLight = max(outgoingLight * sky, diffuseColor.rgb * (glow * glow * tint + uMinLight));
#include <opaque_fragment>`,
        );
    };
  }

  /** Las antorchas titilan un poco, como una llama de verdad (v3.2). `time` en segundos. */
  update(time: number) {
    this.uniforms.uFlicker.value = 1 + Math.sin(time * 9.1) * 0.025 + Math.sin(time * 23.7 + 1.3) * 0.015 + Math.sin(time * 3.3) * 0.02;
  }

  /** `radius`: alcance de la luz que llevas en la mano (0 si no llevas). */
  setHand(position: THREE.Vector3, radius: number) {
    this.uniforms.uHand.value.set(position.x, position.y, position.z, radius);
  }
}

/** Objetos que alumbran al llevarlos en la mano, y hasta dónde (en bloques). */
export const HAND_LIGHT: Record<string, number> = { antorcha: 10, bloque_luz: 12, farol: 10, lampara: 8 };
