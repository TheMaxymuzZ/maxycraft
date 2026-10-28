import { describe, expect, it, vi } from 'vitest';

// Sin canvas de verdad en las pruebas: los iconos son una imagen vacía.
vi.mock('../src/icons', () => ({ itemIcon: () => 'data:,' }));
import { AVELLANA, Economy, FREE_UNITS, type ShopDef, buyPrice, closedText, hash01, openState, priceOf, sellPrice, stockFor, weekdayOf } from '../src/economy';
import { simulateEconomy } from '../src/economySim';
import { Inventory } from '../src/inventory';
import { CATALOG, ITEMS, itemDef } from '../src/items';
import { Shop } from '../src/shop';
import indexHtml from '../index.html?raw';

/** Cómo elegía la tienda lo del día antes de la 4.9, para comprobar que el molde vende exactamente lo mismo. */
function oldStock(today: string, holiday: string | null): string[] {
  const daily = (ids: string[]) => ids.sort((a, b) => hash01(today + a) - hash01(today + b));
  // Lo de los comercios nuevos (v4.17) no lo vende Avellana.
  const SOLD = CATALOG.filter((id) => !itemDef(id).seller);
  const tools = SOLD.filter((id) => itemDef(id).tool);
  const seasonal = SOLD.filter((id) => itemDef(id).holiday && itemDef(id).holiday === holiday);
  const furniture = daily(SOLD.filter((id) => itemDef(id).furniture && !itemDef(id).holiday));
  const always = SOLD.filter((id) => itemDef(id).always);
  // Las piezas de puente (v5.0.1) se venden siempre, al final.
  const bridge = ['tablones_puente', 'barandilla', 'pilar'];
  const rest = daily(SOLD.filter((id) => !itemDef(id).tool && !itemDef(id).furniture && !itemDef(id).always && !bridge.includes(id)));
  return [...seasonal, ...tools, ...always, ...furniture.slice(0, 3), ...rest.slice(0, 5), ...bridge];
}

/** Una tienda de prueba: crearla es solo escribir su ficha. */
const FISHMONGER: ShopDef = {
  id: 'pescaderia',
  name: 'Pescadería de prueba',
  owner: 'Bigotes',
  hours: [null, [9, 14], [9, 14], [9, 14], [9, 14], [9, 20], [8, 13]],
  stock: [{ pick: (d) => d.tool === 'rod' }, { pick: (d) => d.kind === 'mueble' && !d.holiday, daily: 2, units: 3 }],
  buys: (d) => d.kind === 'criatura',
  specialty: { pick: (d) => d.kind === 'criatura', bonus: 1.25 },
  margin: 1.1,
};

describe('v4.9: tienda de Avellana en el molde nuevo', () => {
  it('vende exactamente lo mismo que antes, todos los días y en las fiestas', () => {
    const holidays = [null, ...new Set(ITEMS.map((d) => d.holiday).filter(Boolean))] as (string | null)[];
    for (let i = 0; i < 40; i++) {
      const today = new Date(Date.UTC(2026, 0, 1) + i * 9 * 86_400_000).toISOString().slice(0, 10);
      for (const holiday of holidays) {
        expect(stockFor(AVELLANA, { today, season: null, holiday }).map((s) => s.id)).toEqual(oldStock(today, holiday));
      }
    }
  });

  it('los precios de compra no cambian y los de venta se calculan igual que antes', () => {
    for (const id of CATALOG) expect(buyPrice(AVELLANA, id)).toBe(itemDef(id).buy);
    const ctx = { today: '2026-10-25', islandFruit: 'manzana' };
    for (const d of ITEMS) {
      const old = d.id === 'manzana' || d.tool ? d.sell : Math.max(1, Math.round(d.sell * (0.7 + Math.round(hash01(`2026-10-25:${d.id}`) * 14) * 0.05)));
      if (['naranja', 'pera', 'melocoton', 'cereza'].includes(d.id)) continue; // fruta de otras islas: x5, en shop.test
      expect(sellPrice(AVELLANA, d.id, ctx), d.id).toBe(old);
    }
  });

  it('la tabla de precios da precio de compra a todo, según su rareza si no lo tiene', () => {
    for (const d of ITEMS) {
      const p = priceOf(d.id);
      expect(p.buy).toBeGreaterThanOrEqual(1);
      if (d.buy === undefined && d.sell > 0) expect(p.buy).toBeGreaterThanOrEqual(d.sell * 4);
    }
  });
});

