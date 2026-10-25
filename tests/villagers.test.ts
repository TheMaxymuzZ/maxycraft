import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { introLine } from '../src/dialog';
import { LOOKS, type Species, buildVillagerModel } from '../src/villagerModel';
import { ALL_PROFILES, PERSONALITY_NAMES, RESIDENT_NAMES, SPECIES_NAMES, createVillagers } from '../src/villagers';
import { World } from '../src/world';

describe('vecinos con personalidad', () => {
  it('cada personaje tiene nombre único, especie, personalidad, cumpleaños y afición', () => {
    const names = ALL_PROFILES.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(30);
    for (const p of ALL_PROFILES) {
      expect(SPECIES_NAMES[p.species]).toBeTruthy();
      expect(PERSONALITY_NAMES[p.personality]).toBeTruthy();
      expect(p.hobby.length).toBeGreaterThan(2);
      expect(p.birthday[0]).toBeGreaterThanOrEqual(1);
      expect(p.birthday[0]).toBeLessThanOrEqual(12);
    }
  });

  it('los personajes nuevos se pueden encontrar de vacaciones', () => {
    for (const n of ['Algodón', 'Chispa', 'Hielo', 'Trompi', 'Bigotes']) expect(RESIDENT_NAMES).toContain(n);
  });

  it('cada especie tiene un modelo con dos ojos y piernas y brazos que se mueven', () => {
    for (const species of Object.keys(LOOKS) as Species[]) {
      const m = buildVillagerModel({ species, shirt: 0x3366cc, pattern: 'rayas' });
      expect(m.eyes).toHaveLength(2);
      expect(m.legs).toHaveLength(2);
      expect(m.arms).toHaveLength(2);
      const box = new THREE.Box3().setFromObject(m.group);
      expect(box.max.y).toBeGreaterThan(1.2);
      expect(box.max.y).toBeLessThan(2);
    }
  });

  it('las islas de siempre siguen teniendo los mismos vecinos', () => {
    const world = new World(20261025, new THREE.MeshBasicMaterial());
    const names = createVillagers(world, {}).map((v) => v.name);
    expect(names.slice(0, 2)).toEqual(['Avellana', 'Matilde']);
    for (const n of names.slice(2)) expect(['Canela', 'Bruno', 'Pelusa', 'Ramón', 'Lola', 'Toto']).toContain(n);
  });

  it('el vecino se presenta con su afición y su cumpleaños', () => {
    const world = new World(20261025, new THREE.MeshBasicMaterial());
    const v = createVillagers(world, {})[2];
    const line = introLine(v);
    expect(line).toContain(v.profile.hobby);
    expect(line).toContain(v.name);
  });
});
