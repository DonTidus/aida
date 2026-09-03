'use client';

import { useEffect, useRef, useState } from 'react';
import { BuddyState } from '@/lib/personas';
import { brainReply, openingLine, voiceParams } from '@/lib/chat-brain';
import { MemoryCard } from '@/lib/aida-engine';

interface Msg { from: 'buddy' | 'me'; text: string; source?: 'llm' | 'engine'; t: number }

/** 文字 + 语音（TTS 播报 / STT 按住说话）聊天面板 */
export default function ChatPanel({
  buddy, memories, compact = false, onMood,
}: {
  buddy: BuddyState;
  memories?: MemoryCard[];
  compact?: boolean;
  onMood?: (m: 'calm' | 'happy' | 'excited' | 'sad' | 'wink' | 'worried') => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const sttSupported = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);

  const vp = voiceParams(buddy);

  useEffect(() => {
    setMsgs([{ from: 'buddy', text: openingLine(buddy), t: Date.now() }]);
  }, [buddy.id]);

  useEffect(() => { boxRef.current?.scrollTo({ top: 1e6 }); }, [msgs.length]);

  function speak(text: string) {
    if (!voiceOn || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text.replace(/【.*?】/g, ''));
    u.lang = 'zh-CN';
    u.rate = vp.rate;
    u.pitch = vp.pitch;
    const zh = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('zh'));
    if (zh) u.voice = zh;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    onMood?.('excited');
    setTimeout(() => onMood?.('calm'), 1500);
  }

  function push(text: string) {
    if (!text.trim() || busy) return;
    setMsgs((m) => [...m, { from: 'me', text, t: Date.now() }]);
    setQ('');
    setBusy(true);
    onMood?.('wink');
    fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, buddy: { ...buddy, memories: memories ?? buddy.memories } }),
    })
      .then((r) => r.json())
      .then((j) => {
        setMsgs((m) => [...m, { from: 'buddy', text: j.text, source: j.source, t: Date.now() }]);
        speak(j.text);
      })
      .catch(() => {
        const fb = brainReply(text, buddy);
        setMsgs((m) => [...m, { from: 'buddy', text: fb, source: 'engine', t: Date.now() }]);
        speak(fb);
      })
      .finally(() => { setBusy(false); onMood?.('calm'); });
  }

  function toggleListen() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    if (listening) { recogRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = 'zh-CN';
    rec.interimResults = false;
    rec.onresult = (ev: any) => {
      const text = ev.results?.[0]?.[0]?.transcript ?? '';
      if (text) push(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recogRef.current = rec;
    rec.start();
    setListening(true);
  }

  return (
    <div className={`flex flex-col ${compact ? '' : 'glass p-4'}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{buddy.name}的频道</h3>
        <div className="flex items-center gap-2">
          {'speechSynthesis' in window && (
            <button onClick={() => { setVoiceOn((v) => !v); window.speechSynthesis.cancel(); }}
              className={`chip cursor-pointer ${voiceOn ? 'border-neon/60 text-neon' : ''}`} title="语音播报（音色随性格变化）">
              {voiceOn ? '🔊 语音开' : '🔇 语音关'}
            </button>
          )}
        </div>
      </div>
      <div ref={boxRef} className={`scroll-thin overflow-y-auto pr-1 ${compact ? 'h-40 space-y-1.5' : 'h-80 space-y-2'}`}>
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
              m.from === 'me' ? 'bg-sky2/15 text-slate-100' : 'bg-edge/50 text-slate-200'}`}>
              {m.from === 'buddy' && <span className="mr-1.5 font-bold" style={{ color: `hsl(${buddy.appearance.hue} 70% 60%)` }}>{buddy.name}</span>}
              {m.text}
              {m.source === 'llm' && <span className="ml-1.5 text-[10px] text-sky2">LLM</span>}
            </div>
          </div>
        ))}
        {busy && <div className="text-[11px] text-slate-500">{buddy.name}正在输入…</div>}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && push(q)}
          placeholder={`跟${buddy.name}说点什么…`}
          className="min-w-0 flex-1 rounded-xl border border-edge bg-ink px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-neon/60" />
        {((typeof window !== 'undefined') && ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)) ? (
          <button onClick={toggleListen} title="按住说话（语音识别）"
            className={`btn !px-3 ${listening ? 'border-ember text-ember animate-pulse' : ''}`}>🎙</button>
        ) : null}
        <button className="btn-primary !px-3" onClick={() => push(q)} disabled={busy}>发</button>
      </div>
    </div>
  );
}
