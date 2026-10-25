import { CATEGORIES, type CategoryId, categoryOf, normalize } from './categories';
import { type Recipe, itemDef } from './items';

type Tab = CategoryId | 'todo' | 'favoritas';

const FAVORITES_KEY = 'maxycraft-favoritas';

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Recetas marcadas con estrella: salen las primeras en los bolsillos y en la mesa de trabajo. */
const favorites = loadFavorites();

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch {
    // Sin guardar: valen para esta partida.
  }
}

export interface RecipeBrowserOptions {
  /** Prefijo de los id de los controles, para que no se repitan entre listas. */
  id: string;
  recipes: () => Recipe[];
  canCraft: (r: Recipe) => boolean;
  /** Fila de la lista para una receta; el buscador le añade la estrella de favorita. */
  row: (r: Recipe) => HTMLLIElement;
}

/**
 * Lista de recetas con pestañas por grupo, buscador, favoritas y "solo lo que puedo fabricar",
 * para que con muchos bloques nuevos la lista no abrume.
 */
export class RecipeBrowser {
  private tab: Tab = 'todo';
  private query = '';
  private onlyCraftable = false;
  private tabsEl: HTMLDivElement;
  private searchEl: HTMLInputElement;
  private craftableEl: HTMLInputElement;

  constructor(private list: HTMLUListElement, private opts: RecipeBrowserOptions) {
    const bar = document.createElement('div');
    bar.className = 'recipe-bar';
    bar.innerHTML = `
      <input type="search" id="${opts.id}-buscar" placeholder="Buscar…" aria-label="Buscar recetas" autocomplete="off">
      <label class="recipe-only"><input type="checkbox" id="${opts.id}-puedo"> Solo lo que puedo fabricar</label>
      <div class="recipe-tabs" role="tablist" aria-label="Grupos de recetas"></div>`;
    list.before(bar);
    this.tabsEl = bar.querySelector('.recipe-tabs')!;
    this.searchEl = bar.querySelector('input[type=search]')!;
    this.craftableEl = bar.querySelector('input[type=checkbox]')!;
    this.searchEl.addEventListener('input', () => {
      this.query = normalize(this.searchEl.value.trim());
      this.render();
    });
    this.craftableEl.addEventListener('change', () => {
      this.onlyCraftable = this.craftableEl.checked;
      this.render();
    });
  }

  /** Recetas que se ven con los filtros de ahora. */
  visible(): Recipe[] {
    return this.opts
      .recipes()
      .filter((r) => {
        if (this.tab === 'favoritas' && !favorites.has(r.result)) return false;
        if (this.tab !== 'todo' && this.tab !== 'favoritas' && categoryOf(r.result) !== this.tab) return false;
        if (this.onlyCraftable && !this.opts.canCraft(r)) return false;
        if (this.query && !normalize(itemDef(r.result).name).includes(this.query)) return false;
        return true;
      })
      .sort((a, b) => Number(favorites.has(b.result)) - Number(favorites.has(a.result)));
  }

  render() {
    this.renderTabs();
    this.list.innerHTML = '';
    const shown = this.visible();
    for (const r of shown) {
      const li = this.opts.row(r);
      const star = document.createElement('button');
      const fav = favorites.has(r.result);
      star.type = 'button';
      star.className = `fav${fav ? ' on' : ''}`;
      star.textContent = fav ? '★' : '☆';
      star.setAttribute('aria-label', fav ? 'Quitar de favoritas' : 'Marcar como favorita');
      star.setAttribute('aria-pressed', String(fav));
      star.addEventListener('click', () => {
        if (favorites.has(r.result)) favorites.delete(r.result);
        else favorites.add(r.result);
        saveFavorites();
        this.render();
      });
      li.prepend(star);
      li.classList.add('with-fav');
      this.list.appendChild(li);
    }
    if (!shown.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = this.query ? 'No hay recetas con ese nombre.' : this.tab === 'favoritas' ? 'Marca recetas con la estrella para tenerlas aquí.' : 'Nada que fabricar aquí todavía.';
      this.list.appendChild(li);
    }
  }

  /** Pestañas: Todo, Favoritas y solo los grupos que tienen alguna receta. */
  private renderTabs() {
    const all = this.opts.recipes();
    const groups = CATEGORIES.filter((c) => all.some((r) => categoryOf(r.result) === c.id));
    const tabs: { id: Tab; name: string }[] = [{ id: 'todo', name: 'Todo' }, { id: 'favoritas', name: '★ Favoritas' }, ...groups];
    if (!tabs.some((t) => t.id === this.tab)) this.tab = 'todo';
    this.tabsEl.innerHTML = '';
    for (const t of tabs) {
      const b = document.createElement('button');
      b.type = 'button';
      b.role = 'tab';
      b.textContent = t.name;
      b.setAttribute('aria-selected', String(t.id === this.tab));
      b.addEventListener('click', () => {
        this.tab = t.id;
        this.render();
      });
      this.tabsEl.appendChild(b);
    }
  }
}