describe('v4.9: un comercio nuevo es solo su ficha', () => {
  it('tiene horario por día y avisa de cuándo abre', () => {
    expect(openState(FISHMONGER, 1, 10).open).toBe(true);
    expect(openState(FISHMONGER, 1, 15).open).toBe(false);
    expect(closedText(FISHMONGER, 1, 7)).toBe('Pescadería de prueba: cerrado. Vuelve a las 9:00');
    expect(closedText(FISHMONGER, 1, 15)).toBe('Pescadería de prueba: cerrado. Vuelve mañana a las 9:00');
    expect(closedText(FISHMONGER, 6, 14)).toBe('Pescadería de prueba: cerrado. Vuelve el lunes a las 9:00');
    expect(closedText(AVELLANA, 3, 21.9)).toBeNull();
    expect(closedText(AVELLANA, 3, 22)).toBe('Tienda de Avellana: cerrado. Vuelve mañana a las 8:00');
    expect(weekdayOf('2026-10-25')).toBe(0); // domingo
  });

  it('paga más por su especialidad, cobra su margen y vende pocas unidades de lo del día', () => {
    const ctx = { today: '2026-10-25', islandFruit: 'manzana' };
    const fish = ITEMS.find((d) => d.kind === 'criatura')!.id;
    expect(sellPrice(FISHMONGER, fish, ctx)).toBeGreaterThan(sellPrice(AVELLANA, fish, ctx));
    const stock = stockFor(FISHMONGER, { today: '2026-10-25', season: null, holiday: null });
    expect(stock.filter((s) => s.units === 3)).toHaveLength(2);
    for (const s of stock) expect(buyPrice(FISHMONGER, s.id)).toBe(Math.max(1, Math.round(priceOf(s.id).buy * 1.1)));
    const economy = new Economy('2026-10-25');
    const daily = stock.find((s) => s.units)!;
    economy.recordPurchase(FISHMONGER, daily.id, 3, 30);
    expect(economy.remaining(FISHMONGER, daily.id, daily.units)).toBe(0);
    economy.newDay('2026-10-26');
    expect(economy.remaining(FISHMONGER, daily.id, daily.units)).toBe(3);
  });
});

describe('v4.9: precios que bajan y se recuperan', () => {
  it('vender mucho de lo mismo baja el precio hasta la mitad como mucho, y en unos días vuelve', () => {
    const economy = new Economy('2026-10-25');
    const ctx = { today: '2026-10-25', islandFruit: 'manzana', economy };
    const full = sellPrice(AVELLANA, 'manzana', ctx);
    for (let i = 0; i < FREE_UNITS; i++) economy.recordSale('manzana', 1, full);
    expect(sellPrice(AVELLANA, 'manzana', ctx)).toBe(full);
    for (let i = 0; i < 200; i++) economy.recordSale('manzana', 1, full);
    const low = sellPrice(AVELLANA, 'manzana', ctx);
    expect(low).toBeLessThan(full);
    expect(low).toBeGreaterThanOrEqual(Math.floor(full * 0.5));
    for (const [day, min] of [['2026-10-26', 0.5], ['2026-10-29', 0.95]] as const) {
      economy.newDay(day);
      expect(sellPrice(AVELLANA, 'manzana', { ...ctx, today: day })).toBeGreaterThanOrEqual(Math.floor(full * min));
    }
    // Las herramientas no bajan nunca.
    for (let i = 0; i < 200; i++) economy.recordSale('hacha', 1, 1);
    expect(sellPrice(AVELLANA, 'hacha', ctx)).toBe(itemDef('hacha').sell);
  });

  it('el registro se guarda y se recupera', () => {
    const a = new Economy('2026-10-25');
    a.recordSale('manzana', 30, 3000);
    a.recordPurchase(AVELLANA, 'hacha', 1, itemDef('hacha').buy!);
    const b = new Economy('2026-10-25', JSON.parse(JSON.stringify(a.toJSON())));
    expect(b.saturation('manzana')).toBe(a.saturation('manzana'));
    expect(b.ledger).toEqual(a.ledger);
    expect(b.ledger[0].in).toBe(3000);
    expect(b.ledger[0].by['compra:herramienta']).toBe(itemDef('hacha').buy);
    // Una partida sin economía (de antes de la 4.9) empieza de cero.
    expect(new Economy('2026-10-25', undefined).ledger).toEqual([]);
  });
});

