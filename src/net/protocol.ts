import type { ClockSave } from '../clock';
import { type PlayerHome, isPlayerHome } from '../homes';
import type { Lot } from '../lots';
import type { Guest, VillagerState } from '../villagers';
import type { Edits, WorldOptions } from '../world';
import { type TownSave, isTownSave } from '../townhall';
import { type PlacedThing, type WorldAction, isWorldAction } from './actions';

/** Sube cuando cambian los mensajes: dos versiones distintas del juego no se mezclan. 4: bloques en 16 bits (v4.5). */
export const PROTOCOL = 5;
/** Jugadores a la vez en una isla, contando al anfitrión. */
export const MAX_PLAYERS = 6;
/** Gestos que se pueden hacer a los demás. */
export const GESTURES = ['saludo', 'alegria', 'risa', 'sorpresa', 'corazon', 'sueno'] as const;
export type Gesture = (typeof GESTURES)[number];

/** Algo que se regala a otro jugador. */
export interface GiftItem {
  id: string;
  count: number;
}

/** Quién es cada jugador: un identificador fijo, su nombre y el color de su ropa. */
export interface PeerInfo {
  id: string;
  name: string;
  color: number;
  /** Desde la v4.3: quién es siempre (el id guardado), aunque cada conexión tenga un id distinto. */
  uid?: string;
}

/** Dónde tiene los pies un jugador y hacia dónde mira. */
export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

/** Todo lo necesario para que un invitado vea la misma isla que el anfitrión. */
export interface Snapshot {
  seed: number;
  edits: Edits;
  options: WorldOptions;
  /** Día y hora de la isla del anfitrión (desde la v2.4). */
  clock?: ClockSave;
  /** Desde la v2.11: muebles, y vecinos invitados con sus casas, para ver la misma isla. */
  furniture?: PlacedThing[];
  guests?: Guest[];
  lots?: Lot[];
  /** Desde la v3.0: quien está de vacaciones en la isla misteriosa a la que ha viajado el anfitrión. */
  visitor?: string | null;
  /** Dónde aparece quien entra: al lado del anfitrión. */
  spawn?: [number, number];
  /** Desde la v4.3: las casas de los amigos en esta isla. */
  homes?: PlayerHome[];
  /** Desde la v4.13: el ayuntamiento, para que los invitados vean al alcalde y al urbanista. */
  town?: TownSave;
}

export type Message =
  | { t: 'hola'; v: number; peer: PeerInfo }
  | { t: 'bienvenida'; snapshot: Snapshot; players: PeerInfo[] }
  | { t: 'rechazo'; reason: string }
  | { t: 'entra'; peer: PeerInfo }
  | { t: 'sale'; id: string }
  | { t: 'accion'; from: string; a: WorldAction }
  | { t: 'pose'; id: string; p: Pose }
  | { t: 'chat'; id: string; text: string }
  | { t: 'gesto'; id: string; g: Gesture }
  | { t: 'regalo'; from: string; to: string; item: GiftItem }
  /** El anfitrión cierra la isla a propósito (no es un corte de conexión). */
  | { t: 'cierra' }
  /** El anfitrión se va de viaje en avioneta y se lleva a todos. */
  | { t: 'viaje'; text: string }
  /** Desde la v4.2: alguien se mete en la cama queriendo despertarse a ese minuto del día (null: se levanta). */
  | { t: 'cama'; id: string; wake: number | null }
  /** El reloj del anfitrión, cada poco; `slept` si acaba de saltar porque todos estaban durmiendo. */
  | { t: 'hora'; clock: ClockSave; slept: boolean }
  /** Desde la v4.3: el anfitrión ha dado casa a un amigo (o le recuerda la que ya tenía). */
  | { t: 'casa'; home: PlayerHome }
  /** El anfitrión cuenta dónde están sus vecinos (v4.8). */
  | { t: 'vecinos'; s: VillagerState[] };

