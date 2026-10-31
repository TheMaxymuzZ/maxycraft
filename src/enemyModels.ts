// Las criaturas hostiles y los jefes, con todo detalle (v5.8): cada una hecha a mano, cubito a cubito (1/16 de
// bloque), como la fauna de la v5.6. El limo es de gelatina y se le ve el corazón por dentro; el murciélago tiene
// orejas, colmillos y alas con sus dedos; el esqueleto, costillas, columna, mandíbula que castañetea, arco y carcaj;
// los gólems, piedra con grietas que brillan; el espíritu, una llama con cola que ondea.
// Los jefes no son ya las mismas figuras pintadas de otro color: el rey esqueleto lleva corona, capa y hombreras de
// oro; el gran limo dorado, corona y monedas dentro; el gólem de hielo, cristales en la espalda y barba de carámbanos;
// el de magma, cuernos, puños de lava y fuego en la cabeza.
//
// Se mueven de verdad: andan, respiran, miran, preparan el golpe (levantan los brazos, tensan el arco, se agachan) y lo
// sueltan. Lo que brilla (ojos, grietas, gemas) se ve a oscuras. Cada especie se construye una sola vez y todas sus
// copias comparten la figura; de lejos se dibujan con menos detalle.
import * as THREE from 'three';
import type { BossAttack, HostileKind } from './hostiles';
import { FAUNA_FAR, type FaunaGeometry, type Paint, Rig, type V3, blob, buildRig, faunaEye, hash3, mix, tone } from './landFauna';

const BLACK = 0x161418;
const WHITE = 0xffffff;

/** Párpados: pieza que se ve solo al parpadear. */
function lids(r: Rig, head: string, boxes: [V3, V3][], paint: Paint) {
  const name = `${head}_lid`;
  r.part(name, head, r.parts.get(head)!.pivot, 'lid');
  for (const [a, b] of boxes) r.box(name, paint, a, b, { grain: 0 });
}

// ─── Limos ─────────────────────────────────────────────────────────────────────────────────────────────────

function limo(gold: boolean): Rig {
  const SHELL = gold ? 0xf6c83c : 0x78d65c;
  const CORE = gold ? 0xc8901c : 0x3f9530;
  const r = new Rig();
  // La gelatina de fuera (se ve a través): más clara en las aristas y con un brillo arriba.
  r.part('shell', 'body', [0, 0, 0]);
  r.box('shell', (x, y, z, n) => {
    let edges = 0;
    if (Math.abs(x) > 6.2) edges++;
    if (y > 12.2 || y < 0.8) edges++;
    if (Math.abs(z) > 6.2) edges++;
    if (edges >= 2) return tone(SHELL, 1.2);
    if (n[1] > 0.5 && x < -1 && x > -5 && z > 1 && z < 5) return mix(SHELL, WHITE, 0.55);
    if (n[1] < -0.5) return tone(SHELL, 0.8);
    return tone(SHELL, 1 + blob(x, y, z, 3, 2) * 0.08);
  }, [-7, 0, -7], [7, 13, 7], { grain: 0.03 });
  // El corazón de dentro y unas burbujas (o monedas, el dorado).
  r.box('body', (x, y, z) => tone(CORE, 1 + blob(x, y, z, 2.5, 7) * 0.14), [-3.5, 2.5, -3.5], [3.5, 9, 3.5]);
  const bits: V3[] = [[-5, 10, -4], [4.5, 3, -5], [5, 9.5, 3], [-5.5, 4, 4], [1, 11, -5.5], [-2, 1.5, 5]];
  for (const [x, y, z] of bits) {
    if (gold) r.box('body', (_x, _y, _z, n) => (Math.abs(n[2]) > 0.5 ? 0xffe070 : 0xb07a10), [x - 1, y - 1, z - 0.4], [x + 1, y + 1, z + 0.4], { grain: 0 });
    else r.box('body', tone(SHELL, 1.25), [x - 0.5, y - 0.5, z - 0.5], [x + 0.5, y + 0.5, z + 0.5], { grain: 0 });
  }
  // La cara, por fuera: ojos con su brillo, cejas de enfadado y boca.
  r.part('face', 'body', [0, 6, 7]);
  const DARK = gold ? 0x3a2408 : 0x13240f;
  for (const s of [-1, 1]) {
    r.box('face', DARK, [s < 0 ? -4 : 1.5, 6, 7], [s < 0 ? -1.5 : 4, 9, 7.3], { grain: 0 });
    r.box('face', WHITE, [s < 0 ? -2.5 : 3, 8, 7.3], [s < 0 ? -1.5 : 4, 9, 7.4], { grain: 0 });
    // Ceja inclinada hacia el centro.
    r.box('face', DARK, [s < 0 ? -4.5 : 1, 9.6, 7], [s < 0 ? -1 : 4.5, 10.4, 7.3], { rot: [0, 0, -s * 0.35], grain: 0 });
    // Mofletes.
    r.box('face', gold ? 0xf08a40 : 0xe88a8a, [s < 0 ? -5.5 : 3.5, 4.5, 7], [s < 0 ? -3.5 : 5.5, 5.5, 7.15], { grain: 0 });
  }
  lids(r, 'face', [[[-4.1, 5.9, 7.25], [-1.4, 9.1, 7.45]], [[1.4, 5.9, 7.25], [4.1, 9.1, 7.45]]], tone(SHELL, 0.9));
  r.part('jaw', 'face', [0, 4.5, 7], 'jaw');
  r.box('jaw', DARK, [-2, 3.25, 7], [2, 4.5, 7.3], { grain: 0 });
  r.box('jaw', 0xd85868, [-1, 3.25, 7.3], [1, 3.75, 7.35], { grain: 0 });
  if (gold) {
    // Corona con picos y gemas que brillan.
    r.part('crown', 'body', [0, 13, 0]);
    const G = 0xffd24a;
    const band: Paint = (x, y) => (y < 13.6 || y > 14.9 ? tone(G, 0.8) : (Math.floor(x + 20) % 2 === 0 ? G : tone(G, 1.12)));
    r.box('crown', band, [-4, 13, -4], [4, 15.5, -3]);
    r.box('crown', band, [-4, 13, 3], [4, 15.5, 4]);
    r.pair('crown', band, [3, 13, -3], [4, 15.5, 3]);
    for (const [x, z] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5], [0, 3.5], [0, -3.5], [-3.5, 0], [3.5, 0]] as [number, number][]) {
      const h = x === 0 || z === 0 ? 18 : 17;
      r.box('crown', G, [x - 0.5, 15.5, z - 0.5], [x + 0.5, h, z + 0.5]);
      r.box('crown', 0xfff4c0, [x - 0.4, h, z - 0.4], [x + 0.4, h + 0.6, z + 0.4], { grain: 0 });
    }
    r.box('crown', 0xff3048, [-0.75, 13.5, 4], [0.75, 15, 4.4], { glow: true });
    r.box('crown', 0x40a0ff, [-3.1, 13.75, 4], [-2.1, 14.75, 4.3], { glow: true });
    r.box('crown', 0x40ff90, [2.1, 13.75, 4], [3.1, 14.75, 4.3], { glow: true });
  }
  return r;
}

// ─── Murciélago ────────────────────────────────────────────────────────────────────────────────────────────

