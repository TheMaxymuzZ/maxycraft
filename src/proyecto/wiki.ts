// Wiki del juego: el texto está en wiki.html y las tablas salen de los mismos datos que usa el juego,
// así recetas, precios, peces o vecinos nuevos aparecen solos en la wiki al añadirlos.
import { KIND_ICONS } from '../itemCard';
import * as THREE from 'three';
import { BLOCKS, createAtlasCanvas } from '../blocks';
import { CALENDAR, SEASON_DAYS } from '../clock';
import { CREATURES, type Creature, HABITAT_TEXT, fightOf, hoursText, monthsText, sizeRange } from '../creatures';
import { sizeText } from '../collection';
import { RODS } from '../fishing';
import { WILDLIFE, WILD_KINDS } from '../wildlife';
import { BOSS_TELLS, HOSTILES, HOSTILE_KINDS } from '../hostiles';
import { KIND_THEME, THEMES, type DungeonTheme } from '../dungeon';
import { FURNITURE, paintFurnitureIcons } from '../furniture';
import { itemIcon } from '../icons';
import { DIY_RECIPES, ITEMS, ITEM_KINDS, RARITIES, RECIPES, type Recipe, STARTER_DIY, breakInfo, itemDef, toolNameFor } from '../items';
import { ACHIEVEMENTS, PRIZES, TASKS } from '../missions';
import { Portraits } from '../portraits';
import { formatBerries } from '../shop';
import { PARCEL_PRICES, PARCEL_SIZES, PERKS } from '../parcels';
import { HALL_LEVELS, PUBLIC_WORKS } from '../townhall';
import { WINGS } from '../museum';
import { SHOP_LEVELS } from '../shopBuilding';
import { MERCHANTS } from '../commerce';
import { catalogOf } from '../economy';
import { CLOTHES, GARMENTS, SLOT_NAMES } from '../clothes';
import { BIOME_ATLAS } from '../biomeFx';
import { RING_BOAT, RING_NAMES, SEA_TYPES } from '../archipelago';
import { MYSTERY_NAMES } from '../travel';
import { BOATS, BRUJULA, KIOSK_KEEPER, SHIPWRIGHT, STAGES, STAGE_COSTS, UPGRADES, type Cost } from '../shipyard';
import { BIOME_NAMES, CLIMATE_NAMES } from '../world';
import { FRIEND_LEVELS, FURNITURE_STYLE, STYLE_NAMES, decorTaste } from '../decor';
import { ALL_PROFILES, PERSONALITY_NAMES, PILOT, SLEEP, SPECIES_NAMES, VISITOR_NAMES } from '../villagers';
import './comun';

const atlas = createAtlasCanvas();
paintFurnitureIcons(atlas);

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const berries = (n: number) => `${formatBerries(n)} bayas`;

/** Un objeto con su icono del juego. */
function item(id: string, count = 1, tags = true): string {
  const d = itemDef(id);
  const name = d.name;
  // Etiquetas de tipo y rareza en todas las tablas (v4.10); las comunes no llevan la de rareza, para no cargar.
  const extra = tags ? ` <small class="tipo" title="${ITEM_KINDS[d.kind]}">${KIND_ICONS[d.kind] ?? ''}</small>${d.rarity !== 'comun' ? ` <span class="rareza ${d.rarity} mini">${RARITIES[d.rarity]}</span>` : ''}` : '';
  return `<span class="item"><img alt="" src="${itemIcon(atlas, id)}">${esc(count > 1 ? `${count} × ${lower(name)}` : name)}${extra}</span>`;
}

function fill(id: string, rows: string[]) {
  document.getElementById(id)!.innerHTML = rows.map((r) => `<tr>${r}</tr>`).join('');
}

const needs = (r: Recipe) => `<div class="needs">${r.needs.map(([id, n]) => item(id, n)).join('')}</div>`;
const made = (r: Recipe) => item(r.result, r.count);

