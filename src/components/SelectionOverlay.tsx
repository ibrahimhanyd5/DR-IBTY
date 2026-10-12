import React, { useEffect, useState } from 'react';
import { Item } from '../types/printStudio';

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface Props {
  item: Item;
  scale: number;
  pageLeft: number; // active page offset inside the wrapper (px)
  pageTop: number;
  stageEl: HTMLDivElement | null;
  wrapEl: HTMLDivElement | null;
  onStart: (h: Handle, e: React.PointerEvent) => void;
}

const CURSORS: Record<Handle, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };

/**
 * Selection frame + 8 resize handles drawn above the scrolling stage (not clipped by the page),
 * so the frame stays visible and every handle stays reachable even when the item is larger than the work area.
 */
export function SelectionOverlay({ item, scale, pageLeft, pageTop, stageEl, wrapEl, onStart }: Props) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!stageEl) return;
    const f = () => force((n) => n + 1);
    stageEl.addEventListener('scroll', f, { passive: true });
    window.addEventListener('resize', f);
    return () => {
      stageEl.removeEventListener('scroll', f);
      window.removeEventListener('resize', f);
    };
  }, [stageEl]);
  if (!stageEl || !wrapEl) return null;

  const sr = stageEl.getBoundingClientRect();
  const wr = wrapEl.getBoundingClientRect();
  const cw = stageEl.clientWidth;
  const ch = stageEl.clientHeight;
  const L = wr.left + pageLeft + item.x * scale - sr.left - stageEl.clientLeft;
  const T = wr.top + pageTop + item.y * scale - sr.top - stageEl.clientTop;
  const W = item.w * scale;
  const H = item.h * scale;
  const coarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const S = coarse ? 26 : 14;
  const autoH = item.type === 'text' && !item.fixedH;
  const big = W > 70 && H > 70;
  const pos: Record<Handle, [number, number]> = {
    nw: [L, T], n: [L + W / 2, T], ne: [L + W, T], e: [L + W, T + H / 2],
    se: [L + W, T + H], s: [L + W / 2, T + H], sw: [L, T + H], w: [L, T + H / 2],
  };
  let list: Handle[] = ['nw', 'ne', 'se', 'sw'];
  if (big) list = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  if (autoH) list = ['e', 'w'];
  const cx = (v: number) => Math.min(Math.max(v, 44), Math.max(60, cw - 14));
  const cy = (v: number) => Math.min(Math.max(v, 12), Math.max(40, ch - 58));
  const locked = !!item.locked;

  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', left: stageEl.offsetLeft + stageEl.clientLeft, top: stageEl.offsetTop + stageEl.clientTop, width: cw, height: ch, overflow: 'hidden', pointerEvents: 'none', zIndex: 15 }}
    >
      <div
        style={{ position: 'absolute', left: L, top: T, width: W, height: H, boxSizing: 'border-box', border: '1.5px solid var(--sel)', pointerEvents: 'none' }}
        data-sel-frame
      />
      {!locked &&
        list.map((h) => (
          <div
            key={h}
            data-handle={h}
            onPointerDown={(e) => onStart(h, e)}
            style={{
              position: 'absolute',
              left: cx(pos[h][0]) - S / 2,
              top: cy(pos[h][1]) - S / 2,
              width: S,
              height: S,
              boxSizing: 'border-box',
              background: '#fff',
              border: '2px solid var(--sel)',
              borderRadius: h.length === 2 ? 4 : 3,
              cursor: CURSORS[h],
              pointerEvents: 'auto',
              touchAction: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,.35)',
            }}
          />
        ))}
    </div>
  );
}
