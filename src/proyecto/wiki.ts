// Wiki del juego: el texto está en wiki.html y las tablas salen de los mismos datos que usa el juego,
// así recetas, precios, peces o vecinos nuevos aparecen solos en la wiki al añadirlos.
import { KIND_ICONS } from '../itemCard';
import * as THREE from 'three';
import { BLOCKS, createAtlasCanvas } from '../blocks';
import { CALENDAR, SEASON_DAYS } from '../clock';
import { CREATURES, type Creature, HABITAT_TEXT, hoursText, monthsText } from '../creatures';
import { FURNITURE, paintFurnitureIcons } from '../furniture';
import { itemIcon } from '../icons';
import { DIY_RECIPES, ITEMS, ITEM_KINDS, RARITIES, RECIPES, type Recipe, STARTER_DIY, breakInfo, itemDef, toolNameFor } from '../items';
import { ACHIEVEMENTS, PRIZES, TASKS } from '../missions';
import { Portraits } from '../portraits';
import { formatBerries } from '../shop';
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
fill('tabla-peces', CREATURES.filter((c) => c.kind === 'pez').map(creatureRow));
fill('tabla-insectos', CREATURES.filter((c) => c.kind === 'bicho').map(creatureRow));

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
const ROLE: Record<string, string> = { shop: 'La dependienta de la tienda', museum: 'La conservadora del museo', pilot: 'El piloto de la avioneta' };
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
for (const p of ALL_PROFILES) {
  let img = '';
  try {
    if (portraits) img = `<img alt="" src="${portraits.get(p.name, p)}">`;
  } catch {
    img = '';
  }
  const [m, d] = p.birthday;
  const where = p.role ? ROLE[p.role] : VISITOR_NAMES.has(p.name) ? 'Se encuentra de vacaciones' : 'Puede vivir en tu isla desde el principio';
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