const handRecipe = (id: string) => RECIPES.find((r) => r.result === id);
const benchRecipe = (id: string) => DIY_RECIPES.find((r) => r.result === id);
const recipeText = (r: Recipe) => r.needs.map(([id, n]) => `${n} ${lower(itemDef(id).name)}`).join(' + ');

/** Cómo se consigue un objeto que se fabrica o se compra (o null si no es ninguna de las dos). */
function howToGet(id: string): string | null {
  const out: string[] = [];
  const hand = handRecipe(id);
  const bench = benchRecipe(id);
  if (hand) out.push(`Bolsillos: ${recipeText(hand)}`);
  if (bench) out.push(`Mesa de trabajo: ${recipeText(bench)}`);
  const def = itemDef(id);
  if (def.buy !== undefined) out.push(def.holiday ? `Tienda, en ${def.holiday === 'navidad' ? 'Navidad' : 'Halloween'} (${berries(def.buy)})` : `Tienda (${berries(def.buy)})`);
  const prize = PRIZES.find((p) => p.id === id);
  if (prize) out.push(`Premio de las tareas (${formatBerries(prize.cost)} puntos)`);
  return out.length ? out.join('<br>') : null;
}

// --- Herramientas ---
const TOOL_USE: Record<string, string> = {
  hacha: 'Cortar troncos y romper lo de madera',
  pala: 'Cavar tierra y arena, y labrar el huerto',
  pico: 'Romper piedra, minerales y ladrillo',
  cana: 'Pescar',
  red: 'Cazar insectos',
  regadera: 'Regar el huerto',
  hacha_hierro: 'Como el hacha, pero más rápida y duradera',
  pala_hierro: 'Como la pala, pero más rápida y duradera',
  pico_hierro: 'Como el pico, pero más rápido y duradero',
  cubo: 'Coger agua quieta (vacío) y echarla en otro sitio (lleno)',
};
fill('tabla-herramientas', Object.keys(TOOL_USE).map((id) => {
  const def = itemDef(id);
  return `<td>${item(id)}</td><td>${TOOL_USE[id]}</td><td class="num">${def.durability ?? 'No se gasta'}</td><td>${howToGet(id) ?? '—'}</td>`;
}));

// --- Recetas ---
fill('recetas-bolsillos', RECIPES.map((r) => `<td>${made(r)}</td><td>${needs(r)}</td>`));
const starter = new Set(STARTER_DIY);
fill('recetas-mesa', DIY_RECIPES.map((r) => {
  const tag = starter.has(r.result) ? '<span class="tag green">Se sabe</span>' : '<span class="tag">Hay que aprenderla</span>';
  return `<td>${made(r)}</td><td>${needs(r)}</td><td>${tag}</td>`;
}));

// --- Bloques ---
/** Dónde está en la naturaleza lo que no se fabrica ni se compra. */
const FOUND: Record<string, string> = {
  tierra: 'Cavando la hierba o la tierra',
  piedra: 'Bajo tierra, en las cuevas y las montañas',
  arena: 'En la playa',
  tronco: 'Talando árboles',
  hojas: 'No se pueden coger: se deshacen al romperlas',
  tronco_palmera: 'Talando palmeras',
  tulipan: 'En las praderas',
  pensamiento: 'En las praderas',
  cosmos: 'En las praderas',
  nomeolvides: 'En las praderas',
  clavel: 'En las praderas',
  bambu: 'En los bosquecillos de bambú',
  basalto: 'Isla del volcán',
  roca_magma: 'Isla del volcán',
  cristal_brillante: 'Isla de los cristales',
  bloque_amatista: 'Isla de los cristales',
  hielo: 'Isla nevada',
  tallo_seta: 'Isla de las setas',
  sombrero_seta: 'Isla de las setas',
  seta: 'Isla de las setas',
};
const TOOLS_TO_TRY = ['hacha', 'pala', 'pico'];
function breakText(id: string): string {
  const block = itemDef(id).block!;
  const hand = breakInfo(block, null);
  if (!hand.allowed) return `Solo con ${toolNameFor(block)}`;
  const best = TOOLS_TO_TRY.find((t) => breakInfo(block, itemDef(t)).usesTool);
  if (best) return `A mano, mejor con ${lower(itemDef(best).name)}`;
  return hand.seconds === 0 ? 'A mano, al momento' : 'A mano';
}
const blocks = ITEMS.filter((d) => d.block !== undefined && !d.furniture && !d.id.startsWith('brote_') && BLOCKS[d.block]);
fill('tabla-bloques', blocks.map((d) => {
  const where = [FOUND[d.id], howToGet(d.id)].filter(Boolean).join('<br>') || '—';
  return `<td>${item(d.id)}</td><td>${breakText(d.id)}</td><td>${where}</td>`;
}));

