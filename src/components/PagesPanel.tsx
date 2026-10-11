import React from 'react';
import { DocData } from '../types/printStudio';

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
}

const sm = 'ps-btn text-[11px] py-0.5 px-2 shrink-0';

export function PagesPanel(p: Props) {
  const { doc, view, isAr } = p;
  const editing = view.t === 'm' ? view.k || 'A' : null;
  return (
    <div className="flex-1 flex flex-col overflow-y-auto gap-3 pb-6">
      <div className="flex items-center justify-between">
        <span className="font-bold text-xs">{isAr ? `الصفحات (${doc.pages.length})` : `Pages (${doc.pages.length})`}</span>
        <button className="ps-btn ps-btn-primary text-[11px] py-1 px-2.5" onClick={p.onAdd}>
          + {isAr ? 'صفحة' : 'Page'}
        </button>
      </div>

      {editing && (
        <div className="p-2.5 rounded-xl bg-[var(--bg-warn,rgba(245,158,11,0.15))] border border-amber-500/40 text-[11px] leading-relaxed">
          <div className="font-bold mb-1">
            {isAr ? `أنت تعدّل ${editing}-Master` : `Editing ${editing}-Master`}
          </div>
          <div className="text-[var(--mut)] mb-2">
            {isAr ? 'كل ما تضعه هنا يظهر تلقائياً على كل الصفحات المرتبطة بهذا الماستر.' : 'Anything placed here appears on every page using this master.'}
          </div>
          <button className="ps-btn text-[11px] py-1 px-2.5" onClick={p.onBackToPages}>
            {isAr ? 'عودة إلى الصفحات' : 'Back to pages'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {doc.pages.map((pg, i) => {
          const active = view.t === 'p' && view.i === i;
          return (
            <div
              key={pg.id || i}
              className={`rounded-xl border px-2 py-1.5 flex flex-col gap-1.5 ${active ? 'border-[var(--ac)] bg-[var(--row)]' : 'border-[var(--bd)]'}`}
            >
              <div className="flex items-center gap-1.5">
                <button className="flex-1 text-start text-xs font-bold" onClick={() => p.onGo(i)}>
                  {isAr ? `صفحة ${i + 1}` : `Page ${i + 1}`}
                  <span className="text-[10px] font-normal text-[var(--mut)]"> · {pg.items.length} {isAr ? 'عنصر' : 'items'}</span>
                </button>
                <button className={sm} disabled={i === 0} onClick={() => p.onMove(i, -1)} title={isAr ? 'تقديم' : 'Move up'}>▲</button>
                <button className={sm} disabled={i === doc.pages.length - 1} onClick={() => p.onMove(i, 1)} title={isAr ? 'تأخير' : 'Move down'}>▼</button>
                <button className={sm} onClick={() => p.onDuplicate(i)} title={isAr ? 'تكرار' : 'Duplicate'}>⧉</button>
                <button className={sm} disabled={doc.pages.length < 2} onClick={() => p.onDelete(i)} title={isAr ? 'حذف' : 'Delete'}>🗑</button>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-[var(--mut)]">
                <span>{isAr ? 'الماستر:' : 'Master:'}</span>
                <select
                  className="ps-select text-[11px] py-0.5 px-1.5 flex-1"
                  style={{ minHeight: 30 }}
                  value={pg.m || ''}
                  onChange={(e) => p.onSetMaster(i, e.target.value)}
                >
                  <option value="">{isAr ? 'بدون' : 'None'}</option>
                  <option value="A">A-Master</option>
                  <option value="B">B-Master</option>
                </select>
              </label>
            </div>
          );
        })}
      </div>

      <div className="font-bold text-xs mt-1">{isAr ? 'صفحات الماستر' : 'Master pages'}</div>
      {(['A', 'B'] as const).map((k) => (
        <div key={k} className={`rounded-xl border p-2.5 flex flex-col gap-2 ${editing === k ? 'border-[var(--ac)]' : 'border-[var(--bd)]'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">{k}-Master</span>
            <span className="text-[10px] text-[var(--mut)]">
              {(doc.masters[k] || []).length} {isAr ? 'عنصر' : 'items'} · {doc.pages.filter((x) => x.m === k).length} {isAr ? 'صفحة' : 'pages'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button className="ps-btn ps-btn-primary text-[11px] py-1 px-2.5" onClick={() => p.onEditMaster(k)}>
              {isAr ? 'تعديل الماستر' : 'Edit master'}
            </button>
            <button className="ps-btn text-[11px] py-1 px-2.5" onClick={() => p.onApplyAll(k)}>
              {isAr ? 'تطبيقه على كل الصفحات' : 'Apply to all pages'}
            </button>
          </div>
          <div className="text-[10px] text-[var(--mut)]">{isAr ? 'إضافة سريعة إلى الماستر:' : 'Quick add to master:'}</div>
          <div className="flex flex-wrap gap-1.5">
            <button className={sm} onClick={() => p.onAddMasterItem(k, 'pageNumber')}>{isAr ? 'رقم الصفحة' : 'Page #'}</button>
            <button className={sm} onClick={() => p.onAddMasterItem(k, 'header')}>{isAr ? 'رأس الصفحة' : 'Header'}</button>
            <button className={sm} onClick={() => p.onAddMasterItem(k, 'footer')}>{isAr ? 'ذيل الصفحة' : 'Footer'}</button>
            <button className={sm} onClick={() => p.onAddMasterItem(k, 'line')}>{isAr ? 'خط فاصل' : 'Rule'}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
