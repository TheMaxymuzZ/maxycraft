import { type Message, parseMessage } from './protocol';

/**
 * Cómo viajan los mensajes entre jugadores. Hoy hay un canal entre pestañas del mismo navegador
 * (para probar) y uno en memoria (para las pruebas automáticas); en la v2.11 llega la conexión
 * directa entre ordenadores (WebRTC), con esta misma forma.
 */
export interface Transport {
  readonly selfId: string;
  /** Envía a un jugador concreto o, sin destinatario, a todos. */
  send(msg: Message, to?: string): void;
  onMessage(cb: (msg: Message, from: string) => void): void;
  close(): void;
}

interface Envelope {
  from: string;
  to?: string;
  msg: unknown;
}

/** Canal entre pestañas del mismo navegador: abre el juego dos veces y os veréis. */
export class TabTransport implements Transport {
  private channel: BroadcastChannel;
  private handlers: ((msg: Message, from: string) => void)[] = [];

  constructor(readonly selfId: string, room = 'maxycraft-red') {
    this.channel = new BroadcastChannel(room);
    this.channel.onmessage = (e: MessageEvent<Envelope>) => {
      const env = e.data;
      if (!env || typeof env.from !== 'string' || env.from === selfId) return;
      if (env.to && env.to !== selfId) return;
      const msg = parseMessage(env.msg);
      if (msg) for (const h of this.handlers) h(msg, env.from);
    };
  }

  send(msg: Message, to?: string) {
    this.channel.postMessage({ from: this.selfId, to, msg } satisfies Envelope);
  }

  onMessage(cb: (msg: Message, from: string) => void) {
    this.handlers.push(cb);
  }

  close() {
    this.channel.close();
  }
}

/** Varios jugadores en memoria, para las pruebas. Los mensajes llegan al momento y en orden. */
export class MemoryHub {
  private members = new Map<string, MemoryTransport>();

  connect(id: string): MemoryTransport {
    const t = new MemoryTransport(id, this);
    this.members.set(id, t);
    return t;
  }

  deliver(from: string, msg: Message, to?: string) {
    // Se copia como lo haría la red, y se valida igual que un mensaje de verdad.
    const copy = parseMessage(JSON.parse(JSON.stringify(msg)));
    if (!copy) return;
    for (const [id, m] of this.members) if (id !== from && (!to || to === id)) m.receive(copy, from);
  }

  leave(id: string) {
    this.members.delete(id);
  }
}

export class MemoryTransport implements Transport {
  private handlers: ((msg: Message, from: string) => void)[] = [];

  constructor(readonly selfId: string, private hub: MemoryHub) {}

  send(msg: Message, to?: string) {
    this.hub.deliver(this.selfId, msg, to);
  }

  onMessage(cb: (msg: Message, from: string) => void) {
    this.handlers.push(cb);
  }

  receive(msg: Message, from: string) {
    for (const h of this.handlers) h(msg, from);
  }

  close() {
    this.hub.leave(this.selfId);
  }
}
