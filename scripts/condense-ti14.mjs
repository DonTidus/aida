/**
 * 把 gem-dota 解析的 TI14 真实比赛 JSON (57MB tick 级) 浓缩为前端可用的 demo 数据集。
 * 数据来源: https://github.com/whanyu1212/gem-dota (Valve 官方回放 .dem 开源解析, TI14 样例)
 * 运行: node scripts/condense-ti14.mjs
 */
import fs from 'fs';
import path from 'path';

const SRC = process.env.GEM_SAMPLE || '/tmp/gemrepo/examples/ti14_sample.json';
const OUT = path.join(process.cwd(), 'data', 'match-ti14-xg-vs-falcons.json');

const TICK0 = 23322; // 第一个玩家状态采样 tick
const TPS = 30;      // ticks per second
const toSec = (tick) => Math.max(0, Math.round((tick - TICK0) / TPS));

const HERO_ZH = {
  sven: '斯温', nevermore: '影魔', slardar: '斯拉达', shadow_demon: '暗影恶魔',
  bane: '祸乱之源', pugna: '帕格纳', gyrocopter: '矮人直升机', beastmaster: '兽王',
  pangolier: '石鳞剑士', ringmaster: '百戏大王', chen: '陈', naga_siren: '娜迦海妖',
  mars: '玛尔斯', monkey_king: '齐天大圣', axe: '斧王', crystal_maiden: '水晶室女',
  invoker: '祈求者', ember_spirit: '灰烬之灵', storm_spirit: '风暴之灵',
  templar_assassin: '圣堂刺客', faceless_void: '虚空假面', lina: '莉娜',
  earthshaker: '撼地者', kunkka: '昆卡', tidehunter: '潮汐猎人', magnataur: '马格纳斯',
  enigma: '谜团', puck: '帕克', queenofpain: '痛苦女王', jakiro: '杰奇洛',
  phoenix: '凤凰', elder_titan: '上古巨神', dark_seer: '黑暗贤者', batrider: '蝙蝠骑士',
  disruptor: '干扰者', treant: '树精卫士', undersight: '凯', dawnbreaker: '破晓辰星',
  muerta: '缪拉珊', hoodwink: '森海飞霞', marci: '玛西', primal_beast: '獸',
  Snapfire: '电炎绝手',
};
const heroZh = (npc) => {
  const short = (npc || '').replace('npc_dota_hero_', '');
  return HERO_ZH[short] || short || npc;
};

const ITEM_ZH = {
  item_tango: '树之祭祀', item_magic_stick: '魔法棒', item_magic_wand: '魔杖',
  item_quelling_blade: '压制之刃', item_faerie_fire: '妖精之尘', item_branches: '铁树枝干',
  item_tpscroll: '传送卷轴', item_gloves: '加速手套', item_belt_of_strength: '力量腰带',
  item_flask: '治疗药膏', item_boots: '速度之靴', item_power_treads: '动力鞋',
  item_lifesteal: '吸血面具', item_broadsword: '阔剑', item_mask_of_madness: '疯狂面具',
  item_ogre_axe: '食人魔之斧', item_void_stone: '虚无宝石', item_echo_sabre: '回音战刃',
  item_blink: '闪烁匕首', item_mithril_hammer: '秘银锤', item_black_king_bar: '黑皇杖',
  item_claymore: '大剑', item_blades_of_attack: '攻击之爪', item_lesser_crit: '水晶剑',
  item_greater_crit: '代达罗斯之殇', item_demon_edge: '恶魔刀锋', item_diadem: '豪华王冠',
  item_harpoon: '鱼叉', item_satanic: '撒旦', item_reaver: '掠夺者之剑',
  item_swift_blink: '迅捷闪烁', item_eagle: '鹰歌弓', item_aghanims_shard: '阿哈利姆魔晶',
  item_ward_observer: '侦查守卫', item_ward_sentry: '岗哨守卫', item_ward_dispenser: '守卫物资',
  item_enchanted_mango: '魔法芒果', item_bottle: '魔瓶', item_clarity: '净化药水',
  item_boots_of_elves: '精灵皮靴', item_blade_of_alacrity: '敏捷之刃',
  item_yasha: '夜叉', item_wind_lace: '风灵之纹', item_staff_of_wizardry: '魔力法杖',
  item_robe: '法师长袍', item_kaya: '慧光', item_yasha_and_kaya: '慧夜对剑',
  item_point_booster: '精气之球', item_ultimate_scepter: '阿哈利姆神杖',
  item_ring_of_health: '回复戒指', item_pers: '坚韧球', item_sphere: '林肯法球',
  item_ultimate_orb: '极限法球', item_refresher: '刷新球', item_cornucopia: '丰饶之角',
  item_ring_of_tarrasque: '恐鳌之戒', item_tiara_of_selemene: '塞勒涅之冠',
  item_gauntlets: '力量手套', item_circlet: '圆环', item_bracer: '护腕',
  item_ring_of_protection: '守护指环', item_soul_ring: '灵魂之戒',
  item_platemail: '板甲', item_hyperstone: '振奋宝石', item_buckler: '玄冥盾牌',
  item_assault: '强袭胸甲', item_blood_grenade: '血腥榴弹', item_infused_raindrop: '魔雨滴',
  item_falcon_blade: '猎鹰战刃', item_sobi_mask: '贤者面罩', item_ring_of_basilius: '王者之戒',
  item_arcane_boots: '奥术鞋', item_aether_lens: '以太之镜', item_cloak: '抗魔斗篷',
  item_glimmer_cape: '微光披风', item_great_famango: '大魔法芒果',
  item_greater_famango: '大魔法芒果', item_smoke_of_deceit: '诡计之雾',
  item_fluffy_hat: '毛绒帽', item_pavise: '巨盾', item_crown: '王冠',
  item_solar_crest: '炎阳纹章', item_gem: '真视宝石', item_chainmail: '锁子甲',
  item_ring_of_regen: '回复戒指', item_headdress: '回复头巾', item_mekansm: '梅肯斯姆',
  item_guardian_greaves: '卫士胫甲', item_voodoo_mask: '巫毒面具',
  item_revenants_brooch: '怨灵胸针', item_helm_of_iron_will: '铁意头盔',
  item_veil_of_discord: '纷争面纱', item_shivas_guard: '希瓦的守护',
  item_blight_stone: '腐蚀之石', item_mantle: '智力斗篷', item_null_talisman: '挂件',
  item_diffusal_blade: '散失之刃', item_lotus_orb: '清莲宝珠', item_basher: '碎颅锤',
  item_dust: '显影之尘',
};
const itemZh = (n) => ITEM_ZH[n] || (n || '').replace('item_', '');

