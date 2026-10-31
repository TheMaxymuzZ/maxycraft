// Cómo es cada animal de tierra (v5.6): sus piezas, sus colores píxel a píxel y sus costumbres.
// Todo en píxeles (16 por bloque), con los pies en y = 0 y mirando hacia +z.
import { type FaunaGeometry, type FaunaHabits, FaunaModel, type Paint, Rig, type V3, blob, buildRig, hash3, mix, tone } from './landFauna';

const BLACK = 0x1c1a1e;
const WHITE = 0xffffff;

/**
 * Ojos a los lados de la cabeza (en x = ±`x`), con su brillo y su párpado (pieza `lid`, que se ve al parpadear).
 * `y0..y1` y `z0..z1`: dónde va el ojo.
 */
function sideEyes(r: Rig, head: string, x: number, y0: number, y1: number, z0: number, z1: number, lid: Paint, iris = BLACK) {
  const lidName = `${head}_lid`;
  if (!r.parts.has(lidName)) r.part(lidName, head, r.parts.get(head)!.pivot, 'lid');
  r.pair(head, iris, [x - 0.2, y0, z0], [x + 0.3, y1, z1], { grain: 0 });
  // El brillo: un puntito blanco arriba y hacia delante.
  const s = Math.min(0.75, (y1 - y0) / 2, (z1 - z0) / 2);
  r.pair(head, WHITE, [x + 0.3, y1 - s, z1 - s], [x + 0.4, y1, z1], { grain: 0 });
  r.pair(lidName, lid, [x - 0.1, y0 - 0.1, z0 - 0.1], [x + 0.55, y1 + 0.1, z1 + 0.1]);
}

/** Ojos en la cara (mirando hacia +z, en z = `z`), centrados en x = ±`x`. */
function frontEyes(r: Rig, head: string, x: number, w: number, y0: number, y1: number, z: number, lid: Paint, iris = BLACK) {
  const lidName = `${head}_lid`;
  if (!r.parts.has(lidName)) r.part(lidName, head, r.parts.get(head)!.pivot, 'lid');
  r.pair(head, iris, [x - w / 2, y0, z - 0.2], [x + w / 2, y1, z + 0.3], { grain: 0 });
  const s = Math.min(0.75, (y1 - y0) / 2, w / 2);
  r.pair(head, WHITE, [x + w / 2 - s, y1 - s, z + 0.3], [x + w / 2, y1, z + 0.4], { grain: 0 });
  r.pair(lidName, lid, [x - w / 2 - 0.1, y0 - 0.1, z - 0.1], [x + w / 2 + 0.1, y1 + 0.1, z + 0.55]);
}

/**
 * Cuatro patas de ancho `w` y alto `h`, en x = ±`x`, delante en z = `zf` y detrás en `zb`. Cada una con su bisagra
 * arriba; se mueven en diagonal (la delantera izquierda con la trasera derecha).
 */
function legs4(r: Rig, x: number, zf: number, zb: number, w: number, h: number, paint: Paint, hoof?: { c: number; h: number }, extra?: (name: string, x: number, z: number, front: boolean) => void) {
  const spots: [number, number, 1 | -1, boolean][] = [[-x, zf, 1, true], [x, zf, -1, true], [-x, zb, -1, false], [x, zb, 1, false]];
  spots.forEach(([lx, lz, side, front], i) => {
    const name = `leg${i}`;
    r.part(name, null, [lx, h, lz], 'leg', side);
    r.box(name, paint, [lx - w / 2, hoof ? hoof.h : 0, lz - w / 2], [lx + w / 2, h, lz + w / 2]);
    if (hoof) r.box(name, hoof.c, [lx - w / 2 - 0.1, 0, lz - w / 2 - 0.1], [lx + w / 2 + 0.1, hoof.h, lz + w / 2 + 0.1], { grain: 0.03 });
    extra?.(name, lx, lz, front);
  });
}

// ─── Granja ────────────────────────────────────────────────────────────────────────────────────────────────

function vaca(): Rig {
  const W = 0xf4f1ea, K = 0x2a2a2e, PINK = 0xf0b0b0;
  // Manchas negras grandes, como una vaca frisona (cada vaca de la especie las tiene en el mismo sitio).
  const holstein: Paint = (x, y, z) => (blob(x, y, z, 5, 3) > 0.22 ? K : W);
  const r = new Rig();
  r.box('body', holstein, [-6, 9, -10], [6, 20, 10]);
  // La ubre, con sus cuatro tetillas.
  r.box('body', PINK, [-2.5, 7, -7], [2.5, 9, -2]);
  for (const tx of [-1.25, 1.25]) for (const tz of [-6, -3.5]) r.box('body', tone(PINK, 0.92), [tx - 0.5, 5.75, tz - 0.5], [tx + 0.5, 7, tz + 0.5]);
  legs4(r, 3.75, 6.5, -6.5, 4, 10, holstein, { c: 0x3a3430, h: 1.5 });
  // Collar y cencerro.
  r.box('body', 0x8a4a2a, [-4.6, 11, 10], [4.6, 12.5, 11.5]);
  r.box('body', 0xe8c040, [-1.5, 8.5, 10.5], [1.5, 11.5, 13]);
  r.box('body', 0xb08a20, [-0.5, 8, 11.25], [0.5, 8.5, 12.25]);
  // Cabeza.
  r.part('head', 'body', [0, 17, 10], 'head');
  r.box('head', (x, y, z) => (x > 0.5 && y > 16.5 && z < 15.5 ? K : W), [-4, 13, 10], [4, 21, 16]);
  r.box('head', W, [-2, 21, 11], [2, 22, 14], { grain: 0.1 });
  r.box('head', PINK, [-3.25, 13, 16], [3.25, 16.75, 18.75]);
  r.pair('head', 0x7a4a4a, [1.25, 15, 18.75], [2.25, 16, 19], { grain: 0 });
  r.box('head', 0xc88a8a, [-2, 13.8, 18.75], [2, 14.2, 18.95], { grain: 0 });
  sideEyes(r, 'head', 4, 17.5, 19.5, 13.5, 15.5, (x) => (x > 0 ? K : W));
  // Cuernos.
  r.pair('head', 0xe8dcc0, [4, 20, 12.5], [6.5, 21.5, 14]);
  r.pair('head', 0xb8a888, [5.5, 21.5, 12.5], [6.5, 23, 14]);
  // Orejas.
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'earL' : 'earR';
    r.part(n, 'head', [s * 4, 19, 12.75], 'ear', s, [0, 0, s * -0.15]);
    r.box(n, s > 0 ? K : W, s < 0 ? [-7.5, 18, 12] : [4, 18, 12], s < 0 ? [-4, 20, 13.5] : [7.5, 20, 13.5]);
    r.box(n, PINK, s < 0 ? [-7, 18.5, 13.5] : [4.5, 18.5, 13.5], s < 0 ? [-4.5, 19.5, 13.7] : [7, 19.5, 13.7], { grain: 0 });
  }
  // Cola con su borla.
  r.part('tail', 'body', [0, 19, -10], 'tail');
  r.box('tail', W, [-0.75, 8, -10.75], [0.75, 19, -9.75]);
  r.box('tail', K, [-1.25, 5.5, -11.25], [1.25, 9, -9.25], { grain: 0.12 });
  return r;
}

