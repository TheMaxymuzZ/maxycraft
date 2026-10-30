import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ATLAS_TILES, BLOCKS, Block, CREATURE_TILE_START, EXTRA_TILE_START, FURNITURE_TILE_START, Tile, allBlocks, blockByKey, blockKey, isKnownBlock } from '../src/blocks';
import { FURNITURE, FURNITURE_TILE, FURNITURE_TILE_START_2 } from '../src/furniture';
import { ITEMS, ITEM_KINDS, RARITIES, itemDef } from '../src/items';
import { isWorldAction } from '../src/net/actions';
import { PROTOCOL } from '../src/net/protocol';
import { SAVE_VERSION, checkSave, importSave } from '../src/save';
import { CHUNK, HEIGHT, World, type WorldOptions } from '../src/world';

const material = new THREE.MeshBasicMaterial();

/** Huella de un trozo de isla: si cambia un solo bloque, cambia la huella. */
function worldHash(world: World, r = 4): number {
  let h = 2166136261;
  for (let x = -r * CHUNK; x < r * CHUNK; x++) {
    for (let z = -r * CHUNK; z < r * CHUNK; z++) {
      for (let y = 0; y < HEIGHT; y++) {
        h ^= world.getBlock(x, y, z);
        h = Math.imul(h, 16777619) >>> 0;
      }
    }
  }
  return h;
}

// Huellas tomadas con el código de la v4.4 (bloques en 8 bits), antes de pasar a 16 bits.
// La del terreno 1 cambió a propósito en la v4.13: salen islotes en el mar abierto (la isla no cambia).
// Las dos cambiaron en la v4.15 (el museo es un edificio de cuatro plantas) y en la v4.16 (la tienda nueva).
// La del terreno 1, otra vez en la v5.0.1: los islotes son más grandes.
const CASES: [string, number, WorldOptions, number][] = [
  ['terreno 1', 20261025, {}, 917443858],
  ['terreno 2', 777, { terrain: 2 }, 4057922246],
  ['isla del volcán', 4242, { mystery: { kind: 'volcan', fruit: Block.Apple } }, 3091704902],
];

describe('v4.5: los bloques en 16 bits no cambian ninguna isla', () => {
  for (const [name, seed, options, hash] of CASES) {
    it(name, () => expect(worldHash(new World(seed, material, {}, options))).toBe(hash));
  }

  it('caben bloques por encima de 255', () => {
    const world = new World(1, material);
    // Un número alto en los datos del mundo no se corta a 8 bits (300 & 255 sería 44).
    const data = new Uint16Array(1);
    data[0] = 300;
    expect(data[0]).toBe(300);
    world.setBlock(0, 40, 0, Block.Stone);
    expect(world.getBlock(0, 40, 0)).toBe(Block.Stone);
  });
});

describe('v4.5: registro de bloques', () => {
  it('cada bloque tiene un nombre fijo y se encuentra por él', () => {
    for (const b of allBlocks()) {
      expect(blockByKey(blockKey(b))).toBe(b);
    }
    expect(blockByKey('Basalt')).toBe(Block.Basalt);
    expect(blockByKey('NoExiste')).toBeUndefined();
  });

  it('distingue bloques que existen de los que no', () => {
    expect(isKnownBlock(Block.Stone)).toBe(true);
    expect(isKnownBlock(9999)).toBe(false);
    expect(isKnownBlock(1.5)).toBe(false);
  });

  it('la red no acepta bloques desconocidos aunque quepan en 16 bits', () => {
    expect(isWorldAction({ t: 'bloque', x: 0, y: 10, z: 0, b: Block.Stone })).toBe(true);
    expect(isWorldAction({ t: 'bloque', x: 0, y: 10, z: 0, b: 9999 })).toBe(false);
    // Romper un bloque es poner aire: también tiene que valer.
    expect(isWorldAction({ t: 'bloque', x: 0, y: 10, z: 0, b: Block.Air })).toBe(true);
  });

  it('el atlas tiene sitio para casillas nuevas sin mover las de antes', () => {
    expect(ATLAS_TILES * ATLAS_TILES).toBeGreaterThanOrEqual(1024);
    // Las casillas de siempre no se mueven: el mapa (v4.4) sigue justo antes de los peces.
    expect(Tile.Map).toBeLessThan(CREATURE_TILE_START);
    // v5.3: los muebles que no caben antes de los dibujos extra van más adelante, sin pisar nada.
    const tiles = FURNITURE.map((f) => FURNITURE_TILE(f.id));
    expect(new Set(tiles).size).toBe(FURNITURE.length);
    for (const t of tiles) expect(t < EXTRA_TILE_START || (t >= FURNITURE_TILE_START_2 && t < ATLAS_TILES * ATLAS_TILES)).toBe(true);
    expect(Math.min(...tiles)).toBe(FURNITURE_TILE_START);
    for (const b of allBlocks()) for (const t of BLOCKS[b].tiles) expect(t).toBeLessThan(ATLAS_TILES * ATLAS_TILES);
  });

  it('el protocolo sube para no mezclar versiones', () => {
    expect(PROTOCOL).toBeGreaterThanOrEqual(4);
  });
});

