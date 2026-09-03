'use client';

/** 应用内 LLM 配置（存本地；服务端动态使用，优先级：页面配置 > 环境变量） */
export interface LLMConfig {
  base: string;
  key: string;
  model: string;
}

const KEY = 'aida-llm';

export function loadLLM(): LLMConfig {
  if (typeof window === 'undefined') return { base: '', key: '', model: '' };
  try { return JSON.parse(localStorage.getItem(KEY) || '{base:"",key:"",model:""}'); } catch { return { base: '', key: '', model: '' }; }
}

export function saveLLM(c: LLMConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
}

export function llmConfigured(c: LLMConfig) {
  return !!(c.base && c.key && c.model);
}

/** 预设：常见 OpenAI 兼容服务商 */
export const LLM_PRESETS: { label: string; base: string; model: string }[] = [
  { label: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: '混元', base: 'https://api.hunyuan.cloud.tencent.com/v1', model: 'hunyuan-turbos-latest' },
  { label: '智谱 GLM', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { label: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
];
