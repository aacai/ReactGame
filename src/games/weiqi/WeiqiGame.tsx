// 围棋游戏页面
// - 自管理内部 screen 状态（设置页 / 对局页）
// - onBack prop 由父组件传入
// - 设置页：难度选择
// - 对局页：棋盘 + 当前轮次 + 提子数 + 控制按钮（停一手/悔棋/认输/重开）
// - 结果弹窗：显示数子计分详情
//
// ============================================================================
// 主菜单集成说明（由主进程统一处理，不在此文件中实现）
// ============================================================================
// 在 src/App.tsx 中：
// - 顶部 import：import { WeiqiGame } from './games/weiqi/WeiqiGame';
// - 顶层组件 App 中扩展 state：const [game, setGame] = useState<'xiangqi' | 'doudizhu' | 'janggi' | 'weiqi'>('xiangqi');
// - 在 AnimatePresence 中新增分支：
//     {game === 'weiqi' && (
//       <motion.div key="weiqi" ...>
//         <WeiqiGame onBack={() => setGame('xiangqi')} />
//       </motion.div>
//     )}
// 在 src/components/MainMenu.tsx 中：
// - 在菜单项列表里新增"围棋"入口，onClick 调用 onGoToWeiqi
// ============================================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  RotateCcw,
  BookOpen,
  Flag,
  Sparkles,
  Hand,
  Undo2,
} from 'lucide-react';
import { useWeiqiStore } from './store';
import { WeiqiBoard } from './WeiqiBoard';
import type { Difficulty } from './store';

type LocalScreen = 'setup' | 'game';

