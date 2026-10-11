/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Item } from '../types/printStudio';
import {
  removeBackgroundClient,
  applyImageFilter,
  splitImageIntoSlices,
  transformToCartoon,
  generateCartoonArtwork,
} from '../services/imageProcessing';

interface AIDialogProps {
  item: Item;
  imageDataUrl?: string;
  onUpdateItem: (updates: Partial<Item>) => void;
  onUpdateImage: (key: string, dataUrl: string) => void;
  onAddMultipleItems: (items: Item[], images: Record<string, string>) => void;
  onClose: () => void;
  toast: (msg: string) => void;
  lang?: 'ar' | 'en';
}

interface StagedAction {
  type: 'text' | 'image' | 'color' | 'slices';
  summary: string;
  previewData?: {
    originalText?: string;
    newText?: string;
    imageThumbnail?: string;
    colorSwatch?: string;
    slicesCount?: number;
  };
  apply: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  stagedAction?: StagedAction;
}

export function AIDialog({
  item,
  imageDataUrl,
  onUpdateItem,
  onUpdateImage,
  onAddMultipleItems,
  onClose,
  toast,
  lang = 'ar',
}: AIDialogProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stagedAction, setStagedAction] = useState<StagedAction | null>(null);

  const isAr = lang === 'ar';

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init',
      sender: 'ai',
      text: isAr
        ? `مرحباً! أنا مساعد الذكاء الاصطناعي الخاص بالعنصر (${
            item.type === 'text' ? 'نص' : item.type === 'img' ? 'صورة' : 'شكل'
          }). أي تعديل ستطلبه سيتم تجهيزه ومعاينته هنا أولاً، ثم سأسألك للتأكيد قبل تطبيقه على التصميم.`
        : `Hello! I'm your AI assistant for this ${item.type}. I will stage and preview any modification here first, then ask for your confirmation before applying it to the canvas.`,
    },
  ]);

  const handleSend = async (userPrompt?: string) => {
    const textToSend = userPrompt || input.trim();
    if (!textToSend || loading) return;

    setInput('');
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const lower = textToSend.toLowerCase();

      // 1. Remove Background
      if (
        item.type === 'img' &&
        (lower.includes('خلفية') ||
          lower.includes('عزل') ||
          lower.includes('تفريغ') ||
          lower.includes('background') ||
          lower.includes('cutout'))
      ) {
        if (!imageDataUrl || !item.k) throw new Error(isAr ? 'لا تتوفر صورة' : 'No image available');

        const transparentDataUrl = await removeBackgroundClient(imageDataUrl);
        const action: StagedAction = {
          type: 'image',
          summary: isAr ? 'عزل وحذف خلفية الصورة' : 'Remove background',
          previewData: {
            imageThumbnail: transparentDataUrl,
          },
          apply: () => {
            onUpdateImage(item.k!, transparentDataUrl);
          },
        };

        setStagedAction(action);
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: 'ai',
            text: isAr
              ? '✨ تم تجهيز عزل الخلفية بنجاح في المعاينة أدناه. هل أطبق هذا التعديل على التصميم؟'
              : '✨ Background cutout prepared below! Shall I apply it to your canvas?',
            stagedAction: action,
          },
        ]);
      }

      // 2. Magic Slices Tool
      else if (
        item.type === 'img' &&
        (lower.includes('شرائح') ||
          lower.includes('قسم') ||
          lower.includes('سلايس') ||
          lower.includes('slice'))
      ) {
        if (!imageDataUrl) throw new Error(isAr ? 'لا تتوفر صورة للتقسيم' : 'No image to slice');
        const rows = lower.includes('3') ? 3 : 2;
        const cols = lower.includes('3') ? 3 : 2;
        const result = await splitImageIntoSlices(item, imageDataUrl, rows, cols);

        const action: StagedAction = {
          type: 'slices',
          summary: isAr ? `تقسيم الصورة إلى ${rows * cols} شرائح سحرية` : `Split into ${rows * cols} slices`,
          previewData: {
            slicesCount: rows * cols,
          },
          apply: () => {
            onAddMultipleItems(result.newItems, result.newImages);
          },
        };

        setStagedAction(action);
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: 'ai',
            text: isAr
              ? `✂️ تم تجهيز ${rows * cols} شرائح سحرية متفرقة كطبقات مستقلة. هل أطبق التقسيم على التصميم؟`
              : `✂️ Prepared ${rows * cols} slices ready as layers. Shall I apply to canvas?`,
            stagedAction: action,
          },
        ]);
      }

      // 3. Cartoon / Anime / Comic Generation & Transformation
      else if (
        lower.includes('كارتون') ||
        lower.includes('كرتون') ||
        lower.includes('كرتونية') ||
        lower.includes('كارتونية') ||
        lower.includes('رسوم') ||
        lower.includes('رسم') ||
        lower.includes('انمي') ||
        lower.includes('أنمي') ||
        lower.includes('cartoon') ||
        lower.includes('anime') ||
        lower.includes('comic') ||
        lower.includes('كوميك')
      ) {
        let cartoonDataUrl = '';
        const wantsTransformCurrent =
          item.type === 'img' &&
          imageDataUrl &&
          (lower.includes('حول') || lower.includes('تأثير') || lower.includes('فلتر') || lower.includes('convert'));

        if (wantsTransformCurrent && imageDataUrl) {
          cartoonDataUrl = await transformToCartoon(imageDataUrl, 26, 5);
        } else {
          // Generate customized vibrant cartoon artwork
          cartoonDataUrl = await generateCartoonArtwork(textToSend);
        }

        const action: StagedAction = {
          type: 'image',
          summary: isAr ? 'رسم وصورة كارتونية مخصصة (AI Cartoon)' : 'Cartoon Cel-Shading Artwork',
          previewData: {
            imageThumbnail: cartoonDataUrl,
          },
          apply: () => {
            if (item.type === 'img' && item.k) {
              onUpdateImage(item.k, cartoonDataUrl);
            } else {
              const newKey = 'i' + Date.now();
              onUpdateImage(newKey, cartoonDataUrl);
              onAddMultipleItems(
                [
                  {
                    id: Date.now(),
                    type: 'img',
                    k: newKey,
                    name: isAr ? 'شخصية ورسم كارتوني' : 'Cartoon Artwork',
                    x: Math.max(20, Math.min(300, (item.x || 40))),
                    y: Math.max(20, Math.min(400, (item.y || 40) + (item.h || 60) + 10)),
                    w: 280,
                    h: 280,
                  },
                ],
                { [newKey]: cartoonDataUrl }
              );
            }
          },
        };

        setStagedAction(action);
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: 'ai',
            text: isAr
              ? '🎭 تم تجهيز وتوليد الصورة الكرتونية بنجاح (Cartoon Cel-Shading Artwork)! عاين النتيجة أدناه، هل ترغب في تطبيقها على التصميم؟'
              : '🎭 Cartoon illustration generated successfully below! Would you like to apply it to your canvas?',
            stagedAction: action,
          },
        ]);
        toast(isAr ? 'تم تجهيز الصورة الكرتونية ✨' : 'Cartoon ready ✨');
      }

      // 4. Colorize / Filters
      else if (
        item.type === 'img' &&
        (lower.includes('لون') ||
          lower.includes('فلتر') ||
          lower.includes('ابيض') ||
          lower.includes('دافئ') ||
          lower.includes('سينمائي') ||
          lower.includes('filter'))
      ) {
        if (!imageDataUrl || !item.k) throw new Error(isAr ? 'لا توجد صورة' : 'No image');
        let filter: 'grayscale' | 'duotone' | 'warm' | 'cool' | 'vintage' | 'vibrant' = 'vintage';
        if (lower.includes('ابيض') || lower.includes('اسود') || lower.includes('رمادي') || lower.includes('bw'))
          filter = 'grayscale';
        else if (lower.includes('دافئ') || lower.includes('warm')) filter = 'warm';
        else if (lower.includes('بارد') || lower.includes('cool')) filter = 'cool';
        else if (lower.includes('حيوي') || lower.includes('vibrant')) filter = 'vibrant';
        else if (lower.includes('دويتون') || lower.includes('duotone')) filter = 'duotone';

        const filtered = await applyImageFilter(imageDataUrl, filter);
        const action: StagedAction = {
          type: 'image',
          summary: isAr ? `تطبيق فلتر (${filter})` : `Apply (${filter}) filter`,
          previewData: {
            imageThumbnail: filtered,
          },
          apply: () => {
            onUpdateImage(item.k!, filtered);
          },
        };

        setStagedAction(action);
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: 'ai',
            text: isAr
              ? `🎨 تم تجهيز فلتر النمط (${filter}) للمعاينة. هل ترغب بتطبيقه على التصميم؟`
              : `🎨 Prepared (${filter}) filter in preview. Apply to canvas?`,
            stagedAction: action,
          },
        ]);
      }

      // 4. Text Rewriting & Enhancements
      else if (item.type === 'text') {
        const currentText = item.text || '';
        let proposedText = currentText;

        if (lower.includes('تسويق') || lower.includes('marketing') || lower.includes('جذب')) {
          proposedText = isAr
            ? `✨ ${currentText.replace(/^[✨\s]+/, '')} — الحل الأمثل لابتكار استثنائي وتجربة لا تُنسى`
            : `✨ ${currentText} — Elevate your brand with precision and impact`;
        } else if (lower.includes('اختصر') || lower.includes('short') || lower.includes('قصير')) {
          proposedText = currentText.split('\n')[0].split(' ').slice(0, 5).join(' ');
        } else if (lower.includes('صحفي') || lower.includes('journalism') || lower.includes('مانشيت')) {
          proposedText = isAr ? `تقرير خاص وموسع: ${currentText}` : `Special Report: ${currentText}`;
        } else if (lower.includes('تدقيق') || lower.includes('grammar') || lower.includes('نحو')) {
          proposedText = currentText.replace(/إ/g, 'إ').replace(/ى/g, 'ي').trim();
        } else {
          proposedText = isAr ? `${currentText} | تميز ملهم وإبداع متجدد` : `${currentText} | Inspiring Excellence`;
        }

        const action: StagedAction = {
          type: 'text',
          summary: isAr ? 'إعادة صياغة النص' : 'Rewrite text',
          previewData: {
            originalText: currentText,
            newText: proposedText,
          },
          apply: () => {
            onUpdateItem({ text: proposedText });
          },
        };

        setStagedAction(action);
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: 'ai',
            text: isAr
              ? '✍️ تم اقتراح الصياغة الجديدة أدناه. هل أعتمدها وأطبقها على التصميم؟'
              : '✍️ Proposed phrasing generated below. Apply to canvas?',
            stagedAction: action,
          },
        ]);
      }

      // 5. Shapes / Colors
      else {
        const palette = ['#d81b79', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#0f172a'];
        const chosen = palette[Math.floor(Math.random() * palette.length)];
        const action: StagedAction = {
          type: 'color',
          summary: isAr ? `تغيير اللون إلى ${chosen}` : `Change color to ${chosen}`,
          previewData: {
            colorSwatch: chosen,
          },
          apply: () => {
            onUpdateItem({ color: chosen });
          },
        };

        setStagedAction(action);
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: 'ai',
            text: isAr
              ? `🎨 تم اختيار اللون المقترح (${chosen}). هل أطبقه على العنصر في التصميم؟`
              : `🎨 Suggested color (${chosen}) ready. Apply to canvas?`,
            stagedAction: action,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: `⚠️ ${err?.message || (isAr ? 'تعذر معالجة الطلب' : 'Failed to process request')}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const confirmStagedAction = () => {
    if (!stagedAction) return;
    stagedAction.apply();
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: 'ai',
        text: isAr ? '✅ تم تطبيق التعديل على التصميم بنجاح!' : '✅ Modification applied to canvas!',
      },
    ]);
    setStagedAction(null);
    toast(isAr ? 'تم تطبيق التعديل بنجاح' : 'Applied successfully');
  };

  const cancelStagedAction = () => {
    setStagedAction(null);
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: 'ai',
        text: isAr ? '❌ تم إلغاء التعديل والاحتفاظ بالحالة السابقة.' : '❌ Discarded. Previous state kept.',
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[500px] max-h-[75vh]">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--bd)] text-xs text-[var(--mut)]">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--fg)]">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>{isAr ? 'مساعد الذكاء الاصطناعي مع تأكيد المعاينة' : 'AI Assistant with Preview Confirm'}</span>
        </div>
        <span>
          #{item.id} ({item.type})
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-start' : 'items-end'}`}>
            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed space-y-2 ${
                m.sender === 'user'
                  ? 'bg-[var(--ac)] text-[var(--acf)] rounded-tr-sm'
                  : 'bg-[var(--row)] text-[var(--fg)] border border-[var(--bd)] rounded-tl-sm'
              }`}
            >
              <div>{m.text}</div>

              {/* In-box Visual Preview */}
              {m.stagedAction && (
                <div className="mt-2 p-2.5 rounded-xl bg-[var(--bar)] border border-[var(--bd)] space-y-2">
                  <div className="text-[11px] font-bold text-[var(--mut)]">
                    {isAr ? 'معاينة التعديل المقترح:' : 'Proposed Edit Preview:'}
                  </div>

                  {/* Text Before/After */}
                  {m.stagedAction.previewData?.newText && (
                    <div className="space-y-1 text-xs">
                      <div className="text-[10px] text-rose-500 line-through opacity-75">
                        {m.stagedAction.previewData.originalText}
                      </div>
                      <div className="font-semibold text-emerald-600 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                        {m.stagedAction.previewData.newText}
                      </div>
                    </div>
                  )}

                  {/* Image Thumbnail */}
                  {m.stagedAction.previewData?.imageThumbnail && (
                    <div className="flex justify-center p-1 bg-black/5 rounded-lg">
                      <img
                        src={m.stagedAction.previewData.imageThumbnail}
                        alt="Preview"
                        className="h-24 max-w-full object-contain rounded"
                      />
                    </div>
                  )}

                  {/* Slices Info */}
                  {m.stagedAction.previewData?.slicesCount && (
                    <div className="text-xs font-semibold text-[var(--ac)]">
                      {isAr
                        ? `✂️ شبكة مقسمة إلى ${m.stagedAction.previewData.slicesCount} طبقات منفصلة`
                        : `✂️ Split grid into ${m.stagedAction.previewData.slicesCount} layers`}
                    </div>
                  )}

                  {/* Color Swatch */}
                  {m.stagedAction.previewData?.colorSwatch && (
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-md border border-[var(--bd)] shadow-sm"
                        style={{ background: m.stagedAction.previewData.colorSwatch }}
                      />
                      <span className="text-xs font-mono">{m.stagedAction.previewData.colorSwatch}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--mut)] py-1">
            <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--ac)] border-t-transparent rounded-full animate-spin" />
            <span>{isAr ? 'الذكاء الاصطناعي يجهز المعاينة في البوكس...' : 'AI generating preview...'}</span>
          </div>
        )}
      </div>

      {/* Confirmation Staging Bar (YES / NO) */}
      {stagedAction && (
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-2 mb-2 animate-in slide-in-from-bottom-2">
          <div className="text-xs font-bold text-blue-700 dark:text-blue-300 truncate">
            {isAr ? 'هل أطبق التعديل على التصميم؟' : 'Apply to canvas?'}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={confirmStagedAction}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
            >
              {isAr ? '✅ نعم، تطبيق' : '✅ Yes, Apply'}
            </button>
            <button
              onClick={cancelStagedAction}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm"
            >
              {isAr ? '❌ لا، إلغاء' : '❌ No, Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Chips */}
      <div className="py-2 flex items-center gap-1.5 overflow-x-auto border-t border-[var(--bd)] scrollbar-none">
        {item.type === 'img' && (
          <>
            <button
              className="ps-btn text-[11px] py-1 px-2.5 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/15 text-orange-600 border border-orange-400/30 font-bold"
              onClick={() => handleSend(isAr ? 'حول هذه الصورة إلى كارتون' : 'Convert image to cartoon')}
            >
              🎭 {isAr ? 'تحويل لكارتون' : 'Cartoonize'}
            </button>
            <button
              className="ps-btn text-[11px] py-1 px-2.5 rounded-full bg-[var(--row)]"
              onClick={() => handleSend(isAr ? 'احذف الخلفية واعزل العنصر' : 'Remove background')}
            >
              ✨ {isAr ? 'حذف الخلفية' : 'Cutout BG'}
            </button>
            <button
              className="ps-btn text-[11px] py-1 px-2.5 rounded-full bg-[var(--row)]"
              onClick={() => handleSend(isAr ? 'قسم الصورة لشرائح سحرية 2×2' : 'Split 2x2 slices')}
            >
              ✂️ {isAr ? 'شرائح سحرية 2×2' : 'Slices 2x2'}
            </button>
            <button
              className="ps-btn text-[11px] py-1 px-2.5 rounded-full bg-[var(--row)]"
              onClick={() => handleSend(isAr ? 'طبق فلتر دافئ' : 'Warm filter')}
            >
              🎨 {isAr ? 'فلتر دافئ' : 'Warm'}
            </button>
            <button
              className="ps-btn text-[11px] py-1 px-2.5 rounded-full bg-[var(--row)]"
              onClick={() => handleSend(isAr ? 'حول لأبيض وأسود' : 'B&W')}
            >
              🖤 {isAr ? 'أبيض وأسود' : 'B&W'}
            </button>
          </>
        )}

        {item.type === 'text' && (
          <>
            <button
              className="ps-btn text-[11px] py-1 px-2.5 rounded-full bg-gradient-to-r from-blue-500/15 to-indigo-500/15 text-blue-600 border border-blue-400/30 font-bold"
              onClick={() => handleSend(isAr ? 'تعمل صورة كارتونية ملونة' : 'Create cartoon illustration')}
            >
              🎭 {isAr ? 'توليد صورة كارتونية' : 'Cartoon Art'}
            </button>
            <button
              className="ps-btn text-[11px] py-1 px-2.5 rounded-full bg-[var(--row)]"
              onClick={() => handleSend(isAr ? 'أعد صياغة النص بأسلوب تسويقي جذاب' : 'Marketing tone')}
            >
              ✨ {isAr ? 'أسلوب تسويقي' : 'Marketing'}
            </button>
            <button
              className="ps-btn text-[11px] py-1 px-2.5 rounded-full bg-[var(--row)]"
              onClick={() => handleSend(isAr ? 'اختصر النص' : 'Shorten text')}
            >
              ✂️ {isAr ? 'اختصار' : 'Shorten'}
            </button>
            <button
              className="ps-btn text-[11px] py-1 px-2.5 rounded-full bg-[var(--row)]"
              onClick={() => handleSend(isAr ? 'دقق الأخطاء لغوياً ونحوياً' : 'Fix grammar')}
            >
              📝 {isAr ? 'تدقيق لغوي' : 'Grammar'}
            </button>
          </>
        )}

        {item.type !== 'img' && item.type !== 'text' && (
          <>
            <button
              className="ps-btn text-[11px] py-1 px-2.5 rounded-full bg-gradient-to-r from-blue-500/15 to-indigo-500/15 text-blue-600 border border-blue-400/30 font-bold"
              onClick={() => handleSend(isAr ? 'تعمل صورة كارتونية ملونة' : 'Create cartoon artwork')}
            >
              🎭 {isAr ? 'توليد رسم كارتوني' : 'Cartoon Artwork'}
            </button>
            <button
              className="ps-btn text-[11px] py-1 px-2.5 rounded-full bg-[var(--row)]"
              onClick={() => handleSend(isAr ? 'اقترح لوناً متناسقاً' : 'Suggest color')}
            >
              🎨 {isAr ? 'اقتراح لون متناسق' : 'Suggest color'}
            </button>
          </>
        )}
      </div>

      {/* Input Form */}
      <div className="flex gap-2 pt-2 border-t border-[var(--bd)]">
        <input
          type="text"
          placeholder={
            isAr
              ? 'اكتب طلبك للذكاء الاصطناعي (مثل: احذف الخلفية، حسّن النص...)'
              : 'Ask AI (e.g., remove background, enhance copy...)'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="ps-input flex-1 text-xs"
        />
        <button
          className="ps-btn ps-btn-primary py-1 px-4 text-xs font-bold"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
        >
          {isAr ? 'إرسال 🚀' : 'Send 🚀'}
        </button>
      </div>
    </div>
  );
}
