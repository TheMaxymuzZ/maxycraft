import { type WorldAction, WorldSync } from './actions';
import { MAX_CHAT, type Message, PROTOCOL, type PeerInfo, type Pose, type Snapshot } from './protocol';
import type { Transport } from './transport';

/** Veces por segundo que cada jugador cuenta dónde está. */
export const POSE_RATE = 10;
/** Un jugador que no da señales en este tiempo se da por ido. */
export const PEER_TIMEOUT = 10_000;

export interface SessionEvents {
  join?(peer: PeerInfo): void;
  leave?(peer: PeerInfo): void;
  pose?(id: string, pose: Pose): void;
  chat?(peer: PeerInfo, text: string): void;
}

interface Peer extends PeerInfo {
  seen: number;
}

/**
 * Partida con amigos. El anfitrión manda: su isla es la de verdad. Los invitados le envían
 * sus cambios, él los comprueba, los aplica y los reparte al resto.
 */
export class NetSession {
  readonly peers = new Map<string, Peer>();
  private sync: WorldSync | null = null;
  private poseTimer = 0;
  private now = 0;
  private hostId: string | null;

  private constructor(
    readonly role: 'anfitrion' | 'invitado',
    private transport: Transport,
    readonly self: PeerInfo,
    private events: SessionEvents,
    private snapshot: (() => Snapshot) | null,
    hostId: string | null,
  ) {
    this.hostId = hostId;
    transport.onMessage((msg, from) => this.handle(msg, from));
  }

  /** Abre la isla para que entren otros. */
  static host(transport: Transport, self: PeerInfo, snapshot: () => Snapshot, events: SessionEvents = {}): NetSession {
    return new NetSession('anfitrion', transport, self, events, snapshot, null);
  }

