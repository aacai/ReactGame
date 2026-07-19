import { create } from 'zustand';
import type { Piece, PieceColor, Position } from '../game/types';
import { createInitialBoard, clonePieces } from '../game/board';
import { getValidMoves, isInCheck, isCheckmate, isStalemate, getPieceAt } from '../game/rules';
import { getAIMove } from '../game/ai';
import { ENDGAMES, createEndgameBoard } from '../game/endgames';
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playWinSound,
  playLoseSound,
  playInvalidSound,
  playHintSound,
  playClickSound,
  setSoundEnabled,
  isSoundEnabled,
} from '../game/sound';
import { roomManager, type MoveData } from '../game/room';
import { onStatusChange } from '../game/mqtt';
import type { ConnectionStatus } from '../game/mqtt';

interface MoveHistory {
  from: Position;
  to: Position;
  piece: Piece;
  capturedPiece?: Piece;
  currentPlayerBefore: PieceColor;
}

export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'resigned';
export type Screen = 'menu' | 'xiangqi-modes' | 'pve-setup' | 'online-setup' | 'watch-settings' | 'endgame-select' | 'settings' | 'about' | 'waiting' | 'game' | 'gomoku';
export type GameMode = 'pve' | 'watch' | 'online' | 'endgame';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type AutoPlaySpeed = 'slow' | 'normal' | 'fast';
export type OnlineStatus = 'idle' | 'waiting' | 'playing' | 'disconnected';
export type RematchRequestStatus = 'none' | 'sent' | 'received';
export type UndoRequestStatus = 'none' | 'sent' | 'received';
export type ToastType = 'error' | 'success' | 'info' | 'warning';

const AI_COLOR: PieceColor = 'black';

let autoPlayTimeoutId: ReturnType<typeof setTimeout> | null = null;

function clearAutoPlayTimeout() {
  if (autoPlayTimeoutId !== null) {
    clearTimeout(autoPlayTimeoutId);
    autoPlayTimeoutId = null;
  }
}

function getDelayRange(difficulty: Difficulty): { min: number; max: number } {
  switch (difficulty) {
    case 'easy':
      return { min: 300, max: 500 };
    case 'medium':
      return { min: 500, max: 800 };
    case 'hard':
      return { min: 500, max: 1500 };
  }
}

