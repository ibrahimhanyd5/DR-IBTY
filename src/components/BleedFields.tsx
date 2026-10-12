import React, { useState } from 'react';
import { BleedMM } from '../services/layout';

interface Props {
  value: BleedMM;
  onChange: (v: BleedMM) => void;
  facing: boolean;
  isAr?: boolean;
}

export function BleedFields({ value, onChange, facing, isAr = true }: Props) {
  const [link, setLink] = useState(value.top === value.bottom && value.bottom === value.outside && (!facing || value.inside === value.outside));
  const set = (k: keyof BleedMM, raw: number) => {
    const n = Math.max(0, Math.min(30, isFinite(raw) ? raw : 0));
    if (link) onChange({ top: n, bottom: n, inside: facing ? n : value.inside, outside: n });
    else onChange({ ...value, [k]: n });
  };
  const field = (k: keyof BleedMM, label: string, disabled = false) => (
    <div>
      <label className="text-[11px] text-[var(--mut)] block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          max="30"
          step="0.5"
          disabled={disabled}
          value={value[k]}
          onChange={(e) => set(k, +e.target.value)}
          className="ps-input w-full text-xs font-semibold text-center"
          style={{ opacity: disabled ? 0.45 : 1 }}
        />
        <span className="text-[10px] text-[var(--mut)]">{isAr ? 'مم' : 'mm'}</span>
      </div>
    </div>
  );
  return (
    <div className="p-3.5 rounded-xl bg-[var(--row)] border border-[var(--bd)] space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-bold text-xs">✂ {isAr ? 'مساحة القص (Bleed)' : 'Bleed'}</div>
        <button
          type="button"
          onClick={() => setLink(!link)}
          className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${link ? 'bg-[var(--ac)] text-[var(--acf)] border-[var(--ac)] font-bold' : 'bg-[var(--bar)] text-[var(--mut)] border-[var(--bd)]'}`}
        >
          {link ? (isAr ? '🔗 الجوانب متساوية' : '🔗 Linked') : isAr ? '🔓 فك الربط' : '🔓 Unlinked'}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {field('top', isAr ? 'علوي (Top):' : 'Top:')}
        {field('bottom', isAr ? 'سفلي (Bottom):' : 'Bottom:')}
        {field('inside', isAr ? 'داخلي (Inside):' : 'Inside:', !facing)}
        {field('outside', facing ? (isAr ? 'خارجي (Outside):' : 'Outside:') : isAr ? 'الجانبان (يمين/يسار):' : 'Left/Right:')}
      </div>
      <div className="text-[10px] text-[var(--mut)] leading-relaxed">
        {isAr
          ? 'مساحة إضافية خارج حافة الصفحة تمتد إليها الخلفيات والصور حتى لا تظهر حواف بيضاء بعد قص المطبوع. القيمة المعتادة 3 مم. الجانب الداخلي (عند الكعب) يكون عادةً 0 في المجلات والكتب.'
          : 'Extra area beyond the trim edge where backgrounds/images extend so no white edge shows after cutting. 3 mm is typical; inside (spine) is usually 0.'}
      </div>
    </div>
  );
}
