import { HOUSE_BLOCKS } from './blocks';
import { type ItemStack, breakInfo, itemDef, toolNameFor } from './items';
import type { Plot } from './world';

export interface BreakContext {
  getBlock(x: number, y: number, z: number): number;
  plotAt(x: number, z: number): Plot | undefined;
  /** Lo que se lleva en la mano. */
  held(): ItemStack | null;
  toast(text: string): void;
  /** Barra de progreso (0 a 1), o null para esconderla. */
  progress(p: number | null): void;
  /** Se ha roto el bloque; `usedTool` dice si hay que desgastar la herramienta. */
  broken(x: number, y: number, z: number, b: number, usedTool: boolean): void;
}

/** Romper bloques manteniendo el botón: cada bloque tarda según la herramienta que lleves. */
export class Breaker {
  /** Si se está pulsando el botón de romper. */
  active = false;
  progress = 0;
  private key = '';
  private cooldown = 0;
  private warned = '';

  constructor(private ctx: BreakContext) {}

  /** `target` es el bloque apuntado, o null si no se apunta a ninguno. */
  update(dt: number, target: [number, number, number] | null) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.active || !target || this.cooldown > 0) {
      this.reset();
      return;
    }
    const [x, y, z] = target;
    const key = `${x},${y},${z}`;
    if (key !== this.key) {
      this.key = key;
      this.progress = 0;
    }
    if (y === 0) return; // la capa del fondo no se rompe

    const b = this.ctx.getBlock(x, y, z);
    const plot = this.ctx.plotAt(x, z);
    if (HOUSE_BLOCKS.includes(b) && plot && plot.kind !== 'player') {
      this.warn(key, 'Es la casa de un vecino. Mejor no tocarla');
      return;
    }
    const stack = this.ctx.held();
    const info = breakInfo(b, stack ? itemDef(stack.id) : null);
    if (!info.allowed) {
      this.warn(key, `Necesitas ${toolNameFor(b)} para romper esto`);
      this.ctx.progress(null);
      return;
    }

    this.progress += info.seconds > 0 ? dt / info.seconds : 1;
    this.ctx.progress(info.seconds > 0.15 ? Math.min(this.progress, 1) : null);
    if (this.progress < 1) return;

    this.progress = 0;
    this.key = '';
    this.cooldown = 0.15;
    this.ctx.progress(null);
    this.ctx.broken(x, y, z, b, info.usesTool && !!stack);
  }

  private reset() {
    this.progress = 0;
    this.key = '';
    this.ctx.progress(null);
  }

  /** Avisa una sola vez por bloque, para no llenar la pantalla de mensajes. */
  private warn(key: string, text: string) {
    if (this.warned !== key) this.ctx.toast(text);
    this.warned = key;
  }
}
