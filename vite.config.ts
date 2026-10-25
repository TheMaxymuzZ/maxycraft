import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Rutas relativas para que funcione en GitHub Pages (/maxycraft/).
export default defineConfig({
  base: './',
  // El número de versión sale de package.json y se ve en el menú del juego.
  define: { __APP_VERSION__: JSON.stringify(version) },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
});
