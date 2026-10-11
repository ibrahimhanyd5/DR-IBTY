import React, { useState } from 'react';
import { DocData, Item } from '../types/printStudio';
import { AIDialog } from './AIDialog';
import { AISettings, Provider, askAI, extractJSON, loadAISettings, saveAISettings } from '../services/aiClient';

const MM = 2.8346;
const FONTS = ['Cairo', 'Tajawal', 'Amiri', 'Reem Kufi', 'Playfair Display', 'Montserrat', 'Oswald', 'Lobster'];

interface Props {
  item: Item | null;
  doc: DocData;
  imageDataUrl?: string;
  onUpdateItem: (updates: Partial<Item>) => void;
  onUpdateImage: (key: string, dataUrl: string) => void;
  onAddMultipleItems: (items: Item[], images: Record<string, string>) => void;
  onAddItems: (items: Partial<Item>[]) => void;
  onClose: () => void;
  toast: (m: string) => void;
  lang?: 'ar' | 'en';
}

type Tab = 'text' | 'design' | 'images' | 'settings';

const QUICK: [string, string, string][] = [
  ['أعد الصياغة', 'Rewrite', 'Rewrite this text to be clearer and more professional. Keep the meaning and the language.'],
  ['اختصر', 'Shorten', 'Shorten this text by about half. Keep the key message and the language.'],
  ['وسّع', 'Expand', 'Expand this text with a bit more detail. Keep the tone and the language.'],
  ['صحّح لغوياً', 'Proofread', 'Fix spelling, grammar and punctuation only. Keep wording and language.'],
  ['اجعله عنواناً جذاباً', 'Catchy headline', 'Turn this into a short, catchy headline in the same language.'],
  ['ترجم للإنجليزية', 'To English', 'Translate this text to English.'],
  ['ترجم للعربية', 'To Arabic', 'Translate this text to Modern Standard Arabic.'],
];

