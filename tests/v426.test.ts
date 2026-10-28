import { describe, expect, it } from 'vitest';
import {
  AVELLANA, BALDOSA, CLIMATE_GOODS, ESPIGA, Economy, FREE_UNITS, GRAVA, HENO, HOME_MARKET, IMPORT_BONUS, SEDA, SERRIN,
  buyPrice, isImport, ledgerTotals, priceOf, sellPrice, shopBuys, stockFor, villageClimate, villageShop,
} from '../src/economy';
import { GOALS, PLAY_STYLES, simulateStyle } from '../src/economySim';
import { CRAFT_BONUS, CRAFT_CAP, DIY_RECIPES, ITEMS, PRICE_CHANGES, RECIPES, itemDef, materialsValue } from '../src/items';

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

describe('v4.26 balance económico global', () => {
  it('lo fabricado vale al menos sus materiales, pero nunca más que comprarlos', () => {
    const results = new Set([...RECIPES, ...DIY_RECIPES].map((r) => r.result));
    for (const id of results) {
      const v = materialsValue(id)!;
      const sell = itemDef(id).sell;
      expect(sell, id).toBeLessThanOrEqual(Math.max(1, Math.floor(v.buy * CRAFT_CAP)));
      const changed = PRICE_CHANGES.find((c) => c.id === id);
      if (changed?.why === 'esfuerzo') expect(sell, id).toBeGreaterThanOrEqual(Math.ceil(v.sell * CRAFT_BONUS));
    }
    expect(itemDef('pico_hierro').sell).toBeGreaterThan(3 * itemDef('pepita_hierro').sell);
    expect(PRICE_CHANGES.length).toBeGreaterThan(10);
  });

  it('cada rareza paga lo suyo', () => {
    const bands = { comun: [1, 1000], raro: [100, 2500], epico: [500, 3500], legendario: [3000, 20000] } as const;
    for (const d of ITEMS) {
      const [lo, hi] = bands[d.rarity];
      expect(d.sell, `${d.id} (${d.rarity})`).toBeGreaterThanOrEqual(lo);
      expect(d.sell, `${d.id} (${d.rarity})`).toBeLessThanOrEqual(hi);
    }
  });

  it('lo de otro clima vale más en casa; en la isla de donde es, no', () => {
    expect(isImport('hielo_azul', 'templado')).toBe(true);
    expect(isImport('hielo_azul', 'frio')).toBe(false);
    expect(isImport('cristal_brillante', 'frio')).toBe(true);
    expect(isImport('manzana', 'calido')).toBe(false);
    const ctx = { today: '2026-10-28', islandFruit: 'manzana' };
    const warm = sellPrice(AVELLANA, 'hielo_azul', { ...ctx, homeClimate: 'calido' });
    const cold = sellPrice(AVELLANA, 'hielo_azul', { ...ctx, homeClimate: 'frio' });
    expect(warm / cold).toBeCloseTo(IMPORT_BONUS, 1);
    // Islas de antes, sin clima: como templadas.
    expect(sellPrice(AVELLANA, 'hielo_azul', { ...ctx, homeClimate: null })).toBe(warm);
    // Fuera de casa no hay recargo de importación.
    expect(sellPrice(AVELLANA, 'hielo_azul', { ...ctx, homeClimate: 'calido', market: 'isla-1' })).toBe(cold);
  });

  it('cada isla tiene su mercado: inundar uno no baja los demás, y todos se recuperan con los días', () => {
    const e = new Economy('2026-10-01');
    e.recordSale('cactus', 80, 800, 'isla-2');
    expect(e.saturation('cactus', 'isla-2')).toBeLessThan(1);
    expect(e.saturation('cactus')).toBe(1);
    expect(e.saturation('cactus', 'isla-3')).toBe(1);
    e.recordSale('cactus', FREE_UNITS + 30, 800, HOME_MARKET);
    expect(e.saturation('cactus')).toBeLessThan(1);
    e.newDay('2026-10-06');
    expect(e.saturation('cactus')).toBe(1);
    expect(e.saturation('cactus', 'isla-2')).toBe(1);
  });

  it('las aldeas venden barato lo suyo y compran caro lo que no tienen, sin dejar revenderlo en casa', () => {
    const shops = [AVELLANA, ESPIGA, HENO, GRAVA, SEDA, SERRIN, BALDOSA];
    const climates = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const island = { island: `isla-${i}`, name: `Isla ${i}` };
      const shop = villageShop(island, 'Gato Pescador');
      const climate = villageClimate(island.island);
      climates.add(climate);
      const stock = stockFor(shop, { today: '2026-10-28', season: null, holiday: null });
      expect(stock.length).toBeGreaterThan(0);
      for (const { id } of stock) {
        expect(CLIMATE_GOODS[climate]).toContain(id);
        expect(buyPrice(shop, id)).toBeLessThan(priceOf(id).buy);
        // Lo más que te pagarían por ello en casa, en el mejor comercio y el mejor día, traído de fuera.
        const best = Math.max(...shops.filter((s) => shopBuys(s, id)).map((s) => (s.specialty?.pick(itemDef(id)) ? s.specialty.bonus : 1)));
        expect(buyPrice(shop, id), id).toBeGreaterThan(priceOf(id).sell * 1.4 * best * IMPORT_BONUS);
      }
      const ctx = { today: '2026-10-28', islandFruit: 'coco', market: island.island };
      const foreign = Object.entries(CLIMATE_GOODS).find(([c]) => c !== climate)![1][0];
      expect(sellPrice(shop, foreign, ctx)).toBeGreaterThan(sellPrice(AVELLANA, foreign, ctx));
    }
    expect(climates.size).toBeGreaterThan(1);
  });

  it('el registro sabe de dónde sale cada baya y a dónde va', () => {
    const e = new Economy('2026-10-01');
    e.recordSale('trigo', 10, 750);
    e.recordFlow(-20000, 'parcela');
    e.recordFlow(1000, 'regalo');
    const t = ledgerTotals(e.ledger);
    expect(t.in).toBe(1750);
    expect(t.out).toBe(20000);
    expect(t.by[0]).toEqual(['gasto:parcela', 20000]);
    expect(Object.fromEntries(t.by)).toMatchObject({ 'venta:recurso': 750, 'entrada:regalo': 1000 });
  });

  it('los cuatro estilos de juego llegan a las metas en tiempos parecidos y cerca de lo previsto', () => {
    const runs = PLAY_STYLES.map((s) => simulateStyle(s, { seed: 3 }));
    for (const g of GOALS) {
      const days = runs.map((r) => r.reached[g.id]);
      for (const d of days) expect(d, g.id).not.toBeNull();
      const ds = days as number[];
      expect(Math.max(...ds) / Math.min(...ds), g.id).toBeLessThanOrEqual(1.6);
      expect(Math.abs(median(ds) - g.target) / g.target, g.id).toBeLessThanOrEqual(0.35);
    }
    // Nadie gana casi todo de una sola cosa... salvo lo que es su estilo; y todos gastan en sus caprichos.
    for (const r of runs) expect(ledgerTotals(r.economy.ledger).by.some(([k]) => k === 'gasto:caprichos')).toBe(true);
    expect(simulateStyle('minero', { seed: 3 }).reached).toEqual(runs[1].reached);
  });
});
