import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Birds } from '../src/birds';
import { LAND_SHAPES, SONGBIRDS, landGeometry, landModel } from '../src/landFaunaShapes';
import { wildModel } from '../src/wildlife';
import { SEA_LEVEL } from '../src/world';

describe('v5.7: la fauna de tierra, con detalle (parte 2: aves y rana)', () => {
  it('pájaros, gaviota, loro, búho, pingüino y rana tienen figura nueva', () => {
    for (const k of [...SONGBIRDS, 'gaviota', 'loro', 'buho', 'pinguino', 'rana']) {
      expect(LAND_SHAPES[k], k).toBeDefined();
      expect(landGeometry(k)!.vertices, k).toBeGreaterThan(600);
    }
  });

  it('las aves tienen dos alas con bisagra y los que vuelan no balancean patas', () => {
    for (const k of [...SONGBIRDS, 'gaviota', 'loro', 'buho', 'pinguino']) expect(landModel(k)!.wings.length, k).toBe(2);
    expect(wildModel('loro').legs).toHaveLength(0);
    expect(wildModel('buho').legs).toHaveLength(0);
    expect(wildModel('pinguino').legs).toHaveLength(2);
    expect(wildModel('rana').legs).toHaveLength(4);
  });

  it('los ojos del búho brillan de noche (van en una malla aparte que no se apaga)', () => {
    let glows = 0;
    wildModel('buho').group.traverse((o) => { if (o.userData.noEntityLight) glows++; });
    expect(glows).toBeGreaterThan(0);
  });

  it('cada bandada es de una especie y los pájaros pliegan las alas al posarse', () => {
    let seed = 7;
    const birds = new Birds(() => ((seed = (seed * 16807) % 2147483647) / 2147483647));
    const sp = birds.species;
    expect(sp.slice(0, 4).every((s) => s === sp[0])).toBe(true);
    expect(SONGBIRDS).toContain(sp[0]);
    expect(sp[4]).not.toBe(sp[0]);
    expect(sp.slice(8)).toEqual(['gaviota', 'gaviota', 'gaviota', 'gaviota']);
    // Vuelan un rato sobre un mundo llano y luego se posan.
    const world = { topAt: () => SEA_LEVEL + 2, seaAt: () => false, waterAt: () => false };
    const player = new THREE.Vector3(0, SEA_LEVEL + 3, 0);
    for (let i = 0; i < 4000 && birds.landed === 0; i++) birds.update(0.05, i * 0.05, player, 0, world, []);
    expect(birds.landed).toBeGreaterThan(0);
    birds.update(0.05, 200, player, 0, world, []);
    // Al menos un pajarito posado tiene las alas recogidas hacia atrás.
    let folded = 0;
    birds.group.traverse((o) => { if (o.name === 'wingL' && Math.abs(o.rotation.y) > 1) folded++; });
    expect(folded).toBeGreaterThan(0);
  });

  it('la rana infla la garganta', () => {
    const m = landModel('rana')!;
    let max = 1;
    for (let i = 0; i < 200; i++) {
      m.animate(0.02, i * 0.02, false);
      max = Math.max(max, m.byName.get('throat')!.scale.x);
    }
    expect(max).toBeGreaterThan(1.4);
  });

  it('cada animal tiene un tamaño creíble al lado del jugador (1,8 bloques)', () => {
    const tall = (k: string) => new THREE.Box3().setFromObject(landModel(k)!.group).getSize(new THREE.Vector3()).y;
    expect(tall('gallina')).toBeLessThan(0.75);
    expect(tall('suricata')).toBeLessThan(0.6);
    expect(tall('conejo')).toBeLessThan(0.7);
    expect(tall('zorro')).toBeLessThan(0.95);
    expect(tall('gorrion')).toBeLessThan(0.35);
    // Los grandes, más que el jugador o casi.
    expect(tall('camello')).toBeGreaterThan(2);
    expect(tall('ciervo')).toBeGreaterThan(2);
    expect(new THREE.Box3().setFromObject(landModel('oso_polar')!.group).getSize(new THREE.Vector3()).z).toBeGreaterThan(2.2);
    // Y entre ellos: gallina < oveja < vaca < camello.
    expect(tall('gallina')).toBeLessThan(tall('oveja'));
    expect(tall('oveja')).toBeLessThan(tall('vaca'));
    expect(tall('vaca')).toBeLessThan(tall('camello'));
  });
});
