// 敌人渲染组件

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import type { Enemy, EnemyMove } from '../types';

// 意图图标映射
function getIntentIcon(move: EnemyMove): { icon: string; color: string; label: string } {
  switch (move.type) {
    case 'attack':
      return { icon: '⚔️', color: '#dc2626', label: `${move.value}` };
    case 'attack-debuff':
      return { icon: '⚔️😵', color: '#dc2626', label: `${move.value}` };
    case 'block':
      return { icon: '🛡️', color: '#2563eb', label: `${move.value}` };
    case 'buff':
      return { icon: '👁️', color: '#a855f7', label: `+${move.value}` };
    default:
      return { icon: '?', color: '#888', label: '' };
  }
}

interface EnemyViewProps {
  enemy: Enemy;
  selectable: boolean;
  selected: boolean;
  onClick?: () => void;
}

export function EnemyView({ enemy, selectable, selected, onClick }: EnemyViewProps) {
  const [hit, setHit] = useState(false);
  const [lastHp, setLastHp] = useState(enemy.hp);

  // 受击检测：HP 下降时触发闪红抖动
  useEffect(() => {
    if (enemy.hp < lastHp) {
      setHit(true);
      const t = setTimeout(() => setHit(false), 350);
      return () => clearTimeout(t);
    }
    setLastHp(enemy.hp);
  }, [enemy.hp, lastHp]);

  useEffect(() => {
    setLastHp(enemy.hp);
  }, [enemy.hp]);

  const currentMove = enemy.moves[enemy.moveIndex];
  const intent = currentMove ? getIntentIcon(currentMove) : null;
  const hpPercent = (enemy.hp / enemy.maxHp) * 100;
  const isDead = enemy.hp <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -20 }}
      animate={{
        opacity: isDead ? 0.4 : 1,
        scale: selected ? 1.05 : 1,
        x: hit ? [0, -6, 6, -4, 4, 0] : 0,
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.3 }}
      onClick={selectable && !isDead ? onClick : undefined}
      style={{
        position: 'relative',
        width: 130,
        padding: '10px 8px',
        background: hit
          ? 'linear-gradient(160deg, #3a0e1a 0%, #2a0810 100%)'
          : 'linear-gradient(160deg, #1a0b2e 0%, #0f0820 100%)',
        border: `2px solid ${selected ? '#fbbf24' : '#a855f780'}`,
        borderRadius: 12,
        boxShadow: selected
          ? '0 0 20px #fbbf24, 0 0 36px #fbbf2480'
          : '0 0 12px #a855f760, 0 4px 12px rgba(0,0,0,0.5)',
        cursor: selectable && !isDead ? 'pointer' : 'default',
        textAlign: 'center',
      }}
    >
      {/* 意图显示 */}
      {intent && !isDead && (
        <div
          style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 8, 32, 0.95)',
            border: `1px solid ${intent.color}`,
            borderRadius: 16,
            padding: '2px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: `0 0 8px ${intent.color}80`,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 14 }}>{intent.icon}</span>
          <span style={{ color: intent.color, fontSize: 12, fontWeight: 600 }}>
            {intent.label}
          </span>
        </div>
      )}

      {/* 头像 emoji */}
      <div
        style={{
          fontSize: 48,
          filter: isDead ? 'grayscale(1)' : 'drop-shadow(0 0 8px #a855f7)',
          marginBottom: 4,
        }}
      >
        {enemy.emoji}
      </div>

      {/* 名字 */}
      <div
        style={{
          color: '#e9d5ff',
          fontFamily: 'Noto Serif SC, serif',
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {enemy.name}
      </div>

      {/* HP 条 */}
      <div
        style={{
          position: 'relative',
          height: 14,
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 7,
          overflow: 'hidden',
          border: '1px solid #dc262680',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${hpPercent}%`,
            background: 'linear-gradient(90deg, #dc2626, #ef4444)',
            transition: 'width 0.3s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 10,
            fontWeight: 600,
            textShadow: '0 0 2px #000',
          }}
        >
          {enemy.hp} / {enemy.maxHp}
        </div>
      </div>

      {/* 格挡值 */}
      {enemy.block > 0 && (
        <div
          style={{
            marginTop: 4,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            color: '#60a5fa',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          🛡️ {enemy.block}
        </div>
      )}

      {/* 状态效果 */}
      <div
        style={{
          marginTop: 6,
          display: 'flex',
          justifyContent: 'center',
          gap: 4,
          flexWrap: 'wrap',
          minHeight: 16,
        }}
      >
        <AnimatePresence>
          {enemy.status.strength > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              style={{ fontSize: 11, color: '#ef4444' }}
              title={`力量 ${enemy.status.strength}`}
            >
              💪{enemy.status.strength}
            </motion.span>
          )}
          {enemy.status.weak > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              style={{ fontSize: 11, color: '#a855f7' }}
              title={`虚弱 ${enemy.status.weak}`}
            >
              💫{enemy.status.weak}
            </motion.span>
          )}
          {enemy.status.stun > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              style={{ fontSize: 11, color: '#fbbf24' }}
              title={`晕眩 ${enemy.status.stun}`}
            >
              ⭐{enemy.status.stun}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
