import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wifi, WifiOff, Hash, User } from 'lucide-react';
import { useGameStore } from './store/gameStore';
import { ChessBoard } from './components/ChessBoard';
import { ControlPanel } from './components/ControlPanel';
import { MainMenu } from './components/MainMenu';
import { OnlineWaitingRoom } from './components/OnlineWaitingRoom';
import { RematchModal } from './components/RematchModal';
import { RulesModal } from './components/RulesModal';
import { ResultModal } from './components/ResultModal';
import { Toast } from './components/Toast';
import { UndoModal } from './components/UndoModal';
import { DoudizhuApp } from './doudizhu/App';
import { JanggiGame } from './games/janggi/JanggiGame';
import { ChessGame } from './games/chess/ChessGame';
import { JunqiGame } from './games/junqi/JunqiGame';
import { WeiqiGame } from './games/weiqi/WeiqiGame';
import { ShogiGame } from './games/shogi/ShogiGame';
import { OthelloGame } from './games/othello/OthelloGame';
import { Connect4Game } from './games/connect4/Connect4Game';
import { RoguelikeGame } from './games/roguelike/RoguelikeGame';

function useIsLandscapeMobile() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const check = () => {
      const isLand = window.innerHeight < window.innerWidth;
      const isShort = window.innerHeight <= 500;
      const isMobile = window.innerWidth < 1024;
      setIsLandscape(isLand && isShort && isMobile);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return isLandscape;
}

