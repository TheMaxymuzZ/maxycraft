import type { Inventory } from './inventory';
import { ITEM_KINDS, type ItemKind, itemDef } from './items';
import { itemIcon } from './icons';
import { itemCard } from './itemCard';
import { AVELLANA, type Economy, FILTER_KINDS, OFFER_DISCOUNT, type ShopDef, buyPrice, closedText, offerOf, sellPrice, shopBuys, stockFor, weekdayOf } from './economy';
import type { Season } from './seasons';
import { SHOP_LEVELS, shopLevel } from './shopBuilding';

export function formatBerries(n: number): string {
  return new Intl.NumberFormat('es').format(n);
}

export interface ShopContext {
  inventory: Inventory;
  atlas: HTMLCanvasElement;
  today: string;
  islandFruit: string;
  /** Fiesta de hoy: la tienda vende sus cosas de temporada. */
  holiday: string | null;
  season?: Season | null;
  /** Ya hay urbanista: los planos de casa los vende él (v4.13). */
  planner?: boolean;
  /** Hora del juego, para el horario (v4.9). */
  hour?: number;
  /** Registro de lo que se compra y se vende (v4.9). */
  economy?: Economy;
  getWallet: () => number;
  setWallet: (n: number) => void;
  toast: (text: string) => void;
  /** La tienda ha subido de nivel (v4.16). */
  levelUp?: (level: number) => void;
}

type Tab = 'comprar' | 'vender';

/**
 * Ventana de un comercio (v4.9: la misma para todos). Pestañas Comprar y Vender, filtros por tipo,
 * existencias del día y aviso de cerrado. Lo que vende y cómo paga sale de su ficha (economy.ts).
 */
export class Shop {
  readonly el = document.querySelector<HTMLDivElement>('#shop')!;
  private walletEl = document.querySelector<HTMLSpanElement>('#shop-wallet')!;
  private buyEl = document.querySelector<HTMLUListElement>('#shop-buy')!;
  private sellEl = document.querySelector<HTMLUListElement>('#shop-sell')!;
  private titleEl = document.querySelector<HTMLHeadingElement>('#shop-title');
  private filtersEl = document.querySelector<HTMLDivElement>('#shop-filters');
  private icons = new Map<string, string>();
  /** Lo que hay a la venta hoy, en orden. */
  stock: string[] = [];
  /** Unidades al día de lo que se acaba (lo demás, sin límite). */
  private units = new Map<string, number>();
  private tab: Tab = 'comprar';
  private filter: ItemKind | null = null;

  /** El comercio que tiene abierta la ventana (todos comparten la misma, v4.17). */
  private static current: Shop | null = null;
  static get active(): Shop | null {
    return Shop.current;
  }

  constructor(private ctx: ShopContext, readonly def: ShopDef = AVELLANA) {
    this.restock();
    ctx.inventory.onChange(() => {
      if (!this.el.hidden && Shop.current === this) this.render();
    });
    for (const b of document.querySelectorAll<HTMLButtonElement>('#shop [data-shop-tab]')) {
      b.addEventListener('click', () => {
        if (Shop.current === this) this.show(b.dataset.shopTab as Tab);
      });
    }
  }

  /** Nivel de la tienda según lo que se ha gastado en ella (v4.16). */
  get level(): number {
    return shopLevel(this.ctx.economy?.spentAt(this.def.id) ?? 0);
  }

  /** Cambia lo que hay a la venta: al abrir el juego y cada día nuevo. */
  restock() {
    const ctx = this.ctx;
    ctx.economy?.newDay(ctx.today);
    const items = stockFor(this.def, { today: ctx.today, season: ctx.season ?? null, holiday: ctx.holiday, planner: ctx.planner, level: this.level });
    this.stock = items.map((i) => i.id);
    this.units = new Map(items.filter((i) => i.units !== undefined).map((i) => [i.id, i.units!]));
  }

  /** Precio de venta de hoy (ver sellPrice en economy.ts). */
  sellPrice(id: string): number {
    return sellPrice(this.def, id, { today: this.ctx.today, islandFruit: this.ctx.islandFruit, economy: this.ctx.economy });
  }

  /** Lo que queda hoy de algo (Infinity si no se acaba). */
  remaining(id: string): number {
    const units = this.units.get(id);
    return this.ctx.economy ? this.ctx.economy.remaining(this.def, id, units) : units ?? Infinity;
  }

  /** Si está cerrado, el aviso; si está abierto, null. */
  closed(): string | null {
    return this.ctx.hour === undefined ? null : closedText(this.def, weekdayOf(this.ctx.today), this.ctx.hour);
  }

  private icon(id: string): string {
    let url = this.icons.get(id);
    if (!url) {
      url = itemIcon(this.ctx.atlas, id);
      this.icons.set(id, url);
    }
    return url;
  }

  /** Abre la tienda (o avisa de que está cerrada). Devuelve si se ha abierto. */
  open(): boolean {
    const shut = this.closed();
    if (shut) {
      this.ctx.toast(shut);
      return false;
    }
    if (this.titleEl) this.titleEl.textContent = this.def.name;
    Shop.current = this;
    this.el.hidden = false;
    this.render();
    return true;
  }

  close() {
    this.el.hidden = true;
    if (Shop.current === this) Shop.current = null;
    itemCard().hide();
  }

  /** Cambia de pestaña. */
  show(tab: Tab) {
    this.tab = tab;
    this.filter = null;
    this.render();
  }

