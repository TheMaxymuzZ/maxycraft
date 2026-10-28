import { merchantOf } from './commerce';
import { BUSINESS, DECORATE_LEVEL, FRIEND_LEVELS, HOUSE_LEVELS, type DecorPiece, STYLE_NAMES, addDecor, decorLine, decorTaste, furnitureName, friendLevel, houseLevel, likesFurniture, moveDecor } from './decor';
import { furnitureDef } from './furniture';
import { MOVE_PRICE, PARCEL_PRICES, PARCEL_SIZES, PERKS, type Role, TENT_PERMIT } from './parcels';
import { FLAG_COLORS } from './townhall';
import type { Inventory } from './inventory';
import { itemDef } from './items';
import type { Holiday } from './seasons';
import { formatBerries } from './shop';
import { BOATS, type BoatKind, KIOSK_GREETINGS, MAX_STAGE, STAGES, STAGE_COSTS, UPGRADES, type UpgradeId, boatModel, upgradeOf } from './shipyard';
import type { Personality, Villager } from './villagers';

// Frases de los vecinos. {c} es su coletilla y {saludo} depende de la hora.
const GREETINGS: Record<Personality, string[]> = {
  alegre: [
    '¡{saludo}! ¡Qué alegría verte, {c}!',
    '¡Eh, hola! Hoy me he levantado con ganas de bailar, {c}.',
    '¡{saludo}! ¿Has visto qué cielo tan bonito? Me dan ganas de cantar, {c}.',
  ],
  'gruñón': [
    'Hmm. {saludo}. Supongo que vienes a molestar, {c}.',
    'Ah, eres tú. Bueno, tampoco me caes tan mal, {c}.',
    '{saludo}. Estaba pensando en mis cosas, {c}.',
  ],
  'dormilón': [
    '{saludo}... uaaah... perdona, me he quedado medio dormido, {c}.',
    '¡Hola! ¿Tienes algo de comer? Es que me ha entrado hambre, {c}.',
    '{saludo}. Hoy es un buen día para echarse la siesta, {c}.',
  ],
  presumido: [
    '{saludo}. ¿Te has fijado en mi peinado nuevo? Fabuloso, {c}.',
    '¡Hola! Hoy estoy radiante, como siempre, {c}.',
    '{saludo}. Una isla tan bonita se merece vecinos con estilo, {c}.',
  ],
  deportista: [
    '¡{saludo}! ¿Echamos una carrera hasta la playa? ¡Uno, dos y tres, {c}!',
    '¡Eh! Llevo cien sentadillas esta mañana. ¿Y tú cuántas, {c}?',
    '{saludo}. ¡Hoy hace un día perfecto para entrenar, {c}!',
  ],
  dulce: [
    '{saludo}. Qué bien que hayas venido, ¿te apetece un té, {c}?',
    '¡Hola! Te veo muy bien hoy. ¿Has dormido a gusto, {c}?',
    '{saludo}. Estaba pensando en ti, fíjate qué casualidad, {c}.',
  ],
};

const CHATS: Record<Personality, string[]> = {
  deportista: [],
  dulce: [],
  alegre: [
    'Si sacudes los árboles cae fruta. ¡A veces también una rama, {c}!',
    'Me encanta pasear junto al río. El sonido del agua me pone contenta, {c}.',
    'Cuando sea mayor quiero tener la casa más bonita de la isla, {c}.',
    'He visto conchas en la playa esta mañana. ¡Cada día salen nuevas, {c}!',
    'A veces el mar trae botellas con recetas dentro. ¡Mira bien en la playa, {c}!',
  ],
  'gruñón': [
    'La piedra no se rompe con las manos. Necesitas un pico, eso lo sabe cualquiera, {c}.',
    'Antes esta isla era más tranquila. Ahora hay alguien rompiendo bloques todo el día, {c}.',
    'Si vas a construir algo, que no sea delante de mi ventana, {c}.',
    'Las herramientas se gastan. Lleva siempre ramas de sobra, {c}.',
    'Para fabricar muebles hace falta una mesa de trabajo. Cuatro tablones y listo, {c}.',
  ],
  'dormilón': [
    'La fruta de esta isla está riquísima. Podría comer {fruta} todo el día, {c}.',
    'Por la noche me meto en casa pronto. Dormir es lo mejor del mundo, {c}.',
    'Si te encuentras una {fruta} de más, ya sabes dónde vivo, {c}.',
    'Nadar en el mar cansa mucho. Mejor mirarlo desde la arena, {c}.',
  ],
  presumido: [
    'Las flores quedan preciosas junto a una casa. Pon unas cuantas, {c}.',
    'Una estrella de mar sería el adorno perfecto para mi salón, {c}.',
    'He oído que pronto abrirá una tienda en la isla. ¡Necesito ropa nueva, {c}!',
    'Los tejados de colores son lo más. El mío es el más elegante, claro, {c}.',
  ],
};

// Charlas de las personalidades nuevas (v2.7).
const MORE_CHATS: Partial<Record<Personality, string[]>> = {
  deportista: [
    'Subir a la montaña es el mejor ejercicio. ¡Y desde arriba se ven las cascadas, {c}!',
    'Nadar en el río contracorriente pone fuerte a cualquiera, {c}.',
    'Si te cansas, come fruta. ¡Es energía de la buena, {c}!',
    'Talar árboles es buen ejercicio, pero planta otro brote después, ¿eh, {c}?',
  ],
  dulce: [
    'Me encanta cuando alguien pone flores junto a los caminos. Alegran el día, {c}.',
    'Si alguna vez estás triste, ven a verme y charlamos un rato, {c}.',
    'En el bosque hay árboles muy viejos. Me gusta pensar que nos cuidan, {c}.',
    'He hecho galletas de más. La próxima vez te guardo unas, {c}.',
  ],
};
for (const [k, lines] of Object.entries(MORE_CHATS)) CHATS[k as Personality] = lines!;

// Más cosas de las que hablar (v4.0), para que no repitan siempre lo mismo.
const EVEN_MORE: Record<Personality, string[]> = {
  alegre: [
    '¿Has probado a dormir en una cama? ¡Te levantas con energía para todo el día, {c}!',
    'Ayer vi una bandada de pájaros posarse en la hierba. Si te acercas mucho se asustan, ¡ve despacito, {c}!',
    'Me he inventado una canción sobre la isla. Todavía no tiene letra, pero el ritmo es pegadizo, {c}.',
  ],
  'gruñón': [
    'Si no comes, luego no tienes fuerzas para nada. Eso me decía mi abuela, y tenía razón, {c}.',
    'Las cuevas son peligrosas. Lleva antorchas y no te tires desde muy alto, {c}.',
    'Hay quien compra mapas en la tienda para no perderse. Yo me conozco la isla de memoria, {c}.',
  ],
  'dormilón': [
    'Lo mejor de la noche es meterse en la cama y saltarse la parte oscura. ¡Directo a la mañana, {c}!',
    'Hoy he soñado que la isla entera era un pastel. Me he despertado con mucha hambre, {c}.',
    'Las nubes nunca son iguales. Me paso las tardes mirándolas pasar, {c}.',
  ],
  presumido: [
    'Mi puerta es la más bonita de la calle. Bueno, todas son iguales, pero la mía brilla más, {c}.',
    'Un buen sombrero lo arregla todo. Lo dice la moda y lo digo yo, {c}.',
    'Me han dicho que en las islas misteriosas hay flores que no crecen aquí. ¡Las quiero todas, {c}!',
  ],
  deportista: [
    'Si corres mucho rato te entra hambre. ¡Lleva siempre algo de comer en los bolsillos, {c}!',
    'He subido a lo más alto de la montaña tres veces hoy. ¡La cuarta vienes conmigo, {c}!',
    'Nadar en el mar es genial, pero mejor por la orilla, que se hace hondo poco a poco, {c}.',
  ],
  dulce: [
    'Si alguna vez te haces daño, come algo rico y descansa. Te pondrás bien enseguida, {c}.',
    'Me gusta saludar a los pájaros por la mañana. Aunque siempre salen volando, {c}.',
    'Tengo una planta en la ventana que se llama Pepa. Le hablo todos los días, {c}.',
  ],
};
for (const [k, lines] of Object.entries(EVEN_MORE)) CHATS[k as Personality].push(...lines);

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const LIKES_TEXT: Record<Villager['profile']['likes'], string> = { fruta: 'la fruta', conchas: 'las conchas', flores: 'las flores', madera: 'las cosas de madera' };

