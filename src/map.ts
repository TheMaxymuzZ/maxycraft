// Mapa de la isla (v4.4): se compra en la tienda. Llevándolo en los bolsillos se ve un minimapa en una esquina
// y, con la tecla M (o tocando el minimapa), el mapa grande de toda la isla con las casas, la tienda, el museo,
// la avioneta, tus amigos y tú.

import { BLOCKS, Block, TILE, ATLAS_TILES, isWater } from './blocks';
import { SEA_LEVEL, type World } from './world';

type RGB = [number, number, number];

/** Algo que se marca en el mapa. */
export interface MapMarker {
  x: number;
  z: number;
  /** Dibujo pequeño (un emoji) y nombre que sale en el mapa grande. */
  icon: string;
  label?: string;
  /** Color del puntito (los amigos van con el color de su ropa). */
  color?: string;
}

/** Cuánto mar se ve alrededor de la isla, en proporción a su tamaño. */
const MARGIN = 1.45;
/** Bloques que se ven a cada lado del jugador en el minimapa. */
export const MINI_RADIUS = 36;

const WATER: RGB = [64, 132, 206];
const DEEP: RGB = [34, 82, 160];

/** El dibujo de la isla vista desde arriba, un píxel por bloque, como los mapas de Minecraft. */
export class IslandMap {
  readonly half: number;
  readonly size: number;
  readonly canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private colors = new Map<number, RGB>();
  /** Filas que faltan por pintar la primera vez (se pintan unas pocas en cada fotograma). */
  private nextRow = 0;
  private refreshTimer = 0;

  constructor(private world: World, private atlas: HTMLCanvasElement) {
    this.half = Math.ceil(world.islandRadius * MARGIN);
    this.size = this.half * 2;
    this.canvas.width = this.canvas.height = this.size;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.ctx.fillStyle = `rgb(${DEEP.join(',')})`;
    this.ctx.fillRect(0, 0, this.size, this.size);
  }

  /** Ya está pintado entero. */
  get ready(): boolean {
    return this.nextRow >= this.size;
  }

  /** Color medio de la cara de arriba de un bloque, sacado de su dibujo. */
  colorOf(b: number): RGB {
    let c = this.colors.get(b);
    if (c) return c;
    if (isWater(b)) c = WATER;
    else {
      const tile = BLOCKS[b]?.tiles[1] ?? 0;
      const data = this.atlas.getContext('2d')?.getImageData((tile % ATLAS_TILES) * TILE, Math.floor(tile / ATLAS_TILES) * TILE, TILE, TILE).data;
      let r = 0, g = 0, bl = 0, n = 0;
      if (data) {
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          r += data[i];
          g += data[i + 1];
          bl += data[i + 2];
          n++;
        }
      }
      c = n ? [r / n, g / n, bl / n] : [120, 120, 120];
    }
    this.colors.set(b, c);
    return c;
  }

  /** Cuando cambia la estación cambian los dibujos (nieve, hojas de otoño): hay que volver a pintar. */
  repaint() {
    this.colors.clear();
    this.nextRow = 0;
  }

  /** Pinta las filas de la `z0` a la `z1` (sin incluirla), entre `x0` y `x1`. */
  private paint(x0: number, z0: number, x1: number, z1: number) {
    const w = x1 - x0;
    const h = z1 - z0;
    if (w <= 0 || h <= 0) return;
    const img = this.ctx.createImageData(w, h);
    // La fila de encima, para el relieve: lo que sube hacia el norte se ve más claro, como en Minecraft.
    let above: number[] = [];
    for (let x = x0; x < x1; x++) above.push(this.world.mapColumn(x, z0 - 1).y);
    for (let z = z0; z < z1; z++) {
      const row: number[] = [];
      for (let x = x0; x < x1; x++) {
        const col = this.world.mapColumn(x, z);
        row.push(col.y);
        let c: RGB;
        if (isWater(col.block)) {
          // Cuanto más hondo, más oscuro; la orilla, más clara.
          const t = Math.min(1, col.depth / 7);
          c = [WATER[0] + (DEEP[0] - WATER[0]) * t, WATER[1] + (DEEP[1] - WATER[1]) * t, WATER[2] + (DEEP[2] - WATER[2]) * t];
        } else {
          const base = col.block === Block.Air ? DEEP : this.colorOf(col.block);
          const up = above[x - x0];
          const shade = col.y > up ? 1.12 : col.y < up ? 0.82 : 1;
          const height = 0.9 + Math.min(0.2, Math.max(0, (col.y - SEA_LEVEL) / 60));
          c = [base[0] * shade * height, base[1] * shade * height, base[2] * shade * height];
        }
        const i = ((z - z0) * w + (x - x0)) * 4;
        img.data[i] = Math.min(255, c[0]);
        img.data[i + 1] = Math.min(255, c[1]);
        img.data[i + 2] = Math.min(255, c[2]);
        img.data[i + 3] = 255;
      }
      above = row;
    }
    this.ctx.putImageData(img, x0 + this.half, z0 + this.half);
  }

  /**
   * Cada fotograma: la primera vez se pinta la isla entera poco a poco (unas filas cada vez), y luego
   * cada pocos segundos se repinta lo de alrededor del jugador, para que salga lo que construyes.
   */
  update(dt: number, px: number, pz: number) {
    if (!this.ready) {
      const rows = Math.min(12, this.size - this.nextRow);
      const z = this.nextRow - this.half;
      this.paint(-this.half, z, this.half, z + rows);
      this.nextRow += rows;
      return;
    }
    this.refreshTimer -= dt;
    if (this.refreshTimer > 0) return;
    this.refreshTimer = 2;
    const r = 40;
    const x0 = Math.max(-this.half, Math.floor(px) - r);
    const z0 = Math.max(-this.half, Math.floor(pz) - r);
    this.paint(x0, z0, Math.min(this.half, Math.floor(px) + r), Math.min(this.half, Math.floor(pz) + r));
  }
}

