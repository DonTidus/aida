'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReplayStage from '@/components/ReplayStage';
import Avatar from '@/components/Avatar';
import { useBuddies, ExperienceResult } from '@/lib/buddy-store';
import { TRAIT_META, Appearance } from '@/lib/personas';
import type { MemoryCard } from '@/lib/aida-engine';

function EvolutionPanel({ r, name, hue, appearance, buddyId }: { r: ExperienceResult; name: string; hue: number; appearance: Appearance; buddyId: string }) {
  const entries = TRAIT_META.map((m) => ({
    ...m,
    before: r.before[m.key],
    delta: (r.delta as any)[m.key] ?? 0,
  })).filter((x) => x.delta !== 0);

  return (
    <section className="glass border-gold/30 p-5">
      <div className="flex items-center gap-3">
        <Avatar name={name} appearance={appearance} mood="excited" size={56} />
        <div>
          <h2 className="text-base font-bold text-gold">因为这场经历，{name} 变了</h2>
          <p className="text-[11px] text-slate-500">
            沉淀记忆 {r.mems.length} 条 · 性格演化 {entries.length} 处 —— 成长不是数值彩蛋，是共同经历的自然结果
          </p>
        </div>
      </div>
      {entries.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <div key={e.key} className="rounded-xl border border-edge bg-ink/60 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">{e.label}</span>
                <span className="font-mono">
                  <span className="text-slate-500">{e.before}</span>
                  <span className={e.delta > 0 ? 'text-neon' : 'text-ember'}> → {e.before + e.delta}（{e.delta > 0 ? '+' : ''}{e.delta}）</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-edge">
                <div className="h-full rounded-full transition-all" style={{ width: `${e.before + e.delta}%`, background: `hsl(${hue} 70% 55%)` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 space-y-1">
        {r.reasons.map((x, i) => (
          <p key={i} className="text-[11px] text-slate-400">· {x}</p>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        打开 <Link href={`/buddy?id=${buddyId}`} className="text-neon underline decoration-neon/40">陪伴页</Link> 查看TA的完整性格轴与演化日志。
      </p>
    </section>
  );
}

function ReplayInner() {
  const params = useSearchParams();
  const { buddies, active, updateActive, applyExperience } = useBuddies();
  const [result, setResult] = useState<ExperienceResult | null>(null);

  useEffect(() => {
    const want = params.get('buddy');
    if (want && buddies.length && want !== active?.id) updateActive(want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, buddies.length]);

  function handleExperience(mems: MemoryCard[], exp: { win: boolean; comeback: boolean; myDeaths: number; kills: number }, basePoints: number) {
    if (!active) return;
    const r = applyExperience(active.id, mems, exp, basePoints);
    if (r) setResult(r);
  }

  return (
    <div className="space-y-4">
      <section className="glass flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="text-base font-bold text-slate-50">共同经历引擎 · 回放共历</h1>
          <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-slate-400">
            用一场真实的 TI 职业比赛代替你的实时对局：你以选手视角经历全场，所选的伙伴用时机引擎陪你看完——
            终局的记忆与情绪会沉淀进 TA 的性格。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {active && <Avatar name={active.name} appearance={active.appearance} mood={active.mood} size={44} />}
          <select value={active?.id ?? ''} onChange={(e) => { updateActive(e.target.value); setResult(null); }}
            className="rounded-xl border border-edge bg-panel px-3 py-2 text-xs text-slate-300 outline-none">
            {buddies.map((x) => <option key={x.id} value={x.id}>{x.name}（同行 {x.matches} 场）</option>)}
          </select>
        </div>
      </section>

      {result && active && <EvolutionPanel r={result} name={active.name} hue={active.appearance.hue} appearance={active.appearance} buddyId={active.id} />}

      <ReplayStage buddy={active} onExperience={handleExperience} />
    </div>
  );
}

export default function ReplayPage() {
  return <Suspense><ReplayInner /></Suspense>;
}
