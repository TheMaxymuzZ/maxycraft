# Maxycraft

Una mezcla de Minecraft y Animal Crossing que se juega en el navegador: construyes y cavas en un mundo de bloques, y vives tranquilo en una isla con vecinos, tienda, pesca y estaciones.

**Jugar:** https://themaxymuzz.github.io/maxycraft/

## Estado

Versión actual: **v0.6 · Bichos y peces**

- Caña de pescar y red (se fabrican con 5 ramas o se compran). Con la caña, clic derecho al agua, espera a que pique y vuelve a hacer clic a tiempo.
- 10 peces (6 de mar y 4 de río) y 7 insectos, cada uno con su sitio y su horario.
- Enciclopedia con la tecla C. Matilde, la tortuga del museo, recoge las donaciones de ejemplares nuevos.

- Las bayas son la moneda de la isla; se empieza con 500 y se ven bajo el reloj.
- La tienda de Avellana (la ardilla) abre de 8:00 a 22:00. Vende herramientas siempre y cinco cosas más que cambian cada día: tejados de colores, paredes, ventanas, flores, piedra…
- Se puede vender todo lo que llevas. Los precios de venta cambian cada día, menos la fruta de tu isla, que siempre vale 100.

- Tres vecinos animales (de entre seis posibles) con su casa, su personalidad y su coletilla.
- Pasean de día cerca de casa y por la noche se van a dormir, cada uno a su hora.
- Clic derecho sobre un vecino para charlar o darle un regalo. Cada uno tiene sus gustos, y si le caes bien a veces te devuelve el regalo.

- Bolsillos con 30 casillas (la fila de arriba es la barra rápida) y fabricación sencilla: tablones, hacha, pala y pico.
- Romper bloques lleva tiempo y da objetos. El pico es necesario para la piedra; hacha y pala van más rápido con madera y tierra, y se desgastan.
- Sacudir árboles (clic derecho) hace caer la fruta y, una vez al día por árbol, una rama. La fruta vuelve a salir a los 3 días reales.
- Cada día aparecen conchas, caracolas y estrellas de mar nuevas en la playa.

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
| Clic izquierdo (mantener) | Romper bloque |
| Clic derecho | Colocar bloque o sacudir un árbol |
| E | Bolsillos y fabricar |
| C | Enciclopedia de peces e insectos |
| 1–0 o rueda | Elegir casilla |
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