function murcielago(): Rig {
  const FUR = 0x4a3a4c, FURD = 0x35283a, BELLY = 0x6e5664, SKIN = 0x5a4658, BONE = 0x2a1e2c, PINK = 0xc88a9a;
  const fur: Paint = (x, y, z, n) => (n[2] > 0.5 && y < 2 ? BELLY : tone(FUR, 1 + blob(x, y, z, 1.5, 3) * 0.12));
  const r = new Rig();
  r.box('body', fur, [-2.5, -3, -2], [2.5, 2.5, 2]);
  r.box('body', fur, [-2, -4, -1.5], [2, -3, 1.5]);
  // Patitas con garras, colgando.
  for (const s of [-1, 1]) r.box('body', BONE, [s * 1.25 - 0.5, -5.5, -1.5], [s * 1.25 + 0.5, -4, -0.5], { grain: 0 });
  r.part('head', 'body', [0, 2.5, 0.5], 'head');
  r.box('head', fur, [-2.5, 2.5, -2], [2.5, 7, 2.5]);
  r.box('head', SKIN, [-1.25, 3, 2.5], [1.25, 5, 4]);
  r.box('head', BLACK, [-0.75, 4.25, 4], [0.75, 4.75, 4.2], { grain: 0 });
  // Colmillos.
  for (const s of [-1, 1]) r.box('head', 0xf4f0e8, [s * 0.7 - 0.3, 2, 3.2], [s * 0.7 + 0.3, 3, 3.6], { grain: 0 });
  // Ojos rojos que brillan.
  r.pair('head', 0xff4040, [0.75, 5.25, 2.5], [1.9, 6.25, 2.75], { glow: true });
  r.pair('head', 0xffd0c0, [1.4, 5.85, 2.75], [1.9, 6.25, 2.8], { glow: true });
  lids(r, 'head', [[[-2, 5.15, 2.45], [-0.65, 6.35, 2.85]], [[0.65, 5.15, 2.45], [2, 6.35, 2.85]]], FUR);
  // Orejas grandes, rosas por dentro.
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'earL' : 'earR';
    r.part(n, 'head', [s * 1.5, 7, 0.5], 'ear', s);
    const lo = (a: number, b: number) => Math.min(s * a, s * b);
    const hi = (a: number, b: number) => Math.max(s * a, s * b);
    r.box(n, FURD, [lo(0.5, 2.75), 7, -0.5], [hi(0.5, 2.75), 9.5, 1]);
    r.box(n, FURD, [lo(1.25, 2.75), 9.5, -0.25], [hi(1.25, 2.75), 11, 0.75]);
    r.box(n, FURD, [lo(2, 2.75), 11, 0], [hi(2, 2.75), 12, 0.5]);
    r.box(n, PINK, [lo(1, 2.25), 7.5, 1], [hi(1, 2.25), 10, 1.15], { grain: 0 });
  }
  // Alas: hueso del borde, dedos y la membrana festoneada por detrás. Cada ala en dos trozos para doblarla.
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'wingL' : 'wingR';
    const tip = s < 0 ? 'wingL2' : 'wingR2';
    r.part(n, 'body', [s * 2.5, 1, 0.5], 'wing', s);
    r.part(tip, n, [s * 8, 1, 0.5], 'extra', s);
    const X = (a: number, b: number): [number, number] => [Math.min(s * a, s * b), Math.max(s * a, s * b)];
    const mem: Paint = (_x, _y, _z, nn) => (nn[1] < -0.5 ? tone(SKIN, 0.85) : SKIN);
    // Trozo de dentro.
    {
      const [a, b] = X(2.5, 8);
      r.box(n, mem, [a, 0.6, -3.5], [b, 1.1, 2]);
      r.box(n, BONE, [a, 0.5, 1.5], [b, 1.6, 2.6]);
      const [c, d] = X(3, 5);
      r.box(n, mem, [c, 0.6, -4.5], [d, 1.1, -3.5]);
    }
    // Trozo de fuera, con los dedos y la garra del pulgar.
    {
      const [a, b] = X(8, 13);
      r.box(tip, mem, [a, 0.6, -3], [b, 1.1, 2]);
      const [c, d] = X(8, 10.5);
      r.box(tip, mem, [c, 0.6, -4.5], [d, 1.1, -3]);
      const [e, f] = X(11.5, 13);
      r.box(tip, mem, [e, 0.6, -5], [f, 1.1, -3]);
      r.box(tip, BONE, [a, 0.5, 1.5], [b, 1.6, 2.5]);
      r.rod(tip, BONE, [s * 8.5, 1.3, 1.8], [s * 11, 1.3, -4.5], 0.6);
      r.rod(tip, BONE, [s * 8.5, 1.3, 1.8], [s * 13.5, 1.3, -1], 0.6);
      r.box(tip, 0xd8d0c8, [Math.min(s * 12.6, s * 14), 0.6, 2], [Math.max(s * 12.6, s * 14), 1.5, 3], { grain: 0 });
    }
  }
  return r;
}

// ─── Esqueletos ────────────────────────────────────────────────────────────────────────────────────────────

