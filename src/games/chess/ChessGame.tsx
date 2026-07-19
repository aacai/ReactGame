// 国际象棋游戏页面
// 自管理内部 screen 状态（参考韩国象棋 JanggiGame.tsx 的模式）
// 包含：设置页（难度/颜色）、对局页（棋盘+控制面板）、结果弹窗
// onBack prop 返回主菜单
// 顶部：返回按钮 + 标题 + 当前轮次
// 底部：悔棋/重新开始/难度选择
//
// ============================================================================
// 主菜单集成说明（其他并行任务可能也在修改主菜单，故仅以注释形式给出集成代码）
// ============================================================================
//
// 1) 在 src/store/gameStore.ts 的 Screen 联合类型中追加 'chess'：
//
//    export type Screen =
//      | 'menu'
//      | 'pve-setup'
//      | 'online-setup'
//      | 'watch-settings'
//      | 'endgame-select'
//      | 'settings'
//      | 'about'
//      | 'waiting'
//      | 'game'
//      | 'janggi'
//      | 'chess';   // <-- 新增
//
// 2) 在 src/App.tsx 中：
//    - 顶部 import：
//        import { ChessGame } from './games/chess/ChessGame';
//    - 顶层组件 App 中新增 state：
//        const [game, setGame] = useState<'xiangqi' | 'doudizhu' | 'janggi' | 'chess'>('xiangqi');
//    - 在 renderScreen / AnimatePresence 中新增分支：
//        {game === 'chess' && (
//          <motion.div key="chess" ...>
//            <ChessGame onBack={() => setGame('xiangqi')} />
//          </motion.div>
//        )}
//    - 暴露 onGoToChess 回调，向下传递到 MainMenu。
//
// 3) 在 src/components/MainMenu.tsx 中：
//    - 在 MainMenuPage 组件的菜单项列表里（"韩国象棋"入口之后）添加：
//
//        <MenuItem
//          icon={<Crown size={24} />}
//          title="国际象棋"
//          description="Chess · 64格经典棋类"
//          onClick={onGoToChess}
//          delay={0.7}
//        />
//
//    - 给 MainMenu 组件新增 prop：onGoToChess: () => void
// ============================================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
  Crown,
  Flag,
  Sparkles,
} from 'lucide-react';
import { useChessStore } from './store';
import { ChessBoard } from './ChessBoard';
import { PIECE_NAMES } from './types';
import type { PieceColor } from './types';
import type { Difficulty } from './store';

type LocalScreen = 'menu' | 'setup' | 'game';

