import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Block } from '../src/blocks';
import { DUNGEON_LEGENDS, KIND_THEME, ROOM_ORDER, THEMES, type DungeonPlan, type DungeonTheme, planDungeon, ruinLoot, treasure } from '../src/dungeon';
import { DungeonGame } from '../src/game/dungeon';
import { BOSS_KINDS, HOSTILES, Hostiles } from '../src/hostiles';
import { itemDef } from '../src/items';
import { LORE } from '../src/lore';
import type { World } from '../src/world';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Una isla de prueba: tierra a la altura 24 dentro de un radio de 45, mar fuera. */
const land = { heightAt: (x: number, z: number) => (Math.hypot(x, z) < 45 ? 24 : 8) };

/** Un mundo de mentira con lo que hace falta para construir y jugar una mazmorra. */
function fakeWorld() {
  const blocks = new Map<string, number>();
  return {
    blocks,
    getBlock: (x: number, y: number, z: number) => blocks.get(`${x},${y},${z}`) ?? (y < 24 ? Block.Stone : Block.Air),
    setBlock: (x: number, y: number, z: number, b: number) => void blocks.set(`${x},${y},${z}`, b),
    heightAt: land.heightAt,
  };
}

const THEME_LIST = Object.keys(THEMES) as DungeonTheme[];

/** El bloque final de cada casilla del plano. */
function finalBlocks(plan: DungeonPlan) {
  const m = new Map<string, Block>();
  for (const [x, y, z, b] of plan.blocks) m.set(`${x},${y},${z}`, b);
  return m;
}

