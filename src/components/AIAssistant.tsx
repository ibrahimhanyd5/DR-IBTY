import React, { useState } from 'react';
import { DocData, Item } from '../types/printStudio';
import { AIDialog } from './AIDialog';
import { AISettings, Provider, HostCheck, askAI, checkHosts, generateImage, extractJSON, loadAISettings, saveAISettings, AI_DEFAULTS } from '../services/aiClient';

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
  getPageSummary?: () => string;
}

type Tab = 'text' | 'design' | 'review' | 'colors' | 'imggen' | 'images' | 'settings';

const QUICK: [string, string, string][] = [
  ['أعد الصياغة', 'Rewrite', 'Rewrite this text to be clearer and more professional. Keep the meaning and the language.'],
  ['اختصر', 'Shorten', 'Shorten this text by about half. Keep the key message and the language.'],
  ['وسّع', 'Expand', 'Expand this text with a bit more detail. Keep the tone and the language.'],
  ['صحّح لغوياً', 'Proofread', 'Fix spelling, grammar and punctuation only. Keep wording and language.'],
  ['اجعله عنواناً جذاباً', 'Catchy headline', 'Turn this into a short, catchy headline in the same language.'],
  ['ترجم للإنجليزية', 'To English', 'Translate this text to English.'],
  ['ترجم للعربية', 'To Arabic', 'Translate this text to Modern Standard Arabic.'],
  ['نبرة رسمية', 'Formal', 'Rewrite in a formal, professional tone. Keep the meaning and the language.'],
  ['نبرة ودّية', 'Friendly', 'Rewrite in a warm, friendly, conversational tone. Keep the meaning and the language.'],
  ['نبرة تسويقية', 'Marketing', 'Rewrite as persuasive marketing copy with a clear call to action. Keep the language.'],
  ['بسّط اللغة', 'Simplify', 'Rewrite using simple, clear words and short sentences. Keep the language.'],
  ['أضف عنواناً فرعياً', 'Add subtitle', 'Write one short supporting subtitle (max 12 words) for this text, in the same language. Reply with the subtitle only.'],
];

