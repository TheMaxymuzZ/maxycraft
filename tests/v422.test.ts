import { describe, expect, it } from 'vitest';
import { RING_BOAT, SEA_ISLANDS, archipelago, canReach, dayNumber, genericVillagers, islandAhead, islandSeed, isSeaSave } from '../src/archipelago';
import { chartList, chartSvg, heading } from '../src/seaChart';

describe('v4.22 archipiélago', () => {
  it('cada isla de casa tiene siempre las mismas nueve islas, con una sola misteriosa y nunca cerca', () => {
    const a = archipelago(1234);
    expect(a).toHaveLength(SEA_ISLANDS);
    expect(archipelago(1234)).toEqual(a);
    expect(archipelago(99)).not.toEqual(a);
    const mysterious = a.filter((i) => i.type === 'misteriosa');
    expect(mysterious).toHaveLength(1);
    expect(mysterious[0].ring).toBeGreaterThanOrEqual(2);
    expect(new Set(a.map((i) => i.name)).size).toBe(SEA_ISLANDS);
    for (let s = 0; s < 30; s++) expect(archipelago(s).find((i) => i.type === 'misteriosa')!.ring).toBeGreaterThanOrEqual(2);
  });

  it('saliendo en la dirección de una isla se va a esa isla', () => {
    const a = archipelago(42);
    for (const i of a) {
      const ahead = islandAhead(a, Math.cos(i.angle) * 200, Math.sin(i.angle) * 200);
      expect(ahead?.id).toBe(i.id);
    }
  });

  it('las lejanas piden un barco mejor', () => {
    const [near, far, veryFar] = ([1, 2, 3] as const).map((ring) => ({ ...archipelago(1)[0], ring }));
    expect(canReach('balsa', near)).toBe(true);
    expect(canReach('balsa', far)).toBe(false);
    expect(canReach('velero', far)).toBe(true);
    expect(canReach('velero', veryFar)).toBe(false);
    expect(canReach('expedicion', veryFar)).toBe(true);
    expect(RING_BOAT[3]).toBe('expedicion');
  });

  it('las islas de recursos cambian cada tres días y las demás no', () => {
    const a = archipelago(7);
    const res = a.find((i) => i.type === 'recursos')!;
    const village = a.find((i) => i.type === 'aldea')!;
    const d = dayNumber('2026-10-27');
    expect(dayNumber('2026-10-28')).toBe(d + 1);
    const base = Math.floor(d / 3) * 3;
    expect(islandSeed(res, base)).toBe(islandSeed(res, base + 2));
    expect(islandSeed(res, base)).not.toBe(islandSeed(res, base + 3));
    expect(islandSeed(village, base)).toBe(islandSeed(village, base + 30));
  });

  it('los vecinos sin nombre de las aldeas son distintos entre sí y siempre los mismos', () => {
    const v = genericVillagers(5, 4);
    expect(v).toHaveLength(4);
    expect(new Set(v.map((p) => p.name)).size).toBe(4);
    expect(new Set(v.map((p) => p.species)).size).toBe(4);
    expect(genericVillagers(5, 4)).toEqual(v);
    for (const p of v) expect(p.role).toBeUndefined();
  });

  it('la carta tapa con niebla lo que no se ha visitado', () => {
    const a = archipelago(3);
    const seen = new Set([a[0].id]);
    const svg = chartSvg(a, seen, 'balsa', { x: 10, z: 0, yaw: 0 }, 80);
    expect(svg).toContain(a[0].name);
    expect(svg).not.toContain(a[1].name);
    const list = chartList(a, seen, 'balsa');
    expect(list.match(/Isla sin explorar/g)).toHaveLength(SEA_ISLANDS - 1);
    expect(heading(-Math.PI / 2)).toBe('norte');
    expect(heading(0)).toBe('este');
    expect(isSeaSave({ discovered: ['isla-1'] })).toBe(true);
    expect(isSeaSave({ discovered: [3] })).toBe(false);
  });
});
