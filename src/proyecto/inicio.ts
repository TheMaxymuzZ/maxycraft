// Portada del proyecto: la versión más nueva sale sola de la lista de novedades del juego.
import { CHANGELOG } from '../changelog';
import { releaseCard, zoomableImages } from './comun';

const latest = CHANGELOG[0];
const card = releaseCard(latest, 'h2');
card.classList.add('big');
const more = document.createElement('p');
more.className = 'muted';
more.style.marginTop = '12px';
more.innerHTML = 'Lo nuevo de la última versión. <a href="novedades.html">Ver todas las novedades</a>';
card.appendChild(more);
document.querySelector('#latest')!.appendChild(card);
document.querySelector('#version-now')!.textContent = `Versión ${__APP_VERSION__}.`;

zoomableImages();
