import { create } from 'zustand';
import type { Card, CardType, PlayerPosition, PlayerInfo, GamePhase, GameMode, Difficulty } from '../game/types';
import { createDeck, dealCards, sortCards } from '../game/deck';
import { getCardType, canBeat } from '../game/rules';
import { decideBid, decidePlay } from '../game/ai';
import { roomManager, type RoomState, type DealData, type BidData, type PlayData, type PassData, type GameOverData } from '../game/room';

type LastPlay = {
  player: PlayerPosition;
  cards: Card[];
  cardType: CardType;
  mainRank: number;
  length: number;
} | null;

type PlayHistoryEntry = {
  player: PlayerPosition;
  cards: Card[];
  cardType: CardType | 'pass';
};

type OnlineStatus = 'disconnected' | 'connecting' | 'connected' | 'in_room';

type UndoRequestStatus = 'none' | 'sent' | 'received';

interface OnlinePlayer {
  playerId: string;
  playerName: string;
  seatIndex: number;
  isHost: boolean;
  isReady: boolean;
  isBot?: boolean;
}

interface GameState {
  gamePhase: GamePhase;
  gameMode: GameMode;
  difficulty: Difficulty;
  players: Record<PlayerPosition, PlayerInfo>;
  landlordPosition: PlayerPosition | null;
  currentPlayer: PlayerPosition;
  lastPlay: LastPlay;
  selectedCards: string[];
  bottomCards: Card[];
  currentBid: number;
  bidder: PlayerPosition | null;
  bidCount: number;
  passCount: number;
  playHistory: PlayHistoryEntry[];
  winner: 'landlord' | 'farmer' | null;
  myPosition: PlayerPosition;
  countdown: number;
  countdownEnabled: boolean;
  soundEnabled: boolean;
  doubleSpeed: boolean;
  toastMessage: string | null;
  roomId: string | null;
  onlineStatus: OnlineStatus;
  onlinePlayers: OnlinePlayer[];
  onlineBotHands: Record<number, Card[]>;
  mySeatIndex: number;
  seatToPositionMap: Record<number, PlayerPosition>;
  undoRequestStatus: UndoRequestStatus;
  debugRevealOpponents: boolean;

  startPvEGame: (difficulty: Difficulty) => void;
  selectCard: (cardId: string) => void;
  selectAllCards: () => void;
  playCards: () => boolean;
  pass: () => boolean;
  bid: (score: 0 | 1 | 2 | 3) => void;
  toggleAutoPlay: (position: PlayerPosition) => void;
  toggleSound: () => void;
  toggleCountdown: () => void;
  resetCountdown: () => void;
  decrementCountdown: () => void;
  resetGame: () => void;
  backToMenu: () => void;
  showToast: (message: string) => void;
  nextPlayer: () => void;
  checkWin: () => 'landlord' | 'farmer' | null;
  onlineBotBid: (pos: PlayerPosition) => void;
  onlineBotPlay: (pos: PlayerPosition, cardIds: string[]) => void;
  onlineBotPass: (pos: PlayerPosition) => void;

  createOnlineRoom: (playerName: string) => Promise<string>;
  joinOnlineRoom: (roomId: string, playerName: string) => Promise<void>;
  leaveOnlineRoom: () => void;
  changeSeat: (seatIndex: number) => void;
  startOnlineGame: () => void;
  sendOnlineBid: (score: 0 | 1 | 2 | 3) => void;
  sendOnlinePlay: (cardIds: string[]) => void;
  sendOnlinePass: () => void;
  sendRematchRequest: () => void;
  acceptRematch: () => void;
  sendUndoRequest: () => void;
  acceptUndo: () => void;
  rejectUndo: () => void;
  toggleDebugReveal: () => void;
  handleUndoRequest: () => void;
  handleUndoAccept: () => void;
  handleUndoReject: () => void;
  applyOnlineUndo: () => void;

  aiPlayCards: (position: PlayerPosition, cardIds: string[]) => boolean;
  aiPass: (position: PlayerPosition) => boolean;
  aiBid: (position: PlayerPosition, score: 0 | 1 | 2 | 3) => void;
}

const POSITIONS: PlayerPosition[] = ['bottom', 'right', 'left'];

const SEAT_TO_POSITION: Record<number, PlayerPosition> = {
  0: 'bottom',
  1: 'right',
  2: 'left',
};

function getPositionFromSeat(seatIndex: number, mySeatIndex: number): PlayerPosition {
  const offset = (seatIndex - mySeatIndex + 3) % 3;
  return POSITIONS[offset];
}

function getSeatFromPosition(position: PlayerPosition, mySeatIndex: number): number {
  const offset = POSITIONS.indexOf(position);
  return (mySeatIndex + offset) % 3;
}

function getNextPosition(current: PlayerPosition): PlayerPosition {
  const index = POSITIONS.indexOf(current);
  return POSITIONS[(index + 1) % 3];
}

