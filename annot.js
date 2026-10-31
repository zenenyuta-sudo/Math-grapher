'use strict';
/* Write / draw on top of the 2D graph. Items are stored in graph coordinates, so they move with pan and zoom. */
const Annot = (function () {
  const $ = s => document.querySelector(s);
  let cv, ctx, items = [], tool = 'hand', col = '#ffd479', lw = 3, cur = null, open = false;
  const save = () => { try { localStorage.setItem('mg.annot', JSON.stringify(items)); } catch (e) { } };
  function paint(c, v) {
    for (const it of items) {
      if (it.k === 's') {
        c.strokeStyle = it.c; c.lineWidth = it.w; c.lineCap = c.lineJoin = 'round'; c.beginPath();
        it.p.forEach((q, i) => { const x = v.sx(q[0]), y = v.sy(q[1]); i ? c.lineTo(x, y) : c.moveTo(x, y); });
        if (it.p.length === 1) c.lineTo(v.sx(it.p[0][0]) + .1, v.sy(it.p[0][1]));
        c.stroke();
      } else {
        c.fillStyle = it.c; c.font = '600 ' + it.s + 'px "Segoe UI",Arial,sans-serif'; c.textBaseline = 'top'; c.textAlign = 'left'; c.direction = 'ltr';
        c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 3;
        it.t.split('\n').forEach((ln, i) => c.fillText(ln, v.sx(it.x), v.sy(it.y) + i * it.s * 1.3));
        c.shadowBlur = 0;
      }
    }
  }
  function render() {
    if (!cv) return; const v = Grapher.view(); if (!v.W) return; const dpr = window.devicePixelRatio || 1;
    const w = Math.round(v.W * dpr), h = Math.round(v.H * dpr); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, v.W, v.H); paint(ctx, v);
  }
  function compose(base) {                          // base canvas + notes (used when exporting a PNG)
    const v = Grapher.view(), c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
    const x = c.getContext('2d'); x.drawImage(base, 0, 0); x.setTransform(base.width / v.W, 0, 0, base.height / v.H, 0, 0); paint(x, v); return c;
  }
  function hit(it, v, px, py) {
    const R = 14;
    if (it.k === 's') return it.p.some(q => Math.hypot(v.sx(q[0]) - px, v.sy(q[1]) - py) < R + it.w);
    const lines = it.t.split('\n'), w = Math.max(...lines.map(l => l.length)) * it.s * .6, h = lines.length * it.s * 1.3, x = v.sx(it.x), y = v.sy(it.y);
    return px > x - R && px < x + w + R && py > y - R && py < y + h + R;
  }
  function erase(px, py) { const v = Grapher.view(), n = items.length; items = items.filter(it => !hit(it, v, px, py)); if (items.length !== n) { save(); render(); } }
  function setTool(t) {
    tool = t; document.querySelectorAll('[data-at]').forEach(b => b.classList.toggle('on', b.dataset.at === t));
    cv.style.pointerEvents = open && t !== 'hand' ? 'auto' : 'none'; cv.style.cursor = t === 'erase' ? 'cell' : t === 'text' ? 'text' : 'crosshair';
  }
  function toggle(force) {
    open = force === undefined ? !open : force; $('#atool').hidden = !open; $('#z-note').classList.toggle('on', open); setTool(open ? (tool === 'hand' ? 'pen' : tool) : 'hand');
  }
  function addDomainRange() {
    const r = Grapher.domRange(); if (!r) { GG.toast('y(x) هەڵبژێرە'); return; }
    const v = Grapher.view();
    items.push({ k: 't', c: col, s: 15, x: v.wx(14), y: v.wy(110 + 70 * items.filter(i => i.dr).length), t: r.name + '\nDomain: ' + r.dom + '\nRange: ' + r.rng, dr: 1 }); save(); render();
  }
  function init() {
    cv = $('#acanvas'); ctx = cv.getContext('2d');
    try { items = JSON.parse(localStorage.getItem('mg.annot') || '[]'); } catch (e) { items = []; }
    cv.addEventListener('pointerdown', e => {
      if (tool === 'hand') return; e.preventDefault(); const v = Grapher.view(), x = e.offsetX, y = e.offsetY;
      if (tool === 'pen') { cv.setPointerCapture(e.pointerId); cur = { k: 's', c: col, w: lw, p: [[v.wx(x), v.wy(y)]] }; items.push(cur); render(); }
      else if (tool === 'text') { const t = window.prompt('Text'); if (t && t.trim()) { items.push({ k: 't', c: col, s: 14 + lw * 1.5, x: v.wx(x), y: v.wy(y), t: t.trim() }); save(); } render(); }
      else { cv.setPointerCapture(e.pointerId); cur = 'erase'; erase(x, y); }
    });
    cv.addEventListener('pointermove', e => {
      if (!cur) return; const v = Grapher.view();
      if (cur === 'erase') erase(e.offsetX, e.offsetY);
      else { const l = cur.p[cur.p.length - 1]; if (Math.hypot(v.sx(l[0]) - e.offsetX, v.sy(l[1]) - e.offsetY) > 2) { cur.p.push([v.wx(e.offsetX), v.wy(e.offsetY)]); render(); } }
    });
    const up = () => { if (cur) save(); cur = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    $('#z-note').onclick = () => toggle();
    document.querySelectorAll('[data-at]').forEach(b => b.onclick = () => setTool(b.dataset.at));
    const COLS = ['#ffd479', '#ffffff', '#ff4d4d', '#34d399', '#38bdf8', '#c084fc'];
    $('#a-dots').innerHTML = COLS.map(c => '<button class="dot" data-c="' + c + '" style="background:' + c + '"></button>').join('');
    $('#a-dots').onclick = e => { const b = e.target.closest('.dot'); if (b) { col = b.dataset.c; $('#a-col').value = col; if (tool !== 'text') setTool('pen'); } };
    $('#a-more').onclick = () => $('#atool').classList.toggle('more');
    $('#a-col').oninput = e => { col = e.target.value; }; $('#a-w').oninput = e => lw = +e.target.value;
    $('#a-undo').onclick = () => { items.pop(); save(); render(); };
    $('#a-clear').onclick = () => { if (!items.length || confirm('Clear all notes?')) { items = []; save(); render(); } };
    $('#a-dr').onclick = addDomainRange; $('#a-done').onclick = () => toggle(false);
    $('#s-annot').onclick = () => { items = []; save(); render(); GG.toast('✓'); };
    toggle(false); render();
  }
  return { init, render, compose, clear: () => { items = []; save(); render(); } };
})();
