import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { Breaker } from '../src/breaking';
import type { ItemStack } from '../src/items';
import { findTrunk } from '../src/trees';
import { raycast } from '../src/raycast';
import { SEA_LEVEL, World } from '../src/world';

const material = new THREE.MeshBasicMaterial();
const SEED = 20261025;

describe('generación de la isla', () => {
  const world = new World(SEED, material);

  it('la misma semilla da la misma isla', () => {
    const other = new World(SEED, material);
    for (const [x, z] of [[0, 0], [10, -7], [-30, 22], [50, 50]]) expect(other.heightAt(x, z)).toBe(world.heightAt(x, z));
    expect(other.fruit).toBe(world.fruit);
  });

  it('tiene tienda, museo y parcela del jugador', () => {
    const kinds = world.plots.map((p) => p.kind);
    expect(kinds).toContain('shop');
    expect(kinds).toContain('museum');
    expect(world.playerPlot).toBeDefined();
  });

  it('está rodeada de mar', () => {
    expect(world.heightAt(200, 0)).toBeLessThanOrEqual(SEA_LEVEL);
    expect(world.waterKind(200, 0)).toBe('mar');
  });

  it('el fondo es de piedra y nunca está vacío', () => {
    expect(world.getBlock(0, 0, 0)).not.toBe(Block.Air);
  });
});

describe('cambios del jugador', () => {
  it('se guardan y se recuperan en una isla nueva con la misma semilla', () => {
    const world = new World(SEED, material);
    const [x, z] = [3, 4];
    const y = world.heightAt(x, z) + 1;
    world.setBlock(x, y, z, Block.Planks);
    expect(world.getBlock(x, y, z)).toBe(Block.Planks);
    expect(world.revision).toBeGreaterThan(0);

    const loaded = new World(SEED, material, world.exportEdits());
    expect(loaded.getBlock(x, y, z)).toBe(Block.Planks);
  });

  it('el rayo de la mira encuentra el suelo bajo los pies', () => {
    const world = new World(SEED, material);
    const [x, z] = world.findSpawn(0, 0);
    const ground = world.heightAt(x, z);
    const hit = raycast(world, new THREE.Vector3(x + 0.5, ground + 2.6, z + 0.5), new THREE.Vector3(0, -1, 0), 6);
    expect(hit).not.toBeNull();
    expect(hit!.place[1]).toBe(hit!.block[1] + 1);
  });
});

/** Isla de mentira hecha a mano para probar piezas sueltas. */
function fakeWorld(blocks: Record<string, number>) {
  return { getBlock: (x: number, y: number, z: number) => blocks[`${x},${y},${z}`] ?? Block.Air };
}

describe('árboles', () => {
  it('encuentra la base del tronco desde las hojas', () => {
    const world = fakeWorld({ '0,1,0': Block.Log, '0,2,0': Block.Log, '0,3,0': Block.Log, '1,4,0': Block.Leaves });
    expect(findTrunk(world, 1, 4, 0)).toEqual({ x: 0, y: 1, z: 0, key: '0,0' });
  });

  it('sin tronco cerca no hay árbol', () => {
    expect(findTrunk(fakeWorld({}), 0, 5, 0)).toBeNull();
  });
});

describe('romper bloques', () => {
  function setup(block: number, held: ItemStack | null, plotKind?: 'house' | 'player') {
    const log = { toasts: [] as string[], broken: [] as number[][] };
    const breaker = new Breaker({
      getBlock: () => block,
      plotAt: () => (plotKind ? { kind: plotKind, x: 0, z: 0, y: 0, roof: Block.RoofRed, door: [0, 0, 0] } : undefined),
      held: () => held,
      toast: (t) => log.toasts.push(t),
      progress: () => {},
      broken: (x, y, z, b, usedTool) => log.broken.push([x, y, z, b, Number(usedTool)]),
    });
    breaker.active = true;
    return { breaker, log };
  }

  it('la tierra se rompe con el tiempo y gasta la pala', () => {
    const { breaker, log } = setup(Block.Dirt, { id: 'pala', count: 1, wear: 0 });
    for (let i = 0; i < 100 && !log.broken.length; i++) breaker.update(0.05, [1, 5, 1]);
    expect(log.broken).toEqual([[1, 5, 1, Block.Dirt, 1]]);
  });

  it('sin pico la piedra no se rompe y avisa una sola vez', () => {
    const { breaker, log } = setup(Block.Stone, null);
    for (let i = 0; i < 50; i++) breaker.update(0.1, [1, 5, 1]);
    expect(log.broken).toHaveLength(0);
    expect(log.toasts).toEqual(['Necesitas un pico para romper esto']);
  });

  it('no deja romper la casa de un vecino', () => {
    const { breaker, log } = setup(Block.Planks, null, 'house');
    for (let i = 0; i < 100; i++) breaker.update(0.1, [1, 5, 1]);
    expect(log.broken).toHaveLength(0);
    expect(log.toasts[0]).toContain('vecino');
  });

  it('la capa del fondo no se rompe', () => {
    const { breaker, log } = setup(Block.Dirt, null);
    for (let i = 0; i < 100; i++) breaker.update(0.1, [1, 0, 1]);
    expect(log.broken).toHaveLength(0);
  });

  it('al soltar el botón se pierde el progreso', () => {
    const { breaker } = setup(Block.Log, null);
    breaker.update(0.5, [1, 5, 1]);
    expect(breaker.progress).toBeGreaterThan(0);
    breaker.active = false;
    breaker.update(0.1, [1, 5, 1]);
    expect(breaker.progress).toBe(0);
  });
});

