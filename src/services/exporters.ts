import { DocData, Item } from '../types/printStudio';
import { layoutText } from './textLayout';
import { BL, spillItems } from './layout';

type DrawFn = (x: CanvasRenderingContext2D, list: Item[], pStr: string) => Promise<void>;

const hex = (c?: string) => {
  let s = (c || '#000000').trim();
  if (/^#[0-9a-f]{3}$/i.test(s)) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  if (/^#[0-9a-f]{6}/i.test(s)) return s.slice(1, 7).toUpperCase();
  return '000000';
};

function boundsOf(it: Item, mctx: CanvasRenderingContext2D, pStr: string) {
  if (it.type === 'text') {
    const T = layoutText(mctx, it, pStr);
    return { x: it.x, y: it.y, w: it.w, h: it.fixedH ? it.h : Math.max(it.h, T.height) };
  }
  return { x: it.x, y: it.y, w: it.w, h: it.h };
}

async function rasterItem(it: Item, drawItems: DrawFn, pStr: string, ppp: number, b: { x: number; y: number; w: number; h: number }) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(b.w * ppp));
  c.height = Math.max(1, Math.round(b.h * ppp));
  const x = c.getContext('2d')!;
  x.scale(ppp, ppp);
  x.translate(-b.x, -b.y);
  await drawItems(x, [it], pStr);
  return c;
}

const listFor = (doc: DocData, pi: number) => {
  const pg = doc.pages[pi];
  const master = pg.m && doc.masters[pg.m] ? doc.masters[pg.m] : [];
  return [...master, ...spillItems(doc, pi), ...pg.items].filter((i) => !i.hidden);
};

// ================= PowerPoint =================
export async function exportPptx(doc: DocData, drawItems: DrawFn, mctx: CanvasRenderingContext2D): Promise<Blob> {
  const P = (window as any).PptxGenJS;
  if (!P) throw new Error('PowerPoint library not loaded');
  const pptx = new P();
  const inch = (v: number) => v / 72;
  pptx.defineLayout({ name: 'PS', width: inch(doc.w), height: inch(doc.h) });
  pptx.layout = 'PS';
  for (let pi = 0; pi < doc.pages.length; pi++) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    const pStr = String(pi + 1);
    for (const it of listFor(doc, pi)) {
      const tr = it.opacity !== undefined && it.opacity < 1 ? Math.round((1 - it.opacity) * 100) : 0;
      if (it.type === 'rect' || it.type === 'ell') {
        slide.addShape(it.type === 'rect' ? pptx.ShapeType.rect : pptx.ShapeType.ellipse, {
          x: inch(it.x), y: inch(it.y), w: inch(it.w), h: inch(it.h),
          fill: { color: hex(it.color), transparency: tr },
          line: { type: 'none' },
        });
      } else if (it.type === 'text') {
        const T = layoutText(mctx, it, pStr);
        const a = it.a || 'start';
        const align = a === 'center' ? 'center' : a === 'start' ? (T.rtl ? 'right' : 'left') : T.rtl ? 'left' : 'right';
        T.columns.forEach((lines, ci) => {
          if (!lines.length) return;
          slide.addText(lines.join('\n'), {
            x: inch(T.colX(ci)), y: inch(it.y + T.pad), w: inch(T.colW), h: inch(T.lh * lines.length),
            fontFace: it.fam || 'Cairo', fontSize: it.fs || 16, color: hex(it.color), bold: !!it.b,
            align, valign: 'top', margin: 0, rtlMode: T.rtl, lineSpacing: T.lh, wrap: false, fit: 'none',
          });
        });
      } else if (it.type === 'img' || it.type === 'path') {
        const b = boundsOf(it, mctx, pStr);
        const ppp = Math.min(3, 1600 / Math.max(b.w, b.h, 1));
        const c = await rasterItem(it, drawItems, pStr, ppp, b);
        slide.addImage({ data: c.toDataURL('image/png'), x: inch(b.x), y: inch(b.y), w: inch(b.w), h: inch(b.h) });
      }
    }
  }
  let out: any;
  try {
    out = await pptx.write({ outputType: 'blob' });
  } catch (_) {
    out = await pptx.write('blob');
  }
  return out instanceof Blob ? out : new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

