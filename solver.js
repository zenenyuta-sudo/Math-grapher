'use strict';
/* MathSolver — clear, step-by-step results.
   Linear systems: Gauss-Jordan with every row operation shown (exact when coefficients are rational).
   Single equation: MathEngine steps.  Non-linear square systems: Newton from many starts (marked approximate).
   Every solution is substituted back into the equations as a check. */
const Solver = (function () {
  const E = MathEngine, $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const frT = v => { if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v)); const f = E.toFrac(v); return f && f[1] <= 1000 ? f[0] + '/' + f[1] : String(+v.toPrecision(8)); };
  const frH = v => { const t = frT(v), m = /^(-?\d+)\/(\d+)$/.exec(t); return m ? '<span class="fr"><span class="nu">' + m[1] + '</span><span class="de">' + m[2] + '</span></span>' : t; };
  const BX = '<span class="badge ex">وردە / ڕاست</span>', BA = '<span class="badge ap">نزیکەیی</span>';
  const SUB = '₀₁₂₃₄₅₆₇₈₉', sub = i => String(i).split('').map(d => SUB[+d]).join('');
  const mx = A => '<table class="mx">' + A.map(r => '<tr>' + r.map((v, j) => '<td' + (j === r.length - 1 ? ' class="sep"' : '') + '>' + frH(v) + '</td>').join('') + '</tr>').join('') + '</table>';
  const cp = A => A.map(r => r.slice());
  const EX = [['2×2 linear', 'x+y=1\n2x-y=2'], ['3×3 linear', 'x+y+z=6\n2x-y+z=3\nx+2y-z=2'], ['Quadratic', 'x^2-5x+6=0'], ['Non-linear system', 'x^2+y^2=25\nx-y=1'], ['Infinite solutions', 'x+y=2\n2x+2y=4'], ['No solution', 'x+y=2\nx+y=3']];
  const SYM = ['x', 'y', 'z', 'a', 'b', '^2', '√(', '(', ')', '=', '+', '−', '×', '÷', 'π'];

  function linsolve(A, n, log) {                    // Gauss-Jordan; optionally logs each row operation with the matrix after it
    const m = A.length, piv = []; let r = 0;
    for (let c = 0; c < n && r < m; c++) {
      let p = r; for (let i = r + 1; i < m; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
      if (Math.abs(A[p][c]) < 1e-10) continue;
      if (p !== r) { [A[r], A[p]] = [A[p], A[r]]; if (log) log.push({ t: 'R' + sub(r + 1) + ' ↔ R' + sub(p + 1), m: cp(A) }); }
      const d = A[r][c]; if (Math.abs(d - 1) > 1e-12) { A[r] = A[r].map(x => x / d); if (log) log.push({ t: 'R' + sub(r + 1) + ' ← R' + sub(r + 1) + ' ÷ ' + frT(d), m: cp(A) }); }
      for (let i = 0; i < m; i++) if (i !== r) {
        const k = A[i][c]; if (Math.abs(k) < 1e-12) continue;
        A[i] = A[i].map((x, j) => Math.abs(x - k * A[r][j]) < 1e-12 ? 0 : x - k * A[r][j]);
        if (log) log.push({ t: 'R' + sub(i + 1) + ' ← R' + sub(i + 1) + ' − (' + frT(k) + ')·R' + sub(r + 1), m: cp(A) });
      }
      piv.push(c); r++;
    }
    return { A, piv, rank: r };
  }
  function tryLinear(Fs, vars) {
    const A = [];
    for (const F of Fs) {
      const row = []; for (const v of vars) { const d = E.derivative(F, v); if (d.t !== 'num') return null; row.push(d.v); }
      const zero = {}; vars.forEach(v => zero[v] = 0); const b = E.compile(F)(zero); if (!isFinite(b)) return null; row.push(-b); A.push(row);
    }
    return A;
  }
  function newton(Fs, vars) {
    const n = vars.length, f = Fs.map(F => E.compile(F)), ev = x => { const s = {}; vars.forEach((v, i) => s[v] = x[i]); return f.map(g => g(s)); };
    const sols = []; let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const tries = n <= 2 ? 400 : 250, t0 = Date.now();
    for (let t = 0; t < tries && Date.now() - t0 < 2500; t++) {
      let x = vars.map(() => rnd() * 20 - 10), ok = false;
      for (let it = 0; it < 60; it++) {
        const F0 = ev(x); if (F0.some(v => !isFinite(v))) break;
        const J = F0.map(() => []); for (let j = 0; j < n; j++) { const h = 1e-6 * (1 + Math.abs(x[j])), xp = x.slice(), xm = x.slice(); xp[j] += h; xm[j] -= h; const a = ev(xp), b = ev(xm); for (let i = 0; i < n; i++) J[i][j] = (a[i] - b[i]) / (2 * h); }
        const M = J.map((r, i) => [...r, -F0[i]]), s = linsolve(M, n); if (s.rank < n) break;
        const dx = s.A.map(r => r[n]); x = x.map((v, i) => v + dx[i]);
        if (Math.hypot(...dx) < 1e-12 && Math.hypot(...ev(x)) < 1e-9) { ok = true; break; }
      }
      if (ok && !sols.some(s => Math.hypot(...s.map((v, i) => v - x[i])) < 1e-6)) sols.push(x.map(v => Math.abs(v) < 1e-10 ? 0 : v));
    }
    return sols;
  }
  const residual = (Fs, vars, vals) => { const sc = {}; vars.forEach((v, i) => sc[v] = vals[i]); return Math.max(...Fs.map(F => Math.abs(E.compile(F)(sc)))); };
  const checkHTML = (Fs, vars, sols) => {
    const worst = Math.max(...sols.map(s => residual(Fs, vars, s)));
    return worst < 1e-7 ? '<div class="chk-ok">✓ پشکنین: ئەنجامەکان لە هەموو هاوکێشەکاندا دادەنرێنەوە و دروستن.</div>' : '<div class="warn">! پشکنین: جیاوازی ماوەتەوە (≈ ' + worst.toExponential(2) + ')، ئەنجامەکە نزیکەییە.</div>';
  };
  const stepBox = (i, t, m) => '<div class="stp"><span class="no">' + i + '</span><div><div class="math">' + t + '</div>' + (m ? mx(m) : '') + '</div></div>';
  const card = (type, body) => '<div class="svcard"><span class="tbadge">' + type + '</span>' + body + '</div>';
  const final = rows => '<div class="final"><div class="fl">ئەنجام</div>' + rows.join('') + '</div>';
  const fAns = (txt, b) => '<div class="ans"><span class="math big">' + txt + '</span>' + b + '</div>';

  function run() {
    const out = $('#sv-out'), L = $('#sv-in').value.split('\n').map(s => s.trim()).filter(Boolean);
    try {
      if (!L.length) throw new E.MathError('تکایە هاوکێشەکان بنووسە (هەر هاوکێشەیەک لە هێڵێکدا)');
      const Fs = L.map(l => { const a = E.parse(l); if (a.t !== 'rel') return a; if (a.op !== '=') throw new E.MathError('تەنها هاوکێشە (=) پشتگیری دەکرێت'); return E.B('-', a.l, a.r); });
      const vs = new Set(); Fs.forEach(F => E.vars(F, vs)); const vars = [...vs].sort(), n = vars.length;
      if (!n) throw new E.MathError('هیچ گۆڕاوێک نییە بۆ چارەسەرکردن');
      let h = '<div class="eqs math">' + L.map(esc).join('<br>') + '</div>';
      if (Fs.length === 1 && n === 1) {
        const r = E.ops.solve(L[0]);
        h = card('هاوکێشەی یەک گۆڕاو', h + '<h4>هەنگاوەکان</h4>' + r.steps.map((s, i) => stepBox(i + 1, s)).join('') + final(r.answers.map(a => fAns(a.html, '<span class="badge ' + (a.approx ? 'ap' : 'ex') + '">' + (a.approx ? 'نزیکەیی' : 'وردە / ڕاست') + '</span>'))) + (r.notes.length ? '<ul class="notes">' + r.notes.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : ''));
      } else {
        const A0 = tryLinear(Fs, vars);
        if (A0) {
          const exact = A0.every(r => r.every(v => E.toFrac(v))), log = [];
          const { A, piv, rank } = linsolve(cp(A0), n, log);
          let body = h + '<h4>ماتریکسی فراوانکراو</h4>' + mx(A0) + '<h4>هەنگاوەکان (Gauss–Jordan)</h4>' + (log.length ? log.map((s, i) => stepBox(i + 1, s.t, s.m)).join('') : '<div class="muted small">پێویست بە هیچ کردارێک نەبوو.</div>');
          if (A.slice(rank).some(r => Math.abs(r[n]) > 1e-9)) body += final(['<div class="warn">هیچ چارەسەرێک نییە — هاوکێشەکان یەکتر ڕەت دەکەنەوە (ڕیزێک بە شێوەی 0 = ژمارەیەکی ناسفر دەرچوو).</div>']);
          else if (rank < n) {
            const free = vars.filter((v, i) => !piv.includes(i)), rows = piv.map((c, r) => { const terms = vars.map((v, j) => (!piv.includes(j) && Math.abs(A[r][j]) > 1e-10) ? ' − ' + frT(A[r][j]) + '·' + v : '').join(''); return fAns(vars[c] + ' = ' + frT(A[r][n]) + terms, exact ? BX : BA); });
            body += final(['<div class="muted">بێ‌کۆتا چارەسەر هەیە. گۆڕاوی ئازاد: <b>' + free.join('، ') + '</b> (هەر نرخێکی دەبێت)</div>'].concat(rows));
          } else {
            const vals = vars.map((v, i) => A[i][n]);
            body += final([fAns('(' + vars.join('، ') + ') = (' + vals.map(frT).join('، ') + ')', exact ? BX : BA)].concat(vars.map((v, i) => fAns(v + ' = ' + frH(vals[i]), '')))) + checkHTML(Fs, vars, [vals]);
          }
          h = card('سیستەمی هێڵی ' + Fs.length + '×' + n + ' (' + vars.join('، ') + ')', body);
        } else {
          if (Fs.length !== n) throw new E.MathError('بۆ سیستەمی نا‌هێڵی دەبێت ژمارەی هاوکێشە و گۆڕاو یەکسان بێت');
          const sols = newton(Fs, vars);
          h = card('سیستەمی نا‌هێڵی (' + vars.join('، ') + ')', h + '<div class="muted small">شێوازی ژمارەیی Newton لە چەندین خاڵی دەستپێکەوە.</div>' +
            (sols.length ? final(sols.slice(0, 12).map(s => fAns('(' + vars.map((v, i) => v + ' = ' + +s[i].toPrecision(9)).join('، ') + ')', BA))) + checkHTML(Fs, vars, sols.slice(0, 12)) + '<ul class="notes"><li>ئەنجامەکان نزیکەیین و تەنها لە ماوەی [−١٠, ١٠] گەڕاون؛ لەوانەیە چارەسەری تر هەبێت.</li></ul>' : final(['<div class="warn">لە ماوەی [−١٠, ١٠] چارەسەر نەدۆزرایەوە.</div>'])) + '</div>');
        }
      }
      out.innerHTML = h; out.classList.remove('bad');
    } catch (e) { out.innerHTML = '<div class="svcard"><div class="warn">! ' + esc(e.message) + '</div></div>'; }
  }
  function insertSym(t) {
    const ta = $('#sv-in'), s = ta.selectionStart, e = ta.selectionEnd; ta.value = ta.value.slice(0, s) + t + ta.value.slice(e); ta.focus(); ta.setSelectionRange(s + t.length, s + t.length);
  }
  function init() {
    $('#sv-solve').onclick = run;
    $('#sv-sym').innerHTML = SYM.map(s => '<button class="fk" data-s="' + s + '">' + s + '</button>').join('') + '<button class="fk" data-s="\n">↵</button>';
    $('#sv-sym').onclick = e => { const b = e.target.closest('button'); if (b) insertSym(b.dataset.s); };
    $('#sv-ex').innerHTML = EX.map((x, i) => '<button class="chip2" data-i="' + i + '">' + x[0] + '</button>').join('');
    $('#sv-ex').onclick = e => { const b = e.target.closest('button'); if (b) { $('#sv-in').value = EX[+b.dataset.i][1]; run(); } };
    $('#sv-in').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } });
    $('#sv-clear').onclick = () => { $('#sv-in').value = ''; $('#sv-out').innerHTML = ''; };
    const keypad = $('#sv-keypad');
    if (keypad) keypad.addEventListener('click', e => {
      const b = e.target.closest('button[data-k]'); if (!b) return;
      const ta = $('#sv-in'), k = b.dataset.k, a = ta.selectionStart, z = ta.selectionEnd;
      if (k === 'CLEAR') { ta.value = ''; ta.focus(); $('#sv-out').innerHTML = ''; return; }
      if (k === '⌫') { const from = a === z ? Math.max(0, a - 1) : a; ta.value = ta.value.slice(0, from) + ta.value.slice(z); ta.focus(); ta.setSelectionRange(from, from); return; }
      const value = k === '×' ? '*' : k === '÷' ? '/' : k === '−' ? '-' : k === 'π' ? 'pi' : k;
      ta.value = ta.value.slice(0, a) + value + ta.value.slice(z); ta.focus(); ta.setSelectionRange(a + value.length, a + value.length);
    });
  }
  return { init, run };
})();