describe('mundo vivo', () => {
  // Varias islas, para no depender de la suerte de una sola semilla.
  const worlds = [1, 2, 3, 4, 5, 6].map((s) => new World(s * 7919, material));

  it('hay bosquecillos de bambú y praderas de flores en alguna isla', () => {
    const zones = new Set<string>();
    for (const w of worlds) {
      for (let x = -60; x <= 60; x += 3) for (let z = -60; z <= 60; z += 3) zones.add(String(w.zoneAt(x, z)));
    }
    expect(zones).toContain('bambu');
    expect(zones).toContain('pradera');
  });

  it('el bambú crece sobre hierba y no en la playa', () => {
    let found = 0;
    for (const w of worlds) {
      for (let x = -60; x <= 60 && found < 20; x++) {
        for (let z = -60; z <= 60 && found < 20; z++) {
          if (w.zoneAt(x, z) !== 'bambu') continue;
          const h = w.heightAt(x, z);
          if (w.getBlock(x, h + 1, z) !== Block.Bamboo) continue;
          expect(w.getBlock(x, h, z)).toBe(Block.Grass);
          found++;
        }
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it('las cascadas caen de un acantilado alto hacia un sitio más bajo', () => {
    let total = 0;
    for (const w of worlds) {
      for (const s of w.waterfallSpots(2)) {
        total++;
        expect(s.top - s.bottom).toBeGreaterThanOrEqual(4);
        expect(Math.abs(s.dx) + Math.abs(s.dz)).toBe(1);
        expect(w.heightAt(s.x, s.z)).toBe(s.top);
      }
    }
    expect(total).toBeGreaterThan(0);
  });
});

describe('pradera de flores', () => {
  it('tiene flores de muchos colores', () => {
    const kinds = new Set<number>();
    const w = new World(7919 * 3, material);
    for (let x = -60; x <= 60; x++) {
      for (let z = -60; z <= 60; z++) {
        if (w.zoneAt(x, z) !== 'pradera') continue;
        kinds.add(w.getBlock(x, w.heightAt(x, z) + 1, z));
      }
    }
    for (const b of [Block.FlowerRed, Block.FlowerYellow, Block.FlowerWhite, Block.FlowerBlue, Block.FlowerPink]) expect(kinds).toContain(b);
  });
});

describe('agua de verdad (v3.8)', () => {
  it('el mar son bloques de agua quieta hasta el nivel del mar', () => {
    const world = new World(SEED, material);
    const h = world.heightAt(200, 0);
    expect(world.getBlock(200, SEA_LEVEL, 0)).toBe(Block.Water);
    expect(world.getBlock(200, h + 1, 0)).toBe(Block.Water);
    expect(world.getBlock(200, SEA_LEVEL + 1, 0)).toBe(Block.Air);
    expect(world.inWater(200.5, SEA_LEVEL + 0.5, 0.5)).toBe(true);
    expect(world.inWater(200.5, SEA_LEVEL + 0.95, 0.5)).toBe(false);
    expect(world.waterSurface(200, 0)).toBeCloseTo(SEA_LEVEL + 0.85);
  });

  it('una zanja cavada hasta el mar se llena de agua', async () => {
    const { Fluids, FLUID_STEP } = await import('../src/fluids');
    const world = new World(SEED, material);
    const fluids = new Fluids({ getBlock: (x, y, z) => world.getBlock(x, y, z), setBlock: (x, y, z, b) => world.setBlock(x, y, z, b), loaded: (x, z) => world.hasColumn(x, z) });
    world.onBlockChange = (x, y, z) => fluids.wake(x, y, z);
    // Buscar la orilla hacia +x.
    let shore = 0;
    while (world.waterKind(shore, 0) !== 'mar') shore++;
    // Cavar 4 bloques hacia dentro, a la altura del agua.
    for (let i = 1; i <= 4; i++) world.setBlock(shore - i, SEA_LEVEL, 0, Block.Air);
    for (let i = 0; i < 40; i++) fluids.update(FLUID_STEP);
    expect(world.getBlock(shore - 1, SEA_LEVEL, 0)).not.toBe(Block.Air);
    expect(world.waterKind(shore - 1, 0)).not.toBeNull();
  });
});
