import { describe, expect, it } from 'vitest';
import { CHARGE_TIME, FISTS, LOOT_CHANCE, arrowDamage, hitDamage, rollLoot, shieldBlock, weaponStats } from '../src/combat';
import { HOSTILES, HOSTILE_KINDS, type HostileWorld, Hostiles, hostilesFor } from '../src/hostiles';
import { itemDef } from '../src/items';
import { LORE } from '../src/lore';
import { normalizeSettings } from '../src/settings';
import * as THREE from 'three';

/** Un suelo plano a la altura 10, sin nada encima: todo es «cueva» o un bioma, según se diga. */
function flat(place: ReturnType<HostileWorld['placeAt']>): HostileWorld {
  return { solid: (_x, y) => y < 10, placeAt: () => place };
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('v4.24 armas y criaturas hostiles', () => {
  it('las espadas van de menos a más daño y el golpe cargado hace casi el doble', () => {
    const swords = ['espada_madera', 'espada_piedra', 'espada_hierro', 'espada_cristal', 'espada_obsidiana'];
    for (let i = 1; i < swords.length; i++) expect(weaponStats(swords[i]).damage).toBeGreaterThan(weaponStats(swords[i - 1]).damage);
    expect(weaponStats('pico')).toBe(FISTS);
    const iron = weaponStats('espada_hierro');
    expect(hitDamage(iron, 0.1)).toBe(4);
    expect(hitDamage(iron, CHARGE_TIME)).toBe(7);
    expect(arrowDamage('arco', 1)).toBeGreaterThan(arrowDamage('arco', 0));
    expect(shieldBlock('escudo_hierro')).toBeLessThan(shieldBlock('escudo'));
    expect(shieldBlock(null)).toBe(1);
    for (const id of [...swords, 'arco', 'flecha', 'escudo', 'escudo_hierro']) {
      expect(itemDef(id).kind).toBe('arma');
      expect(LORE[id]).toBeTruthy();
    }
  });

  it('cada criatura sale solo en su sitio, y las de noche solo de noche (salvo en las cuevas)', () => {
    expect(hostilesFor('volcanico', false)).toContain('golem_lava');
    expect(hostilesFor('luminoso', false)).not.toContain('espiritu');
    expect(hostilesFor('luminoso', true)).toContain('espiritu');
    expect(hostilesFor('cueva', false)).toEqual(expect.arrayContaining(['murcielago', 'esqueleto', 'limo']));
    for (const k of HOSTILE_KINDS) expect(HOSTILES[k].loot.length).toBeGreaterThan(0);
  });

  it('en un sitio tranquilo, apagadas o en modo tranquilo no sale ninguna', () => {
    const h = new Hostiles(seeded(1));
    const player = new THREE.Vector3(0.5, 10, 0.5);
    h.enabled = true;
    for (let i = 0; i < 200; i++) h.update(0.1, i * 0.1, player, 0, flat(null));
    expect(h.list).toHaveLength(0);
    for (let i = 0; i < 200; i++) h.update(0.1, i * 0.1, player, 0, flat('cueva'));
    expect(h.list.length).toBeGreaterThan(0);
    expect(h.list.length).toBeLessThanOrEqual(6);
    h.enabled = false;
    h.update(0.1, 0, player, 0, flat('cueva'));
    expect(h.list).toHaveLength(0);
    expect(normalizeSettings({}, false).calm).toBe(false);
    expect(normalizeSettings({ calm: true }, false).calm).toBe(true);
  });

  it('van a por ti y te hacen daño; el esqueleto dispara flechas', () => {
    const h = new Hostiles(seeded(2));
    h.enabled = true;
    const player = new THREE.Vector3(0.5, 10, 0.5);
    h.spawn('golem_lava', 4.5, 10, 0.5).pinned = true;
    let hits = 0;
    for (let i = 0; i < 300; i++) hits += h.update(1 / 30, i / 30, player, 0, flat('volcanico')).hits.length;
    expect(hits).toBeGreaterThan(0);
    const s = new Hostiles(seeded(3));
    s.enabled = true;
    s.spawn('esqueleto', 9.5, 10, 0.5).pinned = true;
    let shot = false;
    for (let i = 0; i < 300 && !shot; i++) {
      s.update(1 / 30, i / 30, player, 1, flat('cueva'));
      shot = s.arrows.length > 0;
    }
    expect(shot).toBe(true);
  });

  it('el limo grande se parte en dos pequeños, y al vencer se apunta para el botín', () => {
    const h = new Hostiles(seeded(4));
    const limo = h.spawn('limo', 3, 10, 3);
    expect(h.damage(limo, 3, new THREE.Vector3(1, 0, 0))).toBe(false);
    expect(h.damage(limo, 99, new THREE.Vector3(1, 0, 0))).toBe(true);
    expect(h.list.map((l) => l.size)).toEqual([1, 1]);
    expect(h.defeated).toHaveLength(1);
    expect(h.list[0].max).toBeLessThan(HOSTILES.limo.hp);
  });

  it('las flechas del jugador dañan a las criaturas', () => {
    const h = new Hostiles(seeded(5));
    h.enabled = true;
    const bat = h.spawn('esqueleto', 5.5, 10, 0.5);
    bat.pinned = true;
    h.shoot(new THREE.Vector3(0.5, 11.2, 0.5), new THREE.Vector3(20, 0, 0), 3, true);
    for (let i = 0; i < 30; i++) h.update(1 / 60, i / 60, new THREE.Vector3(-20, 10, 0.5), 1, flat('cueva'));
    expect(bat.hp).toBe(HOSTILES.esqueleto.hp - 3);
  });

  it('el botín sale según la rareza: lo común casi siempre, lo legendario muy poco', () => {
    const r = seeded(6);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) for (const l of rollLoot(HOSTILES.limo.loot, r)) counts[l.id] = (counts[l.id] ?? 0) + 1;
    expect(counts.baba_limo / 4000).toBeCloseTo(LOOT_CHANCE.comun, 1);
    expect(counts.corona_limo ?? 0).toBeLessThan(counts.perla_negra);
    expect(counts.perla_negra).toBeLessThan(counts.baba_limo);
  });
});
