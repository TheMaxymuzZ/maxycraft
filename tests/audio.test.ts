import { describe, expect, it } from 'vitest';
import { compose, materialOf } from '../src/audio';

describe('música', () => {
  it('cada estación tiene su canción', () => {
    const songs = (['primavera', 'verano', 'otoño', 'invierno'] as const).map((s) => compose(12, 99, s));
    const melodies = new Set(songs.map((s) => JSON.stringify(s.melody)));
    expect(melodies.size).toBe(4);
  });

  it('en invierno va más despacio y con campanillas, y en verano más rápido', () => {
    const verano = compose(12, 5, 'verano');
    const invierno = compose(12, 5, 'invierno');
    expect(invierno.style.tempo).toBeLessThan(verano.style.tempo);
    expect(invierno.style.bells).toBe(true);
    expect(verano.style.bells).toBe(false);
  });

  it('de noche la música es tranquila en cualquier estación', () => {
    for (const s of ['primavera', 'verano', 'otoño', 'invierno'] as const) {
      const night = compose(23, 5, s);
      expect(night.style.hat).toBe(false);
      expect(night.style.tempo).toBeLessThan(compose(12, 5, s).style.tempo);
    }
  });

  it('la misma isla y hora suenan igual', () => {
    expect(compose(9, 42, 'otoño')).toEqual(compose(9, 42, 'otoño'));
  });
});

describe('pasos', () => {
  it('cada suelo suena a lo suyo', () => {
    expect(materialOf('Arena')).toBe('arena');
    expect(materialOf('Hierba')).toBe('hierba');
    expect(materialOf('Tablones')).toBe('madera');
    expect(materialOf('Piedra')).toBe('piedra');
  });
});
