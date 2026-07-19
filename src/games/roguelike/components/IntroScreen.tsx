// 角色介绍页：剑客 + HP + 初始卡组预览

import { motion } from 'framer-motion';
import { useRoguelikeStore } from '../store';
import { INITIAL_DECK } from '../cards';
import { CardView } from './CardView';

interface IntroScreenProps {
  onBack: () => void;
}

export function IntroScreen({ onBack }: IntroScreenProps) {
  const startRun = useRoguelikeStore((s) => s.startRun);

  // 初始卡组预览（去重展示）
  const uniqueCards = INITIAL_DECK.reduce((acc, card) => {
    if (!acc.find((c) => c.name === card.name)) {
      acc.push(card);
    }
    return acc;
  }, [] as typeof INITIAL_DECK);

  // 各卡牌数量
  const cardCounts: Record<string, number> = {};
  INITIAL_DECK.forEach((c) => {
    cardCounts[c.name] = (cardCounts[c.name] || 0) + 1;
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 24,
        gap: 20,
        minHeight: '100%',
      }}
    >
      {/* 返回按钮 */}
      <div style={{ width: '100%', maxWidth: 600, display: 'flex', justifyContent: 'flex-start' }}>
        <button
          onClick={onBack}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid #6b7280',
            borderRadius: 8,
            color: '#9a9a9a',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ← 返回
        </button>
      </div>

      {/* 角色头像 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        style={{ textAlign: 'center' }}
      >
        <motion.div
          animate={{
            boxShadow: [
              '0 0 24px #a855f7',
              '0 0 48px #a855f7',
              '0 0 24px #a855f7',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #a855f7, #4c1d95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 56,
            margin: '0 auto 12px',
            border: '3px solid #fbbf24',
          }}
        >
          ⚔️
        </motion.div>
        <h2
          style={{
            color: '#fbbf24',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 32,
            fontWeight: 700,
            margin: '0 0 4px',
            textShadow: '0 0 12px #fbbf24',
          }}
        >
          剑客
        </h2>
        <p style={{ color: '#e9d5ff', fontFamily: 'Noto Serif SC, serif', fontSize: 13, margin: 0 }}>
          手持长剑的冒险者，踏入暗影之地
        </p>
      </motion.div>

      {/* 属性 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            padding: '8px 16px',
            background: 'rgba(220, 38, 38, 0.15)',
            border: '1px solid #dc262680',
            borderRadius: 8,
            color: '#fca5a5',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 14,
          }}
        >
          ❤️ HP 80
        </div>
        <div
          style={{
            padding: '8px 16px',
            background: 'rgba(251, 191, 36, 0.15)',
            border: '1px solid #fbbf2480',
            borderRadius: 8,
            color: '#fbbf24',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 14,
          }}
        >
          ⚡ 能量 3
        </div>
        <div
          style={{
            padding: '8px 16px',
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid #a855f780',
            borderRadius: 8,
            color: '#a855f7',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 14,
          }}
        >
          🃏 初始 10 张
        </div>
      </motion.div>

      {/* 初始卡组预览 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ textAlign: 'center' }}
      >
        <h3
          style={{
            color: '#fbbf24',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 18,
            margin: '0 0 12px',
          }}
        >
          初始卡组
        </h3>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {uniqueCards.map((card) => (
            <div key={card.id} style={{ position: 'relative' }}>
              <CardView card={card} playable={false} selected={false} compact />
              <div
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#a855f7',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fbbf24',
                }}
              >
                ×{cardCounts[card.name]}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 开始冒险按钮 */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={startRun}
        style={{
          padding: '16px 48px',
          background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
          border: '2px solid #fbbf24',
          borderRadius: 12,
          color: '#fbbf24',
          fontFamily: 'Noto Serif SC, serif',
          fontSize: 20,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 0 24px #a855f780',
          letterSpacing: '0.1em',
          marginTop: 8,
        }}
      >
        开始冒险
      </motion.button>
    </div>
  );
}