function oveja(): Rig {
  const WOOL = 0xf2eee4, FACE = 0x3a3238, HOOF = 0x241e22, PINK = 0xd89aa0;
  // Lana a rizos: claros y sombras pequeñitos.
  const wool: Paint = (x, y, z) => tone(WOOL, 1 + blob(x, y, z, 1.6, 7) * 0.09);
  const r = new Rig();
  r.box('body', wool, [-5.5, 8, -8], [5.5, 18, 9], { grain: 0.08 });
  // Bultitos de lana por el lomo, los lados y detrás, para que se vea esponjosa.
  for (let x = -4; x <= 4; x += 2.7) for (let z = -6.5; z <= 7.5; z += 2.8) {
    const h = hash3(x * 3, 1, z * 3, 11);
    if (h > -0.4) r.box('body', wool, [x - 1.4, 17.5, z - 1.4], [x + 1.4, h > 0.35 ? 19.5 : 18.75, z + 1.4], { grain: 0.08 });
  }
  for (let y = 9.5; y <= 16.5; y += 2.5) for (let z = -6.5; z <= 7.5; z += 2.5) {
    const h = hash3(y * 5, 2, z * 5, 12);
    if (h < -0.2) continue;
    // Cada rizo de un tamaño y un poco movido, para que no parezca una cuadrícula.
    const k = 1 + (h > 0.5 ? 0.6 : 0);
    const dy = hash3(y, z, 3, 13) * 0.8;
    const dz = hash3(z, y, 4, 14) * 0.8;
    r.pair('body', wool, [5, y + dy - k, z + dz - k], [5.5 + k * 0.6, y + dy + k, z + dz + k], { grain: 0.08 });
  }
  for (let x = -3.5; x <= 3.5; x += 3.5) for (let y = 10; y <= 16; y += 3) r.box('body', wool, [x - 1.5, y - 1.5, -9], [x + 1.5, y + 1.5, -7.5], { grain: 0.08 });
  legs4(r, 3, 5.5, -5, 2.5, 8.5, FACE, { c: HOOF, h: 1 }, (n, x, z) => {
    r.box(n, wool, [x - 1.8, 6, z - 1.8], [x + 1.8, 8.5, z + 1.8], { grain: 0.08 });
  });
  r.part('head', 'body', [0, 15, 8], 'head');
  r.box('head', FACE, [-2.75, 11, 8], [2.75, 17, 14]);
  r.box('head', 0x4a4048, [-2, 11, 14], [2, 14, 15.5]);
  r.box('head', 0x2a2226, [-1, 13, 15.5], [1, 14, 15.8], { grain: 0 });
  r.box('head', 0x2a2226, [-0.25, 12, 15.5], [0.25, 13, 15.7], { grain: 0 });
  // Gorro de lana y flequillo.
  r.box('head', wool, [-3.25, 16, 8], [3.25, 19, 12.5], { grain: 0.08 });
  r.box('head', wool, [-2.5, 16, 12.5], [2.5, 17.5, 13.75], { grain: 0.08 });
  sideEyes(r, 'head', 2.75, 14, 15.5, 11.5, 13, FACE, 0x2a1e10);
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'earL' : 'earR';
    r.part(n, 'head', [s * 2.75, 15.5, 10.5], 'ear', s, [0, 0, s * 0.25]);
    r.box(n, FACE, s < 0 ? [-6, 15, 10] : [2.75, 15, 10], s < 0 ? [-2.75, 16.5, 11.5] : [6, 16.5, 11.5]);
    r.box(n, PINK, s < 0 ? [-5.5, 15.25, 11.5] : [3.25, 15.25, 11.5], s < 0 ? [-3.25, 16.25, 11.7] : [5.5, 16.25, 11.7], { grain: 0 });
  }
  r.part('tail', 'body', [0, 15, -8.5], 'tail');
  r.box('tail', wool, [-1.5, 11, -10.5], [1.5, 15.5, -8.5], { grain: 0.08 });
  return r;
}

function gallina(): Rig {
  const W = 0xf8f6ef, SH = 0xe2ddd0, BEAK = 0xf0a020, RED = 0xde3a3a;
  const r = new Rig();
  r.box('body', (_x, y) => (y < 6 ? tone(W, 0.95) : W), [-3, 4, -4], [3, 10, 4]);
  r.box('body', W, [-2.5, 5, 4], [2.5, 9.5, 5]);
  // Plumas de la cola.
  r.part('tail', 'body', [0, 9, -4], 'tail');
  r.box('tail', W, [-2, 8, -6], [2, 12, -4]);
  r.box('tail', SH, [-1.5, 11, -6.5], [1.5, 14, -5]);
  r.box('tail', W, [-1, 13, -7], [1, 15, -6]);
  // Alas pegadas al cuerpo, con las puntas de las plumas más oscuras.
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'wingL' : 'wingR';
    r.part(n, 'body', [s * 3, 9, 0], 'wing', s);
    r.box(n, (_x, y, z) => (y < 6.5 || z < -2.5 ? tone(SH, 0.92) : SH), s < 0 ? [-3.75, 5, -3.5] : [3, 5, -3.5], s < 0 ? [-3, 9, 2.5] : [3.75, 9, 2.5]);
  }
  r.part('head', 'body', [0, 10, 3], 'head');
  r.box('head', W, [-2, 10, 1.5], [2, 15, 5]);
  r.box('head', BEAK, [-1, 12, 5], [1, 13.5, 7], { grain: 0.03 });
  r.box('head', 0xd88a18, [-0.75, 11.5, 5], [0.75, 12, 6.25], { grain: 0 });
  // Cresta con sus picos y la barbilla roja.
  r.box('head', RED, [-0.5, 15, 1.75], [0.5, 16.25, 5]);
  for (const [z0, h] of [[2, 17.5], [3.25, 17.75], [4.25, 17]] as [number, number][]) r.box('head', RED, [-0.5, 16.25, z0], [0.5, h, z0 + 1]);
  r.box('head', RED, [-0.75, 10, 5], [0.75, 12, 5.75]);
  sideEyes(r, 'head', 2, 13, 14, 3, 4, W);
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'legL' : 'legR';
    const x = s * 1.5;
    r.part(n, null, [x, 4, 0], 'leg', s);
    r.box(n, BEAK, [x - 0.5, 0.5, -0.5], [x + 0.5, 4, 0.5], { grain: 0 });
    r.box(n, BEAK, [x - 0.5, 0, -1.5], [x + 0.5, 0.5, 2.5], { grain: 0 });
    r.box(n, BEAK, [x - 1.5, 0, 0.75], [x + 1.5, 0.5, 1.5], { grain: 0 });
  }
  return r;
}

