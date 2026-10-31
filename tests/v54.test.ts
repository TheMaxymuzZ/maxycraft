import { describe, expect, it } from 'vitest';
import { CREATURES } from '../src/creatures';
import { Part, critterArt } from '../src/critterArt';
import { CritterModel, critterGeometry } from '../src/critterModels';

const living = CREATURES.filter((c) => c.kind !== 'fosil');

describe('v5.4: cada pez e insecto con su propia forma', () => {
  it('todos los peces e insectos tienen dibujo propio', () => {
    for (const c of living) expect(critterArt(c), c.id).not.toBeNull();
  });

  it('no hay dos especies con la misma silueta', () => {
    const shapes = new Map<string, string>();
    for (const c of living) {
      const art = critterArt(c)!;
      const mask = Array.from(art.part, (p) => (p === Part.Empty ? '0' : '1')).join('');
      expect(shapes.get(mask), `${c.id} tiene la misma forma que ${shapes.get(mask)}`).toBeUndefined();
      shapes.set(mask, c.id);
    }
  });

  it('las figuras en 3D se construyen y los que vuelan tienen alas', () => {
    for (const c of living) {
      const g = critterGeometry(c)!;
      expect(g.merged.getAttribute('position').count, c.id).toBeGreaterThan(100);
      if (['mariposa', 'libelula', 'luciernaga'].includes(c.sprite)) expect(g.wings.length, c.id).toBe(2);
    }
    // Lo que brilla va aparte.
    expect(critterGeometry(CREATURES.find((c) => c.id === 'luciernaga')!)!.glow).not.toBeNull();
  });

  it('el cuerpo es más gordo que las aletas', () => {
    const atun = critterGeometry(CREATURES.find((c) => c.id === 'atun')!)!;
    atun.body.computeBoundingBox();
    const depth = atun.body.boundingBox!.max.z - atun.body.boundingBox!.min.z;
    expect(depth).toBeGreaterThan(5 / 16);
  });

  it('un insecto que vuela mira hacia donde va', () => {
    const m = new CritterModel(CREATURES.find((c) => c.id === 'libelula')!, 0.5);
    m.animate(0.016, 0);
    for (let i = 1; i <= 60; i++) {
      m.position.set(i * 0.05, 0, 0);
      m.animate(0.1, i * 0.1);
    }
    // Hacia +x: la cabeza (-z del modelo) gira a +x.
    expect(Math.abs(m.root.rotation.y + Math.PI / 2)).toBeLessThan(0.3);
  });
});
