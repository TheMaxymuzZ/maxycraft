// Criaturas hostiles (v4.24): simpáticas pero peleonas. Solo salen lejos de casa: en las cuevas, en los biomas
// extraños (bosque bioluminiscente, tierras volcánicas, bosque de setas) y, más adelante, en mazmorras y ruinas.
// Tu isla y las islas aldea son siempre pacíficas, y con el «modo tranquilo» no sale ninguna.
// Aquí está cómo es cada una, cómo se mueve y ataca, y las flechas (las suyas y las tuyas).
import * as THREE from 'three';
import { Population } from './population';
import { type Part, type PartsModel, partsModel } from './wildlife';

export type HostileKind = 'limo' | 'murcielago' | 'esqueleto' | 'golem_lava' | 'espiritu'
  | 'rey_esqueleto' | 'limo_dorado' | 'golem_hielo' | 'golem_magma';

/** Ataques de los jefes de las mazmorras (v4.25). Antes de cada uno avisan, para que se puedan aprender. */
export type BossAttack = 'rafaga' | 'pisoton' | 'llamada' | 'anillo';

export const BOSS_TELLS: Record<BossAttack, string> = {
  rafaga: 'tensa el arco: ¡apártate de su línea!',
  pisoton: 'levanta los brazos: ¡aléjate o esquiva!',
  llamada: 'llama a sus ayudantes',
  anillo: 'brilla muy fuerte: ¡cúbrete con el escudo!',
};

/** Dónde puede salir: en una cueva (bajo tierra y a oscuras) o en un bioma extraño. */
export type HostilePlace = 'cueva' | 'luminoso' | 'volcanico' | 'setas';

export interface HostileDef {
  name: string;
  hp: number;
  /** Daño de cada golpe (o de cada flecha, el esqueleto). */
  damage: number;
  speed: number;
  move: 'salta' | 'vuela' | 'anda' | 'flota';
  places: HostilePlace[];
  /** Solo de noche (fuera de las cuevas). */
  night?: boolean;
  /** Ataca de lejos con flechas. */
  ranged?: boolean;
  /** Lo que puede soltar, de más común a más raro (la rareza de cada objeto decide la probabilidad). */
  loot: string[];
  text: string;
  parts: Part[];
  /** Los jefes de las mazmorras (v4.25): sus ataques, su tamaño y a quién llaman. */
  boss?: { attacks: BossAttack[]; scale: number; size: [number, number]; minion?: HostileKind };
}

