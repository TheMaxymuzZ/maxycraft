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

/** Pone la versión nueva que ya está descargada y recarga el juego (null si no hay app guardada). */
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;

/**
 * Busca ahora mismo si hay versión nueva (v3.9, botón de Opciones). Si la hay, la pone y el juego se recarga solo
 * (la partida se guarda al recargar). Dice 'al-dia' si ya está la última y 'sin-internet' si no se pudo mirar.
 */
export async function checkForUpdates(): Promise<'nueva' | 'al-dia' | 'sin-internet'> {
  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (!registration) {
    // Sin app guardada (en desarrollo, o el navegador no la deja): basta con recargar la página.
    if (!navigator.onLine) return 'sin-internet';
    location.reload();
    return 'nueva';
  }
  try {
    await registration.update();
  } catch {
    return 'sin-internet';
  }
  // La versión nueva tarda un momento en bajarse; se espera a que esté lista.
  const fresh = registration.installing ?? registration.waiting;
  if (!fresh) return 'al-dia';
  if (fresh.state !== 'installed' && fresh.state !== 'activated') {
    await new Promise<void>((done) => {
      const check = () => {
        if (fresh.state === 'installed' || fresh.state === 'activated' || fresh.state === 'redundant') done();
      };
      fresh.addEventListener('statechange', check);
      check();
    });
  }
  if (applyUpdate) await applyUpdate(true);
  else location.reload();
  return 'nueva';
}

export function setupInstall(toast: (text: string) => void) {
  // Solo en la versión publicada: en desarrollo el guardado sin internet molestaría.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    applyUpdate = registerSW({
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
