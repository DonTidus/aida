'use client';

import { useState } from 'react';
import { TRAIT_META, Traits } from '@/lib/personas';

/** 性格轴面板：演化展示 + 玩家塑形（有边界，防 OOC） */
export default function TraitsPanel({
  traits, evolution, editable, onShape,
}: {
  traits: Traits;
  evolution: { t: number; reason: string; delta: Partial<Traits> }[];
  editable?: boolean;
  onShape?: (next: Traits) => void;
}) {
  const [local, setLocal] = useState(traits);
  const dirty = JSON.stringify(local) !== JSON.stringify(traits);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {TRAIT_META.map((m) => {
          const v = local[m.key];
          const diff = v - traits[m.key];
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300">{m.label}</span>
                <span className="text-slate-500">{m.low} ←→ {m.high}</span>
                <span className={`font-mono ${diff > 0 ? 'text-neon' : diff < 0 ? 'text-ember' : 'text-slate-400'}`}>
                  {v}{diff !== 0 && ` (${diff > 0 ? '+' : ''}${diff})`}
                </span>
              </div>
              <input
                type="range" min={0} max={100} value={v} disabled={!editable}
                onChange={(e) => setLocal({ ...local, [m.key]: Number(e.target.value) })}
                className="mt-1 w-full accent-neon disabled:opacity-70"
              />
            </div>
          );
        })}
      </div>
      {editable && (
        <div className="flex items-center gap-2">
          <button className="btn-primary !py-1.5 text-xs" disabled={!dirty}
            onClick={() => { onShape?.(local); }}>保存塑形（±边界内）</button>
          {dirty && <button className="btn !py-1.5 text-xs" onClick={() => setLocal(traits)}>还原</button>}
        </div>
      )}
      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">性格演化日志</h4>
        {evolution.length === 0 && <p className="text-[11px] text-slate-600">还没有演化——一起经历一场比赛后，TA 的性格会开始变化。</p>}
        <div className="space-y-1.5">
          {evolution.slice(0, 8).map((e, i) => (
            <div key={i} className="rounded-lg border border-edge/60 bg-ink/50 px-2.5 py-1.5 text-[11px] leading-relaxed">
              <span className="text-slate-500">{new Date(e.t).toLocaleDateString('zh-CN')} · </span>
              <span className="text-slate-300">{e.reason}</span>
              <span className="ml-1 font-mono text-[10px] text-sky2">
                {Object.entries(e.delta).map(([k, v]) => `${TRAIT_META.find((m) => m.key === k)?.label}${(v as number) > 0 ? '+' : ''}${v}`).join(' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
