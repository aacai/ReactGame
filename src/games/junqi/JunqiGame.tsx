// 军棋暗棋（翻棋）游戏页面
// - 自管理内部 screen 状态（setup / game）
// - onBack prop 由父组件传入
// - 包含：设置页、对局页、规则弹窗、结果弹窗
//
// ============================================================================
// 主菜单集成说明（由主进程统一处理，此处仅作记录）
// ============================================================================
//
// 1) 在 src/store/gameStore.ts 的 Screen 联合类型中追加 'junqi'：
//
//    export type Screen =
//      | 'menu'
//      | 'pve-setup'
//      | ...
//      | 'junqi';   // <-- 新增
//
// 2) 在 src/App.tsx 中：
//    - 顶部 import：
//        import { JunqiGame } from './games/junqi/JunqiGame';
//    - 顶层组件 App 中新增 state：
//        const [game, setGame] = useState<'xiangqi' | 'doudizhu' | 'janggi' | 'junqi'>('xiangqi');
//    - 在 renderScreen / AnimatePresence 中新增分支：
//        {game === 'junqi' && (
//          <motion.div key="junqi" ...>
//            <JunqiGame onBack={() => setGame('xiangqi')} />
//          </motion.div>
//        )}
//    - 暴露 onGoToJunqi 回调，向下传递到 MainMenu。
//
// 3) 在 src/components/MainMenu.tsx 中：
//    - 在 MainMenuPage 组件的菜单项列表里添加：
//        <MenuItem
//          icon={<Grid3x3 size={24} />}   // 或其他图标
//          title="军棋暗棋"
//          description="暗棋翻面，军衔较量"
//          onClick={onGoToJunqi}
//          delay={0.62}
//        />
//    - 给 MainMenu 组件新增 prop：onGoToJunqi: () => void
// ============================================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  RotateCcw,
  BookOpen,
  Home,
  Sparkles,
  Monitor,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useJunqiStore } from './store';
import { JunqiBoard } from './JunqiBoard';
import { RANK_NAMES } from './types';
import type { Difficulty } from './store';
import type { MoveHistoryEntry } from './store';

interface JunqiGameProps {
  onBack: () => void;
}

type LocalScreen = 'setup' | 'game';

// ============== 设置页：难度选择 ==============
interface SetupPageProps {
  onBack: () => void;
  onStart: () => void;
}