// ============== 难度卡片 ==============
interface DifficultyCardProps {
  level: Difficulty;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

function DifficultyCard({ level, title, description, isSelected, onClick }: DifficultyCardProps) {
  const colors = {
    easy: { ring: 'ring-emerald-400', shadow: 'shadow-emerald-500/40' },
    medium: { ring: 'ring-amber-400', shadow: 'shadow-amber-500/40' },
    hard: { ring: 'ring-rose-400', shadow: 'shadow-rose-500/40' },
  };
  const color = colors[level];

  return (
    <motion.button
      whileHover={{ scale: isSelected ? 1 : 1.03, y: isSelected ? 0 : -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative w-full p-5 rounded-2xl text-left transition-all duration-300 ${
        isSelected ? `ring-4 ${color.ring} shadow-2xl ${color.shadow}` : 'hover:shadow-xl'
      }`}
      style={{
        background: isSelected
          ? `linear-gradient(145deg, ${
              level === 'easy' ? '#059669, #065f46' : level === 'medium' ? '#d97706, #92400e' : '#be123c, #881337'
            })`
          : 'linear-gradient(145deg, rgba(222, 184, 135, 0.95), rgba(196, 149, 106, 0.95))',
        border: isSelected ? 'none' : '2px solid #8B4513',
      }}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center font-calligraphy text-3xl mb-3 ${
            isSelected ? 'bg-ivory/20 text-ivory' : 'bg-wood-dark/20 text-wood-dark'
          }`}
        >
          {level === 'easy' ? '初' : level === 'medium' ? '中' : '高'}
        </div>
        <h4 className={`font-calligraphy text-2xl mb-1 ${isSelected ? 'text-ivory' : 'text-wood-dark'}`}>{title}</h4>
        <p className={`font-serif-sc text-sm ${isSelected ? 'text-ivory/80' : 'text-wood-dark/60'}`}>{description}</p>
      </div>
      {isSelected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-3 right-3"
        >
          <div className="w-7 h-7 rounded-full bg-ivory flex items-center justify-center shadow-lg">
            <Sparkles size={16} className={level === 'easy' ? 'text-emerald-600' : level === 'medium' ? 'text-amber-600' : 'text-rose-600'} />
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}

// ============== 设置页 ==============
interface SetupPageProps {
  onBack: () => void;
  onStart: () => void;
}

function SetupPage({ onBack, onStart }: SetupPageProps) {
  const { difficulty, setDifficulty } = useWeiqiStore();

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-serif-sc">返回</span>
        </button>
        <h2 className="font-calligraphy text-4xl text-ivory flex-1 text-center pr-16">围棋</h2>
      </div>

      <div className="space-y-6">
        <div className="wood-panel p-6 rounded-2xl">
          <div className="relative z-10">
            <h4 className="font-calligraphy text-2xl text-wood-dark text-center mb-5">选择难度</h4>
            <div className="grid grid-cols-3 gap-3">
              <DifficultyCard
                level="easy"
                title="初级"
                description="随机落子"
                isSelected={difficulty === 'easy'}
                onClick={() => setDifficulty('easy')}
              />
              <DifficultyCard
                level="medium"
                title="中级"
                description="启发式"
                isSelected={difficulty === 'medium'}
                onClick={() => setDifficulty('medium')}
              />
              <DifficultyCard
                level="hard"
                title="高级"
                description="深度评估"
                isSelected={difficulty === 'hard'}
                onClick={() => setDifficulty('hard')}
              />
            </div>
          </div>
        </div>

        {/* 玩家信息提示 */}
        <div className="wood-panel p-5 rounded-2xl">
          <div className="relative z-10 text-center">
            <h4 className="font-calligraphy text-xl text-wood-dark mb-3">对局规则</h4>
            <div className="font-serif-sc text-wood-dark/70 text-sm space-y-1.5">
              <p>· 玩家执黑先手，AI 执白</p>
              <p>· 19x19 标准棋盘，黑提白、白提黑</p>
              <p>· 终局数子：子+围空+提子，白方贴目 6.5</p>
              <p>· 双方连续停一手即终局</p>
            </div>
          </div>
        </div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="w-full seal-btn text-2xl py-5"
        >
          开始对局
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============== 结果弹窗 ==============
function WeiqiResultModal({
  onClose,
  onRestart,
}: {
  onClose: () => void;
  onRestart: () => void;
}) {
  const { gameStatus, winner, score } = useWeiqiStore();

  const isVisible = gameStatus === 'finished';

  if (!isVisible) return null;

  // 区分胜负原因：认输 or 数子
  const isResign = score === null;
  const blackWin = winner === 'black';
  const isDraw = winner === null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="wood-panel p-6 max-w-md w-full text-center"
          >
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{
                  background:
                    isDraw
                      ? 'linear-gradient(135deg, #DEB887, #8B4513)'
                      : blackWin
                      ? 'radial-gradient(circle at 30% 30%, #6a6a6a, #000)'
                      : 'radial-gradient(circle at 30% 30%, #ffffff, #c8c2b0)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <span
                  className="font-calligraphy text-3xl"
                  style={{
                    color: isDraw ? '#B22222' : blackWin ? '#fff' : '#B22222',
                  }}
                >
                  {isDraw ? '和' : blackWin ? '胜' : '负'}
                </span>
              </motion.div>

              <h2 className="font-calligraphy text-3xl text-wood-dark mb-2">
                {isDraw ? '平局' : blackWin ? '黑方获胜' : '白方获胜'}
              </h2>

              <p className="font-serif-sc text-wood-dark/70 mb-4 text-sm">
                {isResign
                  ? '黑方认输'
                  : '数子计分结果'}
              </p>

              {/* 计分明细 */}
              {score && (
                <div className="bg-wood-dark/10 rounded-lg p-3 mb-5 font-serif-sc text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="font-calligraphy text-lg text-ink mb-1">黑方</div>
                      <div className="text-2xl font-bold text-ink mb-1">{score.black.toFixed(1)}</div>
                      <div className="text-xs text-wood-dark/60 space-y-0.5">
                        <div>子 {score.blackStones}</div>
                        <div>围空 {score.blackTerritory}</div>
                        <div>提子 {score.capturedByBlack}</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-calligraphy text-lg text-ivory mb-1" style={{ color: '#1a1a1a' }}>白方</div>
                      <div className="text-2xl font-bold mb-1" style={{ color: '#1a1a1a' }}>{score.white.toFixed(1)}</div>
                      <div className="text-xs text-wood-dark/60 space-y-0.5">
                        <div>子 {score.whiteStones}</div>
                        <div>围空 {score.whiteTerritory}</div>
                        <div>提子 {score.capturedByWhite}</div>
                        <div>贴目 {score.komi}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="flex-1 seal-btn seal-btn-secondary py-3"
                >
                  看棋盘
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onRestart}
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
  );
}

// ============== 对局页 ==============
function WeiqiGameScreen({ onBackToSetup }: { onBackToSetup: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const {
    currentPlayer,
    gameStatus,
    winner,
    captures,
    isAIThinking,
    history,
    passCount,
    score,
    lastMove,
    pass,
    undoMove,
    resetGame,
    resign,
  } = useWeiqiStore();

  // 游戏结束时延迟弹出结果窗口（等最后一颗棋子的动画完成）
  useEffect(() => {
    if (gameStatus === 'finished') {
      const t = setTimeout(() => setShowResult(true), 350);
      return () => clearTimeout(t);
    } else {
      setShowResult(false);
    }
  }, [gameStatus, winner]);

  const statusText = (() => {
    if (gameStatus === 'finished') {
      if (winner === null) return '平局';
      return winner === 'black' ? '黑方胜！' : '白方胜！';
    }
    if (isAIThinking) return 'AI 思考中...';
    if (passCount === 1) return `对方已停手（${currentPlayer === 'black' ? '黑方' : '白方'}走）`;
    return currentPlayer === 'black' ? '轮到黑方（你）' : '轮到白方（AI）';
  })();

  const handleReset = () => {
    resetGame();
    setShowResult(false);
    setShowResignConfirm(false);
  };

  const handleUndo = () => {
    undoMove();
  };

  const handlePass = () => {
    pass();
  };

  const handleResign = () => {
    resign();
    setShowResignConfirm(false);
    // 结果弹窗由 useEffect 在 gameStatus 变化时自动触发
  };

  const canAct = gameStatus === 'playing' && !isAIThinking && currentPlayer === 'black';
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
          onClick={onBackToSetup}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-serif-sc text-sm">返回</span>
        </button>

        <div className="text-center flex-1">
          <h1 className="font-calligraphy text-2xl text-ivory game-title">围棋 囲碁</h1>
        </div>

        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-serif-sc ${
            currentPlayer === 'black'
              ? 'bg-ink/30 text-ivory/80'
              : 'bg-ivory/20 text-ivory'
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              currentPlayer === 'black' ? 'bg-ink' : 'bg-ivory'
            } ${isAIThinking ? 'animate-pulse' : ''}`}
          />
          <span className="hidden sm:inline">{statusText}</span>
          <span className="sm:hidden">{isAIThinking ? 'AI...' : currentPlayer === 'black' ? '黑' : '白'}</span>
        </div>
      </header>

      {/* 棋盘区域 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[620px]">
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

          <WeiqiBoard />

          {/* 提子数 + 步数 */}
          <div className="flex items-center justify-between mt-2 font-serif-sc text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ivory/50">黑提白：</span>
              <span className="text-ivory/80 font-semibold">{captures.black}</span>
            </div>
            <div className="text-ivory/40">第 {history.length} 手{passCount === 1 ? ' · 已停一手' : ''}</div>
            <div className="flex items-center gap-2">
              <span className="text-ivory/80 font-semibold">{captures.white}</span>
              <span className="text-ivory/50">：白提黑</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部控制区 */}
      <footer className="px-4 pb-5 pt-2">
        <div className="max-w-[620px] mx-auto">
          <div className="grid grid-cols-4 gap-2">
            {/* 停一手 */}
            <motion.button
              whileHover={{ scale: canAct ? 1.02 : 1 }}
              whileTap={{ scale: canAct ? 0.98 : 1 }}
              onClick={handlePass}
              disabled={!canAct}
              className="seal-btn seal-btn-secondary py-3 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title="停一手（pass）"
            >
              <Hand size={16} />
              <span className="text-sm">停一手</span>
            </motion.button>

            {/* 悔棋 */}
            <motion.button
              whileHover={{ scale: canUndo ? 1.02 : 1 }}
              whileTap={{ scale: canUndo ? 0.98 : 1 }}
              onClick={handleUndo}
              disabled={!canUndo}
              className="seal-btn seal-btn-secondary py-3 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title="悔棋"
            >
              <Undo2 size={16} />
              <span className="text-sm">悔棋</span>
            </motion.button>

            {/* 认输 */}
            <motion.button
              whileHover={{ scale: canAct ? 1.02 : 1 }}
              whileTap={{ scale: canAct ? 0.98 : 1 }}
              onClick={() => setShowResignConfirm(true)}
              disabled={!canAct}
              className="seal-btn py-3 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(145deg, #654321, #3d2817)', borderColor: '#3d2817' }}
              title="认输"
            >
              <Flag size={16} />
              <span className="text-sm">认输</span>
            </motion.button>

            {/* 重开 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              disabled={isAIThinking}
              className="seal-btn py-3 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title="重新开始"
            >
              <RotateCcw size={16} />
              <span className="text-sm">重开</span>
            </motion.button>
          </div>

          {/* 规则按钮 */}
          <div className="text-center mt-3">
            <button
              onClick={() => setShowRules(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-ivory/60 hover:text-ivory hover:bg-ivory/10 transition-colors font-serif-sc text-xs"
            >
              <BookOpen size={14} />
              <span>围棋规则</span>
            </button>
          </div>
        </div>
      </footer>

      {/* 认输确认弹窗 */}
      <AnimatePresence>
        {showResignConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowResignConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="wood-panel p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative z-10 text-center">
                <h3 className="font-calligraphy text-2xl text-wood-dark mb-4">确认认输</h3>
                <p className="font-serif-sc text-wood-dark/80 mb-6">
                  确定要认输吗？本局将判负。
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowResignConfirm(false)}
                    className="seal-btn seal-btn-secondary px-6 py-2"
                  >
                    取消
                  </button>
                  <button onClick={handleResign} className="seal-btn px-6 py-2">
                    确认认输
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 规则弹窗 */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRules(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="wood-panel p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-calligraphy text-2xl text-wood-dark">围棋规则</h3>
                  <button
                    onClick={() => setShowRules(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-wood-dark/60 hover:text-wood-dark hover:bg-wood-dark/10"
                  >
                    ✕
                  </button>
                </div>
                <div className="font-serif-sc text-wood-dark/80 text-sm space-y-3">
                  <p><strong className="text-vermilion">棋盘：</strong>19x19 交叉点，黑白双方交替落子，黑先。</p>
                  <p><strong className="text-vermilion">气与提子：</strong>与棋子直线相连的空交叉点为"气"。当对方棋块的所有气被堵住时，该棋块被提（移出棋盘）。</p>
                  <p><strong className="text-vermilion">禁着点：</strong>落子后己方棋块无气、且未提走对方任何子时，该点为禁着点，不可落子。</p>
                  <p><strong className="text-vermilion">劫：</strong>不可立即下出与上一手完全相同的棋盘状态。被提单子后，对方下一手不可立即回提该点。</p>
                  <p><strong className="text-vermilion">终局：</strong>双方连续停一手（pass）即终局。</p>
                  <p><strong className="text-vermilion">数子计分：</strong></p>
                  <p className="pl-4">黑方得分 = 黑子数 + 黑围空 + 提白数</p>
                  <p className="pl-4">白方得分 = 白子数 + 白围空 + 提黑数 + 贴目 6.5</p>
                  <p className="pl-4">围空：仅与单一颜色相邻的空区域归属该色。</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 结果弹窗 */}
      {showResult && (
        <WeiqiResultModal
          onClose={() => setShowResult(false)}
          onRestart={handleReset}
        />
      )}
    </motion.div>
  );
}

// ============== 主组件 ==============
interface WeiqiGameProps {
  onBack: () => void;
}

export function WeiqiGame({ onBack }: WeiqiGameProps) {
  const [localScreen, setLocalScreen] = useState<LocalScreen>('setup');
  const { resetGame } = useWeiqiStore();

  const handleStart = () => {
    resetGame();
    setLocalScreen('game');
  };

  const handleBackToSetup = () => {
    setLocalScreen('setup');
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {localScreen === 'setup' ? (
          <motion.div
            key="setup"
            className="min-h-screen flex items-center justify-center py-8 px-4"
          >
            <SetupPage onBack={onBack} onStart={handleStart} />
          </motion.div>
        ) : (
          <WeiqiGameScreen key="game" onBackToSetup={handleBackToSetup} />
        )}
      </AnimatePresence>
    </div>
  );
}
