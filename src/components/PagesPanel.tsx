import React, { useState } from 'react';
import { DocData } from '../types/printStudio';
import { spreadCols, spreadPos, spreadRows } from '../services/layout';

type MKind = 'pageNumber' | 'header' | 'footer' | 'line';

interface Props {
  doc: DocData;
  view: { t: 'p' | 'm'; i: number; k?: 'A' | 'B' };
  isAr: boolean;
  onGo: (i: number) => void;
  onAdd: () => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;
  onMove: (i: number, d: -1 | 1) => void;
  onSetMaster: (i: number, m: string) => void;
  onApplyAll: (m: string) => void;
  onEditMaster: (k: 'A' | 'B') => void;
  onBackToPages: () => void;
  onAddMasterItem: (k: 'A' | 'B', kind: MKind) => void;
  thumb: (i: number, width: number) => React.ReactNode;
  masterThumb: (k: 'A' | 'B', width: number) => React.ReactNode;
}

const sm = 'ps-btn text-[11px] py-0.5 px-2 shrink-0';

export function PagesPanel(p: Props) {
  const { doc, view, isAr } = p;
  const n = doc.pages.length;
  const editing = view.t === 'm' ? view.k || 'A' : null;
  const cols = spreadCols(doc, n);
  const rows = spreadRows(doc, n);
  const tw = cols === 2 ? 104 : 150;
  const [quick, setQuick] = useState<'A' | 'B' | null>(null);

  const grid: (number | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (let i = 0; i < n; i++) {
    const { row, col } = spreadPos(doc, i, n);
    if (grid[row]) grid[row][col] = i;
  }
  const active = view.t === 'p' ? view.i : -1;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto gap-3 pb-6">
      {editing && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-[11px] leading-relaxed">
          <div className="font-bold mb-1">{isAr ? `أنت تعدّل ${editing}-Master` : `Editing ${editing}-Master`}</div>
          <div className="text-[var(--mut)] mb-2">
            {isAr ? 'كل ما تضعه هنا يظهر تلقائياً على كل الصفحات المرتبطة بهذا الماستر.' : 'Anything placed here appears on every page using this master.'}
          </div>
          <button className="ps-btn text-[11px] py-1 px-2.5" onClick={p.onBackToPages}>
            {isAr ? 'عودة إلى الصفحات' : 'Back to pages'}
          </button>
        </div>
      )}

      {/* Masters, shown separately on top */}
      <div className="font-bold text-xs">{isAr ? 'صفحات الماستر' : 'Master pages'}</div>
      <div className="grid grid-cols-2 gap-2">
        {(['A', 'B'] as const).map((k) => (
          <div key={k} className={`rounded-xl border p-2 flex flex-col gap-1.5 items-center ${editing === k ? 'border-[var(--ac)]' : 'border-[var(--bd)]'}`}>
            <div
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', 'master:' + k)}
              onClick={() => p.onEditMaster(k)}
              title={isAr ? 'اسحبه فوق صفحة لتطبيقه، أو اضغط لتعديله' : 'Drag onto a page to apply, click to edit'}
              style={{ cursor: 'grab', border: '1px solid var(--bd)', lineHeight: 0 }}
            >
              {p.masterThumb(k, 104)}
            </div>
            <div className="text-[11px] font-bold">{k}-Master</div>
            <div className="text-[10px] text-[var(--mut)]">
              {(doc.masters[k] || []).length} {isAr ? 'عنصر' : 'items'} · {doc.pages.filter((x) => x.m === k).length} {isAr ? 'صفحة' : 'pages'}
            </div>
            <div className="flex flex-wrap gap-1 justify-center">
              <button className="ps-btn ps-btn-primary text-[10px] py-0.5 px-2" onClick={() => p.onEditMaster(k)}>{isAr ? 'تعديل' : 'Edit'}</button>
              <button className="ps-btn text-[10px] py-0.5 px-2" onClick={() => p.onApplyAll(k)}>{isAr ? 'على الكل' : 'All pages'}</button>
              <button className="ps-btn text-[10px] py-0.5 px-2" onClick={() => setQuick(quick === k ? null : k)}>＋</button>
            </div>
          </div>
        ))}
      </div>
      {quick && (
        <div className="rounded-xl border border-[var(--bd)] p-2 flex flex-col gap-1.5">
          <div className="text-[10px] text-[var(--mut)]">{isAr ? `إضافة سريعة إلى ${quick}-Master:` : `Quick add to ${quick}-Master:`}</div>
          <div className="flex flex-wrap gap-1.5">
            <button className={sm} onClick={() => p.onAddMasterItem(quick, 'pageNumber')}>{isAr ? 'رقم الصفحة' : 'Page #'}</button>
            <button className={sm} onClick={() => p.onAddMasterItem(quick, 'header')}>{isAr ? 'رأس الصفحة' : 'Header'}</button>
            <button className={sm} onClick={() => p.onAddMasterItem(quick, 'footer')}>{isAr ? 'ذيل الصفحة' : 'Footer'}</button>
            <button className={sm} onClick={() => p.onAddMasterItem(quick, 'line')}>{isAr ? 'خط فاصل' : 'Rule'}</button>
          </div>
        </div>
      )}

      {/* Pages as miniature spreads */}
      <div className="flex items-center justify-between mt-1">
        <span className="font-bold text-xs">{isAr ? `الصفحات (${n})` : `Pages (${n})`}</span>
        <button className="ps-btn ps-btn-primary text-[11px] py-1 px-2.5" onClick={p.onAdd}>+ {isAr ? 'صفحة' : 'Page'}</button>
      </div>
      <div className="flex flex-col gap-2.5 items-center" data-pages-grid dir="ltr">
        {grid.map((row, r) => (
          <div key={r} className="flex" style={{ gap: cols === 2 ? 0 : 8, justifyContent: 'center' }}>
            {row.map((idx, c) =>
              idx === null ? (
                <div key={c} style={{ width: tw }} />
              ) : (
                <div
                  key={c}
                  data-page-thumb={idx}
                  onClick={() => p.onGo(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const d = e.dataTransfer.getData('text/plain');
                    if (d.startsWith('master:')) p.onSetMaster(idx, d.slice(7));
                  }}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    lineHeight: 0,
                    outline: active === idx ? '2px solid var(--ac)' : '1px solid var(--bd)',
                    outlineOffset: active === idx ? 1 : 0,
                    borderInlineStart: cols === 2 && c === 1 ? '1px solid var(--bd)' : undefined,
                  }}
                >
                  {p.thumb(idx, tw)}
                  <div
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontSize: 10, lineHeight: '14px', background: active === idx ? 'var(--ac)' : 'rgba(0,0,0,.55)', color: active === idx ? 'var(--acf)' : '#fff' }}
                  >
                    {idx + 1}
                    {doc.pages[idx].m ? ` · ${doc.pages[idx].m}` : ''}
                  </div>
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {active >= 0 && (
        <div className="rounded-xl border border-[var(--bd)] p-2 flex flex-col gap-2">
          <div className="text-[11px] font-bold">{isAr ? `الصفحة ${active + 1}` : `Page ${active + 1}`}</div>
          <div className="flex gap-1.5 flex-wrap">
            <button className={sm} disabled={active === 0} onClick={() => p.onMove(active, -1)} title={isAr ? 'تقديم' : 'Move up'}>▲</button>
            <button className={sm} disabled={active === n - 1} onClick={() => p.onMove(active, 1)} title={isAr ? 'تأخير' : 'Move down'}>▼</button>
            <button className={sm} onClick={() => p.onDuplicate(active)} title={isAr ? 'تكرار' : 'Duplicate'}>⧉</button>
            <button className={sm} disabled={n < 2} onClick={() => p.onDelete(active)} title={isAr ? 'حذف' : 'Delete'}>🗑</button>
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-[var(--mut)]">
            <span>{isAr ? 'الماستر:' : 'Master:'}</span>
            <select className="ps-select text-[11px] py-0.5 px-1.5 flex-1" style={{ minHeight: 30 }} value={doc.pages[active].m || ''} onChange={(e) => p.onSetMaster(active, e.target.value)}>
              <option value="">{isAr ? 'بدون' : 'None'}</option>
              <option value="A">A-Master</option>
              <option value="B">B-Master</option>
            </select>
          </label>
        </div>
      )}
      <div className="text-[10px] text-[var(--mut)] leading-relaxed">
        {isAr ? 'اضغط على مصغّرة لفتح الصفحة، واسحب ماستر فوق صفحة لتطبيقه عليها.' : 'Click a thumbnail to open the page; drag a master onto a page to apply it.'}
      </div>
    </div>
  );
}
