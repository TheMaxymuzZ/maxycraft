import type { Player } from './player';

// Mando en pantalla para móvil y tableta (v3.6): palanca a la izquierda y, en el resto de la pantalla, como en Minecraft:
// arrastrar mira alrededor, un toque rápido usa y mantener el dedo quieto un momento rompe el bloque de la mira.
// Mientras se rompe se puede seguir arrastrando para mirar; si la mira deja el bloque, ese bloque deja de romperse.

export interface TouchActions {
  player: Player;
  use: () => void;
  setBreaking: (on: boolean) => void;
  inventory: () => void;
  collection: () => void;
  missions: () => void;
  rotate: () => void;
  pause: () => void;
}

const LOOK_SPEED = 1.6;
const STICK_RADIUS = 48;
/** Lo que hay que mantener el dedo quieto para empezar a romper. */
export const HOLD_MS = 300;
/** Lo que se puede mover el dedo (en píxeles) y que siga contando como quieto o como toque. */
export const TAP_SLOP = 12;
/** Un toque más largo que esto ya no es «usar». */
const TAP_MS = 250;

/** Dibujos sencillos de los botones, para no depender de las letras. */
const ICONS: Record<string, string> = {
  jump: '<path d="M12 5l-7 8h4.5v6h5v-6H19z"/>',
  break: '<path d="M4 7c3-3 9-4 14-1l-2 2c-3-2-7-2-10 0z"/><path d="M11 9l2 2-7 9-2-2z"/>',
  use: '<path d="M8 12V6a1.5 1.5 0 013 0v5V4.5a1.5 1.5 0 013 0V11V6a1.5 1.5 0 013 0v8c0 4-2.5 6-6 6s-5-2-6.5-4.5L4 12.5a1.4 1.4 0 012.3-1.6z"/>',
  inv: '<path d="M9 6V5a3 3 0 016 0v1h3l1 14H5L6 6zm2 0h2V5a1 1 0 00-2 0z"/>',
  col: '<path d="M4 5c3-1 5-1 7 1v14c-2-2-4-2-7-1zM20 5c-3-1-5-1-7 1v14c2-2 4-2 7-1z"/>',
  tasks: '<path d="M5 5h14v15H5zm3 4h8v2H8zm0 4h8v2H8z" fill-rule="evenodd"/>',
  rot: '<path d="M12 4a8 8 0 107.4 11h-2.3A6 6 0 1112 6v3l4-4-4-4z"/>',
  pause: '<path d="M7 5h4v14H7zm6 0h4v14h-4z"/>',
};