// ─── Salvajes ──────────────────────────────────────────────────────────────────────────────────────────────

function ciervo(): Rig {
  const FUR = 0x9a6a3a, DARK = 0x6e4824, BELLY = 0xe2d2b4, RUMP = 0xf2ece0, ANT = 0xd8c8a0;
  const coat: Paint = (x, y, z) => {
    if (z < -8.3 && y > 15) return RUMP;
    if (y < 13.6) return BELLY;
    if (Math.abs(x) < 1.6 && y > 20.4) return DARK;
    // Motitas blancas por el lomo.
    if (y > 17.5 && Math.abs(x) > 1.6 && hash3(x, y, z, 21) > 0.8) return 0xf0e4cc;
    return FUR;
  };
  const r = new Rig();
  r.box('body', coat, [-4, 13, -9], [4, 21, 8]);
  legs4(r, 2.5, 5.5, -6.5, 2.25, 14, (_x, y) => (y < 5 ? DARK : FUR), { c: 0x2a2420, h: 1.25 }, (n, x, z, front) => {
    // Muslo más ancho arriba.
    r.box(n, FUR, [x - 1.6, 10, z - 1.6], [x + 1.6, 14, z + 1.6]);
    if (!front) r.box(n, FUR, [x - 1.3, 7, z - 1.75], [x + 1.3, 10, z + 0.6]);
  });
  r.part('neck', 'body', [0, 19, 6], 'neck', 0, [0.3, 0, 0]);
  r.box('neck', (_x, _y, _z, n) => (n[2] > 0.5 ? mix(FUR, BELLY, 0.6) : FUR), [-2, 17.5, 4.5], [2, 27, 8.5]);
  r.part('head', 'neck', [0, 27, 7], 'head', 0, [-0.3, 0, 0]);
  r.box('head', FUR, [-2.5, 26, 5.5], [2.5, 30, 10.5]);
  r.box('head', (_x, y) => (y < 27 ? BELLY : 0x8a5c30), [-1.75, 26, 10.5], [1.75, 29, 14]);
  r.box('head', BLACK, [-0.9, 28, 14], [0.9, 29, 14.4], { grain: 0 });
  sideEyes(r, 'head', 2.5, 28, 29.5, 8.5, 10, FUR, 0x1a1210);
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'earL' : 'earR';
    r.part(n, 'head', [s * 2.2, 29.5, 7.5], 'ear', s, [0, 0, s * 0.4]);
    r.box(n, FUR, s < 0 ? [-6, 29, 7] : [2.2, 29, 7], s < 0 ? [-2.2, 31, 8.5] : [6, 31, 8.5]);
    r.box(n, BELLY, s < 0 ? [-5.5, 29.4, 8.5] : [2.6, 29.4, 8.5], s < 0 ? [-2.6, 30.6, 8.75] : [5.5, 30.6, 8.75], { grain: 0 });
    // Astas: rama principal hacia arriba y atrás, con sus puntas.
    const ant: Paint = (_x, y) => (y > 37.5 ? 0xf2ead6 : ANT);
    r.box('head', 0x8a7458, [s * 1.2 - 0.9, 29.8, 6.6], [s * 1.2 + 0.9, 30.6, 8.4]);
    r.rod('head', ant, [s * 1.2, 30, 7.5], [s * 3, 34, 7], 1.3);
    r.rod('head', ant, [s * 3, 34, 7], [s * 5, 37, 6], 1.1);
    r.rod('head', ant, [s * 5, 37, 6], [s * 6, 40.5, 5], 0.9);
    r.rod('head', ant, [s * 3, 34, 7], [s * 3.2, 36.8, 9.6], 0.9);
    r.rod('head', ant, [s * 5, 37, 6], [s * 4.4, 39.8, 8], 0.8);
    r.rod('head', ant, [s * 5.6, 38.5, 5.6], [s * 7.6, 40.2, 6], 0.8);
  }
  r.part('tail', 'body', [0, 20.5, -9], 'tail', 0, [0.2, 0, 0]);
  r.box('tail', (_x, _y, _z, n) => (n[2] < -0.5 ? RUMP : FUR), [-1, 17.5, -10], [1, 20.5, -9]);
  return r;
}

function zorro(): Rig {
  const OR = 0xd8702a, ORD = 0xb4561c, WH = 0xf4ece0, BK = 0x2a2220;
  const coat: Paint = (x, y, z) => ((y < 8.5 && z > -2) || (z > 4.6 && y < 11 && Math.abs(x) < 2) ? WH : y > 11.4 && Math.abs(x) < 1.5 ? ORD : OR);
  const r = new Rig();
  r.box('body', coat, [-3, 6.5, -7], [3, 12, 6]);
  legs4(r, 1.75, 4, -5.5, 2, 7.5, (_x, y) => (y < 4.5 ? BK : OR));
  r.part('head', 'body', [0, 11, 6], 'head');
  r.box('head', (x, y) => (y < 11.6 && Math.abs(x) > 1.5 ? WH : OR), [-3.5, 9.5, 5.5], [3.5, 15, 10.5]);
  r.pair('head', WH, [3.5, 9.5, 6], [4.5, 12, 9.5]);
  r.box('head', (_x, y) => (y < 10.7 ? WH : OR), [-1.5, 9.5, 10.5], [1.5, 12, 14.5]);
  r.box('head', BK, [-0.75, 11, 14.5], [0.75, 12, 15], { grain: 0 });
  frontEyes(r, 'head', 2, 1.5, 12.5, 13.5, 10.5, OR, 0x3a2208);
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'earL' : 'earR';
    r.part(n, 'head', [s * 2.25, 15, 8.25], 'ear', s);
    const X = (a: number) => s * a;
    const lo = (a: number, b: number) => Math.min(X(a), X(b));
    const hi = (a: number, b: number) => Math.max(X(a), X(b));
    r.box(n, OR, [lo(1, 3.5), 15, 7.5], [hi(1, 3.5), 17, 9]);
    r.box(n, OR, [lo(1.5, 3), 17, 7.5], [hi(1.5, 3), 18.5, 9]);
    r.box(n, BK, [lo(1.75, 2.75), 18.5, 7.75], [hi(1.75, 2.75), 19.5, 8.75]);
    r.box(n, WH, [lo(1.5, 3), 15.25, 9], [hi(1.5, 3), 17.5, 9.2], { grain: 0 });
  }
  // La cola grande y peluda, con la punta blanca.
  r.part('tail', 'body', [0, 10.5, -7], 'tail', 0, [-0.55, 0, 0]);
  r.box('tail', OR, [-1.5, 9, -9], [1.5, 12, -7]);
  r.box('tail', (x, y, z) => tone(OR, 1 + blob(x, y, z, 2, 4) * 0.06), [-2.25, 8.25, -14], [2.25, 12.75, -9]);
  r.box('tail', WH, [-2, 8.5, -16.5], [2, 12.5, -14]);
  return r;
}

