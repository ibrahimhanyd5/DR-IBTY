import { DocData } from '../types/printStudio';

export const MMPT = 2.8346;
export type Side = 'left' | 'right' | 'single';
export interface BL { l: number; t: number; r: number; b: number } // points
export interface BleedMM { top: number; bottom: number; inside: number; outside: number }

/** Which side of a spread the page sits on (facing pages). */
export function pageSide(doc: DocData, i: number): Side {
  if (!doc.facingPages) return 'single';
  const rtl = doc.binding === 'rtl';
  const odd = (i + 1) % 2 === 1;
  return rtl ? (odd ? 'left' : 'right') : odd ? 'right' : 'left';
}

export function spreadCols(doc: DocData, n: number): 1 | 2 {
  return doc.facingPages && n > 1 ? 2 : 1;
}

/** Row / column of a page in the stacked spread view (first page alone, inner pages paired). */
export function spreadPos(doc: DocData, i: number, n: number): { row: number; col: number } {
  if (spreadCols(doc, n) === 1) return { row: i, col: 0 };
  const side = pageSide(doc, i);
  const row = i === 0 ? 0 : 1 + Math.floor((i - 1) / 2);
  return { row, col: side === 'left' ? 0 : 1 };
}

export function spreadRows(doc: DocData, n: number): number {
  return spreadCols(doc, n) === 1 ? n : 1 + Math.ceil((n - 1) / 2);
}

export function bleedMM(doc: DocData): BleedMM {
  if (doc.bleeds) return doc.bleeds;
  const b = doc.bleed || 0;
  return { top: b, bottom: b, inside: doc.facingPages ? 0 : b, outside: b };
}

export function hasBleed(doc: DocData): boolean {
  const b = bleedMM(doc);
  return b.top > 0 || b.bottom > 0 || b.inside > 0 || b.outside > 0;
}

/** Bleed box of one page in points. mode 'doc' = use the document settings, number = uniform mm. */
export function bleedBox(doc: DocData, i: number, mode: 'doc' | number): BL {
  if (typeof mode === 'number') {
    const v = mode * MMPT;
    return { l: v, t: v, r: v, b: v };
  }
  const b = bleedMM(doc);
  const side = pageSide(doc, i);
  const out = b.outside * MMPT;
  const ins = b.inside * MMPT;
  if (side === 'left') return { l: out, t: b.top * MMPT, r: ins, b: b.bottom * MMPT };
  if (side === 'right') return { l: ins, t: b.top * MMPT, r: out, b: b.bottom * MMPT };
  return { l: out, t: b.top * MMPT, r: out, b: b.bottom * MMPT };
}

/** Margins (points) of a page, mirrored for left/right pages of a spread. */
export function marginsFor(doc: DocData, i: number) {
  const m = doc.margins || { top: 12, bottom: 12, inside: 15, outside: 12 };
  const top = (m.top ?? 12) * MMPT;
  const bottom = (m.bottom ?? 12) * MMPT;
  const ins = (m.inside ?? 15) * MMPT;
  const out = (m.outside ?? 12) * MMPT;
  const side = pageSide(doc, i);
  if (side === 'left') return { top, bottom, left: out, right: ins };
  if (side === 'right') return { top, bottom, left: ins, right: out };
  const rtl = doc.binding === 'rtl';
  return { top, bottom, left: rtl ? out : ins, right: rtl ? ins : out };
}
