'use client';

import { useCallback, useEffect, useState } from 'react';
import { PRESETS, BuddyState, PersonaCard, Traits, EvolutionEntry, MemoryCard, evolveFromExperience, applyDelta, ExperienceInput, moodAfterExperience } from './personas';

const KEY = 'aida-buddies-v2';

function seed(): BuddyState[] {
  return PRESETS.map((p) => ({
    ...p,
    createdAt: Date.now(),
    points: 0,
    matches: 0,
    memories: [],
    evolution: [],
    mood: 'calm' as const,
  }));
}

function load(): BuddyState[] {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const arr = JSON.parse(raw) as BuddyState[];
    // 迁移旧版独立记忆存储
    const legacy = localStorage.getItem('aida-memory');
    if (legacy && arr[0]) {
      try {
        const items = JSON.parse(legacy) as { slot: number; cards: MemoryCard[]; date: string }[];
        for (const it of items) {
          const b = arr.find((x) => x.id === `preset-aida`) ?? arr[0];
          for (const c of it.cards) {
            if (!b.memories.some((m) => m.id === c.id && m.title === c.title))
              b.memories.push({ ...c, formedAt: b.memories.length });
          }
        }
        localStorage.removeItem('aida-memory');
      } catch {}
    }
    return arr;
  } catch {
    return seed();
  }
}

function save(buddies: BuddyState[]) {
  try { localStorage.setItem(KEY, JSON.stringify(buddies)); } catch {}
}

export interface ExperienceResult {
  mems: MemoryCard[];
  exp: ExperienceInput;
  delta: Partial<Traits>;
  reasons: string[];
  before: Traits;
}

export function useBuddies() {
  const [buddies, setBuddies] = useState<BuddyState[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const b = load();
    setBuddies(b);
    setActiveId(localStorage.getItem('aida-active') ?? b[0]?.id ?? null);
  }, []);

  const persist = useCallback((next: BuddyState[]) => {
    setBuddies(next);
    save(next);
  }, []);

  const updateActive = useCallback((id: string | null) => {
    setActiveId(id);
    if (id) localStorage.setItem('aida-active', id);
  }, []);

  const create = useCallback((persona: PersonaCard) => {
    const b = load();
    const next: BuddyState = {
      ...persona, createdAt: Date.now(), points: 0, matches: 0,
      memories: [], evolution: [], mood: 'happy',
    };
    const nextAll = [...b, next];
    persist(nextAll);
    updateActive(next.id);
    return next;
  }, [persist, updateActive]);

  const remove = useCallback((id: string) => {
    const b = load().filter((x) => x.id !== id || x.preset);
    persist(b);
  }, [persist]);

  const editBuddy = useCallback((id: string, patch: Partial<PersonaCard> & { traits?: Traits }, reason?: string) => {
    const b = load();
    const idx = b.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const old = b[idx];
    const traitChanges: EvolutionEntry[] = [];
    if (patch.traits && reason) {
      const delta: Partial<Traits> = {};
      for (const [k, v] of Object.entries(patch.traits)) {
        const diff = (v as number) - old.traits[k as keyof Traits];
        if (Math.abs(diff) >= 1) delta[k as keyof Traits] = diff;
      }
      if (Object.keys(delta).length) traitChanges.push({ t: Date.now(), reason, delta });
    }
    const next: BuddyState = {
      ...old, ...patch,
      evolution: [...traitChanges, ...old.evolution].slice(0, 30),
    };
    b[idx] = next;
    persist(b);
  }, [persist]);

  /** 共同经历 → 记忆沉淀 + 性格演化（核心成长闭环） */
  const applyExperience = useCallback((id: string, mems: MemoryCard[], exp: ExperienceInput, basePoints: number): ExperienceResult | null => {
    const b = load();
    const idx = b.findIndex((x) => x.id === id);
    if (idx < 0) return null;
    const old = b[idx];
    const before = { ...old.traits };
    const { delta, reasons } = evolveFromExperience(exp);
    const merged: MemoryCard[] = [];
    for (const m of mems) {
      if (!old.memories.some((x) => x.title === m.title)) merged.push({ ...m, id: `m${old.memories.length + merged.length}` });
    }
    const evolution: EvolutionEntry[] = Object.keys(delta).length
      ? [{ t: Date.now(), reason: reasons[0] ?? '共同经历了一场比赛', delta }, ...old.evolution].slice(0, 30)
      : old.evolution;
    const next: BuddyState = {
      ...old,
      traits: applyDelta(old.traits, delta),
      memories: [...old.memories, ...merged].slice(-40),
      points: old.points + Math.round(basePoints),
      matches: old.matches + 1,
      mood: moodAfterExperience(exp, exp.comeback),
      lastExpAt: Date.now(),
      evolution,
    };
    b[idx] = next;
    persist(b);
    return { mems: merged, exp, delta, reasons, before };
  }, [persist]);

  const get = useCallback((id: string | null) => buddies.find((x) => x.id === id) ?? null, [buddies]);
  const active = get(activeId);

  return { buddies, active, activeId, updateActive, create, remove, editBuddy, applyExperience, reload: () => setBuddies(load()) };
}