// --- Conocer a los vecinos poco a poco (v4.0) ---
// Lo que sabes de cada vecino va por pasos. Cada día te cuenta como mucho una cosa nueva, y las más personales
// (lo que le gusta que le regalen, el día de su cumpleaños) solo cuando ya sois buenos amigos.

/** Lo que sabes de un vecino: 0 nada, 1 ya os conocéis, y luego afición, pista de regalo, estación del cumple, regalo y día. */
export const KNOW = { met: 1, hobby: 2, likesHint: 3, birthdaySeason: 4, likes: 5, birthday: 6 } as const;
/** Amistad que hace falta para que te cuente cada cosa. */
const KNOW_FRIENDSHIP: Record<number, number> = { [KNOW.hobby]: 2, [KNOW.likesHint]: 4, [KNOW.birthdaySeason]: 6, [KNOW.likes]: 8, [KNOW.birthday]: 10 };

const SEASON_OF_MONTH = ['invierno', 'invierno', 'primavera', 'primavera', 'primavera', 'verano', 'verano', 'verano', 'otoño', 'otoño', 'otoño', 'invierno'];

export function seasonOfBirthday(month: number): string {
  return SEASON_OF_MONTH[month - 1];
}

const MEET: Record<Personality, string> = {
  alegre: '¡Hola, hola! Creo que no nos conocíamos. Soy {nombre}, ¡encantada y encantado de todo un poco, {c}!',
  'gruñón': 'Hmm. No te había visto antes. Soy {nombre}. Ya está, ya nos conocemos, {c}.',
  'dormilón': 'Uaaah... ¿eres nuevo por aquí? Yo soy {nombre}. Perdona, es que acabo de despertarme, {c}.',
  presumido: 'Vaya, una cara nueva. Yo soy {nombre}, seguro que ya has oído hablar de mí, {c}.',
  deportista: '¡Eh, hola! Soy {nombre}. ¡Choca esos cinco! Seguro que nos llevamos genial, {c}.',
  dulce: '¡Hola! Me llamo {nombre}. Qué alegría conocer a alguien nuevo. Espero que seamos amigos, {c}.',
};

const HOBBY: Record<Personality, string> = {
  alegre: '¿Sabes lo que más me gusta del mundo? ¡{aficion}! Cuando lo hago se me olvida todo lo demás, {c}.',
  'gruñón': 'Hmm. Si tanto te interesa... me gusta {aficion}. Pero no se lo vayas contando a todo el mundo, {c}.',
  'dormilón': 'Cuando no estoy durmiendo, me gusta {aficion}. Bueno, a veces me quedo dormido haciéndolo, {c}.',
  presumido: 'Alguien con estilo necesita una afición con estilo. La mía es {aficion}. Muy elegante, ¿verdad, {c}?',
  deportista: '¡Lo que más me gusta es {aficion}! Bueno, después de entrenar, claro. ¡Siempre después de entrenar, {c}!',
  dulce: 'Me relaja mucho {aficion}. Algún día podríamos hacerlo juntos, si te apetece, {c}.',
};

/** Pistas de lo que le gusta que le regalen, sin decirlo del todo. */
const LIKES_HINT: Record<Villager['profile']['likes'], string> = {
  fruta: 'Últimamente no paro de pensar en cosas dulces que cuelgan de los árboles… ¿Será que tengo hambre, {c}?',
  conchas: 'Cada vez que paseo por la orilla me agacho a mirar lo que ha traído el mar. Me podría pasar horas, {c}.',
  flores: 'Cuando veo algo de colores creciendo junto al camino se me alegra el día. ¿A ti no te pasa, {c}?',
  madera: 'Me encanta el olor del bosque, y todo lo que se puede hacer con lo que dan los árboles, {c}.',
};

const BIRTHDAY_SEASON: Record<Personality, string> = {
  alegre: '¿Sabes qué? ¡Mi cumpleaños es en {estacion}! ¿El día? Ah, eso es un secreto… de momento, {c}.',
  'gruñón': 'Mi cumpleaños es en {estacion}. Y no pienso decir más. No me gustan las fiestas sorpresa, {c}.',
  'dormilón': 'Mi cumpleaños cae en {estacion}, creo. Siempre se me olvida el día exacto. Bueno, mentira, pero no te lo digo, {c}.',
  presumido: 'Mi cumpleaños es en {estacion}, la mejor estación para lucirse. El día… tendrás que ganártelo, {c}.',
  deportista: '¡Cumplo años en {estacion}! Siempre lo celebro con una carrera. ¿El día? ¡Cuando seamos más amigos, {c}!',
  dulce: 'Te cuento un secreto: mi cumpleaños es en {estacion}. El día te lo diré cuando nos conozcamos un poquito más, {c}.',
};

const LIKES_TOLD: Record<Personality, string> = {
  alegre: '¡Te lo confieso! Lo que más ilusión me hace que me regalen son {gusto}. ¡Ahora ya lo sabes, {c}!',
  'gruñón': 'Ya que insistes… si algún día me quieres regalar algo, que sean {gusto}. Lo demás no me hace falta, {c}.',
  'dormilón': 'Mmm… ¿regalos? Lo que más me gusta son {gusto}. Me ponen de buen humor al despertar, {c}.',
  presumido: 'Un regalo digno de mí tiene que ser especial. Me chiflan {gusto}. Tenlo en cuenta, {c}.',
  deportista: '¿Quieres saber cómo alegrarme el día? ¡Con {gusto}! Mejor que una medalla, {c}.',
  dulce: 'No hace falta que me regales nada… pero si quieres, me encantan {gusto}. Gracias por preguntar, {c}.',
};

const BIRTHDAY_TOLD: Record<Personality, string> = {
  alegre: '¡Ya somos muy amigos, así que te lo digo! Mi cumpleaños es el {dia} de {mes}. ¡Apúntalo, {c}!',
  'gruñón': 'Bah, está bien. Mi cumpleaños es el {dia} de {mes}. Si vienes ese día, no me enfadaré. Mucho, {c}.',
  'dormilón': 'Mi cumpleaños es el {dia} de {mes}. Ese día me levanto temprano y todo. Bueno, más o menos, {c}.',
  presumido: 'Te concedo el honor de saberlo: mi cumpleaños es el {dia} de {mes}. Espero un regalo a la altura, {c}.',
  deportista: '¡Mi cumpleaños es el {dia} de {mes}! Ven a verme y hacemos una carrera de cumpleaños, {c}.',
  dulce: 'Como eres una amistad muy especial, te lo digo: mi cumpleaños es el {dia} de {mes}. Me haría mucha ilusión verte ese día, {c}.',
};

