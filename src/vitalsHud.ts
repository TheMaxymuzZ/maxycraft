import { MAX_AIR, MAX_HEALTH, MAX_HUNGER, type Vitals } from './vitals';

// Dibujos de 9x9 píxeles, como los de Minecraft: cada letra es un color.
const HEART = [
  '.kk...kk.',
  'krrk.krrk',
  'krwrrrrrk',
  'krrrrrrrk',
  'krrrrrrrk',
  '.krrrrrk.',
  '..krrrk..',
  '...krk...',
  '....k....',
];
const DRUMSTICK = [
  '......kk.',
  '.....kwwk',
  '....kwwk.',
  '..kkkwk..',
  '.kbbbk...',
  'kbmmbk...',
  'kbmmbk...',
  'kbbbk....',
  '.kkk.....',
];
const BUBBLE = [
  '.........',
  '...kkk...',
  '..kcccw..',
  '.kccccwk.',
  '.kcccccc.',
  '.kcccccc.',
  '..kcccc..',
  '...kkk...',
  '.........',
];

const COLORS: Record<string, Record<string, string>> = {
  full: { k: '#2a0e0e', r: '#e8323c', w: '#ffd0d0', b: '#b0602c', m: '#d88a4c', c: '#9fdcff' },
  empty: { k: '#2a0e0e', r: '#4a2a2a', w: '#4a2a2a', b: '#4a3326', m: '#4a3326', c: '#9fdcff' },
};

/** Dibuja un icono; `half` pinta solo la mitad izquierda llena. */
function icon(rows: string[], half: 'full' | 'half' | 'empty'): string {
  const c = document.createElement('canvas');
  c.width = c.height = 9;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const look = half === 'full' || (half === 'half' && x < 5) ? 'full' : 'empty';
      ctx.fillStyle = COLORS[look][ch];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return c.toDataURL();
}

/** Corazones, muslitos y burbujas encima de la barra rápida. */
export class VitalsHud {
  private el = document.createElement('div');
  private hearts: HTMLImageElement[] = [];
  private food: HTMLImageElement[] = [];
  private bubbles: HTMLImageElement[] = [];
  private flash = document.createElement('div');
  private icons: Record<string, string> = {};
  private last = '';

  constructor(parent: HTMLElement) {
    for (const look of ['full', 'half', 'empty'] as const) {
      this.icons[`h${look}`] = icon(HEART, look);
      this.icons[`f${look}`] = icon(DRUMSTICK, look);
    }
    this.icons.bubble = icon(BUBBLE, 'full');
    this.el.id = 'vitals';
    const row = (cls: string, list: HTMLImageElement[], n: number) => {
      const r = document.createElement('div');
      r.className = cls;
      for (let i = 0; i < n; i++) {
        const img = document.createElement('img');
        img.alt = '';
        list.push(img);
        r.appendChild(img);
      }
      this.el.appendChild(r);
      return r;
    };
    row('hearts', this.hearts, MAX_HEALTH / 2).setAttribute('aria-label', 'Vida');
    row('bubbles', this.bubbles, 10);
    row('food', this.food, MAX_HUNGER / 2).setAttribute('aria-label', 'Hambre');
    parent.appendChild(this.el);
    this.flash.id = 'hurt-flash';
    document.body.appendChild(this.flash);
  }

  set visible(v: boolean) {
    this.el.hidden = !v;
  }

  /** Destello rojo al hacerse daño. */
  hurt() {
    this.flash.classList.remove('on');
    void this.flash.offsetWidth;
    this.flash.classList.add('on');
    this.el.classList.remove('shake');
    void this.el.offsetWidth;
    this.el.classList.add('shake');
  }

  update(v: Vitals) {
    const air = Math.ceil((v.air / MAX_AIR) * 10);
    const key = `${v.health},${v.hunger},${air}`;
    if (key === this.last) return;
    this.last = key;
    const fill = (list: HTMLImageElement[], value: number, prefix: string) => {
      list.forEach((img, i) => {
        const look = value >= (i + 1) * 2 ? 'full' : value === i * 2 + 1 ? 'half' : 'empty';
        const src = this.icons[`${prefix}${look}`];
        if (img.src !== src) img.src = src;
      });
    };
    fill(this.hearts, v.health, 'h');
    // Los muslitos se vacían de derecha a izquierda, como en Minecraft.
    fill([...this.food].reverse(), v.hunger, 'f');
    this.bubbles.forEach((img, i) => {
      img.src = this.icons.bubble;
      img.style.visibility = i < air ? 'visible' : 'hidden';
    });
    this.el.classList.toggle('breathing', air < 10);
    // Poca vida: los corazones tiemblan para avisar.
    this.el.classList.toggle('low', v.health <= 6);
    this.el.classList.toggle('starving', v.hunger <= 6);
  }
}
