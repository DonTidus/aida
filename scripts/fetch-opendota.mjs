/**
 * 在线模式：从 OpenDota 公共 API（开源数据平台 api.opendota.com）拉取真实玩家近期对局并浓缩为 demo 数据。
 * 当前 api.opendota.com 源站故障（522），脚本已内置重试；恢复后运行：npm run fetch-data -- <account_id>
 * 例：npm run fetch-data -- 164854816
 */
import fs from 'fs';
import path from 'path';

const BASE = 'https://api.opendota.com/api';
const accountId = process.argv[2];
if (!accountId) {
  console.log('用法: node scripts/fetch-opendota.mjs <account_id>  （OpenDota 公开玩家账号）');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (r.ok) return await r.json();
      console.log(`  HTTP ${r.status}，重试 ${i + 1}/${tries}`);
    } catch (e) {
      console.log(`  网络错误，重试 ${i + 1}/${tries}`);
    }
    await sleep(3000 * (i + 1));
  }
  throw new Error('重试耗尽: ' + url);
}

(async () => {
  console.log('== 拉取玩家', accountId);
  const profile = await get(`${BASE}/players/${accountId}`);
  console.log('玩家:', profile.profile?.personaname || accountId);

  const recent = await get(`${BASE}/players/${accountId}/matches?limit=8`);
  console.log('近期对局:', recent.length, '场');

  const matches = [];
  for (const m of recent) {
    console.log('  详情:', m.match_id);
    const detail = await get(`${BASE}/matches/${m.match_id}`);
    matches.push(detail);
    await sleep(1200); // 公共限流 60/min
  }

  const out = path.join(process.cwd(), 'data', `player-${accountId}.json`);
  fs.writeFileSync(out, JSON.stringify({ profile, matches }));
  console.log('已保存:', out, '→ 重启 dev server 后即可在 App 中切换在线数据源。');
})();
