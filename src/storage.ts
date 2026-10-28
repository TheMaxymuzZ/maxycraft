import { itemCard, rarityFor } from './itemCard';
import { Block } from './blocks';
import { HOTBAR_SIZE, type Inventory } from './inventory';
import { type ItemStack, itemDef } from './items';
import { itemIcon } from './icons';

/** Muebles para guardar cosas y cuántas casillas tiene cada uno. */
export const CONTAINERS: Partial<Record<Block, { name: string; size: number }>> = {
  [Block.Crate]: { name: 'Caja', size: 9 },
  [Block.Chest]: { name: 'Cofre', size: 18 },
  [Block.Trunk]: { name: 'Baúl', size: 27 },
};

export function isContainer(b: number): boolean {
  return CONTAINERS[b as Block] !== undefined;
}

type Slots = (ItemStack | null)[];

/**
 * Mete un montón en unas casillas: primero completa montones iguales, luego usa huecos.
 * Las herramientas van enteras a un hueco para no perder lo gastadas que están.
 * Devuelve lo que no cupo, o null si cupo todo.
 */
export function putStack(slots: Slots, stack: ItemStack): ItemStack | null {
  const def = itemDef(stack.id);
  let left = stack.count;
  if (!def.durability) {
    for (const s of slots) {
      if (left === 0) break;
      if (s && s.id === stack.id && s.count < def.maxStack) {
        const n = Math.min(def.maxStack - s.count, left);
        s.count += n;
        left -= n;
      }
    }
  }
  for (let i = 0; i < slots.length && left > 0; i++) {
    if (slots[i]) continue;
    const n = Math.min(def.maxStack, left);
    slots[i] = { ...stack, count: n };
    left -= n;
  }
  return left > 0 ? { ...stack, count: left } : null;
}

/** Lo guardado en cofres, baúles y cajas de la isla: "x,y,z" → casillas. */
export type StorageSave = Record<string, Slots>;

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

export class Storage {
  private boxes = new Map<string, Slots>();

  constructor(saved: StorageSave = {}) {
    for (const [k, slots] of Object.entries(saved)) {
      if (!Array.isArray(slots)) continue;
      this.boxes.set(k, slots.map((s) => (s && typeof s.id === 'string' && s.count > 0 ? { ...s } : null)));
    }
  }

  /** Casillas del mueble en (x, y, z); se crean vacías la primera vez. */
  open(x: number, y: number, z: number, size: number): Slots {
    let slots = this.boxes.get(key(x, y, z));
    if (!slots) this.boxes.set(key(x, y, z), (slots = new Array(size).fill(null)));
    while (slots.length < size) slots.push(null);
    return slots;
  }

  /** Al romper el mueble: devuelve lo que tenía dentro y lo olvida. */
  empty(x: number, y: number, z: number): ItemStack[] {
    const slots = this.boxes.get(key(x, y, z)) ?? [];
    this.boxes.delete(key(x, y, z));
    return slots.filter((s): s is ItemStack => !!s);
  }

  /** Lleva los cofres a otro sitio (al mudar una parcela, v4.14): `to` da la casilla nueva o null si no se mueve. */
  relocate(to: (x: number, y: number, z: number) => [number, number, number] | null) {
    const moved: [string, Slots][] = [];
    for (const [k, slots] of this.boxes) {
      const dest = to(...(k.split(',').map(Number) as [number, number, number]));
      if (!dest) continue;
      this.boxes.delete(k);
      moved.push([key(...dest), slots]);
    }
    for (const [k, slots] of moved) this.boxes.set(k, slots);
  }

  serialize(): StorageSave {
    const out: StorageSave = {};
    for (const [k, slots] of this.boxes) if (slots.some(Boolean)) out[k] = slots.map((s) => (s ? { ...s } : null));
    return out;
  }
}

/**
 * Coge o suelta en una casilla, como en los bolsillos (v5.0.1): clic izquierdo el montón entero, derecho la mitad o uno.
 * Devuelve lo que queda en la mano.
 */
