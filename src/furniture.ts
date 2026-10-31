import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ATLAS_TILES, FURNITURE_TILE_START, TILE } from './blocks';
import { type LitHook, litBatchMaterial, syncBatch } from './entityLight';

// Muebles hechos con cajas, como los de Minecraft. Ocupan una casilla y miran hacia +z.

export interface FurnitureDef {
  id: string;
  name: string;
  sell: number;
  /** Si no tiene precio de compra, solo se consigue fabricándolo. */
  buy?: number;
  /**
   * Las piezas: [ancho, alto, fondo, color, x, y, z] con (x, z) en el centro y y en la base. Una octava cifra
   * (v5.2) hace la pieza transparente con esa opacidad: el cristal y el agua de las peceras y las vitrinas.
   */
  parts: Part[];
  /** Si brilla de noche (las lámparas). */
  glow?: number;
  /** Solo se vende en esa fiesta. */
  holiday?: 'halloween' | 'navidad';
  /** Luz que da (nivel de 1 a 15) y a qué altura sobre su casilla está la bombilla. */
  light?: number;
  lightHeight?: number;
  /** Cuántos caben en una casilla de los bolsillos (1 si no se dice). */
  stack?: number;
  /** Solo lo vende ese comercio (v4.17). */
  seller?: string;
  /** Altura del asiento si es para sentarse (v5.2): sillas, sofás, bancos… */
  seat?: number;
}

export type Part = [number, number, number, number, number, number, number, number?];

const WOOD = 0xb9824f;
const DARK = 0x7a5233;
// Museo y edificios (v5.2).
const FRAME = 0x3a4148;
const BRASS = 0xc9a24a;
const MARBLE = 0xeceae2;
const MARBLE_DARK = 0xc8c4b8;

/** Cuatro postes finos en las esquinas (el marco de una pecera o una vitrina). */
function POSTS(w: number, h: number, color: number, at = 0.47, y = 0.06): Part[] {
  return [[-at, -at], [at, -at], [-at, at], [at, at]].map(([x, z]): Part => [w, h, w, color, x, y, z]);
}

