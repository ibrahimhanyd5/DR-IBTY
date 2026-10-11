import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  stageRef: React.RefObject<HTMLDivElement | null>;
  percent: number;
  tick: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  isAr: boolean;
}

const btn: React.CSSProperties = {
  minHeight: 36,
  minWidth: 36,
  padding: 0,
  fontSize: 18,
  lineHeight: 1,
  borderRadius: 10,
  flex: 'none',
};

export function StagePanBars({ stageRef, percent, tick, onZoomOut, onZoomIn, onFit, isAr }: Props) {
  const [m, setM] = useState({ sl: 0, sw: 1, cw: 1, t: 0, sh: 1, ch: 1 });
  const hTrack = useRef<HTMLDivElement>(null);
  const vTrack = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const st = stageRef.current;
    if (!st) return;
    setM({ sl: st.scrollLeft, sw: st.scrollWidth, cw: st.clientWidth, t: st.scrollTop, sh: st.scrollHeight, ch: st.clientHeight });
  }, [stageRef]);

  useEffect(() => {
    const st = stageRef.current;
    if (!st) return;
    measure();
    st.addEventListener('scroll', measure, { passive: true });
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(st);
      if (st.firstElementChild) ro.observe(st.firstElementChild);
    }
    return () => {
      st.removeEventListener('scroll', measure);
      if (ro) ro.disconnect();
    };
  }, [stageRef, measure]);

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(measure));
    return () => cancelAnimationFrame(id);
  }, [tick, measure]);

  const startDrag = (e: React.PointerEvent, axis: 'x' | 'y') => {
    const st = stageRef.current;
    const tr = (axis === 'x' ? hTrack : vTrack).current;
    if (!st || !tr) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch (_) {}
    const start = axis === 'x' ? e.clientX : e.clientY;
    const s0 = axis === 'x' ? st.scrollLeft : st.scrollTop;
    const trackLen = Math.max(1, axis === 'x' ? tr.clientWidth : tr.clientHeight);
    const content = axis === 'x' ? st.scrollWidth : st.scrollHeight;
    const mv = (ev: PointerEvent) => {
      const d = ((axis === 'x' ? ev.clientX : ev.clientY) - start) * (content / trackLen);
      if (axis === 'x') st.scrollLeft = s0 + d;
      else st.scrollTop = s0 + d;
    };
    const up = () => {
      target.removeEventListener('pointermove', mv);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
    };
    target.addEventListener('pointermove', mv);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  };

  const trackClick = (e: React.PointerEvent, axis: 'x' | 'y') => {
    const st = stageRef.current;
    if (!st || e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (axis === 'x') {
      st.scrollTo({ left: ((e.clientX - r.left) / r.width) * st.scrollWidth - st.clientWidth / 2, behavior: 'smooth' });
    } else {
      st.scrollTo({ top: ((e.clientY - r.top) / r.height) * st.scrollHeight - st.clientHeight / 2, behavior: 'smooth' });
    }
  };

  const nudge = (dx: number, dy: number) => stageRef.current?.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
  const ovH = m.sw > m.cw + 1;
  const ovV = m.sh > m.ch + 1;
  const thumb: React.CSSProperties = {
    position: 'absolute',
    background: 'var(--ac)',
    borderRadius: 12,
    touchAction: 'none',
    cursor: 'grab',
    opacity: 0.9,
  };

  return (
    <>
      <div
        dir="ltr"
        className="absolute left-0 right-0 bottom-0 z-20 flex items-center gap-1.5 px-2"
        style={{ height: 46, background: 'var(--bar)', borderTop: '1px solid var(--bd)' }}
      >
        <button className="ps-btn" style={btn} onClick={onZoomOut} aria-label={isAr ? 'تصغير' : 'Zoom out'}>
          −
        </button>
        <button className="ps-btn text-xs" style={{ ...btn, minWidth: 50, fontSize: 12 }} onClick={onFit} aria-label={isAr ? 'ملاءمة الشاشة' : 'Fit'}>
          {percent}%
        </button>
        <button className="ps-btn" style={btn} onClick={onZoomIn} aria-label={isAr ? 'تكبير' : 'Zoom in'}>
          +
        </button>
        <span style={{ width: 1, height: 24, background: 'var(--bd)', flex: 'none' }} />
        <button className="ps-btn" style={{ ...btn, opacity: ovH ? 1 : 0.35 }} onClick={() => nudge(-180, 0)} aria-label={isAr ? 'يسار' : 'Left'}>
          ◀
        </button>
        <div
          ref={hTrack}
          onPointerDown={(e) => trackClick(e, 'x')}
          style={{ position: 'relative', flex: 1, height: 28, background: 'var(--row)', border: '1px solid var(--bd)', borderRadius: 14, touchAction: 'none' }}
        >
          {ovH && (
            <div
              onPointerDown={(e) => startDrag(e, 'x')}
              style={{ ...thumb, top: 2, bottom: 2, minWidth: 44, left: `${(m.sl / m.sw) * 100}%`, width: `${(m.cw / m.sw) * 100}%` }}
            />
          )}
        </div>
        <button className="ps-btn" style={{ ...btn, opacity: ovH ? 1 : 0.35 }} onClick={() => nudge(180, 0)} aria-label={isAr ? 'يمين' : 'Right'}>
          ▶
        </button>
      </div>

      {ovV && (
        <div dir="ltr" className="absolute z-20 flex flex-col items-center gap-1" style={{ left: 4, top: 8, bottom: 54, width: 30 }}>
          <button className="ps-btn" style={{ ...btn, minHeight: 30, minWidth: 30 }} onClick={() => nudge(0, -180)} aria-label={isAr ? 'أعلى' : 'Up'}>
            ▲
          </button>
          <div
            ref={vTrack}
            onPointerDown={(e) => trackClick(e, 'y')}
            style={{ position: 'relative', flex: 1, width: 24, background: 'var(--row)', border: '1px solid var(--bd)', borderRadius: 12, touchAction: 'none', opacity: 0.95 }}
          >
            <div
              onPointerDown={(e) => startDrag(e, 'y')}
              style={{ ...thumb, left: 2, right: 2, minHeight: 44, top: `${(m.t / m.sh) * 100}%`, height: `${(m.ch / m.sh) * 100}%` }}
            />
          </div>
          <button className="ps-btn" style={{ ...btn, minHeight: 30, minWidth: 30 }} onClick={() => nudge(0, 180)} aria-label={isAr ? 'أسفل' : 'Down'}>
            ▼
          </button>
        </div>
      )}
    </>
  );
}
