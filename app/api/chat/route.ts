import { NextResponse } from 'next/server';
import { brainReply } from '@/lib/chat-brain';
import { BuddyState } from '@/lib/personas';
import { fallbackAnswer, levelOf, MemoryCard } from '@/lib/aida-engine';
import { MATCH, MatchPlayer } from '@/lib/dataset';

export const runtime = 'nodejs';

const BASE = process.env.AIDA_LLM_BASE_URL;
const KEY = process.env.AIDA_LLM_API_KEY;
const MODEL = process.env.AIDA_LLM_MODEL || 'deepseek-chat';

/** 陪伴模式 prompt：纯人格 + 记忆 + 关系 */
function personaPrompt(b: BuddyState): string {
  const t = b.traits;
  const lvl = levelOf(b.points);
  return [
    `你是「${b.name}」，玩家专属的游戏伙伴。人设：${b.title}。${b.bio}`,
    `说话风格：${b.speechStyle}。`,
    `当前性格轴（0-100）：活跃${t.energy}、毒舌${t.sass}、温柔${t.warmth}、理性${t.logic}、亲密${t.intimacy}。据此校准语气与情绪浓度。`,
    `关系：你们现在是「${lvl.title}」，一起经历过 ${b.matches} 场比赛。`,
    `你对玩家的记忆（必须真实引用，禁止编造）：${b.memories.slice(-6).map((m) => `[${m.typeLabel}] ${m.title}`).join('；') || '暂无，你们的第一次共同经历还没发生。'}`,
    '',
    '硬规则：回复不超过60字；保持角色不出戏；不编造未发生的比赛细节；玩家情绪低落时优先安抚而非讲道理。',
  ].join('\n');
}

/** 回放模式 prompt：人格 + 当前对局结构化上下文（防幻觉） */
function matchPrompt(b: BuddyState, pers: MatchPlayer, mems: MemoryCard[]): string {
  return [
    personaPrompt(b),
    '',
    '——正在进行的对话发生在一场比赛回放中，回答比赛相关问题必须基于以下真实数据——',
    `对局：${MATCH.meta.league}，${MATCH.meta.radiant_name} vs ${MATCH.meta.dire_name}，${MATCH.meta.radiant_win ? '天辉胜' : '夜魇胜'}，时长 ${Math.floor(MATCH.meta.duration_sec / 60)} 分钟。`,
    `玩家视角：${pers.name} 的${pers.hero_zh}，战绩 ${pers.k}/${pers.d}/${pers.a}。`,
    `经济差曲线（每分钟，天辉-夜魇）：${MATCH.events.gold_adv.join(',')}。`,
    `本场新增记忆：${mems.map((m) => `[${m.typeLabel}] ${m.title}`).join('；') || '暂无'}`,
  ].join('\n');
}

function engineReply(q: string, buddy?: BuddyState, pers?: MatchPlayer, mems?: MemoryCard[]): string {
  if (pers) return fallbackAnswer(q, pers, mems || []);
  if (buddy) return brainReply(q, buddy);
  return '我在。';
}

export async function POST(req: Request) {
  const { q, buddy, pers, mems } = (await req.json()) as {
    q: string; buddy?: BuddyState; pers?: MatchPlayer; mems?: MemoryCard[];
  };
  if (!q) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  if (!BASE || !KEY) {
    return NextResponse.json({ text: engineReply(q, buddy, pers, mems), source: 'engine' });
  }
  try {
    const hasMatchCtx = !!(pers && buddy);
    const system = hasMatchCtx && buddy && pers
      ? matchPrompt(buddy, pers, mems || [])
      : buddy
        ? personaPrompt(buddy)
        : personaPrompt(buddyFallback());
    const r = await fetch(`${BASE.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: q },
        ],
        temperature: 0.85,
        max_tokens: 140,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`llm ${r.status}`);
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ text: text || engineReply(q, buddy, pers, mems), source: text ? 'llm' : 'engine' });
  } catch {
    return NextResponse.json({ text: engineReply(q, buddy, pers, mems), source: 'engine' });
  }
}

/** 极端情况（无 buddy）的最小兜底人格 */
function buddyFallback(): BuddyState {
  return {
    id: 'fallback', name: '艾搭', title: '损友型 · 老搭子', archetype: 'banter', preset: true,
    bio: '嘴硬心软的毒舌损友。', speechStyle: '短句、吐槽、护短', greeting: '我在。',
    forWhom: 'all', callWord: '兄弟', signature: '记仇小本本已就位。',
    traits: { energy: 70, sass: 78, warmth: 45, logic: 55, intimacy: 30 },
    appearance: { hue: 145, hair: 0, accessory: 'headset' },
    voice: { rate: 1.05, pitch: 0.95 },
    createdAt: 0, points: 0, matches: 0, memories: [], evolution: [], mood: 'calm',
  };
}
