import { tileCanvas } from './blocks';
import type { Inventory } from './inventory';
import { DIY_RECIPES, type Recipe, STARTER_DIY, itemDef } from './items';

export interface WorkbenchContext {
  inventory: Inventory;
  atlas: HTMLCanvasElement;
  toast: (text: string) => void;
}

/** La mesa de trabajo: fabrica lo que salga de las recetas aprendidas. */
export class Workbench {
  readonly el = document.querySelector<HTMLDivElement>('#workbench')!;
  private listEl = document.querySelector<HTMLUListElement>('#workbench-list')!;
  private countEl = document.querySelector<HTMLParagraphElement>('#workbench-count')!;
  readonly known: Set<string>;

  constructor(private ctx: WorkbenchContext, known: string[] | undefined) {
    // Las recetas básicas nuevas (como las puertas) se saben también en las partidas antiguas.
    this.known = new Set([...(known ?? []), ...STARTER_DIY]);
    ctx.inventory.onChange(() => {
      if (!this.el.hidden) this.render();
    });
  }

  /** Aprende una receta al azar de las que faltan. Devuelve su nombre, o null si ya se sabían todas. */
  learnRandom(): string | null {
    const unknown = DIY_RECIPES.filter((r) => !this.known.has(r.result));
    if (!unknown.length) return null;
    const r = unknown[Math.floor(Math.random() * unknown.length)];
    this.known.add(r.result);
    return itemDef(r.result).name;
  }

  open() {
    this.el.hidden = false;
    this.render();
  }

  close() {
    this.el.hidden = true;
  }

  private render() {
    const recipes = DIY_RECIPES.filter((r) => this.known.has(r.result));
    this.countEl.textContent = `Recetas aprendidas: ${recipes.length} de ${DIY_RECIPES.length}`;
    this.listEl.innerHTML = '';
    for (const r of recipes) this.listEl.appendChild(this.row(r));
  }

  private row(r: Recipe): HTMLLIElement {
    const inv = this.ctx.inventory;
    const li = document.createElement('li');
    const needs = r.needs
      .map(([id, n]) => {
        const have = inv.countOf(id);
        return `<span class="${have >= n ? '' : 'missing'}">${n} ${itemDef(id).name.toLowerCase()} (${have})</span>`;
      })
      .join(' + ');
    const icon = tileCanvas(this.ctx.atlas, itemDef(r.result).tile).toDataURL();
    li.innerHTML = `<img alt="" src="${icon}"><div><b>${itemDef(r.result).name}${r.count > 1 ? ` ×${r.count}` : ''}</b><small>${needs}</small></div><span class="actions"></span>`;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Fabricar';
    b.disabled = !inv.canCraft(r);
    b.addEventListener('click', () => {
      if (inv.craft(r)) this.ctx.toast(`Has fabricado: ${itemDef(r.result).name.toLowerCase()}`);
    });
    li.querySelector('.actions')!.appendChild(b);
    return li;
  }
}
