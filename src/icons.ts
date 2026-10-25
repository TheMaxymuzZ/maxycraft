import { ATLAS_TILES, BLOCKS, TILE } from './blocks';
import { itemDef } from './items';

/** 2 píxeles por cada píxel de la textura, más un margen para el contorno: los menús los enseñan a 36 px, nítidos. */
const SCALE = 2;
const PAD = 2;
const SIZE = TILE * SCALE + 2 * PAD;

/**
 * Iconos de los objetos para los menús (v3.3). Los bloques se ven como un cubito en 3D, como en el inventario
 * de Minecraft; lo demás lleva un borde oscuro y una sombra suave para que destaque sobre cualquier fondo.
 */
export class Icons {
  private cache = new Map<string, string>();

  constructor(private atlas: HTMLCanvasElement) {}

  /** Imagen (data URL) del icono de un objeto. */
  item(id: string): string {
    let url = this.cache.get(id);
    if (!url) {
      const def = itemDef(id);
      const cube = def.block !== undefined && BLOCKS[def.block].shape === 'cube';
      url = (cube ? this.cube(BLOCKS[def.block!].tiles) : this.flat(def.tile)).toDataURL();
      this.cache.set(id, url);
    }
    return url;
  }

  /** Imagen de una casilla cualquiera del atlas (por ejemplo, un bicho de la enciclopedia), con borde. */
  tile(tile: number): string {
    const k = `#${tile}`;
    let url = this.cache.get(k);
    if (!url) this.cache.set(k, (url = this.flat(tile).toDataURL()));
    return url;
  }

  /** Olvida los iconos, para rehacerlos con los colores de la estación nueva. */
  reset() {
    this.cache.clear();
  }

  private canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return [c, ctx];
  }

  private source(tile: number): [number, number] {
    return [(tile % ATLAS_TILES) * TILE, Math.floor(tile / ATLAS_TILES) * TILE];
  }

  /** Icono plano, ampliado sin difuminar, con contorno oscuro de 1 píxel y una sombra abajo a la derecha. */
  private flat(tile: number): HTMLCanvasElement {
    const [sx, sy] = this.source(tile);
    // La silueta del icono en un color, para el contorno y la sombra.
    const silhouette = (color: string) => {
      const [c, ctx] = this.canvas();
      ctx.drawImage(this.atlas, sx, sy, TILE, TILE, 0, 0, SIZE, SIZE);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, SIZE, SIZE);
      return c;
    };
    const [out, ctx] = this.canvas();
    // El margen deja sitio al contorno y a la sombra.
    const inner = TILE * SCALE;
    const o = PAD;
    const shadow = silhouette('rgba(0,0,0,0.28)');
    ctx.drawImage(shadow, o + 1, o + 2, inner, inner);
    const edge = silhouette('rgba(40,28,20,0.85)');
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(edge, o + dx, o + dy, inner, inner);
    ctx.drawImage(this.atlas, sx, sy, TILE, TILE, o, o, inner, inner);
    return out;
  }

  /** Cubito en 3D: arriba la textura de arriba y delante dos lados, cada cara con su sombra. */
  private cube(tiles: readonly number[]): HTMLCanvasElement {
    const [out, ctx] = this.canvas();
    const s = SIZE;
    // Medidas del cubo dibujado en perspectiva isométrica.
    const cx = s / 2;
    const w = s * 0.42; // media anchura
    const h = w / 2; // media altura de la cara de arriba
    const top = s * 0.04;
    const side = w * 1.05; // alto de las caras de los lados
    const face = (tile: number, a: number, b: number, c: number, d: number, e: number, f: number, shade: number) => {
      const [sx, sy] = this.source(tile);
      ctx.save();
      // Matriz afín: lleva el cuadrado de la textura (0..TILE) a la cara del cubo.
      ctx.setTransform(a / TILE, b / TILE, c / TILE, d / TILE, e, f);
      ctx.drawImage(this.atlas, sx, sy, TILE, TILE, 0, 0, TILE, TILE);
      if (shade < 1) {
        ctx.fillStyle = `rgba(0,0,0,${1 - shade})`;
        ctx.fillRect(0, 0, TILE, TILE);
      }
      ctx.restore();
    };
    // Sombra suave bajo el cubo.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx + 2, top + 2 * h + side + 2, w * 0.95, h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Arriba: de (cx, top) hacia la derecha-abajo y la izquierda-abajo.
    face(tiles[1], w, h, -w, h, cx, top, 1);
    // Izquierda: empieza en la esquina izquierda de arriba.
    face(tiles[0], w, h, 0, side, cx - w, top + h, 0.78);
    // Derecha.
    face(tiles[0], w, -h, 0, side, cx, top + 2 * h, 0.6);
    // Un borde fino y claro en las aristas de arriba, como un brillo.
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - w, top + h);
    ctx.lineTo(cx, top + 2 * h);
    ctx.lineTo(cx + w, top + h);
    ctx.stroke();
    return out;
  }
}

const shared = new WeakMap<HTMLCanvasElement, Icons>();
function iconsFor(atlas: HTMLCanvasElement): Icons {
  let icons = shared.get(atlas);
  if (!icons) shared.set(atlas, (icons = new Icons(atlas)));
  return icons;
}

/** Icono de un objeto para los menús (se guarda y se reutiliza). */
export function itemIcon(atlas: HTMLCanvasElement, id: string): string {
  return iconsFor(atlas).item(id);
}

/** Icono de una casilla del atlas con borde, como los bichos y peces de la enciclopedia. */
export function tileIcon(atlas: HTMLCanvasElement, tile: number): string {
  return iconsFor(atlas).tile(tile);
}
