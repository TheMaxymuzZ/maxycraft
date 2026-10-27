import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Block, collisionBoxes } from '../src/blocks';
import { templateCells } from '../src/buildings';
import { CREATURES, DINO_PIECES, pickCreature } from '../src/creatures';
import { MuseumHall } from '../src/game/museum';
import { itemDef } from '../src/items';
import { LORE } from '../src/lore';
import { FLOORS, MUSEUM, MUSEUM_SIZE, WINGS, barrierCell, exhibitSpot, museumOrigin, openWings } from '../src/museum';
import { World } from '../src/world';

// happy-dom no dibuja en lienzos: las piezas del museo se pintan sin textura.
vi.mock('../src/blocks', async (original) => ({ ...(await original<typeof import('../src/blocks')>()), tileCanvas: () => document.createElement('canvas') }));

const material = new THREE.MeshBasicMaterial();
const SEED = 20261025;

describe('v4.15: museo de varias plantas', () => {
  it('las plantas se abren según las donaciones', () => {
    expect(openWings(0)).toBe(0);
    expect(openWings(WINGS[1].opens - 1)).toBe(0);
    expect(openWings(WINGS[1].opens)).toBe(1);
    expect(openWings(WINGS[2].opens)).toBe(2);
    expect(openWings(99)).toBe(WINGS.length - 1);
  });

  it('el edificio cabe en la parcela y cada planta tiene su escalera y su cordón', () => {
    const cells = templateCells(MUSEUM, 0);
    for (const [x, , z] of cells) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(MUSEUM_SIZE);
      expect(z).toBeLessThan(MUSEUM_SIZE);
    }
    const at = (x: number, y: number, z: number) => cells.find(([a, b, c]) => a === x && b === y && c === z)?.[3];
    for (let f = 0; f < 3; f++) {
      // La escalera sube de z = 7 a z = 3 y el último peldaño queda a la altura del suelo de arriba.
      expect(at(1, FLOORS[f] + 1, 7)).toBe(Block.CobbleStairs);
      expect(at(1, FLOORS[f + 1], 3)).toBe(Block.CobbleStairs);
      const [bx, by, bz] = barrierCell(f + 1);
      expect(at(bx, by, bz)).toBe(Block.Fence);
    }
    // La puerta, detrás del porche.
    expect(at(5, 1, 9)).toBe(Block.Door);
    expect(MUSEUM.door).toEqual([5, 1, 10]);
  });

  it('el museo sale con la isla: puerta en el porche, luces y agua en el acuario', () => {
    const world = new World(SEED, material);
    const m = world.plots.find((p) => p.kind === 'museum')!;
    world.update(m.x, m.z, 1, 99);
    expect(m.door).toEqual([m.x, m.y + 1, m.z + 5]);
    expect(world.getBlock(m.x, m.y + 1, m.z + 4)).toBe(Block.Door);
    const [ox, oy, oz] = museumOrigin(m);
    expect(world.getBlock(ox + 8, oy + 7, oz + 3)).toBe(Block.Water);
    expect(world.getBlock(ox + 6, oy + FLOORS[3] + 1, oz + 5)).toBe(Block.LightBlock);
    // Las luces del techo alumbran desde el principio.
    expect((world as unknown as { torches: Map<string, unknown> }).torches.has(`${ox + 5},${oy + 4},${oz + 2}`)).toBe(true);
    // No es un cambio del jugador: es parte de la isla.
    expect(world.isEdited(m.x, m.y + 1, m.z + 4)).toBe(false);
  });

  it('las piezas donadas se ven y el anfitrión quita los cordones', () => {
    const world = new World(SEED, material);
    const m = world.plots.find((p) => p.kind === 'museum')!;
    world.update(m.x, m.z, 1, 99);
    const [ox, oy, oz] = museumOrigin(m);
    const donated = new Set<string>(['amonites', ...DINO_PIECES]);
    const toasts: string[] = [];
    const hall = new MuseumHall({
      world,
      scene: new THREE.Scene(),
      atlas: document.createElement('canvas'),
      donated: () => donated,
      host: true,
      put: (x, y, z, b) => world.setBlock(x, y, z, b),
      toast: (t) => toasts.push(t),
    });
    expect(hall.size).toBe(4);
    expect(hall.openWing).toBe(1);
    const [bx, by, bz] = barrierCell(1);
    expect(world.getBlock(ox + bx, oy + by, oz + bz)).toBe(Block.Air);
    const [cx, cy, cz] = barrierCell(2);
    expect(world.getBlock(ox + cx, oy + cy, oz + cz)).toBe(Block.Fence);
    // Al donar más se abre la siguiente planta y sale el pez en su tanque.
    for (const c of CREATURES.filter((c) => c.kind !== 'fosil').slice(0, 5)) donated.add(c.id);
    hall.update(0.5, 0);
    expect(hall.openWing).toBe(2);
    expect(world.getBlock(ox + cx, oy + cy, oz + cz)).toBe(Block.Air);
    expect(toasts.some((t) => t.includes('Insectario'))).toBe(true);
    // Se puede mirar una pieza apuntándole.
    const spot = exhibitSpot('fosil', 0, -1).at;
    const target = new THREE.Vector3(ox + spot[0], oy + spot[1], oz + spot[2]);
    const from = target.clone().add(new THREE.Vector3(0, 0, 3));
    const ray = new THREE.Ray(from, target.clone().sub(from).normalize());
    expect(hall.pick(ray, 6)?.id).toBe('amonites');
  });

  it('los fósiles salen cavando, son tesoros y tienen ficha', () => {
    const fossils = CREATURES.filter((c) => c.kind === 'fosil');
    expect(fossils.length).toBe(6);
    for (const f of fossils) {
      expect(itemDef(f.id).kind).toBe('tesoro');
      expect(LORE[f.id]).toBeTruthy();
    }
    let s = 3;
    const random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(pickCreature(['tierra'], 12, random)!.id);
    expect(seen.size).toBe(6);
    // Cavando no salen peces ni insectos.
    expect([...seen].every((id) => fossils.some((f) => f.id === id))).toBe(true);
  });

  it('el cordón es una valla: no se puede saltar', () => {
    expect(collisionBoxes(Block.Fence)[0][4]).toBeGreaterThan(1);
  });
});
