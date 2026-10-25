import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { WorldSync, isWorldAction } from '../src/net/actions';
import { loadIdentity } from '../src/net/identity';
import { PROTOCOL, type PeerInfo, type Pose, parseMessage } from '../src/net/protocol';
import { NetSession, PEER_TIMEOUT } from '../src/net/session';
import { MemoryHub } from '../src/net/transport';
import { World } from '../src/world';

const material = new THREE.MeshBasicMaterial();
const SEED = 20261025;
const peer = (id: string): PeerInfo => ({ id, name: id, color: 0xff0000 });
const pose = (x: number): Pose => ({ x, y: 20, z: 0, yaw: 0, pitch: 0 });

/** Abre una isla con anfitrión y la cantidad de invitados pedida, todos en memoria. */
async function party(guests: number) {
  const hub = new MemoryHub();
  const hostWorld = new World(SEED, material);
  const hostSync = new WorldSync(hostWorld);
  const host = NetSession.host(hub.connect('anfitrion'), peer('anfitrion'), () => ({ seed: hostWorld.seed, edits: hostWorld.exportEdits(), options: {} }));
  host.attach(hostSync);
  const players = [];
  for (let i = 0; i < guests; i++) {
    const id = `invitado${i}`;
    const poses: [string, Pose][] = [];
    const { session, snapshot } = await NetSession.join(hub.connect(id), peer(id), { pose: (from, p) => poses.push([from, p]) });
    const world = new World(snapshot.seed, material, snapshot.edits, snapshot.options);
    const sync = new WorldSync(world);
    session.attach(sync);
    players.push({ session, world, sync, poses });
  }
  return { hub, host, hostWorld, hostSync, players };
}

describe('cambios del mundo como mensajes', () => {
  it('solo acepta cambios con forma correcta', () => {
    expect(isWorldAction({ t: 'bloque', x: 1, y: 20, z: -3, b: Block.Planks })).toBe(true);
    expect(isWorldAction({ t: 'restaurar', x: 1, y: 20, z: -3 })).toBe(true);
    expect(isWorldAction({ t: 'bloque', x: 1.5, y: 20, z: 0, b: 1 })).toBe(false);
    expect(isWorldAction({ t: 'bloque', x: 1, y: 20, z: 0, b: -1 })).toBe(false);
    expect(isWorldAction({ t: 'explotar', x: 1, y: 20, z: 0 })).toBe(false);
    expect(isWorldAction(null)).toBe(false);
  });

  it('los cambios propios avisan y los de fuera no rebotan', () => {
    const sync = new WorldSync(new World(SEED, material));
    const heard: unknown[] = [];
    sync.onAction((a) => heard.push(a));
    sync.setBlock(0, 40, 0, Block.Planks);
    sync.receive({ t: 'bloque', x: 1, y: 40, z: 0, b: Block.Planks });
    expect(heard).toEqual([{ t: 'bloque', x: 0, y: 40, z: 0, b: Block.Planks }]);
    expect(sync.getBlock(1, 40, 0)).toBe(Block.Planks);
  });

  it('descarta mensajes raros', () => {
    expect(parseMessage({ t: 'pose', id: 'a', p: { x: 'uno' } })).toBeNull();
    expect(parseMessage({ t: 'chat', id: 'a', text: 'x'.repeat(500) })).toBeNull();
    expect(parseMessage('hola')).toBeNull();
    expect(parseMessage({ t: 'hola', v: PROTOCOL, peer: peer('a') })).not.toBeNull();
  });
});

describe('partida con amigos', () => {
  it('el invitado recibe la isla del anfitrión tal como está', async () => {
    const hub = new MemoryHub();
    const hostWorld = new World(SEED, material);
    const y = hostWorld.heightAt(5, 5) + 1;
    hostWorld.setBlock(5, y, 5, Block.Planks);
    NetSession.host(hub.connect('h'), peer('h'), () => ({ seed: hostWorld.seed, edits: hostWorld.exportEdits(), options: {} }));
    const { snapshot } = await NetSession.join(hub.connect('g'), peer('g'));
    const guestWorld = new World(snapshot.seed, material, snapshot.edits, snapshot.options);
    expect(guestWorld.getBlock(5, y, 5)).toBe(Block.Planks);
  });

  it('todos terminan con la misma isla aunque construya cada uno por su lado', async () => {
    const { hostWorld, hostSync, players } = await party(2);
    const [a, b] = players;
    const top = (x: number, z: number) => hostWorld.heightAt(x, z) + 1;
    hostSync.setBlock(2, top(2, 2), 2, Block.Planks);
    a.sync.setBlock(-4, top(-4, 6), 6, Block.Stone);
    b.sync.setBlock(-4, top(-4, 6) + 1, 6, Block.Planks);
    a.sync.setBlock(2, top(2, 2), 2, Block.Air);
    const expected = JSON.stringify(hostWorld.exportEdits());
    expect(Object.keys(hostWorld.exportEdits()).length).toBeGreaterThan(0);
    for (const p of players) expect(JSON.stringify(p.world.exportEdits())).toBe(expected);
    expect(b.world.getBlock(-4, top(-4, 6), 6)).toBe(Block.Stone);
  });

  it('cada uno ve moverse a los demás', async () => {
    const { host, players } = await party(2);
    const [a, b] = players;
    a.session.update(1000, pose(7));
    host.update(1000, pose(1));
    expect(b.poses).toContainEqual(['invitado0', pose(7)]);
    expect(b.poses).toContainEqual(['anfitrion', pose(1)]);
    // Nadie recibe su propia posición.
    expect(a.poses.some(([id]) => id === 'invitado0')).toBe(false);
  });

  it('se entera de quién llega y quién se va', async () => {
    const { host, players } = await party(2);
    const [a, b] = players;
    expect([...a.session.peers.keys()].sort()).toEqual(['anfitrion', 'invitado1']);
    expect([...host.peers.keys()].sort()).toEqual(['invitado0', 'invitado1']);
    b.session.close();
    expect(host.peers.has('invitado1')).toBe(false);
    expect(a.session.peers.has('invitado1')).toBe(false);
  });

  it('quien deja de dar señales se da por ido', async () => {
    const { host } = await party(1);
    host.update(PEER_TIMEOUT + 5000, pose(0));
    expect(host.peers.size).toBe(0);
  });

  it('no deja entrar con otra versión del juego', async () => {
    const hub = new MemoryHub();
    NetSession.host(hub.connect('h'), peer('h'), () => ({ seed: SEED, edits: {}, options: {} }));
    const t = hub.connect('g');
    const answers: string[] = [];
    t.onMessage((m) => answers.push(m.t));
    t.send({ t: 'hola', v: PROTOCOL + 1, peer: peer('g') });
    expect(answers).toEqual(['rechazo']);
  });

  it('nadie puede hacerse pasar por otro jugador', async () => {
    const { hub, hostWorld } = await party(1);
    const y = hostWorld.heightAt(0, 0) + 3;
    hub.connect('intruso').send({ t: 'accion', from: 'invitado0', a: { t: 'bloque', x: 0, y, z: 0, b: Block.Planks } });
    expect(hostWorld.getBlock(0, y, 0)).toBe(Block.Air);
  });
});

describe('identidad del jugador', () => {
  it('se guarda y se recupera', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const me = loadIdentity(storage);
    expect(loadIdentity(storage)).toEqual(me);
    expect(me.name).toMatch(/^Jugador \d{4}$/);
  });
});
