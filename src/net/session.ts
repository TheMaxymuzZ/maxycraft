import { type WorldAction, WorldSync } from './actions';
import { type Gesture, type GiftItem, MAX_CHAT, MAX_PLAYERS, type Message, PROTOCOL, type PeerInfo, type Pose, type Snapshot } from './protocol';
import type { Transport } from './transport';
import type { ClockSave } from '../clock';
import type { PlayerHome } from '../homes';
import type { VillagerState } from '../villagers';

/** Veces por segundo que cada jugador cuenta dónde está. */
export const POSE_RATE = 10;
/** Un jugador que no da señales en este tiempo se da por ido. */
export const PEER_TIMEOUT = 10_000;
/** Cada cuánto se vuelve a llamar a la puerta mientras no contesta el anfitrión. */
const KNOCK_EVERY = 1500;

export interface SessionEvents {
  join?(peer: PeerInfo): void;
  leave?(peer: PeerInfo): void;
  pose?(id: string, pose: Pose): void;
  chat?(peer: PeerInfo, text: string): void;
  gesture?(peer: PeerInfo, g: Gesture): void;
  /** Otro jugador te ha regalado algo. */
  gift?(peer: PeerInfo, item: GiftItem): void;
  /** Se acabó la partida en la isla del anfitrión: la ha cerrado él (`deliberate`) o se ha cortado la conexión. */
  closed?(deliberate: boolean): void;
  /** El anfitrión se va de viaje y se lleva a todos. */
  travel?(text: string): void;
  /** Alguien se ha metido en la cama (o se ha levantado, con null). */
  bed?(id: string, wake: number | null): void;
  /** El anfitrión ha dado casa a alguien. */
  home?(home: PlayerHome): void;
  /** Llega el reloj del anfitrión; `slept` si se acaba de dormir todo el mundo. */
  time?(clock: ClockSave, slept: boolean): void;
  /** Dónde están los vecinos del anfitrión (v4.8). */
  villagers?(states: VillagerState[]): void;
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
  private detach: (() => void) | null = null;
  /** El invitado ya sabe que se acabó la partida (para avisar una sola vez). */
  private ended = false;
  private poseTimer = 0;
  private started = false;
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
      // Con la conexión directa, el anfitrión tarda un poco en aparecer: se llama a la puerta hasta que conteste.
      const knock = setInterval(() => {
        if (!done) transport.send({ t: 'hola', v: PROTOCOL, peer: self });
      }, KNOCK_EVERY);
      const finish = () => {
        done = true;
        clearTimeout(timer);
        clearInterval(knock);
      };
      const timer = setTimeout(() => {
        if (done) return;
        finish();
        reject(new Error('No hay ninguna isla abierta con ese código'));
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
          finish();
          reject(new Error(msg.reason));
        }
        if (msg.t !== 'bienvenida') return;
        finish();
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
    this.detach = sync.onAction((a) => {
      const msg: Message = { t: 'accion', from: this.self.id, a };
      if (this.role === 'anfitrion') this.transport.send(msg);
      else if (this.hostId) this.transport.send(msg, this.hostId);
    });
  }

