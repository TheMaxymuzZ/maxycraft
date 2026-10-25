// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOLD_MS, TouchControls } from '../src/touch';

/** Un dedo que toca la pantalla en (x, y). */
function touchEvent(type: string, id: number, x: number, y: number) {
  const e = new Event(type, { bubbles: true, cancelable: true }) as Event & { changedTouches: unknown[] };
  e.changedTouches = [{ identifier: id, clientX: x, clientY: y }];
  return e;
}

function setup() {
  const looks: [number, number][] = [];
  const player = { touch: { forward: 0, strafe: 0, jump: false }, look: (dx: number, dy: number) => looks.push([dx, dy]) };
  const calls = { use: 0, breaking: [] as boolean[] };
  const tc = new TouchControls({
    player: player as never,
    use: () => calls.use++,
    setBreaking: (on) => calls.breaking.push(on),
    inventory: () => {}, collection: () => {}, missions: () => {}, rotate: () => {}, pause: () => {},
  });
  document.body.appendChild(tc.el);
  tc.show(true);
  calls.breaking.length = 0;
  const look = tc.el.querySelector('.touch-look')!;
  return { tc, look, looks, calls };
}

describe('mando táctil (v3.6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('un toque rápido usa, sin romper', () => {
    const { look, calls } = setup();
    look.dispatchEvent(touchEvent('touchstart', 1, 600, 200));
    vi.advanceTimersByTime(100);
    look.dispatchEvent(touchEvent('touchend', 1, 600, 200));
    expect(calls.use).toBe(1);
    expect(calls.breaking).toEqual([]);
  });

  it('dejar el dedo quieto rompe, y se puede mirar sin dejar de romper', () => {
    const { look, looks, calls } = setup();
    look.dispatchEvent(touchEvent('touchstart', 1, 600, 200));
    vi.advanceTimersByTime(HOLD_MS + 10);
    expect(calls.breaking).toEqual([true]);
    look.dispatchEvent(touchEvent('touchmove', 1, 640, 200));
    look.dispatchEvent(touchEvent('touchmove', 1, 660, 210));
    expect(looks.length).toBeGreaterThan(0);
    expect(calls.breaking).toEqual([true]);
    look.dispatchEvent(touchEvent('touchend', 1, 660, 210));
    expect(calls.breaking).toEqual([true, false]);
    expect(calls.use).toBe(0);
  });

  it('arrastrar enseguida solo mira: no rompe ni usa', () => {
    const { look, looks, calls } = setup();
    look.dispatchEvent(touchEvent('touchstart', 1, 600, 200));
    look.dispatchEvent(touchEvent('touchmove', 1, 650, 200));
    look.dispatchEvent(touchEvent('touchmove', 1, 680, 200));
    vi.advanceTimersByTime(HOLD_MS * 3);
    look.dispatchEvent(touchEvent('touchend', 1, 680, 200));
    expect(looks.length).toBeGreaterThan(0);
    expect(calls.breaking).toEqual([]);
    expect(calls.use).toBe(0);
  });

  it('con el dedo en Romper también se mira al arrastrar', () => {
    const { tc, looks, calls } = setup();
    const btn = tc.el.querySelector('.touch-btn.break')!;
    btn.dispatchEvent(touchEvent('touchstart', 2, 700, 300));
    btn.dispatchEvent(touchEvent('touchmove', 2, 720, 290));
    expect(calls.breaking).toEqual([true]);
    expect(looks.length).toBe(1);
    btn.dispatchEvent(touchEvent('touchend', 2, 720, 290));
    expect(calls.breaking).toEqual([true, false]);
  });

  it('la palanca de la izquierda no rompe ni mira', () => {
    const { look, looks, calls, tc } = setup();
    look.dispatchEvent(touchEvent('touchstart', 3, 100, 300));
    vi.advanceTimersByTime(HOLD_MS * 2);
    look.dispatchEvent(touchEvent('touchmove', 3, 100, 260));
    expect(calls.breaking).toEqual([]);
    expect(looks).toEqual([]);
    expect(tc).toBeTruthy();
  });
});