// ================= Photoshop (.psd, layered) =================
class BW {
  parts: Uint8Array[] = [];
  len = 0;
  bytes(b: Uint8Array) { this.parts.push(b); this.len += b.length; }
  u8(v: number) { this.bytes(Uint8Array.of(v & 255)); }
  u16(v: number) { this.bytes(Uint8Array.of((v >> 8) & 255, v & 255)); }
  i16(v: number) { this.u16(v & 0xffff); }
  u32(v: number) { this.bytes(Uint8Array.of((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255)); }
  i32(v: number) { this.u32(v >>> 0); }
  str(s: string) { this.bytes(Uint8Array.from(s, (ch) => ch.charCodeAt(0) & 255)); }
  out() {
    const o = new Uint8Array(this.len);
    let p = 0;
    for (const b of this.parts) { o.set(b, p); p += b.length; }
    return o;
  }
}

function packBitsRow(src: Uint8Array): Uint8Array {
  const n = src.length;
  const out = new Uint8Array(n + Math.ceil(n / 128) + 2);
  let o = 0;
  let i = 0;
  while (i < n) {
    let run = 1;
    while (i + run < n && run < 128 && src[i + run] === src[i]) run++;
    if (run >= 2) {
      out[o++] = 257 - run;
      out[o++] = src[i];
      i += run;
    } else {
      let lit = 1;
      while (i + lit < n && lit < 128 && !(i + lit + 1 < n && src[i + lit] === src[i + lit + 1])) lit++;
      out[o++] = lit - 1;
      for (let k = 0; k < lit; k++) out[o++] = src[i + k];
      i += lit;
    }
  }
  return out.slice(0, o);
}

function encodeChannel(plane: Uint8Array, w: number, h: number) {
  const rows: Uint8Array[] = [];
  let total = 0;
  for (let r = 0; r < h; r++) {
    const e = packBitsRow(plane.subarray(r * w, (r + 1) * w));
    rows.push(e);
    total += e.length;
  }
  return { rows, total };
}

interface PsdLayer { name: string; left: number; top: number; canvas: HTMLCanvasElement; opacity: number }

function buildPsd(W: number, H: number, layers: PsdLayer[], composite: HTMLCanvasElement): Uint8Array {
  const w = new BW();
  w.str('8BPS'); w.u16(1); w.bytes(new Uint8Array(6)); w.u16(3); w.u32(H); w.u32(W); w.u16(8); w.u16(3);
  w.u32(0); w.u32(0);
  const recs = new BW();
  const data = new BW();
  layers.forEach((L) => {
    const lw = L.canvas.width, lh = L.canvas.height;
    const px = L.canvas.getContext('2d')!.getImageData(0, 0, lw, lh).data;
    const n = lw * lh;
    const planes = [new Uint8Array(n), new Uint8Array(n), new Uint8Array(n), new Uint8Array(n)]; // A,R,G,B
    for (let i = 0; i < n; i++) {
      planes[0][i] = px[i * 4 + 3]; planes[1][i] = px[i * 4]; planes[2][i] = px[i * 4 + 1]; planes[3][i] = px[i * 4 + 2];
    }
    const enc = planes.map((pl) => encodeChannel(pl, lw, lh));
    recs.i32(L.top); recs.i32(L.left); recs.i32(L.top + lh); recs.i32(L.left + lw);
    recs.u16(4);
    [-1, 0, 1, 2].forEach((id, ci) => { recs.i16(id); recs.u32(2 + 2 * lh + enc[ci].total); });
    recs.str('8BIM'); recs.str('norm'); recs.u8(Math.max(0, Math.min(255, Math.round(L.opacity * 255)))); recs.u8(0); recs.u8(0); recs.u8(0);
    const nm = L.name.replace(/[^\x20-\x7e]/g, '_').slice(0, 31);
    let padded = 1 + nm.length;
    while (padded % 4) padded++;
    recs.u32(4 + 4 + padded);
    recs.u32(0); recs.u32(0);
    recs.u8(nm.length); recs.str(nm);
    for (let i = 1 + nm.length; i < padded; i++) recs.u8(0);
    enc.forEach((e) => {
      data.u16(1);
      e.rows.forEach((r) => data.u16(r.length));
      e.rows.forEach((r) => data.bytes(r));
    });
  });
  const info = new BW();
  info.i16(layers.length);
  info.bytes(recs.out());
  info.bytes(data.out());
  if (info.len % 2) info.u8(0);
  w.u32(4 + info.len + 4);
  w.u32(info.len);
  w.bytes(info.out());
  w.u32(0);
  const cpx = composite.getContext('2d')!.getImageData(0, 0, W, H).data;
  const n = W * H;
  const rgb = [new Uint8Array(n), new Uint8Array(n), new Uint8Array(n)];
  for (let i = 0; i < n; i++) { rgb[0][i] = cpx[i * 4]; rgb[1][i] = cpx[i * 4 + 1]; rgb[2][i] = cpx[i * 4 + 2]; }
  const cenc = rgb.map((pl) => encodeChannel(pl, W, H));
  w.u16(1);
  cenc.forEach((e) => e.rows.forEach((r) => w.u16(r.length)));
  cenc.forEach((e) => e.rows.forEach((r) => w.bytes(r)));
  return w.out();
}

export async function exportPsdPage(
  doc: DocData,
  pi: number,
  drawItems: DrawFn,
  renderPage: (pi: number, ppp: number, bl: BL) => Promise<HTMLCanvasElement>,
  mctx: CanvasRenderingContext2D,
  ppp: number,
  bl: BL
): Promise<Uint8Array> {
  const comp = await renderPage(pi, ppp, bl);
  const bg = document.createElement('canvas');
  bg.width = comp.width; bg.height = comp.height;
  const bx = bg.getContext('2d')!;
  bx.fillStyle = '#fff'; bx.fillRect(0, 0, bg.width, bg.height);
  const layers: PsdLayer[] = [{ name: 'Background', left: 0, top: 0, canvas: bg, opacity: 1 }];
  const names: Record<string, string> = { text: 'Text', rect: 'Rectangle', ell: 'Ellipse', img: 'Image', path: 'Pen' };
  let n = 0;
  const pStr = String(pi + 1);
  for (const it of listFor(doc, pi)) {
    const b = boundsOf(it, mctx, pStr);
    const c = await rasterItem(it, drawItems, pStr, ppp, b);
    layers.push({ name: `${names[it.type] || 'Layer'} ${++n}`, left: Math.round((b.x + bl.l) * ppp), top: Math.round((b.y + bl.t) * ppp), canvas: c, opacity: it.opacity ?? 1 });
  }
  return buildPsd(comp.width, comp.height, layers, comp);
}
