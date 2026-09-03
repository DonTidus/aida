export interface MatchPlayer {
  slot: number;
  name: string;
  hero: string;
  hero_zh: string;
  team: 2 | 3;
  team_name: string;
  k: number;
  d: number;
  a: number;
  lane_role: number | null;
  lane_eff: number | null;
  networth_final: number | null;
  gpm: number | null;
  key_items: { t: number; item: string; item_zh: string }[];
  deaths_timeline: { t: number; by: string; by_zh: string }[];
}

export interface MatchDataset {
  meta: {
    match_id: number;
    league: string;
    game_mode: string;
    radiant_name: string;
    dire_name: string;
    radiant_win: boolean;
    duration_sec: number;
    source: { repo: string; desc: string; license: string; note: string };
  };
  players: MatchPlayer[];
  draft: { order: number; team: 2 | 3; is_pick: boolean; hero: string; hero_zh: string }[];
  events: {
    kills: { t: number; killer: string; killer_zh: string; victim: string; victim_zh: string; killer_team: 2 | 3 | null }[];
    towers: { t: number; owner: string; tower: string; killer: string; killer_zh: string }[];
    roshans: { t: number; n: number; killer: string; killer_zh: string }[];
    teamfights: {
      idx: number; start: number; end: number; radiant_kills: number; dire_kills: number;
      winner: 'radiant' | 'dire'; swing_gold: number;
      deaths_detail: { hero: string; name: string; team: 2 | 3; d: number; dmg: number; taken: number }[];
    }[];
    chat: { t: number; name: string; team: number; text: string }[];
    gold_adv: number[];
  };
}

import raw from '@/data/match-ti14-xg-vs-falcons.json';
export const MATCH = raw as unknown as MatchDataset;

export const durMin = Math.ceil(MATCH.meta.duration_sec / 60);
export const goldAdvAt = (sec: number) => {
  const m = Math.min(MATCH.events.gold_adv.length - 1, Math.max(0, Math.floor(sec / 60)));
  return MATCH.events.gold_adv[m];
};
