import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Block, isLeaves, isSolid, isWater } from '../src/blocks';
import { templateCells } from '../src/buildings';
import { CREATURES } from '../src/creatures';
import { MuseumHall } from '../src/game/museum';
import { HALL_FLOORS, MUSEUM_HALL, OLD_HALL_BARRIERS, museumHallOrigin } from '../src/museumHall';
import { MAX_STAGE, SHIPWRIGHT_SPOT, SHIPYARD_VERSION, shipyardTemplate } from '../src/shipyard';
import { type TreeBlock, broadOakShape, bushShape, cloudTreeShape, fellTree, poplarShape, tieredPineShape } from '../src/trees';
import { GIANT_ISLAND_RADIUS, HUGE_ISLAND_RADIUS, SEA_LEVEL, TERRAIN_VERSION, World } from '../src/world';

vi.mock('../src/icons', () => ({ tileIcon: () => '', itemIcon: () => '' }));

const material = new THREE.MeshBasicMaterial();
const SEED = 20261031;
const world = (terrain: number, seed = SEED) => new World(seed, material, {}, { terrain });

describe('v5.9: Bartolo no aparece dentro de un bloque', () => {
  it('donde trabaja Bartolo hay sitio para estar de pie en todas las etapas, también en las ruinas', () => {
    for (const v of [undefined, SHIPYARD_VERSION]) {
      for (let stage = 0; stage <= MAX_STAGE; stage++) {
        const cells = new Map(templateCells(shipyardTemplate(stage, v), 0).map(([x, y, z, b]) => [`${x},${y},${z}`, b]));
        const [x, y, z] = SHIPWRIGHT_SPOT;
        for (const dy of [0, 1]) {
          const b = cells.get(`${x},${y + dy},${z}`);
          expect(b === undefined || b === null || !isSolid(b), `etapa ${stage}, versión ${v ?? 1}`).toBe(true);
        }
      }
    }
  });
});

describe('v5.9: la isla nueva', () => {
  it('las islas nuevas son del terreno 4 y más grandes; las de antes no cambian de tamaño', () => {
    expect(TERRAIN_VERSION).toBeGreaterThanOrEqual(4);
    expect(world(4).islandRadius).toBe(GIANT_ISLAND_RADIUS);
    expect(GIANT_ISLAND_RADIUS).toBeGreaterThan(HUGE_ISLAND_RADIUS);
    expect(world(3).islandRadius).toBe(HUGE_ISLAND_RADIUS);
    expect(world(4).gentle).toBe(true);
    expect(world(3).gentle).toBe(false);
  });

  it('bastante menos bambú en el bioma de bambú', () => {
    const share = (w: World) => {
      let biome = 0;
      let bamboo = 0;
      for (let x = -170; x <= 170; x += 2) {
        for (let z = -170; z <= 170; z += 2) {
          if (w.biomeAt(x, z) !== 'bambu') continue;
          biome++;
          if (w.zoneAt(x, z) === 'bambu') bamboo++;
        }
      }
      return biome ? bamboo / biome : 0;
    };
    const before = share(world(3));
    const now = share(world(4));
    expect(before).toBeGreaterThan(0);
    expect(now).toBeLessThan(before * 0.5);
  });
});

/**
 * ¿Se puede salir del agua del río en (x, z)? Se busca, por la tierra de alrededor, un camino de escalones de un
 * bloque como mucho que se aleje 12 bloques del agua (sin volver a meterse en el río).
 */
