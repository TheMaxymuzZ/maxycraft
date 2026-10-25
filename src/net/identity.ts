import type { PeerInfo } from './protocol';

const KEY = 'maxycraft-jugador';
/** Colores de ropa para distinguir a cada jugador. */
export const PLAYER_COLORS = [0xe0533d, 0x3d8fe0, 0xf2b630, 0x5aa832, 0xb05ad6, 0xf07aa8, 0x2fb5a8, 0xf08a3d];

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Quién eres en las partidas con amigos. Se guarda para que tu nombre y color no cambien. */
export function loadIdentity(storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage()): PeerInfo {
  try {
    const raw = storage?.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as PeerInfo;
      if (typeof p.id === 'string' && typeof p.name === 'string' && Number.isInteger(p.color)) return p;
    }
  } catch {
    // Si no se puede leer, se crea uno nuevo.
  }
  const id = randomId();
  const me: PeerInfo = {
    id,
    name: `Jugador ${Math.floor(1000 + Math.random() * 9000)}`,
    color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
  };
  try {
    storage?.setItem(KEY, JSON.stringify(me));
  } catch {
    // Sin guardar: valdrá para esta partida.
  }
  return me;
}

/** En cada pestaña de prueba hace falta un jugador distinto aunque compartan navegador. */
export function tabIdentity(base: PeerInfo): PeerInfo {
  return { ...base, id: `${base.id}-${randomId().slice(0, 4)}` };
}

function safeStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}