describe('v4.25 mazmorras y ruinas', () => {
  it('cada tema se genera con sus seis salas en orden, y cambia en cada visita', () => {
    for (const theme of THEME_LIST) {
      const plan = planDungeon(theme, land, seeded(3));
      expect(plan.rooms.map((r) => r.kind)).toEqual(ROOM_ORDER);
      expect(plan.levers).toHaveLength(3);
      expect(new Set(plan.order).size).toBe(3);
      expect(plan.gates.map((g) => g.to)).toEqual(['jefe', 'tesoro']);
      expect(plan.spikes.length).toBeGreaterThan(0);
      expect(plan.plates.length).toBeGreaterThan(0);
      expect(plan.dispensers.length).toBe(plan.plates.length);
      expect(plan.crumble).toHaveLength(9);
      // Las salas no se pisan entre sí y quedan bajo tierra.
      for (const r of plan.rooms) expect(land.heightAt((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2)).toBeGreaterThan(plan.floorY + 6);
    }
    const a = planDungeon('catacumbas', land, seeded(1));
    const b = planDungeon('catacumbas', land, seeded(2));
    expect(JSON.stringify(a.rooms) + a.order.join() + a.spikes.length).not.toBe(JSON.stringify(b.rooms) + b.order.join() + b.spikes.length);
  });

  it('se puede ir andando de la escalera al tesoro: salas y pasillos huecos, con el suelo debajo', () => {
    for (const theme of THEME_LIST) {
      const plan = planDungeon(theme, land, seeded(7));
      const m = finalBlocks(plan);
      const solid = (x: number, y: number, z: number) => {
        const b = m.get(`${x},${y},${z}`);
        return b !== undefined && b !== Block.Air && b !== Block.Torch && b !== Block.Fence;
      };
      // Busca camino a ras de suelo, de la entrada al cofre (las rejas cuentan como abiertas).
      const start = plan.rooms[0];
      const [gx, , gz] = plan.chest;
      const seen = new Set<string>();
      const queue: [number, number][] = [[start.x0, start.z0]];
      let found = false;
      while (queue.length && !found) {
        const [x, z] = queue.shift()!;
        if (x === gx && z === gz) found = true;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const nz = z + dz;
          const k = `${nx},${nz}`;
          if (seen.has(k) || solid(nx, plan.floorY, nz) || solid(nx, plan.floorY + 1, nz) || !m.has(`${nx},${plan.floorY - 1},${nz}`)) continue;
          seen.add(k);
          queue.push([nx, nz]);
        }
      }
      expect(found, theme).toBe(true);
    }
  });

  it('las palancas se bajan en el orden del cartel; si no, vuelven a su sitio', () => {
    const world = fakeWorld();
    const plan = planDungeon('templo', land, seeded(5));
    const game = new DungeonGame({ world: world as unknown as World, hostiles: new Hostiles(seeded(1)) }, plan);
    const pull = (color: string) => {
      const l = plan.levers.find((l) => l.color === color)!;
      const target = new THREE.Vector3(l.x + 0.5 - l.nx * 0.42, l.y + 0.5, l.z + 0.5 - l.nz * 0.42);
      const origin = target.clone().add(new THREE.Vector3(l.nx * 2, 0, l.nz * 2));
      return game.use(new THREE.Ray(origin, target.clone().sub(origin).normalize()), 4);
    };
    const wrong = plan.order[1];
    expect(pull(wrong)).toMatchObject({ kind: 'lever', text: expect.stringContaining('vuelven') });
    game.update(1, new THREE.Vector3(0, 100, 0), false);
    for (const c of plan.order) pull(c);
    expect(game.solved).toBe(true);
    for (const [x, y, z] of plan.gates[0].cells) expect(world.getBlock(x, y, z)).toBe(Block.Air);
    for (const [x, y, z] of plan.gates[1].cells) expect(world.getBlock(x, y, z)).toBe(Block.Fence);
  });

  it('el jefe sale al entrar en su sala, y al vencerlo se abre el tesoro; en modo tranquilo está dormido', () => {
    for (const calm of [false, true]) {
      const world = fakeWorld();
      const hostiles = new Hostiles(seeded(2));
      hostiles.enabled = true;
      const plan = planDungeon('fragua', land, seeded(9));
      const game = new DungeonGame({ world: world as unknown as World, hostiles }, plan);
      game.solved = true;
      const boss = plan.rooms[4];
      const inside = new THREE.Vector3(boss.x0 + 1.5, plan.floorY, boss.z0 + 1.5);
      game.update(0.1, inside, calm);
      if (calm) {
        expect(game.bossDone).toBe(true);
        expect(hostiles.list).toHaveLength(0);
      } else {
        const h = hostiles.list.find((x) => x.kind === 'golem_magma')!;
        expect(h).toBeTruthy();
        expect(game.bossBar()?.frac).toBe(1);
        hostiles.damage(h, 999, new THREE.Vector3(1, 0, 0));
        expect(game.defeated('golem_magma')).toContain('tesoro');
      }
      for (const [x, y, z] of plan.gates[1].cells) expect(world.getBlock(x, y, z)).toBe(Block.Air);
    }
  });

  it('las trampas: los pinchos pican, las placas disparan y el suelo se hunde y vuelve', () => {
    const world = fakeWorld();
    const hostiles = new Hostiles(seeded(4));
    const plan = planDungeon('helada', land, seeded(11));
    const game = new DungeonGame({ world: world as unknown as World, hostiles }, plan);
    const [sx, sz] = plan.spikes[0];
    expect(game.update(0.1, new THREE.Vector3(sx + 0.5, plan.floorY, sz + 0.5), false).hurt).toBe(1);
    const [px, pz] = plan.plates[0];
    game.update(0.1, new THREE.Vector3(px + 0.5, plan.floorY, pz + 0.5), false);
    expect(hostiles.arrows.length).toBeGreaterThan(0);
    const [cx, cz] = plan.crumble[4];
    game.update(0.1, new THREE.Vector3(cx + 0.5, plan.floorY, cz + 0.5), false);
    game.update(1, new THREE.Vector3(cx + 0.5, plan.floorY, cz + 0.5), false);
    expect(world.getBlock(cx, plan.floorY - 1, cz)).toBe(Block.Air);
    for (let i = 0; i < 10; i++) game.update(1, new THREE.Vector3(0, 100, 0), false);
    expect(world.getBlock(cx, plan.floorY - 1, cz)).toBe(THEMES.helada.crumble);
  });

  it('el tesoro siempre trae algo legendario que aún no tienes, hasta tenerlos todos', () => {
    const r = seeded(8);
    const owned: string[] = [];
    for (let i = 0; i < DUNGEON_LEGENDS.length; i++) {
      const t = treasure(DUNGEON_LEGENDS, owned, r);
      expect(owned).not.toContain(t.legend);
      owned.push(t.legend);
      expect(t.items.length).toBeGreaterThanOrEqual(2);
    }
    expect(new Set(owned).size).toBe(DUNGEON_LEGENDS.length);
    expect(DUNGEON_LEGENDS).toContain(treasure(DUNGEON_LEGENDS, owned, r).legend);
    for (const id of [...DUNGEON_LEGENDS, ...ruinLoot(r).map((l) => l.id)]) expect(itemDef(id)).toBeTruthy();
    for (const id of ['espada_estelar', 'arco_lunar']) {
      expect(itemDef(id).rarity).toBe('legendario');
      expect(LORE[id]).toBeTruthy();
    }
  });

  it('cada tema tiene su jefe con ataques que avisan, y cada isla su tema', () => {
    expect(BOSS_KINDS).toHaveLength(4);
    for (const t of THEME_LIST) expect(BOSS_KINDS).toContain(THEMES[t].boss);
    for (const k of BOSS_KINDS) {
      expect(HOSTILES[k].boss!.attacks.length).toBeGreaterThanOrEqual(2);
      expect(HOSTILES[k].places).toHaveLength(0);
    }
    expect(new Set(Object.values(KIND_THEME)).size).toBe(4);
  });
});