export function clickStack(slots: Slots, i: number, cursor: ItemStack | null, half: boolean): ItemStack | null {
  const s = slots[i];
  const c = cursor;
  if (!c) {
    if (!s) return null;
    if (half && s.count > 1) {
      const n = Math.ceil(s.count / 2);
      s.count -= n;
      return { ...s, count: n };
    }
    slots[i] = null;
    return s;
  }
  if (!s) {
    if (half && c.count > 1) {
      slots[i] = { ...c, count: 1 };
      c.count--;
      return c;
    }
    slots[i] = c;
    return null;
  }
  if (s.id === c.id && !itemDef(s.id).durability) {
    const n = Math.min(itemDef(s.id).maxStack - s.count, half ? 1 : c.count);
    s.count += n;
    c.count -= n;
    return c.count > 0 ? c : null;
  }
  slots[i] = c;
  return s;
}

/**
 * Ventana de un cofre: sus casillas arriba y los bolsillos abajo.
 * v5.0.1: clic (o arrastrar) coge el montón y se suelta en la casilla que quieras; Mayús + clic lo pasa al otro lado de golpe.
 * En pantallas táctiles, tocar sigue pasándolo de golpe.
 */
export class StoragePanel {
  readonly el = document.querySelector<HTMLDivElement>('#storage')!;
  private titleEl = document.querySelector<HTMLHeadingElement>('#storage-title')!;
  private boxEl = document.querySelector<HTMLDivElement>('#storage-box')!;
  private pocketsEl = document.querySelector<HTMLDivElement>('#storage-pockets')!;
  private cursorEl = document.querySelector<HTMLDivElement>('#storage-cursor');
  private slots: Slots = [];
  private icons = new Map<string, string>();
  /** Lo que se lleva con el ratón y de dónde se empezó a arrastrar. */
  private cursor: ItemStack | null = null;
  private dragFrom: { box: boolean; i: number } | null = null;
  /** Tira al suelo lo que se suelta fuera de la ventana. */
  onThrow: ((s: ItemStack) => void) | null = null;
  private readonly touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  constructor(private inv: Inventory, private atlas: HTMLCanvasElement, private toast: (t: string) => void) {
    document.querySelector('#storage-put-all')!.addEventListener('click', () => this.putAll());
    document.querySelector('#storage-take-all')!.addEventListener('click', () => this.takeAll());
    inv.onChange(() => {
      if (!this.el.hidden) this.render();
    });
    this.el.addEventListener('mousemove', (e) => this.moveCursor(e.clientX, e.clientY));
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
    // Clic fuera de la ventana con algo en la mano: se tira al suelo.
    this.el.addEventListener('mousedown', (e) => {
      if (!this.cursor || this.inside(e.target)) return;
      e.preventDefault();
      this.throwCursor(e.button === 2 ? 1 : this.cursor.count);
    });
    window.addEventListener('mouseup', (e) => {
      const from = this.dragFrom;
      this.dragFrom = null;
      if (!from || !this.cursor || this.el.hidden || e.button !== 0) return;
      const over = document.elementFromPoint(e.clientX, e.clientY);
      const slot = over instanceof Element ? over.closest<HTMLElement>('.storage-grid .slot') : null;
      if (slot) {
        const box = slot.parentElement === this.boxEl;
        const i = Number(slot.dataset.i);
        if (box !== from.box || i !== from.i) this.clickAt(box, i, false);
      } else if (!this.inside(over)) this.throwCursor(this.cursor.count);
    });
  }

  open(name: string, slots: Slots) {
    this.slots = slots;
    this.titleEl.textContent = name;
    this.el.hidden = false;
    this.render();
  }

  close() {
    // Lo que se llevaba en la mano vuelve a los bolsillos, o al cofre, o al suelo: nunca se pierde.
    if (this.cursor) {
      let left: ItemStack | null = putStack(this.inv.slots, this.cursor);
      if (left) left = putStack(this.slots, left);
      if (left) this.onThrow?.(left);
      this.cursor = null;
      this.inv.changed();
    }
    this.el.hidden = true;
    itemCard().hide();
  }

