// Lo que se ve dentro del museo (v4.15): los fósiles en sus pedestales, el dinosaurio en el centro, los peces
// nadando en el acuario y los insectos revoloteando en el terrario. Cada jugador ve lo que él ha donado. El
// anfitrión, además, quita el cordón de cada planta cuando se abre. El edificio está en museum.ts.
import * as THREE from 'three';
import { Block, CREATURE_TILE_START, tileCanvas } from '../blocks';
import { CREATURES, type Creature, DINO_PIECES } from '../creatures';
import { WINGS, barrierCell, exhibitSpot, museumOrigin, openWings } from '../museum';
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
  toast(text: string): void;
}

interface Exhibit {
  creature: Creature;
  sprite: THREE.Sprite;
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

  constructor(private deps: MuseumHallDeps) {
    const plot = deps.world.plots.find((p) => p.kind === 'museum');
    if (plot) this.origin = museumOrigin(plot);
    this.group.name = 'museo';
    deps.scene.add(this.group);
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
      const [x, y, z] = barrierCell(w);
      if (this.deps.world.getBlock(ox + x, oy + y, oz + z) === Block.Fence) this.deps.put(ox + x, oy + y, oz + z, Block.Air);
    }
  }

  private add(c: Creature, index: number, dino: number) {
    const [ox, oy, oz] = this.origin!;
    const spot = exhibitSpot(c.kind, index, dino);
    const tex = new THREE.CanvasTexture(tileCanvas(this.deps.atlas, CREATURE_TILE_START + CREATURES.indexOf(c)));
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5, fog: true }));
    // Las piezas del dinosaurio son grandes; los fósiles sueltos, medianos; peces e insectos, pequeños.
    const size = dino >= 0 ? 1.3 : c.kind === 'fosil' ? 0.8 : c.kind === 'pez' ? 0.6 : 0.45;
    sprite.scale.set(size, size, size);
    const base = new THREE.Vector3(ox + spot.at[0], oy + spot.at[1], oz + spot.at[2]);
    sprite.position.copy(base);
    const box = spot.box
      ? [ox + spot.box[0], oy + spot.box[1], oz + spot.box[2], ox + spot.box[3], oy + spot.box[4], oz + spot.box[5]] as Exhibit['box']
      : undefined;
    sprite.userData.creature = c.id;
    this.group.add(sprite);
    this.exhibits.set(c.id, { creature: c, sprite, base, box, phase: index * 1.7 });
  }

  /** Los peces van y vienen por el tanque; los insectos revolotean (más deprisa de noche, los nocturnos). */
  update(dt: number, night: number) {
    this.refresh();
    for (const e of this.exhibits.values()) {
      if (!e.box) continue;
      e.phase += dt;
      const [x0, y0, z0, x1, y1, z1] = e.box;
      const p = e.sprite.position;
      if (e.creature.kind === 'pez') {
        const span = (z1 - z0) / 2;
        const mid = (z0 + z1) / 2;
        p.set(
          clamp(e.base.x + Math.sin(e.phase * 0.7) * 0.3, x0, x1),
          clamp(e.base.y + Math.sin(e.phase * 1.3) * 0.25, y0, y1),
          mid + Math.sin(e.phase * 0.25) * span,
        );
      } else {
        const lively = 1 + night * 0.8;
        p.set(
          clamp(e.base.x + Math.sin(e.phase * 2.1 * lively) * 0.35, x0, x1),
          clamp(e.base.y + Math.abs(Math.sin(e.phase * 1.6 * lively)) * 0.9, y0, y1),
          clamp(e.base.z + Math.sin(e.phase * 0.9 * lively) * 1.2, z0, z1),
        );
      }
    }
  }

  /** La pieza a la que apuntas, si está a menos de `maxDist`. */
  pick(ray: THREE.Ray, maxDist: number): Creature | null {
    let best: Creature | null = null;
    let bestDist = maxDist;
    const tmp = new THREE.Vector3();
    for (const e of this.exhibits.values()) {
      const p = e.sprite.position;
      const d = ray.origin.distanceTo(p);
      if (d > bestDist) continue;
      ray.closestPointToPoint(p, tmp);
      if (tmp.distanceTo(p) <= e.sprite.scale.x * 0.6) {
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