export const HOSTILES = {
  limo: {
    name: 'Limo', hp: 8, damage: 2, speed: 2.2, move: 'salta', places: ['setas', 'cueva'],
    loot: ['baba_limo', 'perla_negra', 'corona_limo'],
    text: 'Bota hacia ti dando saltos. Si vences a uno grande, se parte en dos pequeños.',
    parts: [
      { s: [0.9, 0.8, 0.9], p: [0, 0.4, 0], c: 0x6cc850 }, { s: [0.5, 0.4, 0.5], p: [0, 0.35, 0], c: 0x4a9a38 },
      { s: [0.14, 0.18, 0.04], p: [-0.18, 0.55, 0.46], c: 0x1a2a1a }, { s: [0.14, 0.18, 0.04], p: [0.18, 0.55, 0.46], c: 0x1a2a1a },
      { s: [0.2, 0.06, 0.04], p: [0, 0.3, 0.46], c: 0x1a2a1a },
    ],
  },
  murcielago: {
    name: 'Murciélago de cueva', hp: 4, damage: 1, speed: 4, move: 'vuela', places: ['cueva'],
    loot: ['ala_murcielago', 'perla_negra'],
    text: 'Revolotea en las cuevas y se lanza en picado. Pica poco, pero no para quieto.',
    parts: [
      { s: [0.28, 0.3, 0.28], p: [0, 0, 0], c: 0x4a3a4a }, { s: [0.06, 0.12, 0.04], p: [-0.08, 0.2, 0.1], c: 0x3a2a3a },
      { s: [0.06, 0.12, 0.04], p: [0.08, 0.2, 0.1], c: 0x3a2a3a }, { s: [0.06, 0.06, 0.04], p: [-0.06, 0.04, 0.15], c: 0xff5050, glow: true },
      { s: [0.06, 0.06, 0.04], p: [0.06, 0.04, 0.15], c: 0xff5050, glow: true },
      { s: [0.5, 0.04, 0.3], p: [-0.38, 0.06, 0], c: 0x5a4a5a, wing: -1 }, { s: [0.5, 0.04, 0.3], p: [0.38, 0.06, 0], c: 0x5a4a5a, wing: 1 },
    ],
  },
  esqueleto: {
    name: 'Esqueleto de ruina', hp: 12, damage: 2, speed: 1.6, move: 'anda', places: ['cueva', 'volcanico', 'setas'], night: true, ranged: true,
    loot: ['hueso', 'flecha', 'perla_negra'],
    text: 'Guarda las ruinas y las cuevas hondas. Dispara flechas desde lejos: acércate o cúbrete con el escudo.',
    parts: [
      { s: [0.4, 0.5, 0.22], p: [0, 1.15, 0], c: 0xe8e2d0 }, { s: [0.36, 0.36, 0.36], p: [0, 1.6, 0], c: 0xf0ecdc },
      { s: [0.08, 0.08, 0.04], p: [-0.09, 1.62, 0.19], c: 0x202020 }, { s: [0.08, 0.08, 0.04], p: [0.09, 1.62, 0.19], c: 0x202020 },
      { s: [0.1, 0.5, 0.1], p: [-0.28, 1.15, 0.05], c: 0xe0dac8 }, { s: [0.1, 0.5, 0.1], p: [0.28, 1.15, 0.05], c: 0xe0dac8 },
      { s: [0.04, 0.6, 0.04], p: [0.34, 1.15, 0.2], c: 0x8a6a3a },
      { s: [0.12, 0.75, 0.12], p: [-0.1, 0.8, 0], c: 0xe0dac8, leg: 1 }, { s: [0.12, 0.75, 0.12], p: [0.1, 0.8, 0], c: 0xe0dac8, leg: -1 },
    ],
  },
  golem_lava: {
    name: 'Gólem de lava', hp: 30, damage: 4, speed: 1.1, move: 'anda', places: ['volcanico'],
    loot: ['nucleo_lava', 'perla_negra', 'corazon_volcan'],
    text: 'Grande, lento y muy fuerte. Golpea con los dos puños: esquívalo o bloquea con un escudo de hierro.',
    parts: [
      { s: [1.2, 1.1, 0.8], p: [0, 1.5, 0], c: 0x3a3030 }, { s: [0.8, 0.3, 0.06], p: [0, 1.6, 0.42], c: 0xff7a20, glow: true },
      { s: [0.6, 0.5, 0.5], p: [0, 2.3, 0.05], c: 0x2e2626 }, { s: [0.12, 0.08, 0.04], p: [-0.14, 2.35, 0.31], c: 0xffb040, glow: true },
      { s: [0.12, 0.08, 0.04], p: [0.14, 2.35, 0.31], c: 0xffb040, glow: true },
      { s: [0.36, 1, 0.36], p: [-0.8, 1.4, 0], c: 0x443838 }, { s: [0.36, 1, 0.36], p: [0.8, 1.4, 0], c: 0x443838 },
      { s: [0.4, 0.95, 0.4], p: [-0.3, 0.95, 0], c: 0x3a3030, leg: 1 }, { s: [0.4, 0.95, 0.4], p: [0.3, 0.95, 0], c: 0x3a3030, leg: -1 },
    ],
  },
  espiritu: {
    name: 'Espíritu brillante', hp: 6, damage: 2, speed: 2.6, move: 'flota', places: ['luminoso'], night: true,
    loot: ['polvo_espiritu', 'perla_negra', 'lagrima_estrella'],
    text: 'Flota entre los árboles del bosque bioluminiscente de noche. Se vuelve casi invisible un momento antes de atacar.',
    parts: [
      { s: [0.5, 0.6, 0.5], p: [0, 0, 0], c: 0x9ef0ff, glow: true }, { s: [0.36, 0.3, 0.36], p: [0, -0.42, 0], c: 0x7ad0f0, glow: true },
      { s: [0.1, 0.12, 0.04], p: [-0.1, 0.08, 0.26], c: 0x1a3a5a }, { s: [0.1, 0.12, 0.04], p: [0.1, 0.08, 0.26], c: 0x1a3a5a },
    ],
  },
} as Record<HostileKind, HostileDef>;

