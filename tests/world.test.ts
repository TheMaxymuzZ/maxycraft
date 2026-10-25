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
