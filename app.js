'use strict';
/* Math Grapher — bootstrap */
document.addEventListener('DOMContentLoaded', () => {
  Grapher.init(); G3.init(); Solver.init(); Calc.init(); GG.init(); Annot.init(); Theme.init(); FX.init(); I18n.init(); Home.init();
  const start = (location.hash || '').replace('#', ''); GG.show(['home', 'calc', 'g2', 'g3', 'solver', 'set', 'help', 'about'].includes(start) ? start : 'home');
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('service-worker.js').catch(() => { });
});
