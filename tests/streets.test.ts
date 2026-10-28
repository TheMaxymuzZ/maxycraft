import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block, isGround, isPath } from '../src/blocks';
import { FURNITURE, Furniture, furnitureDef } from '../src/furniture';
import { DIY_RECIPES, STARTER_DIY, dropFor, itemDef } from '../src/items';
import { World } from '../src/world';

describe('calles y decoración', () => {
  it('los caminos sustituyen al suelo y se recogen', () => {
    for (const b of [Block.DirtPath, Block.StonePath, Block.Street, Block.Tiles]) {
      expect(isPath(b)).toBe(true);
      expect(isGround(b)).toBe(true);
      expect(dropFor(b)).toBeTruthy();
    }
    expect(isGround(Block.Grass)).toBe(true);
    expect(isGround(Block.Stone)).toBe(false);
  });

  it('las recetas de calle se saben desde el principio', () => {
    for (const id of ['camino_tierra', 'calle', 'farola', 'cartel', 'fuente_plaza']) {
      expect(STARTER_DIY).toContain(id);
      expect(DIY_RECIPES.some((r) => r.result === id)).toBe(true);
    }
    expect(itemDef('farola').maxStack).toBe(64);
  });

  it('una farola alumbra el suelo de alrededor y deja de hacerlo al quitarla', () => {
    const world = new World(20261025, new THREE.MeshBasicMaterial());
    const light = () => world['blockLightRegion'](0, 0)(4, 50, 4);
    expect(light()).toBe(0);
    const lights: [number, number, number, number][] = [];
    const furniture = new Furniture([], (x, y, z, level) => {
      lights.push([x, y, z, level]);
      world.setLamp(x, y, z, level);
    });
    furniture.place('farola', 4, 50, 6, 0);
    expect(lights[0]).toEqual([4, 50 + furnitureDef('farola')!.lightHeight!, 6, 15]);
    expect(light()).toBeGreaterThan(0.5);
    furniture.remove(furniture.at(4, 50, 6)!);
    expect(light()).toBe(0);
  });

  it('el cartel guarda lo que pone', () => {
    const furniture = new Furniture([]);
    furniture.place('cartel', 0, 20, 0, 0);
    const f = furniture.at(0, 20, 0)!;
    furniture.setText(f, '  Plaza Mayor  ');
    expect(furniture.serialize()[0].text).toBe('Plaza Mayor');
    furniture.setText(f, '');
    expect(furniture.serialize()[0].text).toBeUndefined();
    expect(FURNITURE.filter((d) => d.light).map((d) => d.id)).toContain('farola');
  });
});
