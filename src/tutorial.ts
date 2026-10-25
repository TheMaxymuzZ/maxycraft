// Primeros pasos en la isla: una lista que se va tachando sola mientras juegas.

export type StepId = 'mover' | 'sacudir' | 'romper' | 'fabricar' | 'hablar' | 'vender' | 'criatura' | 'mueble';

const STEPS: { id: StepId; text: string; touch?: string }[] = [
  { id: 'mover', text: 'Da un paseo por la isla (W A S D)', touch: 'Da un paseo por la isla (palanca de la izquierda)' },
  { id: 'sacudir', text: 'Sacude un árbol con clic derecho', touch: 'Sacude un árbol con el botón Usar' },
  { id: 'romper', text: 'Rompe un bloque manteniendo el clic izquierdo', touch: 'Rompe un bloque manteniendo el botón Romper' },
  { id: 'fabricar', text: 'Fabrica algo en los bolsillos (E)', touch: 'Fabrica algo en los bolsillos (botón Bolsillos)' },
  { id: 'hablar', text: 'Habla con un vecino' },
  { id: 'vender', text: 'Vende algo en la tienda de Avellana' },
  { id: 'criatura', text: 'Pesca un pez o atrapa un insecto (se fabrican con 5 ramas)' },
  { id: 'mueble', text: 'Coloca un mueble en tu casa' },
];

export const TUTORIAL_REWARD = 1000;

export class Tutorial {
  private el = document.querySelector<HTMLDivElement>('#tutorial')!;
  private listEl = document.querySelector<HTMLOListElement>('#tutorial-list')!;
  private done: Set<StepId>;
  /** Ya terminado, o la isla es de antes de que hubiera tutorial. */
  finished: boolean;
  /** Recién terminado: la lista completa se deja ver un momento. */
  private celebrating = false;

  constructor(saved: StepId[] | undefined, finished: boolean, private touch: boolean, private onFinish: () => void) {
    this.done = new Set(saved ?? []);
    this.finished = finished;
    this.el.querySelector('header')!.addEventListener('click', () => this.toggle());
    // En pantallas bajas empieza plegada para no tapar el juego.
    if (window.innerHeight < 500) this.el.classList.add('collapsed');
    this.render();
  }

  toggle() {
    this.el.classList.toggle('collapsed');
  }

  complete(id: StepId) {
    if (this.finished || this.done.has(id)) return;
    this.done.add(id);
    if (STEPS.every((s) => this.done.has(s.id))) {
      this.finished = true;
      this.celebrating = true;
      window.setTimeout(() => {
        this.celebrating = false;
        this.render();
      }, 5000);
      this.onFinish();
    }
    this.render();
  }

  serialize(): StepId[] {
    return [...this.done];
  }

  private render() {
    this.el.hidden = this.finished && !this.celebrating;
    const pending = STEPS.filter((s) => !this.done.has(s.id)).length;
    this.el.querySelector('#tutorial-left')!.textContent = pending ? `${STEPS.length - pending}/${STEPS.length}` : '¡Hecho!';
    this.listEl.innerHTML = STEPS.map(
      (s) => `<li class="${this.done.has(s.id) ? 'done' : ''}">${this.touch && s.touch ? s.touch : s.text}</li>`,
    ).join('');
  }
}