function esqueleto(king: boolean): Rig {
  const BONE = king ? 0xece4cc : 0xe8e2d0;
  const DARK = 0x221c1e;
  const EYE = king ? 0xb070ff : 0xff6a3a;
  const GOLD = 0xf0c030;
  const bone: Paint = (x, y, z) => tone(BONE, 1 + blob(x, y, z, 2.5, 5) * 0.07 - (hash3(x, y, z, 9) > 0.86 ? 0.1 : 0));
  const r = new Rig();
  // Piernas: fémur, rodilla, tibia y pie.
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'legL' : 'legR';
    const x = s * 2;
    r.part(n, null, [x, 13, 0], 'leg', s < 0 ? 1 : -1);
    r.box(n, bone, [x - 0.9, 7.5, -0.9], [x + 0.9, 13, 0.9]);
    r.box(n, bone, [x - 1.2, 6, -1.1], [x + 1.2, 7.5, 1.3]);
    r.box(n, bone, [x - 0.7, 1.5, -0.7], [x + 0.7, 6, 0.7]);
    r.box(n, bone, [x - 1.2, 0, -1.5], [x + 1.2, 1.5, 2.6]);
    if (king) r.box(n, GOLD, [x - 1.3, 1.5, -1.2], [x + 1.3, 2.5, 1.2]);
  }
  // Cadera, taparrabos roto, columna y costillas.
  r.box('body', bone, [-3.5, 12, -1.5], [3.5, 14.5, 1.5]);
  const CLOTH = king ? 0x6a1a3a : 0x6a5038;
  r.box('body', CLOTH, [-3.6, 12.5, -1.6], [3.6, 13.75, 1.6]);
  r.box('body', CLOTH, [-2.5, 9, 1.5], [-0.5, 12.5, 2]);
  r.box('body', CLOTH, [-0.5, 10, 1.5], [1.5, 12.5, 2]);
  r.box('body', CLOTH, [1.5, 8.5, 1.5], [2.75, 12.5, 2]);
  r.box('body', CLOTH, [-2.25, 10, -2], [2.25, 12.5, -1.5]);
  if (king) r.box('body', GOLD, [-3.7, 13.75, -1.7], [3.7, 14.5, 1.7], { grain: 0 });
  r.box('body', (_x, y) => (Math.floor(y * 0.75) % 2 === 0 ? BONE : tone(BONE, 0.82)), [-0.75, 14.5, -1.5], [0.75, 23, -0.25]);
  for (const y of [16, 18, 20]) {
    r.pair('body', bone, [2.75, y, -1.5], [3.75, y + 1, 1.5]);
    r.pair('body', bone, [0.75, y, 1.5], [3.75, y + 1, 2.5]);
    r.pair('body', bone, [0.75, y, -1.5], [2.75, y + 1, -0.5]);
  }
  r.box('body', bone, [-0.5, 15.5, 2], [0.5, 22, 2.6]);
  r.box('body', bone, [-4.5, 22, -1.25], [4.5, 23.5, 1.25]);
  if (king) {
    // Cuello de armiño y hombreras de oro.
    r.box('body', (x, y, z) => (hash3(x, y, z, 4) > 0.75 ? 0x202020 : 0xf6f2ea), [-4.75, 22.5, -2], [4.75, 24.25, 2.25], { grain: 0.03 });
    r.pair('body', (_x, y) => (y > 23.5 ? tone(GOLD, 1.12) : GOLD), [3.75, 21.25, -1.75], [6.25, 24.25, 1.75]);
    r.pair('body', 0xe03048, [4.5, 22.5, 1.75], [5.5, 23.5, 2.05], { glow: true });
  } else {
    // Carcaj a la espalda con flechas.
    r.box('body', (_x, y) => (y > 21.3 || y < 15.7 ? 0x5a3a22 : 0x7a5232), [0.75, 15, -3.75], [3.25, 22, -1.5], { rot: [0, 0, 0.3] });
    for (const [x, c] of [[1.4, 0xe8e8e8], [2.2, 0xd84040], [3, 0xe8e8e8]] as [number, number][]) {
      r.rod('body', 0x8a6a3a, [x - 0.6, 21, -2.6], [x - 1.4, 24.5, -2.6], 0.4);
      r.rod('body', c, [x - 1.3, 24, -2.6], [x - 1.7, 25.5, -2.6], 0.9);
    }
  }
  // Capa del rey.
  if (king) {
    r.part('cape', 'body', [0, 23, -2], 'tail', 0, [0.08, 0, 0]);
    const RED = 0x8a1a2e;
    r.box('cape', (x, y, z, n) => {
      if (y < 7.6 || Math.abs(x) > 4.6) return GOLD;
      if (n[2] > 0.5) return tone(RED, 0.7);
      return tone(RED, 1 + blob(x, y, z, 3, 6) * 0.08);
    }, [-5.25, 6.5, -2.75], [5.25, 23, -2]);
  }
  // Cabeza: cráneo, cuencas con su luz, nariz, dientes y mandíbula que se mueve.
  r.part('head', 'body', [0, 23.5, 0], 'head');
  r.box('head', (x, y, z) => (z > 0 && y > 28.6 && Math.abs(x - 1.5 + (y - 28) * 0.6) < 0.35 ? tone(BONE, 0.7) : bone(x, y, z, [0, 0, 0])), [-3.5, 24.5, -3], [3.5, 31, 3.5]);
  r.box('head', bone, [-3, 24, -2.5], [3, 24.5, 3]);
  r.pair('head', DARK, [0.5, 26.5, 3.5], [2.75, 28.75, 3.6], { grain: 0 });
  r.pair('head', EYE, [1.1, 27.1, 3.6], [2, 28, 3.7], { glow: true });
  r.box('head', DARK, [-0.5, 25.5, 3.5], [0.5, 26.5, 3.6], { grain: 0 });
  r.box('head', (x) => (Math.floor(x + 10) % 2 === 0 ? BONE : DARK), [-2.5, 24.5, 3.5], [2.5, 25.25, 3.6], { grain: 0 });
  r.part('jaw', 'head', [0, 24.75, -1.5], 'jaw');
  r.box('jaw', bone, [-3, 22.75, -1.5], [3, 24.25, 3.25]);
  r.box('jaw', (x) => (Math.floor(x + 10) % 2 === 0 ? BONE : tone(BONE, 0.85)), [-2.5, 24.25, 2.5], [2.5, 24.75, 3.25], { grain: 0 });
  if (king) {
    // Corona con picos y gemas.
    const band: Paint = (_x, y) => (y < 31.4 ? tone(GOLD, 0.82) : GOLD);
    r.box('head', band, [-3.75, 31, -3.25], [3.75, 32.5, -2.5]);
    r.box('head', band, [-3.75, 31, 3], [3.75, 32.5, 3.75]);
    r.pair('head', band, [3, 31, -2.5], [3.75, 32.5, 3]);
    for (const [x, z, h] of [[0, 3.4, 35.5], [-2.75, 3.4, 34.5], [2.75, 3.4, 34.5], [-3.4, -2.9, 34], [3.4, -2.9, 34], [0, -2.9, 34.5]] as [number, number, number][]) {
      r.box('head', GOLD, [x - 0.5, 32.5, z - 0.4], [x + 0.5, h, z + 0.4]);
    }
    r.box('head', 0xff2a48, [-0.6, 31.3, 3.75], [0.6, 32.3, 4.05], { glow: true });
    r.pair('head', 0x30d0ff, [2, 31.4, 3.75], [2.8, 32.2, 4], { glow: true });
  }
  lids(r, 'head', [[[-2.85, 26.4, 3.45], [-0.4, 28.85, 3.8]], [[0.4, 26.4, 3.45], [2.85, 28.85, 3.8]]], BONE);
  // Brazos: hombro, codo, antebrazo, mano. El izquierdo lleva el arco.
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'armL' : 'armR';
    const x = s * 4.75;
    r.part(n, 'body', [x, 22.5, 0], 'extra', s, [-0.15, 0, 0]);
    r.box(n, bone, [x - 0.75, 16, -0.75], [x + 0.75, 22.5, 0.75]);
    r.box(n, bone, [x - 1, 15, -1], [x + 1, 16.25, 1]);
    r.box(n, bone, [x - 0.6, 11.5, -0.6], [x + 0.6, 15, 0.6]);
    r.box(n, bone, [x - 1, 9.75, -1], [x + 1, 11.5, 1]);
    r.box(n, bone, [x - 0.8, 8.75, -0.6], [x + 0.8, 9.75, 0.6]);
  }
  // El arco, en la mano izquierda: curvado hacia el arquero cuando apunta.
  const x = -4.75;
  const WOOD = king ? GOLD : 0x8a6a3a;
  const TIP = king ? 0xfff0b0 : 0x5a4026;
  r.rod('armL', WOOD, [x, 10.5, 0], [x, 12, 4], 0.9);
  r.rod('armL', WOOD, [x, 12, 4], [x, 14, 7], 0.8);
  r.rod('armL', WOOD, [x, 10.5, 0], [x, 12, -4], 0.9);
  r.rod('armL', WOOD, [x, 12, -4], [x, 14, -7], 0.8);
  r.box('armL', TIP, [x - 0.5, 13.75, 6.6], [x + 0.5, 14.75, 7.6], { grain: 0 });
  r.box('armL', TIP, [x - 0.5, 13.75, -7.6], [x + 0.5, 14.75, -6.6], { grain: 0 });
  r.box('armL', king ? 0x8a1a2e : 0x4a2e1e, [x - 0.6, 10, -1.2], [x + 0.6, 11.2, 1.2], { grain: 0 });
  r.box('armL', 0xe8e4d4, [x - 0.15, 14.1, -7], [x + 0.15, 14.4, 7], { grain: 0 });
  if (king) r.box('armL', 0xff2a48, [x - 0.7, 10.2, -0.5], [x + 0.7, 11, 0.5], { glow: true });
  return r;
}

// ─── Gólems ────────────────────────────────────────────────────────────────────────────────────────────────

type GolemVariant = 'lava' | 'hielo';

