// Las parcelas en la partida (v4.14): la lista, el borde que se ve al construir, y ampliar, mudar y mejorar.
// Solo el ordenador de quien vive en la isla las cambia; los amigos piden los cambios por la red.
// Las reglas y los precios están en parcels.ts.
import * as THREE from 'three';
import { Block, isSolid, isWater } from '../blocks';
import type { PlacedThing } from '../net/actions';
import {
  type Bounds, HOST, MAX_FRIEND_PARCELS, type Obstacle, PARCEL_SIZES, PERKS, type Parcel, type Role,
  buildProblem, inBounds, parcelBounds, parcelProblem,
} from '../parcels';
import type { World } from '../world';

export interface ParcelDeps {
  world: World;
  /** Pone y quita bloques y muebles para todos los jugadores (WorldSync). */
  put(x: number, y: number, z: number, b: Block): void;
  restore(cells: [number, number, number][]): void;
  placeFurniture(id: string, x: number, y: number, z: number, rot: number, text?: string): void;
  removeFurniture(x: number, y: number, z: number): void;
  furniture(): PlacedThing[];
  scene: THREE.Scene;
  /** Lo que no puede quedar dentro de una parcela (casas de vecinos, tienda, ayuntamiento…). */
  obstacles(): Obstacle[];
  /** Casas a medio construir con plano: no se mudan solas. */
  lotInside(b: Bounds): boolean;
  /** Se ha mudado una parcela: hay que llevar también cofres, cultivos y árboles plantados. */
  moved(owner: string, to: (x: number, y: number, z: number) => [number, number, number] | null, dx: number, dy: number, dz: number): void;
  /** Ha cambiado la lista: se guarda y se cuenta a los demás. */
  changed(): void;
}

/** Hasta qué altura sobre el suelo se lleva lo que hay en la parcela al mudarla. */
const MOVE_HEIGHT = 24;

/** Colores del borde: tu parcela, las de los demás y la vista previa de la mudanza. */
const MINE = 0xffd54a;
const OTHERS = 0xffffff;
const PREVIEW = 0x4fc3f7;

export class Parcels {
  list: Parcel[];
  /** Vista previa de la mudanza: dónde quedaría la parcela. */
  preview: { owner: string; x: number; z: number } | null = null;
  private lines: THREE.LineSegments;
  private shownKey = '';

