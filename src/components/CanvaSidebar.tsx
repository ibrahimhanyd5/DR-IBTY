/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DocData, Item, SavedProject, DeveloperTemplate } from '../types/printStudio';
import { TEMPLATE_CATEGORIES } from '../services/templatesData';
import { STOCK_PHOTOS, StockPhoto } from '../services/stockMedia';
import { STOCK_ICONS, AVAILABLE_FONTS, loadGoogleFont } from '../services/iconsFonts';
import { Language, getT } from '../services/i18n';

interface CanvaSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: 'templates' | 'elements' | 'typography' | 'photos' | 'iconsFonts' | 'layers' | 'projects';
  onTabChange: (tab: 'templates' | 'elements' | 'typography' | 'photos' | 'iconsFonts' | 'layers' | 'projects') => void;
  doc: DocData;
  currentPageItems: Item[];
  selectedItemId: number | null;
  onSelectItem: (id: number) => void;
  onAddItem: (item: Partial<Item>) => void;
  onDeleteItem: (id: number) => void;
  onDuplicateItem?: (id: number) => void;
  onApplyTemplate: (items: Item[]) => void;
  onUpdateItems: (callback: (items: Item[]) => Item[]) => void;
  onSaveProject: (name: string) => void;
  savedProjects: SavedProject[];
  onLoadProject: (proj: SavedProject) => void;
  onDeleteProject: (id: string) => void;
  onExportMobileFile: () => void;
  onOpenDeveloperStudio: () => void;
  lastAutoSavedTime: string;
  toast: (m: string) => void;
  lang: Language;
  onUploadImageClick: () => void;
}

