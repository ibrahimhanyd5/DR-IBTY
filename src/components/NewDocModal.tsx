/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BleedFields } from './BleedFields';
import { BleedMM } from '../services/layout';
import React, { useState } from 'react';
import { DocData, DocSettings, DocumentIntent, ColorMode, BindingDirection } from '../types/printStudio';

const MM = 2.8346;

interface NewDocModalProps {
  onConfirm: (doc: DocData) => void;
  onCancel: () => void;
}

const PRESETS = [
  { name: 'مجلة A4 كاملة', w: 595.3, h: 841.9, size: 'A4', intent: 'print' as const, facing: true, bleed: 3 },
  { name: 'صحيفة وجريدة يومية', w: 841.9, h: 1190.6, size: 'Poster', intent: 'print' as const, facing: true, bleed: 5 },
  { name: 'بطاقة عمل وهوية', w: 255.1, h: 141.7, size: 'Card', intent: 'print' as const, facing: false, bleed: 2 },
  { name: 'فلاير إعلاني', w: 280.6, h: 595.3, size: 'Flyer', intent: 'print' as const, facing: false, bleed: 3 },
  { name: 'منشور سوشيال ميديا (1:1)', w: 600, h: 600, size: 'Post', intent: 'web' as const, facing: false, bleed: 0 },
];

