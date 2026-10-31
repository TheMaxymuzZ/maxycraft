import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Furniture } from '../src/furniture';
import { CHUNK, World } from '../src/world';

const material = new THREE.MeshBasicMaterial();

describe('v5.3.1: más fluido', () => {
  it('un chunk lejano que se consulta no se vuelve a generar en cada fotograma', () => {
    // Un juego que lleva un rato abierto: 60 fotogramas por segundo.
    let t = 1_000_000;
    const now = vi.spyOn(performance, 'now').mockImplementation(() => (t += 16));
    const world = new World(777, material, {}, { terrain: 2 });
    world.update(0, 0, 2);
    const far = 40 * CHUNK;
    let generated = 0;
    const w = world as unknown as { generate(c: { cx: number }): void };
    const generate = w.generate.bind(world);
    w.generate = (c) => {
      if (c.cx === 40) generated++;
      generate(c);
    };
    // Como un vecino de otra isla mirando dónde está su cama, fotograma tras fotograma.
    for (let i = 0; i < 20; i++) {
      world.getBlock(far, 20, far);
      world.update(0, 0, 2);
    }
    expect(generated).toBe(1);
    now.mockRestore();
  });

  it('los muebles se juntan en una malla por material y cada uno guarda su luz', async () => {
    const f = new Furniture([]);
    for (let i = 0; i < 10; i++) f.place('pecera', i, 0, 0, 0);
    for (let i = 0; i < 10; i++) f.place('banco', i, 0, 3, i % 4);
    await Promise.resolve();
    const batches = f.group.children[0];
    expect(f.count).toBe(20);
    expect(batches.children.length).toBeGreaterThan(0);
    expect(batches.children.length).toBeLessThan(12);
    // Las piezas opacas de cada mueble ya no se dibujan sueltas; lo transparente (el agua de la pecera) sí.
    let visible = 0;
    for (const model of f.group.children.slice(1)) model.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible) visible++; });
    expect(visible).toBe(10);
    // La luz de un mueble va a sus vértices.
    const first = f.group.children[1];
    (first.userData.onLit as (sky: number, glow: THREE.Color) => void)(0.25, new THREE.Color(1, 0.5, 0));
    const mesh = batches.children[0] as THREE.Mesh;
    const lit = mesh.geometry.getAttribute('aLit').array as Float32Array;
    expect([...lit.slice(0, 4)]).toEqual([0.25, 1, 0.5, 0]);
    expect(lit[lit.length - 4]).toBe(1);
    // Al quitar uno se rehacen, y la luz de los demás se mantiene.
    f.remove(f.serialize()[5]);
    await Promise.resolve();
    const again = (f.group.children[0].children[0] as THREE.Mesh).geometry.getAttribute('aLit').array as Float32Array;
    expect([...again.slice(0, 4)]).toEqual([0.25, 1, 0.5, 0]);
  });
});
