/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DocumentIntent = 'print' | 'web';
export type ColorMode = 'CMYK' | 'RGB';
export type BindingDirection = 'rtl' | 'ltr';

export interface Item {
  id: number;
  type: 'text' | 'rect' | 'ell' | 'img' | 'path';
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  text?: string;
  fs?: number;
  fam?: string;
  b?: number;
  a?: 'start' | 'center' | 'end';
  k?: string;
  pw?: number;
  ph?: number;
  sw?: number;
  pts?: [number, number][];
  locked?: boolean;
  hidden?: boolean;
  name?: string;
  opacity?: number;
  groupId?: string;
  cols?: number;
  gut?: number;
  pad?: number;
  fixedH?: boolean;
  fit?: 'cover' | 'contain' | 'fill';
}

export interface PageData {
  id: string;
  m: string; // master template key ('', 'A', 'B')
  items: Item[];
}

export interface DocSettings {
  name: string;
  w: number;
  h: number;
  size: string;
  intent: DocumentIntent;
  colorMode: ColorMode;
  facingPages: boolean;
  binding: BindingDirection;
  bleed: number; // in mm (max of the sides, kept for compatibility)
  bleeds?: { top: number; bottom: number; inside: number; outside: number }; // per-side bleed in mm
  margins: { top: number; bottom: number; inside: number; outside: number }; // in mm
  columns?: number; // number of columns (1, 2, 3, 4, 6...)
  gutter?: number; // gutter width in mm between columns
  showGrid?: boolean; // toggle visibility of column guides & margins
  version?: number;
  lastModifiedBy?: string;
}

export interface DocData extends DocSettings {
  pages: PageData[];
  masters: {
    A: Item[];
    B: Item[];
    [key: string]: Item[];
  };
}

export interface DeveloperTemplate {
  id: string;
  title: string;
  category: 'magazines' | 'newspapers' | 'identity' | 'posters' | 'custom';
  description: string;
  previewBg: string;
  size: string;
  items: Item[];
  author?: string;
  createdAt: number;
}

export interface DesignIssue {
  id: string;
  type: 'contrast' | 'bleed' | 'hierarchy' | 'alignment' | 'clutter';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  advice: string;
  x: number;
  y: number;
  w: number;
  h: number;
  itemId?: number;
  canAutoFix?: boolean;
  autoFixAction?: () => void;
}

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: number;
  doc: DocData;
  IM: Record<string, string>;
}
