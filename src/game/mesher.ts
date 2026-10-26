// Arranca el hilo que dibuja las mallas (v4.7). Si el navegador no puede (o falla), el juego dibuja como antes.
import type { MesherResult, World } from '../world';

export function startMesher(world: World, enabled = true): Worker | null {
  if (!enabled || typeof Worker === 'undefined') return null;
  let worker: Worker;
  try {
    worker = new Worker(new URL('../meshWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
  const stop = (why: unknown) => {
    console.warn('El hilo de dibujo ha fallado; se dibuja en el hilo principal.', why);
    world.detachMesher();
    worker.terminate();
  };
  worker.onmessage = (e: MessageEvent<MesherResult | { error: string }>) => {
    if ('error' in e.data) stop(e.data.error);
    else world.receiveMesh(e.data);
  };
  worker.onerror = (e) => stop(e.message);
  world.attachMesher({ post: (m) => worker.postMessage(m) });
  return worker;
}
