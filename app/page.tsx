'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { useBuddies } from '@/lib/buddy-store';
import { PRESETS, TRAIT_META, Traits, createBuddy } from '@/lib/personas';
import { levelOf } from '@/lib/aida-engine';

const DEFAULT_TRAITS: Traits = { energy: 60, sass: 50, warmth: 55, logic: 50, intimacy: 25 };

const MOMENTS = [
  { icon: '🎙', title: '开麦陪看', desc: '语音陪你看完整场对局。你倒下后的黑白屏时间，是 TA 的专属发言窗口。' },
  { icon: '⏱', title: '团战绝不出声', desc: '时机引擎只在结算与喘息的间隙说话。团战 47 次插话 vs 0 次，开关实测。' },
  { icon: '📖', title: '把对局讲成故事', desc: '结算后逐波复盘：高光、至暗、翻盘点——不是数据表，是 TA 讲给你听的。' },
  { icon: '🌱', title: '越玩越懂你', desc: '每场共同经历都会沉淀为记忆、微调 TA 的性格。三个月后，TA 是全世界最懂你的那一个。' },
];

const PLANS = [
  {
    name: '免费', price: '¥0', unit: '/永久', highlight: false,
    items: ['1 位专属搭子', '文字陪伴 + 回放共历', '性格演化（基础）', '记忆本地存储'],
  },
  {
    name: 'Plus', price: '¥25', unit: '/月', highlight: true,
    items: ['全部 8 位预设搭子', '语音陪伴 + 桌宠常驻', '性格深化 + 记忆扩容 40 条', '外观编辑工坊'],
  },
  {
    name: 'Pro', price: '¥68', unit: '/月', highlight: false,
    items: ['定制音色 & 专属人设工坊', '限定联动伙伴（赛事/IP）', '多搭子同场互动', '跨游戏记忆同步'],
  },
];