function conejo(): Rig {
  const BR = 0xb89a7a, BRL = 0xdcc6aa, BRD = 0x8e7052, PNK = 0xf0a8b0;
  const r = new Rig();
  r.box('body', (_x, y, z) => (y < 3 || (z > 2 && y < 5) ? BRL : BR), [-2.5, 1.5, -3], [2.5, 6, 2.5]);
  r.pair('body', BR, [2.5, 1, -3.5], [3, 5, 0.5]);
  r.box('body', 0xfafafa, [-1.25, 3, -4.25], [1.25, 5.5, -3], { grain: 0.1 });
  r.part('head', 'body', [0, 5.5, 2], 'head');
  r.box('head', BR, [-2, 4.5, 1.5], [2, 8.5, 5.5]);
  r.box('head', BRL, [-1.25, 4.5, 5.5], [1.25, 6.5, 6.5]);
  r.box('head', PNK, [-0.5, 6, 6.5], [0.5, 6.75, 6.8], { grain: 0 });
  sideEyes(r, 'head', 2, 6.5, 7.75, 3.5, 4.75, BR, 0x1a1210);
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'earL' : 'earR';
    r.part(n, 'head', [s * 1, 8.5, 3], 'ear', s, [-0.15, 0, s * -0.12]);
    const x0 = s < 0 ? -1.75 : 0.25, x1 = s < 0 ? -0.25 : 1.75;
    r.box(n, (_x, y) => (y > 13 ? BRD : BR), [x0, 8.5, 2.5], [x1, 14, 3.75]);
    r.box(n, PNK, [x0 + 0.25, 9, 3.75], [x1 - 0.25, 13, 4], { grain: 0 });
  }
  for (const s of [-1, 1] as const) {
    const f = s < 0 ? 'leg0' : 'leg1';
    r.part(f, null, [s * 1.25, 3, 2], 'leg', s);
    r.box(f, BRL, [s * 1.25 - 0.5, 0, 1.5], [s * 1.25 + 0.5, 3, 2.75]);
    const b = s < 0 ? 'leg2' : 'leg3';
    r.part(b, null, [s * 2.25, 2, -1.5], 'leg', (-s) as 1 | -1);
    r.box(b, BRL, [s * 2.25 - 0.75, 0, -3], [s * 2.25 + 0.75, 1.5, 1]);
  }
  return r;
}

function cabra(): Rig {
  const GY = 0xd8d0c0, GYD = 0xa89a84, GYB = 0xf2eee6, HORN = 0x6a5a48, HORNL = 0x8a7a64;
  const r = new Rig();
  r.box('body', (x, y) => (Math.abs(x) < 1.25 && y > 16 ? GYD : y < 11.5 ? GYB : GY), [-3.5, 10, -7], [3.5, 17, 6.5]);
  legs4(r, 2, 4.5, -5.5, 2.25, 11, (_x, y, _z, n) => (n[2] > 0.5 && y > 2 ? GYD : GY), { c: 0x3a3430, h: 1 });
  r.part('neck', 'body', [0, 15, 5], 'neck', 0, [0.35, 0, 0]);
  r.box('neck', GY, [-1.75, 14, 4], [1.75, 20.5, 7.5]);
  r.part('head', 'neck', [0, 20, 6], 'head', 0, [-0.35, 0, 0]);
  r.box('head', GY, [-2, 18.5, 5], [2, 22, 9]);
  r.box('head', (_x, y) => (y < 19.3 ? GYB : GY), [-1.5, 18.5, 9], [1.5, 21, 12]);
  r.box('head', 0x5a4a40, [-1, 20, 12], [1, 21, 12.3], { grain: 0 });
  // Perilla.
  r.box('head', GYD, [-0.75, 15.5, 10], [0.75, 18.5, 11.5], { grain: 0.1 });
  // Ojos dorados con la pupila alargada.
  sideEyes(r, 'head', 2, 20, 21.25, 7.25, 8.75, GY, 0xc8a020);
  r.pair('head', BLACK, [2.3, 20.4, 7.25], [2.45, 20.85, 8.75], { grain: 0 });
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'earL' : 'earR';
    r.part(n, 'head', [s * 2, 21, 7], 'ear', s, [0, 0, s * -0.2]);
    r.box(n, GY, s < 0 ? [-4.5, 20.5, 6.5] : [2, 20.5, 6.5], s < 0 ? [-2, 21.5, 7.5] : [4.5, 21.5, 7.5]);
    // Cuernos curvados hacia atrás, con anillos.
    const pts: V3[] = [[s * 1, 21.5, 7], [s * 1.5, 25, 6.2], [s * 2, 27.4, 4], [s * 2.3, 28, 1], [s * 2.4, 26.6, -1.4]];
    for (let i = 0; i < pts.length - 1; i++) r.rod('head', i % 2 ? HORNL : HORN, pts[i], pts[i + 1], 1.7 - i * 0.25);
  }
  r.part('tail', 'body', [0, 16.5, -7], 'tail', 0, [-0.5, 0, 0]);
  r.box('tail', GYD, [-0.75, 16, -9], [0.75, 17.5, -7]);
  return r;
}

