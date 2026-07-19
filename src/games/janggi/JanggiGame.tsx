// 韩国象棋游戏页面
// 包含：设置页（难度/颜色）、观战设置页、对局页（棋盘+控制面板+状态显示）、结果弹窗
// 自管理内部 screen 状态，避免与主菜单的 Screen 类型耦合
//
// ============================================================================
// 主菜单集成说明（其他并行任务可能也在修改主菜单，故仅以注释形式给出集成代码）
// ============================================================================
//
// 1) 在 src/store/gameStore.ts 的 Screen 联合类型中追加 'janggi'：
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
//      | 'janggi';   // <-- 新增
//
// 2) 在 src/App.tsx 中：
//    - 顶部 import：
//        import { JanggiGame } from './games/janggi/JanggiGame';
//    - 顶层组件 App 中新增 state：
//        const [game, setGame] = useState<'xiangqi' | 'doudizhu' | 'janggi'>('xiangqi');
//    - 在 renderScreen / AnimatePresence 中新增分支：
//        {game === 'janggi' && (
//          <motion.div key="janggi" ...>
//            <JanggiGame onBack={() => setGame('xiangqi')} />
//          </motion.div>
//        )}
//    - 暴露 onGoToJanggi 回调，向下传递到 MainMenu。
//
// 3) 在 src/components/MainMenu.tsx 中：
//    - 在 MainMenuPage 组件的菜单项列表里（"斗地主"入口之后）添加：
//
//        <MenuItem
//          icon={<Swords size={24} />}
//          title="韩国象棋"
//          description="장기 · 朝鲜半岛的象棋变种"
//          onClick={onGoToJanggi}
//          delay={0.6}
//        />
//
//    - 给 MainMenu 组件新增 prop：onGoToJanggi: () => void
//    - 在 XiangqiApp 中接收并透传到 MainMenu。
//
// 注意：当前任务说明中提到"在五子棋入口之后添加"，但现有 MainMenu 中并无五子棋入口，
// 实际入口顺序为：人机对战 / 联机对战 / 观战模式 / 残局挑战 / 斗地主 / 设置 / 规则 / 关于。
// 因此将"韩国象棋"插入到"斗地主"之后。
// ============================================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Home,
  Flag,
  Sparkles,
  Gauge,
  Monitor,
  Eye,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useJanggiStore } from './store';
import { JanggiBoard } from './JanggiBoard';
import { PIECE_NAMES } from './types';
import type { PieceColor } from './types';
import type { Difficulty, AutoPlaySpeed } from './store';

type LocalScreen = 'menu' | 'pve-setup' | 'watch-settings' | 'game';

// ============== 设置页：难度 + 颜色 ==============
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

// 颜色选择：红方先手 / 蓝方先手
interface ColorSelectProps {
  selected: PieceColor;
  onChange: (color: PieceColor) => void;
}

