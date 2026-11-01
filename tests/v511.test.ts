import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { isDoor, isSolid } from '../src/blocks';
import { templateCells, templateSize } from '../src/buildings';
import { CREATURES } from '../src/creatures';
import { MuseumHall } from '../src/game/museum';
import { ShopFront } from '../src/game/shopFront';
import { HALL_BIG, HALL_FLOORS, HALL_NORMAL, MUSEUM_HALF_BIG, museumHallOrigin, museumLayout } from '../src/museumHall';
import { findPath, standable } from '../src/pathfind';
import { SHOP_BIG, SHOP_HALF_BIG, SHOP_NORMAL, shopHallOrigin, shopLayout } from '../src/shopHall';
import { DECK_MAX, PILOT_SPOT, buildTerminal, terminalCell } from '../src/terminal';
import { createVillagers } from '../src/villagers';
import { ISLET_GAP_ROOMY, ROOMY_TERRAIN, TERRAIN_VERSION, World } from '../src/world';

vi.mock('../src/icons', () => ({ tileIcon: () => '', itemIcon: () => '' }));

const material = new THREE.MeshBasicMaterial();
const SEED = 20261101;
const world = (terrain: number, seed = SEED) => new World(seed, material, {}, { terrain });

/** Lo más alto con bloque de una plantilla. */
const top = (layers: string[][]) => layers.reduce((m, layer, y) => (layer.some((row) => /[^ .]/.test(row)) ? y : m), 0);

describe('v5.11: las islas nuevas', () => {
  it('son del terreno 5: museo y tienda con parcela más grande; las de antes no cambian', () => {
    expect(TERRAIN_VERSION).toBe(ROOMY_TERRAIN);
    const now = world(5).plots;
    expect(now.find((p) => p.kind === 'museum')?.half).toBe(MUSEUM_HALF_BIG);
    expect(now.find((p) => p.kind === 'shop')?.half).toBe(SHOP_HALF_BIG);
    // Las islas de antes: las parcelas y los islotes, exactamente donde estaban (sacado de la v5.10).
    const before = {
      3: {
        islets: [{ x: -32, z: 190, r: 26 }, { x: -124, z: -160, r: 31 }, { x: 174, z: -3, r: 32 }],
        plots: [['shop', -16, 83, 26, 7], ['museum', -4, 38, 26, 9], ['house', -23, -43, 26, 5], ['house', 40, -30, 26, 5], ['house', -65, 17, 26, 5], ['player', 16, -44, 26, 5]],
      },
      4: {
        islets: [{ x: -40, z: 234, r: 26 }, { x: -152, z: -196, r: 31 }, { x: 206, z: -4, r: 32 }],
        plots: [['shop', -19, 95, 26, 7], ['museum', -4, 44, 26, 9], ['house', -26, -50, 26, 5], ['house', 46, -34, 26, 5], ['house', -75, 19, 26, 5], ['player', 19, -51, 26, 5]],
      },
    };
    for (const terrain of [3, 4] as const) {
      const w = world(terrain);
      expect(w.islets).toEqual(before[terrain].islets);
      expect(w.plots.map((p) => [p.kind, p.x, p.z, p.y, p.half])).toEqual(before[terrain].plots);
    }
  });

  it('siempre caben las seis parcelas, también con el museo y la tienda grandes', () => {
    for (let i = 1; i <= 8; i++) {
      const plots = world(5, i * 7919).plots;
      expect(plots.length, `semilla ${i * 7919}`).toBe(6);
      expect(museumLayout(plots.find((p) => p.kind === 'museum')!)).toBe(HALL_BIG);
      expect(shopLayout(plots.find((p) => p.kind === 'shop')!)).toBe(SHOP_BIG);
    }
  });

  it('los islotes quedan lejos de la costa: mucho mar entre la isla y cada islote', () => {
    for (let i = 1; i <= 6; i++) {
      const w = world(5, i * 104729);
      const raw = (x: number, z: number) => (w as unknown as { landMaskRaw(x: number, z: number): number }).landMaskRaw(x, z);
      expect(w.islets.length).toBeGreaterThanOrEqual(2);
      for (const islet of w.islets) {
        // Alrededor del islote, a más de 20 bloques de su orilla, todo es mar en la máscara de la isla grande.
        for (let a = 0; a < 64; a++) {
          const t = (a / 64) * Math.PI * 2;
          const d = islet.r + ISLET_GAP_ROOMY - 10;
          expect(raw(islet.x + Math.cos(t) * d, islet.z + Math.sin(t) * d)).toBeLessThan(0);
        }
      }
    }
  });
});