function camello(): Rig {
  const CA = 0xc8a060, CAD = 0xa88048, CAL = 0xdcbc84;
  const r = new Rig();
  r.box('body', (_x, y) => (y < 19.5 ? CAL : CA), [-4.5, 18, -9], [4.5, 26, 10]);
  // Joroba.
  r.box('body', CA, [-3.5, 26, -5], [3.5, 29, 4]);
  r.box('body', CA, [-2.5, 29, -3.5], [2.5, 31, 2.5]);
  r.box('body', tone(CA, 1.04), [-1.5, 31, -2], [1.5, 31.5, 1], { grain: 0.03 });
  legs4(r, 2.75, 7, -7, 2.5, 19, CA, undefined, (n, x, z) => {
    r.box(n, CA, [x - 1.75, 13, z - 1.75], [x + 1.75, 19, z + 1.75]);
    r.box(n, CAD, [x - 1.5, 9, z - 1.5], [x + 1.5, 11, z + 1.6]);
    r.box(n, CAD, [x - 1.75, 0, z - 1.5], [x + 1.75, 1, z + 2.5]);
  });
  // Cuello en forma de S: hacia delante y abajo, y luego hacia arriba.
  r.part('neck', 'body', [0, 22, 9.5], 'neck');
  r.rod('neck', CA, [0, 22.5, 9], [0, 20, 15], 4.4);
  r.rod('neck', CA, [0, 19.5, 14.5], [0, 29.5, 17], 3.4);
  r.box('neck', CA, [-1.9, 18.2, 12.8], [1.9, 21.8, 16.4]);
  r.part('head', 'neck', [0, 29, 17], 'head');
  r.box('head', CA, [-2.25, 28, 15], [2.25, 32, 20]);
  r.box('head', CAL, [-1.75, 27.5, 20], [1.75, 30.5, 23.5]);
  r.box('head', CAD, [-1.5, 27, 21.5], [1.5, 27.5, 23.5]);
  r.pair('head', 0x5a4028, [0.6, 29.5, 23.5], [1.4, 30, 23.7], { grain: 0 });
  sideEyes(r, 'head', 2.25, 29.75, 31, 17.25, 18.5, CA, 0x1a1210);
  // Pestañas largas.
  r.pair('head', BLACK, [2.3, 31, 17], [2.7, 31.4, 18.9], { grain: 0 });
  r.pair('head', CA, [2.25, 31.5, 16], [3.25, 32.5, 17]);
  r.part('tail', 'body', [0, 25, -9], 'tail');
  r.rod('tail', CA, [0, 25, -9.2], [0, 17, -10], 1);
  r.box('tail', CAD, [-0.75, 15.5, -10.75], [0.75, 17.5, -9.25], { grain: 0.12 });
  return r;
}

function osoPolar(): Rig {
  const PB = 0xf2f2ec, PBS = 0xdcdad0, PAD = 0x2a2628;
  const r = new Rig();
  const coat: Paint = (x, y, z) => tone(y < 12 ? PBS : PB, 1 + blob(x, y, z, 2.5, 9) * 0.03);
  r.box('body', coat, [-5.5, 10, -10], [5.5, 21, 10]);
  r.box('body', coat, [-4.5, 21, 3], [4.5, 22, 8]);
  legs4(r, 3.25, 6.5, -7, 4.5, 11, coat, undefined, (n, x, z) => {
    for (let i = 0; i < 3; i++) r.box(n, PAD, [x - 1.75 + i * 1.3, 0, z + 2.25], [x - 1.15 + i * 1.3, 0.6, z + 2.6], { grain: 0 });
  });
  r.part('head', 'body', [0, 16, 10], 'head', 0, [0.1, 0, 0]);
  r.box('head', coat, [-3.75, 12.5, 9.5], [3.75, 19, 15.5]);
  r.box('head', PB, [-2.25, 12.5, 15.5], [2.25, 16, 19.5]);
  r.box('head', PAD, [-1.25, 14.5, 19.5], [1.25, 16, 20.2], { grain: 0 });
  r.box('head', PAD, [-1.5, 13.25, 19.5], [1.5, 13.6, 19.7], { grain: 0 });
  frontEyes(r, 'head', 2.4, 1, 16.5, 17.5, 15.5, PB, PAD);
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'earL' : 'earR';
    r.part(n, 'head', [s * 2.75, 19, 12.25], 'ear', s);
    r.box(n, PB, s < 0 ? [-4.25, 19, 11.5] : [1.75, 19, 11.5], s < 0 ? [-1.75, 21, 13] : [4.25, 21, 13]);
    r.box(n, PBS, s < 0 ? [-3.75, 19.25, 13] : [2.25, 19.25, 13], s < 0 ? [-2.25, 20.5, 13.2] : [3.75, 20.5, 13.2], { grain: 0 });
  }
  r.part('tail', 'body', [0, 18, -10], 'tail');
  r.box('tail', PB, [-1.25, 17, -11], [1.25, 19.5, -10]);
  return r;
}

function suricata(): Rig {
  const SU = 0xc8a878, SUD = 0x947650, SUL = 0xe2cca4, BK = 0x2a2018;
  // Quieta está de pie: el cuerpo gira desde la cadera para agacharse al correr.
  const r = new Rig([0, 4, 0]);
  r.box('body', (_x, y, z, n) => (n[2] > 0.5 || z > 1.5 ? SUL : z < -1 && Math.floor(y) % 2 === 0 ? SUD : SU), [-1.75, 4, -1.5], [1.75, 11.5, 2]);
  r.pair('body', SU, [1, 7.5, 1.5], [1.75, 9.5, 2.75]);
  r.pair('body', BK, [1, 7.5, 2.75], [1.75, 8, 3], { grain: 0 });
  r.part('head', 'body', [0, 11.5, 0.5], 'head');
  r.box('head', SU, [-1.75, 11.5, -1], [1.75, 14.5, 2.5]);
  r.box('head', SUL, [-1, 12, 2.5], [1, 13.75, 4.5]);
  r.box('head', BK, [-0.5, 13, 4.5], [0.5, 13.75, 4.8], { grain: 0 });
  // Antifaz oscuro alrededor de los ojos.
  r.pair('head', BK, [1.6, 12.5, 0.75], [1.9, 14, 2.5], { grain: 0 });
  sideEyes(r, 'head', 1.9, 13, 13.9, 1.4, 2.3, SU, 0x0e0a08);
  r.pair('head', BK, [1.75, 13.5, -0.25], [2.25, 14.5, 0.75]);
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'legL' : 'legR';
    const x = s * 1;
    r.part(n, null, [x, 4, 0], 'leg', s);
    r.box(n, SU, [x - 0.75, 0.75, -1], [x + 0.75, 4, 1]);
    r.box(n, SUD, [x - 0.75, 0, -0.5], [x + 0.75, 0.75, 2]);
  }
  r.part('tail', null, [0, 4, -1.5], 'tail');
  r.rod('tail', SU, [0, 4.5, -1.2], [0, 0.6, -6], 1);
  r.rod('tail', BK, [0, 0.7, -5.8], [0, 0.4, -7.5], 0.9);
  return r;
}

// ─── Aves y rana (v5.7) ────────────────────────────────────────────────────────────────────────────────────