export const FURNITURE: FurnitureDef[] = [
  {
    id: 'cama', name: 'Cama', sell: 300, buy: 1200,
    parts: [
      [0.9, 0.3, 0.96, WOOD, 0, 0, 0],
      [0.84, 0.14, 0.9, 0xf4f1e8, 0, 0.3, 0],
      [0.86, 0.06, 0.6, 0x5a8fd6, 0, 0.42, 0.16],
      [0.5, 0.12, 0.22, 0xffffff, 0, 0.44, -0.3],
      [0.9, 0.62, 0.08, DARK, 0, 0, -0.46],
    ],
  },
  {
    id: 'mesa', name: 'Mesa', sell: 200, buy: 800,
    parts: [
      [0.96, 0.08, 0.96, WOOD, 0, 0.72, 0],
      [0.1, 0.72, 0.1, DARK, -0.38, 0, -0.38],
      [0.1, 0.72, 0.1, DARK, 0.38, 0, -0.38],
      [0.1, 0.72, 0.1, DARK, -0.38, 0, 0.38],
      [0.1, 0.72, 0.1, DARK, 0.38, 0, 0.38],
    ],
  },
  {
    id: 'silla', name: 'Silla', sell: 100, buy: 400, seat: 0.5,
    parts: [
      [0.6, 0.08, 0.6, WOOD, 0, 0.42, 0.04],
      [0.6, 0.5, 0.08, WOOD, 0, 0.5, -0.24],
      [0.08, 0.42, 0.08, DARK, -0.24, 0, -0.22],
      [0.08, 0.42, 0.08, DARK, 0.24, 0, -0.22],
      [0.08, 0.42, 0.08, DARK, -0.24, 0, 0.3],
      [0.08, 0.42, 0.08, DARK, 0.24, 0, 0.3],
    ],
  },
  {
    id: 'lampara', name: 'Lámpara', sell: 250, buy: 1000, glow: 0xffd98a, light: 12, lightHeight: 1,
    parts: [
      [0.4, 0.06, 0.4, 0x50504a, 0, 0, 0],
      [0.08, 0.7, 0.08, 0x50504a, 0, 0.06, 0],
      [0.46, 0.32, 0.46, 0xfff0c4, 0, 0.66, 0],
    ],
  },
  {
    id: 'estanteria', name: 'Estantería', sell: 300, buy: 1200,
    parts: [
      [0.96, 0.98, 0.4, DARK, 0, 0, -0.28],
      [0.86, 0.04, 0.36, WOOD, 0, 0.32, -0.24],
      [0.86, 0.04, 0.36, WOOD, 0, 0.64, -0.24],
      [0.12, 0.24, 0.26, 0xc0392b, -0.3, 0.06, -0.2],
      [0.1, 0.22, 0.26, 0x2e86c1, -0.17, 0.06, -0.2],
      [0.14, 0.25, 0.26, 0x27ae60, 0.2, 0.06, -0.2],
      [0.1, 0.24, 0.26, 0xf1c40f, -0.05, 0.36, -0.2],
      [0.14, 0.22, 0.26, 0x8e44ad, 0.25, 0.36, -0.2],
      [0.12, 0.25, 0.26, 0xe67e22, 0.05, 0.68, -0.2],
    ],
  },
  {
    id: 'sofa', name: 'Sofá', sell: 400, buy: 1600, seat: 0.42,
    parts: [
      [0.96, 0.4, 0.8, 0xc8553d, 0, 0, 0.06],
      [0.96, 0.4, 0.2, 0xb04632, 0, 0.4, -0.24],
      [0.14, 0.24, 0.8, 0xb04632, -0.41, 0.4, 0.06],
      [0.14, 0.24, 0.8, 0xb04632, 0.41, 0.4, 0.06],
    ],
  },
  {
    id: 'planta', name: 'Planta', sell: 150, buy: 600,
    parts: [
      [0.4, 0.36, 0.4, 0xc0703f, 0, 0, 0],
      [0.34, 0.04, 0.34, 0x5b3f26, 0, 0.36, 0],
      [0.5, 0.3, 0.5, 0x4f9a3a, 0, 0.42, 0],
      [0.3, 0.26, 0.3, 0x67b54a, 0, 0.72, 0],
    ],
  },
  {
    id: 'alfombra', name: 'Alfombra', sell: 150, buy: 500,
    parts: [
      [0.98, 0.04, 0.98, 0x3f7f9f, 0, 0, 0],
      [0.7, 0.045, 0.7, 0xe8d8a8, 0, 0, 0],
      [0.4, 0.05, 0.4, 0xc8553d, 0, 0, 0],
    ],
  },
  // Solo se fabrican en la mesa de trabajo.
  {
    id: 'barril', name: 'Barril', sell: 240,
    parts: [
      [0.7, 0.86, 0.7, 0x9a6a3c, 0, 0, 0],
      [0.74, 0.08, 0.74, 0x5d5d5d, 0, 0.14, 0],
      [0.74, 0.08, 0.74, 0x5d5d5d, 0, 0.64, 0],
      [0.6, 0.02, 0.6, 0x7a5233, 0, 0.86, 0],
    ],
  },
  {
    id: 'farol', name: 'Farol', sell: 450, glow: 0xffc864, light: 13,
    parts: [
      [0.36, 0.06, 0.36, 0x3a3a3a, 0, 0, 0],
      [0.06, 0.06, 0.06, 0x3a3a3a, 0, 0.42, 0],
      [0.36, 0.06, 0.36, 0x3a3a3a, 0, 0.4, 0],
      [0.28, 0.34, 0.28, 0xffe9a8, 0, 0.06, 0],
    ],
  },
  {
    id: 'banco', name: 'Banco', sell: 180, seat: 0.48,
    parts: [
      [0.96, 0.08, 0.4, WOOD, 0, 0.4, 0.1],
      [0.96, 0.3, 0.08, WOOD, 0, 0.56, -0.12],
      [0.08, 0.4, 0.36, DARK, -0.4, 0, 0.1],
      [0.08, 0.4, 0.36, DARK, 0.4, 0, 0.1],
    ],
  },
  // De temporada: la tienda solo los vende en su fiesta.
  {
    id: 'calabaza', name: 'Calabaza de Halloween', sell: 300, buy: 1000, glow: 0xffa030, holiday: 'halloween', light: 9,
    parts: [
      [0.06, 0.12, 0.06, 0x5b7a2e, 0, 0.62, 0],
      [0.7, 0.62, 0.6, 0xe07b24, 0, 0, 0],
      [0.32, 0.22, 0.04, 0x3a2008, 0, 0.22, 0.31], // la cara, que brilla de noche
    ],
  },
  {
    id: 'arbol_navidad', name: 'Árbol de Navidad', sell: 500, buy: 2000, glow: 0xfff0a0, holiday: 'navidad', light: 10, lightHeight: 1,
    parts: [
      [0.18, 0.2, 0.18, 0x6b4a2b, 0, 0, 0],
      [0.9, 0.3, 0.9, 0x2f7d46, 0, 0.2, 0],
      [0.66, 0.3, 0.66, 0x2f7d46, 0, 0.5, 0],
      [0.42, 0.3, 0.42, 0x2f7d46, 0, 0.8, 0],
      [0.08, 0.08, 0.08, 0xe8505b, 0.3, 0.42, 0.42],
      [0.08, 0.08, 0.08, 0x4f8fe0, -0.25, 0.7, 0.3],
      [0.08, 0.08, 0.08, 0xe8505b, 0.12, 0.98, 0.2],
      [0.16, 0.16, 0.16, 0xffd84a, 0, 1.1, 0],
    ],
  },
  // Premios de las tareas del día (v1.10): no se compran ni se fabrican.
  {
    id: 'trofeo', name: 'Trofeo de oro', sell: 1000,
    parts: [
      [0.5, 0.12, 0.5, 0x6a4a2a, 0, 0, 0],
      [0.36, 0.14, 0.36, 0x6a4a2a, 0, 0.12, 0],
      [0.1, 0.24, 0.1, 0xe8b830, 0, 0.26, 0],
      [0.44, 0.34, 0.44, 0xf2c94c, 0, 0.5, 0],
      [0.08, 0.2, 0.08, 0xe8b830, -0.28, 0.6, 0],
      [0.08, 0.2, 0.08, 0xe8b830, 0.28, 0.6, 0],
    ],
  },
  {
    id: 'fuente', name: 'Fuente', sell: 800,
    parts: [
      [0.96, 0.3, 0.96, 0xb8b8b0, 0, 0, 0],
      [0.8, 0.06, 0.8, 0x4aa6d8, 0, 0.3, 0],
      [0.16, 0.5, 0.16, 0xa8a8a0, 0, 0.3, 0],
      [0.4, 0.08, 0.4, 0xb8b8b0, 0, 0.72, 0],
      [0.24, 0.16, 0.24, 0x8fd0f0, 0, 0.8, 0],
    ],
  },
  // Calles y decoración (v2.8).
  {
    id: 'farola', name: 'Farola', sell: 300, glow: 0xffe08a, light: 15, lightHeight: 2, stack: 10,
    parts: [
      [0.36, 0.14, 0.36, 0x3a3f44, 0, 0, 0],
      [0.12, 2.0, 0.12, 0x3a3f44, 0, 0.14, 0],
      [0.42, 0.08, 0.42, 0x3a3f44, 0, 2.5, 0],
      [0.3, 0.36, 0.3, 0xfff2c0, 0, 2.14, 0],
    ],
  },
  {
    id: 'papelera', name: 'Papelera', sell: 80, stack: 10,
    parts: [
      [0.4, 0.56, 0.4, 0x3f8f5a, 0, 0, 0],
      [0.46, 0.06, 0.46, 0x2f6f44, 0, 0.56, 0],
      [0.3, 0.02, 0.3, 0x24302a, 0, 0.62, 0],
    ],
  },
  {
    id: 'cartel', name: 'Cartel', sell: 60, stack: 10,
    parts: [
      [0.1, 0.7, 0.1, DARK, 0, 0, 0],
      [0.86, 0.5, 0.08, WOOD, 0, 0.62, 0],
    ],
  },
  {
    id: 'macetero', name: 'Macetero', sell: 150, stack: 10,
    parts: [
      [0.9, 0.36, 0.9, 0xb0603e, 0, 0, 0],
      [0.8, 0.04, 0.8, 0x6a4a32, 0, 0.36, 0],
      [0.14, 0.24, 0.14, 0xe8505b, -0.22, 0.4, -0.2],
      [0.14, 0.2, 0.14, 0xf2c94c, 0.2, 0.4, 0.18],
      [0.14, 0.28, 0.14, 0xf4f1e8, 0.18, 0.4, -0.22],
      [0.14, 0.22, 0.14, 0x9a6bd6, -0.18, 0.4, 0.22],
      [0.5, 0.1, 0.5, 0x5fae4a, 0, 0.4, 0],
    ],
  },
  {
    id: 'fuente_plaza', name: 'Fuente de la plaza', sell: 900,
    parts: [
      [1, 0.36, 1, 0xc8c8c0, 0, 0, 0],
      [0.84, 0.06, 0.84, 0x4aa6d8, 0, 0.32, 0],
      [0.2, 0.7, 0.2, 0xb8b8b0, 0, 0.36, 0],
      [0.52, 0.1, 0.52, 0xc8c8c0, 0, 0.9, 0],
      [0.42, 0.04, 0.42, 0x6ac0e8, 0, 0.98, 0],
      [0.1, 0.3, 0.1, 0xa8dcf6, 0, 1.0, 0],
      [0.16, 0.08, 0.16, 0xe8f6ff, 0, 1.3, 0],
    ],
  },
  {
    id: 'buzon', name: 'Buzón', sell: 120, stack: 10,
    parts: [
      [0.1, 0.8, 0.1, DARK, 0, 0, 0],
      [0.36, 0.3, 0.5, 0x2f6fb0, 0, 0.8, 0],
      [0.38, 0.12, 0.52, 0x2a5f98, 0, 1.06, 0],
      [0.04, 0.24, 0.1, 0xe8505b, 0.2, 0.9, -0.12],
    ],
  },
  // Tienda y terminal (v4.16): no se venden; los usan Avellana y Plumas, pero si te regalan uno es tuyo.
  {
    id: 'mostrador', name: 'Mostrador', sell: 400,
    parts: [
      [1, 0.9, 0.7, WOOD, 0, 0, 0.1],
      [1, 0.08, 0.8, DARK, 0, 0.9, 0.08],
      [0.9, 0.5, 0.04, 0xd8c19a, 0, 0.2, 0.46],
    ],
  },
  {
    id: 'caja_registradora', name: 'Caja registradora', sell: 600,
    parts: [
      [1, 0.9, 0.7, WOOD, 0, 0, 0.1],
      [1, 0.08, 0.8, DARK, 0, 0.9, 0.08],
      [0.5, 0.26, 0.4, 0x5f6670, 0, 0.98, -0.04],
      [0.44, 0.08, 0.2, 0x3a3f46, 0, 1.24, -0.12],
      [0.3, 0.06, 0.12, 0xf2c230, 0, 1.0, 0.18],
    ],
  },
  {
    id: 'bascula', name: 'Báscula de equipaje', sell: 350,
    parts: [
      [0.8, 0.12, 0.8, 0x6a6e76, 0, 0, 0],
      [0.1, 0.9, 0.1, 0x6a6e76, 0, 0.12, -0.34],
      [0.36, 0.3, 0.08, 0xf4f1e8, 0, 0.86, -0.34],
      [0.04, 0.14, 0.02, 0xd04030, 0.04, 0.94, -0.29],
    ],
  },
  {
    id: 'panel_salidas', name: 'Panel de salidas', sell: 500, glow: 0xffb030,
    parts: [
      [0.1, 1.2, 0.1, 0x3a3a3a, -0.4, 0, 0],
      [0.1, 1.2, 0.1, 0x3a3a3a, 0.4, 0, 0],
      [1, 0.7, 0.12, 0x22262c, 0, 1.2, 0],
      [0.84, 0.08, 0.02, 0xffb030, 0, 1.6, 0.07],
      [0.6, 0.08, 0.02, 0xffb030, -0.1, 1.44, 0.07],
      [0.74, 0.08, 0.02, 0xffb030, -0.04, 1.28, 0.07],
    ],
  },
  // Oficios del campo y la mina (v4.17).
  {
    id: 'espantapajaros', name: 'Espantapájaros', sell: 250, buy: 900, seller: 'agricola',
    parts: [
      [0.1, 1.5, 0.1, DARK, 0, 0, 0],
      [0.9, 0.08, 0.08, DARK, 0, 1.0, 0],
      [0.5, 0.5, 0.26, 0x3f7fbf, 0, 0.82, 0],
      [0.34, 0.34, 0.3, 0xe8d090, 0, 1.32, 0],
      [0.5, 0.06, 0.5, 0xc89a40, 0, 1.64, 0],
      [0.3, 0.16, 0.3, 0xc89a40, 0, 1.7, 0],
      [0.06, 0.06, 0.02, 0x2a2a2a, -0.08, 1.46, 0.16],
      [0.06, 0.06, 0.02, 0x2a2a2a, 0.08, 1.46, 0.16],
      [0.14, 0.12, 0.2, 0xe8d090, -0.5, 0.94, 0],
      [0.14, 0.12, 0.2, 0xe8d090, 0.5, 0.94, 0],
    ],
  },
  {
    id: 'vagoneta', name: 'Vagoneta', sell: 400,
    parts: [
      [0.8, 0.08, 0.9, 0x5a5e66, 0, 0.16, 0],
      [0.08, 0.4, 0.9, 0x6a6e76, -0.36, 0.24, 0],
      [0.08, 0.4, 0.9, 0x6a6e76, 0.36, 0.24, 0],
      [0.64, 0.4, 0.08, 0x6a6e76, 0, 0.24, -0.41],
      [0.64, 0.4, 0.08, 0x6a6e76, 0, 0.24, 0.41],
      [0.6, 0.2, 0.7, 0x2a2a2e, 0, 0.42, 0],
      [0.2, 0.16, 0.2, 0xb0b4bc, -0.1, 0.56, 0.1],
      [0.1, 0.16, 0.16, 0x1e1e1e, -0.42, 0, -0.26],
      [0.1, 0.16, 0.16, 0x1e1e1e, 0.42, 0, -0.26],
      [0.1, 0.16, 0.16, 0x1e1e1e, -0.42, 0, 0.26],
      [0.1, 0.16, 0.16, 0x1e1e1e, 0.42, 0, 0.26],
    ],
  },
  {
    id: 'railes', name: 'Raíles', sell: 60, stack: 30,
    parts: [
      [0.9, 0.04, 0.14, DARK, 0, 0, -0.36],
      [0.9, 0.04, 0.14, DARK, 0, 0, 0],
      [0.9, 0.04, 0.14, DARK, 0, 0, 0.36],
      [0.06, 0.06, 1, 0x8a8e96, -0.3, 0.04, 0],
      [0.06, 0.06, 1, 0x8a8e96, 0.3, 0.04, 0],
    ],
  },
  // Moda, muebles y cosméticos (v4.18): la nave de muebles de Serrín (seller 'muebles') y el taller de Baldosa
  // ('urbano'). El armario y el espejo abren el armario para cambiarse de ropa.
  {
    id: 'armario', name: 'Armario', sell: 500, buy: 2000, seller: 'muebles',
    parts: [
      [0.94, 1.9, 0.56, WOOD, 0, 0, -0.2],
      [0.42, 1.7, 0.04, DARK, -0.22, 0.1, 0.09],
      [0.42, 1.7, 0.04, DARK, 0.22, 0.1, 0.09],
      [0.04, 0.2, 0.04, 0xe0c060, -0.04, 0.95, 0.12],
      [0.04, 0.2, 0.04, 0xe0c060, 0.04, 0.95, 0.12],
      [0.98, 0.08, 0.6, DARK, 0, 1.9, -0.2],
    ],
  },
  {
    id: 'espejo', name: 'Espejo de pie', sell: 400, buy: 1600, seller: 'muebles',
    parts: [
      [0.5, 0.06, 0.3, DARK, 0, 0, 0],
      [0.06, 0.4, 0.06, DARK, 0, 0.06, 0],
      [0.6, 1.3, 0.08, 0xc8a050, 0, 0.42, 0],
      [0.5, 1.18, 0.02, 0xcfe6f2, 0, 0.48, 0.05],
      [0.18, 0.5, 0.02, 0xf4fbff, -0.1, 0.7, 0.06],
    ],
  },
  {
    id: 'tumbona', name: 'Tumbona', sell: 300, buy: 1200, seller: 'muebles', seat: 0.36,
    parts: [
      [0.06, 0.24, 0.06, 0xf4f0e6, -0.3, 0, -0.4], [0.06, 0.24, 0.06, 0xf4f0e6, 0.3, 0, -0.4],
      [0.06, 0.24, 0.06, 0xf4f0e6, -0.3, 0, 0.4], [0.06, 0.24, 0.06, 0xf4f0e6, 0.3, 0, 0.4],
      [0.66, 0.06, 0.96, 0xf4f0e6, 0, 0.24, 0.02],
      [0.6, 0.06, 0.6, 0x3fa0d0, 0, 0.3, 0.16],
      [0.6, 0.5, 0.06, 0x3fa0d0, 0, 0.3, -0.42],
    ],
  },
  {
    id: 'sombrilla', name: 'Sombrilla', sell: 250, buy: 1000, seller: 'muebles',
    parts: [
      [0.3, 0.08, 0.3, 0xc8c0a8, 0, 0, 0],
      [0.06, 1.9, 0.06, 0xf4f0e6, 0, 0.08, 0],
      [1.4, 0.1, 1.4, 0xe84a4a, 0, 1.86, 0],
      [1.0, 0.1, 1.0, 0xf4f0e6, 0, 1.96, 0],
      [0.5, 0.1, 0.5, 0xe84a4a, 0, 2.06, 0],
    ],
  },
  {
    id: 'sillon_moderno', name: 'Sillón moderno', sell: 400, buy: 1600, seller: 'muebles', seat: 0.44,
    parts: [
      [0.84, 0.3, 0.8, 0x50a0a0, 0, 0.1, 0.04],
      [0.84, 0.5, 0.16, 0x50a0a0, 0, 0.3, -0.34],
      [0.14, 0.36, 0.8, 0x3a8080, -0.42, 0.1, 0.04],
      [0.14, 0.36, 0.8, 0x3a8080, 0.42, 0.1, 0.04],
      [0.06, 0.1, 0.06, 0x2a2a2a, -0.36, 0, 0.36], [0.06, 0.1, 0.06, 0x2a2a2a, 0.36, 0, 0.36],
    ],
  },
  {
    id: 'mesa_cristal', name: 'Mesa de cristal', sell: 350, buy: 1400, seller: 'muebles',
    parts: [
      [0.06, 0.7, 0.06, 0x9aa0a8, -0.4, 0, -0.4], [0.06, 0.7, 0.06, 0x9aa0a8, 0.4, 0, -0.4],
      [0.06, 0.7, 0.06, 0x9aa0a8, -0.4, 0, 0.4], [0.06, 0.7, 0.06, 0x9aa0a8, 0.4, 0, 0.4],
      [0.96, 0.04, 0.96, 0xbfe4f0, 0, 0.7, 0],
    ],
  },
  {
    id: 'cama_dosel', name: 'Cama con dosel', sell: 900, buy: 3600, seller: 'muebles',
    parts: [
      [0.94, 0.3, 0.96, 0xf2e6d0, 0, 0, 0],
      [0.9, 0.12, 0.9, 0xffffff, 0, 0.3, 0],
      [0.92, 0.06, 0.62, 0xb04060, 0, 0.42, 0.16],
      [0.08, 1.8, 0.08, 0xc8a050, -0.44, 0, -0.44], [0.08, 1.8, 0.08, 0xc8a050, 0.44, 0, -0.44],
      [0.08, 1.8, 0.08, 0xc8a050, -0.44, 0, 0.44], [0.08, 1.8, 0.08, 0xc8a050, 0.44, 0, 0.44],
      [0.98, 0.08, 0.98, 0xb04060, 0, 1.76, 0],
    ],
  },
  {
    id: 'piano', name: 'Piano', sell: 1500, buy: 6000, seller: 'muebles',
    parts: [
      [0.96, 1.1, 0.4, 0x1e1e22, 0, 0, -0.28],
      [0.96, 0.08, 0.3, 0x1e1e22, 0, 0.68, 0.06],
      [0.88, 0.04, 0.16, 0xf6f6f0, 0, 0.74, 0.1],
      ...[-0.3, -0.18, 0.02, 0.14, 0.3].map((x): [number, number, number, number, number, number, number] => [0.05, 0.03, 0.09, 0x1e1e22, x, 0.77, 0.06]),
      [0.08, 0.68, 0.08, 0x1e1e22, -0.42, 0, 0.14], [0.08, 0.68, 0.08, 0x1e1e22, 0.42, 0, 0.14],
    ],
  },
  {
    id: 'peluche_oso', name: 'Oso de peluche', sell: 200, buy: 800, seller: 'muebles',
    parts: [
      [0.36, 0.34, 0.28, 0xb07a48, 0, 0, 0],
      [0.3, 0.28, 0.26, 0xb07a48, 0, 0.34, 0],
      [0.1, 0.1, 0.06, 0xb07a48, -0.13, 0.6, 0], [0.1, 0.1, 0.06, 0xb07a48, 0.13, 0.6, 0],
      [0.12, 0.08, 0.06, 0xe8c8a0, 0, 0.4, 0.14],
      [0.04, 0.04, 0.02, 0x1e1e1e, -0.06, 0.5, 0.14], [0.04, 0.04, 0.02, 0x1e1e1e, 0.06, 0.5, 0.14],
      [0.22, 0.06, 0.04, 0xd04060, 0, 0.32, 0.14],
    ],
  },
  {
    id: 'puf', name: 'Puf', sell: 180, buy: 700, seller: 'muebles', seat: 0.4,
    parts: [
      [0.7, 0.36, 0.7, 0xee8fb2, 0, 0, 0],
      [0.56, 0.06, 0.56, 0xf6b0c8, 0, 0.36, 0],
    ],
  },
  {
    id: 'mecedora', name: 'Mecedora', sell: 350, buy: 1400, seller: 'muebles', seat: 0.5,
    parts: [
      [0.08, 0.06, 0.96, DARK, -0.28, 0, 0], [0.08, 0.06, 0.96, DARK, 0.28, 0, 0],
      [0.06, 0.38, 0.06, DARK, -0.28, 0.06, 0.24], [0.06, 0.38, 0.06, DARK, 0.28, 0.06, 0.24],
      [0.06, 0.38, 0.06, DARK, -0.28, 0.06, -0.2], [0.06, 0.38, 0.06, DARK, 0.28, 0.06, -0.2],
      [0.62, 0.06, 0.56, WOOD, 0, 0.44, 0.02],
      [0.62, 0.7, 0.06, WOOD, 0, 0.5, -0.26],
    ],
  },
  {
    id: 'chimenea', name: 'Chimenea', sell: 800, buy: 3200, seller: 'muebles', glow: 0xff8030, light: 11,
    parts: [
      [0.98, 1.0, 0.5, 0xa8503c, 0, 0, -0.24],
      [1.0, 0.1, 0.56, 0x6a6a6a, 0, 1.0, -0.22],
      [0.56, 0.5, 0.06, 0x2a2224, 0, 0.1, 0.02],
      [0.4, 0.08, 0.2, 0x7a5233, 0, 0.12, 0.08],
      [0.36, 0.26, 0.1, 0xffa040, 0, 0.18, 0.06],
    ],
  },
  {
    id: 'maniqui', name: 'Maniquí', sell: 300, seller: 'ropa',
    parts: [
      [0.36, 0.06, 0.36, DARK, 0, 0, 0],
      [0.06, 0.7, 0.06, DARK, 0, 0.06, 0],
      [0.46, 0.56, 0.26, 0xee8fb2, 0, 0.76, 0],
      [0.5, 0.1, 0.3, 0xd06a90, 0, 1.24, 0],
      [0.26, 0.28, 0.26, 0xf2e6d0, 0, 1.36, 0],
    ],
  },
  {
    id: 'perchero', name: 'Perchero de ropa', sell: 250, seller: 'ropa',
    parts: [
      [0.06, 1.5, 0.06, 0x9aa0a8, -0.42, 0, 0], [0.06, 1.5, 0.06, 0x9aa0a8, 0.42, 0, 0],
      [0.9, 0.04, 0.04, 0x9aa0a8, 0, 1.46, 0],
      [0.2, 0.6, 0.06, 0xd64541, -0.28, 0.84, 0], [0.2, 0.6, 0.06, 0x3f6fc4, -0.04, 0.84, 0],
      [0.2, 0.6, 0.06, 0xf0c03c, 0.2, 0.84, 0], [0.12, 0.6, 0.06, 0x4f9a50, 0.36, 0.84, 0],
    ],
  },
  {
    id: 'farola_hierro', name: 'Farola de hierro', sell: 450, buy: 1800, seller: 'urbano', glow: 0xffe4a0, light: 15, lightHeight: 2, stack: 10,
    parts: [
      [0.34, 0.2, 0.34, 0x2a2e34, 0, 0, 0],
      [0.1, 2.0, 0.1, 0x2a2e34, 0, 0.2, 0],
      [0.4, 0.08, 0.4, 0x2a2e34, 0, 2.5, 0],
      [0.06, 0.4, 0.06, 0x2a2e34, -0.16, 2.12, -0.16],
      [0.3, 0.32, 0.3, 0xfff2c0, 0, 2.18, 0],
    ],
  },
  {
    id: 'banco_parque', name: 'Banco de parque', sell: 300, buy: 1200, seller: 'urbano', stack: 10, seat: 0.45,
    parts: [
      [0.08, 0.44, 0.44, 0x2a2e34, -0.42, 0, 0], [0.08, 0.44, 0.44, 0x2a2e34, 0.42, 0, 0],
      [0.96, 0.05, 0.12, 0x3f7a4a, 0, 0.4, 0.12], [0.96, 0.05, 0.12, 0x3f7a4a, 0, 0.4, -0.04],
      [0.96, 0.12, 0.04, 0x3f7a4a, 0, 0.56, -0.18], [0.96, 0.12, 0.04, 0x3f7a4a, 0, 0.74, -0.18],
      [0.08, 0.5, 0.06, 0x2a2e34, -0.42, 0.4, -0.18], [0.08, 0.5, 0.06, 0x2a2e34, 0.42, 0.4, -0.18],
    ],
  },
  {
    id: 'jardinera', name: 'Jardinera', sell: 200, buy: 800, seller: 'urbano', stack: 10,
    parts: [
      [0.96, 0.4, 0.5, 0xb8b2a4, 0, 0, 0],
      [0.88, 0.06, 0.42, 0x6b4a2e, 0, 0.36, 0],
      [0.2, 0.2, 0.2, 0xe84a6a, -0.28, 0.42, 0], [0.2, 0.24, 0.2, 0xf0c03c, 0, 0.42, 0], [0.2, 0.2, 0.2, 0x8a5ac0, 0.28, 0.42, 0],
      [0.9, 0.1, 0.36, 0x5aa04a, 0, 0.4, 0],
    ],
  },
  {
    id: 'pergola', name: 'Pérgola', sell: 600, buy: 2400, seller: 'urbano',
    parts: [
      [0.1, 2.2, 0.1, WOOD, -0.44, 0, -0.44], [0.1, 2.2, 0.1, WOOD, 0.44, 0, -0.44],
      [0.1, 2.2, 0.1, WOOD, -0.44, 0, 0.44], [0.1, 2.2, 0.1, WOOD, 0.44, 0, 0.44],
      [1.1, 0.08, 0.1, DARK, 0, 2.2, -0.44], [1.1, 0.08, 0.1, DARK, 0, 2.2, 0.44],
      ...[-0.3, -0.1, 0.1, 0.3].map((z): Part => [1.1, 0.06, 0.08, DARK, 0, 2.28, z]),
      [1.0, 0.1, 1.0, 0x5aa04a, 0, 2.36, 0],
    ],
  },
  {
    id: 'senal_calle', name: 'Señal de calle', sell: 150, buy: 600, seller: 'urbano', stack: 10,
    parts: [
      [0.08, 1.7, 0.08, 0x9aa0a8, 0, 0, 0],
      [0.7, 0.2, 0.04, 0x3f6fc4, 0.22, 1.4, 0],
      [0.6, 0.04, 0.05, 0xffffff, 0.22, 1.48, 0],
      [0.2, 0.2, 0.04, 0xd64541, -0.14, 1.16, 0.02],
    ],
  },
  // --- Edificios nuevos (v5.2): muebles de un bloque hechos para cada edificio. Los usan el museo, la tienda, el
  // ayuntamiento, los comercios y las casas de los vecinos; los de casa también los vende Serrín. ---
  // Museo: cada pecera, terrario o vitrina es un solo bloque, con su pieza dentro.
  {
    id: 'pecera', name: 'Pecera', sell: 600, seller: 'museo',
    parts: [
      [1, 0.06, 1, FRAME, 0, 0, 0],
      [0.9, 0.08, 0.9, 0xe8d6a0, 0, 0.06, 0],
      [0.08, 0.22, 0.08, 0x3f9a4a, -0.28, 0.14, -0.26], [0.06, 0.32, 0.06, 0x56b24e, -0.2, 0.14, -0.3],
      [0.16, 0.1, 0.12, 0x8a8a84, 0.26, 0.14, -0.22],
      ...POSTS(0.06, 0.88, FRAME),
      [1, 0.05, 1, FRAME, 0, 0.94, 0],
      [0.92, 0.8, 0.92, 0x3d9fd8, 0, 0.12, 0, 0.32],
    ],
  },
  {
    id: 'terrario', name: 'Terrario', sell: 600, seller: 'museo',
    parts: [
      [1, 0.06, 1, FRAME, 0, 0, 0],
      [0.9, 0.14, 0.9, 0x6b4a2e, 0, 0.06, 0],
      [0.9, 0.04, 0.9, 0x5aa04a, 0, 0.2, 0],
      [0.08, 0.4, 0.08, 0x7a5233, 0.22, 0.24, -0.2], [0.3, 0.06, 0.06, 0x7a5233, 0.1, 0.5, -0.2],
      [0.22, 0.2, 0.22, 0x67b54a, -0.24, 0.24, 0.18], [0.1, 0.1, 0.1, 0xe84a6a, -0.24, 0.44, 0.18],
      ...POSTS(0.06, 0.88, FRAME),
      [1, 0.05, 1, FRAME, 0, 0.94, 0],
      [0.92, 0.74, 0.92, 0xdff2ea, 0, 0.2, 0, 0.2],
    ],
  },
  {
    id: 'vitrina', name: 'Vitrina', sell: 700, seller: 'museo',
    parts: [
      [0.9, 0.62, 0.9, MARBLE, 0, 0, 0],
      [0.96, 0.06, 0.96, FRAME, 0, 0.62, 0],
      [0.6, 0.04, 0.6, 0x8a2a3a, 0, 0.68, 0],
      ...POSTS(0.04, 0.5, FRAME, 0.44, 0.68),
      [0.96, 0.04, 0.96, FRAME, 0, 1.18, 0],
      [0.9, 0.5, 0.9, 0xe4f4f8, 0, 0.68, 0, 0.18],
    ],
  },
  {
    id: 'pedestal', name: 'Pedestal', sell: 300, seller: 'museo',
    parts: [
      [0.8, 0.08, 0.8, MARBLE_DARK, 0, 0, 0],
      [0.6, 0.5, 0.6, MARBLE, 0, 0.08, 0],
      [0.8, 0.08, 0.8, MARBLE_DARK, 0, 0.58, 0],
    ],
  },
  {
    id: 'panel_info', name: 'Panel informativo', sell: 200, seller: 'museo',
    parts: [
      [0.5, 0.06, 0.3, FRAME, 0, 0, 0],
      [0.06, 0.9, 0.06, FRAME, 0, 0.06, 0],
      [0.8, 0.5, 0.06, 0x24466e, 0, 0.84, 0],
      [0.6, 0.04, 0.02, 0xf4f1e8, 0, 1.22, 0.04], [0.5, 0.03, 0.02, 0xc8d4e4, -0.05, 1.12, 0.04],
      [0.5, 0.03, 0.02, 0xc8d4e4, -0.05, 1.04, 0.04], [0.3, 0.03, 0.02, 0xc8d4e4, -0.15, 0.96, 0.04],
      [0.18, 0.18, 0.02, 0xd8b45a, 0.24, 0.92, 0.04],
    ],
  },
  {
    id: 'cordon', name: 'Poste con cordón', sell: 150, seller: 'museo', stack: 10,
    parts: [
      [0.3, 0.06, 0.3, BRASS, -0.4, 0, 0], [0.06, 0.8, 0.06, BRASS, -0.4, 0.06, 0], [0.12, 0.1, 0.12, BRASS, -0.4, 0.86, 0],
      [0.3, 0.06, 0.3, BRASS, 0.4, 0, 0], [0.06, 0.8, 0.06, BRASS, 0.4, 0.06, 0], [0.12, 0.1, 0.12, BRASS, 0.4, 0.86, 0],
      [0.8, 0.05, 0.05, 0xb8202e, 0, 0.66, 0], [0.5, 0.05, 0.05, 0xb8202e, 0, 0.6, 0],
    ],
  },
  {
    id: 'mostrador_museo', name: 'Mostrador del museo', sell: 500, seller: 'museo',
    parts: [
      [1, 0.7, 0.56, MARBLE, 0, 0, 0.1],
      [1, 0.06, 0.66, 0x24466e, 0, 0.7, 0.08],
      [0.3, 0.2, 0.04, 0xd8b45a, 0, 0.34, 0.4],
      [0.24, 0.16, 0.1, 0xf4f1e8, -0.26, 0.76, 0.1], [0.12, 0.2, 0.08, 0x5a8fd6, 0.28, 0.76, 0.12],
    ],
  },
  {
    id: 'catalejo_pie', name: 'Catalejo de mirador', sell: 800, seller: 'museo',
    parts: [
      [0.06, 1.0, 0.06, FRAME, -0.18, 0, -0.1], [0.06, 1.0, 0.06, FRAME, 0.18, 0, -0.1], [0.06, 1.0, 0.06, FRAME, 0, 0, 0.2],
      [0.18, 0.14, 0.18, FRAME, 0, 1.0, 0],
      [0.16, 0.16, 0.7, BRASS, 0, 1.12, 0.12], [0.22, 0.22, 0.12, BRASS, 0, 1.09, 0.46],
    ],
  },
  {
    id: 'lampara_techo', name: 'Lámpara de techo', sell: 300, buy: 1200, seller: 'muebles', glow: 0xffe4a0, light: 13, lightHeight: 0,
    parts: [
      [0.04, 0.42, 0.04, FRAME, 0, 0.58, 0],
      [0.16, 0.04, 0.16, FRAME, 0, 0.96, 0],
      [0.46, 0.16, 0.46, 0x3f6f5a, 0, 0.42, 0],
      [0.3, 0.1, 0.3, 0xfff0c4, 0, 0.34, 0],
    ],
  },
  // Tienda: un mostrador bajo para que se vea bien a Avellana, la caja encima y mesas para enseñar lo del día.
  {
    id: 'mostrador_bajo', name: 'Mostrador bajo', sell: 350, seller: 'muebles', buy: 1400,
    parts: [
      [1, 0.56, 0.5, WOOD, 0, 0, 0.12],
      [1, 0.05, 0.62, DARK, 0, 0.56, 0.1],
      [0.92, 0.3, 0.03, 0xd8c19a, 0, 0.14, 0.38],
    ],
  },
  {
    id: 'caja_mostrador', name: 'Mostrador con caja', sell: 600, seller: 'tienda',
    parts: [
      [1, 0.56, 0.5, WOOD, 0, 0, 0.12],
      [1, 0.05, 0.62, DARK, 0, 0.56, 0.1],
      [0.92, 0.3, 0.03, 0xd8c19a, 0, 0.14, 0.38],
      [0.44, 0.2, 0.34, 0x5f6670, 0.16, 0.61, 0.06], [0.38, 0.07, 0.16, 0x3a3f46, 0.16, 0.81, -0.02],
      [0.26, 0.05, 0.1, 0xf2c230, 0.16, 0.62, 0.26], [0.2, 0.12, 0.16, 0xf4f1e8, -0.26, 0.61, 0.08],
    ],
  },
  {
    id: 'mesa_expositor', name: 'Mesa expositora', sell: 300, seller: 'muebles', buy: 1200,
    parts: [
      [0.08, 0.5, 0.08, DARK, -0.4, 0, -0.4], [0.08, 0.5, 0.08, DARK, 0.4, 0, -0.4],
      [0.08, 0.5, 0.08, DARK, -0.4, 0, 0.4], [0.08, 0.5, 0.08, DARK, 0.4, 0, 0.4],
      [0.98, 0.06, 0.98, WOOD, 0, 0.5, 0],
      [0.8, 0.02, 0.8, 0xc8553d, 0, 0.56, 0],
    ],
  },
  {
    id: 'cesta', name: 'Cesta de mimbre', sell: 120, seller: 'muebles', buy: 480, stack: 10,
    parts: [
      [0.6, 0.3, 0.5, 0xc8a060, 0, 0, 0],
      [0.64, 0.04, 0.54, 0xa07a40, 0, 0.3, 0],
      [0.16, 0.14, 0.16, 0xd84a3a, -0.14, 0.26, -0.06], [0.16, 0.14, 0.16, 0xf0a030, 0.08, 0.26, 0.08], [0.14, 0.12, 0.14, 0x8ac04a, 0.16, 0.26, -0.1],
      [0.04, 0.3, 0.04, 0xa07a40, -0.28, 0.32, 0], [0.04, 0.3, 0.04, 0xa07a40, 0.28, 0.32, 0], [0.6, 0.04, 0.04, 0xa07a40, 0, 0.6, 0],
    ],
  },
  // Casas de los vecinos: cocina, fregadero, nevera, mesita y cuadro.
  {
    id: 'cocina', name: 'Cocina', sell: 600, buy: 2400, seller: 'muebles',
    parts: [
      [0.96, 0.84, 0.6, 0xf2efe6, 0, 0, -0.18],
      [0.98, 0.06, 0.66, 0x5a5e66, 0, 0.84, -0.16],
      [0.66, 0.4, 0.03, 0x2a2e34, 0, 0.24, 0.13], [0.5, 0.04, 0.05, 0xb8bcc4, 0, 0.66, 0.14],
      [0.26, 0.02, 0.26, 0x1e1e22, -0.22, 0.9, -0.2], [0.26, 0.02, 0.26, 0x1e1e22, 0.22, 0.9, -0.2],
      [0.24, 0.14, 0.24, 0xc0392b, 0.22, 0.92, -0.2], [0.1, 0.03, 0.1, 0xf04020, -0.22, 0.91, -0.2],
    ],
  },
  {
    id: 'fregadero', name: 'Fregadero', sell: 450, buy: 1800, seller: 'muebles',
    parts: [
      [0.96, 0.84, 0.6, 0xa8c8d8, 0, 0, -0.18],
      [0.98, 0.06, 0.66, 0xe8e8e4, 0, 0.84, -0.16],
      [0.5, 0.03, 0.36, 0x9aa4ac, 0, 0.88, -0.16],
      [0.05, 0.22, 0.05, 0xc0c4cc, 0, 0.9, -0.42], [0.05, 0.05, 0.18, 0xc0c4cc, 0, 1.1, -0.34],
      [0.02, 0.3, 0.3, 0xb8a888, -0.08, 0.42, 0.13], [0.02, 0.3, 0.3, 0xb8a888, 0.08, 0.42, 0.13],
    ],
  },
  {
    id: 'nevera', name: 'Nevera', sell: 700, buy: 2800, seller: 'muebles',
    parts: [
      [0.8, 1.7, 0.7, 0xf4f4f0, 0, 0, -0.12],
      [0.8, 0.02, 0.02, 0xc8ccd0, 0, 1.1, 0.24],
      [0.04, 0.4, 0.04, 0xa8acb0, 0.3, 1.2, 0.26], [0.04, 0.3, 0.04, 0xa8acb0, 0.3, 0.6, 0.26],
      [0.1, 0.1, 0.02, 0xe84a6a, -0.2, 1.4, 0.24], [0.08, 0.08, 0.02, 0x4a8ae8, -0.1, 1.28, 0.24],
    ],
  },
  {
    id: 'mesita', name: 'Mesita de noche', sell: 250, buy: 1000, seller: 'muebles', glow: 0xffd98a, light: 9, lightHeight: 1,
    parts: [
      [0.56, 0.5, 0.5, WOOD, 0, 0, -0.1],
      [0.6, 0.04, 0.54, DARK, 0, 0.5, -0.1],
      [0.4, 0.03, 0.02, DARK, 0, 0.32, 0.16],
      [0.12, 0.04, 0.12, 0x50504a, 0.1, 0.54, -0.12], [0.04, 0.22, 0.04, 0x50504a, 0.1, 0.58, -0.12],
      [0.24, 0.18, 0.24, 0xfff0c4, 0.1, 0.78, -0.12],
    ],
  },
  {
    id: 'cuadro', name: 'Cuadro', sell: 300, buy: 1200, seller: 'muebles',
    parts: [
      [0.8, 0.6, 0.06, DARK, 0, 1.1, -0.46],
      [0.68, 0.48, 0.02, 0x8fc8e8, 0, 1.16, -0.42],
      [0.68, 0.16, 0.02, 0x5aa04a, 0, 1.16, -0.41], [0.18, 0.18, 0.02, 0xffd84a, 0.18, 1.42, -0.41], [0.2, 0.14, 0.02, 0x3f7f9f, -0.16, 1.3, -0.41],
    ],
  },
  // Ayuntamiento.
  {
    id: 'escritorio', name: 'Escritorio', sell: 500, buy: 2000, seller: 'muebles',
    parts: [
      [1, 0.06, 0.66, DARK, 0, 0.72, 0],
      [0.3, 0.72, 0.6, WOOD, -0.33, 0, 0], [0.3, 0.72, 0.6, WOOD, 0.33, 0, 0],
      [0.28, 0.03, 0.02, BRASS, -0.33, 0.5, 0.31], [0.28, 0.03, 0.02, BRASS, 0.33, 0.5, 0.31],
      [0.3, 0.02, 0.22, 0xf4f1e8, -0.1, 0.78, 0.04], [0.06, 0.12, 0.06, 0x2a2e34, 0.18, 0.78, -0.1],
      [0.16, 0.08, 0.04, 0xc0392b, -0.3, 0.78, -0.16],
    ],
  },
  {
    id: 'atril', name: 'Atril', sell: 300, seller: 'ayuntamiento',
    parts: [
      [0.5, 0.06, 0.4, DARK, 0, 0, 0],
      [0.14, 0.9, 0.14, WOOD, 0, 0.06, 0],
      [0.6, 0.06, 0.42, DARK, 0, 0.98, -0.02],
      [0.5, 0.02, 0.3, 0xf4f1e8, 0, 1.04, -0.02],
      [0.12, 0.12, 0.02, 0xd8b45a, 0, 0.6, 0.08],
    ],
  },
  {
    id: 'tablon', name: 'Tablón de anuncios', sell: 250, seller: 'ayuntamiento',
    parts: [
      [0.06, 1.6, 0.06, DARK, -0.42, 0, 0], [0.06, 1.6, 0.06, DARK, 0.42, 0, 0],
      [0.9, 0.7, 0.06, 0xb8865a, 0, 0.8, 0],
      [0.22, 0.26, 0.02, 0xf4f1e8, -0.24, 1.1, 0.04], [0.2, 0.18, 0.02, 0xfff2a0, 0.02, 1.22, 0.04],
      [0.24, 0.22, 0.02, 0xa8d8f0, 0.24, 0.98, 0.04], [0.18, 0.2, 0.02, 0xf8c8d8, -0.02, 0.92, 0.04],
      [0.94, 0.06, 0.1, DARK, 0, 1.5, 0],
    ],
  },
  {
    id: 'bandera_pie', name: 'Bandera de interior', sell: 300, seller: 'ayuntamiento',
    parts: [
      [0.36, 0.08, 0.36, BRASS, 0, 0, 0],
      [0.05, 1.9, 0.05, BRASS, 0, 0.08, 0],
      [0.1, 0.1, 0.1, BRASS, 0, 1.98, 0],
      [0.02, 0.5, 0.62, 0x3f6fc4, 0, 1.4, 0.32], [0.02, 0.16, 0.62, 0xf2c94c, 0, 1.57, 0.32],
    ],
  },
  // Comercios.
  {
    id: 'sacos', name: 'Sacos de semillas', sell: 200, seller: 'agricola',
    parts: [
      [0.42, 0.5, 0.36, 0xd8c08a, -0.22, 0, -0.1], [0.38, 0.06, 0.32, 0xc8a85a, -0.22, 0.5, -0.1],
      [0.4, 0.44, 0.34, 0xccb47e, 0.22, 0, 0.12], [0.36, 0.06, 0.3, 0x8ac04a, 0.22, 0.44, 0.12],
      [0.2, 0.14, 0.02, 0x5a8a3a, -0.22, 0.22, 0.09],
    ],
  },
  {
    id: 'bala_paja', name: 'Bala de paja', sell: 150, seller: 'granja', stack: 10,
    parts: [
      [0.96, 0.6, 0.62, 0xe8c860, 0, 0, 0],
      [0.98, 0.04, 0.64, 0xb8a040, 0, 0.18, 0], [0.98, 0.04, 0.64, 0xb8a040, 0, 0.42, 0],
    ],
  },
  {
    id: 'yunque', name: 'Yunque', sell: 500, seller: 'mina',
    parts: [
      [0.5, 0.36, 0.4, 0x7a5233, 0, 0, 0],
      [0.3, 0.16, 0.24, 0x3a3e44, 0, 0.36, 0],
      [0.74, 0.18, 0.3, 0x50555c, 0.04, 0.52, 0], [0.2, 0.1, 0.16, 0x50555c, -0.4, 0.58, 0],
      [0.06, 0.06, 0.4, 0x7a5233, 0.2, 0.7, 0.1], [0.12, 0.1, 0.1, 0x3a3e44, 0.2, 0.7, -0.1],
    ],
  },
  {
    id: 'maquina_coser', name: 'Máquina de coser', sell: 600, seller: 'ropa',
    parts: [
      [0.96, 0.06, 0.6, WOOD, 0, 0.7, 0],
      [0.06, 0.7, 0.5, 0x2a2e34, -0.42, 0, 0], [0.06, 0.7, 0.5, 0x2a2e34, 0.42, 0, 0],
      [0.5, 0.12, 0.2, 0x2a2e34, 0, 0.76, -0.06], [0.12, 0.3, 0.2, 0x2a2e34, 0.2, 0.76, -0.06], [0.42, 0.1, 0.18, 0x2a2e34, 0, 0.98, -0.06],
      [0.04, 0.12, 0.04, 0xc0c4cc, -0.16, 0.88, -0.06], [0.08, 0.1, 0.08, 0xee8fb2, 0.1, 1.08, -0.06],
    ],
  },
  {
    id: 'banco_carpintero', name: 'Banco de carpintero', sell: 500, seller: 'muebles', buy: 2000,
    parts: [
      [1, 0.12, 0.62, 0xc89a64, 0, 0.7, 0],
      [0.1, 0.7, 0.1, DARK, -0.42, 0, -0.24], [0.1, 0.7, 0.1, DARK, 0.42, 0, -0.24], [0.1, 0.7, 0.1, DARK, -0.42, 0, 0.24], [0.1, 0.7, 0.1, DARK, 0.42, 0, 0.24],
      [0.9, 0.06, 0.5, DARK, 0, 0.2, 0],
      [0.36, 0.06, 0.08, 0x8a8e94, -0.2, 0.82, 0.1], [0.08, 0.08, 0.2, 0xc0392b, 0.24, 0.82, -0.08], [0.3, 0.1, 0.12, 0xe8d0a0, 0.26, 0.22, 0],
    ],
  },
  {
    id: 'muestrario', name: 'Muestrario de baldosas', sell: 300, seller: 'urbano',
    parts: [
      [0.06, 1.2, 0.3, DARK, -0.44, 0, 0], [0.06, 1.2, 0.3, DARK, 0.44, 0, 0],
      [0.86, 0.9, 0.04, 0xe8e2d0, 0, 0.26, -0.04],
      [0.24, 0.24, 0.02, 0xb85a3a, -0.26, 0.86, 0], [0.24, 0.24, 0.02, 0x3a6a9a, 0, 0.86, 0], [0.24, 0.24, 0.02, 0x8a8a84, 0.26, 0.86, 0],
      [0.24, 0.24, 0.02, 0xd8c08a, -0.26, 0.56, 0], [0.24, 0.24, 0.02, 0x4a8a5a, 0, 0.56, 0], [0.24, 0.24, 0.02, 0xf4f1e8, 0.26, 0.56, 0],
    ],
  },
  // Terminal y astillero (v5.3).
  {
    id: 'maletas', name: 'Montón de maletas', sell: 250, seller: 'muebles', buy: 1000,
    parts: [
      [0.62, 0.42, 0.3, 0x9a5a3a, -0.1, 0, -0.14], [0.66, 0.04, 0.32, 0x6a3a22, -0.1, 0.2, -0.14],
      [0.46, 0.34, 0.26, 0x2f6fb0, -0.04, 0.42, -0.14], [0.14, 0.06, 0.04, 0x2a2e34, -0.04, 0.78, -0.14],
      [0.36, 0.5, 0.26, 0xd04a3a, 0.26, 0, 0.2], [0.04, 0.2, 0.04, 0x5f6670, 0.2, 0.5, 0.2], [0.04, 0.2, 0.04, 0x5f6670, 0.32, 0.5, 0.2],
      [0.12, 0.08, 0.02, 0xf2c230, -0.2, 0.26, 0.02],
    ],
  },
  {
    id: 'salvavidas', name: 'Salvavidas', sell: 200, seller: 'pesca', buy: 800,
    parts: [
      [0.1, 1.0, 0.1, DARK, 0, 0, -0.06],
      [0.62, 0.14, 0.12, 0xe8524a, 0, 0.42, 0.02], [0.62, 0.14, 0.12, 0xe8524a, 0, 0.9, 0.02],
      [0.14, 0.36, 0.12, 0xf4f1e8, -0.24, 0.56, 0.02], [0.14, 0.36, 0.12, 0xf4f1e8, 0.24, 0.56, 0.02],
      [0.02, 0.06, 0.13, 0xf4f1e8, 0, 0.46, 0.02], [0.02, 0.06, 0.13, 0xf4f1e8, 0, 0.94, 0.02],
    ],
  },
  {
    id: 'manga_viento', name: 'Manga de viento', sell: 300, seller: 'pesca', buy: 1200,
    parts: [
      [0.08, 2.1, 0.08, 0xc0c4cc, 0, 0, 0],
      [0.06, 0.06, 0.34, 0xc0c4cc, 0, 1.9, 0.16],
      [0.3, 0.3, 0.2, 0xff8a30, 0, 1.78, 0.4], [0.26, 0.26, 0.2, 0xf4f1e8, 0, 1.78, 0.6],
      [0.22, 0.22, 0.2, 0xff8a30, 0, 1.78, 0.8], [0.16, 0.16, 0.12, 0xf4f1e8, 0, 1.79, 0.96],
    ],
  },
  {
    id: 'rollo_cuerda', name: 'Rollo de cuerda', sell: 120, seller: 'pesca', buy: 500, stack: 10,
    parts: [
      [0.7, 0.1, 0.7, 0xd8c08a, 0, 0, 0], [0.6, 0.1, 0.6, 0xc8ac72, 0, 0.1, 0], [0.5, 0.1, 0.5, 0xd8c08a, 0, 0.2, 0],
      [0.22, 0.31, 0.22, 0x7a5233, 0, 0, 0], [0.3, 0.06, 0.06, 0xc8ac72, 0.42, 0.04, 0.16],
    ],
  },
  {
    id: 'ancla', name: 'Ancla', sell: 400, seller: 'pesca', buy: 1600,
    parts: [
      [0.1, 0.9, 0.1, 0x3a3e44, 0, 0.1, 0],
      [0.5, 0.08, 0.1, 0x3a3e44, 0, 0.86, 0], [0.18, 0.18, 0.06, 0x3a3e44, 0, 1.0, 0],
      [0.7, 0.1, 0.1, 0x3a3e44, 0, 0.1, 0], [0.1, 0.24, 0.1, 0x3a3e44, -0.36, 0.1, 0], [0.1, 0.24, 0.1, 0x3a3e44, 0.36, 0.1, 0],
      [0.22, 0.04, 0.22, 0x7a5233, 0, 0, 0],
    ],
  },
  {
    id: 'timon', name: 'Timón de pared', sell: 450, seller: 'pesca', buy: 1800,
    parts: [
      [0.14, 0.14, 0.1, DARK, 0, 0.73, -0.42],
      [0.7, 0.07, 0.06, WOOD, 0, 0.98, -0.42], [0.7, 0.07, 0.06, WOOD, 0, 0.46, -0.42],
      [0.07, 0.5, 0.06, WOOD, -0.32, 0.5, -0.42], [0.07, 0.5, 0.06, WOOD, 0.32, 0.5, -0.42],
      [0.9, 0.05, 0.05, DARK, 0, 0.78, -0.4], [0.05, 0.9, 0.05, DARK, 0, 0.32, -0.4],
    ],
  },
  {
    id: 'puesto_pesca', name: 'Puesto del muelle', sell: 600, seller: 'pesca',
    parts: [
      [1, 0.56, 0.5, 0x3f7ea6, 0, 0, 0.12], [1, 0.05, 0.62, WOOD, 0, 0.56, 0.1],
      [0.08, 1.9, 0.08, DARK, -0.46, 0, -0.42], [0.08, 1.9, 0.08, DARK, 0.46, 0, -0.42],
      [1.04, 0.06, 0.8, 0xf4f1e8, 0, 1.9, 0.0], [1.04, 0.06, 0.2, 0x3f7ea6, 0, 1.86, 0.36],
      [0.2, 0.16, 0.2, 0xd8c08a, -0.3, 0.61, 0.06], [0.14, 0.06, 0.3, 0x8ac0e0, 0.24, 0.61, 0.1],
    ],
  },
];
/** Los muebles que no caben antes de los dibujos extra siguen aquí en el atlas (v5.3). */
export const FURNITURE_TILE_START_2 = 448;
const FIRST_RANGE = 256 - FURNITURE_TILE_START;
/** Casilla del atlas del mueble número i. */
export function furnitureTileAt(i: number): number {
  return i < FIRST_RANGE ? FURNITURE_TILE_START + i : FURNITURE_TILE_START_2 + i - FIRST_RANGE;
}
export const FURNITURE_TILE = (id: string) => furnitureTileAt(FURNITURE.findIndex((f) => f.id === id));

