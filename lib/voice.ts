'use client';

/** 统一语音引擎：所有陪伴场景的 TTS 走这里（音色/语速/音调随人格） */
let cached: SpeechSynthesisVoice[] = [];

export function initVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const load = () => { cached = window.speechSynthesis.getVoices(); };
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

export function ttsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice(female: boolean): SpeechSynthesisVoice | null {
  if (!cached.length && ttsSupported()) cached = window.speechSynthesis.getVoices();
  const zh = cached.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('zh'));
  if (!zh.length) return null;
  const femaleHints = ['xiaoxiao', 'yaoyao', 'tingting', 'meijia', 'huihui', 'female', '女', '晓晓', '婷婷'];
  const maleHints = ['yunxi', 'yunyang', 'kangkang', 'male', '男', '云希', '康康'];
  const hit = zh.find((v) => {
    const n = v.name.toLowerCase();
    return female ? femaleHints.some((h) => n.includes(h)) : maleHints.some((h) => n.includes(h));
  });
  return hit ?? zh[0];
}

export function speak(
  text: string,
  opts: { rate: number; pitch: number; female?: boolean },
  enabled: boolean
): boolean {
  if (!enabled || !ttsSupported()) return false;
  const clean = text.replace(/【.*?】/g, '').replace(/[「」]/g, '').slice(0, 120);
  if (!clean) return false;
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = 'zh-CN';
  u.rate = Math.max(0.6, Math.min(1.5, opts.rate));
  u.pitch = Math.max(0.5, Math.min(1.6, opts.pitch));
  const v = pickVoice(opts.female ?? opts.pitch > 1);
  if (v) u.voice = v;
  window.speechSynthesis.cancel(); // 打断上一条，保证"只有 TA 在说话"
  window.speechSynthesis.speak(u);
  return true;
}

export function cancelSpeak() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
