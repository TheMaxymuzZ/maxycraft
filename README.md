# Maxycraft

Una mezcla de Minecraft y Animal Crossing que se juega en el navegador: construyes y cavas en un mundo de bloques, y vives tranquilo en una isla con vecinos, tienda, pesca y estaciones.

**Jugar:** https://themaxymuzz.github.io/maxycraft/

## Estado

Versión actual: **v1.6**

- **Bosquecillos de bambú**: zonas de cañas de 3 a 5 bloques sin árboles. El bambú se puede romper y vender.
- **Praderas de flores** llenas de flores de cinco colores, con dos nuevas: nomeolvides azul y clavel rosa (también en la tienda).
- **Cascadas** donde el río pasa junto a un acantilado alto, con espuma al pie.
- **Viento**: la hierba alta, las flores y el bambú se balancean, más fuerte cuando llueve.
- **Pájaros** volando en círculos sobre la isla y **gaviotas** sobre el mar. De noche y con lluvia se van.
- Las zonas nuevas solo cambian plantas, no el terreno, así que las islas guardadas siguen encajando.

- **Cielo con degradado**: más azul arriba que en el horizonte, con un resplandor naranja junto al sol al amanecer y al atardecer. El sol se vuelve anaranjado cuando está bajo y la luz también.
- **Agua animada**: olas suaves (en calidad media y alta), manchas de luz que se mueven y brillos pixelados que se apagan de noche y con lluvia.
- **Nubes nuevas** hechas de varias piezas, con sombra por debajo, que se tiñen de rosa y naranja al amanecer y al atardecer.

- **App instalable**: en Android y en el ordenador (Chrome o Edge) aparece el botón «Instalar Maxycraft» en el menú. En iPhone y iPad el menú explica cómo hacerlo: Compartir → Añadir a pantalla de inicio. Se abre a pantalla completa con su icono.
- **Sin internet**: tras la primera visita el juego se guarda en el dispositivo y funciona sin conexión. Cuando hay una versión nueva se actualiza sola la próxima vez que se abre con internet. Las letras van dentro del juego.
- **Pantalla de carga** con barra mientras se prepara la isla, y Three.js en un archivo aparte que el navegador reutiliza entre versiones.
- Los iconos se dibujan con `python3 scripts/iconos.py`.

- **Mis islas**: hasta 3 islas guardadas a la vez, cada una con su fruta, sus bayas y la fecha de la última vez que se guardó. Se cambia de una a otra desde el menú.
- **Copias de seguridad**: «Guardar copia» descarga la isla en un archivo `.json`, y «Cargar copia» la recupera en cualquier hueco (sirve para llevarla a otro ordenador o al móvil). Borrar una isla pide confirmación.
- **Aviso de guardado** arriba en el centro cuando se guarda algo nuevo, o si el navegador no deja guardar (modo privado).

- **Portada**: al abrir el juego la cámara da vueltas sobre tu isla y el menú aparece a un lado. Durante la partida, el mismo menú hace de pausa.
- **Opciones** que se guardan en el navegador: volumen de música y de efectos, sensibilidad al mirar, campo de visión y calidad gráfica (baja, media o alta: cuánto se ve a lo lejos y la nitidez). En el móvil empieza en calidad baja. Se aplican al momento.
- Los controles tienen su propia pantalla en el menú.

- **Pruebas automáticas** (50 comprobaciones) del mundo, los bolsillos, las recetas, la tienda, las estaciones y la partida guardada. Se pasan solas en cada pull request y, si alguna falla, no se publica nada.
- El número de versión del menú sale de `package.json`.

- **Primeros pasos**: en una isla nueva aparece una lista de 8 tareas (pasear, sacudir un árbol, romper un bloque, fabricar, hablar con un vecino, vender, pescar o cazar y colocar un mueble) que se tachan solas. Al terminarla, Avellana te regala 1.000 bayas. La tecla H la pliega.
- **Música y sonidos** hechos con el sintetizador del navegador: una canción distinta cada hora (alegre por la mañana, tranquila de noche), pasos según el suelo, golpes al romper y colocar, la voz de cada vecino al hablar, monedas, chapoteos, fanfarria al pescar y lluvia de fondo. La tecla M o el botón del menú lo apagan.
- **Controles táctiles** para móvil y tableta: palanca a la izquierda, arrastrar a la derecha para mirar y botones para saltar, romper, usar, bolsillos, enciclopedia, girar muebles y pausa. La barra rápida se toca para elegir. En el móvil se ve algo menos lejos para que vaya fluido.
- Las ventanas caben en pantallas bajas y tienen botón de cerrar.

- Las estaciones siguen el calendario real: hierba y hojas más claras con flores rosas en primavera, naranjas en otoño y nevadas en invierno.
- El tiempo cambia cada tres horas: sol, nubes, lluvia o nieve. Con lluvia el día se oscurece; la lluvia y la nieve no entran bajo techo.
- Fiestas: Halloween (última semana de octubre, con calabazas en las puertas), Navidad (del 20 al 26 de diciembre, con nieve y árbol junto a la tienda), Nochevieja, Año Nuevo y San Valentín. Los vecinos te felicitan y la tienda vende cosas de temporada.
- Cada vecino tiene su cumpleaños: ese día lleva gorro de fiesta, y si le haces un regalo te lo agradece mucho más.
- Algunos peces e insectos solo salen en ciertos meses (la luciérnaga en verano, el salmón en otoño, la pulga de las nieves en invierno…). La enciclopedia lo indica.
- Para probar otro día o tiempo: `?fecha=2026-12-24` y `?tiempo=lluvia`.

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

En móvil o tableta se juega con el mando en pantalla. Con teclado y ratón:

| Tecla | Acción |
| --- | --- |
| W A S D | Caminar |
| Espacio | Saltar |
| Mayús | Correr |
| Clic izquierdo (mantener) | Romper bloque |
| Clic derecho | Colocar bloque o mueble, sacudir un árbol, hablar |
| R | Girar el mueble al que apuntas |
| M | Sonido sí / no |
| H | Plegar los primeros pasos |
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
npm test        # pasa las pruebas automáticas (carpeta tests/)
npm run build   # comprueba tipos y genera dist/
```

Para ver otra hora del día sin esperar, añade `?hora=21` (o cualquier hora) a la dirección.

Hecho con [Three.js](https://threejs.org/), TypeScript y Vite. Cada push a `main` pasa las pruebas y se publica solo en GitHub Pages.
