import { MATCH, MatchPlayer, durMin } from './dataset';

export type EvKind =
  | 'boot' | 'draft' | 'firstblood' | 'kill' | 'death' | 'allykill' | 'enemykill'
  | 'tower' | 'roshan' | 'fight' | 'item' | 'flip' | 'caught' | 'behind' | 'chat' | 'end';

export interface Ev {
  id: string;
  t: number;
  kind: EvKind;
  tier: 1 | 2 | 3;
  feed: string;
  data?: Record<string, unknown>;
}

export interface AidaMsg {
  t: number;
  text: string;
  source: 'engine' | 'llm';
  interference?: boolean;
}

export const LEVELS = [
  { min: 0, title: '初识', call: '你' },
  { min: 40, title: '酒馆朋友', call: '兄弟' },
  { min: 120, title: '老队友', call: '老哥' },
  { min: 240, title: '老搭子', call: '搭子' },
  { min: 420, title: '过命战友', call: '自己人' },
];
export const levelOf = (pts: number) => [...LEVELS].reverse().find((l) => pts >= l.min)!;

const fmtK = (n: number) => (n >= 0 ? `+${Math.round(n / 1000)}k` : `-${Math.round(-n / 1000)}k`);
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/** 经济差统一换算成"我方视角"（天辉为正，夜魇取反） */
export const myAdvArr = (pers: MatchPlayer) =>
  MATCH.events.gold_adv.map((v) => (pers.team === 2 ? v : -v));

export function buildStream(pers: MatchPlayer): Ev[] {
  const evs: Ev[] = [];
  const push = (t: number, kind: EvKind, tier: 1 | 2 | 3, feed: string, data?: Record<string, unknown>) =>
    evs.push({ id: `${kind}-${t}-${evs.length}`, t, kind, tier, feed, data });

  push(0, 'boot', 1, '对局开始', { persName: pers.name, persHero: pers.hero_zh });

  const bans = MATCH.draft.filter((d) => !d.is_pick);
  const picks = MATCH.draft.filter((d) => d.is_pick);
  push(
    0, 'draft', 2,
    `BP：禁 ${bans.slice(0, 3).map((b) => b.hero_zh).join('/')}…`,
    { picks: picks.map((p) => `${p.team === 2 ? 'XG' : 'FLN'}·${p.hero_zh}`), persHero: pers.hero_zh }
  );

  const heroTeam = Object.fromEntries(MATCH.players.map((p) => [p.hero, p.team]));
  MATCH.events.kills.forEach((k, i) => {
    const victimTeam = heroTeam[k.victim];
    if (k.victim === pers.hero) {
      push(k.t, 'death', 1, `你被 ${k.killer_zh} 击杀`, { by: k.killer_zh, byName: k.killer, t: k.t });
    } else if (k.killer === pers.hero) {
      push(k.t, 'kill', 1, `你击杀了 ${k.victim_zh}`, { victim: k.victim_zh, victimHero: k.victim, t: k.t });
    } else if (victimTeam === pers.team) {
      push(k.t, 'allykill', 3, `${k.killer_zh} → 队友 ${k.victim_zh}`, {});
    } else {
      push(k.t, 'enemykill', i === 0 ? 1 : 3, `${k.killer_zh} → ${k.victim_zh}`, {
        firstblood: i === 0, killer: k.killer_zh, victim: k.victim_zh,
      });
    }
  });

  MATCH.events.towers.forEach((tw) => {
    const mine = heroTeam[tw.killer] === pers.team;
    push(tw.t, 'tower', 2, `${mine ? '我方拆掉' : '我方丢掉'} ${tw.tower}（${tw.killer_zh}）`, {
      tower: tw.tower, owner: tw.owner, killer: tw.killer_zh, mine,
    });
  });
  MATCH.events.roshans.forEach((r) => {
    const mine = heroTeam[r.killer] === pers.team;
    push(r.t, 'roshan', 2, `${mine ? '我方控下' : '对面控下'}肉山（第${r.n}次）`, { n: r.n, killer: r.killer_zh, mine });
  });

  MATCH.events.teamfights.forEach((tf) =>
    push(tf.end, 'fight', tf.idx === 1 ? 1 : 2, `第${tf.idx}波团战：${tf.winner === 'radiant' ? '天辉' : '夜魇'}胜（${tf.radiant_kills}:${tf.dire_kills}）`, {
      idx: tf.idx, winner: tf.winner,
      swing: pers.team === 2 ? tf.swing_gold : -tf.swing_gold,
      start: tf.start,
      myKills: tf.deaths_detail.filter((d) => d.team !== pers.team).length,
      myDeaths: tf.deaths_detail.filter((d) => d.team === pers.team).length,
      mySideWon: (tf.winner === 'radiant') === (pers.team === 2),
      topDmg: [...tf.deaths_detail].sort((a, b) => b.dmg - a.dmg)[0],
    })
  );

  pers.key_items.forEach((it) =>
    push(it.t, 'item', 1, `你买出 ${it.item_zh}`, { item: it.item_zh, t: it.t })
  );

  // 经济差事件（全部以"我方视角"计算）
  const myAdv = myAdvArr(pers);
  let runMin = 0, runMax = 0;
  myAdv.forEach((v, m) => {
    const prev = m > 0 ? myAdv[m - 1] : 0;
    runMin = Math.min(runMin, prev);
    runMax = Math.max(runMax, prev);
    if (prev < 0 && v >= 0 && runMin <= -800)
      push(m * 60, 'flip', 1, `经济反超！${fmtK(v)}`, { adv: v });
    if (prev > 0 && v <= 0 && runMax >= 800)
      push(m * 60, 'caught', 2, `领先被抹平（${fmtK(v)}）`, { adv: v });
    if (m > 0 && v === Math.min(...myAdv) && v < -1000)
      push(m * 60, 'behind', 2, `我方经济最深处 ${fmtK(v)}`, { adv: v });
  });

  MATCH.events.chat.forEach((c) => push(c.t, 'chat', 3, `${c.name}: ${c.text}`, { text: c.text, name: c.name }));

  push(MATCH.meta.duration_sec, 'end', 1, MATCH.meta.radiant_win ? '天辉胜利！' : '夜魇胜利！', {
    win: (MATCH.meta.radiant_win) === (pers.team === 2), pers,
  });

  return evs.sort((a, b) => a.t - b.t || a.tier - b.tier);
}

