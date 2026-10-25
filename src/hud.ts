import { HOTBAR_SIZE, INVENTORY_SIZE, type Inventory } from './inventory';
import { type ItemStack, RECIPES, type Recipe, TOOL_USE, itemDef } from './items';
import { RecipeBrowser } from './recipeBrowser';
import { itemIcon } from './icons';
import { Notices } from './notices';

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

  private hotbarEl = document.querySelector<HTMLDivElement>('#hotbar')!;
  private nameEl = document.querySelector<HTMLDivElement>('#block-name')!;
  readonly notices = new Notices(document.querySelector<HTMLDivElement>('#toasts')!);
  private progressEl = document.querySelector<HTMLDivElement>('#break-progress')!;
  readonly inventoryEl = document.querySelector<HTMLDivElement>('#inventory')!;
  private gridEl = document.querySelector<HTMLDivElement>('#inv-grid')!;
  private recipesEl = document.querySelector<HTMLUListElement>('#recipes')!;
  private cursorEl = document.querySelector<HTMLDivElement>('#cursor-stack')!;
  private recipes: RecipeBrowser;

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
      this.hotbarEl.appendChild(el);
      this.hotbarSlots.push(el);
    }
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'slot';
      if (i === HOTBAR_SIZE) this.gridEl.appendChild(Object.assign(document.createElement('div'), { className: 'inv-gap' }));
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.clickSlot(i, e.button === 2);
      });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      this.gridEl.appendChild(el);
      this.invSlots.push(el);
    }
    this.inventoryEl.addEventListener('mousemove', (e) => {
      this.cursorEl.style.transform = `translate(${e.clientX - 22}px, ${e.clientY - 22}px)`;
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
    if (!s) {
      el.innerHTML = label ? `<span class="key">${label}</span>` : '';
      el.title = '';
      return;
    }
    const def = itemDef(s.id);
    let html = `<img alt="" src="${this.icon(s.id)}">`;
    if (label) html += `<span class="key">${label}</span>`;
    if (s.count > 1) html += `<span class="count">${s.count}</span>`;
    if (def.durability) {
      const left = 1 - (s.wear ?? 0) / def.durability;
      html += `<span class="wear"><i style="width:${Math.round(left * 100)}%" class="${left < 0.25 ? 'low' : ''}"></i></span>`;
    }
    el.innerHTML = html;
    el.title = def.tool ? `${def.name}: ${TOOL_USE[def.tool].toLowerCase()}` : def.name;
  }

  render() {
    this.hotbarSlots.forEach((el, i) => {
      this.paintSlot(el, this.inv.slots[i], String((i + 1) % 10));
      el.classList.toggle('active', i === this.selected);
    });
    this.paintSlot(this.offhandEl, this.inv.offhand);
    this.offhandEl.title = this.inv.offhand ? `Otra mano: ${itemDef(this.inv.offhand.id).name}` : 'Otra mano (vacía)';
    if (!this.inventoryEl.hidden) {
      this.invSlots.forEach((el, i) => this.paintSlot(el, this.inv.slots[i]));
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
  }

  /** Clic izquierdo coge o suelta el montón; clic derecho coge la mitad o suelta uno. */
  private clickSlot(i: number, half: boolean) {
    const slots = this.inv.slots;
    const s = slots[i];
    const c = this.cursor;
    if (!c) {
      if (!s) return;
      if (half && s.count > 1) {
        const n = Math.ceil(s.count / 2);
        this.cursor = { ...s, count: n };
        s.count -= n;
      } else {
        this.cursor = s;
        slots[i] = null;
      }
    } else if (!s) {
      if (half && c.count > 1) {
        slots[i] = { ...c, count: 1 };
        c.count--;
      } else {
        slots[i] = c;
        this.cursor = null;
      }
    } else if (s.id === c.id && !itemDef(s.id).durability) {
      const max = itemDef(s.id).maxStack;
      const n = Math.min(max - s.count, half ? 1 : c.count);
      s.count += n;
      c.count -= n;
      if (c.count === 0) this.cursor = null;
    } else {
      slots[i] = c;
      this.cursor = s;
    }
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
    return li;
  }
}