describe('v5.11: el museo vuelve a la altura de la v5.2 y ocupa más suelo', () => {
  it('la planta de abajo tiene 5 de alto y el tejado no sube más que el de la v5.2', () => {
    expect(HALL_FLOORS).toEqual([0, 6]);
    // El de la v5.2 llegaba a la capa 15 y el de la v5.9 a la 19.
    expect(top(HALL_NORMAL.template.layers)).toBeLessThanOrEqual(15);
    expect(top(HALL_BIG.template.layers)).toBeLessThanOrEqual(15);
  });

  it('el grande ocupa mucho más suelo que el de siempre', () => {
    const floor = (t: typeof HALL_BIG.template) => templateCells(t, 0).filter(([, y, , b]) => y === 0 && b !== null).length;
    const [w, , d] = templateSize(HALL_BIG.template);
    expect(floor(HALL_BIG.template)).toBeGreaterThan(floor(HALL_NORMAL.template) * 1.6);
    expect(w).toBeLessThanOrEqual(MUSEUM_HALF_BIG * 2 + 3);
    expect(d).toBeLessThanOrEqual(MUSEUM_HALF_BIG * 2 + 1);
  });

  it('en el grande se entra, se llega a la conservadora y a las salas al abrirlas', () => {
    const w = world(5);
    const museum = w.plots.find((p) => p.kind === 'museum')!;
    const [ox, oy, oz] = museumHallOrigin(museum);
    for (let dx = -32; dx <= 32; dx += 16) for (let dz = -32; dz <= 32; dz += 16) w.update(museum.x + dx, museum.z + dz, 1, 99);
    expect(isDoor(w.getBlock(museum.door[0], museum.door[1], museum.door[2] - 3))).toBe(true);
    const at = ([x, y, z]: number[]): [number, number, number] => [ox + x, oy + y, oz + z];
    const curator = at(HALL_BIG.curator);
    expect(standable(w, ...curator)).toBe(true);
    expect(findPath(w, museum.door, curator)).not.toBeNull();
    const aquarium = at([25, 1, 3]);
    const gallery = at([3, HALL_FLOORS[1] + 1, 10]);
    expect(findPath(w, museum.door, aquarium, 6000)).toBeNull();
    expect(findPath(w, museum.door, gallery, 6000)).toBeNull();
    const ctx = new Proxy({}, { get: () => () => {} });
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    const hall = new MuseumHall({ world: w, scene: new THREE.Scene(), atlas: document.createElement('canvas'), donated: () => new Set(CREATURES.map((c) => c.id)), host: true, put: (x, y, z, b) => w.setBlock(x, y, z, b), toast: () => {} });
    spy.mockRestore();
    expect(hall.openWing).toBe(3);
    expect(findPath(w, museum.door, aquarium, 6000)).not.toBeNull();
    expect(findPath(w, museum.door, gallery, 6000)).not.toBeNull();
    expect(hall.size).toBe(CREATURES.length);
    const createdFor = createVillagers(w, {}).find((v) => v.profile.role === 'museum')!;
    expect(createdFor.home.door).toEqual(curator);
  });

  it('cada pez, insecto y fósil tiene su sitio, y cabe dentro del museo', () => {
    for (const hall of [HALL_NORMAL, HALL_BIG]) {
      const [w, h, d] = templateSize(hall.template);
      for (const kind of ['pez', 'bicho', 'fosil'] as const) {
        const n = CREATURES.filter((c) => c.kind === kind).length;
        const spots = Array.from({ length: n }, (_, i) => hall.exhibitSpot(kind, i, -1).at.join());
        if (kind !== 'fosil') expect(new Set(spots).size).toBe(n);
        for (const s of spots) {
          const [x, y, z] = s.split(',').map(Number);
          expect(x > 0 && x < w && y > 0 && y < h && z > 0 && z < d).toBe(true);
        }
      }
    }
  });
});

