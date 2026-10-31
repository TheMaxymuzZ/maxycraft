import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ENEMY_LOOKS, EnemyModel, enemyGeometry } from '../src/enemyModels';
import { BOSS_KINDS, HOSTILE_KINDS, Hostiles } from '../src/hostiles';
import { faunaEye } from '../src/landFauna';

const still = { moving: 0, ready: 0, casting: null, cast: 0, flash: false };

describe('v5.8: enemigos y jefes con todo detalle', () => {
  it('cada criatura hostil y cada jefe tiene su propia figura', () => {
    for (const k of HOSTILE_KINDS) expect(ENEMY_LOOKS[k], k).toBeDefined();
    // Ya no hay jefes que sean la misma figura con otro color: cada una tiene un número distinto de vértices.
    const counts = HOSTILE_KINDS.map((k) => enemyGeometry(k).vertices);
    expect(new Set(counts).size).toBe(HOSTILE_KINDS.length);
  });

  it('muchos detalles, pero sin pasarse; y de lejos, muchos menos', () => {
    for (const k of HOSTILE_KINDS) {
      const g = enemyGeometry(k);
      expect(g.vertices, k).toBeGreaterThan(1500);
      expect(g.vertices, k).toBeLessThan(60000);
      expect(g.far!.vertices, k).toBeLessThan(g.vertices / 3);
    }
  });

  it('pocas mallas que dibujar y la geometría compartida entre copias', () => {
    for (const k of HOSTILE_KINDS) {
      const m = new EnemyModel(k);
      let meshes = 0;
      m.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible) meshes++; });
      expect(meshes, k).toBeLessThanOrEqual(20);
    }
    const geo = (m: EnemyModel) => { const out: THREE.BufferGeometry[] = []; m.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) out.push((o as THREE.Mesh).geometry); }); return out; };
    expect(geo(new EnemyModel('golem_lava'))).toEqual(geo(new EnemyModel('golem_lava')));
  });

  it('los que andan tocan el suelo; los que vuelan están centrados', () => {
    for (const k of HOSTILE_KINDS) {
      const box = new THREE.Box3().setFromObject(new EnemyModel(k).group);
      if (k === 'murcielago' || k === 'espiritu') {
        expect(box.min.y, k).toBeLessThan(0);
        expect(box.max.y, k).toBeGreaterThan(0);
      } else expect(Math.abs(box.min.y), k).toBeLessThan(0.05);
    }
    expect(enemyGeometry('golem_lava').height).toBeGreaterThan(2.3);
    expect(enemyGeometry('esqueleto').height).toBeGreaterThan(1.7);
  });

  it('lo que brilla (ojos, grietas, gemas) va aparte y no le afecta la oscuridad', () => {
    for (const k of HOSTILE_KINDS.filter((x) => x !== 'limo')) {
      const m = new EnemyModel(k);
      let glow = 0;
      m.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.userData.noEntityLight) glow++; });
      expect(glow, k).toBeGreaterThan(0);
    }
  });

  it('prepara el golpe y lo suelta: el gólem levanta los brazos y los deja caer', () => {
    const m = new EnemyModel('golem_lava');
    const arm = m.byName.get('armR')!;
    m.animate(0.016, 0, still);
    const rest = arm.rotation.x;
    m.animate(0.016, 0.1, { ...still, ready: 1 });
    expect(arm.rotation.x).toBeLessThan(rest - 2);
    m.strike();
    for (let i = 0; i < 10; i++) m.animate(0.016, 0.2 + i * 0.016, still);
    expect(arm.rotation.x).toBeGreaterThan(rest - 1.5);
  });

  it('el esqueleto apunta con el arco y el murciélago bate las alas', () => {
    const s = new EnemyModel('esqueleto');
    s.animate(0.016, 0, { ...still, ready: 1 });
    expect(s.byName.get('armL')!.rotation.x).toBeLessThan(-1.2);
    const b = new EnemyModel('murcielago');
    const seen = new Set<number>();
    for (let i = 0; i < 20; i++) {
      b.animate(0.016, i * 0.02, still);
      seen.add(Math.round(b.wings[0].rotation.z * 10));
    }
    expect(seen.size).toBeGreaterThan(3);
  });

  it('de lejos se cambia a la figura sencilla', () => {
    const m = new EnemyModel('limo');
    faunaEye.set(0, 0, 0);
    m.animate(0.016, 0, still);
    expect(m.farNow).toBe(false);
    m.group.position.set(40, 0, 0);
    m.animate(0.016, 0, still);
    expect(m.farNow).toBe(true);
    faunaEye.set(0, 1e6, 0);
  });

  it('los jefes avisan y su figura enseña el ataque; al recibir un golpe se ponen rojos', () => {
    for (const k of BOSS_KINDS) {
      const m = new EnemyModel(k);
      m.animate(0.016, 0, { ...still, flash: true });
      expect(m.mats[0].emissive.getHex(), k).toBe(0xaa0000);
    }
    const h = new Hostiles(() => 0.3);
    h.enabled = true;
    const boss = h.spawn('golem_hielo', 0.5, 1, 0.5);
    boss.pinned = true;
    boss.angry = true;
    boss.cooldown = 0;
    const world = { solid: (_x: number, y: number) => y < 1, placeAt: () => 'cueva' as const };
    const ev = h.update(0.05, 0, new THREE.Vector3(6, 1, 0.5), 1, world);
    expect(ev.announce.length).toBe(1);
    for (let i = 0; i < 30; i++) h.update(0.05, i * 0.05, new THREE.Vector3(6, 1, 0.5), 1, world);
    expect(boss.casting).toBeNull();
  });
});