/** Aún no sois tan amigos como para contarte más. */
const NOT_YET: Record<Personality, string[]> = {
  alegre: ['¿Cosas de mí? ¡Hay tantas! Pero mejor poco a poco, que si no se acaba la gracia, {c}.', '¡Ja, ja! Primero tienes que venir a verme más veces. ¡Así nos conocemos mejor, {c}!'],
  'gruñón': ['¿Y por qué quieres saber cosas de mí? Primero nos conocemos más y luego ya veremos, {c}.', 'No suelo contar mis cosas a cualquiera. Vuelve otro día, {c}.'],
  'dormilón': ['Mmm… ahora mismo no me acuerdo de nada interesante. Pregúntame otro día, {c}.', 'Uaaah… estoy demasiado dormido para hablar de mí. Otro día, {c}.'],
  presumido: ['Alguien como yo no lo cuenta todo el primer día. Hay que ganárselo, {c}.', 'Un poco de misterio me hace aún más interesante, ¿no crees, {c}?'],
  deportista: ['¡Para conocerme bien tienes que seguir mi ritmo! Ven a verme más a menudo, {c}.', 'Primero entrenamos juntos unos días y luego te cuento, ¡trato hecho, {c}!'],
  dulce: ['Me da un poco de vergüenza hablar de mí… Cuando nos conozcamos más te cuento, {c}.', 'Hoy prefiero que me cuentes tú cosas. ¿Qué tal te va por la isla, {c}?'],
};

const TOLD_TODAY = [
  'Por hoy ya te he contado bastante. ¡Mañana más, {c}!',
  'Uy, ya te he contado muchas cosas hoy. Si no, mañana no tendremos de qué hablar, {c}.',
];

/** Cuando ya te lo ha contado todo: anécdotas de su vida. */
const STORIES: Record<Personality, string[]> = {
  alegre: [
    'Una vez intenté bailar en la playa y me caí al agua. ¡Fue lo más divertido del verano, {c}!',
    'Cuando era pequeña quería ser estrella del pop. Todavía practico delante del espejo, {c}.',
  ],
  'gruñón': [
    'Cuando llegué a la isla no conocía a nadie. Ahora conozco a demasiada gente. Pero tú me caes bien, {c}.',
    'Una vez pesqué un pez enorme y nadie me creyó. Era así de grande. Bueno, un poco más pequeño, {c}.',
  ],
  'dormilón': [
    'Una vez me quedé dormido debajo de un manzano y me desperté rodeado de manzanas. El mejor día de mi vida, {c}.',
    'Sueño mucho con nubes de algodón de azúcar. ¿Crees que existirán en alguna isla misteriosa, {c}?',
  ],
  presumido: [
    'Tengo un armario entero solo para los domingos. Y otro para los días de lluvia, {c}.',
    'Una vez me hicieron un retrato. Quedó tan bien que el pintor se puso a llorar, {c}.',
  ],
  deportista: [
    'Mi récord es dar la vuelta a la isla corriendo antes de que se pusiera el sol. ¡Inténtalo tú, {c}!',
    'De pequeño me caí de un árbol y desde entonces entreno el equilibrio todos los días, {c}.',
  ],
  dulce: [
    'Guardo una caja con todas las cartas que me han escrito. Algún día te escribiré una a ti, {c}.',
    'Cuando llueve me gusta mirar por la ventana con una taza de chocolate. ¿Te imaginas, {c}?',
  ],
};

/** Lo que te cuenta el vecino sobre sí mismo cuando ya sabes `known` cosas (el siguiente paso). */
export function aboutLine(v: Villager, step: number): string {
  const p = v.profile;
  const [m, d] = p.birthday;
  const line =
    step === KNOW.met ? MEET[p.personality]
    : step === KNOW.hobby ? HOBBY[p.personality]
    : step === KNOW.likesHint ? LIKES_HINT[p.likes]
    : step === KNOW.birthdaySeason ? BIRTHDAY_SEASON[p.personality]
    : step === KNOW.likes ? LIKES_TOLD[p.personality]
    : BIRTHDAY_TOLD[p.personality];
  return line
    .replace(/\{nombre\}/g, p.name)
    .replace(/\{aficion\}/g, p.hobby)
    .replace(/\{estacion\}/g, seasonOfBirthday(m))
    .replace(/\{gusto\}/g, LIKES_TEXT[p.likes])
    .replace(/\{dia\}/g, String(d))
    .replace(/\{mes\}/g, MONTHS[m - 1]);
}

/** Siguiente cosa que te puede contar hoy el vecino, o null si aún no sois tan amigos (o ya lo sabes todo). */
export function nextToLearn(known: number, friendship: number): number | null {
  const next = Math.max(KNOW.hobby, known + 1);
  if (next > KNOW.birthday) return null;
  return friendship >= KNOW_FRIENDSHIP[next] ? next : null;
}

const LIKED = [
  '¡¿Para mí?! ¡Es justo lo que quería! Muchas gracias, {c}.',
  '¡Qué detalle! Esto lo voy a guardar con mucho cariño, {c}.',
];
const POLITE = [
  'Oh, gracias. No sé muy bien qué haré con esto, pero gracias, {c}.',
  '¡Un regalo! Qué amable. Lo pondré en algún sitio, {c}.',
];
const ALREADY = 'Ya me has dado un regalo hoy. ¡Me vas a malacostumbrar, {c}!';
const RETURN_GIFT = 'Toma, esto es para ti. ¡Un regalo por otro regalo, {c}!';
const SHOP_GREETINGS = [
  '¡{saludo}! ¡Bienvenida, bienvenido a mi tienda! Hoy tengo cosas muy bonitas, {c}.',
  '¡Hola! Si traes fruta o conchas, te las compro a buen precio, {c}.',
  '¡{saludo}! Los precios de venta cambian cada día. ¡Mira bien antes de vender, {c}!',
];
const MUSEUM_GREETINGS = [
  '¡Ejem! {saludo}. Bienvenida, bienvenido al museo de la isla, {c}.',
  'Cada pez y cada insecto que dones ayuda a conocer mejor la isla, {c}.',
  '{saludo}. ¿Traes algo nuevo para la colección? Me encantaría verlo, {c}.',
];
const BIRTHDAY = '¡Hoy es mi cumpleaños! ¿Has venido a felicitarme? ¡Qué ilusión, {c}!';
const BIRTHDAY_GIFT = '¡Un regalo de cumpleaños! Es el mejor regalo que me han hecho nunca. ¡Toma, esto para ti, {c}!';
const DONATED = '¡Oh! ¡Un ejemplar magnífico! Lo pondré en la colección ahora mismo, {c}.';
const NOTHING_NEW = 'Mmm, no veo nada que el museo no tenga ya. ¡Sigue buscando, {c}!';
const VISITOR_GREETINGS = [
  '¡{saludo}! Estoy de vacaciones en esta isla. ¡Qué casualidad encontrar a alguien aquí, {c}!',
  '¡Hola! Me encanta esta isla, aunque está un poco solitaria, {c}.',
];
const MAYOR_GREETINGS = [
  '¡Uhú! {saludo}. Soy Don Gregorio, el alcalde. ¿En qué puede ayudarte el ayuntamiento, {c}?',
  '{saludo}. Los búhos no dormimos de noche, así que el ayuntamiento está siempre abierto, {c}.',
  'Ejem, ejem. {saludo}. Tengo el tablón lleno de avisos y la cabeza llena de obras, {c}.',
];
const PLANNER_GREETINGS = [
  '¡{saludo}! Soy Ladrillo, el urbanista. Si hay que construir algo, ¡aquí estoy, {c}!',
  '¡Hola! Me paso el día dibujando planos. ¿Necesitas uno, {c}?',
];
const SHIPWRIGHT_GREETINGS = [
  'Bfff… {saludo}. Soy Bartolo, carpintero de ribera. Esto era un astillero, y volverá a serlo, {c}.',
  'Huele a brea y a sal. Así huele un buen día de trabajo, {c}.',
  'Un barco bien hecho dura más que quien lo hace. Bfff, {c}.',
];
const GOODBYE = ['¡Hasta luego, {c}!', '¡Nos vemos!', 'Venga, ¡que vaya bien, {c}!'];

