// 卡牌渲染组件

import { motion } from 'framer-motion';
import type { Card } from '../types';

// 各类型边框颜色
const BORDER_COLORS: Record<string, string> = {
  attack: '#dc2626',
  skill: '#2563eb',
  power: '#9333ea',
};

// 各类型背景渐变
const BG_GRADIENTS: Record<string, string> = {
  attack: 'linear-gradient(160deg, #2a0e1a 0%, #1a0810 100%)',
  skill: 'linear-gradient(160deg, #0e1a2a 0%, #08101a 100%)',
  power: 'linear-gradient(160deg, #1a0e2a 0%, #10081a 100%)',
};

interface CardViewProps {
  card: Card;
  playable: boolean;        // 能量是否足够
  selected: boolean;        // 是否被选中
  onClick?: () => void;
  compact?: boolean;        // 紧凑模式（奖励选择/卡组预览）
}

export function CardView({ card, playable, selected, onClick, compact }: CardViewProps) {
  const borderColor = BORDER_COLORS[card.type] || '#a855f7';
  const bgGradient = BG_GRADIENTS[card.type] || BG_GRADIENTS.skill;

  // 卡牌尺寸
  const width = compact ? 130 : 110;
  const height = compact ? 180 : 160;

  // 发光阴影
  const boxShadow = playable
    ? selected
      ? `0 0 24px ${borderColor}, 0 0 40px ${borderColor}80, 0 12px 24px rgba(0,0,0,0.6)`
      : `0 0 12px ${borderColor}80, 0 6px 16px rgba(0,0,0,0.5)`
    : `0 4px 8px rgba(0,0,0,0.4)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{
        opacity: 1,
        y: selected ? -16 : 0,
        scale: 1,
      }}
      whileHover={playable ? { scale: 1.05, y: selected ? -20 : -8 } : {}}
      whileTap={playable ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      onClick={playable ? onClick : undefined}
      style={{
        width,
        height,
        background: bgGradient,
        border: `2px solid ${card.upgraded ? '#fbbf24' : borderColor}`,
        borderRadius: 10,
        boxShadow,
        position: 'relative',
        cursor: playable ? 'pointer' : 'default',
        opacity: playable ? 1 : 0.55,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 升级标记 */}
      {card.upgraded && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 6,
            color: '#fbbf24',
            fontSize: 14,
            textShadow: '0 0 6px #fbbf24',
            zIndex: 2,
          }}
        >
          ✦
        </div>
      )}

      {/* 费用角标 */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #fbbf24, #d97706)',
          border: '2px solid #fde68a',
          boxShadow: '0 0 8px #fbbf2480',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1a0b2e',
          fontWeight: 700,
          fontSize: 14,
          zIndex: 2,
        }}
      >
        {card.cost}
      </div>

      {/* 卡牌类型色条 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${borderColor}, ${borderColor}80)`,
        }}
      />

      {/* 卡名 */}
      <div
        style={{
          marginTop: 38,
          textAlign: 'center',
          color: '#e9d5ff',
          fontFamily: 'Noto Serif SC, serif',
          fontWeight: 600,
          fontSize: 14,
          padding: '0 4px',
          textShadow: '0 0 6px rgba(168, 85, 247, 0.5)',
        }}
      >
        {card.name}
      </div>

      {/* 类型标签 */}
      <div
        style={{
          textAlign: 'center',
          color: borderColor,
          fontSize: 9,
          marginTop: 2,
          letterSpacing: '0.15em',
        }}
      >
        {card.type === 'attack' ? '攻击' : card.type === 'skill' ? '技能' : '能力'}
      </div>

      {/* 描述 */}
      <div
        style={{
          marginTop: 8,
          padding: '0 8px',
          textAlign: 'center',
          color: '#d4b8ff',
          fontFamily: 'Noto Serif SC, serif',
          fontSize: 11,
          lineHeight: 1.4,
        }}
      >
        {card.description}
      </div>

      {/* 消耗标记 */}
      {card.exhaust && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 6,
            color: '#a855f7',
            fontSize: 10,
            opacity: 0.8,
          }}
        >
          消耗
        </div>
      )}
    </motion.div>
  );
}
