'use client';

import { useBuddies } from '@/lib/buddy-store';
import Link from 'next/link';

const COLORS: Record<string, string> = {
  highlight: 'text-gold', dark: 'text-ember', habit: 'text-sky2', milestone: 'text-neon',
};

export default function MemoryPage() {
  const { buddies } = useBuddies();
  const withMem = buddies.filter((b) => b.memories.length > 0);

  return (
    <div className="space-y-4">
      <section className="glass p-6">
        <h1 className="text-xl font-bold text-slate-50">伙伴们的记忆库</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          每个伙伴的记忆相互独立：记忆不是聊天记录，而是<strong className="text-slate-200">从共同经历里提炼的情绪事件</strong>（高光 / 至暗 / 习惯 / 里程碑），
          持久化在本地——下次打开，TA 依然记得，而且会在日常聊天里主动提起。
        </p>
        <p className="mt-2 text-xs text-slate-500">
          还是空的？<Link href="/replay" className="text-neon underline decoration-neon/40">陪某个伙伴看一场比赛</Link>（或点「跳到结算」快速生成）。
        </p>
      </section>

      {withMem.length === 0 && <div className="glass p-8 text-center text-sm text-slate-500">所有伙伴的记忆库都空空如也——TA 们在等你。</div>}

      {withMem.map((b) => (
        <section key={b.id} className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100">{b.name} · {b.title}</h2>
            <span className="text-[10px] text-slate-500">同行 {b.matches} 场 · 记忆 {b.memories.length} 条</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {b.memories.map((c) => (
              <div key={c.id + c.title} className="rounded-xl border border-edge bg-ink/60 p-3">
                <span className={`text-[10px] font-bold ${COLORS[c.type]}`}>{c.typeLabel}</span>
                <div className="mt-1 text-sm font-semibold text-slate-100">{c.title}</div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{c.text}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
