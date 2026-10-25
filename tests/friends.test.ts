import { describe, expect, it } from 'vitest';
import { type FurnitureWorld, type PlacedThing, WorldSync } from '../src/net/actions';
import { inviteLink, newInviteCode, normalizeCode } from '../src/net/code';
import { loadIdentity, renameIdentity } from '../src/net/identity';
import { MAX_PLAYERS, type Message, type PeerInfo, parseMessage } from '../src/net/protocol';
import { type RoomLike, RtcTransport } from '../src/net/rtc';
import { NetSession, type SessionEvents } from '../src/net/session';
import { MemoryHub } from '../src/net/transport';

const peer = (id: string): PeerInfo => ({ id, name: id, color: 0x3366ff });
const snapshot = () => ({ seed: 1, edits: {}, options: {} });

/** Un mundo de mentira con solo muebles (los bloques no hacen falta aquí). */
function fakeWorld() {
  const things: PlacedThing[] = [];
  const furniture: FurnitureWorld = {
    at: (x, y, z) => things.find((f) => f.x === x && f.y === y && f.z === z),
    place: (id, x, y, z, rot, text) => void things.push(text ? { id, x, y, z, rot, text } : { id, x, y, z, rot }),
    remove: (f) => void things.splice(things.indexOf(f), 1),
    known: (id) => id !== 'nave_espacial',
  };
  const blocks = { getBlock: () => 0, setBlock: () => {}, clearEdit: () => {} };
  return { things, sync: new WorldSync(blocks, furniture) };
}

async function party(n: number, events: (id: string) => SessionEvents = () => ({})) {
  const hub = new MemoryHub();
  const hostWorld = fakeWorld();
  const host = NetSession.host(hub.connect('h'), peer('h'), snapshot, events('h'));
  host.attach(hostWorld.sync);
  const guests = [];
  for (let i = 0; i < n; i++) {
    const id = `g${i}`;
    const { session } = await NetSession.join(hub.connect(id), peer(id), events(id));
    const world = fakeWorld();
    session.attach(world.sync);
    guests.push({ session, world });
  }
  return { hub, host, hostWorld, guests };
}

describe('códigos de invitación', () => {
  it('son seis letras fáciles de dictar', () => {
    for (let i = 0; i < 50; i++) {
      const code = newInviteCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect(normalizeCode(code)).toBe(code);
    }
  });

  it('se entienden aunque se escriban en minúsculas o con espacios', () => {
    expect(normalizeCode(' abc-234 ')).toBe('ABC234');
    expect(normalizeCode('ABC23')).toBeNull();
    expect(normalizeCode('ABC0O1')).toBeNull(); // el 0, la O y el 1 no se usan
    expect(inviteLink('ABC234', 'https://maxycraft.app/juego/?pruebared=x#a')).toBe('https://maxycraft.app/juego/?isla=ABC234');
  });
});

describe('tu nombre', () => {
  it('se puede cambiar y se recuerda', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const me = loadIdentity(storage);
    expect(renameIdentity('  Andrés el constructor de islas ', storage).name).toBe('Andrés el constr');
    expect(loadIdentity(storage)).toEqual({ ...me, name: 'Andrés el constr' });
    expect(renameIdentity('   ', storage).name).toBe('Andrés el constr');
  });
});