interface Songbird {
  back: number;
  belly: number;
  head: number;
  wing: number;
  tip: number;
  beak: number;
  /** Colores especiales de la cabeza y el pecho (mejillas, babero, pecho rojo…). */
  face?: (x: number, y: number, z: number) => number | null;
  breast?: (x: number, y: number, z: number) => number | null;
  /** Rayitas oscuras en el lomo (gorrión). */
  streaks?: number;
  eyeRing?: number;
}

/** Un pajarito: cuerpo, cabeza que picotea, alas con bisagra (se pliegan en el suelo) y cola. Pies en y = 0. */
function songbird(c: Songbird): Rig {
  const r = new Rig();
  const body: Paint = (x, y, z, n) => {
    const b = c.breast?.(x, y, z);
    if (b != null) return b;
    if (y < 2.6 || n[1] < -0.5) return c.belly;
    if (c.streaks && y > 3.5 && hash3(x * 2, y * 2, z * 2, 31) > 0.45) return c.streaks;
    return c.back;
  };
  r.box('body', body, [-1.5, 1.5, -2], [1.5, 4.5, 2]);
  r.box('body', body, [-1.25, 1.75, 2], [1.25, 4, 2.75]);
  r.part('head', 'body', [0, 4, 1.75], 'head');
  r.box('head', (x, y, z) => c.face?.(x, y, z) ?? c.head, [-1.25, 4, 0.75], [1.25, 6.25, 3.25]);
  r.box('head', c.beak, [-0.4, 4.75, 3.25], [0.4, 5.4, 4.5], { grain: 0 });
  sideEyes(r, 'head', 1.25, 5, 5.75, 2, 2.75, c.head);
  if (c.eyeRing) r.pair('head', c.eyeRing, [1.2, 4.85, 1.85], [1.4, 5.9, 2.9], { grain: 0 });
  r.part('tail', 'body', [0, 3.5, -2], 'tail', 0, [0.25, 0, 0]);
  r.box('tail', c.wing, [-1, 3, -5], [1, 3.75, -2]);
  r.box('tail', c.tip, [-1, 3, -5.5], [1, 3.75, -5]);
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'wingL' : 'wingR';
    r.part(n, 'body', [s * 1.5, 4.25, 0.5], 'wing', s);
    // Plumas: las largas de la punta más oscuras.
    r.box(n, (x) => (Math.abs(x) > 4.5 ? c.tip : c.wing), s < 0 ? [-6, 4, -1.5] : [1.5, 4, -1.5], s < 0 ? [-1.5, 4.5, 2] : [6, 4.5, 2]);
    const legName = s < 0 ? 'legL' : 'legR';
    r.part(legName, 'body', [s * 0.75, 1.5, 0], 'leg', s);
    r.box(legName, 0x5a4a3a, [s * 0.75 - 0.25, 0.25, -0.25], [s * 0.75 + 0.25, 1.5, 0.25], { grain: 0 });
    r.box(legName, 0x5a4a3a, [s * 0.75 - 0.4, 0, -0.75], [s * 0.75 + 0.4, 0.25, 1], { grain: 0 });
  }
  return r;
}

const gorrion = () => songbird({
  back: 0x9a6a40, belly: 0xd8ccb8, head: 0x8a8a8a, wing: 0x8a5a32, tip: 0x5a3a20, beak: 0x3a3a3a, streaks: 0x4a3020,
  // Mejillas claras, nuca castaña y babero negro.
  face: (x, y, z) => (y < 5 && z > 2.6 && Math.abs(x) < 0.9 ? 0x1e1e1e : y < 5.4 && Math.abs(x) > 1 ? 0xe8e0d0 : z < 1.6 && y < 5.8 ? 0x8a5a32 : null),
  breast: (x, y, z) => (z > 1.9 && y > 3.3 && Math.abs(x) < 0.9 ? 0x1e1e1e : null),
});
const petirrojo = () => songbird({
  back: 0x7a6a50, belly: 0xece4d8, head: 0x7a6a50, wing: 0x6a5a40, tip: 0x4a3e2c, beak: 0x2a2a2a,
  face: (_x, y, z) => (z > 2.2 && y < 5.9 ? 0xe86a2a : null),
  breast: (_x, y, z) => (z > 1 && y > 2.2 ? 0xe86a2a : null),
});
const mirlo = () => songbird({ back: 0x1e1e22, belly: 0x2a2a2e, head: 0x1e1e22, wing: 0x26262a, tip: 0x141416, beak: 0xf0a020, eyeRing: 0xf0b030 });
const herrerillo = () => songbird({
  back: 0x7a9a5a, belly: 0xf0d840, head: 0x3a7ad0, wing: 0x3a7ad0, tip: 0x2a5aa0, beak: 0x2a2a2a,
  // Gorrito azul, cara blanca con una raya negra por el ojo.
  face: (_x, y, z) => (y > 5.9 ? 0x3a7ad0 : y > 5.1 && y < 5.6 ? 0x1e2a40 : z > 0.9 ? 0xf8f8f8 : null),
  breast: (x, y, z) => (z > 2 && y > 2.5 && Math.abs(x) < 0.4 ? 0x2a2a2a : null),
});

function gaviota(): Rig {
  const W = 0xf6f6f2, GR = 0xb8c0ca, K = 0x1e1e22, Y = 0xf0c020;
  const r = new Rig();
  r.box('body', (_x, y, z) => (y > 5.4 && z < 2 ? GR : W), [-2, 2.5, -3.5], [2, 6, 3.5]);
  r.part('head', 'body', [0, 5.5, 3], 'head');
  r.box('head', W, [-1.5, 5.5, 2.5], [1.5, 8.5, 5.5]);
  r.box('head', Y, [-0.5, 6.5, 5.5], [0.5, 7.25, 7.5], { grain: 0 });
  r.box('head', 0xe03a2a, [-0.5, 6.2, 6.75], [0.5, 6.6, 7.25], { grain: 0 });
  sideEyes(r, 'head', 1.5, 7, 7.75, 4, 4.75, W, 0xd8a020);
  r.part('tail', 'body', [0, 5, -3.5], 'tail', 0, [0.1, 0, 0]);
  r.box('tail', W, [-1.5, 4.25, -6], [1.5, 5, -3.5]);
  r.box('tail', K, [-1.5, 4.25, -6.5], [1.5, 5, -6]);
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'wingL' : 'wingR';
    r.part(n, 'body', [s * 2, 5.5, 0.5], 'wing', s);
    // Gris por arriba, puntas negras con lunares blancos.
    r.box(n, (x, _y, z) => (Math.abs(x) > 9 ? (Math.abs(x) > 10 && z > 0.5 && z < 1.5 ? W : K) : GR),
      s < 0 ? [-11, 5.25, -2.5] : [2, 5.25, -2.5], s < 0 ? [-2, 5.75, 2.5] : [11, 5.75, 2.5]);
    const legName = s < 0 ? 'legL' : 'legR';
    r.part(legName, 'body', [s * 1, 2.5, 0], 'leg', s);
    r.box(legName, 0xe8b090, [s - 0.3, 0.3, -0.3], [s + 0.3, 2.5, 0.3], { grain: 0 });
    r.box(legName, 0xe8b090, [s - 0.75, 0, -0.5], [s + 0.75, 0.3, 1.5], { grain: 0 });
  }
  return r;
}

