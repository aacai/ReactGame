// 篝火界面：休息或锻造

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoguelikeStore } from '../store';
import { CardView } from './CardView';

export function RestScreen() {
  const player = useRoguelikeStore((s) => s.player);
  const deck = useRoguelikeStore((s) => s.deck);
  const rest = useRoguelikeStore((s) => s.rest);
  const [showSmith, setShowSmith] = useState(false);

  const healAmount = Math.floor(player.maxHp * 0.3);

  const handleSleep = () => {
    rest('sleep');
  };

  const handleSmith = (cardId: string) => {
    rest('smith', cardId);
    setShowSmith(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 24,
        gap: 24,
        minHeight: '100%',
      }}
    >
      {/* 篝火标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center' }}
      >
        <motion.div
          animate={{
            textShadow: [
              '0 0 12px #fbbf24',
              '0 0 24px #fbbf24',
              '0 0 12px #fbbf24',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: 64 }}
        >
          🔥
        </motion.div>
        <h2
          style={{
            color: '#fbbf24',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 32,
            fontWeight: 700,
            margin: '8px 0 4px',
            textShadow: '0 0 12px #fbbf24',
          }}
        >
          篝火
        </h2>
        <p style={{ color: '#e9d5ff', fontFamily: 'Noto Serif SC, serif', fontSize: 13, margin: 0 }}>
          疲惫的旅人在此休整
        </p>
      </motion.div>

      {/* 玩家 HP 显示 */}
      <div
        style={{
          padding: '8px 20px',
          background: 'rgba(26, 11, 46, 0.8)',
          border: '1px solid #dc262680',
          borderRadius: 8,
          color: '#fca5a5',
          fontFamily: 'Noto Serif SC, serif',
          fontSize: 14,
        }}
      >
        当前 HP：{player.hp} / {player.maxHp}
      </div>

      {/* 两个选项 */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSleep}
          style={{
            width: 180,
            padding: '24px 16px',
            background: 'linear-gradient(135deg, #4c1d95, #1a0b2e)',
            border: '2px solid #a855f7',
            borderRadius: 12,
            color: '#e9d5ff',
            fontFamily: 'Noto Serif SC, serif',
            cursor: 'pointer',
            boxShadow: '0 0 16px #a855f760',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>💤</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#fbbf24' }}>休息</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            回复 {healAmount} HP
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowSmith(true)}
          style={{
            width: 180,
            padding: '24px 16px',
            background: 'linear-gradient(135deg, #4c1d95, #1a0b2e)',
            border: '2px solid #a855f7',
            borderRadius: 12,
            color: '#e9d5ff',
            fontFamily: 'Noto Serif SC, serif',
            cursor: 'pointer',
            boxShadow: '0 0 16px #a855f760',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔨</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#fbbf24' }}>锻造</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            升级一张卡牌
          </div>
        </motion.button>
      </div>

      {/* 锻造卡组选择弹窗 */}
      <AnimatePresence>
        {showSmith && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(4px)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 16,
              gap: 16,
              overflow: 'auto',
            }}
            onClick={() => setShowSmith(false)}
          >
            <h3
              style={{
                color: '#fbbf24',
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 22,
                margin: 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              选择要升级的卡牌
            </h3>
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: 800,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {deck.map((card) => (
                <CardView
                  key={card.id}
                  card={card}
                  playable={!card.upgraded && card.upgradeable}
                  selected={false}
                  compact
                  onClick={() => card.upgradeable && !card.upgraded && handleSmith(card.id)}
                />
              ))}
            </div>
            <button
              onClick={() => setShowSmith(false)}
              style={{
                padding: '8px 20px',
                background: 'transparent',
                border: '1px solid #6b7280',
                borderRadius: 8,
                color: '#9a9a9a',
                fontFamily: 'Noto Serif SC, serif',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
