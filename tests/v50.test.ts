import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { WorldSync } from '../src/net/actions';
import { type PeerInfo, type Snapshot } from '../src/net/protocol';
import { NetSession } from '../src/net/session';
import { MemoryHub } from '../src/net/transport';
import { CHAPTERS, Tutorial } from '../src/tutorial';
import { World } from '../src/world';

const material = new THREE.MeshBasicMaterial();
const SEED = 20261028;
const peer = (id: string): PeerInfo => ({ id, name: id, color: 0x3366ff });

function tutorialDom() {
  document.body.innerHTML = '<div id="tutorial" hidden><header><b id="tutorial-title"></b><span id="tutorial-left"></span></header><ol id="tutorial-list"></ol></div>';
}

describe('v5.0: guía del pueblo y del mar', () => {
  it('al terminar los primeros pasos sale la guía, con su regalo', () => {
    tutorialDom();
    const prizes: string[] = [];
    const t = new Tutorial([], false, false, (c) => prizes.push(`${c.title}:${c.reward}`));
    // Lo de la guía hecho antes de tiempo se apunta, pero no se termina hasta acabar los primeros pasos.
    t.complete('navegar');
    expect(document.querySelector('#tutorial-title')!.textContent).toBe('Primeros pasos');
    for (const s of CHAPTERS[0].steps) t.complete(s.id);
    expect(t.finished).toBe(true);
    expect(t.guideFinished).toBe(false);
    expect(prizes).toEqual(['Primeros pasos:1000']);
    for (const s of CHAPTERS[1].steps) t.complete(s.id);
    expect(t.guideFinished).toBe(true);
    expect(prizes).toEqual(['Primeros pasos:1000', 'Guía del pueblo y del mar:5000']);
    expect(CHAPTERS[1].steps.map((s) => s.id)).toEqual(['alcalde', 'parcela', 'astillero', 'barco', 'navegar', 'mercado', 'mazmorra']);
  });

  it('las islas que ya terminaron los primeros pasos empiezan por la guía, y quien la acabó no la vuelve a ver', () => {
    tutorialDom();
    new Tutorial(['mover'], true, false, () => {});
    expect(document.querySelector('#tutorial-title')!.textContent).toBe('Guía del pueblo y del mar');
    expect(document.querySelector<HTMLElement>('#tutorial')!.hidden).toBe(false);
    tutorialDom();
    new Tutorial([], true, false, () => {}, true);
    expect(document.querySelector<HTMLElement>('#tutorial')!.hidden).toBe(true);
  });
});

describe('v5.0: repaso del multijugador con 4 jugadores', () => {
  /** Un anfitrión con astillero, barco, ayuntamiento con comercios y parcelas, y tres amigos que entran. */
  async function fourPlayers() {
    const hub = new MemoryHub();
    const hostWorld = new World(SEED, material);
    const hostSync = new WorldSync(hostWorld);
    const snapshot = (): Snapshot => ({
      seed: hostWorld.seed, edits: hostWorld.exportEdits(), options: {},
      shipyard: { x: 40, z: -12, rotation: 1, stage: 3 },
      boat: { kind: 'velero', upgrades: { vela: 1 }, x: 52.5, z: -10.5, yaw: 1, hold: [{ id: 'tronco', count: 7 }, null] },
      town: { level: 3, x: 0, y: 30, z: 0, works: ['fuente'], shops: { agricola: [10, 30, 4], mina: [-12, 30, 6] } },
      parcels: [{ owner: 'yo', name: 'Andrés', x: 20, z: 20, size: 1, perks: ['buzon'] }, { owner: 'amigo1', name: 'Amigo 1', x: -20, z: 20, size: 0 }],
    });
    const host = NetSession.host(hub.connect('anfitrion'), peer('anfitrion'), snapshot);
    host.attach(hostSync);
    const players = [];
    for (let i = 1; i <= 3; i++) {
      const { session, snapshot: got } = await NetSession.join(hub.connect(`amigo${i}`), peer(`amigo${i}`), {});
      const world = new World(got.seed, material, got.edits, got.options);
      const sync = new WorldSync(world);
      session.attach(sync);
      players.push({ session, world, sync, got });
    }
    return { host, hostWorld, hostSync, players, snapshot };
  }

  it('los tres amigos reciben el astillero, el barco, los comercios y las parcelas del anfitrión', async () => {
    const { players, snapshot } = await fourPlayers();
    const sent = snapshot();
    for (const p of players) {
      expect(p.got.shipyard).toEqual(sent.shipyard);
      expect(p.got.boat).toEqual(sent.boat);
      expect(p.got.town).toEqual(sent.town);
      expect(p.got.parcels).toEqual(sent.parcels);
    }
  });

  it('lo que construye cada uno (calles, comercios, muelles) acaba igual en las cuatro islas', async () => {
    const { hostWorld, hostSync, players } = await fourPlayers();
    hostSync.setBlock(3, 40, 3, Block.Planks);
    players[0].sync.setBlock(4, 40, 3, Block.Crate);
    players[1].sync.setBlock(5, 40, 3, Block.Awning);
    players[2].sync.setBlock(6, 40, 3, Block.Torch);
    players[2].sync.setBlock(3, 40, 3, Block.Air);
    await new Promise((r) => setTimeout(r, 20));
    const row = (w: World) => [3, 4, 5, 6].map((x) => w.getBlock(x, 40, 3));
    for (const p of players) expect(row(p.world)).toEqual(row(hostWorld));
    expect(row(hostWorld)).toEqual([Block.Air, Block.Crate, Block.Awning, Block.Torch]);
  });
});
