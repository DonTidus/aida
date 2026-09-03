'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Avatar from './Avatar';
import ChatPanel from './ChatPanel';
import { BuddyState } from '@/lib/personas';

/** 桌面模式：优先 Document Picture-in-Picture（真·置顶桌宠窗口），降级为页面内浮动窗 */
export default function DesktopMode({ buddy }: { buddy: BuddyState }) {
  const [pipWin, setPipWin] = useState<any>(null);
  const [fallback, setFallback] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function open() {
    const dPip = (window as any).documentPictureInPicture;
    if (dPip?.requestWindow) {
      try {
        const win: Window = await dPip.requestWindow({ width: 350, height: 500 });
        [...document.querySelectorAll('style, link[rel="stylesheet"]')].forEach((el) =>
          win.document.head.appendChild(el.cloneNode(true))
        );
        win.document.body.style.cssText = 'margin:0;padding:12px;background:#0a0e17;color:#e2e8f0';
        win.addEventListener('pagehide', () => setPipWin(null));
        setPipWin(win);
        return;
      } catch {}
    }
    setFallback(true); // Safari/Firefox 降级：页面内浮窗
  }

  function close() {
    try { pipWin?.close(); } catch {}
    setPipWin(null);
    setFallback(false);
  }

  const widget = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar name={buddy.name} appearance={buddy.appearance} mood={buddy.mood} size={52} />
          <div>
            <div className="text-sm font-bold text-slate-100">{buddy.name}</div>
            <div className="text-[10px] text-slate-500">桌面模式 · 置顶陪伴中</div>
          </div>
        </div>
        <button onClick={close} className="chip cursor-pointer hover:border-ember hover:text-ember">收起</button>
      </div>
      <ChatPanel buddy={buddy} compact />
    </div>
  );

  return (
    <>
      {!pipWin && !fallback && (
        <button className="btn text-xs" onClick={open} title="把伙伴弹出为置顶小窗（支持 Chrome/Edge）">
          🖥 桌面模式
        </button>
      )}
      {pipWin && mounted && createPortal(widget, pipWin.document.body)}
      {fallback && (
        <div className="fixed bottom-4 right-4 z-[100] w-[340px] rounded-2xl border border-edge bg-ink/95 p-3 shadow-2xl backdrop-blur">
          {widget}
        </div>
      )}
    </>
  );
}