export function furnitureDef(id: string): FurnitureDef | undefined {
  return FURNITURE.find((f) => f.id === id);
}

const box = new THREE.BoxGeometry(1, 1, 1);
const materials = new Map<number, THREE.MeshLambertMaterial>();
const glowMaterials = new Map<number, THREE.MeshLambertMaterial>();
const clearMaterials = new Map<string, THREE.MeshLambertMaterial>();

function material(color: number, glow?: number, opacity?: number): THREE.MeshLambertMaterial {
  // Cristal y agua (v5.2): transparentes y sin escribir en la profundidad, para que se vea lo que hay dentro.
  if (opacity !== undefined && opacity < 1) {
    const k = `${color}:${opacity}`;
    let c = clearMaterials.get(k);
    if (!c) {
      c = new THREE.MeshLambertMaterial({ color, transparent: true, opacity, depthWrite: false });
      clearMaterials.set(k, c);
    }
    return c;
  }
  const cache = glow ? glowMaterials : materials;
  let m = cache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, emissive: glow ?? 0, emissiveIntensity: 0 });
    cache.set(color, m);
  }
  return m;
}

/** Piezas de cada mueble ya juntas: una malla por material (se comparten entre todos los muebles iguales). */
const merged = new Map<FurnitureDef, { material: THREE.MeshLambertMaterial; geometry: THREE.BufferGeometry; order: number }[]>();

