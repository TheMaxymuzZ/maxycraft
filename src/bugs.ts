import * as THREE from 'three';
import { Block, creatureTile, isCross, isSolid, tileCanvas } from './blocks';
import { CREATURES, type Creature, type Habitat, pickCreature } from './creatures';
import type { World } from './world';
import { Population, type PopulationRule } from './population';

interface Bug {
  creature: Creature;
  /** Zona del control de población donde apareció. */
  zone: string;
  sprite: THREE.Sprite;
  base: THREE.Vector3;
  phase: number;
  life: number;
}

/** Insectos a la vez: pocos por zona, para que estén repartidos, y unos cuantos en total (v4.7). */
export const BUG_RULE: PopulationRule = { perZone: 3, total: 8, respawn: 120 };
const FLYERS = new Set(['mariposa', 'libelula', 'luciernaga']);

/** Insectos que aparecen cerca del jugador según la hora y el sitio. */
export class Bugs {
  readonly group = new THREE.Group();
  private bugs: Bug[] = [];
  private materials = new Map<string, THREE.SpriteMaterial>();
  private spawnTimer = 0;

  constructor(private world: World, private atlas: HTMLCanvasElement, private population = new Population({ bichos: BUG_RULE })) {}

  private material(c: Creature): THREE.SpriteMaterial {
    let m = this.materials.get(c.id);
    if (!m) {
      const tex = new THREE.CanvasTexture(tileCanvas(this.atlas, creatureTile(CREATURES.indexOf(c))));
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      m = new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5, fog: true });
      this.materials.set(c.id, m);
    }
    return m;
  }

  update(dt: number, hour: number, player: THREE.Vector3, light: number) {
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
      const p = b.sprite.position;
      const kind = b.creature.sprite;
      if (FLYERS.has(kind)) {
        // Vuelo a trompicones alrededor de su sitio.
        const speed = kind === 'libelula' ? 1.6 : 0.9;
        p.set(
          b.base.x + Math.sin(b.phase * speed) * 1.6 + Math.sin(b.phase * 2.3) * 0.3,
          b.base.y + Math.sin(b.phase * 1.7) * 0.4,
          b.base.z + Math.cos(b.phase * speed * 0.8) * 1.6,
        );
        b.sprite.scale.x = 0.45 * (0.6 + Math.abs(Math.sin(b.phase * 14)) * 0.4); // aleteo
      } else {
        p.y = b.base.y + Math.max(0, Math.sin(b.phase * 3)) * 0.05;
      }
      // La luciérnaga brilla de noche.
      b.sprite.material.color.setScalar(b.creature.id === 'luciernaga' ? 1 : light);

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
      pos = new THREE.Vector3(x + 0.5, h + 2.5, z + 1.05); // pegado al tronco
    } else if (isCross(above) && above !== Block.TallGrass) {
      habitats = ['flores'];
    } else if (this.nearWater(x, z)) {
      habitats = ['agua'];
    } else if (!isSolid(above)) {
      // En la hierba salen grillos y, a veces, mariposas de paso.
      habitats = Math.random() < 0.4 ? ['flores'] : ['suelo'];
      if (Math.random() < 0.5) pos.y = h + 1.15;
    } else return;

    const c = pickCreature(habitats, hour);
    if (!c) return;
    if (FLYERS.has(c.sprite)) pos.y = h + 1.6 + Math.random();
    const sprite = new THREE.Sprite(this.material(c));
    sprite.scale.setScalar(FLYERS.has(c.sprite) ? 0.45 : 0.35);
    sprite.position.copy(pos);
    this.group.add(sprite);
    this.bugs.push({ creature: c, zone: this.population.add('bichos', x, z), sprite, base: pos.clone(), phase: Math.random() * 10, life: 90 + Math.random() * 90 });
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
      const along = closest.copy(b.sprite.position).sub(ray.origin).dot(ray.direction);
      if (along < 0 || along > reach) return;
      const off = ray.distanceToPoint(b.sprite.position);
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
    return this.bugs.map((b) => ({ id: b.creature.id, pos: b.sprite.position.clone() }));
  }

  private remove(i: number, caught = false) {
    this.population.remove('bichos', this.bugs[i].zone, caught);
    this.group.remove(this.bugs[i].sprite);
    this.bugs.splice(i, 1);
  }
}