/** Las piezas de un modelo con otros colores (para los jefes, que son versiones grandes de las criaturas). */
function recolor(parts: Part[], colors: Record<number, number>, extra: Part[] = []): Part[] {
  return [...parts.map((p) => ({ ...p, c: colors[p.c] ?? p.c })), ...extra];
}

Object.assign(HOSTILES, {
  rey_esqueleto: {
    name: 'Rey esqueleto', hp: 60, damage: 3, speed: 1.4, move: 'anda', places: [],
    loot: ['hueso', 'perla_negra'],
    text: 'Jefe de las catacumbas. Dispara ráfagas de flechas, da pisotones y llama a otros esqueletos.',
    parts: recolor(HOSTILES.esqueleto.parts, {}, [{ s: [0.42, 0.16, 0.42], p: [0, 1.86, 0], c: 0xf0c030 }, { s: [0.08, 0.12, 0.08], p: [0, 2, 0.17], c: 0xe03040 }]),
    boss: { attacks: ['rafaga', 'pisoton', 'llamada'], scale: 1.6, size: [0.6, 3.1], minion: 'esqueleto' },
  },
  limo_dorado: {
    name: 'Gran limo dorado', hp: 70, damage: 4, speed: 2, move: 'salta', places: [],
    loot: ['baba_limo', 'perla_negra'],
    text: 'Jefe del templo de arenisca. Cae encima con todo su peso y suelta limos pequeños.',
    parts: recolor(HOSTILES.limo.parts, { 0x6cc850: 0xf0c040, 0x4a9a38: 0xc08a20 }),
    boss: { attacks: ['pisoton', 'llamada'], scale: 2.6, size: [1.2, 2.2], minion: 'limo' },
  },
  golem_hielo: {
    name: 'Gólem de hielo', hp: 80, damage: 4, speed: 1.1, move: 'anda', places: [],
    loot: ['perla_negra'],
    text: 'Jefe de la cueva helada. Lanza esquirlas de hielo, golpea el suelo y suelta un anillo de escarcha.',
    parts: recolor(HOSTILES.golem_lava.parts, { 0x3a3030: 0x9cc8e8, 0x2e2626: 0x88b8e0, 0x443838: 0xa8d4f0, 0xff7a20: 0xe8f8ff, 0xffb040: 0x2060c0 }),
    boss: { attacks: ['rafaga', 'pisoton', 'anillo'], scale: 1.3, size: [1, 3.4] },
  },
  golem_magma: {
    name: 'Gólem de magma', hp: 90, damage: 5, speed: 1.1, move: 'anda', places: [],
    loot: ['nucleo_lava', 'perla_negra'],
    text: 'Jefe de la fragua volcánica. Suelta anillos de fuego, golpea el suelo y llama a murciélagos.',
    parts: recolor(HOSTILES.golem_lava.parts, { 0x3a3030: 0x5a2a20, 0xff7a20: 0xffd040 }),
    boss: { attacks: ['anillo', 'pisoton', 'llamada'], scale: 1.4, size: [1.1, 3.7], minion: 'murcielago' },
  },
} satisfies Partial<Record<HostileKind, HostileDef>>);

export const HOSTILE_KINDS = Object.keys(HOSTILES) as HostileKind[];
export const BOSS_KINDS = HOSTILE_KINDS.filter((k) => HOSTILES[k].boss);

