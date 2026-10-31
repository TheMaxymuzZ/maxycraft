import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SEA_KINDS, seaGeometry, seaModel } from '../src/seaFauna';
import { WILDLIFE, wildModel } from '../src/wildlife';

describe('v5.5: la fauna del mar, con detalle', () => {
  it('todos los animales del mar y de la orilla tienen figura nueva', () => {
    for (const k of ['delfin', 'ballena', 'tortuga', 'cangrejo', 'medusa', 'raya', 'foca'] as const) {
      expect(SEA_KINDS, k).toContain(k);
      const m = wildModel(k);
      expect(m.animate, k).toBeTypeOf('function');
    }
    // Los de tierra no son cosa de esta versión.
    expect(seaModel('ciervo')).toBeNull();
    for (const k of SEA_KINDS) expect(['mar', 'orilla']).toContain(WILDLIFE[k].place);
  });

  it('están hechos de muchos cubitos, pero sin pasarse', () => {
    for (const k of SEA_KINDS) {
      const g = seaGeometry(k)!;
      expect(g.faces, k).toBeGreaterThan(400);
      expect(g.faces, k).toBeLessThan(6000);
      // Pocas mallas por animal: una por cada parte que se mueve.
      expect(g.segs.filter((s) => s.geo).length, k).toBeLessThanOrEqual(13);
    }
  });

  it('se construyen una vez y todas las copias comparten figura y material', () => {
    const a = seaModel('delfin')!;
    const b = seaModel('delfin')!;
    const meshes = (m: typeof a) => {
      const out: THREE.Mesh[] = [];
      m.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh); });
      return out;
    };
    const ma = meshes(a), mb = meshes(b);
    expect(ma.length).toBe(mb.length);
    ma.forEach((m, i) => {
      expect(m.geometry).toBe(mb[i].geometry);
      expect(m.material).toBe(mb[i].material);
    });
    // Al irse no se tira lo compartido.
    a.dispose!();
    expect(seaGeometry('delfin')!.segs[0].geo!.getAttribute('position')).toBeTruthy();
  });

  it('se mueven: la cola del delfín, las alas de la raya, las patas del cangrejo y el latido de la medusa', () => {
    const rot = (m: ReturnType<typeof seaModel>, name: string) => {
      let r = 0;
      m!.group.traverse((o) => { if (o.children.length && o.parent && o.userData.part === name) r = o.rotation.x + o.rotation.y + o.rotation.z + o.scale.y; });
      return r;
    };
    for (const [kind, part] of [['delfin', 'cola'], ['raya', 'alaR2'], ['cangrejo', 'pataL0'], ['medusa', 'campana'], ['tortuga', 'alL'], ['foca', 'cola'], ['ballena', 'aleta']] as const) {
      const m = seaModel(kind)!;
      const seen: number[] = [];
      for (let i = 0; i < 40; i++) {
        m.animate!(0.1, 1 + i * 0.1, true, 0);
        seen.push(rot(m, part));
      }
      expect(Math.max(...seen) - Math.min(...seen), `${kind} ${part}`).toBeGreaterThan(0.05);
    }
  });

  it('el cangrejo anda de lado y lo que brilla de la medusa no se apaga de noche', () => {
    const crab = seaModel('cangrejo')!;
    expect(Math.abs(crab.group.children[0].rotation.y)).toBeCloseTo(Math.PI / 2);
    let glow = 0;
    seaModel('medusa')!.group.traverse((o) => { if (o.userData.noEntityLight) glow++; });
    expect(glow).toBe(1);
  });

  it('la ballena es grande y el cangrejo pequeño', () => {
    const size = (k: 'ballena' | 'cangrejo') => new THREE.Box3().setFromObject(seaModel(k)!.group).getSize(new THREE.Vector3());
    expect(size('ballena').z).toBeGreaterThan(13);
    expect(size('cangrejo').x).toBeLessThan(1);
  });
});
