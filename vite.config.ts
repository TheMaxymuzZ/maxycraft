import { readFileSync } from 'node:fs';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Rutas relativas para que funcione en GitHub Pages (/maxycraft/).
export default defineConfig({
  base: './',
  // El número de versión sale de package.json y se ve en el menú del juego.
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    // El juego espera a conectar con la isla del anfitrión antes de arrancar (await al principio de main.ts).
    target: 'es2022',
    rollupOptions: {
      // Dos páginas: el juego y la página del proyecto (con la wiki y las novedades).
      input: {
        juego: 'index.html',
        proyecto: 'proyecto/index.html',
        wiki: 'proyecto/wiki.html',
        novedades: 'proyecto/novedades.html',
      },
      // Three.js va en su propio archivo: cambia poco, así el navegador lo guarda entre versiones.
      output: { manualChunks: { three: ['three'] } },
    },
  },
  plugins: [
    // App instalable: icono, pantalla completa y juego sin internet. Se actualiza sola al abrirla con conexión.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Maxycraft',
        short_name: 'Maxycraft',
        description: 'Una mezcla de Minecraft y Animal Crossing: construye y vive tranquilo en tu isla de bloques.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        background_color: '#a8dcf5',
        theme_color: '#3d7a1f',
        categories: ['games'],
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        // La página del proyecto (con la wiki, las novedades, capturas y vídeo) no se guarda para jugar sin internet, y se abre tal cual.
        globIgnores: ['proyecto/**', 'assets/{proyecto,wiki,novedades,comun,estilo}-*'],
        navigateFallbackDenylist: [/\/proyecto\//],
      },
    }),
  ],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
});
