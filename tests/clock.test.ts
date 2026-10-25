import { describe, expect, it } from 'vitest';
import { GameClock, SEASON_DAYS, YEAR_DAYS, calendarDate, dailyRandom, dayKey, gameDate, timeOverrides } from '../src/clock';
import { holidayOf, seasonOf } from '../src/seasons';

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

describe('calendario de la isla (v2.4)', () => {
  const none = timeOverrides(new URLSearchParams(''));

  it('cada estación dura una semana de juego y no se salta ninguna fiesta', () => {
    expect(YEAR_DAYS).toBe(4 * SEASON_DAYS);
    const seasons = Array.from({ length: YEAR_DAYS }, (_, d) => seasonOf(calendarDate(d, 600)));
    for (let s = 0; s < 4; s++) expect(new Set(seasons.slice(s * SEASON_DAYS, (s + 1) * SEASON_DAYS)).size).toBe(1);
    const holidays = new Set(Array.from({ length: YEAR_DAYS }, (_, d) => holidayOf(calendarDate(d, 600))?.id).filter(Boolean));
    expect([...holidays].sort()).toEqual(['año_nuevo', 'halloween', 'navidad', 'nochevieja', 'san_valentin']);
  });

  it('el día dura los minutos elegidos y luego empieza otro', () => {
    const clock = new GameClock({ day: 0, minute: 0 }, none, 24);
    expect(clock.tick(23 * 60)).toBe(false);
    expect(clock.date().getHours()).toBe(23);
    expect(clock.tick(60)).toBe(true);
    expect(clock.day).toBe(1);
  });

  it('cambia el año al dar la vuelta y los días no se repiten', () => {
    const keys = new Set(Array.from({ length: YEAR_DAYS * 2 }, (_, d) => dayKey(calendarDate(d, 0))));
    expect(keys.size).toBe(YEAR_DAYS * 2);
  });

  it('una partida nueva empieza en la estación de la fecha real', () => {
    const clock = new GameClock(undefined, none, 24, new Date(2026, 9, 25));
    expect(seasonOf(clock.date())).toBe('otoño');
    expect(clock.date().getHours()).toBe(8);
  });

  it('?hora= deja la hora quieta y ?fecha= salta a ese día', () => {
    const clock = new GameClock({ day: 3, minute: 0 }, timeOverrides(new URLSearchParams('hora=21&fecha=2026-12-24')), 24);
    clock.tick(600);
    expect(clock.date().getHours()).toBe(21);
    expect(holidayOf(clock.date())?.id).toBe('navidad');
  });

  it('con "Hora real" usa el reloj del ordenador', () => {
    const now = new Date(2026, 9, 25, 9, 30);
    const clock = new GameClock({ day: 3, minute: 0 }, none, 0);
    expect(clock.date(now).getTime()).toBe(now.getTime());
    expect(clock.tick(1000)).toBe(false);
  });
});
