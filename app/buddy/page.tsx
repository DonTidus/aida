'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Avatar from '@/components/Avatar';
import ChatPanel from '@/components/ChatPanel';
import TraitsPanel from '@/components/TraitsPanel';
import DesktopMode from '@/components/DesktopMode';
import { useBuddies } from '@/lib/buddy-store';
import { TRAIT_META, Appearance, Traits } from '@/lib/personas';
import { LEVELS, levelOf } from '@/lib/aida-engine';
import Link from 'next/link';

function BuddyPageInner() {
  const params = useSearchParams();
  const { buddies, active, updateActive, editBuddy } = useBuddies();
  const [tab, setTab] = useState<'chat' | 'traits' | 'edit' | 'memory'>('chat');

  if (!active) {
    return (
      <div className="glass p-8 text-center">
        <p className="text-sm text-slate-400">伙伴加载中，或者你还没有伙伴。</p>
        <Link href="/" className="btn-primary mt-4 inline-flex">去大厅看看</Link>
      </div>
    );
  }

  const b = active;
  const lvl = levelOf(b.points);
  const nextLvl = LEVELS.find((l) => l.min > b.points);
  const hue = b.appearance.hue;

  const shape = (next: Traits) => {
    const clamped: Traits = { ...next };
    for (const m of TRAIT_META) {
      const cur = b.traits[m.key];
      clamped[m.key] = Math.max(cur - 10, Math.min(cur + 10, next[m.key]));
    }
    editBuddy(b.id, { traits: clamped }, '主人亲手塑形');
  };

  return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={b.name} appearance={b.appearance} mood={b.mood} size={64} />
          <div>
            <div className="text-base font-bold text-slate-50">{b.name} <span className="chip ml-1">{b.title}</span></div>
            <p className="mt-0.5 max-w-xl text-xs text-slate-400">{b.bio}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={b.id} onChange={(e) => updateActive(e.target.value)}
            className="rounded-xl border border-edge bg-panel px-3 py-2 text-xs text-slate-300 outline-none">
            {buddies.map((x) => <option key={x.id} value={x.id}>{x.name}{x.preset ? '（预设）' : ''}</option>)}
          </select>
          <DesktopMode buddy={b} />
          <Link href={`/replay?buddy=${b.id}`} className="btn-primary text-xs">🎮 陪TA看一场比赛</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* 左：状态 */}
        <div className="space-y-4">
          <div className="glass flex flex-col items-center p-5">
            <Avatar name={b.name} appearance={b.appearance} mood={b.mood} size={150} talking={false} />
            <div className="mt-3 w-full">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>关系：{lvl.title}</span>
                <span>同行值 {b.points}{nextLvl ? ` → ${nextLvl.title}（${nextLvl.min}）` : ' · MAX'}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-edge">
                <div className="h-full transition-all"
                  style={{ width: `${nextLvl ? ((b.points - lvl.min) / (nextLvl.min - lvl.min)) * 100 : 100}%`, background: `hsl(${hue} 70% 55%)` }} />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                <span>共同经历 {b.matches} 场</span>
                <span>记忆 {b.memories.length} 条</span>
              </div>
            </div>
          </div>

          <div className="glass p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">性格轴（演化中）</h3>
            <div className="space-y-2">
              {TRAIT_META.map((m) => (
                <div key={m.key}>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span className="font-bold text-slate-300">{m.label}</span>
                    <span>{b.traits[m.key]}</span>
                  </div>
                  <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-edge">
                    <div className="h-full rounded-full" style={{ width: `${b.traits[m.key]}%`, background: `hsl(${hue} 70% 55%)` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-600">性格随共同经历自动演化，也可在「编辑」里塑形。</p>
          </div>
        </div>

        {/* 右：功能区 */}
        <div className="glass p-4">
          <div className="mb-4 flex gap-1 text-xs">
            {([['chat', '聊天'], ['traits', '性格'], ['edit', '编辑'], ['memory', `记忆 ${b.memories.length}`]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`rounded-lg px-3 py-1.5 transition ${tab === k ? 'bg-panel font-bold text-neon' : 'text-slate-400 hover:text-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'chat' && <ChatPanel buddy={b} />}
          {tab === 'traits' && <TraitsPanel traits={b.traits} evolution={b.evolution} />}
          {tab === 'memory' && (
            <div className="grid gap-2 sm:grid-cols-2">
              {b.memories.length === 0 && (
                <p className="text-xs text-slate-500">还没有记忆。<Link href={`/replay?buddy=${b.id}`} className="text-neon underline decoration-neon/40">陪TA看一场比赛</Link>，经历会变成记忆。</p>
              )}
              {b.memories.map((m) => (
                <div key={m.id} className="rounded-xl border border-edge bg-ink/60 p-3">
                  <span className={`text-[10px] font-bold ${m.type === 'highlight' ? 'text-gold' : m.type === 'dark' ? 'text-ember' : m.type === 'habit' ? 'text-sky2' : 'text-neon'}`}>{m.typeLabel}</span>
                  <div className="mt-1 text-sm font-semibold text-slate-100">{m.title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{m.text}</p>
                </div>
              ))}
            </div>
          )}
          {tab === 'edit' && <Editor buddy={b} onSave={(patch, reason) => editBuddy(b.id, patch, reason)} />}
        </div>
      </div>
    </div>
  );
}

function Editor({ buddy, onSave }: {
  buddy: import('@/lib/personas').BuddyState;
  onSave: (patch: Partial<import('@/lib/personas').PersonaCard> & { traits?: Traits }, reason?: string) => void;
}) {
  const [name, setName] = useState(buddy.name);
  const [bio, setBio] = useState(buddy.bio);
  const [app, setApp] = useState<Appearance>(buddy.appearance);
  const dirty = name !== buddy.name || bio !== buddy.bio || JSON.stringify(app) !== JSON.stringify(buddy.appearance);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-5">
        <Avatar name={name || buddy.name} appearance={app} mood={buddy.mood} size={130} />
        <div className="flex-1 space-y-3">
          <div>
            <label className="text-[11px] text-slate-500">名字</label>
            <input value={name} maxLength={8} onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-neon/60" />
          </div>
          <div>
            <label className="text-[11px] text-slate-500">一句话人设</label>
            <input value={bio} maxLength={40} onChange={(e) => setBio(e.target.value)}
              className="mt-1 w-full rounded-xl border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-neon/60" />
          </div>
        </div>
      </div>
      <div>
        <label className="text-[11px] text-slate-500">主色</label>
        <input type="range" min={0} max={360} value={app.hue} onChange={(e) => setApp({ ...app, hue: Number(e.target.value) })} className="w-full accent-neon" />
      </div>
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="text-[11px] text-slate-500">发型</label>
          <div className="mt-1 flex gap-1">
            {(['短发', '长发', '丸子', '乱翘'] as const).map((s, i) => (
              <button key={s} onClick={() => setApp({ ...app, hair: i as 0 | 1 | 2 | 3 })}
                className={`chip cursor-pointer ${app.hair === i ? 'border-neon/60 text-neon' : ''}`}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[11px] text-slate-500">配件</label>
          <div className="mt-1 flex gap-1">
            {([['headset', '耳机'], ['glasses', '眼镜'], ['none', '无']] as const).map(([k, s]) => (
              <button key={k} onClick={() => setApp({ ...app, accessory: k })}
                className={`chip cursor-pointer ${app.accessory === k ? 'border-neon/60 text-neon' : ''}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>
      <button className="btn-primary text-xs" disabled={!dirty}
        onClick={() => onSave({ name, bio, appearance: app }, '主人编辑了外观与设定')}>保存编辑</button>
      <p className="text-[10px] leading-relaxed text-slate-600">
        外观与设定可自由编辑；性格塑形有 ±10 边界——伙伴被共同经历养出来的部分，不该被一键抹掉（防 OOC 的产品约束）。
      </p>
    </div>
  );
}

export default function BuddyPage() {
  return <Suspense><BuddyPageInner /></Suspense>;
}
