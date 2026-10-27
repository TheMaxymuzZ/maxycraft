import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { biomeLook, biomeWeather } from '../src/biomeFx';
import { BLOCKS, Block } from '../src/blocks';
import { CLIMATES, CLIMATE_BIOMES, type Biome, SEA_LEVEL, World, isClimate } from '../src/world';

const material = new THREE.MeshBasicMaterial();

/** Biomas que salen dando una vuelta a la isla. */
function biomesOf(world: World): Set<Biome> {
  const seen = new Set<Biome>();
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    const b = world.biomeAt(Math.round(Math.cos(a) * 75), Math.round(Math.sin(a) * 75));
    if (b) seen.add(b);
  }
  return seen;
}

/** Cuántas veces sale cada bloque en la superficie (y un poco por encima) de un trozo de isla. */
function surfaceCount(world: World, x0: number, z0: number, size = 48): Map<Block, number> {
  const out = new Map<Block, number>();
  for (let x = x0; x < x0 + size; x++) {
    for (let z = z0; z < z0 + size; z++) {
      for (let y = SEA_LEVEL - 2; y < 50; y++) {
        const b = world.getBlock(x, y, z) as Block;
        out.set(b, (out.get(b) ?? 0) + 1);
      }
    }
  }
  return out;
}

function spotOf(world: World, biome: Biome, size = 48): [number, number] {
  for (let r = 50; r <= 90; r += 10) {
    for (let a = 0; a < Math.PI * 2; a += 0.02) {
      const x = Math.round(Math.cos(a) * r);
      const z = Math.round(Math.sin(a) * r);
      if ([[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1], [size >> 1, size >> 1]].every(([dx, dz]) => world.biomeAt(x + dx, z + dz) === biome)) return [x, z];
    }
  }
  throw new Error(`sin ${biome}`);
}

describe('v4.19: climas y biomas', () => {
  it('cada clima tiene sus biomas, y todos salen en la isla', () => {
    for (const climate of CLIMATES) {
      const world = new World(777, material, {}, { terrain: 2, climate });
      expect(world.climate).toBe(climate);
      const seen = biomesOf(world);
      for (const b of CLIMATE_BIOMES[climate]) expect(seen.has(b), `${climate}: ${b}`).toBe(true);
    }
  });

  it('las islas de antes no cambian: sin clima, los cuatro biomas de siempre', () => {
    const old = new World(777, material, {}, { terrain: 2 });
    expect(old.climate).toBeUndefined();
    expect([...biomesOf(old)].filter((b) => b !== 'playa').sort()).toEqual(['bambu', 'bosque', 'montaña', 'pradera']);
    // Las islas pequeñas y las misteriosas no tienen clima aunque se lo pidan.
    expect(new World(777, material, {}, { terrain: 1, climate: 'frio' }).climate).toBeUndefined();
    expect(isClimate('tropical')).toBe(false);
  });

  it('cada bioma se reconoce por su suelo y sus plantas', () => {
    const warm = new World(4242, material, {}, { terrain: 2, climate: 'calido' });
    const desert = surfaceCount(warm, ...spotOf(warm, 'desierto'));
    expect(desert.get(Block.Sand) ?? 0).toBeGreaterThan(500);
    expect((desert.get(Block.Cactus) ?? 0) + (desert.get(Block.DryShrub) ?? 0)).toBeGreaterThan(0);
    expect(desert.get(Block.Grass) ?? 0).toBe(0);
    const jungle = surfaceCount(warm, ...spotOf(warm, 'selva'));
    expect(jungle.get(Block.JungleLeaves) ?? 0).toBeGreaterThan(0);
    const cold = new World(4242, material, {}, { terrain: 2, climate: 'frio' });
    const glacier = surfaceCount(cold, ...spotOf(cold, 'glaciar'));
    expect((glacier.get(Block.PackedIce) ?? 0) + (glacier.get(Block.BlueIce) ?? 0)).toBeGreaterThan(500);
    const taiga = surfaceCount(cold, ...spotOf(cold, 'taiga'));
    expect(taiga.get(Block.SnowLeaves) ?? 0).toBeGreaterThan(0);
    const mild = new World(4242, material, {}, { terrain: 2, climate: 'templado' });
    const swamp = surfaceCount(mild, ...spotOf(mild, 'pantano', 24), 24);
    expect(swamp.get(Block.Mud) ?? 0).toBeGreaterThan(0);
  });

  it('el tiempo cambia con el bioma', () => {
    expect(biomeWeather('desierto', 'lluvia')).toBe('arena');
    expect(biomeWeather('tundra', 'lluvia')).toBe('nieve');
    expect(biomeWeather('glaciar', 'nieve')).toBe('ventisca');
    expect(biomeWeather('bosque', 'lluvia')).toBe('lluvia');
    expect(biomeWeather(null, 'nubes')).toBe('nubes');
    expect(biomeLook('pantano', 'sol').far).toBeLessThan(1);
    expect(biomeLook('arena' as never, 'arena').mix).toBeGreaterThan(0.5);
  });

  it('el nenúfar es fino y se puede pisar', () => {
    expect(BLOCKS[Block.LilyPad].shape).toBe('pad');
  });
});
