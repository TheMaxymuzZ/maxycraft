import { describe, expect, it, vi } from 'vitest';
import { MAX_TOASTS, Notices } from '../src/notices';

describe('avisos (v3.4)', () => {
  const shown = (el: HTMLElement) => [...el.querySelectorAll('.toast:not(.leaving)')].map((t) => t.textContent);

  it('se apilan sin borrarse unos a otros', () => {
    const el = document.createElement('div');
    const n = new Notices(el);
    n.show('Has fabricado: hacha');
    n.show('¡Ha llegado el otoño!');
    expect(shown(el)).toEqual(['Has fabricado: hacha', '¡Ha llegado el otoño!']);
  });

  it('el mismo aviso repetido se cuenta en vez de salir otra vez', () => {
    const el = document.createElement('div');
    const n = new Notices(el);
    for (let i = 0; i < 3; i++) n.show('Has conseguido: manzana');
    expect(shown(el)).toEqual(['Has conseguido: manzana×3']);
  });

  it(`como mucho ${MAX_TOASTS} a la vez: se va el más viejo`, () => {
    const el = document.createElement('div');
    const n = new Notices(el);
    for (let i = 1; i <= MAX_TOASTS + 1; i++) n.show(`aviso ${i}`);
    expect(shown(el)).toEqual(['aviso 2', 'aviso 3', 'aviso 4']);
  });

  it('se van solos al rato', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    new Notices(el).show('Hola');
    vi.advanceTimersByTime(6000);
    expect(el.children.length).toBe(0);
    vi.useRealTimers();
  });
});
