export type Provider = 'gemini' | 'openai';

export interface AISettings {
  provider: Provider;
  gemini: { key: string; model: string };
  openai: { key: string; model: string };
}

const KEY = 'ps_ai_settings';

export const AI_DEFAULTS: AISettings = {
  provider: 'gemini',
  gemini: { key: '', model: 'gemini-3.6-flash' },
  openai: { key: '', model: 'chat-latest' },
};

export function loadAISettings(): AISettings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) {
      return {
        provider: s.provider === 'openai' ? 'openai' : 'gemini',
        gemini: { ...AI_DEFAULTS.gemini, ...(s.gemini || {}) },
        openai: { ...AI_DEFAULTS.openai, ...(s.openai || {}) },
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

export async function askAI(s: AISettings, system: string, user: string): Promise<string> {
  const cfg = s[s.provider];
  if (!cfg.key.trim()) throw new Error('NO_KEY');
  if (s.provider === 'gemini') {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model.trim())}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.key.trim() },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
        }),
      }
    );
    const j: any = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && j.error && j.error.message) || `HTTP ${r.status}`);
    const parts = (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
    const t = parts.map((p: any) => p.text || '').join('');
    if (!t.trim()) throw new Error('Empty response');
    return t.trim();
  }
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key.trim()}` },
    body: JSON.stringify({
      model: cfg.model.trim(),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  const j: any = await r.json().catch(() => null);
  if (!r.ok) throw new Error((j && j.error && j.error.message) || `HTTP ${r.status}`);
  const t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (!t || !String(t).trim()) throw new Error('Empty response');
  return String(t).trim();
}

export function extractJSON(text: string): any {
  let t = text.replace(/```json|```/gi, '').trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('No JSON in response');
  t = t.slice(a, b + 1);
  return JSON.parse(t);
}
