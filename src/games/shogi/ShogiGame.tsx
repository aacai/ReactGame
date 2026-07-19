// 日本将棋游戏页面
// 自管理内部 screen 状态（'menu' | 'pve-setup' | 'watch-settings' | 'game'）
// 接收 onBack prop 返回主菜单（由父组件挂载到 App.tsx，本文件不修改 App.tsx）
// 参考 janggi/JanggiGame.tsx 结构，针对将棋的 sente/gote 颜色与持驹/升变特性调整

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Home,
  Flag,
  Sparkles,
  Gauge,
  Monitor,
  Eye,
  Volume2,
  VolumeX,
  BookOpen,
} from 'lucide-react';
import { useShogiStore } from './store';
import { ShogiBoard } from './ShogiBoard';
import { PIECE_NAMES } from './types';
import type { PieceColor } from './types';
import type { Difficulty, AutoPlaySpeed } from './store';

type LocalScreen = 'menu' | 'pve-setup' | 'watch-settings' | 'game';

// ============== 难度卡片 ==============
interface DifficultyCardProps {
  level: Difficulty;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

function DifficultyCard({ level, title, description, isSelected, onClick }: DifficultyCardProps) {
  // 三档难度对应的配色：绿/琥珀/玫红
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
        <h4 className={`font-calligraphy text-xl mb-1 ${isSelected ? 'text-ivory' : 'text-wood-dark'}`}>
          {title}
        </h4>
        <p className={`font-serif-sc text-xs ${isSelected ? 'text-ivory/80' : 'text-wood-dark/60'}`}>
          {description}
        </p>
      </div>
      {isSelected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-2 right-2"
        >
          <div className="w-6 h-6 rounded-full bg-ivory flex items-center justify-center shadow-lg">
            <Sparkles
              size={14}
              className={level === 'easy' ? 'text-emerald-600' : level === 'medium' ? 'text-amber-600' : 'text-rose-600'}
            />
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="wood-panel p-5 rounded-2xl"
    >
      <div className="relative z-10">
        <h4 className="font-calligraphy text-xl text-wood-dark text-center mb-4">选择先后手</h4>
        <div className="grid grid-cols-2 gap-3">
          {/* 先手 sente */}
          <motion.button
            whileHover={{ scale: selected === 'sente' ? 1 : 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange('sente')}
            className={`p-3 rounded-xl transition-all duration-300 ${
              selected === 'sente' ? 'ring-4 ring-vermilion shadow-xl shadow-vermilion/30' : 'hover:shadow-lg'
            }`}
            style={{
              background:
                selected === 'sente'
                  ? 'linear-gradient(145deg, #B22222, #8B0000)'
                  : 'linear-gradient(145deg, rgba(222, 184, 135, 0.9), rgba(196, 149, 106, 0.9))',
              border: selected === 'sente' ? 'none' : '2px solid #8B4513',
            }}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-10 h-10 flex items-center justify-center font-bold"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%)',
                  background:
                    selected === 'sente'
                      ? 'rgba(255, 255, 240, 0.3)'
                      : 'linear-gradient(180deg, #F5E6C8, #D4B896)',
                  color: selected === 'sente' ? '#FFFFF0' : '#1a1a1a',
                }}
              >
                <span style={{ fontFamily: "'Noto Serif SC', serif" }}>歩</span>
              </div>
              <span className={`font-serif-sc font-semibold text-sm ${selected === 'sente' ? 'text-ivory' : 'text-wood-dark'}`}>
                先手（sente）
              </span>
            </div>
          </motion.button>

          {/* 后手 gote */}
          <motion.button
            whileHover={{ scale: selected === 'gote' ? 1 : 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange('gote')}
            className={`p-3 rounded-xl transition-all duration-300 ${
              selected === 'gote' ? 'ring-4 ring-blue-500 shadow-xl shadow-blue-500/30' : 'hover:shadow-lg'
            }`}
            style={{
              background:
                selected === 'gote'
                  ? 'linear-gradient(145deg, #1E40AF, #1E3A8A)'
                  : 'linear-gradient(145deg, rgba(222, 184, 135, 0.9), rgba(196, 149, 106, 0.9))',
              border: selected === 'gote' ? 'none' : '2px solid #8B4513',
            }}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-10 h-10 flex items-center justify-center font-bold"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%)',
                  background:
                    selected === 'gote'
                      ? 'rgba(255, 255, 240, 0.3)'
                      : 'linear-gradient(180deg, #F5E6C8, #D4B896)',
                  color: selected === 'gote' ? '#FFFFF0' : '#1a1a1a',
                  transform: 'rotate(180deg)',
                }}
              >
                <span style={{ fontFamily: "'Noto Serif SC', serif" }}>歩</span>
              </div>
              <span className={`font-serif-sc font-semibold text-sm ${selected === 'gote' ? 'text-ivory' : 'text-wood-dark'}`}>
                后手（gote）
              </span>
            </div>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ============== 速度选择 ==============
function SpeedSelect({ value, onChange }: { value: AutoPlaySpeed; onChange: (s: AutoPlaySpeed) => void }) {
  const speeds: { value: AutoPlaySpeed; label: string; description: string }[] = [
    { value: 'slow', label: '慢', description: '沉稳思考' },
    { value: 'normal', label: '中', description: '正常节奏' },
    { value: 'fast', label: '快', description: '闪电出招' },
  ];

  return (
    <div className="wood-panel p-4 rounded-2xl">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Gauge size={18} className="text-wood-dark" />
          <h4 className="font-calligraphy text-lg text-wood-dark">托管速度</h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {speeds.map((speed) => (
            <motion.button
              key={speed.value}
              whileHover={{ scale: value === speed.value ? 1 : 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(speed.value)}
              className={`p-2 rounded-xl transition-all duration-300 ${
                value === speed.value
                  ? 'bg-vermilion text-ivory shadow-lg shadow-vermilion/30'
                  : 'bg-wood-dark/10 text-wood-dark hover:bg-wood-dark/20'
              }`}
            >
              <div className="font-calligraphy text-lg mb-0.5">{speed.label}</div>
              <div className={`text-xs font-serif-sc ${value === speed.value ? 'text-ivory/80' : 'text-wood-dark/60'}`}>
                {speed.description}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============== 设置页（人机对战） ==============
interface SetupPageProps {
  onBack: () => void;
  onStart: () => void;
}

function SetupPage({ onBack, onStart }: SetupPageProps) {
  const { difficulty, setDifficulty, playerColor, setPlayerColor, setGameMode } = useShogiStore();

  const handleStart = () => {
    setGameMode('pve');
    onStart();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-serif-sc">返回</span>
        </button>
        <h2 className="font-calligraphy text-3xl text-ivory flex-1 text-center pr-12">将棋 · 人机</h2>
      </div>

      <div className="space-y-4">
        <div className="wood-panel p-5 rounded-2xl">
          <div className="relative z-10">
            <h4 className="font-calligraphy text-xl text-wood-dark text-center mb-4">选择难度</h4>
            <div className="grid grid-cols-3 gap-2">
              <DifficultyCard
                level="easy"
                title="初级"
                description="新手入门"
                isSelected={difficulty === 'easy'}
                onClick={() => setDifficulty('easy')}
              />
              <DifficultyCard
                level="medium"
                title="中级"
                description="有一定挑战"
                isSelected={difficulty === 'medium'}
                onClick={() => setDifficulty('medium')}
              />
              <DifficultyCard
                level="hard"
                title="高级"
                description="资深棋友"
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
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="w-full seal-btn text-2xl py-4"
        >
          开始对局
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============== 观战设置页 ==============
function WatchSettingsPage({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const {
    senteDifficulty,
    setSenteDifficulty,
    goteDifficulty,
    setGoteDifficulty,
    autoPlaySpeed,
    setAutoPlaySpeed,
  } = useShogiStore();

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-serif-sc">返回</span>
        </button>
        <h2 className="font-calligraphy text-3xl text-ivory flex-1 text-center pr-12">将棋 · 观战</h2>
      </div>

      <div className="space-y-4">
        <div className="wood-panel p-5 rounded-2xl">
          <div className="relative z-10">
            <h4 className="font-calligraphy text-xl text-wood-dark text-center mb-4">先手难度（sente）</h4>
            <div className="grid grid-cols-3 gap-2">
              <DifficultyCard
                level="easy"
                title="初级"
                description="新手入门"
                isSelected={senteDifficulty === 'easy'}
                onClick={() => setSenteDifficulty('easy')}
              />
              <DifficultyCard
                level="medium"
                title="中级"
                description="有一定挑战"
                isSelected={senteDifficulty === 'medium'}
                onClick={() => setSenteDifficulty('medium')}
              />
              <DifficultyCard
                level="hard"
                title="高级"
                description="资深棋友"
                isSelected={senteDifficulty === 'hard'}
                onClick={() => setSenteDifficulty('hard')}
              />
            </div>
          </div>
        </div>

        <div className="wood-panel p-5 rounded-2xl">
          <div className="relative z-10">
            <h4 className="font-calligraphy text-xl text-wood-dark text-center mb-4">后手难度（gote）</h4>
            <div className="grid grid-cols-3 gap-2">
              <DifficultyCard
                level="easy"
                title="初级"
                description="新手入门"
                isSelected={goteDifficulty === 'easy'}
                onClick={() => setGoteDifficulty('easy')}
              />
              <DifficultyCard
                level="medium"
                title="中级"
                description="有一定挑战"
                isSelected={goteDifficulty === 'medium'}
                onClick={() => setGoteDifficulty('medium')}
              />
              <DifficultyCard
                level="hard"
                title="高级"
                description="资深棋友"
                isSelected={goteDifficulty === 'hard'}
                onClick={() => setGoteDifficulty('hard')}
              />
            </div>
          </div>
        </div>

        <SpeedSelect value={autoPlaySpeed} onChange={setAutoPlaySpeed} />

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="w-full seal-btn text-2xl py-4"
        >
          开始观战
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============== 控制面板 ==============
function ShogiControlPanel({ onOpenRules }: { onOpenRules: () => void }) {
  const {
    history,
    undoMove,
    resetGame,
    resign,
    backToMenu,
    isAIThinking,
    gameMode,
    gameStatus,
    currentPlayer,
    autoPlaySente,
    autoPlayGote,
    toggleAutoPlay,
    pieces,
    hand,
  } = useShogiStore();

  const [showResignConfirm, setShowResignConfirm] = useState(false);

  // 棋谱记录：根据 history 中的 pieceId 查找对应棋子的当前显示名（升变后用升变名）
  // 注意：history 中保留了 promotedBefore，移动前的升变状态，显示时用 promotedBefore 判断
  const moveHistory = history.map((h, i) => {
    let pieceName = '?';
    if (h.kind === 'move') {
      // 移动前若已升变则用升变名，否则用基础名；这里使用历史记录中保留的 promotedBefore
      // 注意：history 中没保留 piece.type，需通过 pieceId 在当前 pieces 中查找
      // 若该棋子已被吃，则找不到，用 '?' 兜底（极少见场景）
      const piece = pieces.find((p) => p.id === h.pieceId);
      if (piece) {
        pieceName = h.promotedBefore ? '成' + PIECE_NAMES[piece.type] : PIECE_NAMES[piece.type];
      }
    } else if (h.droppedType) {
      pieceName = PIECE_NAMES[h.droppedType];
    }
    return {
      index: i + 1,
      player: h.currentPlayerBefore,
      pieceName,
      isDrop: h.kind === 'drop',
      toCol: h.to.col,
      toRow: h.to.row,
    };
  });

  const isPlaying = gameStatus === 'playing';
  const isWatchMode = gameMode === 'watch';
  const isCurrentPlayerAutoPlay = currentPlayer === 'sente' ? autoPlaySente : autoPlayGote;

  const handleToggleAutoPlay = () => toggleAutoPlay(currentPlayer);

  return (
    <div className="flex flex-col gap-3">
      <div className="wood-panel p-3">
        <div className="relative z-10">
          {isWatchMode ? (
            <div className="space-y-3">
              <div className="text-center">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-calligraphy text-lg"
                  style={{ background: 'linear-gradient(145deg, #6A5ACD, #483D8B)', color: '#FFFFF0' }}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  观战模式
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-center font-serif-sc text-sm text-wood-dark/70">托管控制</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => toggleAutoPlay('sente')}
                    disabled={!isPlaying}
                    className={`px-3 py-2 rounded-lg font-serif-sc text-sm transition-all flex items-center justify-center gap-2 ${
                      autoPlaySente ? 'text-white' : 'bg-white/50 text-wood-dark hover:bg-white/70'
                    }`}
                    style={{
                      background: autoPlaySente ? 'linear-gradient(145deg, #B22222, #8B0000)' : undefined,
                      border: autoPlaySente ? '2px solid #8B0000' : '2px solid #B22222',
                    }}
                  >
                    <span className={`w-2 h-2 rounded-full ${autoPlaySente ? 'bg-white animate-pulse' : 'bg-vermilion'}`} />
                    <span>先手{autoPlaySente ? '托管' : '接管'}</span>
                  </button>
                  <button
                    onClick={() => toggleAutoPlay('gote')}
                    disabled={!isPlaying}
                    className={`px-3 py-2 rounded-lg font-serif-sc text-sm transition-all flex items-center justify-center gap-2 ${
                      autoPlayGote ? 'text-white' : 'bg-white/50 text-wood-dark hover:bg-white/70'
                    }`}
                    style={{
                      background: autoPlayGote ? 'linear-gradient(145deg, #1E40AF, #1E3A8A)' : undefined,
                      border: autoPlayGote ? '2px solid #1E3A8A' : '2px solid #1E40AF',
                    }}
                  >
                    <span className={`w-2 h-2 rounded-full ${autoPlayGote ? 'bg-white animate-pulse' : 'bg-blue-700'}`} />
                    <span>后手{autoPlayGote ? '托管' : '接管'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={resetGame}
                  disabled={isAIThinking}
                  className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                >
                  <RotateCcw size={16} />
                  <span>重开</span>
                </button>
                <button
                  onClick={onOpenRules}
                  className="seal-btn seal-btn-secondary text-sm py-2 flex items-center justify-center gap-1"
                >
                  <BookOpen size={16} />
                  <span>规则</span>
                </button>
                <button
                  onClick={backToMenu}
                  disabled={isAIThinking}
                  className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                  style={{ background: 'linear-gradient(145deg, #4A7C59, #2d5a3d)', borderColor: '#2d5a3d' }}
                >
                  <Home size={16} />
                  <span>菜单</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={undoMove}
                disabled={history.length === 0 || !isPlaying || isAIThinking}
                className="seal-btn seal-btn-secondary text-sm py-2 flex items-center justify-center gap-1"
              >
                <span>↩</span>
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
                onClick={onOpenRules}
                className="seal-btn seal-btn-secondary text-sm py-2 flex items-center justify-center gap-1"
              >
                <BookOpen size={16} />
                <span>规则</span>
              </button>
              <button
                onClick={() => setShowResignConfirm(true)}
                disabled={!isPlaying || isAIThinking}
                className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                style={{ background: 'linear-gradient(145deg, #654321, #3d2817)', borderColor: '#3d2817' }}
              >
                <Flag size={16} />
                <span>认输</span>
              </button>
              <button
                onClick={backToMenu}
                disabled={isAIThinking}
                className="seal-btn text-sm py-2 flex items-center justify-center gap-1 col-span-2"
                style={{ background: 'linear-gradient(145deg, #4A7C59, #2d5a3d)', borderColor: '#2d5a3d' }}
              >
                <Home size={16} />
                <span>返回菜单</span>
              </button>
              {isCurrentPlayerAutoPlay ? (
                <button
                  onClick={handleToggleAutoPlay}
                  disabled={!isPlaying}
                  className="seal-btn text-sm py-2 flex items-center justify-center gap-1 col-span-3"
                  style={{ background: 'linear-gradient(145deg, #6A5ACD, #483D8B)', borderColor: '#483D8B' }}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>{currentPlayer === 'sente' ? '先手' : '后手'}托管中... 点击取消</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleAutoPlay}
                  disabled={!isPlaying || isAIThinking}
                  className="seal-btn text-sm py-2 flex items-center justify-center gap-1 col-span-3"
                  style={{ background: 'linear-gradient(145deg, #6A5ACD, #483D8B)', borderColor: '#483D8B' }}
                >
                  <span>🤖</span>
                  <span>托管</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 棋谱记录 */}
      <div className="wood-panel p-3 flex-1 min-h-0 flex flex-col">
        <div className="relative z-10 flex flex-col h-full min-h-0">
          <h2 className="font-calligraphy text-lg text-wood-dark text-center mb-2">棋谱记录</h2>
          <div className="overflow-y-auto pr-1 max-h-[160px] lg:max-h-[300px] scrollbar-classic">
            {moveHistory.length === 0 ? (
              <div className="text-center text-wood-dark/50 font-serif-sc py-4 text-sm">暂无走棋记录</div>
            ) : (
              <div className="space-y-1">
                {moveHistory.map((move) => (
                  <motion.div
                    key={move.index}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className={`flex items-center gap-2 px-2 py-1 rounded ${
                      move.player === 'sente' ? 'bg-vermilion/10' : 'bg-blue-500/10'
                    }`}
                  >
                    <span className="font-serif-sc text-wood-dark/50 text-xs w-5 shrink-0">{move.index}.</span>
                    <span
                      className={`font-serif-sc font-medium text-xs ${
                        move.player === 'sente' ? 'text-vermilion' : 'text-blue-700'
                      }`}
                    >
                      {move.player === 'sente' ? '先' : '后'} {move.pieceName}
                      {move.isDrop ? ' 打' : ''}
                      →({move.toCol},{move.toRow})
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          {/* 持驹简显（便于玩家随时查看双方持驹） */}
          <div className="mt-2 pt-2 border-t border-wood-dark/10 text-xs font-serif-sc text-wood-dark/70">
            <div>先手持驹：{formatHand(hand.sente)}</div>
            <div>后手持驹：{formatHand(hand.gote)}</div>
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
                  {currentPlayer === 'sente' ? '先手' : '后手'}确定要认输吗？
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
    </div>
  );
}

// 格式化持驹显示
function formatHand(handPieces: { type: import('./types').PieceType; count: number }[]): string {
  if (handPieces.length === 0 || handPieces.every((p) => p.count === 0)) return '无';
  return handPieces
    .filter((p) => p.count > 0)
    .map((p) => `${PIECE_NAMES[p.type]}×${p.count}`)
    .join(' ');
}

// ============== 规则弹窗 ==============
function ShogiRulesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
            className="wood-panel p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto scrollbar-classic"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-calligraphy text-2xl text-wood-dark">将棋规则</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-wood-dark/60 hover:text-wood-dark hover:bg-wood-dark/10"
                >
                  ✕
                </button>
              </div>
              <div className="font-serif-sc text-wood-dark/80 text-sm space-y-3">
                <p><strong className="text-vermilion">棋盘：</strong>9x9 方格，棋子落在方格内（非交叉点）。</p>
                <p><strong className="text-vermilion">方向：</strong>先手 sente 在下方朝上推进，后手 gote 在上方朝下推进。后手棋子整体旋转 180°。</p>
                <p><strong className="text-vermilion">王（王将/玉将）：</strong>八方向走一格。先手用「王将」，后手用「玉将」。</p>
                <p><strong className="text-vermilion">飞车（飛）：</strong>直线滑动任意格。升变为「龍王」（龍），可加一格斜向。</p>
                <p><strong className="text-vermilion">角行（角）：</strong>斜线滑动任意格。升变为「龍馬」（馬），可加一格正向。</p>
                <p><strong className="text-vermilion">金将（金）：</strong>前/前左/前右/左/右/后 六方向走一格。不升变。</p>
                <p><strong className="text-vermilion">银将（銀）：</strong>前/前左/前右/后左/后右 五方向走一格。升变为「全」，走法同金将。</p>
                <p><strong className="text-vermilion">桂马（桂）：</strong>向前跳两格再左右一格（前两左一/前两右一），可跳过棋子。升变为「圭」，走法同金将。</p>
                <p><strong className="text-vermilion">香车（香）：</strong>向前直线滑动任意格。升变为「杏」，走法同金将。</p>
                <p><strong className="text-vermilion">步兵（歩）：</strong>向前一格。升变为「と」（と金），走法同金将。</p>
                <p><strong className="text-vermilion">升变（成る）：</strong>棋子进入、离开或在对方三段（升变区）内移动时可选择升变。王和金不升变。</p>
                <p><strong className="text-vermilion">强制升变：</strong>步兵/香车到末段、桂马到末两段必须升变。</p>
                <p><strong className="text-vermilion">持驹（持ち駒）：</strong>吃掉的对方棋子回到未升变状态，可在己方回合打入任意空格。</p>
                <p><strong className="text-vermilion">二步禁手：</strong>同一列不能有两个己方未升变步兵（含打入）。</p>
                <p><strong className="text-vermilion">打步诘禁手：</strong>不能通过打入步兵直接将死对方。</p>
                <p><strong className="text-vermilion">胜负：</strong>将死或困毙对方王即胜。</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============== 结果弹窗 ==============
function ShogiResultModal({ onBackToMenu }: { onBackToMenu: () => void }) {
  const { gameStatus, winner, resetGame, startGame, playerColor, gameMode } = useShogiStore();
  const isVisible = gameStatus !== 'playing';

  const getWinReason = (): string => {
    switch (gameStatus) {
      case 'checkmate':
        return '将死';
      case 'stalemate':
        return '困毙';
      case 'resigned':
        return '认输';
      default:
        return '';
    }
  };

  // 判断玩家是否胜利：观战模式无玩家概念，仅显示胜方
  const isSenteWin = winner === 'sente';
  const winReason = getWinReason();
  const isStalemate = gameStatus === 'stalemate';

  // PvE 模式下：玩家胜利/失败；观战模式：显示胜方
  const playerWon = gameMode === 'pve' ? winner === playerColor : false;

  const handleRestart = () => {
    resetGame();
    startGame();
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
                      : isSenteWin
                      ? 'linear-gradient(145deg, #B22222, #8B0000)'
                      : 'linear-gradient(145deg, #1E40AF, #1E3A8A)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <span
                    className="font-calligraphy text-5xl"
                    style={{ color: '#FFFFF0', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}
                  >
                    {isStalemate
                      ? '和 棋'
                      : gameMode === 'pve'
                      ? playerWon
                        ? '胜 利'
                        : '败 北'
                      : isSenteWin
                      ? '先手胜'
                      : '后手胜'}
                  </span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-8">
                <p className="font-serif-sc text-wood-dark/80 text-lg">
                  {isStalemate ? '双方无子可走，判为和棋' : `胜利原因：${winReason}`}
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex justify-center gap-4">
                <button onClick={handleRestart} className="seal-btn text-lg px-8 py-3">
                  再来一局
                </button>
                <button
                  onClick={onBackToMenu}
                  className="seal-btn text-lg px-8 py-3"
                  style={{ background: 'linear-gradient(145deg, #4A7C59, #2d5a3d)', borderColor: '#2d5a3d' }}
                >
                  返回菜单
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
function ShogiGameScreen({ onBackToSetup }: { onBackToSetup: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const {
    currentPlayer,
    inCheck,
    gameStatus,
    gameMode,
    isAIThinking,
    backToMenu,
    soundEnabled,
    toggleSound,
    autoPlaySente,
    autoPlayGote,
    playerColor,
  } = useShogiStore();

  const isCurrentPlayerAutoPlay = currentPlayer === 'sente' ? autoPlaySente : autoPlayGote;
  const isWatchMode = gameMode === 'watch';

  const getStatusText = () => {
    if (gameStatus !== 'playing') {
      return gameStatus === 'checkmate' ? '将死！' : gameStatus === 'stalemate' ? '和棋' : '认输';
    }
    const playerName = currentPlayer === 'sente' ? '先手' : '后手';
    if (isWatchMode) {
      if (isCurrentPlayerAutoPlay && isAIThinking) return `${playerName}思考中...`;
      return `${playerName}走棋`;
    }
    if (isCurrentPlayerAutoPlay && isAIThinking) {
      return `${playerName}托管中`;
    }
    if (isAIThinking) return 'AI 思考中...';
    return `${playerName}走棋`;
  };

  const statusText = getStatusText();

  const handleBack = () => {
    backToMenu();
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
        <header className="flex items-center justify-between px-4 py-3 border-b border-ivory/10">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
          >
            <span className="text-lg">←</span>
            <span className="font-serif-sc text-sm">返回</span>
          </button>

          <div className="text-center flex-1">
            <h1 className="font-calligraphy text-2xl text-ivory">将棋 将棋</h1>
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
                currentPlayer === 'sente' ? 'bg-vermilion/20 text-vermilion' : 'bg-blue-500/20 text-blue-300'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  currentPlayer === 'sente' ? 'bg-vermilion' : 'bg-blue-400'
                } ${isCurrentPlayerAutoPlay ? 'animate-pulse' : ''}`}
              />
              <span className="hidden sm:inline">
                {isWatchMode
                  ? isCurrentPlayerAutoPlay
                    ? `${currentPlayer === 'sente' ? '先手' : '后手'}思考中`
                    : `${currentPlayer === 'sente' ? '先手' : '后手'}走棋`
                  : isCurrentPlayerAutoPlay
                  ? `${currentPlayer === 'sente' ? '先手' : '后手'}托管中`
                  : gameMode === 'pve' && currentPlayer !== playerColor
                  ? 'AI'
                  : currentPlayer === playerColor
                  ? '你'
                  : currentPlayer === 'sente'
                  ? '先手'
                  : '后手'}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-8 p-4">
          <div className="w-full lg:w-64 order-2 lg:order-1">
            <div className="lg:sticky lg:top-4">
              <ShogiControlPanel onOpenRules={() => setShowRules(true)} />
            </div>
          </div>

          <div className="w-full max-w-[600px] order-1 lg:order-2 flex-shrink-0 flex flex-col items-center">
            <div className="text-center mb-3 h-8">
              <AnimatePresence>
                {inCheck && gameStatus === 'playing' && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="inline-block animate-check-flash font-calligraphy text-2xl text-vermilion font-bold"
                    style={{ textShadow: '0 0 15px rgba(178, 34, 34, 0.5)' }}
                  >
                    王 手！
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {isAIThinking && gameStatus === 'playing' && (
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
            <div className="w-full" style={{ maxWidth: 'min(80vh, 600px)' }}>
              <ShogiBoard />
            </div>
          </div>
        </div>
      </div>

      <ShogiRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <ShogiResultModal onBackToMenu={handleBack} />
    </motion.div>
  );
}

// ============== 主菜单（将棋内部入口） ==============
interface ShogiMainMenuProps {
  onBack: () => void;
  onPveSetup: () => void;
  onWatchSetup: () => void;
}

function ShogiMainMenu({ onBack, onPveSetup, onWatchSetup }: ShogiMainMenuProps) {
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
          style={{ textShadow: '0 4px 12px rgba(0,0,0,0.6), 0 0 60px rgba(178, 34, 34, 0.4)' }}
        >
          日本将棋
        </h1>
        <p className="font-serif-sc text-ivory/70 text-lg tracking-[0.3em]">将棋 · Shogi</p>
        <div className="mt-5 flex justify-center gap-2">
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-vermilion" />
          <div className="w-2 h-2 rounded-full bg-vermilion" />
          <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-vermilion" />
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
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-vermilion text-ivory shadow-lg shadow-vermilion/30">
              <Monitor size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-calligraphy text-2xl text-wood-dark">人机对战</h3>
              <p className="font-serif-sc text-wood-dark/70 text-sm mt-0.5">挑战电脑 AI</p>
            </div>
            <ChevronRight size={24} className="text-wood-dark/40" />
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onWatchSetup}
          className="w-full text-left p-4 rounded-xl wood-panel"
        >
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-wood-dark/20 text-wood-dark">
              <Eye size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-calligraphy text-2xl text-wood-dark">观战模式</h3>
              <p className="font-serif-sc text-wood-dark/70 text-sm mt-0.5">观看 AI 双方对弈</p>
            </div>
            <ChevronRight size={24} className="text-wood-dark/40" />
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============== 主组件 ==============
interface ShogiGameProps {
  onBack: () => void;
}

export function ShogiGame({ onBack }: ShogiGameProps) {
  const [localScreen, setLocalScreen] = useState<LocalScreen>('menu');
  const { startGame, startWatchGame, resetGame, backToMenu } = useShogiStore();

  const handleStartPve = () => {
    resetGame();
    startGame();
    setLocalScreen('game');
  };

  const handleStartWatch = () => {
    resetGame();
    startWatchGame();
    setLocalScreen('game');
  };

  const handleBackToSetup = () => {
    backToMenu();
    setLocalScreen('menu');
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {localScreen === 'menu' && (
          <motion.div key="menu" className="min-h-screen flex items-center justify-center py-8 px-4">
            <ShogiMainMenu
              onBack={onBack}
              onPveSetup={() => setLocalScreen('pve-setup')}
              onWatchSetup={() => setLocalScreen('watch-settings')}
            />
          </motion.div>
        )}
        {localScreen === 'pve-setup' && (
          <motion.div key="pve-setup" className="min-h-screen flex items-center justify-center py-8 px-4">
            <SetupPage onBack={() => setLocalScreen('menu')} onStart={handleStartPve} />
          </motion.div>
        )}
        {localScreen === 'watch-settings' && (
          <motion.div key="watch-settings" className="min-h-screen flex items-center justify-center py-8 px-4">
            <WatchSettingsPage onBack={() => setLocalScreen('menu')} onStart={handleStartWatch} />
          </motion.div>
        )}
        {localScreen === 'game' && (
          <ShogiGameScreen key="game" onBackToSetup={handleBackToSetup} />
        )}
      </AnimatePresence>
    </div>
  );
}
