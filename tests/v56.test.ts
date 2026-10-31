import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ANIMAL_KINDS } from '../src/animals';
import { LAND_SHAPES, landGeometry, landModel } from '../src/landFaunaShapes';
import { WILDLIFE, wildModel } from '../src/wildlife';

const PARTE_1 = ['vaca', 'oveja', 'gallina', 'ciervo', 'zorro', 'conejo', 'cabra', 'camello', 'oso_polar', 'suricata'];

describe('v5.6: la fauna de tierra, con detalle (parte 1)', () => {
  it('los animales de la granja y los mamíferos salvajes tienen figura nueva', () => {
    for (const k of [...ANIMAL_KINDS, ...PARTE_1]) expect(LAND_SHAPES[k], k).toBeDefined();
  });

  it('cada figura tiene muchos más detalles que antes, pero pocas piezas (pocas mallas que dibujar)', () => {
    for (const k of PARTE_1) {
      const g = landGeometry(k)!;
      expect(g.vertices, k).toBeGreaterThan(1500);
      // Que no se pase: el más grande, por debajo de 40 000 vértices.
      expect(g.vertices, k).toBeLessThan(40000);
      const model = landModel(k)!;
      let meshes = 0;
      model.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible) meshes++; });
      expect(meshes, k).toBeLessThanOrEqual(14);
    }
  });

  it('todas las copias de una especie comparten la geometría', () => {
    const a = landModel('vaca')!;
    const b = landModel('vaca')!;
    const geo = (m: THREE.Object3D) => { const out: THREE.BufferGeometry[] = []; m.traverse((o) => { if ((o as THREE.Mesh).isMesh) out.push((o as THREE.Mesh).geometry); }); return out; };
    expect(geo(a.group)).toEqual(geo(b.group));
  });

  it('los cuadrúpedos tienen cuatro patas que se mueven en diagonal, cabeza y párpados', () => {
    for (const k of ['vaca', 'oveja', 'ciervo', 'zorro', 'cabra', 'camello', 'oso_polar', 'conejo']) {
      const m = landModel(k)!;
      expect(m.legs.length, k).toBe(4);
      expect(m.legs.reduce((s, l) => s + (l.userData.side as number), 0), k).toBe(0);
      expect(m.byName.get('head'), k).toBeDefined();
      expect(m.byName.get('head_lid')?.visible, k).toBe(false);
    }
    expect(landModel('gallina')!.legs.length).toBe(2);
    expect(landModel('gallina')!.wings.length).toBe(2);
  });

  it('los pies tocan el suelo y la altura es la de antes', () => {
    for (const k of PARTE_1) {
      const box = new THREE.Box3().setFromObject(landModel(k)!.group);
      expect(Math.abs(box.min.y), k).toBeLessThan(0.05);
    }
    expect(landGeometry('vaca')!.height).toBeGreaterThan(1.3);
    expect(landGeometry('gallina')!.height).toBeLessThan(1.2);
  });

  it('la fauna salvaje usa la figura nueva y se anima', () => {
    const m = wildModel('ciervo');
    expect('animate' in m && typeof m.animate).toBe('function');
    for (let i = 0; i < 400; i++) m.animate!(0.05, i * 0.05, false, 0);
    // El ciervo baja la cabeza a pastar en algún momento: lo comprobamos forzándolo.
    const lm = landModel('ciervo')!;
    lm.graze(3);
    for (let i = 0; i < 20; i++) lm.animate(0.05, i * 0.05, false);
    expect(lm.byName.get('neck')!.rotation.x).toBeGreaterThan(0.8);
    // Los del mar siguen con su modelo de siempre (u otro): no son de tierra.
    expect(LAND_SHAPES[WILDLIFE.delfin.name.toLowerCase()]).toBeUndefined();
  });

  it('parpadea de vez en cuando', () => {
    const m = landModel('vaca')!;
    let seen = false;
    for (let i = 0; i < 400 && !seen; i++) {
      m.animate(0.02, i * 0.02, false);
      seen = m.byName.get('head_lid')!.visible;
    }
    expect(seen).toBe(true);
  });
});