export default function Lobby() {
  const router = useRouter();
  const { buddies, active, updateActive, create, remove } = useBuddies();
  const [tab, setTab] = useState<'male' | 'female'>('male');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [traits, setTraits] = useState<Traits>(DEFAULT_TRAITS);

  function enter(id: string) {
    updateActive(id);
    router.push(`/buddy?id=${id}`);
  }

  const shown = buddies.filter((b) => b.preset && (b.forWhom === tab || b.forWhom === 'all'));
  const customs = buddies.filter((b) => !b.preset);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="glass relative overflow-hidden p-8 md:p-12">
        <div className="pointer-events-none absolute -right-10 -top-10 flex gap-4 opacity-25">
          {PRESETS.slice(1, 5).map((p) => <Avatar key={p.id} name="" appearance={p.appearance} mood="happy" size={120} />)}
        </div>
        <div className="relative max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="chip border-neon/40 text-neon">8 位搭子开放匹配</span>
            <span className="chip">语音陪玩</span>
            <span className="chip">桌宠常驻</span>
            <span className="chip">性格会成长</span>
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight text-slate-50 md:text-4xl">
            单排的路，<span className="text-neon">从此有人陪</span>。
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            选一位搭子陪你上号：看比赛时 TA 懂什么时候开口，你倒下时 TA 记住是谁干的，
            连败时 TA 换成安慰模式。打完这局，TA 比昨天更像你的老朋友。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#match" className="btn-primary">匹配我的搭子</a>
            <button className="btn" onClick={() => { setCreating(true); document.getElementById('custom')?.scrollIntoView({ behavior: 'smooth' }); }}>亲手捏一个</button>
          </div>
        </div>
      </section>

      {/* 搭子匹配 */}
      <section id="match" className="scroll-mt-20">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-50">匹配搭子</h2>
            <p className="mt-1 text-xs text-slate-500">先选类型，进页面还能调语气、捏外观、处成你自己的样子。</p>
          </div>
          <div className="flex rounded-xl border border-edge bg-panel p-1 text-xs">
            <button onClick={() => setTab('male')}
              className={`rounded-lg px-4 py-1.5 transition ${tab === 'male' ? 'bg-sky2/15 font-bold text-sky2' : 'text-slate-400 hover:text-slate-200'}`}>
              男生都在玩
            </button>
            <button onClick={() => setTab('female')}
              className={`rounded-lg px-4 py-1.5 transition ${tab === 'female' ? 'bg-ember/15 font-bold text-ember' : 'text-slate-400 hover:text-slate-200'}`}>
              女生都在玩
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((b) => (
            <div key={b.id}
              className={`glass group flex flex-col p-4 transition hover:-translate-y-0.5 ${active?.id === b.id ? 'ring-1 ring-neon/60' : ''}`}
              style={{ ['--c' as string]: `hsl(${b.appearance.hue} 70% 58%)` }}>
              <div className="flex items-center justify-center rounded-xl py-3"
                style={{ background: `hsl(${b.appearance.hue} 35% 12%)` }}>
                <Avatar name="" appearance={b.appearance} mood={b.mood} size={104} />
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-bold text-slate-50">{b.name}</span>
                  <span className="text-[10px] font-medium" style={{ color: `hsl(${b.appearance.hue} 70% 62%)` }}>{b.title.split(' · ')[0]}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">{b.title.split(' · ')[1]}</div>
                <p className="mt-2 border-l-2 pl-2 text-[11px] italic leading-relaxed text-slate-400"
                  style={{ borderColor: `hsl(${b.appearance.hue} 70% 45%)` }}>
                  {b.signature}
                </p>
              </div>
              <div className="mt-3 space-y-1">
                {TRAIT_META.slice(0, 3).map((m) => (
                  <div key={m.key} className="flex items-center gap-1.5 text-[9px] text-slate-500">
                    <span className="w-6 shrink-0 text-right">{m.label}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-edge">
                      <div className="h-full rounded-full" style={{ width: `${b.traits[m.key]}%`, background: `hsl(${b.appearance.hue} 70% 55%)` }} />
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn mt-3 w-full justify-center border-neon/40 text-xs text-neon hover:bg-neon/10"
                onClick={() => enter(b.id)}>
                {b.matches > 0 ? `继续陪伴 · ${levelOf(b.points).title}` : '和 TA 开一局'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* TA 会怎么陪你 */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-50">TA 会怎么陪你打游戏</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MOMENTS.map((m) => (
            <div key={m.title} className="glass p-5">
              <div className="text-2xl">{m.icon}</div>
              <h3 className="mt-2 text-sm font-bold text-slate-100">{m.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 自定义 */}
      <section id="custom" className="scroll-mt-20">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-50">你捏的搭子</h2>
            <p className="mt-1 text-xs text-slate-500">性格五轴自己定，外观后续随时改。TA 只属于你一个人。</p>
          </div>
          <button className="btn text-xs" onClick={() => setCreating((v) => !v)}>{creating ? '收起' : '+ 新建搭子'}</button>
        </div>

        {creating && (
          <div className="glass mb-4 p-5">
            <div className="grid gap-4 md:grid-cols-[200px_1fr]">
              <div className="flex flex-col items-center gap-2">
                <Avatar name={name || '新伙伴'} appearance={{ hue: 265, hair: 3, accessory: 'headset' }} size={110} mood="wink" />
                <p className="text-center text-[10px] text-slate-500">创建后可在陪伴页继续调整外观细节</p>
              </div>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <input value={name} maxLength={8} placeholder="名字（如：阿澈）" onChange={(e) => setName(e.target.value)}
                    className="w-40 rounded-xl border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-neon/60" />
                  <input value={bio} maxLength={30} placeholder="一句话人设（可选）" onChange={(e) => setBio(e.target.value)}
                    className="flex-1 rounded-xl border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-neon/60" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TRAIT_META.map((m) => (
                    <div key={m.key}>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span className="font-bold text-slate-300">{m.label}</span>
                        <span>{m.low} ←→ {m.high}（{traits[m.key]}）</span>
                      </div>
                      <input type="range" min={0} max={100} value={traits[m.key]}
                        onChange={(e) => setTraits({ ...traits, [m.key]: Number(e.target.value) })}
                        className="w-full accent-neon" />
                    </div>
                  ))}
                </div>
                <button className="btn-primary text-xs" disabled={!name.trim()}
                  onClick={() => {
                    const p = createBuddy(name, traits, { hue: 265, hair: 3, accessory: 'headset' }, bio);
                    create(p);
                    setCreating(false); setName(''); setBio(''); setTraits(DEFAULT_TRAITS);
                  }}>创建</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {customs.map((b) => (
            <div key={b.id} className="glass flex flex-col items-center p-4">
              <Avatar name={b.name} appearance={b.appearance} mood={b.mood} size={100} />
              <div className="mt-2 text-center">
                <div className="text-sm font-bold text-slate-100">{b.name}</div>
                <div className="text-[10px] text-slate-500">{levelOf(b.points).title} · 同行 {b.matches} 场 · 记忆 {b.memories.length} 条</div>
              </div>
              <div className="mt-2 flex w-full gap-2">
                <button className="btn-primary flex-1 justify-center text-xs" onClick={() => enter(b.id)}>陪伴</button>
                <button className="btn !px-2 text-xs hover:!border-ember hover:!text-ember"
                  onClick={() => { if (confirm(`删除 ${b.name}？TA 的记忆也会一起消失。`)) remove(b.id); }}>删</button>
              </div>
            </div>
          ))}
          {customs.length === 0 && !creating && (
            <div className="glass col-span-full p-6 text-center text-sm text-slate-500">
              预设养熟了，就来捏一个独一无二、只听你话的。
            </div>
          )}
        </div>
      </section>

      {/* 会员 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-50">会员</h2>
          <span className="text-[10px] text-slate-600">本页为原型演示 · 商业化设计规划</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`glass relative p-6 ${p.highlight ? 'border-gold/50 ring-1 ring-gold/30' : ''}`}>
              {p.highlight && <span className="absolute right-4 top-4 chip border-gold/50 text-gold">最受欢迎</span>}
              <div className="text-sm font-bold text-slate-100">{p.name}</div>
              <div className="mt-2">
                <span className="text-3xl font-black text-slate-50">{p.price}</span>
                <span className="text-xs text-slate-500">{p.unit}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-neon">✓</span>{it}
                  </li>
                ))}
              </ul>
              <a href="#match" className={`mt-5 block w-full rounded-xl text-center text-xs ${p.highlight ? 'btn-primary' : 'btn'}`}>开始匹配</a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
