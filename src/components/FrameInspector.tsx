import React, { useEffect, useState } from 'react';
import { Item } from '../types/printStudio';

const MM = 2.8346;

function NumField({
  label,
  value,
  onCommit,
  min,
  step = 0.5,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  step?: number;
}) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const commit = () => {
    const n = parseFloat(v.replace(',', '.'));
    if (!isFinite(n)) {
      setV(String(value));
      return;
    }
    const c = min !== undefined ? Math.max(min, n) : n;
    if (Math.abs(c - value) > 0.001) onCommit(c);
    else setV(String(value));
  };
  return (
    <label className="flex items-center gap-1 shrink-0 text-[11px] text-[var(--mut)]">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="ps-input w-16 text-xs py-0.5 px-1.5"
        style={{ minHeight: 34 }}
      />
    </label>
  );
}

export function FrameInspector({
  item,
  isAr,
  onChange,
}: {
  item: Item;
  isAr: boolean;
  onChange: (patch: Partial<Item>) => void;
}) {
  const mm = (pt: number) => +(pt / MM).toFixed(1);
  const isText = item.type === 'text';
  const isImg = item.type === 'img';
  return (
    <div className="ps-bar border-t border-[var(--bd)] bg-[var(--bar)] py-1.5 px-3 z-30" style={{ flexWrap: 'wrap', overflowX: 'visible', maxHeight: '40vh', overflowY: 'auto' }}>
      <span className="text-[11px] font-bold shrink-0">📐 {isAr ? 'المساحة (مم)' : 'Frame (mm)'}</span>
      <NumField label="X" value={mm(item.x)} onCommit={(n) => onChange({ x: n * MM })} />
      <NumField label="Y" value={mm(item.y)} onCommit={(n) => onChange({ y: n * MM })} />
      <NumField label={isAr ? 'العرض' : 'W'} value={mm(item.w)} min={5} onCommit={(n) => onChange({ w: n * MM })} />
      <NumField label={isAr ? 'الارتفاع' : 'H'} value={mm(item.h)} min={5} onCommit={(n) => onChange({ h: n * MM })} />
      {isText && (
        <>
          <span className="w-full h-0" />
          <button
            className="ps-btn text-xs py-1 px-3 bg-[var(--row)] shrink-0"
            style={{ minHeight: 34 }}
            onClick={() =>
              onChange({
                text: 'هذا نص تجريبي طويل لتجربة تقسيم مربع النص إلى أعمدة. يمكنك تغيير عدد الأعمدة والمسافة بينها من الخيارات المجاورة، ثم استبدال هذا النص بنصك الخاص. كلما زاد طول النص ظهرت الأعمدة بشكل أوضح، ويتدفق الكلام من عمود إلى الذي يليه كما في المجلات والصحف.',
              })
            }
          >
            {isAr ? 'نص تجريبي طويل' : 'Sample text'}
          </button>
          <label className="flex items-center gap-1 shrink-0 text-[11px] text-[var(--mut)]">
            <span>{isAr ? 'الأعمدة' : 'Columns'}</span>
            <select
              className="ps-select text-xs py-0.5 px-2"
              style={{ minHeight: 34 }}
              value={item.cols || 1}
              onChange={(e) => onChange({ cols: +e.target.value })}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <NumField
            label={isAr ? 'المسافة بين الأعمدة' : 'Gutter'}
            value={mm(item.gut ?? 10)}
            min={0}
            onCommit={(n) => onChange({ gut: n * MM })}
          />
          <NumField
            label={isAr ? 'هامش داخلي' : 'Padding'}
            value={mm(item.pad || 0)}
            min={0}
            onCommit={(n) => onChange({ pad: n * MM })}
          />
          <label className="flex items-center gap-1.5 shrink-0 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={!!item.fixedH}
              onChange={(e) => onChange({ fixedH: e.target.checked })}
              className="w-4 h-4"
            />
            <span>{isAr ? 'ثبّت المساحة (النص يتدفق بين الأعمدة)' : 'Fixed area'}</span>
          </label>
        </>
      )}
      {isImg && (
        <>
          <span className="sep" />
          <label className="flex items-center gap-1 shrink-0 text-[11px] text-[var(--mut)]">
            <span>{isAr ? 'ملاءمة الصورة' : 'Image fit'}</span>
            <select
              className="ps-select text-xs py-0.5 px-2"
              style={{ minHeight: 34 }}
              value={item.fit || 'cover'}
              onChange={(e) => onChange({ fit: e.target.value as Item['fit'] })}
            >
              <option value="cover">{isAr ? 'تغطية (قص)' : 'Cover'}</option>
              <option value="contain">{isAr ? 'احتواء كامل' : 'Contain'}</option>
              <option value="fill">{isAr ? 'تمديد' : 'Stretch'}</option>
            </select>
          </label>
        </>
      )}
    </div>
  );
}
