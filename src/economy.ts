// Motor de comercio (v4.9). Todos los comercios salen del mismo molde: una ficha (ShopDef) con el dueño,
// el horario de cada día de la semana, lo que vende siempre, lo que cambia cada día (y por estación),
// su especialidad y su margen. Los precios salen de una tabla central (priceOf) y el registro de la economía
// (Economy) recuerda lo que se ha vendido y comprado, para que los precios bajen si vendes mucho de lo mismo
// y para poder equilibrar las cuentas después. Crear un comercio nuevo es solo escribir su ficha.

import { CATALOG, type ItemDef, type ItemKind, baseBuy, isTreeFruit, itemDef } from './items';
import type { Season } from './seasons';
import type { Climate } from './world';

/** Número estable entre 0 y 1 para un texto, para que los precios del día sean los mismos todo el día. */
export function hash01(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10007) / 10007;
}

// --- Tabla de precios ---

/** Precio base de un objeto: lo que cuesta comprarlo y lo que se paga al venderlo (antes del precio del día). */
export function priceOf(id: string): { buy: number; sell: number } {
  const def = itemDef(id);
  return { buy: baseBuy(def), sell: def.sell };
}

// --- Fichas de comercio ---

type Pick = (def: ItemDef, ctx: StockContext) => boolean;

export interface StockGroup {
  pick: Pick;
  /** Cuántos distintos salen cada día (los demás, otro día). Sin número: todos. */
  daily?: number;
  /** Unidades de cada uno al día. Sin número: las que quieras. */
  units?: number;
  /** Solo en estas estaciones. */
  seasons?: Season[];
  /** Cuántos distintos de más salen según el nivel del comercio (v4.16): [nivel 1, nivel 2…]. */
  perLevel?: number[];
  /** Cosas que vende aunque no estén en el catálogo de la tienda (v4.17), por ejemplo vallas o brotes. */
  ids?: string[];
}

export interface ShopDef {
  id: string;
  name: string;
  /** Vecino que atiende. */
  owner: string;
  /** Horario de cada día de la semana (0 = domingo): [abre, cierra] en horas, o null si cierra ese día. */
  hours: ([number, number] | null)[];
  /** Lo que vende, en orden: cada grupo con sus reglas. */
  stock: StockGroup[];
  /** Lo que compra al jugador. Sin decir: todo. */
  buys?: (def: ItemDef) => boolean;
  /** Lo que más le interesa: lo paga más caro. */
  specialty?: { pick: (def: ItemDef) => boolean; bonus: number };
  /** Recargo al venderte sus cosas (1 = precio de la tabla). */
  margin: number;
  /** Cada día rebaja una cosa (v4.17). */
  offers?: boolean;
}

export interface StockContext {
  /** Día de hoy, "2026-10-25". */
  today: string;
  season: Season | null;
  holiday: string | null;
  /** Ya hay urbanista en la isla y vende él los planos de casa (v4.13). */
  planner?: boolean;
  /** Nivel del comercio, desde 0 (v4.16). */
  level?: number;
}

/** Piezas de puente (v5.0.1). */
export const BRIDGE_PARTS = ['tablones_puente', 'barandilla', 'pilar'];

/** La tienda de Avellana, de todo un poco. Vende exactamente lo mismo que antes de la 4.9. */
export const AVELLANA: ShopDef = {
  id: 'avellana',
  name: 'Tienda de Avellana',
  owner: 'Avellana',
  hours: Array.from({ length: 7 }, () => [8, 22] as [number, number]),
  stock: [
    { pick: (d, c) => !!d.holiday && d.holiday === c.holiday },
    { pick: (d) => !!d.tool && !d.seller },
    { pick: (d, c) => !!d.always && !(c.planner && d.id === 'plano_casa') },
    { pick: (d) => !!d.furniture && !d.holiday && !d.seller, daily: 3, units: 2, perLevel: [0, 2, 4] },
    { pick: (d) => !d.tool && !d.furniture && !d.always && !d.seller && !BRIDGE_PARTS.includes(d.id), daily: 5, perLevel: [0, 2, 4] },
    // v5.0.1: los puentes a los islotes se hacen a mano; lo necesario está siempre a la venta.
    { ids: BRIDGE_PARTS, pick: () => true },
  ],
  margin: 1,
};