function SetupPage({ onBack, onStart }: SetupPageProps) {
  const { difficulty, setDifficulty } = useJunqiStore();

  const difficultyOptions: { level: Difficulty; title: string; description: string }[] = [
    { level: 'easy', title: '初级', description: '随机走棋' },
    { level: 'medium', title: '中级', description: '优先吃子' },
    { level: 'hard', title: '高级', description: '动作评估' },
  ];

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
        <h2 className="font-calligraphy text-4xl text-ivory flex-1 text-center pr-16">军棋暗棋</h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-8"
      >
        <p className="font-serif-sc text-ivory/70 text-sm leading-relaxed">
          4×8 棋盘，32 子扣置<br />
          翻开第一子决定阵营，吃对方军旗即胜
        </p>
      </motion.div>

      <div className="space-y-6">
        <div className="wood-panel p-6 rounded-2xl">
          <div className="relative z-10">
            <h4 className="font-calligraphy text-2xl text-wood-dark text-center mb-5">选择难度</h4>
            <div className="grid grid-cols-3 gap-3">
              {difficultyOptions.map((opt) => {
                const isSelected = difficulty === opt.level;
                const colors = {
                  easy: { ring: 'ring-emerald-400', shadow: 'shadow-emerald-500/40' },
                  medium: { ring: 'ring-amber-400', shadow: 'shadow-amber-500/40' },
                  hard: { ring: 'ring-rose-400', shadow: 'shadow-rose-500/40' },
                }[opt.level];
                return (
                  <motion.button
                    key={opt.level}
                    whileHover={{ scale: isSelected ? 1 : 1.03, y: isSelected ? 0 : -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setDifficulty(opt.level)}
                    className={`relative p-4 rounded-xl text-center transition-all duration-300 ${
                      isSelected ? `ring-4 ${colors.ring} shadow-2xl ${colors.shadow}` : 'hover:shadow-lg'
                    }`}
                    style={{
                      background: isSelected
                        ? `linear-gradient(145deg, ${
                            opt.level === 'easy'
                              ? '#059669, #065f46'
                              : opt.level === 'medium'
                              ? '#d97706, #92400e'
                              : '#be123c, #881337'
                          })`
                        : 'rgba(222, 184, 135, 0.5)',
                      border: isSelected ? 'none' : '2px solid #8B4513',
                    }}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-calligraphy text-2xl mb-2 ${
                        isSelected ? 'bg-ivory/20 text-ivory' : 'bg-wood-dark/20 text-wood-dark'
                      }`}
                    >
                      {opt.level === 'easy' ? '初' : opt.level === 'medium' ? '中' : '高'}
                    </div>
                    <div className={`font-calligraphy text-lg ${isSelected ? 'text-ivory' : 'text-wood-dark'}`}>
                      {opt.title}
                    </div>
                    <div className={`text-xs font-serif-sc ${isSelected ? 'text-ivory/70' : 'text-wood-dark/60'}`}>
                      {opt.description}
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute top-2 right-2"
                      >
                        <div className="w-5 h-5 rounded-full bg-ivory flex items-center justify-center">
                          <Sparkles size={12} className="text-amber-600" />
                        </div>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
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
          className="w-full seal-btn text-2xl py-5 flex items-center justify-center gap-3"
        >
          <Monitor size={22} />
          开始游戏
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============== 规则弹窗 ==============
function JunqiRulesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
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
                <h3 className="font-calligraphy text-2xl text-wood-dark">军棋暗棋规则</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-wood-dark/60 hover:text-wood-dark hover:bg-wood-dark/10"
                >
                  ✕
                </button>
              </div>
              <div className="font-serif-sc text-wood-dark/80 text-sm space-y-3">
                <p><strong className="text-vermilion">棋盘：</strong>4 列 × 8 行，共 32 格，32 子随机扣置。</p>
                <p><strong className="text-vermilion">阵营：</strong>红蓝两方各 16 子。第一手翻棋决定玩家阵营（翻到红则玩家为红方）。</p>
                <p><strong className="text-vermilion">行动：</strong>每回合可选择：① 翻开一个未翻开的棋子；② 移动一枚己方已翻开的棋子（一格上下左右）。</p>
                <p><strong className="text-vermilion">棋子等级：</strong>司令(40) &gt; 军长(39) &gt; 师长(38) &gt; 旅长(37) &gt; 团长(36) &gt; 营长(35) &gt; 连长(34) &gt; 排长(33) &gt; 工兵(32)。</p>
                <p><strong className="text-vermilion">战斗规则：</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>大子吃小子，同级同归于尽</li>
                  <li>炸弹：碰任何棋子（含军旗）同归于尽</li>
                  <li>地雷：不能移动；工兵可挖（工兵活、地雷死）</li>
                  <li>其他棋子碰地雷：攻击方死</li>
                  <li>军旗：不能移动；被吃则该方失败</li>
                </ul>
                <p><strong className="text-vermilion">胜利条件：</strong>吃掉对方军旗，或对方无棋可走。</p>
                <p><strong className="text-vermilion">注意：</strong>已翻开的棋子才能移动/被攻击；未翻开的棋子不可被攻击。</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============== 结果弹窗 ==============
function JunqiResultModal() {
  const { gameStatus, winner, playerColor, winReason, resetGame } = useJunqiStore();
  const [showModal, setShowModal] = useState(false);

  // 游戏结束时延迟弹出
  useEffect(() => {
    if (gameStatus !== 'playing') {
      const t = setTimeout(() => setShowModal(true), 400);
      return () => clearTimeout(t);
    } else {
      setShowModal(false);
    }
  }, [gameStatus]);

  const isDraw = gameStatus === 'draw';
  const isPlayerWin = winner !== null && playerColor !== null && winner === playerColor;

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="wood-panel p-8 max-w-md w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: isDraw
                    ? 'linear-gradient(135deg, #8B4513, #654321)'
                    : isPlayerWin
                    ? 'radial-gradient(circle at 30% 30%, #6a6a6a, #000)'
                    : 'radial-gradient(circle at 30% 30%, #ffffff, #c8c2b0)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <span
                  className="font-calligraphy text-3xl"
                  style={{
                    color: isDraw ? '#FFFFF0' : isPlayerWin ? '#FFD700' : '#B22222',
                  }}
                >
                  {isDraw ? '和' : isPlayerWin ? '胜' : '负'}
                </span>
              </motion.div>

              <h2 className="font-calligraphy text-4xl text-wood-dark mb-2">
                {isDraw ? '平局' : isPlayerWin ? '胜利' : '失败'}
              </h2>

              <p className="font-serif-sc text-wood-dark/70 mb-2">
                {isDraw
                  ? '双方僵持，难分胜负'
                  : isPlayerWin
                  ? '恭喜你战胜了 AI！'
                  : '再接再厉，下次定能取胜'}
              </p>

              {winReason && (
                <p className="font-serif-sc text-wood-dark/60 text-sm mb-6">
                  原因：{winReason}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowModal(false)}
                  className="flex-1 seal-btn seal-btn-secondary py-3"
                >
                  看棋盘
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    resetGame();
                    setShowModal(false);
                  }}
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

// ============== 走棋记录面板 ==============
function MoveHistoryPanel() {
  const { history } = useJunqiStore();

  return (
    <div className="wood-panel p-3 flex-1 min-h-0 flex flex-col">
      <div className="relative z-10 flex flex-col h-full min-h-0">
        <h2 className="font-calligraphy text-xl text-wood-dark text-center mb-2">行动记录</h2>
        <div className="overflow-y-auto pr-1 max-h-[180px] lg:max-h-[400px] scrollbar-classic">
          {history.length === 0 ? (
            <div className="text-center text-wood-dark/50 font-serif-sc py-6 text-sm">
              暂无记录
            </div>
          ) : (
            <div className="space-y-1">
              {history.map((move, i) => (
                <HistoryItem key={i} index={i + 1} move={move} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryItem({ index, move }: { index: number; move: MoveHistoryEntry }) {
  const isPlayer = move.player === 'human';
  const colorLabel = move.color === 'red' ? '红' : move.color === 'blue' ? '蓝' : '?';
  const colorClass = move.color === 'red' ? 'text-vermilion' : move.color === 'blue' ? 'text-blue-700' : 'text-wood-dark/50';

  let text = '';
  if (move.type === 'flip' && move.flippedPiece) {
    const pieceName = RANK_NAMES[move.flippedPiece.rank];
    text = `翻开 ${pieceName}`;
  } else if (move.type === 'move' && move.piece) {
    const pieceName = RANK_NAMES[move.piece.rank];
    if (move.capturedPiece) {
      const capturedName = RANK_NAMES[move.capturedPiece.rank];
      text = `${pieceName} 吃 ${capturedName}`;
    } else {
      text = `${pieceName} 移动`;
    }
  }

  return (
    <motion.div
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`flex items-center gap-2 px-2 py-1.5 rounded ${
        isPlayer ? 'bg-vermilion/10' : 'bg-blue-500/10'
      }`}
    >
      <span className="font-serif-sc text-wood-dark/50 text-xs w-7 shrink-0">{index}.</span>
      <span className={`font-serif-sc text-xs font-medium ${colorClass}`}>
        {isPlayer ? '你' : 'AI'}({colorLabel})
      </span>
      <span className="font-serif-sc text-wood-dark/80 text-xs flex-1 truncate">{text}</span>
      {move.capturedPiece && (
        <span className="text-xs text-vermilion/70 font-serif-sc shrink-0">吃</span>
      )}
    </motion.div>
  );
}

// ============== 对局页 ==============
function JunqiGameScreen({ onBackToSetup }: { onBackToSetup: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const {
    currentPlayer,
    playerColor,
    gameStatus,
    isAIThinking,
    resetGame,
    history,
  } = useJunqiStore();

  // 状态文字
  const getStatusText = () => {
    if (gameStatus !== 'playing') {
      return gameStatus === 'draw' ? '平局' : '游戏结束';
    }
    if (playerColor === null) {
      return '翻开一颗棋子决定你的阵营';
    }
    if (isAIThinking) return 'AI 思考中...';
    if (currentPlayer === 'human') return '轮到你';
    return 'AI 回合';
  };

  const statusText = getStatusText();

  // 顶部状态指示器的颜色和文字
  const indicatorInfo = (() => {
    if (playerColor === null) {
      return { color: '#A0A0A0', label: '?', bg: 'bg-ivory/20 text-ivory' };
    }
    const isHumanTurn = currentPlayer === 'human';
    const color = isHumanTurn ? playerColor : (playerColor === 'red' ? 'blue' : 'red');
    if (color === 'red') {
      return { color: '#B22222', label: '红', bg: 'bg-vermilion/20 text-vermilion' };
    }
    return { color: '#1E40AF', label: '蓝', bg: 'bg-blue-500/20 text-blue-300' };
  })();

  const handleReset = () => {
    resetGame();
  };

  const handleBack = () => {
    resetGame();
    onBackToSetup();
  };

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
            <ChevronLeft size={20} />
            <span className="font-serif-sc text-sm">返回</span>
          </button>

          <div className="text-center flex-1">
            <h1 className="font-calligraphy text-2xl text-ivory">军棋暗棋</h1>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-serif-sc ${indicatorInfo.bg}`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${isAIThinking ? 'animate-pulse' : ''}`}
              style={{ background: indicatorInfo.color }}
            />
            <span className="hidden sm:inline">{statusText}</span>
            <span className="sm:hidden">
              {isAIThinking ? 'AI...' : playerColor === null ? '?' : indicatorInfo.label}
            </span>
          </div>
        </header>

        {/* 主体：左侧控制 + 中间棋盘 */}
        <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-8 p-4">
          {/* 棋盘（移动端在上，桌面端在中） */}
          <div className="w-full max-w-[400px] order-1 lg:order-2 flex-shrink-0">
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

            {/* 棋盘容器：固定 4:8 比例 */}
            <div className="w-full" style={{ aspectRatio: '4 / 8' }}>
              <JunqiBoard />
            </div>

            {/* 步数 */}
            <div className="text-center mt-2 font-serif-sc text-ivory/40 text-xs">
              第 {history.length} 手
            </div>
          </div>

          {/* 控制面板 */}
          <div className="w-full lg:w-64 order-2 lg:order-1">
            <div className="lg:sticky lg:top-4 flex flex-col gap-3">
              <div className="wood-panel p-3">
                <div className="relative z-10">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handleReset}
                      disabled={isAIThinking}
                      className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                    >
                      <RotateCcw size={16} />
                      <span>重开</span>
                    </button>
                    <button
                      onClick={() => setShowRules(true)}
                      className="seal-btn seal-btn-secondary text-sm py-2 flex items-center justify-center gap-1"
                    >
                      <BookOpen size={16} />
                      <span>规则</span>
                    </button>
                    <button
                      onClick={handleBack}
                      disabled={isAIThinking}
                      className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                      style={{ background: 'linear-gradient(145deg, #4A7C59, #2d5a3d)', borderColor: '#2d5a3d' }}
                    >
                      <Home size={16} />
                      <span>菜单</span>
                    </button>
                  </div>

                  {/* 阵营信息 */}
                  {playerColor !== null && (
                    <div className="mt-3 text-center">
                      <span className="font-serif-sc text-wood-dark/70 text-xs">你的阵营：</span>
                      <span
                        className={`font-calligraphy text-lg ml-2 ${
                          playerColor === 'red' ? 'text-vermilion' : 'text-blue-700'
                        }`}
                      >
                        {playerColor === 'red' ? '红方' : '蓝方'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <MoveHistoryPanel />
            </div>
          </div>
        </div>
      </div>

      <JunqiRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <JunqiResultModal />
    </motion.div>
  );
}

// ============== 主组件 ==============
export function JunqiGame({ onBack }: JunqiGameProps) {
  const [localScreen, setLocalScreen] = useState<LocalScreen>('setup');
  const { startGame } = useJunqiStore();

  const handleStart = () => {
    startGame();
    setLocalScreen('game');
  };

  const handleBackToSetup = () => {
    setLocalScreen('setup');
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {localScreen === 'setup' && (
          <motion.div
            key="setup"
            className="min-h-screen flex items-center justify-center py-8 px-4"
          >
            <SetupPage onBack={onBack} onStart={handleStart} />
          </motion.div>
        )}
        {localScreen === 'game' && (
          <JunqiGameScreen key="game" onBackToSetup={handleBackToSetup} />
        )}
      </AnimatePresence>
    </div>
  );
}
