import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BLOCKS, Block, ROOF_STAIRS, isDoor, isStairs, roofColorOf } from '../src/blocks';
import { templateCells, templateSize } from '../src/buildings';
import { MERCHANTS, hallOf } from '../src/commerce';
import { CREATURES } from '../src/creatures';
import { FURNITURE, furnitureDef } from '../src/furniture';
import { MuseumHall } from '../src/game/museum';
import { ShopFront } from '../src/game/shopFront';
import { VillagerHomes } from '../src/game/villagerHomes';
import { LORE } from '../src/lore';
import { CURATOR_SPOT, HALL_FIXTURES as MUSEUM_FIXTURES, MUSEUM_HALL, hallBarrierCells, hallExhibitSpot, museumHallOrigin } from '../src/museumHall';
import { findPath, standable } from '../src/pathfind';
import { HALL_KEEPER_BED, HALL_KEEPER_SPOT, SHOP_HALL, shopHallOrigin } from '../src/shopHall';
import { hallFixtures, hallTemplate } from '../src/townhall';
import { createVillagers } from '../src/villagers';
import { BIG_HOUSE, HOUSE_FIXTURES, buildBigHouse, recoloredRoof } from '../src/villagerHouse';
import { HUGE_ISLAND_RADIUS, ISLET_MIN_R, PLOT_RADIUS, TERRAIN_VERSION, World, homeOuterRadius } from '../src/world';

vi.mock('../src/icons', () => ({ tileIcon: () => '', itemIcon: () => '' }));

const material = new THREE.MeshBasicMaterial();
const SEED = 20261030;
const newWorld = (seed = SEED) => new World(seed, material, {}, { terrain: TERRAIN_VERSION });

describe('v5.2: islas más grandes', () => {
  it('las islas nuevas son del terreno 3: más grandes y con los islotes el doble de grandes', () => {
    expect(TERRAIN_VERSION).toBe(3);
    const w = newWorld();
    expect(w.islandRadius).toBe(HUGE_ISLAND_RADIUS);
    expect(w.newBuildings).toBe(true);
    expect(homeOuterRadius(3)).toBeGreaterThan(homeOuterRadius(2));
    expect(w.islets.length).toBeGreaterThan(0);
    for (const i of w.islets) expect(i.r).toBeGreaterThanOrEqual(ISLET_MIN_R * 2);
  });

  it('las islas de antes no cambian: ni tamaño, ni islotes, ni edificios', () => {
    const w = new World(SEED, material, {}, { terrain: 2 });
    expect(w.newBuildings).toBe(false);
    expect(w.plots.every((p) => p.style === undefined && p.half === undefined)).toBe(true);
    for (const i of w.islets) expect(i.r).toBeLessThan(ISLET_MIN_R * 2);
  });

  it('cada edificio tiene su parcela y no se pisan', () => {
    for (const seed of [SEED, 7, 99, 12345]) {
      const w = newWorld(seed);
      expect(w.plots.find((p) => p.kind === 'museum')?.style, `semilla ${seed}`).toBe(BIG_HOUSE);
      expect(w.plots.find((p) => p.kind === 'shop')?.style).toBe(BIG_HOUSE);
      for (const a of w.plots) {
        for (const b of w.plots) {
          if (a === b) continue;
          const gap = Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
          expect(gap).toBeGreaterThan((a.half ?? PLOT_RADIUS) + (b.half ?? PLOT_RADIUS));
        }
      }
    }
  });
});

describe('v5.2: muebles de un bloque y sentarse', () => {
  it('peceras, terrarios y vitrinas tienen cristal transparente; todos los muebles nuevos tienen ficha', () => {
    for (const id of ['pecera', 'terrario', 'vitrina']) expect(furnitureDef(id)!.parts.some((p) => p[7] !== undefined && p[7] < 1)).toBe(true);
    for (const id of ['mostrador_bajo', 'caja_mostrador', 'cocina', 'nevera', 'lampara_techo', 'escritorio', 'yunque']) {
      expect(furnitureDef(id), id).toBeTruthy();
      expect(LORE[id], id).toBeTruthy();
    }
  });

  it('el mostrador nuevo es bajo: se ve al que atiende', () => {
    const top = (id: string) => Math.max(...furnitureDef(id)!.parts.map(([, h, , , , y]) => y + h));
    expect(top('mostrador_bajo')).toBeLessThan(0.7);
    expect(top('mostrador_bajo')).toBeLessThan(top('mostrador'));
  });

  it('sillas, sofás y bancos tienen asiento', () => {
    for (const id of ['silla', 'sofa', 'banco', 'banco_parque', 'mecedora']) expect(furnitureDef(id)!.seat, id).toBeGreaterThan(0);
    expect(furnitureDef('mesa')!.seat).toBeUndefined();
    expect(FURNITURE.filter((f) => f.seat !== undefined).length).toBeGreaterThanOrEqual(8);
  });
});

