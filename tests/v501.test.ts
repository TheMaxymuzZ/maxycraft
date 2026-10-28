import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BLOCKS, Block, LIGHT_RADIUS, isSolid, isTorch, wallTorchFor } from '../src/blocks';
import { AVELLANA, stockFor } from '../src/economy';
import { ITEMS, MIN_STACK, dropFor, itemDef } from '../src/items';
import { defaultKeys, normalizeKeys } from '../src/keys';
import { clickStack, putStack } from '../src/storage';
import { DECK_MAX, DECK_Y, buildTerminal, clearTerminalSurroundings, deckOf, isTerminalSite, terminalDeckFor } from '../src/terminal';
import { MERCHANTS } from '../src/commerce';
import { WeatherFx } from '../src/weather';
import { ISLET_MIN_R, World } from '../src/world';

const material = new THREE.MeshBasicMaterial();

describe('v5.0.1: bolsillos y cofres', () => {
  it('lo que se amontona llega al menos a 64; herramientas, armas y muebles sueltos siguen de uno en uno', () => {
    for (const d of ITEMS) {
      if (d.maxStack > 1) expect(d.maxStack, d.id).toBeGreaterThanOrEqual(MIN_STACK);
      if (d.durability) expect(d.maxStack, d.id).toBe(1);
    }
    expect(itemDef('manzana').maxStack).toBe(64);
    expect(itemDef('hacha').maxStack).toBe(1);
  });

  it('coger, soltar y juntar montones en cualquier casilla (también en el cofre)', () => {
    const box: ({ id: string; count: number } | null)[] = [null, { id: 'manzana', count: 60 }, { id: 'piedra', count: 3 }];
    let hand = clickStack(box, 2, null, false);
    expect(hand).toEqual({ id: 'piedra', count: 3 });
    hand = clickStack(box, 0, hand, false);
    expect(hand).toBeNull();
    expect(box[0]).toEqual({ id: 'piedra', count: 3 });
    // Mitad con el derecho, y se junta con otro montón igual hasta 64.
    hand = clickStack(box, 1, null, true);
    expect(hand).toEqual({ id: 'manzana', count: 30 });
    box[2] = { id: 'manzana', count: 50 };
    hand = clickStack(box, 2, hand, false);
    expect(box[2]!.count).toBe(64);
    expect(hand).toEqual({ id: 'manzana', count: 16 });
    // Mayús + clic: de golpe al otro lado.
    const chest = new Array(3).fill(null);
    expect(putStack(chest, { id: 'manzana', count: 16 })).toBeNull();
    expect(chest[0]).toEqual({ id: 'manzana', count: 16 });
  });

  it('hay tecla para tirar; si ya se usaba la X, se busca otra libre', () => {
    expect(defaultKeys().drop).toBe('KeyX');
    const old = { ...defaultKeys(), map: 'KeyX' } as Record<string, string>;
    delete old.drop;
    const keys = normalizeKeys(old);
    expect(keys.map).toBe('KeyX');
    expect(keys.drop).not.toBe('KeyX');
    expect(new Set(Object.values(keys)).size).toBe(Object.keys(keys).length);
  });
});

describe('v5.0.1: mundo', () => {
  it('los islotes son grandes para construir y tienen una meseta llana', () => {
    for (const terrain of [1, 2]) {
      const world = new World(20261025, material, {}, { terrain });
      expect(world.islets.length).toBeGreaterThanOrEqual(2);
      for (const i of world.islets) {
        expect(i.r).toBeGreaterThanOrEqual(ISLET_MIN_R);
        expect(Math.hypot(i.x, i.z) + i.r).toBeLessThan(world.outerRadius);
      }
    }
  });

  it('la terminal se levanta a ras de la playa y no queda tierra por encima de la tarima', () => {
    const world = new World(20261025, material, {}, { terrain: 1 });
    const site = { x: 0, z: 0, rotation: 0 };
    const y = terminalDeckFor(world, site);
    expect(y).toBeGreaterThanOrEqual(DECK_Y);
    expect(y).toBeLessThanOrEqual(DECK_MAX);
    const built = { ...site, y };
    buildTerminal(world, built);
    clearTerminalSurroundings(world, built);
    expect(deckOf(built)).toBe(y);
    // Delante de la puerta de la playa (x = 4, z = -1 de la plantilla) se puede entrar sin escalón.
    expect(isSolid(world.getBlock(4, y + 1, -1))).toBe(false);
    expect(isTerminalSite(built)).toBe(true);
    expect(isTerminalSite({ ...built, y: DECK_MAX + 5 })).toBe(false);
    expect(isTerminalSite(site)).toBe(true);
  });

  it('los puentes se hacen a mano: sus piezas se venden siempre en la tienda', () => {
    const ids = stockFor(AVELLANA, { today: '2026-10-28', season: null, holiday: null }).map((s) => s.id);
    for (const id of ['tablones_puente', 'barandilla', 'pilar']) {
      expect(ids).toContain(id);
      expect(itemDef(id).buy).toBeGreaterThan(0);
    }
  });
});

describe('v5.0.1: antorchas, tenderos y tiempo', () => {
  it('las antorchas de pared alumbran como las de suelo y sueltan una antorcha', () => {
    for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const b = wallTorchFor(dx, dz)!;
      expect(isTorch(b)).toBe(true);
      expect(LIGHT_RADIUS[b]).toBe(LIGHT_RADIUS[Block.Torch]);
      expect(dropFor(b)).toBe('antorcha');
      expect(isSolid(b)).toBe(false);
      expect(BLOCKS[b].name).toBe('Antorcha');
    }
    expect(wallTorchFor(0, 0)).toBeNull();
  });

  it('cada tendero de los comercios tiene su cama en la trastienda', () => {
    for (const m of MERCHANTS) {
      expect(m.bed, m.profile.name).toBeTruthy();
      expect(m.bed.join()).not.toBe(m.counter.join());
      expect(m.fixtures.some(([, x, y, z]) => [x, y, z].join() === m.bed.join())).toBe(false);
    }
  });

  it('la lluvia y la nieve no se van con el jugador: lo que se queda atrás reaparece delante', () => {
    const world = new World(1, material);
    const fx = new WeatherFx(world);
    fx.set('nieve');
    fx.update(0.016, new THREE.Vector3(0, 30, 0));
    const pos = fx.points.geometry.attributes.position.array as Float32Array;
    const before = pos[0];
    // Andar un poco no mueve los copos (solo caen y bailan).
    fx.update(0.016, new THREE.Vector3(2, 30, 0));
    expect(Math.abs(pos[0] - before)).toBeLessThan(0.1);
    // Muy lejos, todos vuelven a estar alrededor.
    fx.update(0.016, new THREE.Vector3(500, 30, 500));
    for (let i = 0; i < pos.length; i += 3) expect(Math.abs(pos[i] - 500)).toBeLessThanOrEqual(28);
    fx.set('lluvia');
    fx.update(0.016, new THREE.Vector3(500, 30, 500));
    expect(fx.drops.visible).toBe(true);
    expect(fx.points.visible).toBe(false);
  });
});

describe('v5.0.2: viajar en avioneta', () => {
  it('la marca de «llegada de un viaje» no pisa el viaje guardado', async () => {
    const { default: main } = await import('../src/main.ts?raw');
    const { default: travel } = await import('../src/travel.ts?raw');
    const arrival = /const TRAVEL_KEY = '([^']+)'/.exec(main)![1];
    const trip = /const KEY = '([^']+)'/.exec(travel)![1];
    expect(arrival).not.toBe(trip);
  });
});
