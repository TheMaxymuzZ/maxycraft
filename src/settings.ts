// Opciones del jugador: volumen, ratón, calidad gráfica, campo de visión, teclas y accesibilidad. Se guardan en el navegador.

import { DAY_LENGTHS } from './clock';
import { type KeyMap, defaultKeys, normalizeKeys } from './keys';

const KEY = 'maxycraft.ajustes';

export type Quality = 'baja' | 'media' | 'alta';

export interface Settings {
  /** Volumen de 0 a 100. */
  music: number;
  sfx: number;
  /** Multiplicador de la sensibilidad del ratón o del dedo (0,3 a 3). */
  sensitivity: number;
  quality: Quality;
  /** Campo de visión en grados. */
  fov: number;
  /** Teclas de cada acción (desde la v2.0). */
  keys: KeyMap;
  /** Letras y ventanas más grandes. */
  bigText: boolean;
  /** Colores que se distinguen bien con daltonismo (azul y naranja en vez de verde y rojo). */
  colorblind: boolean;
  /** Minutos reales que dura un día de juego; 0 es la hora real (desde la v2.4). */
  dayLength: number;
}

export const QUALITIES: { id: Quality; name: string; hint: string }[] = [
  { id: 'baja', name: 'Baja', hint: 'Se ve menos lejos. Para móviles y ordenadores sencillos.' },
  { id: 'media', name: 'Media', hint: 'Equilibrada.' },
  { id: 'alta', name: 'Alta', hint: 'Se ve muy lejos. Necesita un buen ordenador.' },
];

/** Cuántos trozos de mundo (chunks) se ven alrededor en cada calidad. */
export const RENDER_RADIUS: Record<Quality, number> = { baja: 4, media: 6, alta: 8 };
/** Píxeles por punto de pantalla como máximo: menos es más rápido y algo más borroso. */
export const PIXEL_RATIO: Record<Quality, number> = { baja: 1, media: 1.5, alta: 2 };

export function defaultSettings(touch: boolean): Settings {
  return { music: 70, sfx: 80, sensitivity: 1, quality: touch ? 'baja' : 'media', fov: 75, keys: defaultKeys(), bigText: false, colorblind: false, dayLength: 24 };
}

const clamp = (n: unknown, lo: number, hi: number, fallback: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;

/** Corrige opciones guardadas a medias, de otra versión o tocadas a mano. */
export function normalizeSettings(raw: unknown, touch: boolean): Settings {
  const d = defaultSettings(touch);
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  return {
    music: Math.round(clamp(r.music, 0, 100, d.music)),
    sfx: Math.round(clamp(r.sfx, 0, 100, d.sfx)),
    sensitivity: clamp(r.sensitivity, 0.3, 3, d.sensitivity),
    quality: QUALITIES.some((q) => q.id === r.quality) ? (r.quality as Quality) : d.quality,
    fov: Math.round(clamp(r.fov, 60, 100, d.fov)),
    keys: normalizeKeys(r.keys),
    bigText: r.bigText === true,
    colorblind: r.colorblind === true,
    dayLength: DAY_LENGTHS.some((l) => l.minutes === r.dayLength) ? (r.dayLength as number) : d.dayLength,
  };
}

export function loadSettings(touch: boolean): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return normalizeSettings(raw ? JSON.parse(raw) : null, touch);
  } catch {
    return defaultSettings(touch);
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // no se recuerdan, pero funcionan durante la partida
  }
}
