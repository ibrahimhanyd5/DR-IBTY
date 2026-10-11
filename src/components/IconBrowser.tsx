import React, { useEffect, useState } from 'react';
import { Item } from '../types/printStudio';
import { IconItem } from '../services/iconsFonts';

const API = 'https://api.iconify.design';
const SETS: [string, string][] = [
  ['', 'كل المجموعات المجانية'],
  ['mdi', 'Material Design'],
  ['tabler', 'Tabler'],
  ['lucide', 'Lucide'],
  ['ph', 'Phosphor'],
  ['bi', 'Bootstrap'],
  ['ri', 'Remix'],
  ['heroicons', 'Heroicons'],
  ['carbon', 'Carbon'],
  ['fluent', 'Fluent'],
  ['ion', 'Ionicons'],
];
const ALL = 'mdi,tabler,lucide,ph,bi,ri,heroicons,carbon,fluent,ion';
const POP = ['home', 'phone', 'mail', 'location', 'star', 'heart', 'user', 'calendar', 'camera', 'cart', 'search', 'settings', 'clock', 'book', 'car', 'food'];
const AR2EN: Record<string, string> = {
  بيت: 'home', منزل: 'home', هاتف: 'phone', جوال: 'phone', بريد: 'mail', موقع: 'location', خريطة: 'map', نجمة: 'star', قلب: 'heart',
  مستخدم: 'user', شخص: 'user', تقويم: 'calendar', كاميرا: 'camera', سلة: 'cart', بحث: 'search', إعدادات: 'settings', ساعة: 'clock',
  كتاب: 'book', سيارة: 'car', طعام: 'food', صحة: 'health', مال: 'money', تعليم: 'education', شجرة: 'tree', شمس: 'sun', قمر: 'moon',
  مفتاح: 'key', قفل: 'lock', سهم: 'arrow', رسالة: 'message', صورة: 'image', فيديو: 'video', موسيقى: 'music', طائرة: 'plane', مطعم: 'restaurant',
  مدرسة: 'school', مستشفى: 'hospital', عمل: 'briefcase', شركة: 'building', جائزة: 'trophy', إنترنت: 'globe', واي: 'wifi',
};

const enc = (c: string) => encodeURIComponent(c);

interface Props {
  isAr: boolean;
  builtin: IconItem[];
  onAdd: (item: Partial<Item>) => void;
  toast: (m: string) => void;
}