// ============== 设置页：难度选择 ==============
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
      className={`relative w-full p-4 rounded-2xl text-left transition-all duration-300 ${
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
          className={`w-14 h-14 rounded-full flex items-center justify-center font-calligraphy text-2xl mb-2 ${
            isSelected ? 'bg-ivory/20 text-ivory' : 'bg-wood-dark/20 text-wood-dark'
          }`}
        >
          {level === 'easy' ? '初' : level === 'medium' ? '中' : '高'}
        </div>
        <h4 className={`font-calligraphy text-xl mb-1 ${isSelected ? 'text-ivory' : 'text-wood-dark'}`}>{title}</h4>
        <p className={`font-serif-sc text-xs ${isSelected ? 'text-ivory/80' : 'text-wood-dark/60'}`}>{description}</p>
      </div>
      {isSelected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-2 right-2"
        >
          <div className="w-6 h-6 rounded-full bg-ivory flex items-center justify-center shadow-lg">
            <Sparkles size={14} className={level === 'easy' ? 'text-emerald-600' : level === 'medium' ? 'text-amber-600' : 'text-rose-600'} />
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}

// ============== 颜色选择 ==============
interface ColorSelectProps {
  selected: PieceColor;
  onChange: (color: PieceColor) => void;
}

function ColorSelect({ selected, onChange }: ColorSelectProps) {
  // 国际象棋中白方先手；这里实际玩家固定为白方（AI 执黑）
  // 颜色选择用于"先后手"，但 chess 中白方总是先手，因此颜色实际意义不大
  // 这里保留颜色选择，但仅做样式展示
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="wood-panel p-5 rounded-2xl"
    >
      <div className="relative z-10">
        <h4 className="font-calligraphy text-xl text-wood-dark text-center mb-3">选择执子</h4>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: selected === 'white' ? 1 : 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange('white')}
            className={`p-3 rounded-xl transition-all duration-300 ${
              selected === 'white' ? 'ring-4 ring-amber-300 shadow-xl shadow-amber-400/30' : 'hover:shadow-lg'
            }`}
            style={{
              background:
                selected === 'white'
                  ? 'linear-gradient(145deg, #4A7C59, #2d5a3d)'
                  : 'linear-gradient(145deg, rgba(222, 184, 135, 0.9), rgba(196, 149, 106, 0.9))',
              border: selected === 'white' ? 'none' : '2px solid #8B4513',
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-1"
                style={{
                  background:
                    selected === 'white'
                      ? 'rgba(255, 255, 240, 0.2)'
                      : 'radial-gradient(circle at 30% 30%, #FFFFF0, #E8D4A8)',
                  color: selected === 'white' ? '#FFFFF0' : '#1a1a1a',
                  fontSize: '1.75rem',
                  textShadow: selected === 'white'
                    ? '0 0 2px #000, 0 0 2px #000, 0 0 2px #000'
                    : '0 0 1px #000',
                  border: '1px solid rgba(0,0,0,0.2)',
                }}
              >
                ♔
              </div>
              <span className={`font-serif-sc font-semibold text-sm ${selected === 'white' ? 'text-ivory' : 'text-wood-dark'}`}>
                白方（先手）
              </span>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: selected === 'black' ? 1 : 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange('black')}
            className={`p-3 rounded-xl transition-all duration-300 ${
              selected === 'black' ? 'ring-4 ring-amber-300 shadow-xl shadow-amber-400/30' : 'hover:shadow-lg'
            }`}
            style={{
              background:
                selected === 'black'
                  ? 'linear-gradient(145deg, #4A7C59, #2d5a3d)'
                  : 'linear-gradient(145deg, rgba(222, 184, 135, 0.9), rgba(196, 149, 106, 0.9))',
              border: selected === 'black' ? 'none' : '2px solid #8B4513',
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-1"
                style={{
                  background:
                    selected === 'black'
                      ? 'rgba(255, 255, 240, 0.2)'
                      : 'radial-gradient(circle at 30% 30%, #FFFFF0, #E8D4A8)',
                  color: selected === 'black' ? '#FFFFF0' : '#1a1a1a',
                  fontSize: '1.75rem',
                  textShadow: '0 0 1px #000',
                  border: '1px solid rgba(0,0,0,0.2)',
                }}
              >
                ♚
              </div>
              <span className={`font-serif-sc font-semibold text-sm ${selected === 'black' ? 'text-ivory' : 'text-wood-dark'}`}>
                黑方（后手）
              </span>
            </div>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ============== 设置页 ==============
interface SetupPageProps {
  onBack: () => void;
  onStart: () => void;
}

function SetupPage({ onBack, onStart }: SetupPageProps) {
  const { difficulty, setDifficulty, playerColor, setPlayerColor } = useChessStore();

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
        <h2 className="font-calligraphy text-4xl text-ivory flex-1 text-center pr-16">国际象棋</h2>
      </div>

      <div className="space-y-5">
        <div className="wood-panel p-5 rounded-2xl">
          <div className="relative z-10">
            <h4 className="font-calligraphy text-xl text-wood-dark text-center mb-4">选择难度</h4>
            <div className="grid grid-cols-3 gap-3">
              <DifficultyCard
                level="easy"
                title="初级"
                description="深度1"
                isSelected={difficulty === 'easy'}
                onClick={() => setDifficulty('easy')}
              />
              <DifficultyCard
                level="medium"
                title="中级"
                description="深度2"
                isSelected={difficulty === 'medium'}
                onClick={() => setDifficulty('medium')}
              />
              <DifficultyCard
                level="hard"
                title="高级"
                description="深度3"
                isSelected={difficulty === 'hard'}
                onClick={() => setDifficulty('hard')}
              />
            </div>
          </div>
        </div>

        <ColorSelect selected={playerColor} onChange={setPlayerColor} />

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="w-full seal-btn text-2xl py-5"
        >
          开始游戏
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============== 结果弹窗 ==============
function ChessResultModal() {
  const { gameStatus, winner, resetGame, playerColor } = useChessStore();

  const isVisible = gameStatus !== 'playing';

  // 判断玩家是否获胜（玩家执白）
  const isPlayerWin = winner === playerColor;
  const isStalemate = gameStatus === 'stalemate';
  const isResigned = gameStatus === 'resigned';

  // 获取胜负原因
  const getReason = (): string => {
    switch (gameStatus) {
      case 'checkmate':
        return '将杀';
      case 'stalemate':
        return '逼和';
      case 'resigned':
        return '认输';
      default:
        return '';
    }
  };

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
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="wood-panel p-8 max-w-md w-full text-center"
          >
            <div className="relative z-10">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
                <div
                  className="inline-block px-8 py-4 rounded-lg"
                  style={{
                    background: isStalemate
                      ? 'linear-gradient(145deg, #8B4513, #654321)'
                      : isPlayerWin
                      ? 'linear-gradient(145deg, #4A7C59, #2d5a3d)'
                      : 'linear-gradient(145deg, #B22222, #8B0000)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <span
                    className="font-calligraphy text-5xl"
                    style={{ color: '#FFFFF0', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}
                  >
                    {isStalemate ? '和 棋' : isPlayerWin ? '你赢了' : 'AI 获胜'}
                  </span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-8">
                <p className="font-serif-sc text-wood-dark/80 text-lg">
                  {isStalemate ? '逼和：无棋可走但未被将军' : isResigned ? `AI 获胜：${getReason()}` : `${getReason()}`}
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex justify-center gap-4">
                <button onClick={resetGame} className="seal-btn text-lg px-8 py-3">
                  再来一局
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============== 对局页 ==============
function ChessGameScreen({ onBackToSetup }: { onBackToSetup: () => void }) {
  const {
    currentPlayer,
    inCheck,
    gameStatus,
    isAIThinking,
    difficulty,
    setDifficulty,
    undoMove,
    resetGame,
    backToMenu,
    soundEnabled,
    toggleSound,
    history,
    resign,
  } = useChessStore();

  const [showResignConfirm, setShowResignConfirm] = useState(false);

  // 顶部当前轮次提示
  const statusText = (() => {
    if (gameStatus !== 'playing') {
      if (gameStatus === 'checkmate') return '将杀！';
      if (gameStatus === 'stalemate') return '逼和';
      if (gameStatus === 'resigned') return '已认输';
      return '';
    }
    if (isAIThinking) return 'AI 思考中...';
    return currentPlayer === 'white' ? '白方走棋（你）' : '黑方走棋（AI）';
  })();

  const handleBack = () => {
    backToMenu();
    onBackToSetup();
  };

  const canUndo = history.length > 0 && !isAIThinking && gameStatus === 'playing';

  // 难度选项
  const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
    { value: 'easy', label: '初级' },
    { value: 'medium', label: '中级' },
    { value: 'hard', label: '高级' },
  ];

  // 走棋记录显示
  const moveHistory = history.map((h, i) => {
    const pieceName = h.promotion
      ? PIECE_NAMES[h.piece.color][h.promotion]
      : PIECE_NAMES[h.piece.color][h.piece.type];
    const fromFile = String.fromCharCode(97 + h.from.col);
    const fromRank = 8 - h.from.row;
    const toFile = String.fromCharCode(97 + h.to.col);
    const toRank = 8 - h.to.row;
    const captured = h.captured ? PIECE_NAMES[h.captured.color][h.captured.type] : undefined;
    const annotation = h.isCastling ? 'O-O' : h.isEnPassant ? 'e.p.' : '';
    return {
      index: i + 1,
      player: h.currentPlayerBefore,
      pieceName,
      notation: `${fromFile}${fromRank}→${toFile}${toRank}`,
      captured,
      annotation,
    };
  });

  // 棋盘上方的状态指示
  const checkedPlayer = inCheck && gameStatus === 'playing' ? currentPlayer : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen relative"
    >
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* 顶部栏 */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-ivory/10">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
          >
            <span className="text-lg">←</span>
            <span className="font-serif-sc text-sm">返回</span>
          </button>

          <div className="text-center flex-1">
            <h1 className="font-calligraphy text-2xl text-ivory flex items-center justify-center gap-2">
              <Crown size={22} />
              国际象棋
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
              title={soundEnabled ? '关闭音效' : '开启音效'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-serif-sc ${
                currentPlayer === 'white' ? 'bg-ivory/20 text-ivory' : 'bg-ink/30 text-ivory/80'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  currentPlayer === 'white' ? 'bg-ivory' : 'bg-ink'
                } ${isAIThinking ? 'animate-pulse' : ''}`}
              />
              <span className="hidden sm:inline">
                {isAIThinking ? 'AI 思考中' : currentPlayer === 'white' ? '白方走棋' : '黑方走棋'}
              </span>
              <span className="sm:hidden">{isAIThinking ? '...' : currentPlayer === 'white' ? '白' : '黑'}</span>
            </div>
          </div>
        </header>

        {/* 主体：棋盘 + 侧栏 */}
        <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-8 p-4">
          {/* 棋盘区域 */}
          <div className="w-full max-w-[600px] order-1 flex-shrink-0">
            <div className="text-center mb-3 h-8">
              <AnimatePresence>
                {checkedPlayer && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="inline-block animate-check-flash font-calligraphy text-2xl text-vermilion font-bold"
                    style={{ textShadow: '0 0 15px rgba(178, 34, 34, 0.5)' }}
                  >
                    将 军！
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {isAIThinking && gameStatus === 'playing' && !checkedPlayer && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                    style={{ background: 'rgba(26, 26, 26, 0.15)' }}
                  >
                    <motion.div
                      className="w-2.5 h-2.5 rounded-full bg-ink"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                    <span className="font-serif-sc text-ivory/70 text-sm">{statusText}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ChessBoard />

            <div className="text-center mt-2 font-serif-sc text-ivory/40 text-xs">
              第 {Math.ceil((history.length + 1) / 2)} 回合 · 已走 {history.length} 步
            </div>
          </div>

          {/* 侧边控制面板 */}
          <div className="w-full lg:w-72 order-2">
            <div className="lg:sticky lg:top-4 space-y-3">
              {/* 难度选择 */}
              <div className="wood-panel p-3">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-wood-dark" />
                    <h4 className="font-calligraphy text-lg text-wood-dark">难度</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <motion.button
                        key={opt.value}
                        whileHover={{ scale: difficulty === opt.value ? 1 : 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setDifficulty(opt.value)}
                        className={`py-2 rounded-lg font-serif-sc text-sm transition-all ${
                          difficulty === opt.value
                            ? 'bg-vermilion text-ivory shadow-lg shadow-vermilion/30'
                            : 'bg-wood-dark/10 text-wood-dark hover:bg-wood-dark/20'
                        }`}
                      >
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="wood-panel p-3">
                <div className="relative z-10 grid grid-cols-3 gap-2">
                  <button
                    onClick={undoMove}
                    disabled={!canUndo}
                    className="seal-btn seal-btn-secondary text-sm py-2 flex items-center justify-center gap-1"
                  >
                    <Undo2 size={16} />
                    <span>悔棋</span>
                  </button>
                  <button
                    onClick={resetGame}
                    disabled={isAIThinking}
                    className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                  >
                    <RotateCcw size={16} />
                    <span>重开</span>
                  </button>
                  <button
                    onClick={() => setShowResignConfirm(true)}
                    disabled={!canUndo}
                    className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                    style={{ background: 'linear-gradient(145deg, #654321, #3d2817)', borderColor: '#3d2817' }}
                  >
                    <Flag size={16} />
                    <span>认输</span>
                  </button>
                </div>
              </div>

              {/* 走棋记录 */}
              <div className="wood-panel p-3 flex-1 min-h-0 flex flex-col">
                <div className="relative z-10 flex flex-col h-full min-h-0">
                  <h2 className="font-calligraphy text-xl text-wood-dark text-center mb-2">棋谱记录</h2>
                  <div className="overflow-y-auto pr-1 max-h-[200px] lg:max-h-[400px] scrollbar-classic">
                    {moveHistory.length === 0 ? (
                      <div className="text-center text-wood-dark/50 font-serif-sc py-6 text-sm">暂无走棋记录</div>
                    ) : (
                      <div className="space-y-1">
                        {moveHistory.map((move) => (
                          <motion.div
                            key={move.index}
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded ${
                              move.player === 'white' ? 'bg-ivory/10' : 'bg-ink/20'
                            }`}
                          >
                            <span className="font-serif-sc text-wood-dark/50 text-xs w-5 shrink-0">{move.index}.</span>
                            <span
                              className={`font-serif-sc font-medium text-xs ${
                                move.player === 'white' ? 'text-ivory' : 'text-ivory/70'
                              }`}
                            >
                              {move.pieceName} {move.notation}
                              {move.annotation && <span className="ml-1 text-amber-500">{move.annotation}</span>}
                            </span>
                            {move.captured && (
                              <span className="ml-auto text-xs text-wood-dark/50 font-serif-sc shrink-0">吃{move.captured}</span>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  确定要认输吗？AI 将获胜。
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setShowResignConfirm(false)} className="seal-btn seal-btn-secondary">
                    取消
                  </button>
                  <button
                    onClick={() => {
                      resign();
                      setShowResignConfirm(false);
                    }}
                    className="seal-btn"
                  >
                    确认认输
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChessResultModal />
    </motion.div>
  );
}

// ============== 内部主菜单（玩家先选择） ==============
interface ChessMainMenuProps {
  onBack: () => void;
  onPveSetup: () => void;
}

function ChessMainMenu({ onBack, onPveSetup }: ChessMainMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
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
      </div>

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-10"
      >
        <h1
          className="font-calligraphy text-6xl md:text-7xl text-ivory mb-4"
          style={{ textShadow: '0 4px 12px rgba(0,0,0,0.6), 0 0 60px rgba(218, 165, 32, 0.4)' }}
        >
          国际象棋
        </h1>
        <p className="font-serif-sc text-ivory/70 text-lg tracking-[0.3em]">Chess · 64格经典</p>
        <div className="mt-5 flex justify-center gap-2">
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-amber-400" />
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-amber-400" />
        </div>
      </motion.div>

      <div className="space-y-3">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPveSetup}
          className="w-full text-left p-4 rounded-xl wood-panel"
        >
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-600 text-ivory shadow-lg shadow-amber-600/30">
              <Crown size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-calligraphy text-2xl text-wood-dark">人机对战</h3>
              <p className="font-serif-sc text-wood-dark/70 text-sm mt-0.5">挑战电脑 AI</p>
            </div>
            <ChevronRight size={24} className="text-wood-dark/40" />
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============== 主组件 ==============
interface ChessGameProps {
  onBack: () => void;
}

export function ChessGame({ onBack }: ChessGameProps) {
  const [localScreen, setLocalScreen] = useState<LocalScreen>('menu');
  const { startGame, resetGame } = useChessStore();

  const handleStart = () => {
    resetGame();
    startGame();
    setLocalScreen('game');
  };

  const handleBackToSetup = () => {
    setLocalScreen('menu');
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {localScreen === 'menu' && (
          <motion.div key="menu" className="min-h-screen flex items-center justify-center py-8 px-4">
            <ChessMainMenu
              onBack={onBack}
              onPveSetup={() => setLocalScreen('setup')}
            />
          </motion.div>
        )}
        {localScreen === 'setup' && (
          <motion.div key="setup" className="min-h-screen flex items-center justify-center py-8 px-4">
            <SetupPage onBack={() => setLocalScreen('menu')} onStart={handleStart} />
          </motion.div>
        )}
        {localScreen === 'game' && (
          <ChessGameScreen key="game" onBackToSetup={handleBackToSetup} />
        )}
      </AnimatePresence>
    </div>
  );
}
