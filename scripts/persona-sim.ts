/** 伙伴系统仿真：性格演化数学 / 人格脑覆盖 / 预设完整性 */
import { PRESETS, evolveFromExperience, applyDelta, traitsToSpeech, createBuddy } from '../lib/personas';
import { brainReply } from '../lib/chat-brain';
import { LEVELS } from '../lib/aida-engine';

let pass = true;
const check = (label: string, ok: boolean) => {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) pass = false;
};

// 1) 预设完整性
check(`预设伙伴 ${PRESETS.length} 个，字段齐全`, PRESETS.every((p) => p.name && p.bio && p.speechStyle && p.greeting && p.callWord && p.signature && p.forWhom));
const axes = ['energy', 'sass', 'warmth', 'logic', 'intimacy'] as const;
check('预设性格轴全部在 0-100', PRESETS.every((p) => axes.every((k) => p.traits[k] >= 0 && p.traits[k] <= 100)));
check('预设性格差异明显（毒舌最高-最低 ≥ 50）',
  Math.max(...PRESETS.map((p) => p.traits.sass)) - Math.min(...PRESETS.map((p) => p.traits.sass)) >= 50);

// 2) 演化数学：翻盘胜局
const aida = PRESETS.find((p) => p.name === '艾搭')!;
const win = { win: true, comeback: true, myDeaths: 0, kills: 11 };
const r1 = evolveFromExperience(win);
const t1 = applyDelta(aida.traits, r1.delta);
check(`翻盘胜局演化：${Object.entries(r1.delta).map(([k, v]) => `${k}${(v as number) > 0 ? '+' : ''}${v}`).join(' ')}（energy 应 +6）`, (r1.delta.energy ?? 0) === 6);
check('演化不越界（0-100 截断）', axes.every((k) => t1[k] >= 0 && t1[k] <= 100));

// 连败惨案：多次应用不越界
let t = aida.traits;
for (let i = 0; i < 20; i++) t = applyDelta(t, evolveFromExperience({ win: false, comeback: false, myDeaths: 9, kills: 0 }).delta);
check('连败 20 场后性格轴不越界', axes.every((k) => t[k] >= 0 && t[k] <= 100));
check('连败让人变温柔', t.warmth > aida.traits.warmth);

// 3) 人格脑：每个预设对关键意图都有非空回复
const intents = ['你好', '你是谁', '还记得吗', '陪我打游戏', '又输了', '赢了！', '你喜欢我吗'];
let empty = 0;
for (const p of PRESETS) {
  const b = { ...p, createdAt: 0, points: 55, matches: 1, memories: [], evolution: [], mood: 'calm' as const };
  for (const q of intents) {
    if (!brainReply(q, b).trim()) { empty++; console.log('   空回复:', p.name, q); }
  }
}
check(`8 预设 × 7 意图 = ${PRESETS.length * intents.length} 条回复非空（空=${empty}）`, empty === 0);

// 4) 人格差异：同一句"又输了"，治愈型 vs 毒舌型风格不同
const healer = brainReply('又输了', { ...PRESETS.find((p) => p.name === '小暖')!, points: 0, matches: 0, memories: [], evolution: [], mood: 'calm', createdAt: 0 } as any);
const banter = brainReply('又输了', { ...PRESETS.find((p) => p.name === '艾搭')!, points: 0, matches: 0, memories: [], evolution: [], mood: 'calm', createdAt: 0 } as any);
check('治愈型与毒舌型的安慰风格不同', healer !== banter && healer.length > 5 && banter.length > 5);

// 5) 自定义创建：性格滑杆 → 语气描述 → 语音参数
const custom = createBuddy('阿澈', { energy: 20, sass: 10, warmth: 90, logic: 30, intimacy: 20 }, { hue: 265, hair: 1, accessory: 'glasses' });
check('自定义伙伴语气描述反映性格轴', traitsToSpeech(custom.traits).includes('惜字如金'));
check('自定义语音参数随性格变化（安静 → 慢语速）', custom.voice.rate < 1.0);

// 6) 关系等级可从同行值推导
check('关系等级阈值单调递增', LEVELS.every((l, i, a) => i === 0 || l.min > a[i - 1].min));

console.log(pass ? '\n=== 伙伴系统仿真全部通过 ===' : '\n=== 存在失败项 ===');
process.exit(pass ? 0 : 1);