const svg = (name: string) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${ICONS[name]}</svg>`;

export class TouchControls {
  readonly el = document.createElement('div');
  private stickBase = document.createElement('div');
  private stickKnob = document.createElement('div');
  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  /** Dedo que mira (en la pantalla o encima del botón Romper). */
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private lookStart = { x: 0, y: 0, t: 0 };
  /** El dedo que mira se ha movido: ya no es un toque. */
  private lookMoved = false;
  /** El dedo que mira está rompiendo (lo ha mantenido quieto, o pulsa el botón Romper). */
  private lookBreaking = false;
  private holdTimer = 0;

  constructor(private a: TouchActions) {
    this.el.id = 'touch';
    this.el.hidden = true;
    const look = document.createElement('div');
    look.className = 'touch-look';
    this.stickBase.className = 'touch-stick';
    this.stickKnob.className = 'touch-knob';
    this.stickBase.appendChild(this.stickKnob);
    this.stickBase.hidden = true;
    this.el.append(look, this.stickBase);

    look.addEventListener('touchstart', (e) => this.start(e), { passive: false });
    look.addEventListener('touchmove', (e) => this.move(e), { passive: false });
    look.addEventListener('touchend', (e) => this.end(e));
    look.addEventListener('touchcancel', (e) => this.end(e));

    const button = (label: string, icon: string, cls: string, parent: HTMLElement, down: (t: Touch) => void, up?: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `touch-btn ${cls}`;
      b.innerHTML = `${svg(icon)}<span>${label}</span>`;
      b.setAttribute('aria-label', label);
      b.addEventListener('touchstart', (e) => {
        e.preventDefault();
        b.classList.add('pressed');
        down(e.changedTouches[0]);
      }, { passive: false });
      const release = (e: Event) => {
        e.preventDefault();
        b.classList.remove('pressed');
        up?.();
      };
      b.addEventListener('touchend', release);
      b.addEventListener('touchcancel', release);
      parent.appendChild(b);
      return b;
    };
    const actions = document.createElement('div');
    actions.className = 'touch-actions';
    const menu = document.createElement('div');
    menu.className = 'touch-menu';
    this.el.append(actions, menu);
    button('Saltar', 'jump', 'jump', actions, () => (a.player.touch.jump = true), () => (a.player.touch.jump = false));
    // Con el dedo en Romper también se puede arrastrar para mirar alrededor.
    const breakBtn = button('Romper', 'break', 'break', actions, (t) => {
      this.cancelHold();
      this.lookId = t.identifier;
      this.lookLast = { x: t.clientX, y: t.clientY };
      this.lookMoved = true;
      this.lookBreaking = true;
      a.setBreaking(true);
    }, () => this.stopLook());
    breakBtn.addEventListener('touchmove', (e) => this.move(e), { passive: false });
    button('Usar', 'use', 'use', actions, () => a.use());
    button('Bolsillos', 'inv', 'inv', menu, () => a.inventory());
    button('Enciclopedia', 'col', 'col', menu, () => a.collection());
    button('Tareas', 'tasks', 'tasks', menu, () => a.missions());
    button('Girar', 'rot', 'rot', menu, () => a.rotate());
    button('Pausa', 'pause', 'pause', menu, () => a.pause());
  }

  show(on: boolean) {
    this.el.hidden = !on;
    if (!on) this.reset();
  }

  private reset() {
    this.stickId = null;
    this.stickBase.hidden = true;
    this.a.player.touch.forward = 0;
    this.a.player.touch.strafe = 0;
    this.a.player.touch.jump = false;
    this.stopLook();
  }

  private cancelHold() {
    clearTimeout(this.holdTimer);
    this.holdTimer = 0;
  }

  private stopLook() {
    this.cancelHold();
    this.lookId = null;
    if (this.lookBreaking) this.a.setBreaking(false);
    this.lookBreaking = false;
  }

  private start(e: TouchEvent) {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      // La parte izquierda de la pantalla es para caminar; el resto, para mirar, usar y romper.
      if (t.clientX < window.innerWidth * 0.4 && this.stickId === null) {
        this.stickId = t.identifier;
        this.stickOrigin = { x: t.clientX, y: t.clientY };
        this.stickBase.hidden = false;
        this.stickBase.style.transform = `translate(${t.clientX - STICK_RADIUS}px, ${t.clientY - STICK_RADIUS}px)`;
        this.stickKnob.style.transform = '';
      } else if (this.lookId === null) {
        this.lookId = t.identifier;
        this.lookLast = { x: t.clientX, y: t.clientY };
        this.lookStart = { x: t.clientX, y: t.clientY, t: performance.now() };
        this.lookMoved = false;
        this.lookBreaking = false;
        // Si el dedo se queda quieto un momento, se empieza a romper; después ya puede moverse.
        this.cancelHold();
        this.holdTimer = window.setTimeout(() => {
          this.holdTimer = 0;
          if (this.lookId === null || this.lookMoved) return;
          this.lookBreaking = true;
          this.a.setBreaking(true);
          navigator.vibrate?.(15);
        }, HOLD_MS);
      }
    }
  }

  private move(e: TouchEvent) {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.stickId) {
        let dx = t.clientX - this.stickOrigin.x;
        let dy = t.clientY - this.stickOrigin.y;
        const len = Math.hypot(dx, dy);
        if (len > STICK_RADIUS) {
          dx = (dx / len) * STICK_RADIUS;
          dy = (dy / len) * STICK_RADIUS;
        }
        this.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.a.player.touch.strafe = dx / STICK_RADIUS;
        this.a.player.touch.forward = -dy / STICK_RADIUS;
      } else if (t.identifier === this.lookId) {
        if (!this.lookMoved && Math.hypot(t.clientX - this.lookStart.x, t.clientY - this.lookStart.y) > TAP_SLOP) {
          this.lookMoved = true;
          // Si aún no rompía, ya no empieza: es un arrastre para mirar.
          if (!this.lookBreaking) this.cancelHold();
        }
        // Los primeros píxeles no giran la cámara, así un toque o un mantener no mueve la mira sin querer.
        if (this.lookMoved) this.a.player.look((t.clientX - this.lookLast.x) * LOOK_SPEED, (t.clientY - this.lookLast.y) * LOOK_SPEED);
        this.lookLast = { x: t.clientX, y: t.clientY };
      }
    }
  }

  private end(e: TouchEvent) {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.stickId) {
        this.stickId = null;
        this.stickBase.hidden = true;
        this.a.player.touch.forward = 0;
        this.a.player.touch.strafe = 0;
      } else if (t.identifier === this.lookId) {
        // Un toque rápido sin moverse es «usar», como el clic derecho.
        const tap = !this.lookMoved && !this.lookBreaking && performance.now() - this.lookStart.t < TAP_MS;
        this.stopLook();
        if (tap) this.a.use();
      }
    }
  }
}
