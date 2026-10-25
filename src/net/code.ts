/**
 * Códigos de invitación: seis letras fáciles de dictar (sin I, O, 0 ni 1, que se confunden).
 * El código es el nombre de la sala donde se encuentran los jugadores y también su contraseña.
 */
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export function newInviteCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += LETTERS[Math.floor(random() * LETTERS.length)];
  return code;
}

/** Limpia lo que escribe el jugador: mayúsculas, sin espacios ni guiones. Devuelve null si no es un código válido. */
export function normalizeCode(text: string): string | null {
  const code = text.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== CODE_LENGTH) return null;
  for (const c of code) if (!LETTERS.includes(c)) return null;
  return code;
}

/** Enlace para entrar directamente en la isla con ese código. */
export function inviteLink(code: string, base: string): string {
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  url.searchParams.set('isla', code);
  return url.toString();
}
