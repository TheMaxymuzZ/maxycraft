// Lo que se ve dentro del museo (v4.15): los fósiles en sus pedestales, el dinosaurio en el centro, los peces
// nadando en el acuario y los insectos revoloteando en el terrario. Cada jugador ve lo que él ha donado. El
// anfitrión, además, quita el cordón de cada planta cuando se abre. El edificio está en museum.ts.
import * as THREE from 'three';
import { Block, creatureTile, tileCanvas } from '../blocks';
import { CREATURES, type Creature, DINO_PIECES, sizeRange } from '../creatures';
import { CritterModel } from '../critterModels';
import { Furniture } from '../furniture';
import { type ExhibitSpot, WINGS, barrierCell, exhibitSpot, museumOrigin, openWings } from '../museum';
import { HALL_NORMAL, type MuseumLayout, OLD_HALL_BARRIERS, museumHallOrigin, museumLayout } from '../museumHall';
import type { Cell } from '../pathfind';
import { BIG_HOUSE } from '../villagerHouse';
import type { World } from '../world';

export interface MuseumHallDeps {
  world: World;
  scene: THREE.Scene;
  atlas: HTMLCanvasElement;
  /** Lo que ha donado este jugador. */
  donated(): ReadonlySet<string>;
  /** En tu isla (no de visita ni de viaje): el que abre las plantas. */
  host: boolean;
  /** Pone un bloque para todos los jugadores. */
  put(x: number, y: number, z: number, b: Block): void;
  /** Devuelve bloques a como salen en la isla (quita lo que se cambió en ellos), para todos los jugadores. */
  restore?(cells: Cell[]): void;
  toast(text: string): void;
  /** Luces de los muebles del museo nuevo. */
  lampHook?: (x: number, y: number, z: number, level: number) => void;
}

interface Exhibit {
  creature: Creature;
  /** El fósil (un dibujo plano) o el pez o insecto en 3D (v5.4). */
  obj: THREE.Object3D;
  model?: CritterModel;
  size: number;
  base: THREE.Vector3;
  box?: [number, number, number, number, number, number];
  phase: number;
}

export class MuseumHall {
  readonly group = new THREE.Group();
  private exhibits = new Map<string, Exhibit>();
  private origin: [number, number, number] | null = null;
  private seen = -1;
  /** Última planta abierta (índice de WINGS). */
  private wing = 0;
  /** El museo nuevo (v5.2): peceras, terrarios, vitrinas, bancos… Muebles que no se guardan: salen al cargar. */
  readonly fixtures: Furniture;
  /** Los peces y los insectos en 3D (v5.4), aparte para darles la luz del sitio. */
  readonly critters = new THREE.Group();
  private v2 = false;
  /** El museo de siempre o el grande (v5.11). */
  private hall: MuseumLayout = HALL_NORMAL;

  constructor(private deps: MuseumHallDeps) {
    const plot = deps.world.plots.find((p) => p.kind === 'museum');
    this.v2 = plot?.style === BIG_HOUSE;
    if (plot) this.origin = this.v2 ? museumHallOrigin(plot) : museumOrigin(plot);
    if (plot) this.hall = museumLayout(plot);
    this.group.name = 'museo';
    this.fixtures = new Furniture([], deps.lampHook ?? null);
    this.group.add(this.fixtures.group);
    this.group.add(this.critters);
    deps.scene.add(this.group);
    if (this.v2 && this.origin) {
      const [ox, oy, oz] = this.origin;
      for (const [id, x, y, z, rot] of this.hall.fixtures) this.fixtures.place(id, ox + x, oy + y, oz + z, rot);
      // v5.9: los cordones quitados del museo de antes no deben dejar agujeros en el nuevo.
      if (deps.host && !this.hall.big) {
        const old = OLD_HALL_BARRIERS.map(([x, y, z]): Cell => [ox + x, oy + y, oz + z]).filter(([x, y, z]) => deps.world.isEdited(x, y, z));
        if (old.length) deps.restore?.(old);
      }
    }
    this.wing = openWings(deps.donated().size);
    this.refresh();
  }

  /** Planta más alta abierta. */
  get openWing(): number {
    return this.wing;
  }

  /** Pone las piezas nuevas y abre las plantas que tocan. Es barato: solo hace algo si cambian las donaciones. */
  refresh() {
    if (!this.origin) return;
    const donated = this.deps.donated();
    if (donated.size === this.seen) return;
    this.seen = donated.size;
    const counters = { pez: 0, bicho: 0, fosil: 0 };
    for (const c of CREATURES) {
      if (!donated.has(c.id)) continue;
      const dino = DINO_PIECES.indexOf(c.id);
      const index = dino >= 0 ? 0 : counters[c.kind]++;
      if (!this.exhibits.has(c.id)) this.add(c, index, dino);
    }
    const wing = openWings(donated.size);
    if (wing > this.wing) this.deps.toast(`¡El museo abre una planta nueva: ${WINGS[wing].name}!`);
    this.wing = Math.max(this.wing, wing);
    this.openBarriers();
  }

