// La mazmorra en la partida (v4.25): construye el plano de dungeon.ts en el mundo y lleva lo que pasa dentro:
// pinchos que pican, placas que disparan flechas, suelo que se hunde y vuelve, palancas de colores, el jefe (que
// sale al entrar en su sala) y los cofres. Si te desmayas, el jefe vuelve a su sitio para el siguiente intento.
import * as THREE from 'three';
import { Block } from '../blocks';
import { type DungeonPlan, LEVER_COLORS, type LeverColor, ROOM_NAMES, THEMES } from '../dungeon';
import { HOSTILES, type Hostile, type HostileKind, type Hostiles } from '../hostiles';
import type { MapMarker } from '../map';
import type { World } from '../world';

export interface DungeonDeps {
  world: World;
  hostiles: Hostiles;
}

export type DungeonUse =
  | { kind: 'sign'; text: string }
  | { kind: 'lever'; text: string }
  | { kind: 'treasure' }
  | { kind: 'ruin' }
  | { kind: 'locked'; text: string };

const SPIKE_EVERY = 0.8;
const CRUMBLE_DELAY = 0.45;
const CRUMBLE_BACK = 5;

const key = (x: number, z: number) => `${x},${z}`;

export class DungeonGame {
  readonly group = new THREE.Group();
  solved = false;
  bossDone = false;
  chestOpen = false;
  ruinOpen = false;
  private pressed: LeverColor[] = [];
  private leverMeshes: { mesh: THREE.Group; handle: THREE.Object3D; color: LeverColor; box: THREE.Box3 }[] = [];
  private chestMesh: { group: THREE.Group; lid: THREE.Object3D; box: THREE.Box3 };
  private ruinMesh: { group: THREE.Group; lid: THREE.Object3D; box: THREE.Box3 };
  private signBoxes: { box: THREE.Box3; text: string }[] = [];
  private spikes: Set<string>;
  private spikeMeshes: THREE.Group[] = [];
  private spikeT = 0;
  private plateCd: number[];
  private crumble: Set<string>;
  private crumbleT = -1;
  private crumbleBack = -1;
  private boss: Hostile | null = null;
  private bossKind: HostileKind;
  private hit = new THREE.Vector3();
  private resetLevers = -1;
  private inRoom = '';

