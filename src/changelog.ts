/** Novedades de cada versión, de la más nueva a la más antigua, para enseñarlas dentro del juego. */
export interface Release {
  version: string;
  title: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
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
