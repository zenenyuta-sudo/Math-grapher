'use strict';
/* App colors (presets + custom) and quick 2D range presets. Everything is saved in localStorage. */
const Theme = (function () {
  const $ = s => document.querySelector(s);
  const PRESETS = {
    Dark:   { bg: '#000000', panel: '#111827', bar: '#1c1c1e', tx: '#e6ecff', acc: '#0a84ff', acc2: '#a855f7', gbg: '#000000' },
    Light:  { bg: '#eef1f6', panel: '#ffffff', bar: '#ffffff', tx: '#111827', acc: '#0a66ff', acc2: '#7c3aed', gbg: '#ffffff' },
    Ocean:  { bg: '#03121f', panel: '#0b2236', bar: '#0d2b44', tx: '#e3f4ff', acc: '#14b8d4', acc2: '#2563eb', gbg: '#02101b' },
    Purple: { bg: '#0d0716', panel: '#1a1030', bar: '#221440', tx: '#f1e8ff', acc: '#a855f7', acc2: '#ec4899', gbg: '#0a0612' },
    Forest: { bg: '#04120a', panel: '#0d2417', bar: '#123220', tx: '#e6fff0', acc: '#22c55e', acc2: '#14b8a6', gbg: '#03100a' },
    Sunset: { bg: '#160a06', panel: '#2a140c', bar: '#35190e', tx: '#fff1e6', acc: '#f97316', acc2: '#ef4444', gbg: '#120804' }
  };
  const IDS = { acc: '#th-acc', acc2: '#th-acc2', bg: '#th-bg', panel: '#th-panel', bar: '#th-bar', tx: '#th-tx', gbg: '#s-bg' };
  let cur = Object.assign({}, PRESETS.Dark), name = 'Dark';
  const h2r = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const r2h = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = h2r(a), y = h2r(b); return r2h(x.map((v, i) => v + (y[i] - v) * t)); };
  const lum = h => { const [r, g, b] = h2r(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  function apply() {
    const t = cur, st = document.documentElement.style, dark = lum(t.bg) < .5, set = (k, v) => st.setProperty(k, v);
    set('--bg', t.bg); set('--panel', t.panel); set('--bar', t.bar); set('--tx', t.tx); set('--bl', t.acc); set('--pu', t.acc2);
    set('--cy', dark ? mix(t.acc, '#ffffff', .35) : mix(t.acc, '#000000', .2)); set('--card', mix(t.panel, t.tx, .05)); set('--line', mix(t.panel, t.tx, .2));
    set('--mut', mix(t.tx, t.panel, .42)); set('--in', mix(t.panel, t.bg, .5)); set('--btn', mix(t.panel, t.acc, .16)); set('--row', mix(t.panel, t.bg, .35)); set('--out', mix(t.panel, t.bg, .5));
    set('--warn', dark ? '#fda4af' : '#be123c'); set('--okc', dark ? '#34d399' : '#047857');
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t.bar;
    Object.keys(IDS).forEach(k => { const el = $(IDS[k]); if (el) el.value = t[k]; });
    if (window.Grapher) Grapher.setBg(t.gbg); if (window.G3) G3.setBg(t.gbg, lum(t.gbg) < .5 ? '#ffffff' : '#111111');
    document.querySelectorAll('#th-presets button').forEach(b => b.classList.toggle('on', b.dataset.p === name));
  }
  const save = () => { try { localStorage.setItem('mg.theme', JSON.stringify({ name, cur })); } catch (e) { } };
  function init() {
    try { const s = JSON.parse(localStorage.getItem('mg.theme')); if (s && s.cur) { cur = Object.assign({}, PRESETS.Dark, s.cur); name = s.name || 'Custom'; } } catch (e) { }
    $('#th-presets').innerHTML = Object.keys(PRESETS).map(k => '<button class="chip2" data-p="' + k + '" style="--sw:' + PRESETS[k].acc + '"><i></i>' + k + '</button>').join('');
    $('#th-presets').onclick = e => { const b = e.target.closest('button'); if (!b) return; name = b.dataset.p; cur = Object.assign({}, PRESETS[name]); save(); apply(); };
    Object.keys(IDS).forEach(k => $(IDS[k]).addEventListener('input', e => { cur[k] = e.target.value; name = 'Custom'; save(); apply(); }));
    $('#th-reset').onclick = () => { name = 'Dark'; cur = Object.assign({}, PRESETS.Dark); save(); apply(); };
    apply();
    $('#r-presets').innerHTML = [5, 10, 20, 50, 100].map(r => '<button class="chip2" data-r="' + r + '">±' + r + '</button>').join('');
    $('#r-presets').onclick = e => { const b = e.target.closest('button'); if (b) Grapher.range(+b.dataset.r); };
    $('#s-eq').onclick = () => Grapher.range(((Grapher.view().V.xmax - Grapher.view().V.xmin) / 2) || 10);
    $('#s-pad').onclick = () => { Calc.clearPad(); GG.toast('✓'); };
    $('#s-all').onclick = () => { if (confirm('Reset everything? / هەموو شتێک بسڕدرێتەوە؟')) { try { Object.keys(localStorage).filter(k => /^(g12|mg)\./.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { } location.reload(); } };
  }
  return { init, apply };
})();
