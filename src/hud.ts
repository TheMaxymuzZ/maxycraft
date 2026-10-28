import { HOTBAR_SIZE, INVENTORY_SIZE, type Inventory } from './inventory';
import { type ItemStack, RECIPES, type Recipe, TOOL_USE, itemDef } from './items';
import { RecipeBrowser } from './recipeBrowser';
import { clickStack } from './storage';
import { itemIcon } from './icons';
import { Notices } from './notices';
import { type ItemFilter, itemCard, matchesFilter, rarityFor, renderFilters } from './itemCard';

/** Barra rápida, pantalla de bolsillos, avisos y progreso al romper. */
export class Hud {
  selected = 0;
  /** El objeto que el jugador lleva con el ratón en la pantalla de bolsillos. */
  private cursor: ItemStack | null = null;
  private icons = new Map<string, string>();
  private hotbarSlots: HTMLDivElement[] = [];
  private offhandEl = document.createElement('div');
  private invSlots: HTMLDivElement[] = [];
  private nameTimer = 0;
  /** Casilla de la que se ha empezado a arrastrar (v5.0.1) y la que tiene el ratón encima. */
  private dragFrom: number | null = null;
  private hovered: number | null = null;
  /** Tira un montón al suelo (lo pone main, que sabe dónde está el jugador). */
  onThrow: ((s: ItemStack) => void) | null = null;

  private hotbarEl = document.querySelector<HTMLDivElement>('#hotbar')!;
  private nameEl = document.querySelector<HTMLDivElement>('#block-name')!;
  readonly notices = new Notices(document.querySelector<HTMLDivElement>('#toasts')!);
  private progressEl = document.querySelector<HTMLDivElement>('#break-progress')!;
  readonly inventoryEl = document.querySelector<HTMLDivElement>('#inventory')!;
  private gridEl = document.querySelector<HTMLDivElement>('#inv-grid')!;
  private recipesEl = document.querySelector<HTMLUListElement>('#recipes')!;
  private cursorEl = document.querySelector<HTMLDivElement>('#cursor-stack')!;
  private recipes: RecipeBrowser;
  private filtersEl = document.querySelector<HTMLDivElement>('#inv-filters');
  /** Resalta en los bolsillos un tipo o una rareza (v4.10). */
  private filter: ItemFilter = null;