export const MAX_CHAT = 140;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 40;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function isPeerInfo(v: unknown): v is PeerInfo {
  return isObj(v) && isId(v.id) && typeof v.name === 'string' && v.name.length <= 24 && Number.isInteger(v.color) && (v.uid === undefined || isId(v.uid));
}

function isPose(v: unknown): v is Pose {
  return isObj(v) && isNum(v.x) && isNum(v.y) && isNum(v.z) && isNum(v.yaw) && isNum(v.pitch);
}

function isSnapshot(v: unknown): v is Snapshot {
  const list = (x: unknown) => x === undefined || Array.isArray(x);
  const spot = (x: unknown) => x === undefined || (Array.isArray(x) && x.length === 2 && x.every(Number.isInteger));
  const homes = v && (v as Record<string, unknown>).homes;
  const town = v && (v as Record<string, unknown>).town;
  if (town !== undefined && !isTownSave(town)) return false;
  return isObj(v) && isNum(v.seed) && isObj(v.edits) && isObj(v.options) && list(v.furniture) && list(v.guests) && list(v.lots) && spot(v.spawn) && (homes === undefined || (Array.isArray(homes) && homes.every(isPlayerHome)));
}

export function isGift(v: unknown): v is GiftItem {
  return isObj(v) && isId(v.id) && Number.isInteger(v.count) && (v.count as number) >= 1 && (v.count as number) <= 999;
}

/** Lee un mensaje recibido. Todo lo que no tenga la forma esperada se descarta. */
export function parseMessage(raw: unknown): Message | null {
  if (!isObj(raw)) return null;
  switch (raw.t) {
    case 'hola':
      return isNum(raw.v) && isPeerInfo(raw.peer) ? (raw as Message) : null;
    case 'bienvenida':
      return isSnapshot(raw.snapshot) && Array.isArray(raw.players) && raw.players.every(isPeerInfo) ? (raw as Message) : null;
    case 'rechazo':
      return typeof raw.reason === 'string' ? (raw as Message) : null;
    case 'entra':
      return isPeerInfo(raw.peer) ? (raw as Message) : null;
    case 'sale':
      return isId(raw.id) ? (raw as Message) : null;
    case 'accion':
      return isId(raw.from) && isWorldAction(raw.a) ? (raw as Message) : null;
    case 'pose':
      return isId(raw.id) && isPose(raw.p) ? (raw as Message) : null;
    case 'chat':
      return isId(raw.id) && typeof raw.text === 'string' && raw.text.length <= MAX_CHAT ? (raw as Message) : null;
    case 'gesto':
      return isId(raw.id) && GESTURES.includes(raw.g as Gesture) ? (raw as Message) : null;
    case 'regalo':
      return isId(raw.from) && isId(raw.to) && isGift(raw.item) ? (raw as Message) : null;
    case 'cierra':
      return raw as Message;
    case 'viaje':
      return typeof raw.text === 'string' && raw.text.length <= 80 ? (raw as Message) : null;
    case 'cama':
      return isId(raw.id) && (raw.wake === null || (isNum(raw.wake) && raw.wake >= 0 && raw.wake < 1440)) ? (raw as Message) : null;
    case 'casa':
      return isPlayerHome(raw.home) ? (raw as Message) : null;
    case 'hora':
      return isObj(raw.clock) && isNum(raw.clock.day) && isNum(raw.clock.minute) && typeof raw.slept === 'boolean' ? (raw as Message) : null;
    case 'vecinos':
      return Array.isArray(raw.s) && raw.s.length <= MAX_VILLAGERS && raw.s.every(isVillagerState) ? (raw as Message) : null;
    default:
      return null;
  }
}

/** Como mucho tantos vecinos en un mensaje (una isla tiene unos diez). */
export const MAX_VILLAGERS = 40;

function isVillagerState(v: unknown): v is VillagerState {
  return isObj(v) && typeof v.n === 'string' && v.n.length <= 24 && isNum(v.x) && isNum(v.y) && isNum(v.z) && isNum(v.f) && typeof v.v === 'boolean' && typeof v.w === 'boolean' && (v.b === undefined || typeof v.b === 'boolean');
}
