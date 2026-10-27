import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import html from '../index.html?raw';
import { Block } from '../src/blocks';
import { Dialog, type DialogContext, type ParcelActions } from '../src/dialog';
import { Farm } from '../src/farm';
import { Parcels } from '../src/game/parcels';
import { Inventory } from '../src/inventory';
import { type PlacedThing, WorldSync } from '../src/net/actions';
import { parseMessage } from '../src/net/protocol';
import { NetSession } from '../src/net/session';
import { MemoryHub } from '../src/net/transport';
import {
  HOST, PARCEL_PRICES, PARCEL_SIZES, type Parcel, buildProblem, isParcelList, parcelAt, parcelBounds, parcelProblem, sizeForHouse,
} from '../src/parcels';
import { Storage } from '../src/storage';
import { PLANNER, Villager } from '../src/villagers';
import { SEA_LEVEL, World } from '../src/world';

vi.mock('../src/icons', () => ({ tileIcon: () => '', itemIcon: () => '' }));

const material = new THREE.MeshBasicMaterial();
const flat = { heightAt: () => SEA_LEVEL + 3, obstacles: [] };

describe('v4.14: reglas de las parcelas', () => {
  it('cinco tamaños, el primero gratis, y cada uno más caro', () => {
    expect([...PARCEL_SIZES]).toEqual([9, 13, 17, 23, 31]);
    expect(PARCEL_PRICES[0]).toBe(0);
    for (let i = 1; i < PARCEL_PRICES.length; i++) expect(PARCEL_PRICES[i]).toBeGreaterThan(PARCEL_PRICES[i - 1]);
    expect(parcelBounds({ x: 10, z: 0, size: 0 })).toEqual({ x0: 6, z0: -4, x1: 14, z1: 4 });
    // La casa de antes decide el tamaño: tienda 9×9, casa grande 23×23.
    expect([0, 1, 2, 3].map(sizeForHouse)).toEqual([0, 1, 2, 3]);
  });

  it('dentro de una parcela solo construye su dueño y a quien deje; los invitados no construyen fuera', () => {
    const list: Parcel[] = [
      { owner: HOST, name: 'Andrés', x: 0, z: 0, size: 1 },
      { owner: 'ana', name: 'Ana', x: 40, z: 0, size: 0, builders: [HOST] },
    ];
    expect(parcelAt(list, 6, -6)?.owner).toBe(HOST);
    expect(buildProblem(list, HOST, 'anfitrion', 3, 3, 'poner')).toBeNull();
    expect(buildProblem(list, 'ana', 'residente', 3, 3, 'quitar')).toMatch(/Andrés/);
    // Ana deja construir al anfitrión en la suya.
    expect(buildProblem(list, HOST, 'anfitrion', 40, 0, 'poner')).toBeNull();
    expect(buildProblem(list, 'leo', 'invitado', 40, 0, 'quitar')).toMatch(/Ana/);
    // Fuera de las parcelas: todos recogen, pero el invitado no pone bloques.
    expect(buildProblem(list, 'leo', 'invitado', 20, 20, 'quitar')).toBeNull();
    expect(buildProblem(list, 'leo', 'invitado', 20, 20, 'poner')).toMatch(/urbanista/);
    expect(buildProblem(list, 'ana', 'residente', 20, 20, 'poner')).toBeNull();
  });

  it('no se mete en otra parcela, ni en casas de vecinos, ni en el mar', () => {
    const list: Parcel[] = [{ owner: HOST, name: 'Andrés', x: 0, z: 0, size: 0 }];
    expect(parcelProblem(list, { owner: 'ana', name: 'Ana', x: 9, z: 0, size: 0 }, flat)).toMatch(/Andrés/);
    expect(parcelProblem(list, { owner: 'ana', name: 'Ana', x: 20, z: 0, size: 0 }, flat)).toBeNull();
    const shop = { ...flat, obstacles: [{ x: 26, z: 0, r: 6, what: 'la tienda' }] };
    expect(parcelProblem(list, { owner: 'ana', name: 'Ana', x: 20, z: 0, size: 0 }, shop)).toBe('Ahí está la tienda');
    const coast = { heightAt: (x: number) => (x > 22 ? SEA_LEVEL - 2 : SEA_LEVEL + 3), obstacles: [] };
    expect(parcelProblem(list, { owner: 'ana', name: 'Ana', x: 20, z: 0, size: 0 }, coast)).toMatch(/mar/);
    // Lo que llega de fuera se comprueba.
    expect(isParcelList(list)).toBe(true);
    expect(isParcelList([{ ...list[0], size: 9 }])).toBe(false);
    expect(isParcelList([{ ...list[0], x: 1.5 }])).toBe(false);
  });
});