function golem(v: GolemVariant): Rig {
  const P = {
    lava: { rock: 0x3a3030, rock2: 0x2a2222, glow: 0xff7a20, eye: 0xffb040, fleck: 0x6a2a1a },
    hielo: { rock: 0x9cc8e8, rock2: 0x78a8d0, glow: 0xd8f4ff, eye: 0x40a8ff, fleck: 0xe8f8ff },
  }[v];
  const rock: Paint = (x, y, z) => {
    const h = hash3(x, y, z, 11);
    if (h > 0.9) return P.fleck;
    const b = blob(x, y, z, 3.5, 13);
    return b > 0.35 ? P.rock2 : tone(P.rock, 1 + b * 0.18);
  };
  const r = new Rig();
  const crack = (part: string, pts: V3[], t = 0.8) => {
    for (let i = 1; i < pts.length; i++) r.rod(part, P.glow, pts[i - 1], pts[i], t, { glow: true });
  };
  // Piernas.
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'legL' : 'legR';
    const x = s * 5;
    r.part(n, null, [x, 15, 0], 'leg', s < 0 ? 1 : -1);
    r.box(n, rock, [x - 3, 2.5, -3], [x + 3, 15, 3]);
    r.box(n, tone(P.rock2, 0.9), [x - 3.5, 0, -3.5], [x + 3.5, 2.5, 4.25]);
    r.box(n, rock, [x - 3.25, 7, 3], [x + 3.25, 10, 3.75]);
    if (v !== 'hielo') crack(n, [[x - 1, 12, 3.05], [x + 0.5, 8, 3.05], [x - 0.5, 4, 3.05]], 0.6);
  }
  // Tronco: pecho, joroba, hombros y el corazón que brilla.
  r.box('body', rock, [-8, 13, -5], [8, 16, 5]);
  r.box('body', rock, [-10, 15, -6], [10, 32, 6]);
  r.box('body', rock, [-7, 21, -7.25], [7, 31, -6]);
  r.pair('body', rock, [7, 25, -5.5], [11, 33.5, 5.5]);
  r.box('body', P.rock2, [-4.25, 20.75, 6], [4.25, 29.25, 6.3]);
  r.box('body', P.glow, [-3, 22, 6.2], [3, 28, 6.6], { glow: true });
  if (v === 'hielo') {
    r.box('body', 0x40a8ff, [-1.5, 23.5, 6.5], [1.5, 26.5, 6.8], { glow: true });
    // Nieve en los hombros.
    r.pair('body', (x, y, z) => (hash3(x, y, z, 3) > 0.5 ? 0xffffff : 0xeaf4ff), [7, 33.5, -5.5], [11, 34.25, 5.5], { grain: 0 });
    // Cristales en la espalda y en los hombros.
    const ice: Paint = (_x, y) => mix(0xb8ecff, 0xffffff, Math.max(0, Math.min(1, (y - 30) / 12)));
    for (const [a, b, t] of [
      [[0, 29, -7], [0, 38, -10], 2.4], [[-4.5, 26, -7], [-6, 34, -10.5], 2], [[4.5, 26, -7], [6, 34, -10.5], 2],
      [[-2.5, 20, -7], [-3, 26, -10], 1.6], [[3, 21, -7], [3.5, 27, -9.5], 1.6],
      [[-9.5, 33, 0], [-12, 40, -1], 2], [[9.5, 33, 0], [12, 40, -1], 2], [[-9.5, 33, 2.5], [-10.5, 37.5, 3.5], 1.4], [[9.5, 33, -2.5], [10.5, 37.5, -3.5], 1.4],
    ] as [V3, V3, number][]) r.rod('body', ice, a, b, t, { grain: 0.04 });
  } else {
    crack('body', [[-9, 31, 6.05], [-6.5, 27, 6.05], [-7.5, 22, 6.05], [-5, 17, 6.05]]);
    crack('body', [[8.5, 30, 6.05], [5.5, 25.5, 6.05], [7.5, 19, 6.05]]);
    crack('body', [[-6, 30, -7.3], [-2, 26, -7.3], [-3, 22, -7.3]]);
    crack('body', [[5, 29, -7.3], [2, 24, -7.3]]);
    crack('body', [[10.05, 24, -3], [10.05, 19, 0], [10.05, 16, -2]], 0.7);
    crack('body', [[-10.05, 26, 2], [-10.05, 20, -1]], 0.7);
  }
  // Cabeza hundida entre los hombros, con ceja de piedra.
  r.part('head', 'body', [0, 31, 1.5], 'head');
  r.box('head', rock, [-5, 31, -2.5], [5, 40, 6.5]);
  r.box('head', P.rock2, [-5.5, 36, 6.5], [5.5, 37.5, 7.75]);
  r.box('head', tone(P.rock, 0.9), [-0.9, 33.25, 6.5], [0.9, 36, 7.75]);
  r.pair('head', P.eye, [1.25, 34, 6.5], [3.75, 35.5, 6.8], { glow: true });
  r.box('head', P.glow, [-2.5, 32.25, 6.5], [2.5, 32.9, 6.7], { glow: true });
  lids(r, 'head', [[[-3.85, 33.9, 6.45], [-1.15, 35.6, 6.9]], [[1.15, 33.9, 6.45], [3.85, 35.6, 6.9]]], P.rock);
  if (v === 'hielo') {
    r.box('head', 0xffffff, [-5, 40, -2.5], [5, 40.75, 6.5], { grain: 0.05 });
    for (const xx of [-3.5, -1.5, 0.5, 2.5]) r.rod('head', 0xd8f4ff, [xx, 31.5, 6.6], [xx + 0.3, 28.5 - (xx === -1.5 ? 1 : 0), 6.9], 0.8);
  }
  // Brazos enormes: hombro, brazo, antebrazo y puño.
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'armL' : 'armR';
    const x = s * 12.5;
    r.part(n, 'body', [x, 30, 0], 'extra', s < 0 ? -1 : 1);
    const X = (a: number, b: number): [number, number] => [Math.min(x + s * a, x + s * b), Math.max(x + s * a, x + s * b)];
    let [a, b] = X(-2.5, 3.5);
    r.box(n, rock, [a, 26, -4], [b, 33, 4]);
    [a, b] = X(-2, 2.5);
    r.box(n, rock, [a, 18, -3], [b, 26, 3]);
    [a, b] = X(-3, 3.5);
    r.box(n, rock, [a, 10, -3.75], [b, 18.5, 3.75]);
    [a, b] = X(-3.5, 4);
    const fist: Paint = (xx, y, z, nn) => (nn[2] > 0.5 && Math.floor(y) % 2 === 0 && y > 6 ? P.rock2 : rock(xx, y, z, nn));
    r.box(n, fist, [a, 4, -4.5], [b, 10.5, 4.5]);
    if (v === 'hielo') r.rod(n, 0xd8f4ff, [x + s * 1, 31, -2], [x + s * 4, 37, -3], 1.6);
    else crack(n, [[x + s * 3.55, 17, 0], [x + s * 3.55, 13.5, 1.5], [x + s * 3.55, 11, -0.5]], 0.6);
  }
  return r;
}

// ─── Gólem de magma (jefe) ─────────────────────────────────────────────────────────────────────────────────

/**
 * Pintura de placa: cada caja de roca con sus aristas marcadas (claras arriba y en los bordes, oscuras abajo) y unas
 * juntas finas, para que la figura se lea nítida y no parezca un bulto, también de noche.
 */