/**
 * Pieza a pieza el mueble sería una malla por caja, y una casa llena de muebles se dibujaba en cientos de pasadas.
 * Desde la v5.3.1 las cajas del mismo material se juntan en una sola malla: se ve igual y se dibuja de una vez.
 */
function mergedParts(def: FurnitureDef) {
  let list = merged.get(def);
  if (list) return list;
  const byMaterial = new Map<THREE.MeshLambertMaterial, { boxes: THREE.BufferGeometry[]; order: number }>();
  const m = new THREE.Matrix4();
  def.parts.forEach(([w, h, d, color, x, y, z, opacity], i) => {
    // La pantalla de la lámpara (la última pieza) es la que brilla.
    const glows = def.glow !== undefined && i === def.parts.length - 1;
    const mat = material(color, glows ? def.glow : undefined, opacity);
    let entry = byMaterial.get(mat);
    if (!entry) {
      entry = { boxes: [], order: opacity !== undefined && opacity < 1 ? 2 : 0 };
      byMaterial.set(mat, entry);
    }
    m.makeScale(w, h, d).setPosition(x, y + h / 2, z);
    entry.boxes.push(box.clone().applyMatrix4(m));
  });
  list = [...byMaterial].map(([material, { boxes, order }]) => {
    const geometry = boxes.length === 1 ? boxes[0] : mergeGeometries(boxes)!;
    if (boxes.length > 1) boxes.forEach((b) => b.dispose());
    geometry.clearGroups();
    return { material, geometry, order };
  });
  merged.set(def, list);
  return list;
}

