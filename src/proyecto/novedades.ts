// Novedades: todas las versiones del juego, sacadas de la misma lista que se enseña dentro del juego.
import { CHANGELOG, compareVersions } from '../changelog';
import { releaseCard } from './comun';

/** Épocas del juego, de la más nueva a la más antigua, con la primera versión de cada una. */
const ERAS: { from: string; name: string; id: string }[] = [
  { from: '2.1', name: 'Maxycraft 3', id: 'maxycraft-3' },
  { from: '1.1', name: 'Maxycraft 2', id: 'maxycraft-2' },
  { from: '0.1', name: 'Los comienzos', id: 'comienzos' },
];

const eraOf = (version: string) => ERAS.find((e) => compareVersions(version, e.from) >= 0)!;

const list = document.querySelector<HTMLDivElement>('#releases')!;
const filters = document.querySelector<HTMLDivElement>('#filters')!;
let current: string | null = null;
for (const r of CHANGELOG) {
  const era = eraOf(r.version);
  if (era.id !== current) {
    current = era.id;
    const h = document.createElement('h2');
    h.className = 'era';
    h.id = era.id;
    h.dataset.era = era.id;
    h.textContent = era.name;
    list.appendChild(h);
  }
  const card = releaseCard(r);
  card.dataset.era = era.id;
  list.appendChild(card);
}

// Botones para ver solo una época.
const show = (id: string | null) => {
  for (const el of list.querySelectorAll<HTMLElement>('[data-era]')) el.hidden = !!id && el.dataset.era !== id;
  for (const b of filters.querySelectorAll('button')) b.setAttribute('aria-pressed', String((b.dataset.era ?? null) === id));
};
const button = (label: string, id: string | null) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  if (id) b.dataset.era = id;
  b.addEventListener('click', () => show(id));
  filters.appendChild(b);
};
button(`Todas (${CHANGELOG.length})`, null);
for (const e of ERAS) button(e.name, e.id);
show(null);

document.querySelector('#count')!.textContent = String(CHANGELOG.length);
document.querySelector('#version-now')!.textContent = __APP_VERSION__;

// Si se llega con un enlace a una versión (#v3.4), se va a ella cuando ya está dibujada.
if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
