/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'ar' | 'en';

export const translations = {
  ar: {
    appTitle: 'استوديو المطبوعات',
    newFile: 'ملف جديد',
    facingPages: 'متقابلة',
    singlePages: 'مفردة',
    pageOf: 'صفحة {current} من {total}',
    prevPage: 'الصفحة السابقة',
    nextPage: 'الصفحة التالية',
    designAudit: 'فحص أسس التصميم',
    auditActive: 'الفاحص نشط',
    undo: 'تراجع',
    exportBtn: 'تصدير',
    lightMode: '☀️ فاتح',
    darkMode: '🌙 داكن',
    templatesTab: 'قوالب',
    elementsTab: 'عناصر',
    typographyTab: 'نصوص',
    photosTab: 'صور',
    iconsFontsTab: 'أيقونات وخطوط',
    layersTab: 'طبقات',
    projectsTab: 'مشاريعي',
    devTemplates: 'قوالب المطور',
    autoSaveActive: 'الحفظ التلقائي مفعّل ونشط',
    lastSaved: 'آخر حفظ: {time}',
    collaborators: 'المستخدمون النشطون',
    collaboratingCount: '{count} مستخدم متصل',
    lockConflictResolved: 'تمت مزامنة المستند عبر نافذة أخرى بنجاح لمنع تعارض الحفظ',
    
    // Tools
    toolSelect: 'تحديد',
    toolText: 'نص',
    toolRect: 'مستطيل',
    toolCircle: 'دائرة',
    toolPen: 'قلم',
    toolImage: 'صورة',
    toolEyedropper: 'قطارة',
    
    // Properties
    itemAiEdit: '✨ الذكاء الاصطناعي',
    itemColor: 'اللون',
    itemFont: 'الخط',
    itemSize: 'الحجم',
    itemBold: 'عريض',
    itemAlign: 'محاذاة',
    itemDuplicate: 'تكرار',
    itemForward: 'للأمام',
    itemBackward: 'للخلف',
    itemDelete: 'حذف',
    itemGroup: 'تجميع 📦',
    itemUngroup: 'فك التجميع',
    
    // AI Chat
    aiAssistantTitle: 'مساعد الذكاء الاصطناعي للعنصر',
    aiWaitingConfirm: '✨ تم تجهيز التعديل المقترح للمعاينة! هل تود تطبيقه على التصميم؟',
    aiApplyYes: '✅ نعم، تطبيق على التصميم',
    aiApplyNo: '❌ لا، إلغاء التعديل',
    aiAppliedSuccess: 'تم تطبيق التعديل على التصميم بنجاح!',
    aiDiscarded: 'تم إلغاء التعديل والاحتفاظ بالحالة السابقة.',
    aiQuickRemoveBg: '✨ حذف الخلفية',
    aiQuickSlices: '✂️ شرائح سحرية 2×2',
    aiQuickWarm: '🎨 فلتر دافئ',
    aiQuickBw: '🖤 أبيض وأسود',
    aiQuickMarketing: '✨ أسلوب تسويقي',
    aiQuickSummarize: '✂️ اختصار النص',
    aiQuickGrammar: '📝 تدقيق لغوي',
    aiQuickColor: '🎨 اقتراح لون متناسق',
    
    // Photos Tab
    uploadFromDevice: 'رفع صورة من الجهاز',
    searchPhotosPlaceholder: 'ابحث في مكتبة الصور (مشاهير، تقنية، عمارة)...',
    photoCatAll: 'الكل',
    photoCatCelebrities: 'شخصيات ومشاهير',
    photoCatBusiness: 'أعمال وتقنية',
    photoCatArchitecture: 'عمارة وتصميم',
    photoCatFood: 'أطعمة ومشروبات',
    photoCatTextures: 'خلفيات وأنسجة',
    
    // Icons & Fonts Tab
    searchIconsPlaceholder: 'ابحث عن أيقونة (تواصل، أعمال، طباعة)...',
    addCustomFont: '+ إضافة خط من Google Fonts',
    fontNamePlaceholder: 'اسم الخط (مثال: Almarai, Lalezar, Montserrat)',
    addFontBtn: 'تثبيت الخط',
    
    // Layers
    newLayerGroup: '+ مجموعة جديدة',
    groupName: 'مجموعة عناصر',
    renameLayer: 'إعادة تسمية',
    lockLayer: 'قفل',
    unlockLayer: 'فك القفل',
    hideLayer: 'إخفاء',
    showLayer: 'إظهار',
    
    // Developer Studio
    devStudioTitle: 'استوديو قوالب المطور (Developer Templates)',
    saveCurrentAsTemplate: 'حفظ الصفحة الحالية كقالب دائم في البرنامج',
    templateTitleInput: 'عنوان القالب',
    templateCategorySelect: 'القسم',
    templateDescInput: 'وصف القالب وميزاته',
    saveAsDevTemplateBtn: 'حفظ كقالب معتمد',
    devTemplatesCount: 'القوالب المخصصة المعتمدة: {count}',
  },
  en: {
    appTitle: 'Print Studio',
    newFile: 'New File',
    facingPages: 'Facing',
    singlePages: 'Single',
    pageOf: 'Page {current} of {total}',
    prevPage: 'Previous Page',
    nextPage: 'Next Page',
    designAudit: 'Design Audit',
    auditActive: 'Auditor Active',
    undo: 'Undo',
    exportBtn: 'Export',
    lightMode: '☀️ Light',
    darkMode: '🌙 Dark',
    templatesTab: 'Templates',
    elementsTab: 'Elements',
    typographyTab: 'Text',
    photosTab: 'Photos',
    iconsFontsTab: 'Icons & Fonts',
    layersTab: 'Layers',
    projectsTab: 'My Projects',
    devTemplates: 'Dev Templates',
    autoSaveActive: 'Auto-save active & sync ready',
    lastSaved: 'Last saved: {time}',
    collaborators: 'Active Collaborators',
    collaboratingCount: '{count} user connected',
    lockConflictResolved: 'Document synchronized across tabs to prevent overwrite conflicts',
    
    // Tools
    toolSelect: 'Select',
    toolText: 'Text',
    toolRect: 'Rectangle',
    toolCircle: 'Circle',
    toolPen: 'Pen',
    toolImage: 'Image',
    toolEyedropper: 'Eyedropper',
    
    // Properties
    itemAiEdit: '✨ AI Magic',
    itemColor: 'Color',
    itemFont: 'Font',
    itemSize: 'Size',
    itemBold: 'Bold',
    itemAlign: 'Align',
    itemDuplicate: 'Duplicate',
    itemForward: 'Forward',
    itemBackward: 'Backward',
    itemDelete: 'Delete',
    itemGroup: 'Group 📦',
    itemUngroup: 'Ungroup',
    
    // AI Chat
    aiAssistantTitle: 'Item AI Assistant',
    aiWaitingConfirm: '✨ Proposed edit generated in box! Would you like to apply it to the canvas?',
    aiApplyYes: '✅ Yes, Apply to Canvas',
    aiApplyNo: '❌ No, Discard',
    aiAppliedSuccess: 'Modification applied to the canvas successfully!',
    aiDiscarded: 'Changes discarded. Canvas preserved.',
    aiQuickRemoveBg: '✨ Cutout BG',
    aiQuickSlices: '✂️ Magic Slices 2×2',
    aiQuickWarm: '🎨 Warm Filter',
    aiQuickBw: '🖤 B&W Film',
    aiQuickMarketing: '✨ Marketing Tone',
    aiQuickSummarize: '✂️ Summarize',
    aiQuickGrammar: '📝 Fix Grammar',
    aiQuickColor: '🎨 Suggest Color',
    
    // Photos Tab
    uploadFromDevice: 'Upload from Device',
    searchPhotosPlaceholder: 'Search photos (celebrities, tech, architecture)...',
    photoCatAll: 'All',
    photoCatCelebrities: 'Celebrities & Portraits',
    photoCatBusiness: 'Business & Tech',
    photoCatArchitecture: 'Architecture & Design',
    photoCatFood: 'Food & Culinary',
    photoCatTextures: 'Textures & Backdrops',
    
    // Icons & Fonts Tab
    searchIconsPlaceholder: 'Search icons (social, business, print)...',
    addCustomFont: '+ Add Google Font',
    fontNamePlaceholder: 'Font family (e.g. Almarai, Lalezar, Montserrat)',
    addFontBtn: 'Install Font',
    
    // Layers
    newLayerGroup: '+ New Group',
    groupName: 'Group',
    renameLayer: 'Rename',
    lockLayer: 'Lock',
    unlockLayer: 'Unlock',
    hideLayer: 'Hide',
    showLayer: 'Show',
    
    // Developer Studio
    devStudioTitle: 'Developer Template Studio',
    saveCurrentAsTemplate: 'Save current page as permanent built-in template',
    templateTitleInput: 'Template Title',
    templateCategorySelect: 'Category',
    templateDescInput: 'Description & Features',
    saveAsDevTemplateBtn: 'Save as Official Template',
    devTemplatesCount: 'Registered custom templates: {count}',
  },
};

export function getT(lang: Language) {
  return (key: keyof typeof translations['ar'], params?: Record<string, string | number>) => {
    let str = translations[lang][key] || translations['ar'][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };
}