// --- Muebles ---
fill('tabla-muebles', FURNITURE.map((f) => `<td>${item(f.id)}</td><td>${howToGet(f.id) ?? '—'}</td><td class="num">${formatBerries(f.sell)}</td>`));

// --- Peces e insectos ---
const SEASONS = ['primavera', 'verano', 'otoño', 'invierno'];
/** En qué estaciones de la isla sale, según los meses del calendario de juego. */
function seasonsOf(c: Creature): string {
  if (!c.months) return 'todo el año';
  const [from, to] = c.months;
  const inMonths = (m: number) => (from <= to ? m >= from && m <= to : m >= from || m <= to);
  const found = new Set<string>();
  CALENDAR.forEach(([m], i) => {
    if (inMonths(m)) found.add(SEASONS[Math.floor(i / SEASON_DAYS)]);
  });
  const list = SEASONS.filter((s) => found.has(s));
  return `${monthsText(c)}<br><small class="muted">${list.length > 1 ? `${list.slice(0, -1).join(', ')} y ${list.at(-1)}` : list[0]}</small>`;
}
const creatureRow = (c: Creature) =>
  `<td>${item(c.id)}</td><td>${HABITAT_TEXT[c.habitat]}</td><td>${hoursText(c)}</td><td>${seasonsOf(c)}</td><td class="num">${formatBerries(c.sell)}</td>`;
