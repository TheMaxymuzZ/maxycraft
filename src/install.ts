import { registerSW } from 'virtual:pwa-register';

// Maxycraft como app: se guarda en el dispositivo para jugar sin internet y se puede instalar con su icono.

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Ya se está jugando desde el icono instalado. */
export function isInstalled(): boolean {
  return matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** iPhone o iPad con Safari: allí no hay botón de instalar, hay que hacerlo desde Compartir. */
export function isIOS(ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
}

export function setupInstall(toast: (text: string) => void) {
  // Solo en la versión publicada: en desarrollo el guardado sin internet molestaría.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onOfflineReady: () => toast('Listo: ya puedes jugar sin internet'),
      // Con el juego abierto mucho rato (o la app en segundo plano) también se busca versión nueva cada media hora.
      // Si la hay, se guarda la partida y el juego se recarga solo con la versión nueva.
      onRegisteredSW: (_url, registration) => {
        if (registration) window.setInterval(() => void registration.update().catch(() => {}), 30 * 60 * 1000);
      },
    });
  }

  const button = document.querySelector<HTMLButtonElement>('#install')!;
  const iosHint = document.querySelector<HTMLParagraphElement>('#install-ios')!;
  if (isInstalled()) return;
  if (isIOS()) iosHint.hidden = false;

  let deferred: InstallPromptEvent | null = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    button.hidden = false;
  });
  button.addEventListener('click', async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    button.hidden = true;
    if (outcome === 'accepted') toast('¡Maxycraft instalado! Búscalo con tus otras apps');
  });
  window.addEventListener('appinstalled', () => {
    button.hidden = true;
  });
}
