import { useState, useEffect, useRef } from 'react';
import type { AIState } from '../tfjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { PlayerInfo } from './PlayerInfo';
import { PlayingCard } from './PlayingCard';
import { HandCards } from './HandCards';
import { PlayedCards } from './PlayedCards';
import { ControlPanel } from './ControlPanel';
import { ResultModal } from './ResultModal';
import { RulesModal } from './RulesModal';
import { Toast } from './Toast';
import { CardCounter } from './CardCounter';
import { ModelLoadingIndicator } from './ModelLoadingIndicator';
import {
  DouZeroHintPanel,
  formatCardsShort,
  readHintEnabled,
  writeHintEnabled,
  type HintOption,
} from './DouZeroHintPanel';
import { getCardType, canBeat, findAllPlays } from '../game/rules';
import { decideBid, decidePlayAsync, decidePlayTopK, resetDouZeroAI } from '../game/ai';
import {
  setSoundEnabled,
  playDealSound,
  playPlaySound,
  playPassSound,
  playBombSound,
  playRocketSound,
  playWinSound,
  playLoseSound,
  playBidSound,
  playNoBidSound,
  playCountdownSound,
  playStraightSound,
  playDoubleStraightSound,
  playTripleStraightSound,
} from '../game/sound';
import type { Card, PlayerPosition } from '../game/types';

interface GameScreenProps {
  onBack: () => void;
}

