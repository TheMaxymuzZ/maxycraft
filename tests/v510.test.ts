import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { EnemyModel, enemyGeometry } from '../src/enemyModels';
import { HOSTILE_KINDS } from '../src/hostiles';
import { HORIZON_CELLS, HORIZON_RINGS, Horizon } from '../src/horizon';
import { FAUNA_LOD, faunaEye } from '../src/landFauna';
import { LAND_SHAPES, landGeometry, landModel } from '../src/landFaunaShapes';
import { SunShadows } from '../src/shadows';
import { CHUNK, World } from '../src/world';

const material = new THREE.MeshBasicMaterial();
const still = { moving: 0, ready: 0, casting: null, cast: 0, flash: false };

describe('v5.10: el detalle lejano baja poco a poco', () => {
  const world = new World(20261031, material, {}, { terrain: 4 });
  const horizon = new Horizon(world, () => [90, 160, 70], new THREE.MeshBasicMaterial());
  // Desde un lado de la isla, para que el otro lado quede muy lejos.
  const PX = -160;
  horizon.update(PX, 0, 6, true);
  horizon.finish();

  it('la isla lejana tiene celdas de los cuatro tamaños, de más fino cerca a más grueso lejos', () => {
    expect(HORIZON_CELLS).toEqual([1, 2, 4, 8]);
    for (const n of horizon.cellCount) expect(n).toBeGreaterThan(0);
    // Cada anillo es más ancho que el anterior.
    for (let i = 1; i < HORIZON_RINGS.length; i++) expect(HORIZON_RINGS[i] - HORIZON_RINGS[i - 1]).toBeGreaterThan(HORIZON_RINGS[i - 1]);
  });

  it('las celdas finas están cerca del borde de lo cargado y las gruesas lejos', () => {
    const edge = 6 * CHUNK;
    const land = (horizon as unknown as { land: THREE.Group }).land;
    let nearest = Infinity;
    for (const m of land.children as THREE.Mesh[]) {
      const p = m.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i += 6) nearest = Math.min(nearest, Math.hypot(p.getX(i) - (Math.floor(PX / CHUNK) + 0.5) * CHUNK, p.getZ(i) - CHUNK / 2));
    }
    // Empieza justo dentro del borde (un chunk de solape), no más allá.
    expect(nearest).toBeGreaterThan(edge - 2 * CHUNK - 2);
    expect(nearest).toBeLessThan(edge);
  });

  it('va en trozos, no da sombra y se rehace poco a poco', () => {
    const land = (horizon as unknown as { land: THREE.Group }).land;
    expect(land.children.length).toBeGreaterThan(3);
    for (const m of land.children) expect(m.userData.noShadow).toBe(true);
    // Al cruzar de chunk no se rehace todo de golpe: hacen falta varios fotogramas con poco tiempo cada uno.
    horizon.budgetMs = 0.01;
    horizon.update(PX + CHUNK, 0, 6, true);
    expect((horizon as unknown as { job: unknown }).job).not.toBeNull();
    horizon.finish();
    expect(horizon.triangles).toBeGreaterThan(1000);
  });

  it('los animales y los enemigos tienen una figura media entre la entera y la de lejos', () => {
    for (const k of Object.keys(LAND_SHAPES)) {
      const g = landGeometry(k)!;
      expect(g.mid, k).toBeDefined();
      expect(g.mid!.vertices, k).toBeLessThan(g.vertices);
      expect(g.mid!.vertices, k).toBeGreaterThanOrEqual(g.far!.vertices);
    }
    for (const k of HOSTILE_KINDS) expect(enemyGeometry(k).mid, k).toBeDefined();
  });

  it('cambian de figura más lejos que antes, en dos pasos y sin parpadear en el límite', () => {
    expect(FAUNA_LOD[0]).toBeGreaterThan(22);
    const m = landModel('vaca')!;
    faunaEye.set(0, 0, 0);
    const at = (d: number) => {
      m.group.position.set(d, 0, 0);
      m.animate(0.016, 0, false);
      return m.lodLevel;
    };
    expect(at(25)).toBe(0);
    expect(at(45)).toBe(1);
    expect(at(150)).toBe(2);
    // Justo en el límite se queda como estaba, venga de donde venga.
    expect(at(FAUNA_LOD[0] * 1.3 + 1)).toBe(1);
    expect(at(FAUNA_LOD[0] * 1.3 - 0.5)).toBe(1);
    // Se ve una sola figura cada vez.
    let shown = 0;
    m.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible && o.parent?.visible && !(o as THREE.Mesh).userData.noEntityLight) shown++; });
    expect(shown).toBeGreaterThan(0);
    const e = new EnemyModel('limo');
    e.animate(0.016, 0, still);
    expect(e.lodLevel).toBe(0);
    e.group.position.set(45, 0, 0);
    e.animate(0.016, 0, still);
    expect(e.lodLevel).toBe(1);
    faunaEye.set(0, 1e6, 0);
  });

  it('solo dan sombra los chunks que caen dentro del mapa de sombras', () => {
    const renderer = { shadowMap: { enabled: false, type: 0 } } as unknown as THREE.WebGLRenderer;
    const light = new THREE.DirectionalLight();
    const scene = new THREE.Scene();
    const shadows = new SunShadows(renderer, light, scene);
    light.castShadow = true;
    (shadows as unknown as { range: number }).range = 40;
    light.shadow.mapSize.set(1024, 1024);
    const group = new THREE.Group();
    for (let cx = -8; cx <= 8; cx++) {
      for (let cz = -8; cz <= 8; cz++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(16, 10, 16).translate(8, 40, 8), material);
        m.position.set(cx * 16, 0, cz * 16);
        group.add(m);
      }
    }
    shadows.limited = group;
    // Sol a mediodía: solo los de alrededor.
    shadows.update(0.016, new THREE.Vector3(0, 40, 0), new THREE.Vector3(0, 1, 0));
    expect(shadows.casting).toBeGreaterThan(9);
    expect(shadows.casting).toBeLessThan(60);
    const near = group.children.find((o) => o.position.x === 0 && o.position.z === 0)!;
    const far = group.children.find((o) => o.position.x === 128 && o.position.z === 128)!;
    expect(near.castShadow).toBe(true);
    expect(far.castShadow).toBe(false);
  });
});
