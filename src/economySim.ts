// Simulador de la economía (v4.9): juega muchos días en un momento con un jugador "de costumbres" para comprobar
// que las cuentas cuadran: que se gana a buen ritmo sin que se dispare, que los precios nunca se rompen y que
// vender mucho de lo mismo baja el precio y luego se recupera. Lo usan las pruebas y servirá para equilibrar
// todos los comercios en la v4.26.

import { type Habitat, pickCreature } from './creatures';
import { DUNGEON_LEGENDS, treasure } from './dungeon';
import { AVELLANA, CLIMATE_GOODS, ESPIGA, Economy, GRAVA, HENO, type ShopDef, buyPrice, sellPrice, shopBuys, stockFor } from './economy';
import { ITEMS, itemDef } from './items';
import { PARCEL_PRICES, PERKS } from './parcels';
import { BOATS, STAGE_COSTS } from './shipyard';
import { HALL_LEVELS, PUBLIC_WORKS } from './townhall';

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

// --- Estilos de juego (v4.26) ---
// Cuatro jugadores que juegan una hora al día cada uno a su manera, con los precios de verdad: lo venden todo
// donde mejor se paga, gastan una parte en sus cosas y ahorran para las tres grandes metas del juego. Sirve para
// comprobar que ninguna forma de jugar es la única que compensa: los cuatro llegan a las metas en tiempos parecidos.

export type PlayStyle = 'pescador' | 'minero' | 'granjero' | 'explorador';
export const PLAY_STYLES: PlayStyle[] = ['pescador', 'minero', 'granjero', 'explorador'];

export const STYLE_INFO: Record<PlayStyle, { name: string; text: string }> = {
  pescador: { name: 'Pescador', text: 'Pesca en el mar y el río, y en alta mar cuando tiene velero.' },
  minero: { name: 'Minero', text: 'Pica en las cuevas: carbón, hierro, oro, amatista y fósiles; luego, minerales de las islas de recursos.' },
  granjero: { name: 'Granjero', text: 'Cultiva el huerto, cuida la granja y planta más frutales.' },
  explorador: { name: 'Explorador', text: 'Navega en balsa desde el día 3: trae cosas de otros climas, fruta de fuera y tesoros de mazmorras.' },
};

export interface Goal {
  id: string;
  name: string;
  cost: number;
  /** Día en que se quiere llegar, más o menos. */
  target: number;
}

/** Las tres grandes metas, en orden, con lo que cuestan de verdad en bayas (y lo que se suele comprar a la vez). */
export const GOALS: Goal[] = [
  { id: 'parcela', name: 'Primera ampliación de la parcela', cost: PARCEL_PRICES[1], target: 5 },
  {
    id: 'barco', name: 'Astillero y velero, y las mejoras de la parcela',
    cost: (STAGE_COSTS[0].bayas ?? 0) + (STAGE_COSTS[2].bayas ?? 0) + (BOATS.find((b) => b.kind === 'velero')!.cost.bayas ?? 0)
      + PERKS.reduce((n, p) => n + p.cost, 0),
    target: 15,
  },
  {
    id: 'ayuntamiento', name: 'Ayuntamiento al máximo, con sus obras',
    cost: HALL_LEVELS.reduce((n, l) => n + l.cost, 0) + PUBLIC_WORKS.reduce((n, w) => n + w.cost, 0),
    target: 40,
  },
];

/** Parte de lo que gana al día que se va en muebles, ropa y caprichos. */
export const EVERYDAY_SPEND = 0.3;

/** Los comercios de casa donde vende: cada cosa, donde más le paguen hoy. */
const HOME_SHOPS: ShopDef[] = [AVELLANA, ESPIGA, HENO, GRAVA];

