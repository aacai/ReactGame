// 五子棋游戏页面
// - 顶部：返回按钮 + 标题 + 当前轮次指示
// - 中间：棋盘
// - 底部：悔棋 / 重新开始 / 难度选择
// - 胜负弹窗

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Undo2, RotateCcw } from 'lucide-react';
import { useGomokuStore } from './store';
import { GomokuBoard } from './GomokuBoard';
import type { Difficulty } from './ai';

interface GomokuGameProps {
  onBack: () => void;
}

// 难度选项
const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string }[] = [
  { value: 'easy', label: '初级', desc: '看一步' },
  { value: 'medium', label: '中级', desc: '识威胁' },
  { value: 'hard', label: '高级', desc: '深度2' },
];

export function GomokuGame({ onBack }: GomokuGameProps) {
  const {
    currentPlayer,
    gameStatus,
    winner,
    difficulty,
    isAIThinking,
    history,
    setDifficulty,
    resetGame,
    undoMove,
  } = useGomokuStore();

  const [showModal, setShowModal] = useState(false);

  // 游戏结束时弹出胜负窗口
  useEffect(() => {
    if (gameStatus !== 'playing') {
      // 给一点延迟，让最后一颗棋子的动画完成
      const t = setTimeout(() => setShowModal(true), 350);
      return () => clearTimeout(t);
    } else {
      setShowModal(false);
    }
  }, [gameStatus]);

  // 顶部当前轮次提示
  const statusText = (() => {
    if (gameStatus === 'won') {
      return winner === 1 ? '黑方胜！' : '白方胜！';
    }
    if (gameStatus === 'draw') return '平局';
    if (isAIThinking) return 'AI 思考中...';
    return currentPlayer === 1 ? '轮到黑方（你）' : '轮到白方（AI）';
  })();

  const handleReset = () => {
    resetGame();
    setShowModal(false);
  };

  const handleUndo = () => {
    undoMove();
  };

  // 是否可悔棋
  const canUndo = history.length > 0 && !isAIThinking && gameStatus === 'playing';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col"
    >
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-ivory/10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-serif-sc text-sm">返回</span>
        </button>

        <div className="text-center flex-1">
          <h1 className="font-calligraphy text-2xl text-ivory game-title">五子棋</h1>
        </div>

        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-serif-sc ${
            currentPlayer === 1
              ? 'bg-ink/30 text-ivory/80'
              : 'bg-ivory/20 text-ivory'
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              currentPlayer === 1 ? 'bg-ink' : 'bg-ivory'
            } ${isAIThinking ? 'animate-pulse' : ''}`}
          />
          <span className="hidden sm:inline">{statusText}</span>
          <span className="sm:hidden">{isAIThinking ? 'AI...' : currentPlayer === 1 ? '黑' : '白'}</span>
        </div>
      </header>

      {/* 棋盘区域 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[560px]">
          {/* 状态条 */}
          <div className="text-center mb-3 h-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={statusText}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="font-serif-sc text-ivory/70 text-sm"
              >
                {statusText}
              </motion.div>
            </AnimatePresence>
          </div>

          <GomokuBoard />

          {/* 步数显示 */}
          <div className="text-center mt-2 font-serif-sc text-ivory/40 text-xs">
            第 {history.length} 手
          </div>
        </div>
      </div>

      {/* 底部控制区 */}
      <footer className="px-4 pb-5 pt-2">
        <div className="max-w-[560px] mx-auto space-y-3">
          {/* 难度选择 */}
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <motion.button
                key={opt.value}
                whileHover={{ scale: difficulty === opt.value ? 1 : 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setDifficulty(opt.value)}
                className={`py-2 rounded-lg font-serif-sc text-sm transition-all duration-200 ${
                  difficulty === opt.value
                    ? 'bg-vermilion text-ivory shadow-lg shadow-vermilion/30'
                    : 'bg-ivory/10 text-ivory/70 hover:bg-ivory/15'
                }`}
              >
                <div className="font-calligraphy text-base">{opt.label}</div>
                <div className={`text-[10px] ${difficulty === opt.value ? 'text-ivory/70' : 'text-ivory/40'}`}>
                  {opt.desc}
                </div>
              </motion.button>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: canUndo ? 1.02 : 1 }}
              whileTap={{ scale: canUndo ? 0.98 : 1 }}
              onClick={handleUndo}
              disabled={!canUndo}
              className="seal-btn seal-btn-secondary py-3 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Undo2 size={18} />
              <span>悔棋</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              className="seal-btn py-3 flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              <span>重新开始</span>
            </motion.button>
          </div>
        </div>
      </footer>

      {/* 胜负弹窗 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleReset}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="wood-panel p-8 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{
                    background:
                      gameStatus === 'won' && winner === 1
                        ? 'radial-gradient(circle at 30% 30%, #6a6a6a, #000)'
                        : gameStatus === 'won' && winner === 2
                        ? 'radial-gradient(circle at 30% 30%, #ffffff, #c8c2b0)'
                        : 'linear-gradient(135deg, #DEB887, #8B4513)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <span
                    className="font-calligraphy text-3xl"
                    style={{
                      color:
                        gameStatus === 'won' && winner === 1 ? '#fff' : '#B22222',
                    }}
                  >
                    {gameStatus === 'won' ? (winner === 1 ? '胜' : '负') : '和'}
                  </span>
                </motion.div>

                <h2 className="font-calligraphy text-4xl text-wood-dark mb-2">
                  {gameStatus === 'won'
                    ? winner === 1
                      ? '黑方获胜'
                      : '白方获胜'
                    : '平局'}
                </h2>

                <p className="font-serif-sc text-wood-dark/70 mb-6">
                  {gameStatus === 'won'
                    ? winner === 1
                      ? '恭喜你战胜了 AI！'
                      : '再接再厉，下次定能取胜'
                    : '棋逢对手，难分胜负'}
                </p>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setShowModal(false);
                    }}
                    className="flex-1 seal-btn seal-btn-secondary py-3"
                  >
                    看棋盘
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleReset}
                    className="flex-1 seal-btn py-3"
                  >
                    再来一局
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
