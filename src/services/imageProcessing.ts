/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Item } from '../types/printStudio';

/**
 * Removes background using intelligent color distance and edge thresholding
 */
export async function removeBackgroundClient(imageDataUrl: string, tolerance = 35): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 1200);
        canvas.height = Math.min(img.height, 1200);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(imageDataUrl);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Sample background from the 4 corners
        const corners = [
          [0, 0],
          [canvas.width - 1, 0],
          [0, canvas.height - 1],
          [canvas.width - 1, canvas.height - 1],
        ];

        let rSum = 0, gSum = 0, bSum = 0;
        corners.forEach(([x, y]) => {
          const idx = (y * canvas.width + x) * 4;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
        });
        const bgR = rSum / 4;
        const bgG = gSum / 4;
        const bgB = bSum / 4;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Euclidean color distance
          const dist = Math.sqrt(
            Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
          );

          if (dist < tolerance * 2) {
            // Soft alpha transition
            if (dist < tolerance) {
              data[i + 3] = 0;
            } else {
              const factor = (dist - tolerance) / tolerance;
              data[i + 3] = Math.round(data[i + 3] * factor);
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (_) {
        // Fallback if canvas tainted
        resolve(imageDataUrl);
      }
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}

/**
 * Cartoon / Comic Cel-Shading transformation with edge detection,
 * color quantization (posterization) and ink outline synthesis.
 */
export async function transformToCartoon(
  imageDataUrl: string,
  edgeThreshold = 26,
  quantizeSteps = 5
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Cap dimension for real-time responsiveness & prevent UI thread freeze
        const maxDim = 900;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(imageDataUrl);

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const src = imgData.data;

        // 1. Grayscale map for edge detection
        const gray = new Float32Array(w * h);
        for (let i = 0; i < src.length; i += 4) {
          gray[i / 4] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        }

        // 2. Sobel edge detection pass
        const isEdge = new Uint8Array(w * h);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;

            // Sobel Horizontal
            const gx =
              -1 * gray[idx - w - 1] +
              1 * gray[idx - w + 1] +
              -2 * gray[idx - 1] +
              2 * gray[idx + 1] +
              -1 * gray[idx + w - 1] +
              1 * gray[idx + w + 1];

            // Sobel Vertical
            const gy =
              -1 * gray[idx - w - 1] +
              -2 * gray[idx - w] +
              -1 * gray[idx - w + 1] +
              1 * gray[idx + w - 1] +
              2 * gray[idx + w] +
              1 * gray[idx + w + 1];

            const mag = Math.sqrt(gx * gx + gy * gy);
            if (mag > edgeThreshold) {
              isEdge[idx] = 1;
            }
          }
        }

        // 3. Cel-shading / Color Quantization + Ink Edge Overlay
        const stepSize = 256 / quantizeSteps;
        const output = ctx.createImageData(w, h);
        const dst = output.data;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const p = y * w + x;
            const i = p * 4;

            if (isEdge[p]) {
              // Dark cartoon comic ink line
              dst[i] = 18;
              dst[i + 1] = 18;
              dst[i + 2] = 24;
              dst[i + 3] = src[i + 3] || 255;
            } else {
              // Quantize RGB channels (Posterize)
              let r = Math.floor(src[i] / stepSize) * stepSize + stepSize / 2;
              let g = Math.floor(src[i + 1] / stepSize) * stepSize + stepSize / 2;
              let b = Math.floor(src[i + 2] / stepSize) * stepSize + stepSize / 2;

              // Boost saturation for cartoon aesthetic
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const delta = max - min;
              if (delta > 8) {
                r = Math.min(255, r > 120 ? r * 1.15 : r * 0.9);
                g = Math.min(255, g > 120 ? g * 1.15 : g * 0.9);
                b = Math.min(255, b > 120 ? b * 1.15 : b * 0.9);
              }

              dst[i] = Math.min(255, Math.max(0, r));
              dst[i + 1] = Math.min(255, Math.max(0, g));
              dst[i + 2] = Math.min(255, Math.max(0, b));
              dst[i + 3] = src[i + 3] || 255;
            }
          }
        }

        ctx.putImageData(output, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        // Fallback: draw with canvas filters if security error
        try {
          const cv = document.createElement('canvas');
          cv.width = 600;
          cv.height = 600;
          const cx = cv.getContext('2d');
          if (cx) {
            cx.filter = 'contrast(160%) saturate(180%)';
            cx.drawImage(img, 0, 0, 600, 600);
            return resolve(cv.toDataURL('image/png'));
          }
        } catch (_) {}
        resolve(imageDataUrl);
      }
    };

    img.onerror = () => {
      resolve(imageDataUrl);
    };

    img.src = imageDataUrl;
  });
}

