/** Avisos que se ven a la vez como mucho; si llega otro, se va el más viejo. */
export const MAX_TOASTS = 3;

/**
 * Avisos del juego (v3.4): «Has conseguido: manzana», «¡Ha llegado el otoño!»… Antes salía uno solo
 * y el siguiente lo borraba; ahora se apilan sin taparse y los repetidos se cuentan.
 */
export class Notices {
  /** Cuándo se va cada aviso. */
  private timers = new Map<HTMLElement, number>();

  constructor(private el: HTMLElement) {}

  /**
   * Enseña un aviso. Se apilan sin taparse (como mucho MAX_TOASTS a la vez) y,
   * si se repite el mismo, no sale otro: se cuenta (por ejemplo «Has conseguido: manzana ×3»).
   */
  show(text: string) {
    let el = [...this.el.children].find((c) => (c as HTMLElement).dataset.text === text && !c.classList.contains('leaving')) as HTMLElement | undefined;
    if (el) {
      const count = Number(el.dataset.count ?? 1) + 1;
      el.dataset.count = String(count);
      el.querySelector('b')!.textContent = `×${count}`;
      el.classList.remove('bump');
      void el.offsetWidth; // para que el saltito vuelva a empezar
      el.classList.add('bump');
    } else {
      el = document.createElement('div');
      el.className = 'toast';
      el.dataset.text = text;
      el.append(document.createTextNode(text), document.createElement('b'));
      this.el.append(el);
      const shown = [...this.el.children].filter((c) => !c.classList.contains('leaving'));
      if (shown.length > MAX_TOASTS) this.dismiss(shown[0] as HTMLElement);
    }
    clearTimeout(this.timers.get(el));
    // Los avisos largos se quedan un poco más, para que dé tiempo a leerlos.
    const ms = Math.min(5000, 2200 + text.length * 35);
    const target = el;
    this.timers.set(el, window.setTimeout(() => this.dismiss(target), ms));
  }

  private dismiss(el: HTMLElement) {
    clearTimeout(this.timers.get(el));
    this.timers.delete(el);
    el.classList.add('leaving');
    window.setTimeout(() => el.remove(), 300);
  }
}
