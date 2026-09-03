import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '艾搭 AIDA · 从你的游戏行为里长出来的AI搭子',
  description: '艾搭 AIDA — 可捏可养的AI游戏搭子：真实开源对局数据 + 时机引擎 + 情绪记忆 + 性格演化。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="sticky top-0 z-50 border-b border-edge/60 bg-ink/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-neon to-sky2 text-sm font-black text-ink">艾</span>
              <span className="font-bold tracking-wide text-slate-100">艾搭 <span className="text-xs font-normal text-slate-500">AIDA</span></span>
            </Link>
            <nav className="flex gap-1 text-sm">
              <Link href="/" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-panel hover:text-neon">大厅</Link>
              <Link href="/buddy" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-panel hover:text-neon">陪伴</Link>
              <Link href="/replay" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-panel hover:text-neon">共历回放</Link>
              <Link href="/memory" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-panel hover:text-neon">记忆库</Link>
              <Link href="/product" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-panel hover:text-neon">产品逻辑</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-[11px] leading-relaxed text-slate-600">
          数据来源（开源）：Valve TI14 官方回放的开源解析样例 github.com/whanyu1212/gem-dota · OpenDota/dotaconstants 常量表（npm: dotaconstants）。
          个人学习研究项目，非商业用途。艾搭的人格与所有发言均为产品设计。
        </footer>
      </body>
    </html>
  );
}
