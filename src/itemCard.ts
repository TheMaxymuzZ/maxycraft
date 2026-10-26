// Fichas de objetos (v4.10). Al pasar el ratón por un objeto (o al mantenerlo pulsado en el móvil) sale su ficha:
// el nombre en el color de su rareza, etiquetas de tipo y rareza, lo que hace (daño, usos, comida, luz),
// lo que vale, dónde se consigue y una curiosidad. Sale en los bolsillos, los cofres, las tiendas y la mesa de trabajo.

import { LIGHT_RADIUS } from './blocks';
import { HABITAT_TEXT, creature, hoursText, monthsText } from './creatures';
import { CATALOG, DIY_RECIPES, ITEM_KINDS, ITEMS, RARITIES, RECIPES, type Rarity, TOOL_USE, isTreeFruit, itemDef } from './items';
import { LORE } from './lore';
import { FOOD } from './vitals';

/** Icono pequeño de cada tipo de objeto, para las etiquetas. */
export const KIND_ICONS: Record<string, string> = {
  bloque: '🧱', recurso: '🪵', consumible: '🍎', mueble: '🪑', herramienta: '🛠️', arma: '⚔️', ropa: '👕', criatura: '🐟', tesoro: '💎', especial: '✨',
};

/** Lo raro que es un objeto en tu isla: la fruta que no es de tu isla es rara (como en Animal Crossing). */
export function rarityFor(id: string, islandFruit?: string): Rarity {
  if (islandFruit && isTreeFruit(id) && id !== islandFruit) return 'raro';
  return itemDef(id).rarity;
}

/** Dónde se consigue. */
export function sourceOf(id: string): string {
  const def = itemDef(id);
  const c = creature(id);
  if (c) return `${c.kind === 'pez' ? 'Se pesca' : 'Se caza con la red'} ${HABITAT_TEXT[c.habitat]}, ${monthsText(c)}, ${hoursText(c)}`;
  const ways: string[] = [];
  if (isTreeFruit(id) || id === 'coco') ways.push('se coge de los árboles');
  if (CATALOG.includes(id)) ways.push(def.holiday ? 'se vende en la tienda en su fiesta' : 'se compra en la tienda');
  if (DIY_RECIPES.some((r) => r.result === id)) ways.push('se fabrica en la mesa de trabajo');
  if (RECIPES.some((r) => r.result === id)) ways.push('se fabrica con lo que llevas');
  if (['concha', 'caracola', 'estrella', 'botella'].includes(id)) ways.push('aparece en la playa');
  if (id === 'rama') ways.push('cae de los árboles al moverlos');
  if (['pepita_hierro', 'pepita_oro', 'amatista', 'carbon'].includes(id)) ways.push('sale de las rocas con el pico');
  if (['huevo', 'leche'].includes(id)) ways.push('te lo dan los animales de tu granja');
  if (['trigo', 'zanahoria', 'tomate'].includes(id)) ways.push('crece en el huerto');
  if (def.block !== undefined && !ways.length) ways.push('se recoge rompiendo el bloque');
  if (!ways.length) return '';
  const text = ways.join(', ');
  return text[0].toUpperCase() + text.slice(1);
}

