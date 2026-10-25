import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block, isSolid } from '../src/blocks';
import { type PlayerHome, buildHome, pickHomeSpot } from '../src/homes';
import { parseMessage } from '../src/net/protocol';
import { NetSession } from '../src/net/session';
import { MemoryHub } from '../src/net/transport';
import { World } from '../src/world';

const material = new THREE.MeshBasicMaterial();
const SEED = 20261025;

describe('casas de los amigos (v4.3)', () => {
  it('cada amigo tiene su sitio, llano y lejos de los demás y de las casas de la isla', () => {
    const world = new World(SEED, material);
    const homes: PlayerHome[] = [];
    for (const name of ['Ana', 'Leo', 'Sol']) {
      const spot = pickHomeSpot(world, homes)!;
      expect(spot).not.toBeNull();
      const [x, y, z] = spot;
      for (const h of homes) expect(Math.hypot(h.x - x, h.z - z)).toBeGreaterThanOrEqual(14);
      for (const p of world.plots) expect(Math.hypot(p.x - x, p.z - z)).toBeGreaterThanOrEqual(14);
      const home = { uid: name, name, x, y, z };
      const furniture: [string, string | undefined][] = [];
      buildHome(world, home, (bx, by, bz, b) => world.setBlock(bx, by, bz, b), (id, _x, _y, _z, _r, text) => furniture.push([id, text]));
      homes.push(home);
      // La tienda de campaña con su cama y su cartel, y suelo firme dentro.
      expect(world.getBlock(x + 2, y, z)).toBe(Block.Canvas);
      expect(isSolid(world.getBlock(x, y - 1, z))).toBe(true);
      expect(world.getBlock(x, y, z + 1)).toBe(Block.Air);
      expect(furniture).toEqual([['cama', undefined], ['cartel', `Casa de ${name}`]]);
    }
  });

  it('el anfitrión sabe quién es cada uno aunque cambie de conexión, y la casa llega a todos', async () => {
    const hub = new MemoryHub();
    const joined: (string | undefined)[] = [];
    const host = NetSession.host(hub.connect('anfi'), { id: 'anfi', name: 'Anfi', color: 1 }, () => ({ seed: 1, edits: {}, options: {} }), { join: (p) => joined.push(p.uid) });
    const homes: PlayerHome[] = [];
    await NetSession.join(hub.connect('conexion-1'), { id: 'conexion-1', name: 'Ana', color: 2, uid: 'ana-de-siempre' }, { home: (h) => homes.push(h) });
    expect(joined).toEqual(['ana-de-siempre']);
    host.sendHome({ uid: 'ana-de-siempre', name: 'Ana', x: 10, y: 20, z: -5 });
    expect(homes).toEqual([{ uid: 'ana-de-siempre', name: 'Ana', x: 10, y: 20, z: -5 }]);
    expect(parseMessage({ t: 'casa', home: { uid: 'x', name: 'y', x: 1.5, y: 0, z: 0 } })).toBeNull();
  });
});

describe('entrar tarde en la partida', () => {
  it('si entrar tarda mucho, el invitado no da por ido al anfitrión nada más llegar', async () => {
    const hub = new MemoryHub();
    const closed: boolean[] = [];
    NetSession.host(hub.connect('anfi'), { id: 'anfi', name: 'Anfi', color: 1 }, () => ({ seed: 1, edits: {}, options: {} }));
    const { session } = await NetSession.join(hub.connect('ana'), { id: 'ana', name: 'Ana', color: 2 }, { closed: (d) => closed.push(d) });
    // El primer fotograma llega 30 segundos después de cargar la página.
    session.update(30_000, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
    expect(session.peers.has('anfi')).toBe(true);
    expect(closed).toEqual([]);
  });
});