describe('v4.9: simulador de 60 días', () => {
  it('las cuentas cuadran y nada se rompe', () => {
    for (const seed of [1, 2, 3]) {
      const { days, economy } = simulateEconomy({ seed, days: 60 });
      expect(days).toHaveLength(60);
      let wallet = 500;
      days.forEach((d, i) => {
        expect(Number.isFinite(d.wallet)).toBe(true);
        expect(d.wallet).toBeGreaterThanOrEqual(0);
        wallet += d.earned - d.spent;
        expect(d.wallet).toBe(wallet);
        const led = economy.ledger[i];
        expect(led.in).toBe(d.earned);
        expect(led.out).toBe(d.spent);
      });
      // Se gana a buen ritmo, sin dispararse: entre 1.000 y 30.000 bayas al día de media.
      const avg = days.reduce((a, d) => a + d.earned, 0) / days.length;
      expect(avg).toBeGreaterThan(1000);
      expect(avg).toBeLessThan(30000);
    }
  });

  it('da lo mismo con la misma semilla', () => {
    expect(simulateEconomy({ seed: 7, days: 20 }).days).toEqual(simulateEconomy({ seed: 7, days: 20 }).days);
  });
});

describe('v4.9: ventana de la tienda', () => {
  function open(hour: number, wallet = 5000) {
    // La ventana tal como está en index.html.
    const html = indexHtml;
    const start = html.indexOf('<div id="shop"');
    document.body.innerHTML = html.slice(start, html.indexOf('<div id="workbench"', start));
    const inventory = new Inventory();
    let money = wallet;
    const toasts: string[] = [];
    const economy = new Economy('2026-10-25');
    const shop = new Shop({ inventory, atlas: document.createElement('canvas'), today: '2026-10-25', islandFruit: 'manzana', holiday: null, hour, economy, getWallet: () => money, setWallet: (n) => (money = n), toast: (t) => toasts.push(t) });
    return { shop, inventory, toasts, economy, get money() { return money; } };
  }

  it('cerrada fuera de su horario', () => {
    const t = open(23);
    expect(t.shop.open()).toBe(false);
    expect(t.toasts[0]).toContain('Vuelve mañana a las 8:00');
    expect(open(10).shop.open()).toBe(true);
  });

  it('vender muchos de golpe cobra cada uno a su precio y queda apuntado', () => {
    const t = open(10);
    t.inventory.add('manzana', 60);
    const one = t.shop.sellPrice('manzana');
    t.shop.open();
    t.shop.show('vender');
    const btn = [...document.querySelectorAll<HTMLButtonElement>('#shop-sell button')].find((b) => b.textContent === 'Vender 60')!;
    btn.click();
    expect(t.inventory.countOf('manzana')).toBe(0);
    expect(t.money - 5000).toBeLessThan(one * 60);
    expect(t.money - 5000).toBeGreaterThan(one * 60 * 0.7);
    expect(t.economy.ledger[0].in).toBe(t.money - 5000);
  });
});
