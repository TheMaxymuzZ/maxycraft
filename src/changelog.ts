/** Novedades de cada versión, de la más nueva a la más antigua, para enseñarlas dentro del juego. */
export interface Release {
  version: string;
  title: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '3.7',
    title: 'Tamaño de la interfaz',
    items: [
      'Opciones › Tamaño de la interfaz: botones, barra rápida, avisos, primeros pasos y ventanas del 70% al 150%.',
      'Se ve al momento, sin reiniciar, y se recuerda para la próxima vez.',
      'Si en tu pantalla no cabe tan grande, se queda en lo máximo que cabe sin que los botones se monten, y te lo dice.',
      'Funciona junto con «Texto grande».',
    ],
  },
  {
    version: '3.6',
    title: 'Controles cómodos en el móvil',
    items: [
      'Como en Minecraft: deja el dedo quieto en la pantalla un momento y rompes el bloque de la mira.',
      'Mientras rompes puedes seguir arrastrando el dedo para mirar alrededor. Si la mira se sale del bloque, ese bloque deja de romperse.',
      'Un toque rápido en la pantalla es «usar»: sacudir un árbol, hablar, poner un bloque…',
      'Con el dedo en el botón Romper también puedes arrastrar para mirar.',
      'Botones nuevos con dibujo: Saltar, Romper y Usar juntos a mano del pulgar; arriba, un menú pequeño de iconos.',
      'La barra rápida encoge para caber entera en el móvil en vertical, y los primeros pasos empiezan plegados.',
      'Los avisos ya no tapan la mira ni los botones.',
    ],
  },
  {
    version: '3.5',
    title: 'Herramientas nuevas',
    items: [
      'Hacha, pala, pico, caña, red y regadera redibujadas: mango gordo de madera con empuñadura, cabeza grande y contorno oscuro, como en Minecraft.',
      'Cada una tiene su forma clara: el hacha con su hoja, el pico curvado, la pala con punta, la red con su aro.',
      'Las sencillas son de piedra gris; las de hierro, plateadas y brillantes. Se distinguen a la primera.',
      'Al coger una herramienta, debajo del nombre sale para qué sirve (por ejemplo, «Rompe piedra y minerales»).',
    ],
  },
  {
    version: '3.4',
    title: 'Avisos que no se pisan',
    items: [
      'Los avisos ya no se borran unos a otros: se apilan arriba, como mucho tres a la vez, y se van solos.',
      'Si un aviso se repite, no sale otra vez: se cuenta. Por ejemplo, «Has conseguido: manzana ×3».',
      'Los avisos largos se quedan un poco más en pantalla, para que dé tiempo a leerlos.',
      '«Guardado» sale pequeño debajo del reloj, sin tapar nada.',
      'En el móvil los avisos salen encima de la barra, sin tapar los botones; hablando con un vecino suben arriba.',
      'Barra rápida, primeros pasos, avisos y chat con esquinas redondeadas y sombras suaves.',
    ],
  },
  {
    version: '3.3',
    title: 'Objetos más bonitos',
    items: [
      'Lo que cae al suelo se ve en 3D, como en Minecraft: los bloques son cubitos y lo demás tiene grosor. Giran despacio y llevan una sombrita.',
      'En los bolsillos, la barra rápida, la tienda y los cofres, los bloques se ven como cubitos en 3D.',
      'Los demás iconos tienen un borde oscuro y una sombra suave: se distinguen bien sobre cualquier fondo.',
      'Los iconos son un poco más grandes y nítidos.',
    ],
  },
  {
    version: '3.2',
    title: 'Luz global',
    items: [
      'Sombras de verdad: los árboles, las casas, los vecinos y los muebles dejan sombra en el suelo, y se mueve con el sol.',
      'De noche la luna también da sombras suaves, con una luz fría y azulada.',
      'El cielo ilumina la isla con su color: azul de día, dorado al atardecer, azul marino de noche. El suelo devuelve luz cálida.',
      'Tus ojos se acostumbran a la oscuridad: en una cueva o de noche todo se aclara poco a poco, y al salir al sol vuelve a lo normal.',
      'Las antorchas titilan como una llama, y sus brillos ya no se queman en blanco.',
      'Opciones › Calidad: Media y Alta tienen sombras; Baja no, para que el móvil vaya fluido.',
    ],
  },
  {
    version: '3.1',
    title: 'Luz suave',
    items: [
      'La luz del sol entra de verdad en las cuevas: la entrada se va oscureciendo poco a poco, sin cortes de golpe.',
      'Luz suave en las esquinas de cada bloque, como en Minecraft: paredes y techos pasan de la luz a la sombra sin escalones.',
      'Bajo un tejado o un porche hay sombra, pero las casas nunca quedan negras.',
      'Lo que cae al suelo y lo que llevas en la mano se ven oscuros en una cueva y brillan junto a una antorcha.',
      'Lo más oscuro de una cueva tiene un tono azulado en vez de negro.',
    ],
  },
  {
    version: '3.0',
    title: 'Maxycraft 3',
    items: [
      '¡Maxycraft 3! Islas grandes, vecinos nuevos, luz de verdad, casas que construyes tú y partidas con amigos.',
      'Viajes en grupo: si quien invita vuela en avioneta, todos sus amigos van con él a la isla misteriosa, y vuelven juntos.',
      'Si se corta la conexión, el juego vuelve a entrar solo en la isla de tu amigo.',
      'Los nombres de tus amigos se ven desde lejos, y junto a las bayas ves cuántos sois y el código de la isla.',
      'Al llegar de visita apareces al lado de quien te invita.',
      'La isla se dibuja más deprisa y poco a poco, sin tirones al caminar por islas grandes.',
      'Página del proyecto renovada, con capturas de todo lo nuevo.',
    ],
  },
  {
    version: '2.11',
    title: 'Jugar con amigos',
    items: [
      'Menú › Jugar con amigos: abre tu isla y pasa el código de seis letras (o el enlace) a tus amigos.',
      'Hasta 6 jugadores, cada uno en su ordenador y sin servidor: la isla vive en el ordenador de quien invita.',
      'Os veis andar, construir, romper y poner muebles a la vez, también carteles.',
      'Chat con Intro, gestos con la G (saludar, reír, corazón…) y clic derecho a un amigo para regalarle lo que llevas en la mano.',
      'De visita llevas tus bolsillos, tus bayas y tu enciclopedia, y vuelven contigo a tu isla.',
    ],
  },
  {
    version: '2.10',
    title: 'Casas para vecinos nuevos',
    items: [
      'Compra un plano de casa en la tienda y úsalo en el suelo para marcar un solar: la puerta mira hacia ti.',
      'Unos bloques fantasma te enseñan dónde va cada pared, la puerta y el tejado. Valen ladrillos, piedra, madera, cristal…',
      'Arriba ves cuántos bloques faltan. Si te equivocas, usa otra vez el plano en el solar para quitarlo.',
      'Una casa terminada se queda libre: ve a una isla misteriosa e invita a quien quieras que viva en ella.',
      'Ya no se construyen casas solas: sin una casa libre, los vecinos de vacaciones no pueden mudarse.',
    ],
  },
  {
    version: '2.9',
    title: 'Islas misteriosas nuevas',
    items: [
      'Las islas misteriosas son más grandes y hay cuatro nuevas: volcán, cristales, nieve y setas gigantes.',
      'El volcán tiene ríos de magma que brillan de noche; la isla de cristal, agujas de amatista.',
      'Bloques nuevos para llevarte: basalto, roca de magma, cristales, hielo, setas y amatista.',
      'Cada isla atrae a sus vecinos favoritos: pingüinos en la nieve, ranas entre las setas…',
    ],
  },
  {
    version: '2.8',
    title: 'Calles y decoración',
    items: [
      'Caminos de tierra y de losas, calles empedradas y baldosas: se ponen en lugar del suelo, a ras.',
      'Farolas que alumbran de verdad la calle, como las lámparas, los faroles y las calabazas.',
      'Fuente de la plaza, papelera, buzón, macetero y carteles en los que puedes escribir (clic derecho).',
      'Todas sus recetas se saben desde el principio en la mesa de trabajo.',
      'En las islas nuevas, la tienda y el museo ya tienen farolas en la puerta.',
    ],
  },
  {
    version: '2.7',
    title: 'Vecinos con personalidad',
    items: [
      'Vecinos rediseñados: más monos, con ojos que parpadean, colas, hocicos y orejas de su especie.',
      '14 personajes nuevos y 6 especies nuevas: oveja, cerdo, pingüino, koala, zorro y elefante.',
      'Dos personalidades nuevas, deportista y dulce, cada una con sus charlas.',
      'Pregúntales "Háblame de ti" para saber su afición, su cumpleaños y lo que les gusta.',
      'Álbum de vecinos en la enciclopedia (C): cada personaje con el que hablas, con su retrato.',
      'Los personajes nuevos aparecen al azar de vacaciones en las islas misteriosas.',
    ],
  },
  {
    version: '2.6',
    title: 'Islas grandes y biomas',
    items: [
      'Las islas nuevas son mucho más grandes y tienen biomas: bosque, pradera de flores, bambú y montaña.',
      'En la montaña hay acantilados de roca, pinos, pedruscos y nieve en las cumbres.',
      'El río baja de terraza en terraza: donde el agua de arriba cae sobre la de abajo hay una cascada.',
      'Pinos nuevos: al talarlos sueltan brotes de pino para replantarlos.',
      'Tu isla guardada no cambia; para ver todo esto, empieza una isla nueva en "Mis islas".',
    ],
  },
  {
    version: '2.5',
    title: 'Luz nueva y dos manos',
    items: [
      'La luz de antorchas y bloques de luz ya no atraviesa paredes, y es cálida.',
      'Nada se queda negro del todo: en cuevas y de noche siempre se ve un poco.',
      'Otra mano: con la Q pasas lo de la casilla elegida a la mano izquierda (también tocando la casilla de la mano).',
      'Una antorcha o un bloque de luz en cualquier mano te alumbra alrededor.',
    ],
  },
  {
    version: '2.4',
    title: 'Cofres y días de juego',
    items: [
      'Cajas, cofres y baúles para guardar cosas (en la mesa de trabajo). Clic derecho para abrirlos.',
      'El día de la isla dura 24 minutos y cada estación, una semana de juego. El tiempo solo pasa mientras juegas.',
      'En Opciones → Duración del día puedes elegir 12, 24 o 48 minutos, o la hora real como antes.',
      'Cada día nuevo hay conchas, botella y tienda nuevas, y las fiestas siguen llegando.',
    ],
  },
  {
    version: '2.3',
    title: 'Más bloques y menús ordenados',
    items: [
      'Ladrillo, adoquín, piedra pulida, cristal, tablones de palmera y bloque de luz.',
      'Losas y escaleras de madera, adoquín y ladrillo: se suben andando, sin saltar.',
      'Recetas por grupos, con buscador, favoritas (★) y "solo lo que puedo fabricar".',
      'Botón Ordenar en los bolsillos: agrupa y junta los montones de la mochila.',
    ],
  },
  {
    version: '2.2',
    title: 'Árboles, vallas y puertas',
    items: [
      'Al cortar el tronco cae el árbol entero: madera, fruta y un brote para replantarlo.',
      'Brotes de manzano, naranjo, peral, melocotonero, cerezo y palmera (se fabrican con su fruta). Crecen en dos días.',
      'Puertas para casas y puertas de valla, en la mesa de trabajo. Se abren y cierran con clic derecho.',
      'Ni tú ni los animales ni los vecinos podéis saltar las vallas.',
    ],
  },
  {
    version: '2.1',
    title: 'Preparados para jugar juntos',
    items: [
      'Por dentro, cada cambio de la isla ya es un mensaje que se puede enviar a otros jugadores.',
      'Prueba temprana: abre el juego en dos pestañas con ?pruebared=anfitrion y ?pruebared=invitado y os veréis construir.',
      'Los demás jugadores tienen cuerpo de bloques, color de ropa y su nombre encima.',
      'El multijugador con código para jugar con amigos llega en la versión 2.11.',
    ],
  },
  {
    version: '2.0',
    title: 'Gran actualización',
    items: [
      'Puedes cambiar las teclas en Opciones → Cambiar teclas.',
      'Texto grande y colores para daltonismo en Opciones → Accesibilidad.',
      'Esta pantalla de novedades, que sale sola cuando hay una versión nueva.',
      'Página del proyecto con capturas y un vídeo corto.',
      'Pulido: arreglos pequeños y el juego va más ligero.',
    ],
  },
  {
    version: '1.10',
    title: 'Misiones y estrellas',
    items: [
      'Tres tareas nuevas cada día (tecla T) que dan puntos.',
      'Premios: billetes, minerales, la fuente y el trofeo de oro.',
      '17 logros y la valoración de la isla de 1 a 5 estrellas.',
    ],
  },
  {
    version: '1.9',
    title: 'Islas misteriosas',
    items: [
      'Plumas, el piloto, te lleva en avioneta a islas misteriosas con un billete.',
      'Islas de frutales, de flores, de bambú o de rocas con minerales.',
      'Conoce vecinos de vacaciones e invítalos a vivir en tu isla.',
    ],
  },
  {
    version: '1.8',
    title: 'Huerto y granja',
    items: [
      'Labra con la pala, planta trigo, zanahorias o tomates y riégalos.',
      'Gallinas y vacas que dan huevos y leche cada día.',
      'Cocina pan, tortilla, sopa y pastel.',
    ],
  },
  {
    version: '1.7',
    title: 'Arte y sonido',
    items: ['Ves lo que llevas en la mano.', 'Música distinta en cada estación y pasos según el suelo.'],
  },
  {
    version: '1.6',
    title: 'Mundo vivo',
    items: ['Bosquecillos de bambú, praderas de flores y cascadas.', 'Viento, pájaros y gaviotas.'],
  },
  {
    version: '1.5',
    title: 'Luz, agua y cielo',
    items: ['Cielo con degradado y atardeceres naranjas.', 'Agua con olas y brillos, y nubes nuevas.'],
  },
  {
    version: '1.4',
    title: 'App instalable',
    items: ['Se instala en el móvil y el ordenador y funciona sin internet.'],
  },
  {
    version: '1.3',
    title: 'Partidas seguras',
    items: ['Hasta tres islas y copias de seguridad para guardar en un archivo.'],
  },
  {
    version: '1.2',
    title: 'Portada y opciones',
    items: ['Portada nueva y opciones de sonido, ratón, calidad y vista.'],
  },
  {
    version: '1.1',
    title: 'Bases sólidas',
    items: ['Pruebas automáticas para que nada se rompa al mejorar el juego.'],
  },
  {
    version: '1.0',
    title: 'Primeros pasos',
    items: [
      'Una lista de primeros pasos que se tacha sola mientras juegas, con premio al terminarla.',
      'Música, sonidos de pasos, voces de los vecinos y efectos.',
      'Controles táctiles para jugar en el móvil y la tableta.',
      'Las ventanas caben en pantallas pequeñas.',
    ],
  },
  {
    version: '0.10',
    title: 'Estaciones',
    items: [
      'Primavera, verano, otoño e invierno, con colores distintos en la hierba y los árboles.',
      'Lluvia y nieve.',
      'Fiestas: Año Nuevo, San Valentín, Halloween, Navidad y Nochevieja.',
      'Los vecinos celebran su cumpleaños.',
    ],
  },
  {
    version: '0.9',
    title: 'Mesa de trabajo',
    items: [
      'Mesa de trabajo para fabricar muebles, vallas y herramientas de hierro.',
      'Recetas que se aprenden de los vecinos y de las botellas que trae el mar.',
    ],
  },
  {
    version: '0.8',
    title: 'Mi casa',
    items: [
      'Tu propia parcela, empezando en una tienda de campaña.',
      'Avellana te hace una casa de verdad y se la pagas poco a poco, sin intereses. Luego se puede ampliar.',
      'Muebles para decorarla: cama, mesa, sofá, lámpara…',
    ],
  },
  {
    version: '0.7',
    title: 'Cuevas y minerales',
    items: [
      'Cuevas bajo tierra, oscuras de verdad.',
      'Antorchas para alumbrarlas.',
      'Carbón, hierro, oro y amatista, más escondidos cuanto más hondo.',
    ],
  },
  {
    version: '0.6',
    title: 'Bichos y peces',
    items: [
      'Caña de pescar y red para insectos.',
      'Peces de mar y de río e insectos, cada uno con su sitio y su horario.',
      'Enciclopedia (C) y museo con Matilde la tortuga para donarlos.',
    ],
  },
  {
    version: '0.5',
    title: 'Bayas y tienda',
    items: [
      'Las bayas, el dinero de la isla.',
      'La tienda de Avellana la ardilla, abierta de 8:00 a 22:00, con precios que cambian cada día.',
    ],
  },
  {
    version: '0.4',
    title: 'Vecinos',
    items: [
      'Vecinos hechos de bloques, cada uno con su casa, su personalidad y su coletilla.',
      'Pasean de día y duermen de noche.',
      'Charlas, regalos y amistad.',
    ],
  },
  {
    version: '0.3',
    title: 'Bolsillos y herramientas',
    items: [
      'Bolsillos para llevar cosas y fabricar.',
      'Hacha, pala y pico que se gastan con el uso.',
      'Sacude los árboles para que caiga fruta y alguna rama. Cada día hay conchas nuevas en la playa.',
    ],
  },
  {
    version: '0.2',
    title: 'La isla',
    items: [
      'Una isla de verdad con playa, río, mar para nadar, frutales, palmeras y flores.',
      'Día y noche con sol, luna y estrellas.',
      'La partida se guarda sola.',
    ],
  },
  {
    version: '0.1',
    title: 'Primer bloque',
    items: ['El comienzo: un mundo de bloques en el navegador donde andar, romper y colocar.'],
  },
];

const SEEN_KEY = 'maxycraft.novedades';

/** Compara versiones tipo "1.10" y "1.9" por sus números. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

/** Si hay novedades que todavía no se han visto en este navegador. Quien juega por primera vez no las ve. */
export function hasUnseenNews(hasSave: boolean): boolean {
  try {
    const seen = localStorage.getItem(SEEN_KEY);
    if (!seen) return hasSave;
    return compareVersions(CHANGELOG[0].version, seen) > 0;
  } catch {
    return false;
  }
}

export function markNewsSeen() {
  try {
    localStorage.setItem(SEEN_KEY, CHANGELOG[0].version);
  } catch {
    // sin almacenamiento se volverían a enseñar; no pasa nada
  }
}