describe('jugar con amigos (v2.11)', () => {
  it('el invitado llama a la puerta hasta que el anfitrión aparece', async () => {
    const hub = new MemoryHub();
    const joining = NetSession.join(hub.connect('g'), peer('g'), {}, 5000);
    await new Promise((r) => setTimeout(r, 50));
    NetSession.host(hub.connect('h'), peer('h'), snapshot);
    const { session } = await joining;
    expect(session.hostPeer?.id).toBe('h');
  });

  it(`caben ${MAX_PLAYERS} jugadores, contando al anfitrión`, async () => {
    const { hub } = await party(MAX_PLAYERS - 1);
    await expect(NetSession.join(hub.connect('otro'), peer('otro'))).rejects.toThrow(/llena/);
  });

  it('los muebles se ponen, se giran y se quitan para todos', async () => {
    const { hostWorld, guests } = await party(2);
    const [a, b] = guests;
    a.world.sync.placeFurniture('cartel', 3, 20, 4, 0, '  ¡Bienvenidos!  ');
    expect(hostWorld.things).toEqual([{ id: 'cartel', x: 3, y: 20, z: 4, rot: 0, text: '¡Bienvenidos!' }]);
    expect(b.world.things).toEqual(hostWorld.things);
    hostWorld.sync.placeFurniture('cartel', 3, 20, 4, 1, '¡Bienvenidos!');
    expect(a.world.things).toEqual([{ id: 'cartel', x: 3, y: 20, z: 4, rot: 1, text: '¡Bienvenidos!' }]);
    b.world.sync.removeFurniture(3, 20, 4);
    expect(hostWorld.things).toEqual([]);
    expect(a.world.things).toEqual([]);
    // Un mueble que no existe en el juego no se pone.
    a.world.sync.placeFurniture('nave_espacial', 0, 20, 0, 0);
    expect(hostWorld.things).toEqual([]);
  });

  it('los gestos y el chat llegan a todos menos a quien los hace', async () => {
    const seen: string[] = [];
    const { host, guests } = await party(2, (me) => ({
      gesture: (p, g) => seen.push(`${me}<${p.id}:${g}`),
      chat: (p, t) => seen.push(`${me}<${p.id}:${t}`),
    }));
    guests[0].session.gesture('saludo');
    host.say('¡Hola!');
    expect(seen.sort()).toEqual(['g0<h:¡Hola!', 'g1<g0:saludo', 'g1<h:¡Hola!', 'h<g0:saludo']);
  });

  it('los regalos llegan solo a quien se le dan, también entre invitados', async () => {
    const gifts: string[] = [];
    const { host, guests } = await party(2, (me) => ({ gift: (p, item) => gifts.push(`${me}<${p.id}:${item.count}×${item.id}`) }));
    guests[0].session.give('g1', { id: 'manzana', count: 3 });
    guests[1].session.give('h', { id: 'pala', count: 1 });
    host.give('g0', { id: 'billete', count: 2 });
    expect(gifts.sort()).toEqual(['g0<h:2×billete', 'g1<g0:3×manzana', 'h<g1:1×pala']);
    expect(parseMessage({ t: 'regalo', from: 'a', to: 'b', item: { id: 'x', count: 0 } })).toBeNull();
  });

  it('si el anfitrión cierra la isla, los invitados se enteran una sola vez', async () => {
    const closed: boolean[] = [];
    const { host } = await party(2, () => ({ closed: (deliberate) => closed.push(deliberate) }));
    host.close();
    expect(closed).toEqual([true, true]);
  });

  it('un corte de conexión no es lo mismo que cerrar la isla (v3.0)', async () => {
    const closed: boolean[] = [];
    const { hub } = await party(1, () => ({ closed: (deliberate) => closed.push(deliberate) }));
    // El anfitrión desaparece sin despedirse, como cuando se corta internet.
    hub.leave('h');
    hub.connect('h').send({ t: 'sale', id: 'h' });
    expect(closed).toEqual([false]);
  });

  it('al irse de viaje el anfitrión se lleva a todos (v3.0)', async () => {
    const trips: string[] = [];
    const closed: boolean[] = [];
    const { host } = await party(2, (me) => ({ travel: (t) => trips.push(`${me}:${t}`), closed: (d) => closed.push(d) }));
    host.travel('Ana os lleva en avioneta…');
    host.close();
    expect(trips.sort()).toEqual(['g0:Ana os lleva en avioneta…', 'g1:Ana os lleva en avioneta…']);
    // Mientras dura el viaje no se da la partida por terminada.
    expect(closed).toEqual([]);
  });
});

describe('conexión directa', () => {
  /** Dos salas falsas unidas, como dos ordenadores con WebRTC. */
  function pair() {
    const rooms: Record<string, RoomLike & { deliver(data: unknown, from: string): void }> = {};
    const make = (me: string, other: string) => {
      let handler: ((data: unknown, ctx: { peerId: string }) => void) | null = null;
      const room = {
        onPeerJoin: null as ((id: string) => void) | null,
        onPeerLeave: null as ((id: string) => void) | null,
        sent: [] as unknown[],
        makeAction: () => ({
          send: async (data: unknown, opts?: { target?: string | string[] | null }) => {
            if (!opts?.target || opts.target === other) rooms[other].deliver(data, me);
          },
          set onMessage(h: typeof handler) {
            handler = h;
          },
          get onMessage() {
            return handler;
          },
        }),
        leave: async () => rooms[other].onPeerLeave?.(me),
        deliver: (data: unknown, from: string) => handler?.(JSON.parse(JSON.stringify(data)), { peerId: from }),
      };
      rooms[me] = room as unknown as (typeof rooms)[string];
      return room as unknown as RoomLike;
    };
    return { a: new RtcTransport('a', make('a', 'b')), b: new RtcTransport('b', make('b', 'a')) };
  }

  it('manda y recibe mensajes, y descarta los raros', () => {
    const { a, b } = pair();
    const got: [Message, string][] = [];
    b.onMessage((m, from) => got.push([m, from]));
    a.send({ t: 'chat', id: 'a', text: 'hola' });
    a.send({ t: 'chat', id: 'a', text: 'x'.repeat(999) });
    expect(got).toEqual([[{ t: 'chat', id: 'a', text: 'hola' }, 'a']]);
  });

  it('cuando se corta la conexión es como si se despidiera', () => {
    const { a, b } = pair();
    const got: Message[] = [];
    b.onMessage((m) => got.push(m));
    a.close();
    expect(got).toEqual([{ t: 'sale', id: 'a' }]);
  });

  it('una partida entera funciona igual por la conexión directa', async () => {
    const { a, b } = pair();
    const host = NetSession.host(a, peer('a'), snapshot);
    const { session, snapshot: snap } = await NetSession.join(b, peer('b'));
    expect(snap.seed).toBe(1);
    expect([...host.peers.keys()]).toEqual(['b']);
    expect(session.hostPeer?.id).toBe('a');
  });
});
