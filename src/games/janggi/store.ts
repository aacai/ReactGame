// 韩国象棋游戏状态管理
// 参考 src/store/gameStore.ts 但针对 Janggi 简化：仅支持 PvE 和观战模式

import { create } from 'zustand';
import type { Piece, PieceColor, Position } from './types';
import {
  createInitialBoard,
  clonePieces,
  getValidMoves,
  getPieceAt,
  isInCheck,
  isCheckmate,
  isStalemate,
} from './rules';
import { getAIMove, type Difficulty } from './ai';
// 重新导出难度类型，方便组件直接从 store 引入
export type { Difficulty } from './ai';
// 复用中国象棋的音效模块（音效与游戏无关，可通用）
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
} from '../../game/sound';

export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'resigned';
export type GameMode = 'pve' | 'watch';
export type AutoPlaySpeed = 'slow' | 'normal' | 'fast';

interface MoveHistoryEntry {
  from: Position;
  to: Position;
  piece: Piece;
  capturedPiece?: Piece;
  currentPlayerBefore: PieceColor;
}

interface JanggiState {
  pieces: Piece[];
  currentPlayer: PieceColor;
  selectedPieceId: string | null;
  validMoves: Position[];
  history: MoveHistoryEntry[];
  winner: PieceColor | null;
  gameStatus: GameStatus;
  inCheck: boolean;
  gameMode: GameMode;
  difficulty: Difficulty;
  redDifficulty: Difficulty;
  blueDifficulty: Difficulty;
  playerColor: PieceColor;
  autoPlayRed: boolean;
  autoPlayBlue: boolean;
  autoPlaySpeed: AutoPlaySpeed;
  isAIThinking: boolean;
  hintMove: { from: Position; to: Position } | null;
  invalidMoveMessage: string | null;
  soundEnabled: boolean;
  // actions
  selectPiece: (id: string | null) => void;
  movePiece: (toCol: number, toRow: number) => void;
  aiMove: (color?: PieceColor) => void;
  undoMove: () => void;
  resetGame: () => void;
  resign: () => void;
  setGameMode: (mode: GameMode) => void;
  setDifficulty: (level: Difficulty) => void;
  setRedDifficulty: (level: Difficulty) => void;
  setBlueDifficulty: (level: Difficulty) => void;
  setPlayerColor: (color: PieceColor) => void;
  setAutoPlaySpeed: (speed: AutoPlaySpeed) => void;
  startGame: () => void;
  startWatchGame: () => void;
  backToMenu: () => void;
  showHint: () => void;
  clearHint: () => void;
  showInvalidMove: (message: string) => void;
  toggleSound: () => void;
  toggleAutoPlay: (color: PieceColor) => void;
}

// AI 执蓝方
const AI_COLOR: PieceColor = 'blue';

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

