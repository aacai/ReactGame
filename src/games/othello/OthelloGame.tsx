// 黑白棋游戏页面
// - 模式选择：人机对战 / 联机对战
// - 人机模式：顶部返回 + 标题 + 当前轮次 / 棋盘 + 比分 / 悔棋 + 重新开始 + 难度选择
// - 联机模式：顶部房间信息 / 棋盘 + 比分 / 请求悔棋 + 退出房间
// - 胜负弹窗 + 悔棋请求弹窗

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Undo2, RotateCcw, LogOut, Bot, Wifi } from 'lucide-react';
import { useOthelloStore } from './store';
import { OthelloBoard } from './OthelloBoard';
import { OthelloOnlineSetup } from './OthelloOnlineSetup';
import { getScore } from './rules';
import type { Difficulty } from './ai';

// 难度选项
const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string }[] = [
  { value: 'easy', label: '初级', desc: '随机走' },
  { value: 'medium', label: '中级', desc: '贪心+前瞻' },
  { value: 'hard', label: '高级', desc: '深度6' },
];

type SetupView = 'menu' | 'game' | 'online-setup';

export function OthelloGame({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<SetupView>('menu');

  const {
    board,
    currentPlayer,
    gameStatus,
    winner,
    difficulty,
    isAIThinking,
    history,
    passNotice,
    gameMode,
    onlineState,
    setDifficulty,
    resetGame,
    undoMove,
    setGameMode,
    sendUndoRequest,
    acceptUndo,
    rejectUndo,
    leaveOnlineGame,
  } = useOthelloStore();

  const [showModal, setShowModal] = useState(false);

  // 游戏结束时弹出胜负窗口
  useEffect(() => {
    if (gameStatus !== 'playing') {
      const t = setTimeout(() => setShowModal(true), 500);
      return () => clearTimeout(t);
    } else {
      setShowModal(false);
    }
  }, [gameStatus]);

  const { black, white } = getScore(board);

  // 返回按钮处理
  const handleBack = () => {
    if (view === 'menu') {
      onBack();
    } else if (view === 'online-setup') {
      setView('menu');
    } else if (view === 'game') {
      if (gameMode === 'online') {
        leaveOnlineGame();
      }
      setView('menu');
    }
  };

  // 选择人机对战
  const handleSelectPve = () => {
    setGameMode('pve');
    resetGame();
    setView('game');
  };

  // 选择联机对战
  const handleSelectOnline = () => {
    setView('online-setup');
  };

  // 联机房间就绪，进入游戏
  const handleOnlineGameStart = () => {
    setView('game');
  };

  // ============ 菜单视图 ============
  if (view === 'menu') {
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
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-serif-sc text-sm">返回</span>
          </button>
          <div className="text-center flex-1">
            <h1 className="font-calligraphy text-2xl text-ivory game-title">黑白棋</h1>
          </div>
          <div className="w-16" />
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-vermilion/20 mb-4">
                <div
                  className="w-12 h-12 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle at 30% 30%, #6a6a6a 0%, #1a1a1a 55%, #000000 100%)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}
                />
              </div>
              <h2 className="font-calligraphy text-3xl text-ivory mb-2">选择模式</h2>
              <p className="font-serif-sc text-ivory/50 text-sm">
                翻转棋子，角力争锋
              </p>
            </motion.div>

            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSelectPve}
                className="seal-btn w-full py-5 flex items-center justify-center gap-3"
              >
                <Bot size={24} />
                <div className="text-left">
                  <div className="font-serif-sc text-lg">人机对战</div>
                  <div className="text-xs opacity-70">三档难度，挑战 AI</div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSelectOnline}
                className="seal-btn seal-btn-secondary w-full py-5 flex items-center justify-center gap-3"
              >
                <Wifi size={24} />
                <div className="text-left">
                  <div className="font-serif-sc text-lg">联机对战</div>
                  <div className="text-xs opacity-70">创建/加入房间，实时对弈</div>
                </div>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ============ 联机房间设置视图 ============
  if (view === 'online-setup') {
    return (
      <OthelloOnlineSetup
        onBack={() => setView('menu')}
        onGameStart={handleOnlineGameStart}
      />
    );
  }

  // ============ 游戏视图（人机 / 联机共用） ============
  const isOnline = gameMode === 'online';

  // 顶部当前轮次提示
  const statusText = (() => {
    if (gameStatus === 'won') {
      return winner === 1 ? '黑方胜！' : '白方胜！';
    }
    if (gameStatus === 'draw') return '平局';
    if (isOnline) {
      if (!onlineState.connected) return '对手已断开';
      if (onlineState.isMyTurn) return '轮到你落子';
      return '等待对手落子...';
    }
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

  const handleUndoRequest = () => {
    sendUndoRequest();
  };

  const handleLeaveOnline = () => {
    leaveOnlineGame();
    setView('menu');
  };

  // 是否可悔棋（人机模式）
  const canUndo =
    !isOnline && history.length > 0 && !isAIThinking && gameStatus === 'playing';
  // 是否可请求悔棋（联机模式）
  const canRequestUndo =
    isOnline &&
    history.length > 0 &&
    gameStatus === 'playing' &&
    onlineState.undoRequestStatus === 'none';

  // 联机模式本地玩家颜色显示
  const myColorLabel = onlineState.playerColor === 1 ? '黑方' : '白方';

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
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-serif-sc text-sm">{isOnline ? '退出' : '返回'}</span>
        </button>

        <div className="text-center flex-1">
          <h1 className="font-calligraphy text-2xl text-ivory game-title">
            {isOnline ? `房间 ${onlineState.roomCode}` : '黑白棋'}
          </h1>
          {isOnline && onlineState.opponentName && (
            <div className="font-serif-sc text-xs text-ivory/50">
              你（{myColorLabel}） vs {onlineState.opponentName}
            </div>
          )}
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
            } ${isAIThinking || (isOnline && !onlineState.isMyTurn) ? 'animate-pulse' : ''}`}
          />
          <span className="hidden sm:inline">{statusText}</span>
          <span className="sm:hidden">
            {isOnline
              ? onlineState.isMyTurn
                ? '你'
                : '等'
              : isAIThinking
              ? 'AI...'
              : currentPlayer === 1
              ? '黑'
              : '白'}
          </span>
        </div>
      </header>

      {/* 棋盘区域 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[560px]">
          {/* 比分显示 */}
          <div className="flex items-center justify-center gap-6 mb-3">
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${
                currentPlayer === 1 ? 'bg-ink/40' : 'bg-ivory/5'
              }`}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 32% 30%, #6a6a6a 0%, #1a1a1a 55%, #000000 100%)',
                }}
              />
              <span className="font-serif-sc text-ivory text-sm">
                黑 {black}
                {isOnline && onlineState.playerColor === 1 ? '（你）' : ''}
              </span>
            </div>
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${
                currentPlayer === 2 ? 'bg-ivory/20' : 'bg-ivory/5'
              }`}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 32% 30%, #ffffff 0%, #f0ece0 55%, #c8c2b0 100%)',
                }}
              />
              <span className="font-serif-sc text-ivory text-sm">
                白 {white}
                {isOnline && onlineState.playerColor === 2 ? '（你）' : ''}
              </span>
            </div>
          </div>

          {/* 状态条 */}
          <div className="text-center mb-3 h-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={statusText + (passNotice ?? '')}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="font-serif-sc text-ivory/70 text-sm"
              >
                {passNotice ?? statusText}
              </motion.div>
            </AnimatePresence>
          </div>

          <OthelloBoard />

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
            <>
              {/* 悔棋请求状态提示 */}
              <AnimatePresence>
                {onlineState.undoRequestStatus === 'sent' && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-center font-serif-sc text-ivory/60 text-sm"
                  >
                    已发送悔棋请求，等待对方回应...
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: canRequestUndo ? 1.02 : 1 }}
                  whileTap={{ scale: canRequestUndo ? 0.98 : 1 }}
                  onClick={handleUndoRequest}
                  disabled={!canRequestUndo}
                  className="seal-btn seal-btn-secondary py-3 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Undo2 size={18} />
                  <span>请求悔棋</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLeaveOnline}
                  className="seal-btn py-3 flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  <span>退出房间</span>
                </motion.button>
              </div>
            </>
          ) : (
            // 人机模式：难度选择 + 悔棋/重新开始
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
            </>
          )}
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
            onClick={isOnline ? handleLeaveOnline : handleReset}
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
                    {isOnline
                      ? gameStatus === 'won'
                        ? winner === onlineState.playerColor
                          ? '胜'
                          : '负'
                        : '和'
                      : gameStatus === 'won'
                      ? winner === 1
                        ? '胜'
                        : '负'
                      : '和'}
                  </span>
                </motion.div>

                <h2 className="font-calligraphy text-4xl text-wood-dark mb-2">
                  {isOnline
                    ? gameStatus === 'won'
                      ? winner === onlineState.playerColor
                        ? '你赢了'
                        : '你输了'
                      : '平局'
                    : gameStatus === 'won'
                    ? winner === 1
                      ? '黑方获胜'
                      : '白方获胜'
                    : '平局'}
                </h2>

                <p className="font-serif-sc text-wood-dark/70 mb-2">
                  黑 {black} : 白 {white}
                </p>

                <p className="font-serif-sc text-wood-dark/70 mb-6">
                  {isOnline
                    ? gameStatus === 'won'
                      ? winner === onlineState.playerColor
                        ? '棋艺精湛，再接再厉'
                        : '总结经验，下次必胜'
                      : '棋逢对手，难分胜负'
                    : gameStatus === 'won'
                    ? winner === 1
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
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={isOnline ? handleLeaveOnline : handleReset}
                    className="flex-1 seal-btn py-3"
                  >
                    {isOnline ? '退出房间' : '再来一局'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 悔棋请求弹窗（联机模式：对方请求悔棋） */}
      <AnimatePresence>
        {isOnline && onlineState.undoRequestStatus === 'received' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="wood-panel p-8 max-w-sm w-full text-center"
            >
              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-vermilion/20"
                >
                  <Undo2 size={32} className="text-vermilion" />
                </motion.div>
                <h2 className="font-calligraphy text-3xl text-wood-dark mb-2">
                  悔棋请求
                </h2>
                <p className="font-serif-sc text-wood-dark/70 mb-6">
                  对方请求悔棋，是否同意？
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
    </motion.div>
  );
}