function plate(base: number, from: V3, to: V3, hi = 1.35, joint = 4): Paint {
  return (x, y, z, n) => {
    let edges = 0;
    if (x - from[0] < 1 || to[0] - x < 1) edges++;
    if (y - from[1] < 1 || to[1] - y < 1) edges++;
    if (z - from[2] < 1 || to[2] - z < 1) edges++;
    if (n[1] > 0.5) return edges >= 2 ? tone(base, hi * 1.1) : tone(base, hi);
    if (edges >= 2) return to[1] - y < 1 ? tone(base, hi) : tone(base, 0.7);
    if (n[1] < -0.5) return tone(base, 0.65);
    // Juntas: líneas finas cada `joint` píxeles, como bloques de basalto.
    const jy = Math.abs(((y - from[1]) % joint) - joint / 2) > joint / 2 - 0.5;
    return jy ? tone(base, 0.78) : tone(base, 1 + hash3(x, y, z, 17) * 0.04);
  };
}

function golemMagma(): Rig {
  const ROCK = 0x4a3430, DARK = 0x2a1c1e, OBS = 0x2a2030;
  const MOLTEN = 0xff6a10, HOT = 0xffb428, WHITE_HOT = 0xfff0b0;
  const r = new Rig();
  const rock = (part: string, from: V3, to: V3, c = ROCK, hi?: number, joint?: number) => r.box(part, plate(c, from, to, hi, joint), from, to, { grain: 0.02 });
  const glow = (part: string, c: number, from: V3, to: V3) => r.box(part, c, from, to, { glow: true });
  // Piernas: muslo, rodillera, espinillera y pezuña, con una junta de lava en la rodilla.
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'legL' : 'legR';
    const x = s * 5;
    r.part(n, null, [x, 15, 0], 'leg', s < 0 ? 1 : -1);
    rock(n, [x - 3, 9, -3], [x + 3, 15, 3]);
    glow(n, MOLTEN, [x - 2.6, 8, -2.6], [x + 2.6, 9, 2.6]);
    rock(n, [x - 3.25, 2.5, -3.25], [x + 3.25, 8, 3.25], DARK, 1.6);
    rock(n, [x - 2.5, 6, 3.25], [x + 2.5, 10, 4.25], OBS, 2);
    rock(n, [x - 3.75, 0, -3.75], [x + 3.75, 2.5, 4.75], OBS, 1.8);
  }
  // Cadera con un cinturón de lava.
  rock('body', [-8, 13, -5], [8, 16.5, 5], DARK, 1.5);
  glow('body', MOLTEN, [-8.4, 16.5, -5.4], [8.4, 17.5, 5.4]);
  // Tronco en forma de V (más ancho arriba): se lee bien de lejos.
  rock('body', [-8, 17.5, -5.5], [8, 24, 5.5]);
  rock('body', [-10.5, 24, -6.5], [10.5, 32, 6.5]);
  // El horno del pecho: lava dentro y barrotes de obsidiana delante.
  glow('body', HOT, [-4, 19, 5.5], [4, 29, 6.6]);
  glow('body', WHITE_HOT, [-2, 22, 6.6], [2, 26, 6.8]);
  for (const bx of [-2.75, -0.5, 1.75]) r.box('body', OBS, [bx, 18.5, 6.6], [bx + 1, 29.5, 7.6], { grain: 0 });
  r.box('body', OBS, [-4.75, 28.75, 5.5], [4.75, 30, 7.6], { grain: 0 });
  r.box('body', OBS, [-4.75, 18, 5.5], [4.75, 19.25, 7.6], { grain: 0 });
  // Espalda: dos chimeneas que echan brasas.
  for (const s of [-1, 1]) {
    rock('body', [s * 4 - 1.75, 26, -9], [s * 4 + 1.75, 34, -6.5], OBS, 1.8);
    glow('body', HOT, [s * 4 - 1, 33.9, -8.25], [s * 4 + 1, 34.4, -7.25]);
  }
  // Cabeza tipo yelmo: ceja marcada, ojos rendija al rojo blanco, rejilla en la boca y cuernos hacia delante.
  r.part('head', 'body', [0, 31, 1.5], 'head');
  rock('head', [-4.5, 31, -2], [4.5, 39, 6], DARK, 1.7, 3);
  rock('head', [-5, 36.5, 5.25], [5, 38, 7.25], OBS, 2);
  glow('head', MOLTEN, [-3.75, 34.5, 6], [3.75, 36.25, 6.4]);
  r.pair('head', WHITE_HOT, [1, 35, 6.4], [3.25, 35.75, 6.6], { glow: true });
  glow('head', MOLTEN, [-2.5, 32, 6], [2.5, 33.75, 6.4]);
  for (const tx of [-2, -0.5, 1]) r.box('head', OBS, [tx, 31.75, 6.4], [tx + 1, 34, 6.9], { grain: 0 });
  for (const s of [-1, 1]) {
    r.rod('head', OBS, [s * 4.5, 37, 2], [s * 8, 39, 2.5], 2);
    r.rod('head', OBS, [s * 8, 39, 2.5], [s * 9, 42.5, 5], 1.5);
    r.rod('head', 0x4a2a2a, [s * 9, 42.5, 5], [s * 8.5, 44.5, 7], 1);
    r.box('head', HOT, [s * 8.5 - 0.5, 44.25, 6.6], [s * 8.5 + 0.5, 45.25, 7.6], { glow: true });
  }
  // Fuego en la cabeza: columnas de llama de alturas distintas (se ven las puntas, no un bulto).
  r.part('flame', 'head', [0, 39, 2]);
  const cols: [number, number, number, number][] = [[-3, -0.5, 2.5, MOLTEN], [-1.5, 0.5, 5, HOT], [0, -0.5, 6.5, HOT], [1.5, 1, 4, MOLTEN], [-0.75, 2.5, 3.5, MOLTEN], [0.75, -1.5, 3, MOLTEN], [2.75, 0.25, 2, MOLTEN]];
  for (const [fx, fz, h, c] of cols) {
    r.box('flame', c, [fx - 0.75, 39, fz - 0.75 + 2], [fx + 0.75, 39 + h, fz + 0.75 + 2], { glow: true });
    r.box('flame', h > 4 ? WHITE_HOT : HOT, [fx - 0.4, 39 + h - 1, fz - 0.4 + 2], [fx + 0.4, 39 + h + 0.6, fz + 0.4 + 2], { glow: true });
  }
  // Brazos: hombrera de obsidiana con pinchos, brazo, codo de lava, antebrazo blindado y puño de lava con nudillos.
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'armL' : 'armR';
    const x = s * 13;
    r.part(n, 'body', [x, 30, 0], 'extra', s < 0 ? -1 : 1);
    const X = (a: number, b: number): [number, number] => [Math.min(x + s * a, x + s * b), Math.max(x + s * a, x + s * b)];
    let [a, b] = X(-3, 4);
    rock(n, [a, 28, -4.5], [b, 34, 4.5], OBS, 1.9);
    r.rod(n, OBS, [x + s * 1, 33.5, -1.5], [x + s * 3.5, 38, -2.5], 1.6);
    r.rod(n, OBS, [x + s * 2.5, 33.5, 2], [x + s * 4.5, 36.5, 2.5], 1.2);
    glow(n, MOLTEN, [Math.min(x - s * 2.5, x + s * 3.5), 27.25, -3.75], [Math.max(x - s * 2.5, x + s * 3.5), 28, 3.75]);
    [a, b] = X(-2, 2.5);
    rock(n, [a, 20, -2.5], [b, 27.25, 2.5]);
    glow(n, HOT, [a + 0.25, 18.5, -2.25], [b - 0.25, 20, 2.25]);
    [a, b] = X(-2.75, 3.25);
    rock(n, [a, 11, -3.5], [b, 18.5, 3.5], DARK, 1.6);
    [a, b] = X(-3.25, 3.75);
    glow(n, HOT, [a + 0.25, 4.25, -3.75], [b - 0.25, 11, 3.75]);
    for (const ky of [5, 7.25, 9.5]) r.box(n, OBS, [a, ky, -4.25], [b, ky + 1, 4.25], { grain: 0 });
    r.box(n, OBS, [a, 4, 3.75], [b, 11, 4.5], { grain: 0 });
    r.box(n, WHITE_HOT, [x - 0.5, 3, -0.5], [x + 0.5, 4.25, 0.5], { glow: true });
  }
  return r;
}

