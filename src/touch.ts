import type { Player } from './player';

// Mando en pantalla para móvil y tableta: palanca a la izquierda, mirar arrastrando a la derecha y botones.

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

export class TouchControls {
  readonly el = document.createElement('div');
  private stickBase = document.createElement('div');
  private stickKnob = document.createElement('div');
  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };

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

    const button = (label: string, cls: string, down: () => void, up?: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `touch-btn ${cls}`;
      b.textContent = label;
      b.addEventListener('touchstart', (e) => {
        e.preventDefault();
        b.classList.add('pressed');
        down();
      }, { passive: false });
      const release = (e: Event) => {
        e.preventDefault();
        b.classList.remove('pressed');
        up?.();
      };
      b.addEventListener('touchend', release);
      b.addEventListener('touchcancel', release);
      this.el.appendChild(b);
    };
    button('Saltar', 'jump', () => (a.player.touch.jump = true), () => (a.player.touch.jump = false));
    button('Romper', 'break', () => a.setBreaking(true), () => a.setBreaking(false));
    button('Usar', 'use', () => a.use());
    button('Bolsillos', 'top inv', () => a.inventory());
    button('Enciclopedia', 'top col', () => a.collection());
    button('Girar', 'top rot', () => a.rotate());
    button('Tareas', 'top tasks', () => a.missions());
    button('Pausa', 'top pause', () => a.pause());
  }

  show(on: boolean) {
    this.el.hidden = !on;
    if (!on) this.reset();
  }

  private reset() {
    this.stickId = null;
    this.lookId = null;
    this.stickBase.hidden = true;
    this.a.player.touch.forward = 0;
    this.a.player.touch.strafe = 0;
    this.a.player.touch.jump = false;
    this.a.setBreaking(false);
  }

  private start(e: TouchEvent) {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      // La mitad izquierda de la pantalla es para caminar; la derecha, para mirar.
      if (t.clientX < window.innerWidth * 0.4 && this.stickId === null) {
        this.stickId = t.identifier;
        this.stickOrigin = { x: t.clientX, y: t.clientY };
        this.stickBase.hidden = false;
        this.stickBase.style.transform = `translate(${t.clientX - STICK_RADIUS}px, ${t.clientY - STICK_RADIUS}px)`;
        this.stickKnob.style.transform = '';
      } else if (this.lookId === null) {
        this.lookId = t.identifier;
        this.lookLast = { x: t.clientX, y: t.clientY };
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
        this.a.player.look((t.clientX - this.lookLast.x) * LOOK_SPEED, (t.clientY - this.lookLast.y) * LOOK_SPEED);
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
        this.lookId = null;
      }
    }
  }
}