/** Lo que consigue un jugador en un día, según su estilo, el día que es y lo que ya tiene (parcela grande, velero). */
export function dailyHaul(style: PlayStyle, day: number, has: { parcel: boolean; sailing: boolean }, random: () => number): { id: string; count: number }[] {
  const { parcel, sailing } = has;
  const out: { id: string; count: number }[] = [];
  const add = (id: string, count = 1) => count > 0 && out.push({ id, count });
  const chance = (p: number) => random() < p;
  // Lo de todos: la fruta de la isla cada tres días y unas conchas por la playa.
  if (day % 3 === 0) add('manzana', 27);
  add('concha', 2);
  add(SHELLS_RARE[Math.floor(random() * SHELLS_RARE.length)]);
  const creature = (habitats: Habitat[]) => {
    const c = pickCreature(habitats, 6 + Math.floor(random() * 17), random);
    if (c) add(c.id);
  };
  switch (style) {
    case 'pescador':
      // Con la caña de hierro (hacia el día 10) pesca algo más; con velero, también en alta mar.
      for (let i = 0; i < (day >= 10 ? 14 : 12); i++) creature(['mar', 'río']);
      if (sailing) for (let i = 0; i < 2; i++) creature(['alta_mar']);
      break;
    case 'minero':
      // Con el pico de hierro (hacia el día 10) saca más de cada veta.
      const pick = day >= 10 ? 1.5 : 1;
      add('carbon', Math.round(10 * pick));
      add('pepita_hierro', Math.round(3 * pick));
      add('piedra', 20);
      if (chance(0.6 * pick)) add('amatista');
      if (chance(0.3 * pick)) add('pepita_oro');
      for (let i = 0; i < 2; i++) creature(['tierra']);
      // Con velero, una isla de recursos cada tres días.
      if (sailing && day % 3 === 1) {
        add('cristal_brillante', 3);
        add('bloque_amatista', 2);
      }
      break;
    case 'granjero':
      // Con la parcela ampliada, el doble de huerto y de granja.
      const land = parcel ? 2 : 1;
      const crop = day % 2 === 0 ? 8 * land : 0;
      // Con trigo, huevos y leche hace pasteles en la cocina, que valen mucho más; lo que sobra, se vende tal cual.
      const cakes = Math.min(Math.floor(crop / 2), 2 * land);
      add('pastel', cakes);
      add('trigo', crop - cakes * 2);
      add('zanahoria', crop);
      add('tomate', crop);
      add('huevo', 4 * land - cakes * 2);
      add('leche', 2 * land - cakes);
      add('lana', land);
      // Más frutales: otra cosecha cada tres días, y a partir de la segunda semana, fruta de fuera injertada.
      if (day % 3 === 1) add('manzana', 27);
      if (day >= 10 && day % 3 === 2) add('naranja', 9);
      for (let i = 0; i < 4; i++) creature(['flores', 'árboles']);
      break;
    case 'explorador': {
      for (let i = 0; i < 4; i++) creature(['flores', 'árboles', 'suelo']);
      if (day < 3) break;
      // Un viaje al día: cosas de otros climas y fruta de fuera; con velero, islas más lejanas y más bodega.
      const goods = [...CLIMATE_GOODS.calido, ...CLIMATE_GOODS.frio, ...CLIMATE_GOODS.extrano];
      for (let i = 0; i < (sailing ? 24 : 14); i++) add(goods[Math.floor(random() * goods.length)]);
      add(['naranja', 'pera', 'melocoton', 'cereza'][day % 4], 9);
      // Una mazmorra cada tres días: lo legendario se lo queda; lo demás, a la tienda.
      if (day % 3 === 2) for (const t of treasure(DUNGEON_LEGENDS, [], random).items) add(t.id, t.count);
      break;
    }
  }
  return out;
}

const SHELLS_RARE = ['caracola', 'estrella'];

export interface StyleResult {
  style: PlayStyle;
  /** Día en que llega a cada meta (null si no llega en los días simulados). */
  reached: Record<string, number | null>;
  /** Bayas ganadas cada día. */
  earned: number[];
  /** El registro de cuentas de la partida: de dónde sale cada baya y a dónde va. */
  economy: Economy;
}

/** Juega `days` días con un estilo y apunta cuándo llega a cada meta. */
export function simulateStyle(style: PlayStyle, opts: { days?: number; seed?: number } = {}): StyleResult {
  const { days = 60, seed = 1 } = opts;
  const random = rng(seed);
  const start = Date.UTC(2026, 9, 1);
  const economy = new Economy(dayString(start, 0));
  const reached: Record<string, number | null> = Object.fromEntries(GOALS.map((g) => [g.id, null]));
  const earned: number[] = [];
  let wallet = 500;
  let next = 0;
  for (let day = 1; day <= days; day++) {
    const today = dayString(start, day);
    economy.newDay(today);
    const ctx = { today, islandFruit: 'manzana', economy, homeClimate: 'templado' as const };
    let gain = 0;
    for (const { id, count } of dailyHaul(style, day, { parcel: reached.parcela !== null, sailing: reached.barco !== null }, random)) {
      for (let k = 0; k < count; k++) {
        const shop = HOME_SHOPS.filter((s) => shopBuys(s, id)).sort((a, b) => sellPrice(b, id, ctx) - sellPrice(a, id, ctx))[0] ?? AVELLANA;
        const p = sellPrice(shop, id, ctx);
        economy.recordSale(id, 1, p);
        gain += p;
      }
    }
    earned.push(gain);
    const treats = Math.round(gain * EVERYDAY_SPEND);
    economy.recordFlow(-treats, 'caprichos');
    wallet += gain - treats;
    while (next < GOALS.length && wallet >= GOALS[next].cost) {
      wallet -= GOALS[next].cost;
      economy.recordFlow(-GOALS[next].cost, GOALS[next].id);
      reached[GOALS[next].id] = day;
      next++;
    }
  }
  return { style, reached, earned, economy };
}