function GameScreen() {
  const [showRules, setShowRules] = useState(false);
  const isLandscapeMobile = useIsLandscapeMobile();
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
    autoPlayBlack,
    myColor,
    opponentName,
    opponentConnected,
    roomId,
    onlineStatus,
    leaveOnlineRoom,
  } = useGameStore();

  const isCurrentPlayerAutoPlay = currentPlayer === 'red' ? autoPlayRed : autoPlayBlack;
  const isWatchMode = gameMode === 'watch';
  const isOnlineMode = gameMode === 'online';
  const isDisconnected = isOnlineMode && onlineStatus === 'disconnected';

  const getStatusText = () => {
    if (gameStatus !== 'playing') {
      return gameStatus === 'checkmate'
        ? '将死！'
        : gameStatus === 'stalemate'
        ? '和棋'
        : '认输';
    }
    if (isWatchMode) {
      const currentPlayerName = currentPlayer === 'red' ? '红方' : '黑方';
      const isCurrentAutoPlay = currentPlayer === 'red' ? autoPlayRed : autoPlayBlack;
      if (isCurrentAutoPlay && isAIThinking) {
        return `${currentPlayerName}思考中...`;
      }
      return `${currentPlayerName}走棋`;
    }
    if (isOnlineMode) {
      if (!opponentConnected) {
        return '对手已断开';
      }
      const isMyTurn = myColor && currentPlayer === myColor;
      return isMyTurn ? '轮到你走棋' : '对手思考中...';
    }
    if (isCurrentPlayerAutoPlay && isAIThinking) {
      return `${currentPlayer === 'red' ? '红方' : '黑方'}托管中`;
    }
    if (isAIThinking) {
      return 'AI 思考中...';
    }
    return `${currentPlayer === 'red' ? '红方' : '黑方'}走棋`;
  };

  const statusText = getStatusText();

  const handleBackToMenu = () => {
    if (isOnlineMode) {
      leaveOnlineRoom();
    } else {
      backToMenu();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`min-h-screen relative ${isLandscapeMobile ? 'landscape-game' : ''}`}
    >
      <AnimatePresence>
        {isDisconnected && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-40 py-3 px-4 text-center"
            style={{
              background: 'linear-gradient(135deg, #8B0000, #B22222)',
              boxShadow: '0 4px 20px rgba(178, 34, 34, 0.5)',
            }}
          >
            <div className="flex items-center justify-center gap-2 text-ivory">
              <WifiOff size={18} />
              <span className="font-serif-sc">连接断开，请检查网络</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`relative z-10 min-h-screen flex flex-col ${isDisconnected ? 'pt-14' : ''}`}>
        <header className="flex items-center justify-between px-4 py-3 border-b border-ivory/10">
          <button
            onClick={handleBackToMenu}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
          >
            <span className="text-lg">←</span>
            <span className="font-serif-sc text-sm">返回</span>
          </button>

          <div className="text-center flex-1">
            <h1 className="font-calligraphy text-2xl text-ivory game-title">中国象棋</h1>
            {isOnlineMode && roomId && (
              <div className="flex items-center justify-center gap-1 text-ivory/50 text-xs font-serif-sc">
                <Hash size={12} />
                <span>房间号: {roomId}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
              title={soundEnabled ? '关闭音效' : '开启音效'}
            >
              <span className="text-lg">{soundEnabled ? '🔊' : '🔇'}</span>
            </button>

            {isOnlineMode ? (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-serif-sc ${
                opponentConnected
                  ? 'bg-jade/20 text-jade'
                  : 'bg-vermilion/20 text-vermilion'
              }`}>
                {opponentConnected ? (
                  <Wifi size={14} className="animate-pulse" />
                ) : (
                  <WifiOff size={14} />
                )}
                <div className="flex items-center gap-1">
                  <User size={12} />
                  <span className="hidden sm:inline">
                    {opponentName || '对手'}
                  </span>
                  <span className="sm:hidden">
                    {opponentConnected ? '在线' : '离线'}
                  </span>
                </div>
              </div>
            ) : (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-serif-sc ${
                isWatchMode
                  ? isCurrentPlayerAutoPlay
                    ? currentPlayer === 'red'
                      ? 'bg-vermilion/20 text-vermilion'
                      : 'bg-purple-500/20 text-purple-300'
                    : currentPlayer === 'red'
                      ? 'bg-vermilion/20 text-vermilion'
                      : 'bg-ink/30 text-ivory/80'
                  : isCurrentPlayerAutoPlay
                  ? currentPlayer === 'red'
                    ? 'bg-vermilion/20 text-vermilion'
                    : 'bg-purple-500/20 text-purple-300'
                  : currentPlayer === 'red'
                  ? 'bg-vermilion/20 text-vermilion'
                  : 'bg-ink/30 text-ivory/80'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${
                  isWatchMode
                    ? isCurrentPlayerAutoPlay
                      ? currentPlayer === 'red'
                        ? 'bg-vermilion'
                        : 'bg-purple-400'
                      : currentPlayer === 'red'
                        ? 'bg-vermilion'
                        : 'bg-ink/80'
                    : isCurrentPlayerAutoPlay
                    ? currentPlayer === 'red'
                      ? 'bg-vermilion'
                      : 'bg-purple-400'
                    : currentPlayer === 'red'
                    ? 'bg-vermilion'
                    : 'bg-ink/80'
                } ${isCurrentPlayerAutoPlay ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">
                  {isWatchMode
                    ? isCurrentPlayerAutoPlay
                      ? `${currentPlayer === 'red' ? '红方' : '黑方'}思考中`
                      : `${currentPlayer === 'red' ? '红方' : '黑方'}走棋`
                    : isCurrentPlayerAutoPlay
                    ? `${currentPlayer === 'red' ? '红方' : '黑方'}托管中`
                    : gameMode === 'pve' && currentPlayer === 'black'
                    ? 'AI'
                    : currentPlayer === 'red'
                    ? '红方'
                    : '黑方'}
                </span>
              </div>
            )}
          </div>
        </header>

        {isOnlineMode && (
          <div className="text-center py-2 border-b border-ivory/5 header-status">
            <div className="flex items-center justify-center gap-2">
              <span className={`font-calligraphy text-lg ${
                myColor === 'red' ? 'text-vermilion' : 'text-ivory/70'
              }`}>
                红方{myColor === 'red' ? '（你）' : ''}
              </span>
              <span className="text-ivory/30 font-serif-sc">VS</span>
              <span className={`font-calligraphy text-lg ${
                myColor === 'black' ? 'text-ivory' : 'text-ivory/70'
              }`}>
                黑方{myColor === 'black' ? '（你）' : ''}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-8 p-4 game-container">
          <div className="w-full lg:w-64 order-2 lg:order-1 panel-container">
            <div className="lg:sticky lg:top-4">
              <ControlPanel onOpenRules={() => setShowRules(true)} />
            </div>
          </div>

          <div className="w-full max-w-[600px] order-1 lg:order-2 flex-shrink-0 board-container">
            <div className="board-wrapper w-full">
              <div className="text-center mb-3 h-8">
                <AnimatePresence>
                  {inCheck && gameStatus === 'playing' && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="inline-block animate-check-flash font-calligraphy text-2xl text-vermilion font-bold check-indicator"
                      style={{ textShadow: '0 0 15px rgba(178, 34, 34, 0.5)' }}
                    >
                      将 军！
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {(isAIThinking || (isOnlineMode && myColor && currentPlayer !== myColor && opponentConnected && gameStatus === 'playing')) && gameStatus === 'playing' && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full status-text"
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
            </div>
          </div>
        </div>
      </div>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <ResultModal />
      <RematchModal />
      <UndoModal />
      <Toast />
    </motion.div>
  );
}

function XiangqiApp({ onGoToDoudizhu, onGoToJanggi, onGoToChess, onGoToJunqi, onGoToWeiqi, onGoToShogi, onGoToOthello, onGoToConnect4, onGoToRoguelike }: {
  onGoToDoudizhu: () => void;
  onGoToJanggi: () => void;
  onGoToChess: () => void;
  onGoToJunqi: () => void;
  onGoToWeiqi: () => void;
  onGoToShogi: () => void;
  onGoToOthello: () => void;
  onGoToConnect4: () => void;
  onGoToRoguelike: () => void;
}) {
  const { screen } = useGameStore();

  const renderScreen = () => {
    switch (screen) {
      case 'menu':
      case 'pve-setup':
      case 'online-setup':
      case 'settings':
      case 'about':
      case 'gomoku':
        return (
          <motion.div
            key="menu"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <MainMenu onGoToDoudizhu={onGoToDoudizhu} onGoToJanggi={onGoToJanggi} onGoToChess={onGoToChess} onGoToJunqi={onGoToJunqi} onGoToWeiqi={onGoToWeiqi} onGoToShogi={onGoToShogi} onGoToOthello={onGoToOthello} onGoToConnect4={onGoToConnect4} onGoToRoguelike={onGoToRoguelike} />
            <Toast />
          </motion.div>
        );
      case 'waiting':
        return (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <OnlineWaitingRoom />
            <Toast />
          </motion.div>
        );
      case 'game':
        return <GameScreen key="game" />;
      default:
        return (
          <motion.div
            key="menu"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <MainMenu onGoToDoudizhu={onGoToDoudizhu} onGoToJanggi={onGoToJanggi} onGoToChess={onGoToChess} onGoToJunqi={onGoToJunqi} onGoToWeiqi={onGoToWeiqi} onGoToShogi={onGoToShogi} onGoToOthello={onGoToOthello} onGoToConnect4={onGoToConnect4} onGoToRoguelike={onGoToRoguelike} />
            <Toast />
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">{renderScreen()}</AnimatePresence>
    </div>
  );
}

export default function App() {
  const [game, setGame] = useState<'xiangqi' | 'doudizhu' | 'janggi' | 'chess' | 'junqi' | 'weiqi' | 'shogi' | 'othello' | 'connect4' | 'roguelike'>('xiangqi');

  const handleBackToXiangqi = () => {
    setGame('xiangqi');
  };

  const renderGame = () => {
    switch (game) {
      case 'doudizhu':
        return <DoudizhuApp onBack={handleBackToXiangqi} />;
      case 'janggi':
        return <JanggiGame onBack={handleBackToXiangqi} />;
      case 'chess':
        return <ChessGame onBack={handleBackToXiangqi} />;
      case 'junqi':
        return <JunqiGame onBack={handleBackToXiangqi} />;
      case 'weiqi':
        return <WeiqiGame onBack={handleBackToXiangqi} />;
      case 'shogi':
        return <ShogiGame onBack={handleBackToXiangqi} />;
      case 'othello':
        return <OthelloGame onBack={handleBackToXiangqi} />;
      case 'connect4':
        return <Connect4Game onBack={handleBackToXiangqi} />;
      case 'roguelike':
        return <RoguelikeGame onBack={handleBackToXiangqi} />;
      default:
        return (
          <XiangqiApp
            onGoToDoudizhu={() => setGame('doudizhu')}
            onGoToJanggi={() => setGame('janggi')}
            onGoToChess={() => setGame('chess')}
            onGoToJunqi={() => setGame('junqi')}
            onGoToWeiqi={() => setGame('weiqi')}
            onGoToShogi={() => setGame('shogi')}
            onGoToOthello={() => setGame('othello')}
            onGoToConnect4={() => setGame('connect4')}
            onGoToRoguelike={() => setGame('roguelike')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key={game}
          initial={{ opacity: 0, x: game === 'xiangqi' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: game === 'xiangqi' ? 20 : -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderGame()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