function makeParcels(world: World) {
  const things: PlacedThing[] = [];
  const moves: [number, number, number][] = [];
  let changes = 0;
  const parcels = new Parcels({
    world,
    put: (x, y, z, b) => world.setBlock(x, y, z, b),
    restore: (cells) => world.clearEdits(cells),
    placeFurniture: (id, x, y, z, rot, text) => things.push({ id, x, y, z, rot, ...(text ? { text } : {}) }),
    removeFurniture: (x, y, z) => {
      const i = things.findIndex((f) => f.x === x && f.y === y && f.z === z);
      if (i >= 0) things.splice(i, 1);
    },
    furniture: () => things,
    scene: new THREE.Scene(),
    obstacles: () => world.plots.filter((p) => p.kind !== 'player').map((p) => ({ x: p.x, z: p.z, r: 4, what: 'una casa' })),
    lotInside: () => false,
    moved: (_o, to, dx, dy, dz) => moves.push([dx, dy, dz, ...(to(0, 0, 0) ?? [])].slice(0, 3) as [number, number, number]),
    changed: () => changes++,
  });
  return { parcels, things, moves, changes: () => changes };
}

describe('v4.14: ampliar y mudar', () => {
  it('se amplía desde el centro y el cartel y el buzón pasan a la entrada nueva', () => {
    const world = new World(20261025, material, {}, { terrain: 2 });
    const plot = world.playerPlot!;
    const { parcels, things } = makeParcels(world);
    parcels.create(HOST, 'Andrés', plot.x, plot.z, 0);
    parcels.addPerk(HOST, 'cartel');
    parcels.addPerk(HOST, 'buzon');
    expect(things.map((f) => f.id).sort()).toEqual(['buzon', 'cartel']);
    expect(things.find((f) => f.id === 'cartel')!.text).toBe('Parcela de Andrés');
    expect(parcels.grow(HOST)).toBeNull();
    const b = parcelBounds(parcels.of(HOST)!);
    expect(b.x1 - b.x0 + 1).toBe(13);
    expect(things).toHaveLength(2);
    for (const f of things) expect(f.z).toBe(b.z1);
  });

  it('la mudanza se lleva lo construido y los muebles, y el sitio viejo vuelve a ser como era', () => {
    const world = new World(20261025, material, {}, { terrain: 2 });
    const plot = world.playerPlot!;
    const { parcels, things, moves } = makeParcels(world);
    parcels.create(HOST, 'Andrés', plot.x, plot.z, 0);
    const y = world.heightAt(plot.x, plot.z) + 1;
    world.setBlock(plot.x + 1, y, plot.z + 1, Block.Brick);
    things.push({ id: 'mesa', x: plot.x - 1, y, z: plot.z, rot: 0 });
    // Un sitio libre de tierra firme, lejos de las casas.
    let target: [number, number] | null = null;
    for (let r = 20; r < 80 && !target; r += 3) {
      for (let a = 0; a < 16 && !target; a++) {
        const x = Math.round(plot.x + Math.cos(a) * r);
        const z = Math.round(plot.z + Math.sin(a) * r);
        if (!parcels.moveProblem(HOST, x, z)) target = [x, z];
      }
    }
    expect(target).not.toBeNull();
    const [nx, nz] = target!;
    expect(parcels.move(HOST, nx, nz)).toBeNull();
    const dy = world.heightAt(nx, nz) - world.heightAt(plot.x, plot.z);
    expect(world.getBlock(nx + 1, y + dy, nz + 1)).toBe(Block.Brick);
    // El sitio viejo queda despejado: ni el ladrillo ni la tienda de campaña del principio.
    expect(world.getBlock(plot.x + 1, y, plot.z + 1)).toBe(Block.Air);
    expect(world.getBlock(plot.x + 2, y, plot.z)).toBe(Block.Air);
    expect(world.getBlock(nx + 2, y + dy, nz)).toBe(Block.Canvas);
    expect(things).toContainEqual({ id: 'mesa', x: nx - 1, y: y + dy, z: nz, rot: 0 });
    expect(parcels.of(HOST)).toMatchObject({ x: nx, z: nz });
    expect(moves).toHaveLength(1);
    // Encima de una casa de vecino no se puede.
    const house = world.plots.find((p) => p.kind === 'house')!;
    expect(parcels.moveProblem(HOST, house.x, house.z)).toMatch(/Ahí está|mar/);
  });

  it('los cofres, el huerto y el riego automático siguen a la parcela', () => {
    const storage = new Storage({ '1,20,1': [{ id: 'piedra', count: 3 }] });
    storage.relocate((x, y, z) => (x === 1 ? [x + 10, y, z] : null));
    expect(storage.serialize()).toEqual({ '11,20,1': [{ id: 'piedra', count: 3 }] });
    const farm = new Farm();
    farm.plant(1, 20, 1, 'trigo');
    farm.plant(50, 20, 50, 'trigo');
    expect(farm.waterWhere('2026-10-27', (x) => x < 10)).toBe(true);
    expect(farm.serialize()['1,20,1'].watered).toEqual(['2026-10-27']);
    expect(farm.serialize()['50,20,50'].watered).toEqual([]);
  });
});

