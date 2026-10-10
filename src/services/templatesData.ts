/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Item, DocData } from '../types/printStudio';

const mkT = (x: number, y: number, w: number, text: string, fs: number, color: string, fam: string, b = 0, a: 'start' | 'center' | 'end' = 'start'): Item => ({
  id: 0,
  type: 'text',
  x,
  y,
  w,
  h: fs * 1.5,
  text,
  fs,
  color,
  fam,
  b,
  a,
});

const mkR = (x: number, y: number, w: number, h: number, color: string, locked = false, name = 'مستطيل'): Item => ({
  id: 0,
  type: 'rect',
  x,
  y,
  w,
  h,
  color,
  locked,
  name,
});

const mkI = (x: number, y: number, w: number, h: number, k: string, name = 'صورة الغلاف'): Item => ({
  id: 0,
  type: 'img',
  x,
  y,
  w,
  h,
  k,
  name,
});

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  items: {
    id: string;
    title: string;
    size: string;
    description: string;
    previewBg: string;
    generator: (w: number, h: number) => Item[];
  }[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'magazines',
    name: 'أغلفة المجلات',
    icon: '📖',
    items: [
      {
        id: 'mag_tech_future',
        title: 'مجلة التقنية والمستقبل',
        size: 'A4',
        description: 'غلاف مجلة تكنولوجية عصرية مع عناوين بارزة وشريط علوي',
        previewBg: 'linear-gradient(135deg, #090d16 0%, #172a45 100%)',
        generator: (w, h) => [
          mkR(0, 0, w, h, '#0a0d14'),
          // Background Feature Photo with opacity
          mkI(0, 180, w, 360, 'src/assets/images/hero_modern_agency_1791555855961.jpg', 'صورة غلاف التكنولوجيا'),
          // Dark gradient scrim over photo
          mkR(0, 180, w, 360, 'rgba(10, 13, 20, 0.45)'),
          // Header Bar
          mkR(24, 28, w - 48, 2, '#d81b79'),
          mkT(24, 38, w - 48, 'العدد 48 · مارس 2026 · مجلة شهرية متخصصة', 10, '#94a3b8', 'Tajawal', 0, 'center'),
          // Magazine Masthead
          mkT(24, 65, w - 48, 'المُستقبل', 76, '#ffffff', 'Reem Kufi', 1, 'center'),
          mkT(24, 150, w - 48, 'FUTURE TECH & INNOVATION', 12, '#d81b79', 'Montserrat', 1, 'center'),
          // Feature Block
          mkR(36, 560, 6, 80, '#d81b79'),
          mkT(52, 555, w - 100, 'ثورة الذكاء الاصطناعي', 34, '#ffffff', 'Cairo', 1, 'start'),
          mkT(52, 605, w - 100, 'كيف تعيد الخوارزميات صياغة الطب، الصناعة، والتصميم الرقمي في العالم العربي؟', 14, '#cbd5e1', 'Tajawal', 0, 'start'),
          // Secondary Headlines
          mkT(36, 660, 260, 'المدن الذكية 2030\nمستقبل البناء الأخضر المستدام', 15, '#38bdf8', 'Tajawal', 1, 'start'),
          mkT(36, 730, 260, 'رواد الأعمال العرب\n10 شركات ناشئة تقود الابتكار', 15, '#facc15', 'Tajawal', 1, 'start'),
          // Barcode box simulation
          mkR(w - 110, h - 80, 80, 46, '#ffffff'),
          mkT(w - 110, h - 70, 80, '||||||||||||\n9 780201 37962', 8, '#000000', 'Montserrat', 0, 'center'),
        ],
      },
      {
        id: 'mag_cartoon_comics',
        title: 'مجلة الكارتون والكوميكس',
        size: 'A4',
        description: 'غلاف مجلة رسوم متحركة وقصص مصورة مفعم بالحيوية وشخصيات الأبطال',
        previewBg: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
        generator: (w, h) => [
          mkR(0, 0, w, h, '#1e1b4b', true, 'خلفية المجلة البنفسجية'),
          // Top Masthead Banner
          mkR(20, 24, w - 40, 52, '#facc15', false, 'شريط الترويسة الأصفر'),
          mkT(24, 30, w - 48, 'العدد الممتاز · أبطال المستقبل · مارس 2026', 11, '#18181b', 'Tajawal', 1, 'center'),
          mkT(24, 48, w - 48, 'COMIC ART & ANIMATION SPECIAL', 11, '#6d28d9', 'Montserrat', 1, 'center'),
          // Big Cartoon Title
          mkT(24, 85, w - 48, 'عالم الكارتون', 72, '#facc15', 'Cairo', 1, 'center'),
          // Secondary sub-masthead
          mkT(24, 165, w - 48, 'THE ANIMATION UNIVERSE', 13, '#38bdf8', 'Montserrat', 1, 'center'),
          // Central Cartoon Character Frame
          mkR(40, 195, w - 80, 370, '#2e1065', false, 'إطار بطل الكارتون'),
          mkI(46, 201, w - 92, 358, 'src/assets/images/hero_modern_agency_1791555855961.jpg', 'شخصية الكارتون الرئيسية'),
          // Comic Burst Badge
          mkR(36, 175, 110, 36, '#ef4444', false, 'شارة خاصة'),
          mkT(36, 184, 110, 'عدد حصري! ★', 13, '#ffffff', 'Cairo', 1, 'center'),
          // Headlines
          mkR(36, 580, w - 72, 70, 'rgba(15, 23, 42, 0.85)', false, 'خلفية المانشيت'),
          mkT(48, 588, w - 96, 'أسرار تحريك الشخصيات بالذكاء الاصطناعي', 26, '#ffffff', 'Cairo', 1, 'start'),
          mkT(48, 626, w - 96, 'كيف تنشئ عالمك الكرتوني الخاص وتصمم أبطالك في دقائق معدودة؟', 13, '#cbd5e1', 'Tajawal', 0, 'start'),
          // Side comic highlights
          mkT(40, 670, 240, '⚡ بطل الأسبوع: النسر الذهبي\nقصة مصورة كاملة في 12 صفحة', 14, '#38bdf8', 'Tajawal', 1, 'start'),
          mkT(40, 740, 240, '🎨 ورشة رسم: 5 خطوات لإتقان\nرسم عيون الأنمي والتعابير الكرتونية', 14, '#facc15', 'Tajawal', 1, 'start'),
          // Barcode box
          mkR(w - 110, h - 75, 80, 44, '#ffffff', false, 'الباركود'),
          mkT(w - 110, h - 65, 80, '||||||||||||\n6 291100 4821', 8, '#000000', 'Montserrat', 0, 'center'),
        ],
      },
      {
        id: 'mag_luxury_lifestyle',
        title: 'مجلة الفخامة والأناقة',
        size: 'A4',
        description: 'تصميم تحريري ناعم بتيبوغرافي فخم للموضة والأزياء والجمال',
        previewBg: 'linear-gradient(135deg, #1c1917 0%, #44403c 100%)',
        generator: (w, h) => [
          mkR(0, 0, w, h, '#fafaf9'),
          // Minimalist Header
          mkT(24, 40, w - 48, 'E L E G A N C E', 11, '#78716c', 'Montserrat', 0, 'center'),
          mkT(24, 65, w - 48, 'أيقونة', 88, '#1c1917', 'Amiri', 1, 'center'),
          mkR(w / 2 - 40, 160, 80, 1, '#1c1917'),
          // Editorial Photo
          mkI(48, 190, w - 96, 360, 'src/assets/images/portfolio_architecture_1791555880637.jpg', 'صورة العمارة والأناقة'),
          // Editorial headlines
          mkT(48, 580, w - 96, 'أسرار الأناقة المعمارية الخالدة', 34, '#1c1917', 'Playfair Display', 1, 'center'),
          mkT(48, 640, w - 96, 'دليل الموسم الجديد لتصميم الفضاءات المفتوحة والجمال الهادئ', 14, '#57534e', 'Tajawal', 0, 'center'),
        ],
      },
    ],
  },
  {
    id: 'newspapers',
    name: 'الصحف والجرائد',
    icon: '📰',
    items: [
      {
        id: 'news_broadsheet',
        title: 'صحيفة يومية إخبارية',
        size: 'Poster',
        description: 'تخطيط صحفي كلاسيكي بأعمدة مقسمة وترويسة تاريخ ورقم العدد',
        previewBg: 'linear-gradient(135deg, #f4f1ea 0%, #e2ded4 100%)',
        generator: (w, h) => [
          mkR(0, 0, w, h, '#fcfaf6'),
          // Top strip
          mkR(36, 30, w - 72, 1, '#1e293b'),
          mkT(36, 36, w - 72, 'صحيفة إخبارية شاملة · تصدر يومياً · العدد 14205 · الأربعاء 15 شوال 1447هـ · السعر: 2 ريال', 12, '#475569', 'Tajawal', 0, 'center'),
          mkR(36, 56, w - 72, 1, '#1e293b'),
          // Masthead
          mkT(36, 75, w - 72, 'صـوت الـيـوم', 110, '#0f172a', 'Reem Kufi', 1, 'center'),
          mkR(36, 195, w - 72, 3, '#0f172a'),
          // Main Headline (مانشيت رئيسي)
          mkT(36, 215, w - 72, 'قمة الرياض العالمية تناقش مستقبل الطاقة النظيفة والتكامل الاقتصادي', 44, '#0f172a', 'Cairo', 1, 'start'),
          mkT(36, 275, w - 72, 'اتفاقيات استراتيجية بـ 50 مليار دولار لتوسيع مشاريع الهيدروجين الأخضر ومراكز الحوسبة الفائقة.', 18, '#334155', 'Tajawal', 0, 'start'),
          // Lead story box
          mkR(36, 340, w * 0.6, 280, '#f1ede4'),
          mkT(48, 355, w * 0.6 - 24, 'تقرير موسع: التحول الرقمي في البنية التحتية', 24, '#0f172a', 'Cairo', 1, 'start'),
          mkT(48, 400, w * 0.6 - 24, 'أعلنت الهيئة العامة للاستثمار عن اكتمال الربط الوطني للبيانات والذكاء الاصطناعي بنسبة 100%، مما يساهم في خفض تكاليف التشغيل بنسبة 35% وتسريع المعاملات الحكومية والتجارية عبر المنصات السحابية الوطنية.', 15, '#334155', 'Tajawal', 0, 'start'),
          // Secondary Side Column
          mkR(w * 0.6 + 56, 340, 1, 460, '#cbd5e1'),
          mkT(w * 0.6 + 72, 340, w * 0.35, 'افتتاح المعرض الدولي للكتاب بمشاركة 800 دار نشر', 22, '#0f172a', 'Cairo', 1, 'start'),
          mkT(w * 0.6 + 72, 430, w * 0.35, 'فعاليات ثقافية وندوات أدبية تشهد إقبالاً قياسياً يتجاوز نصف مليون زائر خلال أسبوعه الأول.', 14, '#475569', 'Tajawal', 0, 'start'),
        ],
      },
    ],
  },
  {
    id: 'identity',
    name: 'بطاقات الهوية والأعمال',
    icon: '💳',
    items: [
      {
        id: 'card_gold_black',
        title: 'بطاقة عمل ذهبية فاخرة',
        size: 'Card',
        description: 'بطاقة بيزنس راقية بدرجات الأسود والذهبي مع شريط جانبي',
        previewBg: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
        generator: (w, h) => [
          mkR(0, 0, w, h, '#121214'),
          mkR(0, 0, 12, h, '#d4af37'),
          mkT(28, 22, 190, 'إبراهيم الداوود', 24, '#ffffff', 'Cairo', 1, 'start'),
          mkT(28, 55, 190, 'مستشار تطوير الأعمال والتقنية', 12, '#d4af37', 'Tajawal', 0, 'start'),
          mkR(28, 80, 180, 1, '#27272a'),
          mkT(28, 92, 190, '+966 50 000 0000 · contact@brand.com', 9, '#a1a1aa', 'Tajawal', 0, 'start'),
          mkT(28, 110, 190, 'الرياض، المملكة العربية السعودية', 9, '#71717a', 'Tajawal', 0, 'start'),
        ],
      },
    ],
  },
  {
    id: 'posters',
    name: 'البوسترات والإعلانات',
    icon: '🎨',
    items: [
      {
        id: 'poster_conference',
        title: 'بوستر مؤتمر إبداعي',
        size: 'Poster',
        description: 'بوستر فعاليات ومعارض فنية مع تباين لوني جريء',
        previewBg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        generator: (w, h) => [
          mkR(0, 0, w, h, '#0f172a'),
          mkR(40, 40, w - 80, h - 80, '#1e293b'),
          mkT(60, 90, w - 120, 'المؤتمر السنوي للتصميم 2026', 56, '#38bdf8', 'Reem Kufi', 1, 'center'),
          mkT(60, 175, w - 120, 'ملتقى المصممين والمطورين ورواد الأعمال الرقميين', 22, '#e2e8f0', 'Tajawal', 0, 'center'),
          mkR(w / 2 - 120, 230, 240, 2, '#38bdf8'),
          mkT(60, 320, w - 120, '3 أيام من ورش العمل التفاعلية\nأكثر من 40 متحدثاً دولياً\nمعرض خاص لأحدث الابتكارات', 28, '#ffffff', 'Cairo', 1, 'center'),
          mkR(w / 2 - 140, h - 180, 280, 56, '#38bdf8'),
          mkT(w / 2 - 140, h - 165, 280, 'سجل حضورك الآن مجاناً', 20, '#0f172a', 'Cairo', 1, 'center'),
        ],
      },
    ],
  },
];
