// Simulador de la economía (v4.9): juega muchos días en un momento con un jugador "de costumbres" para comprobar
// que las cuentas cuadran: que se gana a buen ritmo sin que se dispare, que los precios nunca se rompen y que
// vender mucho de lo mismo baja el precio y luego se recupera. Lo usan las pruebas y servirá para equilibrar
// todos los comercios en la v4.26.

import { AVELLANA, Economy, type ShopDef, buyPrice, sellPrice, stockFor } from './economy';
import { ITEMS, itemDef } from './items';

export interface SimDay {
  day: string;
  wallet: number;
  earned: number;
  spent: number;
}

export interface SimOptions {
  days?: number;
  seed?: number;
  shop?: ShopDef;
  /** Fruta de la isla. */
  fruit?: string;
  /** Bayas al empezar (como una partida nueva). */
  wallet?: number;
  /** Peces e insectos que coge al día. */
  catches?: number;
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296;
}

function dayString(start: number, i: number): string {
  return new Date(start + i * 86_400_000).toISOString().slice(0, 10);
}

/** Juega `days` días y devuelve cómo va el monedero cada día y el registro de la economía. */
export function simulateEconomy(opts: SimOptions = {}): { days: SimDay[]; economy: Economy } {
  const { days = 60, seed = 1, shop = AVELLANA, fruit = 'manzana', catches = 8 } = opts;
  const random = rng(seed);
  const start = Date.UTC(2026, 9, 1);
  const economy = new Economy(dayString(start, 0));
  const creatures = ITEMS.filter((d) => d.kind === 'criatura').map((d) => d.id);
  let wallet = opts.wallet ?? 500;
  const out: SimDay[] = [];

  for (let i = 0; i < days; i++) {
    const today = dayString(start, i);
    economy.newDay(today);
    const ctx = { today, islandFruit: fruit, economy };
    let earned = 0;
    let spent = 0;
    const sell = (id: string, n: number) => {
      for (let k = 0; k < n; k++) {
        const p = sellPrice(shop, id, ctx);
        economy.recordSale(id, 1, p);
        earned += p;
      }
    };
    // Cada tres días recoge la fruta de sus árboles (unos 9 árboles con 3 frutas).
    if (i % 3 === 0) sell(fruit, 27);
    // Pesca y caza insectos un rato.
    for (let k = 0; k < catches && creatures.length; k++) sell(creatures[Math.floor(random() * creatures.length)], 1);
    wallet += earned;
    // Compra algo si le sobra: lo más caro que pueda pagar con un tercio de lo que tiene.
    const stock = stockFor(shop, { today, season: null, holiday: null });
    const affordable = stock.filter((s) => economy.remaining(shop, s.id, s.units) > 0 && buyPrice(shop, s.id) * 3 <= wallet && !itemDef(s.id).tool);
    if (affordable.length) {
      const pick = affordable.sort((a, b) => buyPrice(shop, b.id) - buyPrice(shop, a.id))[0];
      const price = buyPrice(shop, pick.id);
      economy.recordPurchase(shop, pick.id, 1, price);
      spent += price;
      wallet -= price;
    }
    out.push({ day: today, wallet, earned, spent });
  }
  return { days: out, economy };
}