function ColorSelect({ selected, onChange }: ColorSelectProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="wood-panel p-6 rounded-2xl"
    >
      <div className="relative z-10">
        <h4 className="font-calligraphy text-2xl text-wood-dark text-center mb-4">选择先手</h4>
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: selected === 'red' ? 1 : 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange('red')}
            className={`p-4 rounded-xl transition-all duration-300 ${
              selected === 'red' ? 'ring-4 ring-vermilion shadow-xl shadow-vermilion/30' : 'hover:shadow-lg'
            }`}
            style={{
              background:
                selected === 'red'
                  ? 'linear-gradient(145deg, #B22222, #8B0000)'
                  : 'linear-gradient(145deg, rgba(222, 184, 135, 0.9), rgba(196, 149, 106, 0.9))',
              border: selected === 'red' ? 'none' : '2px solid #8B4513',
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-calligraphy text-2xl mb-2"
                style={{
                  background:
                    selected === 'red'
                      ? 'rgba(255, 255, 240, 0.2)'
                      : 'radial-gradient(circle at 30% 30%, #FFFFF0, #E8D4A8)',
                  color: selected === 'red' ? '#FFFFF0' : '#B22222',
                  border: selected === 'red' ? '2px solid rgba(255,255,240,0.5)' : '2px solid rgba(178, 34, 34, 0.4)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                漢
              </div>
              <span className={`font-serif-sc font-semibold ${selected === 'red' ? 'text-ivory' : 'text-wood-dark'}`}>
                红方先手
              </span>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: selected === 'blue' ? 1 : 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange('blue')}
            className={`p-4 rounded-xl transition-all duration-300 ${
              selected === 'blue' ? 'ring-4 ring-blue-500 shadow-xl shadow-blue-500/30' : 'hover:shadow-lg'
            }`}
            style={{
              background:
                selected === 'blue'
                  ? 'linear-gradient(145deg, #1E40AF, #1E3A8A)'
                  : 'linear-gradient(145deg, rgba(222, 184, 135, 0.9), rgba(196, 149, 106, 0.9))',
              border: selected === 'blue' ? 'none' : '2px solid #8B4513',
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-calligraphy text-2xl mb-2"
                style={{
                  background:
                    selected === 'blue'
                      ? 'rgba(255, 255, 240, 0.2)'
                      : 'radial-gradient(circle at 30% 30%, #FFFFF0, #E8D4A8)',
                  color: selected === 'blue' ? '#FFFFF0' : '#1E40AF',
                  border: selected === 'blue' ? '2px solid rgba(255,255,240,0.5)' : '2px solid rgba(30, 64, 175, 0.4)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                楚
              </div>
              <span className={`font-serif-sc font-semibold ${selected === 'blue' ? 'text-ivory' : 'text-wood-dark'}`}>
                蓝方先手
              </span>
            </div>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// 速度选择
function SpeedSelect({ value, onChange }: { value: AutoPlaySpeed; onChange: (s: AutoPlaySpeed) => void }) {
  const speeds: { value: AutoPlaySpeed; label: string; description: string }[] = [
    { value: 'slow', label: '慢', description: '沉稳思考' },
    { value: 'normal', label: '中', description: '正常节奏' },
    { value: 'fast', label: '快', description: '闪电出招' },
  ];

  return (
    <div className="wood-panel p-5 rounded-2xl">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Gauge size={20} className="text-wood-dark" />
          <h4 className="font-calligraphy text-xl text-wood-dark">托管速度</h4>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {speeds.map((speed) => (
            <motion.button
              key={speed.value}
              whileHover={{ scale: value === speed.value ? 1 : 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(speed.value)}
              className={`p-3 rounded-xl transition-all duration-300 ${
                value === speed.value
                  ? 'bg-vermilion text-ivory shadow-lg shadow-vermilion/30'
                  : 'bg-wood-dark/10 text-wood-dark hover:bg-wood-dark/20'
              }`}
            >
              <div className="font-calligraphy text-xl mb-0.5">{speed.label}</div>
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

// ============== 设置页 ==============
interface SetupPageProps {
  onBack: () => void;
  onStart: () => void;
}

function SetupPage({ onBack, onStart }: SetupPageProps) {
  const { difficulty, setDifficulty, playerColor, setPlayerColor, setGameMode } = useJanggiStore();

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
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-serif-sc">返回</span>
        </button>
        <h2 className="font-calligraphy text-4xl text-ivory flex-1 text-center pr-16">韩国象棋</h2>
      </div>

      <div className="space-y-6">
        <div className="wood-panel p-6 rounded-2xl">
          <div className="relative z-10">
            <h4 className="font-calligraphy text-2xl text-wood-dark text-center mb-5">选择难度</h4>
            <div className="grid grid-cols-3 gap-3">
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
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="w-full seal-btn text-2xl py-5"
        >
          开始游戏
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============== 观战设置页 ==============
function WatchSettingsPage({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const {
    redDifficulty,
    setRedDifficulty,
    blueDifficulty,
    setBlueDifficulty,
    autoPlaySpeed,
    setAutoPlaySpeed,
  } = useJanggiStore();

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
        <h2 className="font-calligraphy text-4xl text-ivory flex-1 text-center pr-16">AI观战</h2>
      </div>

      <div className="space-y-5">
        <div className="wood-panel p-5 rounded-2xl">
          <div className="relative z-10">
            <h4 className="font-calligraphy text-2xl text-wood-dark text-center mb-4">红方难度</h4>
            <div className="grid grid-cols-3 gap-3">
              <DifficultyCard level="easy" title="初级" description="新手入门" isSelected={redDifficulty === 'easy'} onClick={() => setRedDifficulty('easy')} />
              <DifficultyCard level="medium" title="中级" description="有一定挑战" isSelected={redDifficulty === 'medium'} onClick={() => setRedDifficulty('medium')} />
              <DifficultyCard level="hard" title="高级" description="资深棋友" isSelected={redDifficulty === 'hard'} onClick={() => setRedDifficulty('hard')} />
            </div>
          </div>
        </div>

        <div className="wood-panel p-5 rounded-2xl">
          <div className="relative z-10">
            <h4 className="font-calligraphy text-2xl text-wood-dark text-center mb-4">蓝方难度</h4>
            <div className="grid grid-cols-3 gap-3">
              <DifficultyCard level="easy" title="初级" description="新手入门" isSelected={blueDifficulty === 'easy'} onClick={() => setBlueDifficulty('easy')} />
              <DifficultyCard level="medium" title="中级" description="有一定挑战" isSelected={blueDifficulty === 'medium'} onClick={() => setBlueDifficulty('medium')} />
              <DifficultyCard level="hard" title="高级" description="资深棋友" isSelected={blueDifficulty === 'hard'} onClick={() => setBlueDifficulty('hard')} />
            </div>
          </div>
        </div>

        <SpeedSelect value={autoPlaySpeed} onChange={setAutoPlaySpeed} />

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="w-full seal-btn text-2xl py-5"
        >
          开始观战
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============== 控制面板 ==============
function JanggiControlPanel({ onOpenRules }: { onOpenRules: () => void }) {
  const {
    history,
    undoMove,
    resetGame,
    resign,
    backToMenu,
    isAIThinking,
    showHint,
    gameMode,
    gameStatus,
    currentPlayer,
    autoPlayRed,
    autoPlayBlue,
    toggleAutoPlay,
    autoPlaySpeed,
    setAutoPlaySpeed,
  } = useJanggiStore();

  const [showResignConfirm, setShowResignConfirm] = useState(false);

  const moveHistory = history.map((h, i) => ({
    index: i + 1,
    player: h.currentPlayerBefore,
    pieceName: PIECE_NAMES[h.piece.color][h.piece.type],
    fromCol: h.from.col,
    fromRow: h.from.row,
    toCol: h.to.col,
    toRow: h.to.row,
    captured: h.capturedPiece ? PIECE_NAMES[h.capturedPiece.color][h.capturedPiece.type] : undefined,
  }));

  const isPlaying = gameStatus === 'playing';
  const isWatchMode = gameMode === 'watch';
  const isCurrentPlayerAutoPlay = currentPlayer === 'red' ? autoPlayRed : autoPlayBlue;
  const canShowHint = isPlaying && !isAIThinking && !(gameMode === 'pve' && currentPlayer === 'blue');

  const handleToggleAutoPlay = () => toggleAutoPlay(currentPlayer);

  const speedOptions = [
    { key: 'slow' as const, label: '慢' },
    { key: 'normal' as const, label: '中' },
    { key: 'fast' as const, label: '快' },
  ];

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
                    onClick={() => toggleAutoPlay('red')}
                    disabled={!isPlaying}
                    className={`px-3 py-2 rounded-lg font-serif-sc text-sm transition-all flex items-center justify-center gap-2 ${
                      autoPlayRed ? 'text-white' : 'bg-white/50 text-wood-dark hover:bg-white/70'
                    }`}
                    style={{
                      background: autoPlayRed ? 'linear-gradient(145deg, #DC143C, #B22222)' : undefined,
                      border: autoPlayRed ? '2px solid #8B0000' : '2px solid #DC143C',
                    }}
                  >
                    <span className={`w-2 h-2 rounded-full ${autoPlayRed ? 'bg-white animate-pulse' : 'bg-vermilion'}`} />
                    <span>红方{autoPlayRed ? '托管' : '接管'}</span>
                  </button>
                  <button
                    onClick={() => toggleAutoPlay('blue')}
                    disabled={!isPlaying}
                    className={`px-3 py-2 rounded-lg font-serif-sc text-sm transition-all flex items-center justify-center gap-2 ${
                      autoPlayBlue ? 'text-white' : 'bg-white/50 text-wood-dark hover:bg-white/70'
                    }`}
                    style={{
                      background: autoPlayBlue ? 'linear-gradient(145deg, #1E40AF, #1E3A8A)' : undefined,
                      border: autoPlayBlue ? '2px solid #1E3A8A' : '2px solid #1E40AF',
                    }}
                  >
                    <span className={`w-2 h-2 rounded-full ${autoPlayBlue ? 'bg-white animate-pulse' : 'bg-blue-700'}`} />
                    <span>蓝方{autoPlayBlue ? '托管' : '接管'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="font-serif-sc text-sm text-wood-dark/70">速度调节</span>
                <div className="flex rounded-lg overflow-hidden border-2" style={{ borderColor: '#6A5ACD' }}>
                  {speedOptions.map((opt, index) => (
                    <button
                      key={opt.key}
                      onClick={() => setAutoPlaySpeed(opt.key)}
                      className={`px-4 py-2 font-serif-sc text-sm transition-all ${
                        autoPlaySpeed === opt.key ? 'text-white' : 'text-wood-dark hover:bg-purple-100'
                      } ${index > 0 ? 'border-l-2' : ''}`}
                      style={{
                        background: autoPlaySpeed === opt.key ? 'linear-gradient(145deg, #6A5ACD, #483D8B)' : 'rgba(255,255,255,0.5)',
                        borderColor: '#6A5ACD',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
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
                onClick={showHint}
                disabled={!canShowHint}
                className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                style={{ background: 'linear-gradient(145deg, #DAA520, #B8860B)', borderColor: '#8B6914' }}
              >
                <span>💡</span>
                <span>提示</span>
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
                className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                style={{ background: 'linear-gradient(145deg, #4A7C59, #2d5a3d)', borderColor: '#2d5a3d' }}
              >
                <Home size={16} />
                <span>菜单</span>
              </button>
              {isCurrentPlayerAutoPlay ? (
                <button
                  onClick={handleToggleAutoPlay}
                  disabled={!isPlaying}
                  className="seal-btn text-sm py-2 flex items-center justify-center gap-1 col-span-3"
                  style={{ background: 'linear-gradient(145deg, #6A5ACD, #483D8B)', borderColor: '#483D8B' }}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>{currentPlayer === 'red' ? '红方' : '蓝方'}托管中... 点击取消</span>
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

      <div className="wood-panel p-3 flex-1 min-h-0 flex flex-col">
        <div className="relative z-10 flex flex-col h-full min-h-0">
          <h2 className="font-calligraphy text-xl text-wood-dark text-center mb-2">棋谱记录</h2>
          <div className="overflow-y-auto pr-1 max-h-[200px] lg:max-h-[400px]">
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
                      move.player === 'red' ? 'bg-vermilion/10' : 'bg-blue-500/10'
                    }`}
                  >
                    <span className="font-serif-sc text-wood-dark/50 text-xs w-5 shrink-0">{move.index}.</span>
                    <span
                      className={`font-serif-sc font-medium text-xs ${
                        move.player === 'red' ? 'text-vermilion' : 'text-blue-700'
                      }`}
                    >
                      {move.pieceName} ({move.fromCol},{move.fromRow})→({move.toCol},{move.toRow})
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
                  {currentPlayer === 'red' ? '红方' : '蓝方'}确定要认输吗？
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

// ============== 规则弹窗 ==============
function JanggiRulesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
                <h3 className="font-calligraphy text-2xl text-wood-dark">韩国象棋规则</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-wood-dark/60 hover:text-wood-dark hover:bg-wood-dark/10"
                >
                  ✕
                </button>
              </div>
              <div className="font-serif-sc text-wood-dark/80 text-sm space-y-3">
                <p><strong className="text-vermilion">棋盘：</strong>9x10，无楚河汉界，宫内有 X 对角线。</p>
                <p><strong className="text-vermilion">王（왕）：</strong>宫内走一步，可沿宫线（含对角线 X 线）走。</p>
                <p><strong className="text-vermilion">士（사）：</strong>同王，宫内走一步沿宫线。</p>
                <p><strong className="text-vermilion">象（상）：</strong>走"用"字（1直+2斜，共8个落点），<strong>无蹩腿限制</strong>。</p>
                <p><strong className="text-vermilion">马（마）：</strong>走"日"字，<strong>无蹩马腿限制</strong>。</p>
                <p><strong className="text-vermilion">车（차）：</strong>直线滑动，宫内可沿 X 对角线滑动。</p>
                <p><strong className="text-vermilion">炮（포）：</strong>需跳一个子，<strong>不能跳炮、不能吃炮</strong>，宫内可沿对角线跳。</p>
                <p><strong className="text-vermilion">兵/卒（병/졸）：</strong>可向前或横向一格，不能后退；<strong>无过河概念，开局即可横走</strong>；在宫内可沿 X 对角线斜进。</p>
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
function JanggiResultModal() {
  const { gameStatus, winner, resetGame } = useJanggiStore();

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

  const isRedWin = winner === 'red';
  const winReason = getWinReason();
  const isStalemate = gameStatus === 'stalemate';

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
                      : isRedWin
                      ? 'linear-gradient(145deg, #B22222, #8B0000)'
                      : 'linear-gradient(145deg, #1E40AF, #1E3A8A)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <span
                    className="font-calligraphy text-5xl"
                    style={{ color: '#FFFFF0', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}
                  >
                    {isStalemate ? '和 棋' : isRedWin ? '红方胜' : '蓝方胜'}
                  </span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-8">
                <p className="font-serif-sc text-wood-dark/80 text-lg">
                  {isStalemate ? '双方无子可走，判为和棋' : `胜利原因：${winReason}`}
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
function JanggiGameScreen({ onBackToSetup }: { onBackToSetup: () => void }) {
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
    autoPlayRed,
    autoPlayBlue,
    playerColor,
  } = useJanggiStore();

  const isCurrentPlayerAutoPlay = currentPlayer === 'red' ? autoPlayRed : autoPlayBlue;
  const isWatchMode = gameMode === 'watch';

  const getStatusText = () => {
    if (gameStatus !== 'playing') {
      return gameStatus === 'checkmate' ? '将死！' : gameStatus === 'stalemate' ? '和棋' : '认输';
    }
    const playerName = currentPlayer === 'red' ? '红方' : '蓝方';
    if (isWatchMode) {
      if (isCurrentPlayerAutoPlay && isAIThinking) return `${currentPlayer === 'red' ? '红方' : '蓝方'}思考中...`;
      return `${currentPlayer === 'red' ? '红方' : '蓝方'}走棋`;
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
            <h1 className="font-calligraphy text-2xl text-ivory">韩国象棋 장기</h1>
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
                currentPlayer === 'red' ? 'bg-vermilion/20 text-vermilion' : 'bg-blue-500/20 text-blue-300'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  currentPlayer === 'red' ? 'bg-vermilion' : 'bg-blue-400'
                } ${isCurrentPlayerAutoPlay ? 'animate-pulse' : ''}`}
              />
              <span className="hidden sm:inline">
                {isWatchMode
                  ? isCurrentPlayerAutoPlay
                    ? `${currentPlayer === 'red' ? '红方' : '蓝方'}思考中`
                    : `${currentPlayer === 'red' ? '红方' : '蓝方'}走棋`
                  : isCurrentPlayerAutoPlay
                  ? `${currentPlayer === 'red' ? '红方' : '蓝方'}托管中`
                  : gameMode === 'pve' && currentPlayer === 'blue'
                  ? 'AI'
                  : currentPlayer === playerColor
                  ? '你'
                  : currentPlayer === 'red'
                  ? '红方'
                  : '蓝方'}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-8 p-4">
          <div className="w-full lg:w-64 order-2 lg:order-1">
            <div className="lg:sticky lg:top-4">
              <JanggiControlPanel onOpenRules={() => setShowRules(true)} />
            </div>
          </div>

          <div className="w-full max-w-[600px] order-1 lg:order-2 flex-shrink-0">
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
                    将 军！
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
            <JanggiBoard />
          </div>
        </div>
      </div>

      <JanggiRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <JanggiResultModal />
    </motion.div>
  );
}

// ============== 主菜单（韩国象棋内部入口） ==============
interface JanggiMainMenuProps {
  onBack: () => void;
  onPveSetup: () => void;
  onWatchSetup: () => void;
}

function JanggiMainMenu({ onBack, onPveSetup, onWatchSetup }: JanggiMainMenuProps) {
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
          韩国象棋
        </h1>
        <p className="font-serif-sc text-ivory/70 text-lg tracking-[0.3em]">장기 · Janggi</p>
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
interface JanggiGameProps {
  onBack: () => void;
}

export function JanggiGame({ onBack }: JanggiGameProps) {
  const [localScreen, setLocalScreen] = useState<LocalScreen>('menu');
  const { startGame, startWatchGame, resetGame } = useJanggiStore();

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
    setLocalScreen('menu');
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {localScreen === 'menu' && (
          <motion.div key="menu" className="min-h-screen flex items-center justify-center py-8 px-4">
            <JanggiMainMenu
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
          <JanggiGameScreen key="game" onBackToSetup={handleBackToSetup} />
        )}
      </AnimatePresence>
    </div>
  );
}
