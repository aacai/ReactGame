// 冒险结果界面：通关胜利 / 冒险失败

import { motion } from 'framer-motion';
import { useRoguelikeStore } from '../store';

interface RunResultScreenProps {
  onBack: () => void;
}

export function RunResultScreen({ onBack }: RunResultScreenProps) {
  const phase = useRoguelikeStore((s) => s.phase);
  const player = useRoguelikeStore((s) => s.player);
  const defeatedEnemies = useRoguelikeStore((s) => s.defeatedEnemies);
  const goldEarned = useRoguelikeStore((s) => s.goldEarned);
  const resetRun = useRoguelikeStore((s) => s.resetRun);
  const backToMenu = useRoguelikeStore((s) => s.backToMenu);

  const isVictory = phase === 'victory';

  const handlePlayAgain = () => {
    resetRun();
  };

  const handleBackToMenu = () => {
    backToMenu();
    onBack();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        minHeight: '100%',
        gap: 24,
      }}
    >
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        style={{ textAlign: 'center' }}
      >
        <motion.div
          animate={{
            textShadow: isVictory
              ? [
                  '0 0 20px #fbbf24',
                  '0 0 40px #fbbf24',
                  '0 0 20px #fbbf24',
                ]
              : [
                  '0 0 16px #dc2626',
                  '0 0 32px #dc2626',
                  '0 0 16px #dc2626',
                ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: 80 }}
        >
          {isVictory ? '🏆' : '💀'}
        </motion.div>
        <h2
          style={{
            color: isVictory ? '#fbbf24' : '#dc2626',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 40,
            fontWeight: 700,
            margin: '8px 0 4px',
            textShadow: isVictory ? '0 0 16px #fbbf24' : '0 0 16px #dc2626',
          }}
        >
          {isVictory ? '冒险胜利' : '冒险失败'}
        </h2>
        <p style={{ color: '#e9d5ff', fontFamily: 'Noto Serif SC, serif', fontSize: 14, margin: 0 }}>
          {isVictory ? '你击败了暗影领主，拯救了世界' : '你的旅程在此终结...'}
        </p>
      </motion.div>

      {/* 统计信息 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          padding: 24,
          background: 'linear-gradient(135deg, rgba(26, 11, 46, 0.9), rgba(15, 8, 32, 0.95))',
          border: '1px solid #a855f760',
          borderRadius: 12,
          boxShadow: '0 0 16px #a855f740',
          minWidth: 280,
        }}
      >
        <div
          style={{
            color: '#fbbf24',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          战绩统计
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <StatRow label="击败敌人" value={`${defeatedEnemies}`} icon="⚔️" />
          <StatRow label="剩余 HP" value={`${player.hp} / ${player.maxHp}`} icon="❤️" />
          <StatRow label="获得金币" value={`${goldEarned}`} icon="💰" />
        </div>
      </motion.div>

      {/* 按钮 */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePlayAgain}
          style={{
            padding: '14px 32px',
            background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
            border: '2px solid #fbbf24',
            borderRadius: 10,
            color: '#fbbf24',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 0 16px #a855f780',
          }}
        >
          再玩一次
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleBackToMenu}
          style={{
            padding: '14px 32px',
            background: 'transparent',
            border: '1px solid #6b7280',
            borderRadius: 10,
            color: '#9a9a9a',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          返回主菜单
        </motion.button>
      </div>
    </div>
  );
}

function StatRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
      }}
    >
      <span style={{ color: '#d4b8ff', fontFamily: 'Noto Serif SC, serif', fontSize: 13 }}>
        {icon} {label}
      </span>
      <span style={{ color: '#fbbf24', fontFamily: 'Noto Serif SC, serif', fontSize: 14, fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}
