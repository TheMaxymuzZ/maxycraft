import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BLOCKS, Block, isSolid } from '../src/blocks';
import { Town, type TownDeps } from '../src/game/town';
import { Inventory } from '../src/inventory';
import { parseMessage } from '../src/net/protocol';
import { findPath, standable } from '../src/pathfind';
import { rateIsland } from '../src/rating';
import { upcomingHoliday } from '../src/seasons';
import { HALL_LEVELS, buildRamp, hallDoor, hallTemplate, isTownSave, planBridge } from '../src/townhall';
import { ALL_PROFILES, type Villager, createVillagers, errandPlaces } from '../src/villagers';
import { SEA_LEVEL, World } from '../src/world';

vi.mock('../src/icons', () => ({ tileIcon: () => '', itemIcon: () => '' }));

const material = new THREE.MeshBasicMaterial();

function makeTown(world: World, villagers: Villager[], wallet = { n: 0 }) {
  const inventory = new Inventory();
  const deps: TownDeps = {
    world, villagers, scene: new THREE.Scene(),
    put: (x, y, z, b) => world.setBlock(x, y, z, b),
    placeFurniture: () => {},
    inventory,
    wallet: () => wallet.n,
    pay: (n) => { wallet.n -= n; },
    memories: {},
    rating: () => rateIsland({ flowers: 0, fences: 0, lights: 0, furniture: 0, house: 0, guests: 0, donated: 0, farm: 0 }),
    notices: () => [],
    host: true,
    changed: () => {},
    toast: () => {},
    persist: () => {},
  };
  return { town: new Town(deps), inventory, wallet };
}

describe('v4.13: islotes y puentes', () => {
  it('hay de 2 a 4 islotes en el mar, fuera de la isla, con playa y hierba', () => {
    for (const terrain of [1, 2]) {
      const world = new World(20261025, material, {}, { terrain });
      expect(world.islets.length).toBeGreaterThanOrEqual(2);
      expect(world.islets.length).toBeLessThanOrEqual(4);
      for (const i of world.islets) {
        expect(world.heightAt(i.x, i.z)).toBe(SEA_LEVEL + 2);
        expect(world.getBlock(i.x, SEA_LEVEL + 2, i.z)).toBe(Block.Grass);
        expect(Math.hypot(i.x, i.z)).toBeGreaterThan(world.islandRadius * 0.9);
      }
    }
    // Las islas misteriosas no tienen.
    expect(new World(1, material, {}, { mystery: { kind: 'flores', fruit: Block.Apple } }).islets).toEqual([]);
  });

  it('el puente une el islote con la isla y se puede cruzar andando', () => {
    const world = new World(20261025, material, {}, { terrain: 1 });
    const plan = planBridge(world, 0)!;
    expect(plan.length).toBeGreaterThan(3);
    expect(plan.blocks.some(([, , , b]) => b === Block.BridgePillar)).toBe(true);
    for (const [x, y, z, b] of plan.blocks) world.setBlock(x, y, z, b);
    const islet = world.islets[0];
    const on: [number, number, number] = [islet.x, SEA_LEVEL + 3, islet.z];
    // Desde el islote hasta la orilla de la isla hay camino (por el puente).
    const shore = plan.blocks.filter(([, , , b]) => b === Block.BridgeDeck).sort((a, b) => Math.hypot(a[0], a[2]) - Math.hypot(b[0], b[2]))[0];
    expect(standable(world, ...on)).toBe(true);
    expect(findPath(world, on, [shore[0], SEA_LEVEL + 2, shore[2]])).not.toBeNull();
  });
});

describe('v4.13: rampas en las islas de antes', () => {
  it('la tienda y el museo se alcanzan desde la plaza después de las rampas', () => {
    for (const seed of [1, 2, 20261025]) {
      const world = new World(seed, material, {}, { terrain: 1 });
      const p = errandPlaces(world);
      for (const door of [p.tienda!, p.museo!]) {
        buildRamp(world, door, p.plaza!);
        expect(findPath(world, p.plaza!, door), `semilla ${seed}`).not.toBeNull();
      }
    }
  });
});