/** Dónde sale un pez: el agua y, si es de un clima, sus biomas. */
const fishWhere = (c: Creature) => `${HABITAT_TEXT[c.habitat]}${c.biomes ? `<br><small class="muted">Solo en: ${c.biomes.map((b) => esc(BIOME_NAMES[b])).join(', ')}</small>` : ''}`;
const FIGHT = ['Tranquilo', 'Algo', 'Bastante', 'Mucho', '¡Muchísimo!'];
fill('tabla-peces', CREATURES.filter((c) => c.kind === 'pez').map((c) => {
  const [lo, hi] = sizeRange(c);
  return `<td>${item(c.id)}</td><td>${fishWhere(c)}</td><td>${hoursText(c)}</td><td>${seasonsOf(c)}</td><td>${sizeText(lo)} a ${sizeText(hi)}</td><td>${FIGHT[Math.min(4, Math.floor(fightOf(c) * 5))]}</td><td class="num">${formatBerries(c.sell)}</td>`;
}));
const ROD_HOW: Record<string, string> = {
  cana: 'Se fabrica con 5 ramas',
  cana_hierro: 'Mesa de trabajo: 3 ramas y 3 pepitas de hierro',
  cana_cristal: 'La vende Brújula en el muelle',
  cana_legendaria: 'Mesa de trabajo: caña de cristal, 5 pepitas de oro y 10 conchas',
};
const pct = (n: number) => `${Math.round(n * 100)}%`;
fill('tabla-canas', Object.entries(RODS).map(([id, r]) => `<td>${item(id, 1, false)}</td><td class="num">${id === 'cana' ? '—' : pct(1 - r.bite)}</td><td class="num">${pct(r.pull)}</td><td class="num">${pct(r.strain)}</td><td>${ROD_HOW[id]}</td>`));
// --- Armas y criaturas (v4.24) ---
const WEAPON_HOW: Record<string, string> = {
  espada_madera: 'Bolsillos: 2 tablones y 1 rama', espada_piedra: 'Bolsillos: 2 piedras y 1 rama',
  espada_hierro: 'Mesa de trabajo: 3 pepitas de hierro y 1 rama', espada_cristal: 'La vende la tienda de la mina',
  espada_obsidiana: 'Mesa de trabajo: 3 obsidianas, 1 rama y 1 núcleo de lava', arco: 'Bolsillos: 3 ramas y 1 lana',
  flecha: 'Bolsillos: 1 rama y 1 piedra (salen 4)', escudo: 'Bolsillos: 4 tablones y 1 pepita de hierro',
  escudo_hierro: 'Mesa de trabajo: 2 tablones y 6 pepitas de hierro',
};
fill('tabla-armas', Object.keys(WEAPON_HOW).map((id) => {
  const d = itemDef(id);
  const dmg = d.weapon === 'escudo' ? `Para el ${id === 'escudo' ? '70' : '85'}%` : d.damage ? `${d.damage}` : '—';
  const speed = d.cooldown ? (1 / d.cooldown).toFixed(1).replace('.', ',') : '—';
  return `<td>${item(id, 1, false)}</td><td class="num">${dmg}</td><td class="num">${speed}</td><td class="num">${d.durability ?? '—'}</td><td>${WEAPON_HOW[id]}</td>`;
}));
const HOSTILE_PLACE = { cueva: 'Cuevas', luminoso: 'Bosque bioluminiscente', volcanico: 'Tierras volcánicas', setas: 'Bosque de setas' };
fill('tabla-hostiles', HOSTILE_KINDS.map((k) => {
  const h = HOSTILES[k];
  const where = `${h.places.map((p) => HOSTILE_PLACE[p]).join(', ')}${h.night ? ' (de noche, fuera de las cuevas)' : ''}`;
  return `<td><b>${esc(h.name)}</b><br><small class="muted">${esc(h.text)}</small></td><td>${where}</td><td class="num">${h.hp}</td><td class="num">${h.damage}</td><td>${h.loot.map((id) => item(id, 1, false)).join(' ')}</td>`;
}));

// --- Mazmorras (v4.25) ---
const ATTACK_NAMES = { rafaga: 'Ráfaga de flechas', pisoton: 'Pisotón', llamada: 'Llama ayudantes', anillo: 'Anillo' };
fill('tabla-mazmorras', (Object.keys(THEMES) as DungeonTheme[]).map((id) => {
  const t = THEMES[id];
  const boss = HOSTILES[t.boss];
  const islands = (Object.keys(KIND_THEME) as (keyof typeof KIND_THEME)[]).filter((k) => KIND_THEME[k] === id).map((k) => esc(MYSTERY_NAMES[k].replace(/^Isla /, ''))).join(', ');
  const attacks = boss.boss!.attacks.map((a) => `<b>${ATTACK_NAMES[a]}</b>: avisa que ${esc(BOSS_TELLS[a].replace(/:.*/, ''))}`).join('<br>');
  return `<td><b>${esc(t.name)}</b><br><small class="muted">${esc(t.text)}</small></td><td>${islands}</td><td>${esc(boss.name)}</td><td class="num">${boss.hp}</td><td>${attacks}</td>`;
}));

const WILD_PLACE = { tierra: 'En tierra', orilla: 'En la orilla', mar: 'En el mar' };
fill('tabla-fauna', WILD_KINDS.map((k) => {
  const d = WILDLIFE[k];
  const where = `${WILD_PLACE[d.place]}${d.biomes ? `: ${d.biomes.map((b) => esc(BIOME_NAMES[b])).join(', ')}` : ''}${d.time === 'noche' ? ' (de noche)' : ''}`;
  return `<td><b>${esc(d.name)}</b></td><td>${where}</td><td>${esc(d.text)}</td>`;
}));
fill('tabla-insectos', CREATURES.filter((c) => c.kind === 'bicho').map(creatureRow));

