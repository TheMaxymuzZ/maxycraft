import { describe, expect, it } from 'vitest';
import { Inventory } from '../src/inventory';
import { CATALOG, itemDef } from '../src/items';
import { Shop, formatBerries } from '../src/shop';

function shop(today: string, holiday: string | null = null) {
  return new Shop({
    inventory: new Inventory(),
    atlas: document.createElement('canvas'),
    today,
    islandFruit: 'manzana',
    holiday,
    getWallet: () => 0,
    setWallet: () => {},
    toast: () => {},
  });
}

describe('tienda', () => {
  it('la fruta de la isla y las herramientas siempre valen lo mismo', () => {
    const s = shop('2026-10-25');
    expect(s.sellPrice('manzana')).toBe(itemDef('manzana').sell);
    expect(s.sellPrice('hacha')).toBe(itemDef('hacha').sell);
  });

  it('los demás precios cambian entre 0,7 y 1,4 veces su valor y son estables en el día', () => {
    for (const day of ['2026-10-25', '2026-10-26', '2026-11-03']) {
      const a = shop(day);
      const b = shop(day);
      const sell = itemDef('concha').sell;
      const price = a.sellPrice('concha');
      expect(price).toBe(b.sellPrice('concha'));
      expect(price).toBeGreaterThanOrEqual(Math.round(sell * 0.7));
      expect(price).toBeLessThanOrEqual(Math.round(sell * 1.4));
    }
  });

  it('la fruta de otras islas vale cinco veces más', () => {
    expect(shop('2026-10-25').sellPrice('naranja')).toBe(itemDef('naranja').sell * 5);
    expect(shop('2026-10-25').sellPrice('coco')).not.toBe(itemDef('coco').sell * 5);
  });

  it('siempre tiene billetes, semillas y animales', () => {
    const s = shop('2026-10-25');
    for (const id of ['billete', 'semillas_trigo', 'gallina', 'vaca', 'regadera']) expect(s.stock).toContain(id);
  });

  it('siempre vende herramientas y solo cosas del catálogo', () => {
    const s = shop('2026-10-25');
    // Las herramientas de otros comercios (v4.17) no las vende Avellana.
    for (const id of CATALOG.filter((id) => itemDef(id).tool && !itemDef(id).holiday && !itemDef(id).seller)) expect(s.stock).toContain(id);
    for (const id of s.stock) expect(CATALOG).toContain(id);
  });

  it('escribe las bayas con separador de miles', () => {
    expect(formatBerries(12500)).toBe('12.500');
  });
});
