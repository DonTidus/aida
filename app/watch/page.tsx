'use client';

import { useEffect, useRef, useState } from 'react';
import Avatar from '@/components/Avatar';
import ChatPanel from '@/components/ChatPanel';
import LLMSettings from '@/components/LLMSettings';
import { useBuddies } from '@/lib/buddy-store';
import { SHOW_TYPES, ShowType, eventQuip, nextInterval, quip } from '@/lib/watch-engine';

type Source =
  | { kind: 'file'; url: string; name: string }
  | { kind: 'bili'; bvid: string }
  | null;

export default function WatchPage() {
  const { buddies, active, updateActive } = useBuddies();
  const [showType, setShowType] = useState<ShowType>('剧集');
  const [source, setSource] = useState<Source>(null);
  const [bvid, setBvid] = useState('');
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [tSec, setTSec] = useState(0);
  const injectRef = useRef<((text: string) => void) | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevT = useRef(0);
  const nextQuipAt = useRef(30);
  const recent = useRef<string[]>([]);
  const endedRef = useRef(false);

  // 主动吐槽循环：播放中每 22-38 秒一条（比赛/剧集语料不同）
  useEffect(() => {
    if (!playing || !source) return;
    const iv = setInterval(() => {
      setTSec((t) => {
        const nt = t + 1;
        if (nt >= nextQuipAt.current) {
          nextQuipAt.current = nt + nextInterval();
          const q = quip(showType, active?.callWord ?? '你', recent.current);
          recent.current = [...recent.current.slice(-4), q];
          injectRef.current?.(q);
        }
        return nt;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [playing, source, showType, active]);

  function fire(kind: 'start' | 'pause' | 'resume' | 'seek_back' | 'seek_fwd' | 'end') {
    const q = eventQuip(kind, active?.callWord ?? '你');
    injectRef.current?.(q);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setSource({ kind: 'file', url: URL.createObjectURL(f), name: f.name });
    setTSec(0); setStarted(false); endedRef.current = false;
  }

  function onBili() {
    const id = bvid.trim().match(/(BV[0-9A-Za-z]+)/)?.[1];
    if (!id) return;
    setSource({ kind: 'bili', bvid: id });
    setTSec(0); setStarted(false); endedRef.current = false;
  }

  // 本地视频事件
  function hookVideo(v: HTMLVideoElement | null) {
    if (!v) return;
    videoRef.current = v;
    v.onplay = () => {
      setPlaying(true);
      if (!started) { setStarted(true); fire('start'); }
      else if (endedRef.current) { endedRef.current = false; fire('resume'); }
      else fire('resume');
    };
    v.onpause = () => { setPlaying(false); fire('pause'); };
    v.onseeked = () => {
      const cur = v.currentTime, before = prevT.current;
      if (Math.abs(cur - before) > 3) fire(cur < before ? 'seek_back' : 'seek_fwd');
      prevT.current = cur; setTSec(Math.floor(cur));
    };
    v.ontimeupdate = () => { prevT.current = v.currentTime; setTSec(Math.floor(v.currentTime)); };
    v.onended = () => { setPlaying(false); endedRef.current = true; fire('end'); };
  }

  // B站/无插件源：手动陪看时钟（进度为近似值）
  useEffect(() => {
    if (source?.kind !== 'bili' || !playing) return;
    const iv = setInterval(() => setTSec((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [source, playing]);

  const min = Math.floor(tSec / 60);

  if (!active) {
    return <div className="glass p-8 text-center text-sm text-slate-400">伙伴加载中…</div>;
  }

  return (
    <div className="space-y-4">
      <section className="glass flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="text-base font-bold text-slate-50">陪看模式 · 一起看，一起吐槽</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            本地视频或 B 站视频 + {active?.name ?? '搭子'}的时间轴吐槽：TA 会跟进剧情节奏、对你的暂停和拖进度有反应、随时接你的话。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Avatar name="" appearance={active?.appearance ?? { hue: 145, hair: 0, accessory: 'headset' }} mood={active?.mood ?? 'calm'} size={44} />
          <select value={active?.id ?? ''} onChange={(e) => updateActive(e.target.value)}
            className="rounded-xl border border-edge bg-panel px-3 py-2 text-xs text-slate-300 outline-none">
            {buddies.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <LLMSettings />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* 内容类型 */}
          <div className="glass flex flex-wrap items-center gap-2 p-3">
            <span className="text-[11px] text-slate-500">在看什么：</span>
            {SHOW_TYPES.map((s) => (
              <button key={s} onClick={() => setShowType(s)}
                className={`chip cursor-pointer ${showType === s ? 'border-neon/60 text-neon' : ''}`}>{s}</button>
            ))}
          </div>

          {/* 播放器 */}
          <div className="glass overflow-hidden">
            {!source && (
              <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
                <p className="text-sm text-slate-400">选一个片源，{active?.name ?? '搭子'}马上入座</p>
                <label className="btn-primary cursor-pointer text-xs">
                  📁 选本地视频
                  <input type="file" accept="video/*" className="hidden" onChange={onFile} />
                </label>
                <div className="flex gap-2">
                  <input value={bvid} onChange={(e) => setBvid(e.target.value)} placeholder="或粘贴 B 站 BV 号/链接"
                    className="w-64 rounded-xl border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-neon/60" />
                  <button className="btn text-xs" onClick={onBili}>加载</button>
                </div>
                <p className="text-[10px] text-slate-600">本地视频获得完整进度联动；B 站嵌入播放，陪看时钟为近似同步</p>
              </div>
            )}
            {source?.kind === 'file' && (
              <video ref={hookVideo} src={source.url} controls className="max-h-[520px] w-full bg-black" />
            )}
            {source?.kind === 'bili' && (
              <div>
                <iframe
                  src={`//player.bilibili.com/player.html?bvid=${source.bvid}&autoplay=0&danmaku=1`}
                  allowFullScreen className="aspect-video w-full" />
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-[11px] text-slate-500">陪看时钟：第 {min} 分钟（近似同步，B 站 iframe 无法读取精确进度）</span>
                  <div className="flex gap-2">
                    {!playing
                      ? <button className="btn !py-1 text-xs" onClick={() => { setPlaying(true); if (!started) { setStarted(true); fire('start'); } }}>▶ 陪看开始</button>
                      : <button className="btn !py-1 text-xs" onClick={() => { setPlaying(false); fire('pause'); }}>⏸ 陪看暂停</button>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {source && (
            <div className="glass flex items-center justify-between p-3 text-[11px] text-slate-500">
              <span>{source.kind === 'file' ? `正在看：${source.name}` : `正在看：B站 ${source.bvid}`}</span>
              <span>进度 第 {min} 分钟 · 主动吐槽间隔 22-38s</span>
            </div>
          )}
        </div>

        {/* 陪看频道 */}
        <div className="glass p-4">
          <ChatPanel
            buddy={active ?? buddies[0]}
            contextPrefix={() => `[陪看${showType}·第${min}分钟] `}
            extraPayload={() => ({ watch: { type: showType, min } })}
            injectRef={injectRef}
            title={`${active?.name ?? '搭子'}的陪看频道`}
          />
        </div>
      </div>
    </div>
  );
}