/** Loro (guacamayo): rojo, con las alas amarillas y azules y la cola larga. Vuela: el centro del cuerpo en y = 0. */
function loro(): Rig {
  const RED = 0xe03030, Y = 0xf0c030, B = 0x3060e0, G = 0x30a040;
  const r = new Rig();
  r.box('body', RED, [-1.75, -1.75, -3], [1.75, 1.75, 3]);
  r.part('head', 'body', [0, 1, 2.5], 'head');
  r.box('head', RED, [-1.5, 0, 2.5], [1.5, 3, 5.5]);
  r.pair('head', 0xf4f0ea, [1.4, 0.4, 3.6], [1.65, 2.2, 5.3], { grain: 0 });
  r.box('head', 0xf0e8d8, [-0.75, 0.5, 5.5], [0.75, 2.25, 7]);
  r.box('head', 0xf0e8d8, [-0.6, 0, 6.5], [0.6, 0.75, 7.25]);
  r.box('head', 0x2a2a2a, [-0.6, -0.25, 5.5], [0.6, 0.6, 6.5], { grain: 0 });
  sideEyes(r, 'head', 1.65, 1.6, 2.4, 3.9, 4.7, 0xf4f0ea, 0xe8d860);
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'wingL' : 'wingR';
    r.part(n, 'body', [s * 1.75, 0.75, 0.5], 'wing', s);
    r.box(n, (x) => (Math.abs(x) < 3.5 ? RED : Math.abs(x) < 5 ? Y : Math.abs(x) < 7 ? B : G),
      s < 0 ? [-8.5, 0.25, -2.5] : [1.75, 0.25, -2.5], s < 0 ? [-1.75, 0.9, 3] : [8.5, 0.9, 3]);
    r.box('body', 0x3a3a3a, [s * 0.75 - 0.4, -2.25, -1], [s * 0.75 + 0.4, -1.75, 0.5], { grain: 0 });
  }
  r.part('tail', 'body', [0, 0, -3], 'tail');
  r.box('tail', (_x, _y, z) => (z > -6 ? RED : B), [-1, -0.75, -11], [1, 0, -3]);
  r.box('tail', B, [-0.5, -0.6, -12.5], [0.5, -0.1, -11]);
  return r;
}

/** Búho: vuela de noche con los ojos que brillan. El centro del cuerpo en y = 0. */
function buho(): Rig {
  const BR = 0x8a6a48, BRD = 0x5e4430, BRL = 0xc8a878, DISC = 0xd8c0a0;
  const r = new Rig();
  r.box('body', (_x, y, z, n) => (n[2] > 0.5 || z > 2 ? (Math.floor(y * 1.5) % 2 ? BRL : tone(BRL, 0.82)) : hash3(_x, y, z, 41) > 0.6 ? BRD : BR), [-2.5, -3, -2], [2.5, 2.5, 2.5]);
  r.part('head', 'body', [0, 2.5, 0.25], 'head');
  r.box('head', (x, y, z) => (hash3(x, y, z, 42) > 0.65 ? BRD : BR), [-2.5, 2.5, -1.75], [2.5, 6.5, 2.75]);
  r.box('head', DISC, [-2.25, 2.75, 2.75], [2.25, 6, 3.1], { grain: 0.04 });
  r.pair('head', 0xf0c020, [0.5, 4, 3.05], [1.9, 5.25, 3.35], { glow: true, grain: 0 });
  r.pair('head', BLACK, [0.95, 4.3, 3.35], [1.45, 4.95, 3.45], { grain: 0 });
  r.box('head', 0x4a3a2a, [-0.4, 3, 3.1], [0.4, 4, 3.75], { grain: 0 });
  r.pair('head', BRD, [1.25, 6.5, 0], [2.25, 8, 1]);
  r.part('head_lid', 'head', [0, 2.5, 0.25], 'lid');
  r.pair('head_lid', BR, [0.4, 3.9, 3.3], [2, 5.35, 3.6]);
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'wingL' : 'wingR';
    r.part(n, 'body', [s * 2.5, 0.75, 0], 'wing', s);
    r.box(n, (x) => (Math.floor(Math.abs(x)) % 2 ? BR : BRD), s < 0 ? [-9, 0.5, -2] : [2.5, 0.5, -2], s < 0 ? [-2.5, 1, 2] : [9, 1, 2]);
    r.box('body', 0x3a3a3a, [s * 1 - 0.5, -3.5, 0], [s * 1 + 0.5, -3, 1.5], { grain: 0 });
  }
  r.part('tail', 'body', [0, -2, -2], 'tail');
  r.box('tail', BRD, [-1.5, -2.5, -4.5], [1.5, -1.75, -2]);
  return r;
}

function pinguino(): Rig {
  const K = 0x202430, W = 0xf4f4f4, OR = 0xf0a020;
  const r = new Rig();
  r.box('body', (_x, y, z, n) => ((n[2] > 0.5 || z > 1.4) && y < 9.4 ? W : K), [-2.75, 1, -2.5], [2.75, 10, 2.25]);
  r.part('head', 'body', [0, 10, 0], 'head');
  r.box('head', K, [-2.25, 10, -2], [2.25, 14, 2]);
  r.box('head', OR, [-0.5, 11.25, 2], [0.5, 12, 3.75], { grain: 0 });
  r.box('head', 0x303030, [-0.5, 12, 2], [0.5, 12.5, 3.25], { grain: 0 });
  sideEyes(r, 'head', 2.25, 12.25, 13, 0.75, 1.5, K);
  r.pair('head', W, [2.2, 12.05, 0.55], [2.35, 13.2, 1.7], { grain: 0 });
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'wingL' : 'wingR';
    r.part(n, 'body', [s * 2.75, 9, 0], 'wing', s);
    r.box(n, (x) => (Math.abs(x) < 2.95 ? W : K), s < 0 ? [-3.5, 3, -1] : [2.75, 3, -1], s < 0 ? [-2.75, 9, 1] : [3.5, 9, 1]);
    const legName = s < 0 ? 'legL' : 'legR';
    r.part(legName, null, [s * 1.25, 1, 0], 'leg', s);
    r.box(legName, OR, [s * 1.25 - 1, 0, -0.5], [s * 1.25 + 1, 0.75, 2]);
  }
  r.part('tail', 'body', [0, 2, -2.5], 'tail');
  r.box('tail', K, [-1, 1, -3.5], [1, 2, -2.5]);
  return r;
}

