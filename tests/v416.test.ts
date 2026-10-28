import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Block, isDoor } from '../src/blocks';
import { templateCells } from '../src/buildings';
import { AVELLANA, Economy, stockFor } from '../src/economy';
import { SHOWROOM_LEVEL, ShopFront } from '../src/game/shopFront';
import { LORE } from '../src/lore';
import { SHOP_BUILDING, SHOP_LEVELS, SHOWROOM_DOOR, UPPER_FLOOR, shopLevel, shopOrigin, windowDisplay } from '../src/shopBuilding';
import { DECK_Y, TERMINAL, buildTerminal, findTerminalSite, isTerminalSite, rotationFacing, seaward, terminalCell } from '../src/terminal';
import { Seaplane } from '../src/travel';
import { createVillagers } from '../src/villagers';
import { SEA_LEVEL, World } from '../src/world';

// happy-dom no dibuja: los iconos de las estanterías salen vacíos.
vi.mock('../src/icons', () => ({ tileIcon: () => '', itemIcon: () => '' }));

const material = new THREE.MeshBasicMaterial();
const SEED = 20261025;

describe('v4.16: la tienda nueva', () => {
  it('sube de nivel con lo gastado y vende más cosas cada día', () => {
    expect(shopLevel(0)).toBe(0);
    expect(shopLevel(SHOP_LEVELS[1].spent)).toBe(1);
    expect(shopLevel(10_000_000)).toBe(SHOP_LEVELS.length - 1);
    const ctx = { today: '2026-10-25', season: 'otoño' as const, holiday: null };
    const base = stockFor(AVELLANA, ctx).length;
    expect(stockFor(AVELLANA, { ...ctx, level: 1 }).length).toBe(base + 4);
    expect(stockFor(AVELLANA, { ...ctx, level: 2 }).length).toBe(base + 8);
  });

  it('lo gastado se cuenta siempre; en las partidas de antes sale de las cuentas', () => {
    const e = new Economy('2026-10-25');
    e.recordPurchase(AVELLANA, 'pala', 1, 500);
    e.recordPurchase(AVELLANA, 'pala', 1, 700);
    expect(e.spentAt('avellana')).toBe(1200);
    const old = e.toJSON();
    delete old.spent;
    expect(new Economy('2026-10-25', old).spentAt('avellana')).toBe(1200);
  });

  it('el edificio sale con la isla: puerta tras la acera, toldo, escaparate y escalera hasta arriba', () => {
    const world = new World(SEED, material);
    const shop = world.plots.find((p) => p.kind === 'shop')!;
    world.update(shop.x, shop.z, 1, 99);
    expect(shop.door).toEqual([shop.x, shop.y + 1, shop.z + 4]);
    expect(isDoor(world.getBlock(shop.x, shop.y + 1, shop.z + 3))).toBe(true);
    const [ox, oy, oz] = shopOrigin(shop);
    expect(world.getBlock(ox + 3, oy + 4, oz + 9)).toBe(Block.Awning);
    expect(world.getBlock(ox + 8, oy + 2, oz + 8)).toBe(Block.Glass);
    // El último peldaño queda a la altura del suelo de arriba.
    expect(world.getBlock(ox + 1, oy + UPPER_FLOOR, oz + 2)).toBe(Block.PlanksStairs);
    expect(world.getBlock(ox + SHOWROOM_DOOR[0], oy + SHOWROOM_DOOR[1], oz + SHOWROOM_DOOR[2])).toBe(Block.Fence);
    expect(templateCells(SHOP_BUILDING, 0).every(([x, , z]) => x >= 0 && x < 11 && z >= 0 && z < 11)).toBe(true);
  });

  it('los muebles, el escaparate de la estación y la sala de muebles del último nivel', () => {
    const world = new World(SEED, material);
    const shop = world.plots.find((p) => p.kind === 'shop')!;
    world.update(shop.x, shop.z, 1, 99);
    const front = new ShopFront({ world, scene: new THREE.Scene(), atlas: document.createElement('canvas'), lampHook: () => {}, put: (x, y, z, b) => world.setBlock(x, y, z, b), host: true });
    const stock = stockFor(AVELLANA, { today: '2026-10-25', season: 'otoño', holiday: null }).map((s) => s.id);
    front.refresh(0, 'otoño', null, stock);
    const basic = front.fixtureCount;
    expect(front.onShelves.length).toBe(12);
    expect(front.onShelves.every((id) => stock.includes(id))).toBe(true);
    expect(windowDisplay('otoño', 'halloween')).toContain('calabaza');
    expect(windowDisplay('invierno', 'navidad')).toContain('arbol_navidad');
    const [ox, oy, oz] = shopOrigin(shop);
    const door = () => world.getBlock(ox + SHOWROOM_DOOR[0], oy + SHOWROOM_DOOR[1], oz + SHOWROOM_DOOR[2]);
    front.refresh(SHOWROOM_LEVEL - 1, 'otoño', null, stock);
    expect(door()).toBe(Block.Fence);
    front.refresh(SHOWROOM_LEVEL, 'otoño', null, stock);
    expect(isDoor(door())).toBe(true);
    expect(front.fixtureCount).toBeGreaterThan(basic);
  });

  it('Avellana atiende detrás del mostrador y de noche duerme arriba', () => {
    const world = new World(SEED, material);
    const shop = world.plots.find((p) => p.kind === 'shop')!;
    const keeper = createVillagers(world, {}).find((v) => v.isShopkeeper)!;
    keeper.update(0.1, 12, new THREE.Vector3(), 1);
    expect(keeper.position.y).toBe(shop.y + 1);
    // v5.0.1: con el jugador cerca, al cerrar se va andando a la cama (se le sigue viendo por el camino).
    const near = keeper.position.clone();
    keeper.update(0.1, 23, near, 1);
    expect(keeper.group.visible).toBe(true);
    expect(keeper.inside).toBe(false);
    // Lejos (o sin camino) llega de golpe, como antes.
    const far = new THREE.Vector3(9999, 0, 9999);
    keeper.update(0.1, 23, far, 1);
    keeper.update(0.1, 23, far, 1);
    expect(keeper.position.y).toBe(shop.y + UPPER_FLOOR + 1);
    expect(keeper.group.visible).toBe(true);
    expect(keeper.sleeping).toBe(true);
  });

  it('las piezas nuevas tienen su curiosidad', () => {
    for (const id of ['toldo', 'mostrador', 'caja_registradora', 'bascula', 'panel_salidas']) expect(LORE[id]).toBeTruthy();
  });
});