function buildModel(def: FurnitureDef): THREE.Group {
  const g = new THREE.Group();
  for (const { material, geometry, order } of mergedParts(def)) {
    const mesh = new THREE.Mesh(geometry, material);
    if (order) mesh.renderOrder = order;
    g.add(mesh);
  }
  return g;
}

/** Dibuja el icono de cada mueble en el atlas, en su casilla. Hay que llamarlo antes de crear la textura. */
export function paintFurnitureIcons(atlas: HTMLCanvasElement) {
  const size = TILE * 2;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: true });
  } catch {
    return; // sin WebGL no hay juego de todas formas
  }
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.6), new THREE.DirectionalLight(0xffffff, 2.2));
  (scene.children[1] as THREE.DirectionalLight).position.set(1, 2, 1.6);
  const cam = new THREE.OrthographicCamera(-0.78, 0.78, 0.78, -0.78, 0.1, 10);
  cam.position.set(1.6, 1.7, 2.2);
  cam.lookAt(0, 0.4, 0);
  const ctx = atlas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  FURNITURE.forEach((def, i) => {
    const model = buildModel(def);
    scene.add(model);
    renderer.render(scene, cam);
    scene.remove(model);
    const tile = furnitureTileAt(i);
    const tx = (tile % ATLAS_TILES) * TILE;
    const ty = Math.floor(tile / ATLAS_TILES) * TILE;
    ctx.clearRect(tx, ty, TILE, TILE);
    ctx.drawImage(renderer.domElement, tx, ty, TILE, TILE);
  });
  renderer.dispose();
  renderer.forceContextLoss();
}