// --- Comercios del campo y la mina (v4.17) ---

const SEEDS = ['semillas_trigo', 'semillas_zanahoria', 'semillas_tomate'];
const SAPLINGS = ['brote_manzano', 'brote_palmera', 'brote_pino'];

/** La tienda agrícola de Espiga: madruga y cierra a mediodía. Semillas, abono, regaderas y brotes en primavera. */
export const ESPIGA: ShopDef = {
  id: 'agricola',
  name: 'Agrícola de Espiga',
  owner: 'Espiga',
  hours: Array.from({ length: 7 }, () => [6, 14] as [number, number]),
  stock: [
    { pick: (d) => SEEDS.includes(d.id) || d.seller === 'agricola' || d.id === 'regadera' },
    { ids: SAPLINGS, pick: () => true, seasons: ['primavera', 'otoño'] },
  ],
  buys: (d) => d.kind === 'consumible' || d.kind === 'recurso',
  specialty: { pick: (d) => ['trigo', 'zanahoria', 'tomate'].includes(d.id), bonus: 1.25 },
  margin: 0.95,
  offers: true,
};

/** La granja de Heno: cierra los domingos. Animales, pienso y vallas para el cercado. */
export const HENO: ShopDef = {
  id: 'granja',
  name: 'Granja de Heno',
  owner: 'Heno',
  hours: Array.from({ length: 7 }, (_, d) => (d === 0 ? null : [8, 18] as [number, number])),
  stock: [
    { pick: (d) => d.id === 'gallina' || d.id === 'vaca' || d.seller === 'granja' },
    { ids: ['valla', 'puerta_valla'], pick: () => true },
  ],
  buys: (d) => ['huevo', 'leche', 'lana', 'trigo', 'zanahoria'].includes(d.id) || d.kind === 'consumible',
  specialty: { pick: (d) => ['huevo', 'leche', 'lana'].includes(d.id), bonus: 1.3 },
  margin: 1,
  offers: true,
};

/** La caseta de la mina de Grava: abre por la tarde. Herramientas de cristal, antorchas y le compra minerales. */
export const GRAVA: ShopDef = {
  id: 'mina',
  name: 'Mina de Grava',
  owner: 'Grava',
  hours: Array.from({ length: 7 }, () => [14, 23] as [number, number]),
  stock: [
    { pick: (d) => d.seller === 'mina' },
    { pick: (d) => d.id === 'antorcha' || d.id === 'pico' || d.id === 'hacha' || d.id === 'pala' || d.id === 'cubo' },
  ],
  buys: (d) => MINERALS.includes(d.id) || d.kind === 'bloque' || d.kind === 'tesoro',
  specialty: { pick: (d) => MINERALS.includes(d.id), bonus: 1.3 },
  margin: 1.05,
  offers: true,
};

// --- Moda, muebles y cosméticos (v4.18) ---

/** La boutique de Seda: cierra los lunes. Cada día cuelga diez prendas distintas (más al crecer). */
export const SEDA: ShopDef = {
  id: 'ropa',
  name: 'Boutique de Seda',
  owner: 'Seda',
  hours: Array.from({ length: 7 }, (_, d) => (d === 1 ? null : [10, 20] as [number, number])),
  stock: [{ pick: (d) => d.seller === 'ropa', daily: 10, perLevel: [0, 3, 6] }],
  buys: (d) => d.kind === 'ropa' || d.id === 'lana',
  specialty: { pick: (d) => d.kind === 'ropa' || d.id === 'lana', bonus: 1.2 },
  margin: 1,
  offers: true,
};

/** La nave de muebles de Serrín: lo suyo siempre y un catálogo de muebles que rota cada día. */
export const SERRIN: ShopDef = {
  id: 'muebles',
  name: 'Muebles Serrín',
  owner: 'Serrín',
  hours: Array.from({ length: 7 }, () => [9, 19] as [number, number]),
  stock: [
    { pick: (d) => d.seller === 'muebles' },
    { pick: (d) => !!d.furniture && !d.seller && !d.holiday, daily: 4, units: 2, perLevel: [0, 2, 4] },
  ],
  buys: (d) => !!d.furniture || d.id === 'tronco' || d.id === 'tablones',
  specialty: { pick: (d) => !!d.furniture, bonus: 1.15 },
  margin: 1,
  offers: true,
};

