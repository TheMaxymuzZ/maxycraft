import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block, FRUITS } from '../src/blocks';
import { loadTrip, planTrip, saveTrip } from '../src/travel';
import { RESIDENT_NAMES, pickVisitor, profileNamed } from '../src/villagers';
import { MYSTERY_KINDS, SEA_LEVEL, World } from '../src/world';

const material = new THREE.MeshBasicMaterial();
const SEED = 20261025;

describe('islas misteriosas', () => {
  it('un viaje lleva a una isla con una fruta distinta de la de casa', () => {
    for (const home of FRUITS) {
      let n = 0;
      const random = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
      const t = planTrip(1, home, 'Nube', 3, random);
      expect(t.fruit).not.toBe(home);
      expect(MYSTERY_KINDS).toContain(t.kind);
      expect(t.slot).toBe(1);
    }
  });

  it('el viaje se guarda en la sesión y solo vale para su isla', () => {
    const t = planTrip(0, Block.Apple, null, 3);
    saveTrip(t);
    expect(loadTrip(0)).toEqual(t);
    expect(loadTrip(1)).toBeNull();
    saveTrip(null);
    expect(loadTrip(0)).toBeNull();
  });

  it('quien está de vacaciones no vive ya en tu isla', () => {
    const residents = RESIDENT_NAMES.slice(0, 5);
    for (let i = 0; i < 20; i++) expect(residents).not.toContain(pickVisitor(residents, () => i / 20));
    expect(pickVisitor(RESIDENT_NAMES, Math.random)).toBeNull();
  });

  it('en la isla nevada se ven más pingüinos y osos', () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cold = new Set(['pingüino', 'oso', 'oveja']);
    let snow = 0;
    let plain = 0;
    for (let i = 0; i < 400; i++) {
      if (cold.has(profileNamed(pickVisitor([], random, 'nieve')!)!.species)) snow++;
      if (cold.has(profileNamed(pickVisitor([], random)!)!.species)) plain++;
    }
    expect(snow).toBeGreaterThan(plain * 2);
  });

  it('la isla misteriosa es pequeña, sin casas ni río, y tiene sitio para la avioneta', () => {
    for (const kind of MYSTERY_KINDS) {
      const w = new World(SEED, material, {}, { mystery: { kind, fruit: Block.Cherry } });
      expect(w.plots).toEqual([]);
      expect(w.fruit).toBe(Block.Cherry);
      expect(w.heightAt(0, 0)).toBeGreaterThan(SEA_LEVEL);
      expect(w.heightAt(75, 0)).toBeLessThan(SEA_LEVEL); // a 75 bloques ya es mar
      const a = w.findAirport(0);
      expect(a).not.toBeNull();
      expect(w.heightAt(a!.x, a!.z)).toBe(SEA_LEVEL + 1);
    }
  });

  it('en la isla de las rocas asoman minerales', () => {
    const w = new World(SEED, material, {}, { mystery: { kind: 'minerales', fruit: Block.Cherry } });
    const ores = new Set<number>([Block.IronOre, Block.GoldOre, Block.GemOre, Block.CoalOre]);
    let found = 0;
    for (let x = -25; x <= 25; x++) {
      for (let z = -25; z <= 25; z++) {
        const h = w.heightAt(x, z);
        if (ores.has(w.getBlock(x, h + 1, z)) || ores.has(w.getBlock(x, h + 2, z))) found++;
      }
    }
    expect(found).toBeGreaterThan(3);
  });

  it('las islas nuevas tienen su propio paisaje', () => {
    const count = (kind: (typeof MYSTERY_KINDS)[number], blocks: number[]) => {
      const w = new World(SEED, material, {}, { mystery: { kind, fruit: Block.Cherry } });
      let n = 0;
      for (let x = -40; x <= 40; x += 2) {
        for (let z = -40; z <= 40; z += 2) {
          for (let y = 0; y < 60; y++) if (blocks.includes(w.getBlock(x, y, z))) n++;
        }
      }
      return { w, n };
    };
    const volcan = count('volcan', [Block.Magma]);
    expect(volcan.n).toBeGreaterThan(5);
    expect(volcan.w.heightAt(0, 0)).toBeGreaterThan(SEA_LEVEL + 15); // un volcán de verdad
    expect((volcan.w as unknown as { torches: Map<string, unknown> }).torches.size).toBeGreaterThan(0); // el magma alumbra
    expect(count('cristal', [Block.CrystalCluster, Block.Amethyst]).n).toBeGreaterThan(5);
    expect(count('nieve', [Block.SnowGrass, Block.Ice]).n).toBeGreaterThan(50);
    expect(count('setas', [Block.MushroomCap, Block.SmallMushroom]).n).toBeGreaterThan(5);
  });
});

describe('vecinos invitados', () => {
  it('las casas nuevas no cambian las de antes', () => {
    const before = new World(SEED, material);
    const spots = before.findGuestSpots(3);
    expect(spots.length).toBeGreaterThan(0);
    const after = new World(SEED, material, {}, { guests: spots });
    expect(after.plots.slice(0, before.plots.length)).toEqual(before.plots);
    const extra = after.plots.slice(before.plots.length);
    expect(extra.map((p) => [p.x, p.z])).toEqual(spots);
    for (const p of extra) {
      expect(p.guest).toBe(true);
      expect(p.kind).toBe('house');
    }
    expect(after.caveEntrances).toEqual(before.caveEntrances);
    // Los sitios están separados entre sí y de las demás casas.
    for (const p of extra) for (const q of after.plots) if (p !== q) expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThanOrEqual(15);
  });

  it('no buscan sitio donde el jugador ha construido', () => {
    const plain = new World(SEED, material);
    const [spot] = plain.findGuestSpots(1);
    const chunkKey = `${Math.floor(spot[0] / 16)},${Math.floor(spot[1] / 16)}`;
    const built = new World(SEED, material, { [chunkKey]: { 0: Block.Planks } });
    const [other] = built.findGuestSpots(1);
    if (other) expect(other).not.toEqual(spot);
  });
});
