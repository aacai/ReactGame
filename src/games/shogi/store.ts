// 日本将棋状态管理（zustand）
// 包含：棋盘状态、持驹、当前玩家、走棋历史、升变弹窗、打入模式、AI 回合
// 参考 janggi/store.ts 但针对将棋的升变/持驹特性做了调整

import { create } from 'zustand';
import type { Piece, PieceColor, PieceType, Position, Hand } from './types';
import {
  createInitialBoard,
  createInitialHand,
  clonePieces,
  cloneHand,
  getPieceAt,
  getValidMoves,
  getDropMoves,
  getHandCount,
  removeFromHand,
  applyMove as rulesApplyMove,
  applyDrop as rulesApplyDrop,
  applyAction as rulesApplyAction,
  canPromote,
  mustPromote,
  isInCheck,
  isCheckmate,
  isStalemate,
} from './rules';
import type { Action } from './rules';
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
  playClickSound,
  setSoundEnabled,
} from '../../game/sound';

export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'resigned';
export type GameMode = 'pve' | 'watch';
export type AutoPlaySpeed = 'slow' | 'normal' | 'fast';

// 走棋历史条目（用于悔棋）
interface MoveHistoryEntry {
  kind: 'move' | 'drop';
  from?: Position;           // move 专用
  to: Position;
  pieceId: string;           // 移动的棋子 ID（move 是原棋子，drop 是新打入的棋子）
  promotedBefore?: boolean;  // move 专用：移动前的升变状态
  capturedPiece?: Piece;     // move 专用：被吃的棋子
  droppedType?: PieceType;   // drop 专用：打入的棋子类型
  handBefore: Hand;          // 操作前的持驹（用于恢复）
  currentPlayerBefore: PieceColor;
}

interface ShogiState {
  pieces: Piece[];
  currentPlayer: PieceColor;
  hand: Hand;
  gameStatus: GameStatus;
  winner: PieceColor | null;
  history: MoveHistoryEntry[];
  selectedPieceId: string | null;
  validMoves: Position[];
  // 打入模式：选中的持驹类型
  selectedHandType: PieceType | null;
  validDropSquares: Position[];
  // 升变弹窗：当玩家可选升变时，暂停等待用户选择
  pendingPromotion: { from: Position; to: Position } | null;
  isAIThinking: boolean;
  inCheck: boolean;
  lastMove: { from: Position; to: Position } | null;
  // 设置
  gameMode: GameMode;
  difficulty: Difficulty;
  senteDifficulty: Difficulty;
  goteDifficulty: Difficulty;
  playerColor: PieceColor;
  autoPlaySente: boolean;
  autoPlayGote: boolean;
  autoPlaySpeed: AutoPlaySpeed;
  soundEnabled: boolean;
  invalidMoveMessage: string | null;

  // actions
  selectPiece: (id: string | null) => void;
  selectHandPiece: (type: PieceType | null) => void;
  movePiece: (toCol: number, toRow: number) => void;
  confirmPromotion: (promote: boolean) => void;
  dropPiece: (toCol: number, toRow: number) => void;
  aiMove: (color?: PieceColor) => void;
  undoMove: () => void;
  resetGame: () => void;
  resign: () => void;
  setGameMode: (mode: GameMode) => void;
  setDifficulty: (level: Difficulty) => void;
  setSenteDifficulty: (level: Difficulty) => void;
  setGoteDifficulty: (level: Difficulty) => void;
  setPlayerColor: (color: PieceColor) => void;
  setAutoPlaySpeed: (speed: AutoPlaySpeed) => void;
  startGame: () => void;
  startWatchGame: () => void;
  backToMenu: () => void;
  toggleSound: () => void;
  toggleAutoPlay: (color: PieceColor) => void;
  showInvalidMove: (message: string) => void;
}

// PvE 模式下 AI 执后手 gote（默认）
const AI_COLOR: PieceColor = 'gote';

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
      return { min: 600, max: 1500 };
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

function opposite(color: PieceColor): PieceColor {
  return color === 'sente' ? 'gote' : 'sente';
}

// ========== 内部辅助函数（通过 useShogiStore.setState/getState 访问状态） ==========

