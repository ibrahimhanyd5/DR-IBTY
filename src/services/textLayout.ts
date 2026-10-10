import { Item } from '../types/printStudio';

export const LH = 1.3;
export const MMPT = 2.8346;

export function wrapLines(c: CanvasRenderingContext2D, it: Item, p: string, width: number) {
  const t = (it.text || '').replace(/‹#›/g, p);
  c.font = `${it.b ? 700 : 400} ${it.fs || 16}px "${it.fam || 'Cairo'}"`;
  const rtl = /[\u0590-\u08FF]/.test(t);
  c.direction = rtl ? 'rtl' : 'ltr';
  const out: string[] = [];
  t.split('\n').forEach((par) => {
    let cur = '';
    par.split(' ').forEach((w) => {
      const tr = cur ? cur + ' ' + w : w;
      if (c.measureText(tr).width > width && cur) {
        out.push(cur);
        cur = w;
      } else {
        cur = tr;
      }
    });
    out.push(cur);
  });
  return { lines: out, rtl };
}

export interface TextLayout {
  columns: string[][];
  cols: number;
  colW: number;
  lh: number;
  rtl: boolean;
  pad: number;
  gut: number;
  overflow: boolean;
  height: number;
  colX: (i: number) => number;
}

export function layoutText(c: CanvasRenderingContext2D, it: Item, p: string): TextLayout {
  const cols = Math.max(1, Math.min(6, Math.round(it.cols || 1)));
  const gut = it.gut ?? 10;
  const pad = it.pad || 0;
  const colW = Math.max(10, (it.w - 2 * pad - gut * (cols - 1)) / cols);
  const { lines, rtl } = wrapLines(c, it, p, colW);
  const lh = (it.fs || 16) * LH;
  const per = it.fixedH
    ? Math.max(1, Math.floor((it.h - 2 * pad) / lh))
    : Math.max(1, Math.ceil(lines.length / cols));
  const columns: string[][] = [];
  for (let i = 0; i < cols; i++) columns.push(lines.slice(i * per, (i + 1) * per));
  const overflow = lines.length > per * cols;
  const height = it.fixedH ? it.h : per * lh + 2 * pad;
  const colX = (i: number) =>
    rtl ? it.x + it.w - pad - (i + 1) * colW - i * gut : it.x + pad + i * (colW + gut);
  return { columns, cols, colW, lh, rtl, pad, gut, overflow, height, colX };
}

export function drawImageFit(x: CanvasRenderingContext2D, img: HTMLImageElement, it: Item) {
  const fit = it.fit || 'cover';
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (fit === 'fill' || !iw || !ih) {
    x.drawImage(img, it.x, it.y, it.w, it.h);
    return;
  }
  const s = fit === 'contain' ? Math.min(it.w / iw, it.h / ih) : Math.max(it.w / iw, it.h / ih);
  const dw = iw * s;
  const dh = ih * s;
  x.save();
  x.beginPath();
  x.rect(it.x, it.y, it.w, it.h);
  x.clip();
  x.drawImage(img, it.x + (it.w - dw) / 2, it.y + (it.h - dh) / 2, dw, dh);
  x.restore();
}