  constructor(private inv: Inventory, private atlas: HTMLCanvasElement) {
    this.recipes = new RecipeBrowser(this.recipesEl, {
      id: 'bolsillos',
      recipes: () => RECIPES,
      canCraft: (r) => this.inv.canCraft(r),
      row: (r) => this.recipeRow(r),
    });
    document.querySelector('#inv-sort')?.addEventListener('click', () => this.inv.sort());
    // La otra mano, a la izquierda de la barra. Tocarla cambia de mano.
    this.offhandEl.className = 'slot offhand';
    this.offhandEl.addEventListener('click', () => this.swapHands());
    this.hotbarEl.appendChild(this.offhandEl);
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'slot';
      // En pantallas táctiles se elige casilla tocándola.
      el.addEventListener('click', () => this.select(i));
      itemCard().attach(el, () => this.inv.slots[i]?.id ?? null);
      this.hotbarEl.appendChild(el);
      this.hotbarSlots.push(el);
    }
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'slot';
      if (i === HOTBAR_SIZE) this.gridEl.appendChild(Object.assign(document.createElement('div'), { className: 'inv-gap' }));
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const had = !!this.cursor;
        this.clickSlot(i, e.button === 2);
        // Si se cogió algo con el clic izquierdo, se puede arrastrar y soltar en otra casilla o fuera.
        this.dragFrom = !had && this.cursor && e.button === 0 ? i : null;
      });
      el.addEventListener('mouseenter', () => (this.hovered = i));
      el.addEventListener('mouseleave', () => {
        if (this.hovered === i) this.hovered = null;
      });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      itemCard().attach(el, () => this.inv.slots[i]?.id ?? null);
      this.gridEl.appendChild(el);
      this.invSlots.push(el);
    }
    this.inventoryEl.addEventListener('mousemove', (e) => {
      this.cursorEl.style.transform = `translate(${e.clientX - 22}px, ${e.clientY - 22}px)`;
    });
    // Clic fuera de la ventana con algo en la mano: se tira al suelo (izquierdo todo, derecho uno).
    this.inventoryEl.addEventListener('mousedown', (e) => {
      if (!this.cursor || this.insidePanel(e.target)) return;
      e.preventDefault();
      this.throwCursor(e.button === 2 ? 1 : this.cursor.count);
    });
    this.inventoryEl.addEventListener('contextmenu', (e) => e.preventDefault());
    // Soltar lo arrastrado: en otra casilla lo deja ahí; fuera de la ventana lo tira.
    window.addEventListener('mouseup', (e) => {
      const from = this.dragFrom;
      this.dragFrom = null;
      if (from === null || !this.cursor || this.inventoryEl.hidden || e.button !== 0) return;
      const over = document.elementFromPoint(e.clientX, e.clientY);
      const to = this.invSlots.findIndex((el) => el === over || el.contains(over));
      if (to >= 0 && to !== from) this.clickSlot(to, false);
      else if (to < 0 && !this.insidePanel(over)) this.throwCursor(this.cursor.count);
    });
    inv.onChange(() => this.render());
    this.render();
  }

  private icon(id: string): string {
    let url = this.icons.get(id);
    if (!url) {
      url = itemIcon(this.atlas, id);
      this.icons.set(id, url);
    }
    return url;
  }

  private paintSlot(el: HTMLElement, s: ItemStack | null, label?: string) {
    // El borde de la casilla, del color de la rareza (v4.10).
    el.classList.remove('rar-raro', 'rar-epico', 'rar-legendario');
    if (!s) {
      el.innerHTML = label ? `<span class="key">${label}</span>` : '';
      el.removeAttribute('aria-label');
      return;
    }
    const def = itemDef(s.id);
    const rarity = rarityFor(s.id, itemCard().islandFruit);
    if (rarity !== 'comun') el.classList.add(`rar-${rarity}`);
    let html = `<img alt="" src="${this.icon(s.id)}">`;
    if (label) html += `<span class="key">${label}</span>`;
    if (s.count > 1) html += `<span class="count">${s.count}</span>`;
    if (def.durability) {
      const left = 1 - (s.wear ?? 0) / def.durability;
      html += `<span class="wear"><i style="width:${Math.round(left * 100)}%" class="${left < 0.25 ? 'low' : ''}"></i></span>`;
    }
    el.innerHTML = html;
    el.setAttribute('aria-label', def.tool ? `${def.name}: ${TOOL_USE[def.tool].toLowerCase()}` : def.name);
  }

  render() {
    this.hotbarSlots.forEach((el, i) => {
      this.paintSlot(el, this.inv.slots[i], String((i + 1) % 10));
      el.classList.toggle('active', i === this.selected);
    });
    this.paintSlot(this.offhandEl, this.inv.offhand);
    this.offhandEl.title = this.inv.offhand ? `Otra mano: ${itemDef(this.inv.offhand.id).name}` : 'Otra mano (vacía)';
    if (!this.inventoryEl.hidden) {
      this.invSlots.forEach((el, i) => {
        const s = this.inv.slots[i];
        this.paintSlot(el, s);
        el.classList.toggle('dim', !!this.filter && !(s && matchesFilter(s.id, this.filter, itemCard().islandFruit)));
      });
      if (this.filtersEl) {
        const ids = [...new Set(this.inv.slots.filter((s) => s).map((s) => s!.id))];
        if (this.filter && !ids.some((id) => matchesFilter(id, this.filter, itemCard().islandFruit))) this.filter = null;
        renderFilters(this.filtersEl, ids, this.filter, (f) => {
          this.filter = f;
          this.render();
        }, itemCard().islandFruit);
      }
      this.paintSlot(this.cursorEl, this.cursor);
      this.renderRecipes();
    }
  }

  get selectedStack(): ItemStack | null {
    return this.inv.slots[this.selected];
  }

  select(i: number) {
    this.selected = (i + HOTBAR_SIZE) % HOTBAR_SIZE;
    this.render();
    const s = this.selectedStack;
    const def = s ? itemDef(s.id) : null;
    this.nameEl.textContent = def ? def.name : 'Mano vacía';
    // Las herramientas dicen para qué sirven, así no hay que adivinarlo por el dibujo.
    if (def?.tool) {
      const use = document.createElement('small');
      use.textContent = TOOL_USE[def.tool];
      this.nameEl.append(use);
    }
    this.nameEl.classList.add('show');
    clearTimeout(this.nameTimer);
    this.nameTimer = window.setTimeout(() => this.nameEl.classList.remove('show'), def?.tool ? 2000 : 1200);
  }

  /** Pasa lo de la casilla elegida a la otra mano, y lo de la otra mano a la casilla. */
  swapHands() {
    this.inv.swapOffhand(this.selected);
    const s = this.inv.offhand;
    this.nameEl.textContent = s ? `Otra mano: ${itemDef(s.id).name}` : 'Otra mano vacía';
    this.nameEl.classList.add('show');
    clearTimeout(this.nameTimer);
    this.nameTimer = window.setTimeout(() => this.nameEl.classList.remove('show'), 1200);
  }

  /** Enseña un aviso (v3.4: se apilan sin taparse y los repetidos se cuentan). */
  toast(text: string) {
    this.notices.show(text);
  }

  /** 0..1 del bloque que se está rompiendo; null lo oculta. */
  setProgress(p: number | null) {
    this.progressEl.hidden = p === null;
    if (p !== null) this.progressEl.style.setProperty('--p', `${Math.round(p * 360)}deg`);
  }

  // --- Pantalla de bolsillos ---

  openInventory() {
    this.inventoryEl.hidden = false;
    this.render();
  }

  closeInventory() {
    if (this.cursor) {
      const left = this.inv.add(this.cursor.id, this.cursor.count);
      // Lo que no quepa vuelve a la mano: no se pierde nada, porque add solo deja lo que sobra.
      this.cursor = left > 0 ? { ...this.cursor, count: left } : null;
      if (this.cursor) return; // no se cierra hasta soltarlo
    }
    this.inventoryEl.hidden = true;
    itemCard().hide();
  }

  private insidePanel(t: EventTarget | null): boolean {
    return t instanceof Element && !!t.closest('.inv-panel');
  }

  /** Tira `n` de lo que se lleva con el ratón. */
  private throwCursor(n: number) {
    const c = this.cursor;
    if (!c || !this.onThrow) return;
    const k = Math.min(n, c.count);
    this.onThrow({ ...c, count: k });
    c.count -= k;
    if (c.count <= 0) this.cursor = null;
    this.render();
  }

  /**
   * La tecla de tirar (v5.0.1): con los bolsillos abiertos tira lo que hay bajo el ratón; jugando, lo de la mano.
   * `all` tira el montón entero (con Ctrl), si no, de uno en uno. Devuelve false si no había nada.
   */
  throwKey(all: boolean): boolean {
    const i = this.inventoryEl.hidden ? this.selected : this.hovered;
    if (i === null || !this.onThrow) return false;
    const s = this.inv.slots[i];
    if (!s) return false;
    const n = all ? s.count : 1;
    this.onThrow({ ...s, count: n });
    s.count -= n;
    if (s.count <= 0) this.inv.slots[i] = null;
    this.inv.changed();
    return true;
  }

  /** Clic izquierdo coge o suelta el montón; clic derecho coge la mitad o suelta uno. */
  private clickSlot(i: number, half: boolean) {
    this.cursor = clickStack(this.inv.slots, i, this.cursor, half);
    this.inv.changed();
  }

  private renderRecipes() {
    this.recipes.render();
  }

  private recipeRow(r: Recipe): HTMLLIElement {
    const li = document.createElement('li');
    const needs = r.needs.map(([id, n]) => `${n} ${itemDef(id).name.toLowerCase()}`).join(' + ');
    li.innerHTML = `<img alt="" src="${this.icon(r.result)}"><div><b>${itemDef(r.result).name}${r.count > 1 ? ` ×${r.count}` : ''}</b><small>${needs}</small></div>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Fabricar';
    btn.disabled = !this.inv.canCraft(r);
    btn.addEventListener('click', () => {
      if (this.inv.craft(r)) this.toast(`Has fabricado: ${itemDef(r.result).name.toLowerCase()}`);
    });
    li.appendChild(btn);
    itemCard().attach(li, () => r.result);
    return li;
  }
}