/** El taller de Baldosa: cierra los domingos. Farolas, bancos, jardineras y señales para las calles. */
export const BALDOSA: ShopDef = {
  id: 'urbano',
  name: 'Taller de Baldosa',
  owner: 'Baldosa',
  hours: Array.from({ length: 7 }, (_, d) => (d === 0 ? null : [8, 17] as [number, number])),
  stock: [
    { pick: (d) => d.seller === 'urbano' },
    { ids: ['farola', 'papelera', 'cartel', 'macetero', 'buzon', 'fuente'], pick: () => true },
  ],
  buys: (d) => d.kind === 'bloque' || !!d.furniture,
  specialty: { pick: (d) => ['piedra', 'ladrillo', 'baldosas', 'piedra_pulida'].includes(d.id), bonus: 1.3 },
  margin: 1,
  offers: true,
};

/** Lo que Grava paga mejor que nadie. */
export const MINERALS = ['carbon', 'pepita_hierro', 'pepita_oro', 'amatista', 'cristal_brillante', 'basalto', 'roca_magma'];

/** Rebaja de la oferta del día (v4.17): una cosa de cada comercio, cada día distinta. */
export const OFFER_DISCOUNT = 0.7;

/** La oferta de hoy de un comercio: una de las cosas que vende hoy, la misma todo el día. */
export function offerOf(shop: ShopDef, today: string, stock: readonly string[]): string | null {
  const options = stock.filter((id) => !itemDef(id).always || shop.id !== 'avellana');
  if (!options.length) return null;
  return options[Math.floor(hash01(`${today}:${shop.id}:oferta`) * options.length)];
}