export function AIAssistant(p: Props) {
  const isAr = (p.lang || 'ar') === 'ar';
  const [st, setSt] = useState<AISettings>(() => loadAISettings());
  const needsKey = st.provider !== 'pollinations';
  const hasKey = !needsKey || !!st[st.provider].key.trim();
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
  const setCfg = (prov: Provider, field: 'key' | 'model' | 'base', v: string) => update({ [prov]: { ...st[prov], [field]: v } } as any);
  const [hosts, setHosts] = useState<HostCheck[] | null>(null);
  const [checking, setChecking] = useState(false);
  const runCheck = async () => {
    setChecking(true);
    setHosts(null);
    setHosts(await checkHosts());
    setChecking(false);
  };

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
      } else if (m.startsWith('NETWORK:') || /failed to fetch|networkerror|load failed/i.test(m)) {
        const host = m.startsWith('NETWORK:') ? m.slice(8) : '';
        setErr(
          isAr
            ? `تعذّر الوصول إلى ${host || 'الخدمة'}. الأسباب المحتملة: لا يوجد إنترنت، أو الشبكة/الدولة تحجب هذا الموقع، أو إضافة حجب إعلانات، أو أنك تفتح التطبيق داخل معاينة Claude (تحجب الاتصال الخارجي، فافتح الرابط في متصفحك). جرّب شبكة أخرى أو VPN، أو غيّر «عنوان الخدمة» إلى وسيط، أو استخدم خيار OpenAI-متوافق (OpenRouter). اضغط «فحص الاتصال» لمعرفة الخدمات المتاحة لك.`
            : `Could not reach ${host || 'the service'}. Check your connection, VPN, ad-blocker, or use a proxy base URL.`
        );
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

  const [variants, setVariants] = useState<string[]>([]);
  const [review, setReview] = useState('');
  const [palDesc, setPalDesc] = useState('');
  const [palette, setPalette] = useState<{ hex: string; name: string }[]>([]);
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgShape, setImgShape] = useState<'sq' | 'pt' | 'ls'>('sq');
  const [genImg, setGenImg] = useState<{ src: string; embedded: boolean } | null>(null);

  const doVariants = () =>
    run(async () => {
      const base = p.item && isText ? p.item.text || '' : '';
      const sys = 'You are a copy editor for print design. Give exactly 3 alternative versions of the text, each different in wording and style. Output ONLY the 3 versions separated by a line that contains exactly |||. No numbering, no quotes, no commentary. Keep the language of the original.';
      const raw = await askAI(st, sys, base ? `Text:\n${base}\n\nExtra instruction: ${instr || 'make it more compelling'}` : `Write 3 versions of short print-design text. Request: ${instr}`);
      const list = raw.split(/\n?\s*\|\|\|\s*\n?/).map((x) => x.trim()).filter(Boolean).slice(0, 3);
      if (!list.length) throw new Error(isAr ? 'لم يرجع النموذج بدائل' : 'No variants returned');
      setVariants(list);
    });

  const doReview = () =>
    run(async () => {
      const summary = p.getPageSummary ? p.getPageSummary() : '';
      const sys = 'You are a senior print designer reviewing a layout described as a list of items (type, text, font, colors, position and size in mm). Reply in Arabic with at most 7 short, concrete, numbered suggestions covering contrast, hierarchy, alignment, spacing, margins/bleed and fonts. Mention the specific items. No introduction.';
      setReview(await askAI(st, sys, summary || 'Empty page'));
    });

  const doPalette = () =>
    run(async () => {
      const sys = 'You are a color designer for print. Reply with ONLY JSON {"colors":[{"hex":"#rrggbb","name":"short Arabic name"}]} containing exactly 5 harmonious colors with good contrast between the darkest and lightest.';
      const j = extractJSON(await askAI(st, sys, palDesc));
      const cols = (Array.isArray(j.colors) ? j.colors : []).filter((c: any) => /^#[0-9a-f]{6}$/i.test(String(c.hex))).slice(0, 8);
      if (!cols.length) throw new Error(isAr ? 'لم يرجع النموذج ألواناً صالحة' : 'No valid colors returned');
      setPalette(cols.map((c: any) => ({ hex: String(c.hex), name: String(c.name || '') })));
    });

  const doImage = () =>
    run(async () => {
      const dims = imgShape === 'sq' ? [1024, 1024] : imgShape === 'pt' ? [768, 1024] : [1024, 768];
      setGenImg(null);
      setGenImg(await generateImage(imgPrompt.trim(), dims[0], dims[1]));
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
        {tabBtn('review', isAr ? 'مراجعة التصميم' : 'Review')}
        {tabBtn('colors', isAr ? 'ألوان' : 'Colors')}
        {tabBtn('imggen', isAr ? 'صور بالذكاء' : 'AI images')}
        {isImg && tabBtn('images', isAr ? 'أدوات الصور' : 'Image tools')}
        {tabBtn('settings', isAr ? 'الإعدادات والمفتاح' : 'Settings')}
      </div>

      {err && <div className="text-xs text-rose-500 leading-relaxed p-2 rounded-lg bg-rose-500/10">{err}</div>}

      {tab === 'settings' && (
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-1.5 flex-wrap">
            {(['pollinations', 'gemini', 'openai', 'compat'] as Provider[]).map((k) => (
              <button key={k} onClick={() => update({ provider: k })} className={`ps-btn flex-1 text-xs py-1.5 ${prov === k ? 'bg-[var(--ac)] text-[var(--acf)] font-bold' : 'bg-[var(--row)]'}`}>
                {k === 'pollinations' ? (isAr ? 'مجاني بلا مفتاح' : 'Free (no key)') : k === 'gemini' ? 'Google Gemini' : k === 'openai' ? 'ChatGPT (OpenAI)' : isAr ? 'OpenAI متوافق (OpenRouter)' : 'OpenAI-compatible'}
              </button>
            ))}
          </div>
          {prov === 'pollinations' && (
            <div className="text-[11px] leading-relaxed p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              {isAr
                ? 'الوضع المجاني: يعمل مباشرة دون حساب أو مفتاح (خدمة Pollinations المفتوحة) للنصوص والصور. السرعة والجودة متفاوتتان وقد تتغير شروطها. للجودة الأعلى استخدم مفتاح Gemini المجاني من Google.'
                : 'Free mode works without an account or key (open Pollinations service). Speed/quality vary; terms may change.'}
            </div>
          )}
          <label className="text-[11px] text-[var(--mut)]">{prov === 'pollinations' ? (isAr ? 'مفتاح API (اختياري)' : 'API key (optional)') : isAr ? 'مفتاح API' : 'API key'}</label>
          <input type="password" autoComplete="off" className="ps-input text-xs" value={st[prov].key} onChange={(e) => setCfg(prov, 'key', e.target.value)} placeholder={prov === 'gemini' ? 'AIza...' : prov === 'pollinations' ? (isAr ? 'اتركه فارغاً' : 'leave empty') : 'sk-...'} dir="ltr" />
          <label className="text-[11px] text-[var(--mut)]">{isAr ? 'اسم النموذج (يمكن تعديله)' : 'Model name (editable)'}</label>
          <input type="text" className="ps-input text-xs" value={st[prov].model} onChange={(e) => setCfg(prov, 'model', e.target.value)} dir="ltr" />
          <label className="text-[11px] text-[var(--mut)]">{isAr ? 'عنوان الخدمة (للمتقدمين: غيّره إن كانت الشبكة تحجب الموقع الأصلي)' : 'Service base URL (advanced, for proxies)'}</label>
          <div className="flex gap-1.5">
            <input type="text" className="ps-input text-xs flex-1" value={st[prov].base} onChange={(e) => setCfg(prov, 'base', e.target.value)} dir="ltr" />
            <button className="ps-btn text-[11px] px-2" onClick={() => setCfg(prov, 'base', AI_DEFAULTS[prov].base)}>{isAr ? 'الافتراضي' : 'Reset'}</button>
          </div>
          <div className="text-[11px] text-[var(--mut)] leading-relaxed">
            {prov === 'gemini'
              ? (isAr ? 'احصل على مفتاح من aistudio.google.com/apikey (توجد حصة مجانية). إن رُفض اسم النموذج فجرّب gemini-3.5-flash-lite.' : 'Get a key at aistudio.google.com/apikey (free tier available).')
              : prov === 'pollinations'
              ? (isAr ? 'اسم النموذج المجاني الافتراضي openai؛ يمكنك تجربة أسماء أخرى مدرجة في موقع pollinations.ai.' : 'Default free model alias is openai.')
              : prov === 'openai'
              ? (isAr ? 'احصل على مفتاح من platform.openai.com/api-keys (خدمة مدفوعة، منفصلة عن اشتراك ChatGPT). إن رُفض اسم النموذج فاكتب نموذجاً متاحاً لحسابك.' : 'Get a key at platform.openai.com/api-keys (paid).')
              : (isAr ? 'خدمة وسيطة (مثل openrouter.ai) تعطيك مفتاحاً واحداً لعدة نماذج منها Gemini وChatGPT، وتعمل أحياناً حيث تُحجب المواقع الأصلية. اسم النموذج مثل openrouter/auto أو اسم نموذج من موقعهم.' : 'Any OpenAI-compatible service such as OpenRouter.')}
          </div>
          <div className="text-[11px] leading-relaxed p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            {isAr
              ? 'يُحفظ المفتاح داخل متصفحك فقط ويُرسل مباشرة إلى الجهة المختارة. لا تستخدمه على جهاز مشترك. ملاحظة: النص الذي ترسله يُعالَج لدى الجهة التي اخترتها.'
              : 'The key stays in your browser and is sent only to the chosen service. Do not use it on shared devices.'}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button className="ps-btn ps-btn-primary text-xs py-1.5 px-3" onClick={() => run(async () => { const t = await askAI(st, 'Reply with the single word: OK', 'ping'); p.toast((isAr ? 'الاتصال ناجح: ' : 'Connected: ') + t.slice(0, 20)); })} disabled={busy}>
              {busy ? '...' : (isAr ? 'اختبار المفتاح' : 'Test key')}
            </button>
            <button className="ps-btn text-xs py-1.5 px-3" onClick={runCheck} disabled={checking}>
              {checking ? '...' : (isAr ? 'فحص الاتصال بالإنترنت' : 'Check connection')}
            </button>
          </div>
          {hosts && (
            <div className="flex flex-col gap-1 p-2 rounded-lg bg-[var(--row)] text-[11px]">
              {hosts.map((h) => (
                <div key={h.host} className="flex items-center gap-2">
                  <span style={{ color: h.ok ? '#16a34a' : '#e11d48', fontWeight: 700 }}>{h.ok ? '✓' : '✗'}</span>
                  <span className="flex-1">{h.name}</span>
                  <span className="text-[var(--mut)]" dir="ltr">{h.host}</span>
                </div>
              ))}
              <div className="text-[10px] text-[var(--mut)] pt-1 leading-relaxed">
                {isAr ? '✗ تعني أن الشبكة لا تصل لهذا الموقع (حجب أو انقطاع). جرّب VPN أو شبكة أخرى أو خدمة وسيطة.' : '✗ means the host is unreachable from your network.'}
              </div>
            </div>
          )}
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
          <button className="ps-btn text-xs py-1 px-3 self-start bg-[var(--row)]" disabled={busy || (!isText && !instr.trim())} onClick={doVariants}>{isAr ? '✨ اقترح 3 صياغات مختلفة' : '✨ Suggest 3 variants'}</button>
          {variants.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {variants.map((v, k) => (
                <div key={k} className="rounded-lg border border-[var(--bd)] p-2 flex flex-col gap-1.5">
                  <div className="text-xs whitespace-pre-wrap">{v}</div>
                  <div className="flex gap-1.5">
                    {isText && <button className="ps-btn ps-btn-primary text-[11px] py-0.5 px-2" onClick={() => { p.onUpdateItem({ text: v }); p.toast(isAr ? 'تم تطبيق الصياغة' : 'Applied'); setVariants([]); }}>{isAr ? 'استخدمها' : 'Use'}</button>}
                    <button className="ps-btn text-[11px] py-0.5 px-2" onClick={() => { p.onAddItems([{ type: 'text', text: v, w: p.doc.w * 0.7, h: 40, fs: 24, fam: 'Cairo', color: '#14161a', a: 'start', x: p.doc.w * 0.15, y: p.doc.h * 0.2 }]); p.toast(isAr ? 'أُضيفت كمربع نص جديد' : 'Added'); }}>{isAr ? 'كمربع جديد' : 'As new box'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {tab === 'review' && (
        <div className="flex flex-col gap-2.5">
          <div className="text-[11px] text-[var(--mut)] leading-relaxed">{isAr ? 'يحلّل المساعد عناصر الصفحة الحالية (النصوص والألوان والأحجام والمواضع) ويقترح تحسينات عملية للتباين والتسلسل والمحاذاة والهوامش.' : 'The assistant reviews the current page and suggests concrete improvements.'}</div>
          <button className="ps-btn ps-btn-primary text-xs py-1.5" disabled={busy} onClick={doReview}>{busy ? (isAr ? 'جارٍ التحليل...' : 'Analyzing...') : isAr ? 'حلّل صفحتي' : 'Review my page'}</button>
          {review && <div className="text-xs p-2.5 rounded-lg border border-[var(--ac)] whitespace-pre-wrap leading-relaxed">{review}</div>}
        </div>
      )}

      {tab === 'colors' && (
        <div className="flex flex-col gap-2.5">
          <div className="text-[11px] text-[var(--mut)] leading-relaxed">{isAr ? 'صف الجو العام (مثلاً: مقهى دافئ، شركة تقنية، حفل زفاف) لتحصل على 5 ألوان متناسقة. اضغط لوناً لتطبيقه على العنصر المحدد.' : 'Describe the mood to get 5 matching colors; click one to apply it to the selected item.'}</div>
          <div className="flex gap-1.5">
            <input className="ps-input flex-1 text-xs" value={palDesc} onChange={(e) => setPalDesc(e.target.value)} placeholder={isAr ? 'مثال: مقهى دافئ بألوان القهوة' : 'e.g. warm coffee shop'} />
            <button className="ps-btn ps-btn-primary text-xs px-3" disabled={busy || !palDesc.trim()} onClick={doPalette}>{busy ? '...' : isAr ? 'اقترح' : 'Suggest'}</button>
          </div>
          {palette.length > 0 && (
            <div className="grid grid-cols-5 gap-1.5">
              {palette.map((c) => (
                <button
                  key={c.hex}
                  title={c.name + ' ' + c.hex}
                  onClick={() => {
                    if (p.item && p.item.type !== 'img') {
                      p.onUpdateItem({ color: c.hex });
                      p.toast((isAr ? 'طُبّق اللون ' : 'Applied ') + c.hex);
                    } else {
                      try { navigator.clipboard && navigator.clipboard.writeText(c.hex); } catch (_) {}
                      p.toast((isAr ? 'نُسخ اللون ' : 'Copied ') + c.hex + (isAr ? ' (حدد عنصراً لتطبيقه)' : ''));
                    }
                  }}
                  className="rounded-lg border border-[var(--bd)] overflow-hidden flex flex-col text-[10px]"
                >
                  <span style={{ background: c.hex, height: 38, display: 'block' }} />
                  <span className="py-0.5 truncate px-1" dir="ltr">{c.hex}</span>
                  <span className="pb-0.5 truncate px-1 text-[var(--mut)]">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'imggen' && (
        <div className="flex flex-col gap-2.5">
          <div className="text-[11px] text-[var(--mut)] leading-relaxed">{isAr ? 'ولّد صورة مجانية من وصفك (يفضّل بالإنجليزية لنتائج أدق) ثم أضفها للصفحة. الصور المولّدة أصلية للمشروع وليست من مصادر ذات حقوق.' : 'Generate a free image from a description, then add it to the page.'}</div>
          <textarea className="ps-input text-xs" rows={2} value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)} placeholder={isAr ? 'مثال: a warm coffee cup on a wooden table, soft light, top view' : 'e.g. a warm coffee cup on a wooden table'} dir="ltr" />
          <div className="flex gap-1.5 items-center">
            <select className="ps-select text-xs bg-[var(--row)]" value={imgShape} onChange={(e) => setImgShape(e.target.value as any)}>
              <option value="sq">{isAr ? 'مربعة' : 'Square'}</option>
              <option value="pt">{isAr ? 'طولية' : 'Portrait'}</option>
              <option value="ls">{isAr ? 'عرضية' : 'Landscape'}</option>
            </select>
            <button className="ps-btn ps-btn-primary text-xs py-1.5 px-3 flex-1" disabled={busy || !imgPrompt.trim()} onClick={doImage}>{busy ? (isAr ? 'جارٍ التوليد...' : 'Generating...') : isAr ? 'ولّد الصورة' : 'Generate'}</button>
          </div>
          {genImg && (
            <div className="flex flex-col gap-2">
              <img src={genImg.src} alt="" className="w-full rounded-lg border border-[var(--bd)]" style={{ maxHeight: 260, objectFit: 'contain', background: '#fff' }} />
              {!genImg.embedded && <div className="text-[11px] text-amber-600">{isAr ? 'تعذّر تضمين الصورة داخل المشروع (قيود المتصفح)، وقد تظهر بديلة عند التصدير. احفظها على جهازك ثم ارفعها.' : 'Image could not be embedded; it may be replaced on export. Save it and upload it.'}</div>}
              <button
                className="ps-btn ps-btn-primary text-xs py-1 px-3"
                onClick={() => {
                  const key = 'ai_' + Date.now().toString(36);
                  const probe = new Image();
                  probe.onload = () => {
                    const ratio = probe.naturalHeight / Math.max(1, probe.naturalWidth);
                    const w = p.doc.w * 0.8;
                    if (genImg.embedded) p.onUpdateImage(key, genImg.src);
                    p.onAddItems([{ type: 'img', k: genImg.embedded ? key : genImg.src, w, h: w * ratio, x: p.doc.w * 0.1, y: p.doc.h * 0.1, fit: 'cover', name: 'AI image', color: '#ffffff' }]);
                    p.toast(isAr ? 'أُضيفت الصورة إلى الصفحة' : 'Image added');
                    p.onClose();
                  };
                  probe.src = genImg.src;
                }}
              >
                {isAr ? 'إضافة إلى الصفحة' : 'Add to page'}
              </button>
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
