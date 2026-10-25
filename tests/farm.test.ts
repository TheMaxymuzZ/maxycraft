import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { CROPS, Farm, type FarmWorld, cropForSeed, cropOfBlock } from '../src/farm';
import { RECIPES, hasItem, itemDef } from '../src/items';

/** Un mundo de mentira: solo una lista de bloques. */
function fakeWorld(): FarmWorld & { blocks: Map<string, number> } {
  const blocks = new Map<string, number>();
  return {
    blocks,
    getBlock: (x, y, z) => blocks.get(`${x},${y},${z}`) ?? Block.Air,
    setBlock: (x, y, z, b) => void blocks.set(`${x},${y},${z}`, b),
  };
}

function planted(crop: keyof typeof CROPS) {
  const world = fakeWorld();
  world.setBlock(0, 10, 0, Block.Farmland);
  world.setBlock(0, 11, 0, CROPS[crop].stages[0]);
  const farm = new Farm();
  farm.plant(0, 11, 0, crop);
  return { world, farm };
}

describe('huerto', () => {
  it('cada semilla tiene su cultivo y todo lo del huerto existe', () => {
    for (const c of Object.values(CROPS)) {
      expect(cropForSeed(c.seed)).toBe(c);
      expect(hasItem(c.seed)).toBe(true);
      expect(hasItem(c.produce)).toBe(true);
      c.stages.forEach((b, i) => expect(cropOfBlock(b)).toEqual({ crop: c, stage: i }));
    }
    expect(cropForSeed('manzana')).toBeNull();
    expect(cropOfBlock(Block.Grass)).toBeNull();
  });

  it('crece una fase por cada día regado, al día siguiente', () => {
    const { world, farm } = planted('trigo');
    expect(farm.water(0, 11, 0, '2026-10-01')).toBe(true);
    expect(farm.water(0, 11, 0, '2026-10-01')).toBe(false); // ya regada hoy
    farm.sync(world, '2026-10-01');
    expect(world.getBlock(0, 11, 0)).toBe(Block.Wheat0);
    expect(world.getBlock(0, 10, 0)).toBe(Block.FarmlandWet);

    farm.sync(world, '2026-10-02');
    expect(world.getBlock(0, 11, 0)).toBe(Block.Wheat1);
    expect(world.getBlock(0, 10, 0)).toBe(Block.Farmland); // se ha secado

    // Sin regar no crece.
    farm.sync(world, '2026-10-05');
    expect(world.getBlock(0, 11, 0)).toBe(Block.Wheat1);
  });

  it('la lluvia riega todo y a los tres días regados está maduro', () => {
    const { world, farm } = planted('tomate');
    for (const day of ['2026-10-01', '2026-10-02', '2026-10-03']) expect(farm.waterAll(day)).toBe(true);
    expect(farm.waterAll('2026-10-03')).toBe(false);
    farm.sync(world, '2026-10-04');
    expect(world.getBlock(0, 11, 0)).toBe(Block.Tomato3);
    const h = farm.harvest(0, 11, 0, '2026-10-04');
    expect(h).toEqual({ produce: 'tomate', count: CROPS.tomate.yield, seeds: 1, seed: 'semillas_tomate' });
    expect(farm.has(0, 11, 0)).toBe(false);
  });

  it('si se arranca antes de tiempo devuelve la semilla', () => {
    const { farm } = planted('zanahoria');
    expect(farm.harvest(0, 11, 0, '2026-10-01')).toEqual({ produce: null, count: 0, seeds: 1, seed: 'semillas_zanahoria' });
    expect(farm.harvest(0, 11, 0, '2026-10-01')).toBeNull();
  });

  it('olvida las plantas que ya no están en el mundo', () => {
    const { world, farm } = planted('trigo');
    world.setBlock(0, 11, 0, Block.Air);
    farm.sync(world, '2026-10-01');
    expect(farm.has(0, 11, 0)).toBe(false);
  });

  it('se guarda y se carga, sin acumular días viejos', () => {
    const { farm } = planted('trigo');
    for (let d = 1; d <= 9; d++) farm.water(0, 11, 0, `2026-10-0${d}`);
    const saved = farm.serialize();
    expect(saved['0,11,0'].watered.length).toBe(4);
    const again = new Farm(JSON.parse(JSON.stringify(saved)));
    expect(again.stageOf(again.crops.get('0,11,0')!, '2026-10-10')).toBe(3);
    // Lo que no se entiende se ignora.
    expect(new Farm({ x: { crop: 'patata' as never, watered: [] } }).crops.size).toBe(0);
  });

  it('cocinar vale más que vender los ingredientes', () => {
    for (const id of ['pan', 'tortilla', 'sopa', 'pastel']) {
      const r = RECIPES.find((x) => x.result === id)!;
      const parts = r.needs.reduce((sum, [n, c]) => sum + itemDef(n).sell * c, 0);
      expect(itemDef(id).sell, id).toBeGreaterThan(parts);
    }
  });
});
