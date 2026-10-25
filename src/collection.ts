import { CREATURE_TILE_START, tileCanvas } from './blocks';
import { CREATURES, HABITAT_TEXT, hoursText, monthsText } from './creatures';
import type { Inventory } from './inventory';
import type { ModelSpec } from './villagerModel';
import { ALL_PROFILES, PERSONALITY_NAMES, SPECIES_NAMES } from './villagers';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Enciclopedia de peces e insectos y lo donado al museo. */
export class Collection {
  readonly caught: Set<string>;
  readonly donated: Set<string>;
  readonly el = document.querySelector<HTMLDivElement>('#collection')!;
  private summaryEl = document.querySelector<HTMLParagraphElement>('#collection-summary')!;
  private fishEl = document.querySelector<HTMLDivElement>('#collection-fish')!;
  private bugsEl = document.querySelector<HTMLDivElement>('#collection-bugs')!;
  private villagersEl = document.querySelector<HTMLDivElement>('#collection-villagers')!;
  /** Vecinos con los que ya se ha hablado, para el álbum. */
  readonly met: Set<string>;
  /** Dibuja el retrato de un vecino (lo pone main.ts, que tiene el renderer). */
  portrait: ((name: string, spec: ModelSpec) => string) | null = null;
  private icons: string[];

  constructor(caught: string[], donated: string[], atlas: HTMLCanvasElement, met: string[] = []) {
    this.met = new Set(met);
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
      `En el museo ${this.donated.size} de ${CREATURES.length} · Vecinos ${this.met.size} de ${ALL_PROFILES.length}`;

    const fill = (el: HTMLElement, list: typeof CREATURES) => {
      el.innerHTML = '';
      for (const c of list) {
        const known = this.caught.has(c.id);
        const card = document.createElement('div');
        card.className = `card${known ? '' : ' unknown'}`;
        const where = known ? `${HABITAT_TEXT[c.habitat]}, ${hoursText(c)}, ${monthsText(c)}` : 'Aún no lo has visto';
        const badge = this.donated.has(c.id) ? '<span class="badge">En el museo</span>' : '';
        card.innerHTML = `<img alt="" src="${this.icons[CREATURES.indexOf(c)]}"><b>${known ? c.name : '???'}</b><small>${where}</small>${badge}`;
        el.appendChild(card);
      }
    };
    fill(this.fishEl, fish);
    fill(this.bugsEl, bugs);
    this.renderVillagers();
  }

  /** Álbum de vecinos: ficha de cada personaje con el que has hablado; los demás salen en silueta. */
  private renderVillagers() {
    this.villagersEl.innerHTML = '';
    for (const p of ALL_PROFILES) {
      const known = this.met.has(p.name);
      const card = document.createElement('div');
      card.className = `card villager-card${known ? '' : ' unknown'}`;
      const img = this.portrait ? `<img alt="" src="${this.portrait(p.name, p)}">` : '';
      const info = known
        ? `${SPECIES_NAMES[p.species]} · ${PERSONALITY_NAMES[p.personality]}<br>Cumple: ${p.birthday[1]} ${MONTHS[p.birthday[0] - 1]} · Le gusta ${p.hobby}`
        : 'Aún no os conocéis';
      card.innerHTML = `${img}<b>${known ? p.name : '???'}</b><small>${info}</small>`;
      this.villagersEl.appendChild(card);
    }
  }
}
