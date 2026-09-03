/**
 * 引擎无头仿真（双向视角）：
 *  1) ON：战斗进行中零插话（打扰=0），事件排队到团战结算后冲刷
 *  2) OFF：所有事件立即插话，战斗中插话计入打扰（对照组成立）
 *  3) 视角相对性：天辉（Ame）应有 flip（翻盘）；夜魇（Sneyking）应有 caught/behind 且无 flip
 *  4) 记忆卡团队相对性：Sneyking 的至暗应为"我方经济"负值
 */
import { MATCH } from '../lib/dataset';
import {
  buildStream, shouldSpeak, composeLine, levelOf, buildMemories, myAdvArr,
} from '../lib/aida-engine';

function simulate(name: string, timingOn: boolean) {
  const pers = MATCH.players.find((p) => p.name === name)!;
  const stream = buildStream(pers);
  let t = 0, emitted = 0, interference = 0, queuedFlushed = 0, violating = 0;
  const step = 1;
  let ei = 0;
  const queue: number[] = [];
  const busyAt = (tt: number) => {
    const tf = MATCH.events.teamfights.find((f) => tt >= f.start && tt < f.end);
    return tf ? { start: tf.start, end: tf.end } : null;
  };
  while (t <= MATCH.meta.duration_sec + 1) {
    const busy = busyAt(t);
    while (ei < stream.length && stream[ei].t <= t) {
      const ev = stream[ei++];
      const act = shouldSpeak(ev, t, busy, timingOn);
      if (act === 'now') {
        emitted++;
        const inFight = !!busy && t >= busy.start && t < busy.end;
        if (inFight && timingOn && ev.kind !== 'death' && ev.kind !== 'end' && ev.kind !== 'boot') violating++;
        if (inFight && !timingOn && ev.kind !== 'death' && ev.kind !== 'end' && ev.kind !== 'boot') interference++;
      } else if (act === 'queue') queue.push(ev.tier);
    }
    const justEnded = MATCH.events.teamfights.find((f) => Math.abs(f.end - t) < step);
    if (justEnded && queue.length) {
      const n = Math.min(2, queue.length);
      queue.splice(0, queue.length);
      emitted += n;
      queuedFlushed += n;
    }
    t += step;
  }
  return { pers, stream, emitted, interference, queuedFlushed, violating };
}

let pass = true;
const check = (label: string, ok: boolean) => {
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'} ${label}`);
  if (!ok) pass = false;
};

// 1) 时机引擎（天辉视角 Ame）
const on = simulate('Ame', true);
const off = simulate('Ame', false);
check(`Ame ON：战斗中插话=${on.violating}（必须0），冲刷=${on.queuedFlushed}（>0 排队生效）`, on.violating === 0 && on.queuedFlushed > 0);
check(`Ame OFF：打扰=${off.interference}（>0 对照组成立）`, off.interference > 0);

// 2) 视角相对性
const ame = simulate('Ame', true).stream;
const sney = simulate('Sneyking', true).stream;
check('Ame(天辉/胜方) 有 flip 翻盘事件', ame.some((e) => e.kind === 'flip'));
check('Sneyking(夜魇/败方) 无 flip', !sney.some((e) => e.kind === 'flip'));
check('Sneyking 有 behind（我方经济最深处）', sney.some((e) => e.kind === 'behind'));
const sneyBehind = sney.find((e) => e.kind === 'behind')!;
console.log('   Sneyking behind:', sneyBehind.feed, '| 台词:', composeLine(sneyBehind, {
  pers: MATCH.players.find((p) => p.name === 'Sneyking')!, level: levelOf(50), deathsSoFar: 9,
  killsSoFar: 1, adv: sneyBehind.data!.adv as number, streak: 0, msgCount: 0,
}).slice(0, 50) + '…');
check('behind 台词为负值（我方视角）', (sneyBehind.data!.adv as number) < 0);

// 3) 复仇链路（找一个有死亡且杀过回头的视角）
const anyRev = MATCH.players.map((p) => {
  const st = buildStream(p);
  let killer: { hero: string; zh: string } | undefined;
  let revenged = false;
  for (const e of st) {
    const d = (e.data || {}) as any;
    if (e.kind === 'death' && d.byName) killer = { hero: d.byName, zh: d.by };
    if (e.kind === 'kill' && killer && d.victimHero === killer.hero) { revenged = true; break; }
  }
  return revenged;
});
console.log(`   存在复仇链路的视角数: ${anyRev.filter(Boolean).length}/10（信息项，非断言）`);

// 4) 记忆卡团队相对性
const sneyMems = buildMemories(MATCH.players.find((p) => p.name === 'Sneyking')!);
const sneyDark = sneyMems.find((m) => m.type === 'dark' && m.title.includes('经济'));
console.log('   Sneyking 至暗卡:', sneyDark?.title);
check('Sneyking 至暗卡为我方负值', !!sneyDark && sneyDark.title.includes('-'));
const ameMems = buildMemories(MATCH.players.find((p) => p.name === 'Ame')!);
check('Ame 记忆卡 ≥ 7 条', ameMems.length >= 7);

// 5) 台词完整性：所有事件类型都能生成非空台词
const kinds = [...new Set(ame.map((e) => e.kind))];
const pers = MATCH.players[0];
let emptyLines = 0;
for (const e of ame) {
  const line = composeLine(e, {
    pers, level: levelOf(200), deathsSoFar: pers.d, killsSoFar: pers.k,
    lastKiller: undefined, adv: 0, streak: 1, msgCount: 3,
  });
  if (!line.trim()) { emptyLines++; console.log('   空台词:', e.kind, e.t); }
}
check(`全部 ${kinds.length} 类事件台词非空（空=${emptyLines}）`, emptyLines === 0);

console.log(pass ? '\n=== 全部通过 ===' : '\n=== 存在失败项 ===');
process.exit(pass ? 0 : 1);
