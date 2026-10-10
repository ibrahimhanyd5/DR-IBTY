/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IconItem {
  id: string;
  name: string;
  nameEn: string;
  category: 'social' | 'business' | 'editorial' | 'ui';
  svgPath: string;
  viewBox?: string;
}

export const STOCK_ICONS: IconItem[] = [
  // Social & Contact
  {
    id: 'icon_phone',
    name: 'هاتف وتواصل',
    nameEn: 'Phone Call',
    category: 'social',
    svgPath: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  },
  {
    id: 'icon_mail',
    name: 'بريد إلكتروني',
    nameEn: 'Mail Envelope',
    category: 'social',
    svgPath: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
  },
  {
    id: 'icon_globe',
    name: 'موقع إلكتروني',
    nameEn: 'Globe Web',
    category: 'social',
    svgPath: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-15.93A8 8 0 0 0 4.07 11h2.95a12.8 12.8 0 0 1 3.98-6.93zM11 13H4.07A8 8 0 0 0 11 19.93zm2 6.93A8 8 0 0 0 19.93 13H13zm0-8.93h6.93A8 8 0 0 0 13 4.07z',
  },
  {
    id: 'icon_pin',
    name: 'موقع جغرافي',
    nameEn: 'Map Pin',
    category: 'social',
    svgPath: 'M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8zm0 11a3 3 0 1 1 3-3 3 3 0 0 1-3 3z',
  },

  // Business & Awards
  {
    id: 'icon_award',
    name: 'وسام وجائزة',
    nameEn: 'Award Medal',
    category: 'business',
    svgPath: 'M12 15a7 7 0 1 0-7-7 7 7 0 0 0 7 7zm-3.6 2.5L5 22l7-3.5 7 3.5-3.4-4.5',
  },
  {
    id: 'icon_star',
    name: 'نجمة تقييم',
    nameEn: 'Star Rating',
    category: 'business',
    svgPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    id: 'icon_shield',
    name: 'درع أمان وضمان',
    nameEn: 'Shield Verified',
    category: 'business',
    svgPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  },

  // Editorial & Publishing
  {
    id: 'icon_quote',
    name: 'علامة اقتباس',
    nameEn: 'Quote Mark',
    category: 'editorial',
    svgPath: 'M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h4c0 4-2 6-5 6v2zm14 0c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h4c0 4-2 6-5 6v2z',
  },
  {
    id: 'icon_newspaper',
    name: 'صحيفة وجريدة',
    nameEn: 'Newspaper',
    category: 'editorial',
    svgPath: 'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2v13H4zm14-12H10V8h8v2zm0 4H10v-2h8v2zm0 4H10v-2h8v2z',
  },
  {
    id: 'icon_printer',
    name: 'طابعة ومطبوعات',
    nameEn: 'Printer',
    category: 'editorial',
    svgPath: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  },

  // UI & Design
  {
    id: 'icon_sparkles',
    name: 'بريق ولمعان',
    nameEn: 'Sparkles',
    category: 'ui',
    svgPath: 'm12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z',
  },
  {
    id: 'icon_heart',
    name: 'قلب وإعجاب',
    nameEn: 'Heart',
    category: 'ui',
    svgPath: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  },
];

export const AVAILABLE_FONTS: { name: string; label: string; sample: string }[] = [
  { name: 'Cairo', label: 'Cairo (افتراضي وعصري)', sample: 'أبجد هوز Abc' },
  { name: 'Tajawal', label: 'Tajawal (ناعم ومقروء)', sample: 'أبجد هوز Abc' },
  { name: 'Amiri', label: 'Amiri (نسخ كلاسيكي)', sample: 'أبجد هوز Abc' },
  { name: 'Reem Kufi', label: 'Reem Kufi (كوفي هندسي)', sample: 'أبجد هوز Abc' },
  { name: 'Playfair Display', label: 'Playfair Display (فخامة لاتينية)', sample: 'Elegance Abc' },
  { name: 'Montserrat', label: 'Montserrat (هندسي لاتيني)', sample: 'Modern Abc' },
  { name: 'Oswald', label: 'Oswald (مكثف إعلاني)', sample: 'CONDENSED' },
  { name: 'Lobster', label: 'Lobster (يدوي مميز)', sample: 'Creative Script' },
  { name: 'Almarai', label: 'Almarai (رسمي ومميز)', sample: 'المراعي Abc' },
  { name: 'El Messiri', label: 'El Messiri (فني رشيق)', sample: 'المسيري Abc' },
];

/**
 * Dynamically loads any Google Font into the page head
 */
export function loadGoogleFont(fontFamily: string): Promise<boolean> {
  return new Promise((resolve) => {
    const formattedName = fontFamily.trim().replace(/\s+/g, '+');
    const linkId = `gfont-${formattedName}`;
    if (document.getElementById(linkId)) {
      resolve(true);
      return;
    }
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@400;600;700&display=swap`;
    link.onload = () => resolve(true);
    link.onerror = () => resolve(false);
    document.head.appendChild(link);
  });
}