/** Las criaturas que pueden salir en un sitio a esa hora. */
export function hostilesFor(place: HostilePlace, night: boolean): HostileKind[] {
  return HOSTILE_KINDS.filter((k) => {
    const d = HOSTILES[k];
    if (!d.places.includes(place)) return false;
    return place === 'cueva' || !d.night || night;
  });
}

/** Lo que las criaturas necesitan saber del mundo. */
export interface HostileWorld {
  solid(x: number, y: number, z: number): boolean;
  /** Dónde estás: en una cueva, en un bioma extraño o en un sitio tranquilo (null). */
  placeAt(x: number, y: number, z: number): HostilePlace | null;
}

export interface Hostile {
  kind: HostileKind;
  hp: number;
  max: number;
  /** Los limos grandes (2) se parten en dos pequeños (1). */
  size: number;
  pos: THREE.Vector3;
  vy: number;
  yaw: number;
  model: PartsModel;
  zone: string;
  /** Segundos hasta poder volver a atacar. */
  cooldown: number;
  /** Destello rojo al recibir un golpe. */
  flash: number;
  /** Empujón al recibir un golpe. */
  push: THREE.Vector3;
  phase: number;
  /** Se ha visto al jugador: va a por él. */
  angry: boolean;
  /** No se va aunque se haga de día ni te alejes (la zona de pruebas). */
  pinned?: boolean;
  /** Segundos hasta el próximo bote (limos). */
  hop: number;
  /** El ataque que está preparando un jefe y lo que le falta para soltarlo. */
  casting: BossAttack | null;
  castT: number;
}

export interface Arrow {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  damage: number;
  /** La ha disparado el jugador (daña criaturas) o un esqueleto (daña al jugador). */
  mine: boolean;
  life: number;
}

/** Lo que pasa en un fotograma: golpes que recibes. */
export interface HostileEvents {
  hits: { kind: HostileKind; damage: number; from: THREE.Vector3 }[];
  /** Avisos de los jefes antes de atacar («El rey esqueleto tensa el arco…»). */
  announce: string[];
}

const UP = new THREE.Vector3(0, 1, 0);
const SPAWN_NEAR = 10;
const SPAWN_FAR = 24;
const GONE = 48;
const SIGHT = 14;
const MELEE = 1.4;
const GRAVITY = 22;

export class Hostiles {
  readonly group = new THREE.Group();
  readonly list: Hostile[] = [];
  readonly arrows: Arrow[] = [];
  /** Si es false (en casa, en una aldea o en modo tranquilo) no sale ninguna y las que hay se van. */
  enabled = false;
  private spawnTimer = 0;
  private population = new Population({ hostiles: { perZone: 3, total: 6, respawn: 120 } });
  private box = new THREE.Box3();
  private hit = new THREE.Vector3();
  private arrowGeo = new THREE.BoxGeometry(0.06, 0.06, 0.6);
  private arrowMat = new THREE.MeshLambertMaterial({ color: 0x9a7040 });

  constructor(private random: () => number = Math.random) {}

  /** Pone una criatura en (x, y, z): para el aparecer normal y para la zona de pruebas. */
  spawn(kind: HostileKind, x: number, y: number, z: number, size = kind === 'limo' ? 2 : 1): Hostile {
    const def = HOSTILES[kind];
    const model = partsModel(def.parts, kind === 'espiritu' ? 0.8 : 1);
    const scale = def.boss?.scale ?? (kind === 'limo' ? (size >= 2 ? 1 : 0.55) : 1);
    model.group.scale.setScalar(scale);
    const max = kind === 'limo' && size < 2 ? 3 : def.hp;
    const h: Hostile = {
      kind, hp: max, max, size, pos: new THREE.Vector3(x, y, z), vy: 0, yaw: this.random() * Math.PI * 2, model,
      zone: this.population.add('hostiles', x, z), cooldown: 1, flash: 0, push: new THREE.Vector3(), phase: this.random() * 10, angry: false, hop: 0.5, casting: null, castT: 0,
    };
    model.group.position.copy(h.pos);
    this.group.add(model.group);
    this.list.push(h);
    return h;
  }

