'use client';

import { useMemo } from 'react';
import { MATCH, durMin } from '@/lib/dataset';

export default function GoldChart({ tNow, persTeam }: { tNow: number; persTeam: 2 | 3 }) {
  const sgn = persTeam === 2 ? 1 : -1;
  const my = useMemo(() => MATCH.events.gold_adv.map((v) => v * sgn), [sgn]);
  const W = 560, H = 120, P = 8;
  const maxAbs = Math.max(...my.map((v) => Math.abs(v)), 1000);
  const x = (m: number) => P + (m / (durMin - 1)) * (W - 2 * P);
  const y = (v: number) => H / 2 - (v / maxAbs) * (H / 2 - P);
  const path = useMemo(() => my.map((v, m) => `${m === 0 ? 'M' : 'L'}${x(m).toFixed(1)},${y(v).toFixed(1)}`).join(' '), [my]);

  const curMin = Math.min(durMin - 1, tNow / 60);
  const curVal = my[Math.min(my.length - 1, Math.floor(curMin))];
  const deepest = Math.min(...my);
  const deepMin = my.indexOf(deepest);

  return (
    <div className="glass p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>我方经济差（每分钟）</span>
        <span className={curVal >= 0 ? 'text-neon' : 'text-ember'}>
          当前 {curVal >= 0 ? '+' : ''}{(curVal / 1000).toFixed(1)}k
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={P} y1={H / 2} x2={W - P} y2={H / 2} stroke="#1f2a3f" strokeDasharray="3 3" />
        <rect x={P} y={H / 2} width={W - 2 * P} height={H / 2 - P} fill="rgba(74,222,128,0.05)" />
        <path d={path} fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.9" />
        <circle cx={x(deepMin)} cy={y(deepest)} r="3" fill="#fb7185" />
        <text x={x(deepMin)} y={y(deepest) - 6} fontSize="9" fill="#fb7185" textAnchor={deepMin > durMin / 2 ? 'end' : 'start'}>
          至暗 {(deepest / 1000).toFixed(1)}k
        </text>
        <line x1={x(curMin)} y1={P} x2={x(curMin)} y2={H - P} stroke="#fbbf24" strokeWidth="1.5" opacity="0.9" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>0min</span><span>{Math.floor(durMin / 2)}min</span><span>{durMin}min</span>
      </div>
    </div>
  );
}