  private row(id: string, detail: string): HTMLLIElement {
    const li = document.createElement('li');
    li.innerHTML = `<img alt="" src="${this.icon(id)}"><div><b>${itemDef(id).name}</b><small>${detail}</small></div><span class="actions"></span>`;
    itemCard().attach(li, () => id);
    return li;
  }

  private button(li: HTMLLIElement, label: string, enabled: boolean, fn: () => void) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.disabled = !enabled;
    b.addEventListener('click', fn);
    li.querySelector('.actions')!.appendChild(b);
  }

  /** Botones de filtro con los tipos que hay en la lista. */
  private renderFilters(ids: string[]) {
    const el = this.filtersEl;
    if (!el) return;
    el.innerHTML = '';
    const kinds = FILTER_KINDS.filter((k) => ids.some((id) => itemDef(id).kind === k));
    if (kinds.length < 2) return;
    for (const k of [null, ...kinds]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = k ? ITEM_KINDS[k] : 'Todo';
      b.setAttribute('aria-pressed', String(this.filter === k));
      b.addEventListener('click', () => {
        this.filter = k;
        this.render();
      });
      el.appendChild(b);
    }
  }

  render() {
    itemCard().hide();
    const wallet = this.ctx.getWallet();
    this.walletEl.textContent = formatBerries(wallet);
    for (const b of this.el.querySelectorAll<HTMLButtonElement>('[data-shop-tab]')) b.setAttribute('aria-selected', String(b.dataset.shopTab === this.tab));
    this.buyEl.closest('section')?.toggleAttribute('hidden', this.tab !== 'comprar');
    this.sellEl.closest('section')?.toggleAttribute('hidden', this.tab !== 'vender');
    const shown = (id: string) => !this.filter || itemDef(id).kind === this.filter;

    this.buyEl.innerHTML = '';
    if (this.tab === 'comprar') this.renderFilters(this.stock);
    const offer = this.offer;
    for (const id of this.stock.filter(shown)) {
      const price = this.priceOf(id);
      const left = this.remaining(id);
      const deal = id === offer ? ' · ¡oferta del día!' : '';
      const detail = `${formatBerries(price)} bayas${deal}${left === Infinity ? '' : left ? ` · quedan ${left}` : ' · agotado hasta mañana'}`;
      const li = this.row(id, detail);
      this.button(li, 'Comprar', left > 0 && wallet >= price && this.ctx.inventory.canFit(id), () => this.buy(id));
      this.buyEl.appendChild(li);
    }

    this.sellEl.innerHTML = '';
    // Las herramientas al final, para no venderlas sin querer.
    const ids = [...new Set(this.ctx.inventory.slots.filter((s) => s).map((s) => s!.id))]
      .filter((id) => shopBuys(this.def, id))
      .sort((a, b) => Number(!!itemDef(a).tool) - Number(!!itemDef(b).tool));
    if (this.tab === 'vender') this.renderFilters(ids);
    if (!ids.length) {
      this.sellEl.innerHTML = '<li class="empty">No llevas nada que vender aquí.</li>';
    }
    for (const id of ids.filter(shown)) {
      const count = this.ctx.inventory.countOf(id);
      const price = this.sellPrice(id);
      const base = itemDef(id).sell;
      const tired = (this.ctx.economy?.saturation(id) ?? 1) < 1;
      const trend = tired ? ' · ya has vendido mucho, se paga menos unos días' : price > base ? ' · hoy se paga más' : price < base ? ' · hoy se paga menos' : '';
      const li = this.row(id, `${formatBerries(price)} bayas cada uno · tienes ${count}${trend}`);
      this.button(li, 'Vender 1', true, () => this.sell(id, 1));
      if (count > 1) this.button(li, `Vender ${count}`, true, () => this.sell(id, count));
      this.sellEl.appendChild(li);
    }
  }

  /** La oferta de hoy (v4.17), en los comercios que las hacen. */
  get offer(): string | null {
    return this.def.offers ? offerOf(this.def, this.ctx.today, this.stock) : null;
  }

  /** Lo que cuesta hoy comprar algo aquí (con la rebaja si es la oferta del día). */
  priceOf(id: string): number {
    const price = buyPrice(this.def, id);
    return id === this.offer ? Math.max(1, Math.round(price * OFFER_DISCOUNT)) : price;
  }

  private buy(id: string) {
    const price = this.priceOf(id);
    const wallet = this.ctx.getWallet();
    if (wallet < price || this.remaining(id) <= 0 || this.ctx.inventory.add(id) > 0) return;
    this.ctx.setWallet(wallet - price);
    const before = this.level;
    this.ctx.economy?.recordPurchase(this.def, id, 1, price);
    this.ctx.toast(`Has comprado: ${itemDef(id).name.toLowerCase()}`);
    if (this.level > before) {
      // Sube de nivel: lo nuevo sale a la venta mañana, y Avellana lo anuncia.
      this.ctx.toast(`¡La tienda pasa a ser ${SHOP_LEVELS[this.level].name}! ${SHOP_LEVELS[this.level].text}`);
      this.ctx.levelUp?.(this.level);
    }
    this.render();
  }

  private sell(id: string, count: number) {
    if (this.ctx.inventory.countOf(id) < count) return;
    // Si vendes muchos de lo mismo el precio baja: se cobra uno a uno.
    let total = 0;
    for (let i = 0; i < count; i++) {
      const price = this.sellPrice(id);
      total += price;
      this.ctx.economy?.recordSale(id, 1, price);
    }
    this.ctx.inventory.remove(id, count);
    this.ctx.setWallet(this.ctx.getWallet() + total);
    this.ctx.toast(`+${formatBerries(total)} bayas`);
    this.render();
  }
}
