/** Novedades de cada versión, de la más nueva a la más antigua, para enseñarlas dentro del juego. */
export interface Release {
  version: string;
  title: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '5.4',
    title: 'Cada pez y cada insecto, con su forma',
    items: [
      'Los 40 peces y los 9 insectos tienen dibujo propio: ya no son el mismo pez pintado de otro color. El pez espada lleva su espada, el pez vela su vela, el tiburón martillo su cabeza de martillo, el rape su farolillo, el pez globo sus pinchos, el atún sus aletas amarillas, el pez payaso sus rayas blancas…',
      'Cada uno con su cola (en horquilla, redonda, de media luna, de velo…), sus aletas, sus bigotes o sus dientes, y su dibujo en la piel: manchas, rayas, motas o escamas que brillan.',
      'Los insectos también: la mariposa blanca y la azul tienen alas distintas, la mariquita sus puntos, el escarabajo rinoceronte su cuerno, el grillo sus patas largas y la luciérnaga su colita que brilla.',
      'En el mundo, en el museo y en la mano ya no son dibujos planos: son figuras de cubitos en 3D, más gorditas por el centro. Las mariposas, la libélula y la luciérnaga baten las alas, los insectos miran hacia donde van, el grillo da saltitos y los peces del acuario se dan la vuelta al llegar al cristal.',
      'Lo que brilla (la luciérnaga, el pez linterna, el pez luminoso, el pez brasa y el farolillo del rape) se sigue viendo de noche.',
    ],
  },
  {
    version: '5.3.1',
    title: 'Más fluido',
    items: [
      'El juego va mucho más suelto desde la 5.1: los vecinos de las otras islas hacían que se volvieran a preparar trozos de isla lejanos decenas de veces por segundo. Ahora se preparan una vez y se guardan.',
      'Los muebles se dibujan de una vez en lugar de pieza a pieza: el museo nuevo, la tienda y las casas de las aldeas cuestan una sexta parte que antes. Se ven exactamente igual, con su luz de antorchas y sus sombras.',
      'Los vecinos que quedan tan lejos que la niebla los tapa del todo ya no se dibujan.',
    ],
  },
  {
    version: '5.3',
    title: 'Terminal, astillero, barcos y avioneta nuevos',
    items: [
      'La terminal es nueva: suelo de baldosas, ventanales hacia el mar, tejado de teja azul a dos aguas, un porche con bancos para ver el mar, lámparas colgantes y un mostrador bajo con caja donde se ve bien a Plumas. Al final del muelle, un faro de piedra con salvavidas y manga de viento.',
      'El astillero también: el taller tiene zócalo de piedra y tejado de teja, la grada está bajo un cobertizo de troncos con tejado rojo y la grúa sujeta una caja. Hay barriles, cuerdas, un ancla, un timón en la pared y el puesto de Brújula con su toldo.',
      'Los barcos tienen casco con forma (se estrecha hacia la proa), quilla, franja de color, botalón, velas triangulares que giran con el viento y jarcias. El barco de expedición lleva dos mástiles, cofa, camarote con ventanas y salvavidas, y rueda de timón.',
      'La avioneta está redondeada: capó con hélice de dos palas, cabina de cristal, puerta, ala con luces de posición y puntales, cola con timón a rayas y flotadores afilados.',
      'Muebles nuevos: maletas, salvavidas, manga de viento, rollo de cuerda, ancla, timón de pared y puesto del muelle.',
      'Todo esto sale también en las islas que ya tenías: la terminal y el astillero se rehacen solos al entrar, en la etapa en la que estuvieran.',
    ],
  },
  {
    version: '5.2',
    title: 'Edificios nuevos por dentro y por fuera',
    items: [
      'Las casas de los vecinos son más grandes (7×7), con tejado a dos aguas y amuebladas: cocina, fregadero, nevera, mesa con sillas, estantería, cuadro y su cama con mesita. Siguen quedando huecos para los muebles que les regales.',
      'Te puedes sentar en sillas, sofás, bancos, tumbonas y mecedoras con clic derecho. Para levantarte, salta o vuelve a hacer clic derecho.',
      'Museo nuevo de dos plantas: entrada con columnas, escalera principal, sala de fósiles, insectario con terrarios, acuario con paredes de peceras y una terraza arriba con catalejo. Cada pez va en su pecera y cada bicho en su terrario, sin montar bloques.',
      'Tienda nueva: mostrador bajo con caja registradora (ahora se ve a Avellana), mesas expositoras, cestas, escaparate y un altillo bajo el tejado a dos aguas donde duerme.',
      'El ayuntamiento y los comercios tienen tejados a dos aguas, lámparas colgantes y muebles propios de cada oficio (sacos, yunque, máquina de coser, banco de carpintero…).',
      'Muebles nuevos: pecera, terrario, vitrina, pedestal, panel informativo, cordón, lámpara de techo, cocina, fregadero, nevera, mesita, cuadro, escritorio, atril, tablón y más.',
      'Bloques nuevos: escaleras y losas de teja en los cuatro colores y escalera de piedra pulida.',
      'La isla es más grande y los islotes, el doble. Todo esto sale en las islas nuevas (Mis islas → isla nueva); las islas que ya tenías se quedan como estaban.',
    ],
  },
  {
    version: '5.1',
    title: 'Navegar sin pantallas de carga y aldeas de verdad',
    items: [
      'Las nueve islas del archipiélago están ahora en el mismo mar que la tuya: aléjate en barco y las verás aparecer en el horizonte. Se llega navegando, sin pantallas de carga, y lo que cambies en ellas se queda guardado.',
      'La carta náutica dibuja las islas a escala y marca dónde vas. Si te alejas más de lo que aguanta tu barco, el mar se pone bravo y da media vuelta.',
      'Las islas aldea son pueblos de verdad: plaza empedrada con el puesto del mercado, casitas con tejados de colores, caminos de losas, farolas y flores. Los vecinos viven en sus casas y se van a dormir a ellas, así que ya no aparecen y desaparecen al acercarte o al mirarlos.',
      'Todo lo que hay en los pueblos se puede conseguir: el toldo del mercado se fabrica con 2 de lana y 2 ramas; lo demás ya se compraba o se fabricaba.',
      'Los vecinos que se quedaban metidos dentro de un árbol o de una pared salen solos a una casilla libre.',
      'La balsa y los barcos flotan por encima del agua en vez de ir medio hundidos.',
      'Los delfines nadan a un lado del barco, a unos metros, saltan de vez en cuando (sin volar) y al rato se despiden.',
      'Al arreglar el astillero aparece la casa de Bartolo y Brújula detrás de él, y al cerrar se van andando a dormir allí.',
      'Modo tester: escribe /tester en el chat (Enter) para encenderlo y /ayuda para ver los comandos: bayas, objetos, hora, tiempo, curarte, recetas, astillero, barcos, ir a cualquier isla y descubrir la carta.',
      'La wiki tiene capturas en casi todas las secciones (se ven en grande al pulsarlas) y una sección del modo tester.',
    ],
  },
  {
    version: '5.0.2',
    title: 'Arreglo de los viajes',
    items: ['Se vuelve a poder viajar en avioneta y en barco: con la 5.0.1 al despegar te quedabas en tu isla.'],
  },
  {
    version: '5.0.1',
    title: 'Primeros arreglos de Maxycraft 5',
    items: [
      'Tirar cosas: arrastra un objeto fuera de los bolsillos (o del cofre) y cae al suelo delante de ti. También con la tecla X (con Ctrl, el montón entero).',
      'Cofres, baúles y cajas: lleva cada objeto a la casilla que quieras con clic o arrastrando; Mayús + clic lo pasa de golpe al otro lado.',
      'Casi todo lo que se amontona (fruta, peces, recursos, muebles de calle...) llega ahora a 64 por casilla.',
      'Los números se leen mucho mejor (cantidades, hora, bayas), con la misma letra pixelada.',
      'Esc cierra los bolsillos, las tiendas y cualquier ventana y vuelve al juego sin pasar por el menú. Jugando, Esc abre el menú.',
      'La terminal de Plumas ya no sale hundida en la tierra: se levanta a ras de la playa (también en las islas de antes).',
      'Los islotes son mucho más grandes, para construir en ellos. Los puentes se hacen a mano: el alcalde ya no los encarga, y los tablones, la barandilla y los pilares se fabrican o se compran siempre en la tienda.',
      'La lluvia cae en gotas alargadas y suena más suave; bajo techo se oye amortiguada, como desde casa. La nieve ya no se va contigo al andar y gasta menos.',
      'Las antorchas puestas en una pared se ven clavadas en diagonal.',
      'Los animales, los vecinos, las criaturas, los muebles y lo que hay en el suelo se iluminan con las antorchas (y con la que llevas en la mano), también de noche y en sitios oscuros.',
      'Los tenderos ya no desaparecen al cerrar: se van andando a su cama de la trastienda y vuelven por la mañana.',
      'Al llegar en avioneta (o en barco) ya estás en la isla al acabar la pantalla de carga, sin pasar por el menú.',
    ],
  },
  {
    version: '5.0',
    title: 'Maxycraft 5: la gran actualización del archipiélago',
    items: [
      'Todo lo de la 4.5 a la 4.26 junto: astillero y barco, archipiélago de nueve islas, biomas y climas, lava, comercios, parcelas, fauna, armas, mazmorras y una economía equilibrada.',
      'Guía del pueblo y del mar: al terminar los primeros pasos, una segunda lista te enseña el ayuntamiento, la parcela, el astillero, a navegar, el mercado de las aldeas y las mazmorras. Al completarla, Bartolo te regala 5.000 bayas.',
      'Pruebas largas de juego en ordenador y móvil, midiendo los fotogramas y la memoria, y repaso del multijugador con cuatro jugadores: el astillero, el barco, los comercios y las parcelas se ven igual para todos.',
      'Web del proyecto renovada: portada con vídeo del barco y el archipiélago, capturas nuevas y la wiki completa.',
    ],
  },
  {
    version: '4.26',
    title: 'Balance económico global',
    items: [
      'Precios repasados objeto a objeto: lo fabricado vale al menos sus materiales (las herramientas de hierro, el reloj o la farola pagan ahora lo que cuestan), pero no se puede comprar, fabricar y vender ganando.',
      'Lo que traes de islas de otro clima, o de las islas del mar, se paga un 30 % más en las tiendas de tu isla.',
      'Cada isla tiene su propio mercado: si vendes mucho de lo mismo baja su precio solo allí, y se recupera con los días.',
      'En las islas aldea hay un mercado: vende barato lo de su clima y compra caro lo que allí no tienen.',
      'El trigo, la zanahoria, el tomate y el señuelo pagan más; el bloque de amatista paga como el objeto épico que es. El velero cuesta 15.000 bayas.',
      'Simulador de 60 días con cuatro formas de jugar (pescador, minero, granjero y explorador): todas llegan a la parcela grande, al velero y al ayuntamiento en tiempos parecidos. Lo tienes en la wiki, en «Economía».',
    ],
  },
  {
    version: '4.25',
    title: 'Mazmorras y ruinas',
    items: [
      'Bajo las islas de recursos y las misteriosas hay una mazmorra, distinta en cada visita: entrada, pasillo, sala de trampas, sala del puzle, sala del jefe y tesoro.',
      'Cuatro temas: catacumbas de piedra, templo de arenisca, cueva helada y fragua volcánica, cada uno con su jefe (rey esqueleto, gran limo dorado, gólem de hielo y gólem de magma). Los jefes avisan antes de cada ataque.',
      'Trampas de pinchos, placas que disparan flechas y suelo que se hunde; puzle de palancas de colores con una pista en un cartel.',
      'Ruinas en la superficie: un templo con la escalera de caracol que baja a la mazmorra y una torre caída con un cofre y una pista.',
      'El tesoro trae materiales valiosos, fósiles y siempre algo legendario que aún no tengas, como la espada estelar o el arco lunar.',
    ],
  },
  {
    version: '4.24',
    title: 'Armas y criaturas hostiles',
    items: [
      'Espadas de madera, piedra, hierro, cristal y obsidiana, arco con flechas y escudos de madera y de hierro, con su daño y sus usos en la ficha.',
      'Combate sencillo: golpe, golpe cargado (mantén el clic), esquiva hacia atrás y bloqueo con el escudo en la otra mano.',
      'Criaturas hostiles lejos de casa: limos que se parten en dos, murciélagos de cueva, esqueletos que disparan flechas, gólems de lava y espíritus brillantes del bosque bioluminiscente.',
      'Al vencerlas sueltan botín según su rareza, desde baba de limo hasta la corona de limo legendaria. Si te vencen, despiertas en la entrada sin perder nada.',
      'Tu isla y las islas aldea siguen siendo pacíficas, y con el nuevo modo tranquilo (Opciones) no sale ninguna criatura hostil.',
    ],
  },
  {
    version: '4.23',
    title: 'Fauna, mar y pesca',
    items: [
      'Cuarenta peces: nuevos en el mar y el río, peces de alta mar que solo se pescan desde el barco (pez espada, marlín azul, calamar gigante…) y peces de cada clima, como la piraña en la selva o la carpa koi en los cerezos.',
      'Minijuego de pesca: cuando pica, recoge el sedal a tirones sin que se rompa el hilo. Los peces grandes pelean más. Antes de picar se ve la sombra del pez.',
      'Cañas de hierro, cristal y legendaria (pican antes y aguantan más), y señuelos que atraen a los peces raros. Pesca en el hielo por un agujero.',
      'Cada pez sale con su tamaño: el más grande de cada especie queda como récord en la enciclopedia. Cada especie se agota en una zona tras tres capturas y vuelve al día siguiente.',
      'Fauna salvaje según el bioma (ciervos, zorros, camellos, pingüinos, osos polares, búhos de noche…) y vida marina: delfines que saltan junto al barco, tortugas y cangrejos en la playa, medusas que brillan de noche, rayas y alguna ballena a lo lejos.',
    ],
  },
  {
    version: '4.22',
    title: 'Archipiélago navegable',
    items: [
      'Alrededor de tu isla hay nueve islas a las que se llega navegando: pon rumbo hacia una y, al alejarte de casa, llegas a su playa en tu barco.',
      'Tres tipos de isla: aldeas con vecinos que charlan y alguien a quien invitar, islas de recursos que cambian cada tres días y una sola isla misteriosa, muy lejos.',
      'Las islas lejanas piden un barco mejor: la balsa llega a las cercanas, el velero a las lejanas y el barco de expedición a todas.',
      'La carta náutica enseña el mar: las islas visitadas con su nombre y las demás tapadas por la niebla.',
      'Para volver, navega lejos de la isla. A veces Plumas está de paso y te lleva en avioneta: el barco vuelve solo al muelle con su bodega.',
    ],
  },
  {
    version: '4.21',
    title: 'Astillero y barco propio',
    items: [
      'En la playa del otro lado de la isla hay unas ruinas de astillero. Bartolo, una morsa carpintera de ribera, lo arregla en cuatro etapas si le llevas materiales: escombros limpios, grada de madera, taller y grúa.',
      'Tu propio barco: balsa, velero o barco de expedición. Súbete con clic derecho, llévalo con las teclas de andar (o la palanca en el móvil) y bájate saltando cerca de la orilla.',
      'El viento cambia cada día: a favor el velero corre más. El barco tiene bodega para guardar cosas, y Bartolo le pone mejoras: vela grande, bodega más grande, casco reforzado, farol y litera para dormir a bordo.',
      'Brújula, una nutria, abre un puesto en el muelle con cañas, redes, cebos (los peces pican antes), brújula, catalejo y carta náutica.',
      'El astillero y tu barco salen en el mapa.',
    ],
  },
  {
    version: '4.20',
    title: 'Biomas extraños y lava',
    items: [
      'Nuevo clima de isla: «Extraña», con tres biomas que no existen en ningún otro sitio: el bosque bioluminiscente, las tierras volcánicas y el bosque de setas gigantes.',
      'La lava ya es de verdad: corre como el agua pero más despacio y menos lejos, alumbra, quema plantas y madera y hace mucho daño si te metes.',
      'Lava y agua: al tocarse, la lava se enfría y se vuelve lava petrificada (u obsidiana si era una fuente), con su chisporroteo.',
      'Cubo de lava, y botas ignífugas en la caseta de Grava: con ellas la roca de magma no quema y la lava quema la mitad.',
      'Bloques nuevos: obsidiana, roca negra, pizarra, ceniza, hierba azul, micelio, flores y setas luminosas, sombreros de seta azules y morados. Y para construir: ladrillo de basalto, pizarra pulida, obsidiana tallada y lámpara de seta.',
      'Cada bioma extraño tiene su aire: lucecitas flotando, ceniza que cae con el cielo rojizo y esporas.',
    ],
  },
  {
    version: '4.19',
    title: 'Cálidos, templados y fríos',
    items: [
      'Las islas nuevas eligen su clima en «Mis islas»: templada, cálida o fría. Las que ya tenías siguen igual.',
      'Diez biomas nuevos: pantano y bosque de cerezos (templada), desierto, sabana, selva y cañón (cálida), taiga, tundra, glaciar y picos nevados (fría).',
      'Cinco árboles nuevos con su brote: acacia, ceiba con lianas, cerezo en flor, sauce llorón y abeto nevado.',
      'Bloques nuevos: arena roja, arenisca, terracota de colores, barro, musgo, nieve en polvo, hielo compacto y hielo azul. Y plantas: cactus (con flor), arbustos secos, nenúfares y flores de nieve.',
      'Cada bioma tiene su aire: tormentas de arena en el desierto, ventiscas en el glaciar, bruma en el pantano y ríos helados en el frío.',
    ],
  },
  {
    version: '4.18',
    title: 'Moda, muebles y cosméticos',
    items: [
      '¡Ya te puedes vestir! 45 prendas en seis huecos (cabeza, cara, cuerpo, espalda, piernas y pies), de varios colores. Clic derecho con una prenda en la mano para ponértela.',
      'Armario y espejo de pie: te ves dando vueltas, te cambias y guardas hasta tres conjuntos.',
      'Tus amigos te ven con tu ropa en las partidas juntos.',
      'Tres comercios nuevos: la boutique de Seda (alpaca) con probador, la nave de muebles de Serrín (mapache) con catálogo que cambia cada día y el taller de Baldosa (jirafa) con farolas, bancos, jardineras, pérgolas y señales.',
      '17 muebles nuevos de todos los estilos: cama con dosel, piano, chimenea, tumbona, sombrilla, puf, mecedora…',
      'Prendas legendarias que solo salen cavando en las islas misteriosas.',
    ],
  },
  {
    version: '4.17',
    title: 'Oficios del campo y la mina',
    items: [
      'Tres comercios nuevos, cada uno en su edificio cerca del ayuntamiento: el invernadero de Espiga (cabra), el granero de Heno (caballo) y la caseta de la mina de Grava (topo). Abren cuando la isla crece y salen en el mapa.',
      'Espiga vende semillas, brotes, abono y la regadera de cobre, que riega nueve plantas de una vez. El abono hace crecer una planta un día de golpe.',
      'Heno vende gallinas, vacas, ovejas, pienso y vallas. Las ovejas dan lana cada día y con pienso los animales vuelven a dar lo suyo.',
      'Grava vende herramientas de cristal (las que más duran) y arregla las herramientas gastadas.',
      'Cada comercio tiene su horario, paga mejor lo suyo y tiene una oferta del día.',
    ],
  },
  {
    version: '4.16',
    title: 'La tienda nueva y la terminal',
    items: [
      'La tienda es ahora un edificio de dos plantas con toldo de rayas, escaparate que cambia con la estación, mostrador con caja registradora y estanterías donde se ve lo que hay hoy a la venta. También en las islas de antes.',
      'Avellana vive arriba: atiende detrás del mostrador y de noche sube a dormir a su casa.',
      'La tienda crece con lo que gastas: con 20.000 bayas pasa a Tienda grande y con 80.000 a Gran almacén, que abre la sala de muebles de arriba. Cada nivel vende más muebles y cosas al día.',
      'La avioneta tiene terminal: sala de espera con bancos, panel de salidas, báscula de equipaje y el mostrador de Plumas, y un muelle con un faro pequeño donde queda amarrada.',
      'Al volver de un viaje la avioneta llega volando y amariza junto al muelle.',
    ],
  },
  {
    version: '4.15',
    title: 'Museo de cuatro plantas',
    items: [
      'El museo es ahora un edificio de piedra de cuatro plantas con porche y columnas, también en las islas de antes. Matilde te recibe dentro.',
      'Lo que donas se ve: los fósiles en pedestales, los peces nadando en el acuario de la primera planta y los insectos revoloteando en el insectario de la segunda. Clic derecho en una pieza para leer su ficha.',
      'Las plantas de arriba se abren al donar: el acuario con 3 donaciones, el insectario con 8 y la terraza mirador con cúpula de cristal con 15.',
      'Fósiles nuevos: amonites, trilobites, diente de megalodón y las tres piezas del dinosaurio. Salen a veces al cavar tierra, arena o piedra, más en las islas misteriosas. Con las tres piezas se arma el esqueleto en el centro de la sala.',
      'La enciclopedia tiene una página nueva de fósiles.',
    ],
  },
  {
    version: '4.14',
    title: 'Parcelas, hogar e invitados',
    items: [
      'Empiezas con tu parcela, «Tu hogar»: un terreno de 9×9 gratis donde solo construyes tú y quien tú dejes. Al llevar bloques o muebles en la mano ves su borde en el suelo.',
      'Ladrillo, el urbanista, está desde la caseta de obras y la amplía hasta 31×31, te vende el permiso de mudanza para llevártela entera a otro sitio (con la casa, los muebles, los cofres y el huerto) y mejoras: cartel con tu nombre, buzón con carta diaria y huerto que se riega solo.',
      'Partidas de antes: tu casa pasa a ser tu parcela con el tamaño que tenía y lo que quedaba por pagar a Avellana se perdona.',
      'Los amigos llegan como invitados: recogen y ayudan, pero no construyen. Con el permiso de tienda de campaña pasan a residentes con su parcela, que luego pueden ampliar.',
      'Nadie rompe ni construye en tu parcela sin permiso. En Jugar con amigos ves quién es anfitrión, residente o invitado, y a quién dejas construir.',
    ],
  },
  {
    version: '4.13',
    title: 'Ayuntamiento, alcalde y urbanista',
    items: [
      'Cada isla tiene ayuntamiento cerca de la plaza, también las de antes. Empieza siendo una caseta de obras y se mejora en 4 niveles: oficina, ayuntamiento y ayuntamiento con plaza y reloj.',
      'Don Gregorio, el alcalde (un búho que nunca duerme), te da la valoración de la isla, lleva el tablón de avisos con cumpleaños y fiestas y encarga obras públicas: fuente, farolas, bancos y puentes.',
      'Alrededor de la isla hay de 2 a 4 islotes. Encarga un puente al alcalde o hazlo tú con los bloques nuevos: tablones de puente, barandilla y pilares.',
      'Con la oficina llega Ladrillo, el urbanista, que vende los planos de casa para vecinos nuevos.',
      'Desde el nivel Ayuntamiento eliges el nombre de la isla y el color de su bandera.',
      'En algunas islas de antes la tienda o el museo no tenían camino desde la plaza: ahora se hacen solas rampas y pasarelas para llegar andando.',
    ],
  },
  {
    version: '4.12',
    title: 'Casas de vecinos decorables',
    items: [
      'Si le regalas un mueble a un vecino, lo pone en su casa al momento. Entra a verlo.',
      'Cada vecino tiene su estilo de decoración: rústico, moderno, playero, elegante o mono. Si el mueble es de su estilo le hace mucha ilusión y sube más la amistad.',
      'Niveles de amistad con nombre: conocido, colega, amigo, gran amigo y mejor amigo. Al subir de nivel te avisa de lo que trae.',
      'Siendo amigos te deja decorar su casa: girar y cambiar de sitio sus muebles desde la charla, o girarlos con la R dentro de su casa.',
      'Con más amistad amplía su casita a casa con jardín, y luego a casa grande con el tejado del color que elijas. Los mejores amigos te cuentan qué negocio sueñan con abrir.',
      'El álbum de vecinos enseña vuestro nivel de amistad y su estilo, y la wiki tiene la tabla de niveles y los gustos de cada vecino.',
    ],
  },
  {
    version: '4.11',
    title: 'Vecinos con rutina',
    items: [
      'Los vecinos ya no desaparecen: al anochecer vuelven a casa andando, abren la puerta, entran y se enciende la luz. Al dormirse se apaga y sale un Zzz en la puerta.',
      'Si entras en su casa de noche les ves dormir en su cama. Por la mañana se levantan, se estiran y salen por la puerta.',
      'Si llamas a su puerta o les hablas mientras duermen, contestan medio dormidos, cada uno según su personalidad.',
      'Se paran a charlar entre ellos, sacan el paraguas cuando llueve (los dormilones prefieren quedarse en casa) y se ponen bufanda con la nieve.',
      'Desde fuera no se ve quién hay dentro de las casas. Jugando con amigos, todos veis al mismo vecino en la misma cama.',
    ],
  },
  {
    version: '4.10',
    title: 'Fichas, rarezas y mapa explorable',
    items: [
      'Cada objeto tiene ficha: pasa el ratón (o mantén el dedo) en los bolsillos, los cofres, la tienda o la mesa de trabajo. Dice qué es, lo que hace, lo que vale, dónde se consigue y una curiosidad.',
      'Rarezas con color: común, raro, épico y legendario. El borde de la casilla lleva el color de su rareza y los legendarios brillan.',
      'La fruta de otras islas es rara; el cristal brillante y la amatista, épicos.',
      'Botones para resaltar un tipo o una rareza en los bolsillos, y filtro por rareza en la enciclopedia.',
      'El mapa grande se acerca con la rueda o pellizcando hasta ver los bloques, se arrastra, tiene botón para centrarte y una leyenda para ocultar tipos de lugar.',
    ],
  },
  {
    version: '4.9',
    title: 'Motor de comercio',
    items: [
      'La tienda tiene ahora pestañas Comprar y Vender y botones para ver solo herramientas, muebles, bloques…',
      'Los muebles del día se acaban (quedan dos de cada) y vuelven por la mañana.',
      'Si vendes mucho de lo mismo, se paga un poco menos durante unos días (como mucho la mitad). Las herramientas no bajan.',
      'Si la tienda está cerrada, la puerta te dice a qué hora vuelve a abrir.',
      'Por dentro: todos los comercios que vienen (museo, granja, ropa, pesca…) salen del mismo molde, con su horario, su especialidad y una tabla de precios común. Avellana vende exactamente lo mismo que antes.',
    ],
  },
  {
    version: '4.8',
    title: 'Vecinos con agenda',
    items: [
      'Cada vecino tiene su día: desayuna en casa, pasea, hace un recado a la tienda, al museo o a la plaza (según el día de la semana), cena en casa y se acuesta. Cada uno a sus horas.',
      'Los vecinos encuentran el camino: rodean árboles, casas y vallas, cruzan puertas, suben escaleras y dan saltitos, y vadean los ríos cuando no hay otro paso.',
      'Jugando con amigos, todos ven a los vecinos en el mismo sitio y haciendo lo mismo.',
      'Por dentro: los edificios ya se pueden describir por plantas, con habitaciones y huecos para muebles, y colocarse en un sitio libre de la isla sin romper nada tuyo. El museo y las tiendas nuevas se harán así.',
    ],
  },
  {
    version: '4.7',
    title: 'Mundo en streaming',
    items: [
      'El dibujo del mundo se hace ahora en un hilo aparte: al caminar, navegar o volar por la isla el juego ya no da tirones al cargar zonas nuevas.',
      'Lo que queda lejos se descarga de la memoria (tus cambios no se pierden nunca) y la isla se ve entera a lo lejos en siluetas, con el mar hasta el horizonte.',
      'Nueva opción Distancia de visión, de 3 a 12 chunks. Al cambiar la calidad gráfica se pone sola la recomendada.',
      'Los bichos tienen límite por zona y tardan un rato en volver donde ya cazaste, para que no se amontonen ni gasten de más.',
      'Panel de rendimiento escondido: abre el juego con ?rendimiento para ver FPS, chunks y memoria.',
    ],
  },
  {
    version: '4.6',
    title: 'Guardado de archipiélago',
    items: [
      'Las islas se guardan ahora en la base de datos del navegador, con muchísimo más sitio: caben tus islas y todas las que visites en el futuro. La primera vez que abres el juego tus partidas se pasan solas, sin perder nada.',
      'Si cierras la pestaña de golpe, el juego guarda una copia rápida y la recupera al volver.',
      'En Mis islas y copias: botón para guardar una copia de todo (tus tres islas en un solo archivo) y para cargarla, y un medidor de cuánto espacio ocupan tus partidas.',
      'Al cambiar de isla, entrar en la de un amigo o volver de viaje, el juego espera a que todo esté guardado antes de recargar.',
    ],
  },
  {
    version: '4.5',
    title: 'Motor sin techo',
    items: [
      'Por dentro, el juego se prepara para crecer mucho: caben miles de tipos de bloque nuevos (antes el tope era 255 y ya se usaban más de 120) y hay sitio para dibujar cientos de bloques y objetos más.',
      'Cada objeto sabe ya qué es (bloque, recurso, consumible, mueble, herramienta, criatura, tesoro…) y lo raro que es: común, raro, épico o legendario. En la wiki de la página del proyecto se ve en la tabla de objetos.',
      'Las partidas guardadas llevan número de formato y se ponen al día solas al abrirlas. Tus islas siguen exactamente igual.',
      'Si un amigo tiene otra versión del juego, ahora os lo dice claro y os pide recargar la página.',
    ],
  },
  {
    version: '4.4',
    title: 'El mapa de la isla',
    items: [
      'Mapa nuevo en la tienda de Avellana (2.500 bayas). Con él en los bolsillos ves un minimapa redondo debajo del reloj.',
      'Con la tecla M (o tocando el minimapa) se abre el mapa grande de toda la isla: casas de los vecinos con su nombre, tienda, museo, avioneta, cuevas, tu casa, las casas de tus amigos y dónde está cada uno.',
      'Lo que construyes aparece en el mapa al poco rato. Funciona también en las islas misteriosas y en la isla de un amigo, y no se pierde al desmayarte.',
      'El sonido pasa a la tecla N (la M es la del mapa).',
    ],
  },
  {
    version: '4.3',
    title: 'Cada amigo con su casa',
    items: [
      'La primera vez que entras en la isla de un amigo tienes tu propia casa: una tienda de campaña con cama y un cartel con tu nombre, en un sitio llano.',
      'Ahí duermes, y ahí despiertas si te desmayas en su isla.',
      'Quien invita recuerda la casa de cada amigo para la próxima vez (hasta 5 casas).',
      'Arreglado: si tardabas mucho en encontrar la isla de un amigo, al entrar el juego creía que se había ido y te devolvía a tu isla.',
    ],
  },
  {
    version: '4.2',
    title: 'Dormir',
    items: [
      'Haz clic derecho en una cama (en el móvil, Usar) y elige a qué hora quieres despertarte, o pon la hora exacta con la barra.',
      'El reloj salta hasta esa hora y te despiertas con la vida llena. Se puede dormir a cualquier hora, también la siesta.',
      'Con amigos: el reloj solo avanza cuando estáis todos en la cama, y os despertáis a la hora más temprana que haya elegido alguien. Mientras, ves cuántos estáis acostados.',
      'Con amigos el reloj de todos se pone en hora con el del anfitrión cada poco, para que nunca vaya distinto.',
    ],
  },
  {
    version: '4.1',
    title: 'Vida y hambre',
    items: [
      'Diez corazones de vida y diez muslitos de hambre encima de la barra rápida, como en Minecraft.',
      'El hambre baja despacio al andar y más deprisa corriendo o saltando. Para comer, lleva comida en la mano y haz clic derecho (en el móvil, Usar).',
      'La fruta, la zanahoria, el tomate y la leche llenan un poco; el pan, la tortilla, la sopa y el pastel, mucho más.',
      'Con la tripa casi llena la vida sube sola. Sin comer pierdes algo de vida, pero de hambre no te desmayas.',
      'Hacen daño las caídas de más de 3 bloques (al agua no), quedarte sin aire bajo el agua (salen burbujas) y pisar roca de magma.',
      'Si te desmayas, despiertas delante de tu casa con la vida llena. Solo pierdes el 10% de las bayas (como mucho 1.000) y la mitad de 3 montones al azar. Las herramientas nunca.',
    ],
  },
  {
    version: '4.0',
    title: 'Arreglos: pájaros, nubes, puertas y ríos',
    items: [
      'Escribir en el chat con amigos ya no mueve a tu personaje.',
      'Las nubes van con el viento y, al dar la vuelta, vuelven con otra forma. Unos días hay pocas y otros el cielo está más cubierto.',
      'Más ramas: con 2 tablones salen 4 ramas, las hojas a veces sueltan una, al talar un árbol caen unas cuantas y al sacudirlo pueden caer dos.',
      'Las casas de los vecinos, la tienda, el museo y tu casa tienen puerta de verdad.',
      'Los pájaros vuelan alto y esquivan árboles, casas y montañas. De vez en cuando bajan a picotear al suelo, y si se acerca alguien (tú, un amigo, un vecino o un animal) se espantan.',
      'Los vecinos se presentan solo con su nombre y te van contando sus cosas poco a poco: su afición, pistas de lo que les gusta y de su cumpleaños, y al final el día exacto. Cuanto más amigos, más te cuentan. Tienen muchas más frases.',
      'El álbum de vecinos solo enseña lo que ya te han contado.',
      'Los ríos solo son hondos por el medio y la playa se hace honda poco a poco.',
    ],
  },
  {
    version: '3.9',
    title: 'Cascadas de verdad, picar con calma y cielo de tormenta',
    items: [
      'Las cascadas del río son agua de verdad: el agua de la terraza de arriba se derrama y cae hasta la de abajo. Ya no hay lámina de cascada pintada.',
      'En las islas de antes, la cascada del acantilado sale de un manantial y cae por la roca.',
      'A mano se rompe muy despacio (5 veces más lento). Con la herramienta adecuada se rompe a la velocidad de antes a mano, y con las de hierro, más rápido.',
      'Con lluvia o nieve el cielo se pone gris y encapotado: no se ven el sol, la luna ni las estrellas, y casi no hay sombras.',
      'Los nombres de los vecinos vuelven a salir justo encima de su cabeza con cualquier tamaño de interfaz.',
      'Opciones: botón «Buscar actualizaciones» para mirar ahora mismo si hay versión nueva y ponerla.',
    ],
  },
  {
    version: '3.8',
    title: 'Agua de verdad',
    items: [
      'El agua funciona como en Minecraft: el mar y el río son bloques de agua quieta que no se acaba nunca.',
      'El agua corre hasta 7 bloques, cada vez más baja, y busca el desnivel más cercano. Al llegar a un borde cae en cascada.',
      'Si cavas una zanja hasta el mar o el río, se llena. Si pones un bloque en medio, cortas el agua; si quitas la fuente, se seca poco a poco.',
      'Fuente infinita: un hueco con dos fuentes al lado y suelo debajo se llena de agua quieta.',
      'La corriente te arrastra y se lleva lo que se cae al agua; los objetos flotan. El agua que cae te hunde.',
      'Cubo nuevo (3 pepitas de hierro, o en la tienda): coge agua quieta y échala donde quieras.',
      'El agua que corre va inclinada, con rayas que avanzan hacia donde va; el agua que cae tiene espuma.',
      'Las islas guardadas se ven igual que antes: no se inunda nada al actualizar.',
    ],
  },
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
