import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import html from '../index.html?raw';
import { Block, ROOFS } from '../src/blocks';
import { BUSINESS, DECORATE_LEVEL, FRIEND_LEVELS, FURNITURE_STYLE, type DecorPiece, addDecor, decorTaste, friendLevel, homeSlots, houseLevel, likesFurniture, moveDecor } from '../src/decor';
import { Dialog, type DialogContext } from '../src/dialog';
import { FURNITURE } from '../src/furniture';
import { VillagerHomes, hasDecorableHome } from '../src/game/villagerHomes';
import { Inventory } from '../src/inventory';
import { ALL_PROFILES, type Villager, createVillagers } from '../src/villagers';
import { World } from '../src/world';

vi.mock('../src/icons', () => ({ tileIcon: () => '', itemIcon: () => '' }));

const material = new THREE.MeshBasicMaterial();

describe('v4.12: gustos y niveles', () => {
  it('todos los muebles tienen estilo y todos los vecinos un gusto con muebles que le encantan', () => {
    for (const f of FURNITURE) expect(FURNITURE_STYLE[f.id], f.id).toBeTruthy();
    for (const p of ALL_PROFILES) {
      const style = decorTaste(p);
      expect(Object.values(FURNITURE_STYLE).some((s) => s.includes(style)), p.name).toBe(true);
    }
    expect(likesFurniture({ name: 'Trufa', personality: 'gruñón' }, 'barril')).toBe(true);
    expect(likesFurniture({ name: 'Trufa', personality: 'gruñón' }, 'farola')).toBe(false);
  });

  it('niveles de amistad con nombre y casa que crece', () => {
    expect(FRIEND_LEVELS.map((l) => l.name)).toEqual(['Conocido', 'Colega', 'Amigo', 'Gran amigo', 'Mejor amigo']);
    expect(friendLevel(0)).toBe(0);
    expect(friendLevel(12)).toBe(DECORATE_LEVEL);
    expect(friendLevel(999)).toBe(4);
    expect([0, 12, 25, 45].map(houseLevel)).toEqual([0, 0, 1, 2]);
    expect(Object.keys(BUSINESS)).toHaveLength(6);
  });

  it('los regalos llenan huecos y, sin sitio, se guarda el que no es de su estilo', () => {
    const pieces: DecorPiece[] = [];
    const likes = (id: string) => id !== 'papelera';
    addDecor(pieces, 'mesa', 3, likes);
    addDecor(pieces, 'papelera', 3, likes);
    addDecor(pieces, 'silla', 3, likes);
    expect(pieces.map((p) => p.slot)).toEqual([0, 1, 2]);
    const { placed, removed } = addDecor(pieces, 'sofa', 3, likes);
    expect(removed?.id).toBe('papelera');
    expect(placed?.slot).toBe(1);
    expect(addDecor(pieces, 'manzana', 3, likes).placed).toBeNull();
    // Cambiar de sitio intercambia con el mueble que haya.
    const mesa = pieces.find((p) => p.id === 'mesa')!;
    moveDecor(pieces, mesa, 3);
    expect(mesa.slot).toBe(1);
    expect(pieces.find((p) => p.id === 'sofa')!.slot).toBe(0);
  });
});

describe('v4.12: casas de vecinos', () => {
  let world: World;
  let villagers: Villager[];
  let v: Villager;
  beforeEach(() => {
    world = new World(20261025, material, {}, { terrain: 2 });
    villagers = createVillagers(world, {});
    v = villagers.find(hasDecorableHome)!;
  });

  it('la casa tiene huecos dentro, que crecen con la amistad, y jardín', () => {
    const casita = homeSlots(world, v.home.door, 0);
    expect(casita.length).toBe(3);
    expect(homeSlots(world, v.home.door, 2).length).toBe(6);
    const [bx, , bz] = v.bedCell;
    for (const s of homeSlots(world, v.home.door, 2)) {
      // Dentro de las paredes (3x3 de la casa) y nunca encima de la cama.
      expect(Math.abs(s.cell[0] - v.home.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(s.cell[2] - v.home.z)).toBeLessThanOrEqual(1);
      expect(s.cell[0] === bx && s.cell[2] === bz).toBe(false);
    }
    const homes = new VillagerHomes(world, villagers, () => {});
    const before = homes.furniture.serialize().length;
    v.memory.friendship = 25;
    homes.refresh();
    expect(homes.furniture.serialize().length).toBeGreaterThan(before);
  });

  it('regalar un mueble lo pone en su casa y comenta si le gusta', () => {
    vi.useFakeTimers();
    document.body.innerHTML = html.replace(/^[\s\S]*<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '');
    const homes = new VillagerHomes(world, villagers, () => {});
    const inventory = new Inventory();
    const style = decorTaste(v.profile);
    const liked = Object.keys(FURNITURE_STYLE).find((id) => FURNITURE_STYLE[id].includes(style))!;
    inventory.add(liked, 1);
    const toasts: string[] = [];
    const ctx = {
      inventory, selectedSlot: () => 0, today: '2026-10-26', hour: 12, fruitName: 'manzana', toast: (t: string) => toasts.push(t),
      onClose: () => {}, openShop: () => {}, donatable: () => [], donate: () => false, openCollection: () => {},
      learnRecipe: () => null, holiday: null, isBirthday: () => false,
      travel: { away: false, tickets: () => 0, fly: () => {}, goHome: () => {} }, invite: () => 'ok' as const,
      decor: { available: hasDecorableHome, slots: (x: Villager) => homes.slots(x).length, changed: () => homes.refresh(), roof: () => {} },
    } satisfies DialogContext;
    const dialog = new Dialog(ctx);
    v.memory.friendship = 11;
    dialog.start(v);
    (dialog as unknown as { gift(slot: number): void }).gift(0);
    vi.runAllTimers();
    const text = document.querySelector('#dialog-text')!.textContent!;
    expect(text).toContain('estilo');
    expect(v.memory.decor?.[0].id).toBe(liked);
    const slot = homes.slots(v)[0].cell;
    expect(homes.furniture.at(...slot)?.id).toBe(liked);
    // Con el regalo suben a "amigos" y se avisa de lo que trae.
    expect(friendLevel(v.memory.friendship)).toBe(DECORATE_LEVEL);
    expect(toasts.some((t) => t.includes('amigo'))).toBe(true);
    // Ahora sale la opción de decorar.
    const buttons = [...document.querySelectorAll('#dialog-choices button')].map((b) => b.textContent);
    dialog.finish(true);
    dialog.start(v);
    vi.runAllTimers();
    const again = [...document.querySelectorAll('#dialog-choices button')].map((b) => b.textContent);
    expect(buttons.length + again.length).toBeGreaterThan(0);
    expect(again).toContain('Decorar tu casa');
    vi.useRealTimers();
  });

  it('el tejado de la casa grande cambia de color', () => {
    const homes = new VillagerHomes(world, villagers, () => {});
    const target = ROOFS.findIndex((r) => r !== v.home.roof);
    const changed: Block[] = [];
    homes.recolorRoof(v, target, (x, y, z, b) => {
      changed.push(b);
      world.setBlock(x, y, z, b);
    });
    expect(changed.length).toBeGreaterThan(20);
    expect(world.getBlock(v.home.x, v.home.y + 6, v.home.z)).toBe(ROOFS[target]);
  });
});