function canClimbOut(w: World, x: number, z: number): boolean {
  const level = w.waterLevel(x, z);
  const height = (cx: number, cz: number) => w.heightAt(cx, cz);
  const wet = (cx: number, cz: number) => w.waterKind(cx, cz) !== null;
  const seen = new Set<string>();
  const queue: [number, number, number][] = [];
  // Desde el agua se sube a la orilla si está como mucho un bloque por encima del agua.
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let k = 1; k < 6; k++) {
      const cx = x + dx * k;
      const cz = z + dz * k;
      if (wet(cx, cz)) continue;
      if (height(cx, cz) <= level + 1) queue.push([cx, cz, height(cx, cz)]);
      break;
    }
  }
  while (queue.length) {
    const [cx, cz, h] = queue.shift()!;
    const k = `${cx},${cz}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (Math.abs(cx - x) + Math.abs(cz - z) >= 14) return true;
    if (seen.size > 3000) return false;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (wet(nx, nz) || seen.has(`${nx},${nz}`)) continue;
      const nh = height(nx, nz);
      if (nh - h <= 1) queue.push([nx, nz, nh]);
    }
  }
  return false;
}

describe('v5.9: orillas del río suaves', () => {
  it('desde cualquier punto del río se sale andando o con un salto', () => {
    for (const seed of [SEED, 7, 4242]) {
      const w = world(4, seed);
      let checked = 0;
      for (let r = 12; r < 150 && checked < 60; r += 7) {
        for (let a = 0; a < Math.PI * 2 && checked < 60; a += 0.09) {
          const x = Math.round(Math.cos(a) * r);
          const z = Math.round(Math.sin(a) * r);
          if (w.waterKind(x, z) !== 'río' || w.heightAt(x, z) <= SEA_LEVEL) continue;
          checked++;
          expect(canClimbOut(w, x, z), `semilla ${seed}, río en ${x},${z}`).toBe(true);
        }
      }
      expect(checked).toBeGreaterThan(10);
    }
  });
});

describe('v5.9: playas de los islotes', () => {
  it('del islote al fondo del mar se baja de uno en uno, sin escalón', () => {
    for (const seed of [SEED, 7]) {
      const w = world(4, seed);
      expect(w.islets.length).toBeGreaterThan(0);
      for (const i of w.islets) {
        for (let a = 0; a < Math.PI * 2; a += 0.3) {
          let prev = w.heightAt(i.x, i.z);
          for (let d = 1; d < i.r * 1.3 + 30; d++) {
            const h = w.heightAt(Math.round(i.x + Math.cos(a) * d), Math.round(i.z + Math.sin(a) * d));
            expect(prev - h, `islote ${i.x},${i.z}`).toBeLessThanOrEqual(1);
            prev = h;
          }
        }
      }
    }
  });
});

describe('v5.9: árboles de Maxycraft', () => {
  const kinds: [string, (r: number) => TreeBlock[]][] = [
    ['nube', (r) => cloudTreeShape(Block.Apple, r)],
    ['álamo', poplarShape],
    ['pino de pisos', (r) => tieredPineShape(r)],
    ['roble', (r) => broadOakShape(Block.Apple, r)],
    ['arbusto', bushShape],
  ];
  const height = (s: TreeBlock[]) => Math.max(...s.map(([, y]) => y)) + 1;

  it('cada clase de árbol sale de muchas alturas distintas', () => {
    for (const [name, make] of kinds) {
      if (name === 'arbusto') continue;
      const heights = new Set(Array.from({ length: 40 }, (_, i) => height(make(i / 40 + 0.0123))));
      expect(heights.size, name).toBeGreaterThanOrEqual(3);
    }
    // Del arbusto (1 o 2) al álamo más alto (más de 12).
    const all = kinds.flatMap(([, make]) => Array.from({ length: 40 }, (_, i) => height(make(i / 40 + 0.0123))));
    expect(Math.min(...all)).toBeLessThanOrEqual(2);
    expect(Math.max(...all)).toBeGreaterThanOrEqual(12);
  });

  it('caben en lo que mira el mundo al dibujar un trozo (5 bloques alrededor del tronco)', () => {
    for (const [name, make] of kinds) {
      for (let i = 0; i < 40; i++) for (const [dx, , dz] of make(i / 40 + 0.0123)) expect(Math.max(Math.abs(dx), Math.abs(dz)), name).toBeLessThanOrEqual(5);
    }
  });

  it('al talar uno por la base cae entero: troncos, hojas y fruta', () => {
    for (const [name, make] of kinds) {
      if (name === 'arbusto') continue;
      for (let i = 0; i < 20; i++) {
        const shape = make(i / 20 + 0.031);
        const blocks = new Map<string, number>();
        for (const [dx, dy, dz, b] of shape) blocks.set(`${dx},${10 + dy},${dz}`, b);
        const w = { getBlock: (x: number, y: number, z: number) => blocks.get(`${x},${y},${z}`) ?? (y < 10 ? Block.Grass : Block.Air) };
        const felled = fellTree(w, 0, 10, 0);
        const crown = shape.filter(([, , , b]) => b !== Block.Log).length;
        const logs = shape.filter(([, , , b]) => b === Block.Log).length;
        // Las raíces del roble que asoman a ras de suelo se quedan, como el tocón.
        expect(felled.logs.length, `${name} ${i}`).toBeGreaterThanOrEqual(logs - 4);
        expect(felled.leaves.length + felled.fruits.length, `${name} ${i}`).toBe(crown);
      }
    }
  });

  it('en la isla nueva hay árboles de alturas muy distintas', () => {
    const w = world(4);
    const tops = new Set<number>();
    let leaves = 0;
    for (let cx = -6; cx < 6; cx += 2) {
      for (let cz = -6; cz < 6; cz += 2) {
        const x0 = cx * 16;
        const z0 = cz * 16;
        for (let x = x0; x < x0 + 16; x++) {
          for (let z = z0; z < z0 + 16; z++) {
            const ground = w.heightAt(x, z);
            if (w.getBlock(x, ground + 1, z) !== Block.Log) continue;
            let y = ground + 1;
            while (w.getBlock(x, y + 1, z) === Block.Log || isLeaves(w.getBlock(x, y + 1, z))) y++;
            tops.add(y - ground);
            leaves++;
          }
        }
      }
    }
    expect(leaves).toBeGreaterThan(10);
    expect(tops.size).toBeGreaterThanOrEqual(5);
  });
});

describe('v5.9: el museo más abierto', () => {
  const cell = new Map(templateCells(MUSEUM_HALL, 0).map(([x, y, z, b]) => [`${x},${y},${z}`, b]));
  const solid = (x: number, y: number, z: number) => {
    const b = cell.get(`${x},${y},${z}`);
    return b !== undefined && b !== null && isSolid(b);
  };

  // v5.11: era demasiado alto; la planta de abajo vuelve a los 5 de alto de la v5.2 (ver v511.test.ts).
  it('la planta de abajo está despejada y sigue habiendo solo dos plantas', () => {
    expect(HALL_FLOORS.length).toBe(2);
    for (const [x, z] of [[2, 8], [17, 8], [10, 14]]) for (let y = 1; y < HALL_FLOORS[1]; y++) expect(solid(x, y, z), `${x},${y},${z}`).toBe(false);
  });

  it('el patio central está abierto del suelo al lucernario de cristal', () => {
    for (const [x, z] of [[7, 8], [13, 8]]) {
      let y = 1;
      while (!solid(x, y, z)) y++;
      expect(y, `${x},${z}`).toBeGreaterThan(10);
    }
    let y = 1;
    while (!solid(10, y, 8) || cell.get(`10,${y},8`) === Block.PolishedStairs || cell.get(`10,${y},8`) === Block.PolishedStone) y++;
    expect(cell.get(`10,${y},8`)).toBe(Block.Glass);
  });

  it('hay mucho cristal: ventanales en casi toda la fachada', () => {
    const glass = templateCells(MUSEUM_HALL, 0).filter(([, , , b]) => b === Block.Glass).length;
    expect(glass).toBeGreaterThan(250);
  });

  it('los cordones quitados en el museo de la v5.2 no dejan agujeros', () => {
    const w = new World(SEED, material, {}, { terrain: 3 });
    const museum = w.plots.find((p) => p.kind === 'museum')!;
    const [ox, oy, oz] = museumHallOrigin(museum);
    for (let dx = -16; dx <= 16; dx += 16) for (let dz = -16; dz <= 16; dz += 16) w.update(museum.x + dx, museum.z + dz, 1, 99);
    for (const [x, y, z] of OLD_HALL_BARRIERS) w.setBlock(ox + x, oy + y, oz + z, Block.Air);
    expect(OLD_HALL_BARRIERS.every(([x, y, z]) => w.isEdited(ox + x, oy + y, oz + z))).toBe(true);
    const ctx = new Proxy({}, { get: () => () => {} });
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    new MuseumHall({
      world: w, scene: new THREE.Scene(), atlas: document.createElement('canvas'), donated: () => new Set(CREATURES.slice(0, 3).map((c) => c.id)), host: true,
      put: (x, y, z, b) => w.setBlock(x, y, z, b), restore: (cells) => w.clearEdits(cells), toast: () => {},
    });
    spy.mockRestore();
    expect(OLD_HALL_BARRIERS.some(([x, y, z]) => w.isEdited(ox + x, oy + y, oz + z))).toBe(false);
    // Debajo de la escalinata vuelve a estar macizo.
    expect(isSolid(w.getBlock(ox + 10, oy + 1, oz + 10))).toBe(true);
    expect(isWater(w.getBlock(ox + 10, oy + 1, oz + 10))).toBe(false);
  });
});
