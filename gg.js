'use strict';
/* Good Grapher shell: menu, screens (Calculator / 2D / 3D / MathSolver / Settings / Help), share, graph-type picker. */
const GG = (function () {
  const $ = s => document.querySelector(s);
  const TITLES = { home: 'Home', calc: 'Calculator', g2: '2D grapher', g3: '3D grapher', solver: 'MathSolver', set: 'Settings', help: 'Help', about: 'About' };
  let cur = 'home', tt;
  const ORDER = ['home','calc','solver','g2','g3','set','help','about'];
  function replay(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function animateScreen(n) { const el = $('#scr-' + n); if (!el) return; el.dataset.motion = String(Math.max(0, ORDER.indexOf(n))); replay(el, 'screen-enter'); }
  function graphPulse(id) { replay($(id), 'graph-refresh'); }
  function toast(m) { const t = $('#gg-toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 1400); }
  function show(n) {
    const previous = cur; cur = n;
    document.querySelectorAll('#gg .scr').forEach(s => s.classList.toggle('on', s.id === 'scr-' + n));
    if (previous !== n) animateScreen(n);
    $('#gg-title').textContent = TITLES[n]; $('#gg-title').hidden = n === 'g2' || n === 'g3';
    $('#mid2').hidden = n !== 'g2'; $('#mid3').hidden = n !== 'g3'; $('#gg-list').hidden = !(n === 'g2' || n === 'g3');
    closeDrawer(); $('#gg-share').hidden = !['calc', 'g2', 'g3'].includes(n);
    document.querySelectorAll('#drawer [data-scr]').forEach(b => b.classList.toggle('cur', b.dataset.scr === n));
    if (n === 'g2') { Grapher.onShow(); graphPulse('#gstage'); } if (n === 'g3') { G3.onShow(); graphPulse('#g3stage'); }
    if (n === 'calc') setTimeout(() => { const i = $('#cn-input'); if (i && window.innerWidth > 860) i.focus(); }, 50);
  }
  function closeDrawer() { $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on'); }
  function share() {
    if (cur === 'calc') return Calc.copyAll();
    if (cur === 'g2' || cur === 'g3') { let c = cur === 'g2' ? Grapher.getCanvas() : G3.getCanvas(); if (cur === 'g2' && window.Annot) c = Annot.compose(c); try { const a = document.createElement('a'); a.download = 'graph-' + cur + '.png'; a.href = c.toDataURL('image/png'); a.click(); toast('✓ وێنەی گراف دابەزی'); } catch (e) { toast('⚠ نەتوانرا'); } return; }
    toast('هیچ شتێک نییە بۆ هاوبەشکردن');
  }
  /* generic "New graph" type picker (list of types → input form) */
  function picker(el, types, onAdd) {
    const home = () => { el.innerHTML = '<button class="newbtn">＋ New graph</button>'; el.querySelector('.newbtn').onclick = list; };
    const list = () => {
      el.innerHTML = '<div class="pk-title">New graph</div>' + types.map(t => '<button class="pk" data-id="' + t.id + '"><span class="math">' + t.lab + '</span><span>›</span></button>').join('') + '<button class="btn sm pk-back">← Graphs list</button>';
      el.querySelectorAll('.pk').forEach(b => b.onclick = () => form(types.find(t => t.id === b.dataset.id)));
      el.querySelector('.pk-back').onclick = home;
    };
    const form = t => {
      el.innerHTML = '<div class="pk-title math">' + t.lab + '</div>' + t.fields.map((f, i) => '<label class="pk-f"><span class="math">' + f + '</span><input dir="ltr" spellcheck="false" data-i="' + i + '" placeholder="..."></label>').join('') + '<div class="warn pk-err"></div><div class="row"><button class="btn pri pk-add">زیادکردن</button><button class="btn sm pk-back">←</button></div>';
      const ins = [...el.querySelectorAll('input')], go = () => { try { onAdd(t.id, ins.map(i => i.value)); home(); } catch (e) { el.querySelector('.pk-err').textContent = '⚠ ' + (e.message || e); } };
      el.querySelector('.pk-add').onclick = go; el.querySelector('.pk-back').onclick = list; ins.forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') go(); })); ins[0].focus();
    };
    home();
  }
  function init() {
    $('#gg-menu').onclick = () => { $('#drawer').classList.toggle('on'); $('#scrim').classList.toggle('on'); };
    $('#scrim').onclick = closeDrawer; document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
    document.querySelectorAll('#drawer [data-scr]').forEach(b => b.onclick = () => show(b.dataset.scr));
    $('#gg-list').onclick = () => cur === 'g2' ? Grapher.openSheet('list') : G3.openSheet();
    $('#gg-share').onclick = share;
    Grapher.tab = n => show(n === 'calc' ? 'calc' : 'g2');
  }
  return { init, show, cur: () => cur, picker, toast, graphPulse };
})();
