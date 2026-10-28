// La carta náutica (v4.22): un dibujo del mar con tu isla en el centro y las islas de alrededor. Las que aún no
// has visitado salen tapadas por la niebla, pero se sabe hacia dónde quedan y lo lejos que están.

import { RING_BOAT, RING_NAMES, SEA_TYPES, type SeaIsland, canReach } from './archipelago';
import { type BoatKind, boatModel } from './shipyard';

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Rumbo en palabras (el norte es -z, como en el mapa). */
export function heading(angle: number): string {
  const names = ['este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste'];
  return names[((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8];
}

/** El SVG de la carta: `you` es dónde estás tú (relativo a tu isla), si estás en casa. */
export function chartSvg(
  islands: SeaIsland[], discovered: ReadonlySet<string>, boat: BoatKind | null, you: { x: number; z: number; yaw: number } | null, homeRadius: number,
  places: { id: string; x: number; z: number }[] = [],
): string {
  const S = 400;
  const c = S / 2;
  // Desde la v5.1 las islas están en el mismo mar: si se sabe dónde, se dibujan a escala (y tú también).
  const far = Math.max(1, ...places.map((p) => Math.hypot(p.x, p.z)));
  const k = places.length ? 168 / far : 0;
  const ringR = (r: number) => 60 + r * 42;
  const where = (i: SeaIsland): [number, number] => {
    const p = places.find((o) => o.id === i.id);
    return p ? [c + p.x * k, c + p.z * k] : [c + Math.cos(i.angle) * ringR(i.ring), c + Math.sin(i.angle) * ringR(i.ring)];
  };
  const home = places.length ? Math.max(16, homeRadius * k * 0.75) : 26;
  const parts: string[] = [`<rect width="${S}" height="${S}" fill="#3a8fc4"/>`];
  if (!places.length) for (let r = 1; r <= 3; r++) parts.push(`<circle cx="${c}" cy="${c}" r="${ringR(r)}" fill="none" stroke="#cfe8f6" stroke-opacity=".35" stroke-dasharray="4 6"/>`);
  parts.push(`<circle cx="${c}" cy="${c}" r="${home + 8}" fill="#e8d9a0"/><circle cx="${c}" cy="${c}" r="${home}" fill="#6aa84f"/><text x="${c}" y="${c + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Casa</text>`);
  for (const i of islands) {
    const [x, y] = where(i);
    const seen = discovered.has(i.id);
    const reach = boat ? canReach(boat, i) : false;
    // Rumbo desde casa.
    const a = Math.atan2(y - c, x - c);
    parts.push(`<line x1="${c + Math.cos(a) * (home + 10)}" y1="${c + Math.sin(a) * (home + 10)}" x2="${x}" y2="${y}" stroke="#fff" stroke-opacity="${reach ? 0.5 : 0.15}" stroke-dasharray="2 5"/>`);
    if (seen) {
      parts.push(`<circle cx="${x}" cy="${y}" r="14" fill="#e8d9a0"/><circle cx="${x}" cy="${y}" r="10" fill="#7cc46a"/>`);
      parts.push(`<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13">${SEA_TYPES[i.type].icon}</text>`);
      parts.push(`<text x="${x}" y="${y + 28}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${esc(i.name)}</text>`);
    } else {
      parts.push(`<circle cx="${x}" cy="${y}" r="16" fill="#dfe8ee" fill-opacity=".75"/><circle cx="${x + 9}" cy="${y - 4}" r="10" fill="#dfe8ee" fill-opacity=".75"/><text x="${x + 3}" y="${y + 6}" text-anchor="middle" font-size="16" font-weight="700" fill="#5a6a78">?</text>`);
    }
  }
  if (you) {
    // Tu barco o tú: un punto con una flecha hacia donde miras.
    const kk = places.length ? k : 34 / Math.max(1, homeRadius);
    const d = Math.hypot(you.x, you.z) * kk;
    const a = Math.atan2(you.z, you.x);
    const px = c + Math.cos(a) * Math.min(d, 190);
    const py = c + Math.sin(a) * Math.min(d, 190);
    const fx = -Math.sin(you.yaw);
    const fz = -Math.cos(you.yaw);
    parts.push(`<line x1="${px}" y1="${py}" x2="${px + fx * 16}" y2="${py + fz * 16}" stroke="#ff5a4a" stroke-width="3"/><circle cx="${px}" cy="${py}" r="5" fill="#ff5a4a" stroke="#fff" stroke-width="2"/>`);
  }
  parts.push(`<text x="${c}" y="16" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">N</text>`);
  return `<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Carta náutica">${parts.join('')}</svg>`;
}

/** La lista de debajo de la carta: rumbo, distancia, tipo y si tu barco llega. */
export function chartList(islands: SeaIsland[], discovered: ReadonlySet<string>, boat: BoatKind | null): string {
  return [...islands].sort((a, b) => a.ring - b.ring).map((i) => {
    const seen = discovered.has(i.id);
    const need = boatModel(RING_BOAT[i.ring]).name.toLowerCase();
    const reach = boat && canReach(boat, i) ? '✔️ tu barco llega' : `hace falta ${need} o mejor`;
    const what = seen ? `${SEA_TYPES[i.type].icon} <b>${esc(i.name)}</b> · ${SEA_TYPES[i.type].name.toLowerCase()}` : '☁️ <b>Isla sin explorar</b>';
    return `<li>${what} <small>· al ${heading(i.angle)} · ${RING_NAMES[i.ring].toLowerCase()} · ${reach}</small></li>`;
  }).join('');
}
