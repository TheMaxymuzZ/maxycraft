# Maxycraft

Una mezcla de Minecraft y Animal Crossing que se juega en el navegador: construyes y cavas en un mundo de bloques, y vives tranquilo en una isla con vecinos, tienda, pesca y estaciones.

**Jugar:** https://themaxymuzz.github.io/maxycraft/

## Estado

Versión actual: **v0.9 · Mesa de trabajo**

- Mesa de trabajo (4 tablones, desde los bolsillos). Colócala y haz clic derecho sobre ella para fabricar con las recetas que sepas.
- 18 recetas: vallas de madera y blancas, muebles (también tres nuevos que solo se fabrican: barril, farol y banco), ventanas, paredes y las herramientas de hierro.
- Las recetas se aprenden: cada día el mar deja en la playa una botella con un mensaje (clic derecho para leerla), y los vecinos que te tienen cariño a veces te enseñan una al saludarte.
- Las vallas se unen solas entre sí y con los bloques de al lado, y no se pueden saltar.

- Empiezas delante de tu propia parcela, con una tienda de campaña y una cama.
- Habla con Avellana y elige «Mi casa» para cambiar la tienda por una casa de verdad: pequeña (5.000 bayas), mediana (15.000) y grande (40.000). Eliges el color del tejado y la pagas poco a poco, sin intereses. Para ampliarla hay que terminar de pagar la anterior.
- Ocho muebles: cama, mesa, silla, lámpara (se enciende de noche), estantería, sofá, planta y alfombra. La tienda vende tres distintos cada día.
- Clic derecho para colocar un mueble mirando hacia ti, R para girarlo y clic izquierdo para recogerlo.
- En tu parcela puedes romper y cambiar lo que quieras; las casas de los vecinos siguen protegidas.

- Bajo la isla hay túneles y salas. Dos escaleras bajan desde la superficie, y también se puede cavar con el pico.
- Cuanto más hondo, más oscuro: las antorchas (1 rama + 1 carbón = 4) iluminan alrededor. No hay monstruos.
- Minerales: carbón, hierro, oro y amatista, más raros cuanto más abajo. Con pepitas de hierro se fabrican pico, hacha y pala de hierro, más rápidos y duraderos.
- El agua ahora solo está donde hay mar o río de verdad, así que los agujeros en tierra ya no se inundan.

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
| Clic derecho | Colocar bloque o mueble, sacudir un árbol, hablar |
| R | Girar el mueble al que apuntas |
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
