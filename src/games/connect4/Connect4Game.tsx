// 四子棋游戏页面
// - 模式选择：人机对战 / 联机对战
// - 人机模式：顶部返回 + 标题 + 轮次 / 棋盘 / 悔棋·重开·难度
// - 联机模式：顶部退出 + 标题(含房间号) + 轮次 / 棋盘 / 请求悔棋·退出房间
// - 胜负弹窗 + 悔棋请求弹窗

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Undo2, RotateCcw, LogOut, Bot, Wifi, Swords } from 'lucide-react';
import { useConnect4Store } from './store';
import { Connect4Board } from './Connect4Board';
import { Connect4OnlineSetup } from './Connect4OnlineSetup';
import type { Difficulty } from './ai';

interface Connect4GameProps {
  onBack: () => void;
}

// 难度选项（hard 深度提升至 7，medium 加 2 层前瞻）
const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string }[] = [
  { value: 'easy', label: '初级', desc: '随机' },
  { value: 'medium', label: '中级', desc: '2层前瞻' },
  { value: 'hard', label: '高级', desc: '深度7' },
];

// 内部视图状态：模式选择 / 人机 / 联机设置 / 联机对局
type View = 'mode-select' | 'pve' | 'online-setup' | 'online-game';

export function Connect4Game({ onBack }: Connect4GameProps) {
  const [view, setView] = useState<View>('mode-select');

  // 模式选择界面
  if (view === 'mode-select') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen flex flex-col"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-ivory/10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-serif-sc text-sm">返回</span>
          </button>
          <h1 className="font-calligraphy text-2xl text-ivory game-title">四子棋</h1>
          <div className="w-16" />
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="wood-panel p-6 rounded-2xl"
            >
              <div className="relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-vermilion/20 flex items-center justify-center">
                    <Swords size={40} className="text-vermilion" />
                  </div>
                </div>
                <h3 className="font-calligraphy text-3xl text-wood-dark text-center mb-2">
                  选择模式
                </h3>
                <p className="font-serif-sc text-wood-dark/70 text-center mb-6">
                  重力落子，四连即胜
                </p>
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setView('pve')}
                    className="w-full seal-btn text-xl py-4 flex items-center justify-center gap-3"
                  >
                    <Bot size={24} />
                    <span>人机对战</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setView('online-setup')}
                    className="w-full seal-btn seal-btn-secondary text-xl py-4 flex items-center justify-center gap-3"
                  >
                    <Wifi size={24} />
                    <span>联机对战</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 联机设置界面
  if (view === 'online-setup') {
    return (
      <Connect4OnlineSetup
        onBack={() => setView('mode-select')}
        onGameStart={() => setView('online-game')}
      />
    );
  }

  // 游戏界面（人机 / 联机对局）
  return (
    <GameView
      isOnline={view === 'online-game'}
      onBack={() => {
        if (view === 'online-game') {
          // 退出房间并回到模式选择
          useConnect4Store.getState().leaveOnlineGame();
        }
        setView('mode-select');
      }}
    />
  );
}

