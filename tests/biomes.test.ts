import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { Fluids } from '../src/fluids';
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

  it('el río baja por terrazas y forma cascadas de agua de verdad (v3.9)', () => {
    const w = new World(20261025, material, {}, { terrain: 2 });
    const fluids = new Fluids({ getBlock: (x, y, z) => w.getBlock(x, y, z), setBlock: (x, y, z, b) => w.setBlock(x, y, z, b), loaded: (x, z) => w.hasColumn(x, z) });
    w.onBlockChange = (x, y, z) => fluids.wake(x, y, z);
    // Cargar la isla entera, como al ir andando por ella.
    for (let cx = -12; cx < 12; cx++) for (let cz = -12; cz < 12; cz++) w.getBlock(cx * 16, 0, cz * 16);
    const spills = w.takeSpills();
    expect(spills.length).toBeGreaterThan(0);
    for (const [x, y, z] of spills) fluids.wake(x, y, z);
    for (let i = 0; i < 80 && fluids.busy; i++) fluids.step();
    // Al lado de cada borde, el agua cae hasta la terraza de abajo.
    let falling = 0;
    for (const [x, y, z] of spills) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (w.getBlock(x + dx, y - 1, z + dz) === Block.WaterFall) falling++;
      }
    }
    expect(falling).toBeGreaterThan(0);
    // Y llega al agua del río de abajo: debajo del agua que cae siempre hay más agua o suelo.
    for (const [x, y, z] of spills) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let fy = y - 1;
        if (w.getBlock(x + dx, fy, z + dz) !== Block.WaterFall) continue;
        while (w.getBlock(x + dx, fy, z + dz) === Block.WaterFall) fy--;
        expect(w.getBlock(x + dx, fy, z + dz)).not.toBe(Block.Air);
      }
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