  /** Quita el cordón de las plantas ya abiertas (solo el anfitrión, y se comparte con los demás). */
  private openBarriers() {
    if (!this.deps.host || !this.origin) return;
    const [ox, oy, oz] = this.origin;
    for (let w = 1; w <= this.wing; w++) {
      const cells: Cell[] = this.v2 ? this.hall.barrierCells(w) : [barrierCell(w)];
      for (const [x, y, z] of cells) if (this.deps.world.getBlock(ox + x, oy + y, oz + z) === Block.Fence) this.deps.put(ox + x, oy + y, oz + z, Block.Air);
    }
  }

  private add(c: Creature, index: number, dino: number) {
    const [ox, oy, oz] = this.origin!;
    const spot: ExhibitSpot & { size?: number } = this.v2 ? this.hall.exhibitSpot(c.kind, index, dino) : exhibitSpot(c.kind, index, dino);
    // Las piezas del dinosaurio son grandes; los fósiles sueltos, medianos; peces e insectos, pequeños.
    let size = spot.size ?? (dino >= 0 ? 1.3 : c.kind === 'fosil' ? 0.8 : c.kind === 'pez' ? 0.6 : 0.45);
    let obj: THREE.Object3D;
    let model: CritterModel | undefined;
    if (c.kind === 'fosil') {
      const tex = new THREE.CanvasTexture(tileCanvas(this.deps.atlas, creatureTile(CREATURES.indexOf(c))));
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      obj = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5, fog: true }));
      obj.scale.set(size, size, size);
    } else {
      // Peces e insectos en 3D (v5.4): los peces grandes, algo más grandes en la pecera.
      if (c.kind === 'pez') {
        const [lo, hi] = sizeRange(c);
        size *= Math.min(1.3, Math.max(0.85, 0.75 + Math.log10((lo + hi) / 2) * 0.2));
      } else size *= 1.25;
      model = new CritterModel(c, size, c.kind === 'pez' ? 'nada' : c.sprite === 'mariposa' || c.sprite === 'libelula' || c.sprite === 'luciernaga' ? 'vuela' : 'suelo');
      model.face(index * 1.3);
      obj = model.root;
    }
    const base = new THREE.Vector3(ox + spot.at[0], oy + spot.at[1], oz + spot.at[2]);
    obj.position.copy(base);
    const box = spot.box
      ? [ox + spot.box[0], oy + spot.box[1], oz + spot.box[2], ox + spot.box[3], oy + spot.box[4], oz + spot.box[5]] as Exhibit['box']
      : undefined;
    obj.userData.creature = c.id;
    (model ? this.critters : this.group).add(obj);
    this.exhibits.set(c.id, { creature: c, obj, model, size, base, box, phase: index * 1.7 });
  }

  /** Los peces van y vienen por el tanque; los insectos revolotean (más deprisa de noche, los nocturnos). */
  update(dt: number, night: number) {
    this.refresh();
    for (const e of this.exhibits.values()) {
      if (!e.box) continue;
      e.phase += dt;
      // La caja se encoge con el tamaño de la figura, para que no atraviese el cristal.
      const m = e.model ? e.size * 0.38 : 0;
      const [x0, y0, z0, x1, y1, z1] = e.box;
      const p = e.obj.position;
      if (e.creature.kind === 'pez') {
        const span = Math.max(0.02, (z1 - z0) / 2 - m);
        const mid = (z0 + z1) / 2;
        p.set(
          clamp(e.base.x + Math.sin(e.phase * 0.7) * 0.3, x0 + m * 0.4, x1 - m * 0.4),
          clamp(e.base.y + Math.sin(e.phase * 1.3) * 0.25, y0, y1),
          mid + Math.sin(e.phase * 0.25) * span,
        );
      } else {
        const lively = 1 + night * 0.8;
        const walks = e.model?.mode === 'suelo';
        p.set(
          clamp(e.base.x + Math.sin(e.phase * (walks ? 0.5 : 2.1) * lively) * 0.35, x0 + m, x1 - m),
          walks ? y0 + 0.02 : clamp(e.base.y + Math.abs(Math.sin(e.phase * 1.6 * lively)) * 0.9, y0, y1),
          clamp(e.base.z + Math.sin(e.phase * (walks ? 0.4 : 0.9) * lively) * 1.2, z0 + m, z1 - m),
        );
      }
      e.model?.animate(dt, e.phase);
    }
  }

  /** La pieza a la que apuntas, si está a menos de `maxDist`. */
  pick(ray: THREE.Ray, maxDist: number): Creature | null {
    let best: Creature | null = null;
    let bestDist = maxDist;
    const tmp = new THREE.Vector3();
    for (const e of this.exhibits.values()) {
      const p = e.obj.position;
      const d = ray.origin.distanceTo(p);
      if (d > bestDist) continue;
      ray.closestPointToPoint(p, tmp);
      if (tmp.distanceTo(p) <= e.size * 0.6) {
        best = e.creature;
        bestDist = d;
      }
    }
    return best;
  }

  /** Cuántas piezas se ven ahora (para las pruebas). */
  get size(): number {
    return this.exhibits.size;
  }
}

function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v));
}