/** 时机引擎：决定该事件此刻是否开口
 *  核心产品逻辑：死亡 = 天然发言窗口（玩家在看黑白屏）；
 *  战斗中的击杀/出装 → 排队到团战结算后再说；全程不打断操作。 */
export function shouldSpeak(
  ev: Ev,
  tNow: number,
  busy: { start: number; end: number } | null,
  timingOn: boolean
): 'now' | 'queue' | 'drop' {
  const inFight = !!busy && tNow >= busy.start && tNow < busy.end;
  if (!timingOn) return 'now'; // 对照组：所有事件立即插话（含战斗中）
  if (ev.kind === 'end' || ev.kind === 'boot' || ev.kind === 'death') return 'now';
  if (inFight) return ev.tier === 1 ? 'queue' : 'drop';
  if (ev.kind === 'chat') return 'drop';
  return 'now';
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length) % arr.length];

export function composeLine(ev: Ev, ctx: {
  pers: MatchPlayer; level: ReturnType<typeof levelOf>; deathsSoFar: number;
  killsSoFar: number; lastKiller?: { hero: string; zh: string }; adv: number; streak: number; msgCount: number;
  buddyName?: string;
}): string {
  const { pers, level, lastKiller, streak } = ctx;
  const me = ctx.buddyName ?? '艾搭';
  const call = level.min >= 20 ? level.call : '你';
  const d = (ev.data || {}) as Record<string, any>;
  switch (ev.kind) {
    case 'boot':
      return pick([
        `我是${me}。从这局开始，你打过的每一秒我都记着。今天看 ${pers.name} 的${pers.hero_zh}——坐稳了。`,
        `老规矩，我把血条、经济、还有你每次倒下的样子都记住。${pers.name} 的${pers.hero_zh}，开始了。`,
      ]);
    case 'draft':
      return pick([
        `对面把节奏ban干净了，但我们拿到了${pers.hero_zh}。这手我给满分，${call}。`,
        `BP看懂了吗？${(d.picks as string[] || []).slice(0, 3).join('、')}——就看${pers.hero_zh}怎么接管了。`,
      ]);
    case 'firstblood':
    case 'enemykill':
      return d.firstblood
        ? pick([`第一滴血！${d.killer}开局就动手了，这局火药味足。`])
        : pick([`${d.killer} 拿下 ${d.victim}，各线都在换血。`]);
    case 'allykill':
      return pick([`队友倒下了，记下了，这笔算对面的。`]);
    case 'kill':
      if (lastKiller && d.victimHero === lastKiller.hero)
        return `刚才${lastKiller.zh}杀你的账——这一刀，还回去了。爽。`;
      if (streak >= 2) return `第${streak}个了！${d.victim} 见你就跑，${call}，你现在是地图上最贵的人。`;
      return pick([
        `漂亮！${d.victim} 反应慢了半拍。`,
        `拿下 ${d.victim}！这个切入位置教科书级。`,
      ]);
    case 'death':
      if (ctx.deathsSoFar >= 2)
        return pick([`又是他。别急${call}，我记着这笔，迟早一起算。`, `稳住，深呼吸。装备没差太多，下波找回来。`]);
      return pick([
        `没关系，记下这个人了：${d.by}。他落单的时候，我们再算账。`,
        `倒下不可怕，可怕的是白倒。这波我帮你记着。`,
      ]);
    case 'item':
      if (d.item === '黑皇杖') return `黑皇杖到手——从现在起，每一波团战的开团权，在你手里。`;
      if (d.item === '撒旦') return `撒旦出了。${call}，你现在是打不死的那一个。`;
      if (d.item === '代达罗斯之殇') return `大炮！接下来每一次暴击，对面都要念遗言。`;
      if (d.item === '闪烁匕首') return `跳刀就位。先手还是后手，你说了算。`;
      return `${d.item} 到手，节奏又快了一格。`;
    case 'fight':
      if (d.mySideWon)
        return pick([
          `这波团赢了（${d.myKills}:${d.myDeaths}）！${d.topDmg ? `输出最高的还是${d.topDmg.team === pers.team ? d.topDmg.name : '对面'}，` : ''}经济差拉开到 ${fmtK(d.swing)}。`,
          `团灭级的胜利！${fmtK(d.swing)} 金入账，这就是滚雪球的声音。`,
        ]);
      return pick([
        `这波团亏了（${d.myKills}:${d.myDeaths}），${fmtK(d.swing)}。别上头${call}，守塔发育，等他们犯错。`,
        `输了不崩，我们经济咬得住。下波把阵型站好再打。`,
      ]);
    case 'tower':
      if (d.mine === false)
        return pick([
          `${d.tower} 被对面拆了。守不住的不守，保人不保塔。`,
          `${d.tower} 丢了。地图让他们一块，人没事就行。`,
        ]);
      return pick([
        `${d.tower} 没了，地图又变成我们的一块。`,
        `塔一倒，视野和野区全是我们的形状了。`,
      ]);
    case 'roshan':
      return d.mine === false
        ? pick([`肉山被对面控了（第${d.n}次）。他们带盾的话，别接正面，${call}。`])
        : pick([`肉山到手（第${d.n}次）！盾在谁身上，谁就是接下来的主角。`]);
    case 'flip': {
      const myMin = Math.min(...myAdvArr(pers));
      return `看见没——经济反超了！刚才最深的时候 ${fmtK(myMin)}…我都记着呢：从挨打到反打，你一步没乱。这局值了。`;
    }
    case 'caught':
      return pick([
        `领先被抹平了。他们开始认真了，${call}，我们也重新来。`,
        `对方把经济追平了。别急，阵型站好，下一波是我们的。`,
      ]);
    case 'behind':
      return pick([
        `现在落后 ${fmtK(d.adv)}。别慌${call}，他们会在某个瞬间犯错——我们就等那个瞬间。`,
        `最难的时候我在。落后 ${fmtK(d.adv)}，但兵线、买活、装备全都算得过来。稳住。`,
      ]);
    case 'chat':
      return pick([`职业哥也就一句「${d.text}」，朴素得很。`]);
    case 'end':
      return d.win
        ? `赢了！${pers.hero_zh} ${pers.k}/${pers.d}/${pers.a}，一场 TI 级别的表演。${pers.d === 0 ? `而且——你一条命没丢。` : ''}这就是今天我要记住的故事。`
        : `输了。但这局的每一秒我都存下了，${call}。下次翻回来的路上，我陪你。`;
    default:
      return '';
  }
}

