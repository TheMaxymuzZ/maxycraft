// Teclas que se pueden cambiar en las opciones. Se guardan por su código (la tecla física), no por la letra.

export type Action =
  | 'forward' | 'back' | 'left' | 'right' | 'jump' | 'sprint'
  | 'inventory' | 'collection' | 'missions' | 'rotate' | 'sound' | 'help' | 'debug';

export type KeyMap = Record<Action, string>;

export const ACTIONS: { id: Action; name: string; key: string }[] = [
  { id: 'forward', name: 'Andar hacia delante', key: 'KeyW' },
  { id: 'back', name: 'Andar hacia atrás', key: 'KeyS' },
  { id: 'left', name: 'Ir a la izquierda', key: 'KeyA' },
  { id: 'right', name: 'Ir a la derecha', key: 'KeyD' },
  { id: 'jump', name: 'Saltar y nadar', key: 'Space' },
  { id: 'sprint', name: 'Correr', key: 'ShiftLeft' },
  { id: 'inventory', name: 'Bolsillos', key: 'KeyE' },
  { id: 'collection', name: 'Enciclopedia', key: 'KeyC' },
  { id: 'missions', name: 'Tareas', key: 'KeyT' },
  { id: 'rotate', name: 'Girar un mueble', key: 'KeyR' },
  { id: 'sound', name: 'Sonido sí o no', key: 'KeyM' },
  { id: 'help', name: 'Plegar los primeros pasos', key: 'KeyH' },
  { id: 'debug', name: 'Datos de depuración', key: 'KeyF' },
];

/** Teclas que no se pueden usar: la pausa y elegir casilla. */
const RESERVED = /^(Escape|Digit[0-9]|Tab|MetaLeft|MetaRight|OSLeft|OSRight)$/;

export function defaultKeys(): KeyMap {
  return Object.fromEntries(ACTIONS.map((a) => [a.id, a.key])) as KeyMap;
}

export function canBind(code: string): boolean {
  return !!code && !RESERVED.test(code);
}

/** Corrige un mapa de teclas guardado: lo que falte o no valga vuelve a su tecla de siempre, sin repetidas. */
export function normalizeKeys(raw: unknown): KeyMap {
  const out = defaultKeys();
  if (!raw || typeof raw !== 'object') return out;
  const used = new Set<string>();
  for (const a of ACTIONS) {
    const k = (raw as Record<string, unknown>)[a.id];
    if (typeof k === 'string' && canBind(k) && !used.has(k)) out[a.id] = k;
    used.add(out[a.id]);
  }
  // Si al corregir quedó alguna repetida, se devuelve todo a lo de siempre.
  return new Set(Object.values(out)).size === ACTIONS.length ? out : defaultKeys();
}

/** Pone `code` a una acción. Si otra acción ya la tenía, se intercambian. */
export function bindKey(map: KeyMap, action: Action, code: string): KeyMap {
  const next = { ...map };
  const other = ACTIONS.find((a) => next[a.id] === code && a.id !== action);
  if (other) next[other.id] = next[action];
  next[action] = code;
  return next;
}

const NAMES: Record<string, string> = {
  Space: 'Espacio', ShiftLeft: 'Mayús izq.', ShiftRight: 'Mayús der.', ControlLeft: 'Ctrl izq.', ControlRight: 'Ctrl der.',
  AltLeft: 'Alt', AltRight: 'Alt Gr', Enter: 'Intro', Backspace: 'Borrar', CapsLock: 'Bloq Mayús',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Semicolon: 'Ñ', Quote: '´', BracketLeft: '`', BracketRight: '+',
  Backslash: 'Ç', Comma: ',', Period: '.', Slash: '-', Minus: "'", Equal: '¡', Backquote: 'º', IntlBackslash: '<',
};

/** Nombre corto de una tecla para enseñarlo (con la distribución española). */
export function keyLabel(code: string): string {
  if (NAMES[code]) return NAMES[code];
  const m = /^(Key|Digit|Numpad)(.+)$/.exec(code);
  if (m) return m[1] === 'Numpad' ? `Num ${m[2]}` : m[2];
  return code;
}
