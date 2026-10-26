import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block, isWater } from '../src/blocks';
import { CATALOG, itemDef } from '../src/items';
import { SEA_LEVEL, World } from '../src/world';

describe('mapa de la isla (v4.4)', () => {
  it('se vende siempre en la tienda', () => {
    expect(CATALOG).toContain('mapa');
    expect(itemDef('mapa').always).toBe(true);
  });

  it('desde el cielo se ve el mar con su hondura y la tierra con su bloque de arriba, cargada o no', () => {
    const world = new World(20261025, new THREE.MeshBasicMaterial());
    const sea = world.mapColumn(world.islandRadius * 2, 0);
    expect(isWater(sea.block)).toBe(true);
    expect(sea.depth).toBeGreaterThan(3);
    const shop = world.plots.find((p) => p.kind === 'shop')!;
    const before = world.mapColumn(shop.x + 4, shop.z + 4);
    world.update(shop.x, shop.z, 1, 99);
    const after = world.mapColumn(shop.x + 4, shop.z + 4);
    expect(after.y).toBe(before.y);
    expect(after.y).toBeGreaterThan(SEA_LEVEL);
    world.setBlock(shop.x + 4, after.y + 1, shop.z + 4, Block.Planks);
    expect(world.mapColumn(shop.x + 4, shop.z + 4).block).toBe(Block.Planks);
  });
});
