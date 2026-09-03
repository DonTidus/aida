import { NextResponse } from 'next/server';
import { brainReply } from '@/lib/chat-brain';
import { BuddyState } from '@/lib/personas';
import { fallbackAnswer, levelOf, MemoryCard } from '@/lib/aida-engine';
import { MATCH, MatchPlayer } from '@/lib/dataset';

export const runtime = 'nodejs';

const ENV_BASE = process.env.AIDA_LLM_BASE_URL;
const ENV_KEY = process.env.AIDA_LLM_API_KEY;
const ENV_MODEL = process.env.AIDA_LLM_MODEL || 'deepseek-chat';

function personaPrompt(b: BuddyState): string {
  const t = b.traits;
  const lvl = levelOf(b.points);
  return [
    `你是「${b.name}」，玩家专属的游戏伙伴。人设：${b.title}。${b.bio}`,
    `说话风格：${b.speechStyle}。`,
    `当前性格轴（0-100）：活跃${t.energy}、毒舌${t.sass}、温柔${t.warmth}、理性${t.logic}、亲密${t.intimacy}。据此校准语气与情绪浓度。`,
    `关系：你们现在是「${lvl.title}」，一起经历过 ${b.matches} 场比赛，平时称呼玩家「${b.callWord}」。`,
    `你对玩家的记忆（必须真实引用，禁止编造）：${b.memories.slice(-6).map((m) => `[${m.typeLabel}] ${m.title}`).join('；') || '暂无，你们的第一次共同经历还没发生。'}`,
    '',
    '硬规则：回复不超过60字；保持角色不出戏；不编造未发生的比赛细节；玩家情绪低落时优先安抚而非讲道理。',
  ].join('\n');
}

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

/** 陪看模式：人格 + 观看进度上下文 */
function watchPrompt(b: BuddyState, watch: { type: string; min: number }): string {
  return [
    personaPrompt(b),
    '',
    `——当前场景：你们正在一起看${watch.type}，进行到第 ${watch.min} 分钟——`,
    '吐槽和回复要贴合当前进度；没看过的后续剧情不许剧透、不许编造；可以吐槽节奏、画面、演员、名场面套路；保持你的说话风格。',
  ].join('\n');
}

interface LLMCfg { base: string; key: string; model: string }

function engineReply(q: string, buddy?: BuddyState, pers?: MatchPlayer, mems?: MemoryCard[]): string {
  if (pers) return fallbackAnswer(q, pers, mems || []);
  if (buddy) return brainReply(q, buddy);
  return '我在。';
}

export async function POST(req: Request) {
  const { q, buddy, pers, mems, watch, llm } = (await req.json()) as {
    q: string; buddy?: BuddyState; pers?: MatchPlayer; mems?: MemoryCard[];
    watch?: { type: string; min: number }; llm?: LLMCfg;
  };
  if (!q) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  // LLM 优先级：页面内配置（用户自己的 Key）> 服务端环境变量
  const cfg: LLMCfg | null = llm?.base && llm?.key && llm?.model
    ? llm
    : ENV_BASE && ENV_KEY
      ? { base: ENV_BASE, key: ENV_KEY, model: ENV_MODEL }
      : null;

  if (!cfg) {
    return NextResponse.json({ text: engineReply(q, buddy, pers, mems), source: 'engine' });
  }
  try {
    const system = pers && buddy
      ? matchPrompt(buddy, pers, mems || [])
      : watch && buddy
        ? watchPrompt(buddy, watch)
        : buddy
          ? personaPrompt(buddy)
          : personaPrompt(buddyFallback());
    const r = await fetch(`${cfg.base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model,
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
    forWhom: 'all', callWord: '兄弟', signature: '记仇小本本已就位。',
    bio: '嘴硬心软的毒舌损友。', speechStyle: '短句、吐槽、护短', greeting: '我在。',
    traits: { energy: 70, sass: 78, warmth: 45, logic: 55, intimacy: 30 },
    appearance: { hue: 145, hair: 0, accessory: 'headset' },
    voice: { rate: 1.05, pitch: 0.95 },
    createdAt: 0, points: 0, matches: 0, memories: [], evolution: [], mood: 'calm',
  };
}