  update(dt: number, seconds: number, player: THREE.Vector3, night: number, world: HostileWorld): HostileEvents {
    const events: HostileEvents = { hits: [], announce: [] };
    this.population.update(dt);
    if (!this.enabled) {
      this.clear();
      return events;
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.5;
      this.trySpawn(player, night > 0.5, world);
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const h = this.list[i];
      const def = HOSTILES[h.kind];
      const away = h.pos.distanceTo(player);
      // Los de noche se van al hacerse de día (salvo en la cueva).
      const gone = !h.pinned && (away > GONE || (def.night && night < 0.3 && world.placeAt(Math.floor(h.pos.x), Math.floor(h.pos.y), Math.floor(h.pos.z)) !== 'cueva'));
      if (gone) {
        this.remove(i, false);
        continue;
      }
      this.step(h, dt, seconds, player, world, events);
    }
    this.updateArrows(dt, player, world, events);
    return events;
  }

  private trySpawn(player: THREE.Vector3, night: boolean, world: HostileWorld) {
    const here = world.placeAt(Math.floor(player.x), Math.floor(player.y), Math.floor(player.z));
    if (!here) return;
    const a = this.random() * Math.PI * 2;
    const d = SPAWN_NEAR + this.random() * (SPAWN_FAR - SPAWN_NEAR);
    const x = Math.floor(player.x + Math.cos(a) * d);
    const z = Math.floor(player.z + Math.sin(a) * d);
    // Busca suelo con sitio encima cerca de tu altura (en las cuevas, dentro de la cueva).
    let y = -1;
    for (let dy = 4; dy >= -6; dy--) {
      const yy = Math.floor(player.y) + dy;
      if (world.solid(x, yy - 1, z) && !world.solid(x, yy, z) && !world.solid(x, yy + 1, z)) {
        y = yy;
        break;
      }
    }
    if (y < 0) return;
    const place = world.placeAt(x, y, z);
    if (!place || !this.population.canSpawn('hostiles', x, z)) return;
    const options = hostilesFor(place, night);
    if (!options.length) return;
    const kind = options[Math.floor(this.random() * options.length)];
    const fly = HOSTILES[kind].move === 'vuela' || HOSTILES[kind].move === 'flota';
    this.spawn(kind, x + 0.5, y + (fly ? 1.2 : 0), z + 0.5);
  }

  /** Altura del suelo bajo (x, z) cerca de `y`: el primer bloque sólido con dos de aire encima. */
  private floorAt(world: HostileWorld, x: number, y: number, z: number): number | null {
    const fx = Math.floor(x);
    const fz = Math.floor(z);
    for (let yy = Math.floor(y) + 1; yy >= Math.floor(y) - 3; yy--) {
      if (world.solid(fx, yy - 1, fz) && !world.solid(fx, yy, fz) && !world.solid(fx, yy + 1, fz)) return yy;
    }
    return null;
  }