const CATEGORY: Record<string, 'fruta' | 'conchas' | 'flores' | 'madera'> = {
  manzana: 'fruta', naranja: 'fruta', pera: 'fruta', melocoton: 'fruta', cereza: 'fruta', coco: 'fruta',
  concha: 'conchas', caracola: 'conchas', estrella: 'conchas',
  tulipan: 'flores', pensamiento: 'flores', cosmos: 'flores',
  tronco: 'madera', tablones: 'madera', rama: 'madera', tronco_palmera: 'madera',
};

const RETURN_ITEMS = ['tulipan', 'pensamiento', 'cosmos', 'tablones'];

const ROOF_NAMES = ['Rojo', 'Azul', 'Verde', 'Amarillo'];

/** Tu parcela, con el urbanista (v4.14). Lo que devuelve texto es por qué no se ha podido (null: hecho). */
export interface ParcelActions {
  /** Qué eres en esta isla: quien vive en ella, residente con parcela o invitado. */
  role(): Role;
  /** Tamaño (índice en PARCEL_SIZES) y mejoras de tu parcela, o null si no tienes. */
  mine(): { size: number; perks: string[] } | null;
  wallet(): number;
  /** Mudar y comprar mejoras solo se hace en tu isla. */
  manage(): boolean;
  grow(): Promise<string | null>;
  buyMove(): string | null;
  perk(id: string): string | null;
  tent(): Promise<string | null>;
}

/** Las casas de los vecinos (v4.12): muebles regalados, decorar y tejado. */
export interface DecorActions {
  /** Si tiene casa propia que se pueda decorar. */
  available(v: Villager): boolean;
  /** Cuántos huecos para muebles tiene ahora su casa. */
  slots(v: Villager): number;
  /** Algo ha cambiado en su casa: hay que volver a colocar los muebles. */
  changed(v: Villager): void;
  /** Pinta el tejado de su casa grande (índice de ROOFS). */
  roof(v: Villager, roof: number): void;
}

/** El ayuntamiento (v4.13): lo que hacen el alcalde y el urbanista. */
export interface TownActions {
  /** Nivel del ayuntamiento (1 a 4). */
  level(): number;
  rating(): { stars: number; tip: string };
  /** Lo que pone hoy en el tablón de avisos. */
  notices(): string[];
  /** Obras que se pueden encargar ahora (las ya hechas no salen). */
  works(): { id: string; name: string; cost: number; text: string }[];
  order(id: string): 'ok' | 'money';
  /** El siguiente nivel del ayuntamiento y lo que falta para pagarlo, o null si ya está al máximo. */
  next(): { name: string; cost: number; missing: string[]; opens: string } | null;
  upgrade(): 'ok' | 'money' | 'materials';
  /** Nombres para la isla que propone el alcalde. */
  names(): string[];
  setName(name: string): void;
  setFlag(color: number): void;
  /** El urbanista vende un plano de casa. */
  buyBlueprint(): 'ok' | 'money';
}

type Option = [string, () => void];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export interface DialogContext {
  inventory: Inventory;
  selectedSlot: () => number;
  today: string;
  hour: number;
  fruitName: string;
  toast: (text: string) => void;
  /** Se llama al terminar la conversación. */
  onClose: () => void;
  /** Abre la tienda de quien atiende (la dependienta o los comercios de la v4.17). */
  openShop: (v: Villager) => void;
  /** El probador de la boutique de Seda (v4.18). */
  fitting?: () => void;
  /** Grava arregla las herramientas gastadas de los bolsillos (v4.17). */
  repair?: { quote(): { tools: number; cost: number }; fix(): 'ok' | 'money' | 'none' };
  /** Lo que se puede donar al museo y cómo donarlo. */
  donatable: () => string[];
  donate: (id: string) => boolean;
  openCollection: () => void;
  /** Parcelas (v4.14). */
  parcel?: ParcelActions;
  /** Aprende una receta nueva para la mesa de trabajo; devuelve su nombre o null. */
  learnRecipe: () => string | null;
  /** Fiesta de hoy, si la hay. */
  holiday: Holiday | null;
  isBirthday: (v: Villager) => boolean;
  /** Pitido de voz mientras sale el texto. */
  voice?: (v: Villager) => void;
  /** Viajes en avioneta con el piloto. */
  travel: TravelActions;
  /** Se ha hecho un regalo (para las tareas del día). */
  gifted?: () => void;
  /** Invitar a vivir en tu isla a quien está de vacaciones. */
  invite: (v: Villager) => 'ok' | 'full' | 'already' | 'visita';
  /** Se ha hablado con este vecino (para el álbum de vecinos). */
  met?: (v: Villager) => void;
  /** Lo que ya sabes de este vecino (KNOW) y apuntar algo nuevo. */
  known?: (v: Villager) => number;
  learn?: (v: Villager, step: number) => void;
  /** Casas de vecinos decorables (v4.12). */
  decor?: DecorActions;
  /** Ayuntamiento, alcalde y urbanista (v4.13). */
  town?: TownActions;
  /** El astillero de Bartolo (v4.21). */
  shipyard?: ShipyardActions;
}

export interface ShipyardActions {
  /** Etapa del astillero (0: ruinas). */
  stage(): number;
  /** Tu barco, si ya tienes. */
  boat(): { kind: BoatKind; upgrades: Partial<Record<UpgradeId, number>> } | null;
  /** Arreglar y construir solo se hace en tu isla. */
  manage(): boolean;
  /** Lo que cuesta, en palabras ("20 × tablones, 5.000 bayas"). */
  costText(c: { bayas?: number; items?: Record<string, number> }): string;
  /** Pagan y se hace; devuelven null si ha ido bien o lo que falta. */
  repair(): string | null;
  build(kind: BoatKind): string | null;
  upgrade(id: UpgradeId): string | null;
}

export interface TravelActions {
  /** Estás en una isla misteriosa. */
  away: boolean;
  tickets: () => number;
  fly: () => void;
  goHome: () => void;
}

/** Ventana de conversación con un vecino, al estilo de Animal Crossing. */
export class Dialog {
  private el = document.querySelector<HTMLDivElement>('#dialog')!;
  private nameEl = document.querySelector<HTMLSpanElement>('#dialog-name')!;
  private textEl = document.querySelector<HTMLParagraphElement>('#dialog-text')!;
  private choicesEl = document.querySelector<HTMLDivElement>('#dialog-choices')!;
  private villager: Villager | null = null;
  private typing = 0;
  /** Respuestas para la frase actual; si no hay, salen las de siempre. */
  private options: Option[] | null = null;

  constructor(private ctx: DialogContext) {}

  get open() {
    return this.villager !== null;
  }

  private fill(line: string): string {
    const h = this.ctx.hour;
    const saludo = h < 12 && h >= 5 ? 'Buenos días' : h < 20 && h >= 12 ? 'Buenas tardes' : 'Buenas noches';
    return line
      .replace(/\{c\}/g, this.villager!.profile.catchphrase)
      .replace(/\{saludo\}/g, saludo)
      .replace(/\{fruta\}/g, this.ctx.fruitName);
  }