  constructor(private deps: DungeonDeps, readonly plan: DungeonPlan) {
    this.bossKind = THEMES[plan.theme].boss;
    this.spikes = new Set(plan.spikes.map(([x, z]) => key(x, z)));
    this.crumble = new Set(plan.crumble.map(([x, z]) => key(x, z)));
    this.plateCd = plan.plates.map(() => 0);
    this.build();
    const t = THEMES[plan.theme];
    const metal = new THREE.MeshLambertMaterial({ color: 0x9aa0aa });
    // Pinchos: cuatro puntas por casilla, que suben al pisarlas.
    const cone = new THREE.ConeGeometry(0.1, 0.45, 4);
    for (const [x, z] of plan.spikes) {
      const g = new THREE.Group();
      for (const [a, b] of [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]]) {
        const m = new THREE.Mesh(cone, metal);
        m.position.set(a, 0.2, b);
        g.add(m);
      }
      g.position.set(x, plan.floorY - 0.25, z);
      this.group.add(g);
      this.spikeMeshes.push(g);
    }
    const plateMat = new THREE.MeshLambertMaterial({ color: 0x8a7a5a });
    for (const [x, z] of plan.plates) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.8), plateMat);
      m.position.set(x + 0.5, plan.floorY + 0.03, z + 0.5);
      this.group.add(m);
    }
    for (const l of plan.levers) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.12), new THREE.MeshLambertMaterial({ color: 0x5a5a60 }));
      const handle = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
      stick.position.y = 0.25;
      const knob = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), new THREE.MeshLambertMaterial({ color: LEVER_COLORS[l.color], emissive: LEVER_COLORS[l.color], emissiveIntensity: 0.3 }));
      knob.position.y = 0.5;
      handle.add(stick, knob);
      handle.rotation.x = -0.6;
      g.add(base, handle);
      // Pegada a la pared, mirando hacia dentro de la sala.
      g.position.set(l.x + 0.5 - l.nx * 0.42, l.y + 0.3, l.z + 0.5 - l.nz * 0.42);
      g.rotation.y = Math.atan2(l.nx, l.nz);
      this.group.add(g);
      const box = new THREE.Box3().setFromCenterAndSize(g.position.clone().add(new THREE.Vector3(0, 0.2, 0)), new THREE.Vector3(0.7, 1, 0.7));
      this.leverMeshes.push({ mesh: g, handle, color: l.color, box });
    }
    this.chestMesh = this.makeChest(plan.chest, 1, 0xd8a830);
    this.ruinMesh = this.makeChest(plan.ruinChest, 0.7, 0x8a6a40);
    for (const s of plan.signs) this.makeSign(s.x, s.y, s.z, s.text, t.name);
  }

  /** Pone los bloques del plano (solo los que cambian) directamente en el mundo: la visita es de una persona. */
  private build() {
    const final = new Map<string, [number, number, number, Block]>();
    for (const b of this.plan.blocks) final.set(`${b[0]},${b[1]},${b[2]}`, b);
    const { world } = this.deps;
    for (const [x, y, z, b] of final.values()) if (world.getBlock(x, y, z) !== b) world.setBlock(x, y, z, b);
  }

  private makeChest([x, y, z]: [number, number, number], size: number, band: number) {
    const group = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x7a4a24 });
    const gold = new THREE.MeshLambertMaterial({ color: band });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9 * size, 0.5 * size, 0.6 * size), wood);
    body.position.y = 0.25 * size;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.94 * size, 0.08 * size, 0.64 * size), gold);
    strip.position.y = 0.4 * size;
    const lid = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.92 * size, 0.22 * size, 0.62 * size), wood);
    top.position.set(0, 0.11 * size, 0.31 * size);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.14 * size, 0.16 * size, 0.04 * size), gold);
    lock.position.set(0, 0.04 * size, 0.63 * size);
    lid.add(top, lock);
    lid.position.set(0, 0.5 * size, -0.31 * size);
    group.add(body, strip, lid);
    group.position.set(x + 0.5, y, z + 0.5);
    this.group.add(group);
    const box = new THREE.Box3().setFromCenterAndSize(group.position.clone().add(new THREE.Vector3(0, 0.4 * size, 0)), new THREE.Vector3(size, size, size));
    return { group, lid, box };
  }

  private makeSign(x: number, y: number, z: number, text: string, title: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#b8935a';
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#3a2614';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, 128, 26);
      ctx.font = '15px sans-serif';
      // Hasta cuatro líneas, partiendo por palabras.
      const words = text.split(' ');
      let line = '';
      let row = 0;
      for (const w of words) {
        if (ctx.measureText(`${line} ${w}`).width > 236 && line) {
          ctx.fillText(line, 128, 52 + row++ * 20);
          line = w;
        } else line = line ? `${line} ${w}` : w;
      }
      if (line) ctx.fillText(line, 128, 52 + row * 20);
    }
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.06), [
      ...Array(4).fill(new THREE.MeshLambertMaterial({ color: 0x8a6a3a })),
      new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(canvas) }),
      new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(canvas) }),
    ]);
    board.position.y = 1.1;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), new THREE.MeshLambertMaterial({ color: 0x6a4a2a }));
    post.position.y = 0.45;
    g.add(board, post);
    g.position.set(x + 0.5, y, z + 0.5);
    this.group.add(g);
    this.signBoxes.push({ box: new THREE.Box3().setFromCenterAndSize(g.position.clone().add(new THREE.Vector3(0, 0.9, 0)), new THREE.Vector3(1.2, 1.4, 1.2)), text });
  }

  private openGate(to: 'jefe' | 'tesoro') {
    const gate = this.plan.gates.find((g) => g.to === to);
    if (!gate) return;
    for (const [x, y, z] of gate.cells) this.deps.world.setBlock(x, y, z, Block.Air);
  }

  /** La sala en la que estás (o ''). */
  roomAt(p: THREE.Vector3): string {
    if (Math.abs(p.y - this.plan.floorY) > 4) return '';
    const r = this.plan.rooms.find((r) => p.x >= r.x0 && p.x < r.x1 + 1 && p.z >= r.z0 && p.z < r.z1 + 1);
    return r?.kind ?? '';
  }

  /**
   * Un fotograma. Devuelve el daño de las trampas y los avisos. `calm`: en modo tranquilo el jefe no sale y su reja
   * se abre al llegar.
   */
  update(dt: number, player: THREE.Vector3, calm: boolean): { hurt: number; toasts: string[] } {
    const out = { hurt: 0, toasts: [] as string[] };
    const { plan } = this;
    const fx = Math.floor(player.x);
    const fz = Math.floor(player.z);
    const onFloor = Math.abs(player.y - plan.floorY) < 0.35;

    const room = this.roomAt(player);
    if (room && room !== this.inRoom) out.toasts.push(ROOM_NAMES[room as keyof typeof ROOM_NAMES]);
    this.inRoom = room;

    // Pinchos.
    this.spikeT = Math.max(0, this.spikeT - dt);
    const onSpike = onFloor && this.spikes.has(key(fx, fz));
    if (onSpike && this.spikeT <= 0) {
      this.spikeT = SPIKE_EVERY;
      out.hurt += 1;
    }
    for (let i = 0; i < this.spikeMeshes.length; i++) {
      const [x, z] = plan.spikes[i];
      const up = onSpike && x === fx && z === fz;
      const m = this.spikeMeshes[i];
      m.position.y += ((up ? plan.floorY : plan.floorY - 0.25) - m.position.y) * Math.min(1, dt * 12);
    }

    // Placas: disparan las flechas de su lanzaflechas.
    for (let i = 0; i < plan.plates.length; i++) {
      this.plateCd[i] = Math.max(0, this.plateCd[i] - dt);
      const [x, z] = plan.plates[i];
      if (!onFloor || x !== fx || z !== fz || this.plateCd[i] > 0) continue;
      this.plateCd[i] = 2.5;
      out.toasts.push('¡Clic! Has pisado una placa…');
      for (const d of plan.dispensers.filter((d) => d.plate === i)) {
        const from = new THREE.Vector3(d.x + 0.5 + d.dx * 0.7, d.y + 0.5, d.z + 0.5 + d.dz * 0.7);
        this.deps.hostiles.shoot(from, new THREE.Vector3(d.dx, 0.02, d.dz).multiplyScalar(14), 2, false);
      }
    }

    // Suelo que se hunde: al pisarlo cruje, cae y al rato vuelve.
    if (this.crumbleT < 0 && this.crumbleBack < 0 && onFloor && this.crumble.has(key(fx, fz))) {
      this.crumbleT = CRUMBLE_DELAY;
      out.toasts.push('El suelo cruje…');
    }
    if (this.crumbleT >= 0) {
      this.crumbleT -= dt;
      if (this.crumbleT < 0) {
        for (const [x, z] of plan.crumble) this.deps.world.setBlock(x, plan.floorY - 1, z, Block.Air);
        this.crumbleBack = CRUMBLE_BACK;
      }
    } else if (this.crumbleBack >= 0) {
      this.crumbleBack -= dt;
      const inside = this.crumble.has(key(fx, fz)) && player.y < plan.floorY + 2;
      if (this.crumbleBack < 0 && inside) this.crumbleBack = 0.5;
      else if (this.crumbleBack < 0) for (const [x, z] of plan.crumble) this.deps.world.setBlock(x, plan.floorY - 1, z, THEMES[plan.theme].crumble);
    }

    // Palancas que vuelven a su sitio tras equivocarse.
    if (this.resetLevers >= 0) {
      this.resetLevers -= dt;
      if (this.resetLevers < 0) for (const l of this.leverMeshes) l.handle.rotation.x = -0.6;
    }

    // El jefe sale al entrar en su sala (con la reja del puzle ya abierta).
    if (room === 'jefe' && this.solved && !this.bossDone && !this.boss) {
      if (calm) {
        this.bossDone = true;
        this.openGate('tesoro');
        out.toasts.push(`Modo tranquilo: ${HOSTILES[this.bossKind].name.toLowerCase()} está dormido. La reja del tesoro se abre`);
      } else {
        const [x, y, z] = plan.boss;
        this.boss = this.deps.hostiles.spawn(this.bossKind, x + 0.5, y, z + 0.5);
        this.boss.pinned = true;
        this.boss.angry = true;
        out.toasts.push(`¡${HOSTILES[this.bossKind].name}!`);
      }
    }
    // Si el jefe ya no está sin haberlo vencido (te has desmayado), vuelve a salir la próxima vez.
    if (this.boss && !this.bossDone && !this.deps.hostiles.list.includes(this.boss)) this.boss = null;
    return out;
  }

  /** Lo avisa main.ts al vencer a una criatura: si es el jefe, se abre el tesoro. */
  defeated(kind: HostileKind): string | null {
    if (kind !== this.bossKind || this.bossDone || !this.solved) return null;
    this.bossDone = true;
    this.boss = null;
    this.openGate('tesoro');
    return `¡Has vencido a ${HOSTILES[kind].name.toLowerCase()}! Se abre la reja del tesoro`;
  }

  /** Vida del jefe para la barra, si está luchando. */
  bossBar(): { name: string; frac: number } | null {
    if (!this.boss) return null;
    return { name: HOSTILES[this.boss.kind].name, frac: Math.max(0, this.boss.hp / this.boss.max) };
  }

  /** Clic derecho: palancas, cofres y carteles. */
  use(ray: THREE.Ray, max: number): DungeonUse | null {
    const near = (box: THREE.Box3) => !!ray.intersectBox(box, this.hit) && this.hit.distanceTo(ray.origin) < max;
    for (const s of this.signBoxes) if (near(s.box)) return { kind: 'sign', text: s.text };
    if (near(this.chestMesh.box)) {
      if (!this.bossDone) return { kind: 'locked', text: 'Está cerrado con un candado enorme. Lo guarda el jefe…' };
      if (this.chestOpen) return { kind: 'locked', text: 'El cofre ya está vacío' };
      this.chestOpen = true;
      this.chestMesh.lid.rotation.x = -1.2;
      return { kind: 'treasure' };
    }
    if (near(this.ruinMesh.box)) {
      if (this.ruinOpen) return { kind: 'locked', text: 'El cofre ya está vacío' };
      this.ruinOpen = true;
      this.ruinMesh.lid.rotation.x = -1.2;
      return { kind: 'ruin' };
    }
    const lever = this.leverMeshes.find((l) => near(l.box));
    if (!lever) return null;
    if (this.solved) return { kind: 'lever', text: 'La reja ya está abierta' };
    if (this.resetLevers >= 0 || this.pressed.includes(lever.color)) return { kind: 'lever', text: 'Esa palanca ya está bajada' };
    lever.handle.rotation.x = 0.6;
    this.pressed.push(lever.color);
    const ok = this.pressed.every((c, i) => c === this.plan.order[i]);
    if (!ok) {
      this.pressed = [];
      this.resetLevers = 0.8;
      return { kind: 'lever', text: 'Clac… las palancas vuelven a su sitio. Lee otra vez el cartel' };
    }
    if (this.pressed.length < this.plan.order.length) return { kind: 'lever', text: 'Clic. Algo se ha movido…' };
    this.solved = true;
    this.openGate('jefe');
    return { kind: 'lever', text: '¡Se abre la reja de la sala del jefe!' };
  }

  markers(): MapMarker[] {
    const [x, , z] = this.plan.entrance;
    const [rx, , rz] = this.plan.ruinChest;
    return [
      { x, z, icon: '🏛️', label: THEMES[this.plan.theme].name, kind: 'edificios' },
      { x: rx, z: rz, icon: '🗼', label: 'Torre caída', kind: 'edificios' },
    ];
  }
}