  private inside(t: EventTarget | null): boolean {
    return t instanceof Element && !!t.closest('.storage-panel');
  }

  private moveCursor(x: number, y: number) {
    if (this.cursorEl) this.cursorEl.style.transform = `translate(${x - 22}px, ${y - 22}px)`;
  }

  private throwCursor(n: number) {
    const c = this.cursor;
    if (!c || !this.onThrow) return;
    const k = Math.min(n, c.count);
    this.onThrow({ ...c, count: k });
    c.count -= k;
    if (c.count <= 0) this.cursor = null;
    this.render();
  }

  private clickAt(box: boolean, i: number, half: boolean) {
    this.cursor = clickStack(box ? this.slots : this.inv.slots, i, this.cursor, half);
    this.inv.changed();
    this.render();
  }

  /** Del cofre a los bolsillos. */
  private take(i: number) {
    const s = this.slots[i];
    if (!s) return;
    this.slots[i] = putStack(this.inv.slots, s);
    if (this.slots[i]) this.toast('No te cabe todo en los bolsillos');
    this.inv.changed();
  }

  /** De los bolsillos al cofre. */
  private put(i: number) {
    const s = this.inv.slots[i];
    if (!s) return;
    this.inv.slots[i] = putStack(this.slots, s);
    if (this.inv.slots[i]) this.toast('El cofre está lleno');
    this.inv.changed();
  }

  /** Guarda toda la mochila (la barra rápida se queda como está). */
  putAll() {
    for (let i = HOTBAR_SIZE; i < this.inv.slots.length; i++) if (this.inv.slots[i]) this.inv.slots[i] = putStack(this.slots, this.inv.slots[i]!);
    this.inv.changed();
  }

  takeAll() {
    for (let i = 0; i < this.slots.length; i++) if (this.slots[i]) this.slots[i] = putStack(this.inv.slots, this.slots[i]!);
    this.inv.changed();
  }

  private icon(id: string): string {
    let url = this.icons.get(id);
    if (!url) this.icons.set(id, (url = itemIcon(this.atlas, id)));
    return url;
  }

  private slotHtml(s: ItemStack): string {
    return `<img alt="" src="${this.icon(s.id)}">${s.count > 1 ? `<span class="count">${s.count}</span>` : ''}`;
  }

  private grid(el: HTMLElement, slots: Slots, box: boolean, gapAfter?: number) {
    el.innerHTML = '';
    slots.forEach((s, i) => {
      if (gapAfter !== undefined && i === gapAfter) el.appendChild(Object.assign(document.createElement('div'), { className: 'inv-gap' }));
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.dataset.i = String(i);
      if (s) {
        const def = itemDef(s.id);
        b.innerHTML = this.slotHtml(s);
        const rarity = rarityFor(s.id, itemCard().islandFruit);
        if (rarity !== 'comun') b.classList.add(`rar-${rarity}`);
        b.setAttribute('aria-label', `${def.name}${s.count > 1 ? `, ${s.count}` : ''}`);
      } else b.setAttribute('aria-label', 'Casilla vacía');
      b.addEventListener('mousedown', (e) => {
        if (this.touch && !this.cursor) return; // en táctil, tocar lo pasa de golpe (click)
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey && !this.cursor) {
          if (box) this.take(i);
          else this.put(i);
          return;
        }
        const had = !!this.cursor;
        this.clickAt(box, i, e.button === 2);
        this.dragFrom = !had && this.cursor && e.button === 0 ? { box, i } : null;
      });
      b.addEventListener('click', () => {
        if (!this.touch || this.cursor) return;
        if (box) this.take(i);
        else this.put(i);
      });
      itemCard().attach(b, () => s?.id ?? null);
      el.appendChild(b);
    });
  }

  render() {
    itemCard().hide();
    this.grid(this.boxEl, this.slots, true);
    this.grid(this.pocketsEl, this.inv.slots, false, HOTBAR_SIZE);
    if (this.cursorEl) {
      this.cursorEl.innerHTML = this.cursor ? this.slotHtml(this.cursor) : '';
      this.cursorEl.hidden = !this.cursor;
    }
  }
}