describe('v4.13: ayuntamiento', () => {
  it('las plantillas de los 4 niveles tienen puerta y crecen sin salirse del solar', () => {
    for (let l = 1; l <= 4; l++) {
      const t = hallTemplate(l);
      for (const layer of t.layers) {
        expect(layer).toHaveLength(11);
        for (const row of layer) expect(row.length).toBe(11);
      }
      expect(t.layers.some((layer) => layer.some((r) => r.includes('D')))).toBe(true);
    }
    expect(hallTemplate(4).layers.flat().join('')).toContain('K');
    expect(HALL_LEVELS).toHaveLength(4);
  });

  it('aparece la caseta de obras con el alcalde; se mejora pagando, llega el urbanista y se encarga un puente', () => {
    const world = new World(20261025, material, {}, { terrain: 1 });
    const villagers = createVillagers(world, {});
    const { town, inventory, wallet } = makeTown(world, villagers);
    expect(town.level).toBe(1);
    expect(town.mayor?.name).toBe('Don Gregorio');
    expect(town.planner).toBeNull();
    const s = town.state!;
    const door = hallDoor(s, 1);
    expect(world.getBlock(door[0], door[1], door[2] - 1)).toBe(Block.Door);
    expect(isTownSave(s)).toBe(true);
    const a = town.actions();
    // Sin bayas ni materiales no se puede.
    expect(a.upgrade()).toBe('materials');
    inventory.add('tablones', 40);
    inventory.add('piedra', 20);
    expect(a.upgrade()).toBe('money');
    wallet.n = 100000;
    expect(a.upgrade()).toBe('ok');
    expect(town.level).toBe(2);
    expect(wallet.n).toBe(100000 - HALL_LEVELS[1].cost);
    expect(inventory.countOf('tablones')).toBe(0);
    expect(town.planner?.name).toBe('Ladrillo');
    // La puerta nueva está más adelante y el alcalde se ha movido a ella.
    const door2 = hallDoor(s, 2);
    expect(world.getBlock(door2[0], door2[1], door2[2] - 1)).toBe(Block.Door);
    expect(town.mayor!.home.door[2]).toBe(door2[2]);
    // La puerta de la caseta ya no está (quedó dentro).
    expect(isSolid(world.getBlock(door[0], door[1], door[2] - 1)) && world.getBlock(door[0], door[1], door[2] - 1) === Block.Door).toBe(false);
    // Obra pública: el puente.
    const bridge = a.works().find((w) => w.id.startsWith('puente-'))!;
    expect(bridge).toBeTruthy();
    expect(a.order(bridge.id)).toBe('ok');
    expect(town.state!.works).toContain(bridge.id);
    expect(a.works().some((w) => w.id === bridge.id)).toBe(false);
    // El urbanista vende planos.
    expect(a.buyBlueprint()).toBe('ok');
    expect(inventory.countOf('plano_casa')).toBe(1);
  });

  it('el alcalde y el urbanista están en el álbum, y el ayuntamiento viaja a los invitados', () => {
    expect(ALL_PROFILES.some((p) => p.name === 'Don Gregorio' && p.species === 'búho')).toBe(true);
    expect(ALL_PROFILES.some((p) => p.name === 'Ladrillo' && p.species === 'castor')).toBe(true);
    const town = { level: 2, x: 1, y: 20, z: 3, works: ['fuente'] };
    const msg = { t: 'bienvenida', snapshot: { seed: 1, edits: {}, options: {}, town }, players: [] };
    expect(parseMessage(msg)).not.toBeNull();
    expect(parseMessage({ ...msg, snapshot: { ...msg.snapshot, town: { ...town, level: 9 } } })).toBeNull();
  });

  it('bloques nuevos con nombre y el tablón avisa de las fiestas', () => {
    for (const b of [Block.BridgeDeck, Block.BridgeRail, Block.BridgePillar, Block.ClockFace]) expect(BLOCKS[b].name.length).toBeGreaterThan(3);
    expect(upcomingHoliday(new Date(2026, 9, 20))).toMatch(/Halloween/);
    expect(upcomingHoliday(new Date(2026, 5, 1))).toBeNull();
  });
});
