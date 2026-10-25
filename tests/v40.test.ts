import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Birds, type BirdWorld } from '../src/birds';
import { Block, isDoor } from '../src/blocks';
import { Clouds, cloudCover } from '../src/clouds';
import { RECIPES } from '../src/items';
import { Player } from '../src/player';
import { SEA_LEVEL, World } from '../src/world';

const material = new THREE.MeshBasicMaterial();
const SEED = 20261025;

function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('arreglos de la v4.0', () => {
  it('escribir en el chat no mueve al jugador', () => {
    const world = new World(SEED, material);
    const player = new Player(world, new THREE.PerspectiveCamera());
    player.position.set(0.5, 80, 0.5);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
    // Una tecla pulsada antes de abrir el chat tampoco cuenta mientras está abierto.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    for (let i = 0; i < 20; i++) player.update(0.05, false);
    expect(player.position.x).toBeCloseTo(0.5, 5);
    expect(player.position.z).toBeCloseTo(0.5, 5);
  });

  it('con dos tablones se hacen cuatro ramas', () => {
    const r = RECIPES.find((x) => x.result === 'rama')!;
    expect(r.count).toBe(4);
    expect(r.needs).toEqual([['tablones', 2]]);
  });

  it('las casas de los vecinos, la tienda y el museo tienen puerta', () => {
    const world = new World(SEED, material);
    for (const p of world.plots.filter((x) => x.kind !== 'player')) {
      world.update(p.x, p.z, 1, 99);
      expect(isDoor(world.getBlock(p.x, p.y + 1, p.z + 2))).toBe(true);
      expect(world.getBlock(p.x, p.y + 2, p.z + 2)).toBe(Block.DoorTop);
    }
  });

  it('la casa del jugador también tiene puerta y al ampliarla no se queda la vieja dentro', () => {
    const world = new World(SEED, material);
    const p = world.playerPlot!;
    world.update(p.x, p.z, 2, 99);
    world.buildPlayerHouse(1, Block.RoofRed);
    expect(world.getBlock(p.x, p.y + 1, p.z + 2)).toBe(Block.Door);
    world.buildPlayerHouse(2, Block.RoofRed);
    expect(world.getBlock(p.x, p.y + 1, p.z + 3)).toBe(Block.Door);
    expect(world.getBlock(p.x, p.y + 1, p.z + 2)).toBe(Block.Air);
  });

  it('la playa se hace honda poco a poco, sin escalones grandes', () => {
    const world = new World(SEED, material);
    for (const a of [0, 1, 2, 3, 4, 5]) {
      let last = world.heightAt(0, 0);
      let x = 0;
      // Desde la orilla hacia fuera: nunca baja más de un bloque de golpe.
      for (let d = 40; d < 200; d++) {
        const h = world.heightAt(Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d));
        if (last <= SEA_LEVEL + 1 && h < last) expect(last - h).toBeLessThanOrEqual(1);
        last = h;
        x = d;
      }
      expect(x).toBe(199);
    }
  });

  it('los ríos solo son hondos por el medio', () => {
    const world = new World(SEED, material);
    let deep = 0;
    let shallow = 0;
    for (let x = -60; x <= 60; x++) {
      for (let z = -60; z <= 60; z++) {
        const top = world.waterTop(x, z);
        if (top === null || world.waterKind(x, z) !== 'río') continue;
        const depth = top - world.heightAt(x, z);
        expect(depth).toBeLessThanOrEqual(2);
        if (depth === 2) deep++;
        else shallow++;
      }
    }
    expect(shallow).toBeGreaterThan(deep);
  });

  it('las nubes cambian de forma al dar la vuelta y el cielo no siempre está igual de cubierto', () => {
    const clouds = new Clouds(20, seeded());
    const shapes = () => clouds.group.children.map((c) => (c as THREE.Group).children.map((m) => m.scale.x.toFixed(2)).join());
    clouds.update(0, 0, 0, 0, undefined, new THREE.Vector3(), 1);
    const before = shapes();
    // Mucho rato después, el viento ha hecho que todas den la vuelta.
    for (let t = 0; t < 400; t += 0.5) clouds.update(t, 0, 0, 0, undefined, new THREE.Vector3(), 1);
    const after = shapes();
    expect(after.filter((s, i) => s !== before[i]).length).toBeGreaterThan(10);
    const covers = Array.from({ length: 10 }, (_, d) => cloudCover(d, 12, 1));
    expect(Math.max(...covers) - Math.min(...covers)).toBeGreaterThan(0.2);
  });

  it('los pájaros vuelan por encima de todo, se posan y se espantan si alguien se acerca', () => {
    // Una isla plana con una torre muy alta en medio.
    const world: BirdWorld = {
      topAt: (x, z) => (Math.abs(x) < 4 && Math.abs(z) < 4 ? SEA_LEVEL + 40 : SEA_LEVEL + 2),
      seaAt: () => false,
      waterAt: () => false,
    };
    const birds = new Birds(seeded(3));
    const player = new THREE.Vector3(0, SEA_LEVEL + 3, 30);
    let landed = 0;
    let t = 0;
    for (; t < 120; t += 0.05) {
      birds.update(0.05, t, player, 0, world, [player]);
      for (const b of birds.group.children) {
        const p = b.position;
        expect(p.y).toBeGreaterThanOrEqual(world.topAt(Math.floor(p.x), Math.floor(p.z)) + 0.99);
      }
      landed = Math.max(landed, birds.landed);
    }
    expect(landed).toBeGreaterThan(0);
    // Los que están en el suelo salen volando si te pones a su lado.
    const sitting = birds.group.children.filter((_, i) => i >= 0).map((b) => b.position.clone());
    const down = birds.landed;
    if (down) {
      const spot = sitting.find((p) => Math.abs(p.y - (SEA_LEVEL + 3)) < 0.1)!;
      const me = spot.clone();
      birds.update(0.05, t, me, 0, world, [me]);
      expect(birds.landed).toBeLessThan(down);
    }
  });
});
