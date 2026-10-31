'use strict';
/* Home screen: shortcuts, examples, offline status, install button. */
const Home = (function () {
  const $ = s => document.querySelector(s);
  let dp = null;
  function status() {
    const el = $('#hm-off'); if (!el) return;
    const set = (ok, k) => { el.innerHTML = (ok ? '✓' : '⏳') + ' <span>' + k + '</span>'; el.classList.toggle('ok', ok); };
    if (!/^https?:$/.test(location.protocol)) return set(true, 'Works offline');
    if (!('serviceWorker' in navigator)) return set(false, 'Offline mode not supported');
    if (navigator.serviceWorker.controller) return set(true, 'Ready for offline use');
    set(false, 'Preparing offline files…');
    navigator.serviceWorker.ready.then(() => set(true, 'Ready for offline use')).catch(() => { });
  }
  function init() {
    document.querySelectorAll('#scr-home [data-go]').forEach(b => b.onclick = () => GG.show(b.dataset.go));
    document.querySelectorAll('#scr-home [data-ex]').forEach(b => b.onclick = () => { try { Grapher.addEquation(b.dataset.ex, { select: true }); GG.show('g2'); } catch (e) { GG.toast('⚠'); } });
    const search = $('#hm-search'), clear = $('#hm-search-clear');
    const searchable = [...document.querySelectorAll('#scr-home .hm-feature, #scr-home .hm-tool, #scr-home .hm-chip-list button, #scr-home .hm-formula, #scr-home .hm-learning-row button')];
    const filter = () => {
      const q = (search?.value || '').trim().toLowerCase();
      searchable.forEach(el => {
        const match = !q || el.textContent.toLowerCase().includes(q);
        el.classList.toggle('hm-hidden', !match);
      });
      document.querySelectorAll('#scr-home .hm-section').forEach(section => {
        const items = section.querySelectorAll('.hm-feature,.hm-tool,.hm-chip-list button,.hm-formula,.hm-learning-row button');
        if (items.length) section.classList.toggle('hm-hidden', [...items].every(el => el.classList.contains('hm-hidden')));
      });
    };
    if (search) search.addEventListener('input', filter);
    if (clear) clear.onclick = () => { if (search) { search.value = ''; filter(); search.focus(); } };
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); dp = e; const b = $('#hm-install'); if (b) b.hidden = false; });
    const ib = $('#hm-install'); if (ib) ib.onclick = () => { if (!dp) return; dp.prompt(); dp.userChoice.finally(() => { dp = null; ib.hidden = true; }); };
    window.addEventListener('appinstalled', () => { if (ib) ib.hidden = true; });
    status(); setTimeout(status, 1500);
    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', status);
  }
  return { init, status };
})();
