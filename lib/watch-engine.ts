/** 陪看引擎：按内容类型的主动吐槽语料 + 播放事件反应（不剧透、任何视频通用） */
export const SHOW_TYPES = ['剧集', '电影', '比赛', '番剧', '综艺'] as const;
export type ShowType = (typeof SHOW_TYPES)[number];

const POOLS: Record<ShowType, string[]> = {
  剧集: [
    '这配乐一响我就知道要出事了，{call}，你先做好心理准备。',
    '注意没有，这个镜头给了三秒——导演在埋东西，我先记下。',
    '这台词写得太满了，聪明人不这么说话的。',
    '回忆杀来了，接下来三分钟信息密度最低，但你敢快进吗？',
    '这个配角的演员好眼熟……演得比主角还真。',
    '预警：这集结尾八成要留钩子，我们忍住别连更。',
    '这节奏有点拖了啊，{call}，我帮你盯着，有转折叫你。',
  ],
  电影: [
    '这个开场镜头就很贵，光影在叙事了。',
    '注意配乐的变化——情绪要翻了。',
    '反转要来了我预感，但我一个字都不说，{call}你自己品。',
    '这段对话信息量全藏在潜台词里，值得倒回去再听一遍。',
    '这种镜头语言我在游戏过场动画里见过同款，高级。',
    '看完这段记得回来跟我讨论，我憋了一肚子话。',
  ],
  比赛: [
    '这波开团时机绝了，盯住他们的辅助走位。',
    '解说的嗓门比选手还大，哈哈。',
    '经济差在悄悄拉大，{call}，看小地图右边那条线。',
    '这就是职业级细节：换个普通选手这波就送了。',
    '暂停回来了，接下来两分钟定生死。',
    '要是换成你打这波，你会怎么处理？我押稳打法。',
  ],
  番剧: [
    '这作画经费爆炸啊，逐帧都经得起看。',
    'OP你跳了吗？{call}，说真的，这个OP值得看完。',
    '声线一换我就知道角色要黑化了。',
    '原作党表示这段改得居然不崩。',
    '注意这个细节，后面大概率回收。',
    '这集节奏好快，一集顶别人三集。',
  ],
  综艺: [
    '这后期字幕组是懂整活的。',
    '这个剪辑节奏故意在制造节目效果，别当真，{call}。',
    '嘉宾这个反应不是演的，笑死。',
    '前面埋的梗这就回收了，综艺编剧也不容易。',
    '这段素材剪得有点断章取义啊，保留意见。',
    '笑归笑，这个游戏环节设计得其实挺聪明。',
  ],
};

export function quip(type: ShowType, call: string, recent: string[]): string {
  const pool = POOLS[type].filter((q) => !recent.includes(q));
  const pick = (pool.length ? pool : POOLS[type])[Math.floor(Math.random() * (pool.length || POOLS[type].length))];
  return pick.replace('{call}', call);
}

export type WatchEvent = 'start' | 'pause' | 'resume' | 'seek_back' | 'seek_fwd' | 'end';

const EVENTS: Record<WatchEvent, string[]> = {
  start: ['灯一关，开始。{call}，看完这段我们交换观后感。', '坐好了{call}，我会陪你从头看到尾——有想吐槽的随时打断我。'],
  pause: ['？怎么停了——你在缓冲还是去接水？我先憋住不剧透。', '暂停了？行，你先忙，画面我帮你盯着。'],
  resume: ['回来了。刚才那几分钟我一句没剧透，{call}，敬业吧。', '继续继续，刚好错开了最闷的一段，运气不错。'],
  seek_back: ['倒回去了？果然，刚才那幕是有点东西。', '二刷这段？懂行，这段的信息我第一次也没看全。'],
  seek_fwd: ['快进啦？这段确实不重要，{call}，我帮你把重点记着呢。', '跳着看也行，错过什么随时问我。'],
  end: ['看完了！今晚最佳镜头我先不颁奖，{call}，你先说你心里的是哪个。', '结束了。打分吧，满分十分——我先说我的，等你先讲。'],
};

export function eventQuip(kind: WatchEvent, call: string): string {
  const arr = EVENTS[kind];
  return arr[Math.floor(Math.random() * arr.length)].replace('{call}', call);
}

/** 主动吐槽间隔（秒） */
export function nextInterval(): number {
  return 22 + Math.floor(Math.random() * 16);
}
