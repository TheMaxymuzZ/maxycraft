import { CREATURE_TILE_START, tileCanvas } from './blocks';
import { CREATURES, HABITAT_TEXT, hoursText } from './creatures';
import type { Inventory } from './inventory';

/** Enciclopedia de peces e insectos y lo donado al museo. */
export class Collection {
  readonly caught: Set<string>;
  readonly donated: Set<string>;
  readonly el = document.querySelector<HTMLDivElement>('#collection')!;
  private summaryEl = document.querySelector<HTMLParagraphElement>('#collection-summary')!;
  private fishEl = document.querySelector<HTMLDivElement>('#collection-fish')!;
  private bugsEl = document.querySelector<HTMLDivElement>('#collection-bugs')!;
  private icons: string[];

  constructor(caught: string[], donated: string[], atlas: HTMLCanvasElement) {
    this.caught = new Set(caught);
    this.donated = new Set(donated);
    this.icons = CREATURES.map((_, i) => tileCanvas(atlas, CREATURE_TILE_START + i).toDataURL());
  }

  /** Apunta una captura; devuelve true si es la primera vez. */
  register(id: string): boolean {
    if (this.caught.has(id)) return false;
    this.caught.add(id);
    return true;
  }

  /** Ids de los bolsillos que el museo aún no tiene (uno de cada). */
  donatable(inv: Inventory): string[] {
    return CREATURES.filter((c) => !this.donated.has(c.id) && inv.countOf(c.id) > 0).map((c) => c.id);
  }

  donate(inv: Inventory, id: string): boolean {
    if (this.donated.has(id) || !inv.remove(id, 1)) return false;
    this.donated.add(id);
    this.caught.add(id);
    return true;
  }

  open() {
    this.el.hidden = false;
    this.render();
  }

  close() {
    this.el.hidden = true;
  }

  private render() {
    const fish = CREATURES.filter((c) => c.kind === 'pez');
    const bugs = CREATURES.filter((c) => c.kind === 'bicho');
    const count = (list: typeof CREATURES) => list.filter((c) => this.caught.has(c.id)).length;
    this.summaryEl.textContent =
      `Peces ${count(fish)} de ${fish.length} · Insectos ${count(bugs)} de ${bugs.length} · ` +
      `En el museo ${this.donated.size} de ${CREATURES.length}`;

    const fill = (el: HTMLElement, list: typeof CREATURES) => {
      el.innerHTML = '';
      for (const c of list) {
        const known = this.caught.has(c.id);
        const card = document.createElement('div');
        card.className = `card${known ? '' : ' unknown'}`;
        const where = known ? `${HABITAT_TEXT[c.habitat]}, ${hoursText(c)}` : 'Aún no lo has visto';
        const badge = this.donated.has(c.id) ? '<span class="badge">En el museo</span>' : '';
        card.innerHTML = `<img alt="" src="${this.icons[CREATURES.indexOf(c)]}"><b>${known ? c.name : '???'}</b><small>${where}</small>${badge}`;
        el.appendChild(card);
      }
    };
    fill(this.fishEl, fish);
    fill(this.bugsEl, bugs);
  }
}
