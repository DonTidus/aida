'use client';

import { Appearance, Mood } from '@/lib/personas';

const moodEyes = (m: Mood): { lid: number; pupilY: number; brow: number } => {
  switch (m) {
    case 'happy': return { lid: 0.15, pupilY: -1, brow: -2 };
    case 'excited': return { lid: -0.1, pupilY: -1.5, brow: -3 };
    case 'sad': return { lid: 0.3, pupilY: 1.5, brow: 3 };
    case 'worried': return { lid: 0.2, pupilY: 1, brow: 2.5 };
    case 'wink': return { lid: 0.1, pupilY: -0.5, brow: -1.5 };
    default: return { lid: 0.05, pupilY: 0, brow: 0 };
  }
};

export default function Avatar({
  name, appearance, mood = 'calm', size = 160, talking = false,
}: {
  name: string; appearance: Appearance; mood?: Mood; size?: number; talking?: boolean;
}) {
  const { hue, hair, accessory } = appearance;
  const e = moodEyes(mood);
  const skin = `hsl(${hue} 30% 88%)`;
  const main = `hsl(${hue} 70% 58%)`;
  const dark = `hsl(${hue} 60% 34%)`;
  const soft = `hsl(${hue} 45% 78%)`;
  const hairD = dark, body = main;

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 120 130" width={size} style={{ overflow: 'visible' }}>
        {/* 身体 */}
        <path d={`M32 128 Q34 96 60 94 Q86 96 88 128 Z`} fill={body} />
        <path d={`M52 96 L60 106 L68 96`} fill={soft} opacity="0.7" />
        {/* 头 */}
        <circle cx="60" cy="58" r="34" fill={skin} />
        {/* 发型 */}
        {hair === 0 && <path d="M26 52 Q28 22 60 22 Q92 22 94 52 Q88 38 60 36 Q32 38 26 52Z" fill={hairD} />}
        {hair === 1 && (
          <>
            <path d="M26 52 Q28 22 60 22 Q92 22 94 52 Q88 38 60 36 Q32 38 26 52Z" fill={hairD} />
            <path d="M24 52 Q18 86 26 104 L34 100 Q28 78 32 56Z" fill={hairD} />
            <path d="M96 52 Q102 86 94 104 L86 100 Q92 78 88 56Z" fill={hairD} />
          </>
        )}
        {hair === 2 && (
          <>
            <path d="M26 52 Q28 22 60 22 Q92 22 94 52 Q88 38 60 36 Q32 38 26 52Z" fill={hairD} />
            <circle cx="24" cy="40" r="12" fill={hairD} />
            <circle cx="96" cy="40" r="12" fill={hairD} />
          </>
        )}
        {hair === 3 && (
          <path d="M26 54 Q24 24 62 24 Q94 26 92 56 Q90 44 76 42 Q60 48 46 42 Q32 42 26 54Z" fill={hairD} />
        )}
        {/* 眼睛 */}
        <g transform={`translate(0 ${e.pupilY})`}>
          <ellipse cx="46" cy="60" rx="5.2" ry="6" fill="#1f2937" />
          <ellipse cx="74" cy="60" rx="5.2" ry="6" fill="#1f2937" />
          <circle cx="47.6" cy="57.6" r="1.6" fill="#fff" />
          <circle cx="75.6" cy="57.6" r="1.6" fill="#fff" />
        </g>
        {mood === 'wink' && <path d="M68 60 Q74 56 80 60" stroke="#1f2937" strokeWidth="2.4" fill="none" strokeLinecap="round" />}
        {/* 眉毛 */}
        <path d={`M40 ${50 + e.brow} Q46 ${47 + e.brow} 52 ${50 + e.brow}`} stroke={hairD} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d={`M68 ${50 + e.brow} Q74 ${47 + e.brow} 80 ${50 + e.brow}`} stroke={hairD} strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* 眼罩/睡眠盖（sad 时眼睑下压） */}
        {e.lid > 0.15 && (
          <>
            <rect x="40" y="54" width="12" height={e.lid * 12} rx="4" fill={skin} />
            <rect x="68" y="54" width="12" height={e.lid * 12} rx="4" fill={skin} />
          </>
        )}
        {/* 腮红 */}
        <ellipse cx="38" cy="70" rx="5" ry="3" fill={`hsl(${hue} 80% 70%)`} opacity={mood === 'happy' || mood === 'excited' ? 0.8 : 0.4} />
        <ellipse cx="82" cy="70" rx="5" ry="3" fill={`hsl(${hue} 80% 70%)`} opacity={mood === 'happy' || mood === 'excited' ? 0.8 : 0.4} />
        {/* 嘴（talking 时开合动画由 CSS） */}
        {mood === 'sad' || mood === 'worried'
          ? <path d="M54 76 Q60 72 66 76" stroke="#1f2937" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          : <path d={talking ? 'M53 74 Q60 82 67 74 Q60 79 53 74' : 'M54 74 Q60 79 66 74'} fill={mood === 'excited' ? '#1f2937' : 'none'} stroke="#1f2937" strokeWidth="2.2" strokeLinecap="round" />}
        {/* 配件 */}
        {accessory === 'headset' && (
          <g>
            <path d="M26 52 Q26 20 60 20 Q94 20 94 52" stroke={dark} strokeWidth="6" fill="none" />
            <rect x="18" y="50" width="12" height="20" rx="5" fill={dark} />
            <rect x="90" y="50" width="12" height="20" rx="5" fill={dark} />
            <rect x="20" y="56" width="8" height="8" rx="3" fill={main} />
            <rect x="92" y="56" width="8" height="8" rx="3" fill={main} />
          </g>
        )}
        {accessory === 'glasses' && (
          <g stroke={dark} strokeWidth="2.5" fill="rgba(56,189,248,0.12)">
            <rect x="36" y="52" width="20" height="15" rx="5" />
            <rect x="64" y="52" width="20" height="15" rx="5" />
            <path d="M56 59 L64 59" />
          </g>
        )}
      </svg>
      {name && <div className="mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: soft, color: dark }}>{name}</div>}
    </div>
  );
}