function createInitialPlayers(): Record<PlayerPosition, PlayerInfo> {
  return {
    bottom: {
      position: 'bottom',
      name: '我',
      cards: [],
      isLandlord: false,
      isAutoPlay: false,
      remaining: 0,
    },
    right: {
      position: 'right',
      name: '右家',
      cards: [],
      isLandlord: false,
      isAutoPlay: true,
      remaining: 0,
    },
    left: {
      position: 'left',
      name: '左家',
      cards: [],
      isLandlord: false,
      isAutoPlay: true,
      remaining: 0,
    },
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  gamePhase: 'waiting',
  gameMode: 'pve',
  difficulty: 'medium',
  players: createInitialPlayers(),
  landlordPosition: null,
  currentPlayer: 'bottom',
  lastPlay: null,
  selectedCards: [],
  bottomCards: [],
  currentBid: 0,
  bidder: null,
  bidCount: 0,
  passCount: 0,
  playHistory: [],
  winner: null,
  myPosition: 'bottom',
  countdown: 15,
  countdownEnabled: false,
  soundEnabled: true,
  doubleSpeed: false,
  toastMessage: null,
  roomId: null,
  onlineStatus: 'disconnected',
  onlinePlayers: [],
  onlineBotHands: {},
  mySeatIndex: 0,
  seatToPositionMap: SEAT_TO_POSITION,
  undoRequestStatus: 'none',
  debugRevealOpponents: false,

  startPvEGame: (difficulty: Difficulty) => {
    const deck = createDeck();
    const { bottom, players: playerCards } = dealCards(deck);

    const firstBidder = POSITIONS[Math.floor(Math.random() * 3)];

    const players = createInitialPlayers();
    players.bottom.cards = playerCards[0];
    players.bottom.remaining = 17;
    players.right.cards = playerCards[1];
    players.right.remaining = 17;
    players.left.cards = playerCards[2];
    players.left.remaining = 17;

    set({
      gamePhase: 'bidding',
      gameMode: 'pve',
      difficulty,
      players,
      landlordPosition: null,
      currentPlayer: firstBidder,
      lastPlay: null,
      selectedCards: [],
      bottomCards: bottom,
      currentBid: 0,
      bidder: null,
      bidCount: 0,
      passCount: 0,
      playHistory: [],
      winner: null,
      myPosition: 'bottom',
      countdown: 15,
      onlineBotHands: {},
      debugRevealOpponents: false,
    });
  },

  selectCard: (cardId: string) => {
    const { selectedCards, myPosition, players } = get();
    const myCards = players[myPosition].cards;
    const myCardIds = new Set(myCards.map(c => c.id));

    if (!myCardIds.has(cardId)) return;

    const newSelected = selectedCards.includes(cardId)
      ? selectedCards.filter(id => id !== cardId)
      : [...selectedCards, cardId];

    set({ selectedCards: newSelected });
  },

  selectAllCards: () => {
    const { selectedCards, myPosition, players } = get();
    const myCards = players[myPosition].cards;

    if (selectedCards.length === myCards.length && selectedCards.length > 0) {
      set({ selectedCards: [] });
    } else {
      set({ selectedCards: myCards.map(c => c.id) });
    }
  },

  playCards: (): boolean => {
    const state = get();
    const { currentPlayer, selectedCards, players, lastPlay, myPosition, gameMode } = state;

    if (state.gamePhase !== 'playing') return false;
    if (currentPlayer !== myPosition) return false;

    const myCards = players[myPosition].cards;
    const cardsToPlay = myCards.filter(c => selectedCards.includes(c.id));

    if (cardsToPlay.length === 0) return false;

    const cardTypeResult = getCardType(cardsToPlay);
    if (!cardTypeResult) return false;

    if (lastPlay && lastPlay.player !== currentPlayer) {
      if (!canBeat(cardsToPlay, lastPlay)) return false;
    }

    if (gameMode === 'online') {
      roomManager.sendPlay(cardsToPlay.map(c => c.id));
    }

    const newPlayers = { ...players };
    const remainingCards = sortCards(myCards.filter(c => !selectedCards.includes(c.id)));
    newPlayers[myPosition] = {
      ...newPlayers[myPosition],
      cards: remainingCards,
      remaining: remainingCards.length,
    };

    const newLastPlay: LastPlay = {
      player: currentPlayer,
      cards: cardsToPlay,
      cardType: cardTypeResult.type,
      mainRank: cardTypeResult.mainRank,
      length: cardTypeResult.length,
    };

    const newPlayHistory = [
      ...state.playHistory,
      {
        player: currentPlayer,
        cards: cardsToPlay,
        cardType: cardTypeResult.type,
      },
    ];

    const nextPos = getNextPosition(currentPlayer);

    set({
      players: newPlayers,
      lastPlay: newLastPlay,
      selectedCards: [],
      passCount: 0,
      playHistory: newPlayHistory,
      currentPlayer: nextPos,
      countdown: 15,
    });

    get().checkWin();
    return true;
  },

  pass: (): boolean => {
    const state = get();
    const { currentPlayer, lastPlay, passCount, myPosition, gameMode } = state;

    if (state.gamePhase !== 'playing') return false;
    if (currentPlayer !== myPosition) return false;
    if (!lastPlay || lastPlay.player === currentPlayer) return false;

    if (gameMode === 'online') {
      roomManager.sendPass();
    }

    const newPassCount = passCount + 1;

    const newPlayHistory = [
      ...state.playHistory,
      {
        player: currentPlayer,
        cards: [],
        cardType: 'pass' as const,
      },
    ];

    if (newPassCount >= 2) {
      set({
        passCount: 0,
        lastPlay: null,
        currentPlayer: lastPlay.player,
        playHistory: newPlayHistory,
        selectedCards: [],
        countdown: 15,
      });
    } else {
      const nextPos = getNextPosition(currentPlayer);
      set({
        passCount: newPassCount,
        currentPlayer: nextPos,
        playHistory: newPlayHistory,
        selectedCards: [],
        countdown: 15,
      });
    }

    return true;
  },

  bid: (score: 0 | 1 | 2 | 3) => {
    const state = get();
    const { currentBid, bidder, currentPlayer, players, bottomCards, gamePhase, bidCount, gameMode, myPosition } = state;

    if (gamePhase !== 'bidding') return;
    if (score < 0 || score > 3) return;
    if (score > 0 && score <= currentBid) return;

    if (gameMode === 'online' && currentPlayer === myPosition) {
      roomManager.sendBid(score);
    }

    const newBid = score > currentBid ? score : currentBid;
    const newBidder = score > currentBid ? currentPlayer : bidder;
    const newBidCount = bidCount + 1;

    if (score === 3) {
      const newPlayers = { ...players };
      const landlordCards = sortCards([...newPlayers[currentPlayer].cards, ...bottomCards]);
      newPlayers[currentPlayer] = {
        ...newPlayers[currentPlayer],
        cards: landlordCards,
        isLandlord: true,
        remaining: landlordCards.length,
      };

      set({
        gamePhase: 'playing',
        landlordPosition: currentPlayer,
        currentBid: 3,
        bidder: currentPlayer,
        bidCount: newBidCount,
        players: newPlayers,
        currentPlayer: currentPlayer,
        lastPlay: null,
        passCount: 0,
        playHistory: [],
        countdown: 15,
      });
      return;
    }

    if (newBidCount >= 3) {
      if (newBidder && newBid > 0) {
        const newPlayers = { ...players };
        const landlordCards = sortCards([...newPlayers[newBidder].cards, ...bottomCards]);
        newPlayers[newBidder] = {
          ...newPlayers[newBidder],
          cards: landlordCards,
          isLandlord: true,
          remaining: landlordCards.length,
        };

        set({
          gamePhase: 'playing',
          landlordPosition: newBidder,
          currentBid: newBid,
          bidder: newBidder,
          bidCount: newBidCount,
          players: newPlayers,
          currentPlayer: newBidder,
          lastPlay: null,
          passCount: 0,
          playHistory: [],
          countdown: 15,
        });
      } else {
        const deck = createDeck();
        const { bottom, players: playerCards } = dealCards(deck);
        const firstBidder = POSITIONS[Math.floor(Math.random() * 3)];

        const newPlayers = createInitialPlayers();
        newPlayers.bottom.cards = playerCards[0];
        newPlayers.bottom.remaining = 17;
        newPlayers.right.cards = playerCards[1];
        newPlayers.right.remaining = 17;
        newPlayers.left.cards = playerCards[2];
        newPlayers.left.remaining = 17;

        set({
          players: newPlayers,
          bottomCards: bottom,
          currentBid: 0,
          bidder: null,
          bidCount: 0,
          currentPlayer: firstBidder,
          playHistory: [],
          countdown: 15,
        });
      }
      return;
    }

    const nextPos = getNextPosition(currentPlayer);
    set({
      currentBid: newBid,
      bidder: newBidder,
      bidCount: newBidCount,
      currentPlayer: nextPos,
      countdown: 15,
    });
  },

  toggleAutoPlay: (position: PlayerPosition) => {
    const { players } = get();
    set({
      players: {
        ...players,
        [position]: {
          ...players[position],
          isAutoPlay: !players[position].isAutoPlay,
        },
      },
    });
  },

  toggleSound: () => {
    set(state => ({ soundEnabled: !state.soundEnabled }));
  },

  toggleCountdown: () => {
    set(state => ({ countdownEnabled: !state.countdownEnabled }));
  },

  resetCountdown: () => {
    set({ countdown: 15 });
  },

  decrementCountdown: () => {
    const state = get();
    if (state.countdown > 0) {
      set({ countdown: state.countdown - 1 });
    }
  },

  resetGame: () => {
    const { gameMode, difficulty } = get();
    if (gameMode === 'pve') {
      get().startPvEGame(difficulty);
    }
  },

  backToMenu: () => {
    const { gameMode } = get();
    if (gameMode === 'online') {
      roomManager.leaveRoom();
    }
    set({
      gamePhase: 'waiting',
      selectedCards: [],
      playHistory: [],
      winner: null,
      lastPlay: null,
      currentBid: 0,
      bidder: null,
      bidCount: 0,
      passCount: 0,
      landlordPosition: null,
      bottomCards: [],
      players: createInitialPlayers(),
      onlineBotHands: {},
      debugRevealOpponents: false,
    });
  },

  showToast: (message: string) => {
    set({ toastMessage: message });
    setTimeout(() => {
      set(state => state.toastMessage === message ? { toastMessage: null } : {});
    }, 2000);
  },

  nextPlayer: () => {
    const { currentPlayer } = get();
    set({ currentPlayer: getNextPosition(currentPlayer) });
  },

  checkWin: (): 'landlord' | 'farmer' | null => {
    const state = get();
    const { players, gamePhase, gameMode, mySeatIndex } = state;

    if (gamePhase !== 'playing') return state.winner;

    for (const pos of POSITIONS) {
      if (players[pos].remaining === 0) {
        const winner = players[pos].isLandlord ? 'landlord' : 'farmer';
        set({
          gamePhase: 'ended',
          winner,
        });

        if (gameMode === 'online') {
          const landlordPos = state.landlordPosition;
          const landlordSeat = landlordPos ? getSeatFromPosition(landlordPos, mySeatIndex) : 0;
          roomManager.sendGameOver(winner, landlordSeat);
        }

        return winner;
      }
    }

    return null;
  },

  createOnlineRoom: async (playerName: string): Promise<string> => {
    set({ onlineStatus: 'connecting' });
    try {
      const roomId = await roomManager.createRoom(playerName);
      set({
        onlineStatus: 'in_room',
        roomId,
        mySeatIndex: 0,
        onlinePlayers: [{
          playerId: roomManager.myPlayerId,
          playerName,
          seatIndex: 0,
          isHost: true,
          isReady: true,
        }],
      });

      setupRoomCallbacks(set, get);

      return roomId;
    } catch (err) {
      set({ onlineStatus: 'disconnected' });
      get().showToast('创建房间失败');
      throw err;
    }
  },

  joinOnlineRoom: async (roomId: string, playerName: string): Promise<void> => {
    set({ onlineStatus: 'connecting' });
    try {
      const roomState = await roomManager.joinRoom(roomId, playerName);
      const me = roomState.players.find(p => p.playerId === roomManager.myPlayerId);
      set({
        onlineStatus: 'in_room',
        roomId,
        mySeatIndex: me?.seatIndex ?? 0,
        onlinePlayers: roomState.players,
      });

      setupRoomCallbacks(set, get);
    } catch (err) {
      set({ onlineStatus: 'disconnected' });
      get().showToast('加入房间失败');
      throw err;
    }
  },

  leaveOnlineRoom: () => {
    roomManager.leaveRoom();
    set({
      onlineStatus: 'disconnected',
      roomId: null,
      onlinePlayers: [],
      mySeatIndex: 0,
      gameMode: 'pve',
      gamePhase: 'waiting',
      undoRequestStatus: 'none',
    });
  },

  changeSeat: (seatIndex: number) => {
    roomManager.changeSeat(seatIndex);
  },

  startOnlineGame: () => {
    roomManager.startGame();
  },

  sendOnlineBid: (score: 0 | 1 | 2 | 3) => {
    roomManager.sendBid(score);
  },

  sendOnlinePlay: (cardIds: string[]) => {
    roomManager.sendPlay(cardIds);
  },

  sendOnlinePass: () => {
    roomManager.sendPass();
  },

  sendRematchRequest: () => {
    roomManager.sendRematchRequest();
  },

  acceptRematch: () => {
    roomManager.acceptRematch();
  },

  sendUndoRequest: () => {
    const { gameMode, playHistory, gamePhase } = get();
    // 仅联机模式、有出牌记录且游戏进行中才可请求悔棋
    if (gameMode !== 'online') return;
    if (playHistory.length === 0) return;
    if (gamePhase !== 'playing') return;

    roomManager.sendUndoRequest();
    set({ undoRequestStatus: 'sent' });
  },

  acceptUndo: () => {
    const { playHistory } = get();
    if (playHistory.length === 0) {
      set({ undoRequestStatus: 'none' });
      return;
    }

    roomManager.sendUndoAccept();
    // 同意方也执行一次悔棋
    get().applyOnlineUndo();
    set({ undoRequestStatus: 'none' });
  },

  rejectUndo: () => {
    roomManager.sendUndoReject();
    set({ undoRequestStatus: 'none' });
  },

  toggleDebugReveal: () => set(s => ({ debugRevealOpponents: !s.debugRevealOpponents })),

  handleUndoRequest: () => {
    // 收到对方请求，弹窗让玩家选择
    set({ undoRequestStatus: 'received' });
  },

  handleUndoAccept: () => {
    const { showToast } = get();
    // 对方同意，执行悔棋
    get().applyOnlineUndo();
    set({ undoRequestStatus: 'none' });
    showToast('对方同意悔棋');
  },

  handleUndoReject: () => {
    const { showToast } = get();
    set({ undoRequestStatus: 'none' });
    showToast('对方拒绝了悔棋请求');
  },

  // 联机悔棋实际执行逻辑：回退最后一手出牌或不出
  applyOnlineUndo: () => {
    const state = get();
    const { playHistory, players, gamePhase } = state;
    if (gamePhase !== 'playing') return;
    if (playHistory.length === 0) return;

    // 弹出最后一手
    const newHistory = [...playHistory];
    const lastEntry = newHistory.pop()!;
    const newPlayers = { ...players };

    // 如果是出牌，把牌还回到该玩家手牌
    if (lastEntry.cardType !== 'pass') {
      const playerPos = lastEntry.player;
      const restoredCards = sortCards([...newPlayers[playerPos].cards, ...lastEntry.cards]);
      newPlayers[playerPos] = {
        ...newPlayers[playerPos],
        cards: restoredCards,
        remaining: restoredCards.length,
      };
    }

    // 重新计算 lastPlay 和 passCount
    let newLastPlay: LastPlay = null;
    let newPassCount = 0;
    const newCurrentPlayer: PlayerPosition = lastEntry.player;

    // 从后往前数连续的 pass
    let trailingPasses = 0;
    for (let i = newHistory.length - 1; i >= 0; i--) {
      if (newHistory[i].cardType === 'pass') {
        trailingPasses++;
      } else {
        break;
      }
    }

    if (trailingPasses === 2) {
      // 两个 pass 表示之前已重置，lastPlay=null, passCount=0
      newLastPlay = null;
      newPassCount = 0;
    } else if (trailingPasses === 1) {
      // 一个 pass，lastPlay 是 pass 之前的 play
      const playIndex = newHistory.length - 2;
      if (playIndex >= 0) {
        const playEntry = newHistory[playIndex];
        const cardTypeResult = getCardType(playEntry.cards);
        if (cardTypeResult) {
          newLastPlay = {
            player: playEntry.player,
            cards: playEntry.cards,
            cardType: cardTypeResult.type,
            mainRank: cardTypeResult.mainRank,
            length: cardTypeResult.length,
          };
        }
      }
      newPassCount = 1;
    } else {
      // 没有 pass，lastPlay 是最后一个 entry（如果有）
      if (newHistory.length > 0) {
        const lastPlayEntry = newHistory[newHistory.length - 1];
        const cardTypeResult = getCardType(lastPlayEntry.cards);
        if (cardTypeResult) {
          newLastPlay = {
            player: lastPlayEntry.player,
            cards: lastPlayEntry.cards,
            cardType: cardTypeResult.type,
            mainRank: cardTypeResult.mainRank,
            length: cardTypeResult.length,
          };
        }
      }
      newPassCount = 0;
    }

    set({
      players: newPlayers,
      playHistory: newHistory,
      lastPlay: newLastPlay,
      passCount: newPassCount,
      currentPlayer: newCurrentPlayer,
      selectedCards: [],
      countdown: 15,
    });
  },

  aiPlayCards: (position: PlayerPosition, cardIds: string[]): boolean => {
    const state = get();
    const { currentPlayer, players, lastPlay, gamePhase } = state;

    if (gamePhase !== 'playing') return false;
    if (currentPlayer !== position) return false;

    const playerCards = players[position].cards;
    const cardsToPlay = playerCards.filter(c => cardIds.includes(c.id));

    if (cardsToPlay.length === 0) return false;

    const cardTypeResult = getCardType(cardsToPlay);
    if (!cardTypeResult) return false;

    if (lastPlay && lastPlay.player !== currentPlayer) {
      if (!canBeat(cardsToPlay, lastPlay)) return false;
    }

    const newPlayers = { ...players };
    const remainingCards = sortCards(playerCards.filter(c => !cardIds.includes(c.id)));
    newPlayers[position] = {
      ...newPlayers[position],
      cards: remainingCards,
      remaining: remainingCards.length,
    };

    const newLastPlay: LastPlay = {
      player: currentPlayer,
      cards: cardsToPlay,
      cardType: cardTypeResult.type,
      mainRank: cardTypeResult.mainRank,
      length: cardTypeResult.length,
    };

    const newPlayHistory = [
      ...state.playHistory,
      {
        player: currentPlayer,
        cards: cardsToPlay,
        cardType: cardTypeResult.type,
      },
    ];

    const nextPos = getNextPosition(currentPlayer);

    set({
      players: newPlayers,
      lastPlay: newLastPlay,
      selectedCards: [],
      passCount: 0,
      playHistory: newPlayHistory,
      currentPlayer: nextPos,
      countdown: 15,
    });

    get().checkWin();
    return true;
  },

  aiPass: (position: PlayerPosition): boolean => {
    const state = get();
    const { currentPlayer, lastPlay, passCount, gamePhase } = state;

    if (gamePhase !== 'playing') return false;
    if (currentPlayer !== position) return false;
    if (!lastPlay || lastPlay.player === currentPlayer) return false;

    const newPassCount = passCount + 1;

    const newPlayHistory = [
      ...state.playHistory,
      {
        player: currentPlayer,
        cards: [],
        cardType: 'pass' as const,
      },
    ];

    if (newPassCount >= 2) {
      set({
        passCount: 0,
        lastPlay: null,
        currentPlayer: lastPlay.player,
        playHistory: newPlayHistory,
        selectedCards: [],
        countdown: 15,
      });
    } else {
      const nextPos = getNextPosition(currentPlayer);
      set({
        passCount: newPassCount,
        currentPlayer: nextPos,
        playHistory: newPlayHistory,
        selectedCards: [],
        countdown: 15,
      });
    }

    return true;
  },

  onlineBotBid: (pos: PlayerPosition) => {
    if (!roomManager?.isHost) return;
    const seat = getSeatFromPosition(pos, get().mySeatIndex);
    const hand = get().onlineBotHands[seat];
    if (hand && hand.length) {
      const players = get().players;
      set({ players: { ...players, [pos]: { ...players[pos], cards: hand } } });
    }
    const score = decideBid(
      get().players[pos].cards,
      get().currentBid,
      pos,
      get().players[pos].isLandlord,
      get().difficulty
    ) as 0 | 1 | 2 | 3;
    roomManager.sendBidAs(seat, score);
    get().aiBid(pos, score);
    if (hand && hand.length) {
      set({ onlineBotHands: { ...get().onlineBotHands, [seat]: get().players[pos].cards } });
    }
  },

  onlineBotPlay: (pos: PlayerPosition, cardIds: string[]) => {
    if (!roomManager?.isHost) return;
    const seat = getSeatFromPosition(pos, get().mySeatIndex);
    const hand = get().onlineBotHands[seat];
    if (hand && hand.length) {
      const players = get().players;
      set({ players: { ...players, [pos]: { ...players[pos], cards: hand } } });
    }
    const success = get().aiPlayCards(pos, cardIds);
    if (!success) {
      get().aiPass(pos);
      roomManager.sendPassAs(seat);
    } else {
      const playedCards = hand.filter(c => cardIds.includes(c.id));
      roomManager.sendPlayAs(seat, playedCards);
      set({ onlineBotHands: { ...get().onlineBotHands, [seat]: get().players[pos].cards } });
    }
  },

  onlineBotPass: (pos: PlayerPosition) => {
    if (!roomManager?.isHost) return;
    const seat = getSeatFromPosition(pos, get().mySeatIndex);
    roomManager.sendPassAs(seat);
    get().aiPass(pos);
  },

  aiBid: (position: PlayerPosition, score: 0 | 1 | 2 | 3) => {
    const state = get();
    const { currentBid, bidder, currentPlayer, players, bottomCards, gamePhase, bidCount } = state;

    if (gamePhase !== 'bidding') return;
    if (currentPlayer !== position) return;
    if (score < 0 || score > 3) return;
    if (score > 0 && score <= currentBid) return;

    const newBid = score > currentBid ? score : currentBid;
    const newBidder = score > currentBid ? position : bidder;
    const newBidCount = bidCount + 1;

    if (score === 3) {
      const newPlayers = { ...players };
      const landlordCards = sortCards([...newPlayers[position].cards, ...bottomCards]);
      newPlayers[position] = {
        ...newPlayers[position],
        cards: landlordCards,
        isLandlord: true,
        remaining: landlordCards.length,
      };

      set({
        gamePhase: 'playing',
        landlordPosition: position,
        currentBid: 3,
        bidder: position,
        bidCount: newBidCount,
        players: newPlayers,
        currentPlayer: position,
        lastPlay: null,
        passCount: 0,
        playHistory: [],
        countdown: 15,
      });
      return;
    }

    if (newBidCount >= 3) {
      if (newBidder && newBid > 0) {
        const newPlayers = { ...players };
        const landlordCards = sortCards([...newPlayers[newBidder].cards, ...bottomCards]);
        newPlayers[newBidder] = {
          ...newPlayers[newBidder],
          cards: landlordCards,
          isLandlord: true,
          remaining: landlordCards.length,
        };

        set({
          gamePhase: 'playing',
          landlordPosition: newBidder,
          currentBid: newBid,
          bidder: newBidder,
          bidCount: newBidCount,
          players: newPlayers,
          currentPlayer: newBidder,
          lastPlay: null,
          passCount: 0,
          playHistory: [],
          countdown: 15,
        });
      } else {
        const deck = createDeck();
        const { bottom, players: playerCards } = dealCards(deck);
        const firstBidder = POSITIONS[Math.floor(Math.random() * 3)];

        const newPlayers = createInitialPlayers();
        newPlayers.bottom.cards = playerCards[0];
        newPlayers.bottom.remaining = 17;
        newPlayers.right.cards = playerCards[1];
        newPlayers.right.remaining = 17;
        newPlayers.left.cards = playerCards[2];
        newPlayers.left.remaining = 17;

        set({
          players: newPlayers,
          bottomCards: bottom,
          currentBid: 0,
          bidder: null,
          bidCount: 0,
          currentPlayer: firstBidder,
          playHistory: [],
          countdown: 15,
        });
      }
      return;
    }

    const nextPos = getNextPosition(currentPlayer);
    set({
      currentBid: newBid,
      bidder: newBidder,
      bidCount: newBidCount,
      currentPlayer: nextPos,
      countdown: 15,
    });
  },
}));

