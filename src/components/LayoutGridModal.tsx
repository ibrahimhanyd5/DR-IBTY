/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BleedFields } from './BleedFields';
import { BleedMM } from '../services/layout';
import React, { useState } from 'react';
import { DocData } from '../types/printStudio';

interface LayoutGridModalProps {
  doc: DocData;
  onUpdate: (updated: Partial<DocData>) => void;
  onClose: () => void;
  isAr: boolean;
}

export function LayoutGridModal({ doc, onUpdate, onClose, isAr }: LayoutGridModalProps) {
  const [columns, setColumns] = useState(doc.columns ?? 3);
  const [gutter, setGutter] = useState(doc.gutter ?? 4);
  const [showGrid, setShowGrid] = useState(doc.showGrid ?? true);
  const [marginTop, setMarginTop] = useState(doc.margins?.top ?? 12);
  const [marginBottom, setMarginBottom] = useState(doc.margins?.bottom ?? 12);
  const [marginInside, setMarginInside] = useState(doc.margins?.inside ?? 15);
  const [marginOutside, setMarginOutside] = useState(doc.margins?.outside ?? 12);
  const [linkMargins, setLinkMargins] = useState(false);
  const [bleeds, setBleeds] = useState<BleedMM>(doc.bleeds || { top: doc.bleed ?? 3, bottom: doc.bleed ?? 3, inside: doc.facingPages ? 0 : doc.bleed ?? 3, outside: doc.bleed ?? 3 });

  const updateAllMargins = (val: number) => {
    setMarginTop(val);
    setMarginBottom(val);
    setMarginInside(val);
    setMarginOutside(val);
  };

  const handleApply = () => {
    onUpdate({
      columns: Math.max(1, columns),
      gutter: Math.max(0, gutter),
      showGrid,
      bleeds,
      bleed: Math.max(bleeds.top, bleeds.bottom, bleeds.inside, bleeds.outside),
      margins: {
        top: Math.max(0, marginTop),
        bottom: Math.max(0, marginBottom),
        inside: Math.max(0, marginInside),
        outside: Math.max(0, marginOutside),
      },
    });
    onClose();
  };

  return (
    <div
      className="sheet-backdrop z-50 flex items-center justify-center p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--bar)] border border-[var(--bd)] shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--bd)] font-bold text-base">
          <div className="flex items-center gap-2">
            <span className="text-lg">📐</span>
            <span>{isAr ? 'إعدادات تخطيط الصفحة والأعمدة (InDesign Grid)' : 'Page Layout & Column Grid'}</span>
          </div>
          <button onClick={onClose} className="text-xs text-[var(--mut)] hover:text-[var(--fg)] p-1">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Grid Visibility Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--row)] border border-[var(--bd)]">
            <div>
              <div className="font-bold text-xs text-[var(--fg)]">
                {isAr ? 'إظهار خطوط شبكة الأعمدة والهوامش' : 'Show Column & Margin Guides'}
              </div>
              <div className="text-[11px] text-[var(--mut)]">
                {isAr ? 'خطوط إرشادية بصرية دقيقة تساعد في محاذاة مربعات النصوص والصور' : 'Visual guides for aligning frames'}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--ac)]"></div>
            </label>
          </div>

          {/* Columns & Gutter */}
          <div className="p-3.5 rounded-xl bg-[var(--row)] border border-[var(--bd)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--fg)] flex items-center gap-1.5">
                <span>▥</span>
                <span>{isAr ? 'أعمدة الصفحة وفاصل Gutter' : 'Columns & Gutter'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--mut)] block mb-1">
                  {isAr ? 'عدد الأعمدة:' : 'Column Count:'}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={columns}
                    onChange={(e) => setColumns(Math.max(1, Math.min(12, +e.target.value)))}
                    className="ps-input w-20 text-xs font-bold text-center"
                  />
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 6].map((colNum) => (
                      <button
                        key={colNum}
                        type="button"
                        onClick={() => setColumns(colNum)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          columns === colNum
                            ? 'bg-[var(--ac)] text-[var(--acf)] font-bold'
                            : 'bg-[var(--bar)] hover:bg-[var(--bd)] text-[var(--fg)]'
                        }`}
                      >
                        {colNum}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--mut)] block mb-1">
                  {isAr ? 'فاصل الأعمدة (Gutter):' : 'Gutter Spacing:'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    value={gutter}
                    onChange={(e) => setGutter(Math.max(0, +e.target.value))}
                    className="ps-input w-24 text-xs font-bold text-center"
                  />
                  <span className="text-xs text-[var(--mut)]">{isAr ? 'مليمتر (مم)' : 'mm'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Margins */}
          <div className="p-3.5 rounded-xl bg-[var(--row)] border border-[var(--bd)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--fg)] flex items-center gap-1.5">
                <span>📐</span>
                <span>{isAr ? 'هوامش الصفحة (Margins):' : 'Margins:'}</span>
              </span>
              <button
                type="button"
                onClick={() => setLinkMargins(!linkMargins)}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                  linkMargins
                    ? 'bg-[var(--ac)] text-[var(--acf)] border-[var(--ac)] font-bold'
                    : 'bg-[var(--bar)] text-[var(--mut)] border-[var(--bd)]'
                }`}
              >
                {linkMargins ? (isAr ? '🔗 الهوامش مربوطة' : '🔗 Linked') : (isAr ? '🔓 فك الربط' : '🔓 Unlinked')}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[11px] text-[var(--mut)] block mb-1">{isAr ? 'علوي (Top):' : 'Top:'}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={marginTop}
                    onChange={(e) => {
                      const v = +e.target.value;
                      if (linkMargins) updateAllMargins(v);
                      else setMarginTop(v);
                    }}
                    className="ps-input w-full text-xs font-semibold text-center"
                  />
                  <span className="text-[10px] text-[var(--mut)]">مم</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[var(--mut)] block mb-1">{isAr ? 'سفلي (Bottom):' : 'Bottom:'}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={marginBottom}
                    onChange={(e) => {
                      const v = +e.target.value;
                      if (linkMargins) updateAllMargins(v);
                      else setMarginBottom(v);
                    }}
                    className="ps-input w-full text-xs font-semibold text-center"
                  />
                  <span className="text-[10px] text-[var(--mut)]">مم</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[var(--mut)] block mb-1">{isAr ? 'داخلي (Inside):' : 'Inside:'}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={marginInside}
                    onChange={(e) => {
                      const v = +e.target.value;
                      if (linkMargins) updateAllMargins(v);
                      else setMarginInside(v);
                    }}
                    className="ps-input w-full text-xs font-semibold text-center"
                  />
                  <span className="text-[10px] text-[var(--mut)]">مم</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[var(--mut)] block mb-1">{isAr ? 'خارجي (Outside):' : 'Outside:'}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={marginOutside}
                    onChange={(e) => {
                      const v = +e.target.value;
                      if (linkMargins) updateAllMargins(v);
                      else setMarginOutside(v);
                    }}
                    className="ps-input w-full text-xs font-semibold text-center"
                  />
                  <span className="text-[10px] text-[var(--mut)]">مم</span>
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 pb-4">
            <BleedFields value={bleeds} onChange={setBleeds} facing={doc.facingPages} isAr={isAr} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--bd)] bg-[var(--row)] flex items-center justify-end gap-2">
          <button className="ps-btn text-xs py-1.5 px-3" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button className="ps-btn ps-btn-primary text-xs py-1.5 px-5 font-bold" onClick={handleApply}>
            {isAr ? 'تطبيق التخطيط والهوامش ✔' : 'Apply Layout ✔'}
          </button>
        </div>
      </div>
    </div>
  );
}
