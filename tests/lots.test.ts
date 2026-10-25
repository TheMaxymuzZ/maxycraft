import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { type Lot, fits, lotFrom, lotPlan, lotPlot, lotProblem, lotProgress, rotate } from '../src/lots';
import { createVillagers } from '../src/villagers';
import { World } from '../src/world';

const material = new THREE.MeshBasicMaterial();
const SEED = 20261025;

/** Construye la casa del plano tal cual, con paredes de piedra y tejado rojo. */
function build(world: World, lot: Lot) {
  for (const c of lotPlan(lot)) {
    const b = c.part === 'floor' ? Block.Planks : c.part === 'wall' ? Block.Stone : c.part === 'roof' ? Block.RoofRed : c.part === 'inside' ? Block.Air : c.y === lot.y + 1 ? Block.Door : Block.DoorTop;
    world.setBlock(c.x, c.y, c.z, b);
  }
}

describe('casas para vecinos nuevos', () => {
  it('el plano es una casa de 5x5 con puerta, paredes, tejado y el interior libre', () => {
    const plan = lotPlan({ x: 0, y: 10, z: 0, dir: 0 });
    const count = (part: string) => plan.filter((c) => c.part === part).length;
    expect(count('floor')).toBe(25);
    expect(count('roof')).toBe(25);
    expect(count('door')).toBe(2);
    expect(count('wall')).toBe(16 * 3 - 2);
    expect(count('inside')).toBe(27);
    // La puerta está delante (+z) en el plano sin girar, y detrás si mira hacia -z.
    expect(plan.filter((c) => c.part === 'door').every((c) => c.x === 0 && c.z === 2)).toBe(true);
    expect(lotPlan({ x: 0, y: 10, z: 0, dir: 2 }).filter((c) => c.part === 'door').every((c) => c.z === -2)).toBe(true);
    expect(rotate(0, 2, 1)).toEqual([2, 0]);
    expect(rotate(0, 2, 3)).toEqual([-2, 0]);
  });

  it('valen muchos bloques distintos, pero no hojas ni huecos', () => {
    expect(fits('wall', Block.Brick)).toBe(true);
    expect(fits('wall', Block.Glass)).toBe(true);
    expect(fits('wall', Block.Leaves)).toBe(false);
    expect(fits('door', Block.DoorOpen)).toBe(true);
    expect(fits('door', Block.Planks)).toBe(false);
    expect(fits('roof', Block.RoofBlue)).toBe(true);
    expect(fits('inside', Block.Air)).toBe(true);
    expect(fits('inside', Block.Torch)).toBe(true);
    expect(fits('inside', Block.Stone)).toBe(false);
  });

  it('la puerta da al jugador y la casa queda al otro lado', () => {
    const lot = lotFrom(10, 5, 10, 10.5, 14);
    expect(lot.dir).toBe(0);
    expect([lot.x, lot.z]).toEqual([10, 7]);
    expect(lotPlot(lot).door).toEqual([10, 6, 10]);
    const west = lotFrom(10, 5, 10, 4, 10.5);
    expect(west.dir).toBe(3);
    expect(lotPlot(west).door).toEqual([10, 6, 10]);
  });

  it('se comprueba bloque a bloque hasta que la casa está completa', () => {
    const world = new World(SEED, material);
    const [[x, z]] = world.findGuestSpots(1);
    const lot: Lot = { x, y: world.heightAt(x, z), z, dir: 0 };
    const getBlock = (bx: number, by: number, bz: number) => world.getBlock(bx, by, bz);
    expect(lotProblem(lot, getBlock, { plots: world.plots, lots: [] })).toBeNull();
    const start = lotProgress(lot, getBlock);
    expect(start.total).toBe(98);
    expect(start.missing.length).toBeGreaterThan(70);
    build(world, lot);
    expect(lotProgress(lot, getBlock).missing).toEqual([]);
    // Si se quita un bloque de la pared, vuelve a faltar.
    world.setBlock(x - 2, lot.y + 2, z, Block.Air);
    expect(lotProgress(lot, getBlock).missing).toEqual([{ x: x - 2, y: lot.y + 2, z, part: 'wall' }]);
    // Un bloque dentro también estorba.
    world.setBlock(x - 2, lot.y + 2, z, Block.Stone);
    world.setBlock(x, lot.y + 1, z, Block.Stone);
    expect(lotProgress(lot, getBlock).missing.map((c) => c.part)).toEqual(['inside']);
  });

  it('no se puede marcar junto a otra casa ni otro plano', () => {
    const world = new World(SEED, material);
    const getBlock = (bx: number, by: number, bz: number) => world.getBlock(bx, by, bz);
    const house = world.plots.find((p) => p.kind === 'house')!;
    expect(lotProblem({ x: house.x + 3, y: house.y, z: house.z, dir: 0 }, getBlock, { plots: world.plots, lots: [] })).toMatch(/otra casa/);
    const [[x, z]] = world.findGuestSpots(1);
    const lot: Lot = { x, y: world.heightAt(x, z), z, dir: 0 };
    expect(lotProblem({ ...lot, x: x + 3 }, getBlock, { plots: world.plots, lots: [lot] })).toMatch(/otro plano/);
  });

  it('quien se muda vive en la casa que construiste, y la isla no cambia', () => {
    const world = new World(SEED, material);
    const [[x, z]] = world.findGuestSpots(1);
    const lot: Lot = { x, y: world.heightAt(x, z), z, dir: 1, done: true };
    const plots = world.plots.length;
    const villagers = createVillagers(world, {}, [{ name: 'Trompi', x, z, lot: true }], [lotPlot(lot)]);
    const trompi = villagers.find((v) => v.name === 'Trompi')!;
    expect(trompi.home.door).toEqual([x + 3, lot.y + 1, z]);
    expect(world.plots.length).toBe(plots); // no se genera ninguna casa nueva
  });
});
