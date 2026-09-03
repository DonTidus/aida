import { MATCH, durMin } from '@/lib/dataset';
import { PRESETS } from '@/lib/personas';

export const metadata = { title: '产品逻辑 · 艾搭 AIDA' };

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="glass p-6">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-neon">{n}</span>
        <h2 className="text-lg font-bold text-slate-50">{title}</h2>
      </div>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function ProductPage() {
  return (
    <div className="space-y-4">
      <section className="glass p-6 md:p-8">
        <h1 className="text-xl font-black text-slate-50 md:text-2xl">产品设计文档</h1>
        <p className="mt-2 text-sm text-slate-400">
          主张：<strong className="text-gold">人对 AI 产生感情，靠的不是它多会聊，而是它陪你打了多少局。</strong>
          绝大多数 AI 陪伴产品把感情寄托在对话质量上；艾搭把感情建立在<strong className="text-slate-200">共同经历</strong>上——
          聊天是廉价的关系，一起挨打、一起翻盘才是。
        </p>
      </section>

      <Section n="01" title="产品形态：一个（或多个）可捏可养的伙伴">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>获得三级设计</strong>：官方预设人设（{PRESETS.map((p) => p.name).join(' / ')}，降低上手门槛）→ 快速自定义（名字 + 五维性格滑杆）→ 深度编辑（外观配色/发型/配件、人设文案、语音参数）。</li>
          <li><strong>性格是「轴」不是「标签」</strong>：活跃 / 毒舌 / 温柔 / 理性 / 亲密 五维性格轴，随共同经历自动漂移，玩家可「塑形」但有 ±10 边界——<strong>防止一键把养出来的性格抹掉（防 OOC 的产品约束）</strong>。</li>
          <li><strong>虚拟形象</strong>：程序化 SVG 形象，表情随情境变化（胜利/倒下/日常），玩家可编辑。</li>
        </ul>
      </Section>

      <Section n="02" title="成长闭环：经历是唯一的成长货币">
        <div className="rounded-xl border border-edge bg-ink/50 p-4 font-mono text-xs text-slate-300">
          获得伙伴 → 共同经历（回放共历 / 未来接真实对局）→ 沉淀记忆（高光/至暗/习惯/里程碑）
          → 性格轴漂移 + 关系等级 → 全场景陪伴 → 更深的共同经历 …
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li>记忆不是聊天记录，是从行为流提炼的情绪事件，跨场次引用（「上周三你也是这么输的」）。</li>
          <li>性格演化有<strong>可解释的因果</strong>：见证翻盘 → 活跃+3 亲密+2；陪你倒下太多次 → 温柔+2 毒舌-1。每次演化都写入日志，玩家看得见「TA 为什么变成这样」。</li>
          <li>关系等级（初识→过命战友）由同行值驱动，同行值只来自见证真实事件，无法被聊天刷分。</li>
        </ul>
      </Section>

      <Section n="03" title="全场景陪伴：不打游戏的时候，TA 也在">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>局内</strong>：时机引擎——死亡 = 天然发言窗口，战斗中事件排队到团战结算后说；打扰度是一级指标（本 Demo 可现场开关对照验证）。</li>
          <li><strong>语音</strong>：浏览器 TTS 播报（语速/音调随性格轴变化：毒舌偏快偏低、治愈偏慢偏亮）+ STT 按住说话，零额外依赖。</li>
          <li><strong>桌面</strong>：Document Picture-in-Picture 把伙伴弹出为置顶小窗（真桌宠形态），不支持的平台降级为页面浮窗；日常闲聊人格化兜底。</li>
          <li><strong>情感安全</strong>：情绪低落时从损友模式自动切向安抚模式（v1 已实现语调降级；全局 tilt 静默在 Roadmap）。</li>
        </ul>
      </Section>

      <Section n="04" title="架构与模型判断">
        <ul className="list-disc space-y-1 pl-5">
          <li>数据层：Valve 官方回放 → 开源解析样例（gem-dota）→ 事件流（击杀/团战/经济曲线/出装/BP/真实选手聊天）；OpenDota API 恢复后可在线拉取任意公开玩家场次（<code className="text-neon">npm run fetch-data</code>）。</li>
          <li>引擎层：规则状态机做时机判断（确定、零延迟、可解释、可 A/B）；人格模板脑保证「必能开口」；性格演化是纯函数（可审计、可回放）。</li>
          <li>LLM 层：OpenAI 兼容协议（混元 / DeepSeek / GLM 均可），只负责自由问答与叙事生成；人格 + 性格轴 + 记忆 + 关系全部结构化注入 prompt，<strong>禁止编造未发生的经历</strong>；无 Key 自动降级。</li>
          <li>取舍：实时视觉理解（读屏幕）v1 砍掉——多模态延迟与成本不满足「局内不打扰」约束，等可交互视觉模型进入亚秒级再评估接入。</li>
        </ul>
      </Section>

      <Section n="05" title="评测框架（怎么算验证通过）">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead><tr className="text-slate-500"><th className="py-1.5">指标</th><th>定义</th><th>目标</th></tr></thead>
            <tbody className="divide-y divide-edge text-slate-300">
              <tr><td className="py-1.5">打扰度</td><td>战斗进行中的插话次数</td><td className="text-neon">时机引擎 ON = 0（已自动化验证）</td></tr>
              <tr><td className="py-1.5">记忆准确率</td><td>对历史经历提问的正确率</td><td>≥ 90%（数据驱动，架构性保证）</td></tr>
              <tr><td className="py-1.5">演化合理性</td><td>玩家盲测「这轮性格变化是否符合剧情」</td><td>认可率 &gt; 80%（演化因果全可解释）</td></tr>
              <tr><td className="py-1.5">情感共鸣分</td><td>小样本玩家对发言打分（-2~+2）</td><td>均值 &gt; +1</td></tr>
              <tr><td className="py-1.5">D7 回访率</td><td>有/无伙伴对照（15-20 人）</td><td>对照 +10pp 以上</td></tr>
              <tr><td className="py-1.5">语音/桌宠渗透</td><td>使用语音或桌面模式的活跃用户占比</td><td>&gt; 30%（陪伴场景的形态价值验证）</td></tr>
            </tbody>
          </table>
        </div>
        <p className="pt-1 text-xs text-slate-500">复现：`npm run test:engine` —— 时机/打扰/排队/视角相对性/记忆卡全部自动化断言。</p>
      </Section>

      <Section n="06" title="商业化与 WeGame 叙事">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>平台级资产</strong>：单游戏内 AI 助手会被游戏厂商自己做掉；<strong>跨游戏的持久陪伴关系</strong>才是启动器/平台的护城河——伙伴从金铲铲陪你到无畏契约，记忆不断档。</li>
          <li><strong>商业化</strong>：外观与语音包（人格不变、形象演进）、记忆容量订阅、联动限定人设（与赛事/IP 合作，如 TI 限定伙伴）。</li>
          <li><strong>冷启动</strong>：观赛场景先行（本 Demo 即观赛回放，版权数据与赛事方合作），证明情感机制成立后，再借平台数据授权切入玩家自己的对局。</li>
        </ul>
      </Section>

      <Section n="07" title="边界与诚实声明">
        <ul className="list-disc space-y-1 pl-5">
          <li>回放代替实时对局：为验证「时机 / 记忆 / 演化 / 陪伴」机制本身；实时接入需游戏平台数据授权。</li>
          <li>语音为浏览器 Web Speech API（音色非定制）；桌宠为 Document PiP 置顶窗口（非原生客户端）；均为形态验证。</li>
          <li>开源样例为截断解析，开局 1-2 分钟个别事件缺失；经济曲线为分钟级；数据仅用于学习与个人研究。</li>
        </ul>
        <p className="pt-1 text-xs text-slate-500">
          场次信息：{MATCH.meta.league} · {MATCH.meta.radiant_name} vs {MATCH.meta.dire_name} · match_id {MATCH.meta.match_id} · {durMin} 分钟 · 数据仓库 {MATCH.meta.source.repo}
        </p>
      </Section>
    </div>
  );
}
