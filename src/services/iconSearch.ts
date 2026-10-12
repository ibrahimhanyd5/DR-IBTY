import { LUCIDE_RAW } from '../data/lucideIcons';

export interface LocalIcon {
  name: string;
  inner: string;
}

let ICONS: LocalIcon[] | null = null;
export function localIcons(): LocalIcon[] {
  if (!ICONS) {
    ICONS = LUCIDE_RAW.split('\n').map((l) => {
      const i = l.indexOf('\t');
      return { name: l.slice(0, i), inner: l.slice(i + 1) };
    });
  }
  return ICONS;
}

const SYN: Record<string, string[]> = {
  home: ['house'], location: ['map-pin'], place: ['map-pin'], email: ['mail'], cart: ['shopping-cart'], basket: ['shopping-basket'],
  food: ['utensils', 'pizza', 'cooking-pot', 'sandwich'], restaurant: ['utensils', 'chef-hat'], phone: ['phone', 'smartphone'], mobile: ['smartphone'],
  money: ['banknote', 'wallet', 'coins', 'dollar-sign'], school: ['graduation-cap', 'school'], education: ['graduation-cap', 'book-open'],
  health: ['heart-pulse', 'stethoscope', 'hospital'], medical: ['stethoscope', 'cross', 'pill'], car: ['car', 'car-front'], idea: ['lightbulb'],
  warning: ['triangle-alert'], help: ['circle-help'], company: ['building', 'building-2'], office: ['building-2', 'briefcase'],
  internet: ['globe', 'wifi'], settings: ['settings', 'sliders-horizontal'], user: ['user', 'users'], camera: ['camera'], print: ['printer'],
};