export function GameScreen({ onBack }: GameScreenProps) {
  const {
    gamePhase,
    gameMode,
    players,
    landlordPosition,
    currentPlayer,
    lastPlay,
    selectedCards,
    bottomCards,
    currentBid,
    winner,
    myPosition,
    soundEnabled,
    countdown,
    countdownEnabled,
    toastMessage,
    difficulty,
    playHistory,
    undoRequestStatus,
    selectCard,
    clearSelectedCards,
    playCards,
    pass,
    bid,
    toggleAutoPlay,
    toggleSound,
    toggleCountdown,
    decrementCountdown,
    resetGame,
    backToMenu,
    showToast,
    onlinePlayers,
    mySeatIndex,
    sendUndoRequest,
    acceptUndo,
    rejectUndo,
    debugRevealOpponents,
    toggleDebugReveal,
  } = useGameStore();

  // DouZero 模型加载状态
  const [douzeroLoaded, setDouzeroLoaded] = useState(false);
  const [modelState, setModelState] = useState<AIState>('idle');
  const [hintEnabled, setHintEnabled] = useState(readHintEnabled);
  const [hintOptions, setHintOptions] = useState<HintOption[]>([]);
  const [hintLoading, setHintLoading] = useState(false);

  const [showRules, setShowRules] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const myCards = players[myPosition].cards;
  const isMyTurn = currentPlayer === myPosition;
  const canPass = lastPlay !== null && lastPlay.player !== myPosition;

  const selectedCardObjects = myCards.filter(c => selectedCards.includes(c.id));
  const selectedCardType = getCardType(selectedCardObjects);

  const canPlay = (() => {
    if (gamePhase !== 'playing') return false;
    if (!isMyTurn) return false;
    if (selectedCardObjects.length === 0) return false;
    if (!selectedCardType) return false;
    if (lastPlay && lastPlay.player !== myPosition) {
      return canBeat(selectedCardObjects, lastPlay);
    }
    return true;
  })();

  useEffect(() => {
    if (gamePhase === 'ended') {
      setTimeout(() => setShowResult(true), 500);
    } else {
      setShowResult(false);
    }
  }, [gamePhase]);

  useEffect(() => {
    setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  const prevGamePhaseRef = useRef<typeof gamePhase>(gamePhase);
  const prevLastPlayRef = useRef<typeof lastPlay>(lastPlay);
  const prevWinnerRef = useRef<typeof winner>(winner);
  const prevBidCountRef = useRef(useGameStore.getState().bidCount);
  const prevCountdownRef = useRef(countdown);

  useEffect(() => {
    if (prevGamePhaseRef.current === 'waiting' && gamePhase === 'bidding') {
      playDealSound();
    }
    prevGamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  useEffect(() => {
    if (lastPlay && lastPlay !== prevLastPlayRef.current) {
      if (lastPlay.cardType === 'rocket') {
        playRocketSound();
      } else if (lastPlay.cardType === 'bomb') {
        playBombSound();
      } else if (lastPlay.cardType === 'straight') {
        playStraightSound();
      } else if (lastPlay.cardType === 'straight_pair') {
        playDoubleStraightSound();
      } else if (lastPlay.cardType === 'airplane' || lastPlay.cardType === 'airplane_single' || lastPlay.cardType === 'airplane_pair') {
        playTripleStraightSound();
      } else {
        playPlaySound();
      }
    }
    prevLastPlayRef.current = lastPlay;
  }, [lastPlay]);

  const prevPlayHistoryLenRef = useRef(useGameStore.getState().playHistory.length);
  useEffect(() => {
    const history = useGameStore.getState().playHistory;
    if (history.length > prevPlayHistoryLenRef.current) {
      const latest = history[history.length - 1];
      if (latest.cardType === 'pass') {
        playPassSound();
      }
    }
    prevPlayHistoryLenRef.current = history.length;
  }, [gamePhase, currentPlayer]);

  useEffect(() => {
    const state = useGameStore.getState();
    const currentBidCount = state.bidCount;
    if (currentBidCount > prevBidCountRef.current) {
      const latestBid = state.currentBid;
      if (latestBid === 0) {
        playNoBidSound();
      } else {
        playBidSound(latestBid);
      }
    }
    prevBidCountRef.current = currentBidCount;
  }, [gamePhase, currentBid]);

  useEffect(() => {
    if (winner && winner !== prevWinnerRef.current) {
      const playerIsLandlord = landlordPosition === myPosition;
      const iWin = (winner === 'landlord' && playerIsLandlord) || (winner === 'farmer' && !playerIsLandlord);
      if (iWin) {
        playWinSound();
      } else {
        playLoseSound();
      }
    }
    prevWinnerRef.current = winner;
  }, [winner, landlordPosition, myPosition]);

  useEffect(() => {
    if (gamePhase !== 'playing' && gamePhase !== 'bidding') return;
    if (!countdownEnabled) return;
    if (currentPlayer !== myPosition) return;
    if (players[myPosition].isAutoPlay) return;

    if (countdown <= 3 && countdown > 0 && countdown !== prevCountdownRef.current) {
      playCountdownSound();
    }
    prevCountdownRef.current = countdown;

    if (countdown === 0) {
      if (gamePhase === 'playing') {
        const plays = findAllPlays(players[myPosition].cards, lastPlay);
        if (plays.length > 0) {
          const smallestPlay = plays[0];
          useGameStore.setState({ selectedCards: smallestPlay.map(c => c.id) });
          useGameStore.getState().playCards();
        } else {
          if (lastPlay && lastPlay.player !== myPosition) {
            useGameStore.getState().pass();
          }
        }
      } else if (gamePhase === 'bidding') {
        bid(0);
      }
    }
  }, [countdown, countdownEnabled, currentPlayer, myPosition, gamePhase, players, lastPlay, bid]);

  useEffect(() => {
    if (!countdownEnabled) return;
    if (gamePhase !== 'playing' && gamePhase !== 'bidding') return;
    if (currentPlayer !== myPosition) return;
    if (players[myPosition].isAutoPlay) return;

    const timer = setInterval(() => {
      decrementCountdown();
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownEnabled, currentPlayer, myPosition, gamePhase, players, decrementCountdown]);

  const aiThinkingRef = useRef(false);
  const hintCycleRef = useRef(0);

  // 轮到新一手时,重置提示推荐序号
  useEffect(() => {
    hintCycleRef.current = 0;
  }, [currentPlayer, lastPlay]);

  // 轮到自己出牌时刷新 DouZero 侧栏推荐
  useEffect(() => {
    if (gameMode !== 'pve' || gamePhase !== 'playing') {
      setHintOptions([]);
      return;
    }
    if (!hintEnabled || !douzeroLoaded || modelState !== 'ready') {
      setHintOptions([]);
      return;
    }
    if (currentPlayer !== myPosition || players[myPosition].isAutoPlay) {
      setHintOptions([]);
      return;
    }

    let cancelled = false;
    setHintLoading(true);

    (async () => {
      try {
        const state = useGameStore.getState();
        const pos = state.myPosition;
        const hand = state.players[pos].cards;
        const isLandlord = state.players[pos].isLandlord;
        const partnerPos = pos === 'left' ? 'right' : pos === 'right' ? 'left' : 'left';
        const landlordPos = state.landlordPosition || 'bottom';
        const history = state.playHistory.map((h) => ({
          player: h.player,
          cards: h.cards,
          cardType: h.cardType,
        }));

        const topK = await decidePlayTopK(
          hand,
          state.lastPlay,
          pos,
          isLandlord,
          state.difficulty,
          state.players[partnerPos].remaining,
          state.players[landlordPos].remaining,
          history,
          state.landlordPosition || undefined,
          3
        );

        if (cancelled) return;
        setHintOptions(
          (topK || []).map((cards) => ({
            cards,
            label: formatCardsShort(cards),
          }))
        );
      } catch {
        if (!cancelled) setHintOptions([]);
      } finally {
        if (!cancelled) setHintLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    gameMode,
    gamePhase,
    hintEnabled,
    douzeroLoaded,
    modelState,
    currentPlayer,
    myPosition,
    lastPlay,
    players,
  ]);

  const handleHintEnabledChange = (enabled: boolean) => {
    setHintEnabled(enabled);
    writeHintEnabled(enabled);
  };

  const handleApplyHint = (cards: Card[]) => {
    useGameStore.setState({ selectedCards: cards.map((c) => c.id) });
    showToast(
      cards.length === 0 ? 'DouZero 建议：过牌' : `已选中推荐：${formatCardsShort(cards)}`
    );
  };

  useEffect(() => {
    if (gameMode === 'online') return;
    if (gamePhase !== 'bidding' && gamePhase !== 'playing') return;
    if (!players[currentPlayer].isAutoPlay) return;
    if (aiThinkingRef.current) return;

    aiThinkingRef.current = true;

    const delay = gamePhase === 'bidding'
      ? 2000 + Math.random() * 1500
      : 2500 + Math.random() * 1500;

    const timer = setTimeout(async () => {
      const state = useGameStore.getState();
      const currentPos = state.currentPlayer;

      if (state.gamePhase === 'bidding') {
        const hand = state.players[currentPos].cards;
        const bidScore = decideBid(hand, state.currentBid, currentPos, state.players[currentPos].isLandlord, state.difficulty);
        useGameStore.getState().aiBid(currentPos, bidScore as 0 | 1 | 2 | 3);
        if (bidScore === 0) {
          showToast(`${state.players[currentPos].name}：不叫`);
        } else {
          showToast(`${state.players[currentPos].name}：${bidScore}分`);
        }
      } else if (state.gamePhase === 'playing') {
        const hand = state.players[currentPos].cards;
        const isLandlord = state.players[currentPos].isLandlord;

        const partnerPos = currentPos === 'left' ? 'right' : currentPos === 'right' ? 'left' : 'left';
        const landlordPos = state.landlordPosition || 'bottom';
        const partnerRemaining = state.players[partnerPos].remaining;
        const landlordRemaining = state.players[landlordPos].remaining;

        const playHistory = state.playHistory.map(h => ({
          player: h.player,
          cards: h.cards,
          cardType: h.cardType,
        }));

        const play = await decidePlayAsync(
          hand,
          state.lastPlay,
          currentPos,
          isLandlord,
          state.difficulty,
          partnerRemaining,
          landlordRemaining,
          playHistory,
          state.landlordPosition || undefined
        );

        if (play && play.length > 0) {
          const cardIds = play.map(c => c.id);
          const success = useGameStore.getState().aiPlayCards(currentPos, cardIds);
          if (!success) {
            useGameStore.getState().aiPass(currentPos);
            showToast(`${state.players[currentPos].name}：不出`);
          }
        } else {
          useGameStore.getState().aiPass(currentPos);
          showToast(`${state.players[currentPos].name}：不出`);
        }
      }

      aiThinkingRef.current = false;
    }, delay);

    return () => {
      clearTimeout(timer);
      aiThinkingRef.current = false;
    };
  }, [gamePhase, currentPlayer, gameMode, myPosition, players, showToast]);

  // 在线模式：房主在机器人回合替其算牌并广播
  useEffect(() => {
    if (gameMode !== 'online') return;
    const amHost = onlinePlayers.find(p => p.seatIndex === mySeatIndex)?.isHost;
    if (!amHost) return;
    if (gamePhase !== 'bidding' && gamePhase !== 'playing') return;

    const seatOf = (pos: 'bottom' | 'left' | 'right') =>
      (mySeatIndex + (['bottom', 'left', 'right'].indexOf(pos))) % 3;

    const currentSeat = seatOf(currentPlayer);
    const botPlayer = onlinePlayers.find(p => p.seatIndex === currentSeat && p.isBot);
    if (!botPlayer) return;

    if (aiThinkingRef.current) return;
    aiThinkingRef.current = true;

    const delay = gamePhase === 'bidding' ? 1000 + Math.random() * 600 : 800 + Math.random() * 400;
    const timer = setTimeout(async () => {
      aiThinkingRef.current = false;
      const store = useGameStore.getState();
      if (store.gamePhase === 'bidding') {
        store.onlineBotBid(currentPlayer);
      } else if (store.gamePhase === 'playing') {
        const botSeat = seatOf(currentPlayer);
        const hand = store.onlineBotHands[botSeat];
        const partnerPos = currentPlayer === 'left' ? 'right' : currentPlayer === 'right' ? 'left' : 'left';
        const play = await decidePlayAsync(
          hand || [],
          store.lastPlay,
          currentPlayer,
          store.players[currentPlayer].isLandlord,
          store.difficulty,
          store.players[partnerPos].remaining,
          store.players[store.landlordPosition || 'bottom'].remaining,
          store.playHistory.map(h => ({ player: h.player, cards: h.cards, cardType: h.cardType })),
          store.landlordPosition || undefined,
        );
        if (play && play.length > 0) {
          store.onlineBotPlay(currentPlayer, play.map(c => c.id));
        } else {
          store.onlineBotPass(currentPlayer);
        }
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      aiThinkingRef.current = false;
    };
  }, [gamePhase, currentPlayer, gameMode, mySeatIndex, myPosition, onlinePlayers]);

  const handlePlay = () => {
    const success = playCards();
    if (!success) {
      showToast('牌型不正确或压不过上家');
    }
  };

  const handlePass = () => {
    const success = pass();
    if (!success) {
      showToast('无法不出');
    }
  };

  const handleHint = async () => {
    if (!isMyTurn || gamePhase !== 'playing') return;

    const hand = myCards;
    const pos = myPosition;
    const isLandlord = players[pos].isLandlord;
    const partnerPos = pos === 'left' ? 'right' : pos === 'right' ? 'left' : 'left';
    const landlordPos = useGameStore.getState().landlordPosition || 'bottom';
    const playHistory = useGameStore.getState().playHistory.map(h => ({
      player: h.player,
      cards: h.cards,
      cardType: h.cardType,
    }));

    const topK = await decidePlayTopK(
      hand,
      lastPlay,
      pos,
      isLandlord,
      difficulty,
      players[partnerPos].remaining,
      players[landlordPos].remaining,
      playHistory,
      useGameStore.getState().landlordPosition || undefined,
      3
    );

    if (!topK || topK.length === 0) {
      showToast('没有可以出的牌');
      return;
    }

    const idx = hintCycleRef.current % topK.length;
    const nextPlay = topK[idx];
    useGameStore.setState({ selectedCards: nextPlay.map(c => c.id) });
    showToast(
      nextPlay.length === 0
        ? `DouZero 建议：过牌（第 ${idx + 1}/${topK.length} 手）`
        : `DouZero 推荐第 ${idx + 1}/${topK.length} 手`
    );
    hintCycleRef.current = idx + 1;
  };

  const handleReloadModel = () => {
    setModelState('loading');
    setDouzeroLoaded(false);
    resetDouZeroAI();
  };

  const handleBid = (score: 0 | 1 | 2 | 3) => {
    bid(score);
  };

  const handlePlayAgain = () => {
    setShowResult(false);
    resetGame();
  };

  const handleBackToMenu = () => {
    setShowResult(false);
    backToMenu();
    onBack();
  };

  const handleUndoRequest = () => {
    sendUndoRequest();
  };

  const isOnlineMode = gameMode === 'online';
  const canRequestUndo = isOnlineMode && gamePhase === 'playing' && playHistory.length > 0;
  const undoWaiting = undoRequestStatus === 'sent';

  const getLastPlayForPosition = (position: PlayerPosition): { cards: Card[]; cardType: any } | null => {
    if (lastPlay && lastPlay.player === position) {
      return { cards: lastPlay.cards, cardType: lastPlay.cardType };
    }
    const history = useGameStore.getState().playHistory;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].player === position) {
        return { cards: history[i].cards, cardType: history[i].cardType };
      }
    }
    return null;
  };

  const leftPlay = getLastPlayForPosition('left');
  const rightPlay = getLastPlayForPosition('right');
  const bottomPlay = getLastPlayForPosition('bottom');

  const phaseText = {
    waiting: '等待开始',
    bidding: '叫地主阶段',
    playing: '出牌阶段',
    ended: '游戏结束',
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1a3e] to-[#24243e]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.25)_0%,_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(236,72,153,0.18)_0%,_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.12)_0%,_transparent_70%)]" />
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `
          radial-gradient(circle at 15% 25%, rgba(167,139,250,0.18) 0%, transparent 35%),
          radial-gradient(circle at 85% 75%, rgba(244,114,182,0.15) 0%, transparent 35%),
          radial-gradient(circle at 50% 50%, rgba(96,165,250,0.08) 0%, transparent 60%)
        `
      }} />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
      }} />

      <div className="relative z-10 flex flex-col h-screen p-2 md:p-4">
        {/* DouZero 模型加载指示器 - 人机模式且尚未加载完成时显示 */}
        {gameMode === 'pve' && !douzeroLoaded && (
          <ModelLoadingIndicator
            onLoadComplete={() => {
              console.log('[GameScreen] DouZero 模型加载完成');
              setDouzeroLoaded(true);
              setModelState('ready');
            }}
            onLoadError={(error) => {
              console.error('[GameScreen] DouZero 加载失败:', error);
              setDouzeroLoaded(true); // 仍然设置为 true，让游戏继续
              setModelState('error');
            }}
            onStateChange={(state) => setModelState(state)}
          />
        )}
        <div className="flex items-center justify-between mb-2">
          <ControlPanel
            onBack={handleBackToMenu}
            onToggleSound={toggleSound}
            onToggleCountdown={toggleCountdown}
            onShowRules={() => setShowRules(true)}
            algorithmState={modelState}
            onReloadModel={handleReloadModel}
            onUndo={isOnlineMode ? handleUndoRequest : undefined}
            undoDisabled={!canRequestUndo}
            undoWaiting={undoWaiting}
            onToggleDebugReveal={!isOnlineMode && gamePhase !== 'waiting' ? toggleDebugReveal : undefined}
            soundEnabled={soundEnabled}
            countdownEnabled={countdownEnabled}
            countdown={countdown}
            showCountdown={countdownEnabled && (gamePhase === 'playing' || gamePhase === 'bidding') && currentPlayer === myPosition && !players[myPosition].isAutoPlay}
            debugRevealOpponents={debugRevealOpponents}
          />
          <div className="text-white/80 text-sm font-medium px-3 py-1 bg-black/30 rounded-full">
            {phaseText[gamePhase]}
          </div>
          <div className="text-yellow-400 font-bold">
            {currentBid > 0 ? `${currentBid}分` : ''}
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row relative">
          <div className={`relative z-10 md:w-32 flex md:flex-col items-center justify-start md:justify-center gap-2 md:gap-4`}>
            <PlayerInfo
              position="left"
              name={players.left.name}
              remaining={players.left.remaining}
              isLandlord={landlordPosition === 'left'}
              isActive={currentPlayer === 'left' && gamePhase === 'playing'}
              isAutoPlay={players.left.isAutoPlay}
            />
            {debugRevealOpponents && !isOnlineMode && (
              <div className="absolute left-0 top-0 mt-20 z-20">
                <OpponentHand cards={players.left.cards} />
              </div>
            )}
            <div className="hidden md:block flex-1 flex items-center justify-center">
              {leftPlay && (
                <PlayedCards
                  cards={leftPlay.cards}
                  cardType={leftPlay.cardType}
                  position="left"
                  size="small"
                />
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative">
            {gamePhase !== 'waiting' && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-1 mb-4"
              >
                {bottomCards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ rotateY: 180 }}
                    animate={{ rotateY: gamePhase === 'playing' ? 0 : 180 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <PlayingCard
                      card={gamePhase === 'playing' ? card : undefined}
                      faceDown={gamePhase !== 'playing'}
                      size="small"
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            <div className="text-white/60 text-xs mb-2">
              {landlordPosition && players[landlordPosition].name} 是地主
            </div>

            <div className="md:hidden flex justify-around w-full mb-4">
              <div className="flex-1 flex justify-center">
                {leftPlay && (
                  <PlayedCards
                    cards={leftPlay.cards}
                    cardType={leftPlay.cardType}
                    position="left"
                    size="small"
                  />
                )}
              </div>
              <div className="flex-1 flex justify-center">
                {rightPlay && (
                  <PlayedCards
                    cards={rightPlay.cards}
                    cardType={rightPlay.cardType}
                    position="right"
                    size="small"
                  />
                )}
              </div>
            </div>

            <div className="hidden md:block">
              {lastPlay && lastPlay.player !== myPosition && (
                <PlayedCards
                  cards={lastPlay.cards}
                  cardType={lastPlay.cardType}
                  position={lastPlay.player}
                  size="normal"
                />
              )}
              {lastPlay && lastPlay.player === myPosition && bottomPlay && (
                <PlayedCards
                  cards={bottomPlay.cards}
                  cardType={bottomPlay.cardType}
                  position="bottom"
                  size="normal"
                />
              )}
              {!lastPlay && gamePhase === 'playing' && isMyTurn && (
                <div className="text-white/50 text-lg">你先出牌</div>
              )}
            </div>

            {gamePhase === 'bidding' && isMyTurn && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex gap-3 mt-4"
              >
                {[0, 1, 2, 3].map((score) => (
                  <motion.button
                    key={score}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBid(score as 0 | 1 | 2 | 3)}
                    disabled={score > 0 && score <= currentBid}
                    className={`
                      w-14 h-14 rounded-full font-bold text-lg
                      transition-all duration-200
                      ${score === 0 
                        ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                        : score > currentBid 
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-yellow-900' 
                          : 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
                      }
                    `}
                  >
                    {score === 0 ? '不叫' : `${score}分`}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {gamePhase === 'bidding' && !isMyTurn && (
              <div className="text-white/60 text-sm mt-4">
                {players[currentPlayer].name} 正在思考...
              </div>
            )}
          </div>

          <div className={`relative z-10 md:w-32 flex md:flex-col items-center justify-end md:justify-center gap-2 md:gap-4`}>
            <PlayerInfo
              position="right"
              name={players.right.name}
              remaining={players.right.remaining}
              isLandlord={landlordPosition === 'right'}
              isActive={currentPlayer === 'right' && gamePhase === 'playing'}
              isAutoPlay={players.right.isAutoPlay}
            />
            {debugRevealOpponents && !isOnlineMode && (
              <div className="absolute right-0 top-0 mt-20 z-20">
                <OpponentHand cards={players.right.cards} />
              </div>
            )}
            <div className="hidden md:block flex-1 flex items-center justify-center">
              {rightPlay && (
                <PlayedCards
                  cards={rightPlay.cards}
                  cardType={rightPlay.cardType}
                  position="right"
                  size="small"
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex items-center justify-between mb-2 px-2 gap-2">
            <div className="flex items-end gap-1 min-w-0">
              <PlayerInfo
                position="bottom"
                name={players.bottom.name}
                remaining={players.bottom.remaining}
                isLandlord={landlordPosition === 'bottom'}
                isActive={currentPlayer === 'bottom' && gamePhase === 'playing'}
                isAutoPlay={players.bottom.isAutoPlay}
              />
              <DouZeroHintPanel
                visible={gameMode === 'pve' && (gamePhase === 'playing' || gamePhase === 'bidding')}
                loading={hintLoading}
                options={hintOptions}
                onApply={handleApplyHint}
                enabled={hintEnabled}
                onEnabledChange={handleHintEnabledChange}
              />
            </div>
            <ControlPanel
              onHint={gamePhase === 'playing' ? handleHint : undefined}
              onToggleAutoPlay={() => toggleAutoPlay(myPosition)}
              isAutoPlay={players[myPosition].isAutoPlay}
              countdown={countdown}
              showCountdown={countdownEnabled && (gamePhase === 'playing' || gamePhase === 'bidding') && currentPlayer === myPosition && !players[myPosition].isAutoPlay}
            />
          </div>

          {(gamePhase === 'playing' || gamePhase === 'bidding') && (
            <HandCards
              cards={myCards}
              selectedCardIds={selectedCards}
              onSelectCard={selectCard}
              onClearSelection={
                gamePhase === 'playing' && selectedCards.length > 0
                  ? clearSelectedCards
                  : undefined
              }
              onPlay={gamePhase === 'playing' ? handlePlay : undefined}
              onPass={gamePhase === 'playing' ? handlePass : undefined}
              onHint={gamePhase === 'playing' ? handleHint : undefined}
              disabled={!isMyTurn || (gamePhase === 'playing' && players[myPosition].isAutoPlay)}
              canPlay={canPlay}
              canPass={canPass}
              size="normal"
            />
          )}
        </div>
      </div>

      <Toast message={toastMessage} />

      <ResultModal
        isOpen={showResult}
        winner={winner}
        landlordName={landlordPosition ? players[landlordPosition].name : ''}
        playerIsLandlord={landlordPosition === myPosition}
        onPlayAgain={handlePlayAgain}
        onBackToMenu={handleBackToMenu}
      />

      <UndoRequestModal
        status={undoRequestStatus}
        onAccept={acceptUndo}
        onReject={rejectUndo}
      />

      {gamePhase !== 'waiting' && <CardCounter />}

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}

function OpponentHand({ cards }: { cards: Card[] }) {
  // 卡牌尺寸（small）
  const cardWidth = 52;
  const cardHeight = 76;

  // 堆叠参数：每张卡片露出 45% 宽度（重叠 55%）
  const overlap = cardWidth * 0.55;
  const cardsPerRow = Math.ceil(cards.length / 2); // 最多 2 行
  const rowWidth = cardWidth + (cardsPerRow - 1) * (cardWidth - overlap);

  return (
    <div className="relative py-2 px-2 rounded-lg bg-gradient-to-br from-purple-900/70 to-slate-900/70 border border-purple-500/30 shadow-lg">
      <span className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 bg-purple-500/40 rounded text-purple-100 z-10">
        调试
      </span>
      {/* 第一行 */}
      <div
        className="relative mb-2"
        style={{ height: cardHeight, width: rowWidth, minWidth: cardWidth }}
      >
        {cards.slice(0, cardsPerRow).map((card, index) => (
          <div
            key={card.id}
            style={{
              position: 'absolute',
              left: index * (cardWidth - overlap),
              top: 0,
              zIndex: index,
            }}
          >
            <PlayingCard card={card} size="small" disabled />
          </div>
        ))}
      </div>
      {/* 第二行（如有） */}
      {cards.length > cardsPerRow && (
        <div
          className="relative"
          style={{ height: cardHeight, width: rowWidth, minWidth: cardWidth }}
        >
          {cards.slice(cardsPerRow).map((card, index) => (
            <div
              key={card.id}
              style={{
                position: 'absolute',
                left: index * (cardWidth - overlap),
                top: 0,
                zIndex: index,
              }}
            >
              <PlayingCard card={card} size="small" disabled />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface UndoRequestModalProps {
  status: 'none' | 'sent' | 'received';
  onAccept: () => void;
  onReject: () => void;
}

function UndoRequestModal({ status, onAccept, onReject }: UndoRequestModalProps) {
  const isReceived = status === 'received';
  const isSent = status === 'sent';

  return (
    <AnimatePresence>
      {(isReceived || isSent) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-80 rounded-2xl overflow-hidden bg-gradient-to-b from-purple-600 to-purple-800 p-8 text-center"
          >
            <motion.div
              animate={isSent ? { rotate: 360 } : {}}
              transition={isSent ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center"
            >
              <Undo2 size={40} className="text-white" />
            </motion.div>

            <h2 className="text-2xl font-bold text-white mb-2">
              {isSent ? '等待对方回应' : '对方请求悔棋'}
            </h2>

            <p className="text-sm text-white/70 mb-6">
              {isSent
                ? '已发送悔棋请求，等待对方同意...'
                : '对方请求悔棋，是否同意？'}
            </p>

            {isReceived ? (
              <div className="flex gap-3 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onReject}
                  className="px-6 py-2 rounded-xl bg-black/30 text-white font-bold"
                >
                  拒绝
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onAccept}
                  className="px-6 py-2 rounded-xl bg-white text-purple-700 font-bold"
                >
                  同意
                </motion.button>
              </div>
            ) : (
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full bg-white"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
