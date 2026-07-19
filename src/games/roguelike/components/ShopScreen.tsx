// 商店界面：升级卡 / 回血 / 随机遗物

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoguelikeStore } from '../store';
import { CardView } from './CardView';
import { getRandomRelic } from '../relics';
import type { Relic } from '../types';

// 商品价格
const PRICE_UPGRADE = 25;
const PRICE_HEAL = 15;
const PRICE_RELIC = 50;
const HEAL_AMOUNT = 20;

interface ShopItem {
  key: 'upgrade' | 'heal' | 'relic';
  icon: string;
  title: string;
  desc: string;
  price: number;
  color: string;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    key: 'upgrade',
    icon: '🔨',
    title: '卡牌升级',
    desc: '升级一张卡牌',
    price: PRICE_UPGRADE,
    color: '#a855f7',
  },
  {
    key: 'heal',
    icon: '❤️',
    title: '回复生命',
    desc: `回复 ${HEAL_AMOUNT} HP`,
    price: PRICE_HEAL,
    color: '#dc2626',
  },
  {
    key: 'relic',
    icon: '🔮',
    title: '神秘遗物',
    desc: '获得一个随机遗物',
    price: PRICE_RELIC,
    color: '#fbbf24',
  },
];

export function ShopScreen() {
  const player = useRoguelikeStore((s) => s.player);
  const deck = useRoguelikeStore((s) => s.deck);
  const relics = useRoguelikeStore((s) => s.relics);
  const shopPurchased = useRoguelikeStore((s) => s.shopPurchased);
  const shopBuy = useRoguelikeStore((s) => s.shopBuy);
  const leaveShop = useRoguelikeStore((s) => s.leaveShop);

  const [showUpgradePicker, setShowUpgradePicker] = useState(false);
  const [obtainedRelic, setObtainedRelic] = useState<Relic | null>(null);

  const handleItemClick = (item: ShopItem) => {
    if (shopPurchased[item.key]) return;
    if (player.gold < item.price) return;

    if (item.key === 'upgrade') {
      setShowUpgradePicker(true);
    } else if (item.key === 'heal') {
      shopBuy('heal');
    } else if (item.key === 'relic') {
      // 预览即将获得的遗物
      const newRelic = getRandomRelic(relics.map((r) => r.id));
      setObtainedRelic(newRelic);
      shopBuy('relic');
    }
  };

  const handleUpgradeCard = (cardId: string) => {
    shopBuy('upgrade', cardId);
    setShowUpgradePicker(false);
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
      {/* 标题 + 金币 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontSize: 56 }}>🏪</div>
        <h2
          style={{
            color: '#fbbf24',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 30,
            fontWeight: 700,
            margin: '8px 0 4px',
            textShadow: '0 0 12px #fbbf24',
          }}
        >
          商店
        </h2>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 16px',
            background: 'rgba(26, 11, 46, 0.8)',
            border: '1px solid #fbbf2480',
            borderRadius: 16,
            color: '#fbbf24',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 14,
          }}
        >
          💰 {player.gold} 金币
        </div>
      </motion.div>

      {/* 商品列表 */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {SHOP_ITEMS.map((item, idx) => {
          const purchased = shopPurchased[item.key];
          const affordable = player.gold >= item.price;
          const disabled = purchased || !affordable;

          return (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: purchased ? 0.3 : 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={disabled ? {} : { scale: 1.05, y: -2 }}
              whileTap={disabled ? {} : { scale: 0.98 }}
              onClick={() => handleItemClick(item)}
              disabled={disabled}
              style={{
                width: 160,
                padding: '20px 12px',
                background: 'linear-gradient(135deg, #4c1d95, #1a0b2e)',
                border: `2px solid ${purchased ? '#444' : item.color}`,
                borderRadius: 12,
                color: '#e9d5ff',
                fontFamily: 'Noto Serif SC, serif',
                cursor: disabled ? 'not-allowed' : 'pointer',
                boxShadow: disabled ? 'none' : `0 0 16px ${item.color}60`,
                opacity: purchased ? 0.4 : 1,
                position: 'relative',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: item.color }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, marginTop: 4, color: '#d4b8ff' }}>
                {item.desc}
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: '4px 10px',
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: 8,
                  color: affordable ? '#fbbf24' : '#6b7280',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'inline-block',
                }}
              >
                💰 {item.price}
              </div>
              {purchased && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: '#6b7280',
                    fontSize: 14,
                  }}
                >
                  ✓
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* 已拥有遗物显示 */}
      {relics.length > 0 && (
        <div
          style={{
            padding: '8px 16px',
            background: 'rgba(26, 11, 46, 0.6)',
            border: '1px solid #a855f740',
            borderRadius: 8,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#a855f7', fontFamily: 'Noto Serif SC, serif', fontSize: 12 }}>
            已有遗物：
          </span>
          {relics.map((r) => (
            <span key={r.id} title={r.description} style={{ fontSize: 20 }}>
              {r.emoji}
            </span>
          ))}
        </div>
      )}

      {/* 离开商店按钮 */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        onClick={leaveShop}
        style={{
          padding: '12px 32px',
          background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
          border: '2px solid #fbbf24',
          borderRadius: 10,
          color: '#fbbf24',
          fontFamily: 'Noto Serif SC, serif',
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 0 16px #a855f780',
          marginTop: 16,
        }}
      >
        离开商店
      </motion.button>

      {/* 升级卡牌选择弹窗 */}
      <AnimatePresence>
        {showUpgradePicker && (
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
            onClick={() => setShowUpgradePicker(false)}
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
                  onClick={() => card.upgradeable && !card.upgraded && handleUpgradeCard(card.id)}
                />
              ))}
            </div>
            <button
              onClick={() => setShowUpgradePicker(false)}
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

      {/* 获得遗物弹窗 */}
      <AnimatePresence>
        {obtainedRelic && (
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
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onClick={() => setObtainedRelic(null)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                background: 'linear-gradient(135deg, #4c1d95, #1a0b2e)',
                border: '2px solid #fbbf24',
                borderRadius: 16,
                padding: 32,
                textAlign: 'center',
                boxShadow: '0 0 32px #fbbf24',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 64, marginBottom: 12 }}>{obtainedRelic.emoji}</div>
              <h3
                style={{
                  color: '#fbbf24',
                  fontFamily: 'Noto Serif SC, serif',
                  fontSize: 24,
                  margin: '0 0 8px',
                }}
              >
                {obtainedRelic.name}
              </h3>
              <p style={{ color: '#e9d5ff', fontFamily: 'Noto Serif SC, serif', fontSize: 13, margin: '0 0 20px' }}>
                {obtainedRelic.description}
              </p>
              <button
                onClick={() => setObtainedRelic(null)}
                style={{
                  padding: '8px 24px',
                  background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
                  border: '1px solid #fbbf24',
                  borderRadius: 8,
                  color: '#fbbf24',
                  fontFamily: 'Noto Serif SC, serif',
                  cursor: 'pointer',
                }}
              >
                收下
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