export function NewDocModal({ onConfirm, onCancel }: NewDocModalProps) {
  const [name, setName] = useState('مستند جديد');
  const [pagesCount, setPagesCount] = useState(4);
  const [facingPages, setFacingPages] = useState(true);
  const [binding, setBinding] = useState<BindingDirection>('rtl');
  const [intent, setIntent] = useState<DocumentIntent>('print');
  const [colorMode, setColorMode] = useState<ColorMode>('CMYK');
  const [bleeds, setBleeds] = useState<BleedMM>({ top: 3, bottom: 3, inside: 0, outside: 3 });
  const [sizeKey, setSizeKey] = useState('A4');
  const [w, setW] = useState(595.3);
  const [h, setH] = useState(841.9);

  // Columns & Gutter State
  const [columns, setColumns] = useState(3);
  const [gutter, setGutter] = useState(4); // in mm

  // Margins State (in mm)
  const [marginTop, setMarginTop] = useState(12);
  const [marginBottom, setMarginBottom] = useState(12);
  const [marginInside, setMarginInside] = useState(15);
  const [marginOutside, setMarginOutside] = useState(12);
  const [linkMargins, setLinkMargins] = useState(false);

  const updateAllMargins = (val: number) => {
    setMarginTop(val);
    setMarginBottom(val);
    setMarginInside(val);
    setMarginOutside(val);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSizeKey(preset.size);
    setW(preset.w);
    setH(preset.h);
    setIntent(preset.intent);
    setFacingPages(preset.facing);
    setBleeds({ top: preset.bleed, bottom: preset.bleed, inside: preset.facing ? 0 : preset.bleed, outside: preset.bleed });
    if (preset.size === 'Poster') {
      setColumns(4);
      setGutter(5);
    } else if (preset.size === 'A4') {
      setColumns(3);
      setGutter(4);
    } else if (preset.size === 'Card') {
      setColumns(1);
      setGutter(0);
    } else {
      setColumns(2);
      setGutter(4);
    }
    if (preset.intent === 'print') setColorMode('CMYK');
    else setColorMode('RGB');
  };

  const handleCreate = () => {
    const pages = Array.from({ length: Math.max(1, pagesCount) }, (_, i) => ({
      id: `p-${i + 1}-${Date.now()}`,
      m: '',
      items: [],
    }));

    const newDoc: DocData = {
      name,
      w,
      h,
      size: sizeKey,
      intent,
      colorMode,
      facingPages,
      binding,
      bleed: Math.max(bleeds.top, bleeds.bottom, bleeds.inside, bleeds.outside),
      bleeds,
      margins: {
        top: Math.max(0, marginTop),
        bottom: Math.max(0, marginBottom),
        inside: Math.max(0, marginInside),
        outside: Math.max(0, marginOutside),
      },
      columns: Math.max(1, columns),
      gutter: Math.max(0, gutter),
      showGrid: true,
      pages,
      masters: { A: [], B: [] },
    };

    onConfirm(newDoc);
  };

  return (
    <div className="sheet-backdrop z-50 flex items-center justify-center p-3">
      <div className="bg-[var(--bar)] border border-[var(--bd)] shadow-2xl rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--bd)] font-bold text-base">
          <div className="flex items-center gap-2">
            <span>📄</span>
            <span>إنشاء مستند جديد (New Document Setup)</span>
          </div>
          <button onClick={onCancel} className="text-xs text-[var(--mut)] hover:text-[var(--fg)] p-1">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="text-xs font-semibold text-[var(--mut)] block mb-1.5">
              قوالب المقاسات السريعة:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`p-2 rounded-xl text-xs text-right border transition-all ${
                    sizeKey === p.size && w === p.w
                      ? 'border-[var(--ac)] bg-[var(--row)] text-[var(--fg)] font-bold'
                      : 'border-[var(--bd)] hover:bg-[var(--row)] text-[var(--mut)]'
                  }`}
                >
                  <div className="truncate">{p.name}</div>
                  <div className="text-[10px] text-[var(--mut)] opacity-75">{p.size} · {p.intent === 'print' ? 'طباعة' : 'ويب'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Document Name */}
          <div>
            <label className="text-xs font-semibold text-[var(--mut)] block mb-1">اسم المستند:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ps-input w-full text-xs"
              placeholder="مثال: غلاف مجلة العدد الأول..."
            />
          </div>

          {/* Grid Layout: Pages & Spreads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--mut)] block mb-1">عدد الصفحات:</label>
              <input
                type="number"
                min="1"
                max="100"
                value={pagesCount}
                onChange={(e) => setPagesCount(Math.max(1, +e.target.value))}
                className="ps-input w-full text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--mut)] block mb-1">تخطيط الصفحات:</label>
              <select
                value={facingPages ? 'facing' : 'single'}
                onChange={(e) => setFacingPages(e.target.value === 'facing')}
                className="ps-select w-full text-xs bg-[var(--row)]"
              >
                <option value="facing">صفحات متقابلة (كتاب / مجلة)</option>
                <option value="single">صفحات مفردة (فلاير / بوستر)</option>
              </select>
            </div>
          </div>

          {/* Binding Direction & Color Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--mut)] block mb-1">اتجاه القراءة والفتح:</label>
              <select
                value={binding}
                onChange={(e) => setBinding(e.target.value as BindingDirection)}
                className="ps-select w-full text-xs bg-[var(--row)]"
              >
                <option value="rtl">من اليمين إلى اليسار (عربي - RTL)</option>
                <option value="ltr">من اليسار إلى اليمين (إنجليزي - LTR)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--mut)] block mb-1">نظام الألوان:</label>
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as ColorMode)}
                className="ps-select w-full text-xs bg-[var(--row)]"
              >
                <option value="CMYK">CMYK (للمطابع التجارية وفرز الألوان)</option>
                <option value="RGB">RGB (للشاشات الرقمية والمواقع)</option>
              </select>
            </div>
          </div>

          {/* Bleed & Purpose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--mut)] block mb-1">الغرض النهائي:</label>
              <select
                value={intent}
                onChange={(e) => setIntent(e.target.value as DocumentIntent)}
                className="ps-select w-full text-xs bg-[var(--row)]"
              >
                <option value="print">طباعة ورقية ومطبوعات (300 DPI)</option>
                <option value="web">عرض رقمي وويب (72/96 DPI)</option>
              </select>
            </div>
          </div>

          <BleedFields value={bleeds} onChange={setBleeds} facing={facingPages} isAr />

          {/* Columns & Gutter Setup (تقسيم الصفحة إلى أعمدة وفواصل) */}
          <div className="p-3.5 rounded-xl bg-[var(--row)] border border-[var(--bd)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--fg)] flex items-center gap-1.5">
                <span>▥</span>
                <span>شبكة الأعمدة والفواصل (Columns & Gutter Grid)</span>
              </span>
              <span className="text-[10px] text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full font-bold">
                نظام InDesign
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--mut)] block mb-1">
                  عدد الأعمدة (Columns):
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
                    {[1, 2, 3, 4].map((colNum) => (
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
                  فاصل الأعمدة (Gutter):
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
                  <span className="text-xs text-[var(--mut)]">مليمتر (مم)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Margins Setup (تحديد الهوامش الأربعة) */}
          <div className="p-3.5 rounded-xl bg-[var(--row)] border border-[var(--bd)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--fg)] flex items-center gap-1.5">
                <span>📐</span>
                <span>هوامش الصفحة (Margins):</span>
              </span>
              <button
                type="button"
                onClick={() => setLinkMargins(!linkMargins)}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                  linkMargins
                    ? 'bg-[var(--ac)] text-[var(--acf)] border-[var(--ac)] font-bold'
                    : 'bg-[var(--bar)] text-[var(--mut)] border-[var(--bd)]'
                }`}
                title="ربط كل الهوامش معاً بنفس القيمة"
              >
                {linkMargins ? '🔗 الهوامش متساوية ومربوطة' : '🔓 فك ربط الهوامش'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[11px] text-[var(--mut)] block mb-1">علوي (Top):</label>
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
                <label className="text-[11px] text-[var(--mut)] block mb-1">سفلي (Bottom):</label>
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
                <label className="text-[11px] text-[var(--mut)] block mb-1">داخلي (Inside):</label>
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
                <label className="text-[11px] text-[var(--mut)] block mb-1">خارجي (Outside):</label>
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
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--bd)] bg-[var(--row)] flex items-center justify-end gap-2">
          <button className="ps-btn text-xs py-1.5 px-3" onClick={onCancel}>
            إلغاء
          </button>
          <button className="ps-btn ps-btn-primary text-xs py-1.5 px-5 font-bold" onClick={handleCreate}>
            بدء التصميم الآن 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
