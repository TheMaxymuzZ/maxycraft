import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { CATALOG, DIY_RECIPES, RECIPES, STARTER_DIY, breakInfo, dropFor, hasItem, itemDef, toolNameFor } from '../src/items';

describe('objetos y recetas', () => {
  it('todas las recetas usan y fabrican objetos que existen', () => {
    for (const r of [...RECIPES, ...DIY_RECIPES]) {
      expect(hasItem(r.result), r.result).toBe(true);
      expect(r.count).toBeGreaterThan(0);
      for (const [id, n] of r.needs) {
        expect(hasItem(id), id).toBe(true);
        expect(n).toBeGreaterThan(0);
      }
    }
  });

  it('las recetas iniciales de la mesa de trabajo existen', () => {
    const results = new Set(DIY_RECIPES.map((r) => r.result));
    for (const id of STARTER_DIY) expect(results.has(id), id).toBe(true);
  });

  it('todo lo de la tienda tiene precio de compra', () => {
    for (const id of CATALOG) expect(itemDef(id).buy, id).toBeGreaterThan(0);
  });

  it('lo que sueltan los bloques son objetos que existen', () => {
    for (const b of Object.values(Block).filter((v): v is number => typeof v === 'number')) {
      const id = dropFor(b);
      if (id) expect(hasItem(id), `${Block[b]} → ${id}`).toBe(true);
    }
  });

  it('un objeto desconocido da error', () => {
    expect(() => itemDef('no_existe')).toThrow();
  });
});

describe('romper bloques', () => {
  it('la piedra necesita pico', () => {
    expect(breakInfo(Block.Stone, null).allowed).toBe(false);
    expect(toolNameFor(Block.Stone)).toBe('un pico');
    const withPick = breakInfo(Block.Stone, itemDef('pico'));
    expect(withPick.allowed).toBe(true);
    expect(withPick.usesTool).toBe(true);
  });

  it('con la herramienta adecuada se rompe más rápido', () => {
    const hand = breakInfo(Block.Dirt, null);
    const shovel = breakInfo(Block.Dirt, itemDef('pala'));
    expect(shovel.seconds).toBeLessThan(hand.seconds);
  });

  it('la herramienta equivocada no se desgasta', () => {
    expect(breakInfo(Block.Dirt, itemDef('hacha')).usesTool).toBe(false);
  });
});