function rana(): Rig {
  const G = 0x58a040, GD = 0x3e7a2c, PALE = 0xd8e0a0;
  const r = new Rig();
  const skin: Paint = (x, y, z, n) => (n[1] < -0.5 || y < 1 ? PALE : blob(x, y, z, 1.5, 51) > 0.35 ? GD : G);
  r.box('body', skin, [-2.5, 0.5, -2.5], [2.5, 3.5, 2]);
  r.box('body', skin, [-2.25, 0.75, 2], [2.25, 3.25, 4]);
  r.box('body', 0x2a4a20, [-2.25, 1.4, 4], [2.25, 1.6, 4.1], { grain: 0 });
  r.box('body', 0x2a4a20, [-0.75, 2.5, 4], [-0.25, 2.75, 4.1], { grain: 0 });
  r.box('body', 0x2a4a20, [0.25, 2.5, 4], [0.75, 2.75, 4.1], { grain: 0 });
  // Ojos saltones encima de la cabeza.
  r.pair('body', G, [0.75, 3, 2], [2.25, 4.25, 3.5]);
  r.part('body_lid', 'body', [0, 0, 0], 'lid');
  r.pair('body', 0xe8d040, [1.25, 3.4, 3.5], [2.25, 4.25, 3.7], { grain: 0 });
  r.pair('body', BLACK, [1.5, 3.6, 3.7], [2, 4, 3.8], { grain: 0 });
  r.pair('body_lid', G, [1.15, 3.3, 3.45], [2.35, 4.35, 3.85]);
  r.part('throat', 'body', [0, 1, 3.5], 'throat');
  r.box('throat', 0xe8e4a8, [-1.5, 0.4, 2.75], [1.5, 1.2, 4.2]);
  for (const s of [-1, 1] as const) {
    const f = s < 0 ? 'leg0' : 'leg1';
    r.part(f, null, [s * 2, 2, 2], 'leg', s);
    r.box(f, G, [s * 2 - 0.5, 0, 1.5], [s * 2 + 0.5, 2, 2.5]);
    r.box(f, G, [s * 2 - 0.75, 0, 2.25], [s * 2 + 0.75, 0.3, 3.25], { grain: 0 });
    const b = s < 0 ? 'leg2' : 'leg3';
    r.part(b, null, [s * 2.75, 2, -1.5], 'leg', (-s) as 1 | -1);
    r.box(b, skin, [s * 2.75 - 0.75, 0.5, -3], [s * 2.75 + 0.75, 2.5, 0]);
    r.box(b, GD, [s * 2.75 - 1.25, 0, -1], [s * 2.75 + 1.25, 0.4, 1.75], { grain: 0 });
  }
  return r;
}

// ─── Catálogo ──────────────────────────────────────────────────────────────────────────────────────────────

export interface FaunaShape {
  rig: () => Rig;
  habits: FaunaHabits;
}

export const LAND_SHAPES: Record<string, FaunaShape> = {
  vaca: { rig: vaca, habits: { graze: 'pasta', tail: { amp: 0.35, speed: 2.2, axis: 'z' }, ears: true, look: 0.5 } },
  oveja: { rig: oveja, habits: { graze: 'pasta', tail: { amp: 0.2, speed: 6 }, ears: true, look: 0.5 } },
  gallina: { rig: gallina, habits: { graze: 'picotea', tail: { amp: 0.12, speed: 5, axis: 'x' }, look: 0.9 } },
  ciervo: { rig: ciervo, habits: { graze: 'pasta', tail: { amp: 0.35, speed: 9, axis: 'x' }, ears: true, look: 0.7 } },
  zorro: { rig: zorro, habits: { tail: { amp: 0.3, speed: 3 }, ears: true, look: 0.8 } },
  conejo: { rig: conejo, habits: { graze: 'pasta', ears: true, look: 0.6 } },
  cabra: { rig: cabra, habits: { graze: 'pasta', tail: { amp: 0.4, speed: 10, axis: 'x' }, ears: true, look: 0.6 } },
  camello: { rig: camello, habits: { graze: 'pasta', tail: { amp: 0.25, speed: 2, axis: 'z' }, ears: true, look: 0.5 } },
  oso_polar: { rig: osoPolar, habits: { look: 0.6, ears: true } },
  suricata: { rig: suricata, habits: { crouch: 1.1, look: 1.1, tail: { amp: 0.15, speed: 3 } } },
  // v5.7: aves y rana.
  gorrion: { rig: gorrion, habits: { look: 0.9, tail: { amp: 0.15, speed: 4, axis: 'x' } } },
  petirrojo: { rig: petirrojo, habits: { look: 0.9, tail: { amp: 0.2, speed: 3, axis: 'x' } } },
  mirlo: { rig: mirlo, habits: { look: 0.9, tail: { amp: 0.15, speed: 3, axis: 'x' } } },
  herrerillo: { rig: herrerillo, habits: { look: 1, tail: { amp: 0.15, speed: 5, axis: 'x' } } },
  gaviota: { rig: gaviota, habits: { look: 0.8, tail: { amp: 0.08, speed: 3, axis: 'x' } } },
  loro: { rig: loro, habits: { look: 0.6, tail: { amp: 0.12, speed: 4, axis: 'x' } } },
  buho: { rig: buho, habits: { look: 1.6 } },
  pinguino: { rig: pinguino, habits: { waddle: 0.14, look: 0.8, tail: { amp: 0.2, speed: 8 } } },
  rana: { rig: rana, habits: { croak: true, look: 0.3 } },
};

/** Los pajaritos que vuelan en bandada (cada bandada, de una especie). */
export const SONGBIRDS = ['gorrion', 'petirrojo', 'mirlo', 'herrerillo'];

const built = new Map<string, FaunaGeometry>();

/** La figura de un animal de tierra (construida una sola vez por especie), o null si no tiene. */
export function landGeometry(kind: string): FaunaGeometry | null {
  const shape = LAND_SHAPES[kind];
  if (!shape) return null;
  let g = built.get(kind);
  if (!g) built.set(kind, (g = buildRig(shape.rig())));
  return g;
}

/** Un animal de tierra montado, listo para ponerlo en el mundo (null si la especie no tiene figura nueva). */
export function landModel(kind: string, facing: 1 | -1 = 1): FaunaModel | null {
  const g = landGeometry(kind);
  return g ? new FaunaModel(g, LAND_SHAPES[kind].habits, facing) : null;
}