  private step(h: Hostile, dt: number, seconds: number, player: THREE.Vector3, world: HostileWorld, events: HostileEvents) {
    const def = HOSTILES[h.kind];
    const to = new THREE.Vector3(player.x - h.pos.x, 0, player.z - h.pos.z);
    const dist = to.length();
    if (dist < SIGHT) h.angry = true;
    h.cooldown = Math.max(0, h.cooldown - dt);
    h.flash = Math.max(0, h.flash - dt);
    h.phase += dt;
    const flying = def.move === 'vuela' || def.move === 'flota';

    // Hacia dónde va: a por ti, o de paseo.
    let want = new THREE.Vector3();
    if (h.angry) {
      want.copy(to).normalize();
      // El esqueleto mantiene la distancia y dispara.
      if (def.ranged) {
        if (dist < 6) want.multiplyScalar(-1);
        else if (dist < 12) want.set(0, 0, 0);
        if (dist < 14 && h.cooldown <= 0) {
          h.cooldown = 2.6;
          const from = h.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
          const target = player.clone().add(new THREE.Vector3(0, 1.2, 0));
          this.shoot(from, target.sub(from).normalize().multiplyScalar(14).add(new THREE.Vector3(0, dist * 0.05, 0)), def.damage, false);
        }
      }
    } else {
      want.set(Math.sin(h.phase * 0.3 + h.yaw), 0, Math.cos(h.phase * 0.3 + h.yaw)).multiplyScalar(0.3);
    }
    if (dist > 0.01 && h.angry) h.yaw = Math.atan2(to.x, to.z);

    // Movimiento: empujón del golpe más lo que quiere andar.
    const speed = def.speed * (h.kind === 'limo' && h.size < 2 ? 1.2 : 1);
    const hopping = def.move === 'salta';
    const onGround = !flying && this.floorAt(world, h.pos.x, h.pos.y, h.pos.z) === Math.round(h.pos.y) && h.vy <= 0;
    let move = want.multiplyScalar(speed);
    if (hopping && !(h.vy > 0 || !onGround)) move = move.multiplyScalar(0.15);
    const nx = h.pos.x + (move.x + h.push.x) * dt;
    const nz = h.pos.z + (move.z + h.push.z) * dt;
    h.push.multiplyScalar(Math.max(0, 1 - dt * 6));
    if (flying) {
      const targetY = (h.angry ? player.y + 1.2 : h.pos.y) + Math.sin(seconds * 2 + h.phase) * 0.3;
      const ny = h.pos.y + Math.max(-2, Math.min(2, targetY - h.pos.y)) * dt * 1.5;
      if (!world.solid(Math.floor(nx), Math.floor(ny), Math.floor(nz))) h.pos.set(nx, ny, nz);
      else h.pos.y += 2 * dt; // si algo le tapa (un árbol), sube por encima
    } else {
      const floor = this.floorAt(world, nx, h.pos.y + 0.6, nz);
      if (floor !== null && floor - h.pos.y <= 1.05) {
        h.pos.x = nx;
        h.pos.z = nz;
        if (floor > h.pos.y + 0.05 && onGround) h.vy = 6.5; // sube un escalón de un salto
      }
      // Los limos botan.
      h.hop -= dt;
      if (hopping && onGround && h.angry && h.vy <= 0 && h.hop <= 0) {
        h.vy = 6;
        h.hop = 0.9 + this.random() * 0.4;
      }
      h.vy -= GRAVITY * dt;
      const ground = this.floorAt(world, h.pos.x, h.pos.y + 0.2, h.pos.z) ?? h.pos.y - 1;
      h.pos.y += h.vy * dt;
      if (h.pos.y <= ground) {
        h.pos.y = ground;
        h.vy = 0;
      }
    }

    // Golpe cuerpo a cuerpo.
    const reach = h.kind === 'golem_lava' ? MELEE + 0.6 : MELEE;
    const dy = Math.abs(player.y - h.pos.y);
    if (def.boss) this.bossAct(h, dt, dist, player, events);
    else if (!def.ranged && h.angry && dist < reach && dy < 2 && h.cooldown <= 0) {
      h.cooldown = h.kind === 'golem_lava' ? 1.8 : h.kind === 'murcielago' ? 1 : 1.2;
      events.hits.push({ kind: h.kind, damage: h.kind === 'limo' && h.size < 2 ? 1 : def.damage, from: h.pos.clone() });
    }

    // Dibujo.
    const g = h.model.group;
    g.position.copy(h.pos);
    if (hopping) g.scale.y = (def.boss?.scale ?? (h.size >= 2 ? 1 : 0.55)) * (1 + Math.max(-0.2, Math.min(0.2, -h.vy * 0.03)));
    g.rotation.y = h.yaw;
    for (const leg of h.model.legs) leg.rotation.x = Math.sin(h.phase * 8) * 0.6 * leg.userData.side * Math.min(1, move.length());
    for (const wing of h.model.wings) wing.rotation.z = Math.sin(seconds * 18 + h.phase) * 0.7 * wing.userData.side;
    // Rojo al recibir un golpe; los jefes brillan en blanco mientras preparan un ataque.
    for (const m of h.model.mats) m.emissive.setHex(h.flash > 0 ? 0xaa0000 : h.casting && Math.sin(seconds * 30) > 0 ? 0x666666 : 0x000000);
    for (const m of h.model.glow) if (h.flash <= 0) m.emissive.setHex(m.color.getHex());
    if (h.kind === 'espiritu') {
      // Se vuelve casi invisible justo antes de atacar.
      const fade = h.angry && dist < 4 && h.cooldown < 0.5 ? 0.2 : 0.8;
      for (const m of h.model.mats) m.opacity = fade;
    }
  }