/**
 * AI Cartoon Generation Engine
 * Generates custom stylized cartoon illustrations, avatars, or comic characters
 * using high-resolution procedural vector rendering.
 */
export async function generateCartoonArtwork(userPrompt = ''): Promise<string> {
  const p = userPrompt.toLowerCase();
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 900;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const isRobot = p.includes('روبوت') || p.includes('تقني') || p.includes('ذكاء') || p.includes('robot') || p.includes('tech');
  const isGirl = p.includes('بنت') || p.includes('فتاة') || p.includes('girl') || p.includes('woman') || p.includes('انثى');
  const isHero = p.includes('بطل') || p.includes('خارق') || p.includes('hero') || p.includes('كوميك') || p.includes('comic');
  const isAnimal = p.includes('قط') || p.includes('اسد') || p.includes('حيوان') || p.includes('cat') || p.includes('lion') || p.includes('تميمة');

  // Background Gradient
  const bgGrad = ctx.createRadialGradient(450, 450, 50, 450, 450, 600);
  if (isRobot) {
    bgGrad.addColorStop(0, '#38bdf8');
    bgGrad.addColorStop(1, '#0f172a');
  } else if (isHero) {
    bgGrad.addColorStop(0, '#f59e0b');
    bgGrad.addColorStop(0.6, '#ef4444');
    bgGrad.addColorStop(1, '#450a0a');
  } else if (isGirl) {
    bgGrad.addColorStop(0, '#f472b6');
    bgGrad.addColorStop(0.7, '#c084fc');
    bgGrad.addColorStop(1, '#3b0764');
  } else if (isAnimal) {
    bgGrad.addColorStop(0, '#34d399');
    bgGrad.addColorStop(0.7, '#059669');
    bgGrad.addColorStop(1, '#064e3b');
  } else {
    // Vibrant Pop Cartoon Gradient
    bgGrad.addColorStop(0, '#ec4899');
    bgGrad.addColorStop(0.5, '#8b5cf6');
    bgGrad.addColorStop(1, '#1e1b4b');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 900, 900);

  // Pop-art Comic Sunburst Rays
  ctx.save();
  ctx.translate(450, 450);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let i = 0; i < 24; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 700, (i * Math.PI) / 12, ((i + 0.5) * Math.PI) / 12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Halftone Dot Matrix in background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let x = 20; x < 900; x += 36) {
    for (let y = 20; y < 900; y += 36) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw Cartoon Character
  ctx.save();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#18181b';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isRobot) {
    // --- TECH / AI CARTOON ROBOT MASCOT ---
    // Body / Shoulders
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(300, 600, 300, 240, [50, 50, 20, 20]);
    ctx.fill();
    ctx.stroke();

    // Chest Screen
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(360, 650, 180, 100, 20);
    ctx.fill();
    ctx.stroke();

    // Heartbeat pulse line on screen
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(380, 700);
    ctx.lineTo(420, 700);
    ctx.lineTo(440, 670);
    ctx.lineTo(460, 730);
    ctx.lineTo(480, 700);
    ctx.lineTo(520, 700);
    ctx.stroke();

    // Neck
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 14;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(410, 540, 80, 60);
    ctx.strokeRect(410, 540, 80, 60);

    // Head
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(260, 260, 380, 280, 70);
    ctx.fill();
    ctx.stroke();

    // Antenna
    ctx.beginPath();
    ctx.moveTo(450, 260);
    ctx.lineTo(450, 170);
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(450, 150, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Visor / Eyes Display
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(300, 330, 300, 130, 40);
    ctx.fill();
    ctx.stroke();

    // Glowing Cyan Eyes
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(380, 395, 34, 0, Math.PI * 2);
    ctx.arc(520, 395, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Smile / Audio Meter
    ctx.fillStyle = '#38bdf8';
    for (let i = 0; i < 7; i++) {
      const bh = 14 + (3 - Math.abs(3 - i)) * 8;
      ctx.fillRect(405 + i * 13, 500 - bh / 2, 7, bh);
    }
  } else {
    // --- VIBRANT STYLIZED CARTOON AVATAR / CHARACTER ---
    // Neck & Shoulders
    ctx.fillStyle = '#fdba74';
    ctx.beginPath();
    ctx.roundRect(400, 560, 100, 90, 10);
    ctx.fill();
    ctx.stroke();

    // Colorful Hoodie / Jacket
    ctx.fillStyle = isGirl ? '#ec4899' : isHero ? '#dc2626' : '#6366f1';
    ctx.beginPath();
    ctx.moveTo(250, 850);
    ctx.quadraticCurveTo(280, 640, 400, 620);
    ctx.lineTo(500, 620);
    ctx.quadraticCurveTo(620, 640, 650, 850);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Head / Face
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.ellipse(450, 430, 150, 170, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ears
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(295, 430, 32, 0, Math.PI * 2);
    ctx.arc(605, 430, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Big Expressive Cartoon Eyes
    // Sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(390, 420, 44, 52, 0, 0, Math.PI * 2);
    ctx.ellipse(510, 420, 44, 52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Irises
    ctx.fillStyle = isGirl ? '#a855f7' : isHero ? '#0284c7' : '#10b981';
    ctx.beginPath();
    ctx.arc(394, 422, 28, 0, Math.PI * 2);
    ctx.arc(514, 422, 28, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(394, 422, 16, 0, Math.PI * 2);
    ctx.arc(514, 422, 16, 0, Math.PI * 2);
    ctx.fill();

    // Catchlight / Anime Highlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(384, 412, 10, 0, Math.PI * 2);
    ctx.arc(504, 412, 10, 0, Math.PI * 2);
    ctx.arc(404, 432, 4, 0, Math.PI * 2);
    ctx.arc(524, 432, 4, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.roundRect(340, 345, 80, 16, 8);
    ctx.roundRect(480, 345, 80, 16, 8);
    ctx.fill();

    // Cheerful Cartoon Smile
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(450, 490, 36, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Teeth Highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.rect(430, 490, 40, 12);
    ctx.fill();

    // Rosy Cheeks
    ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.beginPath();
    ctx.arc(330, 475, 24, 0, Math.PI * 2);
    ctx.arc(570, 475, 24, 0, Math.PI * 2);
    ctx.fill();

    // Stylized Anime / Cartoon Hair
    ctx.fillStyle = isGirl ? '#f43f5e' : isHero ? '#1e293b' : '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(270, 410);
    ctx.quadraticCurveTo(240, 250, 380, 210);
    ctx.lineTo(450, 190);
    ctx.quadraticCurveTo(620, 210, 630, 410);
    ctx.lineTo(580, 360);
    ctx.quadraticCurveTo(530, 270, 450, 290);
    ctx.quadraticCurveTo(370, 270, 320, 360);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front Hair Bangs
    ctx.beginPath();
    ctx.moveTo(350, 290);
    ctx.quadraticCurveTo(420, 340, 410, 370);
    ctx.quadraticCurveTo(460, 310, 490, 350);
    ctx.quadraticCurveTo(510, 290, 470, 280);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Comic Action Badge / Stars Overlay
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 8;
  const drawStar = (cx: number, cy: number, spikes: number, outerR: number, innerR: number) => {
    let rot = (Math.PI / 2) * 3;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerR;
      let y = cy + Math.sin(rot) * outerR;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerR;
      y = cy + Math.sin(rot) * innerR;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  drawStar(140, 160, 5, 46, 22);
  drawStar(760, 180, 5, 38, 18);
  drawStar(780, 720, 4, 30, 14);

  // Comic Sound / Pop Bubble Text
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(730, 320, 90, 54, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Little bubble tail
  ctx.beginPath();
  ctx.moveTo(670, 350);
  ctx.lineTo(620, 390);
  ctx.lineTo(660, 370);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 24px "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('كارتون ✨', 730, 320);

  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Apply artistic or correction filters to an image
 */
export async function applyImageFilter(
  imageDataUrl: string,
  filterType: 'grayscale' | 'duotone' | 'warm' | 'cool' | 'vintage' | 'vibrant'
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(imageDataUrl);

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = 0.299 * r + 0.587 * g + 0.114 * b;

        if (filterType === 'grayscale') {
          data[i] = avg;
          data[i + 1] = avg;
          data[i + 2] = avg;
        } else if (filterType === 'duotone') {
          // Warm magenta / navy duotone
          data[i] = Math.min(255, avg * 0.9 + 40);
          data[i + 1] = Math.min(255, avg * 0.2);
          data[i + 2] = Math.min(255, avg * 0.6 + 60);
        } else if (filterType === 'warm') {
          data[i] = Math.min(255, r * 1.15 + 15);
          data[i + 1] = Math.min(255, g * 1.05);
          data[i + 2] = Math.max(0, b * 0.9 - 10);
        } else if (filterType === 'cool') {
          data[i] = Math.max(0, r * 0.9 - 10);
          data[i + 1] = Math.min(255, g * 1.05);
          data[i + 2] = Math.min(255, b * 1.2 + 20);
        } else if (filterType === 'vintage') {
          data[i] = Math.min(255, avg * 1.2 + 20);
          data[i + 1] = Math.min(255, avg * 1.0 + 10);
          data[i + 2] = Math.min(255, avg * 0.8);
        } else if (filterType === 'vibrant') {
          data[i] = Math.min(255, r > 128 ? r * 1.15 : r * 0.9);
          data[i + 1] = Math.min(255, g > 128 ? g * 1.15 : g * 0.9);
          data[i + 2] = Math.min(255, b > 128 ? b * 1.15 : b * 0.9);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageDataUrl;
  });
}

/**
 * Magic Slices tool: Splits an image item into an NxM grid of separate interactive slice layers!
 */
export async function splitImageIntoSlices(
  item: Item,
  imageDataUrl: string,
  rows: number,
  cols: number,
  gap = 6,
  startId = 1000
): Promise<{ newItems: Item[]; newImages: Record<string, string> }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const sliceW = img.width / cols;
      const sliceH = img.height / rows;

      const destW = (item.w - (cols - 1) * gap) / cols;
      const destH = (item.h - (rows - 1) * gap) / rows;

      const newItems: Item[] = [];
      const newImages: Record<string, string> = {};

      let currentId = startId;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement('canvas');
          canvas.width = sliceW;
          canvas.height = sliceH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(
              img,
              c * sliceW,
              r * sliceH,
              sliceW,
              sliceH,
              0,
              0,
              sliceW,
              sliceH
            );
            const key = `slice_${currentId}_${r}_${c}`;
            const dataUrl = canvas.toDataURL('image/png');
            newImages[key] = dataUrl;

            newItems.push({
              id: currentId++,
              type: 'img',
              k: key,
              name: `شريحة ${r + 1}×${c + 1}`,
              x: item.x + c * (destW + gap),
              y: item.y + r * (destH + gap),
              w: destW,
              h: destH,
            });
          }
        }
      }

      resolve({ newItems, newImages });
    };
    img.src = imageDataUrl;
  });
}
