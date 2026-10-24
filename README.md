# Maxycraft

Una mezcla de Minecraft y Animal Crossing que se juega en el navegador: construyes y cavas en un mundo de bloques, y vives tranquilo en una isla con vecinos, tienda, pesca y estaciones.

**Jugar:** https://themaxymuzz.github.io/maxycraft/

## Estado

Versión actual: **v0.1 · Primer bloque**

- Mundo de vóxeles por chunks con colinas y árboles generados.
- Caminar, correr y saltar en primera persona, con colisiones.
- Romper y colocar 7 tipos de bloque.
- Texturas pixel art de 16×16 generadas por código.

## Controles

| Tecla | Acción |
| --- | --- |
| W A S D | Caminar |
| Espacio | Saltar |
| Mayús | Correr |
| Clic izquierdo | Romper bloque |
| Clic derecho | Colocar bloque |
| 1–7 o rueda | Elegir bloque |
| F | Datos de depuración |
| Esc | Pausa |

## Desarrollo

```sh
npm install
npm run dev     # servidor local en http://localhost:5173
npm run build   # comprueba tipos y genera dist/
```

Hecho con [Three.js](https://threejs.org/), TypeScript y Vite. Cada push a `main` se publica solo en GitHub Pages.
