import { describe, expect, it } from 'vitest';
import { dateOverride, holidayOf, seasonOf, weatherAt } from '../src/seasons';

describe('estaciones y fiestas', () => {
  it('cada mes tiene su estación (hemisferio norte)', () => {
    expect(seasonOf(new Date(2026, 0, 15))).toBe('invierno');
    expect(seasonOf(new Date(2026, 3, 15))).toBe('primavera');
    expect(seasonOf(new Date(2026, 6, 15))).toBe('verano');
    expect(seasonOf(new Date(2026, 9, 15))).toBe('otoño');
    expect(seasonOf(new Date(2026, 11, 15))).toBe('invierno');
  });

  it('reconoce las fiestas', () => {
    expect(holidayOf(new Date(2026, 9, 31))?.id).toBe('halloween');
    expect(holidayOf(new Date(2026, 9, 24))?.id).toBe('halloween');
    expect(holidayOf(new Date(2026, 11, 24))?.id).toBe('navidad');
    expect(holidayOf(new Date(2026, 0, 1))?.id).toBe('año_nuevo');
    expect(holidayOf(new Date(2026, 4, 10))).toBeNull();
  });

  it('el tiempo es el mismo para la misma isla y hora', () => {
    const d = new Date(2026, 4, 10, 14);
    expect(weatherAt(d, 42)).toBe(weatherAt(new Date(2026, 4, 10, 13), 42));
  });

  it('en Navidad siempre nieva y en verano nunca', () => {
    expect(weatherAt(new Date(2026, 11, 25, 10), 7)).toBe('nieve');
    for (let seed = 0; seed < 50; seed++) expect(weatherAt(new Date(2026, 6, 1, 12), seed)).not.toBe('nieve');
  });

  it('lee ?fecha= solo si es válida', () => {
    expect(dateOverride(new URLSearchParams('fecha=2026-12-24'))?.getDate()).toBe(24);
    expect(dateOverride(new URLSearchParams('fecha=mañana'))).toBeNull();
    expect(dateOverride(new URLSearchParams(''))).toBeNull();
  });
});