describe('v5.2: tejados en pendiente', () => {
  it('escaleras y losas de teja de cada color, y se pueden repintar', () => {
    for (let c = 0; c < 4; c++) {
      for (let f = 0; f < 4; f++) {
        expect(isStairs(ROOF_STAIRS[c] + f)).toBe(true);
        expect(roofColorOf(ROOF_STAIRS[c] + f)).toBe(c);
      }
    }
    expect(BLOCKS[Block.RoofBlueSlab].shape).toBe('slab');
    expect(recoloredRoof(Block.RoofRedStairs + 2, 1)).toBe(Block.RoofBlueStairs + 2);
    expect(recoloredRoof(Block.RoofRedSlab, 3)).toBe(Block.RoofYellowSlab);
    expect(recoloredRoof(Block.Wall, 3)).toBeNull();
  });
});

describe('v5.2: casas de los vecinos', () => {
  it('la casa grande: 7×7 con puerta, tejado a dos aguas sin huecos y por dentro de pie', () => {
    const blocks = new Map<string, Block>();
    buildBigHouse(0, 20, 0, Block.RoofRed, (x, y, z, b) => blocks.set(`${x},${y},${z}`, b));
    expect(blocks.get('0,21,3')).toBe(Block.Door);
    expect(blocks.get('0,22,3')).toBe(Block.DoorTop);
    // Dentro hay sitio de pie en todo el salón.
    for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) for (const y of [21, 22, 23]) expect(blocks.get(`${x},${y},${z}`) ?? Block.Air).toBe(Block.Air);
    // Encima de cada columna de dentro hay tejado (no se ve el cielo).
    for (let z = -3; z <= 3; z++) {
      for (let x = -3; x <= 3; x++) {
        let roofed = false;
        for (let y = 24; y < 32; y++) if (roofColorOf(blocks.get(`${x},${y},${z}`) ?? 0) >= 0) roofed = true;
        expect(roofed, `${x},${z}`).toBe(true);
      }
    }
  });

  it('los vecinos tienen su cama, su cocina y sus huecos para regalos; entran y llegan a la cama', () => {
    const w = newWorld();
    const villagers = createVillagers(w, {});
    const v = villagers.find((n) => n.home.kind === 'house' && !n.profile.role)!;
    expect(v.home.style).toBe(BIG_HOUSE);
    w.update(v.home.x, v.home.z, 1, 99);
    expect(isDoor(w.getBlock(v.home.door[0], v.home.door[1], v.home.door[2] - 1))).toBe(true);
    expect(standable(w, ...v.bedCell)).toBe(true);
    expect(v.bedCell).not.toEqual(v.insideCell);
    expect(findPath(w, v.home.door, v.bedCell)).not.toBeNull();
    const homes = new VillagerHomes(w, [v], () => {});
    expect(homes.furniture.serialize().length).toBeGreaterThanOrEqual(HOUSE_FIXTURES.length + 1);
    v.memory.friendship = 100;
    const slots = homes.slots(v);
    expect(slots.length).toBe(6);
    const fixed = new Set(HOUSE_FIXTURES.map(([, x, z]) => `${v.home.x + x},${v.home.z + z}`));
    for (const s of slots) expect(fixed.has(`${s.cell[0]},${s.cell[2]}`)).toBe(false);
  });
});

describe('v5.2: el museo nuevo', () => {
  it('dos plantas como mucho, más ancho que el de antes y con todo dentro del solar', () => {
    const [w, h, d] = templateSize(MUSEUM_HALL);
    expect(w).toBeGreaterThan(11);
    expect(d).toBeGreaterThan(11);
    expect(h).toBeLessThan(20);
    expect(MUSEUM_HALL.rooms.map((r) => r.floor).filter((f, i, a) => a.indexOf(f) === i).length).toBe(2);
    expect(templateCells(MUSEUM_HALL, 0).every(([x, , z]) => x >= 0 && x < w && z >= 0 && z < d)).toBe(true);
  });

  it('cada pez tiene su pecera y cada bicho su terrario, sin repetirse', () => {
    const fish = CREATURES.filter((c) => c.kind === 'pez').map((_, i) => hallExhibitSpot('pez', i, -1).at.join());
    expect(new Set(fish).size).toBe(fish.length);
    const bugs = CREATURES.filter((c) => c.kind === 'bicho').map((_, i) => hallExhibitSpot('bicho', i, -1).at.join());
    expect(new Set(bugs).size).toBe(bugs.length);
    const tanks = MUSEUM_FIXTURES.filter(([id]) => id === 'pecera').length;
    expect(tanks).toBeGreaterThanOrEqual(fish.length);
  });

  it('se entra, se llega a la conservadora, al acuario y arriba al quitar los cordones', () => {
    const w = newWorld();
    const museum = w.plots.find((p) => p.kind === 'museum')!;
    const [ox, oy, oz] = museumHallOrigin(museum);
    for (let dx = -16; dx <= 16; dx += 16) for (let dz = -16; dz <= 16; dz += 16) w.update(museum.x + dx, museum.z + dz, 1, 99);
    expect(isDoor(w.getBlock(museum.door[0], museum.door[1], museum.door[2] - 3))).toBe(true);
    const at = ([x, y, z]: number[]): [number, number, number] => [ox + x, oy + y, oz + z];
    const curator = at(CURATOR_SPOT);
    expect(standable(w, ...curator)).toBe(true);
    expect(findPath(w, museum.door, curator)).not.toBeNull();
    // Con los cordones puestos no se llega al acuario; al abrirlo, sí.
    const aquarium = at([15, 1, 3]);
    expect(findPath(w, museum.door, aquarium, 4000)).toBeNull();
    // happy-dom no dibuja en canvas: un contexto falso basta para recortar los dibujos de peces e insectos.
    const ctx = new Proxy({}, { get: () => () => {} });
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    const hall = new MuseumHall({ world: w, scene: new THREE.Scene(), atlas: document.createElement('canvas'), donated: () => new Set(CREATURES.map((c) => c.id)), host: true, put: (x, y, z, b) => w.setBlock(x, y, z, b), toast: () => {} });
    expect(hall.openWing).toBe(3);
    for (let wing = 1; wing <= 3; wing++) for (const c of hallBarrierCells(wing)) expect(w.getBlock(...at(c))).toBe(Block.Air);
    expect(findPath(w, museum.door, aquarium)).not.toBeNull();
    expect(findPath(w, museum.door, at([3, 7, 8]))).not.toBeNull();
    expect(hall.size).toBe(CREATURES.length);
    expect(hall.fixtures.serialize().filter((f) => f.id === 'pecera').length).toBeGreaterThanOrEqual(40);
    spy.mockRestore();
  });
});