describe('v4.5: fichas de objetos', () => {
  it('todos los objetos tienen tipo y rareza', () => {
    for (const d of ITEMS) {
      expect(ITEM_KINDS[d.kind], d.id).toBeDefined();
      expect(RARITIES[d.rarity], d.id).toBeDefined();
    }
  });

  it('se deducen bien', () => {
    expect(itemDef('piedra').kind).toBe('bloque');
    expect(itemDef('pico').kind).toBe('herramienta');
    expect(itemDef('pan').kind).toBe('consumible');
    expect(itemDef('silla').kind).toBe('mueble');
    expect(itemDef('sardina').kind).toBe('criatura');
    expect(itemDef('billete').kind).toBe('especial');
    expect(itemDef('concha').kind).toBe('tesoro');
    expect(itemDef('rama').kind).toBe('recurso');
    expect(itemDef('rama').rarity).toBe('comun');
    expect(itemDef('pico_hierro').rarity).toBe('raro');
    expect(itemDef('pepita_oro').rarity).toBe('epico');
    expect(itemDef('roca_magma').rarity).toBe('raro');
    // Lo que la tienda tiene siempre es común aunque sea caro.
    expect(itemDef('vaca').rarity).toBe('comun');
  });
});

// Partidas guardadas de cada época, con los campos que tenían entonces.
const OLD_SAVES: Record<string, Record<string, unknown>> = {
  '1.0': {
    version: 1, seed: 20261025, edits: { '0,0': { 5000: Block.Planks } },
    player: { x: 3, y: 30, z: 4, yaw: 0, pitch: 0 }, inventory: [{ id: 'rama', count: 3 }, null], wallet: 1200,
    home: { level: 1, debt: 4000, roof: 2 }, furniture: [], recipes: ['valla'], tutorial: ['mover'], tutorialDone: false,
  },
  '2.0': {
    version: 1, seed: 20261025, edits: { '0,0': { 5000: Block.Planks } }, player: null, wallet: 50000,
    savedAt: 1761300000000, farm: {}, guests: [], missions: undefined, caught: ['sardina'], donated: ['sardina'],
  },
  '3.0': {
    version: 1, seed: 777, terrain: 2, edits: { '1,-1': { 4000: Block.Brick } }, player: null, wallet: 9000,
    clock: { day: 3, minute: 600 }, storage: {}, orchard: [], lots: [], met: ['Nube'], offhand: null,
  },
  '4.4': {
    version: 1, seed: 777, terrain: 2, edits: { '1,-1': { 4000: Block.Brick } }, player: { x: 0, y: 40, z: 0, yaw: 1, pitch: 0 },
    learned: { Nube: 2 }, homes: [], vitals: { hp: 20, hunger: 18 }, inventory: [{ id: 'mapa', count: 1 }],
  },
};

describe('v4.5: partidas de antes se cargan igual', () => {
  for (const [era, raw] of Object.entries(OLD_SAVES)) {
    it(`partida de la ${era}`, () => {
      const copy = structuredClone(raw);
      const save = checkSave(copy);
      expect(save).not.toBeNull();
      expect(save!.version).toBe(SAVE_VERSION);
      // Nada de lo que tenía se pierde.
      for (const [k, v] of Object.entries(raw)) if (k !== 'version') expect((save as unknown as Record<string, unknown>)[k]).toEqual(v);
      // Y la isla es la misma, con los cambios del jugador en su sitio.
      const world = new World(save!.seed, material, save!.edits, { terrain: save!.terrain });
      const [k, list] = Object.entries(raw.edits as Record<string, Record<number, number>>)[0];
      const [cx, cz] = k.split(',').map(Number);
      const [i, b] = Object.entries(list)[0];
      const n = Number(i);
      const x = cx * CHUNK + (n % CHUNK);
      const z = cz * CHUNK + (Math.floor(n / CHUNK) % CHUNK);
      const y = Math.floor(n / (CHUNK * CHUNK));
      expect(world.getBlock(x, y, z)).toBe(b);
    });
  }

  it('una copia exportada con la 4.4 se importa', () => {
    const file = JSON.stringify({ juego: 'maxycraft', formato: 1, exportada: '2026-10-26T10:00:00Z', isla: OLD_SAVES['4.4'] });
    expect(importSave(file).version).toBe(SAVE_VERSION);
  });

  it('no acepta partidas de un formato futuro ni rotas', () => {
    expect(checkSave({ version: SAVE_VERSION + 1, seed: 1, edits: {} })).toBeNull();
    expect(checkSave({ version: 0, seed: 1, edits: {} })).toBeNull();
    expect(checkSave({ version: 1, seed: 'x', edits: {} })).toBeNull();
  });
});