describe('v4.16: la terminal y el muelle', () => {
  it('el muelle mira al mar', () => {
    expect(rotationFacing(0.1, 0.9)).toBe(0);
    expect(rotationFacing(-0.9, 0.2)).toBe(1);
    expect(rotationFacing(0.2, -0.9)).toBe(2);
    expect(rotationFacing(0.9, 0.3)).toBe(3);
    for (let r = 0; r < 4; r++) {
      const site = { x: 0, z: 0, rotation: r };
      // De la sala (z = 3) al final del muelle (z = 13) se avanza hacia el mar.
      const [ax, , az] = terminalCell(site, 4, 0, 3);
      const [bx, , bz] = terminalCell(site, 4, 0, 13);
      const [sx, sz] = seaward(site);
      expect(Math.sign(bx - ax)).toBe(sx);
      expect(Math.sign(bz - az)).toBe(sz);
    }
  });

  it('se construye en la playa de la avioneta, con el muelle sobre el agua', () => {
    const world = new World(SEED, material);
    const airport = world.findAirport(0)!;
    expect(airport).toBeTruthy();
    world.update(airport.x, airport.z, 2, 999);
    const site = findTerminalSite(world, airport);
    expect(isTerminalSite(site)).toBe(true);
    buildTerminal(world, site);
    // Puertas a la playa y al muelle, la tarima a ras de la playa y el faro con su luz al final.
    expect(isDoor(world.getBlock(...terminalCell(site, 4, 1, 0)))).toBe(true);
    expect(isDoor(world.getBlock(...terminalCell(site, 4, 1, 6)))).toBe(true);
    expect(world.getBlock(...terminalCell(site, 4, 0, 10))).toBe(Block.BridgeDeck);
    expect(terminalCell(site, 4, 0, 10)[1]).toBe(DECK_Y);
    expect(world.getBlock(...terminalCell(site, 3, 5, 13))).toBe(Block.LightBlock);
    // Debajo del final del muelle hay agua.
    const [ex, , ez] = terminalCell(site, 4, 0, 13);
    expect(world.getBlock(ex, SEA_LEVEL, ez)).toBe(Block.Water);
    expect(TERMINAL.layers.length).toBeLessThan(10);
  });

  it('no acepta sitios raros de la red', () => {
    expect(isTerminalSite({ x: 1, z: 2, rotation: 3 })).toBe(true);
    expect(isTerminalSite({ x: 1, z: 2, rotation: 4 })).toBe(false);
    expect(isTerminalSite({ x: 1.5, z: 2, rotation: 0 })).toBe(false);
    expect(isTerminalSite(null)).toBe(false);
  });

  it('la avioneta amariza y se queda quieta en su sitio', () => {
    const plane = new Seaplane();
    plane.place(10, 16.7, 10, 0, -1);
    plane.land();
    plane.update(0.1, 0);
    expect(plane.group.position.y).toBeGreaterThan(20);
    for (let i = 0; i < 60; i++) plane.update(0.1, 0);
    expect(plane.group.position.distanceTo(new THREE.Vector3(10, 16.7, 10))).toBeLessThan(0.2);
  });
});