  constructor(private deps: ParcelDeps, saved: Parcel[] = []) {
    this.list = saved.map((p) => ({ ...p, perks: p.perks ? [...p.perks] : undefined, builders: p.builders ? [...p.builders] : undefined }));
    this.lines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }));
    this.lines.visible = false;
    this.lines.renderOrder = 2;
    deps.scene.add(this.lines);
  }

  of(owner: string): Parcel | undefined {
    return this.list.find((p) => p.owner === owner);
  }

  /** Cambia la lista entera (lo que manda el anfitrión a los amigos). */
  replace(list: Parcel[]) {
    this.list = list.map((p) => ({ ...p }));
    this.shownKey = '';
  }

  /** Por qué no puede `who` poner o quitar algo en (x, z), o null si puede. */
  rule(who: string, role: Role, x: number, z: number, action: 'poner' | 'quitar'): string | null {
    return buildProblem(this.list, who, role, x, z, action);
  }

  /** Una parcela nueva (la tuya al empezar, o la de un amigo con su permiso de tienda). */
  create(owner: string, name: string, x: number, z: number, size = 0): Parcel {
    const p: Parcel = { owner, name: name.slice(0, 24), x, z, size };
    this.list = this.list.filter((o) => o.owner !== owner);
    this.list.push(p);
    this.deps.changed();
    return p;
  }

  /** Si cabe otra parcela de amigo. */
  get full(): boolean {
    return this.list.filter((p) => p.owner !== HOST).length >= MAX_FRIEND_PARCELS;
  }

  /** Por qué no se puede ampliar, o null si se puede. */
  growProblem(owner: string): string | null {
    const p = this.of(owner);
    if (!p) return 'Aún no tienes parcela';
    if (p.size >= PARCEL_SIZES.length - 1) return 'Tu parcela ya es la más grande';
    return parcelProblem(this.list, { ...p, size: p.size + 1 }, this.site());
  }

  /** Amplía la parcela un tamaño, desde el centro (ya pagado). */
  grow(owner: string): string | null {
    const problem = this.growProblem(owner);
    if (problem) return problem;
    const p = this.of(owner)!;
    // Los carteles y el buzón se quedan en la entrada nueva.
    const old = parcelBounds(p);
    p.size++;
    this.moveEntrance(p, old);
    this.shownKey = '';
    this.deps.changed();
    return null;
  }

  /** Por qué no se puede mudar ahí, o null si se puede. */
  moveProblem(owner: string, x: number, z: number): string | null {
    const p = this.of(owner);
    if (!p) return 'Aún no tienes parcela';
    const target = { ...p, x, z };
    const problem = parcelProblem(this.list, target, this.site());
    if (problem) return problem;
    const old = parcelBounds(p);
    if (this.deps.lotInside(old)) return 'Dentro de tu parcela hay una casa de vecino a medio hacer: termínala o quita el plano antes';
    const nb = parcelBounds(target);
    const built = this.deps.world.editsIn(nb.x0, nb.z0, nb.x1, nb.z1).some(([bx, , bz, b]) => b !== Block.Air && !inBounds(old, bx, bz));
    if (built) return 'Ahí ya hay algo construido';
    return null;
  }

  /**
   * Muda la parcela entera (ya pagado): todo lo que hay encima del suelo (la casa, aunque sea la tienda del
   * principio, los árboles y lo construido), lo excavado y los muebles se llevan al sitio nuevo a la misma altura
   * sobre el suelo. El sitio viejo queda despejado y el nuevo se allana.
   */
  move(owner: string, x: number, z: number): string | null {
    const problem = this.moveProblem(owner, x, z);
    if (problem) return problem;
    const { world } = this.deps;
    const p = this.of(owner)!;
    const old = parcelBounds(p);
    const dx = x - p.x;
    const dz = z - p.z;
    const before = world.heightAt(p.x, p.z);
    const ground = world.heightAt(x, z);
    const dy = ground - before;
    // 1. Lo que se lleva: lo que hay por encima del suelo y lo cambiado por debajo (sótanos, huecos).
    const top = before + MOVE_HEIGHT;
    const above: [number, number, number, number][] = [];
    for (let bz = old.z0; bz <= old.z1; bz++) {
      for (let bx = old.x0; bx <= old.x1; bx++) {
        for (let by = before + 1; by <= top; by++) {
          const b = world.getBlock(bx, by, bz);
          if (b !== Block.Air && !isWater(b)) above.push([bx, by, bz, b]);
        }
      }
    }
    const edits = world.editsIn(old.x0, old.z0, old.x1, old.z1);
    const below = edits.filter(([, by]) => by <= before);
    const high = edits.filter(([, by, , b]) => by > top && b !== Block.Air);
    const things = this.deps.furniture().filter((f) => inBounds(old, f.x, f.z));
    // 2. El sitio viejo: sin muebles, despejado por encima del suelo y con el suelo como era.
    for (const f of things) this.deps.removeFurniture(f.x, f.y, f.z);
    for (const [bx, by, bz] of [...above, ...high]) this.deps.put(bx, by, bz, Block.Air);
    this.deps.restore(below.map(([bx, by, bz]) => [bx, by, bz]));
    // 3. El sitio nuevo se allana a la altura del centro y se quitan árboles y plantas.
    p.x = x;
    p.z = z;
    const nb = parcelBounds(p);
    for (let bz = nb.z0; bz <= nb.z1; bz++) {
      for (let bx = nb.x0; bx <= nb.x1; bx++) {
        const h = world.heightAt(bx, bz);
        for (let by = Math.min(h, ground) + 1; by <= ground; by++) this.deps.put(bx, by, bz, by === ground ? Block.Grass : Block.Dirt);
        for (let by = ground + 1; by <= Math.max(h, ground) + MOVE_HEIGHT; by++) if (world.getBlock(bx, by, bz) !== Block.Air) this.deps.put(bx, by, bz, Block.Air);
        if (!isSolid(world.getBlock(bx, ground, bz))) this.deps.put(bx, ground, bz, Block.Grass);
      }
    }
    // 4. Todo, en su sitio nuevo.
    for (const [bx, by, bz, b] of [...below, ...above, ...high]) this.deps.put(bx + dx, by + dy, bz + dz, b as Block);
    for (const f of things) this.deps.placeFurniture(f.id, f.x + dx, f.y + dy, f.z + dz, f.rot, f.text);
    this.deps.moved(owner, (bx, by, bz) => (inBounds(old, bx, bz) ? [bx + dx, by + dy, bz + dz] : null), dx, dy, dz);
    this.preview = null;
    this.shownKey = '';
    this.deps.changed();
    return null;
  }

  /** Compra una mejora (ya pagada) y pone lo que se vea: el cartel o el buzón en la entrada. */
  addPerk(owner: string, id: string) {
    const p = this.of(owner);
    if (!p || !PERKS.some((k) => k.id === id) || p.perks?.includes(id)) return;
    (p.perks ??= []).push(id);
    this.placePerk(p, id);
    this.deps.changed();
  }

  /** Deja (o deja de dejar) a un amigo construir en tu parcela. Devuelve si ahora puede. */
  toggleBuilder(owner: string, uid: string): boolean {
    const p = this.of(owner);
    if (!p) return false;
    const list = (p.builders ??= []);
    const i = list.indexOf(uid);
    if (i >= 0) list.splice(i, 1);
    else list.push(uid);
    this.deps.changed();
    return i < 0;
  }

  /** Dónde va cada mejora: a los lados de la entrada (el borde de delante, hacia +z). */
  private perkSpot(p: Parcel, id: string): [number, number, number] | null {
    const b = parcelBounds(p);
    const x = id === 'cartel' ? p.x + 2 : id === 'buzon' ? p.x - 2 : null;
    if (x === null) return null;
    const y = this.deps.world.heightAt(x, b.z1) + 1;
    return [x, y, b.z1];
  }

  private placePerk(p: Parcel, id: string) {
    const spot = this.perkSpot(p, id);
    if (!spot) return;
    const [x, y, z] = spot;
    // Encima del suelo de verdad, aunque haya algo construido.
    let top = y;
    while (top < y + 8 && this.deps.world.getBlock(x, top, z) !== Block.Air) top++;
    this.deps.placeFurniture(id, x, top, z, 0, id === 'cartel' ? `Parcela de ${p.name}` : undefined);
  }

  /** Al ampliar, el cartel y el buzón de la entrada vieja pasan a la nueva. */
  private moveEntrance(p: Parcel, old: Bounds) {
    for (const id of p.perks ?? []) {
      const f = this.deps.furniture().find((t) => t.id === id && t.z === old.z1 && inBounds(old, t.x, t.z));
      if (f) this.deps.removeFurniture(f.x, f.y, f.z);
      this.placePerk(p, id);
    }
  }

  private site() {
    return { heightAt: (x: number, z: number) => this.deps.world.heightAt(x, z), obstacles: this.deps.obstacles() };
  }

  /**
   * El borde de las parcelas, a ras del suelo. Se ve solo al construir (`viewer` es quien mira, o null para
   * esconderlo). Solo se vuelve a dibujar si ha cambiado algo.
   */
  showBorders(viewer: string | null) {
    this.lines.visible = !!viewer;
    if (!viewer) return;
    const pv = this.preview;
    const key = `${viewer}|${JSON.stringify(this.list.map((p) => [p.owner, p.x, p.z, p.size]))}|${pv ? `${pv.x},${pv.z}` : ''}`;
    if (key === this.shownKey) return;
    this.shownKey = key;
    const pos: number[] = [];
    const col: number[] = [];
    const color = new THREE.Color();
    const ring = (b: Bounds, c: number) => {
      color.setHex(c);
      const y = (x: number, z: number) => this.deps.world.heightAt(x, z) + 1.06;
      const seg = (x0: number, z0: number, x1: number, z1: number, cx: number, cz: number) => {
        const h = y(cx, cz);
        pos.push(x0, h, z0, x1, h, z1);
        col.push(color.r, color.g, color.b, color.r, color.g, color.b);
      };
      for (let x = b.x0; x <= b.x1; x++) {
        seg(x, b.z0, x + 1, b.z0, x, b.z0);
        seg(x, b.z1 + 1, x + 1, b.z1 + 1, x, b.z1);
      }
      for (let z = b.z0; z <= b.z1; z++) {
        seg(b.x0, z, b.x0, z + 1, b.x0, z);
        seg(b.x1 + 1, z, b.x1 + 1, z + 1, b.x1, z);
      }
    };
    for (const p of this.list) ring(parcelBounds(p), p.owner === viewer || p.builders?.includes(viewer) ? MINE : OTHERS);
    if (pv) {
      const p = this.of(pv.owner);
      if (p) ring(parcelBounds({ ...p, x: pv.x, z: pv.z }), PREVIEW);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    this.lines.geometry.dispose();
    this.lines.geometry = g;
  }
}
