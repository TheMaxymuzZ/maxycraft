import * as THREE from 'three';
import { isSolid } from './blocks';
import type { World } from './world';

export interface Hit {
  block: [number, number, number];
  /** Bloque vacío justo delante de la cara tocada, donde se coloca uno nuevo. */
  place: [number, number, number];
}

/** Recorre la cuadrícula de vóxeles a lo largo del rayo (algoritmo DDA de Amanatides y Woo). */
export function raycast(world: World, origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): Hit | null {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);
  const stepX = Math.sign(dir.x);
  const stepY = Math.sign(dir.y);
  const stepZ = Math.sign(dir.z);
  const tDeltaX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity;
  const frac = (v: number, s: number) => (s > 0 ? Math.floor(v) + 1 - v : v - Math.floor(v));
  let tMaxX = stepX !== 0 ? frac(origin.x, stepX) * tDeltaX : Infinity;
  let tMaxY = stepY !== 0 ? frac(origin.y, stepY) * tDeltaY : Infinity;
  let tMaxZ = stepZ !== 0 ? frac(origin.z, stepZ) * tDeltaZ : Infinity;

  let prev: [number, number, number] = [x, y, z];
  let t = 0;
  while (t <= maxDist) {
    if (isSolid(world.getBlock(x, y, z))) {
      return { block: [x, y, z], place: prev };
    }
    prev = [x, y, z];
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
    } else {
      z += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
    }
  }
  return null;
}