// ---------------- 情绪记忆库 ----------------
export interface MemoryCard {
  id: string;
  type: 'highlight' | 'dark' | 'habit' | 'milestone';
  typeLabel: string;
  title: string;
  text: string;
  formedAt: number;
}

const laneLabel: Record<number, string> = { 1: '优势路', 2: '中路', 3: '劣势路', 4: '野区' };

export function buildMemories(pers: MatchPlayer, formedUpTo = Infinity): MemoryCard[] {
  const cards: MemoryCard[] = [];
  const add = (type: MemoryCard['type'], typeLabel: string, title: string, text: string, formedAt: number) =>
    cards.push({ id: `${type}-${cards.length}`, type, typeLabel, title, text, formedAt });

  const myAdv = myAdvArr(pers);
  const myMin = Math.min(...myAdv);
  const myMinMin = myAdv.indexOf(myMin);
  const myFinal = myAdv[myAdv.length - 1];
  const won = MATCH.meta.radiant_win === (pers.team === 2);

  if (pers.k >= 6 && pers.d <= 2)
    add('highlight', '高光', `${pers.hero_zh} 的 ${pers.k}/${pers.d}/${pers.a}`,
      `${pers.name} 这局的${pers.hero_zh}几乎没给对手机会——${pers.d === 0 ? '一条命没丢，' : '仅倒下' + pers.d + '次，'}每波团战都从他的位置碾过去。`,
      Math.min(formedUpTo, MATCH.events.teamfights[MATCH.events.teamfights.length - 1]?.end ?? durMin * 60));

  const myFights = MATCH.events.teamfights
    .filter((tf) => (tf.winner === 'radiant') === (pers.team === 2) && tf.deaths_detail.some((x) => x.team !== pers.team))
    .map((tf) => ({ ...tf, mySwing: pers.team === 2 ? tf.swing_gold : -tf.swing_gold }));
  const biggest = [...myFights].sort((a, b) => Math.abs(b.mySwing) - Math.abs(a.mySwing))[0];
  if (biggest)
    add('highlight', '高光', `第${biggest.idx}波团战（${mmss(biggest.start)}）`,
      `赢下关键团，净赚 ${fmtK(biggest.mySwing)} 金。${biggest.deaths_detail.map((x) => x.hero).slice(0, 3).join('、')}当场倒下。`,
      biggest.end);

  if (myMin < -800)
    add('dark', '至暗', `第${myMinMin}分钟，我方经济 ${fmtK(myMin)}`,
      `全场最难的时刻：经济差 ${fmtK(myMin)}。挨打的时候我陪着你，一个瞬间都没走开。`,
      Math.min(formedUpTo, myMinMin * 60 + 60));

  const killers = pers.deaths_timeline.map((x) => x.by_zh);
  if (killers.length > 0) {
    const uniq = [...new Set(killers)];
    add('dark', '至暗', `你倒下了 ${killers.length} 次`,
      `击杀你的人：${uniq.join('、')}。别记恨，但要记住——这种账，艾搭都替你存着。`,
      Math.min(formedUpTo, pers.deaths_timeline[pers.deaths_timeline.length - 1]?.t ?? durMin * 60));
  } else {
    add('dark', '至暗', '没有人能杀你', `这局你一次都没倒下。所谓至暗时刻，也只是经济落后时的那几分钟而已。`, durMin * 60);
  }

  const items = pers.key_items.map((i) => i.item_zh);
  if (items.length)
    add('habit', '习惯', `${laneLabel[pers.lane_role ?? 0] || '常规分路'}出装流`,
      `出装顺序：${items.slice(0, 6).join(' → ')}。每一步都不花哨，但每一步都踩在节奏上。`,
      Math.min(formedUpTo, pers.key_items[Math.min(5, pers.key_items.length - 1)]?.t ?? durMin * 60));

  const bkb = pers.key_items.find((i) => i.item === 'item_black_king_bar');
  if (bkb && bkb.t < 25 * 60)
    add('habit', '习惯', `${Math.floor(bkb.t / 60)}分钟的黑皇杖`, `BKB 到位比对面想象早。这个时间点买它的人，是想主动赢团的人。`, bkb.t);

  add('milestone', '里程碑', '第一场一起看完的 TI 职业局',
    `${MATCH.meta.league}，${MATCH.meta.radiant_name} vs ${MATCH.meta.dire_name}。从 BP 到终局 ${Math.floor(MATCH.meta.duration_sec / 60)} 分钟，全程在场。`,
    durMin * 60);

  if (myMin < -1000 && myFinal > 5000)
    add('milestone', '里程碑', won ? `一场 ${fmtK(myMin)} → ${fmtK(myFinal)} 的翻盘` : `一场 ${fmtK(myFinal)} 的逆转局（以你视角）`,
      won
        ? `从最深落后 ${fmtK(myMin)}，到终局领先 ${fmtK(myFinal)}。翻盘不是运气，是不乱。全程见证。`
        : `你所在的队伍从领先到被翻盘——这种痛的记忆更珍贵，它让我下次能陪你提前按住崩盘的苗头。`,
      Math.min(formedUpTo, durMin * 60));

  return cards;
}