// ─── Espíritu ──────────────────────────────────────────────────────────────────────────────────────────────

function espiritu(): Rig {
  const LIGHT = 0xc8f8ff, MID = 0x9ef0ff, DEEP = 0x5ac0e8;
  const grad: Paint = (_x, y) => mix(DEEP, LIGHT, Math.max(0, Math.min(1, (y + 9) / 15)));
  const r = new Rig();
  r.box('body', grad, [-4, -2, -4], [4, 5, 4], { glow: true });
  r.box('body', grad, [-3, 5, -3], [3, 6, 3], { glow: true });
  r.box('body', grad, [-4.5, -1, -3], [4.5, 4, 3], { glow: true });
  r.box('body', grad, [-3, -1, -4.5], [3, 4, 4.5], { glow: true });
  // Un rizo de llama en la cabeza.
  r.box('body', LIGHT, [-0.5, 6, -0.5], [0.5, 8, 0.5], { glow: true, rot: [0, 0, -0.4] });
  // Cara: ojos grandes con brillo y boquita.
  const EYES = 0x183a5a;
  r.pair('body', EYES, [0.75, 0.5, 4.5], [2.5, 3, 4.75], { grain: 0 });
  r.pair('body', WHITE, [1.75, 2.25, 4.75], [2.5, 3, 4.8], { grain: 0 });
  r.box('body', EYES, [-0.6, -0.5, 4.5], [0.6, 0.4, 4.7], { grain: 0 });
  r.pair('body', 0xffa8d8, [2.75, -0.25, 4.5], [3.75, 0.5, 4.6], { glow: true });
  lids(r, 'body', [[[-2.6, 0.4, 4.45], [-0.65, 3.1, 4.9]], [[0.65, 0.4, 4.45], [2.6, 3.1, 4.9]]], MID);
  // Bracitos.
  for (const s of [-1, 1] as const) {
    const n = s < 0 ? 'armL' : 'armR';
    r.part(n, 'body', [s * 4.5, 1.5, 0], 'extra', s);
    r.box(n, MID, [Math.min(s * 4.5, s * 6.75), 0, -1], [Math.max(s * 4.5, s * 6.75), 2, 1], { glow: true });
  }
  // Cola que ondea, en cuatro trozos.
  r.part('t1', 'body', [0, -2, 0], 'tail');
  r.box('t1', grad, [-3, -5, -3], [3, -2, 3], { glow: true });
  r.part('t2', 't1', [0, -5, -0.25], 'tail');
  r.box('t2', grad, [-2, -7.5, -2.25], [2, -5, 1.75], { glow: true });
  r.part('t3', 't2', [0, -7.5, -0.5], 'tail');
  r.box('t3', grad, [-1.25, -9.25, -1.75], [1.25, -7.5, 0.75], { glow: true });
  r.part('t4', 't3', [0, -9.25, -0.75], 'tail');
  r.box('t4', DEEP, [-0.6, -10.5, -1.6], [0.6, -9.25, -0.4], { glow: true });
  // Chispitas que dan vueltas alrededor.
  r.part('orbit', 'body', [0, 1, 0]);
  for (const [a, y] of [[0, 3], [2.1, -1], [4.2, 1]] as [number, number][]) {
    const cx = Math.cos(a) * 7.5, cz = Math.sin(a) * 7.5;
    r.box('orbit', 0xfff8c0, [cx - 0.4, y - 0.4, cz - 0.4], [cx + 0.4, y + 0.4, cz + 0.4], { glow: true });
  }
  return r;
}

// ─── Catálogo ──────────────────────────────────────────────────────────────────────────────────────────────

export type EnemyAnim = 'limo' | 'murcielago' | 'esqueleto' | 'golem' | 'espiritu';

export interface EnemyLook {
  rig: () => Rig;
  anim: EnemyAnim;
  /** Transparencia de la gelatina de los limos (piezas «shell»). */
  shell?: number;
  /** Brillo propio de la roca (el gólem de magma está caliente: nunca se ve negro del todo de noche). */
  emissive?: number;
  /** Transparencia de toda la figura (el espíritu). */
  opacity?: number;
}

export const ENEMY_LOOKS: Record<HostileKind, EnemyLook> = {
  limo: { rig: () => limo(false), anim: 'limo', shell: 0.5 },
  murcielago: { rig: murcielago, anim: 'murcielago' },
  esqueleto: { rig: () => esqueleto(false), anim: 'esqueleto' },
  golem_lava: { rig: () => golem('lava'), anim: 'golem', emissive: 0x1c0804 },
  espiritu: { rig: espiritu, anim: 'espiritu', opacity: 0.85 },
  rey_esqueleto: { rig: () => esqueleto(true), anim: 'esqueleto' },
  limo_dorado: { rig: () => limo(true), anim: 'limo', shell: 0.6 },
  golem_hielo: { rig: () => golem('hielo'), anim: 'golem' },
  golem_magma: { rig: golemMagma, anim: 'golem', emissive: 0x2a0c04 },
};

const built = new Map<HostileKind, FaunaGeometry>();

/** La figura de una criatura (se construye una sola vez por especie). */
export function enemyGeometry(kind: HostileKind): FaunaGeometry {
  let g = built.get(kind);
  if (!g) built.set(kind, (g = buildRig(ENEMY_LOOKS[kind].rig())));
  return g;
}

/** Construye las figuras poco a poco cuando el navegador está libre, para que la primera criatura no dé tirón. */
export function prewarmEnemies() {
  const kinds = (Object.keys(ENEMY_LOOKS) as HostileKind[]).filter((k) => !built.has(k));
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 50));
  const next = () => {
    const k = kinds.shift();
    if (!k) return;
    enemyGeometry(k);
    idle(next);
  };
  idle(next);
}

/** Lo que la criatura está haciendo en este fotograma (lo decide hostiles.ts). */
export interface EnemyState {
  /** Cuánto anda (0: quieta, 1: a toda velocidad). */
  moving: number;
  /** Preparando el golpe o el disparo (0..1): levanta los brazos, tensa el arco, se agacha. */
  ready: number;
  /** El ataque que prepara un jefe y cuánto le falta (0 al empezar, 1 al soltarlo). */
  casting: BossAttack | null;
  cast: number;
  /** Destello rojo al recibir un golpe. */
  flash: boolean;
  /** Transparencia (el espíritu se vuelve casi invisible antes de atacar). */
  fade?: number;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Una criatura hostil montada. `group` se coloca, se gira y se escala desde fuera; lo demás lo mueve `animate`. */
export class EnemyModel {
  readonly group = new THREE.Group();
  /** Inclinaciones y saltos de todo el cuerpo (dentro de `group`). */
  readonly pose = new THREE.Group();
  readonly legs: THREE.Object3D[] = [];
  readonly wings: THREE.Object3D[] = [];
  /** Materiales propios de esta criatura (para el destello al recibir un golpe): el sólido y la gelatina. */
  readonly mats: THREE.MeshLambertMaterial[] = [];
  /** Lo que brilla. */
  readonly glowMats: THREE.MeshBasicMaterial[] = [];
  readonly byName = new Map<string, THREE.Object3D>();
  readonly anim: EnemyAnim;
  private near: THREE.Mesh[] = [];
  private far: THREE.Mesh[] = [];
  private isFar = false;
  private lids: THREE.Object3D[] = [];
  private seed = Math.random() * 100;
  private walk = Math.random() * 10;
  private blinkIn = 1 + Math.random() * 3;
  private lookIn = Math.random() * 2;
  private look = 0;
  private lookTo = 0;
  private chatter = 0;
  private strikeT = 9;
  private strikeLen = 0.45;
  private strikeKind: BossAttack | 'golpe' = 'golpe';
  private hurtT = 9;
  private baseOpacity: number;
  private baseEmissive: number;
  private shellOpacity: number;

