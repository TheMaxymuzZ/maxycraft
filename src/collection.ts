import { type ItemFilter, itemCard, matchesFilter, renderFilters } from './itemCard';
import { creatureTile } from './blocks';
import { CREATURES, HABITAT_TEXT, hoursText, monthsText } from './creatures';
import type { Inventory } from './inventory';
import { itemDef } from './items';
import type { ModelSpec } from './villagerModel';
import { ALL_PROFILES, PERSONALITY_NAMES, type Profile, SPECIES_NAMES } from './villagers';
import { KNOW, seasonOfBirthday } from './dialog';
import { FRIEND_LEVELS, STYLE_NAMES, decorTaste, friendLevel } from './decor';
import { tileIcon } from './icons';

/** Lo que pone la ficha del álbum según lo que te ha contado el vecino. */
export function albumInfo(p: Profile, known: number, friendship?: number): string {
  const birthday = known >= KNOW.birthday ? `${p.birthday[1]} ${MONTHS[p.birthday[0] - 1]}`
    : known >= KNOW.birthdaySeason ? `en ${seasonOfBirthday(p.birthday[0])}` : '???';
  const hobby = known >= KNOW.hobby ? p.hobby : '???';
  const likes = known >= KNOW.likes ? LIKES_SHORT[p.likes] : known >= KNOW.likesHint ? 'tienes una pista…' : '???';
  // Desde la v4.12: nivel de amistad y estilo de decoración (que se sabe a la vez que sus regalos favoritos).
  const friends = friendship === undefined || p.role ? '' : `<br>Amistad: ${FRIEND_LEVELS[friendLevel(friendship)].name} · Estilo: ${known >= KNOW.likes ? STYLE_NAMES[decorTaste(p)] : '???'}`;
  return `${SPECIES_NAMES[p.species]} · ${PERSONALITY_NAMES[p.personality]}<br>Cumple: ${birthday} · Afición: ${hobby}<br>Regalos: ${likes}${friends}`;
}

const LIKES_SHORT: Record<Profile['likes'], string> = { fruta: 'fruta', conchas: 'conchas', flores: 'flores', madera: 'madera' };

