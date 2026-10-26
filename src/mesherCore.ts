// La copia del mundo que vive en el hilo de dibujo (v4.7), separada del hilo para poder probarla.
import * as THREE from 'three';
import { type MesherMessage, type MesherResult, World, meshBuffers } from './world';

const material = new THREE.MeshBasicMaterial();

export class MeshMirror {
  world: World | null = null;

  /** Atiende un mensaje del juego. Devuelve la malla pedida (con lo que se puede pasar sin copiar), si la hay. */
  handle(msg: MesherMessage): { result: MesherResult; transfer: ArrayBuffer[] } | null {
    switch (msg.t) {
      case 'init':
        this.world = new World(msg.seed, material, msg.edits, msg.options);
        for (const [x, y, z, level] of msg.lamps) this.world.setLamp(x, y, z, level);
        return null;
      case 'set':
        this.world?.setBlock(msg.x, msg.y, msg.z, msg.b);
        return null;
      case 'clear':
        this.world?.clearEdit(msg.x, msg.y, msg.z);
        return null;
      case 'lamp':
        this.world?.setLamp(msg.x, msg.y, msg.z, msg.level);
        return null;
      case 'guest':
        this.world?.addGuestPlot(msg.x, msg.z);
        return null;
      case 'drop':
        this.world?.dropChunk(msg.cx, msg.cz);
        return null;
      case 'mesh': {
        if (!this.world) return null;
        const data = this.world.meshData(msg.cx, msg.cz);
        const result: MesherResult = { ...data, stamp: msg.stamp };
        const transfer = meshBuffers(data);
        if (msg.blocks) {
          result.blocks = this.world.chunkBlocks(msg.cx, msg.cz);
          transfer.push(result.blocks.buffer as ArrayBuffer);
        }
        return { result, transfer };
      }
    }
  }
}
