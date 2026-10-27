// El armario (v4.18): te cambias de ropa con lo que llevas en los bolsillos, te ves en el espejo dando vueltas y
// guardas hasta tres conjuntos. Se abre con el armario o el espejo de casa y en el probador de la boutique de Seda.
import * as THREE from 'three';
import { MAX_SETS, type Outfit, SLOTS, SLOT_NAMES, type Slot, clothOf, isOutfit } from './clothes';
import { itemIcon } from './icons';
import type { Inventory } from './inventory';
import { itemDef } from './items';
import { PlayerModel } from './playerModel';

export interface WardrobeSave {
  outfit: Outfit;
  sets: Outfit[];
}

export function isWardrobeSave(v: unknown): v is WardrobeSave {
  if (typeof v !== 'object' || v === null) return false;
  const w = v as Record<string, unknown>;
  return isOutfit(w.outfit) && Array.isArray(w.sets) && w.sets.length <= MAX_SETS && w.sets.every(isOutfit);
}

/**
 * Se pone una prenda que lleva en los bolsillos: la saca de ellos y guarda en su sitio la que llevaba en ese hueco.
 * Devuelve el conjunto nuevo, o por qué no se ha podido.
 */
export function putOn(outfit: Outfit, inv: Inventory, id: string): Outfit | string {
  const cloth = clothOf(id);
  if (!cloth) return 'Eso no se puede poner';
  if (inv.countOf(id) < 1) return 'No lo llevas en los bolsillos';
  const slot = cloth.garment.slot;
  inv.remove(id, 1);
  const old = outfit[slot];
  if (old && inv.add(old, 1) > 0) {
    // No cabe lo que llevabas: se deja todo como estaba.
    inv.add(id, 1);
    return 'No te cabe en los bolsillos lo que llevas puesto';
  }
  return { ...outfit, [slot]: id };
}

/** Se quita lo de un hueco y lo guarda en los bolsillos. */
export function takeOff(outfit: Outfit, inv: Inventory, slot: Slot): Outfit | string {
  const id = outfit[slot];
  if (!id) return outfit;
  if (inv.add(id, 1) > 0) return 'No te cabe en los bolsillos';
  const next = { ...outfit };
  delete next[slot];
  return next;
}

/** Se pone un conjunto guardado con lo que tenga a mano (puesto o en los bolsillos). Devuelve el conjunto y lo que falta. */
export function wearSet(outfit: Outfit, inv: Inventory, set: Outfit): { outfit: Outfit; missing: string[] } {
  let now = outfit;
  const missing: string[] = [];
  for (const slot of SLOTS) {
    const want = set[slot];
    if (now[slot] === want) continue;
    if (!want) {
      const r = takeOff(now, inv, slot);
      if (typeof r !== 'string') now = r;
      continue;
    }
    const r = putOn(now, inv, want);
    if (typeof r === 'string') missing.push(clothOf(want)!.name);
    else now = r;
  }
  return { outfit: now, missing };
}

export interface WardrobeContext {
  inventory: Inventory;
  atlas: HTMLCanvasElement;
  /** Color de la camiseta del jugador (el de su ficha). */
  color: () => number;
  /** Se ha cambiado de ropa: guardar y contárselo a los amigos. */
  changed: (outfit: Outfit) => void;
  toast: (text: string) => void;
  onClose: () => void;
}

