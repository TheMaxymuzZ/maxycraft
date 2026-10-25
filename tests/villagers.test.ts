import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { KNOW, aboutLine, nextToLearn } from '../src/dialog';
import { albumInfo } from '../src/collection';
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

  it('el vecino se presenta solo con su nombre y cuenta lo demás poco a poco (v4.0)', () => {
    const world = new World(20261025, new THREE.MeshBasicMaterial());
    const v = createVillagers(world, {})[2];
    const hello = aboutLine(v, KNOW.met);
    expect(hello).toContain(v.name);
    expect(hello).not.toContain(v.profile.hobby);
    expect(aboutLine(v, KNOW.hobby)).toContain(v.profile.hobby);
    expect(aboutLine(v, KNOW.birthday)).toContain(String(v.profile.birthday[1]));
  });

  it('las cosas más personales solo se cuentan con mucha amistad, de una en una', () => {
    expect(nextToLearn(KNOW.met, 0)).toBeNull();
    expect(nextToLearn(KNOW.met, 2)).toBe(KNOW.hobby);
    // Aunque seáis muy amigos, no se salta pasos: primero la afición.
    expect(nextToLearn(KNOW.met, 50)).toBe(KNOW.hobby);
    expect(nextToLearn(KNOW.hobby, 3)).toBeNull();
    expect(nextToLearn(KNOW.likes, 10)).toBe(KNOW.birthday);
    expect(nextToLearn(KNOW.birthday, 99)).toBeNull();
  });

  it('el álbum solo enseña lo que te han contado', () => {
    const p = ALL_PROFILES.find((x) => x.name === 'Canela')!;
    expect(albumInfo(p, KNOW.met)).not.toContain('14');
    expect(albumInfo(p, KNOW.met)).not.toContain(p.hobby);
    expect(albumInfo(p, KNOW.birthdaySeason)).toContain('primavera');
    expect(albumInfo(p, KNOW.birthday)).toContain('14 mar');
  });
});
