// Lo que se ve dentro de la tienda (v4.16): el mostrador con la caja, las estanterías con lo que hay hoy a la
// venta, el escaparate de la estación y la casa de Avellana arriba. Al llegar al último nivel el anfitrión abre la
// puerta de la sala de muebles. Los muebles de la tienda no se guardan: se ponen al cargar. El edificio está en
// shopBuilding.ts.
import * as THREE from 'three';
import { Block } from '../blocks';
import { Furniture } from '../furniture';
import { itemIcon } from '../icons';
import type { Season } from '../seasons';
import {
  type Fixture, SHELF_SPOTS, SHOP_FIXTURES, SHOWROOM_DOOR, SHOWROOM_FIXTURES, SHOP_LEVELS, WINDOW_SPOTS, shopOrigin, windowDisplay,
} from '../shopBuilding';
import {
  HALL_FIXTURES, HALL_SHELF_SPOTS, HALL_SHOWROOM_DOOR, HALL_SHOWROOM_FIXTURES, HALL_WINDOW_SPOTS, shopHallOrigin,
} from '../shopHall';
import { BIG_HOUSE } from '../villagerHouse';
import type { World } from '../world';

/** Dónde va cada cosa: la tienda de antes (v4.16) o la nueva (v5.2). */
interface ShopLayout {
  fixtures: Fixture[];
  showroom: Fixture[];
  shelves: [number, number, number, number, number][];
  window: [number, number, number][];
  door: [number, number, number];
}
const OLD_LAYOUT: ShopLayout = { fixtures: SHOP_FIXTURES, showroom: SHOWROOM_FIXTURES, shelves: SHELF_SPOTS, window: WINDOW_SPOTS, door: SHOWROOM_DOOR };
const HALL_LAYOUT: ShopLayout = { fixtures: HALL_FIXTURES, showroom: HALL_SHOWROOM_FIXTURES, shelves: HALL_SHELF_SPOTS, window: HALL_WINDOW_SPOTS, door: HALL_SHOWROOM_DOOR };

export interface ShopFrontDeps {
  world: World;
  scene: THREE.Scene;
  atlas: HTMLCanvasElement;
  /** Luces de las lámparas de la tienda. */
  lampHook: (x: number, y: number, z: number, level: number) => void;
  /** Pone un bloque para todos los jugadores. */
  put(x: number, y: number, z: number, b: Block): void;
  /** En tu isla: el que abre la sala de muebles. */
  host: boolean;
}

/** La sala de muebles se abre con el último nivel. */
export const SHOWROOM_LEVEL = SHOP_LEVELS.length - 1;

export class ShopFront {
  readonly group = new THREE.Group();
  readonly fixtures: Furniture;
  private shelves = new THREE.Group();
  private origin: [number, number, number] | null = null;
  private textures = new Map<string, THREE.Texture>();
  private shownLevel = -1;
  private shownWindow = '';
  private layout = OLD_LAYOUT;

  constructor(private deps: ShopFrontDeps) {
    const plot = deps.world.plots.find((p) => p.kind === 'shop');
    if (plot?.style === BIG_HOUSE) this.layout = HALL_LAYOUT;
    if (plot) this.origin = plot.style === BIG_HOUSE ? shopHallOrigin(plot) : shopOrigin(plot);
    this.fixtures = new Furniture([], deps.lampHook);
    this.group.name = 'tienda';
    this.group.add(this.fixtures.group, this.shelves);
    deps.scene.add(this.group);
  }

  /** Pone todo según el nivel, la estación y lo que hay hoy a la venta. Se llama al cargar y cada día nuevo. */
  refresh(level: number, season: Season | null, holiday: string | null, stock: readonly string[]) {
    if (!this.origin) return;
    const display = windowDisplay(season, holiday);
    const key = display.join(',');
    if (level !== this.shownLevel || key !== this.shownWindow) {
      this.shownLevel = level;
      this.shownWindow = key;
      this.fixtures.clear();
      const fixtures: Fixture[] = [...this.layout.fixtures, ...(level >= SHOWROOM_LEVEL ? this.layout.showroom : [])];
      for (const [id, x, y, z, rot] of fixtures) this.place(id, x, y, z, rot);
      display.forEach((id, i) => {
        const [x, y, z] = this.layout.window[i];
        this.place(id, x, y, z, 0);
      });
    }
    this.fillShelves(stock);
    this.openShowroom(level);
  }

  private place(id: string, x: number, y: number, z: number, rot: number) {
    const [ox, oy, oz] = this.origin!;
    this.fixtures.place(id, ox + x, oy + y, oz + z, rot);
  }

  /** En cada balda, el icono de una cosa de las que se venden hoy (las primeras, que son las del día). */
  private fillShelves(stock: readonly string[]) {
    const [ox, oy, oz] = this.origin!;
    this.shelves.clear();
    const spots = this.layout.shelves;
    const daily = stock.slice(-spots.length);
    spots.forEach(([x, y, z, dx, dz], i) => {
      const id = daily[i % Math.max(1, daily.length)];
      if (!id) return;
      const sprite = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: this.texture(id), transparent: true, alphaTest: 0.5 }));
      // Dos por balda, un poco separados.
      const side = (i % 2 ? 0.2 : -0.2);
      sprite.position.set(ox + x + dz * side, oy + y, oz + z + dx * side);
      sprite.rotation.y = Math.atan2(dx, dz);
      sprite.userData.item = id;
      this.shelves.add(sprite);
    });
  }

  private texture(id: string): THREE.Texture {
    let t = this.textures.get(id);
    if (!t) {
      t = new THREE.TextureLoader().load(itemIcon(this.deps.atlas, id));
      t.magFilter = THREE.NearestFilter;
      t.colorSpace = THREE.SRGBColorSpace;
      this.textures.set(id, t);
    }
    return t;
  }

  /** El anfitrión cambia el cordón de la sala de muebles por una puerta (para todos). */
  private openShowroom(level: number) {
    if (!this.deps.host || level < SHOWROOM_LEVEL) return;
    const [ox, oy, oz] = this.origin!;
    const [x, y, z] = this.layout.door;
    if (this.deps.world.getBlock(ox + x, oy + y, oz + z) !== Block.Fence) return;
    this.deps.put(ox + x, oy + y, oz + z, Block.Door);
    this.deps.put(ox + x, oy + y + 1, oz + z, Block.DoorTop);
  }

  /** Cosas que se ven en las estanterías (para las pruebas). */
  get onShelves(): string[] {
    return this.shelves.children.map((c) => c.userData.item as string);
  }

  /** Muebles puestos (para las pruebas). */
  get fixtureCount(): number {
    return this.fixtures.count;
  }
}
