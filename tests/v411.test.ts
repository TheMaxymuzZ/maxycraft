import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Block } from '../src/blocks';
import { parseMessage } from '../src/net/protocol';
import { pathsFor } from '../src/pathfind';
import { KNOCK_REPLIES, type Villager, createVillagers, knockReply, villagerWeather } from '../src/villagers';
import { World } from '../src/world';

const material = new THREE.MeshBasicMaterial();

/** Sigue a un vecino un día entero (de 6:00 a 6:00), con el jugador siempre a su lado. */
function followDay(v: Villager, world: World, startHour = 6) {
  const player = new THREE.Vector3();
  const log: { hour: number; jump: number; inside: boolean; sleeping: boolean; activity: string }[] = [];
  const dt = 0.1;
  const secondsPerHour = 30;
  let prev = v.position.clone();
  for (let t = 0; t < 24 * secondsPerHour; t += dt) {
    const hour = (startHour + t / secondsPerHour) % 24;
    pathsFor(world).update(4000);
    player.copy(v.position);
    v.update(dt, hour, player, 1);
    log.push({ hour, jump: v.position.distanceTo(prev), inside: v.inside, sleeping: v.sleeping, activity: v.activity });
    prev = v.position.clone();
  }
  return log;
}

describe('v4.11: un día entero con un vecino', () => {
  it('sale, pasea, vuelve, entra y duerme sin teletransportes', () => {
    const world = new World(20261025, material, {}, { terrain: 2 });
    const villagers = createVillagers(world, {});
    const v = villagers.find((x) => !x.profile.role)!;
    // Empieza dormido en casa, como al cargar la partida de noche.
    const log = followDay(v, world, 3);
    const maxJump = Math.max(...log.map((l) => l.jump));
    expect(maxJump).toBeLessThan(0.6);
    const acts = new Set(log.map((l) => l.activity));
    for (const a of ['dormir', 'casa', 'pasear', 'recado']) expect(acts, a).toContain(a);
    // Se le ve dormir en la cama y salir por la mañana.
    expect(log.some((l) => l.sleeping)).toBe(true);
    const wake = log.findIndex((l, i) => i > 0 && log[i - 1].inside && !l.inside);
    expect(wake).toBeGreaterThan(0);
    // Y por la noche vuelve a estar dentro.
    expect(log.at(-1)!.inside).toBe(true);
    // Las puertas que abre al pasar las deja cerradas y sin marcar como cambio del jugador.
    const [x, y, z] = v.home.door;
    expect(world.getBlock(x, y, z - 1)).toBe(Block.Door);
    expect(world.isEdited(x, y, z - 1)).toBe(false);
  });

  it('desde fuera no se le ve dentro de casa; desde dentro, sí', () => {
    const world = new World(20261025, material, {}, { terrain: 2 });
    const v = createVillagers(world, {}).find((x) => !x.profile.role)!;
    followDay(v, world, 20); // acaba a las 20:00, en casa
    const [x, y, z] = v.home.door;
    v.update(0.1, 2, new THREE.Vector3(x + 0.5, y, z + 6), 1);
    expect(v.inside).toBe(true);
    expect(v.group.visible).toBe(false);
    v.update(0.1, 2, new THREE.Vector3(x + 0.5, y, z - 2.5), 1);
    expect(v.group.visible).toBe(true);
  });
});

describe('v4.11: detalles de la rutina', () => {
  it('llamar de noche: contesta medio dormido según su personalidad y con su coletilla', () => {
    const world = new World(20261025, material, {}, { terrain: 2 });
    const v = createVillagers(world, {}).find((x) => !x.profile.role)!;
    const text = knockReply(v, () => 0);
    expect(text).toContain(KNOCK_REPLIES[v.profile.personality][0]);
    expect(text).toContain(v.profile.catchphrase);
  });

  it('con lluvia, los dormilones se quedan en casa', () => {
    const world = new World(20261025, material, {}, { terrain: 2 });
    const v = createVillagers(world, {}).find((x) => x.profile.personality === 'dormilón' && !x.profile.role)!;
    expect(v).toBeTruthy();
    const pasear = [11, 12, 14, 15, 16, 17].find((h) => {
      v.update(0.01, h, v.position, 1);
      return v.activity === 'pasear';
    });
    expect(pasear).toBeDefined();
    villagerWeather.rain = true;
    v.update(0.01, pasear!, v.position, 1);
    expect(v.activity).toBe('casa');
    villagerWeather.rain = false;
  });

  it('dos vecinos paseando cerca se paran a charlar', () => {
    const world = new World(20261025, material, {}, { terrain: 2 });
    const [a, b] = createVillagers(world, {}).filter((x) => !x.profile.role);
    b.position.copy(a.position).add(new THREE.Vector3(1.5, 0, 0));
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const hour = [11, 12, 14, 15, 16].find((h) => {
      a.update(0.01, h, a.position, 1);
      return a.activity === 'pasear';
    })!;
    for (let i = 0; i < 50 && !(a as unknown as { chat: unknown }).chat; i++) a.update(1, hour, a.position, 1);
    random.mockRestore();
    expect((a as unknown as { chat: { with: unknown } }).chat?.with).toBe(b);
  });

  it('el estado que manda el anfitrión dice si está en la cama', () => {
    const ok = { t: 'vecinos', s: [{ n: 'Canela', x: 1, y: 30, z: 2, f: 0.5, v: false, w: false, b: true }] };
    expect(parseMessage(ok)).toEqual(ok);
    expect(parseMessage({ t: 'vecinos', s: [{ ...ok.s[0], b: 'sí' }] })).toBeNull();
  });
});
