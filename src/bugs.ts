import * as THREE from 'three';
import { Block, isCross, isSolid } from './blocks';
import { CritterModel } from './critterModels';
import { type Creature, type Habitat, pickCreature } from './creatures';
import type { World } from './world';
import { Population, type PopulationRule } from './population';

interface Bug {
  creature: Creature;
  /** Zona del control de población donde apareció. */
  zone: string;
  /** Su figura en 3D (v5.4; antes era un dibujo plano). */
  model: CritterModel;
  base: THREE.Vector3;
  phase: number;
  life: number;
}

/** Insectos a la vez: pocos por zona, para que estén repartidos, y unos cuantos en total (v4.7). */
export const BUG_RULE: PopulationRule = { perZone: 3, total: 8, respawn: 120 };
const FLYERS = new Set(['mariposa', 'libelula', 'luciernaga']);
/** Tamaño de cada insecto en el mundo (1 = un bloque). */
const SCALE: Record<string, number> = {
  mariposa_blanca: 0.5, mariposa_azul: 0.56, libelula: 0.62, luciernaga: 0.34, mariquita: 0.28,
  escarabajo: 0.5, cigarra: 0.42, pulga_nieves: 0.22, grillo: 0.4,
};

/** Insectos que aparecen cerca del jugador según la hora y el sitio. */
export class Bugs {
  readonly group = new THREE.Group();
  private bugs: Bug[] = [];
  private spawnTimer = 0;

  constructor(private world: World, _atlas: HTMLCanvasElement | null = null, private population = new Population({ bichos: BUG_RULE })) {}

  /** `_light` ya no se usa: desde la v5.4 los insectos son figuras en 3D y los alumbra la luz de los seres. */
  update(dt: number, hour: number, player: THREE.Vector3, _light = 1) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.2;
      this.trySpawn(hour, player);
    }
    this.population.update(dt);

    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const b = this.bugs[i];
      b.phase += dt;
      b.life -= dt;
      const p = b.model.position;
      const kind = b.creature.sprite;
      const mode = b.model.mode;
      if (FLYERS.has(kind)) {
        // Vuelo a trompicones alrededor de su sitio.
        const speed = kind === 'libelula' ? 1.6 : 0.9;
        p.set(
          b.base.x + Math.sin(b.phase * speed) * 1.6 + Math.sin(b.phase * 2.3) * 0.3,
          b.base.y + Math.sin(b.phase * 1.7) * 0.4,
          b.base.z + Math.cos(b.phase * speed * 0.8) * 1.6,
        );
      } else if (mode === 'suelo') {
        // Pasea despacio por la hierba; el grillo, a saltitos.
        const jump = b.creature.id === 'grillo' ? Math.max(0, Math.sin(b.phase * 2.2)) ** 6 * 0.35 : 0;
        p.set(
          b.base.x + Math.sin(b.phase * 0.23) * 0.35,
          b.base.y + jump,
          b.base.z + Math.sin(b.phase * 0.17 + 1) * 0.35,
        );
      } else {
        // En el tronco: sube y baja un poquito.
        p.y = b.base.y + Math.sin(b.phase * 0.4) * 0.12;
      }
      b.model.animate(dt, b.phase);

      const far = p.distanceTo(player) > 40;
      if (far || b.life <= 0) this.remove(i);
    }
  }

  private trySpawn(hour: number, player: THREE.Vector3) {
    const a = Math.random() * Math.PI * 2;
    const d = 6 + Math.random() * 18;
    const x = Math.floor(player.x + Math.cos(a) * d);
    const z = Math.floor(player.z + Math.sin(a) * d);
    if (!this.population.canSpawn('bichos', x, z)) return;
    if (this.world.waterKind(x, z)) return;
    const h = this.world.heightAt(x, z);
    const above = this.world.getBlock(x, h + 1, z);

    let habitats: Habitat[];
    let pos = new THREE.Vector3(x + 0.5, h + 1.3, z + 0.5);
    if (above === Block.Log) {
      habitats = ['árboles'];
      pos = new THREE.Vector3(x + 0.5, h + 2.5, z + 1.03); // pegado al tronco
    } else if (isCross(above) && above !== Block.TallGrass) {
      habitats = ['flores'];
    } else if (this.nearWater(x, z)) {
      habitats = ['agua'];
    } else if (!isSolid(above)) {
      // En la hierba salen grillos y, a veces, mariposas de paso.
      habitats = Math.random() < 0.4 ? ['flores'] : ['suelo'];
      if (Math.random() < 0.5) pos.y = h + 1.05;
    } else return;

    const c = pickCreature(habitats, hour);
    if (!c) return;
    if (FLYERS.has(c.sprite)) pos.y = h + 1.6 + Math.random();
    // Los de la hierba y las flores que no vuelan, en el suelo (antes flotaban un poco).
    if (!FLYERS.has(c.sprite) && habitats[0] !== 'árboles') pos.y = h + 1.04;
    const model = new CritterModel(c, SCALE[c.id] ?? 0.4);
    model.position.copy(pos);
    model.face(Math.random() * Math.PI * 2);
    this.group.add(model.root);
    this.bugs.push({ creature: c, zone: this.population.add('bichos', x, z), model, base: pos.clone(), phase: Math.random() * 10, life: 90 + Math.random() * 90 });
  }

  private nearWater(x: number, z: number): boolean {
    for (let dz = -3; dz <= 3; dz += 3) for (let dx = -3; dx <= 3; dx += 3) if (this.world.waterKind(x + dx, z + dz)) return true;
    return false;
  }

  /** Intenta atrapar con la red el insecto más cercano a la mira. */
  catch(ray: THREE.Ray, reach: number): Creature | null {
    let best = -1;
    let bestDist = Infinity;
    const closest = new THREE.Vector3();
    this.bugs.forEach((b, i) => {
      const along = closest.copy(b.model.position).sub(ray.origin).dot(ray.direction);
      if (along < 0 || along > reach) return;
      const off = ray.distanceToPoint(b.model.position);
      if (off < 0.6 && along < bestDist) {
        best = i;
        bestDist = along;
      }
    });
    if (best < 0) return null;
    const c = this.bugs[best].creature;
    this.remove(best, true);
    return c;
  }

  /** Para pruebas: posiciones de los insectos actuales. */
  list() {
    return this.bugs.map((b) => ({ id: b.creature.id, pos: b.model.position.clone() }));
  }

  private remove(i: number, caught = false) {
    this.population.remove('bichos', this.bugs[i].zone, caught);
    this.group.remove(this.bugs[i].model.root);
    this.bugs.splice(i, 1);
  }
}
