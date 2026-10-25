import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BLOCKS, Block, STAIRS, collisionBoxes, stairsFacing } from '../src/blocks';
import { categoryOf, compareItems, normalize } from '../src/categories';
import { HOTBAR_SIZE, Inventory } from '../src/inventory';
import { DIY_RECIPES, STARTER_DIY, dropFor, itemDef } from '../src/items';
import { Player } from '../src/player';
import { World } from '../src/world';

const material = new THREE.MeshBasicMaterial();

describe('bloques de construcción', () => {
  it('las escaleras se giran y se recogen como la misma escalera', () => {
    for (const [first] of STAIRS) {
      for (let f = 0; f < 4; f++) {
        const b = stairsFacing(first, f);
        expect(BLOCKS[b].facing).toBe(f);
        expect(dropFor(b)).toBe(dropFor(first));
      }
    }
    expect(dropFor(Block.BrickStairs + 2)).toBe('escalera_ladrillo');
  });

  it('losas y escaleras chocan a media altura', () => {
    expect(collisionBoxes(Block.PlanksSlab)).toEqual([[0, 0, 0, 1, 0.5, 1]]);
    expect(collisionBoxes(Block.CobbleStairs)).toHaveLength(2);
    expect(collisionBoxes(Block.Fence)[0][4]).toBe(1.5);
    expect(collisionBoxes(Block.DoorOpen)).toEqual([]);
  });

  it('todas las recetas de construcción se saben y dan objetos que existen', () => {
    for (const id of STARTER_DIY) expect(DIY_RECIPES.some((r) => r.result === id)).toBe(true);
    for (const r of DIY_RECIPES) for (const [id] of r.needs) expect(() => itemDef(id)).not.toThrow();
  });

  it('se sube a una losa andando, sin saltar', () => {
    const world = new World(20261025, material);
    const [sx, sz] = world.findSpawn(0, 0);
    const g = world.heightAt(sx, sz) + 6;
    for (let x = sx - 1; x <= sx + 1; x++) {
      for (let z = sz - 6; z <= sz + 2; z++) {
        world.setBlock(x, g, z, Block.Stone);
        for (let y = g + 1; y < g + 5; y++) world.setBlock(x, y, z, Block.Air);
      }
    }
    // Losa y luego escalera hacia -z: dos medios pasos.
    world.setBlock(sx, g + 1, sz - 2, Block.PlanksSlab);
    world.setBlock(sx, g + 1, sz - 3, stairsFacing(Block.PlanksStairs, 0));
    world.setBlock(sx, g + 1, sz - 4, Block.Planks);
    // Una pared al final para pararse encima de los tablones.
    for (let y = g + 1; y <= g + 4; y++) world.setBlock(sx, y, sz - 5, Block.Stone);
    const p = new Player(world, new THREE.PerspectiveCamera());
    p.position.set(sx + 0.5, g + 1, sz + 0.5);
    p.onGround = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    for (let i = 0; i < 180; i++) p.update(1 / 60);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    expect(p.position.y).toBeCloseTo(g + 2, 3);
    expect(p.position.z).toBeLessThan(sz - 3);
  });
});

describe('menús ordenados', () => {
  it('cada objeto va a su grupo', () => {
    expect(categoryOf('escalera_madera')).toBe('construir');
    expect(categoryOf('tronco')).toBe('naturaleza');
    expect(categoryOf('hacha')).toBe('herramientas');
    expect(categoryOf('pastel')).toBe('comida');
    expect(categoryOf('silla')).toBe('muebles');
    expect(categoryOf('brote_cerezo')).toBe('naturaleza');
  });

  it('el buscador no distingue acentos ni mayúsculas', () => {
    expect(normalize('Adoquín')).toBe('adoquin');
  });

  it('ordenar junta montones y respeta la barra rápida', () => {
    const inv = new Inventory();
    inv.slots[0] = { id: 'hacha', count: 1 };
    inv.slots[HOTBAR_SIZE + 3] = { id: 'tablones', count: 5 };
    inv.slots[HOTBAR_SIZE + 7] = { id: 'pastel', count: 1 };
    inv.slots[HOTBAR_SIZE + 9] = { id: 'tablones', count: 7 };
    inv.sort();
    expect(inv.slots[0]).toEqual({ id: 'hacha', count: 1 });
    expect(inv.slots[HOTBAR_SIZE]).toEqual({ id: 'tablones', count: 12 });
    expect(inv.slots[HOTBAR_SIZE + 1]?.id).toBe('pastel');
    expect(inv.slots.filter(Boolean)).toHaveLength(3);
    expect(compareItems('tablones', 'pastel')).toBeLessThan(0);
  });
});
