'use strict';
/* Notepad-style scientific calculator (keyboard layout like the reference app). Uses MathEngine. */
const Calc = (function () {
  const E = MathEngine, $ = s => document.querySelector(s);
  const K = [ // [label, insert, css, 2nd label, 2nd insert]
    ['2nd', '@2nd', 'k-ctl'], ['func', '@func', 'k-ctl'], ['const', '@const', 'k-ctl'], ['x⁻¹', '^(-1)', 'k-dk', '!', '!'], ['e', 'e', 'k-dk'], ['π', 'π', 'k-dk'],
    ['sin', 'sin(', 'k-dk', 'sin⁻¹', 'arcsin('], ['cos', 'cos(', 'k-dk', 'cos⁻¹', 'arccos('], ['tan', 'tan(', 'k-dk', 'tan⁻¹', 'arctan('], ['log₂', 'log2(', 'k-dk', '2ˣ', '2^'], ['log₁₀', 'log(', 'k-dk', '10ˣ', '10^'], ['ln', 'ln(', 'k-dk', 'eˣ', 'e^'],
    ['sinh', 'sinh(', 'k-dk', 'sec', 'sec('], ['cosh', 'cosh(', 'k-dk', 'csc', 'csc('], ['tanh', 'tanh(', 'k-dk', 'cot', 'cot('], ['x²', '^2', 'k-dk', 'x³', '^3'], ['√', '√(', 'k-dk', '∛', 'cbrt('], ['^', '^', 'k-dk', '%', '%'],
    ['⇦', '@l', 'k-ar'], ['⇨', '@r', 'k-ar'], ['7', '7', 'k-nm'], ['8', '8', 'k-nm'], ['9', '9', 'k-nm'], ['Del', '@del', 'k-del'],
    ['(', '(', 'k-ar'], [')', ')', 'k-ar'], ['4', '4', 'k-nm'], ['5', '5', 'k-nm'], ['6', '6', 'k-nm'], ['C', '@c', 'k-del'],
    ['+', '+', 'k-ar'], ['−', '−', 'k-ar'], ['1', '1', 'k-nm'], ['2', '2', 'k-nm'], ['3', '3', 'k-nm'], ['=', '@eq', 'k-eq'],
    ['*', '×', 'k-ar'], ['/', '÷', 'k-ar'], ['0', '0', 'k-nm'], ['.', '.', 'k-nm'], ['ans', 'ans', 'k-nm']
  ];
  const FUNC = [['Actions', [['simplify', 'simp'], ['solve', 'solve'], ['d/dx', 'diff'], ['∫ dx', 'int'], ['∫ a→b', 'defint'], ['Draw Graph', 'draw']]],
    ['Functions', [['abs', 'abs('], ['floor', 'floor('], ['ceil', 'ceil('], ['round', 'round('], ['sign', 'sign('], ['exp', 'exp('], ['asin h', 'asinh('], ['acos h', 'acosh('], ['atan h', 'atanh('], ['√', 'sqrt('], ['∛', 'cbrt(']]],
    ['Combinatorics and number theory', [['nCr', 'nCr('], ['nPr', 'nPr('], ['gcd', 'gcd('], ['lcm', 'lcm('], ['mod', 'mod('], ['n!', '!'], ['rand', 'rand()'], ['1/x', '^(-1)']]],
    ['Symbols', [['%', '%'], ['|x|', '|'], ['∞', '∞'], ['±', '±'], [',', ','], ['=', '='], ['≠', '≠'], ['≤', '≤'], ['≥', '≥'], ['x', 'x'], ['y', 'y'], ['a', 'a'], ['b', 'b'], ['c', 'c'], ['θ', 'θ'], ['φ', 'φ'], ['ρ', 'ρ']]]];
  const CONST = [['π', 'π'], ['e', 'e'], ['φ golden', '1.6180339887498949'], ['√2', '√(2)'], ['√3', '√(3)'], ['g 9.80665', '9.80665'], ['c 299792458', '299792458'], ['G', '6.6743*10^(-11)'], ['h Planck', '6.62607015*10^(-34)'], ['k Boltzmann', '1.380649*10^(-23)'], ['N Avogadro', '6.02214076*10^23'], ['e charge', '1.602176634*10^(-19)'], ['deg → rad', 'π/180'], ['rad → deg', '180/π']];
  let pad = [], ans = 0, second = false, input, last = null, kbNative = false;
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const num = s => { const v = E.compile(E.parse(s))({}); if (!isFinite(v)) throw new E.MathError('ژمارەی نادروست'); return v; };

  /* nCr, nPr, gcd, lcm, mod, rand are resolved to numbers before the safe parser sees the text */
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const nPr = (n, r) => { let v = 1; for (let i = 0; i < r; i++) v *= n - i; return v; };
  const BIN = {
    ncr: (n, r) => { if (r > n / 2) r = n - r; let v = 1; for (let i = 1; i <= r; i++) v = v * (n - r + i) / i; return Math.round(v); }, npr: nPr,
    gcd, lcm: (a, b) => a && b ? Math.abs(a / gcd(a, b) * b) : 0, mod: (a, b) => { if (!b) throw new E.MathError('دابەشکردن بەسەر سفر'); return ((a % b) + b) % b; }
  };
  function pre(s) {
    let t = s.replace(/rand\s*\(\s*\)/gi, () => '(' + Math.random().toFixed(10) + ')'), guard = 0;
    const re = /(nCr|nPr|gcd|lcm|mod)\s*\(/gi;
    while (guard++ < 40) {
      let m, last = null; re.lastIndex = 0; while ((m = re.exec(t))) last = m; if (!last) break;
      const st = last.index + last[0].length; let depth = 1, i = st, parts = [], from = st;
      for (; i < t.length && depth; i++) { const ch = t[i]; if (ch === '(') depth++; else if (ch === ')') { depth--; if (!depth) break; } else if (ch === ',' && depth === 1) { parts.push(t.slice(from, i)); from = i + 1; } }
      if (depth) throw new E.MathError('کەوانە (  ) تەواو نییە لە ' + last[1]);
      parts.push(t.slice(from, i));
      const nm = last[1].toLowerCase(), vals = parts.map(p => { const v = E.compile(E.parse(p))({ ans }); if (!isFinite(v)) throw new E.MathError('ژمارەی نادروست'); return v; });
      if (vals.length !== 2) throw new E.MathError(last[1] + ' دوو ژمارە دەوێت: ' + last[1] + '(a,b)');
      if ((nm === 'ncr' || nm === 'npr') && (vals.some(v => v < 0 || v !== Math.floor(v)) || vals[1] > vals[0])) throw new E.MathError(last[1] + ': n و r دەبێت ژمارەی تەواوی نەرێنی بن و r ≤ n');
      const r = BIN[nm](vals[0], vals[1]); if (!isFinite(r)) throw new E.MathError('ئەنجامەکە زۆر گەورەیە');
      t = t.slice(0, last.index) + '(' + (Number.isInteger(r) ? String(r) : r.toFixed(12).replace(/0+$/, '')) + ')' + t.slice(i + 1);
    }
    return t;
  }
  function insert(t) {
    if (t[0] === '@') {
      switch (t) {
        case '@2nd': second = !second; relabel(); return;
        case '@func': $('#cn-func').classList.toggle('on'); $('#cn-const').classList.remove('on'); return;
        case '@const': $('#cn-const').classList.toggle('on'); $('#cn-func').classList.remove('on'); return;
        case '@del': { input.focus(); const s = input.selectionStart, e = input.selectionEnd; if (s !== e) input.value = input.value.slice(0, s) + input.value.slice(e); else if (s > 0) { input.value = input.value.slice(0, s - 1) + input.value.slice(s); input.setSelectionRange(s - 1, s - 1); } preview(); return; }
        case '@c': if (input.value) input.value = ''; else { pad = []; save(); render(); } preview(); input.focus(); return;
        case '@l': { input.focus(); const s = Math.max(0, input.selectionStart - 1); input.setSelectionRange(s, s); return; }
        case '@r': { input.focus(); const s = Math.min(input.value.length, input.selectionStart + 1); input.setSelectionRange(s, s); return; }
        case '@eq': return run('eval');
      }
      return;
    }
    input.focus(); const s = input.selectionStart, e = input.selectionEnd;
    input.value = input.value.slice(0, s) + t + input.value.slice(e); input.setSelectionRange(s + t.length, s + t.length); preview();
  }
  function relabel() { document.querySelectorAll('#cn-keys .k').forEach((b, i) => { const k = K[i]; b.firstChild.textContent = second && k[3] ? k[3] : k[0]; }); $('#cn-keys').classList.toggle('sec', second); }
  function preview() {
    const box = $('#cn-prev'), v = input.value.trim();
    if (!v) { box.innerHTML = ''; return; }
    try { box.innerHTML = '<span class="math">' + E.toHTML(E.parse(pre(v))) + '</span>'; } catch (e) { box.innerHTML = '<span class="warn">⚠ ' + esc(e.message) + '</span>'; }
  }
  function push(en) { pad.push(en); pad = pad.slice(-40); save(); render(); }
  function render() {
    const box = $('#cn-pad');
    box.innerHTML = pad.map((en, i) => en.err ? '<div class="ln"><div class="src math">' + esc(en.src) + '</div><div class="rs warn">⚠ ' + esc(en.err) + '</div></div>' :
      '<div class="ln" data-i="' + i + '"><div class="src math">' + esc(en.src) + ' <small>(' + esc(en.title) + ')</small></div>' + (en.steps && en.steps.length ? '<details><summary>هەنگاوەکان</summary><ol class="steps">' + en.steps.map(s => '<li class="math">' + s + '</li>').join('') + '</ol></details>' : '') +
      en.ans.map(a => '<div class="rs"><span class="math big">= ' + a.html + '</span><span class="badge ' + (a.approx ? 'ap' : 'ex') + '">' + (a.approx ? 'نزیکەیی' : 'وردە') + '</span></div>').join('') + (en.notes && en.notes.length ? '<div class="nt">' + en.notes.map(esc).join(' · ') + '</div>' : '') + '</div>').join('');
    box.scrollTop = box.scrollHeight;
  }
  function save() { try { localStorage.setItem('g12.pad', JSON.stringify(pad)); } catch (e) { } }
  function run(kind) {
    const src = input.value.trim(); if (!src) return;
    try {
      const ps = pre(src); let r, t;
      if (kind === 'eval') {
        const sc = { ans }, xv = $('#cn-x').value.trim(); if (xv) sc.x = num(xv);
        r = E.ops.evaluate(ps, sc); t = '=' + (xv ? ' x=' + xv : '');
        try { const v = E.compile(E.parse(ps))(sc); if (isFinite(v)) ans = v; } catch (e) { }
      }
      else if (kind === 'simp') { r = E.ops.simplify(ps); t = 'simplify'; }
      else if (kind === 'solve') { r = E.ops.solve(ps); t = 'solve'; }
      else if (kind === 'diff') { r = E.ops.derivative(ps); t = 'd/dx'; }
      else if (kind === 'int') { r = E.ops.integrate(ps); t = '∫ dx'; }
      else if (kind === 'defint') { const a = num($('#cn-a').value), b = num($('#cn-b').value); r = E.ops.integrate(ps, a, b); t = '∫ ' + $('#cn-a').value + '→' + $('#cn-b').value; }
      last = r; push({ src, title: t, steps: r.steps, ans: r.answers, notes: r.notes });
      if (kind === 'eval') { input.value = ''; preview(); }
    } catch (e) { push({ src, err: e instanceof E.MathError ? e.message : 'هەڵە: ' + e.message }); }
  }
  function draw() {
    const src = input.value.trim(); if (!src) return;
    try { Grapher.addEquation(pre(src), { select: true }); GG.show('g2'); }
    catch (e) { push({ src, err: e.message }); }
  }
  function copyText(t) { if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => { }); else { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { } ta.remove(); } GG.toast('✓ لەبەرگیرایەوە'); }
  function init() {
    input = $('#cn-input');
    try { pad = JSON.parse(localStorage.getItem('g12.pad') || '[]'); } catch (e) { pad = []; }
    $('#cn-keys').innerHTML = K.map((k, i) => '<button class="k ' + k[2] + '" data-i="' + i + '"><span>' + k[0] + '</span></button>').join('');
    $('#cn-keys').addEventListener('click', e => { const b = e.target.closest('.k'); if (!b) return; const k = K[+b.dataset.i]; insert(second && k[4] ? k[4] : k[1]); if (second && k[4] && !['@2nd'].includes(k[1])) { second = false; relabel(); } });
    $('#cn-func').innerHTML = FUNC.map(g => '<div class="fh">' + g[0] + '</div>' + g[1].map(f => '<button class="fk" data-f="' + esc(f[1]) + '">' + esc(f[0]) + '</button>').join('')).join('') + '<label class="muted">x =</label><input id="cn-x" dir="ltr" class="tiny" placeholder="x"><label class="muted">∫ a</label><input id="cn-a" dir="ltr" class="tiny" value="0"><label class="muted">b</label><input id="cn-b" dir="ltr" class="tiny" value="1">';
    $('#cn-const').innerHTML = CONST.map(f => '<button class="fk" data-f="' + esc(f[1]) + '">' + esc(f[0]) + '</button>').join('');
    document.querySelectorAll('#cn-func [data-f], #cn-const [data-f]').forEach(b => b.onclick = () => { const f = b.dataset.f; if (['simp', 'solve', 'diff', 'int', 'defint'].includes(f)) run(f); else if (f === 'draw') draw(); else insert(f); });
    $('#cn-pad').addEventListener('click', e => { const l = e.target.closest('.ln'); if (l && l.dataset.i && !e.target.closest('details')) { const en = pad[+l.dataset.i]; if (en && en.ans) copyText(en.ans.map(a => a.text).join(' ، ')); } });
    const kbBtn = $('#cn-kb'), setKb = on => { kbNative = on; input.inputMode = on ? 'text' : 'none'; kbBtn.classList.toggle('on', on); const c = $('#s-kb'); if (c) c.checked = on; try { localStorage.setItem('mg.kb', on ? '1' : '0'); } catch (e) { } };
    try { kbNative = localStorage.getItem('mg.kb') === '1'; } catch (e) { } setKb(kbNative);
    kbBtn.onclick = () => { setKb(!kbNative); input.blur(); input.focus(); };
    if ($('#s-kb')) $('#s-kb').onchange = e => setKb(e.target.checked);
    $('#cn-gr').onclick = draw;
    document.querySelectorAll('#cn-keys, #cn-func, #cn-const').forEach(p => p.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); }));
    document.addEventListener('keydown', e => { if (GG.cur() !== 'calc' || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return; const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return; input.focus(); });
    input.addEventListener('input', preview); input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run('eval'); } });
    render(); preview();
  }
  return { init, clearPad: () => { pad = []; save(); render(); }, copyAll: () => copyText(pad.filter(p => p.ans).map(p => p.src + ' = ' + p.ans.map(a => a.text).join(' ، ')).join('\n') || ''), draw, insert };
})();
