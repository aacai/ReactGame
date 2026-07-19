/**
 * DouZero 推荐面板（头像旁，可折叠，可关闭并持久化）
 */

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, X } from 'lucide-react';
import type { Card } from '../game/types';
import { getRankName, getSuitSymbol } from '../game/rules';

const ENABLED_KEY = 'doudizhu.douzeroHint.enabled';
const COLLAPSED_KEY = 'doudizhu.douzeroHint.collapsed';

export function readHintEnabled(): boolean {
  try {
    const v = localStorage.getItem(ENABLED_KEY);
    if (v === null) return true;
    return v === '1';
  } catch {
    return true;
  }
}

export function writeHintEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function formatCardsShort(cards: Card[]): string {
  if (cards.length === 0) return '过牌';
  return cards
    .map((c) => {
      if (c.suit === 'joker') return getRankName(c.rank);
      return `${getSuitSymbol(c.suit)}${getRankName(c.rank)}`;
    })
    .join(' ');
}

export interface HintOption {
  cards: Card[];
  label: string;
}

interface Props {
  visible: boolean;
  loading?: boolean;
  options: HintOption[];
  onApply: (cards: Card[]) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export function DouZeroHintPanel({
  visible,
  loading = false,
  options,
  onApply,
  enabled,
  onEnabledChange,
}: Props) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    writeCollapsed(collapsed);
  }, [collapsed]);

  if (!visible) return null;

  // 已关闭：只留一个小入口，方便再打开
  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => onEnabledChange(true)}
        className="ml-1 px-2 py-1 rounded-md text-[10px] text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors"
        title="开启 DouZero 推荐"
      >
        推荐·关
      </button>
    );
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="ml-1 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 text-xs hover:bg-emerald-500/30 transition-colors"
        title="展开 DouZero 推荐"
      >
        <Lightbulb size={12} />
        DouZero
        <ChevronUp size={12} />
      </button>
    );
  }

  return (
    <div className="ml-1 max-w-[200px] rounded-lg bg-black/55 border border-emerald-400/25 backdrop-blur-sm shadow-lg overflow-hidden">
      <div className="flex items-center justify-between gap-1 px-2 py-1 border-b border-white/10">
        <div className="flex items-center gap-1 text-emerald-200 text-[11px] font-semibold">
          <Lightbulb size={12} />
          DouZero 推荐
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="p-0.5 rounded text-white/50 hover:text-white hover:bg-white/10"
            title="折叠"
          >
            <ChevronDown size={12} />
          </button>
          <button
            type="button"
            onClick={() => onEnabledChange(false)}
            className="p-0.5 rounded text-white/50 hover:text-white hover:bg-white/10"
            title="关闭推荐（会记住）"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="px-2 py-1.5 space-y-1">
        {loading && (
          <div className="text-[10px] text-white/40">计算中…</div>
        )}
        {!loading && options.length === 0 && (
          <div className="text-[10px] text-white/40">暂无推荐</div>
        )}
        {!loading &&
          options.map((opt, i) => (
            <button
              key={`${i}-${opt.label}`}
              type="button"
              onClick={() => onApply(opt.cards)}
              className="w-full text-left px-1.5 py-1 rounded text-[11px] text-white/90 hover:bg-emerald-500/25 transition-colors"
            >
              <span className="text-emerald-300/80 mr-1">#{i + 1}</span>
              {opt.label}
            </button>
          ))}
      </div>
    </div>
  );
}
