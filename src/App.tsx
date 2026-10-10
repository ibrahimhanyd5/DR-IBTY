/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DocData, Item, SavedProject, DesignIssue } from './types/printStudio';
import { CanvaSidebar } from './components/CanvaSidebar';
import { AIDialog } from './components/AIDialog';
import { DesignAuditOverlay } from './components/DesignAuditOverlay';
import { NewDocModal } from './components/NewDocModal';
import { DeveloperTemplateModal } from './components/DeveloperTemplateModal';
import { LayoutGridModal } from './components/LayoutGridModal';
import { layoutText, drawImageFit } from './services/textLayout';
import { FrameInspector } from './components/FrameInspector';
import { auditDesign } from './services/designAuditor';
import { TEMPLATE_CATEGORIES } from './services/templatesData';
import { multiUserSync, Collaborator } from './services/multiUserSync';
import { Language, getT } from './services/i18n';

declare global {
  interface Window {
    jspdf?: {
      jsPDF: any;
    };
  }
}

const MM = 2.8346;

const SIZES: [string, string, number, number][] = [
  ['A4', 'A4 · 210×297 مم', 595.3, 841.9],
  ['A5', 'A5 · 148×210 مم', 419.5, 595.3],
  ['Card', 'Card بطاقة عمل · 90×50 مم', 255.1, 141.7],
  ['Flyer', 'Flyer فلاير · 99×210 مم', 280.6, 595.3],
  ['Poster', 'Poster بوستر · A3', 841.9, 1190.6],
  ['Post', 'Post منشور مربع · 1:1', 600, 600],
  ['Story', 'Story ستوري · 9:16', 540, 960],
  ['Letter', 'Letter · 8.5×11 إنش', 612, 792],
];

