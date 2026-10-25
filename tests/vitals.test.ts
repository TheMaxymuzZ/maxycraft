import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FOOD, MAX_HEALTH, MAX_HUNGER, Vitals, faintLoss } from '../src/vitals';
import { hasItem } from '../src/items';
import { Player } from '../src/player';
import { World } from '../src/world';

const still = { moving: false, sprinting: false, underwater: false, burning: false };
const run = (v: Vitals, seconds: number, a = still) => {
  for (let t = 0; t < seconds; t += 0.1) v.update(0.1, a);
};

describe('vida y hambre (v4.1)', () => {
  it('toda la comida existe como objeto', () => {
    for (const id of Object.keys(FOOD)) expect(hasItem(id)).toBe(true);
  });

  it('el hambre baja despacio, y más deprisa corriendo', () => {
    const calm = new Vitals();
    run(calm, 60);
    expect(calm.hunger).toBeGreaterThanOrEqual(MAX_HUNGER - 1);
    const runner = new Vitals();
    run(runner, 60, { ...still, moving: true, sprinting: true });
    expect(runner.hunger).toBeLessThan(calm.hunger);
    // Andando sin parar, la tripa llena dura más de un cuarto de hora.
    const walker = new Vitals();
    run(walker, 15 * 60, { ...still, moving: true });
    expect(walker.hunger).toBeGreaterThan(0);
  });

  it('comer llena el hambre; con la tripa llena no se come', () => {
    const v = new Vitals({ health: 20, hunger: 10 });
    expect(v.eat('pan')).toBe(true);
    expect(v.hunger).toBe(17);
    v.hunger = MAX_HUNGER;
    expect(v.eat('manzana')).toBe(false);
    expect(v.eat('piedra')).toBe(false);
  });

  it('con la tripa llena la vida sube sola; de hambre no te desmayas', () => {
    const v = new Vitals({ health: 10, hunger: 20 });
    run(v, 20);
    expect(v.health).toBeGreaterThan(10);
    const hungry = new Vitals({ health: 20, hunger: 0 });
    run(hungry, 600);
    expect(hungry.health).toBe(2);
    expect(hungry.fainted).toBe(false);
  });

  it('caer desde alto hace daño, desde poco no', () => {
    const v = new Vitals();
    expect(v.fall(3)).toBe(0);
    expect(v.fall(8)).toBe(5);
    expect(v.health).toBe(MAX_HEALTH - 5);
  });

  it('bajo el agua se aguanta un rato y luego se pierde vida hasta desmayarse', () => {
    const v = new Vitals();
    let fainted = '';
    v.onFaint = (c) => (fainted = c);
    run(v, 10, { ...still, underwater: true });
    expect(v.health).toBe(MAX_HEALTH);
    run(v, 30, { ...still, underwater: true });
    expect(v.fainted).toBe(true);
    expect(fainted).toBe('agua');
  });

  it('al desmayarse se pierde poco: el 10% de las bayas (hasta 1.000) y medio montón de 3 cosas, nunca herramientas', () => {
    const slots = [
      { id: 'pico', count: 1 }, { id: 'piedra', count: 40 }, null, { id: 'manzana', count: 5 },
      { id: 'rama', count: 1 }, { id: 'tablones', count: 8 }, { id: 'hacha', count: 1 },
    ];
    const loss = faintLoss(5000, slots, (id) => id === 'pico' || id === 'hacha', () => 0);
    expect(loss.berries).toBe(500);
    expect(loss.items).toHaveLength(3);
    for (const l of loss.items) {
      expect(['pico', 'hacha']).not.toContain(l.id);
      const had = slots[l.slot]!.count;
      expect(l.count).toBe(Math.max(1, Math.floor(had / 2)));
    }
    expect(faintLoss(50000, [], () => false).berries).toBe(1000);
  });

  it('el jugador sabe desde qué altura ha caído', () => {
    const world = new World(20261025, new THREE.MeshBasicMaterial());
    world.update(0, 0, 1, 99);
    const player = new Player(world, new THREE.PerspectiveCamera());
    player.spawnAt(0, 0);
    const ground = player.position.y;
    for (let i = 0; i < 10; i++) player.update(0.05, false);
    expect(player.takeFall()).toBe(0);
    player.position.y = ground + 10;
    for (let i = 0; i < 60; i++) player.update(0.05, false);
    expect(player.takeFall()).toBeGreaterThan(9);
  });
});
