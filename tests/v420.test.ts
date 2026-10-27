import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { biomeWeather } from '../src/biomeFx';
import { BLOCKS, Block, burnt, collisionBoxes, isLava, isTargetable, lavaHeight } from '../src/blocks';
import { clothOf } from '../src/clothes';
import { catalogOf, GRAVA } from '../src/economy';
import { Fluids, LAVA_SLOWNESS } from '../src/fluids';
import { itemDef } from '../src/items';
import { LORE } from '../src/lore';
import { CLIMATE_BIOMES, type Biome, World } from '../src/world';

const material = new THREE.MeshBasicMaterial();

/** Un mundo de prueba: suelo de piedra en y = 0 y lo demás aire. */
function flat() {
  const blocks = new Map<string, Block>();
  const w = {
    getBlock: (x: number, y: number, z: number) => blocks.get(`${x},${y},${z}`) ?? (y <= 0 ? Block.Stone : Block.Air),
    setBlock: (x: number, y: number, z: number, b: Block) => {
      blocks.set(`${x},${y},${z}`, b);
      fluids.wake(x, y, z);
    },
    loaded: () => true,
  };
  const fluids = new Fluids(w, () => 0.99);
  return { w, fluids };
}

function run(fluids: Fluids, steps: number) {
  for (let i = 0; i < steps; i++) fluids.step();
}

describe('v4.20: la lava', () => {
  it('corre, pero solo 3 bloques y más despacio que el agua', () => {
    const lava = flat();
    lava.w.setBlock(0, 1, 0, Block.Lava);
    const water = flat();
    water.w.setBlock(0, 1, 0, Block.Water);
    run(lava.fluids, 3);
    run(water.fluids, 3);
    // El agua ya ha llegado lejos; la lava casi no se ha movido.
    const reach = (g: ReturnType<typeof flat>, f: (b: number) => boolean) => [1, 2, 3, 4, 5, 6, 7].filter((x) => f(g.w.getBlock(x, 1, 0))).length;
    expect(reach(water, (b) => b >= Block.Water && b <= Block.WaterFall)).toBeGreaterThan(reach(lava, isLava));
    run(lava.fluids, 40 * LAVA_SLOWNESS);
    expect(isLava(lava.w.getBlock(3, 1, 0))).toBe(true);
    expect(isLava(lava.w.getBlock(4, 1, 0))).toBe(false);
  });

  it('con agua se vuelve obsidiana (la fuente) o lava petrificada (la que corre)', () => {
    const g = flat();
    g.w.setBlock(0, 1, 0, Block.Lava);
    g.w.setBlock(1, 1, 0, Block.Water);
    run(g.fluids, LAVA_SLOWNESS * 2);
    expect(g.w.getBlock(0, 1, 0)).toBe(Block.Obsidian);
    const h = flat();
    h.w.setBlock(0, 1, 0, Block.LavaFlow2);
    h.w.setBlock(0, 1, 1, Block.Water);
    let quenched = 0;
    h.fluids.onQuench = () => quenched++;
    run(h.fluids, LAVA_SLOWNESS * 2);
    expect(h.w.getBlock(0, 1, 0)).toBe(Block.PetrifiedLava);
    expect(quenched).toBe(1);
  });

  it('quema plantas y madera, y la hierba se queda en tierra', () => {
    expect(burnt(Block.TallGrass)).toBe(Block.Air);
    expect(burnt(Block.Leaves)).toBe(Block.Air);
    expect(burnt(Block.Planks)).toBe(Block.Air);
    expect(burnt(Block.Grass)).toBe(Block.Dirt);
    expect(burnt(Block.Stone)).toBeNull();
    const blocks = new Map<string, Block>([['0,1,0', Block.Lava], ['1,1,0', Block.Planks]]);
    const w = {
      getBlock: (x: number, y: number, z: number) => blocks.get(`${x},${y},${z}`) ?? (y <= 0 ? Block.Stone : Block.Air),
      setBlock: (x: number, y: number, z: number, b: Block) => void blocks.set(`${x},${y},${z}`, b),
      loaded: () => true,
    };
    // Con un azar que siempre elige el tablón (el tercero de la lista: lado +x).
    const seq = [0.1, 2.5 / 10];
    let i = 0;
    const fluids = new Fluids(w, () => seq[i++ % seq.length]);
    fluids.wake(0, 1, 0);
    fluids.step();
    // El tablón se quema y la lava corre por el hueco.
    expect(blocks.get('1,1,0')).not.toBe(Block.Planks);
    expect(isLava(blocks.get('1,1,0')!) || blocks.get('1,1,0') === Block.Air).toBe(true);
  });

  it('no se choca con ella, no se apunta y alumbra', () => {
    expect(collisionBoxes(Block.Lava)).toEqual([]);
    expect(isTargetable(Block.LavaFlow1)).toBe(false);
    expect(lavaHeight(Block.Lava)).toBeGreaterThan(lavaHeight(Block.LavaFlow3));
    expect(BLOCKS[Block.Lava].shape).toBe('lava');
  });

  it('cubo de lava y botas ignífugas (en la caseta de Grava)', () => {
    expect(itemDef('cubo_lava').tool).toBe('bucket');
    expect(clothOf('botas_ignifugas')!.garment.slot).toBe('pies');
    expect(catalogOf(GRAVA)).toContain('botas_ignifugas');
  });
});

describe('v4.20: biomas extraños', () => {
  it('la isla extraña tiene los tres, cada uno con lo suyo', () => {
    const world = new World(31337, material, {}, { terrain: 2, climate: 'extrano' });
    const seen = new Map<Biome, Map<number, number>>();
    for (let r = 40; r <= 90; r += 6) {
      for (let a = 0; a < Math.PI * 2; a += 0.03) {
        const x = Math.round(Math.cos(a) * r);
        const z = Math.round(Math.sin(a) * r);
        const b = world.biomeAt(x, z);
        if (!b) continue;
        const count = seen.get(b) ?? new Map<number, number>();
        seen.set(b, count);
        for (let y = 15; y < 50; y++) {
          const k = world.getBlock(x, y, z);
          count.set(k, (count.get(k) ?? 0) + 1);
        }
      }
    }
    for (const b of CLIMATE_BIOMES.extrano) expect(seen.has(b), b).toBe(true);
    expect(seen.get('luminoso')!.get(Block.GlowGrass) ?? 0).toBeGreaterThan(0);
    expect(seen.get('setas')!.get(Block.Mycelium) ?? 0).toBeGreaterThan(0);
    const volcanic = seen.get('volcanico')!;
    expect((volcanic.get(Block.Basalt) ?? 0) + (volcanic.get(Block.Blackstone) ?? 0)).toBeGreaterThan(0);
    expect(volcanic.get(Block.Lava) ?? 0).toBeGreaterThan(0);
  });

  it('siempre flota algo en el aire', () => {
    expect(biomeWeather('volcanico', 'sol')).toBe('ceniza');
    expect(biomeWeather('luminoso', 'sol')).toBe('luces');
    expect(biomeWeather('setas', 'nubes')).toBe('esporas');
  });

  it('todo lo nuevo tiene su curiosidad', () => {
    for (const id of ['cubo_lava', 'obsidiana', 'lava_petrificada', 'ceniza', 'pizarra', 'hierba_azul', 'flor_luminosa', 'seta_luminosa', 'brote_luminoso', 'micelio', 'ladrillo_basalto', 'obsidiana_tallada', 'lampara_seta', 'botas_ignifugas']) {
      expect(LORE[id], id).toBeTruthy();
    }
  });
});
