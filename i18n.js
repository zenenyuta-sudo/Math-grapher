'use strict';
/* Languages: English, Sorani Kurdish, Arabic, Japanese. Translates the interface by matching the original text. */
const I18n = (function () {
  const LANGS = { en: ['ltr', 'English'], ckb: ['rtl', 'کوردی'], ar: ['rtl', 'العربية'], ja: ['ltr', '日本語'] };
  // English | Kurdish | Arabic | Japanese
  const R = `Calculator|ژمێرەر|الحاسبة|電卓
2D grapher|گرافی ٢ ڕەهەند|الرسم ثنائي الأبعاد|2Dグラフ
3D grapher|گرافی ٣ ڕەهەند|الرسم ثلاثي الأبعاد|3Dグラフ
MathSolver|چارەسەرکەری هاوکێشە|حلّال المعادلات|方程式ソルバー
Settings|ڕێکخستن|الإعدادات|設定
Help|یارمەتی|مساعدة|ヘルプ
About|دەربارە|حول التطبيق|このアプリについて
Graphs list|لیستی گرافەکان|قائمة الرسوم|グラフ一覧
New graph|گرافی نوێ|رسم جديد|新しいグラフ
Clear all|پاککردنەوەی هەموو|مسح الكل|すべて消去
Parameters (sliders)|پارامیتەرەکان (سلایدەر)|المعاملات (منزلقات)|パラメータ(スライダー)
Undo|گەڕانەوە|تراجع|元に戻す
Done|تەواو|تم|完了
More|زیاتر|المزيد|その他
Move|جووڵاندن|تحريك|移動
Pen|قەڵەم|قلم|ペン
Text|دەق|نص|テキスト
Erase|سڕینەوە|ممحاة|消しゴム
Clear|پاککردنەوە|مسح|クリア
Clear marks|سڕینەوەی نیشانەکان|مسح العلامات|マークを消去
Clear graph notes|سڕینەوەی تێبینییەکان|مسح الملاحظات|メモを消去
Domain/Range|بوار/مەودا|المجال/المدى|定義域/値域
Domain & Range|بوار و مەودا|المجال والمدى|定義域と値域
Angle mode — گۆشە|دۆخی گۆشە|وضع الزاوية|角度モード
Radians|ڕادیان|راديان|ラジアン
Degrees|پلە|درجات|度
Appearance — ڕەنگی ئەپەکە|ڕەنگی ئەپەکە|مظهر التطبيق|外観
Accent|ڕەنگی سەرەکی|اللون الأساسي|アクセント
Accent 2|ڕەنگی دووەم|اللون الثاني|アクセント2
Background|پاشبنەما|الخلفية|背景
Panels|پانێڵەکان|اللوحات|パネル
Top bar|شریتی سەرەوە|الشريط العلوي|上部バー
Graph background|پاشبنەمای گراف|خلفية الرسم|グラフの背景
Grid lines|هێڵی تۆڕ|خطوط الشبكة|グリッド線
Axes|تەوەرەکان|المحاور|軸
Numbers|ژمارەکان|الأرقام|数字
Reset colors|گەڕاندنەوەی ڕەنگەکان|إعادة الألوان|色をリセット
Reset graph colors|گەڕاندنەوەی ڕەنگی گراف|إعادة ألوان الرسم|グラフの色をリセット
Reset everything|سڕینەوەی هەموو شتێک|إعادة ضبط كل شيء|すべてリセット
Reset|گەڕانەوە بۆ سەرەتا|إعادة|リセット
Grid|تۆڕ|الشبكة|グリッド
Labels|ناوەکان|التسميات|ラベル
Line width|ئەستووریی هێڵ|سمك الخط|線の太さ
Equal scale|پێوانەی یەکسان|مقياس متساوٍ|等縮尺
Equal scale 1:1|پێوانەی یەکسان ١:١|مقياس متساوٍ 1:1|等縮尺 1:1
Tools — ئامرازەکان|ئامرازەکان|الأدوات|ツール
Graph|گراف|الرسم|グラフ
Intersections|خاڵی بڕین|نقاط التقاطع|交点
Roots (x-int)|ڕیشەکان|الجذور|根(x切片)
y-intercept|بڕینی y|التقاطع مع y|y切片
Max / Min|گەورەترین / بچووکترین|قيمة عظمى / صغرى|最大 / 最小
Tangent line|هێڵی شەقام|المماس|接線
Derivative f′(x)|لێکدانەوە f′(x)|المشتقة f′(x)|導関数 f′(x)
Apply|جێبەجێکردن|تطبيق|適用
Apply ranges|جێبەجێکردنی ماوەکان|تطبيق المدى|範囲を適用
Auto|خۆکار|تلقائي|自動
Solve|چارەسەر|حل|解く
Front|پێشەوە|أمامي|正面
Side|لا|جانبي|側面
Top|سەرەوە|علوي|上面
Iso|ئیزۆ|متساوي القياس|アイソメ
Floor|زەوی|الأرضية|床
Detail +|وردی +|تفصيل +|詳細 +
Detail −|وردی −|تفصيل −|詳細 −
Range +|ماوە +|مدى +|範囲 +
Range −|ماوە −|مدى −|範囲 −
Range ±R|ماوەی ±R|المدى ±R|範囲 ±R
Menu|مینیو|القائمة|メニュー
Share|هاوبەشکردن|مشاركة|共有
Zoom in|زووم کردن|تكبير|拡大
Zoom out|دوورخستنەوە|تصغير|縮小
Write on graph|نووسین لەسەر گراف|الكتابة على الرسم|グラフに書く
Color|ڕەنگ|اللون|色
Width|ئەستووری|السمك|太さ
Language|زمان|اللغة|言語
Animation|جووڵە|الحركة|アニメーション
Screen animations|ئەنیمەیشنی شاشەکان|حركة الشاشات|画面アニメーション
Background effect|کاریگەری پاشبنەما|تأثير الخلفية|背景エフェクト
None|هیچ|بدون|なし
Particles|پارتیکڵ|جسيمات|パーティクル
Stars|ئەستێرەکان|نجوم|星
Waves|شەپۆل|أمواج|波
Aurora|ئۆرۆرا|الشفق|オーロラ
Kurdistan|کوردستان|كردستان|クルディスタン
Kurdistan flag|ئاڵای کوردستان|علم كردستان|クルディスタンの旗
Settings — ڕێکخستن|ڕێکخستن|الإعدادات|設定
Help — یارمەتی|یارمەتی|مساعدة|ヘルプ
Calculator — ژمێرەر|ژمێرەر|الحاسبة|電卓
2D grapher — گرافی دوو ڕەهەند|گرافی دوو ڕەهەند|الرسم ثنائي الأبعاد|2Dグラフ
3D grapher — گرافی سێ ڕەهەند|گرافی سێ ڕەهەند|الرسم ثلاثي الأبعاد|3Dグラフ
MathSolver — چارەسەرکەر|چارەسەرکەری هاوکێشە|حلّال المعادلات|方程式ソルバー
2D grapher — ماوەی گراف|ماوەی گراف|مدى الرسم|グラフの範囲
Home|سەرەکی|الرئيسية|ホーム
Welcome 👋|بەخێربێیت 👋|أهلاً بك 👋|ようこそ 👋
Calculate · Graph · Solve|ژمێرین · گراف · چارەسەر|احسب · ارسم · حلّ|計算 · グラフ · 解く
Quick access|دەستپێگەیشتنی خێرا|وصول سريع|クイックアクセス
Scientific calculator|ژمێرەری زانستی|حاسبة علمية|関数電卓
Plot functions|کێشانی فەنکشن|رسم الدوال|関数を描く
Surfaces in 3D|ڕووەکان بە ٣ ڕەهەند|أسطح ثلاثية الأبعاد|3Dの曲面
Step by Step|هەنگاو بە هەنگاو|خطوة بخطوة|ステップごと
Step by step|هەنگاو بە هەنگاو|خطوة بخطوة|ステップごと
Colors, language, effects|ڕەنگ، زمان، کاریگەری|الألوان واللغة والتأثيرات|色・言語・エフェクト
How to use|چۆنیەتی بەکارهێنان|كيفية الاستخدام|使い方
Try an example|نموونەیەک تاقی بکەرەوە|جرّب مثالاً|例を試す
Our Telegram channel|کەناڵی تێلێگرامی ئێمە|قناتنا على تيليجرام|Telegramチャンネル
Install app|دابەزاندنی ئەپ|تثبيت التطبيق|アプリをインストール
Works offline|بێ ئینتەرنێت کار دەکات|يعمل بدون إنترنت|オフラインで動作
Ready for offline use|ئامادەیە بۆ کارکردن بێ ئینتەرنێت|جاهز للعمل بدون إنترنت|オフライン利用の準備完了
Preparing offline files…|ئامادەکردنی فایلەکان بۆ بێ ئینتەرنێت…|جارٍ تجهيز الملفات للعمل دون اتصال…|オフライン用ファイルを準備中…
Offline mode not supported|دۆخی بێ ئینتەرنێت پشتگیری ناکرێت|وضع عدم الاتصال غير مدعوم|オフラインモード非対応
Version 1.1|وەشانی ١.١|الإصدار 1.1|バージョン 1.1
Developer|گەشەپێدەر|المطوّر|開発者`;
  const D = {}; R.split('\n').forEach(l => { const a = l.split('|'); D[a[0]] = { ckb: a[1], ar: a[2], ja: a[3] }; });
  let lang = 'en', busy = false; const orig = new WeakMap(), origA = new WeakMap();
  const ATTRS = ['title', 'aria-label', 'placeholder'];
  const tr = s => { const k = s.trim(); if (!k) return s; if (lang === 'en') return s; const d = D[k]; return d && d[lang] ? s.replace(k, d[lang]) : s; };
  function text(n) { if (!orig.has(n)) orig.set(n, n.nodeValue); const o = orig.get(n), v = lang === 'en' ? o : tr(o); if (n.nodeValue !== v) n.nodeValue = v; }
  function el(e) {
    ATTRS.forEach(a => { if (!e.hasAttribute || !e.hasAttribute(a)) return; let m = origA.get(e); if (!m) origA.set(e, m = {}); if (!(a in m)) m[a] = e.getAttribute(a); const v = lang === 'en' ? m[a] : tr(m[a]); if (e.getAttribute(a) !== v) e.setAttribute(a, v); });
  }
  function walk(root) {
    if (root.nodeType === 3) { if (root.parentNode && /^(SCRIPT|STYLE)$/.test(root.parentNode.tagName)) return; text(root); return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|CANVAS|TEXTAREA)$/.test(root.tagName)) return;
    el(root); const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) { if (n.nodeType === 3) { if (!/^(SCRIPT|STYLE)$/.test(n.parentNode.tagName)) text(n); } else el(n); }
  }
  function all() { busy = true; try { walk(document.body); document.title = 'Math Grapher'; } finally { busy = false; } }
  function set(l) {
    if (!LANGS[l]) l = 'en'; lang = l;
    const h = document.documentElement; h.lang = l; h.dir = LANGS[l][0];
    try { localStorage.setItem('mg.lang', l); } catch (e) { }
    const s = document.querySelector('#s-lang'); if (s) s.value = l;
    all();
  }
  function init() {
    const s = document.querySelector('#s-lang');
    if (s) { s.innerHTML = Object.keys(LANGS).map(k => '<option value="' + k + '">' + LANGS[k][1] + '</option>').join(''); s.onchange = () => set(s.value); }
    let l = 'en'; try { l = localStorage.getItem('mg.lang') || 'en'; } catch (e) { }
    new MutationObserver(ms => { if (busy || lang === 'en') return; busy = true; try { ms.forEach(m => { if (m.type === 'characterData') text(m.target); else if (m.type === 'attributes') el(m.target); else m.addedNodes.forEach(walk); }); } finally { busy = false; } })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    set(l);
  }
  return { init, set, t: s => tr(s), lang: () => lang };
})();
