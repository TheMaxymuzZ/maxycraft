import { QUALITIES, type Settings, defaultSettings, saveSettings } from './settings';

export type View = 'main' | 'options' | 'islands' | 'controls';

/** El menú: portada al abrir el juego, pausa durante la partida, opciones y controles. */
export class Menu {
  readonly el = document.querySelector<HTMLDivElement>('#overlay')!;
  private views = [...this.el.querySelectorAll<HTMLElement>('.menu-view')];
  private qualityHint = document.querySelector<HTMLParagraphElement>('#opt-quality-hint')!;
  private sliders: { key: 'music' | 'sfx' | 'sensitivity' | 'fov'; input: HTMLInputElement; out: HTMLOutputElement; format: (n: number) => string }[];
  private qualityInputs: HTMLInputElement[] = [];
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
    const slider = (key: 'music' | 'sfx' | 'sensitivity' | 'fov', format: (n: number) => string) => ({
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
        this.changed();
      });
      label.append(input, q.name);
      choices.appendChild(label);
      this.qualityInputs.push(input);
    }

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

  show(view: View) {
    this.view = view;
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
    this.qualityHint.textContent = QUALITIES.find((q) => q.id === this.settings.quality)!.hint;
  }
}
