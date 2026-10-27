// El aire de cada bioma (v4.19): el color de la niebla y el tiempo que hace cambian según por dónde vas.
// En el desierto la lluvia es tormenta de arena; en el frío, nieve, y en el glaciar, ventisca. El pantano tiene bruma.
import * as THREE from 'three';
import type { Weather } from './seasons';
import type { Biome } from './world';

/** Lo que se ve caer: el tiempo de la isla, cambiado por el bioma. */
export type FxWeather = Weather | 'arena' | 'ventisca';

const DRY: ReadonlySet<Biome> = new Set(['desierto', 'cañon']);
const COLD: ReadonlySet<Biome> = new Set(['taiga', 'tundra', 'glaciar', 'picos']);
const WINDY: ReadonlySet<Biome> = new Set(['glaciar', 'picos']);

/** El tiempo que se ve en ese bioma, a partir del de la isla. */
export function biomeWeather(biome: Biome | null, w: Weather): FxWeather {
  if (!biome) return w;
  if (DRY.has(biome)) return w === 'lluvia' ? 'arena' : w === 'nieve' ? 'sol' : w;
  if (COLD.has(biome)) {
    const snow = w === 'lluvia' || w === 'nieve';
    return snow ? (WINDY.has(biome) ? 'ventisca' : 'nieve') : w;
  }
  // En la selva los días nublados acaban en chaparrón.
  if (biome === 'selva' && w === 'nubes') return 'lluvia';
  return w;
}

interface Look {
  color: number;
  /** Cuánto tiñe la niebla (0 nada, 1 del todo). */
  mix: number;
  /** Lo lejos que se ve (1 como siempre). */
  far: number;
}

const NONE: Look = { color: 0xffffff, mix: 0, far: 1 };
const LOOKS: Partial<Record<Biome, Look>> = {
  desierto: { color: 0xf0d9a2, mix: 0.3, far: 1 },
  cañon: { color: 0xe7a06a, mix: 0.25, far: 1 },
  sabana: { color: 0xf2dca0, mix: 0.18, far: 1 },
  selva: { color: 0x9fd6a6, mix: 0.25, far: 0.75 },
  pantano: { color: 0x8f9c80, mix: 0.55, far: 0.5 },
  cerezos: { color: 0xf6c8dc, mix: 0.2, far: 1 },
  taiga: { color: 0xc6d4dc, mix: 0.2, far: 0.9 },
  tundra: { color: 0xe6eef8, mix: 0.3, far: 1 },
  glaciar: { color: 0xdcecff, mix: 0.35, far: 1 },
  picos: { color: 0xe8eef6, mix: 0.25, far: 1 },
};

/** Cómo es el aire en ese bioma y con ese tiempo. */
export function biomeLook(biome: Biome | null, w: FxWeather): Look {
  if (w === 'arena') return { color: 0xd9b27a, mix: 0.75, far: 0.35 };
  if (w === 'ventisca') return { color: 0xf2f6fb, mix: 0.75, far: 0.35 };
  return (biome && LOOKS[biome]) || NONE;
}

/** La niebla del bioma, que cambia poco a poco al pasar de uno a otro. */
export class BiomeAir {
  private color = new THREE.Color(0xffffff);
  private target = new THREE.Color();
  mix = 0;
  far = 1;

  update(dt: number, look: Look) {
    const k = Math.min(1, dt * 0.8);
    this.target.setHex(look.color);
    this.color.lerp(this.target, k);
    this.mix += (look.mix - this.mix) * k;
    this.far += (look.far - this.far) * k;
  }

  /** Tiñe el color del cielo (de la niebla) con el del bioma. */
  tint(sky: THREE.Color, night: number) {
    sky.lerp(this.color, this.mix * (1 - night * 0.85));
  }
}

/** Ficha de cada bioma para la wiki («Atlas de biomas»): qué hay y qué se puede sacar de él. */
export interface BiomeInfo {
  biome: Biome;
  climate: 'templado' | 'calido' | 'frio';
  text: string;
  /** Objetos típicos (ids), para enseñar su dibujo. */
  finds: string[];
  weather: string;
}

export const BIOME_ATLAS: BiomeInfo[] = [
  { biome: 'bosque', climate: 'templado', text: 'Árboles frutales y pinos, mucha hierba alta.', finds: ['brote_pino', 'tierra'], weather: 'Sol, nubes y lluvia' },
  { biome: 'pradera', climate: 'templado', text: 'Llanura llena de flores de todos los colores.', finds: ['tierra'], weather: 'Sol, nubes y lluvia' },
  { biome: 'bambu', climate: 'templado', text: 'Bosquecillos de cañas de bambú.', finds: ['bambu'], weather: 'Sol, nubes y lluvia' },
  { biome: 'montaña', climate: 'templado', text: 'Terrazas altas de roca con nieve en la cumbre.', finds: ['piedra', 'brote_pino'], weather: 'Sol, nubes y lluvia' },
  { biome: 'pantano', climate: 'templado', text: 'Barro, charcas con nenúfares, setas y sauces llorones.', finds: ['barro', 'nenufar', 'brote_sauce'], weather: 'Bruma todo el día' },
  { biome: 'cerezos', climate: 'templado', text: 'Cerezos en flor rosa y flores por el suelo.', finds: ['flores_cerezo', 'brote_cerezo_flor'], weather: 'Aire rosado' },
  { biome: 'desierto', climate: 'calido', text: 'Dunas de arena sobre arenisca, cactus (algunos con flor), arbustos secos y alguna palmera.', finds: ['arena', 'arenisca', 'cactus'], weather: 'Cuando llueve en la isla, aquí hay tormenta de arena' },
  { biome: 'sabana', climate: 'calido', text: 'Hierba seca y acacias de copa plana.', finds: ['hojas_acacia', 'brote_acacia'], weather: 'Sol y nubes' },
  { biome: 'selva', climate: 'calido', text: 'Ceibas enormes con lianas, flores y frutales.', finds: ['brote_ceiba'], weather: 'Los días nublados, chaparrón' },
  { biome: 'cañon', climate: 'calido', text: 'Terrazas muy altas de arena roja con acantilados a rayas de terracota.', finds: ['arena_roja', 'terracota_naranja'], weather: 'Tormenta de arena cuando llueve' },
  { biome: 'taiga', climate: 'frio', text: 'Bosque de abetos nevados con musgo en el suelo.', finds: ['musgo', 'brote_abeto'], weather: 'Nieve en vez de lluvia' },
  { biome: 'tundra', climate: 'frio', text: 'Llanura nevada con flores de nieve y algún abeto suelto.', finds: ['nieve', 'flor_nieve'], weather: 'Nieve en vez de lluvia' },
  { biome: 'glaciar', climate: 'frio', text: 'Hielo compacto y vetas de hielo azul. Los ríos están helados.', finds: ['hielo_compacto', 'hielo_azul'], weather: 'Ventisca cuando nieva' },
  { biome: 'picos', climate: 'frio', text: 'Terrazas altísimas de roca, cumbres nevadas y abetos.', finds: ['piedra', 'nieve'], weather: 'Ventisca cuando nieva' },
];