export class Wardrobe {
  readonly el: HTMLDivElement;
  outfit: Outfit;
  sets: Outfit[];
  private wornEl: HTMLUListElement;
  private pocketEl: HTMLUListElement;
  private setsEl: HTMLUListElement;
  private titleEl: HTMLHeadingElement;
  private preview: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 0.75, 0.1, 20);
  private model: PlayerModel | null = null;
  private frame = 0;
  /** En el probador: lo que hay hoy en la boutique, para verse con ello antes de comprarlo. */
  private tries: string[] = [];
  private trying: Outfit | null = null;

  constructor(private ctx: WardrobeContext, saved?: WardrobeSave | null) {
    this.outfit = saved ? { ...saved.outfit } : {};
    this.sets = saved ? saved.sets.map((s) => ({ ...s })) : [];
    this.el = document.createElement('div');
    this.el.id = 'wardrobe';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="shop-panel wardrobe-panel" role="dialog" aria-labelledby="wardrobe-title">
        <header><h2 id="wardrobe-title">Armario</h2><p>Clic en una prenda para ponértela o quitártela</p></header>
        <div class="wardrobe-mirror"><canvas width="240" height="320" aria-label="Tú en el espejo"></canvas></div>
        <div class="wardrobe-lists">
          <section><h3>Lo que llevas</h3><ul class="shop-list wardrobe-worn"></ul></section>
          <section><h3>En los bolsillos</h3><ul class="shop-list wardrobe-pockets"></ul></section>
          <section class="wardrobe-try" hidden><h3>Para probar (de la tienda)</h3><ul class="shop-list wardrobe-tries"></ul></section>
          <section><h3>Conjuntos guardados</h3><ul class="shop-list wardrobe-sets"></ul></section>
        </div>
        <footer><button type="button" class="wardrobe-close">Listo</button> <span><kbd>Esc</kbd> para volver</span></footer>
      </div>`;
    document.body.appendChild(this.el);
    this.titleEl = this.el.querySelector('h2')!;
    this.wornEl = this.el.querySelector('.wardrobe-worn')!;
    this.pocketEl = this.el.querySelector('.wardrobe-pockets')!;
    this.setsEl = this.el.querySelector('.wardrobe-sets')!;
    this.preview = this.el.querySelector('canvas')!;
    this.el.querySelector('.wardrobe-close')!.addEventListener('click', () => ctx.onClose());
    ctx.inventory.onChange(() => {
      if (!this.el.hidden) this.render();
    });
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  show(title = 'Armario', tries: string[] = []) {
    this.titleEl.textContent = title;
    this.tries = tries.filter((id) => clothOf(id));
    this.trying = null;
    this.el.hidden = false;
    this.render();
    this.spin();
  }

  hide() {
    this.el.hidden = true;
    cancelAnimationFrame(this.frame);
  }

  serialize(): WardrobeSave {
    return { outfit: { ...this.outfit }, sets: this.sets.map((s) => ({ ...s })) };
  }

  private apply(r: Outfit | string) {
    if (typeof r === 'string') {
      this.ctx.toast(r);
      return;
    }
    this.outfit = r;
    this.trying = null;
    this.model?.dress(r);
    this.ctx.changed(r);
    this.render();
  }

  /** Ponerse una prenda desde fuera (clic derecho con ella en la mano). */
  wear(id: string): boolean {
    const r = putOn(this.outfit, this.ctx.inventory, id);
    this.apply(r);
    return typeof r !== 'string';
  }

  private item(id: string, label: string, action: string, fn: () => void): HTMLLIElement {
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.src = itemIcon(this.ctx.atlas, id);
    img.alt = '';
    const name = document.createElement('span');
    name.innerHTML = `<b></b><small></small>`;
    name.querySelector('b')!.textContent = itemDef(id).name;
    name.querySelector('small')!.textContent = label;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action;
    b.addEventListener('click', fn);
    li.append(img, name, b);
    return li;
  }

  render() {
    const inv = this.ctx.inventory;
    this.wornEl.innerHTML = '';
    for (const slot of SLOTS) {
      const id = this.outfit[slot];
      if (id) this.wornEl.appendChild(this.item(id, SLOT_NAMES[slot], 'Quitar', () => this.apply(takeOff(this.outfit, inv, slot))));
    }
    if (!this.wornEl.childElementCount) this.wornEl.innerHTML = '<li class="empty">Vas con tu ropa de siempre.</li>';
    this.pocketEl.innerHTML = '';
    const seen = new Set<string>();
    for (const s of inv.slots) {
      if (!s || seen.has(s.id) || !clothOf(s.id)) continue;
      seen.add(s.id);
      this.pocketEl.appendChild(this.item(s.id, SLOT_NAMES[clothOf(s.id)!.garment.slot], 'Ponerse', () => this.apply(putOn(this.outfit, inv, s.id))));
    }
    if (!seen.size) this.pocketEl.innerHTML = '<li class="empty">No llevas ropa en los bolsillos. ¡La boutique de Seda tiene de todo!</li>';
    const trySection = this.el.querySelector<HTMLElement>('.wardrobe-try')!;
    trySection.hidden = !this.tries.length;
    const triesEl = trySection.querySelector('ul')!;
    triesEl.innerHTML = '';
    for (const id of this.tries) {
      const slot = clothOf(id)!.garment.slot;
      const on = this.trying?.[slot] === id;
      triesEl.appendChild(this.item(id, on ? 'Te lo estás probando' : SLOT_NAMES[slot], on ? 'Quitar' : 'Probar', () => {
        const base = this.trying ?? this.outfit;
        const next = { ...base };
        if (on) next[slot] = this.outfit[slot];
        else next[slot] = id;
        if (!next[slot]) delete next[slot];
        this.trying = next;
        this.model?.dress(next);
        this.render();
      }));
    }
    this.setsEl.innerHTML = '';
    for (let i = 0; i < MAX_SETS; i++) {
      const set = this.sets[i];
      const li = document.createElement('li');
      const text = document.createElement('span');
      const pieces = set ? SLOTS.flatMap((slot) => (set[slot] ? [clothOf(set[slot])!.name] : [])) : [];
      text.innerHTML = `<b>Conjunto ${i + 1}</b><small></small>`;
      text.querySelector('small')!.textContent = set ? pieces.join(', ') || 'Sin nada' : 'Vacío';
      li.appendChild(text);
      const save = document.createElement('button');
      save.type = 'button';
      save.textContent = 'Guardar';
      save.addEventListener('click', () => {
        this.sets[i] = { ...this.outfit };
        this.ctx.changed(this.outfit);
        this.render();
      });
      li.appendChild(save);
      if (set) {
        const wear = document.createElement('button');
        wear.type = 'button';
        wear.textContent = 'Ponerse';
        wear.addEventListener('click', () => {
          const r = wearSet(this.outfit, inv, set);
          if (r.missing.length) this.ctx.toast(`Te falta: ${r.missing.join(', ')}`);
          this.apply(r.outfit);
        });
        li.appendChild(wear);
      }
      this.setsEl.appendChild(li);
    }
  }

  /** El espejo: el muñeco con la ropa puesta, dando vueltas despacio. */
  private spin() {
    if (!this.renderer) {
      try {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.preview, antialias: true, alpha: true });
      } catch {
        return;
      }
      this.scene.add(new THREE.AmbientLight(0xffffff, 1.6), new THREE.DirectionalLight(0xffffff, 1.8));
      this.camera.position.set(0, 1.1, 5);
      this.camera.lookAt(0, 1, 0);
    }
    if (this.model) {
      this.scene.remove(this.model.group);
      this.model.dispose();
    }
    this.model = new PlayerModel(this.ctx.color(), this.outfit);
    this.scene.add(this.model.group);
    const start = performance.now();
    const loop = () => {
      if (this.el.hidden || !this.renderer || !this.model) return;
      this.model.group.rotation.y = Math.sin((performance.now() - start) / 1400) * 0.9;
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(loop);
    };
    loop();
  }
}