export function IconBrowser({ isAr, builtin, onAdd, toast }: Props) {
  const [q, setQ] = useState('');
  const [setKey, setSetKey] = useState('');
  const [color, setColor] = useState('#1b2f6b');
  const [icons, setIcons] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const term0 = q.trim().toLowerCase();
    if (!term0) {
      setIcons([]);
      setErr('');
      setTotal(0);
      return;
    }
    const term = AR2EN[term0] || term0;
    const ctl = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      setErr('');
      try {
        const r = await fetch(`${API}/search?query=${enc(term)}&limit=60&prefixes=${setKey || ALL}`, { signal: ctl.signal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        setIcons(j.icons || []);
        setTotal(j.total || 0);
      } catch (e: any) {
        if (e && e.name === 'AbortError') return;
        setErr(
          isAr
            ? 'تعذر الاتصال بقاعدة الأيقونات (Iconify). تحتاج إلى اتصال بالإنترنت، وبعض البيئات تحجب الاتصالات الخارجية.'
            : 'Could not reach the Iconify icon database. Internet access is required.'
        );
        setIcons([]);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, [q, setKey, isAr]);

  const addOnline = async (full: string) => {
    const i = full.indexOf(':');
    const prefix = full.slice(0, i);
    const name = full.slice(i + 1);
    try {
      const r = await fetch(`${API}/${prefix}/${name}.svg?color=${enc(color)}&height=256`);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const svg = await r.text();
      onAdd({ type: 'img', k: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), name: full, w: 64, h: 64, fit: 'contain' });
      toast(isAr ? `تمت إضافة الأيقونة ${name}` : `Added ${name}`);
    } catch (_) {
      toast(isAr ? 'تعذر تحميل الأيقونة، تحقق من الإنترنت' : 'Could not load the icon');
    }
  };

  const addBuiltin = (ic: IconItem) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ic.viewBox || '0 0 24 24'}" width="256" height="256" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ic.svgPath}"/></svg>`;
    onAdd({ type: 'img', k: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), name: isAr ? ic.name : ic.nameEn, w: 64, h: 64, fit: 'contain' });
    toast(isAr ? `تمت إضافة ${ic.name}` : `Added ${ic.nameEn}`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden gap-2 min-h-0">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isAr ? 'ابحث عن أيقونة (home, phone... أو بالعربية)' : 'Search icons (home, phone...)'}
          className="ps-input flex-1 text-xs"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label={isAr ? 'لون الأيقونة' : 'Icon color'}
          style={{ width: 40, height: 38, padding: 2, borderRadius: 8, border: '1px solid var(--bd)', background: 'transparent' }}
        />
      </div>
      <select value={setKey} onChange={(e) => setSetKey(e.target.value)} className="ps-select text-xs w-full bg-[var(--row)]">
        {SETS.map(([k, n]) => (
          <option key={k} value={k}>
            {n}
          </option>
        ))}
      </select>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2">
        {!q.trim() && (
          <>
            <div className="flex flex-wrap gap-1">
              {POP.map((w) => (
                <button key={w} onClick={() => setQ(w)} className="ps-btn text-[11px] py-0.5 px-2 bg-[var(--row)]">
                  {w}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-[var(--mut)]">
              {isAr
                ? 'اكتب كلمة للبحث في أكثر من 200 ألف أيقونة مجانية مفتوحة المصدر (Iconify)، أو اختر من الأيقونات الجاهزة أدناه.'
                : 'Search 200k+ free open-source icons (Iconify), or pick a built-in icon below.'}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {builtin.map((ic) => (
                <button key={ic.id} onClick={() => addBuiltin(ic)} title={isAr ? ic.name : ic.nameEn} className="p-1.5 rounded-lg border border-[var(--bd)] flex items-center justify-center" style={{ background: '#fff' }}>
                  <svg viewBox={ic.viewBox || '0 0 24 24'} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                    <path d={ic.svgPath} />
                  </svg>
                </button>
              ))}
            </div>
          </>
        )}
        {loading && <div className="text-xs text-[var(--mut)]">{isAr ? 'جارٍ البحث...' : 'Searching...'}</div>}
        {err && <div className="text-xs text-rose-500 leading-relaxed">{err}</div>}
        {!loading && !err && q.trim() && icons.length === 0 && <div className="text-xs text-[var(--mut)]">{isAr ? 'لا نتائج. جرّب كلمة إنجليزية أخرى.' : 'No results.'}</div>}
        {icons.length > 0 && (
          <>
            <div className="text-[10px] text-[var(--mut)]">{isAr ? `${total} نتيجة` : `${total} results`}</div>
            <div className="grid grid-cols-4 gap-1.5">
              {icons.map((full) => {
                const i = full.indexOf(':');
                const p = full.slice(0, i);
                const n = full.slice(i + 1);
                return (
                  <button key={full} onClick={() => addOnline(full)} title={full} className="p-1.5 rounded-lg border border-[var(--bd)] flex items-center justify-center" style={{ background: '#fff' }}>
                    <img loading="lazy" src={`${API}/${p}/${n}.svg?color=${enc(color)}&height=28`} width={28} height={28} alt={n} />
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="text-[10px] text-[var(--mut)] pt-1 leading-relaxed">
          {isAr
            ? 'المجموعات المعروضة مفتوحة المصدر (MIT / Apache / ISC) وتسمح بالاستخدام التجاري. راجع ترخيص كل مجموعة عند النشر.'
            : 'Sets shown are open source (MIT / Apache / ISC). Check each set license before publishing.'}
        </div>
      </div>
    </div>
  );
}
