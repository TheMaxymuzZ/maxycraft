import type { Inventory } from './inventory';
import { CATALOG, isTreeFruit, itemDef } from './items';
import { itemIcon } from './icons';

/** Número estable entre 0 y 1 para un texto, para que los precios del día sean los mismos todo el día. */
function hash01(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10007) / 10007;
}

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
  getWallet: () => number;
  setWallet: (n: number) => void;
  toast: (text: string) => void;
}

/** La tienda: compra y venta con bayas. Los precios de venta cambian cada día. */
export class Shop {
  readonly el = document.querySelector<HTMLDivElement>('#shop')!;
  private walletEl = document.querySelector<HTMLSpanElement>('#shop-wallet')!;
  private buyEl = document.querySelector<HTMLUListElement>('#shop-buy')!;
  private sellEl = document.querySelector<HTMLUListElement>('#shop-sell')!;
  private icons = new Map<string, string>();
  /** Lo que hay a la venta hoy: las herramientas, lo del huerto y los billetes siempre, tres muebles y cinco cosas más. */
  stock: string[] = [];

  constructor(private ctx: ShopContext) {
    this.restock();
    ctx.inventory.onChange(() => {
      if (!this.el.hidden) this.render();
    });
  }

  /** Cambia lo que hay a la venta: al abrir el juego y cada día nuevo. */
  restock() {
    const ctx = this.ctx;
    const daily = (ids: string[]) => ids.sort((a, b) => hash01(ctx.today + a) - hash01(ctx.today + b));
    const tools = CATALOG.filter((id) => itemDef(id).tool);
    const seasonal = CATALOG.filter((id) => itemDef(id).holiday && itemDef(id).holiday === ctx.holiday);
    const furniture = daily(CATALOG.filter((id) => itemDef(id).furniture && !itemDef(id).holiday));
    const always = CATALOG.filter((id) => itemDef(id).always);
    const rest = daily(CATALOG.filter((id) => !itemDef(id).tool && !itemDef(id).furniture && !itemDef(id).always));
    this.stock = [...seasonal, ...tools, ...always, ...furniture.slice(0, 3), ...rest.slice(0, 5)];
  }

  /**
   * Precio de venta de hoy. La fruta de la isla siempre vale lo mismo, como en Animal Crossing,
   * y la de otras islas (traída de las islas misteriosas) vale cinco veces más.
   */
  sellPrice(id: string): number {
    const def = itemDef(id);
    if (id === this.ctx.islandFruit || def.tool) return def.sell;
    if (isTreeFruit(id)) return def.sell * 5;
    const factor = 0.7 + Math.round(hash01(`${this.ctx.today}:${id}`) * 14) * 0.05;
    return Math.max(1, Math.round(def.sell * factor));
  }

  private icon(id: string): string {
    let url = this.icons.get(id);
    if (!url) {
      url = itemIcon(this.ctx.atlas, id);
      this.icons.set(id, url);
    }
    return url;
  }

  open() {
    this.el.hidden = false;
    this.render();
  }

  close() {
    this.el.hidden = true;
  }

  private row(id: string, detail: string): HTMLLIElement {
    const li = document.createElement('li');
    li.innerHTML = `<img alt="" src="${this.icon(id)}"><div><b>${itemDef(id).name}</b><small>${detail}</small></div><span class="actions"></span>`;
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

  render() {
    const wallet = this.ctx.getWallet();
    this.walletEl.textContent = formatBerries(wallet);

    this.buyEl.innerHTML = '';
    for (const id of this.stock) {
      const price = itemDef(id).buy!;
      const li = this.row(id, `${formatBerries(price)} bayas`);
      this.button(li, 'Comprar', wallet >= price && this.ctx.inventory.canFit(id), () => this.buy(id));
      this.buyEl.appendChild(li);
    }

    this.sellEl.innerHTML = '';
    // Las herramientas al final, para no venderlas sin querer.
    const ids = [...new Set(this.ctx.inventory.slots.filter((s) => s).map((s) => s!.id))].sort(
      (a, b) => Number(!!itemDef(a).tool) - Number(!!itemDef(b).tool),
    );
    if (!ids.length) {
      this.sellEl.innerHTML = '<li class="empty">No llevas nada que vender.</li>';
    }
    for (const id of ids) {
      const count = this.ctx.inventory.countOf(id);
      const price = this.sellPrice(id);
      const base = itemDef(id).sell;
      const trend = price > base ? ' · hoy se paga más' : price < base ? ' · hoy se paga menos' : '';
      const li = this.row(id, `${formatBerries(price)} bayas cada uno · tienes ${count}${trend}`);
      this.button(li, 'Vender 1', true, () => this.sell(id, 1));
      if (count > 1) this.button(li, `Vender ${count}`, true, () => this.sell(id, count));
      this.sellEl.appendChild(li);
    }
  }

  private buy(id: string) {
    const price = itemDef(id).buy!;
    const wallet = this.ctx.getWallet();
    if (wallet < price || this.ctx.inventory.add(id) > 0) return;
    this.ctx.setWallet(wallet - price);
    this.ctx.toast(`Has comprado: ${itemDef(id).name.toLowerCase()}`);
    this.render();
  }

  private sell(id: string, count: number) {
    if (!this.ctx.inventory.remove(id, count)) return;
    const total = this.sellPrice(id) * count;
    this.ctx.setWallet(this.ctx.getWallet() + total);
    this.ctx.toast(`+${formatBerries(total)} bayas`);
    this.render();
  }
}
