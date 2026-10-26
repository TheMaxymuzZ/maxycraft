import { CHANGELOG } from './changelog';
import { DAY_LENGTHS } from './clock';
import { ACTIONS, type Action, bindKey, canBind, defaultKeys, keyLabel } from './keys';
import { QUALITIES, RENDER_RADIUS, type Settings, defaultSettings, saveSettings } from './settings';

export type View = 'main' | 'options' | 'islands' | 'controls' | 'keys' | 'news' | 'friends';

/** El menú: portada al abrir el juego, pausa durante la partida, opciones y controles. */
export class Menu {
  readonly el = document.querySelector<HTMLDivElement>('#overlay')!;
  private views = [...this.el.querySelectorAll<HTMLElement>('.menu-view')];
  private qualityHint = document.querySelector<HTMLParagraphElement>('#opt-quality-hint')!;
  private sliders: { key: 'music' | 'sfx' | 'sensitivity' | 'fov' | 'uiScale' | 'viewDistance'; input: HTMLInputElement; out: HTMLOutputElement; format: (n: number) => string }[];
  private qualityInputs: HTMLInputElement[] = [];
  private dayInputs: HTMLInputElement[] = [];
  private bigText = document.querySelector<HTMLInputElement>('#opt-bigtext')!;
  private colorblind = document.querySelector<HTMLInputElement>('#opt-colorblind')!;
  private keysList = document.querySelector<HTMLUListElement>('#keys-list')!;
  private controlsList = document.querySelector<HTMLUListElement>('#controls-list')!;
  /** Acción esperando a que se pulse su tecla nueva. */
  private capturing: Action | null = null;
  view: View = 'main';
  /** Se llama al cambiar de pantalla dentro del menú. */
  onView: (v: View) => void = () => {};

  constructor(
    readonly settings: Settings,
    private touch: boolean,
    /** Se llama cada vez que cambia una opción, ya guardada. */
    private onChange: (s: Settings) => void,
  ) {
    const percent = (n: number) => `${n}%`;
    const slider = (key: 'music' | 'sfx' | 'sensitivity' | 'fov' | 'uiScale' | 'viewDistance', format: (n: number) => string) => ({
      key,
      input: document.querySelector<HTMLInputElement>(`#opt-${key}`)!,
      out: document.querySelector<HTMLOutputElement>(`#opt-${key}-value`)!,
      format,
    });
    this.sliders = [
      slider('music', percent),
      slider('sfx', percent),
      slider('sensitivity', (n) => `${n.toFixed(1).replace('.', ',')}×`),
      slider('fov', (n) => `${n}°`),
      slider('uiScale', percent),
      slider('viewDistance', (n) => `${n * 16} bloques`),
    ];
    for (const s of this.sliders) {
      s.input.addEventListener('input', () => {
        this.settings[s.key] = Number(s.input.value);
        this.changed();
      });
    }

    const choices = document.querySelector<HTMLDivElement>('#opt-quality')!;
    for (const q of QUALITIES) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'quality';
      input.value = q.id;
      input.id = `opt-quality-${q.id}`;
      input.addEventListener('change', () => {
        this.settings.quality = q.id;
        // Cada calidad trae su distancia de visión; luego se puede ajustar a mano.
        this.settings.viewDistance = RENDER_RADIUS[q.id];
        this.changed();
      });
      label.append(input, q.name);
      choices.appendChild(label);
      this.qualityInputs.push(input);
    }

