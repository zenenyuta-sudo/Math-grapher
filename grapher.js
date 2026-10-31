'use strict';
/* Good Grapher — canvas graphing engine. Shares MathEngine (parser/evaluator) with the calculator. */
const Grapher = (function () {
  const E = MathEngine, $ = s => document.querySelector(s);
  const COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#f472b6', '#fbbf24', '#60a5fa', '#fb7185', '#a3e635'];
  const P = {}, prange = {};                       // shared parameter values (also used as evaluation scope)
  let cv, ctx, W = 0, H = 0, dpr = 1, eqs = [], nextId = 1, raf = 0, marks = [], sel = null;
  const V = { xmin: -10, xmax: 10, ymin: -7, ymax: 7, free: false };
  const O = { grid: true, axes: true, labels: true, bg: '#000000', lw: 2.5, gridc: '', axisc: '', txtc: '' };
  const T = { idx: null, deriv: false, tan: false, x0: 1 };
  let DK = true, CA, CB, CC, CD, CE, CF;
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const fmt = v => { if (!isFinite(v)) return String(v); const a = Math.abs(v); return a === 0 || a < 1e-10 ? '0' : String(+v.toPrecision(a >= 1e6 || a < 1e-4 ? 6 : 8)); };
  const BADGE = { ex: '<span class="badge ex">ڕاستەوخۆ / ڕەمزی</span>', ap: '<span class="badge ap">نزیکەیی (ژمارەیی)</span>' };

  /* ---------- equations ---------- */
  function compileEq(eq) {
    try {
      const c = E.classify(eq.src); eq.cls = c; eq.err = null; eq.fns = []; eq.F = null;
      c.params.forEach(p => { if (P[p] === undefined) { P[p] = 1; prange[p] = { min: -10, max: 10 }; } });
      if (c.kind === 'explicit') eq.fns = c.asts.map(a => { const f = E.compile(a); return x => { P.x = x; return f(P); }; });
      else if (c.kind === 'polar') eq.fns = c.asts.map(a => { const f = E.compile(a); return th => { P.theta = th; return f(P); }; });
      else if (c.kind === 'param') { const fx = E.compile(c.asts[0]), fy = E.compile(c.asts[1]); eq.pf = t => { P.t = t; return [fx(P), fy(P)]; }; }
      else { const f = E.compile(c.F); eq.F = (x, y) => { P.x = x; P.y = y; return f(P); }; }
    } catch (e) { eq.err = e instanceof E.MathError ? e.message : 'هەڵە: ' + e.message; eq.fns = []; eq.F = null; eq.cls = null; }
  }
  function addEquation(src, o = {}) {
    src = String(src).trim(); if (!src) throw new E.MathError('هاوکێشەکە بەتاڵە');
    E.classify(src);                                   // throws Kurdish error if invalid
    const eq = { id: nextId++, src, color: o.color || COLORS[(nextId - 2) % COLORS.length], on: true };
    eqs.push(eq); compileEq(eq); if (o.select || T.idx === null) T.idx = eq.id;
    renderEqs(); renderParams(); save(); schedule(); if (window.GG && GG.graphPulse) GG.graphPulse('#gstage'); return eq;
  }
  function removeEq(id) { eqs = eqs.filter(e => e.id !== id); if (T.idx === id) T.idx = eqs.length ? eqs[0].id : null; marks = []; renderEqs(); renderParams(); save(); schedule(); }
  function renderEqs() {
    const box = $('#eq-list'); if (!box) return;
    box.innerHTML = eqs.map(e => '<div class="eqrow" data-id="' + e.id + '"><div class="eqline"><input type="color" class="ec" value="' + e.color + '" title="ڕەنگ"><input class="ei" dir="ltr" spellcheck="false" value="' + esc(e.src) + '"><button class="mini eye' + (e.on ? '' : ' off') + '" title="پیشاندان/شاردنەوە">◉</button><button class="mini del" title="سڕینەوە">✕</button></div><div class="eprev math"></div><div class="eerr warn"></div></div>').join('') || '<div class="muted pad">هیچ هاوکێشەیەک نییە. یەکێک زیاد بکە.</div>';
    eqs.forEach(e => rowInfo(e));
    const sel2 = $('#t-eq'); if (sel2) sel2.innerHTML = eqs.map(e => '<option value="' + e.id + '"' + (e.id === T.idx ? ' selected' : '') + '>' + esc(e.src) + '</option>').join('');
    updateDomainCard();
  }
  function rowInfo(e) {
    const r = document.querySelector('.eqrow[data-id="' + e.id + '"]'); if (!r) return;
    r.querySelector('.eerr').textContent = e.err ? '⚠ ' + e.err : '';
    let h = ''; try { h = E.toHTML(E.parse(e.src)); } catch (x) { }
    r.querySelector('.eprev').innerHTML = e.err ? '' : h; r.style.setProperty('--c', e.color);
  }
  function renderParams() {
    const box = $('#params'); if (!box) return;
    const used = new Set(); eqs.forEach(e => e.cls && e.cls.params.forEach(p => used.add(p)));
    const list = [...used].sort();
    box.innerHTML = list.length ? list.map(p => { const r = prange[p]; return '<div class="prow" data-p="' + p + '"><b class="math">' + p + '</b><input type="range" min="' + r.min + '" max="' + r.max + '" step="0.01" value="' + P[p] + '"><input type="number" class="pv" step="any" value="' + P[p] + '"><span class="pr"><input type="number" class="pmin" value="' + r.min + '" title="کەمترین"><input type="number" class="pmax" value="' + r.max + '" title="زۆرترین"></span></div>'; }).join('') : '<div class="muted pad">پارامیتەر نییە. نموونە: <span class="math">y = a*x^2 + b*x + c</span></div>';
  }

  /* ---------- view helpers ---------- */
  const xs = () => V.xmax - V.xmin, ys = () => V.ymax - V.ymin;
  const sx = x => (x - V.xmin) / xs() * W, sy = y => H - (y - V.ymin) / ys() * H;
  const wx = px => V.xmin + px / W * xs(), wy = py => V.ymin + (H - py) / H * ys();
  function resize() {
    const st = $('#gstage'); if (!st || !cv) return;
    const w = st.clientWidth, h = st.clientHeight; if (w < 20 || h < 20) return;
    dpr = window.devicePixelRatio || 1; W = w; H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!V.free) { const cy = (V.ymin + V.ymax) / 2, sp = xs() * H / W; V.ymin = cy - sp / 2; V.ymax = cy + sp / 2; }
    syncSettings(); schedule();
  }
  function reset() { V.free = false; V.xmin = -10; V.xmax = 10; const sp = W ? 20 * H / W : 14; V.ymin = -sp / 2; V.ymax = sp / 2; syncSettings(); schedule(); }
  function zoom(f, cx, cy) {
    const px = cx === undefined ? (V.xmin + V.xmax) / 2 : cx, py = cy === undefined ? (V.ymin + V.ymax) / 2 : cy;
    V.xmin = px + (V.xmin - px) * f; V.xmax = px + (V.xmax - px) * f; V.ymin = py + (V.ymin - py) * f; V.ymax = py + (V.ymax - py) * f; syncSettings(); schedule();
  }
  function nice(r) { const p = Math.pow(10, Math.floor(Math.log10(r))), m = r / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }

  /* ---------- drawing ---------- */
  const bgLum = h => { const n = parseInt(String(h).slice(1), 16) || 0; return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  const rgba = (h, a) => { const n = parseInt(String(h).slice(1), 16) || 0; return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); if (window.Annot) Annot.render(); }); }
  function draw() {
    if (!ctx || !W) return;
    DK = bgLum(O.bg) < .5;
    CA = DK ? 'rgba(200,215,255,.75)' : 'rgba(25,35,70,.8)'; CB = DK ? 'rgba(200,215,255,.8)' : 'rgba(25,35,70,.85)'; CC = CA; CD = CB; CE = DK ? 'rgba(200,215,255,.45)' : 'rgba(10,15,40,.45)'; CF = DK ? '#ffffff' : '#0b1430';
    if (O.axisc) { CA = CC = O.axisc; } if (O.txtc) { CB = CD = CF = O.txtc; }
    const GM = O.gridc ? rgba(O.gridc, .35) : 'rgba(120,150,255,.22)', Gm = O.gridc ? rgba(O.gridc, .12) : 'rgba(120,150,255,.07)';
    ctx.save(); ctx.direction = 'ltr'; ctx.fillStyle = O.bg; ctx.fillRect(0, 0, W, H);
    const gx = nice(xs() / Math.max(3, W / 90)), gy = nice(ys() / Math.max(3, H / 90));
    ctx.font = '11px "Cambria Math","STIX Two Math","Times New Roman",serif';
    if (O.grid) {
      ctx.lineWidth = 1;
      for (const [step, horiz] of [[gx, false], [gy, true]]) {
        const a = horiz ? V.ymin : V.xmin, b = horiz ? V.ymax : V.xmax;
        for (let m = Math.ceil(a / (step / 5)); m * step / 5 <= b; m++) {
          const v = m * step / 5, major = m % 5 === 0; ctx.strokeStyle = major ? GM : Gm; ctx.beginPath();
          if (horiz) { const y = Math.round(sy(v)) + .5; ctx.moveTo(0, y); ctx.lineTo(W, y); } else { const x = Math.round(sx(v)) + .5; ctx.moveTo(x, 0); ctx.lineTo(x, H); } ctx.stroke();
        }
      }
    }
    const ax = sx(0), ay = sy(0);
    if (O.axes) { ctx.strokeStyle = CA; ctx.lineWidth = 1.6; ctx.beginPath(); if (ay >= 0 && ay <= H) { ctx.moveTo(0, ay); ctx.lineTo(W, ay); } if (ax >= 0 && ax <= W) { ctx.moveTo(ax, 0); ctx.lineTo(ax, H); } ctx.stroke(); }
    if (O.labels) {
      ctx.fillStyle = CB; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const ly = Math.min(Math.max(ay + 4, 2), H - 14);
      for (let m = Math.ceil(V.xmin / gx); m * gx <= V.xmax; m++) { if (m === 0) continue; ctx.fillText(fmt(m * gx), sx(m * gx), ly); }
      ctx.strokeStyle = CC; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let m = Math.ceil(V.xmin / gx); m * gx <= V.xmax; m++) { if (m && ay >= 0 && ay <= H) { ctx.moveTo(sx(m * gx), ay - 5); ctx.lineTo(sx(m * gx), ay + 5); } }
      for (let m = Math.ceil(V.ymin / gy); m * gy <= V.ymax; m++) { if (m && ax >= 0 && ax <= W) { ctx.moveTo(ax - 5, sy(m * gy)); ctx.lineTo(ax + 5, sy(m * gy)); } }
      ctx.stroke(); ctx.fillStyle = CD;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; const lx = Math.min(Math.max(ax - 5, 30), W - 3);
      for (let m = Math.ceil(V.ymin / gy); m * gy <= V.ymax; m++) { if (m === 0) continue; ctx.fillText(fmt(m * gy), lx, sy(m * gy)); }
      if (ax >= 0 && ax <= W && ay >= 0 && ay <= H) { ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('0', ax - 4, ay + 4); }
      ctx.font = 'italic 13px "Cambria Math",serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('x', W - 6, Math.min(Math.max(ay - 4, 14), H - 2)); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('y', Math.min(Math.max(ax + 6, 2), W - 12), 4);
    }
    for (const e of eqs) if (e.on && !e.err) {
      try {
        ctx.strokeStyle = e.color; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = O.lw; ctx.shadowColor = e.color; ctx.shadowBlur = 10; ctx.setLineDash([]);
        if (e.cls.kind === 'explicit') for (const f of e.fns) plotFn(f);
        else if (e.cls.kind === 'polar') { const deg = E.angle === 'deg', TM = deg ? 360 : 2 * Math.PI; for (const f of e.fns) plotCurve(th => { const r = f(th), a = deg ? th * Math.PI / 180 : th; return [r * Math.cos(a), r * Math.sin(a)]; }, 0, TM, 2400); }
        else if (e.cls.kind === 'param') plotCurve(e.pf, E.angle === 'deg' ? -360 : -10, E.angle === 'deg' ? 360 : 10, 4000);
        else plotImplicit(e.F);
        ctx.shadowBlur = 0;
        if (e.id === T.idx && e.cls.kind === 'explicit') {
          const f = e.fns[0];
          if (T.deriv) { ctx.strokeStyle = e.color; ctx.globalAlpha = .75; ctx.lineWidth = Math.max(1.5, O.lw * .7); ctx.setLineDash([7, 5]); plotFn(x => E.dnum(f, x)); ctx.setLineDash([]); ctx.globalAlpha = 1; }
          if (T.tan) { const y0 = f(T.x0), m = E.dnum(f, T.x0); if (isFinite(y0) && isFinite(m)) { ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(sx(V.xmin), sy(y0 + m * (V.xmin - T.x0))); ctx.lineTo(sx(V.xmax), sy(y0 + m * (V.xmax - T.x0))); ctx.stroke(); ctx.shadowBlur = 0; dot(T.x0, y0, '#fbbf24'); } }
        }
        if (e.err) { e.err = null; rowInfo(e); }
      } catch (er) { ctx.shadowBlur = 0; e.err = er instanceof E.MathError ? er.message : String(er.message); rowInfo(e); }
    }
    ctx.shadowBlur = 0; ctx.setLineDash([]);
    if (sel) {
      ctx.strokeStyle = CE; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx(sel.x), 0); ctx.lineTo(sx(sel.x), H); ctx.stroke(); ctx.setLineDash([]);
      for (const e of eqs) if (e.on && !e.err && e.cls && e.cls.kind === 'explicit') e.fns.forEach(f => { try { const y = f(sel.x); if (isFinite(y)) dot(sel.x, y, e.color); } catch (x) { } });
    }
    for (const m of marks) { dot(m.x, m.y, m.color || '#fff', 5.5); if (O.labels && m.label) { ctx.fillStyle = CF; ctx.font = '11px "Cambria Math",serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(m.label, sx(m.x) + 8, sy(m.y) - 6); } }
    ctx.restore();
  }
  function dot(x, y, c, r = 4.5) { const px = sx(x), py = sy(y); if (px < -20 || px > W + 20 || py < -20 || py > H + 20) return; ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = '#0a1128'; ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
  function plotFn(f) {
    ctx.beginPath(); let pen = false, py = 0, pyv = 0;
    for (let px = 0; px <= W; px++) {
      const x = V.xmin + px / W * xs(), y = f(x);
      if (!isFinite(y)) { pen = false; continue; }
      const s = H - (y - V.ymin) / ys() * H;
      if (Math.abs(s) > 1e6) { pen = false; continue; }
      if (pen && (Math.abs(s - py) > H / 2 || (y * pyv < 0 && Math.abs(s - py) > H / 4))) pen = false;
      if (pen) ctx.lineTo(px, s); else ctx.moveTo(px, s);
      pen = true; py = s; pyv = y;
    }
    ctx.stroke();
  }
  function plotCurve(fn, t0, t1, n) {
    ctx.beginPath(); let pen = false, px0 = 0, py0 = 0;
    for (let i = 0; i <= n; i++) {
      const p = fn(t0 + (t1 - t0) * i / n), X = sx(p[0]), Y = sy(p[1]);
      if (!isFinite(X) || !isFinite(Y) || Math.abs(X) > 1e6 || Math.abs(Y) > 1e6) { pen = false; continue; }
      if (pen && Math.hypot(X - px0, Y - py0) > Math.max(W, H)) pen = false;
      if (pen) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
      pen = true; px0 = X; py0 = Y;
    }
    ctx.stroke();
  }
  function plotImplicit(F) {
    const c = 3, nx = Math.ceil(W / c) + 1, ny = Math.ceil(H / c) + 1, g = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g[j * nx + i] = F(wx(i * c), wy(j * c));
    ctx.beginPath();
    const lerp = (a, b) => a / (a - b);
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = g[j * nx + i], b = g[j * nx + i + 1], d = g[(j + 1) * nx + i], e = g[(j + 1) * nx + i + 1];
      if (!isFinite(a + b + d + e)) continue;
      const x0 = i * c, y0 = j * c, pts = [];
      if (a * b < 0) pts.push([x0 + lerp(a, b) * c, y0]);
      if (b * e < 0) pts.push([x0 + c, y0 + lerp(b, e) * c]);
      if (d * e < 0) pts.push([x0 + lerp(d, e) * c, y0 + c]);
      if (a * d < 0) pts.push([x0, y0 + lerp(a, d) * c]);
      for (let k = 0; k + 1 < pts.length; k += 2) { ctx.moveTo(pts[k][0], pts[k][1]); ctx.lineTo(pts[k + 1][0], pts[k + 1][1]); }
    }
    ctx.stroke();
  }

  /* ---------- pointer interaction: drag, wheel, pinch, tap ---------- */
  function bindPointer() {
    const ptr = new Map(); let moved = false, startPos = null, pinch = 0;
    cv.addEventListener('pointerdown', ev => { cv.setPointerCapture(ev.pointerId); ptr.set(ev.pointerId, { x: ev.offsetX, y: ev.offsetY }); moved = false; startPos = { x: ev.offsetX, y: ev.offsetY }; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
    cv.addEventListener('pointermove', ev => {
      const p = ptr.get(ev.pointerId);
      if (!p) { hoverAt(ev.offsetX, ev.offsetY); return; }
      if (ptr.size === 2) {
        ptr.set(ev.pointerId, { x: ev.offsetX, y: ev.offsetY }); const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && d > 0) zoom(pinch / d, wx((a.x + b.x) / 2), wy((a.y + b.y) / 2)); pinch = d; moved = true; return;
      }
      const dx = ev.offsetX - p.x, dy = ev.offsetY - p.y;
      if (Math.hypot(ev.offsetX - startPos.x, ev.offsetY - startPos.y) > 4) moved = true;
      if (moved) { const mx = dx / W * xs(), my = dy / H * ys(); V.xmin -= mx; V.xmax -= mx; V.ymin += my; V.ymax += my; cv.style.cursor = 'grabbing'; syncSettings(); schedule(); }
      ptr.set(ev.pointerId, { x: ev.offsetX, y: ev.offsetY }); hoverAt(ev.offsetX, ev.offsetY);
    });
    const up = ev => { if (ptr.has(ev.pointerId) && ptr.size === 1 && !moved) selectAt(ev.offsetX); ptr.delete(ev.pointerId); pinch = 0; cv.style.cursor = 'crosshair'; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', () => { const r = $('#g-read'); if (r) r.textContent = 'ماوسەکە بجووڵێنە بۆ پیشاندانی هاوتا'; });
    cv.addEventListener('wheel', ev => { ev.preventDefault(); zoom(Math.pow(1.0015, ev.deltaY), wx(ev.offsetX), wy(ev.offsetY)); }, { passive: false });
  }
  function hoverAt(px, py) { const r = $('#g-read'); if (!r) return; const d = Math.max(0, Math.min(8, 2 - Math.floor(Math.log10(xs() / W)))); r.innerHTML = '<span class="math">x = ' + wx(px).toFixed(d) + ' ،  y = ' + wy(py).toFixed(d) + '</span>'; }
  function selectAt(px) {
    sel = { x: wx(px) }; T.x0 = +fmt(sel.x); const t = $('#t-x0'); if (t) t.value = T.x0; showSel(); schedule();
  }
  function showSel() {
    const b = $('#g-sel'); if (!b) return; if (!sel) { b.innerHTML = ''; return; }
    let h = '<div class="math">x = ' + fmt(sel.x) + '</div>';
    eqs.forEach((e, i) => { if (e.on && !e.err && e.cls.kind === 'explicit') e.fns.forEach(f => { try { const y = f(sel.x); h += '<div class="math"><i class="sw" style="background:' + e.color + '"></i> f<sub>' + (i + 1) + '</sub>(x) = ' + (isFinite(y) ? fmt(y) : 'پێناسە نەکراوە') + '</div>'; } catch (x) { } }); });
    b.innerHTML = h + '<div class="muted">نرخەکان ژمارەییە</div>';
  }

  /* ---------- analysis tools ---------- */
  const target = () => eqs.find(e => e.id === T.idx && e.cls && e.cls.kind === 'explicit' && !e.err);
  function numAst(e) { let a = e.cls.asts[0]; Object.keys(P).forEach(k => { if (k !== 'x' && k !== 'y') a = E.subst(a, k, E.N(P[k])); }); return a; }
  function toolOut(h) { $('#t-out').innerHTML = h; }
  function need() { const e = target(); if (!e) { toolOut('<div class="warn">⚠ هاوکێشەیەکی ڕوون (y = f(x)) هەڵبژێرە. هاوکێشە ئاماژەکراوەکان (implicit) بۆ ئەم ئامرازە نین.</div>'); return null; } return e; }
  function addMark(x, y, label, color) { marks.push({ x, y, label, color }); }
  function polyInfo(e) { try { return E.polyFit(numAst(e), 'x'); } catch (x) { return null; } }
  const tools = {
    roots() {
      const e = need(); if (!e) return; marks = []; const co = polyInfo(e), f = e.fns[0]; let h = '<h4>ڕەگەکان / بڕینی تەوەری X</h4>', xs2 = [], exact = false;
      if (co && co.length === 2) { xs2 = [-co[0] / co[1]]; exact = true; }
      else if (co && co.length === 3) { const [c, b, a] = co, d = b * b - 4 * a * c; exact = true; if (d > 0) xs2 = [(-b - Math.sqrt(d)) / (2 * a), (-b + Math.sqrt(d)) / (2 * a)]; else if (d === 0) xs2 = [-b / (2 * a)]; }
      if (!exact) xs2 = E.roots(f, V.xmin, V.xmax);
      if (co && co.length === 1) h += '<div class="muted">' + (co[0] === 0 ? 'هەموو x ڕەگە (f = 0)' : 'ڕەگ نییە') + '</div>';
      else if (!xs2.length) h += '<div class="muted">لەم ماوەیەی ڕێکخراودا ڕەگ نەدۆزرایەوە.</div>';
      xs2.sort((a, b) => a - b).forEach(r => { addMark(r, 0, 'x≈' + fmt(r), '#34d399'); h += '<div class="math">x = ' + fmt(r) + ' ' + (exact ? BADGE.ex : BADGE.ap) + '</div>'; });
      if (exact && co.length === 3 && co[1] * co[1] - 4 * co[2] * co[0] < 0) h += '<div class="muted">Δ < 0 — ڕەگی ڕاستەقینە نییە.</div>';
      if (!exact) h += '<div class="muted">تەنها لە ماوەی بینراوی گرافەکە گەڕاوە؛ ئەنجامەکان نزیکەیین.</div>';
      toolOut(h); schedule();
    },
    yint() {
      const e = need(); if (!e) return; marks = []; const f = e.fns[0], y = f(0);
      if (!isFinite(y)) return toolOut('<div class="warn">f(0) پێناسە نەکراوە — بڕینی تەوەری Y نییە.</div>');
      addMark(0, y, '(0, ' + fmt(y) + ')', '#22d3ee'); toolOut('<h4>بڕینی تەوەری Y</h4><div class="math">f(0) = ' + fmt(y) + ' ' + BADGE.ex + '</div>'); schedule();
    },
    ext() {
      const e = need(); if (!e) return; marks = []; const co = polyInfo(e), f = e.fns[0]; let h = '<h4>لووتکە و نشێو (Local max / min)</h4>', list = [], exact = false;
      if (co && co.length === 3) { const x = -co[1] / (2 * co[2]), y = co[2] * x * x + co[1] * x + co[0]; list = [{ x, y, type: co[2] < 0 ? 'max' : 'min' }]; exact = true; }
      else list = E.extrema(f, V.xmin, V.xmax);
      if (!list.length) h += '<div class="muted">لەم ماوەیەدا لووتکە/نشێو نەدۆزرایەوە.</div>';
      list.forEach(p => { addMark(p.x, p.y, (p.type === 'max' ? 'max' : 'min') + ' (' + fmt(p.x) + ', ' + fmt(p.y) + ')', p.type === 'max' ? '#f472b6' : '#fbbf24'); h += '<div class="math">' + (p.type === 'max' ? 'لووتکە' : 'نشێو') + ' : (' + fmt(p.x) + ' ، ' + fmt(p.y) + ') ' + (exact ? BADGE.ex : BADGE.ap) + '</div>'; });
      if (!exact) h += '<div class="muted">دۆزینەوەی ژمارەیی: داتاشراو لە ژێر چاودێری گۆڕینی نیشانە.</div>'; toolOut(h); schedule();
    },
    inter() {
      const ex = eqs.filter(e => e.on && e.cls && e.cls.kind === 'explicit' && !e.err); marks = [];
      if (ex.length < 2) return toolOut('<div class="warn">بۆ نیشاندانی خاڵی بڕین پێویستە لانیکەم دوو هاوکێشەی y=f(x) هەبێت.</div>');
      let h = '<h4>خاڵەکانی بڕین (Intersections)</h4>', n = 0;
      for (let i = 0; i < ex.length; i++) for (let j = i + 1; j < ex.length; j++) {
        const f = ex[i].fns[0], g = ex[j].fns[0];
        E.roots(x => f(x) - g(x), V.xmin, V.xmax).forEach(r => { const y = f(r); if (!isFinite(y)) return; n++; addMark(r, y, '(' + fmt(r) + ', ' + fmt(y) + ')', '#fff'); h += '<div class="math">f<sub>' + (eqs.indexOf(ex[i]) + 1) + '</sub> ∩ f<sub>' + (eqs.indexOf(ex[j]) + 1) + '</sub> : (' + fmt(r) + ' ، ' + fmt(y) + ') ' + BADGE.ap + '</div>'; });
      }
      if (!n) h += '<div class="muted">لەم ماوەیەی بینراودا خاڵی بڕین نەدۆزرایەوە.</div>'; toolOut(h); schedule();
    },
    value() {
      const e = need(); if (!e) return; const s = $('#t-x0').value; let x;
      try { x = E.compile(E.parse(s))({}); if (!isFinite(x)) throw 0; } catch (er) { return toolOut('<div class="warn">⚠ نرخی x نادروستە.</div>'); }
      T.x0 = x; marks = []; const f = e.fns[0], y = f(x);
      if (!isFinite(y)) toolOut('<div class="warn">f(' + fmt(x) + ') پێناسە نەکراوە (دەرەوەی دۆمەین).</div>');
      else { addMark(x, y, '(' + fmt(x) + ', ' + fmt(y) + ')', '#22d3ee'); let h = '<h4>نرخی فەنکشن</h4><div class="math">f(' + fmt(x) + ') = ' + fmt(y) + ' ' + BADGE.ap + '</div>'; const m = E.dnum(f, x); if (isFinite(m)) h += '<div class="math">f′(' + fmt(x) + ') ≈ ' + fmt(m) + ' ' + BADGE.ap + '</div><div class="math">هاوکێشەی لیڤینەر: y = ' + fmt(m) + '(x − ' + fmt(x) + ') + ' + fmt(y) + '</div>'; toolOut(h); }
      schedule();
    },
    domain() {
      const e = need(); if (!e) return; const f = e.fns[0], N = 40000, a = -200, b = 200; let lo = Infinity, hi = -Infinity, bad = [], cur = null;
      for (let i = 0; i <= N; i++) { const x = a + (b - a) * i / N; let y; try { y = f(x); } catch (er) { y = NaN; } if (!isFinite(y)) { if (!cur) cur = { a: x }; cur.b = x; } else { if (cur) { bad.push(cur); cur = null; } if (Math.abs(y) < 1e6) { lo = Math.min(lo, y); hi = Math.max(hi, y); } } }
      if (cur) bad.push(cur);
      let h = '<h4>دۆمەین و ڕێنج (نزیکەیی)</h4><div class="math">x ∈ [−200, 200] : ' + (bad.length ? 'پێناسە نەکراو نزیک/لە: ' + bad.slice(0, 5).map(r => r.a === r.b || r.b - r.a < 0.02 ? '≈' + fmt(r.a) : '[' + fmt(r.a) + ', ' + fmt(r.b) + ']').join(' ، ') : 'لە هەموو خاڵەکان پێناسە کراوە') + '</div>';
      h += '<div class="math">y ∈ [' + fmt(lo) + ' ، ' + fmt(hi) + '] (ڕێنجی بینراو لەم نموونەیەدا)</div>' + BADGE.ap + '<div class="muted">ئەمە لە نموونە وەرگرتنی ژمارەییەوەیە، بەڵگەی ماتماتیکی نییە — بۆ ڕێنجی ناکۆتا/ئاسیمپتۆت وردبینی بکە.</div>';
      toolOut(h);
    }
  };

  /* ---------- settings + persistence ---------- */
  function syncSettings() {
    const set = (id, v) => { const el = $(id); if (el && document.activeElement !== el) el.value = fmt(v); };
    set('#s-xmin', V.xmin); set('#s-xmax', V.xmax); set('#s-ymin', V.ymin); set('#s-ymax', V.ymax);
  }
  function setAngle(a) { E.angle = a; document.querySelectorAll('.angle-sel').forEach(s => s.value = a); document.querySelectorAll('[data-angle]').forEach(b => b.classList.toggle('on', b.dataset.angle === a)); marks = []; try { localStorage.setItem('g12.angle', a); } catch (e) { } showSel(); schedule(); if (typeof G3 !== 'undefined' && G3.refresh) G3.refresh(); }
  function save() { try { localStorage.setItem('g12.graph', JSON.stringify({ eqs: eqs.map(e => ({ src: e.src, color: e.color, on: e.on })), P: Object.fromEntries(Object.entries(P).filter(([k]) => k !== 'x' && k !== 'y')), prange, O })); } catch (e) { } }
  function load() {
    try { const s = JSON.parse(localStorage.getItem('g12.graph')); if (s && s.eqs) { Object.assign(prange, s.prange || {}); Object.assign(P, s.P || {}); Object.assign(O, s.O || {}); s.eqs.forEach(q => { const e = { id: nextId++, src: q.src, color: q.color, on: q.on !== false }; eqs.push(e); compileEq(e); }); T.idx = eqs[0] && eqs[0].id; return; } } catch (e) { }
    P.a = 1; P.b = 0; P.c = 0; prange.a = { min: -5, max: 5 }; prange.b = { min: -10, max: 10 }; prange.c = { min: -10, max: 10 };
    ['y = a*x^2 + b*x + c', 'y = sin(x)'].forEach((s, i) => { const e = { id: nextId++, src: s, color: COLORS[i], on: true }; eqs.push(e); compileEq(e); }); T.idx = eqs[0].id;
  }
  const SHEETS = ['sh-list', 'sh-tools'];
  function openSheet(name, force) {
    SHEETS.forEach(s => { const el = $('#' + s); if (el) el.classList.toggle('on', name !== null && s === 'sh-' + name && (force || !el.classList.contains('on'))); });
    const gOn = !SHEETS.some(s => $('#' + s) && $('#' + s).classList.contains('on'));
    [['m-graph', gOn], ['m-tools', !!$('#sh-tools').classList.contains('on')]].forEach(([id, on]) => { const b = $('#' + id); if (b) b.classList.toggle('on', on); });
    setTimeout(resize, 30);
  }
  const TYPES2 = [{ id: 'yx', lab: 'y(x)', fields: ['y ='] }, { id: 'xy', lab: 'x(y)', fields: ['x ='] }, { id: 'polar', lab: 'r(θ)', fields: ['r ='] },
    { id: 'param', lab: 'x(t), y(t)', fields: ['x(t) =', 'y(t) ='] }, { id: 'imp', lab: 'F(x,y)', fields: ['F(x,y) = 0 ←'] }];
  function buildSrc(type, v) {
    const t = x => x.trim();
    switch (type) {
      case 'yx': return /=/.test(v[0]) ? t(v[0]) : 'y = ' + t(v[0]);
      case 'xy': return 'x = ' + t(v[0]);
      case 'polar': return 'r = ' + t(v[0]);
      case 'param': return 'x = ' + t(v[0]) + '; y = ' + t(v[1]);
      default: return /=/.test(v[0]) ? t(v[0]) : t(v[0]) + ' = 0';
    }
  }
  function range(r) { V.free = false; V.xmin = -r; V.xmax = r; const sp = W ? 2 * r * H / W : 1.4 * r; V.ymin = -sp / 2; V.ymax = sp / 2; syncSettings(); schedule(); }
  function setBg(c) { O.bg = c; const el = $('#s-bg'); if (el) el.value = c; save(); schedule(); }
  function domRange() {                              // short text for D(f) and R(f), from dense sampling (approximate)
    const e = target(); if (!e) return null; const f = e.fns[0], a = -200, b = 200, N = 16000;
    const val = x => { let y; try { y = f(x); } catch (er) { return null; } return isFinite(y) ? y : null; };
    const edge = (xb, xg) => { for (let i = 0; i < 60; i++) { const m = (xb + xg) / 2; if (val(m) === null) xb = m; else xg = m; } return xg; };
    const r6 = v => Math.round(v * 1e6) / 1e6, segs = []; let lo = Infinity, hi = -Infinity, up = false, dn = false, st = null, px = a, pg = false;
    for (let i = 0; i <= N; i++) {
      const x = a + (b - a) * i / N, y = val(x), g = y !== null;
      if (g) { if (Math.abs(y) >= 1e4) { if (y > 0) up = true; else dn = true; } else { lo = Math.min(lo, y); hi = Math.max(hi, y); } }
      if (g && !pg) st = i === 0 ? -Infinity : edge(px, x);
      if (!g && pg) { segs.push([st, edge(x, px)]); st = null; }
      px = x; pg = g;
    }
    if (pg) segs.push([st, Infinity]);
    if (!segs.length) return { name: e.src, dom: '∅', rng: '∅' };
    const S = segs.map(q => { const l = q[0] === -Infinity ? q[0] : r6(q[0]), h2 = q[1] === Infinity ? q[1] : r6(q[1]); return { l, h: h2, lc: isFinite(l) && val(l) !== null, hc: isFinite(h2) && val(h2) !== null }; });
    const merged = []; S.forEach(q => { const p = merged[merged.length - 1]; if (p && p.h === q.l && !p.hc && !q.lc) { p.ex = (p.ex || []).concat(q.l); p.h = q.h; p.hc = q.hc; } else merged.push(q); });
    const nm = v => fmt(+v.toFixed(4)), ft = q => (q.l === -Infinity ? '(−∞' : (q.lc ? '[' : '(') + nm(q.l)) + ', ' + (q.h === Infinity ? '∞)' : nm(q.h) + (q.hc ? ']' : ')'));
    const dom = merged.length === 1 && merged[0].l === -Infinity && merged[0].h === Infinity ? (merged[0].ex ? 'ℝ \\ {' + merged[0].ex.map(nm).join(', ') + '}' : 'ℝ') : merged.map(ft).join(' ∪ ');
    const rng = (dn && up) ? 'ℝ' : (isFinite(lo) ? (dn ? '(−∞' : '[' + nm(lo)) + ', ' + (up ? '∞)' : nm(hi) + ']') : 'ℝ');
    return { name: e.src, dom, rng: '≈ ' + rng };
  }
  function updateDomainCard() {
    const box = $('#g-domain-card'); if (!box) return;
    const d = domRange();
    box.innerHTML = d ? '<b>مەودای فەنکشن (2D)</b><span class="math">' + esc(d.name) + '</span><span><strong>Domain / D(f):</strong> ' + esc(d.dom) + '</span><span><strong>Range / R(f):</strong> ' + esc(d.rng) + '</span><small>هەڵسەنگاندنی نزیکەیی بۆ گرافی هەڵبژێردراو</small>' : '<b>مەودای گراف (2D)</b><span>گرافێک زیاد بکە بۆ پیشاندانی مەودا</span>';
  }
  function tab(name) { GG.show(name === 'calc' ? 'calc' : 'g2'); }
  function init() {
    cv = $('#gcanvas'); ctx = cv.getContext('2d'); load(); setAngle((function () { try { return localStorage.getItem('g12.angle') || 'rad'; } catch (e) { return 'rad'; } })());
    $('#s-grid').checked = O.grid; $('#s-axes').checked = O.axes; $('#s-labels').checked = O.labels; $('#s-bg').value = O.bg; $('#s-lw').value = O.lw;
    renderEqs(); renderParams(); bindPointer();
    GG.picker($('#pick2'), TYPES2, (type, vals) => addEquation(buildSrc(type, vals), { select: true }));
    $('#m-graph').onclick = () => openSheet(null); $('#m-tools').onclick = () => openSheet('tools'); $('#m-inter').onclick = () => { openSheet('tools', true); tools.inter(); };
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => openSheet(null));
    const list = $('#eq-list');
    list.addEventListener('input', ev => {
      const row = ev.target.closest('.eqrow'); if (!row) return; const e = eqs.find(q => q.id === +row.dataset.id);
      if (ev.target.classList.contains('ei')) { e.src = ev.target.value; const before = (e.cls ? e.cls.params : []).join(); compileEq(e); rowInfo(e); if ((e.cls ? e.cls.params : []).join() !== before) renderParams(); const o = $('#t-eq option[value="' + e.id + '"]'); if (o) o.textContent = e.src; save(); schedule(); }
      else if (ev.target.classList.contains('ec')) { e.color = ev.target.value; rowInfo(e); save(); schedule(); }
    });
    list.addEventListener('click', ev => {
      const row = ev.target.closest('.eqrow'); if (!row) return; const id = +row.dataset.id, e = eqs.find(q => q.id === id);
      if (ev.target.classList.contains('del')) removeEq(id);
      else if (ev.target.classList.contains('eye')) { e.on = !e.on; ev.target.classList.toggle('off', !e.on); updateDomainCard(); save(); schedule(); }
      else if (!ev.target.classList.contains('ei') && !ev.target.classList.contains('ec')) { T.idx = id; const s = $('#t-eq'); if (s) s.value = id; document.querySelectorAll('.eqrow').forEach(r => r.classList.toggle('cur', +r.dataset.id === id)); updateDomainCard(); schedule(); }
    });
    $('#eq-clear').onclick = () => { eqs = []; marks = []; sel = null; T.idx = null; renderEqs(); renderParams(); showSel(); save(); schedule(); };
    $('#params').addEventListener('input', ev => {
      const row = ev.target.closest('.prow'); if (!row) return; const p = row.dataset.p, r = prange[p];
      if (ev.target.type === 'range' || ev.target.classList.contains('pv')) {
        const v = parseFloat(ev.target.value); if (isNaN(v)) return; P[p] = v;
        if (ev.target.classList.contains('pv')) { if (v < r.min) { r.min = v; row.querySelector('.pmin').value = v; row.querySelector('[type=range]').min = v; } if (v > r.max) { r.max = v; row.querySelector('.pmax').value = v; row.querySelector('[type=range]').max = v; } row.querySelector('[type=range]').value = v; }
        else row.querySelector('.pv').value = v;
        marks = []; showSel(); save(); schedule();
      } else { const a = parseFloat(row.querySelector('.pmin').value), b = parseFloat(row.querySelector('.pmax').value); if (!isNaN(a) && !isNaN(b) && a < b) { r.min = a; r.max = b; const s = row.querySelector('[type=range]'); s.min = a; s.max = b; save(); } }
    });
    $('#z-in').onclick = () => zoom(.8); $('#z-out').onclick = () => zoom(1.25); $('#z-reset').onclick = reset;
    $('#s-apply').onclick = () => {
      const a = parseFloat($('#s-xmin').value), b = parseFloat($('#s-xmax').value), c = parseFloat($('#s-ymin').value), d = parseFloat($('#s-ymax').value), m = $('#s-err');
      if ([a, b, c, d].some(isNaN) || a >= b || c >= d) { m.textContent = '⚠ ماوەکان نادروستن: دەبێت کەمترین < زۆرترین'; return; }
      m.textContent = ''; V.xmin = a; V.xmax = b; V.ymin = c; V.ymax = d; V.free = true; schedule();
    };
    $('#s-grid').onchange = e => { O.grid = e.target.checked; save(); schedule(); }; $('#s-axes').onchange = e => { O.axes = e.target.checked; save(); schedule(); };
    $('#s-labels').onchange = e => { O.labels = e.target.checked; save(); schedule(); }; $('#s-bg').oninput = e => { O.bg = e.target.value; save(); schedule(); };
    [['#s-gridc', 'gridc', '#7896ff'], ['#s-axisc', 'axisc', '#c8d7ff'], ['#s-txtc', 'txtc', '#c8d7ff']].forEach(([id, k, d]) => { const el = $(id); if (!el) return; el.value = O[k] || d; el.oninput = e => { O[k] = e.target.value; save(); schedule(); }; });
    if ($('#s-gcreset')) $('#s-gcreset').onclick = () => { O.gridc = O.axisc = O.txtc = ''; [['#s-gridc', '#7896ff'], ['#s-axisc', '#c8d7ff'], ['#s-txtc', '#c8d7ff']].forEach(([id, d]) => { $(id).value = d; }); save(); schedule(); };
    $('#s-lw').oninput = e => { O.lw = parseFloat(e.target.value); save(); schedule(); };
    document.querySelectorAll('.angle-sel').forEach(s => s.onchange = () => setAngle(s.value));
    document.querySelectorAll('[data-angle]').forEach(b => b.onclick = () => setAngle(b.dataset.angle));
    $('#t-eq').onchange = e => { T.idx = +e.target.value; updateDomainCard(); schedule(); };
    $('#t-deriv').onchange = e => { T.deriv = e.target.checked; schedule(); }; $('#t-tan').onchange = e => { T.tan = e.target.checked; T.x0 = parseFloat($('#t-x0').value) || 0; schedule(); };
    $('#t-x0').oninput = e => { try { const v = E.compile(E.parse(e.target.value))({}); if (isFinite(v)) { T.x0 = v; schedule(); } } catch (x) { } };
    $('#t-roots').onclick = tools.roots; $('#t-yint').onclick = tools.yint; $('#t-ext').onclick = tools.ext; $('#t-inter').onclick = tools.inter; $('#t-val').onclick = tools.value; $('#t-dom').onclick = tools.domain;
    $('#t-clear').onclick = () => { marks = []; sel = null; showSel(); toolOut(''); schedule(); };
    if (window.ResizeObserver) new ResizeObserver(resize).observe($('#gstage')); window.addEventListener('resize', resize);
    resize(); reset();
  }
  /* mini preview for the function library (radians, fixed window) */
  function preview(canvas, expr) {
    const c = canvas.getContext('2d'); c.direction = 'ltr'; const w = canvas.width, h = canvas.height, saved = E.angle; E.angle = 'rad';
    try {
      const cls = E.classify(expr), f = E.compile(cls.asts[0]), sc = {}, xr = 6, yr = xr * h / w;
      c.fillStyle = '#0a1128'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,150,255,.18)'; c.lineWidth = 1;
      for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo((i + xr) / (2 * xr) * w, 0); c.lineTo((i + xr) / (2 * xr) * w, h); c.stroke(); }
      for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(0, h / 2 - i / yr * h / 2); c.lineTo(w, h / 2 - i / yr * h / 2); c.stroke(); }
      c.strokeStyle = 'rgba(200,215,255,.7)'; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
      c.strokeStyle = '#22d3ee'; c.shadowColor = '#22d3ee'; c.shadowBlur = 8; c.lineWidth = 2.4; c.beginPath(); let pen = false, pp = 0;
      for (let px = 0; px <= w; px++) { sc.x = (px / w * 2 - 1) * xr; const y = f(sc), s = h / 2 - y / yr * h / 2; if (!isFinite(y) || Math.abs(s) > 1e5) { pen = false; continue; } if (pen && Math.abs(s - pp) > h / 2) pen = false; if (pen) c.lineTo(px, s); else c.moveTo(px, s); pen = true; pp = s; }
      c.stroke();
    } catch (e) { } E.angle = saved;
  }
  return { init, range, setBg, domRange, updateDomainCard, view: () => ({ W, H, V, sx, sy, wx, wy }), addEquation, tab, openSheet, resize, reset, preview, setAngle, getCanvas: () => cv, onShow: () => { resize(); updateDomainCard(); schedule(); }, clearSaved: () => { try { localStorage.removeItem('g12.graph'); } catch (e) { } } };
})();
