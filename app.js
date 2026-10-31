'use strict';
/* Math Grapher — bootstrap */
document.addEventListener('DOMContentLoaded', () => {
  Grapher.init(); G3.init(); Solver.init(); Calc.init(); GG.init(); Annot.init(); Theme.init(); FX.init(); I18n.init(); Home.init();
  const start = (location.hash || '').replace('#', ''); GG.show(['home', 'calc', 'g2', 'g3', 'solver', 'set', 'help', 'about'].includes(start) ? start : 'home');
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('service-worker.js').catch(() => { });

  // PWA installation button in Settings
  const settingsInstallButton = document.getElementById('settings-install');
  let deferredInstallPrompt = null;

  const isAppInstalled = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (settingsInstallButton) {
    if (isAppInstalled()) {
      settingsInstallButton.textContent = 'Installed';
      settingsInstallButton.disabled = true;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      settingsInstallButton.hidden = false;
      settingsInstallButton.disabled = false;
    });

    settingsInstallButton.addEventListener('click', async () => {
      if (isAppInstalled()) {
        settingsInstallButton.textContent = 'Installed';
        settingsInstallButton.disabled = true;
        return;
      }

      if (!deferredInstallPrompt) {
        alert('Install option is not available here yet. On iPhone/iPad, use Share → Add to Home Screen. On Android or desktop, open the browser menu and choose Install App or Add to Home Screen. Make sure the site is opened over HTTPS.');
        return;
      }

      settingsInstallButton.disabled = true;
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;

      if (choice && choice.outcome === 'accepted') {
        settingsInstallButton.textContent = 'Installed';
      } else {
        settingsInstallButton.disabled = false;
      }
    });

    window.addEventListener('appinstalled', () => {
      settingsInstallButton.textContent = 'Installed';
      settingsInstallButton.disabled = true;
      deferredInstallPrompt = null;
    });
  }
});
