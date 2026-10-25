import type { Edits, WorldOptions } from '../world';
import { type WorldAction, isWorldAction } from './actions';

/** Sube cuando cambian los mensajes: dos versiones distintas del juego no se mezclan. */
export const PROTOCOL = 1;

/** Quién es cada jugador: un identificador fijo, su nombre y el color de su ropa. */
export interface PeerInfo {
  id: string;
  name: string;
  color: number;
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
}

export type Message =
  | { t: 'hola'; v: number; peer: PeerInfo }
  | { t: 'bienvenida'; snapshot: Snapshot; players: PeerInfo[] }
  | { t: 'rechazo'; reason: string }
  | { t: 'entra'; peer: PeerInfo }
  | { t: 'sale'; id: string }
  | { t: 'accion'; from: string; a: WorldAction }
  | { t: 'pose'; id: string; p: Pose }
  | { t: 'chat'; id: string; text: string };

export const MAX_CHAT = 140;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 40;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function isPeerInfo(v: unknown): v is PeerInfo {
  return isObj(v) && isId(v.id) && typeof v.name === 'string' && v.name.length <= 24 && Number.isInteger(v.color);
}

function isPose(v: unknown): v is Pose {
  return isObj(v) && isNum(v.x) && isNum(v.y) && isNum(v.z) && isNum(v.yaw) && isNum(v.pitch);
}

function isSnapshot(v: unknown): v is Snapshot {
  return isObj(v) && isNum(v.seed) && isObj(v.edits) && isObj(v.options);
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
    default:
      return null;
  }
}
