import { describe, expect, it } from 'vitest';
import { parseMessage } from '../src/net/protocol';
import { Beds, earliestWake, hourText, minutesUntil, wakeClock } from '../src/sleep';

describe('dormir (v4.2)', () => {
  it('cuenta los minutos hasta la próxima vez que sea esa hora', () => {
    expect(minutesUntil(22 * 60, 8 * 60)).toBe(10 * 60);
    expect(minutesUntil(6 * 60, 8 * 60)).toBe(2 * 60);
    // A la misma hora: hasta mañana.
    expect(minutesUntil(8 * 60, 8 * 60)).toBe(24 * 60);
  });

  it('al dormir por la noche se pasa al día siguiente', () => {
    expect(wakeClock({ day: 3, minute: 22 * 60 }, 8 * 60)).toEqual({ day: 4, minute: 480, newDay: true });
    expect(wakeClock({ day: 3, minute: 13 * 60 }, 18 * 60)).toEqual({ day: 3, minute: 1080, newDay: false });
  });

  it('con amigos os despertáis a la hora más temprana que haya elegido alguien', () => {
    expect(earliestWake(23 * 60, [8 * 60, 6 * 60, 12 * 60])).toBe(6 * 60);
    // A las 7 de la mañana, las 6 de mañana quedan más lejos que las 8 de hoy.
    expect(earliestWake(7 * 60, [6 * 60, 8 * 60])).toBe(8 * 60);
  });

  it('el reloj solo salta cuando están todos en la cama', () => {
    const beds = new Beds();
    beds.set('ana', 8 * 60);
    expect(beds.ready(['ana', 'leo'], 22 * 60)).toBeNull();
    beds.set('leo', 7 * 60);
    expect(beds.ready(['ana', 'leo'], 22 * 60)).toBe(7 * 60);
    // Si alguien se levanta, ya no.
    beds.set('leo', null);
    expect(beds.ready(['ana', 'leo'], 22 * 60)).toBeNull();
    // Si alguien se va de la partida, no se le espera.
    beds.keepOnly(['ana']);
    expect(beds.ready(['ana'], 22 * 60)).toBe(8 * 60);
  });

  it('los mensajes de cama y hora se leen bien y los raros se descartan', () => {
    expect(parseMessage({ t: 'cama', id: 'ana', wake: 480 })).not.toBeNull();
    expect(parseMessage({ t: 'cama', id: 'ana', wake: null })).not.toBeNull();
    expect(parseMessage({ t: 'cama', id: 'ana', wake: 5000 })).toBeNull();
    expect(parseMessage({ t: 'hora', clock: { day: 2, minute: 30 }, slept: true })).not.toBeNull();
    expect(parseMessage({ t: 'hora', clock: { day: 'x', minute: 30 }, slept: true })).toBeNull();
  });

  it('escribe la hora como en el reloj', () => {
    expect(hourText(8 * 60)).toBe('8:00');
    expect(hourText(16 * 60 + 30)).toBe('16:30');
  });
});

describe('dormir con amigos', () => {
  it('el anfitrión se entera de quién se acuesta, los demás también, y la hora llega a todos', async () => {
    const { MemoryHub } = await import('../src/net/transport');
    const { NetSession } = await import('../src/net/session');
    const hub = new MemoryHub();
    const peer = (id: string) => ({ id, name: id, color: 0xff0000 });
    const hostBeds: [string, number | null][] = [];
    const host = NetSession.host(hub.connect('anfi'), peer('anfi'), () => ({ seed: 1, edits: {}, options: {} }), { bed: (id, w) => hostBeds.push([id, w]) });
    const seen: [string, number | null][] = [];
    const times: boolean[] = [];
    const a = await NetSession.join(hub.connect('ana'), peer('ana'), { time: (_c, slept) => times.push(slept) });
    const b = await NetSession.join(hub.connect('leo'), peer('leo'), { bed: (id, w) => seen.push([id, w]) });
    a.session.bed(480);
    expect(hostBeds).toEqual([['ana', 480]]);
    // Leo ve que Ana se ha acostado (el anfitrión se lo cuenta).
    expect(seen).toEqual([['ana', 480]]);
    host.bed(420);
    expect(seen).toContainEqual(['anfi', 420]);
    host.sendTime({ day: 5, minute: 420 }, true);
    expect(times).toEqual([true]);
    b.session.close();
  });
});
