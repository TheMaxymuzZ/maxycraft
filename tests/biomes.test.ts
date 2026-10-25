import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { treeKindOfSapling } from '../src/orchard';
import { pineShape } from '../src/trees';
import { BIG_ISLAND_RADIUS, ISLAND_RADIUS, SEA_LEVEL, World } from '../src/world';

const material = new THREE.MeshBasicMaterial();

describe('islas grandes con biomas', () => {
  const world = new World(20261025, material, {}, { terrain: 2 });

  it('las islas de antes no cambian de terreno', () => {
    const old = new World(20261025, material);
    expect(old.terrain).toBe(1);
    expect(old.biomeAt(10, 10)).toBeNull();
    // El río y las terrazas siguen a la altura de siempre.
    for (let x = -60; x <= 60; x += 7) for (let z = -60; z <= 60; z += 7) expect(old.waterLevel(x, z)).toBe(SEA_LEVEL);
  });

  it('hay tierra mucho más lejos que en las islas de antes', () => {
    let far = 0;
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      const d = ISLAND_RADIUS * 1.1;
      if (world.heightAt(Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d)) > SEA_LEVEL + 1) far++;
    }
    expect(far).toBeGreaterThan(10);
    expect(BIG_ISLAND_RADIUS).toBeGreaterThan(ISLAND_RADIUS);
  });

  it('tiene los cuatro biomas de interior, playa y montañas más altas', () => {
    const seen = new Set<string>();
    let peak = 0;
    for (let x = -120; x <= 120; x += 4) {
      for (let z = -120; z <= 120; z += 4) {
        const h = world.heightAt(x, z);
        if (h <= SEA_LEVEL) continue;
        seen.add(world.biomeAt(x, z)!);
        peak = Math.max(peak, h);
      }
    }
    expect([...seen].sort()).toEqual(['bambu', 'bosque', 'montaña', 'playa', 'pradera']);
    expect(peak).toBeGreaterThanOrEqual(SEA_LEVEL + 2 + 3 * 4);
  });

  it('el río baja por terrazas y forma cascadas de agua sobre agua', () => {
    const falls = world.waterfallSpots(2);
    expect(falls.length).toBeGreaterThan(0);
    for (const f of falls) {
      expect(f.river).toBe(true);
      expect(f.top).toBeGreaterThan(f.bottom);
      // Arriba y abajo de la cascada hay agua del río.
      const up = [Math.floor(f.x + 0.5 - f.dx * 2), Math.floor(f.z + 0.5 - f.dz * 2)];
      const down = [Math.floor(f.x + 0.5 + f.dx * 3), Math.floor(f.z + 0.5 + f.dz * 3)];
      expect(world.waterLevel(up[0], up[1])).toBe(f.top);
      expect(world.waterLevel(down[0], down[1])).toBe(f.bottom);
    }
  });

  it('las casas siguen en sitio llano', () => {
    expect(world.plots.length).toBe(6);
    for (const p of world.plots) expect(world.heightAt(p.x + 2, p.z - 2)).toBe(p.y);
  });

  it('el pino tiene su brote y su copa de agujas', () => {
    expect(treeKindOfSapling('brote_pino')?.block).toBe(Block.PineSapling);
    expect(pineShape().some(([, , , b]) => b === Block.PineLeaves)).toBe(true);
  });
});
