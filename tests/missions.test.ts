import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { hasItem } from '../src/items';
import { ACHIEVEMENTS, Missions, PRIZES, TASKS, dailyTasks } from '../src/missions';
import { MAX_SCORE, countPlaced, rateIsland } from '../src/rating';

const SEED = 20261025;

describe('tareas del día', () => {
  it('cada día salen tres tareas distintas, siempre las mismas para ese día', () => {
    const a = dailyTasks(SEED, '2026-10-25');
    expect(a.length).toBe(3);
    expect(new Set(a.map((t) => t.id)).size).toBe(3);
    expect(dailyTasks(SEED, '2026-10-25')).toEqual(a);
    const days = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'].map((d) => dailyTasks(SEED, d).map((t) => t.id).join());
    expect(new Set([a.map((t) => t.id).join(), ...days]).size).toBeGreaterThan(1);
  });

  it('cumplir una tarea da sus puntos una sola vez', () => {
    const m = new Missions(SEED, undefined, '2026-10-25');
    const t = m.tasks[0];
    const r1 = m.record(t.event, t.goal - 1 || 0);
    expect(r1.tasks).toEqual([]);
    const r2 = m.record(t.event, 1);
    expect(r2.tasks).toEqual([t]);
    expect(m.isDone(t)).toBe(true);
    const points = m.points;
    expect(m.record(t.event, 5).tasks).toEqual([]);
    expect(m.points).toBeGreaterThanOrEqual(points); // solo pueden sumar logros
    expect(m.points).toBeGreaterThanOrEqual(t.points);
  });

  it('los logros se consiguen al llegar al total y no se repiten', () => {
    const m = new Missions(SEED, undefined, '2026-10-25');
    const first = m.record('pescar', 1).achievements.map((a) => a.id);
    expect(first).toContain('pez1');
    m.record('pescar', 48);
    expect(m.record('pescar', 1).achievements.map((a) => a.id)).toContain('pez50');
    expect(m.record('pescar', 1).achievements).toEqual([]);
  });

  it('se guarda y se carga; al cambiar de día las tareas empiezan de cero', () => {
    const m = new Missions(SEED, undefined, '2026-10-25');
    const t = m.tasks[0];
    m.record(t.event, 1);
    const saved = JSON.parse(JSON.stringify(m.serialize()));
    const same = new Missions(SEED, saved, '2026-10-25');
    expect(same.progressOf(same.tasks[0])).toBe(m.progressOf(t));
    expect(same.points).toBe(m.points);
    const next = new Missions(SEED, saved, '2026-10-26');
    for (const task of next.tasks) expect(next.progressOf(task)).toBe(0);
    expect(next.points).toBe(m.points);
    expect([...next.achievements]).toEqual([...m.achievements]);
  });

  it('los premios cuestan puntos y existen', () => {
    for (const p of PRIZES) expect(hasItem(p.id), p.id).toBe(true);
    const m = new Missions(SEED, { points: 500 }, '2026-10-25');
    expect(m.spend(600)).toBe(false);
    expect(m.spend(300)).toBe(true);
    expect(m.points).toBe(200);
  });

  it('todas las tareas y logros tienen nombres únicos', () => {
    expect(new Set(TASKS.map((t) => t.id)).size).toBe(TASKS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('valoración de la isla', () => {
  const empty = { flowers: 0, fences: 0, lights: 0, furniture: 0, house: 0, guests: 0, donated: 0, farm: 0 };

  it('una isla recién empezada tiene una estrella y un consejo', () => {
    const r = rateIsland(empty);
    expect(r.stars).toBe(1);
    expect(r.tip.length).toBeGreaterThan(5);
  });

  it('cuidando de todo se llega a cinco estrellas', () => {
    const full = { flowers: 40, fences: 40, lights: 10, furniture: 30, house: 3, guests: 3, donated: 40, farm: 20 };
    const r = rateIsland(full);
    expect(r.stars).toBe(5);
    expect(r.score).toBe(MAX_SCORE);
    // Pasarse de los topes no da más.
    expect(rateIsland({ ...full, flowers: 999 }).score).toBe(MAX_SCORE);
  });

  it('más cosas nunca bajan la nota', () => {
    let last = 0;
    for (let n = 0; n <= 40; n += 5) {
      const r = rateIsland({ ...empty, flowers: n, furniture: n, fences: n });
      expect(r.stars).toBeGreaterThanOrEqual(last);
      last = r.stars;
    }
  });

  it('cuenta flores, vallas y antorchas puestas por el jugador', () => {
    const edits = { '0,0': { 1: Block.FlowerRed, 2: Block.FlowerPink, 3: Block.Fence, 4: Block.Torch, 5: Block.Air }, '1,0': { 9: Block.WhiteFence } };
    expect(countPlaced(edits)).toEqual({ flowers: 2, fences: 2, lights: 1 });
  });
});