  start(v: Villager) {
    this.villager = v;
    const stranger = !v.profile.role && (this.ctx.known?.(v) ?? KNOW.met) < KNOW.met;
    this.ctx.met?.(v);
    v.talking = true;
    this.el.hidden = false;
    this.nameEl.textContent = v.name;
    this.nameEl.style.background = `#${v.profile.shirt.toString(16).padStart(6, '0')}`;
    const first = v.memory.talkedDay !== this.ctx.today;
    if (first) {
      v.memory.talkedDay = this.ctx.today;
      this.raise(v, 1);
    }
    const party = first && this.ctx.isBirthday(v);
    // La primera vez solo se presenta: cómo se llama. Lo demás ya lo irá contando.
    if (stranger) {
      this.ctx.learn?.(v, KNOW.met);
      this.say(aboutLine(v, KNOW.met));
    }
    else if (party) this.say(BIRTHDAY);
    else if (first && this.ctx.holiday && !v.isCurator) this.say(this.ctx.holiday.greeting);
    else if (v.isPilot) this.pilot();
    else if (v.visitor && first) this.say(pick(VISITOR_GREETINGS));
    else if (v.isShopkeeper) this.say(pick(v.profile.shop === 'pesca' ? KIOSK_GREETINGS : merchantOf(v.profile.shop ?? '')?.greetings ?? SHOP_GREETINGS));
    else if (v.isShipwright) this.say(pick(SHIPWRIGHT_GREETINGS));
    else if (v.isCurator) this.say(pick(MUSEUM_GREETINGS));
    else if (v.isMayor) this.say(pick(MAYOR_GREETINGS));
    else if (v.isPlanner) this.say(pick(PLANNER_GREETINGS));
    else if (first && this.houseNews(v)) return;
    else if (first && v.memory.friendship >= 3 && Math.random() < 0.4 && this.teach()) return;
    else this.say(pick(first ? GREETINGS[v.profile.personality] : CHATS[v.profile.personality]));
  }

  /** Grava dice cuánto cuesta dejar como nuevas las herramientas gastadas y las arregla si se paga. */
  private repair() {
    const r = this.ctx.repair!;
    const { tools, cost } = r.quote();
    if (!tools) {
      this.say('Tus herramientas están como nuevas. Vuelve cuando las hayas gastado un poco, {c}.');
      return;
    }
    this.say(`Tienes ${tools === 1 ? 'una herramienta gastada' : `${tools} herramientas gastadas`}. Te las dejo como nuevas por ${cost} bayas, {c}.`, [
      ['Arreglar', () => {
        const res = r.fix();
        this.say(res === 'ok' ? '¡Listo! Como recién salidas de la mina, {c}.' : res === 'money' ? 'Mmm… no te llega. Vuelve con más bayas, {c}.' : 'No hay nada que arreglar, {c}.');
      }],
      ['Ahora no', () => this.say('Cuando quieras. Aquí estaré… si no me duermo, {c}.')],
    ]);
  }

