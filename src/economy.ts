// Motor de comercio (v4.9). Todos los comercios salen del mismo molde: una ficha (ShopDef) con el dueño,
// el horario de cada día de la semana, lo que vende siempre, lo que cambia cada día (y por estación),
// su especialidad y su margen. Los precios salen de una tabla central (priceOf) y el registro de la economía
// (Economy) recuerda lo que se ha vendido y comprado, para que los precios bajen si vendes mucho de lo mismo
// y para poder equilibrar las cuentas después. Crear un comercio nuevo es solo escribir su ficha.

import { CATALOG, type ItemDef, type ItemKind, type Rarity, isTreeFruit, itemDef } from './items';
import type { Season } from './seasons';

/** Número estable entre 0 y 1 para un texto, para que los precios del día sean los mismos todo el día. */
export function hash01(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10007) / 10007;
}

// --- Tabla de precios ---

/** Si un objeto no tiene precio de compra, cuesta lo que paga la tienda por él por esto (según lo raro que es). */
const BUY_FACTOR: Record<Rarity, number> = { comun: 4, raro: 4.5, epico: 5, legendario: 6 };

/** Precio base de un objeto: lo que cuesta comprarlo y lo que se paga al venderlo (antes del precio del día). */
export function priceOf(id: string): { buy: number; sell: number } {
  const def = itemDef(id);
  return { buy: def.buy ?? Math.max(1, Math.round(def.sell * BUY_FACTOR[def.rarity])), sell: def.sell };
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
}

export interface StockContext {
  /** Día de hoy, "2026-10-25". */
  today: string;
  season: Season | null;
  holiday: string | null;
  /** Ya hay urbanista en la isla y vende él los planos de casa (v4.13). */
  planner?: boolean;
}

/** La tienda de Avellana, de todo un poco. Vende exactamente lo mismo que antes de la 4.9. */
export const AVELLANA: ShopDef = {
  id: 'avellana',
  name: 'Tienda de Avellana',
  owner: 'Avellana',
  hours: Array.from({ length: 7 }, () => [8, 22] as [number, number]),
  stock: [
    { pick: (d, c) => !!d.holiday && d.holiday === c.holiday },
    { pick: (d) => !!d.tool },
    { pick: (d, c) => !!d.always && !(c.planner && d.id === 'plano_casa') },
    { pick: (d) => !!d.furniture && !d.holiday, daily: 3, units: 2 },
    { pick: (d) => !d.tool && !d.furniture && !d.always, daily: 5 },
  ],
  margin: 1,
};

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
export function stockFor(shop: ShopDef, ctx: StockContext): { id: string; units?: number }[] {
  const out: { id: string; units?: number }[] = [];
  for (const g of shop.stock) {
    if (g.seasons && (!ctx.season || !g.seasons.includes(ctx.season))) continue;
    let ids = CATALOG.filter((id) => g.pick(itemDef(id), ctx));
    if (g.daily !== undefined) ids = ids.sort((a, b) => hash01(ctx.today + a) - hash01(ctx.today + b)).slice(0, g.daily);
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

  /** Cuánto baja el precio de venta de un objeto por haber vendido mucho (1 = nada). */
  saturation(id: string): number {
    const extra = (this.data.pressure[id] ?? 0) - FREE_UNITS;
    return extra <= 0 ? 1 : Math.max(MIN_FACTOR, 1 - extra * DROP_PER_UNIT);
  }

  /** El jugador ha vendido `count` unidades por `total` bayas. */
  recordSale(id: string, count: number, total: number) {
    this.data.pressure[id] = (this.data.pressure[id] ?? 0) + count;
    this.log(+total, `venta:${itemDef(id).kind}`);
  }

  /** El jugador ha comprado `count` unidades en un comercio por `total` bayas. */
  recordPurchase(shop: ShopDef, id: string, count: number, total: number) {
    const b = (this.data.bought[shop.id] ??= {});
    b[id] = (b[id] ?? 0) + count;
    this.log(-total, `compra:${itemDef(id).kind}`);
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

// --- Precios de un comercio ---

export interface PriceContext {
  today: string;
  /** La fruta de la isla: siempre vale lo mismo. */
  islandFruit: string;
  economy?: Economy;
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
  price *= ctx.economy?.saturation(id) ?? 1;
  return Math.max(1, Math.round(price));
}

/** Tipos de objeto que aparecen en los filtros de la tienda, en este orden. */
export const FILTER_KINDS: ItemKind[] = ['herramienta', 'mueble', 'bloque', 'recurso', 'consumible', 'criatura', 'tesoro', 'ropa', 'arma', 'especial'];