// --- Tienda (v4.16) ---
fill('tabla-niveles-tienda', SHOP_LEVELS.map((l) => `<td><b>${l.name}</b></td><td class="num">${l.spent ? formatBerries(l.spent) : 'Desde el principio'}</td><td>${esc(l.text)}</td>`));

// --- Museo (v4.15) ---
const fossils = CREATURES.filter((c) => c.kind === 'fosil');
const fossilWeight = fossils.reduce((n, c) => n + c.weight, 0);
fill('tabla-fosiles', fossils.map((c) => {
  const share = c.weight / fossilWeight;
  const rarity = share >= 0.25 ? 'Común' : share >= 0.15 ? 'Normal' : share >= 0.09 ? 'Raro' : 'Muy raro';
  return `<td>${item(c.id)}</td><td>${rarity}</td><td class="num">${formatBerries(c.sell)}</td>`;
}));
fill('tabla-plantas', WINGS.map((w) => `<td><b>${w.name}</b></td><td>${w.opens ? `${w.opens} donaciones` : 'Desde el principio'}</td><td>${esc(w.text)}</td>`));

// --- Comercios del campo y la mina (v4.17) ---
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function shopHours(hours: ([number, number] | null)[]): string {
  const open = hours.find((h) => h)!;
  const shut = hours.map((h, d) => (h ? null : DAYS[d])).filter(Boolean);
  return `${open[0]}:00 a ${open[1]}:00${shut.length ? `, cierra los ${shut.join(' y ')}s` : ', todos los días'}`;
}
fill('tabla-comercios', MERCHANTS.map((m) => `<td>${m.icon} <b>${esc(m.shop.name)}</b></td><td>${esc(m.profile.name)} (${esc(SPECIES_NAMES[m.profile.species] ?? m.profile.species)})</td><td>${shopHours(m.shop.hours)}</td><td>${esc(m.unlockText)}</td>`));
fill('tabla-catalogos', MERCHANTS.map((m) => `<td><b>${esc(m.shop.name)}</b></td><td>${catalogOf(m.shop).map((id) => item(id)).join(' ')}</td>`));

// --- Moda y muebles (v4.18) ---
const SELLER_NAMES: Record<string, string> = Object.fromEntries(MERCHANTS.map((m) => [m.shop.id, m.profile.name]));
fill('tabla-ropa', GARMENTS.map((g) => {
  const all = CLOTHES.filter((c) => c.garment === g);
  const price = g.legendary ? 'Islas misteriosas' : formatBerries(itemDef(all[0].id).buy ?? 0);
  const name = `<span class="item"><img alt="" src="${itemIcon(atlas, all[0].id)}">${esc(g.name)}${g.legendary ? ' <span class="rareza legendario mini">Legendaria</span>' : ''}</span>`;
  return `<td>${name}</td><td>${SLOT_NAMES[g.slot]}</td><td><div class="needs">${all.map((c) => `<img alt="${esc(c.name)}" title="${esc(c.name)}" src="${itemIcon(atlas, c.id)}">`).join('')}</div></td><td class="num">${price}</td>`;
}));
fill('tabla-muebles-nuevos', FURNITURE.filter((f) => (f.seller === 'muebles' || f.seller === 'urbano') && f.buy).map((f) => `<td>${item(f.id, 1, false)}</td><td>${(FURNITURE_STYLE[f.id] ?? []).map((st) => STYLE_NAMES[st]).join(', ')}</td><td>${SELLER_NAMES[f.seller!]}</td><td class="num">${formatBerries(f.buy!)}</td>`));

