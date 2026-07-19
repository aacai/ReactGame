// 玩家面板组件

import { motion, AnimatePresence } from 'framer-motion';
import type { CombatState } from '../types';

interface PlayerPanelProps {
  combat: CombatState;
}

export function PlayerPanel({ combat }: PlayerPanelProps) {
  const { player, drawPile, discardPile, exhaustPile } = combat;
  const hpPercent = (player.hp / player.maxHp) * 100;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 16px',
        background: 'linear-gradient(135deg, rgba(26, 11, 46, 0.9) 0%, rgba(15, 8, 32, 0.95) 100%)',
        border: '1px solid #a855f760',
        borderRadius: 12,
        boxShadow: '0 0 16px #a855f740, inset 0 0 12px rgba(168, 85, 247, 0.1)',
      }}
    >
      {/* 头像 */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #a855f7, #4c1d95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          boxShadow: '0 0 12px #a855f780',
          border: '2px solid #fbbf24',
          flexShrink: 0,
        }}
      >
        ⚔️
      </div>

      {/* HP / 能量 / 格挡 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* HP 条 */}
        <div style={{ marginBottom: 6 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#fca5a5',
              marginBottom: 2,
              fontFamily: 'Noto Serif SC, serif',
            }}
          >
            <span>生命</span>
            <span style={{ fontWeight: 600 }}>{player.hp} / {player.maxHp}</span>
          </div>
          <div
            style={{
              height: 12,
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 6,
              overflow: 'hidden',
              border: '1px solid #dc262680',
              position: 'relative',
            }}
          >
            <motion.div
              animate={{ width: `${hpPercent}%` }}
              transition={{ duration: 0.3 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #dc2626, #ef4444)',
              }}
            />
          </div>
        </div>

        {/* 能量 + 格挡 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* 能量水晶 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #fbbf24, #d97706)',
                border: '2px solid #fde68a',
                boxShadow: `0 0 ${player.energy > 0 ? 12 : 4}px ${player.energy > 0 ? '#fbbf24' : '#666'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a0b2e',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {player.energy}
            </div>
            <span style={{ color: '#fbbf24', fontSize: 11, fontFamily: 'Noto Serif SC, serif' }}>
              / {player.maxEnergy}
            </span>
          </div>

          {/* 格挡 */}
          {player.block > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                color: '#60a5fa',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              🛡️ {player.block}
            </div>
          )}

          {/* 状态效果 */}
          <div style={{ display: 'flex', gap: 4 }}>
            <AnimatePresence>
              {player.status.strength > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  style={{ fontSize: 11, color: '#ef4444' }}
                  title={`力量 ${player.status.strength}`}
                >
                  💪{player.status.strength}
                </motion.span>
              )}
              {player.status.weak > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  style={{ fontSize: 11, color: '#a855f7' }}
                  title={`虚弱 ${player.status.weak}`}
                >
                  💫{player.status.weak}
                </motion.span>
              )}
              {player.status.stun > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  style={{ fontSize: 11, color: '#fbbf24' }}
                  title={`晕眩 ${player.status.stun}`}
                >
                  ⭐{player.status.stun}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 抽牌堆 / 弃牌堆 */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#a855f7',
            fontSize: 10,
            fontFamily: 'Noto Serif SC, serif',
          }}
          title={`抽牌堆 ${drawPile.length}`}
        >
          <span style={{ fontSize: 18 }}>📚</span>
          <span>{drawPile.length}</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#6b7280',
            fontSize: 10,
            fontFamily: 'Noto Serif SC, serif',
          }}
          title={`弃牌堆 ${discardPile.length}`}
        >
          <span style={{ fontSize: 18 }}>🗑️</span>
          <span>{discardPile.length}</span>
        </div>
        {exhaustPile.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: '#9333ea',
              fontSize: 10,
              fontFamily: 'Noto Serif SC, serif',
            }}
            title={`消耗堆 ${exhaustPile.length}`}
          >
            <span style={{ fontSize: 18 }}>🔥</span>
            <span>{exhaustPile.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}
