// 战斗界面：敌人区 + 玩家面板 + 手牌区 + 结束回合按钮

import { motion, AnimatePresence } from 'framer-motion';
import { useRoguelikeStore } from '../store';
import { CardView } from './CardView';
import { EnemyView } from './EnemyView';
import { PlayerPanel } from './PlayerPanel';

export function CombatScreen() {
  const combat = useRoguelikeStore((s) => s.combat);
  const rewardChoices = useRoguelikeStore((s) => s.rewardChoices);
  const playCard = useRoguelikeStore((s) => s.playCard);
  const selectCard = useRoguelikeStore((s) => s.selectCard);
  const cancelSelection = useRoguelikeStore((s) => s.cancelSelection);
  const endTurn = useRoguelikeStore((s) => s.endTurn);
  const chooseReward = useRoguelikeStore((s) => s.chooseReward);
  const skipReward = useRoguelikeStore((s) => s.skipReward);

  if (!combat) return null;

  const aliveEnemies = combat.enemies.filter((e) => e.hp > 0);
  const isPlayerTurn = combat.turn === 'player' && !combat.isOver;
  const isStunned = combat.player.status.stun > 0;
  const selectedCard = combat.hand.find((c) => c.id === combat.selectedCardId) || null;
  const needsTargetSelection =
    selectedCard &&
    selectedCard.target === 'enemy' &&
    aliveEnemies.length > 1;

  // 点击卡牌
  const handleCardClick = (cardId: string) => {
    if (!isPlayerTurn || isStunned) return;
    const card = combat.hand.find((c) => c.id === cardId);
    if (!card) return;
    if (card.cost > combat.player.energy) return;

    // 不需要目标：直接打出
    if (card.target !== 'enemy') {
      playCard(cardId);
      return;
    }

    // 单体攻击：若仅 1 个敌人，直接打出
    if (aliveEnemies.length <= 1) {
      playCard(cardId, aliveEnemies[0]?.id);
      return;
    }

    // 多敌人：等待选择目标
    selectCard(cardId);
  };

  // 点击敌人
  const handleEnemyClick = (enemyId: string) => {
    if (!selectedCard || selectedCard.target !== 'enemy') return;
    playCard(selectedCard.id, enemyId);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: 12,
        gap: 12,
      }}
      onClick={() => {
        // 点击空白处取消选择
        if (selectedCard) cancelSelection();
      }}
    >
      {/* 敌人区 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
          minHeight: 200,
          paddingTop: 32,
        }}
      >
        {combat.enemies.map((enemy) => (
          <EnemyView
            key={enemy.id}
            enemy={enemy}
            selectable={!!selectedCard && selectedCard.target === 'enemy' && enemy.hp > 0}
            selected={combat.targetEnemyId === enemy.id}
            onClick={() => handleEnemyClick(enemy.id)}
          />
        ))}
      </div>

      {/* 目标选择提示 */}
      <AnimatePresence>
        {needsTargetSelection && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              textAlign: 'center',
              color: '#fbbf24',
              fontFamily: 'Noto Serif SC, serif',
              fontSize: 13,
              textShadow: '0 0 8px #fbbf24',
            }}
          >
            选择目标敌人
          </motion.div>
        )}
      </AnimatePresence>

      {/* 玩家面板 */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 600 }}>
          <PlayerPanel combat={combat} />
        </div>
      </div>

      {/* 中间状态提示 */}
      <div style={{ textAlign: 'center', minHeight: 24 }}>
        <AnimatePresence mode="wait">
          {combat.isOver && combat.result === 'win' && rewardChoices.length > 0 ? (
            <motion.div
              key="victory"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                color: '#fbbf24',
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 18,
                fontWeight: 700,
                textShadow: '0 0 12px #fbbf24',
              }}
            >
              胜利！选择一张奖励卡
            </motion.div>
          ) : !isPlayerTurn ? (
            <motion.div
              key="enemy-turn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                color: '#a855f7',
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 14,
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                敌人回合中...
              </motion.span>
            </motion.div>
          ) : isStunned ? (
            <motion.div
              key="stunned"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                color: '#fbbf24',
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 14,
                textShadow: '0 0 8px #fbbf24',
              }}
            >
              ⭐ 晕眩中，无法出牌
            </motion.div>
          ) : (
            <motion.div
              key="player-turn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                color: '#e9d5ff',
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 13,
              }}
            >
              你的回合 - 出牌或结束回合
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 手牌区 + 结束回合按钮 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 12,
          marginTop: 'auto',
        }}
      >
        {/* 手牌（横向滚动） */}
        <div
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'visible',
            padding: '20px 8px 8px',
            display: 'flex',
            gap: 8,
            justifyContent: combat.hand.length <= 5 ? 'center' : 'flex-start',
            minHeight: 180,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence>
            {combat.hand.map((card) => (
              <CardView
                key={card.id}
                card={card}
                playable={isPlayerTurn && !isStunned && card.cost <= combat.player.energy}
                selected={combat.selectedCardId === card.id}
                onClick={() => handleCardClick(card.id)}
              />
            ))}
          </AnimatePresence>
          {combat.hand.length === 0 && (
            <div
              style={{
                color: '#6b7280',
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 13,
                alignSelf: 'center',
              }}
            >
              手牌为空
            </div>
          )}
        </div>

        {/* 结束回合按钮 */}
        <motion.button
          whileHover={isPlayerTurn ? { scale: 1.05 } : {}}
          whileTap={isPlayerTurn ? { scale: 0.95 } : {}}
          onClick={(e) => {
            e.stopPropagation();
            if (isPlayerTurn) endTurn();
          }}
          disabled={!isPlayerTurn}
          style={{
            padding: '14px 18px',
            background: isPlayerTurn
              ? 'linear-gradient(135deg, #a855f7, #6b21a8)'
              : 'linear-gradient(135deg, #3a3a3a, #1a1a1a)',
            border: `2px solid ${isPlayerTurn ? '#fbbf24' : '#444'}`,
            borderRadius: 10,
            color: isPlayerTurn ? '#fbbf24' : '#666',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 14,
            fontWeight: 600,
            cursor: isPlayerTurn ? 'pointer' : 'not-allowed',
            boxShadow: isPlayerTurn ? '0 0 16px #a855f780' : 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          结束回合
        </motion.button>
      </div>

      {/* 胜利奖励弹窗 */}
      <AnimatePresence>
        {combat.isOver && combat.result === 'win' && rewardChoices.length > 0 && (
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
              justifyContent: 'center',
              padding: 16,
              gap: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.h2
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                color: '#fbbf24',
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 28,
                fontWeight: 700,
                textShadow: '0 0 16px #fbbf24',
                margin: 0,
              }}
            >
              战斗胜利
            </motion.h2>
            <p style={{ color: '#e9d5ff', fontFamily: 'Noto Serif SC, serif', margin: 0 }}>
              选择一张卡牌加入卡组
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {rewardChoices.map((card) => (
                <CardView
                  key={card.id}
                  card={card}
                  playable={true}
                  selected={false}
                  compact
                  onClick={() => chooseReward(card.id)}
                />
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={skipReward}
              style={{
                padding: '10px 24px',
                background: 'transparent',
                border: '1px solid #6b7280',
                borderRadius: 8,
                color: '#9a9a9a',
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              跳过奖励
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