  /** Los jefes: eligen un ataque, avisan y lo sueltan un momento después. */
  private bossAct(h: Hostile, dt: number, dist: number, player: THREE.Vector3, events: HostileEvents) {
    const def = HOSTILES[h.kind];
    const boss = def.boss!;
    if (h.casting) {
      h.castT -= dt;
      if (h.castT > 0) return;
      const attack = h.casting;
      h.casting = null;
      h.cooldown = 2 + this.random();
      const chest = h.pos.clone().add(new THREE.Vector3(0, boss.size[1] * 0.5, 0));
      if (attack === 'rafaga') {
        const aim = player.clone().add(new THREE.Vector3(0, 1.2, 0)).sub(chest).normalize();
        for (const a of [-0.22, 0, 0.22]) this.shoot(chest, aim.clone().applyAxisAngle(UP, a).multiplyScalar(15), 2, false);
      } else if (attack === 'pisoton') {
        if (dist < 4 && Math.abs(player.y - h.pos.y) < 2) events.hits.push({ kind: h.kind, damage: def.damage, from: h.pos.clone() });
      } else if (attack === 'llamada' && boss.minion) {
        const alive = this.list.filter((o) => o.kind === boss.minion && o.pinned).length;
        for (let i = alive; i < 2; i++) {
          const a = this.random() * Math.PI * 2;
          const fly = HOSTILES[boss.minion].move === 'vuela';
          const m = this.spawn(boss.minion, h.pos.x + Math.cos(a) * 2, h.pos.y + (fly ? 2 : 0), h.pos.z + Math.sin(a) * 2, 1);
          m.angry = true;
          m.pinned = true;
        }
      } else if (attack === 'anillo') {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          this.shoot(h.pos.clone().add(new THREE.Vector3(0, 1.1, 0)), new THREE.Vector3(Math.cos(a), 0.05, Math.sin(a)).multiplyScalar(9), 2, false);
        }
      }
      return;
    }
    if (!h.angry || h.cooldown > 0) return;
    // El pisotón solo de cerca; de lejos, lo demás.
    const options = boss.attacks.filter((a) => (a === 'pisoton' ? dist < 5 : a === 'llamada' ? true : dist > 3));
    if (!options.length) return;
    h.casting = options[Math.floor(this.random() * options.length)];
    h.castT = 0.9;
    events.announce.push(`${def.name} ${BOSS_TELLS[h.casting]}`);
  }

  /** Dispara una flecha (un esqueleto, o tú con el arco). */
  shoot(from: THREE.Vector3, vel: THREE.Vector3, damage: number, mine: boolean) {
    const mesh = new THREE.Mesh(this.arrowGeo, this.arrowMat);
    mesh.position.copy(from);
    this.group.add(mesh);
    this.arrows.push({ mesh, vel: vel.clone(), damage, mine, life: 4 });
  }

  private updateArrows(dt: number, player: THREE.Vector3, world: HostileWorld, events: HostileEvents) {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.life -= dt;
      a.vel.y -= 9 * dt;
      a.mesh.position.addScaledVector(a.vel, dt);
      a.mesh.lookAt(a.mesh.position.clone().add(a.vel));
      const p = a.mesh.position;
      let done = a.life <= 0 || world.solid(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
      if (!done && !a.mine && Math.hypot(p.x - player.x, p.z - player.z) < 0.5 && p.y > player.y && p.y < player.y + 1.9) {
        events.hits.push({ kind: 'esqueleto', damage: a.damage, from: p.clone().sub(a.vel) });
        done = true;
      }
      if (!done && a.mine) {
        const target = this.list.find((h) => this.bounds(h).containsPoint(p));
        if (target) {
          this.damage(target, a.damage, a.vel.clone().setY(0).normalize());
          done = true;
        }
      }
      if (done) {
        this.group.remove(a.mesh);
        this.arrows.splice(i, 1);
      }
    }
  }

  /** La caja de una criatura, para los golpes y las flechas. */
  bounds(h: Hostile): THREE.Box3 {
    const boss = HOSTILES[h.kind].boss;
    if (boss) return this.box.set(new THREE.Vector3(h.pos.x - boss.size[0], h.pos.y, h.pos.z - boss.size[0]), new THREE.Vector3(h.pos.x + boss.size[0], h.pos.y + boss.size[1], h.pos.z + boss.size[0]));
    const big = h.kind === 'golem_lava' ? 0.8 : h.kind === 'limo' ? (h.size >= 2 ? 0.5 : 0.3) : 0.35;
    const tall = h.kind === 'golem_lava' ? 2.6 : h.kind === 'esqueleto' ? 1.9 : h.kind === 'limo' ? (h.size >= 2 ? 0.85 : 0.5) : 0.6;
    const flying = HOSTILES[h.kind].move === 'vuela' || HOSTILES[h.kind].move === 'flota';
    const y0 = flying ? h.pos.y - tall / 2 : h.pos.y;
    return this.box.set(new THREE.Vector3(h.pos.x - big, y0, h.pos.z - big), new THREE.Vector3(h.pos.x + big, y0 + tall, h.pos.z + big));
  }

  /** La criatura a la que apuntas, si está más cerca que `max`. */
  aimed(ray: THREE.Ray, max: number): Hostile | null {
    let best: Hostile | null = null;
    let bestD = max;
    for (const h of this.list) {
      if (!ray.intersectBox(this.bounds(h), this.hit)) continue;
      const d = this.hit.distanceTo(ray.origin);
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    return best;
  }

  /** Un golpe tuyo. Devuelve lo que suelta si la has vencido. */
  damage(h: Hostile, amount: number, dir: THREE.Vector3): boolean {
    if (!this.list.includes(h)) return false;
    h.hp -= amount;
    h.flash = 0.2;
    h.angry = true;
    const knock = HOSTILES[h.kind].boss ? 0.8 : h.kind === 'golem_lava' ? 2 : 7;
    h.push.copy(dir).setY(0).normalize().multiplyScalar(knock);
    if (HOSTILES[h.kind].move !== 'vuela' && HOSTILES[h.kind].move !== 'flota' && h.kind !== 'golem_lava' && !HOSTILES[h.kind].boss) h.vy = 4;
    if (h.hp > 0) return false;
    const i = this.list.indexOf(h);
    this.remove(i, true);
    this.defeated.push({ kind: h.kind, pos: h.pos.clone(), size: h.size });
    // El limo grande se parte en dos pequeños.
    if (h.kind === 'limo' && h.size >= 2) {
      for (const s of [-1, 1]) this.spawn('limo', h.pos.x + s * 0.5, h.pos.y, h.pos.z + s * 0.3, 1).angry = true;
    }
    return true;
  }

  /** Las vencidas desde la última vez que se miró (para el botín). */
  defeated: { kind: HostileKind; pos: THREE.Vector3; size: number }[] = [];

  private remove(i: number, caught: boolean) {
    const h = this.list[i];
    this.group.remove(h.model.group);
    this.population.remove('hostiles', h.zone, caught);
    for (const m of h.model.mats) m.dispose();
    this.list.splice(i, 1);
  }

  clear() {
    for (let i = this.list.length - 1; i >= 0; i--) this.remove(i, false);
    for (const a of this.arrows) this.group.remove(a.mesh);
    this.arrows.length = 0;
  }
}
