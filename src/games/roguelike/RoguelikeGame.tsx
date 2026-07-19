// Roguelike 卡牌游戏顶层组件
// 暗黑魔幻背景（深紫黑渐变 + 缓慢移动光晕 + 浮动粒子）
// 根据 phase 切换不同 Screen

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useRoguelikeStore } from './store';
import { IntroScreen } from './components/IntroScreen';
import { MapView } from './components/MapView';
import { CombatScreen } from './components/CombatScreen';
import { RestScreen } from './components/RestScreen';
import { ShopScreen } from './components/ShopScreen';
import { RunResultScreen } from './components/RunResultScreen';

interface RoguelikeGameProps {
  onBack: () => void;
}

// 生成浮动粒子位置（仅生成一次）
function useParticles(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 8 + Math.random() * 12,
        delay: Math.random() * 5,
      })),
    [count],
  );
}

// 暗黑魔幻背景
function DarkMagicBackground() {
  const particles = useParticles(20);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #1a0b2e 0%, #0f0820 100%)',
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* 缓慢移动的紫色光晕 */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          top: '10%',
          left: '10%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}
      />
      <motion.div
        animate={{
          x: [0, -60, 50, 0],
          y: [0, 80, -30, 0],
          scale: [1, 0.8, 1.3, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          bottom: '5%',
          right: '5%',
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
        }}
      />
      <motion.div
        animate={{
          x: [0, 40, -50, 0],
          y: [0, -40, 60, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          top: '40%',
          left: '50%',
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.18) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(30px)',
        }}
      />

      {/* 浮动粒子 */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          animate={{
            y: [`${p.y}%`, `${p.y - 20}%`, `${p.y}%`],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: i % 3 === 0 ? '#fbbf24' : '#a855f7',
            borderRadius: '50%',
            boxShadow: `0 0 ${p.size * 2}px currentColor`,
          }}
        />
      ))}
    </div>
  );
}

// 顶部状态栏（地图/篝火/商店/战斗时显示）
function TopBar({ onBack }: { onBack: () => void }) {
  const phase = useRoguelikeStore((s) => s.phase);
  const player = useRoguelikeStore((s) => s.player);
  const relics = useRoguelikeStore((s) => s.relics);
  const currentNodeIndex = useRoguelikeStore((s) => s.currentNodeIndex);
  const backToMenu = useRoguelikeStore((s) => s.backToMenu);

  const handleBack = () => {
    backToMenu();
    onBack();
  };

  const phaseTitle =
    phase === 'map'
      ? `地图 - 节点 ${currentNodeIndex + 1}`
      : phase === 'combat'
      ? '战斗'
      : phase === 'rest'
      ? '篝火'
      : phase === 'shop'
      ? '商店'
      : '';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <button
        onClick={handleBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: 'transparent',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          borderRadius: 8,
          color: '#e9d5ff',
          fontFamily: 'Noto Serif SC, serif',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        ← 返回
      </button>

      <div
        style={{
          color: '#fbbf24',
          fontFamily: 'Noto Serif SC, serif',
          fontSize: 16,
          fontWeight: 600,
          textShadow: '0 0 8px #fbbf24',
        }}
      >
        {phaseTitle}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* HP */}
        <div
          style={{
            color: '#fca5a5',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 12,
          }}
        >
          ❤️ {player.hp}/{player.maxHp}
        </div>
        {/* 金币 */}
        <div
          style={{
            color: '#fbbf24',
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 12,
          }}
        >
          💰 {player.gold}
        </div>
        {/* 遗物 */}
        {relics.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {relics.map((r) => (
              <span key={r.id} title={r.description} style={{ fontSize: 16 }}>
                {r.emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

export function RoguelikeGame({ onBack }: RoguelikeGameProps) {
  const phase = useRoguelikeStore((s) => s.phase);
  const mapNodes = useRoguelikeStore((s) => s.mapNodes);
  const currentNodeIndex = useRoguelikeStore((s) => s.currentNodeIndex);
  const enterNode = useRoguelikeStore((s) => s.enterNode);

  const renderScreen = () => {
    switch (phase) {
      case 'intro':
        return <IntroScreen key="intro" onBack={onBack} />;
      case 'map':
        return (
          <div key="map" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TopBar onBack={onBack} />
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
              <MapView
                nodes={mapNodes}
                currentNodeIndex={currentNodeIndex}
                onEnterNode={enterNode}
              />
            </div>
          </div>
        );
      case 'combat':
        return (
          <div key="combat" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TopBar onBack={onBack} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <CombatScreen />
            </div>
          </div>
        );
      case 'rest':
        return (
          <div key="rest" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TopBar onBack={onBack} />
            <div style={{ flex: 1, overflow: 'auto' }}>
              <RestScreen />
            </div>
          </div>
        );
      case 'shop':
        return (
          <div key="shop" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TopBar onBack={onBack} />
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ShopScreen />
            </div>
          </div>
        );
      case 'victory':
      case 'defeat':
        return <RunResultScreen key="result" onBack={onBack} />;
      default:
        return <IntroScreen key="intro" onBack={onBack} />;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        color: '#e9d5ff',
        fontFamily: 'Noto Serif SC, serif',
      }}
    >
      <DarkMagicBackground />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