  private say(line: string, options: Option[] | null = null) {
    this.options = options;
    const text = this.fill(line);
    this.choicesEl.innerHTML = '';
    clearInterval(this.typing);
    let i = 0;
    this.textEl.textContent = '';
    // El texto aparece letra a letra; un clic en el cuadro lo completa.
    this.typing = window.setInterval(() => {
      i += 2;
      if (i % 4 === 0 && this.villager && text[i] !== ' ') this.ctx.voice?.(this.villager);
      this.textEl.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(this.typing);
        this.showChoices();
      }
    }, 30);
    this.textEl.onclick = () => {
      clearInterval(this.typing);
      this.textEl.textContent = text;
      this.showChoices();
    };
  }

  private showChoices() {
    if (this.choicesEl.childElementCount) return;
    const v = this.villager;
    if (!v) return;
    const add = (label: string, fn: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', fn);
      this.choicesEl.appendChild(b);
    };
    if (this.options) {
      for (const [label, fn] of this.options) add(label, fn);
      (this.choicesEl.firstElementChild as HTMLButtonElement | null)?.focus();
      return;
    }
    if (v.isPilot) {
      this.pilot();
      return;
    }
    if (v.visitor) add('Invitar a mi isla', () => this.invite());
    if (v.isShopkeeper) {
      add('Comprar y vender', () => {
        this.finish(true);
        this.ctx.openShop(v);
      });
      if (v.profile.shop === 'mina' && this.ctx.repair) add('Arreglar herramientas', () => this.repair());
      if (v.profile.shop === 'ropa' && this.ctx.fitting) {
        add('Probador', () => {
          this.finish(true);
          this.ctx.fitting!();
        });
      }
    } else if (v.isCurator) {
      add('Donar', () => this.donateAll());
      add('Ver la colección', () => {
        this.finish(true);
        this.ctx.openCollection();
      });
    } else if (v.isMayor && this.ctx.town) {
      const t = this.ctx.town;
      add('Valoración de la isla', () => this.rating());
      add('Tablón de avisos', () => this.notices());
      add('Obras públicas', () => this.worksMenu());
      add('El ayuntamiento', () => this.hallMenu());
      if (t.level() >= 3) add('Nombre y bandera', () => this.nameMenu());
    } else if (v.isShipwright && this.ctx.shipyard) {
      const y = this.ctx.shipyard;
      add('El astillero', () => this.shipyardMenu());
      if (y.stage() >= 2) add('Barcos', () => this.boatsMenu());
      if (y.stage() >= 3 && y.boat()) add('Mejoras', () => this.upgradesMenu());
    } else if (v.isPlanner && this.ctx.town) {
      add('Plano de casa', () => this.blueprint());
      if (this.ctx.parcel) add(this.ctx.parcel.mine() ? 'Tu parcela' : 'Tienda de campaña', () => this.parcelMenu());
    } else {
      add('Charlar', () => this.chat());
      add('Háblame de ti', () => this.aboutMe());
      if (this.canDecorate(v)) add('Decorar tu casa', () => this.decorMenu());
    }
    const slot = this.ctx.selectedSlot();
    const stack = this.ctx.inventory.slots[slot];
    if (stack && !itemDef(stack.id).tool && !v.isCurator) {
      add(`Regalar ${itemDef(stack.id).name.toLowerCase()}`, () => this.gift(slot));
    }
    add('Adiós', () => this.finish());
    (this.choicesEl.firstElementChild as HTMLButtonElement | null)?.focus();
  }

  /** Charla normal; a veces, sin preguntarle, se le escapa algo nuevo de sí mismo. */
  private chat() {
    const v = this.villager!;
    if (Math.random() < 0.25 && this.learnSomething()) return;
    this.say(pick(CHATS[v.profile.personality]));
  }

  /** Le preguntas por él: te cuenta una cosa nueva al día, si ya sois bastante amigos. */
  private aboutMe() {
    const v = this.villager!;
    if (this.learnSomething()) return;
    const known = this.ctx.known?.(v) ?? KNOW.birthday;
    if (v.memory.aboutDay === this.ctx.today) this.say(pick(TOLD_TODAY));
    else if (known >= KNOW.birthday) this.say(pick(STORIES[v.profile.personality]));
    else this.say(pick(NOT_YET[v.profile.personality]));
  }

  private learnSomething(): boolean {
    const v = this.villager!;
    if (!this.ctx.known || v.memory.aboutDay === this.ctx.today) return false;
    const step = nextToLearn(this.ctx.known(v), v.memory.friendship);
    if (step === null) return false;
    v.memory.aboutDay = this.ctx.today;
    this.ctx.learn?.(v, step);
    this.say(aboutLine(v, step));
    if (step === KNOW.likes || step === KNOW.birthday) this.ctx.toast(`Lo has apuntado en el álbum de ${v.name} (C)`);
    return true;
  }

  /** El vecino comparte una receta, como en Animal Crossing cuando están haciendo manualidades. */
  private teach(): boolean {
    const name = this.ctx.learnRecipe();
    if (!name) return false;
    this.say(`¡Hola! Estaba haciendo manualidades y se me ha ocurrido cómo fabricar: ${name.toLowerCase()}. ¡Toma, te regalo la receta, {c}!`);
    this.ctx.toast(`Receta nueva: ${name.toLowerCase()}. Úsala en la mesa de trabajo`);
    return true;
  }

  private back = () => this.say('¿Algo más, {c}?');

  /** El piloto: lleva a una isla misteriosa con un billete, o de vuelta a casa. */
  private pilot() {
    const t = this.ctx.travel;
    const no: Option = ['Ahora no', () => this.finish()];
    if (t.away) {
      this.say('¡{saludo}! ¿Ya has visto toda la isla? Cuando quieras, volvemos a casa, {c}.', [
        ['Volver a casa', () => {
          this.finish(true);
          t.goHome();
        }],
        ['Todavía no', () => this.finish()],
      ]);
      return;
    }
    const n = t.tickets();
    if (!n) {
      this.say('¡{saludo}! Soy Plumas, el piloto. Con un billete te llevo a una isla misteriosa. Los billetes se compran en la tienda, {c}.', [no]);
      return;
    }
    this.say(`¡{saludo}! Tienes ${n === 1 ? 'un billete' : `${n} billetes`}. ¿Volamos a una isla misteriosa? Nunca se sabe lo que habrá, {c}.`, [
      ['¡Vamos!', () => {
        this.finish(true);
        t.fly();
      }],
      no,
    ]);
  }

  private invite() {
    const r = this.ctx.invite(this.villager!);
    if (r === 'ok') this.say('¿De verdad? ¡Me encantaría vivir contigo! Haré las maletas y nos vemos en tu isla, {c}.');
    else if (r === 'full') this.say('Me encantaría, pero en tu isla no hay ninguna casa libre para mí. Constrúyeme una con un plano de casa y vuelve a buscarme, {c}.');
    else if (r === 'visita') this.say('¡Qué ilusión! Pero de momento me invita quien te ha traído de viaje. ¡Otro día vienes tú, {c}!');
    else this.say('¡Ya tengo las maletas hechas! Nos vemos muy pronto en tu isla, {c}.');
  }

  private donateAll() {
    const ids = this.ctx.donatable();
    if (!ids.length) {
      this.say(NOTHING_NEW);
      return;
    }
    const names = ids.filter((id) => this.ctx.donate(id)).map((id) => itemDef(id).name.toLowerCase());
    this.ctx.toast(`Has donado: ${names.join(', ')}`);
    this.say(DONATED);
  }

  private gift(slot: number) {
    const v = this.villager!;
    const stack = this.ctx.inventory.slots[slot];
    if (!stack) return;
    if (v.memory.giftDay === this.ctx.today) {
      this.say(ALREADY);
      return;
    }
    const furniture = !!furnitureDef(stack.id) && !!this.ctx.decor?.available(v);
    const liked = furniture ? likesFurniture(v.profile, stack.id) : CATEGORY[stack.id] === v.profile.likes;
    this.ctx.inventory.consume(slot);
    v.memory.giftDay = this.ctx.today;
    this.ctx.gifted?.();
    if (this.ctx.isBirthday(v)) {
      // En su cumpleaños cualquier regalo hace mucha ilusión, y siempre devuelve uno.
      this.raise(v, 5);
      this.placeGift(v, stack.id);
      const back = pick(RETURN_ITEMS);
      this.ctx.inventory.add(back, back === 'tablones' ? 4 : 1);
      this.ctx.toast(`${v.name} te ha regalado: ${itemDef(back).name.toLowerCase()}`);
      this.say(BIRTHDAY_GIFT);
      return;
    }
    this.raise(v, liked ? 3 : 1);
    if (furniture) {
      this.say(this.placeGift(v, stack.id, liked));
      return;
    }
    if (v.memory.friendship >= 4 && Math.random() < 0.5) {
      const back = pick(RETURN_ITEMS);
      const count = back === 'tablones' ? 4 : 1;
      if (this.ctx.inventory.add(back, count) === 0) {
        this.say(`${pick(liked ? LIKED : POLITE)} ${RETURN_GIFT}`);
        this.ctx.toast(`${v.name} te ha regalado: ${itemDef(back).name.toLowerCase()}`);
        return;
      }
    }
    this.say(pick(liked ? LIKED : POLITE));
  }

  /** Sube la amistad y avisa si cambia de nivel (y si con eso amplía su casa). */
  private raise(v: Villager, points: number) {
    const before = friendLevel(v.memory.friendship);
    const house = houseLevel(v.memory.friendship);
    v.memory.friendship += points;
    const after = friendLevel(v.memory.friendship);
    if (after > before && !v.profile.role && !v.visitor) {
      this.ctx.toast(`${v.name} y tú: ¡${FRIEND_LEVELS[after].name.toLowerCase()}! ${FRIEND_LEVELS[after].unlock}`);
    }
    if (houseLevel(v.memory.friendship) > house && this.ctx.decor?.available(v)) this.ctx.decor.changed(v);
  }

  private canDecorate(v: Villager): boolean {
    return !!this.ctx.decor?.available(v) && friendLevel(v.memory.friendship) >= DECORATE_LEVEL;
  }

  /** Pone el mueble regalado en su casa y devuelve lo que dice. */
  private placeGift(v: Villager, id: string, liked = likesFurniture(v.profile, id)): string {
    const d = this.ctx.decor;
    const line = decorLine(v.profile.personality, id, decorTaste(v.profile), liked);
    if (!d?.available(v)) return line;
    const pieces = (v.memory.decor ??= []);
    const { placed, removed } = addDecor(pieces, id, d.slots(v), (p) => likesFurniture(v.profile, p));
    if (!placed) return line;
    d.changed(v);
    const gone = removed ? ` Para hacerle sitio he guardado ${furnitureName(removed.id, true)}.` : '';
    return line + gone;
  }

  /** Novedades de su casa al saludar: el tejado de la casa grande o el negocio que quiere abrir. */
  private houseNews(v: Villager): boolean {
    if (!this.ctx.decor?.available(v)) return false;
    const level = houseLevel(v.memory.friendship);
    if ((v.memory.houseLevel ?? 0) < level) {
      v.memory.houseLevel = level;
      const big = level >= 2;
      if (big) {
        this.say(`¡Mira qué ${HOUSE_LEVELS[level].name} tengo! Todo gracias a nuestra amistad. ¿De qué color pinto el tejado, {c}?`,
          ROOF_NAMES.map((n, i): Option => [n, () => {
            v.memory.roof = i;
            this.ctx.decor!.roof(v, i);
            this.say(`¡${n}! Queda precioso. Ven a verla cuando quieras, {c}.`);
          }]));
      } else this.say(`¡He ampliado mi casita! Ahora es una ${HOUSE_LEVELS[level].name} con jardín y caben más muebles. ¡Ven a verla, {c}!`);
      return true;
    }
    if (friendLevel(v.memory.friendship) >= FRIEND_LEVELS.length - 1 && !v.memory.business) {
      v.memory.business = true;
      this.say(`Te voy a contar un secreto, porque eres mi mejor amigo: sueño con abrir ${BUSINESS[v.profile.personality]} en la isla. Cuando haya un local libre, ¡me ayudarás, {c}?`);
      this.ctx.toast(`${v.name} quiere abrir ${BUSINESS[v.profile.personality]}`);
      return true;
    }
    return false;
  }

  /** Decorar su casa con su permiso: girar los muebles o cambiarlos de sitio. */
  private decorMenu() {
    const v = this.villager!;
    const pieces = v.memory.decor ?? [];
    if (!pieces.length) {
      this.say(`Aún no tengo muebles que mover. Me gustan las cosas de estilo ${STYLE_NAMES[decorTaste(v.profile)]}, por si me quieres regalar alguno, {c}.`, [['Volver', this.back]]);
      return;
    }
    this.say('¡Claro! ¿Qué mueble quieres cambiar, {c}?', [
      ...pieces.map((p): Option => [furnitureDef(p.id)?.name ?? p.id, () => this.decorPiece(p)]),
      ['Volver', this.back],
    ]);
  }

  private decorPiece(p: DecorPiece) {
    const v = this.villager!;
    const d = this.ctx.decor!;
    this.say(`¿Qué hago con ${furnitureName(p.id, true)}, {c}?`, [
      ['Girarlo', () => {
        p.rot = (p.rot + 1) % 4;
        d.changed(v);
        this.decorPiece(p);
      }],
      ['Cambiarlo de sitio', () => {
        moveDecor(v.memory.decor ?? [], p, d.slots(v));
        d.changed(v);
        this.decorPiece(p);
      }],
      ['Listo', () => this.say('¡Ha quedado genial! Tienes buen ojo, {c}.')],
    ]);
  }

  // --- Ayuntamiento (v4.13) ---

  private rating() {
    const r = this.ctx.town!.rating();
    const stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
    this.say(`Ejem… según mis cuentas, la isla tiene ${stars}. ${r.tip} ¡Sigue así, {c}!`, [['Volver', this.back]]);
  }

  private notices() {
    const list = this.ctx.town!.notices();
    this.say(list.length ? `En el tablón pone: ${list.join(' · ')}` : 'El tablón está vacío hoy. ¡Una isla tranquila, {c}!', [['Volver', this.back]]);
  }

  private worksMenu() {
    const t = this.ctx.town!;
    const works = t.works();
    if (!works.length) {
      this.say('Ahora mismo no hay obras que encargar. Cuando mejoremos el ayuntamiento habrá más, {c}.', [['Volver', this.back]]);
      return;
    }
    this.say('Estas son las obras que podemos hacer. ¿Cuál encargamos, {c}?', [
      ...works.map((w): Option => [`${w.name} (${formatBerries(w.cost)})`, () => this.say(`${w.text} Cuesta ${formatBerries(w.cost)} bayas. ¿La encargamos, {c}?`, [
        ['¡Sí!', () => {
          const r = t.order(w.id);
          if (r === 'money') this.say('Uhú… no llevas bayas suficientes. ¡Ahorra un poquito y vuelve, {c}!', [['Volver', this.back]]);
          else this.say('¡Hecho! Los castores de Ladrillo han trabajado rapidísimo. Ve a verla, {c}.');
        }],
        ['Ahora no', this.back],
      ])]),
      ['Volver', this.back],
    ]);
  }

  private hallMenu() {
    const t = this.ctx.town!;
    const next = t.next();
    if (!next) {
      this.say('¡El ayuntamiento ya es el más bonito del archipiélago! Gracias por tu ayuda, {c}.', [['Volver', this.back]]);
      return;
    }
    const missing = next.missing.length ? ` Te falta: ${next.missing.join(', ')}.` : '';
    this.say(`Podemos convertir el ayuntamiento en ${next.name.toLowerCase()} por ${formatBerries(next.cost)} bayas. ${next.opens}${missing}`, [
      ['¡Mejorarlo!', () => {
        const r = t.upgrade();
        if (r === 'ok') this.say(`¡Ya tenemos ${next.name.toLowerCase()}! Qué orgullo de isla, {c}.`);
        else if (r === 'money') this.say('Uhú… no llevas bayas suficientes. ¡Vuelve cuando tengas más, {c}!', [['Volver', this.back]]);
        else this.say(`Faltan materiales: ${t.next()?.missing.join(', ')}. ¡Tráelos en los bolsillos, {c}!`, [['Volver', this.back]]);
      }],
      ['Ahora no', this.back],
    ]);
  }

  private nameMenu() {
    const t = this.ctx.town!;
    this.say('¿Qué quieres cambiar, {c}?', [
      ['El nombre', () => this.say('¿Qué te parece alguno de estos nombres, {c}?', [
        ...t.names().map((n): Option => [n, () => {
          t.setName(n);
          this.say(`¡${n}! Lo apunto en el registro y en todos los carteles, {c}.`);
        }]),
        ['Volver', this.back],
      ])],
      ['La bandera', () => this.say('¿De qué color la hacemos, {c}?', [
        ...FLAG_COLORS.map(([name], i): Option => [name, () => {
          t.setFlag(i);
          this.say(`¡Bandera ${name.toLowerCase()} izada! Ondea preciosa junto al ayuntamiento, {c}.`);
        }]),
        ['Volver', this.back],
      ])],
      ['Volver', this.back],
    ]);
  }

  /** Tu parcela: ampliar, mudar y mejoras; o el permiso de tienda si eres invitado (v4.14). */
  /** Bartolo cuenta cómo va el astillero y qué hace falta para la siguiente etapa. */
  private shipyardMenu() {
    const y = this.ctx.shipyard!;
    const stage = y.stage();
    const now = STAGES[stage];
    if (stage >= MAX_STAGE) {
      this.say(`El astillero está entero: ${now.name.toLowerCase()} y todo. ${now.text} Bfff, qué orgullo, {c}.`, [['Volver', this.back]]);
      return;
    }
    const next = STAGES[stage + 1];
    const cost = y.costText(STAGE_COSTS[stage]);
    const intro = stage === 0
      ? 'Aquí se hacían los mejores barcos del archipiélago. Ahora mira: escombros. Si me ayudas, lo arreglamos en cuatro etapas.'
      : `Ahora mismo: ${now.name.toLowerCase()}. ${now.text}`;
    if (!y.manage()) {
      this.say(`${intro} Pero eso lo decide quien vive en esta isla, {c}.`, [['Volver', this.back]]);
      return;
    }
    this.say(`${intro} Siguiente etapa: ${next.name.toLowerCase()} (${next.text.toLowerCase()}). Necesito ${cost}. ¿Lo traes, {c}?`, [
      ['Dar los materiales', () => {
        const problem = y.repair();
        this.say(problem ? `${problem}. Bfff… vuelve cuando lo tengas todo, {c}.` : `¡Hecho! El astillero ya tiene ${next.name.toLowerCase()}. ${next.text} ¡Qué buen trabajo, {c}!`, [['Volver', this.back]]);
      }],
      ['Ahora no', this.back],
    ]);
  }

  /** Los barcos que Bartolo puede construir con las etapas que hay. */
  private boatsMenu() {
    const y = this.ctx.shipyard!;
    const mine = y.boat();
    const options: Option[] = BOATS.filter((b) => b.stage <= y.stage() && b.kind !== mine?.kind).map((b) => [b.name, () => {
      this.say(`${b.name}: ${b.text} Necesito ${y.costText(b.cost)}.${mine ? ' Lo que lleves en la bodega pasa al barco nuevo, y las mejoras también.' : ''} ¿Lo construyo, {c}?`, [
        ['¡Constrúyelo!', () => {
          const problem = y.build(b.kind);
          this.say(problem ? `${problem}, {c}.` : `¡Listo! Tu ${b.name.toLowerCase()} está amarrado junto a la grada. Súbete con clic derecho y llévalo con las teclas de andar. Para bajar, salta cerca de la orilla, {c}.`, [['Volver', this.back]]);
        }],
        ['Ahora no', this.back],
      ]);
    }]);
    if (!y.manage()) {
      this.say('Los barcos se encargan en tu propia isla, {c}.', [['Volver', this.back]]);
      return;
    }
    const have = mine ? `Ahora tienes ${boatModel(mine.kind).name.toLowerCase()}. ` : '';
    const more = y.stage() < 4 ? ' Con más etapas del astillero puedo hacer barcos más grandes.' : '';
    this.say(options.length ? `${have}¿Qué barco te hago, {c}?${more}` : `${have}No puedo hacerte otro mejor todavía.${more}`, [...options, ['Volver', this.back]]);
  }

  /** Mejoras para el barco: vela, bodega, casco, farol y litera. */
  private upgradesMenu() {
    const y = this.ctx.shipyard!;
    const mine = y.boat()!;
    const options: Option[] = UPGRADES.filter((u) => u.stage <= y.stage() && (mine.upgrades[u.id] ?? 0) < u.max).map((u) => [u.name, () => {
      this.say(`${u.name}: ${u.text} Necesito ${y.costText(u.cost)}. ¿Se la pongo, {c}?`, [
        ['¡Pónsela!', () => {
          const problem = y.upgrade(u.id);
          this.say(problem ? `${problem}, {c}.` : `¡Puesta! ${upgradeOf(u.id).name} en tu barco. Bfff, ha quedado precioso, {c}.`, [['Volver', this.back]]);
        }],
        ['Ahora no', this.back],
      ]);
    }]);
    this.say(options.length ? '¿Qué le ponemos a tu barco, {c}?' : 'Tu barco ya lleva todo lo que sé poner. Bfff, {c}.', [...options, ['Volver', this.back]]);
  }

  private parcelMenu() {
    const a = this.ctx.parcel!;
    const mine = a.mine();
    if (!mine) {
      if (a.role() !== 'invitado') {
        this.say('En esta isla no queda sitio para tu parcela. ¡Lo siento mucho, {c}!', [['Volver', this.back]]);
        return;
      }
      this.say(`Aquí eres invitado, {c}: puedes recoger cosas y ayudar, pero no construir. Con el permiso de tienda de campaña (${formatBerries(TENT_PERMIT)} bayas) te monto una tienda con tu cama y tu nombre, y pasas a ser residente con tu parcela de ${PARCEL_SIZES[0]}×${PARCEL_SIZES[0]}.`, [
        ['Comprar el permiso', () => this.buyTent()],
        ['Ahora no', this.back],
      ]);
      return;
    }
    const side = PARCEL_SIZES[mine.size];
    const next = PARCEL_SIZES[mine.size + 1];
    const options: Option[] = [];
    if (next) options.push([`Ampliar a ${next}×${next}`, () => this.growParcel()]);
    if (a.manage()) {
      options.push(['Mudar la parcela', () => this.moveParcel()]);
      if (PERKS.some((k) => !mine.perks.includes(k.id))) options.push(['Mejoras', () => this.perksMenu()]);
    }
    options.push(['Volver', this.back]);
    this.say(`Tu parcela mide ${side}×${side}. Dentro solo construyes tú y quien tú dejes (se elige en Jugar con amigos). Al llevar bloques en la mano se ve su borde. ¿Qué hacemos, {c}?`, options);
  }

  private growParcel() {
    const a = this.ctx.parcel!;
    const size = a.mine()!.size + 1;
    const side = PARCEL_SIZES[size];
    const price = PARCEL_PRICES[size];
    this.say(`Ampliarla a ${side}×${side} cuesta ${formatBerries(price)} bayas. Crece desde el centro hacia todos los lados. ¿La amplío, {c}?`, [
      ['¡Sí!', () => {
        if (a.wallet() < price) {
          this.say('No llevas bayas suficientes. ¡Vuelve cuando tengas, {c}!', [['Volver', this.back]]);
          return;
        }
        void a.grow().then((problem) => this.say(problem ? `Uy, no puedo: ${problem.toLowerCase()}. No te he cobrado nada, {c}.` : `¡Hecho! Tu parcela ya mide ${side}×${side}. ¡A construir, {c}!`, [['Volver', this.back]]));
      }],
      ['Ahora no', this.back],
    ]);
  }

  private moveParcel() {
    const a = this.ctx.parcel!;
    this.say(`Con el permiso de mudanza (${formatBerries(MOVE_PRICE)} bayas) eliges sitio nuevo: úsalo en el suelo para ver dónde quedaría tu parcela, con el borde azul, y otra vez en el mismo sitio para mudarte. Lo construido, los muebles, los cofres y el huerto se vienen contigo.`, [
      ['Comprar el permiso', () => {
        const problem = a.buyMove();
        this.say(problem ?? '¡Aquí tienes tu permiso de mudanza! Úsalo donde quieras vivir, {c}.', [['Volver', this.back]]);
      }],
      ['Ahora no', this.back],
    ]);
  }

  private perksMenu() {
    const a = this.ctx.parcel!;
    const owned = a.mine()?.perks ?? [];
    const options: Option[] = PERKS.filter((k) => !owned.includes(k.id)).map((k): Option => [`${k.name} · ${formatBerries(k.cost)}`, () => {
      this.say(`${k.text} Cuesta ${formatBerries(k.cost)} bayas. ¿Lo quieres, {c}?`, [
        ['¡Sí!', () => {
          const problem = a.perk(k.id);
          this.say(problem ?? '¡Listo! Ya lo tienes en tu parcela, {c}.', [['Volver', this.back]]);
        }],
        ['Ahora no', this.back],
      ]);
    }]);
    options.push(['Volver', this.back]);
    this.say('Estas son las mejoras que puedo hacer en tu parcela, {c}:', options);
  }

  private buyTent() {
    const a = this.ctx.parcel!;
    if (a.wallet() < TENT_PERMIT) {
      this.say('No llevas bayas suficientes. ¡Vuelve cuando tengas, {c}!', [['Volver', this.back]]);
      return;
    }
    void a.tent().then((problem) => this.say(problem ? `Uy, no puedo: ${problem.toLowerCase()}. No te he cobrado nada, {c}.` : '¡Ya eres residente! Tu tienda de campaña está montada, con tu cama y tu nombre en el cartel. ¡Te damos la bienvenida al pueblo, {c}!', [['Volver', this.back]]));
  }

  private blueprint() {
    this.say('Con un plano de casa marcas un solar y lo construyes, y así puede venir a vivir un vecino nuevo. Cuesta 1.000 bayas. ¿Te lo preparo, {c}?', [
      ['¡Sí!', () => {
        const r = this.ctx.town!.buyBlueprint();
        this.say(r === 'ok' ? '¡Aquí tienes tu plano! Úsalo donde quieras construir la casa, {c}.' : 'No llevas bayas suficientes. ¡Vuelve cuando tengas, {c}!', [['Volver', this.back]]);
      }],
      ['Ahora no', this.back],
    ]);
  }

  /** Termina la conversación. Con `quiet` se cierra sin despedida ni avisar (para pasar a la tienda). */
  finish(quiet = false) {
    const v = this.villager;
    if (!v) return;
    clearInterval(this.typing);
    if (quiet) {
      v.talking = false;
      this.villager = null;
      this.el.hidden = true;
      return;
    }
    this.textEl.textContent = this.fill(pick(GOODBYE));
    this.choicesEl.innerHTML = '';
    v.talking = false;
    this.villager = null;
    window.setTimeout(() => {
      if (!this.villager) this.el.hidden = true;
    }, 700);
    this.ctx.onClose();
  }
}