const towerZh = (name) => {
  const side = name.includes('badguys') ? '夜魇' : '天辉';
  const num = (name.match(/tower(\d)/) || [])[1];
  const lane = name.includes('_mid') ? '中路' : name.includes('_top') ? '上路' : name.includes('_bot') ? '下路' : '';
  if (name.includes('fort')) return side + '基地';
  return `${side}${['一', '二', '三', '四'][Number(num) - 1] || ''}塔${lane ? '·' + lane : ''}`;
};

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const shortHero = (n) => (n || '').replace('npc_dota_hero_', '');
const teamName = { 2: 'Xtreme Gaming', 3: 'Team Falcons' };

// ---------- players ----------
const players = raw.players.map((p) => {
  const heroKills = (p.kills_log || []).filter(
    (e) => e.target_is_hero && !e.attacker_is_illusion && e.attacker_name === p.hero_name
  );
  const deaths = raw.players
    .flatMap((q) => (q.kills_log || []))
    .filter((e) => e.target_is_hero && !e.target_is_illusion && e.target_name === p.hero_name && e.attacker_name !== e.target_name);
  const items = (p.purchase_log || [])
    .filter((e) => !e.value_name.includes('recipe') && !e.value_name.includes('ward') &&
      !['item_tango', 'item_flask', 'item_clarity', 'item_branches', 'item_dust'].includes(e.value_name))
    .map((e) => ({ t: toSec(e.tick), item: e.value_name, item_zh: itemZh(e.value_name) }));
  return {
    slot: p.player_id,
    name: p.player_name,
    hero: shortHero(p.hero_name),
    hero_zh: heroZh(p.hero_name),
    team: p.team,
    team_name: teamName[p.team],
    k: p.kills ?? heroKills.length,
    d: p.deaths ?? deaths.length,
    a: p.assists ?? 0,
    lane_role: p.lane_role,
    lane_eff: p.lane_efficiency_pct,
    networth_final: p.net_worth_t_min ? p.net_worth_t_min[p.net_worth_t_min.length - 1] : null,
    gpm: p.total_earned_gold_t_min ? Math.round(p.total_earned_gold_t_min[p.total_earned_gold_t_min.length - 1] / (raw.radiant_gold_adv.length)) : null,
    key_items: items.filter((i) => /^(item_blink|item_black_king_bar|item_satanic|item_greater_crit|item_lesser_crit|item_echo_sabre|item_mask_of_madness|item_harpoon|item_swift_blink|item_aghanims_shard|item_ultimate_scepter|item_sphere|item_refresher|item_assault|item_basher|item_power_treads|item_magic_wand|item_yasha_and_kaya|item_diffusal_blade|item_aether_lens|item_glimmer_cape|item_solar_crest|item_guardian_greaves|item_shivas_guard|item_veil_of_discord|item_lotus_orb|item_revenants_brooch)$/.test(i.item)),
    deaths_timeline: deaths.map((e) => ({ t: toSec(e.tick), by: shortHero(e.attacker_name), by_zh: heroZh(e.attacker_name) })),
  };
});