/** "45 cm" o "2,3 m". */
export function sizeText(cm: number): string {
  return cm >= 100 ? `${(cm / 100).toFixed(1).replace('.', ',')} m` : `${cm} cm`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Enciclopedia de peces e insectos y lo donado al museo. */
export class Collection {
  readonly caught: Set<string>;
  readonly donated: Set<string>;
  readonly el = document.querySelector<HTMLDivElement>('#collection')!;
  private summaryEl = document.querySelector<HTMLParagraphElement>('#collection-summary')!;
  private fishEl = document.querySelector<HTMLDivElement>('#collection-fish')!;
  private bugsEl = document.querySelector<HTMLDivElement>('#collection-bugs')!;
  private fossilsEl = document.querySelector<HTMLDivElement>('#collection-fossils');
  private villagersEl = document.querySelector<HTMLDivElement>('#collection-villagers')!;
  /** Vecinos con los que ya se ha hablado, para el álbum. */
  readonly met: Set<string>;
  /** Lo que sabes de cada vecino (KNOW en dialog.ts): el álbum solo enseña lo que te han contado (v4.0). */
  readonly learned: Record<string, number>;
  /** Dibuja el retrato de un vecino (lo pone main.ts, que tiene el renderer). */
  portrait: ((name: string, spec: ModelSpec) => string) | null = null;
  /** Puntos de amistad con un vecino de la isla (v4.12), si vive aquí. */
  friendship: ((name: string) => number | undefined) | null = null;
  private icons: string[];
  /** El pez más grande de cada especie que has sacado, en centímetros (v4.23). */
  readonly records: Record<string, number>;

  constructor(caught: string[], donated: string[], atlas: HTMLCanvasElement, met: string[] = [], learned?: Record<string, number>, records?: Record<string, number>) {
    this.records = { ...(records ?? {}) };
    this.met = new Set(met);
    // En las partidas de antes de la v4.0 los vecinos que ya conocías te han dicho al menos cómo se llaman.
    this.learned = learned ? { ...learned } : Object.fromEntries(met.map((n) => [n, KNOW.met]));
    this.caught = new Set(caught);
    this.donated = new Set(donated);
    this.icons = CREATURES.map((_, i) => tileIcon(atlas, creatureTile(i)));
  }

  /** Apunta una captura; devuelve true si es la primera vez. */
  register(id: string): boolean {
    if (this.caught.has(id)) return false;
    this.caught.add(id);
    return true;
  }

  /** Apunta lo que mide un pez; devuelve true si es un récord nuevo (el primero de su especie no cuenta como récord). */
  measure(id: string, size: number): boolean {
    const best = this.records[id];
    if (best !== undefined && size <= best) return false;
    this.records[id] = size;
    return best !== undefined;
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
    itemCard().hide();
  }

  private filtersEl = document.querySelector<HTMLDivElement>('#collection-filters');
  private filter: ItemFilter = null;

  private render() {
    const fish = CREATURES.filter((c) => c.kind === 'pez');
    const bugs = CREATURES.filter((c) => c.kind === 'bicho');
    const fossils = CREATURES.filter((c) => c.kind === 'fosil');
    const count = (list: typeof CREATURES) => list.filter((c) => this.caught.has(c.id)).length;
    this.summaryEl.textContent =
      `Peces ${count(fish)} de ${fish.length} · Insectos ${count(bugs)} de ${bugs.length} · Fósiles ${count(fossils)} de ${fossils.length} · ` +
      `En el museo ${this.donated.size} de ${CREATURES.length} · Vecinos ${this.met.size} de ${ALL_PROFILES.length}`;

    // Filtro por rareza (v4.10): solo de lo que ya conoces, para no desvelar nada.
    const knownIds = CREATURES.filter((c) => this.caught.has(c.id)).map((c) => c.id);
    if (this.filtersEl) {
      renderFilters(this.filtersEl, knownIds, this.filter, (f) => {
        this.filter = f;
        this.render();
      }, undefined, false);
    }
    const fill = (el: HTMLElement, list: typeof CREATURES) => {
      el.innerHTML = '';
      for (const c of list) {
        const known = this.caught.has(c.id);
        if (this.filter && !(known && matchesFilter(c.id, this.filter))) continue;
        const card = document.createElement('div');
        const rarity = itemDef(c.id).rarity;
        card.className = `card${known ? ` rar-${rarity}` : ' unknown'}`;
        if (known) itemCard().attach(card, () => c.id);
        const where = !known ? 'Aún no lo has visto' : c.kind === 'fosil' ? 'Cavando tierra, arena o piedra' : `${HABITAT_TEXT[c.habitat]}, ${hoursText(c)}, ${monthsText(c)}`;
        const record = known && this.records[c.id] ? `<br>Récord: ${sizeText(this.records[c.id])}` : '';
        const badge = this.donated.has(c.id) ? '<span class="badge">En el museo</span>' : '';
        card.innerHTML = `<img alt="" src="${this.icons[CREATURES.indexOf(c)]}"><b>${known ? c.name : '???'}</b><small>${where}${record}</small>${badge}`;
        el.appendChild(card);
      }
    };
    fill(this.fishEl, fish);
    fill(this.bugsEl, bugs);
    if (this.fossilsEl) fill(this.fossilsEl, fossils);
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
      const info = known ? albumInfo(p, p.role ? KNOW.birthday : this.learned[p.name] ?? KNOW.met, this.friendship?.(p.name)) : 'Aún no os conocéis';
      card.innerHTML = `${img}<b>${known ? p.name : '???'}</b><small>${info}</small>`;
      this.villagersEl.appendChild(card);
    }
  }
}
