/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { kvGet, kvSet } from '../services/storage';
import React, { useState, useEffect } from 'react';
import { DocData, Item, DeveloperTemplate } from '../types/printStudio';

interface DeveloperTemplateModalProps {
  currentPageItems: Item[];
  doc: DocData;
  onClose: () => void;
  toast: (msg: string) => void;
}

export function DeveloperTemplateModal({
  currentPageItems,
  doc,
  onClose,
  toast,
}: DeveloperTemplateModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'magazines' | 'newspapers' | 'identity' | 'posters' | 'custom'>('magazines');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('المطور');
  const [templatesList, setTemplatesList] = useState<DeveloperTemplate[]>([]);

  useEffect(() => {
    kvGet<DeveloperTemplate[]>('ps_dev_templates')
      .then((v) => {
        if (Array.isArray(v)) setTemplatesList(v);
      })
      .catch(() => {});
  }, []);

  const persistTemplates = async (list: DeveloperTemplate[]) => {
    try {
      await kvSet('ps_dev_templates', list);
      window.dispatchEvent(new Event('ps-templates-changed'));
      return true;
    } catch (_) {
      toast('⚠ تعذّر حفظ القوالب (المساحة ممتلئة). صدّر القوالب كملف.');
      return false;
    }
  };

  const handleSaveCurrentAsTemplate = () => {
    if (!title.trim()) {
      toast('يرجى كتابة عنوان للقالب');
      return;
    }
    if (currentPageItems.length === 0) {
      toast('الصفحة الحالية فارغة! أضف عناصر أولاً لحفظها كقالب');
      return;
    }

    const cleanItems = JSON.parse(JSON.stringify(currentPageItems));
    const newTemplate: DeveloperTemplate = {
      id: `dev_tpl_${Date.now()}`,
      title: title.trim(),
      category,
      description: description.trim() || 'قالب احترافي معتمد من المطور',
      previewBg: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      size: doc.size,
      items: cleanItems,
      author: author.trim() || 'المطور',
      createdAt: Date.now(),
    };

    const updated = [newTemplate, ...templatesList];
    persistTemplates(updated).then((okSaved) => {
      if (!okSaved) return;
      setTemplatesList(updated);
      setTitle('');
      setDescription('');
      toast(`تم تسجيل القالب «${newTemplate.title}» كقالب ثابت في البرنامج بنجاح!`);
    });
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templatesList.filter((t) => t.id !== id);
    persistTemplates(updated).then((okSaved) => {
      if (!okSaved) return;
      setTemplatesList(updated);
      toast('تم حذف القالب المعتمد');
    });
  };

  const handleExportTemplates = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(templatesList, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'developer_templates_bundle.json';
    a.click();
    toast('تم تنزيل حزمة قوالب المطور');
  };

  return (
    <div className="sheet-backdrop z-50 flex items-center justify-center p-3">
      <div className="bg-[var(--bar)] border border-[var(--bd)] shadow-2xl rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--bd)] font-bold text-sm">
          <div className="flex items-center gap-2">
            <span>🛠️</span>
            <span>استوديو قوالب المطور (Developer Template Studio)</span>
          </div>
          <button onClick={onClose} className="text-xs text-[var(--mut)] hover:text-[var(--fg)] p-1">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-4">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
            👑 بصفتك مطور البرنامج، يمكنك تحويل التصميم النشط حالياً إلى قالب رسمي وثابت يظهر لجميع المستخدمين في تبويب القوالب!
          </div>

          {/* Form to Save Current Page */}
          <div className="space-y-3 bg-[var(--row)] p-4 rounded-xl border border-[var(--bd)]">
            <h4 className="text-xs font-bold text-[var(--fg)]">حفظ تصميم الصفحة الحالية كقالب معتمد:</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[var(--mut)] block mb-1">عنوان القالب:</label>
                <input
                  type="text"
                  placeholder="مثال: غلاف مجلة العلوم الحديثة..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="ps-input w-full text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-[var(--mut)] block mb-1">القسم والتصنيف:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="ps-select w-full text-xs bg-[var(--bar)]"
                >
                  <option value="magazines">أغلفة المجلات (Magazines)</option>
                  <option value="newspapers">الصحف والجرائد (Newspapers)</option>
                  <option value="identity">بطاقات العمل والهوية (Identity)</option>
                  <option value="posters">البوسترات والإعلانات (Posters)</option>
                  <option value="custom">قوالب مخصصة (Custom)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[var(--mut)] block mb-1">وصف القالب ومميزاته:</label>
              <input
                type="text"
                placeholder="شرح موجز لمحتوى القالب والاستخدام الأنسب..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="ps-input w-full text-xs"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveCurrentAsTemplate}
                className="ps-btn ps-btn-primary text-xs py-1.5 px-4 font-bold"
              >
                + اعتماد القالب وحفظه في البرنامج
              </button>
            </div>
          </div>

          {/* List of Registered Developer Templates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--fg)]">
                القوالب المعتمدة المسجلة ({templatesList.length})
              </span>
              {templatesList.length > 0 && (
                <button
                  onClick={handleExportTemplates}
                  className="text-[11px] text-[var(--ac)] hover:underline font-semibold"
                >
                  📥 تصدير حزمة القوالب (.json)
                </button>
              )}
            </div>

            {templatesList.length === 0 ? (
              <div className="text-xs text-[var(--mut)] text-center py-4 bg-[var(--row)] rounded-xl border border-[var(--bd)]">
                لم يتم تسجيل قوالب مطور مخصصة بعد. احفظ تصميمك الحالي الآن!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {templatesList.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-2.5 rounded-xl bg-[var(--row)] border border-[var(--bd)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[var(--fg)]">{tpl.title}</div>
                      <div className="text-[10px] text-[var(--mut)]">
                        قسم: {tpl.category} · مقاس: {tpl.size} · {tpl.items.length} عنصر
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="text-rose-500 hover:bg-rose-500/10 p-1 rounded text-xs"
                      title="حذف"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--bd)] bg-[var(--row)] flex justify-end">
          <button className="ps-btn text-xs py-1.5 px-4" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