// 应用走棋（含升变、吃子、持驹更新、胜负判断、触发下一回合 AI）
function applyMoveInternal(from: Position, to: Position, promote: boolean) {
  const state = useShogiStore.getState();
  if (state.gameStatus !== 'playing') return;

  const selectedPiece = getPieceAt(state.pieces, from.col, from.row);
  if (!selectedPiece) return;

  const { newPieces, newHand, captured } = rulesApplyMove(
    state.pieces, state.hand, from.col, from.row, to.col, to.row, promote,
  );

  const historyEntry: MoveHistoryEntry = {
    kind: 'move',
    from,
    to,
    pieceId: selectedPiece.id,
    promotedBefore: selectedPiece.promoted,
    capturedPiece: captured,
    handBefore: cloneHand(state.hand),
    currentPlayerBefore: state.currentPlayer,
  };

  const nextPlayer = opposite(state.currentPlayer);
  const nextInCheck = isInCheck(newPieces, nextPlayer);
  const nextCheckmate = isCheckmate(newPieces, nextPlayer, newHand);
  const nextStalemate = isStalemate(newPieces, nextPlayer, newHand);

  let newStatus: GameStatus = 'playing';
  let newWinner: PieceColor | null = null;
  if (nextCheckmate) {
    newStatus = 'checkmate';
    newWinner = state.currentPlayer;
  } else if (nextStalemate) {
    newStatus = 'stalemate';
    newWinner = state.currentPlayer;
  }

  useShogiStore.setState({
    pieces: newPieces,
    hand: newHand,
    currentPlayer: nextPlayer,
    selectedPieceId: null,
    validMoves: [],
    selectedHandType: null,
    validDropSquares: [],
    pendingPromotion: null,
    history: [...state.history, historyEntry],
    winner: newWinner,
    gameStatus: newStatus,
    inCheck: nextInCheck,
    lastMove: { from, to },
  });

  if (captured) {
    playCaptureSound();
  } else {
    playMoveSound();
  }

  if (nextCheckmate) {
    setTimeout(() => playWinSound(), 300);
  } else if (nextInCheck) {
    setTimeout(() => playCheckSound(), 100);
  }

  triggerNextAI(nextPlayer, newStatus);
}

// 应用 AI 动作（move 或 drop），直接执行不走升变弹窗
function applyActionInternal(action: Action, color: PieceColor) {
  const state = useShogiStore.getState();
  if (state.gameStatus !== 'playing') return;

  const { newPieces, newHand } = rulesApplyAction(state.pieces, state.hand, color, action);

  let historyEntry: MoveHistoryEntry;
  let capturedForSound: Piece | undefined;

  if (action.kind === 'move') {
    const mover = getPieceAt(state.pieces, action.from.col, action.from.row);
    if (!mover) return;
    capturedForSound = getPieceAt(state.pieces, action.to.col, action.to.row);
    historyEntry = {
      kind: 'move',
      from: action.from,
      to: action.to,
      pieceId: mover.id,
      promotedBefore: mover.promoted,
      capturedPiece: capturedForSound,
      handBefore: cloneHand(state.hand),
      currentPlayerBefore: color,
    };
  } else {
    const droppedPiece = newPieces[newPieces.length - 1];
    historyEntry = {
      kind: 'drop',
      to: action.to,
      pieceId: droppedPiece.id,
      droppedType: action.pieceType,
      handBefore: cloneHand(state.hand),
      currentPlayerBefore: color,
    };
  }

  const nextPlayer = opposite(color);
  const nextInCheck = isInCheck(newPieces, nextPlayer);
  const nextCheckmate = isCheckmate(newPieces, nextPlayer, newHand);
  const nextStalemate = isStalemate(newPieces, nextPlayer, newHand);

  let newStatus: GameStatus = 'playing';
  let newWinner: PieceColor | null = null;
  if (nextCheckmate) {
    newStatus = 'checkmate';
    newWinner = color;
  } else if (nextStalemate) {
    newStatus = 'stalemate';
    newWinner = color;
  }

  useShogiStore.setState({
    pieces: newPieces,
    hand: newHand,
    currentPlayer: nextPlayer,
    selectedPieceId: null,
    validMoves: [],
    selectedHandType: null,
    validDropSquares: [],
    pendingPromotion: null,
    history: [...state.history, historyEntry],
    winner: newWinner,
    gameStatus: newStatus,
    inCheck: nextInCheck,
    lastMove: action.kind === 'move'
      ? { from: action.from, to: action.to }
      : { from: action.to, to: action.to },
  });

  if (action.kind === 'move') {
    if (capturedForSound) {
      playCaptureSound();
    } else {
      playMoveSound();
    }
  } else {
    playMoveSound();
  }

  if (nextCheckmate) {
    setTimeout(() => playWinSound(), 300);
  } else if (nextInCheck) {
    setTimeout(() => playCheckSound(), 100);
  }

  triggerNextAI(nextPlayer, newStatus);
}