/** Flecha del jugador: hacia donde mira (yaw 0 mira al norte, -z). */
function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, yaw: number, size: number, color = '#fff') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-yaw);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.7, size * 0.75);
  ctx.lineTo(0, size * 0.35);
  ctx.lineTo(-size * 0.7, size * 0.75);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1.5, size / 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMarker(ctx: CanvasRenderingContext2D, m: MapMarker, x: number, y: number, size: number, label: boolean) {
  if (m.color) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = m.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }
  if (m.icon) {
    ctx.font = `${size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.icon, x, y);
  }
  if (label && m.label) {
    ctx.font = `700 ${Math.round(size * 0.55)}px Nunito, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.fillStyle = '#2b2a22';
    ctx.strokeText(m.label, x, y + size * 0.6);
    ctx.fillText(m.label, x, y + size * 0.6);
  }
}

/** El minimapa redondo de la esquina: la isla alrededor del jugador, con el norte siempre arriba. */
export function drawMinimap(ctx: CanvasRenderingContext2D, map: IslandMap, px: number, pz: number, yaw: number, markers: MapMarker[]) {
  const s = ctx.canvas.width;
  const scale = s / (MINI_RADIUS * 2);
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = `rgb(${DEEP.join(',')})`;
  ctx.fillRect(0, 0, s, s);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(map.canvas, px + map.half - MINI_RADIUS, pz + map.half - MINI_RADIUS, MINI_RADIUS * 2, MINI_RADIUS * 2, 0, 0, s, s);
  for (const m of markers) {
    const dx = (m.x - px) * scale;
    const dz = (m.z - pz) * scale;
    if (Math.hypot(dx, dz) > s / 2 - 8) continue;
    drawMarker(ctx, m, s / 2 + dx, s / 2 + dz, 14, false);
  }
  drawArrow(ctx, s / 2, s / 2, yaw, 8);
  ctx.restore();
  // Borde y la N del norte.
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#f6efd8';
  ctx.stroke();
  ctx.font = '700 12px Nunito, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c0392b';
  ctx.fillText('N', s / 2, 10);
}

/** El mapa grande: toda la isla, con nombres. */
export function drawFullMap(ctx: CanvasRenderingContext2D, map: IslandMap, px: number, pz: number, yaw: number, markers: MapMarker[]) {
  const s = ctx.canvas.width;
  const scale = s / map.size;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(map.canvas, 0, 0, s, s);
  const at = (x: number, z: number): [number, number] => [(x + map.half) * scale, (z + map.half) * scale];
  for (const m of markers) drawMarker(ctx, m, ...at(m.x, m.z), 22, true);
  const [ax, az] = at(px, pz);
  drawArrow(ctx, ax, az, yaw, 12, '#ffd23f');
  ctx.font = '700 16px Nunito, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#c0392b';
  ctx.fillText('N ▲', s / 2, 8);
}
