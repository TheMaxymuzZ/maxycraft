// Pantalla del mapa (v4.4, separada de main.ts en la v4.5): el minimapa redondo bajo el reloj y el mapa grande.
import type { World } from '../world';
import { IslandMap, type MapMarker, drawFullMap, drawMinimap } from '../map';

export interface MapScreenDeps {
  /** Si llevas un mapa encima. */
  hasMap(): boolean;
  /** Lo que se marca en el mapa en este momento. */
  markers(): MapMarker[];
  /** Al tocar el minimapa o el botón de cerrar. */
  onOpen(): void;
  onClose(): void;
}

export class MapScreen {
  readonly map: IslandMap;
  private readonly minimap = document.querySelector<HTMLCanvasElement>('#minimap')!;
  private readonly minimapCtx = this.minimap.getContext('2d')!;
  private readonly panel = document.querySelector<HTMLDivElement>('#map-panel')!;
  private readonly canvas = this.panel.querySelector<HTMLCanvasElement>('#map-canvas')!;
  private minimapTimer = 0;
  /** El mapa grande está abierto. */
  open = false;

  constructor(world: World, atlas: HTMLCanvasElement, private deps: MapScreenDeps) {
    this.map = new IslandMap(world, atlas);
    this.minimap.addEventListener('click', () => deps.onOpen());
    this.panel.querySelector('#map-close')!.addEventListener('click', () => deps.onClose());
  }

  show(title: string, x: number, z: number, yaw: number) {
    this.panel.querySelector('#map-title')!.textContent = title;
    drawFullMap(this.canvas.getContext('2d')!, this.map, x, z, yaw, this.deps.markers());
    this.panel.hidden = false;
    this.open = true;
  }

  hide() {
    this.panel.hidden = true;
    this.open = false;
  }

  /** Cada fotograma: el mapa se va pintando y el minimapa sigue al jugador. */
  update(dt: number, visible: boolean, x: number, z: number, yaw: number) {
    const show = visible && this.deps.hasMap();
    this.minimap.hidden = !show;
    if (!show) return;
    this.map.update(dt, x, z);
    this.minimapTimer -= dt;
    if (this.minimapTimer > 0) return;
    this.minimapTimer = 0.15;
    const markers = this.deps.markers();
    drawMinimap(this.minimapCtx, this.map, x, z, yaw, markers);
    if (this.open) drawFullMap(this.canvas.getContext('2d')!, this.map, x, z, yaw, markers);
  }
}
