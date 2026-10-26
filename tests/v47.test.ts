import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { MeshMirror } from '../src/mesherCore';
import { CHUNK, type MesherMessage, World } from '../src/world';

const material = new THREE.MeshBasicMaterial();

/** Un mundo con su "hilo de dibujo" en memoria: los mensajes se guardan y se atienden cuando se pide. */
function withMirror(world: World) {
  const mirror = new MeshMirror();
  const queue: MesherMessage[] = [];
  world.attachMesher({ post: (m) => queue.push(structuredClone(m)) });
  const pump = () => {
    while (queue.length) {
      const out = mirror.handle(queue.shift()!);
      if (out) world.receiveMesh(out.result);
    }
  };
  return { mirror, queue, pump };
}

function geometryOf(world: World, cx: number, cz: number) {
  const mesh = world.group.children.find((m) => m.position.x === cx * CHUNK && m.position.z === cz * CHUNK) as THREE.Mesh | undefined;
  return mesh?.geometry.getAttribute('position').array as Float32Array | undefined;
}

describe('v4.7: mallas dibujadas en otro hilo', () => {
  it('la malla del hilo es igual que la dibujada aquí', () => {
    const local = new World(777, material, {}, { terrain: 2 });
    local.update(0, 0, 2);
    // Sin hilo, update dibuja unos pocos por fotograma: se repite hasta que estén todos.
    for (let i = 0; i < 40; i++) local.update(0, 0, 2);
    const remote = new World(777, material, {}, { terrain: 2 });
    const { pump } = withMirror(remote);
    for (let i = 0; i < 40; i++) {
      remote.update(0, 0, 2);
      pump();
    }
    expect(remote.meshedChunks).toBe(local.meshedChunks);
    for (const [cx, cz] of [[0, 0], [1, -1], [-2, 0]]) {
      const a = geometryOf(local, cx, cz);
      const b = geometryOf(remote, cx, cz);
      expect(a).toBeDefined();
      expect(Array.from(b!)).toEqual(Array.from(a!));
    }
  });

  it('los bloques los genera el hilo y aquí se aprovechan', () => {
    const world = new World(777, material, {}, { terrain: 2 });
    const { pump } = withMirror(world);
    world.update(0, 0, 1);
    pump();
    const fresh = new World(777, material, {}, { terrain: 2 });
    for (const [x, z] of [[0, 0], [5, 9]]) expect(world.heightAt(x, z)).toBe(fresh.heightAt(x, z));
    for (let y = 0; y < 40; y++) expect(world.getBlock(3, y, 3)).toBe(fresh.getBlock(3, y, 3));
  });

  it('si un bloque cambia mientras se dibuja, esa malla se descarta y se pide otra', () => {
    const world = new World(777, material, {}, { terrain: 2 });
    const { pump, queue } = withMirror(world);
    for (let i = 0; i < 30; i++) {
      world.update(0, 0, 1);
      pump();
    }
    const y = world.heightAt(2, 2) + 1;
    world.setBlock(2, y, 2, Block.Stone);
    world.update(0, 0, 1); // pide la malla nueva
    world.setBlock(2, y + 1, 2, Block.Stone); // y cambia otra vez antes de que llegue
    pump();
    // La primera respuesta ya no vale: el chunk sigue pendiente hasta la siguiente.
    for (let i = 0; i < 5; i++) {
      world.update(0, 0, 1);
      pump();
    }
    expect(queue.length).toBe(0);
    // La malla final es la de los dos bloques: igual que la de un mundo con los mismos cambios dibujado aquí.
    const local = new World(777, material, {}, { terrain: 2 });
    local.setBlock(2, y, 2, Block.Stone);
    local.setBlock(2, y + 1, 2, Block.Stone);
    for (let i = 0; i < 30; i++) local.update(0, 0, 1);
    expect(Array.from(geometryOf(world, 0, 0)!)).toEqual(Array.from(geometryOf(local, 0, 0)!));
  });

  it('suelta de memoria los chunks que llevan un rato muy lejos y los recupera con sus cambios', () => {
    const world = new World(777, material, {}, { terrain: 2 });
    const y = world.heightAt(0, 0) + 1;
    world.setBlock(0, y, 0, Block.Brick);
    const now = performance.now;
    let t = 0;
    performance.now = () => t;
    try {
      for (let i = 0; i < 40; i++) world.update(0, 0, 2);
      const before = world.loadedChunks;
      t = 60_000;
      for (let i = 0; i < 40; i++) world.update(2000, 2000, 2);
      expect(world.loadedChunks).toBeLessThan(before + 40);
      expect(world.hasColumn(0, 0)).toBe(false);
      expect(world.getBlock(0, y, 0)).toBe(Block.Brick);
    } finally {
      performance.now = now;
    }
  });
});
