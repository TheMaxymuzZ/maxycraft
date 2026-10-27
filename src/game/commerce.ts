// Los comercios del campo y la mina en la partida (v4.17): cuando se cumple lo que pide cada uno, el anfitrión
// le hace su edificio cerca de la plaza, y en todas las islas se pone a su dueño detrás del mostrador con sus
// muebles. Dónde está cada uno se guarda con el ayuntamiento. Lo que no depende de la partida está en commerce.ts.
import type * as THREE from 'three';
import type { Block } from '../blocks';
import { type BuildWorld, findSpot, placeTemplate, rotateCell, templateSize } from '../buildings';
import { MERCHANTS, type Merchant, type UnlockContext } from '../commerce';
import { Furniture } from '../furniture';
import type { MapMarker } from '../map';
import type { Cell } from '../pathfind';
import { Villager, type VillagerMemory } from '../villagers';
import type { World } from '../world';
import type { Town } from './town';

export interface CommerceDeps {
  world: World;
  villagers: Villager[];
  scene: THREE.Scene;
  lampHook: (x: number, y: number, z: number, level: number) => void;
  /** Pone un bloque para todos los jugadores (WorldSync). */
  put(x: number, y: number, z: number, b: Block): void;
  town: Town;
  memories: Record<string, VillagerMemory>;
  /** En tu isla: el único que construye. */
  host: boolean;
  /** Lugares que no se pueden ocupar (solares, parcelas). */
  avoid?: (x: number, z: number) => boolean;
}

export interface MerchantSite {
  merchant: Merchant;
  /** Esquina del solar y altura del suelo. */
  at: Cell;
  owner: Villager;
}

export class Commerce {
  readonly sites: MerchantSite[] = [];
  private fixtures: Furniture;

  constructor(private deps: CommerceDeps) {
    this.fixtures = new Furniture([], deps.lampHook);
    deps.scene.add(this.fixtures.group);
    this.spawn();
  }

  /** Abre los comercios que ya toca (solo el anfitrión) y devuelve los nombres de los que acaban de abrir. */
  check(ctx: UnlockContext): string[] {
    const s = this.deps.town.state;
    if (!this.deps.host || !s) return [];
    const opened: string[] = [];
    for (const m of MERCHANTS) {
      if (s.shops?.[m.shop.id] || !m.unlocked(ctx)) continue;
      const at = this.findSite(m);
      if (!at) continue;
      placeTemplate(this.buildWorld(), m.building, at[0], at[1], at[2]);
      s.shops = { ...s.shops, [m.shop.id]: at };
      opened.push(m.shop.name);
    }
    if (opened.length) this.spawn();
    return opened;
  }

  /** Busca sitio cerca del ayuntamiento, sin pisar otros comercios. */
  private findSite(m: Merchant): Cell | null {
    const s = this.deps.town.state!;
    const taken = Object.values(s.shops ?? {});
    const avoid = (x: number, z: number) => !!this.deps.avoid?.(x, z)
      || (x >= s.x - 2 && x <= s.x + 12 && z >= s.z - 2 && z <= s.z + 14)
      || taken.some(([tx, , tz]) => x >= tx - 2 && x <= tx + 8 && z >= tz - 2 && z <= tz + 9);
    return findSpot(this.buildWorld(), m.building, s.x + 5, s.z + 5, 60, 0, avoid);
  }

  private buildWorld(): BuildWorld {
    const { world } = this.deps;
    return {
      getBlock: (x, y, z) => world.getBlock(x, y, z),
      setBlock: (x, y, z, b) => this.deps.put(x, y, z, b),
      heightAt: (x, z) => world.heightAt(x, z),
      isEdited: (x, y, z) => world.isEdited(x, y, z),
      plotAt: (x, z, m) => world.plotAt(x, z, m),
    };
  }

  /** Pone al dueño y los muebles de cada comercio que ya está hecho y aún no tiene a nadie. */
  spawn() {
    const shops = this.deps.town.state?.shops ?? {};
    for (const m of MERCHANTS) {
      const at = shops[m.shop.id];
      if (!at || this.sites.some((s) => s.merchant === m)) continue;
      const [ox, oy, oz] = at;
      const cell = (c: Cell): Cell => [ox + c[0], oy + c[1], oz + c[2]];
      const plot = { kind: 'shop' as const, x: ox + 3, z: oz + 3, y: oy, roof: 0 as Block, door: cell(m.counter) };
      const owner = new Villager(m.profile, plot, this.deps.world, this.deps.memories[m.profile.name] ?? { friendship: 0 });
      this.deps.villagers.push(owner);
      this.deps.scene.add(owner.group, owner.extras);
      for (const [id, x, y, z, rot] of m.fixtures) this.fixtures.place(id, ox + x, oy + y, oz + z, rot);
      this.sites.push({ merchant: m, at, owner });
    }
  }

  /** El comercio cuyo solar pisa (x, z), si hay. */
  siteAt(x: number, z: number): MerchantSite | undefined {
    return this.sites.find(({ merchant, at }) => {
      const [w, , d] = templateSize(merchant.building);
      return x >= at[0] && x < at[0] + w && z >= at[2] && z < at[2] + d;
    });
  }

  /** Para el mapa. */
  markers(): MapMarker[] {
    return this.sites.map(({ merchant, at }) => ({ x: at[0] + 3, z: at[2] + 3, icon: merchant.icon, label: merchant.shop.name, kind: 'edificios' }));
  }

  /** Para que no se meta una parcela encima. */
  obstacles(): { x: number; z: number; r: number; what: string }[] {
    return this.sites.map(({ merchant, at }) => ({ x: at[0] + 3, z: at[2] + 3, r: 5, what: merchant.shop.name.toLowerCase() }));
  }
}

/** Puerta de un comercio en el mundo (para las pruebas y el tablón). */
export function merchantDoor(m: Merchant, at: Cell): Cell {
  const [w, , d] = templateSize(m.building);
  const [rx, rz] = rotateCell(m.building.door[0], m.building.door[2], w, d, 0);
  return [at[0] + rx, at[1] + m.building.door[1], at[2] + rz];
}
