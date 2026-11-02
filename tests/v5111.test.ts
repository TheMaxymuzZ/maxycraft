import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BLOCKS, Block, isLeaves } from '../src/blocks';
import { SHOP_HALF, SHOP_NORMAL, shopLayout } from '../src/shopHall';
import { MUSEUM_HALF_BIG } from '../src/museumHall';
import { SHRUB_KINDS, shrubShape } from '../src/trees';
import { SEA_LEVEL, TERRAIN_VERSION, TIDY_TERRAIN, World } from '../src/world';

vi.mock('../src/icons', () => ({ tileIcon: () => '', itemIcon: () => '' }));

const material = new THREE.MeshBasicMaterial();
const SEED = 20261102;
const world = (terrain: number, seed = SEED) => new World(seed, material, {}, { terrain });
const LOGS = new Set<number>([Block.Log, Block.PalmLog]);

/** Las bases de tronco (un tronco con suelo debajo) en un cuadrado de la isla. */
function trunkBases(w: World, x0: number, z0: number, size: number): [number, number][] {
  const out: [number, number][] = [];
  for (let x = x0; x < x0 + size; x++) {
    for (let z = z0; z < z0 + size; z++) {
      const g = w.heightAt(x, z);
      if (LOGS.has(w.getBlock(x, g + 1, z))) out.push([x, z]);
    }
  }
  return out;
}

describe('v5.11.1: las islas nuevas', () => {
  it('son del terreno 6: la tienda vuelve a la de siempre y el museo sigue grande', () => {
    expect(TERRAIN_VERSION).toBe(TIDY_TERRAIN);
    for (let i = 1; i <= 6; i++) {
      const plots = world(6, i * 7919).plots;
      expect(plots.length).toBe(6);
      const shop = plots.find((p) => p.kind === 'shop')!;
      expect(shop.half).toBe(SHOP_HALF);
      expect(shopLayout(shop)).toBe(SHOP_NORMAL);
      expect(plots.find((p) => p.kind === 'museum')?.half).toBe(MUSEUM_HALF_BIG);
    }
  });

  it('las islas del terreno 5 no cambian (su tienda grande y sus parcelas se quedan donde estaban)', () => {
    const a = world(5).plots.map((p) => [p.kind, p.x, p.z, p.half]);
    const b = world(5).plots.map((p) => [p.kind, p.x, p.z, p.half]);
    expect(a).toEqual(b);
    expect(world(5).plots.find((p) => p.kind === 'shop')?.half).toBe(10);
  });
});

describe('v5.11.1: árboles con su sitio', () => {
  it('no hay troncos pegados: entre dos árboles siempre queda hueco', () => {
    const w = world(6);
    let trees = 0;
    for (const [x0, z0] of [[-96, -96], [0, -96], [-96, 0], [0, 0], [40, 40], [-60, 60]]) {
      const bases = trunkBases(w, x0, z0, 48);
      // Los troncos de 2x2 del roble y sus raíces cuentan como uno: se agrupan los que se tocan.
      const groups: [number, number][][] = [];
      for (const b of bases) {
        const g = groups.find((list) => list.some(([x, z]) => Math.abs(x - b[0]) <= 1 && Math.abs(z - b[1]) <= 1));
        if (g) g.push(b); else groups.push([b]);
      }
      trees += groups.length;
      for (const g of groups) expect(g.length, `tronco en ${g[0]}`).toBeLessThanOrEqual(8);
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          let near = Infinity;
          for (const [ax, az] of groups[i]) for (const [bx, bz] of groups[j]) near = Math.min(near, Math.hypot(ax - bx, az - bz));
          expect(near, `${groups[i][0]} y ${groups[j][0]}`).toBeGreaterThanOrEqual(3);
        }
      }
    }
    expect(trees).toBeGreaterThan(20);
  });
});

describe('v5.11.1: arbustos', () => {
  it('hay cinco bloques nuevos con nombre, y los de hojas se tratan como hojas', () => {
    for (const b of [Block.Boxwood, Block.BerryBush, Block.Azalea, Block.Hydrangea]) {
      expect(BLOCKS[b].name).toBeTruthy();
      expect(isLeaves(b)).toBe(true);
    }
    expect(BLOCKS[Block.Fern].shape).toBe('cross');
  });

  it('cada arbusto es pequeño: como mucho 3x3 y dos de alto', () => {
    for (const kind of SHRUB_KINDS) {
      for (let i = 0; i < 20; i++) {
        const shape = shrubShape(kind, i / 20);
        expect(shape.length).toBeGreaterThan(0);
        for (const [dx, dy, dz] of shape) {
          expect(Math.abs(dx) <= 2 && Math.abs(dz) <= 2 && dy >= 0 && dy <= 1, kind).toBe(true);
        }
      }
    }
  });

  it('muchas menos hojas de árbol sueltas por el suelo y arbustos de varios tipos', () => {
    const count = (terrain: number) => {
      const w = world(terrain);
      let groundLeaves = 0;
      const kinds = new Set<number>();
      for (let x = -120; x < 120; x += 1) {
        for (let z = -120; z < 120; z += 2) {
          const g = w.heightAt(x, z);
          const b = w.getBlock(x, g + 1, z);
          if (b === Block.Leaves) groundLeaves++;
          if (b === Block.Boxwood || b === Block.BerryBush || b === Block.Azalea || b === Block.Hydrangea || b === Block.Fern) kinds.add(b);
        }
      }
      return { groundLeaves, kinds: kinds.size };
    };
    const before = count(5);
    const now = count(6);
    expect(now.groundLeaves).toBeLessThan(before.groundLeaves / 3);
    expect(now.kinds).toBeGreaterThanOrEqual(4);
  });
});

describe('v5.11.1: montañas de verdad', () => {
  it('la zona de montaña tiene una cumbre mucho más alta que las terrazas de antes', () => {
    let higher = 0;
    for (let i = 1; i <= 6; i++) {
      const seed = i * 15485863;
      const top = (terrain: number) => {
        const w = world(terrain, seed);
        let best = 0;
        for (let x = -200; x <= 200; x += 3) for (let z = -200; z <= 200; z += 3) if (w.biomeAt(x, z) === 'montaña') best = Math.max(best, w.heightAt(x, z));
        return best;
      };
      const old = top(5);
      const now = top(6);
      expect(now).toBeLessThanOrEqual(58);
      if (now >= old + 10) higher++;
    }
    expect(higher).toBeGreaterThanOrEqual(5);
  });

  it('la cumbre no toca el pueblo del centro ni la playa', () => {
    const w = world(6);
    for (let x = -30; x <= 30; x += 2) for (let z = -30; z <= 30; z += 2) expect(w.heightAt(x, z)).toBeLessThanOrEqual(SEA_LEVEL + 2 + 16);
  });
});
