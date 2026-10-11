/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StockPhoto {
  id: string;
  title: string;
  titleEn: string;
  category: 'celebrities' | 'business' | 'architecture' | 'food' | 'textures';
  url: string;
  tags: string[];
}

export const STOCK_PHOTOS: StockPhoto[] = [
  // Celebrities & Leaders
  {
    id: 'photo_steve',
    title: 'ستيف جوبز - رائد التصميم والتقنية',
    titleEn: 'Steve Jobs - Design & Tech Icon',
    category: 'celebrities',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg/800px-Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg',
    tags: ['مشاهير', 'شخصيات', 'تقنية', 'بورتريه', 'steve jobs', 'apple'],
  },
  {
    id: 'photo_zaha',
    title: 'زها حديد - أيقونة العمارة العالمية',
    titleEn: 'Zaha Hadid - Architecture Icon',
    category: 'celebrities',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Zaha_Hadid_in_Heydar_Aliyev_Center_in_Baku_2013.jpg/800px-Zaha_Hadid_in_Heydar_Aliyev_Center_in_Baku_2013.jpg',
    tags: ['مشاهير', 'عمارة', 'تصميم', 'زها حديد', 'zaha hadid'],
  },
  {
    id: 'photo_mahmoud',
    title: 'محمود درويش - شاعر وأديب',
    titleEn: 'Mahmoud Darwish - Poet & Author',
    category: 'celebrities',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Mahmoud_Darwish_Palestine.jpg/800px-Mahmoud_Darwish_Palestine.jpg',
    tags: ['مشاهير', 'أدب', 'ثقافة', 'شعر', 'دارويش'],
  },

  // Business & Tech
  {
    id: 'photo_agency_hero',
    title: 'فريق عمل وتكنولوجيا معاصرة',
    titleEn: 'Modern Creative Agency Team',
    category: 'business',
    url: 'src/assets/images/hero_modern_agency_1791555855961.jpg',
    tags: ['أعمال', 'مكتب', 'اجتماع', 'تقنية', 'فريق', 'business', 'tech'],
  },
  {
    id: 'photo_luxury_watch',
    title: 'ساعة ذكية فاخرة على حجر الترافرتين',
    titleEn: 'Luxury Chronometer on Stone',
    category: 'business',
    url: 'src/assets/images/ecommerce_product_watch_1791555868191.jpg',
    tags: ['منتجات', 'ساعة', 'فخامة', 'تجارة', 'watch', 'luxury'],
  },

  // Architecture & Design
  {
    id: 'photo_modern_arch',
    title: 'جناح معماري معاصر وحديقة مائية',
    titleEn: 'Contemporary Architectural Courtyard',
    category: 'architecture',
    url: 'src/assets/images/portfolio_architecture_1791555880637.jpg',
    tags: ['عمارة', 'تصميم داخلي', 'حديقة', 'بناء', 'architecture'],
  },

  // Food & Gourmet
  {
    id: 'photo_gourmet_dish',
    title: 'طبق طهي راقٍ ومطعم فاخر',
    titleEn: 'Artisan Gourmet Culinary Plate',
    category: 'food',
    url: 'src/assets/images/restaurant_culinary_1791555890660.jpg',
    tags: ['أطعمة', 'مطاعم', 'شيف', 'وجبة', 'food', 'culinary'],
  },

  // Textures & Backdrops
  {
    id: 'photo_marble_texture',
    title: 'خلفية رخامية هندسية فاخرة',
    titleEn: 'Luxury Marble Texture',
    category: 'textures',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80',
    tags: ['خلفيات', 'رخام', 'أنسجة', 'تجريدي', 'textures', 'marble'],
  },
  {
    id: 'photo_paper_texture',
    title: 'ملمس ورق جريدة ومطبوعات قديم',
    titleEn: 'Vintage Editorial Paper Texture',
    category: 'textures',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    tags: ['ورق', 'صحف', 'مطبوعات', 'paper', 'editorial'],
  },
];