describe('v5.2: la tienda nueva', () => {
  it('Avellana atiende tras el mostrador bajo y sube a dormir al altillo', () => {
    const w = newWorld();
    const shop = w.plots.find((p) => p.kind === 'shop')!;
    for (let dx = -16; dx <= 16; dx += 16) for (let dz = -16; dz <= 16; dz += 16) w.update(shop.x + dx, shop.z + dz, 1, 99);
    const [ox, oy, oz] = shopHallOrigin(shop);
    const at = ([x, y, z]: number[]): [number, number, number] => [ox + x, oy + y, oz + z];
    expect(isDoor(w.getBlock(shop.door[0], shop.door[1], shop.door[2] - 1))).toBe(true);
    expect(standable(w, ...at(HALL_KEEPER_SPOT))).toBe(true);
    expect(standable(w, ...at(HALL_KEEPER_BED))).toBe(true);
    expect(findPath(w, shop.door, at(HALL_KEEPER_BED))).not.toBeNull();
    const keeper = createVillagers(w, {})[0];
    expect(keeper.home.door).toEqual(at(HALL_KEEPER_SPOT));
    expect(keeper.rest).toEqual(at(HALL_KEEPER_BED));
    const front = new ShopFront({ world: w, scene: new THREE.Scene(), atlas: document.createElement('canvas'), lampHook: () => {}, put: (x, y, z, b) => w.setBlock(x, y, z, b), host: true });
    front.refresh(2, 'otoño', null, ['pala', 'hacha', 'silla']);
    expect(front.fixtures.serialize().some((f) => f.id === 'caja_mostrador')).toBe(true);
    expect(front.onShelves.length).toBeGreaterThan(0);
    // Tejado a dos aguas de teja verde en pendiente.
    expect(templateCells(SHOP_HALL, 0).some(([, , , b]) => b !== null && roofColorOf(b) === 2 && isStairs(b))).toBe(true);
  });
});

describe('v5.2: ayuntamiento y comercios', () => {
  it('el ayuntamiento ocupa lo mismo y tiene muebles por dentro', () => {
    for (let level = 1; level <= 4; level++) {
      const t = hallTemplate(level);
      expect(templateSize(t)[0]).toBe(11);
      const inside = new Set(templateCells(t, 0).filter(([, y, , b]) => y === 1 && b === Block.Air).map(([x, , z]) => `${x},${z}`));
      for (const [id, x, z] of hallFixtures(level)) expect(inside.has(`${x},${z}`), `${level} ${id}`).toBe(true);
    }
    expect(hallFixtures(4).some(([id]) => id === 'bandera_pie')).toBe(true);
  });

  it('cada comercio nuevo: mostrador bajo, cama que no pisa nada y sus muebles de oficio', () => {
    for (const m of MERCHANTS) {
      const h = hallOf(m, true);
      expect(h).not.toBe(m);
      expect(h.fixtures.some(([id]) => id === 'caja_mostrador')).toBe(true);
      expect(h.fixtures.some(([, x, y, z]) => [x, y, z].join() === h.bed.join())).toBe(false);
      const cells = new Map(templateCells(h.building, 0).map(([x, y, z, b]) => [`${x},${y},${z}`, b]));
      expect(cells.get(h.counter.join()), m.profile.name).toBe(Block.Air);
      expect(cells.get(h.bed.join())).toBe(Block.Air);
      expect(templateSize(h.building)[0]).toBeGreaterThan(templateSize(m.building)[0]);
      expect(hallOf(m, false)).toBe(m);
    }
  });
});
