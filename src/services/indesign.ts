import { DocData, Item } from '../types/printStudio';
import { layoutText } from './textLayout';
import { marginsFor } from './layout';

const MM = 2.8346;
const esc = (v: any) => JSON.stringify(v).replace(/[\u007f-\uffff]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
const hex6 = (c?: string) => {
  let s = (c || '#000000').trim();
  if (/^#[0-9a-f]{3}$/i.test(s)) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  return /^#[0-9a-f]{6}/i.test(s) ? s.slice(1, 7).toLowerCase() : '000000';
};

export type ImgFn = (it: Item) => Promise<{ ext: 'jpg' | 'png'; data: string } | null>;

/**
 * Builds an InDesign ExtendScript (.jsx). Running it inside InDesign creates the whole document
 * (pages, masters, bleed, margins, text frames with columns, shapes, images) so it can be saved as .indd.
 */
export async function buildInDesignScript(doc: DocData, imgFn: ImgFn, mctx: CanvasRenderingContext2D): Promise<string> {
  const IMG: Record<string, { e: string; d: string }> = {};
  let imgCount = 0;
  const imgIds = new Map<string, string>();

  const conv = async (list: Item[], pStr: string) => {
    const out: any[] = [];
    for (const it of list) {
      if (it.hidden) continue;
      const base: any = { x: +it.x.toFixed(2), y: +it.y.toFixed(2), w: +it.w.toFixed(2), h: +it.h.toFixed(2), o: it.opacity !== undefined ? it.opacity : 1, c: hex6(it.color) };
      if (it.type === 'rect') out.push({ t: 'r', ...base });
      else if (it.type === 'ell') out.push({ t: 'e', ...base });
      else if (it.type === 'text') {
        const T = layoutText(mctx, it, pStr);
        const rtl = T.rtl;
        const al = it.a || 'start';
        const a = al === 'center' ? 'C' : al === 'start' ? (rtl ? 'R' : 'L') : rtl ? 'L' : 'R';
        out.push({
          t: 't', ...base, h: +(it.fixedH ? it.h : Math.max(it.h, T.height)).toFixed(2),
          s: it.text || '', fs: it.fs || 16, f: it.fam || 'Cairo', b: it.b ? 1 : 0, a,
          cols: Math.max(1, Math.round(it.cols || 1)), gut: +(it.gut ?? 10).toFixed(2), pad: +(it.pad || 0).toFixed(2), rtl: rtl ? 1 : 0,
        });
      } else if (it.type === 'img') {
        const key = it.k || '';
        let id = imgIds.get(key);
        if (!id) {
          const r = await imgFn(it).catch(() => null);
          if (r) {
            id = 'i' + imgCount++;
            imgIds.set(key, id);
            IMG[id] = { e: r.ext, d: r.data };
          }
        }
        out.push({ t: 'i', ...base, k: id || '', fit: it.fit === 'contain' ? 'n' : it.fit === 'fill' ? 'f' : 'c' });
      } else if (it.type === 'path' && it.pts && it.pts.length > 1) {
        const sx = it.w / (it.pw || it.w || 1);
        const sy = it.h / (it.ph || it.h || 1);
        out.push({ t: 'p', ...base, sw: it.sw || 2, pts: it.pts.map((q) => [+(it.x + q[0] * sx).toFixed(2), +(it.y + q[1] * sy).toFixed(2)]) });
      }
    }
    return out;
  };

  const rtl = doc.binding === 'rtl';
  const b = doc.bleeds || { top: doc.bleed || 0, bottom: doc.bleed || 0, inside: doc.facingPages ? 0 : doc.bleed || 0, outside: doc.bleed || 0 };
  const m0 = marginsFor(doc, 0);
  const D: any = {
    w: +doc.w.toFixed(2), h: +doc.h.toFixed(2), facing: doc.facingPages ? 1 : 0, rtl: rtl ? 1 : 0, print: doc.intent === 'print' || (doc.intent as any) === 'PRINT' ? 1 : 0,
    bleed: { top: +(b.top * MM).toFixed(2), bottom: +(b.bottom * MM).toFixed(2), inside: +(b.inside * MM).toFixed(2), outside: +(b.outside * MM).toFixed(2) },
    m: doc.facingPages
      ? { top: +((doc.margins?.top ?? 12) * MM).toFixed(2), bottom: +((doc.margins?.bottom ?? 12) * MM).toFixed(2), left: +((doc.margins?.inside ?? 15) * MM).toFixed(2), right: +((doc.margins?.outside ?? 12) * MM).toFixed(2) }
      : { top: +m0.top.toFixed(2), bottom: +m0.bottom.toFixed(2), left: +m0.left.toFixed(2), right: +m0.right.toFixed(2) },
    cols: doc.columns ?? 1,
    gut: +((doc.gutter ?? 4) * MM).toFixed(2),
    pages: [] as any[],
    masters: { A: await conv(doc.masters.A || [], '1'), B: await conv(doc.masters.B || [], '1') },
  };
  for (let i = 0; i < doc.pages.length; i++) {
    D.pages.push({ m: doc.pages[i].m || '', items: await conv(doc.pages[i].items, String(i + 1)) });
  }

  const code = `
var LOG = [];
function T(fn, label) { try { return fn(); } catch (e) { LOG.push(label + ': ' + (e && e.message ? e.message : e)); return null; } }
function b64decode(s) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var lookup = {}, i;
  for (i = 0; i < 64; i++) lookup[chars.charAt(i)] = i;
  var out = [], buf = 0, bits = 0;
  for (var j = 0; j < s.length; j++) {
    var ch = s.charAt(j);
    if (ch === '=') break;
    var v = lookup[ch];
    if (v === undefined) continue;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) { bits -= 8; out.push(String.fromCharCode((buf >> bits) & 255)); }
    buf = buf & ((1 << bits) - 1);
  }
  return out.join('');
}
app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
var doc = app.documents.add();
doc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.POINTS;
doc.viewPreferences.verticalMeasurementUnits = MeasurementUnits.POINTS;
T(function () { doc.viewPreferences.rulerOrigin = RulerOrigin.PAGE_ORIGIN; }, 'rulerOrigin');
var dp = doc.documentPreferences;
dp.pageWidth = D.w;
dp.pageHeight = D.h;
T(function () { dp.intent = D.print ? DocumentIntentOptions.PRINT_INTENT : DocumentIntentOptions.WEB_INTENT; }, 'intent');
dp.facingPages = !!D.facing;
T(function () { dp.pageBinding = D.rtl ? PageBindingOptions.RIGHT_TO_LEFT : PageBindingOptions.LEFT_TO_RIGHT; }, 'binding');
T(function () {
  dp.documentBleedUniformSize = false;
  dp.documentBleedTopOffset = D.bleed.top;
  dp.documentBleedBottomOffset = D.bleed.bottom;
  dp.documentBleedInsideOrLeftOffset = D.bleed.inside;
  dp.documentBleedOutsideOrRightOffset = D.bleed.outside;
}, 'bleed');
while (doc.pages.length < D.pages.length) doc.pages.add();

var COL = {};
var NONE = doc.swatches.itemByName('None');
function color(hex) {
  if (COL[hex]) return COL[hex];
  var r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
  var c = T(function () { return doc.colors.add({ name: 'PS_' + hex, model: ColorModel.PROCESS, space: ColorSpace.RGB, colorValue: [r, g, b] }); }, 'color ' + hex);
  COL[hex] = c;
  return c;
}
function setContents(tf, s) {
  var parts = s.split('\\u2039#\\u203A');
  if (parts.length === 1) { tf.contents = s.replace(/\\n/g, '\\r'); return; }
  tf.contents = '';
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] !== '') tf.insertionPoints.item(-1).contents = parts[i].replace(/\\n/g, '\\r');
    if (i < parts.length - 1) tf.insertionPoints.item(-1).contents = SpecialCharacters.AUTO_PAGE_NUMBER;
  }
}
function bounds(it) { return [it.y, it.x, it.y + it.h, it.x + it.w]; }
function addShape(page, it, oval) {
  var s = oval ? page.ovals.add() : page.rectangles.add();
  s.geometricBounds = bounds(it);
  s.fillColor = color(it.c);
  s.strokeColor = NONE;
  T(function () { if (it.o < 1) s.transparencySettings.blendingSettings.opacity = it.o * 100; }, 'opacity');
}
function addText(page, it) {
  var tf = page.textFrames.add();
  tf.geometricBounds = bounds(it);
  T(function () {
    var tp = tf.textFramePreferences;
    tp.textColumnCount = it.cols;
    tp.textColumnGutter = it.gut;
    tp.insetSpacing = [it.pad, it.pad, it.pad, it.pad];
  }, 'frame preferences');
  setContents(tf, it.s);
  var st = tf.parentStory;
  T(function () { st.appliedFont = it.f; }, 'font ' + it.f);
  T(function () { st.fontStyle = it.b ? 'Bold' : 'Regular'; }, 'font style');
  T(function () { st.pointSize = it.fs; st.leading = it.fs * 1.3; st.fillColor = color(it.c); }, 'text size/color');
  T(function () { st.justification = it.a === 'C' ? Justification.CENTER_ALIGN : (it.a === 'R' ? Justification.RIGHT_ALIGN : Justification.LEFT_ALIGN); }, 'alignment');
  if (it.rtl) T(function () { st.paragraphDirection = ParagraphDirectionOptions.RIGHT_TO_LEFT_DIRECTION; st.characterDirection = CharacterDirectionOptions.RIGHT_TO_LEFT_CHARACTER; }, 'rtl (needs the Middle East version of InDesign)');
}
function addImage(page, it) {
  var r = page.rectangles.add();
  r.geometricBounds = bounds(it);
  r.strokeColor = NONE;
  var im = IMG[it.k];
  if (!im) return;
  var f = T(function () {
    var file = new File(Folder.temp + '/ps_' + it.k + '.' + im.e);
    if (!file.exists) { file.encoding = 'BINARY'; file.open('w'); file.write(b64decode(im.d)); file.close(); }
    return file;
  }, 'write image');
  if (f) T(function () {
    r.place(f);
    r.fit(it.fit === 'f' ? FitOptions.CONTENT_TO_FRAME : (it.fit === 'n' ? FitOptions.PROPORTIONALLY : FitOptions.FILL_PROPORTIONALLY));
    r.fit(FitOptions.CENTER_CONTENT);
  }, 'place image');
}
function addPath(page, it) {
  var g = page.graphicLines.add();
  T(function () { g.paths.item(0).entirePath = it.pts; g.strokeColor = color(it.c); g.strokeWeight = it.sw; g.fillColor = NONE; }, 'path');
}
function drawOn(page, items) {
  for (var i = 0; i < items.length; i++) {
    (function (it, n) {
      T(function () {
        if (it.t === 'r') addShape(page, it, false);
        else if (it.t === 'e') addShape(page, it, true);
        else if (it.t === 't') addText(page, it);
        else if (it.t === 'i') addImage(page, it);
        else if (it.t === 'p') addPath(page, it);
      }, 'item ' + n);
    })(items[i], i);
  }
}

// margins and columns of every page
for (var pi = 0; pi < D.pages.length; pi++) {
  (function (n) {
    T(function () {
      var mp = doc.pages[n].marginPreferences;
      mp.top = D.m.top; mp.bottom = D.m.bottom; mp.left = D.m.left; mp.right = D.m.right;
      mp.columnCount = D.cols; mp.columnGutter = D.gut;
    }, 'margins page ' + (n + 1));
  })(pi);
}

// master pages A and B
var MS = {};
MS.A = doc.masterSpreads.item(0);
T(function () { MS.A.namePrefix = 'A'; MS.A.baseName = 'Master'; }, 'name of A-Master');
MS.B = T(function () { var m = doc.masterSpreads.add(); m.namePrefix = 'B'; m.baseName = 'Master'; return m; }, 'create B-Master');
var keys = ['A', 'B'];
for (var ki = 0; ki < keys.length; ki++) {
  var k = keys[ki];
  if (MS[k] && D.masters[k].length) {
    for (var mp2 = 0; mp2 < MS[k].pages.length; mp2++) drawOn(MS[k].pages.item(mp2), D.masters[k]);
  }
}

// pages
for (var p = 0; p < D.pages.length; p++) {
  (function (n) {
    var pg = doc.pages[n];
    var mk = D.pages[n].m;
    if (mk && MS[mk]) T(function () { pg.appliedMaster = MS[mk]; }, 'apply master to page ' + (n + 1));
    drawOn(pg, D.pages[n].items);
  })(p);
}

app.scriptPreferences.userInteractionLevel = UserInteractionLevels.INTERACT_WITH_ALL;
var msg = 'Document created: ' + D.pages.length + ' page(s). Save it with File > Save As (InDesign Document).\\n' +
  '\\u062a\\u0645 \\u0625\\u0646\\u0634\\u0627\\u0621 \\u0627\\u0644\\u0645\\u0633\\u062a\\u0646\\u062f. \\u0627\\u062d\\u0641\\u0638\\u0647 \\u0645\\u0646 File > Save As.';
if (LOG.length) { msg += '\\n\\nNotes (' + LOG.length + '):\\n' + LOG.slice(0, 8).join('\\n'); }
alert(msg);
`;
  return '\uFEFF#target indesign\n// Generated by Print Studio. Run inside Adobe InDesign: File > Scripts, or Window > Utilities > Scripts.\nvar D = ' + esc(D) + ';\nvar IMG = ' + esc(IMG) + ';\n' + code;
}