  constructor(readonly kind: HostileKind) {
    const look = ENEMY_LOOKS[kind];
    this.anim = look.anim;
    const geometry = enemyGeometry(kind);
    this.baseOpacity = look.opacity ?? 1;
    this.baseEmissive = look.emissive ?? 0;
    this.shellOpacity = look.shell ?? 1;
    const solid = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: this.baseOpacity < 1, opacity: this.baseOpacity });
    this.mats.push(solid);
    let shell: THREE.MeshLambertMaterial | null = null;
    if (look.shell) {
      shell = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: look.shell, depthWrite: false });
      this.mats.push(shell);
    }
    const glow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: this.baseOpacity < 1, opacity: this.baseOpacity });
    this.glowMats.push(glow);
    this.group.add(this.pose);
    geometry.parts.forEach((p, i) => {
      const o = new THREE.Group();
      o.name = p.name;
      o.position.copy(p.offset);
      o.rotation.copy(p.rest);
      o.userData.rest = p.rest.clone();
      o.userData.side = p.side;
      const mat = shell && p.name.startsWith('shell') ? shell : solid;
      const farPart = geometry.far?.parts[i];
      for (const [g, list, m, lit] of [
        [p.geo, this.near, mat, true], [farPart?.geo, this.far, mat, true],
        [p.glow, this.near, glow, false], [farPart?.glow, this.far, glow, false],
      ] as [THREE.BufferGeometry | null | undefined, THREE.Mesh[], THREE.Material, boolean][]) {
        if (!g) continue;
        const mesh = new THREE.Mesh(g, m);
        if (!lit) mesh.userData.noEntityLight = true;
        if (m === shell) mesh.renderOrder = 1;
        if (list === this.far) mesh.visible = false;
        o.add(mesh);
        list.push(mesh);
      }
      (p.parent ? this.byName.get(p.parent)! : this.pose).add(o);
      this.byName.set(p.name, o);
      if (p.role === 'leg') this.legs.push(o);
      else if (p.role === 'wing') this.wings.push(o);
      else if (p.role === 'lid') {
        o.visible = false;
        this.lids.push(o);
      }
    });
  }

  /** Suelta el golpe (o el ataque del jefe): la animación dura un momento. */
  strike(kind: BossAttack | 'golpe' = 'golpe') {
    this.strikeKind = kind;
    this.strikeT = 0;
    this.strikeLen = kind === 'pisoton' ? 0.6 : kind === 'anillo' ? 0.7 : 0.45;
  }

  /** Le han dado: se echa hacia atrás. */
  hurt() {
    this.hurtT = 0;
  }

  /** Si se está dibujando la figura de lejos (para las pruebas). */
  get farNow(): boolean {
    return this.isFar;
  }

  private rot(name: string, x: number, y = 0, z = 0) {
    const o = this.byName.get(name);
    if (!o) return;
    const r = o.userData.rest as THREE.Euler;
    o.rotation.set(r.x + x, r.y + y, r.z + z);
  }

  animate(dt: number, seconds: number, s: EnemyState) {
    // De lejos, con menos detalle.
    const gp = this.group.position;
    const farNow = this.far.length > 0 && (gp.x - faunaEye.x) ** 2 + (gp.y - faunaEye.y) ** 2 + (gp.z - faunaEye.z) ** 2 > FAUNA_FAR * FAUNA_FAR;
    if (farNow !== this.isFar) {
      this.isFar = farNow;
      for (const m of this.near) m.visible = !farNow;
      for (const m of this.far) m.visible = farNow;
    }
    this.strikeT += dt;
    this.hurtT += dt;
    const k = Math.min(1, this.strikeT / this.strikeLen);
    const hit = k < 1 ? Math.sin(k * Math.PI) : 0;
    const hurt = this.hurtT < 0.3 ? Math.sin((this.hurtT / 0.3) * Math.PI) : 0;
    // Parpadeo y mirar a los lados (solo si no está peleando).
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) this.blinkIn = 1.5 + Math.random() * 3.5;
    for (const l of this.lids) l.visible = this.blinkIn < 0.12;
    this.lookIn -= dt;
    if (this.lookIn <= 0) {
      this.lookIn = 1 + Math.random() * 2.5;
      this.lookTo = s.ready > 0 || s.casting ? 0 : (Math.random() * 2 - 1) * 0.6;
    }
    this.look += (this.lookTo - this.look) * Math.min(1, dt * 4);
    this.walk += dt * (this.anim === 'golem' ? 5 : 8) * Math.max(0.15, s.moving);
    const swing = Math.sin(this.walk) * s.moving;
    // Colores: rojo al recibir un golpe; los jefes parpadean en blanco mientras preparan un ataque.
    const blinkCast = s.casting && Math.sin(seconds * 30) > 0;
    for (const m of this.mats) m.emissive.setHex(s.flash ? 0xaa0000 : blinkCast ? (this.baseEmissive ? 0x7a3010 : 0x444444) : this.baseEmissive);
    const fade = s.fade ?? 1;
    this.mats[0].opacity = this.baseOpacity * fade;
    if (this.mats[1]) this.mats[1].opacity = this.shellOpacity * fade;
    const pulse = this.anim === 'golem' || this.anim === 'espiritu' ? 0.88 + Math.sin(seconds * 3 + this.seed) * 0.12 : 1;
    const burst = (s.casting === 'anillo' ? s.cast * 0.8 : 0) + (this.strikeKind === 'anillo' ? hit * 1.2 : 0);
    for (const g of this.glowMats) {
      if (s.flash) g.color.setRGB(1, 0.35, 0.35);
      else g.color.setScalar(pulse + burst);
      g.opacity = this.baseOpacity * fade;
    }
    this.pose.position.set(0, 0, 0);
    this.pose.rotation.set(-hurt * 0.3, 0, 0);
    this.pose.scale.set(1, 1, 1);
    for (const leg of this.legs) leg.rotation.x = swing * 0.6 * (leg.userData.side as number);
    switch (this.anim) {
      case 'limo': this.limo(dt, seconds, s, hit); break;
      case 'murcielago': this.bat(seconds, s, hit); break;
      case 'esqueleto': this.skeleton(dt, seconds, s, swing, hit, k); break;
      case 'golem': this.golem(seconds, s, swing, hit, k); break;
      case 'espiritu': this.spirit(dt, seconds, s, hit); break;
    }
  }

  private limo(_dt: number, seconds: number, s: EnemyState, hit: number) {
    // Tiembla como gelatina; se agacha antes de saltar encima y se estira al golpear.
    const w = Math.sin(seconds * 4 + this.seed) * 0.035;
    const ready = Math.max(s.ready, s.casting ? s.cast : 0);
    const sq = ready * 0.22 - hit * 0.25;
    this.pose.scale.set(1 + w + sq * 0.5, 1 - w - sq, 1 + w + sq * 0.5);
    this.pose.position.z = hit * 0.3;
    const face = this.byName.get('face');
    if (face) face.position.x = this.look * 0.06;
    const jaw = this.byName.get('jaw');
    if (jaw) jaw.scale.y = 1 + ready * 1.2 + hit * 2;
    const crown = this.byName.get('crown');
    if (crown) crown.rotation.z = -w * 3;
  }

  private bat(seconds: number, s: EnemyState, hit: number) {
    // Aletea sin parar; se echa atrás antes de lanzarse en picado con las alas recogidas.
    const flap = Math.sin(seconds * 18 + this.seed);
    const fold = hit;
    for (const wing of this.wings) {
      const side = wing.userData.side as number;
      wing.rotation.z = (flap * 0.7 * (1 - fold) - fold * 0.9) * side * -1;
      const tip = this.byName.get(side < 0 ? 'wingL2' : 'wingR2');
      if (tip) tip.rotation.z = (Math.sin(seconds * 18 + this.seed - 0.6) * 0.45 * (1 - fold) - fold * 0.9) * side * -1;
    }
    this.pose.position.y = Math.sin(seconds * 9 + this.seed) * 0.04;
    this.pose.rotation.x += -s.ready * 0.45 + hit * 0.8;
    this.rot('head', 0, this.look * 0.6);
    const ear = Math.max(0, Math.sin(seconds * 5 + this.seed)) ** 8 * 0.4;
    this.rot('earL', 0, 0, ear);
    this.rot('earR', 0, 0, -ear);
  }

  private skeleton(dt: number, seconds: number, s: EnemyState, swing: number, hit: number, k: number) {
    const boss = this.kind === 'rey_esqueleto';
    // Apuntar: el arco al frente con el brazo izquierdo y la cuerda tensa con el derecho.
    const aim = Math.max(s.ready, s.casting === 'rafaga' ? s.cast : 0, this.strikeKind === 'rafaga' || this.strikeKind === 'golpe' ? hit * 0.8 : 0);
    const up = s.casting === 'pisoton' ? smooth(s.cast) : 0;
    const call = s.casting === 'llamada' ? smooth(s.cast) : this.strikeKind === 'llamada' ? hit : 0;
    const slam = this.strikeKind === 'pisoton' && k < 1 ? hit : 0;
    const armUp = Math.max(up, slam * 0.6);
    const recoil = (this.strikeKind === 'golpe' || this.strikeKind === 'rafaga') ? hit * 0.35 : 0;
    this.rot('armL', -swing * 0.4 - aim * 1.4 - armUp * 2.6, aim * 0.3, -call * 1.1);
    this.rot('armR', swing * 0.4 - aim * 1.3 - armUp * 2.6 + recoil, -aim * 0.6, call * 1.1);
    this.pose.rotation.y = aim * 0.5;
    this.pose.position.y = slam * -0.08;
    this.pose.rotation.x += slam * 0.15;
    // Mira; echa la cabeza atrás y se ríe al llamar a los suyos; castañetea de vez en cuando.
    this.rot('head', -call * 0.5 + Math.sin(seconds * 1.7 + this.seed) * 0.03, this.look - aim * 0.4);
    this.chatter = Math.max(0, this.chatter - dt);
    if (this.chatter <= 0 && Math.random() < dt * 0.25) this.chatter = 0.6;
    const jaw = call > 0 ? Math.abs(Math.sin(seconds * 22)) * 0.4 : this.chatter > 0 ? Math.abs(Math.sin(seconds * 26)) * 0.3 : 0;
    this.rot('jaw', jaw);
    if (boss) this.rot('cape', s.moving * 0.35 + Math.sin(seconds * 2.3 + this.seed) * 0.06 + slam * 0.3);
  }

  private golem(seconds: number, s: EnemyState, swing: number, hit: number, k: number) {
    // Respira despacio; prepara el golpe con los dos brazos arriba y los deja caer.
    const breathe = Math.sin(seconds * 1.6 + this.seed) * 0.02;
    const body = this.byName.get('body')!;
    body.scale.set(1 + breathe, 1 + breathe * 0.5, 1 + breathe);
    const ready = s.casting === 'pisoton' || s.casting === null ? Math.max(s.ready, s.casting ? smooth(s.cast) : 0) : 0;
    const point = s.casting === 'rafaga' ? smooth(s.cast) : 0;
    const spread = s.casting === 'anillo' ? smooth(s.cast) : this.strikeKind === 'anillo' ? hit : 0;
    const call = s.casting === 'llamada' ? smooth(s.cast) : 0;
    // El golpe: los brazos bajan de golpe al principio y vuelven despacio.
    const down = this.strikeKind === 'golpe' || this.strikeKind === 'pisoton' ? (k < 1 ? (k < 0.25 ? 1 - k / 0.25 : 0) : 1) : 1;
    const slamming = (this.strikeKind === 'golpe' || this.strikeKind === 'pisoton') && k < 1;
    const raise = slamming ? -2.6 * down + 0.35 * (1 - down) * (1 - k) : -2.6 * ready;
    const thrust = this.strikeKind === 'rafaga' ? hit : 0;
    this.rot('armL', -swing * 0.35 + raise - call * 1.4, 0, -spread * 1.3);
    this.rot('armR', swing * 0.35 + raise - point * 1.5 - thrust * 1.5 - call * 1.4, 0, spread * 1.3);
    this.pose.rotation.x += slamming && k < 0.5 ? 0.18 * Math.sin((k / 0.5) * Math.PI) : 0;
    this.pose.position.y = slamming && this.strikeKind === 'pisoton' ? -Math.sin(k * Math.PI) * 0.1 : Math.abs(swing) * 0.03;
    this.pose.rotation.z = swing * 0.04;
    this.rot('head', -call * 0.4 + ready * 0.15, this.look * 0.5);
    const flame = this.byName.get('flame');
    if (flame) {
      flame.scale.set(1 + Math.sin(seconds * 9) * 0.06, 1 + Math.sin(seconds * 13 + 1) * 0.18 + spread * 0.5, 1 + Math.sin(seconds * 11) * 0.06);
      flame.rotation.y = Math.sin(seconds * 3) * 0.3;
    }
  }

  private spirit(dt: number, seconds: number, s: EnemyState, hit: number) {
    // Flota, la cola ondea, los bracitos se mueven y las chispas dan vueltas.
    this.pose.position.y = Math.sin(seconds * 2 + this.seed) * 0.06;
    this.pose.position.z = hit * 0.45;
    const big = 1 + hit * 0.15;
    this.pose.scale.set(big, big, big);
    let lag = 0;
    for (const t of ['t1', 't2', 't3', 't4']) {
      lag += 0.7;
      this.rot(t, Math.sin(seconds * 3 - lag) * 0.18 + s.moving * 0.25, 0, Math.sin(seconds * 2.4 - lag + this.seed) * 0.28);
    }
    const flutter = Math.sin(seconds * 6 + this.seed) * 0.3;
    this.rot('armL', -s.ready * 1.2, 0, flutter);
    this.rot('armR', -s.ready * 1.2, 0, -flutter);
    const orbit = this.byName.get('orbit');
    if (orbit) orbit.rotation.y += dt * 2.2;
  }

  dispose() {
    for (const m of this.mats) m.dispose();
    for (const m of this.glowMats) m.dispose();
  }
}
