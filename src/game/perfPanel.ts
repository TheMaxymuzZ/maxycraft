// Panel de rendimiento (v4.7), oculto: se abre con ?rendimiento. FPS, tiempo por fotograma, chunks y memoria.
import type * as THREE from 'three';
import type { World } from '../world';

export class PerfPanel {
  private el = document.createElement('pre');
  private frames = 0;
  private time = 0;
  private worst = 0;

  constructor(private renderer: THREE.WebGLRenderer, private world: World) {
    this.el.id = 'perf-panel';
    Object.assign(this.el.style, {
      position: 'fixed', left: 'calc(8px + env(safe-area-inset-left, 0px))', bottom: 'calc(8px + env(safe-area-inset-bottom, 0px))', zIndex: '50',
      margin: '0', padding: '6px 8px', font: '12px/1.35 ui-monospace, monospace', color: '#e8ffe0',
      background: 'rgba(10, 20, 10, .72)', pointerEvents: 'none', whiteSpace: 'pre',
    });
    document.body.appendChild(this.el);
  }

  update(dt: number) {
    this.frames++;
    this.time += dt;
    this.worst = Math.max(this.worst, dt);
    if (this.time < 0.5) return;
    const fps = this.frames / this.time;
    const info = this.renderer.info.render;
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    this.el.textContent = [
      `FPS ${fps.toFixed(0)} · peor ${(this.worst * 1000).toFixed(0)} ms`,
      `chunks ${this.world.meshedChunks} dibujados / ${this.world.loadedChunks} en memoria`,
      `hilo de dibujo ${this.world.usesMesher ? 'sí' : 'no'}`,
      `llamadas ${info.calls} · triángulos ${(info.triangles / 1000).toFixed(0)} mil`,
      mem ? `memoria ${(mem.usedJSHeapSize / 1048576).toFixed(0)} MB` : '',
    ].filter(Boolean).join('\n');
    this.frames = 0;
    this.time = 0;
    this.worst = 0;
  }
}
