import { describe, expect, it } from 'vitest';
import { HOTBAR_SIZE, INVENTORY_SIZE, Inventory, starterKit } from '../src/inventory';
import { RECIPES, itemDef } from '../src/items';

describe('bolsillos', () => {
  it('apila objetos iguales hasta el máximo y luego usa otra casilla', () => {
    const inv = new Inventory();
    const max = itemDef('rama').maxStack;
    expect(inv.add('rama', max + 3)).toBe(0);
    expect(inv.slots[0]).toEqual({ id: 'rama', count: max });
    expect(inv.slots[1]).toEqual({ id: 'rama', count: 3 });
    expect(inv.countOf('rama')).toBe(max + 3);
  });

  it('devuelve lo que no cabe cuando están llenos', () => {
    const inv = new Inventory();
    const max = itemDef('rama').maxStack;
    expect(inv.add('rama', max * INVENTORY_SIZE + 5)).toBe(5);
    expect(inv.canFit('rama')).toBe(false);
  });

  it('quita primero de la mochila y no de la barra rápida', () => {
    const inv = new Inventory();
    inv.slots[0] = { id: 'rama', count: 2 };
    inv.slots[HOTBAR_SIZE] = { id: 'rama', count: 2 };
    expect(inv.remove('rama', 3)).toBe(true);
    expect(inv.slots[HOTBAR_SIZE]).toBeNull();
    expect(inv.slots[0]).toEqual({ id: 'rama', count: 1 });
    expect(inv.remove('rama', 5)).toBe(false);
  });

  it('las herramientas se rompen al gastarse', () => {
    const inv = new Inventory();
    starterKit(inv);
    const uses = itemDef('hacha').durability!;
    for (let i = 1; i < uses; i++) expect(inv.wearTool(0)).toBe(false);
    expect(inv.wearTool(0)).toBe(true);
    expect(inv.slots[0]).toBeNull();
  });

  it('fabrica gastando los materiales', () => {
    const inv = new Inventory();
    const recipe = RECIPES[0];
    expect(inv.craft(recipe)).toBe(false);
    for (const [id, n] of recipe.needs) inv.add(id, n);
    expect(inv.craft(recipe)).toBe(true);
    for (const [id] of recipe.needs) expect(inv.countOf(id)).toBe(id === recipe.result ? recipe.count : 0);
    expect(inv.countOf(recipe.result)).toBe(recipe.count);
  });

  it('al cargar una partida ignora objetos que ya no existen', () => {
    const inv = new Inventory();
    inv.load([{ id: 'rama', count: 4 }, { id: 'objeto_que_no_existe', count: 1 }]);
    expect(inv.slots[0]).toEqual({ id: 'rama', count: 4 });
    expect(inv.slots[1]).toBeNull();
    expect(inv.slots).toHaveLength(INVENTORY_SIZE);
  });

  it('avisa de los cambios', () => {
    const inv = new Inventory();
    let calls = 0;
    inv.onChange(() => calls++);
    inv.add('rama');
    inv.consume(0);
    expect(calls).toBe(2);
  });
});