export interface PlacedFurniture {
  id: string;
  x: number;
  y: number;
  z: number;
  /** Cuartos de vuelta (0 a 3). */
  rot: number;
  /** Lo que pone en un cartel. */
  text?: string;
}

/** Tabla con el texto del cartel, delante de la madera. */
function signText(text: string): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 72;
  const ctx = c.getContext('2d');
  // Sin canvas (en las pruebas) el cartel se queda en blanco.
  if (!ctx) return new THREE.Mesh();
  ctx.fillStyle = '#c99561';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#3a2614';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Hasta dos líneas: se parte por la palabra más cercana a la mitad.
  const words = text.trim().split(/\s+/);
  let lines = [words.join(' ')];
  if (lines[0].length > 14 && words.length > 1) {
    let best = 1;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ').length;
      if (Math.abs(a - lines[0].length / 2) < Math.abs(words.slice(0, best).join(' ').length - lines[0].length / 2)) best = i;
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  const size = Math.min(26, Math.floor(118 / Math.max(...lines.map((l) => l.length)) * 1.7));
  ctx.font = `700 ${size}px sans-serif`;
  lines.forEach((l, i) => ctx.fillText(l, 64, 36 + (i - (lines.length - 1) / 2) * size * 1.05));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.46), new THREE.MeshLambertMaterial({ map: tex }));
  mesh.position.set(0, 0.87, 0.045);
  return mesh;
}