// --- Atlas de biomas (v4.19) ---
/** Lo que cuesta algo del astillero: los materiales con su dibujo y las bayas. */
const costCells = (c: Cost) => `<div class="needs">${Object.entries(c.items ?? {}).map(([id, n]) => item(id, n, false)).join('')}</div>${c.bayas ? ` <b>${formatBerries(c.bayas)}</b> bayas` : ''}`;
fill('tabla-astillero', STAGES.slice(1).map((st, i) => `<td><b>${i + 1}. ${esc(st.name)}</b></td><td>${esc(st.text)}</td><td>${costCells(STAGE_COSTS[i])}</td>`));
fill('tabla-barcos', BOATS.map((b) => `<td><b>${esc(b.name)}</b></td><td>${esc(b.text)}</td><td class="num">${b.speed}</td><td class="num">${b.hold}</td><td>Etapa ${b.stage}</td><td>${costCells(b.cost)}</td>`));
fill('tabla-mejoras-barco', UPGRADES.map((u) => `<td><b>${esc(u.name)}</b></td><td>${esc(u.text)}${u.max > 1 ? ` (hasta ${u.max} veces)` : ''}</td><td>${costCells(u.cost)}</td>`));
fill('tabla-brujula', [`<td>${catalogOf(BRUJULA).map((id) => item(id)).join(' ')}</td>`]);
fill('tabla-islas-mar', (Object.keys(SEA_TYPES) as (keyof typeof SEA_TYPES)[]).map((t) => {
  const kinds = { misteriosa: ['cristal', 'volcan', 'setas'], recursos: ['minerales', 'bambu', 'nieve', 'flores'], aldea: ['frutas', 'flores'] }[t] as (keyof typeof MYSTERY_NAMES)[];
  return `<td>${SEA_TYPES[t].icon} <b>${esc(SEA_TYPES[t].name)}</b></td><td>${esc(SEA_TYPES[t].text)}</td><td>${kinds.map((k) => esc(MYSTERY_NAMES[k].replace(/^Isla /, ''))).join(', ')}</td>`;
}));
fill('tabla-distancias', ([1, 2, 3] as const).map((r) => `<td><b>${RING_NAMES[r]}</b></td><td>${esc(BOATS.find((b) => b.kind === RING_BOAT[r])!.name)} o mejor</td>`));
fill('tabla-biomas', BIOME_ATLAS.map((b) => `<td><b>${esc(BIOME_NAMES[b.biome])}</b></td><td>${CLIMATE_NAMES[b.climate]}</td><td>${esc(b.text)}</td><td>${b.finds.map((id) => item(id, 1, false)).join(' ')}</td><td>${esc(b.weather)}</td>`));

// --- Tareas, premios y logros ---
fill('tabla-tareas', TASKS.map((t) => `<td>${esc(t.text)}</td><td class="num">${formatBerries(t.points)}</td>`));
fill('tabla-premios', PRIZES.map((p) => `<td>${item(p.id, p.count)}</td><td class="num">${formatBerries(p.cost)}</td>`));
fill('tabla-logros', ACHIEVEMENTS.map((a) => `<td><b>${esc(a.name)}</b></td><td>${esc(a.text)}</td><td class="num">${formatBerries(a.points)}</td>`));

// --- Todos los objetos ---
const objectRows = [...ITEMS]
  .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  .map((d) => ({ text: normalize(`${d.name} ${ITEM_KINDS[d.kind]} ${RARITIES[d.rarity]}`), html: `<td>${item(d.id, 1, false)}</td><td>${KIND_ICONS[d.kind] ?? ''} ${ITEM_KINDS[d.kind]}</td><td><span class="rareza ${d.rarity}">${RARITIES[d.rarity]}</span></td><td class="num">${formatBerries(d.sell)}</td><td class="num">${d.buy !== undefined ? formatBerries(d.buy) : '—'}</td>` }));