// 游戏主视图：人机与联机共用，通过 isOnline 切换底部控件与状态文案
function GameView({ isOnline, onBack }: { isOnline: boolean; onBack: () => void }) {
  const {
    currentPlayer,
    gameStatus,
    winner,
    difficulty,
    isAIThinking,
    history,
    gameMode,
    onlineState,
    setDifficulty,
    resetGame,
    undoMove,
    sendUndoRequest,
    acceptUndo,
    rejectUndo,
    leaveOnlineGame,
  } = useConnect4Store();

  const [showModal, setShowModal] = useState(false);

  // 游戏结束时弹出胜负窗口（延迟以让最后一颗棋子的动画完成）
  useEffect(() => {
    if (gameStatus !== 'playing') {
      const t = setTimeout(() => setShowModal(true), 450);
      return () => clearTimeout(t);
    } else {
      setShowModal(false);
    }
  }, [gameStatus]);

  // 顶部当前轮次提示
  const statusText = (() => {
    if (gameStatus === 'won') {
      if (gameMode === 'online') {
        return winner === onlineState.playerColor ? '你赢了！' : '你输了';
      }
      return winner === 1 ? '红方胜！' : '黄方胜！';
    }
    if (gameStatus === 'draw') return '平局';
    if (gameMode === 'online') {
      if (!onlineState.connected) return '对手已断开';
      return onlineState.isMyTurn
        ? '轮到你落子'
        : `等待 ${onlineState.opponentName} 落子...`;
    }
    if (isAIThinking) return 'AI 思考中...';
    return currentPlayer === 1 ? '轮到红方（你）' : '轮到黄方（AI）';
  })();

  const handleReset = () => {
    resetGame();
    setShowModal(false);
  };

  const handleUndo = () => {
    undoMove();
  };

  const handleUndoRequest = () => {
    sendUndoRequest();
  };

  const handleLeaveRoom = () => {
    leaveOnlineGame();
    onBack();
  };

  // 人机模式下是否可悔棋
  const canUndoPve = history.length > 0 && !isAIThinking && gameStatus === 'playing';
  // 联机模式下是否可请求悔棋：轮到我且无待处理请求且游戏进行中
  const canRequestUndoOnline =
    gameMode === 'online' &&
    onlineState.isMyTurn &&
    onlineState.undoRequestStatus === 'none' &&
    gameStatus === 'playing' &&
    history.length > 0;

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
          <span className="font-serif-sc text-sm">
            {isOnline ? '退出' : '返回'}
          </span>
        </button>

        <div className="text-center flex-1">
          <h1 className="font-calligraphy text-2xl text-ivory game-title">
            {isOnline ? `房间 ${onlineState.roomCode}` : '四子棋'}
          </h1>
        </div>

        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-serif-sc ${
            currentPlayer === 1
              ? 'bg-red-500/30 text-ivory'
              : 'bg-yellow-500/30 text-ivory'
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              currentPlayer === 1 ? 'bg-red-500' : 'bg-yellow-400'
            } ${isAIThinking ? 'animate-pulse' : ''}`}
          />
          <span className="hidden sm:inline">{statusText}</span>
          <span className="sm:hidden">
            {gameMode === 'online'
              ? onlineState.isMyTurn
                ? '你'
                : '等'
              : isAIThinking
              ? 'AI...'
              : currentPlayer === 1
              ? '红'
              : '黄'}
          </span>
        </div>
      </header>

      {/* 联机模式：对手信息条 */}
      {isOnline && (
        <div className="px-4 py-2 border-b border-ivory/10 flex items-center justify-between text-xs font-serif-sc">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                onlineState.connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-ivory/70">
              对手：{onlineState.opponentName || '未知'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ivory/50">
              你执{onlineState.playerColor === 1 ? '红' : '黄'}
            </span>
          </div>
        </div>
      )}

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

          <Connect4Board />

          {/* 步数显示 */}
          <div className="text-center mt-2 font-serif-sc text-ivory/40 text-xs">
            第 {history.length} 手
          </div>
        </div>
      </div>

      {/* 底部控制区 */}
      <footer className="px-4 pb-5 pt-2">
        <div className="max-w-[560px] mx-auto space-y-3">
          {isOnline ? (
            // 联机模式：请求悔棋 + 退出房间
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: canRequestUndoOnline ? 1.02 : 1 }}
                whileTap={{ scale: canRequestUndoOnline ? 0.98 : 1 }}
                onClick={handleUndoRequest}
                disabled={!canRequestUndoOnline}
                className="seal-btn seal-btn-secondary py-3 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Undo2 size={18} />
                <span>
                  {onlineState.undoRequestStatus === 'sent'
                    ? '等待回复...'
                    : '请求悔棋'}
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLeaveRoom}
                className="seal-btn py-3 flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                <span>退出房间</span>
              </motion.button>
            </div>
          ) : (
            // 人机模式：难度选择 + 悔棋·重开
            <>
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
                    <div
                      className={`text-[10px] ${
                        difficulty === opt.value ? 'text-ivory/70' : 'text-ivory/40'
                      }`}
                    >
                      {opt.desc}
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: canUndoPve ? 1.02 : 1 }}
                  whileTap={{ scale: canUndoPve ? 0.98 : 1 }}
                  onClick={handleUndo}
                  disabled={!canUndoPve}
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
            </>
          )}
        </div>
      </footer>

      {/* 悔棋请求弹窗（联机模式收到对方请求时弹出） */}
      <AnimatePresence>
        {isOnline && onlineState.undoRequestStatus === 'received' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="wood-panel p-6 max-w-sm w-full text-center"
            >
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-full bg-vermilion/20 mx-auto mb-4 flex items-center justify-center">
                  <Undo2 size={32} className="text-vermilion" />
                </div>
                <h3 className="font-calligraphy text-2xl text-wood-dark mb-2">
                  悔棋请求
                </h3>
                <p className="font-serif-sc text-wood-dark/70 mb-6">
                  {onlineState.opponentName} 请求悔棋一步，是否同意？
                </p>
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={rejectUndo}
                    className="flex-1 seal-btn seal-btn-secondary py-3"
                  >
                    拒绝
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={acceptUndo}
                    className="flex-1 seal-btn py-3"
                  >
                    同意
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 胜负弹窗 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={isOnline ? handleLeaveRoom : handleReset}
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
                        ? 'radial-gradient(circle at 30% 30%, #ef4444, #b91c1c)'
                        : gameStatus === 'won' && winner === 2
                        ? 'radial-gradient(circle at 30% 30%, #fbbf24, #d97706)'
                        : 'linear-gradient(135deg, #DEB887, #8B4513)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <span className="font-calligraphy text-3xl text-white">
                    {gameStatus === 'won'
                      ? isOnline
                        ? winner === onlineState.playerColor
                          ? '胜'
                          : '负'
                        : winner === 1
                        ? '胜'
                        : '负'
                      : '和'}
                  </span>
                </motion.div>

                <h2 className="font-calligraphy text-4xl text-wood-dark mb-2">
                  {gameStatus === 'won'
                    ? isOnline
                      ? winner === onlineState.playerColor
                        ? '你获胜了'
                        : '对手获胜'
                      : winner === 1
                      ? '红方获胜'
                      : '黄方获胜'
                    : '平局'}
                </h2>

                <p className="font-serif-sc text-wood-dark/70 mb-6">
                  {gameStatus === 'won'
                    ? isOnline
                      ? winner === onlineState.playerColor
                        ? '精彩对弈，棋艺过人！'
                        : '再接再厉，下次定能取胜'
                      : winner === 1
                      ? '恭喜你战胜了 AI！'
                      : '再接再厉，下次定能取胜'
                    : '棋逢对手，难分胜负'}
                </p>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowModal(false)}
                    className="flex-1 seal-btn seal-btn-secondary py-3"
                  >
                    看棋盘
                  </motion.button>
                  {isOnline ? (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleLeaveRoom}
                      className="flex-1 seal-btn py-3"
                    >
                      退出房间
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleReset}
                      className="flex-1 seal-btn py-3"
                    >
                      再来一局
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