const AR: Record<string, string[]> = {
  بيت: ['house'], منزل: ['house'], سكن: ['house', 'building'], هاتف: ['phone', 'smartphone'], جوال: ['smartphone'], موبايل: ['smartphone'], تلفون: ['phone'], اتصال: ['phone-call'],
  بريد: ['mail'], ايميل: ['mail'], رسالة: ['mail', 'message-square'], موقع: ['map-pin', 'globe'], مكان: ['map-pin'], خريطة: ['map'], عنوان: ['map-pin'],
  نجمة: ['star'], قلب: ['heart'], حب: ['heart'], مستخدم: ['user'], شخص: ['user'], انسان: ['user'], فريق: ['users'], تقويم: ['calendar'], تاريخ: ['calendar'],
  كاميرا: ['camera'], تصوير: ['camera'], صورة: ['image'], سلة: ['shopping-cart', 'shopping-basket'], عربة: ['shopping-cart'], تسوق: ['shopping-bag', 'shopping-cart'],
  بحث: ['search'], اعدادات: ['settings'], ضبط: ['sliders'], ساعة: ['clock', 'watch'], وقت: ['clock', 'timer'], كتاب: ['book'], مكتبة: ['library'], كتب: ['library', 'books'],
  سيارة: ['car'], طعام: ['utensils', 'pizza', 'sandwich'], اكل: ['utensils'], مطعم: ['utensils', 'chef-hat'], وجبة: ['utensils'], قهوة: ['coffee'], شاي: ['coffee'], عصير: ['cup-soda'],
  صحة: ['heart-pulse'], طبي: ['stethoscope', 'pill'], دواء: ['pill'], مستشفى: ['hospital'], طبيب: ['stethoscope'], مال: ['banknote', 'wallet', 'coins'], فلوس: ['banknote'], نقود: ['banknote', 'coins'],
  تعليم: ['graduation-cap'], مدرسة: ['school', 'graduation-cap'], جامعة: ['graduation-cap'], طالب: ['graduation-cap'], شجرة: ['tree-pine', 'trees'], نبات: ['sprout', 'leaf'], ورق: ['leaf'],
  شمس: ['sun'], قمر: ['moon'], نجوم: ['stars', 'sparkles'], مفتاح: ['key'], قفل: ['lock'], حماية: ['shield'], امان: ['shield', 'lock'], سهم: ['arrow-right', 'arrow-up'],
  فيديو: ['video'], موسيقى: ['music'], صوت: ['volume-2', 'mic'], ميكروفون: ['mic'], سماعة: ['headphones'], طائرة: ['plane'], سفر: ['plane', 'luggage'], فندق: ['hotel', 'bed'],
  شركة: ['building', 'building-2'], مبنى: ['building'], مكتب: ['briefcase', 'building-2'], عمل: ['briefcase'], وظيفة: ['briefcase'], حقيبة: ['briefcase', 'backpack'],
  جائزة: ['trophy', 'award'], كاس: ['trophy'], انترنت: ['globe', 'wifi'], عالم: ['globe'], واي: ['wifi'], بطارية: ['battery'], لمبة: ['lightbulb'], فكرة: ['lightbulb'], ضوء: ['lightbulb', 'sun'],
  نار: ['flame'], ماء: ['droplet'], مياه: ['droplets', 'droplet'], سحاب: ['cloud'], غيم: ['cloud'], مطر: ['cloud-rain'], ثلج: ['snowflake'], رياح: ['wind'],
  رياضة: ['dumbbell', 'trophy'], كرة: ['trophy'], طفل: ['baby'], كلب: ['dog'], قط: ['cat'], حيوان: ['paw-print', 'dog'], سمكة: ['fish'], طائر: ['bird'], ورد: ['flower'], زهرة: ['flower'],
  هدية: ['gift'], طباعة: ['printer'], طابعة: ['printer'], مقص: ['scissors'], قلم: ['pen', 'pencil'], كتابة: ['pen-line', 'pencil'], فرشاة: ['brush', 'paintbrush'], رسم: ['pen-tool', 'brush'], لون: ['palette'],
  تحميل: ['download'], رفع: ['upload'], مشاركة: ['share-2'], حذف: ['trash-2'], تعديل: ['pencil'], اضافة: ['plus'], اغلاق: ['x'], صح: ['check'], تم: ['check'], تحذير: ['triangle-alert'],
  معلومات: ['info'], سؤال: ['circle-help'], اعجاب: ['thumbs-up'], تعليق: ['message-circle'], اشعار: ['bell'], جرس: ['bell'], علم: ['flag'], حاسوب: ['laptop', 'monitor'], كمبيوتر: ['laptop', 'monitor'],
  تلفزيون: ['tv'], شاشة: ['monitor'], مطبخ: ['cooking-pot', 'utensils'], حمام: ['bath'], سرير: ['bed'], كرسي: ['armchair'], اثاث: ['sofa'], بناء: ['hammer', 'building'], صيانة: ['wrench'], ادوات: ['wrench', 'hammer'],
  تجميل: ['sparkles'], عطر: ['spray-can'], ملابس: ['shirt'], حذاء: ['footprints'], حقيبه: ['shopping-bag'], صندوق: ['package', 'box'], شحن: ['truck', 'package'], توصيل: ['truck', 'bike'],
  دراجة: ['bike'], قطار: ['train-front'], باص: ['bus'], سفينة: ['ship'], مصباح: ['lamp'], قفص: ['lock'], رمز: ['qr-code'], باركود: ['barcode', 'qr-code'], احصائيات: ['chart-bar', 'chart-line'], رسم_بياني: ['chart-line'],
};

function norm(w: string) {
  let s = w.toLowerCase().trim().replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/^ال/, '');
  return s;
}
const AR_NORM: Record<string, string[]> = {};
Object.keys(AR).forEach((k) => {
  AR_NORM[norm(k)] = AR[k];
});

export function searchLocal(q: string, limit = 150): LocalIcon[] {
  const words = q.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const terms: string[] = [];
  words.forEach((w) => {
    const lw = w.toLowerCase();
    terms.push(lw);
    (SYN[lw] || []).forEach((t) => terms.push(t));
    const a = AR_NORM[norm(w)];
    if (a) a.forEach((t) => terms.push(t));
  });
  const scored: { i: LocalIcon; s: number }[] = [];
  for (const ic of localIcons()) {
    let best = 9;
    const parts = ic.name.split('-');
    for (const t of terms) {
      if (ic.name === t) best = Math.min(best, 0);
      else if (ic.name.startsWith(t)) best = Math.min(best, 1);
      else if (parts.includes(t)) best = Math.min(best, 2);
      else if (ic.name.includes(t)) best = Math.min(best, 3);
    }
    if (best < 9) scored.push({ i: ic, s: best });
  }
  scored.sort((a, b) => a.s - b.s || a.i.name.length - b.i.name.length || (a.i.name < b.i.name ? -1 : 1));
  return scored.slice(0, limit).map((x) => x.i);
}

export function iconSvg(inner: string, color: string, size = 256) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