/** Datos de la ficha según el tipo de objeto: [nombre, valor]. */
export function itemFacts(id: string): [string, string][] {
  const def = itemDef(id);
  const out: [string, string][] = [];
  if (def.tool) out.push(['Sirve para', TOOL_USE[def.tool]]);
  if (def.durability) out.push(['Usos', `${def.durability}`]);
  if (def.power) out.push(['Rapidez', `rompe ${def.power} veces más rápido`]);
  if (def.damage) out.push(['Daño', `${def.damage}`]);
  if (FOOD[id]) out.push(['Al comerlo', `llena ${(FOOD[id] / 2).toLocaleString('es')} ${FOOD[id] === 2 ? 'muslito' : 'muslitos'}`]);
  const light = def.block !== undefined ? LIGHT_RADIUS[def.block] : 0;
  if (light) out.push(['Luz', `alumbra ${light} bloques a la redonda`]);
  if (def.sell > 0) out.push(['La tienda paga', `unas ${def.sell} bayas`]);
  if (def.buy !== undefined) out.push(['Cuesta', `${def.buy} bayas`]);
  return out;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** El HTML de la ficha. */
export function itemCardHtml(id: string, islandFruit?: string): string {
  const def = itemDef(id);
  const rarity = rarityFor(id, islandFruit);
  const facts = itemFacts(id).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const source = sourceOf(id);
  const lore = def.lore ?? LORE[id];
  return `<b class="ic-name rar-${rarity}">${esc(def.name)}</b>`
    + `<p class="ic-tags"><span class="ic-tag">${KIND_ICONS[def.kind] ?? ''} ${ITEM_KINDS[def.kind]}</span><span class="ic-tag rar-${rarity}">${RARITIES[rarity]}</span></p>`
    + (facts ? `<dl>${facts}</dl>` : '')
    + (source ? `<p class="ic-source">${esc(source)}</p>` : '')
    + (lore ? `<p class="ic-lore">${esc(lore)}</p>` : '');
}

/** Todos los objetos tienen su curiosidad (lo comprueban las pruebas). */
export function missingLore(): string[] {
  return ITEMS.filter((d) => !(d.lore ?? LORE[d.id])).map((d) => d.id);
}

/** Un filtro por tipo o por rareza: "kind:mueble", "rar:epico" o null para todo. */
export type ItemFilter = string | null;

/** Si un objeto pasa el filtro. */
export function matchesFilter(id: string, filter: ItemFilter, islandFruit?: string): boolean {
  if (!filter) return true;
  const [what, value] = filter.split(':');
  return what === 'kind' ? itemDef(id).kind === value : rarityFor(id, islandFruit) === value;
}

/** Botones de filtro (Todo, los tipos y las rarezas que haya entre `ids`). */
export function renderFilters(el: HTMLElement, ids: string[], current: ItemFilter, onPick: (f: ItemFilter) => void, islandFruit?: string, kinds = true) {
  el.innerHTML = '';
  const options: [ItemFilter, string][] = [];
  if (kinds) {
    for (const k of Object.keys(ITEM_KINDS)) if (ids.some((id) => itemDef(id).kind === k)) options.push([`kind:${k}`, `${KIND_ICONS[k]} ${ITEM_KINDS[k as keyof typeof ITEM_KINDS]}`]);
  }
  for (const r of Object.keys(RARITIES) as Rarity[]) if (ids.some((id) => rarityFor(id, islandFruit) === r)) options.push([`rar:${r}`, RARITIES[r]]);
  if (options.length < 2) return;
  for (const [f, label] of [[null, 'Todo'] as [ItemFilter, string], ...options]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (f?.startsWith('rar:')) b.className = f.replace(':', '-');
    b.setAttribute('aria-pressed', String(current === f));
    b.addEventListener('click', () => onPick(f));
    el.appendChild(b);
  }
}

/** Tiempo pulsando en el móvil para ver la ficha. */
const LONG_PRESS = 450;

/**
 * La ficha flotante: una sola para todo el juego. `attach` la engancha a un elemento; `getId` dice qué objeto
 * hay en él en ese momento (o null si está vacío).
 */
export class ItemCard {
  readonly el = document.createElement('div');
  private press = 0;

  /** La fruta de la isla, para decir qué fruta es rara aquí. */
  islandFruit?: string;

  constructor() {
    this.el.id = 'item-card';
    this.el.setAttribute('role', 'tooltip');
    this.el.hidden = true;
    document.body.appendChild(this.el);
  }

  attach(target: HTMLElement, getId: () => string | null) {
    target.addEventListener('mouseenter', (e) => this.showFor(getId(), e.clientX, e.clientY));
    target.addEventListener('mousemove', (e) => this.move(e.clientX, e.clientY));
    target.addEventListener('mouseleave', () => this.hide());
    target.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      clearTimeout(this.press);
      this.press = window.setTimeout(() => this.showFor(getId(), t.clientX, t.clientY - 40), LONG_PRESS);
    }, { passive: true });
    for (const ev of ['touchend', 'touchcancel', 'touchmove'] as const) {
      target.addEventListener(ev, () => {
        clearTimeout(this.press);
        if (ev !== 'touchmove') window.setTimeout(() => this.hide(), 1500);
      }, { passive: true });
    }
  }

  showFor(id: string | null, x: number, y: number) {
    if (!id) return this.hide();
    this.el.innerHTML = itemCardHtml(id, this.islandFruit);
    this.el.hidden = false;
    this.move(x, y);
  }

  private move(x: number, y: number) {
    if (this.el.hidden) return;
    const w = this.el.offsetWidth || 260;
    const h = this.el.offsetHeight || 160;
    const left = Math.min(window.innerWidth - w - 8, x + 16);
    const top = y + 16 + h > window.innerHeight ? Math.max(8, y - h - 12) : y + 16;
    this.el.style.transform = `translate(${Math.max(8, left)}px, ${top}px)`;
  }

  hide() {
    this.el.hidden = true;
  }
}

let shared: ItemCard | null = null;

/** La ficha de todo el juego (se crea la primera vez que se usa). */
export function itemCard(): ItemCard {
  return (shared ??= new ItemCard());
}
