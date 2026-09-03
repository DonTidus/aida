'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MATCH, MatchPlayer, durMin } from '@/lib/dataset';
import {
  AidaMsg, Ev, MemoryCard, POINTS, buildMemories, buildStream, composeLine,
  levelOf, LEVELS, shouldSpeak,
} from '@/lib/aida-engine';
import { BuddyState } from '@/lib/personas';
import GoldChart from './GoldChart';

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(Math.max(0, t) % 60)).padStart(2, '0')}`;
const fmtK = (n: number) => (n >= 0 ? `+${(n / 1000).toFixed(1)}k` : `${(n / 1000).toFixed(1)}k`);

export default function ReplayStage({
  buddy = null, onExperience,
}: {
  buddy?: BuddyState | null;
  onExperience?: (mems: MemoryCard[], exp: { win: boolean; comeback: boolean; myDeaths: number; kills: number }, basePoints: number) => void;
}) {
  const [pers, setPers] = useState<MatchPlayer | null>(null);
  const [started, setStarted] = useState(false);
  const [tNow, setTNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(30);
  const [timingOn, setTimingOn] = useState(true);
  const [msgs, setMsgs] = useState<AidaMsg[]>([]);
  const [feed, setFeed] = useState<Ev[]>([]);
  const [points, setPoints] = useState(0);
  const [interference, setInterference] = useState(0);
  const [mems, setMems] = useState<MemoryCard[]>([]);
  const [ended, setEnded] = useState(false);
  const [q, setQ] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  const stream = useMemo(() => (pers ? buildStream(pers) : []), [pers]);
  const idxRef = useRef(0);
  const lastDeathKiller = useRef<{ hero: string; zh: string } | undefined>(undefined);
  const killTimes = useRef<number[]>([]);
  const queued = useRef<Ev[]>([]);
  const pointsRef = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);

  const busy = useMemo(() => {
    const tf = MATCH.events.teamfights.find((f) => tNow >= f.start && tNow < f.end);
    return tf ? { start: tf.start, end: tf.end } : null;
  }, [tNow]);

  // 播放循环
  useEffect(() => {
    if (!playing || !pers || ended) return;
    const iv = setInterval(() => {
      setTNow((t) => {
        const nt = t + 0.1 * speed;
        if (nt >= MATCH.meta.duration_sec) {
          setPlaying(false);
          setEnded(true);
          return MATCH.meta.duration_sec;
        }
        return nt;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [playing, pers, speed, ended]);

  // 事件消费
  useEffect(() => {
    if (!pers) return;
    while (idxRef.current < stream.length && stream[idxRef.current].t <= tNow) {
      const ev = stream[idxRef.current++];
      setFeed((f) => [...f.slice(-30), ev]);
      consume(ev);
    }
  }, [tNow, stream, pers]);

  useEffect(() => { feedRef.current?.scrollTo({ top: 1e6 }); }, [feed.length]);
  useEffect(() => { msgRef.current?.scrollTo({ top: 1e6 }); }, [msgs.length]);

  function emit(text: string, ev: Ev, source: AidaMsg['source'] = 'engine') {
    const inFight = !!busy && tNow >= busy.start && tNow < busy.end;
    const interferenceHit = !timingOn && inFight && ev.kind !== 'death' && ev.kind !== 'end';
    if (interferenceHit) setInterference((c) => c + 1);
    setMsgs((m) => [...m.slice(-40), { t: tNow, text, source, interference: interferenceHit }]);
  }

  function addPoints(ev: Ev) {
    let base = POINTS[ev.kind] ?? 0;
    if (ev.kind === 'enemykill' && (ev.data as any)?.firstblood) base = POINTS.firstblood ?? 8;
    if (!base) return;
    const before = pointsRef.current;
    const after = before + base;
    pointsRef.current = after;
    setPoints(after);
    const bl = levelOf(before), al = levelOf(after);
    if (al.title !== bl.title && ev.kind !== 'end') {
      const lv = al, t = tNow;
      setTimeout(() => setMsgs((m) => [...m, {
        t, text: `【关系升级】从这波之后，我就是你的「${lv.title}」了——以后叫你${lv.call}。`, source: 'engine',
      }]), 300);
    }
  }

  function consume(ev: Ev) {
    if (!pers) return;
    const d = (ev.data || {}) as Record<string, any>;
    const level = levelOf(pointsRef.current);
    let streak = 0;
    if (ev.kind === 'kill') {
      killTimes.current = killTimes.current.filter((t) => tNow - t < 40);
      killTimes.current.push(tNow);
      streak = killTimes.current.length;
    }
    const line = composeLine(ev, {
      pers, level, killsSoFar: pers.k, deathsSoFar: pers.d,
      lastKiller: lastDeathKiller.current,
      buddyName: buddy?.name,
      adv: MATCH.events.gold_adv[Math.min(MATCH.events.gold_adv.length - 1, Math.floor(tNow / 60))],
      streak, msgCount: msgs.length,
    });
    if (ev.kind === 'kill' && lastDeathKiller.current && d.victimHero === lastDeathKiller.current.hero) {
      lastDeathKiller.current = undefined; // 复仇完成，销账
    }
    if (ev.kind === 'death' && d.byName) {
      lastDeathKiller.current = { hero: d.byName, zh: d.by };
    }

    const act = shouldSpeak(ev, tNow, busy, timingOn);
    if (act === 'now' && line) emit(line, ev);
    else if (act === 'queue') queued.current.push(ev);
    else if (act === 'drop' && ev.kind === 'fight') { /* 团战事件本身必到 */ }

    // 团战结束：冲刷排队的消息（最多2条，优先级高的先）
    if (ev.kind === 'fight' && queued.current.length) {
      const flush = queued.current.sort((a, b) => a.tier - b.tier || a.t - b.t).slice(0, 2);
      queued.current = [];
      flush.forEach((qe) => {
        const l = composeLine(qe, {
          pers, level: levelOf(pointsRef.current), killsSoFar: pers.k, deathsSoFar: pers.d,
          lastKiller: lastDeathKiller.current, adv: 0, streak: 0, msgCount: msgs.length, buddyName: buddy?.name,
        });
        if (l) setTimeout(() => emit(l, qe), 400);
      });
    }

    addPoints(ev);

    if (ev.kind === 'end') {
      const cards = buildMemories(pers, MATCH.meta.duration_sec);
      setMems(cards);
      // 成长闭环：把这场共同经历交给所选伙伴（记忆沉淀 + 性格演化）
      const myAdv = (v: number) => ((pers.team === 2) ? v : -v);
      const comebackMine = MATCH.events.gold_adv.some((v, i, a) => i > 0 && myAdv(a[i - 1]) < 0 && myAdv(v) >= 0);
      onExperience?.(cards, { win: !!(ev.data as any)?.win, comeback: comebackMine, myDeaths: pers.d, kills: pers.k }, pointsRef.current);
    }
  }

  function skipToEnd() {
    if (!pers) return;
    setPlaying(false);
    setFeed(stream.filter((e) => e.t <= MATCH.meta.duration_sec));
    // 只把 end 事件留给消费循环：记忆卡/本地存储/终局台词由它统一生成，避免重复写入
    idxRef.current = stream.filter((e) => e.t < MATCH.meta.duration_sec).length;
    queued.current = [];
    pointsRef.current = Math.max(pointsRef.current, 430);
    setPoints(pointsRef.current);
    setMsgs((m) => m.slice(-2));
    setTNow(MATCH.meta.duration_sec);
    setEnded(true);
  }

  async function ask() {
    if (!q.trim() || !pers || chatBusy) return;
    const question = q.trim();
    setQ(''); setChatBusy(true);
    setMsgs((m) => [...m, { t: tNow, text: `问：${question}`, source: 'engine' }]);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: question, pers, mems, buddy }),
      });
      const j = await r.json();
      setMsgs((m) => [...m, { t: tNow, text: j.text, source: j.source }]);
    } catch {
      setMsgs((m) => [...m, { t: tNow, text: '（信号不好，稍后再问我）', source: 'engine' }]);
    }
    setChatBusy(false);
  }

  function reset(nextPers?: MatchPlayer) {
    setPers(nextPers ?? null);
    setStarted(!!nextPers);
    setTNow(0); setPlaying(false); setMsgs([]); setFeed([]); setPoints(0);
    setInterference(0); setMems([]); setEnded(false);
    idxRef.current = 0; killTimes.current = []; queued.current = [];
    pointsRef.current = 0;
    lastDeathKiller.current = undefined;
  }

  const level = levelOf(points);
  const nextLevel = LEVELS.find((l) => l.min > points);
  const progress = nextLevel ? ((points - level.min) / (nextLevel.min - level.min)) * 100 : 100;

  // ---------- 视角选择 ----------
  if (!started || !pers) {
    return (
      <div className="glass p-6 md:p-10">
        <h2 className="text-lg font-bold text-slate-100">选择你的视角 · 你是谁，TA就陪谁</h2>
        <p className="mt-1 text-sm text-slate-400">
          {MATCH.meta.league} · {MATCH.meta.radiant_name} vs {MATCH.meta.dire_name} · {durMin} 分钟 · 真实开源解析数据
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {MATCH.players.map((p) => (
            <button key={p.slot} onClick={() => reset(p)}
              className={`flex items-center justify-between rounded-xl border border-edge bg-panel px-4 py-3 text-left transition hover:border-neon/60 ${p.team === 2 ? '' : 'opacity-90'}`}>
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  {p.name} <span className="text-slate-400">· {p.hero_zh}</span>
                </div>
                <div className="text-xs text-slate-500">{p.team === 2 ? MATCH.meta.radiant_name : MATCH.meta.dire_name}</div>
              </div>
              <div className={`font-mono text-sm ${p.team === 2 ? 'text-neon' : 'text-ember'}`}>{p.k}/{p.d}/{p.a}</div>
            </button>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-500">
          推荐：Ame 的斯温（11/0/3，逆风翻盘局）——最能体现搭子的患难与高光记忆。
        </p>
      </div>
    );
  }

  const curAdv = MATCH.events.gold_adv[Math.min(MATCH.events.gold_adv.length - 1, Math.floor(tNow / 60))];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      {/* 左：比赛画面 */}
      <div className="space-y-4">
        <div className="glass p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-sm font-bold text-slate-100">{pers.name} · {pers.hero_zh}</span>
              <span className="ml-2 chip">{pers.team === 2 ? MATCH.meta.radiant_name : MATCH.meta.dire_name}</span>
            </div>
            <div className="flex items-center gap-2">
              {!ended ? (
                <>
                  <button className="btn-primary" onClick={() => setPlaying((p) => !p)}>
                    {playing ? '⏸ 暂停' : '▶ 播放'}
                  </button>
                  {[10, 30, 60].map((s) => (
                    <button key={s} onClick={() => setSpeed(s)}
                      className={`btn ${speed === s ? 'border-neon/60 text-neon' : ''} !px-2 !py-1 text-xs`}>{s}x</button>
                  ))}
                  <button className="btn !px-2 !py-1 text-xs" onClick={skipToEnd}>跳到结算</button>
                </>
              ) : (
                <button className="btn" onClick={() => reset()}>← 换个视角</button>
              )}
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-edge">
            <div className="h-full bg-gradient-to-r from-sky2 to-neon transition-[width] duration-150"
              style={{ width: `${(tNow / MATCH.meta.duration_sec) * 100}%` }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
            <span>{mmss(tNow)}</span>
            <span>{busy ? '⚔ 团战进行中' : '发育/游走'}</span>
            <span>经济 {curAdv >= 0 ? '+' : ''}{fmtK(curAdv)}</span>
          </div>
        </div>

        <GoldChart tNow={tNow} persTeam={pers.team} />

        <div className="glass p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">战斗日志</h3>
          <div ref={feedRef} className="scroll-thin h-44 space-y-1 overflow-y-auto pr-1 font-mono text-xs">
            {feed.length === 0 && <p className="text-slate-600">等待比赛开始…</p>}
            {feed.slice(-14).map((e) => (
              <div key={e.id} className="flex gap-2">
                <span className="shrink-0 text-slate-600">{mmss(e.t)}</span>
                <span className={
                  e.kind === 'kill' ? 'text-neon' : e.kind === 'death' ? 'text-ember' :
                  e.kind === 'tower' || e.kind === 'roshan' ? 'text-gold' :
                  e.kind === 'fight' ? 'text-sky2' : e.kind === 'flip' ? 'text-gold font-bold' : 'text-slate-400'
                }>{e.feed}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右：伙伴 */}
      <div className="space-y-4">
        <div className="glass p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neon/80 to-sky2/80 text-lg font-black text-ink">艾</div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-100">{buddy?.name ?? "艾搭"} <span className="chip ml-1">{level.title}</span></div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                只在你倒下、结算和间隙开口 · 记住你的每一次倒下与翻盘
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>同行值 {points}</span>
              <span>{nextLevel ? `下一级：${nextLevel.title}（${nextLevel.min}）` : '满级'}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-edge">
              <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="glass p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{buddy?.name ?? "艾搭"}的频道</h3>
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-400">
                <input type="checkbox" checked={timingOn} onChange={(e) => setTimingOn(e.target.checked)} className="accent-neon" />
                时机引擎
              </label>
              <span className={`chip ${interference > 0 ? 'border-ember/60 text-ember' : ''}`} title="战斗进行中的插话次数（越少越好）">
                打扰 {interference}
              </span>
            </div>
          </div>
          <div ref={msgRef} className="scroll-thin h-72 space-y-2 overflow-y-auto pr-1">
            {msgs.map((m, i) => (
              <div key={i} className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed ${m.source === 'llm' ? 'bg-sky2/10 border border-sky2/30' : 'bg-edge/40'} ${m.interference ? 'ring-1 ring-ember/70' : ''}`}>
                <span className="mr-1.5 font-bold text-neon">{buddy?.name ?? "艾搭"}</span>
                <span className="text-slate-200">{m.text}</span>
                {m.interference && <span className="ml-1.5 text-[10px] text-ember">⚠战斗中插话</span>}
                {m.source === 'llm' && <span className="ml-1.5 text-[10px] text-sky2">LLM</span>}
              </div>
            ))}
            {msgs.length === 0 && <p className="text-xs text-slate-600">点「播放」，{buddy?.name ?? "艾搭"}会开始陪你。</p>}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder={`问${buddy?.name ?? "艾搭"}：这局为什么能翻盘？`}
              className="min-w-0 flex-1 rounded-xl border border-edge bg-ink px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-neon/60" />
            <button className="btn-primary !px-3" onClick={ask} disabled={chatBusy}>问</button>
          </div>
        </div>

        {ended && mems.length > 0 && (
          <div className="glass p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">这场比赛，{buddy?.name ?? "艾搭"}记住了</h3>
            <div className="space-y-2">
              {mems.map((m) => (
                <div key={m.id} className="rounded-xl border border-edge bg-ink/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold ${m.type === 'highlight' ? 'text-gold' : m.type === 'dark' ? 'text-ember' : m.type === 'habit' ? 'text-sky2' : 'text-neon'}`}>
                      {m.typeLabel}
                    </span>
                    <span className="text-[10px] text-slate-600">{mmss(m.formedAt)} 形成</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">{m.title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