describe('v4.14: amigos invitados y residentes', () => {
  it('el amigo pide su tienda al anfitrión y se protege la parcela de los demás', async () => {
    const hub = new MemoryHub();
    const list: Parcel[] = [{ owner: HOST, name: 'Anfi', x: 0, z: 0, size: 0 }];
    const host = NetSession.host(hub.connect('anfi'), { id: 'anfi', name: 'Anfi', color: 1 }, () => ({ seed: 1, edits: {}, options: {}, parcels: list }), {
      request: (peer, op) => {
        if (op !== 'tienda' || !peer.uid) return 'No';
        list.push({ owner: peer.uid, name: peer.name, x: 40, z: 0, size: 0 });
        host.sendParcels(list);
        return null;
      },
      guard: (peer, a) => (buildProblem(list, peer.uid ?? '', list.some((p) => p.owner === peer.uid) ? 'residente' : 'invitado', a.x, a.z, 'poner') ? { t: 'restaurar', x: a.x, y: a.y, z: a.z } : null),
    });
    const got: Parcel[][] = [];
    const { session, snapshot } = await NetSession.join(hub.connect('ana-1'), { id: 'ana-1', name: 'Ana', color: 2, uid: 'ana' }, { parcels: (p) => got.push(p) });
    expect(snapshot.parcels).toEqual([list[0]]);
    // El invitado intenta poner un bloque en la parcela del anfitrión: se le devuelve como estaba.
    const applied: string[] = [];
    const ws = new WorldSync({ getBlock: () => 0, setBlock: (x) => applied.push(`pone ${x}`), clearEdit: (x) => applied.push(`deshace ${x}`) });
    session.attach(ws);
    ws.setBlock(2, 20, 2, Block.Stone);
    expect(applied).toEqual(['pone 2', 'deshace 2']);
    // Pide la tienda: ya es residente con su parcela.
    const r = await session.request('tienda');
    expect(r.ok).toBe(true);
    expect(got.at(-1)?.map((p) => p.owner)).toEqual([HOST, 'ana']);
    expect(parseMessage({ t: 'parcelas', p: list })).not.toBeNull();
    expect(parseMessage({ t: 'pide', n: 1, op: 'robar' })).toBeNull();
  });
});

describe('v4.14: el urbanista', () => {
  it('a un invitado le ofrece la tienda de campaña y a quien tiene parcela, ampliarla', () => {
    vi.useFakeTimers();
    document.body.innerHTML = html.replace(/^[\s\S]*<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '');
    const world = new World(1, material);
    const planner = new Villager(PLANNER, world.plots[0], world, { friendship: 0 });
    let mine: { size: number; perks: string[] } | null = null;
    let grew = 0;
    const parcel: ParcelActions = {
      role: () => (mine ? 'residente' : 'invitado'),
      mine: () => mine,
      wallet: () => 100_000,
      manage: () => false,
      grow: async () => {
        grew++;
        return null;
      },
      buyMove: () => null,
      perk: () => null,
      tent: async () => null,
    };
    const ctx = {
      inventory: new Inventory(), selectedSlot: () => 0, today: '2026-10-27', hour: 12, fruitName: 'manzana', toast: () => {},
      onClose: () => {}, openShop: () => {}, donatable: () => [], donate: () => false, openCollection: () => {},
      learnRecipe: () => null, holiday: null, isBirthday: () => false,
      travel: { away: false, tickets: () => 0, fly: () => {}, goHome: () => {} }, invite: () => 'ok' as const,
      town: {
        level: () => 1, rating: () => ({ total: 0, stars: 1, parts: [], tip: '' }), notices: () => [], works: () => [], order: () => 'ok' as const,
        next: () => null, upgrade: () => 'ok' as const, names: () => [], setName: () => {}, setFlag: () => {}, buyBlueprint: () => 'ok' as const,
      },
      parcel,
    } as unknown as DialogContext;
    const dialog = new Dialog(ctx);
    const buttons = () => [...document.querySelectorAll<HTMLButtonElement>('#dialog-choices button')];
    const click = (label: string) => {
      buttons().find((b) => b.textContent?.startsWith(label))!.click();
      vi.runAllTimers();
    };
    dialog.start(planner);
    vi.runAllTimers();
    expect(buttons().map((b) => b.textContent)).toContain('Tienda de campaña');
    click('Tienda de campaña');
    expect(document.querySelector('#dialog-text')!.textContent).toMatch(/invitado/);
    dialog.finish(true);
    mine = { size: 0, perks: [] };
    dialog.start(planner);
    vi.runAllTimers();
    click('Tu parcela');
    expect(document.querySelector('#dialog-text')!.textContent).toContain('9×9');
    expect(buttons().map((b) => b.textContent)).not.toContain('Mudar la parcela');
    click('Ampliar a 13×13');
    click('¡Sí!');
    expect(grew).toBe(1);
    vi.useRealTimers();
  });
});
