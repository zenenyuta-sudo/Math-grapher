'use strict';
/* 3D grapher — canvas software renderer (rotate / zoom / points / wireframe / surface). Uses MathEngine. */
const G3 = (function () {
  const E = MathEngine, $ = s => document.querySelector(s);
  const COLORS = ['#38bdf8', '#f472b6', '#a3e635', '#fbbf24', '#c084fc', '#fb7185'];
  const TYPES = [
    { id: 'zxy', lab: 'z(x,y)', fields: ['z ='] }, { id: 'xyz', lab: 'x(y,z)', fields: ['x ='] }, { id: 'yxz', lab: 'y(x,z)', fields: ['y ='] },
    { id: 'xrp', lab: 'x(ρ,φ)', fields: ['x ='] }, { id: 'yrp', lab: 'y(ρ,φ)', fields: ['y ='] }, { id: 'zrp', lab: 'z(ρ,φ)', fields: ['z ='] },
    { id: 'rtp', lab: 'r(θ,φ)', fields: ['r ='] }, { id: 'uv', lab: 'xyz(u,v)', fields: ['x(u,v) =', 'y(u,v) =', 'z(u,v) ='] }, { id: 'imp', lab: 'F(x,y,z)', fields: ['F(x,y,z) = 0 ←'] }
  ];
  let cv, ctx, W = 0, H = 0, gs = [], nid = 1, mode = 'surf', raf = 0;
  const cam = { yaw: -0.75, pitch: 0.55, zoom: 1 }, S = { R: 5, N: 36 }, A = { axes: true, nums: true, floor: false, auto: false, bg: '#000000', fg: '#ffffff' };
  let ticking = false;
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rad = a => E.angle === 'deg' ? a * Math.PI / 180 : a;

  function build(g) {
    const sc = { x: 0, y: 0, z: 0, u: 0, v: 0, rho: 0, phi: 0, theta: 0 }, R = S.R, N = S.N, fs = g.asts.map(a => E.compile(a));
    const ev = (i) => fs[i](sc), deg = E.angle === 'deg', TAU = deg ? 360 : 2 * Math.PI, HALF = deg ? 180 : Math.PI;
    if (g.type === 'imp') return { tris: march(sc, fs[0], R, 26) };
    let A0 = -R, A1 = R, B0 = -R, B1 = R;
    if (['xrp', 'yrp', 'zrp'].includes(g.type)) { A0 = 0; A1 = R; B0 = 0; B1 = TAU; }
    if (g.type === 'rtp') { A0 = 0; A1 = HALF; B0 = 0; B1 = TAU; }
    const grid = [];
    for (let i = 0; i <= N; i++) {
      const row = [], a = A0 + (A1 - A0) * i / N;
      for (let j = 0; j <= N; j++) {
        const b = B0 + (B1 - B0) * j / N; let p;
        switch (g.type) {
          case 'zxy': sc.x = a; sc.y = b; p = [a, b, ev(0)]; break;
          case 'xyz': sc.y = a; sc.z = b; p = [ev(0), a, b]; break;
          case 'yxz': sc.x = a; sc.z = b; p = [a, ev(0), b]; break;
          case 'xrp': sc.rho = a; sc.phi = b; p = [ev(0), a * Math.cos(rad(b)), a * Math.sin(rad(b))]; break;
          case 'yrp': sc.rho = a; sc.phi = b; p = [a * Math.cos(rad(b)), ev(0), a * Math.sin(rad(b))]; break;
          case 'zrp': sc.rho = a; sc.phi = b; p = [a * Math.cos(rad(b)), a * Math.sin(rad(b)), ev(0)]; break;
          case 'rtp': { sc.theta = a; sc.phi = b; const r = ev(0); p = [r * Math.sin(rad(a)) * Math.cos(rad(b)), r * Math.sin(rad(a)) * Math.sin(rad(b)), r * Math.cos(rad(a))]; break; }
          default: sc.u = a; sc.v = b; p = [ev(0), ev(1), ev(2)];
        }
        row.push(p.every(c => isFinite(c) && Math.abs(c) < 6 * R) ? p : null);
      }
      grid.push(row);
    }
    const polys = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const q = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]; if (q.every(Boolean)) polys.push(q); }
    return { polys, grid };
  }
  function march(sc, f, R, M) {
    const n = M + 1, h = 2 * R / M, vals = new Float64Array(n * n * n), id = (i, j, k) => (i * n + j) * n + k;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) { sc.x = -R + i * h; sc.y = -R + j * h; sc.z = -R + k * h; vals[id(i, j, k)] = f(sc); }
    const tris = [], C = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], TET = [[0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6], [0, 5, 1, 6]];
    for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) for (let k = 0; k < M; k++) {
      const Pc = C.map(c => [-R + (i + c[0]) * h, -R + (j + c[1]) * h, -R + (k + c[2]) * h]), Vc = C.map(c => vals[id(i + c[0], j + c[1], k + c[2])]);
      if (Vc.some(v => !isFinite(v))) continue;
      if (Vc.every(v => v < 0) || Vc.every(v => v >= 0)) continue;
      for (const t of TET) {
        const P = t.map(q => Pc[q]), V = t.map(q => Vc[q]), ins = [], out = [];
        for (let q = 0; q < 4; q++) (V[q] < 0 ? ins : out).push(q);
        const ed = (a, b) => { const u = V[a] / (V[a] - V[b]); return [P[a][0] + (P[b][0] - P[a][0]) * u, P[a][1] + (P[b][1] - P[a][1]) * u, P[a][2] + (P[b][2] - P[a][2]) * u]; };
        if (ins.length === 1) tris.push([ed(ins[0], out[0]), ed(ins[0], out[1]), ed(ins[0], out[2])]);
        else if (ins.length === 3) tris.push([ed(out[0], ins[0]), ed(out[0], ins[1]), ed(out[0], ins[2])]);
        else if (ins.length === 2) { const a = ed(ins[0], out[0]), b = ed(ins[0], out[1]), c = ed(ins[1], out[1]), d = ed(ins[1], out[0]); tris.push([a, b, c], [a, c, d]); }
      }
    }
    return { polys: tris };
  }
  function rebuild(g) { try { g.mesh = build(g); g.err = null; } catch (e) { g.mesh = null; g.err = e instanceof E.MathError ? e.message : e.message; } }
  function add(type, vals) {
    const T = TYPES.find(t => t.id === type), asts = vals.map(v => { if (!v.trim()) throw new E.MathError('خانەی هاوکێشە بەتاڵە'); let a = E.parse(v); if (a.t === 'rel') { if (type === 'imp' && a.op === '=') a = E.B('-', a.l, a.r); else throw new E.MathError('تەنها دەربڕین بنووسە (بێ هێمای =)'); } E.compile(a); return a; });
    const g = { id: nid++, type, src: vals.map(v => v.trim()), asts, color: COLORS[(nid - 2) % COLORS.length], on: true, lab: T.lab };
    rebuild(g); gs.push(g); save(); renderList(); schedule(); if (window.GG && GG.graphPulse) GG.graphPulse('#g3stage'); return g;
  }
  function renderList() {
    const box = $('#g3-list'); if (!box) return;
    box.innerHTML = gs.map(g => '<div class="eqrow" style="--c:' + g.color + '" data-id="' + g.id + '"><div class="eqline"><input type="color" class="ec" value="' + g.color + '"><span class="pill">' + g.lab + '</span><span class="math ei3">' + esc(g.src.join(' ; ')) + '</span><button class="mini eye' + (g.on ? '' : ' off') + '">◉</button><button class="mini del">✕</button></div><div class="eerr warn">' + (g.err ? '⚠ ' + esc(g.err) : '') + '</div></div>').join('') || '<div class="muted pad">هیچ گرافێک نییە. «+ New graph» بکە.</div>';
    updateDomainCard();
  }
  function save() { try { localStorage.setItem('g12.g3', JSON.stringify({ gs: gs.map(g => ({ type: g.type, src: g.src, color: g.color, on: g.on })), S })); } catch (e) { } }
  function load() {
    try { const s = JSON.parse(localStorage.getItem('g12.g3')); if (s) { Object.assign(S, s.S || {}); (s.gs || []).forEach(q => { try { const g = add(q.type, q.src); g.color = q.color; g.on = q.on; } catch (e) { } }); } } catch (e) { }
    if (!gs.length) add('zxy', ['sin(sqrt(x^2+y^2))']);
  }
  /* ---------- rendering ---------- */
  function project(p) {
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const x1 = p[0] * cy - p[1] * sy, y1 = p[0] * sy + p[1] * cy, up = p[2] * cp + y1 * sp, d = y1 * cp - p[2] * sp;
    const k = 1 / (1 + d / (7 * S.R)), s = cam.zoom * Math.min(W, H) / (2.7 * S.R) * k;
    return [W / 2 + x1 * s, H / 2 - up * s, d];
  }
  const shade = (c, b) => { const n = parseInt(c.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, bl = n & 255; return 'rgb(' + Math.round(r * b) + ',' + Math.round(g * b) + ',' + Math.round(bl * b) + ')'; };
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }
  function axes() {
    const R = S.R, step = R <= 4 ? 1 : R <= 10 ? 2 : Math.ceil(R / 5);
    ctx.font = '13px "Cambria Math",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [['X', '#ff2a2a', [1, 0, 0]], ['Y', '#22e03a', [0, 1, 0]], ['Z', '#2a4bff', [0, 0, 1]]].forEach(([nm, col, d]) => {
      const a = project(d.map(c => -c * R)), b = project(d.map(c => c * R));
      ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      for (let k = -R; k <= R; k += step) { if (!k) continue; const p = project(d.map(c => c * k)); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 7); ctx.fill(); if (A.nums) { ctx.fillStyle = A.fg; ctx.fillText(k, p[0] + 11, p[1] - 9); } }
      const e = project(d.map(c => c * R * 1.18)); ctx.fillStyle = col; ctx.font = '22px sans-serif'; ctx.fillText(nm, e[0], e[1]); ctx.font = '13px "Cambria Math",serif';
    });
  }
  function floor() {
    const R = S.R, step = R <= 4 ? 1 : R <= 10 ? 2 : Math.ceil(R / 5); ctx.strokeStyle = 'rgba(128,140,180,.28)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = -R; k <= R + 1e-9; k += step) { let a = project([k, -R, 0]), b = project([k, R, 0]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); a = project([-R, k, 0]); b = project([R, k, 0]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
  }
  function tick() { if (ticking) return; ticking = true; (function f() { if (!A.auto) { ticking = false; return; } if (document.querySelector('#scr-g3').classList.contains('on')) { cam.yaw -= 0.012; schedule(); } requestAnimationFrame(f); })(); }
  function rebuildAll() { gs.forEach(rebuild); renderList(); save(); $('#s3-r').value = S.R; $('#s3-n').value = S.N; schedule(); }
  const ACT = { zin: () => cam.zoom = Math.min(8, cam.zoom * 1.2), zout: () => cam.zoom = Math.max(.2, cam.zoom / 1.2), left: () => cam.yaw += .12, right: () => cam.yaw -= .12, up: () => cam.pitch = Math.min(1.5, cam.pitch + .1), down: () => cam.pitch = Math.max(-1.5, cam.pitch - .1),
    reset: () => { cam.yaw = -0.75; cam.pitch = 0.55; cam.zoom = 1; }, top: () => { cam.yaw = 0; cam.pitch = 1.5; }, front: () => { cam.yaw = 0; cam.pitch = 0; }, side: () => { cam.yaw = -Math.PI / 2; cam.pitch = 0; }, iso: () => { cam.yaw = -0.75; cam.pitch = 0.6; },
    axes: () => A.axes = !A.axes, nums: () => A.nums = !A.nums, floor: () => A.floor = !A.floor, auto: () => { A.auto = !A.auto; if (A.auto) tick(); },
    nplus: () => { S.N = Math.min(80, S.N + 8); rebuildAll(); }, nminus: () => { S.N = Math.max(8, S.N - 8); rebuildAll(); }, rplus: () => { S.R = Math.min(1000, +(S.R * 1.5).toFixed(3)); rebuildAll(); }, rminus: () => { S.R = Math.max(.5, +(S.R / 1.5).toFixed(3)); rebuildAll(); } };
  function ctl(a) { if (ACT[a]) ACT[a](); document.querySelectorAll('[data-c3]').forEach(b => { if (A[b.dataset.c3] !== undefined) b.classList.toggle('on', !!A[b.dataset.c3]); }); schedule(); }
  function draw() {
    if (!ctx || !W) return; ctx.save(); ctx.direction = 'ltr'; ctx.fillStyle = A.bg; ctx.fillRect(0, 0, W, H); if (A.floor) floor(); if (A.axes) axes();
    const L = [0.4, -0.5, 0.78], ln = Math.hypot(...L); L[0] /= ln; L[1] /= ln; L[2] /= ln;
    for (const g of gs) {
      if (!g.on || !g.mesh) continue; const polys = g.mesh.polys || [];
      if (mode === 'points') {
        ctx.fillStyle = g.color;
        if (g.mesh.grid) g.mesh.grid.forEach(r => r.forEach(p => { if (p) { const q = project(p); ctx.fillRect(q[0] - 1.2, q[1] - 1.2, 2.4, 2.4); } }));
        else polys.forEach(t => t.forEach(p => { const q = project(p); ctx.fillRect(q[0] - 1.2, q[1] - 1.2, 2.4, 2.4); }));
        continue;
      }
      const items = polys.map(pl => { const pr = pl.map(project); let d = 0; pr.forEach(q => d += q[2]); return { pl, pr, d: d / pr.length }; }).sort((a, b) => b.d - a.d);
      ctx.lineJoin = 'round';
      for (const it of items) {
        ctx.beginPath(); it.pr.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
        if (mode === 'surf' || mode === 'mix') {
          const a = it.pl[0], b = it.pl[1], c = it.pl[2], u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
          let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const nl = Math.hypot(...n) || 1;
          const br = 0.3 + 0.7 * Math.abs((n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nl);
          ctx.fillStyle = shade(g.color, br); ctx.fill(); ctx.strokeStyle = mode === 'mix' ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.25)'; ctx.lineWidth = mode === 'mix' ? .7 : .5; ctx.stroke();
        } else { ctx.strokeStyle = g.color; ctx.lineWidth = 1; ctx.stroke(); }
      }
    }
    ctx.restore();
  }
  function resize() { const st = $('#g3stage'); if (!st || !cv) return; const w = st.clientWidth, h = st.clientHeight; if (w < 20 || h < 20) return; const dpr = window.devicePixelRatio || 1; W = w; H = h; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); schedule(); }
  function setMode(m) { mode = m; document.querySelectorAll('[data-m3]').forEach(b => b.classList.toggle('on', b.dataset.m3 === m)); schedule(); }
  function bind() {
    const ptr = new Map(); let pinch = 0;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
    cv.addEventListener('pointermove', e => {
      const p = ptr.get(e.pointerId); if (!p) return;
      if (ptr.size === 2) { ptr.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch > 0) cam.zoom = Math.min(8, Math.max(.2, cam.zoom * d / pinch)); pinch = d; schedule(); return; }
      cam.yaw -= (e.offsetX - p.x) * 0.008; cam.pitch = Math.max(-1.5, Math.min(1.5, cam.pitch + (e.offsetY - p.y) * 0.008)); ptr.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); schedule();
    });
    const up = e => { ptr.delete(e.pointerId); pinch = 0; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); cam.zoom = Math.min(8, Math.max(.2, cam.zoom * Math.pow(1.0015, -e.deltaY))); schedule(); }, { passive: false });
    cv.addEventListener('dblclick', () => { cam.yaw = -0.75; cam.pitch = 0.55; cam.zoom = 1; schedule(); });
  }
  function domainInfo() {
    const g = [...gs].reverse().find(q => q.on && q.mesh);
    if (!g) return null;
    let lo = Infinity, hi = -Infinity;
    const visit = p => { if (p && isFinite(p[2])) { lo = Math.min(lo, p[2]); hi = Math.max(hi, p[2]); } };
    const m = g.mesh || {}; (m.grid || []).forEach(row => row.forEach(visit)); (m.polys || []).forEach(poly => poly.forEach(visit)); (m.tris || []).forEach(poly => poly.forEach(visit));
    const fmt = n => Number.isFinite(n) ? (Math.abs(n) < 1e-7 ? '0' : +n.toFixed(4)) : '—';
    const label = g.src.join(' ; ');
    if (g.type === 'imp') return { label, domain: 'x,y,z ∈ [−' + S.R + ', ' + S.R + ']', range: 'F(x,y,z) = 0 (ڕووی ضمنی)', note: 'مەودای بینراو؛ بۆ هاوکێشەی ضمنی' };
    return { label, domain: 'پارامیتەرەکان ∈ [−' + S.R + ', ' + S.R + '] (بەپێی جۆری گراف)', range: Number.isFinite(lo) ? 'z ∈ [' + fmt(lo) + ', ' + fmt(hi) + ']' : 'نەدۆزرایەوە', note: 'نرخەکان لە نموونەی تۆڕی 3D هەژمار کراون' };
  }
  function updateDomainCard() {
    const box = $('#g3-domain-card'); if (!box) return; const d = domainInfo();
    box.innerHTML = d ? '<b>مەودای ڕووی 3D</b><span class="math">' + esc(d.label) + '</span><span><strong>Domain:</strong> ' + esc(d.domain) + '</span><span><strong>Range:</strong> ' + esc(d.range) + '</span><small>' + esc(d.note) + '</small>' : '<b>مەودای گراف (3D)</b><span>گرافێک زیاد بکە بۆ پیشاندانی مەودا</span>';
  }
  function init() {
    cv = $('#g3canvas'); ctx = cv.getContext('2d'); bind(); load(); renderList();
    document.querySelectorAll('[data-c3]').forEach(b => { const a = b.dataset.c3; let t = 0; const stop = () => { clearInterval(t); t = 0; };
      if (b.dataset.rep) { b.addEventListener('pointerdown', e => { e.preventDefault(); ctl(a); stop(); t = setInterval(() => ctl(a), 70); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop)); } else b.onclick = () => ctl(a); });
    $('#c3-toggle').onclick = () => $('#c3').classList.toggle('min'); ctl('');
    GG.picker($('#pick3'), TYPES, (type, vals) => add(type, vals));
    document.querySelectorAll('[data-m3]').forEach(b => b.onclick = () => setMode(b.dataset.m3));
    document.querySelectorAll('[data-close3]').forEach(b => b.onclick = () => $('#sh3').classList.remove('on'));
    $('#g3-list').addEventListener('click', e => {
      const row = e.target.closest('.eqrow'); if (!row) return; const g = gs.find(q => q.id === +row.dataset.id);
      if (e.target.classList.contains('del')) { gs = gs.filter(q => q !== g); renderList(); save(); schedule(); }
      else if (e.target.classList.contains('eye')) { g.on = !g.on; e.target.classList.toggle('off', !g.on); updateDomainCard(); save(); schedule(); }
    });
    $('#g3-list').addEventListener('input', e => { if (e.target.classList.contains('ec')) { const g = gs.find(q => q.id === +e.target.closest('.eqrow').dataset.id); g.color = e.target.value; save(); schedule(); } });
    $('#g3-clear').onclick = () => { gs = []; renderList(); save(); schedule(); };
    $('#s3-apply').onclick = () => { const r = parseFloat($('#s3-r').value), n = parseInt($('#s3-n').value); if (!(r > 0 && r <= 1000) || !(n >= 8 && n <= 80)) { $('#s3-err').textContent = '⚠ R دەبێت ٠ تا ١٠٠٠ بێت و N لە ٨ تا ٨٠'; return; } $('#s3-err').textContent = ''; S.R = r; S.N = n; gs.forEach(rebuild); renderList(); save(); schedule(); };
    $('#s3-r').value = S.R; $('#s3-n').value = S.N; setMode('surf');
    if (window.ResizeObserver) new ResizeObserver(resize).observe($('#g3stage'));
  }
  return { init, ctl, domainInfo, updateDomainCard, setBg: (bg, fg) => { A.bg = bg; A.fg = fg; schedule(); }, onShow: () => { resize(); updateDomainCard(); schedule(); if (A.auto) tick(); }, openSheet: () => $('#sh3').classList.toggle('on'), refresh: () => { gs.forEach(rebuild); renderList(); schedule(); }, getCanvas: () => cv };
})();
