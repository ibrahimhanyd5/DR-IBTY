/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocData, Item, DesignIssue } from '../types/printStudio';

// Helper: Calculate relative luminance from hex color
function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length < 6) return 0.5;
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function auditDesign(doc: DocData, pageIndex: number): DesignIssue[] {
  const issues: DesignIssue[] = [];
  const page = doc.pages[pageIndex];
  if (!page) return issues;

  const items = page.items.filter((it) => !it.hidden);
  const safetyMargin = 16; // ~5.5mm in points

  // 1. Check Bleed & Margin Safety for Text and Critical Elements
  items.forEach((it) => {
    if (it.type === 'text') {
      const nearLeft = it.x < safetyMargin;
      const nearTop = it.y < safetyMargin;
      const nearRight = it.x + it.w > doc.w - safetyMargin;
      const nearBottom = it.y + it.h > doc.h - safetyMargin;

      if (nearLeft || nearTop || nearRight || nearBottom) {
        issues.push({
          id: `bleed-${it.id}`,
          type: 'bleed',
          severity: 'error',
          title: 'خطر بتر النص في القص (Safety Margin)',
          description: `النص "${(it.text || '').substring(0, 18)}..." قريب جداً من حافة الورقة (${Math.round(Math.min(it.x, it.y, doc.w - it.x - it.w, doc.h - it.y - it.h))}pt).`,
          advice: 'في المطابع، تتغير حافة السكين بمقدار 2-3 مم. انقل النص للداخل بمسافة لا تقل عن 15pt لحمايته من البتر.',
          x: it.x,
          y: it.y,
          w: it.w,
          h: it.h,
          itemId: it.id,
          canAutoFix: true,
        });
      }
    }
  });

  // 2. Check Contrast Ratio for Text against overlapping background rectangles or page
  items.forEach((it) => {
    if (it.type === 'text') {
      const textColor = it.color || '#000000';
      // Find underlying rectangle if any
      let bgColor = '#ffffff'; // default page white
      items.forEach((other) => {
        if (other.id !== it.id && (other.type === 'rect' || other.type === 'ell')) {
          // Check if text is mostly inside the other shape
          if (
            it.x >= other.x - 5 &&
            it.y >= other.y - 5 &&
            it.x + it.w <= other.x + other.w + 10 &&
            it.y + it.h <= other.y + other.h + 10
          ) {
            bgColor = other.color || '#ffffff';
          }
        }
      });

      const ratio = getContrastRatio(textColor, bgColor);
      if (ratio < 3.0) {
        issues.push({
          id: `contrast-${it.id}`,
          type: 'contrast',
          severity: 'error',
          title: 'ضعف التباين البصري (Low Contrast)',
          description: `نسبة التباين ${ratio.toFixed(1)}:1 أقل من المعيار المطلوب (4.5:1 للمطبوعات وWCAG).`,
          advice: 'النص غير واضح وصعب القراءة. اختر لوناً أغمق للنص أو افتح للخلفية لإبراز المحتوى.',
          x: it.x,
          y: it.y,
          w: it.w,
          h: it.h,
          itemId: it.id,
          canAutoFix: true,
        });
      }
    }
  });

  // 3. Typographic Hierarchy Check
  const textItems = items.filter((it) => it.type === 'text');
  textItems.forEach((it) => {
    const fs = it.fs || 16;
    if (fs < 8) {
      issues.push({
        id: `tiny-font-${it.id}`,
        type: 'hierarchy',
        severity: 'warning',
        title: 'خط صغير جداً للطباعة (Illegible Font Size)',
        description: `حجم الخط (${fs}pt) قد لا يُقرأ عند الطباعة الورقية.`,
        advice: 'الحد الأدنى للنصوص الفرعية وهوامش المطبوعات هو 8-9pt لضمان وضوح الطباعة.',
        x: it.x,
        y: it.y,
        w: it.w,
        h: it.h,
        itemId: it.id,
      });
    }
  });

  // 4. Overlapping Text Boxes
  for (let i = 0; i < textItems.length; i++) {
    for (let j = i + 1; j < textItems.length; j++) {
      const a = textItems[i];
      const b = textItems[j];
      const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
      const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;

      if (overlapX && overlapY) {
        issues.push({
          id: `overlap-${a.id}-${b.id}`,
          type: 'clutter',
          severity: 'warning',
          title: 'تداخل غير مقصود بين النصوص',
          description: `كتلتان نصيتان تتداخلان في نفس المساحة وتعيقان القراءة.`,
          advice: 'افصل بين الكتل النصية أو ادمجهما في فقرة واحدة متسقة.',
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x),
          h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y),
        });
      }
    }
  }

  // 5. Total Balance & Clutter check
  if (items.length > 25) {
    issues.push({
      id: 'high-clutter',
      type: 'clutter',
      severity: 'info',
      title: 'ازدحام بصري مرتفع (High Visual Clutter)',
      description: `تحتوي الصفحة على ${items.length} عنصراً منفصلاً.`,
      advice: 'أعطِ مساحة سلبية بيضاء (White Space) لتوجيه عين المشاهد إلى الرسالة الأهم في التصميم.',
      x: 20,
      y: 20,
      w: doc.w - 40,
      h: 40,
    });
  }

  return issues;
}