// 走棋后触发 AI 或自动播放
function triggerNextAI(nextPlayer: PieceColor, newStatus: GameStatus) {
  if (newStatus !== 'playing') return;
  const state = useShogiStore.getState();
  const { gameMode, difficulty, autoPlaySente, autoPlayGote, autoPlaySpeed } = state;

  const isNextAutoPlay = nextPlayer === 'sente' ? autoPlaySente : autoPlayGote;
  if (isNextAutoPlay) {
    const { min, max } = getAutoPlayDelayRange(autoPlaySpeed);
    const delay = randomDelay(min, max);
    useShogiStore.setState({ isAIThinking: true });
    autoPlayTimeoutId = setTimeout(() => {
      useShogiStore.getState().aiMove(nextPlayer);
    }, delay);
    return;
  }

  if (gameMode === 'pve' && nextPlayer === AI_COLOR) {
    const { min, max } = getDelayRange(difficulty);
    const delay = randomDelay(min, max);
    useShogiStore.setState({ isAIThinking: true });
    setTimeout(() => {
      useShogiStore.getState().aiMove();
    }, delay);
  }
}

export const useShogiStore = create<ShogiState>((set, get) => ({
  pieces: createInitialBoard(),
  currentPlayer: 'sente',
  hand: createInitialHand(),
  gameStatus: 'playing',
  winner: null,
  history: [],
  selectedPieceId: null,
  validMoves: [],
  selectedHandType: null,
  validDropSquares: [],
  pendingPromotion: null,
  isAIThinking: false,
  inCheck: false,
  lastMove: null,
  gameMode: 'pve',
  difficulty: 'medium',
  senteDifficulty: 'medium',
  goteDifficulty: 'medium',
  playerColor: 'sente',
  autoPlaySente: false,
  autoPlayGote: false,
  autoPlaySpeed: 'normal',
  soundEnabled: true,
  invalidMoveMessage: null,

  selectPiece: (id) => {
    const {
      pieces, currentPlayer, gameStatus, gameMode, isAIThinking,
      autoPlaySente, autoPlayGote, pendingPromotion,
    } = get();

    if (gameStatus !== 'playing') {
      set({ selectedPieceId: null, validMoves: [], selectedHandType: null, validDropSquares: [] });
      return;
    }
    if (pendingPromotion) {
      return; // 升变弹窗显示中，禁止选子
    }
    // PvE 模式下，AI 回合玩家不能选子
    if (gameMode === 'pve' && currentPlayer === AI_COLOR) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }
    const isAutoPlay = currentPlayer === 'sente' ? autoPlaySente : autoPlayGote;
    if (isAutoPlay) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }
    if (isAIThinking) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    if (id === null) {
      set({ selectedPieceId: null, validMoves: [], selectedHandType: null, validDropSquares: [] });
      return;
    }

    const piece = pieces.find((p) => p.id === id);
    if (!piece || piece.color !== currentPlayer) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    // 选子时清除打入模式
    const moves = getValidMoves(pieces, piece.col, piece.row);
    set({
      selectedPieceId: id,
      validMoves: moves,
      selectedHandType: null,
      validDropSquares: [],
    });
  },

  selectHandPiece: (type) => {
    const {
      pieces, currentPlayer, hand, gameStatus, gameMode, isAIThinking,
      autoPlaySente, autoPlayGote, pendingPromotion,
    } = get();

    if (gameStatus !== 'playing') return;
    if (pendingPromotion) return;
    if (gameMode === 'pve' && currentPlayer === AI_COLOR) return;
    const isAutoPlay = currentPlayer === 'sente' ? autoPlaySente : autoPlayGote;
    if (isAutoPlay || isAIThinking) return;

    if (type === null) {
      set({ selectedHandType: null, validDropSquares: [], selectedPieceId: null, validMoves: [] });
      return;
    }

    // 持驹中无此类型
    if (getHandCount(hand, currentPlayer, type) <= 0) return;

    const squares = getDropMoves(pieces, currentPlayer, hand, type);
    set({
      selectedHandType: type,
      validDropSquares: squares,
      selectedPieceId: null,
      validMoves: [],
    });
  },

  // 玩家走棋：若升变可选，则暂停等待 confirmPromotion
  movePiece: (toCol, toRow) => {
    const state = get();
    if (state.gameStatus !== 'playing') return;
    if (!state.selectedPieceId) return;
    if (state.pendingPromotion) return;
    const isValid = state.validMoves.some((m) => m.col === toCol && m.row === toRow);
    if (!isValid) return;

    const selectedPiece = state.pieces.find((p) => p.id === state.selectedPieceId);
    if (!selectedPiece) return;

    const fromPos: Position = { col: selectedPiece.col, row: selectedPiece.row };
    const toPos: Position = { col: toCol, row: toRow };

    // 升变判断
    const canPromoteFlag = canPromote(selectedPiece, selectedPiece.row, toRow);
    const mustPromoteFlag = mustPromote(selectedPiece, toRow);

    if (mustPromoteFlag) {
      // 强制升变，直接应用
      applyMoveInternal(fromPos, toPos, true);
      return;
    }
    if (canPromoteFlag) {
      // 玩家可选升变：暂停，等弹窗
      set({ pendingPromotion: { from: fromPos, to: toPos } });
      return;
    }
    // 不能升变，直接应用
    applyMoveInternal(fromPos, toPos, false);
  },

  confirmPromotion: (promote) => {
    const { pendingPromotion } = get();
    if (!pendingPromotion) return;
    set({ pendingPromotion: null });
    applyMoveInternal(pendingPromotion.from, pendingPromotion.to, promote);
  },

  dropPiece: (toCol, toRow) => {
    const state = get();
    if (state.gameStatus !== 'playing') return;
    if (!state.selectedHandType) return;
    const isValid = state.validDropSquares.some((s) => s.col === toCol && s.row === toRow);
    if (!isValid) return;

    const toPos: Position = { col: toCol, row: toRow };
    const droppedType = state.selectedHandType;

    // 应用打入
    const newPieces = rulesApplyDrop(state.pieces, state.currentPlayer, droppedType, toCol, toRow);
    const newHand = removeFromHand(state.hand, state.currentPlayer, droppedType);

    // 找到新打入的棋子（最后加入的）
    const droppedPiece = newPieces[newPieces.length - 1];

    const historyEntry: MoveHistoryEntry = {
      kind: 'drop',
      to: toPos,
      pieceId: droppedPiece.id,
      droppedType,
      handBefore: cloneHand(state.hand),
      currentPlayerBefore: state.currentPlayer,
    };

    const nextPlayer = opposite(state.currentPlayer);
    const nextInCheck = isInCheck(newPieces, nextPlayer);
    const nextCheckmate = isCheckmate(newPieces, nextPlayer, newHand);
    const nextStalemate = isStalemate(newPieces, nextPlayer, newHand);

    let newStatus: GameStatus = 'playing';
    let newWinner: PieceColor | null = null;
    if (nextCheckmate) {
      newStatus = 'checkmate';
      newWinner = state.currentPlayer;
    } else if (nextStalemate) {
      newStatus = 'stalemate';
      newWinner = state.currentPlayer;
    }

    set({
      pieces: newPieces,
      hand: newHand,
      currentPlayer: nextPlayer,
      selectedPieceId: null,
      validMoves: [],
      selectedHandType: null,
      validDropSquares: [],
      history: [...state.history, historyEntry],
      winner: newWinner,
      gameStatus: newStatus,
      inCheck: nextInCheck,
      lastMove: { from: toPos, to: toPos },
    });

    playMoveSound();

    if (nextCheckmate) {
      setTimeout(() => playWinSound(), 300);
    } else if (nextInCheck) {
      setTimeout(() => playCheckSound(), 100);
    }

    triggerNextAI(nextPlayer, newStatus);
  },

  aiMove: (color) => {
    const state = get();
    if (state.gameStatus !== 'playing') {
      set({ isAIThinking: false });
      return;
    }

    const aiColor = color || state.currentPlayer;
    let currentDifficulty: Difficulty;
    if (state.gameMode === 'watch') {
      currentDifficulty = aiColor === 'sente' ? state.senteDifficulty : state.goteDifficulty;
    } else {
      currentDifficulty = state.difficulty;
    }

    const action = getAIMove(state.pieces, state.hand, aiColor, currentDifficulty);
    if (!action) {
      set({ isAIThinking: false });
      return;
    }

    applyActionInternal(action, aiColor);
    set({ isAIThinking: false });
  },

  undoMove: () => {
    const { history, pieces, hand, gameMode } = get();
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
    let newHand = cloneHand(hand);
    let newHistory = [...history];
    let currentPlayer: PieceColor = history[history.length - 1].currentPlayerBefore;

    for (let i = 0; i < stepsToUndo; i += 1) {
      if (newHistory.length === 0) break;
      const lastEntry = newHistory[newHistory.length - 1];
      newHistory = newHistory.slice(0, -1);
      currentPlayer = lastEntry.currentPlayerBefore;

      if (lastEntry.kind === 'move') {
        // 还原移动的棋子
        const idx = newPieces.findIndex((p) => p.id === lastEntry.pieceId);
        if (idx !== -1 && lastEntry.from) {
          newPieces[idx].col = lastEntry.from.col;
          newPieces[idx].row = lastEntry.from.row;
          newPieces[idx].promoted = lastEntry.promotedBefore ?? false;
        }
        // 还原被吃的棋子
        if (lastEntry.capturedPiece) {
          newPieces.push({ ...lastEntry.capturedPiece });
        }
      } else {
        // 删除打入的棋子
        const idx = newPieces.findIndex((p) => p.id === lastEntry.pieceId);
        if (idx !== -1) newPieces.splice(idx, 1);
      }
      // 还原持驹
      newHand = cloneHand(lastEntry.handBefore);
    }

    const inCheck = isInCheck(newPieces, currentPlayer);

    const newLastMove = newHistory.length > 0
      ? { from: newHistory[newHistory.length - 1].from ?? newHistory[newHistory.length - 1].to, to: newHistory[newHistory.length - 1].to }
      : null;

    set({
      pieces: newPieces,
      hand: newHand,
      currentPlayer,
      selectedPieceId: null,
      validMoves: [],
      selectedHandType: null,
      validDropSquares: [],
      history: newHistory,
      winner: null,
      gameStatus: 'playing',
      inCheck,
      isAIThinking: false,
      pendingPromotion: null,
      lastMove: newLastMove,
    });
  },

  resetGame: () => {
    clearAutoPlayTimeout();
    set({
      pieces: createInitialBoard(),
      hand: createInitialHand(),
      currentPlayer: 'sente',
      selectedPieceId: null,
      validMoves: [],
      selectedHandType: null,
      validDropSquares: [],
      pendingPromotion: null,
      history: [],
      winner: null,
      gameStatus: 'playing',
      inCheck: false,
      isAIThinking: false,
      lastMove: null,
      invalidMoveMessage: null,
    });
  },

  resign: () => {
    const { currentPlayer, gameStatus } = get();
    if (gameStatus !== 'playing') return;
    const winner: PieceColor = opposite(currentPlayer);
    set({
      gameStatus: 'resigned',
      winner,
      selectedPieceId: null,
      validMoves: [],
      selectedHandType: null,
      validDropSquares: [],
      isAIThinking: false,
      pendingPromotion: null,
    });
    setTimeout(() => playLoseSound(), 200);
  },

  setGameMode: (mode) => set({ gameMode: mode }),
  setDifficulty: (level) => set({ difficulty: level }),
  setSenteDifficulty: (level) => set({ senteDifficulty: level }),
  setGoteDifficulty: (level) => set({ goteDifficulty: level }),
  setPlayerColor: (color) => set({ playerColor: color }),
  setAutoPlaySpeed: (speed) => set({ autoPlaySpeed: speed }),

  startGame: () => {
    const { resetGame, playerColor } = get();
    resetGame();
    // PvE 模式下，若玩家执 gote，AI（sente）先行
    if (playerColor === 'gote') {
      set({ isAIThinking: true });
      setTimeout(() => get().aiMove('sente'), 600);
    }
  },

  startWatchGame: () => {
    const { resetGame } = get();
    resetGame();
    set({ gameMode: 'watch', autoPlaySente: true, autoPlayGote: true });
    setTimeout(() => {
      const { autoPlaySpeed } = get();
      const { min, max } = getAutoPlayDelayRange(autoPlaySpeed);
      const delay = randomDelay(min, max);
      set({ isAIThinking: true });
      autoPlayTimeoutId = setTimeout(() => {
        get().aiMove('sente');
      }, delay);
    }, 500);
  },

  backToMenu: () => {
    clearAutoPlayTimeout();
    set({
      isAIThinking: false,
      pendingPromotion: null,
      invalidMoveMessage: null,
      autoPlaySente: false,
      autoPlayGote: false,
      selectedPieceId: null,
      validMoves: [],
      selectedHandType: null,
      validDropSquares: [],
    });
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

    if (color === 'sente') {
      newAutoPlayValue = !get().autoPlaySente;
      set((state) => ({ autoPlaySente: !state.autoPlaySente }));
    } else {
      newAutoPlayValue = !get().autoPlayGote;
      set((state) => ({ autoPlayGote: !state.autoPlayGote }));
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

  showInvalidMove: (message) => {
    set({ invalidMoveMessage: message });
    playInvalidSound();
    setTimeout(() => {
      set({ invalidMoveMessage: null });
    }, 2000);
  },
}));
