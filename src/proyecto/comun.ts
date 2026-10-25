// Lo que comparten las páginas del proyecto (portada, wiki y novedades): letras, estilo y capturas en grande.
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/pixelify-sans/latin-700.css';
import '../../proyecto/estilo.css';
import type { Release } from '../changelog';

/** Al tocar una captura se ve en grande; otro toque la cierra. */
export function zoomableImages(selector = '.gallery img') {
  const imgs = document.querySelectorAll<HTMLImageElement>(selector);
  if (!imgs.length) return;
  const zoom = document.createElement('dialog');
  zoom.className = 'zoom';
  const big = document.createElement('img');
  zoom.appendChild(big);
  document.body.appendChild(zoom);
  for (const img of imgs) {
    img.addEventListener('click', () => {
      big.src = img.src;
      big.alt = img.alt;
      zoom.showModal();
    });
  }
  zoom.addEventListener('click', () => zoom.close());
}

/** Una versión con su lista de novedades, como tarjeta. */
export function releaseCard(r: Release, heading: 'h2' | 'h3' = 'h3'): HTMLElement {
  const card = document.createElement('article');
  card.className = 'card release';
  card.id = `v${r.version}`;
  const v = document.createElement('span');
  v.className = 'version';
  v.textContent = `v${r.version}`;
  const h = document.createElement(heading);
  h.textContent = r.title;
  const ul = document.createElement('ul');
  for (const item of r.items) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  }
  card.append(v, h, ul);
  return card;
}