/** Un día de la semana del texto "2026-10-25" (0 = domingo). */
export function weekdayOf(today: string): number {
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Si está abierto a esa hora; si no, a qué hora abre (el mismo día o el siguiente que abra). */
export function openState(shop: ShopDef, weekday: number, hour: number): { open: boolean; opensAt?: number; inDays?: number } {
  const today = shop.hours[weekday % 7];
  if (today && hour >= today[0] && hour < today[1]) return { open: true };
  if (today && hour < today[0]) return { open: false, opensAt: today[0], inDays: 0 };
  for (let i = 1; i <= 7; i++) {
    const h = shop.hours[(weekday + i) % 7];
    if (h) return { open: false, opensAt: h[0], inDays: i };
  }
  return { open: false };
}

const WEEKDAYS = ['el domingo', 'el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado'];

/** Aviso de "cerrado" para la puerta y el mostrador. */
export function closedText(shop: ShopDef, weekday: number, hour: number): string | null {
  const s = openState(shop, weekday, hour);
  if (s.open) return null;
  if (s.opensAt === undefined || s.inDays === undefined) return `${shop.name}: cerrado`;
  const when = s.inDays === 0 ? 'a las' : s.inDays === 1 ? 'mañana a las' : `${WEEKDAYS[(weekday + s.inDays) % 7]} a las`;
  return `${shop.name}: cerrado. Vuelve ${when} ${s.opensAt}:00`;
}

/** Lo que hay a la venta hoy, en orden, y cuántas unidades de cada uno (undefined: sin límite). */
/** Todo lo que puede llegar a vender un comercio, sin mirar el día ni la estación (para la wiki). */
export function catalogOf(shop: ShopDef): string[] {
  const ctx = { today: '', season: null, holiday: null, planner: true, level: 99 };
  return [...new Set(shop.stock.flatMap((g) => (g.ids ?? CATALOG).filter((id) => g.pick(itemDef(id), ctx))))];
}

export function stockFor(shop: ShopDef, ctx: StockContext): { id: string; units?: number }[] {
  const out: { id: string; units?: number }[] = [];
  for (const g of shop.stock) {
    if (g.seasons && (!ctx.season || !g.seasons.includes(ctx.season))) continue;
    let ids = (g.ids ?? CATALOG).filter((id) => g.pick(itemDef(id), ctx));
    const daily = g.daily === undefined ? undefined : g.daily + (g.perLevel?.[Math.min(ctx.level ?? 0, g.perLevel.length - 1)] ?? 0);
    if (daily !== undefined) ids = ids.sort((a, b) => hash01(ctx.today + a) - hash01(ctx.today + b)).slice(0, daily);
    for (const id of ids) out.push({ id, units: g.units });
  }
  return out;
}

// --- Registro de la economía ---

/** Unidades del mismo objeto que se pueden vender al día sin que baje su precio. */
export const FREE_UNITS = 20;
/** Cuánto baja el precio por cada unidad de más (1 %) y hasta dónde (la mitad). */
const DROP_PER_UNIT = 0.01;
const MIN_FACTOR = 0.5;
/** Cada día que pasa, la "saturación" de un objeto se queda en la mitad: en 3 o 4 días el precio se recupera. */
const RECOVERY = 0.5;
/** Días que se guardan en el registro de cuentas. */
const LEDGER_DAYS = 60;

export interface LedgerDay {
  day: string;
  /** Bayas que han entrado (ventas) y salido (compras). */
  in: number;
  out: number;
  /** Por tipo de objeto: "venta:criatura", "compra:mueble"… */
  by: Record<string, number>;
}

export interface EconomySave {
  day: string;
  /** Unidades compradas hoy en cada comercio, para las existencias. */
  bought: Record<string, Record<string, number>>;
  /** Unidades vendidas recientemente de cada objeto (baja cada día). */
  pressure: Record<string, number>;
  ledger: LedgerDay[];
  /** Bayas gastadas en cada comercio desde siempre, para su nivel (v4.16). */
  spent?: Record<string, number>;
}

/** El mercado de tu isla. Los de las demás se llaman como la isla ("isla-3"). */
export const HOME_MARKET = 'casa';

/** Clave de la saturación: en casa, el objeto (como antes de la 4.26); fuera, la isla y el objeto. */
function pressureKey(id: string, market: string): string {
  return market === HOME_MARKET ? id : `${market}:${id}`;
}

function daysBetween(a: string, b: string): number {
  const t = (s: string) => Date.parse(`${s}T00:00:00Z`);
  const d = Math.round((t(b) - t(a)) / 86_400_000);
  return Number.isFinite(d) ? d : 1;
}

export class Economy {
  private data: EconomySave;

  constructor(today: string, saved?: EconomySave | null) {
    this.data = saved && typeof saved.day === 'string' ? structuredClone(saved) : { day: today, bought: {}, pressure: {}, ledger: [] };
    this.data.bought ??= {};
    this.data.pressure ??= {};
    this.data.ledger ??= [];
    // Partidas de antes de la 4.16: lo gastado se saca de las cuentas que hay (los últimos días).
    this.data.spent ??= { avellana: this.data.ledger.reduce((n, d) => n + d.out, 0) };
    this.newDay(today);
  }

  get today() {
    return this.data.day;
  }

  /** Empieza un día: se reponen las existencias y los precios se recuperan un poco. */
  newDay(today: string) {
    const passed = daysBetween(this.data.day, today);
    if (passed <= 0) return;
    this.data.day = today;
    this.data.bought = {};
    const keep = Math.pow(RECOVERY, passed);
    for (const [id, p] of Object.entries(this.data.pressure)) {
      const left = p * keep;
      if (left < 1) delete this.data.pressure[id];
      else this.data.pressure[id] = left;
    }
  }

  /** Lo que queda hoy de un objeto en un comercio (Infinity si no se acaba). */
  remaining(shop: ShopDef, id: string, units: number | undefined): number {
    if (units === undefined) return Infinity;
    return Math.max(0, units - (this.data.bought[shop.id]?.[id] ?? 0));
  }

  /**
   * Cuánto baja el precio de venta de un objeto por haber vendido mucho (1 = nada). Cada isla tiene su mercado
   * (v4.26): inundar el de casa no baja lo que pagan en una aldea, y al revés.
   */
  saturation(id: string, market = HOME_MARKET): number {
    const extra = (this.data.pressure[pressureKey(id, market)] ?? 0) - FREE_UNITS;
    return extra <= 0 ? 1 : Math.max(MIN_FACTOR, 1 - extra * DROP_PER_UNIT);
  }

  /** El jugador ha vendido `count` unidades por `total` bayas (en casa o en el mercado de otra isla). */
  recordSale(id: string, count: number, total: number, market = HOME_MARKET) {
    const key = pressureKey(id, market);
    this.data.pressure[key] = (this.data.pressure[key] ?? 0) + count;
    this.log(+total, `venta:${itemDef(id).kind}`);
  }

  /** El jugador ha comprado `count` unidades en un comercio por `total` bayas. */
  recordPurchase(shop: ShopDef, id: string, count: number, total: number) {
    const b = (this.data.bought[shop.id] ??= {});
    b[id] = (b[id] ?? 0) + count;
    this.data.spent![shop.id] = (this.data.spent![shop.id] ?? 0) + total;
    this.log(-total, `compra:${itemDef(id).kind}`);
  }

  /**
   * Bayas que entran o salen sin pasar por un comercio (v4.26): parcela, barco, ayuntamiento, arreglos, regalos…
   * Así el registro sabe de dónde sale cada baya y a dónde va.
   */
  recordFlow(amount: number, what: string) {
    if (amount) this.log(amount, `${amount > 0 ? 'entrada' : 'gasto'}:${what}`);
  }

  /** Bayas gastadas en un comercio desde siempre. */
  spentAt(shopId: string): number {
    return this.data.spent?.[shopId] ?? 0;
  }

  private log(amount: number, key: string) {
    let day = this.data.ledger.at(-1);
    if (!day || day.day !== this.data.day) {
      day = { day: this.data.day, in: 0, out: 0, by: {} };
      this.data.ledger.push(day);
      if (this.data.ledger.length > LEDGER_DAYS) this.data.ledger.shift();
    }
    if (amount >= 0) day.in += amount;
    else day.out -= amount;
    day.by[key] = (day.by[key] ?? 0) + Math.abs(amount);
  }

  get ledger(): readonly LedgerDay[] {
    return this.data.ledger;
  }

  toJSON(): EconomySave {
    return structuredClone(this.data);
  }
}

/** Lo que ha entrado y salido en los últimos días del registro, por motivo, de más a menos. */
export function ledgerTotals(ledger: readonly LedgerDay[], days = ledger.length): { in: number; out: number; by: [string, number][] } {
  const recent = ledger.slice(-days);
  const by: Record<string, number> = {};
  for (const d of recent) for (const [k, v] of Object.entries(d.by)) by[k] = (by[k] ?? 0) + v;
  return {
    in: recent.reduce((n, d) => n + d.in, 0),
    out: recent.reduce((n, d) => n + d.out, 0),
    by: Object.entries(by).sort((a, b) => b[1] - a[1]),
  };
}

// --- Precios de un comercio ---

export interface PriceContext {
  today: string;
  /** La fruta de la isla: siempre vale lo mismo. */
  islandFruit: string;
  economy?: Economy;
  /** Dónde se vende: en casa (sin decir) o en el mercado de otra isla (v4.26). */
  market?: string;
  /** Clima de tu isla: lo de otros climas se paga más en casa (v4.26). null: isla de antes, templada; sin decir: no se mira. */
  homeClimate?: Climate | null;
}

/** Lo que cuesta comprarle algo. */
export function buyPrice(shop: ShopDef, id: string): number {
  return Math.max(1, Math.round(priceOf(id).buy * shop.margin));
}

/** Si le compra eso al jugador. */
export function shopBuys(shop: ShopDef, id: string): boolean {
  return shop.buys ? shop.buys(itemDef(id)) : true;
}

/**
 * Lo que paga hoy por algo. La fruta de la isla y las herramientas valen siempre lo mismo, como en Animal Crossing;
 * la fruta de otras islas vale cinco veces más, y lo demás cambia cada día entre 0,7 y 1,4 veces su valor.
 * Lo de su especialidad lo paga más caro, y si has vendido mucho de lo mismo estos días, se paga menos.
 */
export function sellPrice(shop: ShopDef, id: string, ctx: PriceContext): number {
  const def = itemDef(id);
  const base = priceOf(id).sell;
  if (def.tool) return base;
  let price: number;
  if (id === ctx.islandFruit) price = base;
  else if (isTreeFruit(id)) price = base * 5;
  else price = base * (0.7 + Math.round(hash01(`${ctx.today}:${id}`) * 14) * 0.05);
  if (shop.specialty?.pick(def)) price *= shop.specialty.bonus;
  const market = ctx.market ?? HOME_MARKET;
  if (market === HOME_MARKET && ctx.homeClimate !== undefined && isImport(id, ctx.homeClimate)) price *= IMPORT_BONUS;
  price *= ctx.economy?.saturation(id, market) ?? 1;
  return Math.max(1, Math.round(price));
}

/** Tipos de objeto que aparecen en los filtros de la tienda, en este orden. */
export const FILTER_KINDS: ItemKind[] = ['herramienta', 'mueble', 'bloque', 'recurso', 'consumible', 'criatura', 'tesoro', 'ropa', 'arma', 'especial'];

// --- Lo que traes de fuera y el comercio entre islas (v4.26) ---

/**
 * Lo propio de cada clima: lo que solo sale en las islas de ese clima. En casa, lo de otros climas se paga más;
 * 'mar' es lo que no sale en ninguna isla de casa (solo en las del archipiélago).
 */
export const CLIMATE_GOODS: Record<Climate | 'mar', string[]> = {
  templado: ['bambu', 'flores_cerezo', 'musgo', 'nenufar', 'barro'],
  calido: ['arena_roja', 'arenisca', 'arenisca_tallada', 'cactus', 'terracota_naranja', 'terracota_amarilla', 'terracota_blanca', 'hojas_acacia'],
  frio: ['hielo', 'hielo_compacto', 'hielo_azul', 'nieve', 'flor_nieve'],
  extrano: ['basalto', 'roca_magma', 'obsidiana', 'lava_petrificada', 'ceniza', 'roca_negra', 'pizarra', 'hierba_azul', 'flor_luminosa', 'seta_luminosa', 'hojas_luminosas', 'micelio', 'tallo_seta', 'seta'],
  mar: ['cristal_brillante', 'bloque_amatista', 'nucleo_lava', 'polvo_espiritu'],
};

/** Lo que traes de fuera vale esto más en casa (antes de que baje si vendes mucho). */
export const IMPORT_BONUS = 1.3;

/** Si en tu isla eso es "de fuera": de otro clima, o de las islas del mar. */
export function isImport(id: string, homeClimate: Climate | null): boolean {
  const home = homeClimate ?? 'templado';
  return (Object.keys(CLIMATE_GOODS) as (Climate | 'mar')[]).some((c) => c !== home && CLIMATE_GOODS[c].includes(id));
}

/** Clima de los alrededores de una isla aldea: de ahí salen las cosas de su puesto. */
export function villageClimate(islandId: string): Climate {
  const climates: Climate[] = ['templado', 'calido', 'frio', 'extrano'];
  return climates[Math.floor(hash01(`clima:${islandId}`) * climates.length)];
}

/** Recargo del puesto de una aldea al venderte lo suyo: barato, porque allí sobra (pero no tanto como para revenderlo en casa). */
export const VILLAGE_MARGIN = 0.75;
/** Lo que no tienen allí lo pagan esto más. */
export const VILLAGE_WANTS = 1.4;

/**
 * El puesto del mercado de una isla aldea (v4.26): vende barato lo de su clima y compra caro lo que allí no hay
 * (lo de otros climas, minerales, fruta de fuera, tesoros). Abre de día, todos los días.
 */
export function villageShop(island: { island: string; name: string }, owner: string): ShopDef {
  const local = new Set(CLIMATE_GOODS[villageClimate(island.island)]);
  const wanted = (d: ItemDef) => !local.has(d.id) && (d.kind === 'bloque' || d.kind === 'recurso' || d.kind === 'tesoro' || isTreeFruit(d.id));
  return {
    id: `aldea:${island.island}`,
    name: `Mercado de ${island.name}`,
    owner,
    hours: Array.from({ length: 7 }, () => [8, 20] as [number, number]),
    stock: [{ ids: [...local], pick: () => true, daily: 4, units: 20 }],
    buys: (d) => d.kind !== 'herramienta' && d.kind !== 'especial',
    specialty: { pick: wanted, bonus: VILLAGE_WANTS },
    margin: VILLAGE_MARGIN,
  };
}
