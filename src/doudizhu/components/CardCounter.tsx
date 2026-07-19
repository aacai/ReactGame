import { useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getRankName } from '../game/rules';

const RANK_ORDER = [17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3];

type CollapseState = 'full' | 'half' | 'quarter';

// 折叠时每行排几个：full=不换行, half=每行6个, quarter=每行2个(上下两列)
const COLS: Record<CollapseState, number | null> = {
  full: null,
  half: 6,
  quarter: 2,
};

const NEXT: Record<CollapseState, CollapseState> = {
  full: 'half',
  half: 'quarter',
  quarter: 'full',
};

export function CardCounter() {
  const playHistory = useGameStore(state => state.playHistory);
  const gamePhase = useGameStore(state => state.gamePhase);

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [collapse, setCollapse] = useState<CollapseState>('full');
  const dragRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    moved: boolean;
  } | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  const remainingByRank = useMemo(() => {
    const map = new Map<number, number>();

    for (const rank of RANK_ORDER) {
      const total = rank >= 16 ? 1 : 4;
      let played = 0;

      for (const entry of playHistory) {
        if (entry.cardType !== 'pass') {
          for (const card of entry.cards) {
            if (card.rank === rank) {
              played++;
            }
          }
        }
      }

      map.set(rank, total - played);
    }

    return map;
  }, [playHistory]);

  const totalOutside = useMemo(() => {
    let played = 0;
    for (const entry of playHistory) {
      if (entry.cardType !== 'pass') {
        played += entry.cards.length;
      }
    }
    return 54 - played;
  }, [playHistory]);

  if (gamePhase === 'waiting') return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: rect.left,
      baseY: rect.top,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;

    const maxX = window.innerWidth - 40;
    const maxY = window.innerHeight - 40;
    const x = Math.min(Math.max(drag.baseX + dx, 0), maxX);
    const y = Math.min(Math.max(drag.baseY + dy, 0), maxY);
    setPos({ x, y });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      elRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const cols = COLS[collapse];
  const bodyStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    borderRadius: collapse === 'full' ? 8 : '0 0 8px 8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    flexWrap: cols === null ? 'nowrap' : 'wrap',
    width: cols === null ? 'auto' : cols === 6 ? 196 : 74,
  };

  return (
    <div
      ref={elRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={() => setCollapse(c => NEXT[c])}
      style={{
        position: 'fixed',
        left: pos ? pos.x : undefined,
        top: pos ? pos.y : 16,
        right: pos ? undefined : 16,
        zIndex: 20,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 10px',
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: collapse === 'full' ? '8px 8px 0 0' : 8,
          fontSize: 11,
          fontWeight: 700,
          color: '#9ca3af',
          letterSpacing: 1,
        }}
      >
        <span>记牌器 · 拖动 · 双击折叠</span>
        <span style={{ color: '#fbbf24' }}>剩 {totalOutside}</span>
      </div>

      <div style={bodyStyle}>
        {RANK_ORDER.map(rank => {
          const remaining = remainingByRank.get(rank) || 0;
          const isJoker = rank >= 16;
          const rankName = isJoker ? (rank === 17 ? '大王' : '小王') : getRankName(rank);
          const textColor = remaining === 0 ? '#4b5563' : '#ffffff';

          return (
            <div
              key={rank}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: isJoker ? 32 : 24,
              }}
            >
              <span
                style={{
                  fontSize: isJoker ? 11 : 13,
                  fontWeight: 700,
                  color: textColor,
                  lineHeight: 1.2,
                }}
              >
                {rankName}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: remaining === 0 ? '#374151' : '#fbbf24',
                  marginTop: 2,
                  minWidth: 16,
                  textAlign: 'center',
                }}
              >
                {remaining}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
