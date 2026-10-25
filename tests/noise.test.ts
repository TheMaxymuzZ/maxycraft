import { describe, expect, it } from 'vitest';
import { blockRandom, columnRandom, fbm, valueNoise } from '../src/noise';

describe('ruido del terreno', () => {
  it('siempre da lo mismo para la misma posición y semilla', () => {
    expect(valueNoise(3.3, 7.1, 9)).toBe(valueNoise(3.3, 7.1, 9));
    expect(fbm(-12.5, 4, 9)).toBe(fbm(-12.5, 4, 9));
    expect(columnRandom(4, 5, 1)).toBe(columnRandom(4, 5, 1));
  });

  it('se queda entre 0 y 1', () => {
    for (let i = 0; i < 500; i++) {
      const x = i * 1.37 - 300;
      const z = i * -0.91 + 120;
      for (const v of [valueNoise(x, z, 5), columnRandom(i, -i, 5), blockRandom(i, i % 60, -i, 5)]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('otra semilla da otro terreno', () => {
    expect(valueNoise(3.5, 7.5, 1)).not.toBe(valueNoise(3.5, 7.5, 2));
  });
});
