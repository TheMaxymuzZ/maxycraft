// Pantalla del mapa (v4.4, separada de main.ts en la v4.5): el minimapa redondo bajo el reloj y el mapa grande.
import type { World } from '../world';
import { IslandMap, MARKER_KINDS, type MapMarker, type MapView, type MarkerKind, clampView, drawFullMap, drawMinimap, maxZoom, screenToWorld } from '../map';

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
  /** Qué parte se ve del mapa grande (v4.10). */
  view: MapView = { cx: 0, cz: 0, zoom: 1 };
  /** Tipos de lugar ocultos en la leyenda. */
  readonly hidden = new Set<MarkerKind>();
  /** Dónde está el jugador, para "centrar en mí" y para volver a dibujar. */
  private me = { x: 0, z: 0, yaw: 0 };
  /** Dedos o ratón apretados sobre el mapa: para arrastrar y pellizcar. */
  private pointers = new Map<number, { x: number; y: number }>();

  constructor(world: World, atlas: HTMLCanvasElement, private deps: MapScreenDeps) {
    this.map = new IslandMap(world, atlas);
    this.minimap.addEventListener('click', () => deps.onOpen());
    this.panel.querySelector('#map-close')!.addEventListener('click', () => deps.onClose());
    this.panel.querySelector('#map-in')?.addEventListener('click', () => this.zoomBy(1.6));
    this.panel.querySelector('#map-out')?.addEventListener('click', () => this.zoomBy(1 / 1.6));
    this.panel.querySelector('#map-me')?.addEventListener('click', () => this.centerOnMe());
    this.buildLegend();
    const c = this.canvas;
    c.style.touchAction = 'none';
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [sx, sy] = this.toCanvas(e.clientX, e.clientY);
      this.zoomBy(Math.exp(-e.deltaY * 0.0015), sx, sy);
    }, { passive: false });
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    });
    c.addEventListener('pointermove', (e) => this.drag(e));
    for (const ev of ['pointerup', 'pointercancel'] as const) c.addEventListener(ev, (e) => this.pointers.delete(e.pointerId));
  }

  private buildLegend() {
    const el = this.panel.querySelector<HTMLDivElement>('#map-legend');
    if (!el) return;
    for (const [kind, label] of Object.entries(MARKER_KINDS) as [MarkerKind, string][]) {
      const l = document.createElement('label');
      l.innerHTML = `<input type="checkbox" checked> ${label}`;
      l.querySelector('input')!.addEventListener('change', (e) => {
        if ((e.target as HTMLInputElement).checked) this.hidden.delete(kind);
        else this.hidden.add(kind);
        this.redraw();
      });
      el.appendChild(l);
    }
  }

  /** De la posición en la pantalla a píxeles del lienzo (que se ve más pequeño o más grande de lo que es). */
  private toCanvas(clientX: number, clientY: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    const k = this.canvas.width / (r.width || this.canvas.width);
    return [(clientX - r.left) * k, (clientY - r.top) * k];
  }

  /** Acerca o aleja manteniendo quieto el punto (sx, sy) del lienzo (por defecto, el centro). */
  zoomBy(factor: number, sx = this.canvas.width / 2, sy = this.canvas.height / 2) {
    const size = this.canvas.width;
    const [wx, wz] = screenToWorld(this.view, this.map, size, sx, sy);
    const zoom = Math.min(maxZoom(this.map, size), Math.max(1, this.view.zoom * factor));
    const scale = (size / this.map.size) * zoom;
    this.view = clampView({ zoom, cx: wx - (sx - size / 2) / scale, cz: wz - (sy - size / 2) / scale }, this.map, size);
    this.redraw();
  }

  centerOnMe() {
    this.view = clampView({ ...this.view, cx: this.me.x, cz: this.me.z, zoom: Math.max(this.view.zoom, 2.5) }, this.map, this.canvas.width);
    this.redraw();
  }

  private drag(e: PointerEvent) {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const size = this.canvas.width;
    if (this.pointers.size >= 2) {
      // Pellizco: la distancia entre los dos dedos cambia el zoom.
      const [a, b] = [...this.pointers.entries()];
      const other = a[0] === e.pointerId ? b[1] : a[1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (before > 10) {
        const [sx, sy] = this.toCanvas((e.clientX + other.x) / 2, (e.clientY + other.y) / 2);
        this.zoomBy(after / before, sx, sy);
      }
      return;
    }
    const [x0, y0] = this.toCanvas(prev.x, prev.y);
    const [x1, y1] = this.toCanvas(e.clientX, e.clientY);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const scale = (size / this.map.size) * this.view.zoom;
    this.view = clampView({ ...this.view, cx: this.view.cx - (x1 - x0) / scale, cz: this.view.cz - (y1 - y0) / scale }, this.map, size);
    this.redraw();
  }

  private redraw() {
    if (!this.open) return;
    drawFullMap(this.canvas.getContext('2d')!, this.map, this.me.x, this.me.z, this.me.yaw, this.deps.markers(), this.view, this.hidden);
  }

  show(title: string, x: number, z: number, yaw: number) {
    this.panel.querySelector('#map-title')!.textContent = title;
    this.me = { x, z, yaw };
    this.view = { cx: 0, cz: 0, zoom: 1 };
    this.panel.hidden = false;
    this.open = true;
    this.redraw();
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
    this.me = { x, z, yaw };
    if (this.open) drawFullMap(this.canvas.getContext('2d')!, this.map, x, z, yaw, markers, this.view, this.hidden);
  }
}
