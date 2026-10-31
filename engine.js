'use strict';
/* Shared math engine: safe tokenizer + parser (no eval), evaluator, symbolic derivative/integral,
   simplifier, polynomial tools, numeric analysis. Used by BOTH the calculator and the grapher. */
const MathEngine = (function () {
  const E = { angle: 'rad' };
  class MathError extends Error {}
  E.MathError = MathError;
  const err = m => { throw new MathError(m); };

  const FN = new Set(['sin','cos','tan','cot','sec','csc','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh','log','log2','ln','exp','sqrt','cbrt','abs','floor','ceil','round','sign']);
  const ALIAS = { arcsin:'asin', arccos:'acos', arctan:'atan' };
  const NAMES = [...FN, ...Object.keys(ALIAS), 'pi', 'inf', 'e', 'theta', 'phi', 'rho', 'ans'].sort((a, b) => b.length - a.length);
  const TRIG = new Set(['sin','cos','tan','cot','sec','csc']), INVTRIG = new Set(['asin','acos','atan']);

  /* ---------- tokenizer ---------- */
  function norm(s) {
    return s.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776)
      .replace(/[×·⋅∙]/g, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-').replace(/π/g, ' pi ').replace(/θ/g, ' theta ').replace(/[φϕ]/g, ' phi ').replace(/ρ/g, ' rho ').replace(/log₂/g, ' log2').replace(/log₁₀/g, ' log ').replace(/∞/g, ' inf ')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/√/g, ' sqrt ').replace(/≤|⩽/g, '<=').replace(/≥|⩾/g, '>=')
      .replace(/≠/g, '!=').replace(/[\[{]/g, '(').replace(/[\]}]/g, ')');
  }
  function tokenize(src) {
    const s = norm(src), t = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
        if (!m) err('ژمارەی هەڵە'); t.push({ k: 'num', v: parseFloat(m[1]) }); i += m[1].length; continue;
      }
      if (/[a-zA-Z]/.test(c)) {
        let j = i; while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
        let run = s.slice(i, j), q = 0, l2 = false;
        if (run.endsWith('log') && s[j] === '2' && s[j + 1] === '(') { run = run.slice(0, -3); l2 = true; j++; }
        while (q < run.length) {
          const nm = NAMES.find(n => run.slice(q, q + n.length).toLowerCase() === n);
          if (nm) { t.push({ k: 'id', v: nm }); q += nm.length; } else { t.push({ k: 'id', v: run[q] }); q++; }
        }
        if (l2) t.push({ k: 'id', v: 'log2' });
        i = j; continue;
      }
      const two = s.slice(i, i + 2);
      if (['<=', '>=', '!='].includes(two)) { t.push({ k: 'op', v: two }); i += 2; continue; }
      if ('+-*/^%!()|,=<>±'.includes(c)) { t.push({ k: 'op', v: c }); i++; continue; }
      err('هێمای نەناسراو: «' + c + '»');
    }
    return t;
  }

  /* ---------- parser (with implicit multiplication) ---------- */
  function parse(src) {
    const tk = tokenize(src); let p = 0, inAbs = 0;
    if (!tk.length) err('تکایە هاوکێشە یان دەربڕینێک بنووسە');
    const isOp = v => tk[p] && tk[p].k === 'op' && tk[p].v === v;
    const startsAtom = () => { const t = tk[p]; if (!t) return false; if (t.k !== 'op') return true; return t.v === '(' || (t.v === '|' && !inAbs); };
    const expect = v => { if (!isOp(v)) err(v === ')' ? 'کەوانە داخراو نییە — «)» ی کەمە' : 'هێمای «|» ی کەمە'); p++; };
    function rel() {
      const l = add(), t = tk[p];
      if (t && t.k === 'op' && ['=', '<', '>', '<=', '>=', '!='].includes(t.v)) { p++; return { t: 'rel', op: t.v, l, r: add() }; }
      return l;
    }
    function add() {
      let a = term();
      while (tk[p] && tk[p].k === 'op' && ['+', '-', '±'].includes(tk[p].v)) { const o = tk[p++].v; a = { t: 'bin', op: o, a, b: term() }; }
      return a;
    }
    function term() {
      let a = unary();
      for (;;) {
        const t = tk[p];
        if (t && t.k === 'op' && ['*', '/', '%'].includes(t.v)) { p++; a = { t: 'bin', op: t.v, a, b: unary() }; }
        else if (startsAtom()) a = { t: 'bin', op: '*', a, b: unary() };
        else break;
      }
      return a;
    }
    function unary() {
      if (isOp('-')) { p++; return { t: 'neg', a: unary() }; }
      if (isOp('+')) { p++; return unary(); }
      if (isOp('±')) { p++; return { t: 'bin', op: '±', a: { t: 'num', v: 0 }, b: unary() }; }
      return power();
    }
    function power() {
      const b = post();
      if (isOp('^')) { p++; return { t: 'bin', op: '^', a: b, b: unary() }; }
      return b;
    }
    function post() { let a = atom(); while (isOp('!')) { p++; a = { t: 'fact', a }; } return a; }
    function atom() {
      const t = tk[p]; if (!t) err('دەربڕینەکە ناتەواوە');
      if (t.k === 'num') { p++; return { t: 'num', v: t.v }; }
      if (t.k === 'id') {
        p++; const n = ALIAS[t.v] || t.v;
        if (FN.has(n)) {
          let a; if (isOp('(')) { p++; a = add(); expect(')'); } else { if (!tk[p]) err('فەنکشنی «' + n + '» پێویستی بە ئارگیومێنتە'); a = unary(); }
          return { t: 'fn', n, a };
        }
        if (n === 'pi' || n === 'e' || n === 'inf') return { t: 'const', n };
        return { t: 'var', n };
      }
      if (t.v === '(') { p++; const a = add(); expect(')'); return a; }
      if (t.v === '|') { p++; inAbs++; const a = add(); inAbs--; expect('|'); return { t: 'abs', a }; }
      err(t.v === ')' ? 'کەوانەی داخستن زیادە' : 'ڕستەسازی هەڵەیە لەسەر «' + t.v + '»');
    }
    const ast = rel();
    if (p < tk.length) err(isOp(')') ? 'کەوانەی داخستن زیادە' : 'ڕستەسازی هەڵەیە لەسەر «' + tk[p].v + '»');
    return ast;
  }
  E.parse = parse;

  const N = v => ({ t: 'num', v }), V = n => ({ t: 'var', n }), PI = { t: 'const', n: 'pi' };
  const B = (op, a, b) => ({ t: 'bin', op, a, b }), F = (n, a) => ({ t: 'fn', n, a }), NEG = a => ({ t: 'neg', a });
  E.N = N; E.V = V; E.B = B;

  function expandPM(n) {
    switch (n.t) {
      case 'bin': { const r = []; for (const a of expandPM(n.a)) for (const b of expandPM(n.b)) for (const o of (n.op === '±' ? ['+', '-'] : [n.op])) r.push(B(o, a, b)); return r; }
      case 'neg': case 'abs': case 'fact': return expandPM(n.a).map(a => ({ t: n.t, a }));
      case 'fn': return expandPM(n.a).map(a => F(n.n, a));
      default: return [n];
    }
  }
  E.expandPM = expandPM;

  /* ---------- evaluator (closure compiler) ---------- */
  const toR = x => E.angle === 'deg' ? x * Math.PI / 180 : x, fromR = x => E.angle === 'deg' ? x * 180 / Math.PI : x;
  const snap = v => Math.abs(v) < 1e-14 ? 0 : v;
  function fact(n) { if (n < 0 || n > 170 || Math.abs(n - Math.round(n)) > 1e-9) return NaN; let r = 1; for (let i = 2; i <= Math.round(n); i++) r *= i; return r; }
  const FUNCS = {
    sin: x => snap(Math.sin(toR(x))), cos: x => snap(Math.cos(toR(x))),
    tan: x => { const c = Math.cos(toR(x)); return Math.abs(c) < 1e-14 ? NaN : Math.sin(toR(x)) / c; },
    cot: x => { const s = Math.sin(toR(x)); return Math.abs(s) < 1e-14 ? NaN : Math.cos(toR(x)) / s; },
    sec: x => { const c = Math.cos(toR(x)); return Math.abs(c) < 1e-14 ? NaN : 1 / c; },
    csc: x => { const s = Math.sin(toR(x)); return Math.abs(s) < 1e-14 ? NaN : 1 / s; },
    asin: x => fromR(Math.asin(x)), acos: x => fromR(Math.acos(x)), atan: x => fromR(Math.atan(x)),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh, log: Math.log10, log2: Math.log2, ln: Math.log, exp: Math.exp, sqrt: Math.sqrt, cbrt: Math.cbrt,
    abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign
  };
  E.applyFn = (n, v) => FUNCS[n](v);
  function compile(n) {
    switch (n.t) {
      case 'num': return () => n.v;
      case 'const': { const v = n.n === 'pi' ? Math.PI : n.n === 'e' ? Math.E : Infinity; return () => v; }
      case 'var': return s => { const v = s[n.n]; if (v === undefined) err('گۆڕاوی «' + n.n + '» بەهای نییە'); return v; };
      case 'neg': { const a = compile(n.a); return s => -a(s); }
      case 'abs': { const a = compile(n.a); return s => Math.abs(a(s)); }
      case 'fact': { const a = compile(n.a); return s => fact(a(s)); }
      case 'fn': { const a = compile(n.a), f = FUNCS[n.n]; return s => f(a(s)); }
      case 'bin': {
        if (n.op === '±') err('هێمای ± تەنها لە ئاستی سەرەوە پشتگیری دەکرێت');
        const a = compile(n.a), b = compile(n.b);
        switch (n.op) {
          case '+': return s => a(s) + b(s); case '-': return s => a(s) - b(s); case '*': return s => a(s) * b(s);
          case '/': return s => a(s) / b(s); case '%': return s => a(s) % b(s); case '^': return s => Math.pow(a(s), b(s));
        }
      }
    }
    err('گرێی نەناسراو');
  }
  E.compile = compile;
  E.vars = (n, set = new Set()) => {
    if (n.t === 'var') set.add(n.n);
    else for (const k of ['a', 'b', 'l', 'r']) if (n[k] && typeof n[k] === 'object') E.vars(n[k], set);
    return set;
  };
  const has = (n, v) => E.vars(n).has(v);

  /* ---------- symbolic: simplify, derivative ---------- */
  function S(n) {
    const num = x => x.t === 'num';
    switch (n.t) {
      case 'neg': { const a = S(n.a); if (num(a)) return N(-a.v); if (a.t === 'neg') return a.a; return NEG(a); }
      case 'abs': { const a = S(n.a); return num(a) ? N(Math.abs(a.v)) : { t: 'abs', a }; }
      case 'fact': { const a = S(n.a); return num(a) && !isNaN(fact(a.v)) ? N(fact(a.v)) : { t: 'fact', a }; }
      case 'fn': {
        const a = S(n.a);
        if (a.t === 'const' && a.n !== 'inf') { const v = FUNCS[n.n](a.n === 'pi' ? Math.PI : Math.E); if (isFinite(v) && Math.abs(v - Math.round(v)) < 1e-12) return N(Math.round(v)); }
        if (num(a)) { const v = FUNCS[n.n](a.v); if (isFinite(v) && Math.abs(v - Math.round(v)) < 1e-12) return N(Math.round(v)); }
        return F(n.n, a);
      }
      case 'bin': {
        const a = S(n.a), b = S(n.b);
        switch (n.op) {
          case '+': if (num(a) && num(b)) return N(a.v + b.v); if (num(a) && a.v === 0) return b; if (num(b) && b.v === 0) return a; if (b.t === 'neg') return B('-', a, b.a); return B('+', a, b);
          case '-': if (num(a) && num(b)) return N(a.v - b.v); if (num(b) && b.v === 0) return a; if (num(a) && a.v === 0) return NEG(b); if (b.t === 'neg') return B('+', a, b.a); return B('-', a, b);
          case '*':
            if ((num(a) && a.v === 0) || (num(b) && b.v === 0)) return N(0);
            if (num(a) && num(b)) return N(a.v * b.v); if (num(a) && a.v === 1) return b; if (num(b) && b.v === 1) return a;
            if (num(a) && a.v === -1) return NEG(b); if (num(b) && b.v === -1) return NEG(a);
            if (a.t === 'bin' && a.op === '/' && a.a.t === 'num' && a.a.v === 1) return S(B('/', b, a.b));
            if (a.t === 'neg') return NEG(S(B('*', a.a, b))); if (b.t === 'neg') return NEG(S(B('*', a, b.a)));
            if (num(a) && b.t === 'bin' && b.op === '*' && num(b.a)) return B('*', N(a.v * b.a.v), b.b);
            if (num(b) && !num(a)) return B('*', b, a);
            return B('*', a, b);
          case '/':
            if (num(a) && a.v === 0 && !(num(b) && b.v === 0)) return N(0); if (num(b) && b.v === 1) return a;
            if (!(num(b) && b.v === 0) && render(a, false) === render(b, false)) return N(1);
            if (num(a) && num(b) && b.v !== 0 && Number.isInteger(a.v / b.v)) return N(a.v / b.v);
            return B('/', a, b);
          case '^':
            if (num(b) && b.v === 0) return N(1); if (num(b) && b.v === 1) return a;
            if (num(a) && num(b)) { const v = Math.pow(a.v, b.v); if (isFinite(v) && Number.isInteger(v)) return N(v); }
            return B('^', a, b);
          default: return B(n.op, a, b);
        }
      }
      default: return n;
    }
  }
  E.simplify = S;
  const sub = (n, v, val) => n.t === 'var' ? (n.n === v ? val : n) : n.t === 'bin' ? B(n.op, sub(n.a, v, val), sub(n.b, v, val)) : (n.t === 'neg' || n.t === 'abs' || n.t === 'fact') ? { t: n.t, a: sub(n.a, v, val) } : n.t === 'fn' ? F(n.n, sub(n.a, v, val)) : n;
  E.subst = sub;

  function D(n, v) {
    switch (n.t) {
      case 'num': case 'const': return N(0);
      case 'var': return N(n.n === v ? 1 : 0);
      case 'neg': return NEG(D(n.a, v));
      case 'abs': return B('*', F('sign', n.a), D(n.a, v));
      case 'bin': {
        const a = n.a, b = n.b, da = D(a, v), db = D(b, v);
        switch (n.op) {
          case '+': case '-': return B(n.op, da, db);
          case '*': return B('+', B('*', da, b), B('*', a, db));
          case '/': return B('/', B('-', B('*', da, b), B('*', a, db)), B('^', b, N(2)));
          case '^':
            if (!has(b, v)) return B('*', B('*', b, B('^', a, B('-', b, N(1)))), da);
            if (!has(a, v)) return B('*', B('*', n, F('ln', a)), db);
            return B('*', n, B('+', B('*', db, F('ln', a)), B('/', B('*', b, da), a)));
          default: err('ئەم کردارە (%) بۆ مشتاق پشتگیری ناکرێت');
        }
      }
      case 'fn': {
        const a = n.a; let o;
        switch (n.n) {
          case 'sin': o = F('cos', a); break; case 'cos': o = NEG(F('sin', a)); break;
          case 'tan': o = B('/', N(1), B('^', F('cos', a), N(2))); break; case 'cot': o = NEG(B('/', N(1), B('^', F('sin', a), N(2)))); break;
          case 'sec': o = B('*', F('sec', a), F('tan', a)); break; case 'csc': o = NEG(B('*', F('csc', a), F('cot', a))); break;
          case 'asin': o = B('/', N(1), F('sqrt', B('-', N(1), B('^', a, N(2))))); break;
          case 'acos': o = NEG(B('/', N(1), F('sqrt', B('-', N(1), B('^', a, N(2)))))); break;
          case 'atan': o = B('/', N(1), B('+', N(1), B('^', a, N(2)))); break;
          case 'sinh': o = F('cosh', a); break; case 'cosh': o = F('sinh', a); break;
          case 'tanh': o = B('/', N(1), B('^', F('cosh', a), N(2))); break;
          case 'ln': o = B('/', N(1), a); break; case 'log2': o = B('/', N(1), B('*', a, F('ln', N(2)))); break; case 'log': o = B('/', N(1), B('*', a, F('ln', N(10)))); break;
          case 'exp': o = F('exp', a); break; case 'sqrt': o = B('/', N(1), B('*', N(2), F('sqrt', a))); break;
          case 'cbrt': o = B('/', N(1), B('*', N(3), B('^', a, B('/', N(2), N(3))))); break;
          default: err('مشتاقی «' + n.n + '» پشتگیری ناکرێت (فەنکشنی پلەیی/گرتنەوە)');
        }
        if (E.angle === 'deg' && TRIG.has(n.n)) o = B('*', o, B('/', PI, N(180)));
        if (E.angle === 'deg' && INVTRIG.has(n.n)) o = B('*', o, B('/', N(180), PI));
        return B('*', o, D(a, v));
      }
      default: err('ئەم دەربڕینە مشتاق ناکرێت');
    }
  }
  E.derivative = (n, v) => S(D(n, v));

  /* ---------- polynomial tools (numeric fit, verified) ---------- */
  function polyFit(ast, v, maxDeg = 6) {
    if ([...E.vars(ast)].some(x => x !== v)) return null;
    let f; try { f = compile(ast); } catch (e) { return null; }
    const xs = [], ys = [];
    for (let i = 0; i <= maxDeg; i++) { const x = -2.3 + i * 0.731; xs.push(x); const y = f({ [v]: x }); if (!isFinite(y)) return null; ys.push(y); }
    const m = maxDeg + 1, A = xs.map((x, i) => { const r = []; for (let j = 0; j < m; j++) r.push(Math.pow(x, j)); r.push(ys[i]); return r; });
    for (let c = 0; c < m; c++) {
      let pv = c; for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[pv][c])) pv = r;
      [A[c], A[pv]] = [A[pv], A[c]]; if (Math.abs(A[c][c]) < 1e-14) return null;
      for (let r = 0; r < m; r++) if (r !== c) { const k = A[r][c] / A[c][c]; for (let j = c; j <= m; j++) A[r][j] -= k * A[c][j]; }
    }
    let co = A.map((r, i) => r[m] / r[i]);
    co = co.map(c => Math.abs(c) < 1e-8 ? 0 : Math.abs(c - Math.round(c)) < 1e-7 ? Math.round(c) : Math.round(c * 1e6) / 1e6);
    for (const x of [-1.37, 0.41, 2.9, 4.13, -3.3]) {
      const y = f({ [v]: x }); let z = 0; for (let j = m - 1; j >= 0; j--) z = z * x + co[j];
      if (!isFinite(y) || Math.abs(y - z) > 1e-6 * (1 + Math.abs(y))) return null;
    }
    while (co.length > 1 && co[co.length - 1] === 0) co.pop();
    return co;
  }
  E.polyFit = polyFit;
  function polyAst(co, v = 'x') {
    let acc = null;
    for (let k = co.length - 1; k >= 0; k--) {
      const c = co[k]; if (c === 0) continue; const ac = Math.abs(c);
      const xk = k === 0 ? null : k === 1 ? V(v) : B('^', V(v), N(k));
      const term = !xk ? N(ac) : ac === 1 ? xk : B('*', N(ac), xk);
      acc = acc === null ? (c < 0 ? NEG(term) : term) : B(c > 0 ? '+' : '-', acc, term);
    }
    return acc || N(0);
  }
  E.polyAst = polyAst;
  const evalPoly = (co, x) => co.reduceRight((z, c) => z * x + c, 0);
  function polyDiv(num, den) {
    num = num.slice(); const q = new Array(Math.max(num.length - den.length + 1, 1)).fill(0);
    for (let i = num.length - den.length; i >= 0; i--) { const c = num[i + den.length - 1] / den[den.length - 1]; q[i] = c; for (let j = 0; j < den.length; j++) num[i + j] -= c * den[j]; }
    const rem = num.slice(0, den.length - 1); return { q: q.map(c => Math.round(c * 1e9) / 1e9), exact: rem.every(c => Math.abs(c) < 1e-8) };
  }

  /* ---------- formatting (text + HTML with vertical fractions, superscripts, roots) ---------- */
  const fmtNum = v => v === Infinity ? '∞' : v === -Infinity ? '−∞' : Number.isInteger(v) ? String(v) : String(+v.toPrecision(10));
  const PREC = { '+': 1, '-': 1, '±': 1, '*': 2, '/': 2, '%': 2 };
  function render(n, h, pp = 0) {
    const w = (s, p) => p < pp ? (h ? '(' + s + ')' : '(' + s + ')') : s;
    switch (n.t) {
      case 'num': return n.v < 0 ? w(fmtNum(n.v), 3) : fmtNum(n.v);
      case 'const': return n.n === 'pi' ? 'π' : n.n === 'e' ? 'e' : '∞';
      case 'var': return h ? '<i>' + n.n + '</i>' : n.n;
      case 'neg': return w('−' + render(n.a, h, 2), 2.5);
      case 'abs': return '|' + render(n.a, h) + '|';
      case 'fact': return render(n.a, h, 5) + '!';
      case 'fn': {
        if (n.n === 'sqrt') return h ? '<span class="rt">√<span class="rb">' + render(n.a, h) + '</span></span>' : '√(' + render(n.a, h) + ')';
        return (n.n === 'asin' ? 'arcsin' : n.n === 'acos' ? 'arccos' : n.n === 'atan' ? 'arctan' : n.n) + '(' + render(n.a, h) + ')';
      }
      case 'bin': {
        const o = n.op;
        if (o === '/') return h ? '<span class="fr"><span class="nu">' + render(n.a, h) + '</span><span class="de">' + render(n.b, h) + '</span></span>' : w(render(n.a, h, 3) + '/' + render(n.b, h, 3), 2);
        if (o === '^') return h ? w(render(n.a, h, 5) + '<sup>' + render(n.b, h) + '</sup>', 4) : w(render(n.a, h, 5) + '^' + render(n.b, h, 5), 4);
        if (o === '*') {
          const simple = (n.a.t === 'num' || n.a.t === 'var' || n.a.t === 'const') && n.b.t !== 'num';
          return w(render(n.a, h, 2) + (simple ? '' : ' · ') + render(n.b, h, 2.1), 2);
        }
        const sym = o === '-' ? ' − ' : o === '±' ? ' ± ' : o === '%' ? ' mod ' : ' + ';
        return w(render(n.a, h, PREC[o]) + sym + render(n.b, h, PREC[o] + (o === '-' || o === '%' ? 1 : 0)), PREC[o]);
      }
      case 'rel': return render(n.l, h) + ' ' + ({ '<=': '≤', '>=': '≥', '!=': '≠' }[n.op] || n.op) + ' ' + render(n.r, h);
    }
    return '?';
  }
  E.toHTML = n => render(n, true); E.toText = n => render(n, false);

  /* ---------- numeric analysis (all results are approximate) ---------- */
  const mk = (ast, scope) => { const f = compile(ast); return x => { scope.x = x; return f(scope); }; };
  E.makeFn = mk;
  E.dnum = (f, x) => { const h = 1e-5 * (1 + Math.abs(x)); return (f(x + h) - f(x - h)) / (2 * h); };
  function bisect(f, a, b) { let fa = f(a); for (let i = 0; i < 80; i++) { const m = (a + b) / 2, fm = f(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } } return (a + b) / 2; }
  E.roots = (f, a, b, N = 6000) => {
    const out = [], h = (b - a) / N; let px = a, py = f(a);
    for (let i = 1; i <= N; i++) {
      const x = a + i * h, y = f(x);
      if (isFinite(py) && isFinite(y) && py * y <= 0 && !(py === 0 && y === 0)) {
        const r = bisect(f, px, x), fr = f(r);
        if (Math.abs(fr) < 1e-6 && !out.some(o => Math.abs(o - r) < 1e-6)) out.push(Math.abs(r) < 1e-9 ? 0 : r);
      }
      px = x; py = y;
    }
    return out;
  };
  E.extrema = (f, a, b, N = 6000) => {
    const d = x => E.dnum(f, x), out = [], h = (b - a) / N; let px = a, pd = d(a);
    for (let i = 1; i <= N; i++) {
      const x = a + i * h, dx = d(x);
      if (isFinite(pd) && isFinite(dx) && pd * dx < 0) {
        const r = bisect(d, px, x), y = f(r);
        if (isFinite(y) && Math.abs(d(r)) < 1e-3 && Math.abs(f(r - h) - y) < Math.abs(b - a)) out.push({ x: r, y, type: pd > 0 ? 'max' : 'min' });
      }
      px = x; pd = dx;
    }
    return out;
  };
  E.simpson = (f, a, b, n = 2000) => { if (n % 2) n++; const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; };

  /* ---------- classify an input line for the grapher ---------- */
  E.classify = src => {
    if (src.includes(';')) {
      const parts = src.split(';').map(q => q.trim()).filter(Boolean), m = {};
      if (parts.length !== 2) err('گرافی پارامیتری دەبێت دوو بەش بێت: x = … ; y = …');
      parts.forEach(p => { const a = parse(p); if (a.t !== 'rel' || a.op !== '=' || a.l.t !== 'var' || !['x', 'y'].includes(a.l.n)) err('هەر بەشێک دەبێت وەک x = … یان y = … بێت'); m[a.l.n] = a.r; });
      if (!m.x || !m.y) err('هەم x(t) و هەم y(t) پێویستن');
      const vs = new Set(); E.vars(m.x, vs); E.vars(m.y, vs); compile(m.x); compile(m.y);
      return { src, kind: 'param', asts: [m.x, m.y], params: [...vs].filter(v => !['t', 'x', 'y'].includes(v)).sort() };
    }
    const ast = parse(src); let kind, asts, F_;
    if (ast.t === 'rel' && ast.op === '=' && ast.l.t === 'var' && ast.l.n === 'r' && !has(ast.r, 'r')) {
      asts = expandPM(ast.r); const vs = new Set(); asts.forEach(a => E.vars(a, vs)); asts.forEach(a => compile(a));
      return { src, kind: 'polar', asts, params: [...vs].filter(v => !['theta', 'x', 'y', 'r'].includes(v)).sort() };
    }
    if (ast.t === 'rel') {
      if (ast.op !== '=') err('تەنها هاوکێشە (=) دەکێشرێت؛ نایەکسانی نەکێشرێت');
      if (ast.l.t === 'var' && ast.l.n === 'y' && !has(ast.r, 'y')) { kind = 'explicit'; asts = expandPM(ast.r); }
      else if (ast.r.t === 'var' && ast.r.n === 'y' && !has(ast.l, 'y')) { kind = 'explicit'; asts = expandPM(ast.l); }
      else { kind = 'implicit'; F_ = B('-', ast.l, ast.r); if (!has(F_, 'x') && !has(F_, 'y')) err('هاوکێشەکە x یان y ی تێدا نییە'); }
    } else {
      if (has(ast, 'y')) err('بۆ کێشانی y دەبێت هاوکێشە بنووسیت، وەک y = …');
      kind = 'explicit'; asts = expandPM(ast);
    }
    const all = kind === 'explicit' ? asts : [F_], vs = new Set(); all.forEach(a => E.vars(a, vs));
    const params = [...vs].filter(v => v !== 'x' && v !== 'y').sort();
    if (kind === 'explicit') asts.forEach(a => compile(a));
    return { src, kind, asts, F: F_, params };
  };

  /* ---------- calculator operations (return {steps, answers, notes}) ---------- */
  const H = n => E.toHTML(n), T = n => E.toText(n);
  const ans = (ast, approx) => ({ html: H(ast), text: T(ast), approx: !!approx });
  const numAns = (v, approx) => ({ html: fmtNum(+v.toPrecision(12)), text: fmtNum(+v.toPrecision(12)), approx });
  function ratOnly(n) { return n.t === 'num' ? Number.isInteger(n.v) : n.t === 'neg' ? ratOnly(n.a) : n.t === 'bin' && ['+', '-', '*', '/'].includes(n.op) ? ratOnly(n.a) && ratOnly(n.b) : n.t === 'bin' && n.op === '^' ? ratOnly(n.a) && n.b.t === 'num' && Number.isInteger(n.b.v) : false; }
  function toFrac(v) { for (let q = 1; q <= 10000; q++) { const p = Math.round(v * q); if (Math.abs(p / q - v) < 1e-12 * Math.max(1, Math.abs(v))) return [p, q]; } return null; }

  E.ops = {
    evaluate(src, scope = {}) {
      let ast = parse(src);
      if (ast.t === 'rel') {
        const f = x => compile(x)(scope), l = f(ast.l), r = f(ast.r), eps = 1e-9 * (1 + Math.abs(l) + Math.abs(r));
        const ok = { '=': Math.abs(l - r) <= eps, '!=': Math.abs(l - r) > eps, '<': l < r - eps, '>': l > r + eps, '<=': l <= r + eps, '>=': l >= r - eps }[ast.op];
        return { steps: ['لای چەپ = ' + fmtNum(+l.toPrecision(12)), 'لای ڕاست = ' + fmtNum(+r.toPrecision(12))], answers: [{ html: ok ? 'ڕاستە ✓' : 'هەڵەیە ✗', text: ok ? 'true' : 'false', approx: false }], notes: [] };
      }
      const asts = expandPM(ast), answers = [], notes = [];
      for (const a of asts) {
        const free = [...E.vars(a)].filter(v => scope[v] === undefined);
        if (free.length) err('ئەم دەربڕینە گۆڕاوی «' + free.join('، ') + '» ی تێدایە — بەهاکەی بنووسە یان «ئاسانکردن» بەکاربهێنە');
        let v = compile(a)(scope);
        if (Number.isFinite(v) && Math.abs(v - Math.round(v)) < 1e-12 * Math.max(1, Math.abs(v))) v = Math.round(v);
        if (Number.isNaN(v)) err('ئەنجام پێناسە نەکراوە (دەرەوەی دۆمەین، یان 0/0)');
        if (!isFinite(v) && !(a.t === 'const')) err('دابەشکردن بەسەر سفر — ئەنجامەکە بێکۆتایە (∞)');
        if (Number.isInteger(v) || Math.abs(v) > 1e15) answers.push(numAns(v, false));
        else {
          const fr = ratOnly(S(a)) ? toFrac(v) : null;
          if (fr) { answers.push({ html: '<span class="fr"><span class="nu">' + fr[0] + '</span><span class="de">' + fr[1] + '</span></span>', text: fr[0] + '/' + fr[1], approx: false }); answers.push(numAns(v, true)); }
          else {
            const sa = S(a); if (T(sa) !== T(a) && sa.t !== 'num') answers.push({ ...ans(sa, false), exactNote: true });
            answers.push(numAns(v, true));
          }
        }
      }
      if (E.angle === 'deg' || /sin|cos|tan|cot|sec|csc/.test(src)) notes.push('دۆخی گۆشە: ' + (E.angle === 'deg' ? 'پلە (Degrees)' : 'ڕادیان (Radians)'));
      return { steps: [], answers, notes };
    },
    simplify(src) {
      const ast = parse(src); if (ast.t === 'rel') err('ئاسانکردن بۆ دەربڕین دەبێت، نەک هاوکێشە');
      const vs = [...E.vars(ast)], steps = ['دەربڕینی داخڵکراو: ' + H(ast)], notes = [];
      let res = S(ast);
      if (vs.length === 1) {
        const v = vs[0];
        if (ast.t === 'bin' && ast.op === '/') {
          const pn = polyFit(ast.a, v), pd = polyFit(ast.b, v);
          if (pn && pd && pd.length > 1 && pn.length >= pd.length) {
            const r = polyDiv(pn, pd);
            if (r.exact) {
              steps.push('هەردوو لایەن فرە‌ئەندام (polynomial) ن: ' + H(polyAst(pn, v)) + ' ÷ ' + H(polyAst(pd, v)));
              steps.push('دابەشکردنی درێژ (long division) بێ ماوە');
              const roots = pd.length === 2 ? [-pd[0] / pd[1]] : [];
              notes.push('ئەم ئاسانکردنە تەنها کاتێک ڕاستە' + (roots.length ? ' کە ' + v + ' ≠ ' + fmtNum(roots[0]) : ' کە لێکدەر ≠ 0') + '.');
              return { steps, answers: [ans(S(polyAst(r.q, v)))], notes };
            }
          }
        }
        const co = polyFit(ast, v);
        if (co) { res = S(polyAst(co, v)); steps.push('فراوانکردن و کۆکردنەوەی ئەندامە وەک یەکەکان'); }
      }
      if (vs.length === 0) { const val = compile(ast)({}); if (isFinite(val)) steps.push('بەهای ژمارەیی ≈ ' + fmtNum(+val.toPrecision(12))); }
      return { steps, answers: [ans(res)], notes };
    },
    derivative(src, v) {
      const ast = parse(src); if (ast.t === 'rel') err('مشتاق بۆ دەربڕین دەبێت، نەک هاوکێشە');
      v = v || (E.vars(ast).has('x') ? 'x' : [...E.vars(ast)][0] || 'x');
      const raw = D(ast, v), res = S(raw);
      return { steps: ['f(' + v + ') = ' + H(ast), 'ڕێساکانی توان (n·xⁿ⁻¹)، کۆ، لێکدان، دابەشکردن و زنجیرەیی (chain rule) بەکارهاتن', 'دوای ئاسانکردن:'], answers: [ans(res)], notes: ['ئەمە مشتاقی ڕەمزییە (دروست)، نەک نزیکەیی.'], label: 'd/d' + v };
    },
    solve(src) {
      const ast = parse(src); const F0 = ast.t === 'rel' ? (ast.op === '=' ? B('-', ast.l, ast.r) : err('بۆ نایەکسانی «چارەسەر» پشتگیری ناکرێت')) : ast;
      const notes = ast.t === 'rel' ? [] : ['دەربڕینەکە وەک «= 0» چارەسەر کرا.'], vs = [...E.vars(F0)];
      if (!vs.length) err('گۆڕاو نییە بۆ چارەسەرکردن');
      if (vs.length === 1) {
        const v = vs[0], co = polyFit(F0, v), steps = ['هاوکێشە: ' + (ast.t === 'rel' ? H(ast) : H(F0) + ' = 0')];
        if (co && co.length === 2) {
          const [c, b] = co; steps.push('فۆرمی ستانداردی هێڵی: ' + H(polyAst(co, v)) + ' = 0', v + ' = −c / b = ' + fmtNum(-c) + ' / ' + fmtNum(b));
          const r = -c / b; const fr = Number.isInteger(r) ? null : toFrac(r);
          return { steps, answers: [fr ? { html: v + ' = <span class="fr"><span class="nu">' + fr[0] + '</span><span class="de">' + fr[1] + '</span></span>', text: v + ' = ' + fr[0] + '/' + fr[1], approx: false } : { html: v + ' = ' + fmtNum(r), text: v + ' = ' + fmtNum(r), approx: false }], notes };
        }
        if (co && co.length === 3) {
          const [c, b, a] = co, d = b * b - 4 * a * c;
          steps.push('فۆرمی ستانداردی دووجا: ' + H(polyAst(co, v)) + ' = 0', 'a = ' + a + ' ، b = ' + b + ' ، c = ' + c, 'جیاکەرەوە: Δ = b² − 4ac = ' + fmtNum(d));
          const rs = [];
          if (d > 0) {
            const sq = Math.sqrt(d), perfect = Number.isInteger(sq);
            steps.push('Δ > 0 ← دوو ڕەگی ڕاستەقینە: ' + v + ' = (−b ± √Δ) / 2a');
            [1, -1].forEach(s => { const r = (-b + s * sq) / (2 * a); rs.push(perfect || true ? { html: v + ' = ' + fmtNum(+r.toPrecision(12)), text: v + ' = ' + fmtNum(+r.toPrecision(12)), approx: !perfect && !toFrac(r) } : null); });
            if (!perfect) notes.push('√Δ ڕاست نییە، بۆیە ئەنجامەکان نزیکەیین.');
          } else if (d === 0) { steps.push('Δ = 0 ← یەک ڕەگی دووبارە'); const r = -b / (2 * a); rs.push({ html: v + ' = ' + fmtNum(r), text: v + ' = ' + fmtNum(r), approx: false }); }
          else { steps.push('Δ < 0 ← ڕەگی ڕاستەقینە نییە؛ دوو ڕەگی ئاوێتە (complex) هەیە'); const re = -b / (2 * a), im = Math.sqrt(-d) / (2 * Math.abs(a)); rs.push({ html: v + ' = ' + fmtNum(+re.toPrecision(10)) + ' ± ' + fmtNum(+im.toPrecision(10)) + '<i>i</i>', text: v + ' = ' + fmtNum(+re.toPrecision(10)) + ' ± ' + fmtNum(+im.toPrecision(10)) + 'i', approx: !toFrac(im) }); }
          return { steps, answers: rs, notes };
        }
        if (co && co.length === 1) err(co[0] === 0 ? 'هەموو ژمارەیەک چارەسەرە (0 = 0)' : 'هیچ چارەسەرێک نییە');
        const sc = {}; const g = E.makeFn(F0, sc), rt = E.roots(g, -100, 100, 20000);
        if (!rt.length) err('لە ماوەی [−100, 100] دا ڕەگ نەدۆزرایەوە — ڕەنگە چارەسەر نەبێت یان لە دەرەوەی ماوەکە بێت');
        steps.push('چارەسەری ڕەمزی بۆ ئەم جۆرە پشتگیری ناکرێت ← شیوازی ژمارەیی (دابەشکردنی نیوە‌نیو)');
        return { steps, answers: rt.map(r => numAns(r, true)).map(a => ({ ...a, html: v + ' ≈ ' + a.html, text: v + ' ≈ ' + a.text })), notes: ['ئەنجامەکان نزیکەیین (numerical).'] };
      }
      for (const v of vs.slice().reverse().sort((a, b) => (b === 'y') - (a === 'y'))) {
        const A = S(D(F0, v));
        if (!has(A, v) && !(A.t === 'num' && A.v === 0)) {
          const Bx = S(sub(F0, v, N(0))), rest = [...E.vars(Bx)];
          let res = S(B('/', NEG(Bx), A));
          if (A.t === 'num' && rest.length === 1) { let co = polyFit(NEG(Bx), rest[0]), d = A.v; if (co) { if (d < 0) { co = co.map(c => -c); d = -d; } const pa = polyAst(co, rest[0]); res = d === 1 ? S(pa) : B('/', S(pa), N(d)); } }
          return { steps: ['هاوکێشەکە بەپێی «' + v + '» هێڵییە: A·' + v + ' + B = 0', 'A = ' + H(A) + ' ، B = ' + H(Bx), v + ' = −B / A'], answers: [{ html: v + ' = ' + H(res), text: v + ' = ' + T(res), approx: false }], notes };
        }
      }
      err('چەند گۆڕاوی هەیە و بەپێی هیچیان هێڵی نییە — چارەسەری ڕەمزی پشتگیری ناکرێت (دەتوانیت «کێشانی گراف» بەکاربهێنیت)');
    },
    integrate(src, a, b, v) {
      const ast = parse(src); if (ast.t === 'rel') err('ئینتیگڕاڵ بۆ دەربڕین دەبێت');
      v = v || (E.vars(ast).has('x') ? 'x' : [...E.vars(ast)][0] || 'x');
      const others = [...E.vars(ast)].filter(q => q !== v);
      let Fa = null; const co = !others.length ? polyFit(ast, v) : null;
      if (co) {
        const terms = co.map((c, k) => k === -1 ? 0 : c / (k + 1)); const ia = [0, ...terms];
        let acc = null;
        for (let k = ia.length - 1; k >= 1; k--) {
          const c = ia[k]; if (c === 0) continue; const orig = co[k - 1];
          const xk = k === 1 ? V(v) : B('^', V(v), N(k));
          const ao = Math.abs(orig);
          const t = Number.isInteger(orig / k) ? (ao / k === 1 ? xk : B('*', N(ao / k), xk)) : Number.isInteger(orig) ? B('/', ao === 1 ? xk : B('*', N(ao), xk), N(k)) : B('*', N(+Math.abs(c).toPrecision(8)), xk);
          acc = acc === null ? (c < 0 ? NEG(t) : t) : B(c > 0 ? '+' : '-', acc, t);
        }
        Fa = acc || N(0);
      } else Fa = IntR(ast, v);
      const notes = [], steps = [];
      if (a === undefined) {
        if (!Fa) err('ئینتیگڕاڵی ڕەمزی بۆ ئەم دەربڕینە پشتگیری ناکرێت — بۆ ئینتیگڕاڵی دیاریکراو دەتوانیت ئەنجامی ژمارەیی بەدەست بهێنیت');
        steps.push('∫ ' + H(ast) + ' d' + v, 'ڕێسای توان: ∫ ' + v + '<sup>n</sup> d' + v + ' = ' + v + '<sup>n+1</sup>/(n+1) + C و ڕێسا سەرەکییەکانی تر');
        return { steps, answers: [{ html: H(S(Fa)) + ' + <i>C</i>', text: T(S(Fa)) + ' + C', approx: false }], notes: ['C نەگۆڕی ئینتیگڕاڵە.'] };
      }
      const f = E.makeFn(ast, {}); const num = E.simpson(f, a, b);
      if (!isFinite(num)) err('ئینتیگڕاڵ لەم ماوەیەدا پێناسە نەکراوە (نایەکجار یان دەرەوەی دۆمەین)');
      if (Fa) {
        const G = E.makeFn(Fa, {}), ex = G(b) - G(a);
        steps.push('بەردەوامی: F(' + v + ') = ' + H(S(Fa)), 'F(' + fmtNum(b) + ') − F(' + fmtNum(a) + ') = ' + fmtNum(+G(b).toPrecision(10)) + ' − ' + fmtNum(+G(a).toPrecision(10)));
        const fr = toFrac(ex);
        return { steps, answers: [fr && !Number.isInteger(ex) ? { html: '<span class="fr"><span class="nu">' + fr[0] + '</span><span class="de">' + fr[1] + '</span></span>', text: fr[0] + '/' + fr[1], approx: false } : numAns(ex, !Number.isInteger(ex) && !fr), ...(fr && !Number.isInteger(ex) ? [numAns(ex, true)] : [])], notes: ['پشکنینی ژمارەیی (Simpson) ≈ ' + fmtNum(+num.toPrecision(10)) + ' — هاوتایە.'] };
      }
      return { steps: ['ئینتیگڕاڵی ڕەمزی نەدۆزرایەوە ← شیوازی ژمارەیی Simpson'], answers: [numAns(num, true)], notes: ['ئەنجامەکە نزیکەیی ژمارەییە، نەک ڕەمزی.'] };
    }
  };
  function linK(arg, v) { const k = S(D(arg, v)); return k.t === 'num' && k.v !== 0 ? k.v : null; }
  function IntR(n, v) {
    if (!has(n, v)) return B('*', n, V(v));
    const kd = (r, k) => r && (k === 1 ? r : B('/', r, N(k)));
    switch (n.t) {
      case 'var': return B('/', B('^', n, N(2)), N(2));
      case 'neg': { const r = IntR(n.a, v); return r && NEG(r); }
      case 'bin': {
        if (n.op === '+' || n.op === '-') { const a = IntR(n.a, v), b = IntR(n.b, v); return a && b && B(n.op, a, b); }
        if (n.op === '*') { if (!has(n.a, v)) { const r = IntR(n.b, v); return r && B('*', n.a, r); } if (!has(n.b, v)) { const r = IntR(n.a, v); return r && B('*', n.b, r); } return null; }
        if (n.op === '/') {
          if (!has(n.b, v)) { const r = IntR(n.a, v); return r && B('/', r, n.b); }
          if (!has(n.a, v)) { const k = linK(n.b, v); if (k) return kd(B('*', n.a, F('ln', { t: 'abs', a: n.b })), k); }
          return null;
        }
        if (n.op === '^') {
          if (!has(n.b, v) && n.b.t === 'num') { const k = linK(n.a, v); if (!k) return null; if (n.b.v === -1) return kd(F('ln', { t: 'abs', a: n.a }), k); return kd(B('/', B('^', n.a, N(n.b.v + 1)), N(n.b.v + 1)), k); }
          if (!has(n.a, v)) { const k = linK(n.b, v); if (k) return kd(B('/', n, F('ln', n.a)), k); }
        }
        return null;
      }
      case 'fn': {
        const k = linK(n.a, v); if (!k && !(n.n === 'ln' && n.a.t === 'var')) return null;
        switch (n.n) {
          case 'sin': return kd(NEG(F('cos', n.a)), k); case 'cos': return kd(F('sin', n.a), k); case 'exp': return kd(n, k);
          case 'sqrt': return kd(B('/', B('*', N(2), B('^', n.a, B('/', N(3), N(2)))), N(3)), k);
          case 'tan': return kd(NEG(F('ln', { t: 'abs', a: F('cos', n.a) })), k);
          case 'ln': return n.a.t === 'var' ? B('-', B('*', n.a, F('ln', n.a)), n.a) : null;
        }
      }
    }
    return null;
  }
  E.toFrac = v => toFrac(v); E.fmtNum = fmtNum;
  if (typeof module !== 'undefined') module.exports = E;
  return E;
})();
