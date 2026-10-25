# Maxycraft

Una mezcla de Minecraft y Animal Crossing que se juega en el navegador: construyes y cavas en un mundo de bloques, y vives tranquilo en una isla con vecinos, tienda, pesca y estaciones.

**Jugar:** https://themaxymuzz.github.io/maxycraft/

## Estado

Versión actual: **v0.2 · La isla**

- Una isla rodeada de mar, con playas, río, terrazas con acantilados, palmeras y flores.
- Árboles frutales con la fruta propia de tu isla (manzana, naranja, pera, melocotón o cereza).
- Día y noche según tu hora real, con reloj en pantalla, sol, luna y estrellas.
- Se puede nadar en el mar y en el río.
- La isla se guarda sola en el navegador. Desde el menú puedes empezar una isla nueva.
- Caminar, correr y saltar en primera persona; romper y colocar bloques y flores.
- Texturas pixel art de 16×16 generadas por código.

## Controles

| Tecla | Acción |
| --- | --- |
| W A S D | Caminar |
| Espacio | Saltar |
| Mayús | Correr |
| Clic izquierdo | Romper bloque |
| Clic derecho | Colocar bloque |
| 1–9 o rueda | Elegir bloque |
| Espacio en el agua | Nadar hacia arriba |
| F | Datos de depuración |
| Esc | Pausa |

## Desarrollo

```sh
npm install
npm run dev     # servidor local en http://localhost:5173
npm run build   # comprueba tipos y genera dist/
```

Para ver otra hora del día sin esperar, añade `?hora=21` (o cualquier hora) a la dirección.

Hecho con [Three.js](https://threejs.org/), TypeScript y Vite. Cada push a `main` se publica solo en GitHub Pages.