// ---------- global kill feed (dedupe by tick+victim) ----------
const seen = new Set();
const kills = [];
for (const p of raw.players) {
  for (const e of p.kills_log || []) {
    if (!e.target_is_hero || e.target_is_illusion) continue;
    if (e.attacker_is_illusion) continue;
    if (e.attacker_name === e.target_name) continue;
    const key = `${e.tick}|${e.target_name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kills.push({
      t: toSec(e.tick),
      killer: shortHero(e.attacker_name),
      killer_zh: heroZh(e.attacker_name),
      victim: shortHero(e.target_name),
      victim_zh: heroZh(e.target_name),
      killer_team: p.team === 2 ? 2 : null, // placeholder, fixed below
    });
  }
}
const heroTeam = Object.fromEntries(raw.players.map((p) => [shortHero(p.hero_name), p.team]));
for (const k of kills) k.killer_team = heroTeam[k.killer] ?? null;
kills.sort((a, b) => a.t - b.t);

// ---------- objectives ----------
const towers = (raw.towers || []).map((e) => ({
  t: toSec(e.tick),
  side: e.team === 2 ? 'dire' : 'radiant', // tower owner lost it (e.team = owner's enemy? verify: owner team lost tower)
  owner: e.team === 2 ? '夜魇' : '天辉',
  tower: towerZh(e.tower_name),
  killer: shortHero(e.killer),
  killer_zh: heroZh(e.killer),
}));
const roshans = (raw.roshans || []).map((e) => ({
  t: toSec(e.tick), n: e.kill_number, killer: shortHero(e.killer), killer_zh: heroZh(e.killer),
}));

// ---------- teamfights ----------
const teamfights = (raw.teamfights || []).map((tf, i) => {
  const radiant = tf.players.filter((_, idx) => raw.players[idx].team === 2);
  const dire = tf.players.filter((_, idx) => raw.players[idx].team === 3);
  const swing = radiant.reduce((s, p) => s + (p.gold_delta || 0), 0) - dire.reduce((s, p) => s + (p.gold_delta || 0), 0);
  return {
    idx: i + 1,
    start: toSec(tf.start_tick),
    end: toSec(tf.end_tick),
    radiant_kills: tf.radiant_kills,
    dire_kills: tf.dire_kills,
    winner: tf.winner,
    swing_gold: swing,
    deaths_detail: tf.players
      .map((p, idx) => ({ hero: raw.players[idx].hero_zh, name: raw.players[idx].name, team: raw.players[idx].team, d: p.deaths, dmg: p.damage_dealt, taken: p.damage_taken }))
      .filter((p) => p.d > 0),
  };
});

// ---------- chat ----------
const nameBySlot = Object.fromEntries(raw.players.map((p) => [p.player_id, p.player_name]));
const teamBySlot = Object.fromEntries(raw.players.map((p) => [p.player_id, p.team]));
const chat = (raw.chat || []).map((c) => ({
  t: toSec(c.tick),
  name: nameBySlot[c.player_slot] || '??',
  team: teamBySlot[c.player_slot] || 0,
  text: c.text,
}));

// ---------- draft ----------
const draft = (raw.draft || []).map((d, i) => ({
  order: i, team: d.team, is_pick: d.is_pick,
  hero: shortHero(d.hero_name), hero_zh: heroZh(d.hero_name),
}));

const meta = {
  match_id: raw.match_id,
  league: 'The International 2025 (TI14)',
  league_id: raw.leagueid,
  game_mode: '队长模式',
  radiant_name: teamName[2],
  dire_name: teamName[3],
  radiant_win: raw.radiant_win,
  duration_sec: toSec(raw.game_end_tick),
  source: {
    repo: 'github.com/whanyu1212/gem-dota',
    desc: 'Valve 官方回放 .dem 的开源解析样例（TI14），tick 级战斗日志/经济曲线/团战数据',
    license: '开源项目公开样例，仅用于学习与原型演示',
    note: '该样例为截断解析版本：开局前 1-2 分钟的部分事件可能缺失',
  },
};

const out = { meta, players, draft, events: { kills, towers, roshans, teamfights, chat, gold_adv: raw.radiant_gold_adv } };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('written', OUT, (fs.statSync(OUT).size / 1024).toFixed(1) + 'KB');
console.log('kills:', kills.length, '| teamfights:', teamfights.length, '| towers:', towers.length, '| roshans:', roshans.length);
console.log('XG players:', players.filter((p) => p.team === 2).map((p) => `${p.name}(${p.hero_zh}) ${p.k}/${p.d}/${p.a}`).join(' '));
console.log('Falcons:', players.filter((p) => p.team === 3).map((p) => `${p.name}(${p.hero_zh}) ${p.k}/${p.d}/${p.a}`).join(' '));
console.log('gold_adv head:', raw.radiant_gold_adv.slice(0, 10).join(','), '... tail:', raw.radiant_gold_adv.slice(-3).join(','));
