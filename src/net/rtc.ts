import { type Message, parseMessage } from './protocol';
import type { Transport } from './transport';

/** Lo que usamos de una sala de Trystero (así las pruebas pueden usar una sala falsa). */
export interface RoomLike {
  makeAction<T>(namespace: string): {
    send(data: T, options?: { target?: string | string[] | null }): Promise<void>;
    onMessage: ((data: T, context: { peerId: string }) => void) | null;
  };
  onPeerJoin: ((peerId: string) => void) | null;
  onPeerLeave: ((peerId: string) => void) | null;
  leave(): Promise<void>;
}

/** Nombre de la aplicación en la red de señalización: solo se encuentran partidas de Maxycraft. */
const APP_ID = 'maxycraft-isla';

/**
 * Conexión directa entre ordenadores (WebRTC). Para encontrarse se usan servidores públicos y gratuitos
 * (Nostr) solo al principio; después todo va de un ordenador a otro, cifrado y sin pasar por ningún servidor.
 */
export class RtcTransport implements Transport {
  private handlers: ((msg: Message, from: string) => void)[] = [];
  private action: ReturnType<RoomLike['makeAction']>;
  /** Jugadores con los que ya hay conexión directa. */
  readonly connected = new Set<string>();

  constructor(readonly selfId: string, private room: RoomLike) {
    this.action = room.makeAction<unknown>('m');
    this.action.onMessage = (data, { peerId }) => {
      const msg = parseMessage(data);
      if (msg) this.emit(msg, peerId);
    };
    room.onPeerJoin = (id) => this.connected.add(id);
    // Si se corta la conexión con alguien, es como si se hubiera despedido.
    room.onPeerLeave = (id) => {
      this.connected.delete(id);
      this.emit({ t: 'sale', id }, id);
    };
  }

  send(msg: Message, to?: string) {
    this.action.send(msg, to ? { target: to } : undefined).catch(() => {
      // Si alguien se acaba de ir, el mensaje se pierde; la partida sigue.
    });
  }

  onMessage(cb: (msg: Message, from: string) => void) {
    this.handlers.push(cb);
  }

  close() {
    void this.room.leave();
  }

  private emit(msg: Message, from: string) {
    for (const h of this.handlers) h(msg, from);
  }
}

/**
 * Entra en la sala del código. Trystero solo se descarga cuando se juega con amigos.
 * `relays`: servidores de señalización propios (para probar sin internet); si no, los públicos de siempre.
 */
export async function openRoom(code: string, relays?: string[]): Promise<RtcTransport> {
  const { joinRoom, selfId } = await import('trystero');
  const room = joinRoom({ appId: APP_ID, password: code, ...(relays?.length ? { relayConfig: { urls: relays } } : {}) }, `isla-${code}`);
  return new RtcTransport(selfId, room as unknown as RoomLike);
}
