// Ruido de valor 2D con semilla y suma fractal (fbm). Suficiente para colinas suaves.

function hash2(x: number, z: number, seed: number): number {
  let h = (x * 374761393 + z * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function valueNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smooth(x - x0);
  const tz = smooth(z - z0);
  const a = hash2(x0, z0, seed);
  const b = hash2(x0 + 1, z0, seed);
  const c = hash2(x0, z0 + 1, seed);
  const d = hash2(x0 + 1, z0 + 1, seed);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * tz; // 0..1
}

export function fbm(x: number, z: number, seed: number, octaves = 4): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, z * freq, seed + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm; // 0..1
}

/** Número pseudoaleatorio estable para una columna del mundo. */
export function columnRandom(x: number, z: number, seed: number): number {
  return hash2(x, z, seed ^ 0x5bd1e995);
}

function hash3(x: number, y: number, z: number, seed: number): number {
  let h = (x * 374761393 + y * 1103515245 + z * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ruido de valor 3D, para las cuevas. */
export function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const tz = smooth(z - z0);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const plane = (yy: number) => {
    const a = hash3(x0, yy, z0, seed);
    const b = hash3(x0 + 1, yy, z0, seed);
    const c = hash3(x0, yy, z0 + 1, seed);
    const d = hash3(x0 + 1, yy, z0 + 1, seed);
    return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
  };
  return lerp(plane(y0), plane(y0 + 1), ty); // 0..1
}

/** Número pseudoaleatorio estable para un bloque concreto. */
export function blockRandom(x: number, y: number, z: number, seed: number): number {
  return hash3(x, y, z, seed ^ 0x27d4eb2d);
}