export function AIAssistant(p: Props) {
  const isAr = (p.lang || 'ar') === 'ar';
  const [st, setSt] = useState<AISettings>(() => loadAISettings());
  const hasKey = !!st[st.provider].key.trim();
  const isText = !!p.item && p.item.type === 'text';
  const isImg = !!p.item && p.item.type === 'img';
  const [tab, setTab] = useState<Tab>(!hasKey ? 'settings' : isImg ? 'images' : isText ? 'text' : 'design');
  const [busy, setBusy] = useState(false);
  const [instr, setInstr] = useState('');
  const [result, setResult] = useState('');
  const [desc, setDesc] = useState('');
  const [layout, setLayout] = useState<Partial<Item>[] | null>(null);
  const [err, setErr] = useState('');

  const update = (patch: Partial<AISettings>) => {
    const n = { ...st, ...patch };
    setSt(n);
    saveAISettings(n);
  };
  const setCfg = (prov: Provider, field: 'key' | 'model', v: string) => update({ [prov]: { ...st[prov], [field]: v } } as any);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
    } catch (e: any) {
      const m = e && e.message ? String(e.message) : String(e);
      if (m === 'NO_KEY') {
        setTab('settings');
        setErr(isAr ? 'أدخل مفتاح API أولاً.' : 'Enter an API key first.');
      } else if (/failed to fetch|networkerror|load failed/i.test(m)) {
        setErr(isAr ? 'تعذر الاتصال بالخدمة. تحقق من الإنترنت، وبعض البيئات (مثل معاينة Claude) تحجب الاتصال الخارجي.' : 'Network error. Check your connection.');
      } else {
        setErr(m);
      }
    } finally {
      setBusy(false);
    }
  };

  const doText = (instruction: string) =>
    run(async () => {
      const base = p.item && isText ? p.item.text || '' : '';
      const sys = 'You are a copy editor for print design (flyers, posters, cards). Reply with ONLY the resulting text. No quotes, no markdown, no explanations. Keep line breaks sensible.';
      const user = base ? `Instruction: ${instruction}\n\nText:\n${base}` : `Write short text for a print design. Request: ${instruction}`;
      setResult(await askAI(st, sys, user));
    });

  const doDesign = () =>
    run(async () => {
      const wmm = Math.round(p.doc.w / MM);
      const hmm = Math.round(p.doc.h / MM);
      const sys =
        `You are a print layout designer. Reply with ONLY valid JSON of the form {"items":[...]} and nothing else. The page is ${wmm}x${hmm} mm. ` +
        `Each item: {"type":"rect"|"ell"|"text","x":number,"y":number,"w":number,"h":number,"color":"#rrggbb"} in millimetres from the top-left corner. ` +
        `Text items also need "text", "fs" (font size in pt, 8 to 120), "fam" (one of ${FONTS.join(', ')}), "b" (true/false) and "a" ("start"|"center"|"end"). ` +
        `Start with one full-page background rect. Use at most 14 items, keep everything inside the page with at least 8 mm margins, ensure strong text contrast, and do not use images. ` +
        `If the request is in Arabic, write the text in Arabic with fam "Cairo" or "Tajawal".`;
      const j = extractJSON(await askAI(st, sys, desc));
      const arr: any[] = Array.isArray(j.items) ? j.items : [];
      const out: Partial<Item>[] = arr.slice(0, 20).map((it, n) => {
        const type = it.type === 'text' ? 'text' : it.type === 'ell' ? 'ell' : 'rect';
        const x = Math.max(0, Number(it.x) || 0) * MM;
        const y = Math.max(0, Number(it.y) || 0) * MM;
        const w = Math.min(p.doc.w, Math.max(5, Number(it.w) || 30) * MM);
        const h = Math.min(p.doc.h, Math.max(2, Number(it.h) || 10) * MM);
        const base: Partial<Item> = { type, x, y, w, h, color: typeof it.color === 'string' ? it.color : '#1b2f6b', name: `AI ${n + 1}` };
        if (type === 'text') {
          const fs = Math.min(120, Math.max(8, Number(it.fs) || 20));
          return { ...base, text: String(it.text || ''), fs, fam: FONTS.includes(it.fam) ? it.fam : 'Cairo', b: it.b ? 1 : 0, a: ['start', 'center', 'end'].includes(it.a) ? it.a : 'start', h: Math.max(h, fs * 1.3) };
        }
        return base;
      });
      if (!out.length) throw new Error(isAr ? 'لم يرجع النموذج تصميماً صالحاً، أعد المحاولة.' : 'No valid layout returned.');
      setLayout(out);
    });

  const tabBtn = (id: Tab, label: string) => (
    <button key={id} onClick={() => { setTab(id); setErr(''); }} className={`ps-btn text-xs py-1 px-3 ${tab === id ? 'bg-[var(--ac)] text-[var(--acf)] font-bold' : 'bg-[var(--row)]'}`}>
      {label}
    </button>
  );
  const prov = st.provider;

  return (
    <div className="flex flex-col gap-3 text-[var(--fg)]" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">✨ {isAr ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}</span>
        <button className="ps-btn text-xs py-1 px-2.5" onClick={p.onClose}>{isAr ? 'إغلاق' : 'Close'}</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tabBtn('text', isAr ? 'النص' : 'Text')}
        {tabBtn('design', isAr ? 'تصميم من وصف' : 'Design')}
        {isImg && tabBtn('images', isAr ? 'أدوات الصور' : 'Image tools')}
        {tabBtn('settings', isAr ? 'الإعدادات والمفتاح' : 'Settings')}
      </div>

      {err && <div className="text-xs text-rose-500 leading-relaxed p-2 rounded-lg bg-rose-500/10">{err}</div>}

      {tab === 'settings' && (
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-1.5">
            {(['gemini', 'openai'] as Provider[]).map((k) => (
              <button key={k} onClick={() => update({ provider: k })} className={`ps-btn flex-1 text-xs py-1.5 ${prov === k ? 'bg-[var(--ac)] text-[var(--acf)] font-bold' : 'bg-[var(--row)]'}`}>
                {k === 'gemini' ? 'Google Gemini' : 'ChatGPT (OpenAI)'}
              </button>
            ))}
          </div>
          <label className="text-[11px] text-[var(--mut)]">{isAr ? 'مفتاح API' : 'API key'}</label>
          <input type="password" autoComplete="off" className="ps-input text-xs" value={st[prov].key} onChange={(e) => setCfg(prov, 'key', e.target.value)} placeholder={prov === 'gemini' ? 'AIza...' : 'sk-...'} dir="ltr" />
          <label className="text-[11px] text-[var(--mut)]">{isAr ? 'اسم النموذج (يمكن تعديله)' : 'Model name (editable)'}</label>
          <input type="text" className="ps-input text-xs" value={st[prov].model} onChange={(e) => setCfg(prov, 'model', e.target.value)} dir="ltr" />
          <div className="text-[11px] text-[var(--mut)] leading-relaxed">
            {prov === 'gemini'
              ? (isAr ? 'احصل على مفتاح من aistudio.google.com/apikey (توجد حصة مجانية). إن رُفض اسم النموذج فجرّب gemini-3.5-flash-lite.' : 'Get a key at aistudio.google.com/apikey (free tier available).')
              : (isAr ? 'احصل على مفتاح من platform.openai.com/api-keys (خدمة مدفوعة، وهي منفصلة عن اشتراك ChatGPT). إن رُفض اسم النموذج فاكتب نموذجاً متاحاً لحسابك.' : 'Get a key at platform.openai.com/api-keys (paid, separate from ChatGPT plans).')}
          </div>
          <div className="text-[11px] leading-relaxed p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            {isAr
              ? 'يُحفظ المفتاح داخل متصفحك فقط ولا يُرفع إلى أي مكان، ويُرسل مباشرة إلى Google أو OpenAI. لا تستخدمه على جهاز مشترك. ملاحظة: النص الذي ترسله يُعالَج لدى الجهة التي اخترتها.'
              : 'The key stays in your browser and is sent only to Google/OpenAI. Do not use it on shared devices.'}
          </div>
          <button className="ps-btn ps-btn-primary text-xs py-1.5" onClick={() => run(async () => { const t = await askAI(st, 'Reply with the single word: OK', 'ping'); p.toast((isAr ? 'الاتصال ناجح: ' : 'Connected: ') + t.slice(0, 20)); })} disabled={busy}>
            {busy ? '...' : (isAr ? 'اختبار الاتصال' : 'Test connection')}
          </button>
        </div>
      )}

      {tab === 'text' && (
        <div className="flex flex-col gap-2.5">
          {!isText && <div className="text-[11px] text-[var(--mut)]">{isAr ? 'لم تحدد مربع نص. اكتب ما تريد وسيُنشأ نص جديد تضيفه إلى الصفحة.' : 'No text box selected: describe the text to create.'}</div>}
          {isText && (
            <>
              <div className="text-[11px] text-[var(--mut)]">{isAr ? 'النص الحالي:' : 'Current text:'}</div>
              <div className="text-xs p-2 rounded-lg bg-[var(--row)] max-h-24 overflow-y-auto whitespace-pre-wrap">{p.item!.text}</div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK.map(([ar, en, ins]) => (
                  <button key={en} disabled={busy} onClick={() => doText(ins)} className="ps-btn text-[11px] py-1 px-2.5 bg-[var(--row)]">{isAr ? ar : en}</button>
                ))}
              </div>
            </>
          )}
          <div className="flex gap-1.5">
            <input className="ps-input flex-1 text-xs" value={instr} onChange={(e) => setInstr(e.target.value)} placeholder={isAr ? (isText ? 'أو اكتب تعليمة خاصة...' : 'اكتب عنوان إعلان لمقهى...') : 'Custom instruction...'} />
            <button className="ps-btn ps-btn-primary text-xs px-3" disabled={busy || !instr.trim()} onClick={() => doText(instr)}>{busy ? '...' : (isAr ? 'نفّذ' : 'Run')}</button>
          </div>
          {result && (
            <div className="flex flex-col gap-2">
              <div className="text-[11px] text-[var(--mut)]">{isAr ? 'النتيجة:' : 'Result:'}</div>
              <div className="text-xs p-2 rounded-lg border border-[var(--ac)] whitespace-pre-wrap">{result}</div>
              <div className="flex gap-1.5">
                {isText ? (
                  <button className="ps-btn ps-btn-primary text-xs py-1 px-3" onClick={() => { p.onUpdateItem({ text: result }); p.toast(isAr ? 'تم تطبيق النص' : 'Applied'); setResult(''); }}>{isAr ? 'استبدال النص' : 'Replace text'}</button>
                ) : null}
                <button className="ps-btn text-xs py-1 px-3" onClick={() => { p.onAddItems([{ type: 'text', text: result, w: p.doc.w * 0.7, h: 40, fs: 24, fam: 'Cairo', color: '#14161a', a: 'start', x: p.doc.w * 0.15, y: p.doc.h * 0.2 }]); p.toast(isAr ? 'أُضيف كمربع نص' : 'Added'); setResult(''); }}>{isAr ? 'إضافة كمربع نص جديد' : 'Add as new text'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'design' && (
        <div className="flex flex-col gap-2.5">
          <div className="text-[11px] text-[var(--mut)] leading-relaxed">{isAr ? 'صف المطبوع الذي تريده (النوع، الموضوع، الألوان) وسيقترح المساعد تخطيطاً من نصوص وأشكال تضيفه إلى الصفحة الحالية.' : 'Describe the layout you want.'}</div>
          <textarea className="ps-input text-xs" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={isAr ? 'مثال: فلاير افتتاح مقهى بألوان البني والكريمي، عنوان كبير وتاريخ وعنوان المكان' : 'e.g. Grand opening flyer for a coffee shop'} />
          <button className="ps-btn ps-btn-primary text-xs py-1.5" disabled={busy || !desc.trim()} onClick={doDesign}>{busy ? (isAr ? 'جارٍ التصميم...' : 'Designing...') : (isAr ? 'اقترح تصميماً' : 'Suggest layout')}</button>
          {layout && (
            <div className="flex flex-col gap-2 p-2 rounded-lg border border-[var(--ac)]">
              <div className="text-xs">{isAr ? `جاهز: ${layout.length} عنصر` : `${layout.length} items ready`}</div>
              <div className="flex gap-1.5">
                <button className="ps-btn ps-btn-primary text-xs py-1 px-3" onClick={() => { p.onAddItems(layout); setLayout(null); p.onClose(); }}>{isAr ? 'إضافة إلى الصفحة' : 'Add to page'}</button>
                <button className="ps-btn text-xs py-1 px-3" onClick={() => setLayout(null)}>{isAr ? 'تجاهل' : 'Discard'}</button>
              </div>
              <div className="text-[10px] text-[var(--mut)]">{isAr ? 'يمكنك التراجع بزر «تراجع» بعد الإضافة.' : 'You can undo after adding.'}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'images' && p.item && isImg && (
        <AIDialog
          item={p.item}
          imageDataUrl={p.imageDataUrl}
          onUpdateItem={p.onUpdateItem}
          onUpdateImage={p.onUpdateImage}
          onAddMultipleItems={p.onAddMultipleItems}
          onClose={p.onClose}
          toast={p.toast}
          lang={p.lang}
        />
      )}
    </div>
  );
}
