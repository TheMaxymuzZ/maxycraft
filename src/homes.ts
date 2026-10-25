// Casas de los amigos (v4.3): en una partida con amigos, cada invitado tiene su propia casa en la isla del
// anfitrión. La primera vez que entra se le monta una tienda de campaña con una cama y un cartel con su nombre,
// en un sitio llano y libre. Ahí duerme y ahí despierta si se desmaya. El anfitrión la recuerda para la próxima vez.

import { Block, isSolid } from './blocks';
import { SEA_LEVEL, type World, buildTent } from './world';

export interface PlayerHome {
  /** Quién es, siempre el mismo aunque cambie de conexión (el id de su identidad guardada). */
  uid: string;
  name: string;
  /** Centro de la tienda (los pies, a ras del suelo de dentro). */
  x: number;
  y: number;
  z: number;
}

/** Como mucho, una casa por amigo que pueda haber a la vez en la isla. */
export const MAX_HOMES = 5;

/** Lo que hay que quitar para hacer sitio a la tienda: árboles y plantas. */
const CLEARABLE = new Set<number>([Block.Log, Block.PalmLog, Block.Leaves, Block.PalmLeaves, Block.PineLeaves]);

/**
 * Busca un sitio para la casa de un amigo: llano, en tierra firme, lejos de las demás casas y de lo que
 * se haya construido, y sin árboles encima (los sitios que la isla guarda para vecinos nuevos valen igual).
 */
export function pickHomeSpot(world: World, homes: PlayerHome[]): [number, number, number] | null {
  const spots = world.findGuestSpots(8);
  for (const [x, z] of spots) {
    if (homes.some((h) => Math.hypot(h.x - x, h.z - z) < 14)) continue;
    const y = world.heightAt(x, z) + 1;
    let clear = true;
    for (let dz = -3; dz <= 3 && clear; dz++) {
      for (let dx = -3; dx <= 3 && clear; dx++) {
        for (let dy = 0; dy < 6 && clear; dy++) if (CLEARABLE.has(world.getBlock(x + dx, y + dy, z + dz))) clear = false;
      }
    }
    if (clear) return [x, y, z];
  }
  // Si no queda ninguno libre de árboles, se busca alrededor del pueblo un sitio llano sin nada construido
  // (los árboles y las plantas se quitan al montar la tienda).
  for (let d = 14; d < 90; d += 3) {
    for (let a = 0; a < 24; a++) {
      const x = Math.round(Math.cos((a / 24) * Math.PI * 2 + d) * d);
      const z = Math.round(Math.sin((a / 24) * Math.PI * 2 + d) * d);
      if (spotIsFree(world, homes, x, z)) return [x, world.heightAt(x, z) + 1, z];
    }
  }
  return null;
}

function spotIsFree(world: World, homes: PlayerHome[], x: number, z: number): boolean {
  if (homes.some((h) => Math.hypot(h.x - x, h.z - z) < 14)) return false;
  if (world.plots.some((p) => Math.hypot(p.x - x, p.z - z) < 14)) return false;
  const h = world.heightAt(x, z);
  if (h <= SEA_LEVEL + 1) return false;
  for (let dz = -3; dz <= 4; dz++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (Math.abs(world.heightAt(x + dx, z + dz) - h) > 1 || world.waterKind(x + dx, z + dz)) return false;
      // Nada construido: solo aire, plantas o árboles.
      for (let dy = 1; dy <= 3; dy++) {
        const b = world.getBlock(x + dx, h + dy, z + dz);
        if (b !== Block.Air && !CLEARABLE.has(b) && isSolid(b)) return false;
      }
    }
  }
  return true;
}

/**
 * Monta la casa: aplana un poco, quita plantas y árboles, y pone la tienda de campaña, la cama y el cartel.
 * `put` y `furnish` pasan por la sincronización, para que lo vean todos los jugadores.
 */
export function buildHome(
  world: World,
  home: PlayerHome,
  put: (x: number, y: number, z: number, b: Block) => void,
  furnish: (id: string, x: number, y: number, z: number, rot: number, text?: string) => void,
) {
  const { x, y, z } = home;
  for (let dz = -3; dz <= 4; dz++) {
    for (let dx = -3; dx <= 3; dx++) {
      // Suelo firme justo debajo, y nada encima (ni hierba alta, ni flores, ni ramas de árbol).
      if (!isSolid(world.getBlock(x + dx, y - 1, z + dz))) put(x + dx, y - 1, z + dz, Block.Grass);
      for (let dy = 0; dy < 8; dy++) if (world.getBlock(x + dx, y + dy, z + dz) !== Block.Air) put(x + dx, y + dy, z + dz, Block.Air);
    }
  }
  buildTent(x, y - 1, z, put);
  furnish('cama', x, y, z, 0);
  furnish('cartel', x + 1, y, z + 3, 0, `Casa de ${home.name}`);
}

export function isPlayerHome(v: unknown): v is PlayerHome {
  if (!v || typeof v !== 'object') return false;
  const h = v as Record<string, unknown>;
  const int = (n: unknown) => Number.isInteger(n) && Math.abs(n as number) < 100_000;
  return typeof h.uid === 'string' && h.uid.length > 0 && h.uid.length <= 40 && typeof h.name === 'string' && h.name.length <= 24 && int(h.x) && int(h.y) && int(h.z);
}