export const useJanggiStore = create<JanggiState>((set, get) => ({
  pieces: createInitialBoard(),
  currentPlayer: 'red',
  selectedPieceId: null,
  validMoves: [],
  history: [],
  winner: null,
  gameStatus: 'playing',
  inCheck: false,
  gameMode: 'pve',
  difficulty: 'medium',
  redDifficulty: 'medium',
  blueDifficulty: 'medium',
  playerColor: 'red',
  autoPlayRed: false,
  autoPlayBlue: false,
  autoPlaySpeed: 'normal',
  isAIThinking: false,
  hintMove: null,
  invalidMoveMessage: null,
  soundEnabled: true,

  selectPiece: (id) => {
    const { pieces, currentPlayer, gameStatus, gameMode, isAIThinking, autoPlayRed, autoPlayBlue } = get();

    if (gameStatus !== 'playing') {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    // PvE 模式下，AI 回合玩家不能选子
    if (gameMode === 'pve' && currentPlayer === AI_COLOR) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    const isAutoPlay = currentPlayer === 'red' ? autoPlayRed : autoPlayBlue;
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

  movePiece: (toCol, toRow) => {
    const {
      pieces, currentPlayer, selectedPieceId, validMoves, history,
      gameStatus, gameMode, difficulty, autoPlayRed, autoPlayBlue, autoPlaySpeed,
    } = get();

    if (gameStatus !== 'playing') return;
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
      const idx = newPieces.findIndex((p) => p.id === capturedPiece.id);
      if (idx !== -1) newPieces.splice(idx, 1);
    }

    movingPiece.col = toCol;
    movingPiece.row = toRow;

    const nextPlayer: PieceColor = currentPlayer === 'red' ? 'blue' : 'red';
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

    const historyEntry: MoveHistoryEntry = {
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

    // 走棋后触发 AI 或自动播放
    const isNextAutoPlay = nextPlayer === 'red' ? autoPlayRed : autoPlayBlue;
    if (isNextAutoPlay && newStatus === 'playing') {
      const { min, max } = getAutoPlayDelayRange(autoPlaySpeed);
      const delay = randomDelay(min, max);
      set({ isAIThinking: true });
      setTimeout(() => {
        get().aiMove(nextPlayer);
      }, delay);
    } else if (gameMode === 'pve' && nextPlayer === AI_COLOR && newStatus === 'playing') {
      const { min, max } = getDelayRange(difficulty);
      const delay = randomDelay(min, max);
      set({ isAIThinking: true });
      setTimeout(() => {
        get().aiMove();
      }, delay);
    }
  },

  aiMove: (color) => {
    const { pieces, difficulty, redDifficulty, blueDifficulty, gameMode, gameStatus, currentPlayer } = get();

    if (gameStatus !== 'playing') {
      set({ isAIThinking: false });
      return;
    }

    const aiColor = color || currentPlayer;

    let currentDifficulty: Difficulty;
    if (gameMode === 'watch') {
      currentDifficulty = aiColor === 'red' ? redDifficulty : blueDifficulty;
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

    // PvE 模式下悔棋撤销两步（玩家+AI）
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

    for (let i = 0; i < stepsToUndo; i += 1) {
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
    clearAutoPlayTimeout();
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
  },

  resign: () => {
    const { currentPlayer, gameStatus } = get();
    if (gameStatus !== 'playing') return;
    const winner: PieceColor = currentPlayer === 'red' ? 'blue' : 'red';
    set({
      gameStatus: 'resigned',
      winner,
      selectedPieceId: null,
      validMoves: [],
      isAIThinking: false,
      hintMove: null,
      invalidMoveMessage: null,
    });
    setTimeout(() => playLoseSound(), 200);
  },

  setGameMode: (mode) => set({ gameMode: mode }),
  setDifficulty: (level) => set({ difficulty: level }),
  setRedDifficulty: (level) => set({ redDifficulty: level }),
  setBlueDifficulty: (level) => set({ blueDifficulty: level }),
  setPlayerColor: (color) => set({ playerColor: color }),
  setAutoPlaySpeed: (speed) => set({ autoPlaySpeed: speed }),

  startGame: () => {
    const { resetGame, playerColor } = get();
    resetGame();
    // PvE 模式下，若玩家执蓝，AI（红）先行
    if (playerColor === 'blue') {
      set({ isAIThinking: true });
      setTimeout(() => get().aiMove('red'), 600);
    }
  },

  startWatchGame: () => {
    const { resetGame } = get();
    resetGame();
    set({ gameMode: 'watch', autoPlayRed: true, autoPlayBlue: true });
    setTimeout(() => {
      const { autoPlaySpeed } = get();
      const { min, max } = getAutoPlayDelayRange(autoPlaySpeed);
      const delay = randomDelay(min, max);
      set({ isAIThinking: true });
      autoPlayTimeoutId = setTimeout(() => {
        get().aiMove('red');
      }, delay);
    }, 500);
  },

  backToMenu: () => {
    clearAutoPlayTimeout();
    set({
      isAIThinking: false,
      hintMove: null,
      invalidMoveMessage: null,
      autoPlayRed: false,
      autoPlayBlue: false,
    });
  },

  showHint: () => {
    const { pieces, currentPlayer, gameStatus, gameMode, difficulty, isAIThinking } = get();
    if (gameStatus !== 'playing') return;
    if (isAIThinking) return;
    if (gameMode === 'pve' && currentPlayer === AI_COLOR) return;

    const move = getAIMove(pieces, currentPlayer, difficulty);
    if (move) {
      const piece = pieces.find((p) => p.col === move.from.col && p.row === move.from.row);
      const validMoves = piece ? getValidMoves(pieces, piece.col, piece.row) : [];
      set({
        hintMove: move,
        selectedPieceId: piece?.id || null,
        validMoves,
      });
      playHintSound();
    }
  },

  clearHint: () => set({ hintMove: null }),

  showInvalidMove: (message) => {
    set({ invalidMoveMessage: message });
    playInvalidSound();
    setTimeout(() => {
      set({ invalidMoveMessage: null });
    }, 2000);
  },

  toggleSound: () => {
    const { soundEnabled } = get();
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    set({ soundEnabled: newVal });
    if (newVal) playClickSound();
  },

  toggleAutoPlay: (color) => {
    const { currentPlayer, isAIThinking } = get();
    const isCurrentPlayer = currentPlayer === color;
    let newAutoPlayValue: boolean;

    if (color === 'red') {
      newAutoPlayValue = !get().autoPlayRed;
      set((state) => ({ autoPlayRed: !state.autoPlayRed }));
    } else {
      newAutoPlayValue = !get().autoPlayBlue;
      set((state) => ({ autoPlayBlue: !state.autoPlayBlue }));
    }

    if (isCurrentPlayer) {
      if (newAutoPlayValue) {
        const { autoPlaySpeed } = get();
        const { min, max } = getAutoPlayDelayRange(autoPlaySpeed);
        const delay = randomDelay(min, max);
        set({ isAIThinking: true });
        autoPlayTimeoutId = setTimeout(() => {
          get().aiMove(currentPlayer);
        }, delay);
      } else {
        clearAutoPlayTimeout();
        if (isAIThinking) set({ isAIThinking: false });
      }
    }
  },
}));
