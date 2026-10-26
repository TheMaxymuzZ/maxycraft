// Hilo que dibuja las mallas de los chunks (v4.7). Tiene su propia copia del mundo (mesherCore.ts): el juego le manda
// cada cambio y le pide mallas; aquí se generan los bloques, se calcula la luz y se montan las listas de vértices,
// y se mandan de vuelta sin copiarlas. Así el hilo principal no se para al caminar por islas grandes o al navegar.

import type { MesherMessage } from './world';
import { MeshMirror } from './mesherCore';

const mirror = new MeshMirror();
const post = (msg: unknown, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);

self.onmessage = (e: MessageEvent<MesherMessage>) => {
  try {
    const out = mirror.handle(e.data);
    if (out) post(out.result, out.transfer);
  } catch (err) {
    post({ error: String(err) });
  }
};