interface Entry {
  data: PlacedFurniture;
  model: THREE.Group;
  /** Última luz que le ha tocado (cielo y antorcha), para no perderla al rehacer las mallas juntas. */
  lit: [number, number, number, number];
  /** Dónde están sus vértices en las mallas juntas. */
  ranges: { attr: THREE.BufferAttribute; start: number; count: number }[];
}

/** Sin luz calculada todavía se ve como con el material de siempre. */
const NO_LIGHT: Entry['lit'] = [1, 0, 0, 0];

/** La luz que calcula entityLight para el mueble va a sus vértices de las mallas juntas. */
function hookLight(e: Entry) {
  const hook: LitHook = (sky, glow) => {
    const l = e.lit;
    if (l[0] === sky && l[1] === glow.r && l[2] === glow.g && l[3] === glow.b) return;
    l[0] = sky;
    l[1] = glow.r;
    l[2] = glow.g;
    l[3] = glow.b;
    for (const r of e.ranges) fillLight(r, l);
  };
  e.model.userData.onLit = hook;
}

/** Pone la luz de un mueble en sus vértices de las mallas juntas. */
function fillLight(r: Entry['ranges'][number], lit: Entry['lit']) {
  const a = r.attr.array as Float32Array;
  for (let i = r.start * 4, end = (r.start + r.count) * 4; i < end; i += 4) {
    a[i] = lit[0];
    a[i + 1] = lit[1];
    a[i + 2] = lit[2];
    a[i + 3] = lit[3];
  }
  r.attr.needsUpdate = true;
}