const objectsBody = document.getElementById('tabla-objetos')!;
function showObjects(filter: string) {
  const f = normalize(filter.trim());
  const rows = objectRows.filter((r) => !f || r.text.includes(f));
  objectsBody.innerHTML = rows.length ? rows.map((r) => `<tr>${r.html}</tr>`).join('') : '<tr><td colspan="5" class="muted">No hay ningún objeto con ese nombre.</td></tr>';
}
showObjects('');
document.querySelector<HTMLInputElement>('#buscar-objeto')!.addEventListener('input', (e) => showObjects((e.target as HTMLInputElement).value));

// --- Vecinos, con su retrato ---
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const LIKES: Record<string, string> = { fruta: 'le gusta la fruta', conchas: 'le gustan las conchas', flores: 'le gustan las flores', madera: 'le gusta la madera' };
const ROLE: Record<string, string> = { shop: 'La dependienta de la tienda', museum: 'La conservadora del museo', pilot: 'El piloto de la avioneta', mayor: 'El alcalde, en el ayuntamiento', planner: 'El urbanista, en el ayuntamiento', shipwright: 'El carpintero de ribera, en el astillero' };
let portraits: Portraits | null = null;
try {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  portraits = new Portraits(renderer);
} catch {
  // Sin WebGL los vecinos salen sin retrato.
}
const villagersEl = document.getElementById('vecinos-lista')!;
villagersEl.innerHTML = '';
for (const p of [...ALL_PROFILES, SHIPWRIGHT, KIOSK_KEEPER]) {
  let img = '';
  try {
    if (portraits) img = `<img alt="" src="${portraits.get(p.name, p)}">`;
  } catch {
    img = '';
  }
  const [m, d] = p.birthday;
  const where = p === KIOSK_KEEPER ? 'Atiende el puesto del muelle del astillero' : p.role ? ROLE[p.role] : VISITOR_NAMES.has(p.name) ? 'Se encuentra de vacaciones' : 'Puede vivir en tu isla desde el principio';
  const card = document.createElement('div');
  card.className = 'villager';
  card.innerHTML = `<div class="portrait">${img}</div><div><b>${esc(p.name)}</b>
    <small>${SPECIES_NAMES[p.species]} · ${PERSONALITY_NAMES[p.personality].toLowerCase()} · «${esc(p.catchphrase)}»</small>
    <small>🎂 ${d} de ${MONTHS[m - 1]} · ${LIKES[p.likes]}</small>
    <small>${esc(where)}${p === PILOT ? '' : `. Le encanta ${esc(p.hobby)}`}</small></div>`;
  villagersEl.appendChild(card);
}

