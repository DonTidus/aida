'use client';

import { useState } from 'react';
import { LLMConfig, LLM_PRESETS, loadLLM, llmConfigured, saveLLM } from '@/lib/llm-settings';

/** 应用内 LLM 配置：Key 存本地浏览器，服务端动态使用；可实测当前回复来源 */
export default function LLMSettings({ onChanged }: { onChanged?: (c: LLMConfig) => void }) {
  const [cfg, setCfg] = useState<LLMConfig>(loadLLM());
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');

  const configured = llmConfigured(cfg);

  async function test() {
    setTesting(true); setResult('');
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: '在吗', llm: cfg }),
      });
      const j = await r.json();
      setResult(j.source === 'llm' ? `✅ LLM 已连通（${cfg.model}）` : '⚠️ 走了模板兜底——检查 Base/Key/Model');
    } catch {
      setResult('⚠️ 网络失败');
    }
    setTesting(false);
  }

  return (
    <div>
      <button onClick={() => setOpen((v) => !v)}
        className={`chip cursor-pointer ${configured ? 'border-neon/50 text-neon' : ''}`} title="配置大模型 API（Key 只存本地）">
        {configured ? `🧠 LLM：${cfg.model}` : '🧠 接入 LLM（可选）'}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-xl border border-edge bg-ink/70 p-3">
          <div className="flex flex-wrap gap-1">
            {LLM_PRESETS.map((p) => (
              <button key={p.label} className="chip cursor-pointer hover:border-neon/50"
                onClick={() => setCfg({ ...cfg, base: p.base, model: p.model })}>{p.label}</button>
            ))}
          </div>
          <input value={cfg.base} onChange={(e) => setCfg({ ...cfg, base: e.target.value })} placeholder="Base URL（OpenAI 兼容）"
            className="w-full rounded-lg border border-edge bg-ink px-2.5 py-1.5 text-xs outline-none focus:border-neon/60" />
          <input value={cfg.key} onChange={(e) => setCfg({ ...cfg, key: e.target.value })} type="password" placeholder="API Key（只存在你的浏览器里）"
            className="w-full rounded-lg border border-edge bg-ink px-2.5 py-1.5 text-xs outline-none focus:border-neon/60" />
          <input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} placeholder="模型名"
            className="w-full rounded-lg border border-edge bg-ink px-2.5 py-1.5 text-xs outline-none focus:border-neon/60" />
          <div className="flex items-center gap-2">
            <button className="btn-primary !py-1 !px-3 text-[11px]" onClick={() => { saveLLM(cfg); onChanged?.(cfg); }}>保存</button>
            <button className="btn !py-1 !px-3 text-[11px]" onClick={test} disabled={testing || !configured}>{testing ? '测试中…' : '测试连接'}</button>
            {result && <span className="text-[11px] text-slate-400">{result}</span>}
          </div>
          <p className="text-[10px] leading-relaxed text-slate-600">
            不配置也能玩：所有陪伴场景走内置人格模板脑。配置后聊天/吐槽由大模型生成，人格与记忆照常注入。
          </p>
        </div>
      )}
    </div>
  );
}