  /** Pide entrar en la isla de un anfitrión y espera a que mande la isla. */
  static join(transport: Transport, self: PeerInfo, events: SessionEvents = {}, timeoutMs = 8000): Promise<{ session: NetSession; snapshot: Snapshot }> {
    return new Promise((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        reject(new Error('No hay ninguna isla abierta'));
      }, timeoutMs);
      const waiting: Transport = {
        selfId: transport.selfId,
        send: (m, to) => transport.send(m, to),
        close: () => transport.close(),
        onMessage: () => {},
      };
      transport.onMessage((msg, from) => {
        if (done) return;
        if (msg.t === 'rechazo') {
          done = true;
          clearTimeout(timer);
          reject(new Error(msg.reason));
        }
        if (msg.t !== 'bienvenida') return;
        done = true;
        clearTimeout(timer);
        const session = new NetSession('invitado', waiting, self, events, null, from);
        // A partir de aquí los mensajes los atiende la sesión.
        transport.onMessage((m, f) => session.handle(m, f));
        for (const p of msg.players) if (p.id !== self.id) session.addPeer(p);
        resolve({ session, snapshot: msg.snapshot });
      });
      transport.send({ t: 'hola', v: PROTOCOL, peer: self });
    });
  }

  /** Conecta la sesión con el mundo: los cambios propios salen y los de fuera entran. */
  attach(sync: WorldSync) {
    this.sync = sync;
    sync.onAction((a) => {
      const msg: Message = { t: 'accion', from: this.self.id, a };
      if (this.role === 'anfitrion') this.transport.send(msg);
      else if (this.hostId) this.transport.send(msg, this.hostId);
    });
  }

  /** Cada fotograma: cuenta dónde estás y da por idos a los que llevan rato sin dar señales. */
  update(now: number, pose: Pose) {
    this.now = now;
    if (now - this.poseTimer >= 1000 / POSE_RATE) {
      this.poseTimer = now;
      this.broadcast({ t: 'pose', id: this.self.id, p: pose });
    }
    for (const p of [...this.peers.values()]) {
      if (now - p.seen > PEER_TIMEOUT && (this.role === 'anfitrion' || p.id === this.hostId)) this.dropPeer(p.id);
    }
  }

  say(text: string) {
    const clean = text.trim().slice(0, MAX_CHAT);
    if (clean) this.broadcast({ t: 'chat', id: this.self.id, text: clean });
  }

  close() {
    this.broadcast({ t: 'sale', id: this.self.id });
    this.transport.close();
  }

  /** El invitado habla solo con el anfitrión, que reparte; el anfitrión habla con todos. */
  private broadcast(msg: Message) {
    if (this.role === 'anfitrion') this.transport.send(msg);
    else if (this.hostId) this.transport.send(msg, this.hostId);
  }

  private addPeer(p: PeerInfo) {
    if (this.peers.has(p.id)) return;
    this.peers.set(p.id, { ...p, seen: this.now });
    this.events.join?.(p);
  }

  private dropPeer(id: string) {
    const p = this.peers.get(id);
    if (!p) return;
    this.peers.delete(id);
    this.events.leave?.(p);
    if (this.role === 'anfitrion') this.transport.send({ t: 'sale', id });
  }

  private handle(msg: Message, from: string) {
    const peer = this.peers.get(from);
    if (peer) peer.seen = this.now;
    if (this.role === 'anfitrion') this.handleAsHost(msg, from);
    else if (from === this.hostId) this.handleAsGuest(msg);
  }

  private handleAsHost(msg: Message, from: string) {
    switch (msg.t) {
      case 'hola': {
        if (msg.peer.id !== from) return;
        if (msg.v !== PROTOCOL) {
          this.transport.send({ t: 'rechazo', reason: 'El anfitrión tiene otra versión del juego' }, from);
          return;
        }
        const players = [this.self, ...[...this.peers.values()].map(({ id, name, color }) => ({ id, name, color }))];
        this.transport.send({ t: 'bienvenida', snapshot: this.snapshot!(), players }, from);
        // Los demás se enteran de que ha llegado alguien.
        for (const p of this.peers.values()) this.transport.send({ t: 'entra', peer: msg.peer }, p.id);
        this.addPeer(msg.peer);
        return;
      }
      case 'accion':
        // Solo se aceptan cambios de quien de verdad los manda y está en la partida.
        if (msg.from !== from || !this.peers.has(from)) return;
        this.applyRemote(msg.a);
        this.relay(msg, from);
        return;
      case 'pose':
        if (msg.id !== from || !this.peers.has(from)) return;
        this.events.pose?.(from, msg.p);
        this.relay(msg, from);
        return;
      case 'chat':
        if (msg.id !== from || !this.peers.has(from)) return;
        this.events.chat?.(this.peers.get(from)!, msg.text);
        this.relay(msg, from);
        return;
      case 'sale':
        if (msg.id === from) this.dropPeer(from);
        return;
    }
  }

  private handleAsGuest(msg: Message) {
    switch (msg.t) {
      case 'entra':
        if (msg.peer.id !== this.self.id) this.addPeer(msg.peer);
        return;
      case 'sale':
        this.dropPeer(msg.id);
        return;
      case 'accion':
        if (msg.from !== this.self.id) this.applyRemote(msg.a);
        return;
      case 'pose':
        if (msg.id === this.self.id) return;
        if (this.peers.has(msg.id)) this.peers.get(msg.id)!.seen = this.now;
        this.events.pose?.(msg.id, msg.p);
        return;
      case 'chat': {
        const p = this.peers.get(msg.id);
        if (p) this.events.chat?.(p, msg.text);
        return;
      }
    }
  }

  private applyRemote(a: WorldAction) {
    this.sync?.receive(a);
  }

  /** El anfitrión reenvía a todos menos a quien lo mandó. */
  private relay(msg: Message, from: string) {
    for (const p of this.peers.values()) if (p.id !== from) this.transport.send(msg, p.id);
  }
}
