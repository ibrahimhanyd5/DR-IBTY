export type Provider = 'pollinations' | 'gemini' | 'openai' | 'compat';

export interface ProviderCfg {
  key: string;
  model: string;
  base: string; // service base URL (editable, lets users route through a proxy)
}

export interface AISettings {
  provider: Provider;
  pollinations: ProviderCfg; // free, no API key
  gemini: ProviderCfg;
  openai: ProviderCfg;
  compat: ProviderCfg; // any OpenAI-compatible service, e.g. OpenRouter
}

const KEY = 'ps_ai_settings';

export const AI_DEFAULTS: AISettings = {
  provider: 'pollinations',
  pollinations: { key: '', model: 'openai', base: 'https://gen.pollinations.ai/v1' },
  gemini: { key: '', model: 'gemini-3.6-flash', base: 'https://generativelanguage.googleapis.com' },
  openai: { key: '', model: 'chat-latest', base: 'https://api.openai.com/v1' },
  compat: { key: '', model: 'openrouter/auto', base: 'https://openrouter.ai/api/v1' },
};

export function loadAISettings(): AISettings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) {
      return {
        provider: ['openai', 'compat', 'gemini', 'pollinations'].includes(s.provider) ? s.provider : 'pollinations',
        pollinations: { ...AI_DEFAULTS.pollinations, ...(s.pollinations || {}) },
        gemini: { ...AI_DEFAULTS.gemini, ...(s.gemini || {}) },
        openai: { ...AI_DEFAULTS.openai, ...(s.openai || {}) },
        compat: { ...AI_DEFAULTS.compat, ...(s.compat || {}) },
      };
    }
  } catch (_) {}
  return AI_DEFAULTS;
}

export function saveAISettings(s: AISettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (_) {}
}

const trimBase = (b: string) => b.trim().replace(/\/+$/, '');
const hostOf = (u: string) => {
  try {
    return new URL(u).host;
  } catch (_) {
    return u;
  }
};

async function doFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e: any) {
    // fetch() only throws a TypeError when the request never reached the server (blocked / offline / CORS)
    throw new Error('NETWORK:' + hostOf(url));
  }
}

export async function askAI(s: AISettings, system: string, user: string): Promise<string> {
  const cfg = s[s.provider];
  if (s.provider !== 'pollinations' && !cfg.key.trim()) throw new Error('NO_KEY');
  const base = trimBase(cfg.base || AI_DEFAULTS[s.provider].base);
  if (s.provider === 'gemini') {
    const r = await doFetch(`${base}/v1beta/models/${encodeURIComponent(cfg.model.trim())}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.key.trim() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
      }),
    });
    const j: any = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && j.error && j.error.message) || `HTTP ${r.status}`);
    const parts = (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
    const t = parts.map((p: any) => p.text || '').join('');
    if (!t.trim()) throw new Error('Empty response');
    return t.trim();
  }
  const body = JSON.stringify({
    model: cfg.model.trim(),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.key.trim()) headers.Authorization = `Bearer ${cfg.key.trim()}`;
  // Pollinations: try the unified endpoint first, then the legacy keyless one
  const urls = s.provider === 'pollinations' ? [`${base}/chat/completions`, 'https://text.pollinations.ai/openai'] : [`${base}/chat/completions`];
  let lastErr: any = null;
  for (const u of urls) {
    try {
      const r = await doFetch(u, { method: 'POST', headers, body });
      const j: any = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j && j.error && (j.error.message || j.error) ? String(j.error.message || j.error) : `HTTP ${r.status}`);
      const t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!t || !String(t).trim()) throw new Error('Empty response');
      return String(t).trim();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Request failed');
}

/** Free image generation (Pollinations). Returns a data URL when CORS allows, otherwise the plain URL. */
export async function generateImage(prompt: string, width = 1024, height = 1024): Promise<{ src: string; embedded: boolean }> {
  const seed = Math.floor(Math.random() * 1e9);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (_) {
    // CORS blocked or network down: still try to show it through an <img>
    return { src: url, embedded: false };
  }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const blob = await res.blob();
  const src: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
  return { src, embedded: true };
}

export function extractJSON(text: string): any {
  let t = text.replace(/```json|```/gi, '').trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('No JSON in response');
  t = t.slice(a, b + 1);
  return JSON.parse(t);
}

export interface HostCheck {
  name: string;
  host: string;
  ok: boolean;
}

/** Tries to reach each service (no-cors: resolves when the host is reachable, even without CORS). */
export async function checkHosts(): Promise<HostCheck[]> {
  const targets: [string, string][] = [
    ['Iconify (الأيقونات)', 'https://api.iconify.design/collections?prefix=lucide'],
    ['Iconify بديل', 'https://api.simplesvg.com/collections?prefix=lucide'],
    ['Pollinations (مجاني)', 'https://gen.pollinations.ai/'],
    ['Google Gemini', 'https://generativelanguage.googleapis.com/'],
    ['OpenAI', 'https://api.openai.com/'],
    ['OpenRouter', 'https://openrouter.ai/'],
  ];
  return Promise.all(
    targets.map(async ([name, url]) => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 7000);
      try {
        await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: ctl.signal });
        return { name, host: hostOf(url), ok: true };
      } catch (_) {
        return { name, host: hostOf(url), ok: false };
      } finally {
        clearTimeout(timer);
      }
    })
  );
}