describe('v5.11: la tienda grande', () => {
  it('es igual de alta que la de siempre por las paredes, y más ancha y honda', () => {
    const [w1, , d1] = templateSize(SHOP_NORMAL.template);
    const [w2, , d2] = templateSize(SHOP_BIG.template);
    expect(w2 * d2).toBeGreaterThan(w1 * d1 * 1.6);
    expect(SHOP_BIG.shelves.length).toBeGreaterThan(SHOP_NORMAL.shelves.length);
    expect(w2).toBeLessThanOrEqual(SHOP_HALF_BIG * 2 + 1);
  });

  it('Avellana atiende tras el mostrador y sube a dormir al altillo; la sala de muebles se abre', () => {
    const w = world(5);
    const shop = w.plots.find((p) => p.kind === 'shop')!;
    for (let dx = -16; dx <= 16; dx += 16) for (let dz = -16; dz <= 16; dz += 16) w.update(shop.x + dx, shop.z + dz, 1, 99);
    const [ox, oy, oz] = shopHallOrigin(shop);
    const at = ([x, y, z]: number[]): [number, number, number] => [ox + x, oy + y, oz + z];
    expect(isDoor(w.getBlock(shop.door[0], shop.door[1], shop.door[2] - 1))).toBe(true);
    expect(standable(w, ...at(SHOP_BIG.keeperSpot))).toBe(true);
    expect(standable(w, ...at(SHOP_BIG.keeperBed))).toBe(true);
    expect(findPath(w, shop.door, at(SHOP_BIG.keeperBed))).not.toBeNull();
    const keeper = createVillagers(w, {})[0];
    expect(keeper.home.door).toEqual(at(SHOP_BIG.keeperSpot));
    expect(keeper.rest).toEqual(at(SHOP_BIG.keeperBed));
    const front = new ShopFront({ world: w, scene: new THREE.Scene(), atlas: document.createElement('canvas'), lampHook: () => {}, put: (x, y, z, b) => w.setBlock(x, y, z, b), host: true });
    front.refresh(99, 'otoño', null, ['pala', 'hacha', 'silla']);
    expect(isDoor(w.getBlock(...at(SHOP_BIG.showroomDoor)))).toBe(true);
    // Desde el altillo de Avellana se pasa a la sala de muebles.
    expect(findPath(w, shop.door, at([14, 6, 4]))).not.toBeNull();
  });
});

describe('v5.11: Plumas no sale dentro del suelo', () => {
  it('su sitio está a la altura del suelo de la terminal, también si la tarima está alta', () => {
    const w = world(1);
    for (const y of [DECK_MAX - 2, DECK_MAX]) {
      const site = { x: 400, z: 400, rotation: 0, y, v: 2 };
      buildTerminal(w, site);
      const [x, py, z] = terminalCell(site, ...PILOT_SPOT);
      expect(py).toBe(y + 1);
      expect(isSolid(w.getBlock(x, py, z))).toBe(false);
      expect(isSolid(w.getBlock(x, py + 1, z))).toBe(false);
      expect(isSolid(w.getBlock(x, py - 1, z))).toBe(true);
    }
  });
});
