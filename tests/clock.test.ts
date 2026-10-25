import { describe, expect, it } from 'vitest';
import { dailyRandom, dayKey, gameDate, timeOverrides } from '../src/clock';

describe('reloj del juego', () => {
  it('sin cambios usa la hora real', () => {
    const now = new Date(2026, 9, 25, 9, 30);
    expect(gameDate(timeOverrides(new URLSearchParams('')), now).getTime()).toBe(now.getTime());
  });

  it('?hora= y ?fecha= cambian la hora y el día', () => {
    const d = gameDate(timeOverrides(new URLSearchParams('hora=21.5&fecha=2026-12-24')), new Date(2026, 9, 25, 9));
    expect([d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([11, 24, 21, 30]);
  });

  it('ignora una hora que no es un número', () => {
    expect(timeOverrides(new URLSearchParams('hora=tarde')).hour).toBeNull();
  });

  it('escribe el día como AAAA-MM-DD', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('el azar diario se repite el mismo día y cambia al siguiente', () => {
    const a = dailyRandom(123, '2026-10-25');
    const b = dailyRandom(123, '2026-10-25');
    const c = dailyRandom(123, '2026-10-26');
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(c()).not.toBe(first[0]);
    for (const n of first) expect(n).toBeGreaterThanOrEqual(0), expect(n).toBeLessThan(1);
  });
});