export function CanvaSidebar({
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  doc,
  currentPageItems,
  selectedItemId,
  onSelectItem,
  onAddItem,
  onDeleteItem,
  onDuplicateItem,
  onApplyTemplate,
  onUpdateItems,
  onSaveProject,
  savedProjects,
  onLoadProject,
  onDeleteProject,
  onExportMobileFile,
  onOpenDeveloperStudio,
  lastAutoSavedTime,
  toast,
  lang,
  onUploadImageClick,
}: CanvaSidebarProps) {
  const t = getT(lang);
  const isAr = lang === 'ar';

  const [selectedCategory, setSelectedCategory] = useState<string>('magazines');
  const [newProjectName, setNewProjectName] = useState<string>('');

  // Photos Tab Search & Category
  const [photoSearch, setPhotoSearch] = useState<string>('');
  const [photoCategory, setPhotoCategory] = useState<string>('all');

  // Icons Tab Search
  const [iconSearch, setIconSearch] = useState<string>('');

  // Custom Font Input
  const [customFontInput, setCustomFontInput] = useState<string>('');

  // Editing layer name inline
  const [editingLayerId, setEditingLayerId] = useState<number | null>(null);
  const [editingLayerName, setEditingLayerName] = useState<string>('');

  // Registered Developer Templates loaded from storage
  const [devTemplates, setDevTemplates] = useState<DeveloperTemplate[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('ps_dev_templates');
      if (stored) {
        setDevTemplates(JSON.parse(stored));
      }
    } catch (_) {}
  }, [isOpen]);

  // Handle Layer Reordering
  const moveLayer = (itemId: number, direction: 'up' | 'down') => {
    onUpdateItems((items) => {
      const arr = [...items];
      const idx = arr.findIndex((x) => x.id === itemId);
      if (idx === -1) return arr;
      const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= arr.length) return arr;

      const [moved] = arr.splice(idx, 1);
      arr.splice(targetIdx, 0, moved);
      return arr;
    });
  };

  // Group Selected Items or Create New Group
  const handleGroupSelected = () => {
    if (!selectedItemId) {
      toast(isAr ? 'حدد عنصراً أولاً لتجميعه' : 'Select an item first to group');
      return;
    }
    const groupId = `grp_${Date.now()}`;
    onUpdateItems((items) =>
      items.map((x) => (x.id === selectedItemId ? { ...x, groupId, name: isAr ? 'مجموعة مجمعة' : 'Grouped Item' } : x))
    );
    toast(isAr ? 'تم ضم العنصر لمجموعة جديدة' : 'Item grouped');
  };

  const handleUngroup = (itemId: number) => {
    onUpdateItems((items) =>
      items.map((x) => (x.id === itemId ? { ...x, groupId: undefined } : x))
    );
    toast(isAr ? 'تم فك التجميع' : 'Ungrouped');
  };

  // Save renamed layer
  const saveLayerName = (itemId: number) => {
    if (editingLayerName.trim()) {
      onUpdateItems((items) =>
        items.map((x) => (x.id === itemId ? { ...x, name: editingLayerName.trim() } : x))
      );
    }
    setEditingLayerId(null);
  };

  // Handle adding stock image
  const handleAddStockPhoto = (photo: StockPhoto) => {
    onAddItem({
      type: 'img',
      k: photo.url, // URL as key or direct src
      name: isAr ? photo.title : photo.titleEn,
      w: doc.w * 0.5,
      h: doc.w * 0.4,
    });
    toast(isAr ? `تمت إضافة صورة ${photo.title}` : `Added ${photo.titleEn}`);
  };

  // Handle adding custom SVG icon
  const handleAddIcon = (icon: typeof STOCK_ICONS[0]) => {
    onAddItem({
      type: 'path',
      name: isAr ? icon.name : icon.nameEn,
      w: 48,
      h: 48,
      pw: 24,
      ph: 24,
      sw: 2,
      color: '#d81b79',
      pts: [[2, 2], [22, 22]], // Fallback points
    });
    toast(isAr ? `تمت إضافة أيقونة ${icon.name}` : `Added ${icon.nameEn}`);
  };

  // Filtered Stock Photos
  const filteredPhotos = STOCK_PHOTOS.filter((p) => {
    const matchesCat = photoCategory === 'all' || p.category === photoCategory;
    const term = photoSearch.trim().toLowerCase();
    const matchesSearch =
      !term ||
      p.title.toLowerCase().includes(term) ||
      p.titleEn.toLowerCase().includes(term) ||
      p.tags.some((tag) => tag.toLowerCase().includes(term));
    return matchesCat && matchesSearch;
  });

  // Filtered Icons
  const filteredIcons = STOCK_ICONS.filter((ic) => {
    const term = iconSearch.trim().toLowerCase();
    return !term || ic.name.toLowerCase().includes(term) || ic.nameEn.toLowerCase().includes(term);
  });

  // Tab click toggle: opens drawer if closed, or retracts inside if clicking the active tab
  const handleTabClick = (tab: typeof activeTab) => {
    if (isOpen && activeTab === tab) {
      onToggle();
    } else {
      onTabChange(tab);
      if (!isOpen) {
        onToggle();
      }
    }
  };

  return (
    <aside className={`bg-[var(--bar)] border-l border-[var(--bd)] flex shrink-0 z-20 shadow-lg h-full overflow-hidden transition-all duration-300 ease-in-out max-md:absolute max-md:inset-y-0 max-md:start-0 ${isOpen ? '' : 'max-md:hidden'}`}>
      {/* Icon Rail Navigation - Always docked */}
      <div className="w-14 md:w-16 bg-[var(--row)] border-l border-[var(--bd)] flex flex-col items-center py-2.5 gap-1.5 shrink-0 z-20">
        <button
          onClick={() => handleTabClick('templates')}
          className={`w-12 h-11 flex flex-col items-center justify-center rounded-xl text-[10px] gap-0.5 transition-all ${
            isOpen && activeTab === 'templates'
              ? 'bg-[var(--ac)] text-[var(--acf)] font-bold shadow-sm'
              : 'text-[var(--mut)] hover:bg-[var(--bd)] hover:text-[var(--fg)]'
          }`}
          title={t('templatesTab')}
        >
          <span className="text-sm leading-none">❖</span>
          <span className="truncate">{t('templatesTab')}</span>
        </button>

        <button
          onClick={() => handleTabClick('photos')}
          className={`w-12 h-11 flex flex-col items-center justify-center rounded-xl text-[10px] gap-0.5 transition-all ${
            isOpen && activeTab === 'photos'
              ? 'bg-[var(--ac)] text-[var(--acf)] font-bold shadow-sm'
              : 'text-[var(--mut)] hover:bg-[var(--bd)] hover:text-[var(--fg)]'
          }`}
          title={t('photosTab')}
        >
          <span className="text-sm leading-none">🖼️</span>
          <span className="truncate">{t('photosTab')}</span>
        </button>

        <button
          onClick={() => handleTabClick('elements')}
          className={`w-12 h-11 flex flex-col items-center justify-center rounded-xl text-[10px] gap-0.5 transition-all ${
            isOpen && activeTab === 'elements'
              ? 'bg-[var(--ac)] text-[var(--acf)] font-bold shadow-sm'
              : 'text-[var(--mut)] hover:bg-[var(--bd)] hover:text-[var(--fg)]'
          }`}
          title={t('elementsTab')}
        >
          <span className="text-sm leading-none">⬚</span>
          <span className="truncate">{t('elementsTab')}</span>
        </button>

        <button
          onClick={() => handleTabClick('typography')}
          className={`w-12 h-11 flex flex-col items-center justify-center rounded-xl text-[10px] gap-0.5 transition-all ${
            isOpen && activeTab === 'typography'
              ? 'bg-[var(--ac)] text-[var(--acf)] font-bold shadow-sm'
              : 'text-[var(--mut)] hover:bg-[var(--bd)] hover:text-[var(--fg)]'
          }`}
          title={t('typographyTab')}
        >
          <span className="text-sm leading-none">T</span>
          <span className="truncate">{t('typographyTab')}</span>
        </button>

        <button
          onClick={() => handleTabClick('iconsFonts')}
          className={`w-12 h-11 flex flex-col items-center justify-center rounded-xl text-[10px] gap-0.5 transition-all ${
            isOpen && activeTab === 'iconsFonts'
              ? 'bg-[var(--ac)] text-[var(--acf)] font-bold shadow-sm'
              : 'text-[var(--mut)] hover:bg-[var(--bd)] hover:text-[var(--fg)]'
          }`}
          title={t('iconsFontsTab')}
        >
          <span className="text-sm leading-none">✦</span>
          <span className="truncate">{isAr ? 'أيقونات' : 'Icons'}</span>
        </button>

        <button
          onClick={() => handleTabClick('layers')}
          className={`w-12 h-11 flex flex-col items-center justify-center rounded-xl text-[10px] gap-0.5 transition-all ${
            isOpen && activeTab === 'layers'
              ? 'bg-[var(--ac)] text-[var(--acf)] font-bold shadow-sm'
              : 'text-[var(--mut)] hover:bg-[var(--bd)] hover:text-[var(--fg)]'
          }`}
          title={t('layersTab')}
        >
          <span className="text-sm leading-none">☰</span>
          <span className="truncate">{t('layersTab')}</span>
        </button>

        <button
          onClick={() => handleTabClick('projects')}
          className={`w-12 h-11 flex flex-col items-center justify-center rounded-xl text-[10px] gap-0.5 transition-all ${
            isOpen && activeTab === 'projects'
              ? 'bg-[var(--ac)] text-[var(--acf)] font-bold shadow-sm'
              : 'text-[var(--mut)] hover:bg-[var(--bd)] hover:text-[var(--fg)]'
          }`}
          title={t('projectsTab')}
        >
          <span className="text-sm leading-none">💾</span>
          <span className="truncate">{isAr ? 'مشاريعي' : 'Files'}</span>
        </button>

        <div className="mt-auto flex flex-col gap-1 items-center">
          {/* Toggle / Retract button */}
          <button
            onClick={onToggle}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bd)] text-xs text-[var(--mut)] transition-transform duration-200"
            title={isOpen ? (isAr ? 'طي الشريط للداخل' : 'Slide Inside') : (isAr ? 'إخراج الشريط' : 'Slide Out')}
          >
            {isOpen ? (isAr ? '›' : '‹') : (isAr ? '‹' : '›')}
          </button>
        </div>
      </div>

      {/* Main Drawer Content - Smooth slide in and retract */}
      <div
        className={`h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen
            ? 'w-[min(72vw,20rem)] md:w-80 opacity-100 pointer-events-auto'
            : 'w-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-[min(72vw,20rem)] md:w-80 h-full flex flex-col overflow-hidden shrink-0">
        {/* Tab 1: Templates (قوالب) */}
        {activeTab === 'templates' && (
          <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">{isAr ? 'مكتبة القوالب الاحترافية' : 'Template Catalog'}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenDeveloperStudio}
                  className="text-[10px] font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-md hover:bg-purple-500/20"
                  title="إدارة قوالب المطور"
                >
                  👑 {t('devTemplates')}
                </button>
                <button
                  onClick={onToggle}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--bd)] text-xs text-[var(--mut)]"
                  title={isAr ? 'طي الشريط للداخل' : 'Collapse drawer'}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Category pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-[var(--ac)] text-[var(--acf)] font-semibold'
                      : 'bg-[var(--row)] text-[var(--mut)] hover:text-[var(--fg)]'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            {/* Template Cards */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
              {/* Show Developer Templates in this category if any */}
              {devTemplates
                .filter((d) => d.category === selectedCategory || selectedCategory === 'custom')
                .map((devTmpl) => (
                  <div
                    key={devTmpl.id}
                    onClick={() => {
                      onApplyTemplate(devTmpl.items);
                      toast(`تم تطبيق ${devTmpl.title}`);
                    }}
                    className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[var(--fg)]">{devTmpl.title}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-600 text-white font-semibold">
                        قالب معتمد 👑
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--mut)] line-clamp-2">{devTmpl.description}</div>
                  </div>
                ))}

              {TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory)?.items.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    const generated = tmpl.generator(doc.w, doc.h);
                    onApplyTemplate(generated);
                    toast(`تم تطبيق ${tmpl.title}`);
                  }}
                  className="p-3 rounded-xl border border-[var(--bd)] hover:border-[var(--ac)] bg-[var(--row)] hover:bg-[var(--bd)] cursor-pointer transition-all group"
                >
                  <div
                    className="h-24 rounded-lg mb-2 flex items-center justify-center text-xs font-bold text-white shadow-inner p-2 text-center"
                    style={{ background: tmpl.previewBg }}
                  >
                    <span>{tmpl.title}</span>
                  </div>
                  <div className="font-semibold text-xs text-[var(--fg)]">{tmpl.title}</div>
                  <div className="text-[11px] text-[var(--mut)] line-clamp-2 mt-0.5 leading-relaxed">
                    {tmpl.description}
                  </div>
                  <div className="mt-2 text-[10px] text-[var(--ac)] font-bold group-hover:underline">
                    {isAr ? 'تطبيق على الصفحة الحالية ←' : 'Apply to page ←'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Photos & Media (صور) */}
        {activeTab === 'photos' && (
          <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">{isAr ? 'مكتبة الصور والوسائط' : 'Stock Photos & Media'}</span>
              <button
                onClick={onUploadImageClick}
                className="ps-btn ps-btn-primary text-[10px] py-1 px-2.5 font-bold"
              >
                + {t('uploadFromDevice')}
              </button>
            </div>

            {/* Search Input for Photos */}
            <input
              type="text"
              placeholder={t('searchPhotosPlaceholder')}
              value={photoSearch}
              onChange={(e) => setPhotoSearch(e.target.value)}
              className="ps-input w-full text-xs"
            />

            {/* Photo Category Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {[
                { id: 'all', label: t('photoCatAll') },
                { id: 'celebrities', label: t('photoCatCelebrities') },
                { id: 'business', label: t('photoCatBusiness') },
                { id: 'architecture', label: t('photoCatArchitecture') },
                { id: 'food', label: t('photoCatFood') },
                { id: 'textures', label: t('photoCatTextures') },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setPhotoCategory(c.id)}
                  className={`px-2 py-0.5 rounded-md whitespace-nowrap ${
                    photoCategory === c.id
                      ? 'bg-[var(--ac)] text-[var(--acf)] font-semibold'
                      : 'bg-[var(--row)] text-[var(--mut)]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Photos Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-0.5">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => handleAddStockPhoto(photo)}
                  className="rounded-xl overflow-hidden border border-[var(--bd)] hover:border-[var(--ac)] bg-[var(--row)] cursor-pointer group flex flex-col"
                >
                  <div className="h-24 bg-neutral-900 overflow-hidden relative">
                    <img
                      src={photo.url}
                      alt={photo.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold">
                      + {isAr ? 'إدراج' : 'Insert'}
                    </div>
                  </div>
                  <div className="p-1.5 text-[11px] font-semibold text-[var(--fg)] truncate">
                    {isAr ? photo.title : photo.titleEn}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Elements & Shapes (عناصر) */}
        {activeTab === 'elements' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <div>
              <span className="font-bold text-xs block mb-2">{isAr ? 'أشكال هندسية وإطارات' : 'Shapes & Frames'}</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    onAddItem({
                      type: 'rect',
                      w: doc.w * 0.4,
                      h: doc.h * 0.12,
                      color: '#d81b79',
                    })
                  }
                  className="p-2.5 rounded-xl bg-[var(--row)] hover:bg-[var(--bd)] border border-[var(--bd)] text-xs flex flex-col items-center gap-1.5"
                >
                  <span className="w-8 h-5 bg-[#d81b79] rounded-sm block" />
                  <span>{isAr ? 'مستطيل ملون' : 'Rectangle'}</span>
                </button>

                <button
                  onClick={() =>
                    onAddItem({
                      type: 'ell',
                      w: 120,
                      h: 120,
                      color: '#0284c7',
                    })
                  }
                  className="p-2.5 rounded-xl bg-[var(--row)] hover:bg-[var(--bd)] border border-[var(--bd)] text-xs flex flex-col items-center gap-1.5"
                >
                  <span className="w-6 h-6 bg-[#0284c7] rounded-full block" />
                  <span>{isAr ? 'دائرة بصرية' : 'Circle'}</span>
                </button>

                <button
                  onClick={() =>
                    onAddItem({
                      type: 'rect',
                      w: doc.w * 0.7,
                      h: 2,
                      color: '#1e293b',
                    })
                  }
                  className="p-2.5 rounded-xl bg-[var(--row)] hover:bg-[var(--bd)] border border-[var(--bd)] text-xs flex flex-col items-center gap-1.5"
                >
                  <span className="w-8 h-0.5 bg-[#1e293b] block my-2" />
                  <span>{isAr ? 'خط فاصل صحفي' : 'Divider Line'}</span>
                </button>

                <button
                  onClick={() =>
                    onAddItem({
                      type: 'rect',
                      w: 80,
                      h: 46,
                      color: '#ffffff',
                    })
                  }
                  className="p-2.5 rounded-xl bg-[var(--row)] hover:bg-[var(--bd)] border border-[var(--bd)] text-xs flex flex-col items-center gap-1.5"
                >
                  <span className="text-xs font-mono">||||||||||||</span>
                  <span>{isAr ? 'باركود مجلة' : 'Barcode'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Typography Presets (نصوص) */}
        {activeTab === 'typography' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            <span className="font-bold text-xs block mb-1">{isAr ? 'عناوين وتنسيقات جاهزة' : 'Typography Presets'}</span>

            <button
              onClick={() =>
                onAddItem({
                  type: 'text',
                  text: isAr ? 'مانشيت صحفي عريض وبارز' : 'BOLD NEWSPAPER HEADLINE',
                  fs: 38,
                  fam: 'Cairo',
                  b: 1,
                  w: doc.w * 0.8,
                  color: '#0f172a',
                })
              }
              className="w-full p-2.5 rounded-xl bg-[var(--row)] hover:bg-[var(--bd)] border border-[var(--bd)] text-right group"
            >
              <span className="font-bold text-sm block font-['Cairo'] text-[var(--fg)]">
                {isAr ? 'مانشيت صحفي عريض' : 'Newspaper Headline'}
              </span>
              <span className="text-[10px] text-[var(--mut)]">Cairo 38pt</span>
            </button>

            <button
              onClick={() =>
                onAddItem({
                  type: 'text',
                  text: isAr ? 'تـرويـسـة الـمـجـلـة' : 'MAGAZINE MASTHEAD',
                  fs: 64,
                  fam: 'Reem Kufi',
                  b: 1,
                  a: 'center',
                  w: doc.w * 0.85,
                  color: '#ffffff',
                })
              }
              className="w-full p-2.5 rounded-xl bg-[var(--row)] hover:bg-[var(--bd)] border border-[var(--bd)] text-right group"
            >
              <span className="font-bold text-sm block font-['Reem_Kufi'] text-[var(--fg)]">
                {isAr ? 'ترويسة مجلة كوفية' : 'Magazine Masthead'}
              </span>
              <span className="text-[10px] text-[var(--mut)]">Reem Kufi 64pt</span>
            </button>

            <button
              onClick={() =>
                onAddItem({
                  type: 'text',
                  text: isAr
                    ? '«التصميم ليس مجرد ما يبدو عليه، بل هو الطريقة التي يعمل بها ببراعة.»'
                    : '"Design is not just what it looks like and feels like. Design is how it works."',
                  fs: 18,
                  fam: 'Amiri',
                  b: 1,
                  a: 'center',
                  w: doc.w * 0.75,
                  color: '#d81b79',
                })
              }
              className="w-full p-2.5 rounded-xl bg-[var(--row)] hover:bg-[var(--bd)] border border-[var(--bd)] text-right group"
            >
              <span className="font-bold text-xs block font-['Amiri'] text-[var(--fg)]">
                {isAr ? 'اقتباس تحريري' : 'Editorial Quote'}
              </span>
              <span className="text-[10px] text-[var(--mut)]">Amiri 18pt</span>
            </button>
          </div>
        )}

        {/* Tab 5: Icons & Fonts (أيقونات وخطوط) */}
        {activeTab === 'iconsFonts' && (
          <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
            <span className="font-bold text-xs">{isAr ? 'مكتبة الأيقونات والخطوط' : 'Icons & Font Hub'}</span>

            {/* Custom Google Font Loader */}
            <div className="p-2.5 rounded-xl bg-[var(--row)] border border-[var(--bd)] space-y-2">
              <span className="text-[11px] font-bold text-[var(--fg)] block">{t('addCustomFont')}</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder={t('fontNamePlaceholder')}
                  value={customFontInput}
                  onChange={(e) => setCustomFontInput(e.target.value)}
                  className="ps-input flex-1 text-xs"
                />
                <button
                  onClick={async () => {
                    if (!customFontInput.trim()) return;
                    toast(isAr ? 'جارٍ تحميل الخط...' : 'Loading font...');
                    const ok = await loadGoogleFont(customFontInput.trim());
                    if (ok) {
                      toast(isAr ? `تم تثبيت خط ${customFontInput} بنجاح!` : `Installed ${customFontInput}!`);
                      setCustomFontInput('');
                    } else {
                      toast(isAr ? 'تعذر تحميل الخط، تحقق من الاسم' : 'Failed to load font');
                    }
                  }}
                  className="ps-btn ps-btn-primary text-xs py-1 px-3 font-semibold"
                >
                  {isAr ? 'تثبيت' : 'Install'}
                </button>
              </div>
            </div>

            {/* Icons Search */}
            <input
              type="text"
              placeholder={t('searchIconsPlaceholder')}
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              className="ps-input w-full text-xs"
            />

            {/* Icons Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2 pr-0.5">
              {filteredIcons.map((ic) => (
                <button
                  key={ic.id}
                  onClick={() => handleAddIcon(ic)}
                  className="p-2 rounded-xl bg-[var(--row)] hover:bg-[var(--bd)] border border-[var(--bd)] flex flex-col items-center justify-center gap-1.5 transition-all group"
                  title={isAr ? ic.name : ic.nameEn}
                >
                  <svg
                    viewBox={ic.viewBox || '0 0 24 24'}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 text-[var(--fg)] group-hover:text-[var(--ac)] transition-colors"
                  >
                    <path d={ic.svgPath} />
                  </svg>
                  <span className="text-[10px] truncate max-w-full text-[var(--mut)]">
                    {isAr ? ic.name : ic.nameEn}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Layers Panel (الطبقات والتحكم الكامل) */}
        {activeTab === 'layers' && (
          <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-2">
            {/* Header with Title & Quick Layer Actions */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--bd)]">
              <span className="font-bold text-xs">
                {isAr ? `طبقات الصفحة (${currentPageItems.length})` : `Layers (${currentPageItems.length})`}
              </span>
              <div className="flex items-center gap-1">
                {selectedItemId && (
                  <button
                    onClick={() => onDeleteItem(selectedItemId)}
                    className="text-[10px] font-bold text-rose-600 hover:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20"
                    title={isAr ? 'حذف الطبقة المحددة 🗑️' : 'Delete Selected Layer 🗑️'}
                  >
                    🗑️ {isAr ? 'حذف المحددة' : 'Delete'}
                  </button>
                )}
                <button
                  onClick={handleGroupSelected}
                  className="text-[10px] font-semibold text-[var(--ac)] hover:bg-[var(--row)] px-2 py-0.5 rounded"
                  title={t('itemGroup')}
                >
                  📦 {isAr ? 'تجميع' : 'Group'}
                </button>
                <button
                  onClick={onToggle}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--bd)] text-xs text-[var(--mut)]"
                  title={isAr ? 'طي الشريط للداخل' : 'Collapse drawer'}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Add New Layer Toolbar (+ إضافة طبقة جديدة) */}
            <div className="flex items-center gap-1.5 p-1.5 bg-[var(--row)] rounded-xl border border-[var(--bd)] text-xs">
              <span className="text-[10px] font-bold text-[var(--mut)] shrink-0">
                + {isAr ? 'إضافة طبقة:' : 'Add Layer:'}
              </span>
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1">
                <button
                  onClick={() => {
                    onAddItem({
                      type: 'text',
                      text: isAr ? 'نص جديد' : 'New text',
                      fs: 28,
                      fam: 'Cairo',
                      color: '#14161a',
                      w: doc.w * 0.6,
                      h: 50,
                      name: isAr ? 'طبقة نصية' : 'Text Layer',
                    });
                    toast(isAr ? 'تمت إضافة طبقة نص جديدة ✍️' : 'Added new text layer ✍️');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-[var(--bar)] hover:bg-[var(--bd)] text-[11px] font-medium border border-[var(--bd)] shrink-0"
                  title={isAr ? 'إضافة طبقة نص' : 'Add text layer'}
                >
                  ✍️ {isAr ? 'نص' : 'Text'}
                </button>

                <button
                  onClick={() => {
                    onAddItem({
                      type: 'rect',
                      w: doc.w * 0.5,
                      h: 120,
                      color: '#d81b79',
                      name: isAr ? 'طبقة مستطيل' : 'Rect Layer',
                    });
                    toast(isAr ? 'تمت إضافة طبقة شكل/مستطيل ▭' : 'Added shape layer ▭');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-[var(--bar)] hover:bg-[var(--bd)] text-[11px] font-medium border border-[var(--bd)] shrink-0"
                  title={isAr ? 'إضافة طبقة شكل/مستطيل' : 'Add shape layer'}
                >
                  ▭ {isAr ? 'مستطيل' : 'Shape'}
                </button>

                <button
                  onClick={() => {
                    const rad = Math.min(doc.w, doc.h) * 0.3;
                    onAddItem({
                      type: 'ell',
                      w: rad,
                      h: rad,
                      color: '#0284c7',
                      name: isAr ? 'طبقة دائرة' : 'Circle Layer',
                    });
                    toast(isAr ? 'تمت إضافة طبقة دائرة ◯' : 'Added circle layer ◯');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-[var(--bar)] hover:bg-[var(--bd)] text-[11px] font-medium border border-[var(--bd)] shrink-0"
                  title={isAr ? 'إضافة طبقة دائرة' : 'Add circle layer'}
                >
                  ◯ {isAr ? 'دائرة' : 'Circle'}
                </button>

                <button
                  onClick={onUploadImageClick}
                  className="px-2 py-0.5 rounded-lg bg-[var(--bar)] hover:bg-[var(--bd)] text-[11px] font-medium border border-[var(--bd)] shrink-0 text-purple-600 font-bold"
                  title={isAr ? 'إدراج صورة كطبقة جديدة' : 'Add image layer'}
                >
                  🖼️ {isAr ? 'صورة' : 'Image'}
                </button>
              </div>
            </div>

            {/* Layers List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 py-1">
              {currentPageItems.length === 0 ? (
                <div className="text-xs text-[var(--mut)] text-center py-8 space-y-2">
                  <div>{isAr ? 'لا توجد طبقات في هذه الصفحة بعد.' : 'No layers on this page.'}</div>
                  <div className="text-[11px] text-[var(--ac)]">
                    {isAr ? 'اضغط على أزرار الإضافة أعلاه لإدراج أول طبقة!' : 'Click add buttons above!'}
                  </div>
                </div>
              ) : (
                [...currentPageItems].reverse().map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item.id)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                      item.id === selectedItemId
                        ? 'border-[var(--ac)] bg-[var(--row)] font-bold text-[var(--fg)] ring-1 ring-[var(--ac)]/40 shadow-sm'
                        : 'border-[var(--bd)] hover:bg-[var(--row)] text-[var(--mut)]'
                    }`}
                  >
                    {/* Layer Type Icon & Name / Inline Rename */}
                    <div className="flex items-center gap-1.5 truncate flex-1">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] bg-black/5 dark:bg-white/10 shrink-0 font-bold">
                        {item.type === 'text' ? 'T' : item.type === 'img' ? '▣' : item.type === 'ell' ? '◯' : '▭'}
                      </span>

                      {editingLayerId === item.id ? (
                        <input
                          type="text"
                          value={editingLayerName}
                          onChange={(e) => setEditingLayerName(e.target.value)}
                          onBlur={() => saveLayerName(item.id)}
                          onKeyDown={(e) => e.key === 'Enter' && saveLayerName(item.id)}
                          autoFocus
                          className="ps-input py-0 px-1 text-xs w-28 bg-[var(--bar)]"
                        />
                      ) : (
                        <span
                          onDoubleClick={() => {
                            setEditingLayerId(item.id);
                            setEditingLayerName(item.name || item.text || `عنصر #${item.id}`);
                          }}
                          className="truncate max-w-[100px] sm:max-w-[120px]"
                          title={isAr ? 'انقر مرتين لإعادة تسمية الطبقة' : 'Double click to rename'}
                        >
                          {item.name || (item.type === 'text' ? (item.text || 'نص').substring(0, 16) : `${item.type} #${item.id}`)}
                        </span>
                      )}

                      {item.groupId && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUngroup(item.id);
                          }}
                          className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 font-bold"
                          title={isAr ? 'انقر لفك التجميع' : 'Click to ungroup'}
                        >
                          مجموعة ✕
                        </span>
                      )}
                    </div>

                    {/* Layer Controls: Reorder, Duplicate, Lock, Hide, DELETE */}
                    <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Move Up */}
                      <button
                        onClick={() => moveLayer(item.id, 'up')}
                        className="p-1 hover:bg-[var(--bd)] rounded text-[10px]"
                        title={isAr ? 'للأعلى' : 'Move Up'}
                      >
                        ▲
                      </button>
                      {/* Move Down */}
                      <button
                        onClick={() => moveLayer(item.id, 'down')}
                        className="p-1 hover:bg-[var(--bd)] rounded text-[10px]"
                        title={isAr ? 'للأسفل' : 'Move Down'}
                      >
                        ▼
                      </button>

                      {/* Duplicate Layer */}
                      {onDuplicateItem && (
                        <button
                          onClick={() => onDuplicateItem(item.id)}
                          className="p-1 hover:bg-[var(--bd)] rounded text-[11px]"
                          title={isAr ? 'تكرار الطبقة' : 'Duplicate Layer'}
                        >
                          ⧉
                        </button>
                      )}

                      {/* Lock Toggle */}
                      <button
                        onClick={() => {
                          onUpdateItems((items) =>
                            items.map((x) => (x.id === item.id ? { ...x, locked: !x.locked } : x))
                          );
                        }}
                        className={`p-1 rounded text-xs ${item.locked ? 'text-amber-500 font-bold' : 'text-[var(--mut)]'}`}
                        title={item.locked ? t('unlockLayer') : t('lockLayer')}
                      >
                        {item.locked ? '🔒' : '🔓'}
                      </button>

                      {/* Visibility Toggle */}
                      <button
                        onClick={() => {
                          onUpdateItems((items) =>
                            items.map((x) => (x.id === item.id ? { ...x, hidden: !x.hidden } : x))
                          );
                        }}
                        className={`p-1 rounded text-xs ${item.hidden ? 'text-rose-500' : 'text-[var(--mut)]'}`}
                        title={item.hidden ? t('showLayer') : t('hideLayer')}
                      >
                        {item.hidden ? '🚫' : '👁️'}
                      </button>

                      {/* Delete Layer Button */}
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 rounded text-xs text-rose-500 hover:bg-rose-500/15 transition-colors"
                        title={isAr ? 'حذف هذه الطبقة نهائياً 🗑️' : 'Delete this layer 🗑️'}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Projects & Auto-Save (مشاريعي) */}
        {activeTab === 'projects' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('autoSaveActive')}</span>
              </div>
              <div className="text-[11px] opacity-80">{t('lastSaved', { time: lastAutoSavedTime })}</div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--row)] border border-[var(--bd)] space-y-2">
              <div className="font-bold text-xs text-[var(--fg)]">
                {isAr ? 'الحفظ على الهاتف والكمبيوتر' : 'Save to Phone & PC'}
              </div>
              <button onClick={onExportMobileFile} className="ps-btn ps-btn-primary w-full py-1.5 text-xs font-bold">
                📲 {isAr ? 'حفظ نسخة المشروع على الجهاز' : 'Export Project File'}
              </button>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-xs block">{isAr ? 'حفظ المشروع باسم جديد' : 'Save Project As'}</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={isAr ? 'اسم المشروع...' : 'Project Name...'}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="ps-input flex-1 text-xs"
                />
                <button
                  onClick={() => {
                    if (!newProjectName.trim()) return;
                    onSaveProject(newProjectName.trim());
                    setNewProjectName('');
                    toast(isAr ? 'تم حفظ المشروع' : 'Saved');
                  }}
                  className="ps-btn ps-btn-primary py-1 px-3 text-xs font-semibold"
                >
                  {isAr ? 'حفظ' : 'Save'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-xs block">
                {isAr ? `مشاريعي المحفوظة (${savedProjects.length})` : `Saved Projects (${savedProjects.length})`}
              </span>
              {savedProjects.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-[var(--row)] border border-[var(--bd)] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[var(--fg)]">{p.name}</div>
                    <div className="text-[10px] text-[var(--mut)]">
                      {new Date(p.updatedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onLoadProject(p)} className="ps-btn text-xs py-1 px-2 font-semibold">
                      {isAr ? 'فتح' : 'Open'}
                    </button>
                    <button
                      onClick={() => onDeleteProject(p.id)}
                      className="text-rose-500 hover:bg-rose-500/10 p-1 rounded"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </aside>
  );
}
