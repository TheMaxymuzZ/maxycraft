import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Animals } from '../src/animals';
import { isDoor } from '../src/blocks';
import { MERCHANTS, merchantOf, repairCost } from '../src/commerce';
import { AVELLANA, ESPIGA, GRAVA, HENO, catalogOf, closedText, offerOf, stockFor } from '../src/economy';
import { Farm } from '../src/farm';
import { Commerce, merchantDoor } from '../src/game/commerce';
import { Town, type TownDeps } from '../src/game/town';
import { Inventory } from '../src/inventory';
import { itemDef } from '../src/items';
import { LORE } from '../src/lore';
import { rateIsland } from '../src/rating';
import { isTownSave } from '../src/townhall';
import { type Villager, createVillagers } from '../src/villagers';
import { buildVillagerModel } from '../src/villagerModel';
import { World } from '../src/world';

vi.mock('../src/icons', () => ({ tileIcon: () => '', itemIcon: () => '' }));

const material = new THREE.MeshBasicMaterial();

function makeTown(world: World, villagers: Villager[]) {
  const deps: TownDeps = {
    world, villagers, scene: new THREE.Scene(),
    put: (x, y, z, b) => world.setBlock(x, y, z, b),
    placeFurniture: () => {},
    inventory: new Inventory(),
    wallet: () => 0,
    pay: () => {},
    memories: {},
    rating: () => rateIsland({ flowers: 0, fences: 0, lights: 0, furniture: 0, house: 0, guests: 0, donated: 0, farm: 0 }),
    notices: () => [],
    host: true,
    changed: () => {},
    toast: () => {},
    persist: () => {},
  };
  return new Town(deps);
}

describe('v4.17: los comercios', () => {
  it('cada uno abre cuando toca', () => {
    expect(merchantOf('agricola')!.unlocked({ townLevel: 1, bestFriend: 5 })).toBe(false);
    expect(merchantOf('agricola')!.unlocked({ townLevel: 2, bestFriend: 0 })).toBe(true);
    expect(merchantOf('granja')!.unlocked({ townLevel: 4, bestFriend: 1 })).toBe(false);
    expect(merchantOf('granja')!.unlocked({ townLevel: 1, bestFriend: 2 })).toBe(true);
    expect(merchantOf('mina')!.unlocked({ townLevel: 3, bestFriend: 0 })).toBe(true);
  });

  it('venden lo suyo y Avellana no lo vende', () => {
    expect(catalogOf(ESPIGA)).toEqual(expect.arrayContaining(['regadera_cobre', 'abono', 'semillas_trigo', 'espantapajaros']));
    expect(catalogOf(HENO)).toEqual(expect.arrayContaining(['oveja', 'pienso', 'gallina', 'vaca']));
    expect(catalogOf(GRAVA)).toEqual(expect.arrayContaining(['hacha_cristal', 'pico_cristal', 'pala_cristal']));
    const avellana = catalogOf(AVELLANA);
    for (const id of ['regadera_cobre', 'abono', 'oveja', 'pienso', 'hacha_cristal', 'espantapajaros']) expect(avellana).not.toContain(id);
  });

  it('tienen su horario: Heno cierra los domingos y Grava abre por la tarde', () => {
    expect(closedText(HENO, 0, 12)).toBeTruthy();
    expect(closedText(HENO, 1, 12)).toBeNull();
    expect(closedText(GRAVA, 3, 10)).toBeTruthy();
    expect(closedText(GRAVA, 3, 20)).toBeNull();
    expect(closedText(ESPIGA, 3, 7)).toBeNull();
    expect(closedText(ESPIGA, 3, 15)).toBeTruthy();
  });

  it('la oferta del día es algo de lo que venden hoy', () => {
    const stock = stockFor(GRAVA, { today: '2026-10-27', season: 'otoño', holiday: null }).map((s) => s.id);
    expect(stock).toContain(offerOf(GRAVA, '2026-10-27', stock));
  });

  it('las herramientas de cristal duran más que las de hierro y arreglarlas cuesta más', () => {
    expect(itemDef('pico_cristal').durability!).toBeGreaterThan(itemDef('pico').durability!);
    expect(repairCost(260, 10)).toBeGreaterThan(repairCost(60, 10));
    expect(repairCost(260, 0)).toBe(0);
  });

  it('el anfitrión hace el edificio cerca del ayuntamiento y el dueño atiende en el mostrador', () => {
    const world = new World(20261025, material, {}, { terrain: 1 });
    const villagers = createVillagers(world, {});
    const town = makeTown(world, villagers);
    const scene = new THREE.Scene();
    const commerce = new Commerce({ world, villagers, scene, lampHook: () => {}, put: (x, y, z, b) => world.setBlock(x, y, z, b), town, memories: {}, host: true });
    expect(commerce.check({ townLevel: 1, bestFriend: 0 })).toEqual([]);
    const opened = commerce.check({ townLevel: 3, bestFriend: 2 });
    expect(opened.length).toBe(MERCHANTS.length);
    expect(Object.keys(town.state!.shops!)).toHaveLength(MERCHANTS.length);
    for (const site of commerce.sites) {
      const [dx, dy, dz] = merchantDoor(site.merchant, site.at);
      expect(isDoor(world.getBlock(dx, dy, dz - 1))).toBe(true);
      expect(site.owner.profile.shop).toBe(site.merchant.shop.id);
      expect(villagers).toContain(site.owner);
      expect(commerce.siteAt(site.at[0] + 3, site.at[2] + 3)).toBe(site);
    }
    // No se pisan entre ellos.
    const [a, b] = commerce.sites;
    expect(Math.abs(a.at[0] - b.at[0]) >= 7 || Math.abs(a.at[2] - b.at[2]) >= 8).toBe(true);
    // Abrir otra vez no hace nada.
    expect(commerce.check({ townLevel: 3, bestFriend: 2 })).toEqual([]);
    expect(commerce.markers()).toHaveLength(MERCHANTS.length);
    // Se guardan con el ayuntamiento.
    expect(isTownSave(JSON.parse(JSON.stringify(town.state)))).toBe(true);
  });

  it('no acepta comercios raros de la red', () => {
    const base = { level: 2, x: 0, y: 20, z: 0, works: [] };
    expect(isTownSave({ ...base, shops: { mina: [1, 2, 3] } })).toBe(true);
    expect(isTownSave({ ...base, shops: { mina: [1, 2] } })).toBe(false);
    expect(isTownSave({ ...base, shops: { mina: [1.5, 2, 3] } })).toBe(false);
  });

  it('los dueños tienen modelo y las cosas nuevas su curiosidad', () => {
    for (const m of MERCHANTS) expect(buildVillagerModel({ species: m.profile.species, shirt: 0, pattern: 0 } as never).eyes).toHaveLength(2);
    for (const id of ['regadera_cobre', 'abono', 'oveja', 'pienso', 'lana', 'hacha_cristal', 'espantapajaros', 'vagoneta', 'railes']) expect(LORE[id], id).toBeTruthy();
  });
});

