import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { dropFor } from '../src/items';
import { CONTAINERS, Storage, putStack } from '../src/storage';

describe('cofres, baúles y cajas', () => {
  it('cada uno tiene su tamaño y se recoge como objeto', () => {
    expect(CONTAINERS[Block.Crate]!.size).toBeLessThan(CONTAINERS[Block.Chest]!.size);
    expect(CONTAINERS[Block.Chest]!.size).toBeLessThan(CONTAINERS[Block.Trunk]!.size);
    expect(dropFor(Block.Trunk)).toBe('baul');
  });

  it('junta montones y devuelve lo que no cabe', () => {
    const slots = [{ id: 'tablones', count: 98 }, null];
    expect(putStack(slots, { id: 'tablones', count: 5 })).toBeNull();
    expect(slots).toEqual([{ id: 'tablones', count: 99 }, { id: 'tablones', count: 4 }]);
    expect(putStack(slots, { id: 'piedra', count: 1 })).toEqual({ id: 'piedra', count: 1 });
  });

  it('las herramientas no pierden su desgaste', () => {
    const slots = [null, null];
    putStack(slots, { id: 'hacha', count: 1, wear: 12 });
    expect(slots[0]).toEqual({ id: 'hacha', count: 1, wear: 12 });
  });

  it('se guarda lo de dentro y al romperlo se vacía', () => {
    const st = new Storage();
    const slots = st.open(1, 20, 3, 9);
    putStack(slots, { id: 'manzana', count: 4 });
    const loaded = new Storage(st.serialize());
    expect(loaded.open(1, 20, 3, 9)[0]).toEqual({ id: 'manzana', count: 4 });
    expect(loaded.empty(1, 20, 3)).toEqual([{ id: 'manzana', count: 4 }]);
    expect(loaded.serialize()).toEqual({});
  });
});