const FONTS: [string, string][] = [
  ['Cairo', 'عربي ولاتيني'],
  ['Tajawal', 'عربي ولاتيني'],
  ['Amiri', 'عربي · نسخ كلاسيكي'],
  ['Reem Kufi', 'عربي · كوفي'],
  ['Playfair Display', 'Latin · serif'],
  ['Montserrat', 'Latin · sans'],
  ['Oswald', 'Latin · condensed'],
  ['Lobster', 'Latin · script'],
  ['Almarai', 'عربي رسمي'],
  ['El Messiri', 'عربي فني'],
];

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const t = getT(lang);
  const isAr = lang === 'ar';

  const [doc, setDoc] = useState<DocData>(() => ({
    name: 'مشروع استوديو المطبوعات',
    w: 595.3,
    h: 841.9,
    size: 'A4',
    intent: 'print',
    colorMode: 'CMYK',
    facingPages: true,
    binding: 'rtl',
    bleed: 3,
    margins: { top: 12, bottom: 12, inside: 15, outside: 12 },
    columns: 3,
    gutter: 4,
    showGrid: true,
    pages: [{ id: 'p1', m: '', items: [] }],
    masters: { A: [], B: [] },
    version: 1,
  }));

  const [IM, setIM] = useState<Record<string, string>>({});
  const [view, setView] = useState<{ t: 'p' | 'm'; i: number; k?: 'A' | 'B' }>({ t: 'p', i: 0 });
  const [sel, setSel] = useState<number | null>(null);
  const [tool, setTool] = useState<'sel' | 'textFrame' | 'imgFrame' | 'pen' | 'drop'>('sel');
  const [scale, setScale] = useState<number>(1);
  const [col, setCol] = useState<string>('#d81b79');
  const [recent, setRecent] = useState<string[]>([
    '#14161a',
    '#ffffff',
    '#d81b79',
    '#0284c7',
    '#f59e0b',
    '#10b981',
  ]);
  const [defFam, setDefFam] = useState<string>('Cairo');
  const [hist, setHist] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');

  // Canva Sidebar State
  const [showInspector, setShowInspector] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 768));
  const [sidebarTab, setSidebarTab] = useState<'templates' | 'elements' | 'typography' | 'photos' | 'iconsFonts' | 'layers' | 'projects'>('templates');

  // Interactive Frame Drawing Box State (Click & Drag Text / Image Frame)
  const [drawingBox, setDrawingBox] = useState<{
    type: 'text' | 'img';
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);

  // Layout & Column Grid Settings Modal
  const [showLayoutModal, setShowLayoutModal] = useState(false);

  // Inline text editing state
  const [editingTextId, setEditingTextId] = useState<number | null>(null);

  // AI Modal State
  const [aiModalItem, setAiModalItem] = useState<Item | null>(null);

  // Design Auditor State
  const [isAuditorActive, setIsAuditorActive] = useState(false);
  const [auditIssues, setAuditIssues] = useState<DesignIssue[]>([]);

  // New Doc Wizard State
  const [showNewDocModal, setShowNewDocModal] = useState(false);

  // Developer Template Studio Modal State
  const [showDevTemplateModal, setShowDevTemplateModal] = useState(false);

  // Multi-user Collaborators State
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // Projects State
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string>('الآن');

  // Export Modal Sheet
  const [sheet, setSheet] = useState<{ open: boolean; title: string; content: React.ReactNode | null }>({
    open: false,
    title: '',
    content: null,
  });

  const stageRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uidRef = useRef<number>(1);
  const measureCanvasRef = useRef<CanvasRenderingContext2D | null>(null);
  const cachedImgs = useRef<Record<string, Promise<HTMLImageElement>>>({});
  const toastTimeoutRef = useRef<any>(null);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const getMeasureContext = () => {
    if (!measureCanvasRef.current) {
      const canvas = document.createElement('canvas');
      measureCanvasRef.current = canvas.getContext('2d');
    }
    return measureCanvasRef.current!;
  };

  const getImg = (k: string): Promise<HTMLImageElement> => {
    if (k in cachedImgs.current) return cachedImgs.current[k];
    const p = new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        const cv = document.createElement('canvas');
        cv.width = 200;
        cv.height = 200;
        const cx = cv.getContext('2d');
        if (cx) {
          cx.fillStyle = '#1e293b';
          cx.fillRect(0, 0, 200, 200);
          cx.fillStyle = '#94a3b8';
          cx.font = '14px sans-serif';
          cx.textAlign = 'center';
          cx.fillText('Image', 100, 105);
        }
        const fb = new Image();
        fb.src = cv.toDataURL();
        fb.onload = () => resolve(fb);
      };
      img.src = IM[k] || k;
    });
    cachedImgs.current[k] = p;
    return p;
  };

  const currentItems = useCallback((): Item[] => {
    if (view.t === 'p') {
      return doc.pages[view.i]?.items || [];
    }
    return doc.masters[view.k || 'A'] || [];
  }, [doc, view]);

  const getSelectedItem = useCallback((): Item | undefined => {
    return currentItems().find((i) => i.id === sel);
  }, [currentItems, sel]);

  const saveToStorage = useCallback(
    (newDoc: DocData, newIM = IM, newView = view) => {
      try {
        localStorage.setItem('ps_auto', JSON.stringify({ doc: newDoc, IM: newIM, view: newView }));
        const now = new Date();
        setLastAutoSavedTime(now.toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }));
        // Broadcast doc update to other tabs/collaborators
        multiUserSync.broadcastDocUpdate(newDoc);
      } catch (_) {}
    },
    [IM, view, isAr]
  );

  const snap = useCallback(() => {
    setHist((prev) => {
      const next = [...prev, JSON.stringify({ doc, view })];
      if (next.length > 50) next.shift();
      return next;
    });
    saveToStorage(doc);
  }, [doc, view, saveToStorage]);

  // Multi-user & Multi-tab Sync Setup
  useEffect(() => {
    multiUserSync.init(
      (users) => {
        setCollaborators(users);
      },
      (remoteDoc) => {
        // Optimistic sync if remote version is higher
        setDoc((prev) => {
          if ((remoteDoc.version || 0) > (prev.version || 0)) {
            toast(t('lockConflictResolved'));
            return remoteDoc;
          }
          return prev;
        });
      }
    );
    return () => multiUserSync.destroy();
  }, [t, toast]);

  // Broadcast presence when active page or item changes
  useEffect(() => {
    multiUserSync.broadcastPresence(view.i, sel);
  }, [view.i, sel]);

  // Run Design Audit when active or items change
  useEffect(() => {
    if (isAuditorActive && view.t === 'p') {
      const issues = auditDesign(doc, view.i);
      setAuditIssues(issues);
    }
  }, [isAuditorActive, doc, view]);

  // Fit canvas calculation
  const fit = useCallback(() => {
    if (!stageRef.current) return;
    const st = stageRef.current;
    const padding = st.clientWidth < 500 ? 16 : 32;
    const newScale = Math.max(0.05, Math.min((st.clientWidth - padding) / doc.w, (st.clientHeight - padding) / doc.h));
    setScale(newScale);
  }, [doc.w, doc.h]);

  useEffect(() => {
    fit();
    window.addEventListener('resize', fit);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && stageRef.current) {
      ro = new ResizeObserver(() => fit());
      ro.observe(stageRef.current);
    }
    return () => {
      window.removeEventListener('resize', fit);
      if (ro) ro.disconnect();
    };
  }, [fit, isSidebarOpen]);

  // Initial Load & Stored Templates
  useEffect(() => {
    try {
      const rawProjects = localStorage.getItem('ps_projects');
      if (rawProjects) setSavedProjects(JSON.parse(rawProjects));
    } catch (_) {}

    try {
      const raw = localStorage.getItem('ps_auto');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.doc?.pages?.length) {
          loadProject(parsed);
          return;
        }
      }
    } catch (_) {}

    const initialTmpl = TEMPLATE_CATEGORIES[0].items[0];
    const generatedItems = initialTmpl.generator(595.3, 841.9);
    let maxId = 1;
    generatedItems.forEach((i) => {
      i.id = maxId++;
    });
    uidRef.current = maxId;

    setDoc((prev) => ({
      ...prev,
      pages: [{ id: 'p1', m: '', items: generatedItems }],
    }));
  }, []);

  const loadProject = (o: { doc: DocData; IM?: Record<string, string> }) => {
    setDoc(o.doc);
    setIM(o.IM || {});
    cachedImgs.current = {};
    setView({ t: 'p', i: 0 });
    setSel(null);
    setHist([]);
    let m = 0;
    const sc = (arr: Item[]) => arr.forEach((i) => (m = Math.max(m, i.id || 0)));
    o.doc.pages.forEach((p) => sc(p.items));
    if (o.doc.masters?.A) sc(o.doc.masters.A);
    if (o.doc.masters?.B) sc(o.doc.masters.B);
    uidRef.current = m + 1;
  };

  const lay = (c: CanvasRenderingContext2D, it: Item, pStr: string) => {
    const tStr = (it.text || '').replace(/‹#›/g, pStr);
    c.font = `${it.b ? 700 : 400} ${it.fs || 16}px "${it.fam || defFam}"`;
    const isRtl = /[\u0590-\u08FF]/.test(tStr);
    c.direction = isRtl ? 'rtl' : 'ltr';
    const out: string[] = [];
    tStr.split('\n').forEach((par) => {
      let cur = '';
      par.split(' ').forEach((w) => {
        const tr = cur ? cur + ' ' + w : w;
        if (c.measureText(tr).width > it.w && cur) {
          out.push(cur);
          cur = w;
        } else {
          cur = tr;
        }
      });
      out.push(cur);
    });
    return { lines: out, rtl: isRtl };
  };

  const pd = (pts?: [number, number][]) => {
    if (!pts || pts.length < 1) return '';
    if (pts.length < 3) return 'M' + pts.map((q) => q.join(' ')).join('L');
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      d += `Q${pts[i][0]} ${pts[i][1]} ${((pts[i][0] + pts[i + 1][0]) / 2).toFixed(1)} ${(
        (pts[i][1] + pts[i + 1][1]) /
        2
      ).toFixed(1)}`;
    }
    const l = pts[pts.length - 1];
    return d + `L${l[0]} ${l[1]}`;
  };

  const updateItems = (callback: (items: Item[]) => Item[]) => {
    snap();
    setDoc((prev) => {
      if (view.t === 'p') {
        const nextPages = [...prev.pages];
        nextPages[view.i] = {
          ...nextPages[view.i],
          items: callback([...nextPages[view.i].items]),
        };
        const nextDoc = { ...prev, pages: nextPages };
        saveToStorage(nextDoc);
        return nextDoc;
      } else {
        const k = view.k || 'A';
        const nextMasters = {
          ...prev.masters,
          [k]: callback([...(prev.masters[k] || [])]),
        };
        const nextDoc = { ...prev, masters: nextMasters };
        saveToStorage(nextDoc);
        return nextDoc;
      }
    });
  };

  const addItem = (o: Partial<Item>) => {
    snap();
    const newId = uidRef.current++;
    const newItem: Item = {
      id: newId,
      type: o.type || 'text',
      x: o.x ?? doc.w * 0.15,
      y: o.y ?? doc.h * 0.15,
      w: o.w ?? 220,
      h: o.h ?? 110,
      color: o.color ?? col,
      ...o,
    };
    updateItems((items) => [...items, newItem]);
    setSel(newId);
    setTool('sel');
  };

  const setColor = (newColor: string) => {
    setCol(newColor);
    setRecent((prev) => [newColor, ...prev.filter((x) => x !== newColor)].slice(0, 10));
    const it = getSelectedItem();
    if (it && it.type !== 'img') {
      updateItems((items) => items.map((x) => (x.id === it.id ? { ...x, color: newColor } : x)));
    }
  };

  // Keyboard Shortcut: Delete/Backspace to delete selected layer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (sel === null || editingTextId !== null) return;
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        snap();
        updateItems((items) => items.filter((x) => x.id !== sel));
        setSel(null);
        toast(isAr ? 'تم حذف الطبقة المحددة 🗑️' : 'Selected layer deleted 🗑️');
      } else if (e.key === 't' || e.key === 'T') {
        setTool('textFrame');
        toast(isAr ? '✍️ أداة رسم مربع نص [T]: اسحب على الصفحة للرسم' : 'Text tool [T]: Drag to draw text box');
      } else if (e.key === 'f' || e.key === 'F') {
        setTool('imgFrame');
        toast(isAr ? '🖼️ أداة رسم مربع صورة [F]: اسحب على الصفحة للرسم' : 'Image frame tool [F]: Drag to draw image box');
      } else if (e.key === 'v' || e.key === 'V') {
        setTool('sel');
      } else if (e.key === 'w' || e.key === 'W') {
        setDoc((prev) => ({ ...prev, showGrid: !(prev.showGrid ?? true) }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sel, editingTextId, isAr, snap, updateItems, toast]);

  // Move Item
  const startMove = (e: React.PointerEvent, it: Item) => {
    if (tool !== 'sel' || it.locked || editingTextId === it.id) return;
    e.stopPropagation();
    if (sel !== it.id) setSel(it.id);

    const sx = e.clientX;
    const sy = e.clientY;
    const ox = it.x;
    const oy = it.y;
    let moved = false;

    const onPointerMove = (ev: PointerEvent) => {
      if (!moved) {
        snap();
        moved = true;
      }
      const nx = ox + (ev.clientX - sx) / scale;
      const ny = oy + (ev.clientY - sy) / scale;
      setDoc((prev) => {
        if (view.t === 'p') {
          const pages = [...prev.pages];
          pages[view.i] = {
            ...pages[view.i],
            items: pages[view.i].items.map((x) => (x.id === it.id ? { ...x, x: nx, y: ny } : x)),
          };
          return { ...prev, pages };
        } else {
          const k = view.k || 'A';
          return {
            ...prev,
            masters: {
              ...prev.masters,
              [k]: prev.masters[k].map((x) => (x.id === it.id ? { ...x, x: nx, y: ny } : x)),
            },
          };
        }
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      saveToStorage(doc);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Resize Item
  const startResize = (e: React.PointerEvent, it: Item) => {
    if (it.locked) return;
    e.stopPropagation();
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    const ow = it.w;
    const oh = it.h;
    snap();

    const onPointerMove = (ev: PointerEvent) => {
      const nw = Math.max(20, ow + (ev.clientX - sx) / scale);
      const nh = it.type === 'text' && !it.fixedH ? it.h : Math.max(20, oh + (ev.clientY - sy) / scale);

      setDoc((prev) => {
        if (view.t === 'p') {
          const pages = [...prev.pages];
          pages[view.i] = {
            ...pages[view.i],
            items: pages[view.i].items.map((x) => (x.id === it.id ? { ...x, w: nw, h: nh } : x)),
          };
          return { ...prev, pages };
        } else {
          const k = view.k || 'A';
          return {
            ...prev,
            masters: {
              ...prev.masters,
              [k]: prev.masters[k].map((x) => (x.id === it.id ? { ...x, w: nw, h: nh } : x)),
            },
          };
        }
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      saveToStorage(doc);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Pen Tool
  const [activePenPts, setActivePenPts] = useState<[number, number][] | null>(null);

  const startPen = (e: React.PointerEvent) => {
    if (!pageRef.current) return;
    const r = pageRef.current.getBoundingClientRect();
    const sw = Math.max(2, doc.w / 150);
    const getPt = (ev: { clientX: number; clientY: number }): [number, number] => [
      +((ev.clientX - r.left) / scale).toFixed(1),
      +((ev.clientY - r.top) / scale).toFixed(1),
    ];

    const pts: [number, number][] = [getPt(e)];
    setActivePenPts(pts);

    const onMove = (ev: PointerEvent) => {
      pts.push(getPt(ev));
      setActivePenPts([...pts]);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setActivePenPts(null);

      if (pts.length < 2) return;
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const pad = sw;
      const x0 = Math.min(...xs) - pad;
      const y0 = Math.min(...ys) - pad;
      const w = Math.max(...xs) - Math.min(...xs) + 2 * pad;
      const h = Math.max(...ys) - Math.min(...ys) + 2 * pad;

      const newIt: Item = {
        id: uidRef.current++,
        type: 'path',
        x: x0,
        y: y0,
        w,
        h,
        pw: w,
        ph: h,
        sw,
        color: col,
        pts: pts.map((p) => [+(p[0] - x0).toFixed(1), +(p[1] - y0).toFixed(1)]),
      };
      updateItems((items) => [...items, newIt]);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // EyeDropper
  const pickColor = async (e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const ie = el?.closest('.it') as HTMLElement | null;
    let picked = '#ffffff';

    if (ie && ie.dataset.id) {
      const it = currentItems().find((x) => String(x.id) === ie.dataset.id);
      if (it && it.type === 'img' && it.k) {
        const im = await getImg(it.k);
        const r = ie.getBoundingClientRect();
        const cv = document.createElement('canvas');
        cv.width = im.width;
        cv.height = im.height;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        if (cx) {
          cx.drawImage(im, 0, 0);
          const px = Math.min(im.width - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * im.width)));
          const py = Math.min(im.height - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * im.height)));
          const d = cx.getImageData(px, py, 1, 1).data;
          picked = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        }
      } else if (it && it.color) {
        picked = it.color;
      }
    }
    setTool('sel');
    setColor(picked);
    toast(isAr ? 'تم أخذ اللون ' + picked : 'Picked color ' + picked);
  };

  // Grid and Guide Calculations (InDesign Column & Margin System)
  const cols = doc.columns ?? 3;
  const gutterPt = (doc.gutter ?? 4) * MM;
  const mTop = (doc.margins?.top ?? 12) * MM;
  const mBottom = (doc.margins?.bottom ?? 12) * MM;
  const mInside = (doc.margins?.inside ?? 15) * MM;
  const mOutside = (doc.margins?.outside ?? 12) * MM;
  const mLeft = doc.binding === 'rtl' ? mOutside : mInside;
  const mRight = doc.binding === 'rtl' ? mInside : mOutside;
  const contentW = Math.max(20, doc.w - mLeft - mRight);
  const contentH = Math.max(20, doc.h - mTop - mBottom);
  const totalGutters = (cols - 1) * gutterPt;
  const colW = Math.max(10, (contentW - totalGutters) / cols);

  const snapCoordinateX = (rawX: number): number => {
    const snapDistance = 10 / scale;
    const targets: number[] = [0, doc.w, mLeft, doc.w - mRight];
    for (let i = 0; i < cols; i++) {
      const colLeft = mLeft + i * (colW + gutterPt);
      const colRight = colLeft + colW;
      targets.push(colLeft, colRight);
    }
    for (const t of targets) {
      if (Math.abs(rawX - t) <= snapDistance) return t;
    }
    return rawX;
  };

  const snapCoordinateY = (rawY: number): number => {
    const snapDistance = 10 / scale;
    const targets: number[] = [0, doc.h, mTop, doc.h - mBottom];
    for (const t of targets) {
      if (Math.abs(rawY - t) <= snapDistance) return t;
    }
    return rawY;
  };

  // Draw Text Box / Image Frame by Dragging or Clicking
  const startDrawFrame = (e: React.PointerEvent) => {
    if (!pageRef.current) return;
    const r = pageRef.current.getBoundingClientRect();
    const rawX = (e.clientX - r.left) / scale;
    const rawY = (e.clientY - r.top) / scale;
    const sx = snapCoordinateX(rawX);
    const sy = snapCoordinateY(rawY);

    const boxType = tool === 'textFrame' ? 'text' : 'img';
    setDrawingBox({
      type: boxType,
      startX: sx,
      startY: sy,
      curX: sx,
      curY: sy,
    });

    const onMove = (ev: PointerEvent) => {
      const cx = snapCoordinateX((ev.clientX - r.left) / scale);
      const cy = snapCoordinateY((ev.clientY - r.top) / scale);
      setDrawingBox((prev) => (prev ? { ...prev, curX: cx, curY: cy } : null));
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);

      const finalRawX = (ev.clientX - r.left) / scale;
      const finalRawY = (ev.clientY - r.top) / scale;
      const ex = snapCoordinateX(finalRawX);
      const ey = snapCoordinateY(finalRawY);

      let x = Math.min(sx, ex);
      let y = Math.min(sy, ey);
      let w = Math.abs(ex - sx);
      let h = Math.abs(ey - sy);

      setDrawingBox(null);

      // If user clicked or dragged very small (< 15px), auto-fit to nearest column!
      if (w < 15 || h < 15) {
        let bestCol = 0;
        for (let i = 0; i < cols; i++) {
          const cl = mLeft + i * (colW + gutterPt);
          if (sx >= cl - 10 && sx <= cl + colW + gutterPt) {
            bestCol = i;
            break;
          }
        }
        x = mLeft + bestCol * (colW + gutterPt);
        w = colW;
        y = Math.max(mTop, Math.min(doc.h - mBottom - 80, sy));
        h = boxType === 'text' ? Math.max(50, colW * 0.45) : colW * 0.75;
      }

      snap();
      const newId = uidRef.current++;
      if (boxType === 'text') {
        const newIt: Item = {
          id: newId,
          type: 'text',
          x: +x.toFixed(1),
          y: +y.toFixed(1),
          w: +Math.max(50, w).toFixed(1),
          h: +Math.max(30, h).toFixed(1),
          text: isAr ? 'اكتب النص هنا...' : 'Write text here...',
          fs: Math.min(36, Math.max(14, Math.round(h * 0.28))),
          fam: defFam || 'Cairo',
          color: col || '#14161a',
          name: isAr ? 'مربع نص' : 'Text Box',
          fixedH: true,
          cols: 1,
          gut: 10,
        };
        updateItems((items) => [...items, newIt]);
        setSel(newId);
        setTool('sel');
        setEditingTextId(newId);
        toast(isAr ? '✍️ تم رسم مربع النص! يمكنك الكتابة الآن' : '✍️ Text box drawn! Ready to edit');
      } else {
        const newIt: Item = {
          id: newId,
          type: 'img',
          x: +x.toFixed(1),
          y: +y.toFixed(1),
          w: +Math.max(50, w).toFixed(1),
          h: +Math.max(40, h).toFixed(1),
          name: isAr ? 'مربع صورة' : 'Image Box',
        };
        updateItems((items) => [...items, newIt]);
        setSel(newId);
        setTool('sel');
        toast(isAr ? '🖼️ تم رسم مربع الصورة! انقر عليه لرفع صورة أو اختيار من المكتبة' : '🖼️ Image frame created!');
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const undo = () => {
    if (!hist.length) {
      toast(isAr ? 'لا يوجد ما يمكن التراجع عنه' : 'Nothing to undo');
      return;
    }
    const nextHist = [...hist];
    const last = nextHist.pop();
    setHist(nextHist);
    if (last) {
      const o = JSON.parse(last);
      setDoc(o.doc);
      setView(o.view);
      setSel(null);
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const u = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 2400 / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = im.width * k;
      c.height = im.height * k;
      c.getContext('2d')?.drawImage(im, 0, 0, c.width, c.height);
      const key = 'i' + uidRef.current++;
      const dataUrl = c.toDataURL(f.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
      setIM((prev) => ({ ...prev, [key]: dataUrl }));
      const W = doc.w * 0.6;
      addItem({
        type: 'img',
        k: key,
        name: f.name.replace(/\.[^/.]+$/, ''),
        w: W,
        h: (W * c.height) / c.width,
      });
      URL.revokeObjectURL(u);
    };
    im.src = u;
  };

  const dlSave = async (name: string, data: Blob | string) => {
    try {
      const blob = typeof data === 'string' ? new Blob([data], { type: 'application/json;charset=utf-8' }) : data;
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], name)] })) {
        try {
          await navigator.share({
            files: [new File([blob], name)],
            title: name,
            text: 'مشروع استوديو المطبوعات',
          });
          toast(isAr ? 'تمت مشاركة الملف بنجاح' : 'Shared successfully');
          return;
        } catch (_) {}
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast((isAr ? 'تم حفظ الملف: ' : 'Saved: ') + name);
    } catch (e: any) {
      toast((isAr ? 'تعذّر الحفظ: ' : 'Save failed: ') + (e?.message || ''));
    }
  };

  const handleSaveProject = (projectName: string) => {
    const newProj: SavedProject = {
      id: `proj_${Date.now()}`,
      name: projectName,
      updatedAt: Date.now(),
      doc,
      IM,
    };
    const updated = [newProj, ...savedProjects.filter((p) => p.name !== projectName)];
    setSavedProjects(updated);
    try {
      localStorage.setItem('ps_projects', JSON.stringify(updated));
    } catch (_) {}
  };

  const handleDeleteProject = (projId: string) => {
    const updated = savedProjects.filter((p) => p.id !== projId);
    setSavedProjects(updated);
    try {
      localStorage.setItem('ps_projects', JSON.stringify(updated));
    } catch (_) {}
    toast(isAr ? 'تم حذف المشروع' : 'Deleted');
  };

  const handleExportMobileFile = () => {
    const backupJson = JSON.stringify({ v: 2, doc, IM }, null, 2);
    dlSave(`${doc.name.replace(/\s+/g, '_')}_project.json`, backupJson);
  };

  const handleAutoFix = (issue: DesignIssue) => {
    if (!issue.itemId) return;
    const it = currentItems().find((x) => x.id === issue.itemId);
    if (!it) return;

    if (issue.type === 'bleed') {
      const safeMargin = 24;
      const nx = Math.max(safeMargin, Math.min(doc.w - it.w - safeMargin, it.x));
      const ny = Math.max(safeMargin, Math.min(doc.h - it.h - safeMargin, it.y));
      updateItems((items) => items.map((x) => (x.id === it.id ? { ...x, x: nx, y: ny } : x)));
      toast(isAr ? 'تم نقل النص لمنطقة الأمان' : 'Moved safely inside bleed line');
    } else if (issue.type === 'contrast') {
      const newColor = it.color === '#ffffff' ? '#0f172a' : '#ffffff';
      updateItems((items) => items.map((x) => (x.id === it.id ? { ...x, color: newColor } : x)));
      toast(isAr ? 'تم ضبط تباين اللون تلقائياً' : 'Auto-adjusted contrast');
    }
  };

  const drawItemsOnCanvas = async (x: CanvasRenderingContext2D, list: Item[], pStr: string) => {
    for (const it of list) {
      if (it.hidden) continue;
      x.save();
      if (it.type === 'rect') {
        x.fillStyle = it.color || '#000';
        x.fillRect(it.x, it.y, it.w, it.h);
      } else if (it.type === 'ell') {
        x.fillStyle = it.color || '#000';
        x.beginPath();
        x.ellipse(it.x + it.w / 2, it.y + it.h / 2, it.w / 2, it.h / 2, 0, 0, Math.PI * 2);
        x.fill();
      } else if (it.type === 'img' && it.k) {
        try {
          const img = await getImg(it.k);
          drawImageFit(x, img, it);
        } catch (_) {}
      } else if (it.type === 'path' && it.pts) {
        x.translate(it.x, it.y);
        x.scale(it.w / (it.pw || it.w), it.h / (it.ph || it.h));
        x.strokeStyle = it.color || '#000';
        x.lineWidth = it.sw || 2;
        x.lineCap = 'round';
        x.lineJoin = 'round';
        x.stroke(new Path2D(pd(it.pts)));
      } else if (it.type === 'text') {
        const T = layoutText(x, it, pStr);
        const a = it.a || 'start';
        x.fillStyle = it.color || '#000';
        x.textBaseline = 'middle';
        x.direction = T.rtl ? 'rtl' : 'ltr';
        x.textAlign = a;
        T.columns.forEach((lines, ci) => {
          const cx0 = T.colX(ci);
          const ax = a === 'center' ? cx0 + T.colW / 2 : a === 'start' ? (T.rtl ? cx0 + T.colW : cx0) : T.rtl ? cx0 : cx0 + T.colW;
          lines.forEach((line, i) => x.fillText(line, ax, it.y + T.pad + (i + 0.5) * T.lh));
        });
      }
      x.restore();
    }
  };

  const renderPageToCanvas = async (pi: number, ppp: number, bl: number) => {
    const W = doc.w + 2 * bl;
    const H = doc.h + 2 * bl;
    const c = document.createElement('canvas');
    c.width = Math.round(W * ppp);
    c.height = Math.round(H * ppp);
    const x = c.getContext('2d')!;
    x.scale(ppp, ppp);
    x.fillStyle = '#fff';
    x.fillRect(0, 0, W, H);
    x.translate(bl, bl);

    const pg = doc.pages[pi];
    if (pg.m && doc.masters[pg.m]) {
      await drawItemsOnCanvas(x, doc.masters[pg.m], String(pi + 1));
    }
    await drawItemsOnCanvas(x, pg.items, String(pi + 1));
    return c;
  };

  const svgOfPage = (pi: number, bl: number) => {
    const W = doc.w + 2 * bl;
    const H = doc.h + 2 * bl;
    const pg = doc.pages[pi];
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/><g transform="translate(${bl} ${bl})">`;

    const f = (list: Item[], pStr: string) =>
      list.forEach((it) => {
        if (it.hidden) return;
        if (it.type === 'rect') {
          s += `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${it.color}"/>`;
        } else if (it.type === 'ell') {
          s += `<ellipse cx="${it.x + it.w / 2}" cy="${it.y + it.h / 2}" rx="${it.w / 2}" ry="${it.h / 2}" fill="${it.color}"/>`;
        } else if (it.type === 'img' && it.k) {
          s += `<image x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" preserveAspectRatio="${it.fit === 'contain' ? 'xMidYMid meet' : it.fit === 'fill' ? 'none' : 'xMidYMid slice'}" href="${IM[it.k] || it.k}"/>`;
        } else if (it.type === 'path' && it.pts) {
          s += `<path transform="translate(${it.x} ${it.y}) scale(${it.w / (it.pw || it.w)} ${it.h / (it.ph || it.h)})" d="${pd(
            it.pts
          )}" fill="none" stroke="${it.color}" stroke-width="${it.sw || 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
        } else if (it.type === 'text') {
          const T = layoutText(getMeasureContext(), it, pStr);
          const a = it.a || 'start';
          T.columns.forEach((lines, ci) => {
            const cx0 = T.colX(ci);
            const ax = a === 'center' ? cx0 + T.colW / 2 : a === 'start' ? (T.rtl ? cx0 + T.colW : cx0) : T.rtl ? cx0 : cx0 + T.colW;
            lines.forEach((line, i) => {
              s += `<text x="${ax}" y="${it.y + T.pad + (i + 0.5) * T.lh}" font-family="${it.fam}" font-size="${it.fs}" font-weight="${it.b ? 700 : 400}" fill="${it.color}" direction="${T.rtl ? 'rtl' : 'ltr'}" text-anchor="${a === 'center' ? 'middle' : a}" dominant-baseline="central">${esc(line)}</text>`;
            });
          });
        }
      });

    if (pg.m && doc.masters[pg.m]) f(doc.masters[pg.m], String(pi + 1));
    f(pg.items, String(pi + 1));
    return s + '</g></svg>';
  };

  const ensureFonts = async () => {
    const fs = new Set<string>();
    [...doc.pages.flatMap((p) => p.items), ...(doc.masters.A || []), ...(doc.masters.B || [])].forEach((i) => i.fam && fs.add(i.fam));
    await Promise.all(
      [...fs].map((f) =>
        Promise.all([document.fonts.load(`400 20px "${f}"`), document.fonts.load(`700 20px "${f}"`)])
      )
    );
    for (const k in IM) {
      await getImg(k);
    }
  };

  const openExportSheet = () => {
    setSheet({
      open: true,
      title: isAr ? 'تصدير المستند والطباعة' : 'Export & Print Document',
      content: (
        <ExportModalContent
          doc={doc}
          view={view}
          ensureFonts={ensureFonts}
          renderPageToCanvas={renderPageToCanvas}
          svgOfPage={svgOfPage}
          dlSave={dlSave}
          toast={toast}
          close={() => setSheet({ open: false, title: '', content: null })}
          IM={IM}
          lang={lang}
        />
      ),
    });
  };

  const selectedItem = getSelectedItem();
  const pageNumStr = view.t === 'm' ? '‹#›' : String(view.i + 1);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="h-full flex flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)]"
      data-theme={theme === 'auto' ? undefined : theme}
    >
      {/* Top Header Bar */}
      <header className="ps-bar border-b border-[var(--bd)] justify-between px-2 sm:px-4">
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto scrollbar-none">
          {/* Slide in / out drawer toggle button */}
          <button
            className={`ps-btn text-xs py-1 px-2.5 font-bold transition-all flex items-center gap-1.5 ${
              isSidebarOpen ? 'bg-[var(--ac)] text-[var(--acf)] shadow-sm' : 'bg-[var(--row)] hover:bg-[var(--bd)]'
            }`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? (isAr ? 'طي شريط القوالب للداخل' : 'Retract sidebar') : (isAr ? 'إخراج شريط القوالب' : 'Slide out sidebar')}
          >
            <span>⊞</span>
            <span>{isAr ? 'القوالب' : 'Templates'}</span>
            <span className="text-[10px] opacity-75">{isSidebarOpen ? (isAr ? '‹' : '›') : (isAr ? '›' : '‹')}</span>
          </button>

          <button
            className="ps-btn text-xs py-1 px-2.5 font-bold bg-[var(--row)]"
            onClick={() => setShowNewDocModal(true)}
            title="إنشاء مستند جديد"
          >
            📄 {t('newFile')}
          </button>

          <div className="flex items-center bg-[var(--row)] rounded-lg p-0.5 border border-[var(--bd)] text-xs">
            <span className="font-semibold px-2 py-0.5">{doc.size}</span>
            <span className="text-[10px] text-[var(--mut)] px-1 border-r border-[var(--bd)]">
              {doc.colorMode} · {doc.facingPages ? t('facingPages') : t('singlePages')}
            </span>
          </div>

          {/* Layout & Column Grid Settings Button */}
          <button
            className="ps-btn text-xs py-1 px-2.5 font-bold bg-[var(--row)] hover:bg-[var(--bd)] flex items-center gap-1.5"
            onClick={() => setShowLayoutModal(true)}
            title={isAr ? 'تعديل أعمدة الصفحة والهوامش وفواصل Gutter' : 'Adjust Layout, Columns & Margins'}
          >
            <span>📐</span>
            <span className="hidden md:inline">{isAr ? 'الأعمدة والهوامش' : 'Columns & Margins'}</span>
          </button>

          {/* Toggle Column Guides Button */}
          <button
            className={`ps-btn text-xs py-1 px-2 font-bold flex items-center gap-1 transition-all ${
              doc.showGrid !== false ? 'bg-sky-500/15 text-sky-600 border-sky-400/30' : 'bg-[var(--row)] text-[var(--mut)]'
            }`}
            onClick={() => {
              const nextGrid = !(doc.showGrid ?? true);
              setDoc((prev) => ({ ...prev, showGrid: nextGrid }));
              toast(nextGrid ? (isAr ? 'تم إظهار شبكة الأعمدة والهوامش' : 'Guides shown') : (isAr ? 'تم إخفاء شبكة الأعمدة' : 'Guides hidden'));
            }}
            title={isAr ? 'تبديل إظهار شبكة الأعمدة [W]' : 'Toggle Guides [W]'}
          >
            <span>▥</span>
            <span className="hidden lg:inline">{isAr ? 'الشبكة' : 'Guides'}</span>
          </button>

          {/* Collaborators Active Indicator */}
          {collaborators.length > 0 && (
            <div
              className="hidden md:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-lg text-xs"
              title={t('collaboratingCount', { count: collaborators.length + 1 })}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{collaborators.length + 1} {isAr ? 'متصل' : 'online'}</span>
            </div>
          )}

          {/* Pages navigation */}
          <div className="flex items-center bg-[var(--row)] rounded-lg p-0.5 border border-[var(--bd)]">
            <button
              className="px-2 py-1 text-sm hover:opacity-75 disabled:opacity-30"
              disabled={view.t === 'm' || view.i >= doc.pages.length - 1}
              onClick={() => {
                if (view.t === 'p' && view.i < doc.pages.length - 1) {
                  setView({ t: 'p', i: view.i + 1 });
                  setSel(null);
                }
              }}
              title={t('nextPage')}
            >
              ›
            </button>
            <span className="px-2 py-1 text-xs font-semibold whitespace-nowrap">
              {view.t === 'p'
                ? t('pageOf', { current: view.i + 1, total: doc.pages.length })
                : `${view.k}-Master`}
            </span>
            <button
              className="px-2 py-1 text-sm hover:opacity-75 disabled:opacity-30"
              disabled={view.t === 'm' || view.i <= 0}
              onClick={() => {
                if (view.t === 'p' && view.i > 0) {
                  setView({ t: 'p', i: view.i - 1 });
                  setSel(null);
                }
              }}
              title={t('prevPage')}
            >
              ‹
            </button>
          </div>
        </div>

        {/* Center / Right Control Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Design Auditor Button */}
          <button
            className={`ps-btn text-xs py-1 px-2.5 font-semibold transition-all ${
              isAuditorActive
                ? 'bg-rose-500 text-white border-rose-500 ring-2 ring-rose-400/40'
                : 'hover:bg-rose-500/10 hover:text-rose-500'
            }`}
            onClick={() => {
              setIsAuditorActive(!isAuditorActive);
              toast(isAuditorActive ? 'إغلاق الفاحص' : 'تفعيل فحص أسس التصميم');
            }}
            title={t('designAudit')}
          >
            <span>🔍 {t('designAudit')}</span>
            {isAuditorActive && auditIssues.length > 0 && (
              <span className="mr-1 px-1.5 py-0.2 rounded-full bg-white text-rose-600 text-[10px] font-bold">
                {auditIssues.length}
              </span>
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="ps-btn text-xs py-1 px-2 bg-[var(--row)] font-bold"
            title="تبديل اللغة / Toggle Language"
          >
            🌐 {lang === 'ar' ? 'English' : 'العربية'}
          </button>

          {/* Theme switcher */}
          <button
            className="ps-btn text-xs py-1 px-2"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            title="المظهر"
          >
            {theme === 'dark' ? t('lightMode') : t('darkMode')}
          </button>

          <button className="ps-btn text-xs py-1 px-2.5 hidden sm:inline-flex" onClick={undo} title={t('undo')}>
            ↩ {t('undo')}
          </button>

          <button
            className="ps-btn ps-btn-primary text-xs py-1 px-3 sm:px-4 font-bold"
            onClick={openExportSheet}
            title={t('exportBtn')}
          >
            ⎙ {t('exportBtn')}
          </button>
        </div>
      </header>

      {/* Main Workspace: Canva Sidebar + Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        <CanvaSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          doc={doc}
          currentPageItems={currentItems()}
          selectedItemId={sel}
          onSelectItem={(id) => {
            setSel(id);
            setTool('sel');
          }}
          onAddItem={addItem}
          onDeleteItem={(id) => {
            snap();
            updateItems((items) => items.filter((x) => x.id !== id));
            if (sel === id) {
              setSel(null);
              setEditingTextId(null);
            }
            toast(isAr ? 'تم حذف الطبقة 🗑️' : 'Layer deleted 🗑️');
          }}
          onDuplicateItem={(id) => {
            snap();
            const target = currentItems().find((x) => x.id === id);
            if (target) {
              const copy = JSON.parse(JSON.stringify(target));
              copy.id = uidRef.current++;
              copy.x += 16;
              copy.y += 16;
              updateItems((items) => [...items, copy]);
              setSel(copy.id);
              toast(isAr ? 'تم تكرار الطبقة ⧉' : 'Layer duplicated ⧉');
            }
          }}
          onApplyTemplate={(newItems) => {
            let maxId = uidRef.current;
            newItems.forEach((it) => (it.id = maxId++));
            uidRef.current = maxId;
            updateItems(() => newItems);
            const mainText =
              newItems.find((x) => x.type === 'text' && (x.fs || 0) >= 30) ||
              newItems.find((x) => x.type === 'text');
            if (mainText) {
              setSel(mainText.id);
            } else {
              setSel(null);
            }
            setEditingTextId(null);
            setTool('sel');
          }}
          onUpdateItems={updateItems}
          onSaveProject={handleSaveProject}
          savedProjects={savedProjects}
          onLoadProject={(p) => {
            loadProject(p);
            toast(`تم فتح مشروع «${p.name}»`);
          }}
          onDeleteProject={handleDeleteProject}
          onExportMobileFile={handleExportMobileFile}
          onOpenDeveloperStudio={() => setShowDevTemplateModal(true)}
          lastAutoSavedTime={lastAutoSavedTime}
          toast={toast}
          lang={lang}
          onUploadImageClick={() => fileInputRef.current?.click()}
        />

        {isSidebarOpen && (
          <div
            className="md:hidden absolute inset-0 bg-black/40 z-10"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Canvas Stage */}
        <div
          ref={stageRef}
          className="ps-stage flex-1"
          onPointerDown={(e) => {
            if (e.target === stageRef.current) {
              setSel(null);
              setEditingTextId(null);
            }
          }}
        >
          <div
            style={{
              margin: 'auto',
              flex: 'none',
              position: 'relative',
              width: `${doc.w * scale}px`,
              height: `${doc.h * scale}px`,
            }}
          >
            {/* The Document Page */}
            <div
              ref={pageRef}
              className="ps-page relative shadow-2xl transition-shadow"
              style={{
                width: `${doc.w}px`,
                height: `${doc.h}px`,
                transform: `scale(${scale})`,
                touchAction: tool === 'pen' ? 'none' : 'auto',
                cursor:
                  tool === 'textFrame' || tool === 'imgFrame' || tool === 'pen'
                    ? 'crosshair'
                    : tool === 'drop'
                    ? 'cell'
                    : 'default',
              }}
              onPointerDown={(e) => {
                if (tool === 'pen') {
                  e.preventDefault();
                  e.stopPropagation();
                  startPen(e);
                } else if (tool === 'drop') {
                  e.preventDefault();
                  e.stopPropagation();
                  pickColor(e);
                } else if (tool === 'textFrame' || tool === 'imgFrame') {
                  e.preventDefault();
                  e.stopPropagation();
                  startDrawFrame(e);
                }
              }}
            >
              {/* Bleed Safety Line */}
              {doc.bleed > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none border border-dashed border-rose-400/40 z-10"
                  style={{ margin: `${doc.bleed * MM}px` }}
                  title="خط الأمان للهامش الخارجي والقص (Bleed)"
                />
              )}

              {/* Column Grid & Margin Guides (InDesign Style) */}
              {doc.showGrid !== false && (
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                  {/* Margin Boundary Box */}
                  <div
                    className="absolute border border-purple-500/40 border-dashed"
                    style={{
                      left: `${mLeft}px`,
                      top: `${mTop}px`,
                      width: `${contentW}px`,
                      height: `${contentH}px`,
                    }}
                  />

                  {/* Columns and Gutters */}
                  {Array.from({ length: cols }).map((_, i) => {
                    const colLeft = mLeft + i * (colW + gutterPt);
                    return (
                      <React.Fragment key={i}>
                        {/* Column Area Guide */}
                        <div
                          className="absolute border-x border-cyan-500/25 bg-cyan-500/[0.015]"
                          style={{
                            left: `${colLeft}px`,
                            top: `${mTop}px`,
                            width: `${colW}px`,
                            height: `${contentH}px`,
                          }}
                        />
                        {/* Gutter Guide Area (between columns) */}
                        {i < cols - 1 && gutterPt > 0 && (
                          <div
                            className="absolute bg-purple-500/[0.04] border-x border-dashed border-purple-400/20"
                            style={{
                              left: `${colLeft + colW}px`,
                              top: `${mTop}px`,
                              width: `${gutterPt}px`,
                              height: `${contentH}px`,
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Master Page Items behind */}
              {view.t === 'p' && doc.pages[view.i]?.m && doc.masters[doc.pages[view.i].m]?.map((it) => (
                <RenderItemComponent
                  key={`master-${it.id}`}
                  it={it}
                  isLive={false}
                  isSelected={false}
                  pageNum={String(view.i + 1)}
                  lay={lay}
                  pd={pd}
                  IM={IM}
                  measureCtx={getMeasureContext()}
                />
              ))}

              {/* Current View Items */}
              {currentItems().map((it) => (
                <RenderItemComponent
                  key={it.id}
                  it={it}
                  isLive={true}
                  isSelected={it.id === sel}
                  isEditingText={editingTextId === it.id}
                  tool={tool}
                  pageNum={pageNumStr}
                  lay={lay}
                  pd={pd}
                  IM={IM}
                  measureCtx={getMeasureContext()}
                  onSelect={(e) => {
                    if (tool === 'sel') {
                      e.stopPropagation();
                      setSel(it.id);
                    }
                  }}
                  onStartMove={(e) => startMove(e, it)}
                  onStartResize={(e) => startResize(e, it)}
                  onOpenAi={() => setAiModalItem(it)}
                  onStartTextEdit={() => {
                    setEditingTextId(it.id);
                    setSel(it.id);
                  }}
                  onUpdateText={(newText) => {
                    updateItems((items) => items.map((x) => (x.id === it.id ? { ...x, text: newText } : x)));
                  }}
                  onEndTextEdit={() => {
                    setEditingTextId(null);
                  }}
                  onUploadImagePrompt={() => {
                    fileInputRef.current?.click();
                  }}
                />
              ))}

              {/* Interactive Frame Drawing Preview (Live Click & Drag) */}
              {drawingBox && (
                <div
                  className="absolute pointer-events-none z-30"
                  style={{
                    left: `${Math.min(drawingBox.startX, drawingBox.curX)}px`,
                    top: `${Math.min(drawingBox.startY, drawingBox.curY)}px`,
                    width: `${Math.max(2, Math.abs(drawingBox.curX - drawingBox.startX))}px`,
                    height: `${Math.max(2, Math.abs(drawingBox.curY - drawingBox.startY))}px`,
                  }}
                >
                  <div
                    className={`w-full h-full relative border-2 ${
                      drawingBox.type === 'text'
                        ? 'border-sky-500 bg-sky-500/10 border-dashed'
                        : 'border-purple-500 bg-purple-500/10 border-dashed'
                    }`}
                  >
                    {/* InDesign Graphic Frame X cross if image */}
                    {drawingBox.type === 'img' && (
                      <svg className="w-full h-full absolute inset-0 opacity-40">
                        <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="1" className="text-purple-600" />
                        <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" className="text-purple-600" />
                      </svg>
                    )}

                    {/* Dimensions Tooltip */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow whitespace-nowrap z-40">
                      {Math.round(Math.abs(drawingBox.curX - drawingBox.startX) / MM)} × {Math.round(Math.abs(drawingBox.curY - drawingBox.startY) / MM)} مم
                      ({Math.round(Math.abs(drawingBox.curX - drawingBox.startX))}×{Math.round(Math.abs(drawingBox.curY - drawingBox.startY))} pt)
                    </div>
                  </div>
                </div>
              )}

              {/* Live Pen drawing */}
              {activePenPts && activePenPts.length > 1 && (
                <svg
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                  }}
                  viewBox={`0 0 ${doc.w} ${doc.h}`}
                >
                  <path
                    d={pd(activePenPts)}
                    fill="none"
                    stroke={col}
                    strokeWidth={Math.max(2, doc.w / 150)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {/* Design Auditor Markers */}
              {isAuditorActive && (
                <DesignAuditOverlay
                  issues={auditIssues}
                  scale={scale}
                  doc={doc}
                  onAutoFix={handleAutoFix}
                  onClose={() => setIsAuditorActive(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedItem && tool === 'sel' && showInspector && (
        <FrameInspector
          item={selectedItem}
          isAr={isAr}
          onChange={(patch) =>
            updateItems((items) => items.map((x) => (x.id === selectedItem.id ? { ...x, ...patch } : x)))
          }
        />
      )}

      {/* Selected Item Floating Properties Toolbar */}
      {selectedItem && tool === 'sel' && (
        <div className="ps-bar border-t border-[var(--bd)] bg-[var(--bar)] py-1.5 px-3 z-30 overflow-x-auto">
          {/* AI Magic Button */}
          <button
            className="ps-btn text-xs py-1 px-3 font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 shadow-sm hover:opacity-90 shrink-0"
            onClick={() => setAiModalItem(selectedItem)}
            title={t('itemAiEdit')}
          >
            {t('itemAiEdit')}
          </button>
          <button
            className={`ps-btn text-xs py-1 px-3 font-bold shrink-0 ${showInspector ? 'bg-[var(--ac)] text-[var(--acf)]' : 'bg-[var(--row)]'}`}
            onClick={() => setShowInspector(!showInspector)}
          >
            📐 {isAr ? 'المساحة والأعمدة' : 'Frame & Columns'}
          </button>
          <span className="sep" />

          {selectedItem.type === 'img' && (
            <>
              <button
                className="ps-btn text-xs py-1 px-3 bg-purple-500/15 text-purple-600 border border-purple-400/30 font-bold shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title={isAr ? 'رفع صورة من جهازك لهذا الإطار' : 'Upload image for frame'}
              >
                📁 {isAr ? 'رفع صورة' : 'Upload Image'}
              </button>
              <button
                className="ps-btn text-xs py-1 px-3 bg-[var(--row)] shrink-0"
                onClick={() => {
                  setSidebarTab('photos');
                  if (!isSidebarOpen) setIsSidebarOpen(true);
                }}
                title={isAr ? 'اختيار صورة من مكتبة البرنامج' : 'Stock Photos Library'}
              >
                🖼️ {isAr ? 'مكتبة الصور' : 'Photos'}
              </button>
              <span className="sep" />
            </>
          )}

          {selectedItem.type !== 'img' && (
            <>
              <input
                type="color"
                value={selectedItem.color || col}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-[var(--bd)] p-0.5 shrink-0"
                title={t('itemColor')}
              />
              <div className="flex items-center gap-1.5 shrink-0">
                {recent.slice(0, 6).map((c, i) => (
                  <button key={i} onClick={() => setColor(c)} className="sw" style={{ background: c }} title={c} />
                ))}
              </div>
              <span className="sep" />
            </>
          )}

          {selectedItem.type === 'text' && (
            <>
              {/* Quick Text Editor Input & Auto-Fit Width Button */}
              <div className="flex items-center gap-1.5 shrink-0 bg-[var(--row)] px-2 py-0.5 rounded-lg border border-[var(--bd)]">
                <span className="text-[11px] font-bold text-[var(--mut)]">✍️ {isAr ? 'النص:' : 'Text:'}</span>
                <input
                  type="text"
                  value={selectedItem.text || ''}
                  onChange={(e) => {
                    const newT = e.target.value;
                    updateItems((items) => items.map((x) => (x.id === selectedItem.id ? { ...x, text: newT } : x)));
                  }}
                  className="ps-input text-xs py-0.5 px-2 w-44 sm:w-64 font-medium bg-transparent border-0 focus:outline-none"
                  placeholder={isAr ? 'اكتب أو عدل النص كاملاً هنا...' : 'Edit complete text here...'}
                />
                <button
                  className="ps-btn text-[10px] py-0.5 px-2 font-bold bg-sky-500/15 text-sky-600 border border-sky-400/30 rounded"
                  onClick={() => setEditingTextId(selectedItem.id)}
                  title={isAr ? 'تحرير النص في مساحة العمل' : 'Inline Edit'}
                >
                  ✏️ {isAr ? 'تحرير مباشر' : 'Inline Edit'}
                </button>
                <button
                  className="ps-btn text-[10px] py-0.5 px-2 font-bold bg-[var(--bar)] text-[var(--fg)] border border-[var(--bd)] rounded"
                  onClick={() => {
                    const ctx = getMeasureContext();
                    ctx.font = `${selectedItem.b ? 700 : 400} ${selectedItem.fs || 16}px "${selectedItem.fam || defFam}"`;
                    const measuredW = Math.max(80, Math.min(doc.w - 30, ctx.measureText(selectedItem.text || '').width + 30));
                    updateItems((items) => items.map((x) => (x.id === selectedItem.id ? { ...x, w: measuredW } : x)));
                    toast(isAr ? 'تم ضبط عرض مربع النص ليحتوي كامل العبارة' : 'Fitted box width');
                  }}
                  title={isAr ? 'ملاءمة عرض المربع مع طول العبارة' : 'Fit Box Width'}
                >
                  ↔ {isAr ? 'ملاءمة العرض' : 'Fit Width'}
                </button>
              </div>
              <span className="sep" />

              <select
                value={selectedItem.fam || defFam}
                onChange={(e) => {
                  const f = e.target.value;
                  setDefFam(f);
                  updateItems((items) => items.map((x) => (x.id === selectedItem.id ? { ...x, fam: f } : x)));
                }}
                className="ps-select text-xs py-1 px-2 font-semibold shrink-0"
              >
                {FONTS.map(([f, d]) => (
                  <option key={f} value={f}>
                    {f} ({d})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] text-[var(--mut)]">{t('itemSize')}:</span>
                <input
                  type="range"
                  min="8"
                  max="160"
                  value={selectedItem.fs || 16}
                  onChange={(e) => {
                    const newFs = +e.target.value;
                    updateItems((items) => items.map((x) => (x.id === selectedItem.id ? { ...x, fs: newFs } : x)));
                  }}
                  className="w-20 accent-[var(--ac)]"
                />
                <span className="text-[11px] tabular-nums w-6">{selectedItem.fs}</span>
              </div>

              <button
                className={`ps-btn text-xs py-1 px-2.5 ${selectedItem.b ? 'ps-btn-primary' : ''}`}
                onClick={() => {
                  updateItems((items) => items.map((x) => (x.id === selectedItem.id ? { ...x, b: x.b ? 0 : 1 } : x)));
                }}
              >
                {t('itemBold')} B
              </button>

              <button
                className="ps-btn text-xs py-1 px-2.5"
                onClick={() => {
                  const nextAlign = selectedItem.a === 'start' ? 'center' : selectedItem.a === 'center' ? 'end' : 'start';
                  updateItems((items) => items.map((x) => (x.id === selectedItem.id ? { ...x, a: nextAlign } : x)));
                }}
              >
                {t('itemAlign')}
              </button>
              <span className="sep" />
            </>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <button
              className="ps-btn text-xs py-1 px-2"
              onClick={() => {
                snap();
                const copy = JSON.parse(JSON.stringify(selectedItem));
                copy.id = uidRef.current++;
                copy.x += 16;
                copy.y += 16;
                updateItems((items) => [...items, copy]);
                setSel(copy.id);
                toast(isAr ? 'تم تكرار العنصر' : 'Duplicated');
              }}
              title={t('itemDuplicate')}
            >
              {t('itemDuplicate')}
            </button>

            <button
              className="ps-btn text-xs py-1 px-2 text-rose-500 hover:bg-rose-500/10"
              onClick={() => {
                snap();
                updateItems((items) => items.filter((x) => x.id !== selectedItem.id));
                setSel(null);
                toast(isAr ? 'تم حذف العنصر' : 'Deleted');
              }}
              title={t('itemDelete')}
            >
              {t('itemDelete')} 🗑️
            </button>
          </div>
        </div>
      )}

      {/* Bottom Tool Dock (Clean Canvas Tools, InDesign Tools) */}
      <footer className="ps-bar border-t border-[var(--bd)] justify-around sm:justify-center sm:gap-4 py-1 z-20">
        <button
          className={`ps-dock-btn ${tool === 'sel' ? 'act' : ''}`}
          onClick={() => setTool('sel')}
          title={isAr ? 'أداة التحديد والتحريك [V]' : 'Select Tool [V]'}
        >
          <b>↖</b>
          <span>{t('toolSelect')}</span>
        </button>

        <button
          className={`ps-dock-btn ${tool === 'textFrame' ? 'act' : ''}`}
          onClick={() => {
            const next = tool === 'textFrame' ? 'sel' : 'textFrame';
            setTool(next);
            if (next === 'textFrame') toast(isAr ? '✍️ اسحب على الصفحة لرسم مربع نص [T]' : 'Drag on page to draw text box [T]');
          }}
          title={isAr ? 'أداة رسم مربع نص [T]: اسحب لتحديد الأبعاد' : 'Draw Text Box Tool [T]'}
        >
          <b>T</b>
          <span>{isAr ? 'رسم نص' : 'Text Box'}</span>
        </button>

        <button
          className={`ps-dock-btn ${tool === 'imgFrame' ? 'act' : ''}`}
          onClick={() => {
            const next = tool === 'imgFrame' ? 'sel' : 'imgFrame';
            setTool(next);
            if (next === 'imgFrame') toast(isAr ? '🖼️ اسحب على الصفحة لرسم مربع صورة [F]' : 'Drag on page to draw image box [F]');
          }}
          title={isAr ? 'أداة رسم مربع صورة [F]: اسحب لتحديد الأبعاد' : 'Draw Image Frame Tool [F]'}
        >
          <b>⌧</b>
          <span>{isAr ? 'رسم صورة' : 'Image Box'}</span>
        </button>

        <button
          className={`ps-dock-btn ${tool === 'pen' ? 'act' : ''}`}
          onClick={() => {
            const next = tool === 'pen' ? 'sel' : 'pen';
            setTool(next);
            if (next === 'pen') setSel(null);
          }}
          title={isAr ? 'أداة القلم والرسم الحر' : 'Pen Tool'}
        >
          <b>✎</b>
          <span>{t('toolPen')}</span>
        </button>

        <button
          className={`ps-dock-btn ${tool === 'drop' ? 'act' : ''}`}
          onClick={() => {
            const next = tool === 'drop' ? 'sel' : 'drop';
            setTool(next);
            if (next === 'drop') toast(isAr ? 'اضغط على أي عنصر لأخذ لونه' : 'Click item to sample color');
          }}
          title={isAr ? 'قطارة سحب الألوان' : 'Color Eyedropper'}
        >
          <b>◉</b>
          <span>{t('toolEyedropper')}</span>
        </button>

        <button
          className={`ps-dock-btn ${doc.showGrid !== false ? 'text-sky-600 font-bold' : ''}`}
          onClick={() => {
            const nextGrid = !(doc.showGrid ?? true);
            setDoc((prev) => ({ ...prev, showGrid: nextGrid }));
            toast(nextGrid ? (isAr ? 'تم إظهار شبكة الأعمدة والهوامش' : 'Guides shown') : (isAr ? 'تم إخفاء شبكة الأعمدة' : 'Guides hidden'));
          }}
          title={isAr ? 'تبديل إظهار شبكة الأعمدة والهوامش [W]' : 'Toggle Guides [W]'}
        >
          <b>▥</b>
          <span>{isAr ? 'الشبكة' : 'Guides'}</span>
        </button>

        <button
          className="ps-dock-btn"
          onClick={() => setShowLayoutModal(true)}
          title={isAr ? 'تعديل أعمدة الصفحة والهوامش وفواصل Gutter' : 'Adjust Layout, Columns & Margins'}
        >
          <b>📐</b>
          <span>{isAr ? 'الأعمدة' : 'Layout'}</span>
        </button>

        <button
          className="ps-dock-btn"
          onClick={fit}
          title={isAr ? 'ملائمة الصفحة لمساحة الشاشة' : 'Fit to screen'}
        >
          <b>⚲</b>
          <span>{isAr ? 'ملائمة' : 'Fit'}</span>
        </button>

        <button
          className="ps-dock-btn"
          onClick={undo}
          title={isAr ? 'تراجع عن آخر تعديل' : 'Undo'}
        >
          <b>↩</b>
          <span>{t('undo')}</span>
        </button>

        {/* Hidden File Input */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      </footer>

      {/* AI Assistant Chat Modal with IN-BOX Staging Preview & Confirm */}
      {aiModalItem && (
        <div
          className="sheet-backdrop z-50 flex items-center justify-center p-3"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAiModalItem(null);
          }}
        >
          <div className="bg-[var(--bar)] border border-[var(--bd)] shadow-2xl rounded-2xl w-full max-w-md p-4 animate-in zoom-in-95 duration-150">
            <AIDialog
              item={aiModalItem}
              imageDataUrl={aiModalItem.k ? (IM[aiModalItem.k] || aiModalItem.k) : undefined}
              onUpdateItem={(updates) => {
                updateItems((items) => items.map((x) => (x.id === aiModalItem.id ? { ...x, ...updates } : x)));
                setAiModalItem((prev) => (prev ? { ...prev, ...updates } : null));
              }}
              onUpdateImage={(key, dataUrl) => {
                setIM((prev) => ({ ...prev, [key]: dataUrl }));
                saveToStorage(doc, { ...IM, [key]: dataUrl });
              }}
              onAddMultipleItems={(newItems, newImages) => {
                setIM((prev) => ({ ...prev, ...newImages }));
                updateItems((items) => {
                  const filtered = items.filter((x) => x.id !== aiModalItem.id);
                  return [...filtered, ...newItems];
                });
                setAiModalItem(null);
                setSel(newItems[0]?.id || null);
              }}
              onClose={() => setAiModalItem(null)}
              toast={toast}
              lang={lang}
            />
          </div>
        </div>
      )}

      {/* Developer Template Studio Modal */}
      {showDevTemplateModal && (
        <DeveloperTemplateModal
          currentPageItems={currentItems()}
          doc={doc}
          onClose={() => setShowDevTemplateModal(false)}
          toast={toast}
        />
      )}

      {/* New Document Setup Wizard */}
      {showNewDocModal && (
        <NewDocModal
          onConfirm={(newDoc) => {
            setDoc(newDoc);
            setView({ t: 'p', i: 0 });
            setSel(null);
            setShowNewDocModal(false);
            toast(`تم إنشاء مستند جديد: ${newDoc.name}`);
          }}
          onCancel={() => setShowNewDocModal(false)}
        />
      )}

      {/* Layout & Column Grid Settings Modal */}
      {showLayoutModal && (
        <LayoutGridModal
          doc={doc}
          onUpdate={(updated) => {
            snap();
            setDoc((prev) => ({ ...prev, ...updated }));
            toast(isAr ? 'تم تحديث تخطيط الصفحة والأعمدة بنجاح 📐' : 'Layout & Grid updated 📐');
          }}
          onClose={() => setShowLayoutModal(false)}
          isAr={isAr}
        />
      )}

      {/* Export / Sheets Modal */}
      {sheet.open && (
        <div
          className="sheet-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheet({ open: false, title: '', content: null });
          }}
        >
          <div className="sheet-card animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bd)] font-bold text-base">
              <span>{sheet.title}</span>
              <button
                className="ps-btn py-1 px-3 text-xs"
                onClick={() => setSheet({ open: false, title: '', content: null })}
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-4 max-h-[68vh] flex flex-col gap-3">{sheet.content}</div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div
          id="toast"
          style={{ display: 'block' }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[var(--fg)] text-[var(--bar)] px-4 py-2 rounded-full text-xs sm:text-sm font-medium z-50 shadow-lg pointer-events-none"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}

// Render Item Component with AI Quick Hover badge
function RenderItemComponent({
  it,
  isLive,
  isSelected,
  isEditingText,
  tool,
  pageNum,
  lay,
  pd,
  IM,
  measureCtx,
  onSelect,
  onStartMove,
  onStartResize,
  onOpenAi,
  onStartTextEdit,
  onUpdateText,
  onEndTextEdit,
  onUploadImagePrompt,
}: {
  it: Item;
  isLive: boolean;
  isSelected: boolean;
  isEditingText?: boolean;
  tool?: string;
  pageNum: string;
  lay: (c: CanvasRenderingContext2D, it: Item, pStr: string) => { lines: string[]; rtl: boolean };
  pd: (pts?: [number, number][]) => string;
  IM: Record<string, string>;
  measureCtx: CanvasRenderingContext2D;
  onSelect?: (e: React.PointerEvent) => void;
  onStartMove?: (e: React.PointerEvent) => void;
  onStartResize?: (e: React.PointerEvent) => void;
  onOpenAi?: () => void;
  onStartTextEdit?: () => void;
  onUpdateText?: (newText: string) => void;
  onEndTextEdit?: () => void;
  onUploadImagePrompt?: () => void;
}) {
  if (it.hidden) return null;

  let height = it.h;
  const TL = it.type === 'text' ? layoutText(measureCtx, it, pageNum) : null;
  if (TL) {
    height = it.fixedH ? it.h : Math.max(it.h, TL.height);
  }

  const imageSrc = it.k ? (IM[it.k] || it.k) : '';
  const isDrawingTool = tool === 'textFrame' || tool === 'imgFrame';

  return (
    <div
      className={`it group ${isLive && isSelected ? 'sel' : ''}`}
      style={{
        left: `${it.x}px`,
        top: `${it.y}px`,
        width: `${it.w}px`,
        height: `${height}px`,
        pointerEvents: !isLive || isDrawingTool ? 'none' : 'auto',
        opacity: it.opacity ?? 1,
      }}
      onPointerDown={(e) => {
        if (!isLive || isDrawingTool) return;
        if (it.type === 'text' && e.detail >= 2) {
          e.stopPropagation();
          e.preventDefault();
          onStartTextEdit?.();
          return;
        }
        onSelect?.(e);
        if (!isEditingText) {
          onStartMove?.(e);
        }
      }}
      onDoubleClick={(e) => {
        if (!isLive || isDrawingTool) return;
        if (it.type === 'text') {
          e.stopPropagation();
          e.preventDefault();
          onStartTextEdit?.();
        }
      }}
      data-id={it.id}
    >
      {it.type === 'rect' && <div style={{ width: '100%', height: '100%', background: it.color }} />}

      {it.type === 'ell' && (
        <div style={{ width: '100%', height: '100%', background: it.color, borderRadius: '50%' }} />
      )}

      {it.type === 'img' && imageSrc && (
        <img
          src={imageSrc}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full pointer-events-none"
          style={{ objectFit: it.fit === 'contain' ? 'contain' : it.fit === 'fill' ? 'fill' : 'cover' }}
        />
      )}

      {/* Empty InDesign-Style Graphic Frame */}
      {it.type === 'img' && !imageSrc && (
        <div
          className="w-full h-full border border-dashed border-purple-400/60 bg-purple-500/5 dark:bg-purple-950/20 flex flex-col items-center justify-center p-2 relative group overflow-hidden cursor-pointer"
          onPointerDown={(e) => {
            e.stopPropagation();
            onSelect?.(e);
            onUploadImagePrompt?.();
          }}
          title="إطار صورة: انقر لإدراج صورة"
        >
          {/* Diagonal graphic frame cross */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="1.5" className="text-purple-600" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1.5" className="text-purple-600" />
          </svg>
          <div className="z-10 flex flex-col items-center gap-1 text-center pointer-events-auto">
            <span className="text-lg">🖼️</span>
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300">
              إطار صورة (انقر للرفع)
            </span>
            <span className="text-[9px] text-[var(--mut)]">
              {Math.round(it.w / 2.8346)}×{Math.round(it.h / 2.8346)} مم
            </span>
          </div>
        </div>
      )}

      {it.type === 'path' && it.pts && (
        <svg viewBox={`0 0 ${it.pw || it.w} ${it.ph || it.h}`} preserveAspectRatio="none" className="w-full h-full">
          <path
            d={pd(it.pts)}
            fill="none"
            stroke={it.color}
            strokeWidth={it.sw || 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {it.type === 'text' && isEditingText ? (
        <textarea
          autoFocus
          value={it.text || ''}
          ref={(el) => {
            if (el) {
              el.focus();
              el.select();
            }
          }}
          onChange={(e) => onUpdateText?.(e.target.value)}
          onBlur={onEndTextEdit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onEndTextEdit?.();
            }
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          className="w-full h-full min-h-[40px] border-2 border-[var(--sel)] bg-[var(--bar)] text-[var(--fg)] rounded p-1 shadow-md outline-none"
          style={{
            fontSize: `${it.fs || 16}px`,
            color: it.color,
            fontFamily: `"${it.fam || 'Cairo'}", sans-serif`,
            fontWeight: it.b ? 700 : 400,
            textAlign: it.a || 'start',
            lineHeight: 1.3,
            resize: 'both',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            minHeight: `${height}px`,
            overflow: 'auto',
          }}
        />
      ) : it.type === 'text' && TL ? (
        <div
          className="t cursor-text select-text w-full h-full"
          style={{
            position: 'relative',
            overflow: it.fixedH ? 'hidden' : 'visible',
            fontSize: `${it.fs || 16}px`,
            color: it.color,
            fontFamily: `"${it.fam || 'Cairo'}", sans-serif`,
            fontWeight: it.b ? 700 : 400,
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onStartTextEdit?.();
          }}
        >
          {TL.columns.map((lines, ci) => (
            <div
              key={ci}
              style={{
                position: 'absolute',
                left: TL.colX(ci) - it.x,
                top: TL.pad,
                width: TL.colW,
                textAlign: it.a || 'start',
                direction: TL.rtl ? 'rtl' : 'ltr',
                whiteSpace: 'pre',
              }}
            >
              {lines.map((l, i) => (
                <div key={i} style={{ height: TL.lh, lineHeight: `${TL.lh}px` }}>
                  {l || '\u00a0'}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {/* Column guides & overflow marker */}
      {isLive && isSelected && TL && TL.cols > 1 &&
        TL.columns.map((_, ci) => (
          <div
            key={'g' + ci}
            style={{
              position: 'absolute',
              left: TL.colX(ci) - it.x,
              top: TL.pad,
              width: TL.colW,
              height: Math.max(10, height - 2 * TL.pad),
              border: '1px dashed rgba(0,163,217,0.7)',
              pointerEvents: 'none',
            }}
          />
        ))}
      {isLive && TL && it.fixedH && TL.overflow && (
        <div
          title="النص أكبر من المساحة"
          style={{ position: 'absolute', right: 0, bottom: 0, background: '#e24b4a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '0 5px', pointerEvents: 'none' }}
        >
          +
        </div>
      )}

      {/* Resize Handle */}
      {isLive && isSelected && tool === 'sel' && !it.locked && !isEditingText && (
        <div className="resize-handle" onPointerDown={onStartResize} />
      )}

      {/* AI Quick Hover Chip */}
      {isLive && isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAi?.();
          }}
          className="absolute -top-7 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md hover:scale-105 transition-transform flex items-center gap-1 z-30"
          title="افتح محادثة الذكاء الاصطناعي لتعديل هذا العنصر"
        >
          <span>✨</span>
          <span>AI</span>
        </button>
      )}
    </div>
  );
}

// Export Dialog Component
function ExportModalContent({
  doc,
  view,
  ensureFonts,
  renderPageToCanvas,
  svgOfPage,
  dlSave,
  toast,
  close,
  IM,
  lang,
}: {
  doc: DocData;
  view: { t: 'p' | 'm'; i: number };
  ensureFonts: () => Promise<void>;
  renderPageToCanvas: (pi: number, ppp: number, bl: number) => Promise<HTMLCanvasElement>;
  svgOfPage: (pi: number, bl: number) => string;
  dlSave: (name: string, data: Blob | string) => void;
  toast: (m: string) => void;
  close: () => void;
  IM: Record<string, string>;
  lang: Language;
}) {
  const isAr = lang === 'ar';
  const [fmt, setFmt] = useState<'pdf' | 'png' | 'jpg' | 'svg' | 'json'>('pdf');
  const [dpi, setDpi] = useState<number>(150);
  const [bleed, setBleed] = useState<number>(doc.bleed || 3);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast(isAr ? 'جارٍ تجهيز ملف التصدير...' : 'Preparing export file...');
      await ensureFonts();
      const bl = bleed * MM;
      const ppp = dpi / 72;
      const cur = view.t === 'p' ? view.i : 0;

      if (fmt === 'pdf') {
        if (!window.jspdf) {
          toast(isAr ? 'تعذّر العثور على مكتبة PDF' : 'PDF library not loaded');
          setIsExporting(false);
          return;
        }
        const { jsPDF } = window.jspdf;
        const W = doc.w + 2 * bl;
        const H = doc.h + 2 * bl;
        const pdf = new jsPDF({
          unit: 'pt',
          format: [W, H],
          orientation: W > H ? 'l' : 'p',
        });

        for (let i = 0; i < doc.pages.length; i++) {
          const c = await renderPageToCanvas(i, ppp, bl);
          if (i > 0) pdf.addPage([W, H], W > H ? 'l' : 'p');
          pdf.addImage(c.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, W, H);
        }
        dlSave(`${doc.name.replace(/\s+/g, '_')}.pdf`, pdf.output('blob'));
      } else if (fmt === 'png' || fmt === 'jpg') {
        const c = await renderPageToCanvas(cur, ppp, bl);
        const mime = fmt === 'png' ? 'image/png' : 'image/jpeg';
        const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, mime, 0.93));
        if (blob) {
          dlSave(`${doc.name.replace(/\s+/g, '_')}_p${cur + 1}.${fmt}`, blob);
        }
      } else if (fmt === 'svg') {
        dlSave(`${doc.name.replace(/\s+/g, '_')}_p${cur + 1}.svg`, svgOfPage(cur, bl));
      } else {
        dlSave(`${doc.name.replace(/\s+/g, '_')}_project.json`, JSON.stringify({ v: 2, doc, IM }, null, 2));
      }
      close();
    } catch (e: any) {
      toast((isAr ? 'حدث خطأ أثناء التصدير: ' : 'Export failed: ') + (e?.message || ''));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-xs text-[var(--mut)] mb-1 block">{isAr ? 'صيغة الملف' : 'File Format'}</label>
        <select
          value={fmt}
          onChange={(e) => setFmt(e.target.value as any)}
          className="ps-select w-full bg-[var(--row)] text-xs"
        >
          <option value="pdf">PDF {isAr ? 'للطباعة (كل الصفحات)' : 'Print (All Pages)'}</option>
          <option value="png">PNG {isAr ? 'صورة (الصفحة الحالية)' : 'Image (Current Page)'}</option>
          <option value="jpg">JPG {isAr ? 'صورة (الصفحة الحالية)' : 'Image (Current Page)'}</option>
          <option value="svg">SVG {isAr ? 'متجهي (Illustrator)' : 'Vector (Illustrator)'}</option>
          <option value="json">JSON {isAr ? 'نسخة المشروع القابلة للتعديل' : 'Project Source'}</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-[var(--mut)] mb-1 block">{isAr ? 'دقة الطباعة (DPI)' : 'Print DPI'}</label>
        <select
          value={dpi}
          onChange={(e) => setDpi(+e.target.value)}
          className="ps-select w-full bg-[var(--row)] text-xs"
        >
          <option value="96">96 dpi · {isAr ? 'شاشات ورقمي' : 'Screens & Web'}</option>
          <option value="150">150 dpi · {isAr ? 'مسودة طباعة سريعة' : 'Draft Print'}</option>
          <option value="300">300 dpi · {isAr ? 'مطابع معيارية عالية الدقة' : 'High-Res Commercial Print'}</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-[var(--mut)] mb-1 block">{isAr ? 'هامش القص (Bleed)' : 'Bleed Margin'}</label>
        <select
          value={bleed}
          onChange={(e) => setBleed(+e.target.value)}
          className="ps-select w-full bg-[var(--row)] text-xs"
        >
          <option value="0">0 mm ({isAr ? 'بدون' : 'None'})</option>
          <option value="3">3 mm ({isAr ? 'معياري للمطابع' : 'Standard'})</option>
          <option value="5">5 mm ({isAr ? 'للبوسترات والصحف' : 'Large Post'})</option>
        </select>
      </div>

      <button
        className="ps-btn ps-btn-primary w-full py-2.5 mt-2 font-bold text-xs"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (isAr ? 'جارٍ التصدير...' : 'Exporting...') : (isAr ? 'تصدير وتحميل 📥' : 'Export & Download 📥')}
      </button>
    </div>
  );
}
