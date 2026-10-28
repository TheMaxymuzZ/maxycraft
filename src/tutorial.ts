// Primeros pasos en la isla: una lista que se va tachando sola mientras juegas. Desde la 5.0, al terminarla
// sale una segunda, la guía del pueblo y del mar: urbanismo, astillero y exploración.

export type StepId =
  | 'mover' | 'sacudir' | 'romper' | 'fabricar' | 'hablar' | 'vender' | 'criatura' | 'mueble'
  | 'alcalde' | 'parcela' | 'astillero' | 'barco' | 'navegar' | 'mercado' | 'mazmorra';

interface Step {
  id: StepId;
  text: string;
  touch?: string;
}

export interface Chapter {
  title: string;
  steps: Step[];
  /** Bayas de regalo al terminarla. */
  reward: number;
  /** Quién te las regala. */
  giver: string;
}

export const CHAPTERS: Chapter[] = [
  {
    title: 'Primeros pasos',
    reward: 1000,
    giver: 'Avellana',
    steps: [
      { id: 'mover', text: 'Da un paseo por la isla ({forward} {left} {back} {right})', touch: 'Da un paseo por la isla (palanca de la izquierda)' },
      { id: 'sacudir', text: 'Sacude un árbol con clic derecho', touch: 'Sacude un árbol: tócalo o pulsa Usar' },
      { id: 'romper', text: 'Rompe un bloque manteniendo el clic izquierdo', touch: 'Rompe un bloque: deja el dedo quieto encima o mantén Romper' },
      { id: 'fabricar', text: 'Fabrica algo en los bolsillos ({inventory})', touch: 'Fabrica algo en los bolsillos (botón Bolsillos)' },
      { id: 'hablar', text: 'Habla con un vecino' },
      { id: 'vender', text: 'Vende algo en la tienda de Avellana' },
      { id: 'criatura', text: 'Pesca un pez o atrapa un insecto (se fabrican con 5 ramas)' },
      { id: 'mueble', text: 'Coloca un mueble en tu casa' },
    ],
  },
  {
    title: 'Guía del pueblo y del mar',
    reward: 5000,
    giver: 'Bartolo',
    steps: [
      { id: 'alcalde', text: 'Habla con el alcalde en la caseta de obras' },
      { id: 'parcela', text: 'Amplía tu parcela o cómprale una mejora a Ladrillo' },
      { id: 'astillero', text: 'Ayuda a Bartolo a arreglar el astillero de la playa' },
      { id: 'barco', text: 'Construye tu primer barco en el astillero' },
      { id: 'navegar', text: 'Navega hasta otra isla del archipiélago (mira la carta náutica)' },
      { id: 'mercado', text: 'Vende algo en el mercado de una isla aldea' },
      { id: 'mazmorra', text: 'Baja a una mazmorra por la escalera del templo en ruinas' },
    ],
  },
];

/** Lo que regalan al terminar los primeros pasos (para las partidas y pruebas de antes de la 5.0). */
export const TUTORIAL_REWARD = CHAPTERS[0].reward;

export class Tutorial {
  private el = document.querySelector<HTMLDivElement>('#tutorial')!;
  private listEl = document.querySelector<HTMLOListElement>('#tutorial-list')!;
  private titleEl = document.querySelector<HTMLElement>('#tutorial-title');
  private done: Set<StepId>;
  /** Capítulos terminados (el primero, también en las islas de antes de que hubiera tutorial). */
  private chaptersDone: number;
  /** Recién terminado un capítulo: la lista completa se deja ver un momento. */
  private celebrating: number | null = null;
  /** Nombre de la tecla elegida para cada acción, para que los textos sigan a las opciones. */
  keyName: (action: string) => string = (a) => a;

  constructor(
    saved: StepId[] | undefined, firstDone: boolean, private touch: boolean, private onFinish: (chapter: Chapter) => void, guideDone = false,
  ) {
    this.done = new Set(saved ?? []);
    this.chaptersDone = guideDone ? CHAPTERS.length : firstDone ? 1 : 0;
    this.el.querySelector('header')!.addEventListener('click', () => this.toggle());
    // En pantallas bajas y en el móvil empieza plegada para no tapar el juego; se abre tocando el título.
    if (window.innerHeight < 500 || touch) this.el.classList.add('collapsed');
    this.render();
  }

  /** Los primeros pasos ya están hechos. */
  get finished(): boolean {
    return this.chaptersDone >= 1;
  }

  /** La guía del pueblo y del mar también (v5.0). */
  get guideFinished(): boolean {
    return this.chaptersDone >= CHAPTERS.length;
  }

  toggle() {
    this.el.classList.toggle('collapsed');
  }

  /** Apunta un paso. Los de la guía se apuntan aunque aún no se vean, para no tener que repetirlos. */
  complete(id: StepId) {
    if (this.guideFinished || this.done.has(id)) return;
    this.done.add(id);
    const chapter = CHAPTERS[this.chaptersDone];
    if (chapter.steps.every((s) => this.done.has(s.id))) this.finishChapter();
    this.render();
  }

  private finishChapter() {
    const index = this.chaptersDone;
    this.chaptersDone++;
    this.celebrating = index;
    window.setTimeout(() => {
      this.celebrating = null;
      this.render();
    }, 5000);
    this.onFinish(CHAPTERS[index]);
    // Si los pasos del siguiente ya estaban hechos, también se termina.
    const next = CHAPTERS[this.chaptersDone];
    if (next && next.steps.every((s) => this.done.has(s.id))) this.finishChapter();
  }

  serialize(): StepId[] {
    return [...this.done];
  }

  /** Vuelve a escribir los pasos (por ejemplo, al cambiar las teclas). */
  refresh() {
    this.render();
  }

  private render() {
    const index = this.celebrating ?? this.chaptersDone;
    const chapter = CHAPTERS[index];
    this.el.hidden = !chapter;
    if (!chapter) return;
    if (this.titleEl) this.titleEl.textContent = chapter.title;
    const pending = chapter.steps.filter((s) => !this.done.has(s.id)).length;
    this.el.querySelector('#tutorial-left')!.textContent = pending ? `${chapter.steps.length - pending}/${chapter.steps.length}` : '¡Hecho!';
    this.listEl.innerHTML = chapter.steps.map(
      (s) => `<li class="${this.done.has(s.id) ? 'done' : ''}">${this.touch && s.touch ? s.touch : s.text.replace(/\{(\w+)\}/g, (_, a: string) => this.keyName(a))}</li>`,
    ).join('');
  }
}