// --- Índice, buscador y sección en la que estás ---
function normalize(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
const sections = [...document.querySelectorAll<HTMLElement>('#content section.card')];
const toc = document.querySelector<HTMLDetailsElement>('#toc')!;
const tocList = document.querySelector<HTMLOListElement>('#toc-list')!;
const links = new Map<HTMLElement, HTMLAnchorElement>();
for (const s of sections) {
  const h2 = s.querySelector('h2')!;
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = `#${s.id}`;
  a.innerHTML = `<span>${s.dataset.emoji ?? ''}</span>${esc(h2.textContent ?? '')}`;
  h2.insertAdjacentHTML('afterbegin', `<span class="emoji">${s.dataset.emoji ?? ''}</span>`);
  // En el móvil el índice se pliega al elegir una sección.
  a.addEventListener('click', () => {
    if (matchMedia('(max-width: 860px)').matches) toc.open = false;
  });
  li.appendChild(a);
  tocList.appendChild(li);
  links.set(s, a);
}
if (matchMedia('(max-width: 860px)').matches) toc.open = false;

// La sección en la que estás se marca en el índice: la última cuyo título ya ha pasado bajo la barra de arriba.
let ticking = false;
function markActive() {
  ticking = false;
  const shown = sections.filter((s) => !s.hidden);
  let current = shown[0];
  for (const s of shown) if (s.getBoundingClientRect().top <= 160) current = s;
  for (const [s, a] of links) a.classList.toggle('active', s === current);
}
addEventListener('scroll', () => {
  if (!ticking) requestAnimationFrame(markActive);
  ticking = true;
}, { passive: true });
markActive();

// El buscador deja solo las secciones que tienen todas las palabras escritas.
const texts = new Map(sections.map((s) => [s, normalize(s.textContent ?? '')]));
const noResults = document.getElementById('no-results')!;
document.querySelector<HTMLInputElement>('#search')!.addEventListener('input', (e) => {
  const words = normalize((e.target as HTMLInputElement).value).split(/\s+/).filter(Boolean);
  let shown = 0;
  for (const s of sections) {
    const ok = words.every((w) => texts.get(s)!.includes(w));
    s.hidden = !ok;
    links.get(s)!.parentElement!.hidden = !ok;
    if (ok) shown++;
  }
  noResults.style.display = shown ? 'none' : 'block';
  markActive();
});

// Si se llega con un enlace a una sección (#vecinos), se va a ella cuando las tablas ya están dibujadas.
if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();

// Un día en la isla (v4.11): a qué hora se levanta y se acuesta cada personalidad.
const hh = (h: number) => `${h}:00`;
fill('tabla-horarios', (Object.keys(SLEEP) as (keyof typeof SLEEP)[]).map((p) => {
  const [bed, wake] = SLEEP[p];
  return `<td><b>${PERSONALITY_NAMES[p]}</b></td><td class="num">${hh(wake)}</td><td class="num">${hh(bed === 0 ? 23 : bed - 1)}</td><td class="num">${hh(bed)}</td>`;
}));

// Ayuntamiento (v4.13): niveles y obras públicas.
fill('tabla-ayuntamiento', HALL_LEVELS.map((l) => `<td><b>${l.name}</b></td><td class="num">${l.cost ? l.cost.toLocaleString('es') : 'Gratis'}</td><td><div class="needs">${l.materials.map(([id, n]) => item(id, n, false)).join('') || '—'}</div></td><td>${l.opens}</td>`));
fill('tabla-obras', [
  `<td><b>Puente a un islote</b></td><td class="num">desde 8.000</td><td class="num">1</td><td>Puente de madera con barandilla y pilares de piedra, hasta la orilla de la isla.</td>`,
  ...PUBLIC_WORKS.map((w) => `<td><b>${w.name}</b></td><td class="num">${w.cost.toLocaleString('es')}</td><td class="num">${w.level}</td><td>${w.text}</td>`),
]);

// Parcelas (v4.14): tamaños con su precio y mejoras.
fill('tabla-parcelas', PARCEL_SIZES.map((n, i) => `<td><b>${n}×${n}</b></td><td class="num">${PARCEL_PRICES[i] ? `${PARCEL_PRICES[i].toLocaleString('es')} bayas` : 'Gratis'}</td>`));
fill('tabla-mejoras', PERKS.map((k) => `<td><b>${k.name}</b></td><td class="num">${k.cost.toLocaleString('es')}</td><td>${k.text}</td>`));

// Casas de los vecinos (v4.12): niveles de amistad y estilo de decoración de cada vecino.
fill('tabla-amistad', FRIEND_LEVELS.map((l) => `<td><b>${l.name}</b></td><td class="num">${l.min}</td><td>${l.unlock}</td>`));
fill('tabla-estilos', ALL_PROFILES.filter((p) => !p.role).map((p) => {
  const style = decorTaste(p);
  const pieces = Object.keys(FURNITURE_STYLE).filter((id) => FURNITURE_STYLE[id].includes(style));
  return `<td><b>${p.name}</b></td><td>${STYLE_NAMES[style]}</td><td><div class="needs">${pieces.map((id) => item(id, 1, false)).join('')}</div></td>`;
}));