function setupRoomCallbacks(
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState
) {
  roomManager.onRoomStateChange = (state: RoomState) => {
    const currentMe = state.players.find(p => p.playerId === roomManager.myPlayerId);
    set(prev => ({
      onlinePlayers: state.players,
      mySeatIndex: currentMe?.seatIndex ?? prev.mySeatIndex,
    }));
  };

  roomManager.onGameStart = () => {
    set({ gamePhase: 'bidding' });
  };

  roomManager.onDeal = (data: DealData) => {
    const state = get();
    const { mySeatIndex, onlinePlayers } = state;

    const players = createInitialPlayers();
    const sortedPlayers = [...onlinePlayers].sort((a, b) => a.seatIndex - b.seatIndex);

    sortedPlayers.forEach((player) => {
      const pos = getPositionFromSeat(player.seatIndex, mySeatIndex);
      players[pos].name = player.playerName;
      players[pos].isAutoPlay = false;
      players[pos].remaining = 17;
    });

    const myPos = getPositionFromSeat(data.seatIndex, mySeatIndex);
    players[myPos].cards = sortCards(data.cards);
    players[myPos].remaining = data.cards.length;

    const firstBidderPos = getPositionFromSeat(data.firstBidderSeat, mySeatIndex);

    set({
      gameMode: 'online',
      gamePhase: 'bidding',
      players,
      bottomCards: data.bottomCards,
      currentPlayer: firstBidderPos,
      currentBid: 0,
      bidder: null,
      bidCount: 0,
      passCount: 0,
      lastPlay: null,
      selectedCards: [],
      playHistory: [],
      winner: null,
      myPosition: myPos,
      landlordPosition: null,
    });
  };

  roomManager.onDealBots = (hands: Record<number, Card[]>) => {
    set({ onlineBotHands: hands });
  };

  roomManager.onBid = (data: BidData) => {
    const state = get();
    const { mySeatIndex, myPosition } = state;
    const bidderPos = getPositionFromSeat(data.seatIndex, mySeatIndex);

    if (bidderPos === myPosition) return;

    const { currentBid, bidder, players, bottomCards, gamePhase, bidCount } = state;

    if (gamePhase !== 'bidding') return;

    const score = data.score;
    const newBid = score > currentBid ? score : currentBid;
    const newBidder = score > currentBid ? bidderPos : bidder;
    const newBidCount = bidCount + 1;

    if (score === 3) {
      const newPlayers = { ...players };
      const bidderSeat = getSeatFromPosition(bidderPos, mySeatIndex);
      const botHand = state.onlineBotHands[bidderSeat];
      const isBotBidder = !!botHand && botHand.length > 0;
      const baseCards = isBotBidder ? botHand : newPlayers[bidderPos].cards;
      const landlordCards = sortCards([...baseCards, ...bottomCards]);
      newPlayers[bidderPos] = {
        ...newPlayers[bidderPos],
        cards: isBotBidder ? [] : landlordCards,
        isLandlord: true,
        remaining: landlordCards.length,
      };

      set({
        gamePhase: 'playing',
        landlordPosition: bidderPos,
        currentBid: 3,
        bidder: bidderPos,
        bidCount: newBidCount,
        players: newPlayers,
        currentPlayer: bidderPos,
        lastPlay: null,
        passCount: 0,
        playHistory: [],
        countdown: 15,
        ...(isBotBidder ? { onlineBotHands: { ...get().onlineBotHands, [bidderSeat]: landlordCards } } : {}),
      });
      return;
    }

    if (newBidCount >= 3) {
      if (newBidder && newBid > 0) {
        const newPlayers = { ...players };
        const bidderSeat = getSeatFromPosition(newBidder, mySeatIndex);
        const botHand = state.onlineBotHands[bidderSeat];
        const isBotBidder = !!botHand && botHand.length > 0;
        const baseCards = isBotBidder ? botHand : newPlayers[newBidder].cards;
        const landlordCards = sortCards([...baseCards, ...bottomCards]);
        newPlayers[newBidder] = {
          ...newPlayers[newBidder],
          cards: isBotBidder ? [] : landlordCards,
          isLandlord: true,
          remaining: landlordCards.length,
        };

        set({
          gamePhase: 'playing',
          landlordPosition: newBidder,
          currentBid: newBid,
          bidder: newBidder,
          bidCount: newBidCount,
          players: newPlayers,
          currentPlayer: newBidder,
          lastPlay: null,
          passCount: 0,
          playHistory: [],
          countdown: 15,
          ...(isBotBidder ? { onlineBotHands: { ...get().onlineBotHands, [bidderSeat]: landlordCards } } : {}),
        });
      }
      return;
    }

    const nextPos = getNextPosition(bidderPos);
    set({
      currentBid: newBid,
      bidder: newBidder,
      bidCount: newBidCount,
      currentPlayer: nextPos,
      countdown: 15,
    });
  };

  roomManager.onPlay = (data: PlayData) => {
    const state = get();
    const { mySeatIndex, myPosition, players, lastPlay } = state;
    const playerPos = getPositionFromSeat(data.seatIndex, mySeatIndex);

    if (playerPos === myPosition) return;

    const playerCards = players[playerPos].cards;
    const botSeat = getSeatFromPosition(playerPos, mySeatIndex);
    let cardsToPlay = playerCards.filter(c => data.cardIds.includes(c.id));
    if (cardsToPlay.length === 0 && data.cards) {
      cardsToPlay = data.cards.filter(c => data.cardIds.includes(c.id));
    }

    if (cardsToPlay.length === 0) return;

    const cardTypeResult = getCardType(cardsToPlay);
    if (!cardTypeResult) return;

    const newPlayers = { ...players };
    const remainingCards = sortCards(playerCards.filter(c => !data.cardIds.includes(c.id)));
    const newBotHands = { ...get().onlineBotHands };
    if (newBotHands[botSeat]) {
      newBotHands[botSeat] = newBotHands[botSeat].filter(c => !data.cardIds.includes(c.id));
    }
    const botRemaining = newBotHands[botSeat] ? newBotHands[botSeat].length : remainingCards.length;
    newPlayers[playerPos] = {
      ...newPlayers[playerPos],
      cards: remainingCards,
      remaining: botRemaining,
    };

    const newLastPlay: LastPlay = {
      player: playerPos,
      cards: cardsToPlay,
      cardType: cardTypeResult.type,
      mainRank: cardTypeResult.mainRank,
      length: cardTypeResult.length,
    };

    const newPlayHistory = [
      ...state.playHistory,
      {
        player: playerPos,
        cards: cardsToPlay,
        cardType: cardTypeResult.type,
      },
    ];

    const nextPos = getNextPosition(playerPos);

    set({
      players: newPlayers,
      lastPlay: newLastPlay,
      passCount: 0,
      playHistory: newPlayHistory,
      currentPlayer: nextPos,
      countdown: 15,
      onlineBotHands: newBotHands,
    });

    get().checkWin();
  };

  roomManager.onPass = (data: PassData) => {
    const state = get();
    const { mySeatIndex, myPosition, lastPlay, passCount } = state;
    const playerPos = getPositionFromSeat(data.seatIndex, mySeatIndex);

    if (playerPos === myPosition) return;
    if (!lastPlay || lastPlay.player === playerPos) return;

    const newPassCount = passCount + 1;

    const newPlayHistory = [
      ...state.playHistory,
      {
        player: playerPos,
        cards: [],
        cardType: 'pass' as const,
      },
    ];

    if (newPassCount >= 2) {
      set({
        passCount: 0,
        lastPlay: null,
        currentPlayer: lastPlay.player,
        playHistory: newPlayHistory,
        countdown: 15,
      });
    } else {
      const nextPos = getNextPosition(playerPos);
      set({
        passCount: newPassCount,
        currentPlayer: nextPos,
        playHistory: newPlayHistory,
        countdown: 15,
      });
    }
  };

  roomManager.onGameOver = (data: GameOverData) => {
    set({ gamePhase: 'ended', winner: data.winner });
  };

  roomManager.onUndoRequest = (_playerId: string) => {
    get().handleUndoRequest();
  };

  roomManager.onUndoAccept = (_playerId: string) => {
    get().handleUndoAccept();
  };

  roomManager.onUndoReject = (_playerId: string) => {
    get().handleUndoReject();
  };

  roomManager.onOpponentLeave = (playerId: string) => {
    get().showToast('有玩家离开了房间');
  };

  roomManager.onError = (error: string) => {
    get().showToast(error);
  };
}