describe('v4.17: abono, pienso y ovejas', () => {
  it('el abono adelanta la planta, dos veces como mucho', () => {
    const farm = new Farm();
    farm.plant(0, 1, 0, 'trigo');
    const s = farm.crops.get('0,1,0')!;
    expect(farm.stageOf(s, '2026-10-27')).toBe(0);
    expect(farm.fertilize(0, 1, 0, '2026-10-27')).toBe('ok');
    expect(farm.stageOf(s, '2026-10-27')).toBe(1);
    expect(farm.fertilize(0, 1, 0, '2026-10-27')).toBe('ok');
    expect(farm.fertilize(0, 1, 0, '2026-10-27')).toBe('max');
    expect(farm.fertilize(5, 1, 5, '2026-10-27')).toBe('none');
    // Se guarda.
    expect(new Farm(farm.serialize()).crops.get('0,1,0')!.boost).toBe(2);
  });

  it('con pienso el animal vuelve a dar lo suyo, una vez al día', () => {
    const world = new World(20261025, material, {}, { terrain: 1 });
    const animals = new Animals(world);
    const sheep = animals.add({ kind: 'oveja', x: 0, y: 30, z: 0 });
    expect(animals.collect(sheep, '2026-10-27')).toBe('lana');
    expect(animals.collect(sheep, '2026-10-27')).toBeNull();
    expect(animals.feed(sheep, '2026-10-27')).toBe(true);
    expect(animals.collect(sheep, '2026-10-27')).toBe('lana');
    expect(animals.feed(sheep, '2026-10-27')).toBe(false);
    // Las ovejas se guardan.
    expect(new Animals(world, animals.serialize()).list[0].data.kind).toBe('oveja');
  });
});