/** Avisa de que un mueble da luz (nivel > 0) o deja de darla (0) en (x, y, z). */
export type LightHook = (x: number, y: number, z: number, level: number) => void;

/** Los muebles colocados en la isla. No son sólidos: se puede pasar por encima, como por las alfombras. */
export class Furniture {
  readonly group = new THREE.Group();
  private entries: Entry[] = [];
  private bounds = new THREE.Box3();
  /**
   * Las piezas opacas de todos los muebles, juntas en una malla por material (v5.3.1): un museo o una aldea llena de
   * muebles se dibuja en unas pocas pasadas en vez de en cientos. Cada mueble sigue teniendo su propia luz.
   */
  private batches = new THREE.Group();
  private rebuildQueued = false;

  constructor(saved: PlacedFurniture[], private onLight: LightHook | null = null) {
    this.batches.userData.noEntityLight = true;
    this.group.add(this.batches);
    for (const f of saved) if (furnitureDef(f.id)) this.place(f.id, f.x, f.y, f.z, f.rot, f.text);
  }

  /** Muebles puestos. */
  get count(): number {
    return this.entries.length;
  }

  /** Hay que rehacer las mallas juntas: se hace una vez, aunque se pongan cien muebles seguidos. */
  private changed() {
    if (this.rebuildQueued) return;
    this.rebuildQueued = true;
    queueMicrotask(() => this.rebuild());
  }

  private rebuild() {
    this.rebuildQueued = false;
    for (const m of this.batches.children as THREE.Mesh[]) m.geometry.dispose();
    this.batches.clear();
    const byMaterial = new Map<THREE.MeshLambertMaterial, { geos: THREE.BufferGeometry[]; owners: Entry[] }>();
    for (const e of this.entries) {
      e.ranges = [];
      e.model.updateMatrix();
      for (const { material, geometry, order } of mergedParts(furnitureDef(e.data.id)!)) {
        if (order) continue; // lo transparente va aparte, ordenado por distancia como siempre
        let b = byMaterial.get(material);
        if (!b) byMaterial.set(material, (b = { geos: [], owners: [] }));
        b.geos.push(geometry.clone().applyMatrix4(e.model.matrix));
        b.owners.push(e);
      }
    }
    for (const [material, { geos, owners }] of byMaterial) {
      const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos)!;
      if (geos.length > 1) geos.forEach((g) => g.dispose());
      const attr = new THREE.BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 4), 4);
      let start = 0;
      owners.forEach((e, i) => {
        const count = geos[i].getAttribute('position').count;
        const range = { attr, start, count };
        e.ranges.push(range);
        fillLight(range, e.lit);
        start += count;
      });
      geometry.setAttribute('aLit', attr);
      const mat = litBatchMaterial(material);
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.onBeforeRender = () => syncBatch(mat);
      this.batches.add(mesh);
    }
  }

  place(id: string, x: number, y: number, z: number, rot: number, text?: string) {
    const def = furnitureDef(id)!;
    const data: PlacedFurniture = { id, x, y, z, rot };
    if (text) data.text = text;
    const model = this.model(data);
    this.group.add(model);
    this.entries.push(this.entry(data, model));
    this.changed();
    if (def.light) this.onLight?.(x, y + (def.lightHeight ?? 0), z, def.light);
  }

  private entry(data: PlacedFurniture, model: THREE.Group): Entry {
    const e: Entry = { data, model, lit: [...NO_LIGHT], ranges: [] };
    hookLight(e);
    return e;
  }

  private model(data: PlacedFurniture): THREE.Group {
    const model = buildModel(furnitureDef(data.id)!);
    // Las piezas opacas se dibujan en las mallas juntas; aquí se quedan (invisibles) para apuntar y medir el mueble.
    for (const m of model.children as THREE.Mesh[]) {
      if (m.renderOrder) continue;
      m.visible = false;
      m.userData.noEntityLight = m.userData.noShadow = true;
    }
    if (data.text) model.add(signText(data.text));
    model.position.set(data.x + 0.5, data.y, data.z + 0.5);
    model.rotation.y = (data.rot * Math.PI) / 2;
    return model;
  }

  /** Cambia lo que pone en un cartel. */
  setText(f: PlacedFurniture, text: string) {
    const e = this.entries.find((en) => en.data === f);
    if (!e) return;
    const clean = text.trim().slice(0, 40);
    if (clean) f.text = clean;
    else delete f.text;
    this.group.remove(e.model);
    e.model = this.model(f);
    hookLight(e);
    this.group.add(e.model);
    this.changed();
  }

  private unlight(f: PlacedFurniture) {
    const def = furnitureDef(f.id);
    if (def?.light) this.onLight?.(f.x, f.y + (def.lightHeight ?? 0), f.z, 0);
  }

  known(id: string): boolean {
    return !!furnitureDef(id);
  }

  at(x: number, y: number, z: number): PlacedFurniture | undefined {
    return this.entries.find((e) => e.data.x === x && e.data.y === y && e.data.z === z)?.data;
  }

  /** Quita todos los muebles (los adornos de una fiesta que se acaba, por ejemplo). */
  clear() {
    for (const e of this.entries) {
      this.group.remove(e.model);
      this.unlight(e.data);
    }
    this.entries = [];
    this.changed();
  }

  remove(f: PlacedFurniture) {
    const i = this.entries.findIndex((e) => e.data === f);
    if (i < 0) return;
    this.group.remove(this.entries[i].model);
    this.entries.splice(i, 1);
    this.unlight(f);
    this.changed();
  }

  rotate(f: PlacedFurniture) {
    const e = this.entries.find((en) => en.data === f);
    if (!e) return;
    f.rot = (f.rot + 1) % 4;
    e.model.rotation.y = (f.rot * Math.PI) / 2;
    this.changed();
  }

  /** Mueble que corta el rayo antes de `maxDist`, con su distancia y su caja. */
  pick(ray: THREE.Ray, maxDist: number): { furniture: PlacedFurniture; dist: number; box: THREE.Box3 } | null {
    let best: { furniture: PlacedFurniture; dist: number; box: THREE.Box3 } | null = null;
    const hit = new THREE.Vector3();
    for (const e of this.entries) {
      this.bounds.setFromObject(e.model);
      if (!ray.intersectBox(this.bounds, hit)) continue;
      const d = hit.distanceTo(ray.origin);
      if (d < maxDist && (!best || d < best.dist)) best = { furniture: e.data, dist: d, box: this.bounds.clone() };
    }
    return best;
  }

  /** Las lámparas se encienden al anochecer. */
  setNight(night: number) {
    for (const m of glowMaterials.values()) m.emissiveIntensity = 0.2 + night * 1.2;
  }

  serialize(): PlacedFurniture[] {
    return this.entries.map((e) => ({ ...e.data }));
  }
}
