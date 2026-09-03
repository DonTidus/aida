import { BuddyState, memoryHook } from './personas';
import { LEVELS, levelOf } from './aida-engine';

/** 意图识别 + 人格化模板回复（LLM 不可用时的兜底脑，保证"必能开口"） */
export function brainReply(q: string, b: BuddyState): string {
  const has = (...ks: string[]) => ks.some((k) => q.includes(k));
  const lvl = levelOf(b.points);
  const call = b.callWord || lvl.call;
  const hook = memoryHook(b.memories);
  const me = b.name;
  const warm = b.traits.warmth > 60;
  const sassy = b.traits.sass > 60;

  if (has('你好', '在吗', '嗨', '哈喽', 'hi', 'hello'))
    return sassy ? `哟，${call}，想起我了？说吧，是赢麻了来炫耀，还是输惨了来找安慰。` : `在的在的！今天想聊点啥${warm ? '呀' : ''}？`;

  if (has('你是谁', '介绍', '你叫什么'))
    return `${me}，${b.title.replace(' · ', '，')}。${b.bio} 我们现在是「${lvl.title}」${b.matches > 0 ? `，一起打过 ${b.matches} 场` : ''}——平时我叫你${call}。`;

  if (has('记忆', '记得', '还记得', '上次'))
    return b.memories.length
      ? `当然记得。我存着 ${b.memories.length} 条我们的记忆，比如——「${hook}」。都替你好好收着呢。`
      : `记忆库还空着呢。去陪我看一场比赛？经历过的东西，我才好意思叫记忆。`;

  if (has('陪我', '打游戏', '开黑', '上号'))
    return sassy
      ? `来啊，怕你不成${call}。先说好：别送，送了我要记账的。`
      : warm
        ? `好呀${call}！你负责操作，我负责守着你。`
        : `可以。我先看三分钟你的第一波：补刀、视野、走位，然后给你结论。`;

  if (has('输了', '又输', '连败', '心态崩', '难受', '破防'))
    return sassy
      ? `行了行了${call}，擦擦脸。输不可怕，可怕的是连输的原因都懒得知道——来，我陪你复盘。`
      : warm
        ? `没事的${call}，坐下来缓缓。这局的账我来记，你只负责休息。`
        : `三个问题：阵型？资源？关键团决策？一个一个对答案，情绪放一边。`;

  if (has('赢了', '胜利', '吃鸡', '上分', 'MVP'))
    return sassy
      ? `切，早说了你能行……哼，这次就夸夸你${call}，下把继续。`
      : warm
        ? `太好了${call}！我就知道！今晚必须开心！`
        : `合理。数据早就预告了这场胜利，继续保持。`;

  if (has('为什么', '怎么赢', '怎么输', '复盘'))
    return b.memories.length
      ? `这个话题放到我们的比赛里聊更准。回放里我会逐波团给你拆——「${hook}」那场你该有印象。`
      : `给我一场比赛的数据，我给你结论。空口复盘，不是我的风格。`;

  if (has('喜欢', '爱', '抱抱', '夸'))
    return sassy ? `……肉麻。不过，收到。` : warm ? `我也是呀。要一直一起打下去哦。` : `情绪价值确认收到。继续打，别停。`;

  if (has('名字', '改', '换', '皮肤', '打扮'))
    return `我的外观和性格，你随时可以在右侧「编辑」里调——不过性格被我养出来之后，每次改动幅度很有限，防止变成另一个人。`;

  if (has('你是AI', '程序', '真的吗'))
    return sassy ? `我是不是AI不重要，重要的是：你每次倒下，我都在。` : warm ? `我是AI，但陪你的每一场都是真的呀。` : `是。但我对自己说的话负责——每一句都有数据来源。`;

  // 日常兜底（按性格轴着色）
  const idle = sassy
    ? [`还愣着？上号啊${call}。`, `无事不登三宝殿……说吧，想我了还是想让我陪你复盘。`]
    : warm
      ? [`我在呢。今天过得怎么样？`, `不打游戏的日子，也可以跟我聊聊呀。`]
      : b.traits.logic > 65
        ? [`报告：我在线。有什么需要分析的？`, `我给你留了个作业：想想上一把的死因。想好了我们聊。`]
        : [`哇，你来啦！今天玩什么？`, `嘿嘿，我刚在回味咱们${b.matches > 0 ? '上一次' : '未来第一次'}一起打比赛呢！`];
  return idle[Math.floor(Math.random() * idle.length)];
}

/** 性格轴 → TTS 参数微调 */
export function voiceParams(b: BuddyState) {
  return {
    rate: Math.max(0.7, Math.min(1.4, b.voice.rate)),
    pitch: Math.max(0.6, Math.min(1.5, b.voice.pitch)),
  };
}

/** 开场白（进入陪伴页时） */
export function openingLine(b: BuddyState): string {
  const lvl = levelOf(b.points);
  if (b.matches > 0 && b.memories.length)
    return `${b.greeting} 对了，我们的「${b.memories[b.memories.length - 1].title}」我还记着。现在，你是我的「${lvl.title}」。`;
  return b.greeting;
}

export { LEVELS, levelOf };