  /** Cada fotograma: cuenta dónde estás y da por idos a los que llevan rato sin dar señales. */
  update(now: number, pose: Pose) {
    // La primera vez, el reloj empieza ahora: si entrar ha tardado más que PEER_TIMEOUT (buscando la isla por
    // internet), los que ya estaban no se dan por idos nada más llegar (v4.3).
    if (!this.started) {
      this.started = true;
      for (const p of this.peers.values()) p.seen = now;
    }
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

  gesture(g: Gesture) {
    this.broadcast({ t: 'gesto', id: this.self.id, g });
  }

  /** Regala algo a otro jugador. El invitado se lo da al anfitrión, que lo lleva a quien sea. */
  give(to: string, item: GiftItem) {
    const msg: Message = { t: 'regalo', from: this.self.id, to, item };
    if (this.role === 'anfitrion') this.transport.send(msg, to);
    else if (this.hostId) this.transport.send(msg, this.hostId);
  }

  /** Te metes en la cama (o te levantas, con null). */
  bed(wake: number | null) {
    this.broadcast({ t: 'cama', id: this.self.id, wake });
  }

  /** El anfitrión cuenta a todos dónde vive alguien. */
  sendHome(home: PlayerHome) {
    if (this.role === 'anfitrion') this.transport.send({ t: 'casa', home });
  }

  /** El anfitrión cuenta a todos qué hora es en la isla. */
  sendTime(clock: ClockSave, slept: boolean) {
    if (this.role === 'anfitrion') this.transport.send({ t: 'hora', clock, slept });
  }

  /** El anfitrión cuenta a todos dónde están sus vecinos. */
  sendVillagers(states: VillagerState[]) {
    if (this.role === 'anfitrion' && this.peers.size) this.transport.send({ t: 'vecinos', s: states });
  }

  get hostPeer(): PeerInfo | null {
    return this.hostId ? this.peers.get(this.hostId) ?? null : null;
  }

  /** El anfitrión se va de viaje: avisa a todos para que le sigan cuando vuelva a abrir la isla. */
  travel(text: string) {
    if (this.role === 'anfitrion') this.transport.send({ t: 'viaje', text: text.slice(0, 80) });
  }

  close() {
    if (this.role === 'anfitrion') this.transport.send({ t: 'cierra' });
    this.broadcast({ t: 'sale', id: this.self.id });
    this.detach?.();
    this.transport.close();
  }

  private end(deliberate: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.events.closed?.(deliberate);
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
    else if (id === this.hostId) this.end(false);
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
        // Quien ya está dentro puede seguir llamando un momento: no hace falta mandarle la isla otra vez.
        if (msg.peer.id !== from || this.peers.has(from)) return;
        if (msg.v !== PROTOCOL) {
          this.transport.send({ t: 'rechazo', reason: 'Tu amigo tiene otra versión de Maxycraft. Recargad los dos la página para jugar con la misma' }, from);
          return;
        }
        if (this.peers.size + 1 >= MAX_PLAYERS) {
          this.transport.send({ t: 'rechazo', reason: `La isla está llena (${MAX_PLAYERS} jugadores)` }, from);
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
      case 'gesto':
        if (msg.id !== from || !this.peers.has(from)) return;
        this.events.gesture?.(this.peers.get(from)!, msg.g);
        this.relay(msg, from);
        return;
      case 'regalo':
        if (msg.from !== from || !this.peers.has(from)) return;
        if (msg.to === this.self.id) this.events.gift?.(this.peers.get(from)!, msg.item);
        else if (this.peers.has(msg.to)) this.transport.send(msg, msg.to);
        return;
      case 'sale':
        if (msg.id === from) this.dropPeer(from);
        return;
      case 'cama':
        if (msg.id !== from || !this.peers.has(from)) return;
        this.events.bed?.(from, msg.wake);
        this.relay(msg, from);
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
      case 'gesto': {
        const p = msg.id === this.self.id ? null : this.peers.get(msg.id);
        if (p) this.events.gesture?.(p, msg.g);
        return;
      }
      case 'regalo': {
        const p = this.peers.get(msg.from);
        if (p && msg.to === this.self.id) this.events.gift?.(p, msg.item);
        return;
      }
      case 'cierra':
        this.end(true);
        return;
      case 'cama':
        if (msg.id !== this.self.id) this.events.bed?.(msg.id, msg.wake);
        return;
      case 'hora':
        this.events.time?.(msg.clock, msg.slept);
        return;
      case 'casa':
        this.events.home?.(msg.home);
        return;
      case 'vecinos':
        this.events.villagers?.(msg.s);
        return;
      case 'viaje':
        // Mientras dure el viaje no se da por ido al anfitrión: volverá a abrir la isla con el mismo código.
        this.ended = true;
        this.events.travel?.(msg.text);
        return;
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
