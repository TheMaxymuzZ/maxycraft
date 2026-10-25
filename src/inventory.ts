import { compareItems } from './categories';
import { type ItemStack, type Recipe, itemDef } from './items';

export const HOTBAR_SIZE = 10;
export const BAG_SIZE = 20;
export const INVENTORY_SIZE = HOTBAR_SIZE + BAG_SIZE;

/** Los bolsillos: las 10 primeras casillas son la barra rápida. */
export class Inventory {
  slots: (ItemStack | null)[] = new Array(INVENTORY_SIZE).fill(null);
  /** La otra mano: lo que llevas además de lo de la barra rápida (por ejemplo, una antorcha para alumbrar). */
  offhand: ItemStack | null = null;
  private listeners: (() => void)[] = [];

  onChange(fn: () => void) {
    this.listeners.push(fn);
  }

  changed() {
    for (const fn of this.listeners) fn();
  }

  /** Mete objetos; devuelve cuántos no cupieron. Primero completa montones, luego usa huecos. */
  add(id: string, count = 1): number {
    const max = itemDef(id).maxStack;
    let left = count;
    for (const s of this.slots) {
      if (left === 0) break;
      if (s && s.id === id && s.count < max) {
        const n = Math.min(max - s.count, left);
        s.count += n;
        left -= n;
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (this.slots[i]) continue;
      const n = Math.min(max, left);
      this.slots[i] = { id, count: n };
      left -= n;
    }
    if (left !== count) this.changed();
    return left;
  }

  canFit(id: string, count = 1): boolean {
    const max = itemDef(id).maxStack;
    let room = 0;
    for (const s of this.slots) {
      if (!s) room += max;
      else if (s.id === id) room += max - s.count;
      if (room >= count) return true;
    }
    return false;
  }

  countOf(id: string): number {
    return this.slots.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0);
  }

  /** Quita objetos de cualquier casilla, empezando por la mochila. */
  remove(id: string, count: number): boolean {
    if (this.countOf(id) < count) return false;
    let left = count;
    for (let i = this.slots.length - 1; i >= 0 && left > 0; i--) {
      const s = this.slots[i];
      if (!s || s.id !== id) continue;
      const n = Math.min(s.count, left);
      s.count -= n;
      left -= n;
      if (s.count === 0) this.slots[i] = null;
    }
    this.changed();
    return true;
  }

  /** Gasta una unidad de la casilla indicada. */
  consume(slot: number) {
    const s = this.slots[slot];
    if (!s) return;
    s.count--;
    if (s.count <= 0) this.slots[slot] = null;
    this.changed();
  }

  /** Desgasta la herramienta de la casilla; devuelve true si se ha roto. */
  wearTool(slot: number): boolean {
    const s = this.slots[slot];
    if (!s) return false;
    const def = itemDef(s.id);
    if (!def.durability) return false;
    s.wear = (s.wear ?? 0) + 1;
    const broke = s.wear >= def.durability;
    if (broke) this.slots[slot] = null;
    this.changed();
    return broke;
  }

  canCraft(r: Recipe): boolean {
    return r.needs.every(([id, n]) => this.countOf(id) >= n) && this.canFit(r.result, r.count);
  }

  craft(r: Recipe): boolean {
    if (!this.canCraft(r)) return false;
    for (const [id, n] of r.needs) this.remove(id, n);
    this.add(r.result, r.count);
    return true;
  }

  /** Cambia de mano: lo de la casilla pasa a la otra mano y al revés. */
  swapOffhand(slot: number) {
    [this.offhand, this.slots[slot]] = [this.slots[slot], this.offhand];
    this.changed();
  }

  loadOffhand(s: ItemStack | null | undefined) {
    try {
      this.offhand = s && itemDef(s.id) ? { ...s } : null;
    } catch {
      this.offhand = null;
    }
    this.changed();
  }

  serialize(): (ItemStack | null)[] {
    return this.slots.map((s) => (s ? { ...s } : null));
  }

  /** Ordena la mochila por grupos (la barra rápida no se toca) y junta los montones repetidos. */
  sort() {
    const bag = this.slots.slice(HOTBAR_SIZE).filter((s): s is ItemStack => !!s);
    const merged: ItemStack[] = [];
    for (const s of bag) {
      const def = itemDef(s.id);
      let left = s.count;
      if (!def.durability) {
        for (const m of merged) {
          if (m.id !== s.id || m.count >= def.maxStack) continue;
          const n = Math.min(def.maxStack - m.count, left);
          m.count += n;
          left -= n;
        }
      }
      if (left > 0) merged.push({ ...s, count: left });
    }
    merged.sort((a, b) => compareItems(a.id, b.id) || b.count - a.count);
    for (let i = HOTBAR_SIZE; i < INVENTORY_SIZE; i++) this.slots[i] = merged[i - HOTBAR_SIZE] ?? null;
    this.changed();
  }

  load(slots: (ItemStack | null)[]) {
    this.slots = new Array(INVENTORY_SIZE).fill(null);
    slots.slice(0, INVENTORY_SIZE).forEach((s, i) => {
      try {
        if (s && itemDef(s.id)) this.slots[i] = { ...s };
      } catch {
        // objeto de una versión antigua que ya no existe
      }
    });
    this.changed();
  }
}

export function starterKit(inv: Inventory) {
  inv.slots[0] = { id: 'hacha', count: 1, wear: 0 };
  inv.slots[1] = { id: 'pala', count: 1, wear: 0 };
  inv.slots[2] = { id: 'pico', count: 1, wear: 0 };
  inv.changed();
}
