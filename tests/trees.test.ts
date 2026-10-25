import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block, CREATURE_TILE_START, Tile, isBarrier, isFence, isSolid, toggled } from '../src/blocks';
import { DIY_RECIPES, RECIPES, dropFor, itemDef } from '../src/items';
import { GROW_DAYS, Orchard, TREE_KINDS } from '../src/orchard';
import { Player } from '../src/player';
import { fellTree, fruitTreeShape } from '../src/trees';
import { World } from '../src/world';

const material = new THREE.MeshBasicMaterial();
const SEED = 20261025;

/** Mundo de bloques sencillo, para probar sin generar una isla. */
function flatWorld() {
  const blocks = new Map<string, number>();
  const k = (x: number, y: number, z: number) => `${x},${y},${z}`;
  return {
    getBlock: (x: number, y: number, z: number) => blocks.get(k(x, y, z)) ?? (y <= 10 ? Block.Grass : Block.Air),
    setBlock: (x: number, y: number, z: number, b: Block) => void blocks.set(k(x, y, z), b),
  };
}

describe('talar árboles', () => {
  it('al cortar el tronco cae el árbol entero y el tocón se queda', () => {
    const w = flatWorld();
    for (const [dx, dy, dz, b] of fruitTreeShape(Block.Apple, 0)) w.setBlock(dx, 11 + dy, dz, b);
    const felled = fellTree(w, 0, 12, 0);
    expect(felled.logs.map(([, y]) => y).sort()).toEqual([12, 13, 14]);
    expect(felled.fruits).toHaveLength(3);
    expect(felled.leaves.length).toBeGreaterThan(20);
    expect(felled.fruits.every(([, , , b]) => b === Block.Apple)).toBe(true);
  });

  it('no se lleva la copa de un árbol vecino', () => {
    const w = flatWorld();
    for (const [dx, dy, dz, b] of fruitTreeShape(Block.Apple, 0)) w.setBlock(dx, 11 + dy, dz, b);
    for (const [dx, dy, dz, b] of fruitTreeShape(Block.Apple, 0)) w.setBlock(4 + dx, 11 + dy, dz, b);
    const felled = fellTree(w, 0, 11, 0);
    expect(felled.leaves.some(([x]) => x >= 3)).toBe(false);
    expect(felled.logs.every(([x]) => x === 0)).toBe(true);
  });

  it('funciona con los árboles de la isla', () => {
    const world = new World(SEED, material);
    let found: [number, number, number] | null = null;
    for (let x = -60; x < 60 && !found; x++) {
      for (let z = -60; z < 60 && !found; z++) {
        const y = world.heightAt(x, z) + 1;
        if (world.getBlock(x, y, z) === Block.Log && world.getBlock(x, y - 1, z) !== Block.Log) found = [x, y, z];
      }
    }
    expect(found).not.toBeNull();
    const felled = fellTree(world, ...found!);
    expect(felled.logs).toHaveLength(4);
  });
});

describe('brotes', () => {
  it('cada tipo de árbol tiene brote, receta y nombre', () => {
    for (const k of TREE_KINDS) {
      expect(itemDef(k.sapling).block).toBe(k.block);
      expect(RECIPES.some((r) => r.result === k.sapling)).toBe(true);
    }
  });

  it('el brote crece en árbol tras unos días y da su fruta', () => {
    const w = flatWorld();
    const orchard = new Orchard();
    w.setBlock(0, 11, 0, Block.Sapling);
    orchard.plant(0, 11, 0, 'brote_cerezo', 'd0');
    for (let d = 1; d < GROW_DAYS; d++) expect(orchard.sync(w, `d${d}`)).toBe(0);
    expect(orchard.sync(w, `d${GROW_DAYS}`)).toBe(1);
    expect(w.getBlock(0, 11, 0)).toBe(Block.Log);
    const fruit = orchard.list[0];
    const spots = orchard.shape(fruit).filter(([, , , b]) => b === Block.Cherry);
    expect(spots).toHaveLength(3);
    const [dx, dy, dz] = spots[0];
    expect(orchard.fruitAt(dx, 11 + dy, dz)).toBe(Block.Cherry);
    // Se guarda y se recupera.
    expect(new Orchard(orchard.serialize()).list[0].grown).toBe(true);
  });

  it('un brote arrancado se olvida', () => {
    const w = flatWorld();
    const orchard = new Orchard();
    orchard.plant(0, 11, 0, 'brote_palmera', 'd0');
    orchard.sync(w, 'd1');
    expect(orchard.list).toHaveLength(0);
  });
});

describe('vallas y puertas', () => {
  it('las puertas se abren y se cierran', () => {
    expect(toggled(Block.Gate)).toBe(Block.GateOpen);
    expect(toggled(toggled(Block.Door)!)).toBe(Block.Door);
    expect(isSolid(Block.DoorOpen)).toBe(false);
    expect(isSolid(Block.Door)).toBe(true);
    expect(isFence(Block.Gate)).toBe(true);
    expect(isBarrier(Block.GateOpen)).toBe(false);
    expect(isBarrier(Block.Door)).toBe(true);
    expect(dropFor(Block.DoorTop)).toBeNull();
    expect(dropFor(Block.DoorOpen)).toBe('puerta');
  });

  it('las recetas de puertas existen', () => {
    expect(DIY_RECIPES.some((r) => r.result === 'puerta')).toBe(true);
    expect(DIY_RECIPES.some((r) => r.result === 'puerta_valla')).toBe(true);
  });

  it('los iconos nuevos caben en el atlas', () => {
    expect(Tile.PalmSapling).toBeLessThan(CREATURE_TILE_START);
  });

  it('no se puede saltar un corral de vallas, ni corriendo', () => {
    const world = new World(SEED, material);
    const [sx, sz] = world.findSpawn(0, 0);
    const g = world.heightAt(sx, sz) + 5;
    for (let x = sx - 4; x <= sx + 4; x++) {
      for (let z = sz - 4; z <= sz + 6; z++) {
        world.setBlock(x, g, z, Block.Stone);
        for (let y = g + 1; y < g + 6; y++) world.setBlock(x, y, z, Block.Air);
      }
    }
    for (let i = -3; i <= 3; i++) {
      world.setBlock(sx + i, g + 1, sz - 2, Block.Fence);
      world.setBlock(sx + i, g + 1, sz + 4, i === 0 ? Block.Gate : Block.Fence);
    }
    for (let i = -2; i <= 4; i++) {
      world.setBlock(sx - 3, g + 1, sz + i, Block.Fence);
      world.setBlock(sx + 3, g + 1, sz + i, Block.Fence);
    }
    for (let a = -Math.PI; a < Math.PI; a += 0.2) {
      const p = new Player(world, new THREE.PerspectiveCamera());
      p.position.set(sx + 0.5, g + 1, sz + 1.5);
      p.yaw = a;
      for (const code of ['KeyW', 'Space', 'ShiftLeft']) window.dispatchEvent(new KeyboardEvent('keydown', { code }));
      for (let i = 0; i < 240; i++) {
        p.update(1 / 60);
        expect(p.position.x).toBeGreaterThan(sx - 2);
        expect(p.position.x).toBeLessThan(sx + 3);
        expect(p.position.z).toBeGreaterThan(sz - 1);
        expect(p.position.z).toBeLessThan(sz + 4);
      }
      for (const code of ['KeyW', 'Space', 'ShiftLeft']) window.dispatchEvent(new KeyboardEvent('keyup', { code }));
    }
  });
});
