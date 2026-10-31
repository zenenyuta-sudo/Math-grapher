'use strict';
/* Screen transitions + optional animated background (Settings → Animation). Saved in localStorage. */
const FX = (function () {
  const $ = s => document.querySelector(s);
  let S = { bg: 'none', anim: true }, cv, cx, W = 0, H = 0, raf = 0, t0 = 0, items = [], mode = 'none';
  const col = (v, d) => (getComputedStyle(document.documentElement).getPropertyValue(v) || d).trim() || d;
  function save() { try { localStorage.setItem('mg.fx', JSON.stringify(S)); } catch (e) { } }
  function size() { if (!cv) return; const d = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); seed(); }
  function seed() {
    const n = mode === 'stars' ? 90 : mode === 'particles' ? Math.round(Math.min(70, W * H / 14000)) : mode === 'fireflies' ? 34 : mode === 'matrix' ? Math.round(Math.min(90, W / 14)) : 0; items = [];
    for (let i = 0; i < n; i++) items.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .5, vy: mode === 'stars' ? .15 + Math.random() * .5 : (Math.random() - .5) * .5, r: .6 + Math.random() * 1.8, p: Math.random() * 6.28, speed: 1 + Math.random() * 3, char: '01アイウエオ'[Math.floor(Math.random()*7)] });
  }
  function frame(ts) {
    raf = requestAnimationFrame(frame); if (document.hidden) return;
    const t = (ts - t0) / 1000, a = col('--bl', '#0a84ff'), b = col('--pu', '#a855f7');
    cx.clearRect(0, 0, W, H);
    if (mode === 'particles') {
      cx.fillStyle = a; cx.strokeStyle = a;
      for (const p of items) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; }
      cx.globalAlpha = .55; for (const p of items) { cx.beginPath(); cx.arc(p.x, p.y, p.r + .6, 0, 7); cx.fill(); }
      cx.lineWidth = 1; for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const d = Math.hypot(items[i].x - items[j].x, items[i].y - items[j].y); if (d < 120) { cx.globalAlpha = (1 - d / 120) * .3; cx.beginPath(); cx.moveTo(items[i].x, items[i].y); cx.lineTo(items[j].x, items[j].y); cx.stroke(); } }
    } else if (mode === 'stars') {
      cx.fillStyle = '#ffffff';
      for (const p of items) { p.y += p.vy; if (p.y > H) { p.y = -4; p.x = Math.random() * W; } cx.globalAlpha = .25 + .55 * Math.abs(Math.sin(t * 1.3 + p.p)); cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill(); }
    } else if (mode === 'waves') {
      for (let k = 0; k < 3; k++) { cx.globalAlpha = .16 + k * .05; cx.fillStyle = k === 1 ? b : a; cx.beginPath(); cx.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) cx.lineTo(x, H * (.72 + k * .08) + Math.sin(x / (130 + k * 50) + t * (.7 + k * .3) + k) * (18 + k * 8)); cx.lineTo(W, H); cx.closePath(); cx.fill(); }
    } else if (mode === 'aurora') {
      [[a, .25, .3, 1], [b, .7, .6, 1.4], [a, .5, .85, .8]].forEach(([c, px, py, s], i) => { const x = W * (px + .18 * Math.sin(t * .35 * s + i * 2)), y = H * (py + .15 * Math.cos(t * .3 * s + i)), r = Math.max(W, H) * .42, g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'transparent'); cx.globalAlpha = .28; cx.fillStyle = g; cx.fillRect(0, 0, W, H); });
    } else if (mode === 'matrix') {
      cx.font = '14px monospace'; cx.fillStyle = '#36e6a2';
      for (const p of items) { p.y += p.speed * 1.8; if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; } cx.globalAlpha = .18 + Math.random() * .55; cx.fillText(p.char, p.x, p.y); }
    } else if (mode === 'fireflies') {
      for (const p of items) { p.x += Math.sin(t * .7 + p.p) * .45 + p.vx; p.y += Math.cos(t * .55 + p.p) * .35 + p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; const glow = .35 + .65 * Math.abs(Math.sin(t * 1.5 + p.p)); const g = cx.createRadialGradient(p.x,p.y,0,p.x,p.y,16); g.addColorStop(0,'rgba(110,255,190,'+glow+')'); g.addColorStop(1,'rgba(110,255,190,0)'); cx.fillStyle=g; cx.globalAlpha=.9; cx.fillRect(p.x-16,p.y-16,32,32); }
    } else if (mode === 'orbit') {
      const ox=W*.5, oy=H*.48, base=Math.min(W,H)*.18; cx.lineWidth=1;
      for(let i=0;i<5;i++){ const ang=t*(.22+i*.035)+i*1.25, rx=base*(1+i*.24), ry=rx*.42; cx.save(); cx.translate(ox,oy); cx.rotate(-.35+i*.14); cx.strokeStyle=i%2?b:a; cx.globalAlpha=.22; cx.beginPath(); cx.ellipse(0,0,rx,ry,0,0,Math.PI*2); cx.stroke(); cx.restore(); const x=ox+Math.cos(ang)*rx, y=oy+Math.sin(ang)*ry; cx.globalAlpha=.8; cx.fillStyle=i%2?b:a; cx.beginPath(); cx.arc(x,y,2.5,0,Math.PI*2); cx.fill(); }
    } else if (mode === 'grid') {
      const gap=34, off=(t*18)%gap; cx.strokeStyle=a; cx.lineWidth=1; cx.globalAlpha=.16;
      for(let x=-gap+off;x<W+gap;x+=gap){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,H);cx.stroke();}
      for(let y=-gap+off;y<H+gap;y+=gap){cx.beginPath();cx.moveTo(0,y);cx.lineTo(W,y);cx.stroke();}
      const pulse=(Math.sin(t*1.6)+1)/2; const rg=cx.createRadialGradient(W*.5,H*.5,5,W*.5,H*.5,Math.max(W,H)*.55); rg.addColorStop(0,'rgba(34,211,238,'+(pulse*.12)+')'); rg.addColorStop(1,'rgba(34,211,238,0)'); cx.fillStyle=rg; cx.fillRect(0,0,W,H);
    }
    cx.globalAlpha = 1;
  }
  function apply() {
    document.documentElement.classList.toggle('noanim', !S.anim);
    mode = S.bg; cancelAnimationFrame(raf); raf = 0;
    document.documentElement.classList.toggle('fx', mode !== 'none');
    if (mode === 'none') { if (cx) cx.clearRect(0, 0, W, H); if (cv) cv.hidden = true; return; }
    cv.hidden = false; size(); t0 = performance.now(); raf = requestAnimationFrame(frame);
  }
  function init() {
    try { Object.assign(S, JSON.parse(localStorage.getItem('mg.fx')) || {}); } catch (e) { }
    cv = document.createElement('canvas'); cv.id = 'bgfx'; cv.hidden = true; document.body.insertBefore(cv, document.body.firstChild); cx = cv.getContext('2d');
    addEventListener('resize', () => { if (mode !== 'none') size(); });
    const sel = $('#s-fx'), ck = $('#s-anim');
    if (sel) { sel.value = S.bg; sel.onchange = () => { S.bg = sel.value; save(); apply(); }; }
    if (ck) { ck.checked = S.anim; ck.onchange = () => { S.anim = ck.checked; save(); apply(); }; }
    apply();
  }
  return { init };
})();