    const days = document.querySelector<HTMLDivElement>('#opt-day')!;
    for (const l of DAY_LENGTHS) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'day-length';
      input.value = String(l.minutes);
      input.id = `opt-day-${l.minutes}`;
      input.addEventListener('change', () => {
        this.settings.dayLength = l.minutes;
        this.changed();
      });
      label.append(input, l.name);
      days.appendChild(label);
      this.dayInputs.push(input);
    }

    this.bigText.addEventListener('change', () => {
      this.settings.bigText = this.bigText.checked;
      this.changed();
    });
    this.colorblind.addEventListener('change', () => {
      this.settings.colorblind = this.colorblind.checked;
      this.changed();
    });
    document.querySelector('#keys-reset')!.addEventListener('click', () => {
      this.settings.keys = defaultKeys();
      this.capturing = null;
      this.changed();
    });
    // Al cambiar una tecla, la siguiente que se pulse es la nueva (y no hace nada más en el juego).
    window.addEventListener('keydown', (e) => {
      if (!this.capturing) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code !== 'Escape') {
        if (!canBind(e.code)) return;
        this.settings.keys = bindKey(this.settings.keys, this.capturing, e.code);
      }
      this.capturing = null;
      this.changed();
    }, true);
    this.renderNews();

    document.querySelector('#options-reset')!.addEventListener('click', () => {
      Object.assign(this.settings, defaultSettings(this.touch));
      this.changed();
    });
    for (const b of this.el.querySelectorAll<HTMLButtonElement>('[data-open]')) {
      b.addEventListener('click', () => this.show(b.dataset.open as View));
    }
    for (const b of this.el.querySelectorAll<HTMLButtonElement>('.menu-back')) {
      b.addEventListener('click', () => this.show('main'));
    }
    this.render();
  }

  get hidden() {
    return this.el.hidden;
  }

  open() {
    this.show('main');
    this.el.hidden = false;
  }

  close() {
    this.el.hidden = true;
    // Al volver a jugar ya no es la portada, sino la pausa.
    this.el.classList.remove('title');
    this.el.classList.add('paused');
  }

  get isTitle() {
    return this.el.classList.contains('title');
  }

  /** Vuelve atrás: de las teclas a las opciones y de lo demás al menú principal. */
  back() {
    this.show(this.view === 'keys' ? 'options' : 'main');
  }

  show(view: View) {
    this.capturing = null;
    this.view = view;
    this.render();
    for (const v of this.views) v.hidden = v.dataset.view !== view;
    this.onView(view);
    const first = this.views.find((v) => !v.hidden)?.querySelector<HTMLElement>('button, input');
    first?.focus({ preventScroll: true });
  }

  private changed() {
    saveSettings(this.settings);
    this.render();
    this.onChange(this.settings);
  }

  private render() {
    for (const s of this.sliders) {
      s.input.value = String(this.settings[s.key]);
      s.out.textContent = s.format(this.settings[s.key]);
    }
    for (const input of this.qualityInputs) input.checked = input.value === this.settings.quality;
    for (const input of this.dayInputs) input.checked = Number(input.value) === this.settings.dayLength;
    this.qualityHint.textContent = QUALITIES.find((q) => q.id === this.settings.quality)!.hint;
    this.bigText.checked = this.settings.bigText;
    this.colorblind.checked = this.settings.colorblind;
    this.renderKeys();
    this.renderControls();
  }

  private renderKeys() {
    this.keysList.innerHTML = '';
    for (const a of ACTIONS) {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = a.name;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'secondary';
      const waiting = this.capturing === a.id;
      b.textContent = waiting ? 'Pulsa una tecla…' : keyLabel(this.settings.keys[a.id]);
      b.classList.toggle('waiting', waiting);
      b.addEventListener('click', () => {
        this.capturing = a.id;
        this.renderKeys();
        this.keysList.querySelector<HTMLButtonElement>('.waiting')?.focus();
      });
      li.append(name, b);
      this.keysList.appendChild(li);
    }
  }

  /** La ayuda de controles con las teclas que se hayan elegido. */
  private renderControls() {
    const k = (a: Action) => `<kbd>${keyLabel(this.settings.keys[a]).replace(/</g, '&lt;')}</kbd>`;
    const lines = [
      `${k('forward')}${k('left')}${k('back')}${k('right')} caminar`,
      `${k('jump')} saltar · ${k('sprint')} correr`,
      '<kbd>Clic izq.</kbd> (mantener) romper',
      '<kbd>Clic der.</kbd> colocar, usar, sacudir un árbol o hablar',
      `${k('inventory')} bolsillos · ${k('collection')} enciclopedia · ${k('missions')} tareas`,
      '<kbd>1</kbd>–<kbd>0</kbd> o rueda: elegir',
      'Con la caña o la red en la mano, <kbd>Clic der.</kbd> para pescar o cazar',
      `${k('rotate')} girar un mueble · ${k('map')} mapa · ${k('sound')} sonido · ${k('help')} primeros pasos`,
      `Con amigos: ${k('chat')} chat · ${k('gesture')} gestos · <kbd>Clic der.</kbd> a un amigo para darle lo que tienes en la mano`,
      `${k('debug')} datos de depuración · <kbd>Esc</kbd> pausa`,
      `${k('jump')} en el agua: nadar hacia arriba`,
    ];
    this.controlsList.innerHTML = lines.map((l) => `<li>${l}</li>`).join('');
  }

  private renderNews() {
    const list = document.querySelector<HTMLDivElement>('#news-list')!;
    for (const r of CHANGELOG) {
      const sec = document.createElement('section');
      const h = document.createElement('h3');
      h.textContent = `v${r.version} · ${r.title}`;
      const ul = document.createElement('ul');
      for (const item of r.items) {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      }
      sec.append(h, ul);
      list.appendChild(sec);
    }
  }
}
