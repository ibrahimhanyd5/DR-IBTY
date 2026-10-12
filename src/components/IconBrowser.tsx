import React, { useEffect, useMemo, useState } from 'react';
import { Item } from '../types/printStudio';
import { IconItem } from '../services/iconsFonts';
import { iconSvg, localIcons, searchLocal } from '../services/iconSearch';
import { HostCheck, checkHosts } from '../services/aiClient';

const HOSTS = ['https://api.iconify.design', 'https://api.simplesvg.com', 'https://api.unisvg.com'];
async function iconifyFetch(path: string, signal?: AbortSignal): Promise<{ res: Response; host: string }> {
  let last: any = new Error('network');
  for (const host of HOSTS) {
    try {
      const res = await fetch(host + path, { signal });
      if (res.ok) return { res, host };
      last = new Error('HTTP ' + res.status);
    } catch (e: any) {
      if (e && e.name === 'AbortError') throw e;
      last = e;
    }
  }
  throw last;
}
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
const POP = ['house', 'phone', 'mail', 'map-pin', 'star', 'heart', 'user', 'calendar', 'camera', 'shopping-cart', 'search', 'settings', 'clock', 'book', 'car', 'utensils'];
const AR_POP = ['بيت', 'هاتف', 'قلب', 'سلة', 'طعام', 'تعليم', 'صحة', 'مال'];
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
  const [online, setOnline] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offlineNote, setOfflineNote] = useState(false);
  const [host, setHost] = useState(HOSTS[0]);
  const [hosts, setHosts] = useState<HostCheck[] | null>(null);

  const local = useMemo(() => (q.trim() ? searchLocal(q, 150) : []), [q]);
  const libSize = useMemo(() => localIcons().length, []);

  useEffect(() => {
    const term = q.trim().toLowerCase();
    if (!term || /[\u0600-\u06FF]/.test(term) && local.length === 0) {
      setOnline([]);
      setTotal(0);
      setOfflineNote(false);
      return;
    }
    // Arabic keywords are mapped to English for the online database
    const eng = /[\u0600-\u06FF]/.test(term) && local.length ? local[0].name.split('-')[0] : term;
    const ctl = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const { res: r, host: usedHost } = await iconifyFetch(`/search?query=${enc(eng)}&limit=60&prefixes=${setKey || ALL}`, ctl.signal);
        setHost(usedHost);
        const j = await r.json();
        setOnline(j.icons || []);
        setTotal(j.total || 0);
        setOfflineNote(false);
      } catch (e: any) {
        if (e && e.name === 'AbortError') return;
        setOnline([]);
        setOfflineNote(true);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, [q, setKey]);

  const addInline = (name: string, svg: string) => {
    onAdd({ type: 'img', k: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), name, w: 64, h: 64, fit: 'contain' });
    toast(isAr ? `تمت إضافة الأيقونة ${name}` : `Added ${name}`);
  };

  const addOnline = async (full: string) => {
    const i = full.indexOf(':');
    const prefix = full.slice(0, i);
    const name = full.slice(i + 1);
    try {
      const { res: r } = await iconifyFetch(`/${prefix}/${name}.svg?color=${enc(color)}&height=256`);
      addInline(full, await r.text());
    } catch (_) {
      toast(isAr ? 'تعذر تحميل الأيقونة من الإنترنت' : 'Could not load the icon');
    }
  };

  const addBuiltin = (ic: IconItem) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ic.viewBox || '0 0 24 24'}" width="256" height="256" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ic.svgPath}"/></svg>`;
    addInline(isAr ? ic.name : ic.nameEn, svg);
  };

  const cell = 'p-1.5 rounded-lg border border-[var(--bd)] flex items-center justify-center';
  return (
    <div className="flex-1 flex flex-col overflow-hidden gap-2 min-h-0">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isAr ? 'ابحث بالعربية أو الإنجليزية (بيت، قلب، phone...)' : 'Search icons (home, phone...)'}
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

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2">
        {!q.trim() && (
          <>
            <div className="text-[10px] text-[var(--mut)] leading-relaxed">
              {isAr ? `مكتبة محلية فيها ${libSize} أيقونة تعمل بدون إنترنت، ويُضاف إليها البحث في أكثر من 200 ألف أيقونة عند توفر الاتصال.` : `${libSize} icons built in (work offline), plus 200k+ online when connected.`}
            </div>
            <div className="flex flex-wrap gap-1">
              {AR_POP.map((w) => (
                <button key={w} onClick={() => setQ(w)} className="ps-btn text-[11px] py-0.5 px-2 bg-[var(--row)]">{w}</button>
              ))}
              {POP.map((w) => (
                <button key={w} onClick={() => setQ(w)} className="ps-btn text-[11px] py-0.5 px-2 bg-[var(--row)]">{w}</button>
              ))}
            </div>
            <div className="text-[11px] font-bold">{isAr ? 'أيقونات جاهزة' : 'Ready icons'}</div>
            <div className="grid grid-cols-4 gap-1.5">
              {builtin.map((ic) => (
                <button key={ic.id} onClick={() => addBuiltin(ic)} title={isAr ? ic.name : ic.nameEn} className={cell} style={{ background: '#fff' }}>
                  <svg viewBox={ic.viewBox || '0 0 24 24'} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                    <path d={ic.svgPath} />
                  </svg>
                </button>
              ))}
            </div>
          </>
        )}

        {q.trim() && (
          <>
            <div className="text-[11px] font-bold">
              {isAr ? `المكتبة المحلية (بدون إنترنت): ${local.length} نتيجة` : `Offline library: ${local.length} results`}
            </div>
            {local.length === 0 && <div className="text-xs text-[var(--mut)]">{isAr ? 'لا نتائج محلية. جرّب كلمة أخرى أو انتظر نتائج الإنترنت.' : 'No offline matches.'}</div>}
            <div className="grid grid-cols-4 gap-1.5">
              {local.map((ic) => (
                <button key={ic.name} onClick={() => addInline(ic.name, iconSvg(ic.inner, color))} title={ic.name} className={cell} style={{ background: '#fff' }}>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ic.inner }} />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-bold flex-1">{isAr ? 'المزيد من الإنترنت (Iconify)' : 'More online (Iconify)'}</span>
              <select value={setKey} onChange={(e) => setSetKey(e.target.value)} className="ps-select text-[11px] bg-[var(--row)]" style={{ minHeight: 30 }}>
                {SETS.map(([k, n]) => (
                  <option key={k} value={k}>{n}</option>
                ))}
              </select>
            </div>
            {loading && <div className="text-xs text-[var(--mut)]">{isAr ? 'جارٍ البحث على الإنترنت...' : 'Searching online...'}</div>}
            {offlineNote && (
              <div className="text-[11px] text-[var(--mut)] leading-relaxed">
                {isAr ? 'لا يوجد اتصال بقاعدة الأيقونات على الإنترنت الآن (جُرّبت 3 خوادم). المكتبة المحلية أعلاه تعمل دون اتصال.' : 'No connection to the online database (3 servers tried). The offline library above still works.'}
                <button className="ps-btn text-[10px] py-0.5 px-2 mx-1" onClick={async () => { setHosts(null); setHosts(await checkHosts()); }}>{isAr ? 'فحص الاتصال' : 'Check'}</button>
              </div>
            )}
            {hosts && (
              <div className="flex flex-col gap-0.5 p-2 rounded-lg bg-[var(--row)] text-[11px]">
                {hosts.map((h) => (
                  <div key={h.host} className="flex items-center gap-2">
                    <span style={{ color: h.ok ? '#16a34a' : '#e11d48', fontWeight: 700 }}>{h.ok ? '✓' : '✗'}</span>
                    <span className="flex-1">{h.name}</span>
                    <span className="text-[var(--mut)]" dir="ltr">{h.host}</span>
                  </div>
                ))}
              </div>
            )}
            {online.length > 0 && (
              <>
                <div className="text-[10px] text-[var(--mut)]">{isAr ? `${total} نتيجة` : `${total} results`}</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {online.map((full) => {
                    const i = full.indexOf(':');
                    const p = full.slice(0, i);
                    const n = full.slice(i + 1);
                    return (
                      <button key={full} onClick={() => addOnline(full)} title={full} className={cell} style={{ background: '#fff' }}>
                        <img loading="lazy" src={`${host}/${p}/${n}.svg?color=${enc(color)}&height=28`} width={28} height={28} alt={n} />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
        <div className="text-[10px] text-[var(--mut)] pt-1 leading-relaxed">
          {isAr
            ? 'المكتبة المحلية: Lucide (ترخيص ISC). نتائج الإنترنت من مجموعات مفتوحة المصدر (MIT / Apache / ISC)، وراجع الترخيص عند النشر.'
            : 'Offline library: Lucide (ISC). Online sets are open source; check each license before publishing.'}
        </div>
      </div>
    </div>
  );
}