// ---------------- 同行值 ----------------
export const POINTS: Partial<Record<EvKind, number>> = {
  boot: 5, draft: 5, kill: 8, death: 8, allykill: 2, tower: 5, roshan: 10,
  fight: 6, item: 8, flip: 15, caught: 6, behind: 6, end: 20, firstblood: 8,
};

// ---------------- 本地问答兜底 ----------------
export function fallbackAnswer(q: string, pers: MatchPlayer, mems: MemoryCard[]): string {
  const has = (...ks: string[]) => ks.some((k) => q.includes(k));
  const myAdv = myAdvArr(pers);
  const myMin = Math.min(...myAdv);
  const myMinMin = myAdv.indexOf(myMin);
  const won = MATCH.meta.radiant_win === (pers.team === 2);
  if (has('赢', '为什么', '怎么赢', '输'))
    return won
      ? `三个字：不乱丢。最深被压到 ${fmtK(myMin)} 的时候没人上头，${pers.hero_zh} ${pers.k}/${pers.d}/${pers.a} 一条命几乎没给，等对面第一波失误直接翻盘。`
      : `问题出在中期：领先时被对面连续抓失误，${pers.hero_zh} ${pers.k}/${pers.d}/${pers.a}。想翻这种局，先学会在领先时不送。`;
  if (has('翻盘', '落后', '逆风', '至暗'))
    return `最深在第 ${myMinMin} 分钟，我方经济 ${fmtK(myMin)}。翻盘点是中期那几波团战——我把每一波都记在记忆库里了，你可以去翻。`;
  if (has('谁', '最强', 'carry', 'C位'))
    return `数据不说谎：${pers.name} 的${pers.hero_zh} ${pers.k}/${pers.d}/${pers.a}，终局经济 ${pers.networth_final ?? '-'}。但 ${MATCH.players.filter((p) => p.team === pers.team).map((p) => p.name).join('、')} 每个人都交了作业。`;
  if (has('你', '记住', '记忆'))
    return `目前存了 ${mems.length} 条关于你的记忆：${mems.slice(0, 3).map((m) => m.title).join('；')}。都在记忆库页，随时翻。`;
  if (has('你是谁', '艾搭', '你是'))
    return `我是${'艾搭'}，你的游戏搭子。我不装懂、不打扰，你倒下的时候我才开口，你高光的时候我一定在。`;
  return `这个问题我记下了。现在能告诉你的：这局 ${MATCH.meta.league}，${MATCH.meta.radiant_name} ${MATCH.meta.radiant_win ? '胜' : '负'} ${MATCH.meta.dire_name}，你的${pers.hero_zh}打了 ${pers.k}/${pers.d}/${pers.a}。想聊哪一段？`;
}