function getAutoPlayDelayRange(speed: AutoPlaySpeed): { min: number; max: number } {
  switch (speed) {
    case 'slow':
      return { min: 1800, max: 2500 };
    case 'normal':
      return { min: 800, max: 1200 };
    case 'fast':
      return { min: 300, max: 600 };
  }
}

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface GameState {
  pieces: Piece[];
  currentPlayer: PieceColor;
  selectedPieceId: string | null;
  validMoves: Position[];
  history: MoveHistory[];
  winner: PieceColor | null;
  gameStatus: GameStatus;
  inCheck: boolean;
  screen: Screen;
  gameMode: GameMode;
  difficulty: Difficulty;
  redDifficulty: Difficulty;
  blackDifficulty: Difficulty;
  playerColor: PieceColor;
  autoPlayRed: boolean;
  autoPlayBlack: boolean;
  autoPlaySpeed: AutoPlaySpeed;
  isAIThinking: boolean;
  hintMove: { from: Position; to: Position } | null;
  invalidMoveMessage: string | null;
  soundEnabled: boolean;
  onlineStatus: OnlineStatus;
  roomId: string | null;
  myColor: PieceColor | null;
  opponentName: string | null;
  opponentConnected: boolean;
  rematchRequest: RematchRequestStatus;
  undoRequestStatus: UndoRequestStatus;
  toastMessage: string | null;
  toastType: ToastType;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
  selectPiece: (id: string | null) => void;
  movePiece: (toCol: number, toRow: number) => void;
  handleRemoteMove: (move: MoveData) => void;
  aiMove: (color?: PieceColor) => void;
  undoMove: () => void;
  resetGame: () => void;
  resign: () => void;
  setScreen: (screen: Screen) => void;
  setGameMode: (mode: GameMode) => void;
  setDifficulty: (level: Difficulty) => void;
  setRedDifficulty: (level: Difficulty) => void;
  setBlackDifficulty: (level: Difficulty) => void;
  setPlayerColor: (color: PieceColor) => void;
  setAutoPlaySpeed: (speed: AutoPlaySpeed) => void;
  navigateTo: (screen: Screen) => void;
  startGame: () => void;
  startEndgame: (endgameId: string) => void;
  backToMenu: () => void;
  showHint: () => void;
  clearHint: () => void;
  showInvalidMove: (message: string) => void;
  toggleSound: () => void;
  toggleAutoPlay: (color: PieceColor) => void;
  startWatchGame: () => void;
  startAutoPlay: () => void;
  createOnlineRoom: (playerName?: string) => Promise<string>;
  joinOnlineRoom: (roomId: string, playerName?: string) => Promise<void>;
  leaveOnlineRoom: () => void;
  onlineResign: () => void;
  requestRematch: () => void;
  acceptRematch: () => void;
  sendUndoRequest: () => void;
  acceptUndo: () => void;
  rejectUndo: () => void;
  handleUndoRequest: () => void;
  handleUndoAccept: () => void;
  handleUndoReject: () => void;
  applyOnlineUndo: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  pieces: createInitialBoard(),
  currentPlayer: 'red',
  selectedPieceId: null,
  validMoves: [],
  history: [],
  winner: null,
  gameStatus: 'playing',
  inCheck: false,
  screen: 'menu',
  gameMode: 'pve',
  difficulty: 'medium',
  redDifficulty: 'medium',
  blackDifficulty: 'medium',
  playerColor: 'red',
  isAIThinking: false,
  hintMove: null,
  invalidMoveMessage: null,
  soundEnabled: true,
  autoPlayRed: false,
  autoPlayBlack: false,
  autoPlaySpeed: 'normal',
  onlineStatus: 'idle',
  roomId: null,
  myColor: null,
  opponentName: null,
  opponentConnected: false,
  rematchRequest: 'none',
  undoRequestStatus: 'none',
  toastMessage: null,
  toastType: 'info' as ToastType,
  connectionStatus: 'disconnected',

  selectPiece: (id: string | null) => {
    const { pieces, currentPlayer, gameStatus, gameMode, isAIThinking, autoPlayRed, autoPlayBlack, myColor, opponentConnected } = get();

    if (gameStatus !== 'playing') {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    if ((gameMode === 'pve' || gameMode === 'endgame') && currentPlayer === AI_COLOR) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    if (gameMode === 'online') {
      if (!myColor || currentPlayer !== myColor) {
        set({ selectedPieceId: null, validMoves: [] });
        return;
      }
      if (!opponentConnected) {
        set({ selectedPieceId: null, validMoves: [] });
        return;
      }
    }

    const isAutoPlay = currentPlayer === 'red' ? autoPlayRed : autoPlayBlack;
    if (isAutoPlay) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    if (isAIThinking) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    if (id === null) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    const piece = pieces.find((p) => p.id === id);
    if (!piece || piece.color !== currentPlayer) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    const moves = getValidMoves(pieces, piece.col, piece.row);
    set({ selectedPieceId: id, validMoves: moves });
  },

  movePiece: (toCol: number, toRow: number) => {
    const { pieces, currentPlayer, selectedPieceId, validMoves, history, gameStatus, gameMode, difficulty, autoPlayRed, autoPlayBlack, autoPlaySpeed, myColor } = get();

    if (gameStatus !== 'playing') return;

    if (gameMode === 'online') {
      if (!myColor || currentPlayer !== myColor) return;
    }
    if (!selectedPieceId) return;
    const isValid = validMoves.some((m) => m.col === toCol && m.row === toRow);
    if (!isValid) return;

    const selectedPiece = pieces.find((p) => p.id === selectedPieceId);
    if (!selectedPiece) return;

    const fromPos: Position = { col: selectedPiece.col, row: selectedPiece.row };
    const toPos: Position = { col: toCol, row: toRow };

    const newPieces = clonePieces(pieces);
    const movingPiece = newPieces.find((p) => p.id === selectedPieceId);
    if (!movingPiece) return;

    const capturedPiece = getPieceAt(newPieces, toCol, toRow);
    const capturedPieceClone = capturedPiece ? { ...capturedPiece } : undefined;

    if (capturedPiece) {
      const captureIndex = newPieces.findIndex((p) => p.id === capturedPiece.id);
      if (captureIndex !== -1) {
        newPieces.splice(captureIndex, 1);
      }
    }

    movingPiece.col = toCol;
    movingPiece.row = toRow;

    const nextPlayer: PieceColor = currentPlayer === 'red' ? 'black' : 'red';
    const nextInCheck = isInCheck(newPieces, nextPlayer);
    const nextCheckmate = isCheckmate(newPieces, nextPlayer);
    const nextStalemate = isStalemate(newPieces, nextPlayer);

    let newStatus: GameStatus = 'playing';
    let newWinner: PieceColor | null = null;

    if (nextCheckmate) {
      newStatus = 'checkmate';
      newWinner = currentPlayer;
    } else if (nextStalemate) {
      newStatus = 'stalemate';
    }

    const historyEntry: MoveHistory = {
      from: fromPos,
      to: toPos,
      piece: { ...selectedPiece },
      capturedPiece: capturedPieceClone,
      currentPlayerBefore: currentPlayer,
    };

    set({
      pieces: newPieces,
      currentPlayer: nextPlayer,
      selectedPieceId: null,
      validMoves: [],
      history: [...history, historyEntry],
      winner: newWinner,
      gameStatus: newStatus,
      inCheck: nextInCheck,
      hintMove: null,
    });

    if (capturedPiece) {
      playCaptureSound();
    } else {
      playMoveSound();
    }

    if (nextCheckmate) {
      setTimeout(() => playWinSound(), 300);
    } else if (nextInCheck) {
      setTimeout(() => playCheckSound(), 100);
    }

    if (gameMode === 'online') {
      roomManager.sendMove(fromPos, toPos, selectedPieceId);
      return;
    }

    const isNextAutoPlay = nextPlayer === 'red' ? autoPlayRed : autoPlayBlack;
    if (isNextAutoPlay && newStatus === 'playing') {
      const { min, max } = getAutoPlayDelayRange(autoPlaySpeed);
      const delay = randomDelay(min, max);
      set({ isAIThinking: true });
      setTimeout(() => {
        get().aiMove(nextPlayer);
      }, delay);
    } else if ((gameMode === 'pve' || gameMode === 'endgame') && nextPlayer === AI_COLOR && newStatus === 'playing') {
      const { min, max } = getDelayRange(difficulty);
      const delay = randomDelay(min, max);
      set({ isAIThinking: true });
      setTimeout(() => {
        get().aiMove();
      }, delay);
    }
  },

  aiMove: (color?: PieceColor) => {
    const { pieces, difficulty, redDifficulty, blackDifficulty, gameMode, gameStatus, currentPlayer } = get();

    if (gameStatus !== 'playing') {
      set({ isAIThinking: false });
      return;
    }

    const aiColor = color || currentPlayer;
    
    let currentDifficulty: Difficulty;
    if (gameMode === 'watch') {
      currentDifficulty = aiColor === 'red' ? redDifficulty : blackDifficulty;
    } else {
      currentDifficulty = difficulty;
    }
    
    const move = getAIMove(pieces, aiColor, currentDifficulty);
    if (!move) {
      set({ isAIThinking: false });
      return;
    }

    const { from, to } = move;
    const movingPiece = pieces.find((p) => p.col === from.col && p.row === from.row);
    if (!movingPiece) {
      set({ isAIThinking: false });
      return;
    }

    const validMoves = getValidMoves(pieces, from.col, from.row);
    set({ selectedPieceId: movingPiece.id, validMoves });
    get().movePiece(to.col, to.row);
    set({ isAIThinking: false });
  },

  undoMove: () => {
    const { history, pieces, gameMode } = get();

    if (history.length === 0) return;
    if (gameMode === 'online') return;

    let stepsToUndo = 1;
    if (gameMode === 'pve' && history.length >= 2) {
      const lastMove = history[history.length - 1];
      if (lastMove.currentPlayerBefore === AI_COLOR) {
        stepsToUndo = 2;
      }
    }

    let newPieces = clonePieces(pieces);
    let newHistory = [...history];
    let currentPlayer: PieceColor = history[history.length - 1].currentPlayerBefore;

    for (let i = 0; i < stepsToUndo; i++) {
      if (newHistory.length === 0) break;

      const lastMove = newHistory[newHistory.length - 1];
      newHistory = newHistory.slice(0, -1);

      currentPlayer = lastMove.currentPlayerBefore;

      const movedPieceIndex = newPieces.findIndex((p) => p.id === lastMove.piece.id);
      if (movedPieceIndex !== -1) {
        newPieces[movedPieceIndex] = { ...lastMove.piece };
      }

      if (lastMove.capturedPiece) {
        newPieces.push({ ...lastMove.capturedPiece });
      }
    }

    const inCheck = isInCheck(newPieces, currentPlayer);

    set({
      pieces: newPieces,
      currentPlayer,
      selectedPieceId: null,
      validMoves: [],
      history: newHistory,
      winner: null,
      gameStatus: 'playing',
      inCheck,
      isAIThinking: false,
      hintMove: null,
    });
  },

  resetGame: () => {
    set({
      pieces: createInitialBoard(),
      currentPlayer: 'red',
      selectedPieceId: null,
      validMoves: [],
      history: [],
      winner: null,
      gameStatus: 'playing',
      inCheck: false,
      isAIThinking: false,
      hintMove: null,
      invalidMoveMessage: null,
    });
    setTimeout(() => {
      get().startAutoPlay();
    }, 0);
  },

  resign: () => {
    const { currentPlayer, gameStatus } = get();

    if (gameStatus !== 'playing') return;

    const winner: PieceColor = currentPlayer === 'red' ? 'black' : 'red';

    set({
      gameStatus: 'resigned',
      winner,
      selectedPieceId: null,
      validMoves: [],
      isAIThinking: false,
      hintMove: null,
      invalidMoveMessage: null,
    });
  },

  setScreen: (screen: Screen) => {
    set({ screen });
  },

  setGameMode: (mode: GameMode) => {
    set({ gameMode: mode });
  },

  setDifficulty: (level: Difficulty) => {
    set({ difficulty: level });
  },

  setRedDifficulty: (level: Difficulty) => {
    set({ redDifficulty: level });
  },

  setBlackDifficulty: (level: Difficulty) => {
    set({ blackDifficulty: level });
  },

  setPlayerColor: (color: PieceColor) => {
    set({ playerColor: color });
  },

  setAutoPlaySpeed: (speed: AutoPlaySpeed) => {
    set({ autoPlaySpeed: speed });
  },

  navigateTo: (screen: Screen) => {
    set({ screen });
  },

  startGame: () => {
    const { resetGame, gameMode } = get();
    resetGame();
    if (gameMode === 'watch') {
      set({ screen: 'game', autoPlayRed: true, autoPlayBlack: true });
      setTimeout(() => {
        get().startAutoPlay();
      }, 500);
    } else {
      set({ screen: 'game' });
    }
  },

  startEndgame: (endgameId: string) => {
    const endgame = ENDGAMES.find(e => e.id === endgameId);
    if (!endgame) return;

    const pieces = createEndgameBoard(endgame);
    clearAutoPlayTimeout();

    set({
      pieces,
      currentPlayer: endgame.currentPlayer,
      selectedPieceId: null,
      validMoves: [],
      history: [],
      winner: null,
      gameStatus: 'playing',
      inCheck: isInCheck(pieces, endgame.currentPlayer),
      screen: 'game',
      gameMode: 'endgame',
      playerColor: endgame.playerColor,
      isAIThinking: false,
      hintMove: null,
      invalidMoveMessage: null,
      autoPlayRed: false,
      autoPlayBlack: false,
    });

    if (endgame.currentPlayer !== endgame.playerColor) {
      setTimeout(() => {
        get().aiMove();
      }, 600);
    }
  },

  backToMenu: () => {
    set({ screen: 'menu', isAIThinking: false, hintMove: null, invalidMoveMessage: null, autoPlayRed: false, autoPlayBlack: false });
  },

  showHint: () => {
    const { pieces, currentPlayer, gameStatus, gameMode, difficulty, isAIThinking } = get();

    if (gameStatus !== 'playing') return;
    if (isAIThinking) return;
    if ((gameMode === 'pve' || gameMode === 'endgame') && currentPlayer === AI_COLOR) return;
    if (gameMode === 'online') return;

    const move = getAIMove(pieces, currentPlayer, difficulty);
    
    if (move) {
      const piece = pieces.find(p => p.col === move.from.col && p.row === move.from.row);
      const validMoves = piece ? getValidMoves(pieces, piece.col, piece.row) : [];
      set({
        hintMove: move,
        selectedPieceId: piece?.id || null,
        validMoves,
      });
      playHintSound();
    }
  },

  clearHint: () => {
    set({ hintMove: null });
  },

  showInvalidMove: (message: string) => {
    set({ invalidMoveMessage: message });
    playInvalidSound();
    setTimeout(() => {
      set({ invalidMoveMessage: null });
    }, 2000);
  },

  showToast: (message: string, type: ToastType = 'info') => {
    set({ toastMessage: message, toastType: type });
    setTimeout(() => {
      set({ toastMessage: null });
    }, 3000);
  },

  hideToast: () => {
    set({ toastMessage: null });
  },

  toggleSound: () => {
    const { soundEnabled } = get();
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    set({ soundEnabled: newVal });
    if (newVal) {
      playClickSound();
    }
  },

  toggleAutoPlay: (color: PieceColor) => {
    const { gameMode, currentPlayer, isAIThinking } = get();
    if (gameMode === 'online') return;

    const isCurrentPlayer = currentPlayer === color;
    let newAutoPlayValue: boolean;

    if (color === 'red') {
      newAutoPlayValue = !get().autoPlayRed;
      set((state) => ({ autoPlayRed: !state.autoPlayRed }));
    } else {
      newAutoPlayValue = !get().autoPlayBlack;
      set((state) => ({ autoPlayBlack: !state.autoPlayBlack }));
    }

    if (isCurrentPlayer) {
      if (newAutoPlayValue) {
        setTimeout(() => {
          get().startAutoPlay();
        }, 0);
      } else {
        clearAutoPlayTimeout();
        if (isAIThinking) {
          set({ isAIThinking: false });
        }
      }
    }
  },

  startWatchGame: () => {
    const { resetGame } = get();
    resetGame();
    set({ screen: 'game', gameMode: 'watch', autoPlayRed: true, autoPlayBlack: true });
    setTimeout(() => {
      get().startAutoPlay();
    }, 500);
  },

  startAutoPlay: () => {
    const { gameStatus, currentPlayer, autoPlayRed, autoPlayBlack, isAIThinking, autoPlaySpeed } = get();
    if (gameStatus !== 'playing') return;
    if (isAIThinking) return;
    const isAutoPlay = currentPlayer === 'red' ? autoPlayRed : autoPlayBlack;
    if (!isAutoPlay) return;

    clearAutoPlayTimeout();
    const { min, max } = getAutoPlayDelayRange(autoPlaySpeed);
    const delay = randomDelay(min, max);
    set({ isAIThinking: true });
    autoPlayTimeoutId = setTimeout(() => {
      get().aiMove(currentPlayer);
    }, delay);
  },

  handleRemoteMove: (move: MoveData) => {
    const { pieces, currentPlayer, history, gameStatus, myColor } = get();

    if (gameStatus !== 'playing') return;
    if (!myColor || currentPlayer === myColor) return;

    const { from, to, pieceId } = move;

    const movingPiece = pieces.find((p) => p.id === pieceId);
    if (!movingPiece) return;
    if (movingPiece.col !== from.col || movingPiece.row !== from.row) return;

    const newPieces = clonePieces(pieces);
    const piece = newPieces.find((p) => p.id === pieceId);
    if (!piece) return;

    const fromPos: Position = { col: from.col, row: from.row };
    const toPos: Position = { col: to.col, row: to.row };

    const capturedPiece = getPieceAt(newPieces, to.col, to.row);
    const capturedPieceClone = capturedPiece ? { ...capturedPiece } : undefined;

    if (capturedPiece) {
      const captureIndex = newPieces.findIndex((p) => p.id === capturedPiece.id);
      if (captureIndex !== -1) {
        newPieces.splice(captureIndex, 1);
      }
    }

    piece.col = to.col;
    piece.row = to.row;

    const nextPlayer: PieceColor = currentPlayer === 'red' ? 'black' : 'red';
    const nextInCheck = isInCheck(newPieces, nextPlayer);
    const nextCheckmate = isCheckmate(newPieces, nextPlayer);
    const nextStalemate = isStalemate(newPieces, nextPlayer);

    let newStatus: GameStatus = 'playing';
    let newWinner: PieceColor | null = null;

    if (nextCheckmate) {
      newStatus = 'checkmate';
      newWinner = currentPlayer;
    } else if (nextStalemate) {
      newStatus = 'stalemate';
    }

    const historyEntry: MoveHistory = {
      from: fromPos,
      to: toPos,
      piece: { ...movingPiece },
      capturedPiece: capturedPieceClone,
      currentPlayerBefore: currentPlayer,
    };

    set({
      pieces: newPieces,
      currentPlayer: nextPlayer,
      selectedPieceId: null,
      validMoves: [],
      history: [...history, historyEntry],
      winner: newWinner,
      gameStatus: newStatus,
      inCheck: nextInCheck,
      hintMove: null,
    });

    if (capturedPiece) {
      playCaptureSound();
    } else {
      playMoveSound();
    }

    if (nextCheckmate) {
      setTimeout(() => playLoseSound(), 300);
    } else if (nextInCheck) {
      setTimeout(() => playCheckSound(), 100);
    }
  },

  createOnlineRoom: async (playerName?: string): Promise<string> => {
    try {
      set({ onlineStatus: 'waiting', gameMode: 'online', rematchRequest: 'none' });
      const roomId = await roomManager.createRoom(playerName);

      roomManager.onOpponentJoin = () => {
        const { pieces, currentPlayer, showToast } = get();
        set({
          opponentConnected: true,
          opponentName: roomManager.opponentName,
          myColor: roomManager.myColor,
          onlineStatus: 'playing',
          screen: 'game',
        });
        showToast('对手已加入，游戏开始！', 'success');
        if (roomManager.opponentId) {
          roomManager.sendJoinAckWithBoard(roomManager.opponentId, pieces, currentPlayer);
        }
      };

      roomManager.onOpponentLeave = () => {
        const { showToast } = get();
        set({ opponentConnected: false, onlineStatus: 'disconnected' });
        showToast('对手已断开连接', 'warning');
      };

      roomManager.onMove = (move: MoveData) => {
        get().handleRemoteMove(move);
      };

      roomManager.onResign = () => {
        const { currentPlayer, showToast } = get();
        const winner: PieceColor = currentPlayer === 'red' ? 'black' : 'red';
        set({
          gameStatus: 'resigned',
          winner,
          selectedPieceId: null,
          validMoves: [],
          hintMove: null,
        });
        showToast('对手认输了！', 'success');
      };

      roomManager.onRematchRequest = () => {
        set({ rematchRequest: 'received' });
      };

      roomManager.onRematchAccept = () => {
        const { resetGame, showToast } = get();
        resetGame();
        set({ rematchRequest: 'none' });
        showToast('对方同意再来一局！', 'success');
      };

      roomManager.onUndoRequest = () => {
        get().handleUndoRequest();
      };

      roomManager.onUndoAccept = () => {
        get().handleUndoAccept();
      };

      roomManager.onUndoReject = () => {
        get().handleUndoReject();
      };

      set({
        roomId,
        myColor: roomManager.myColor,
        screen: 'waiting',
      });

      return roomId;
    } catch (error) {
      set({ onlineStatus: 'idle', gameMode: 'pve' });
      throw error;
    }
  },

  joinOnlineRoom: async (roomId: string, playerName?: string): Promise<void> => {
    try {
      set({ onlineStatus: 'waiting', gameMode: 'online', rematchRequest: 'none' });

      roomManager.onOpponentJoin = () => {
        set({
          opponentConnected: true,
          opponentName: roomManager.opponentName,
        });
      };

      roomManager.onOpponentLeave = () => {
        const { showToast } = get();
        set({ opponentConnected: false, onlineStatus: 'disconnected' });
        showToast('对手已断开连接', 'warning');
      };

      roomManager.onMove = (move: MoveData) => {
        get().handleRemoteMove(move);
      };

      roomManager.onResign = () => {
        const { currentPlayer, showToast } = get();
        const winner: PieceColor = currentPlayer === 'red' ? 'black' : 'red';
        set({
          gameStatus: 'resigned',
          winner,
          selectedPieceId: null,
          validMoves: [],
          hintMove: null,
        });
        showToast('对手认输了！', 'success');
      };

      roomManager.onRematchRequest = () => {
        set({ rematchRequest: 'received' });
      };

      roomManager.onRematchAccept = () => {
        const { resetGame, showToast } = get();
        resetGame();
        set({ rematchRequest: 'none' });
        showToast('对方同意再来一局！', 'success');
      };

      roomManager.onUndoRequest = () => {
        get().handleUndoRequest();
      };

      roomManager.onUndoAccept = () => {
        get().handleUndoAccept();
      };

      roomManager.onUndoReject = () => {
        get().handleUndoReject();
      };

      const result = await roomManager.joinRoom(roomId, playerName);

      if (result.boardState) {
        set({
          pieces: result.boardState,
          currentPlayer: result.currentPlayer || 'red',
        });
      }

      set({
        roomId,
        myColor: result.color,
        opponentConnected: true,
        opponentName: roomManager.opponentName,
        onlineStatus: 'playing',
        screen: 'game',
      });
    } catch (error) {
      set({ onlineStatus: 'idle', gameMode: 'pve' });
      throw error;
    }
  },

  leaveOnlineRoom: () => {
    roomManager.onOpponentJoin = null;
    roomManager.onOpponentLeave = null;
    roomManager.onMove = null;
    roomManager.onResign = null;
    roomManager.onRematchRequest = null;
    roomManager.onRematchAccept = null;
    roomManager.onUndoRequest = null;
    roomManager.onUndoAccept = null;
    roomManager.onUndoReject = null;

    roomManager.leaveRoom();

    set({
      onlineStatus: 'idle',
      roomId: null,
      myColor: null,
      opponentName: null,
      opponentConnected: false,
      rematchRequest: 'none',
      undoRequestStatus: 'none',
      gameMode: 'pve',
      screen: 'menu',
      isAIThinking: false,
    });
  },

  onlineResign: () => {
    const { gameStatus } = get();
    if (gameStatus !== 'playing') return;

    roomManager.sendResign();

    const { currentPlayer, resign } = get();
    resign();
  },

  requestRematch: () => {
    roomManager.sendRematchRequest();
    set({ rematchRequest: 'sent' });
  },

  acceptRematch: () => {
    const { resetGame } = get();
    roomManager.sendRematchAccept();
    resetGame();
    set({ rematchRequest: 'none' });
  },

  sendUndoRequest: () => {
    const { gameMode, history, gameStatus } = get();
    // 仅联机模式、有走棋记录且游戏进行中才可请求悔棋
    if (gameMode !== 'online') return;
    if (history.length === 0) return;
    if (gameStatus !== 'playing') return;

    roomManager.sendUndoRequest();
    set({ undoRequestStatus: 'sent' });
  },

  acceptUndo: () => {
    const { history } = get();
    if (history.length === 0) {
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

  handleUndoRequest: () => {
    // 收到对方请求，弹窗让玩家选择
    set({ undoRequestStatus: 'received' });
  },

  handleUndoAccept: () => {
    const { showToast } = get();
    // 对方同意，执行悔棋
    get().applyOnlineUndo();
    set({ undoRequestStatus: 'none' });
    showToast('对方同意悔棋', 'success');
  },

  handleUndoReject: () => {
    const { showToast } = get();
    set({ undoRequestStatus: 'none' });
    showToast('对方拒绝了悔棋请求', 'warning');
  },

  // 联机悔棋实际执行逻辑：回退最后一手 history
  applyOnlineUndo: () => {
    const { history, pieces } = get();
    if (history.length === 0) return;

    const newPieces = clonePieces(pieces);
    const newHistory = [...history];
    const lastMove = newHistory.pop()!;
    const currentPlayer: PieceColor = lastMove.currentPlayerBefore;

    // 恢复被移动棋子到原位置
    const movedPieceIndex = newPieces.findIndex((p) => p.id === lastMove.piece.id);
    if (movedPieceIndex !== -1) {
      newPieces[movedPieceIndex] = { ...lastMove.piece };
    }

    // 恢复被吃子
    if (lastMove.capturedPiece) {
      newPieces.push({ ...lastMove.capturedPiece });
    }

    const inCheck = isInCheck(newPieces, currentPlayer);

    set({
      pieces: newPieces,
      currentPlayer,
      selectedPieceId: null,
      validMoves: [],
      history: newHistory,
      winner: null,
      gameStatus: 'playing',
      inCheck,
      hintMove: null,
    });

    playMoveSound();
  },
}));
