// 军棋暗棋状态管理（zustand）
// 玩家始终先手，第一手翻棋决定玩家颜色
// 之后玩家与 AI 交替行动：可翻棋 或 走己方已翻开的棋子

import { create } from 'zustand';
import type { Piece, Position } from './types';
import {
  createInitialBoard,
  clonePieces,
  getValidMoves,
  getPieceAt,
  battle,
  canMove,
  checkGameOver,
  type Action,
  type BattleResult,
} from './rules';
import { getAIMove, type Difficulty } from './ai';

export type { Difficulty } from './ai';

export type GameStatus = 'playing' | 'won' | 'draw';
type Player = 'human' | 'ai';
type RealColor = 'red' | 'blue';

// 一手棋的记录
export interface MoveHistoryEntry {
  type: 'flip' | 'move';
  player: Player;
  color: RealColor | null;  // 翻棋时玩家颜色可能尚未确定
  // 翻棋：被翻开的棋子
  flippedPiece?: Piece;
  // 走棋：起点、终点、走的棋子、被吃的棋子、战斗结果
  from?: Position;
  to?: Position;
  piece?: Piece;
  capturedPiece?: Piece;
  battleResult?: BattleResult;
}

interface JunqiState {
  pieces: Piece[];
  currentPlayer: Player;
  playerColor: RealColor | null;  // 玩家颜色，第一次翻棋决定
  gameStatus: GameStatus;
  winner: RealColor | null;
  winReason: string | null;
  selectedPieceId: string | null;
  validMoves: Position[];
  history: MoveHistoryEntry[];
  difficulty: Difficulty;
  isAIThinking: boolean;
  lastAction: { type: 'flip' | 'move'; col: number; row: number } | null;

  // 翻棋（玩家手动）
  revealPiece: (col: number, row: number) => void;
  // 选子
  selectPiece: (id: string | null) => void;
  // 走棋（玩家手动）
  movePiece: (toCol: number, toRow: number) => void;
  // AI 行动
  aiMove: () => void;
  // 重新开始
  resetGame: () => void;
  // 设置难度
  setDifficulty: (d: Difficulty) => void;
  // 开始游戏
  startGame: () => void;
}

// AI 思考延迟范围（毫秒）
const AI_DELAY_MIN = 400;
const AI_DELAY_MAX = 800;

function randomDelay(): number {
  return Math.floor(Math.random() * (AI_DELAY_MAX - AI_DELAY_MIN + 1)) + AI_DELAY_MIN;
}

// 应用动作（翻棋或走棋）到棋盘，返回新棋盘和战斗信息
function applyAction(
  pieces: Piece[],
  action: Action
): {
  newPieces: Piece[];
  battleResult?: BattleResult;
  capturedPiece?: Piece;
  flippedPiece?: Piece;
} {
  if (action.type === 'flip') {
    const newPieces = clonePieces(pieces);
    const piece = newPieces.find((p) => p.col === action.col && p.row === action.row);
    if (piece) {
      piece.revealed = true;
    }
    return { newPieces, flippedPiece: piece ? { ...piece } : undefined };
  }

  // move
  const newPieces = clonePieces(pieces);
  const movingPiece = newPieces.find((p) => p.col === action.from.col && p.row === action.from.row);
  if (!movingPiece) return { newPieces };

  const defender = newPieces.find((p) => p.col === action.to.col && p.row === action.to.row);
  let battleResult: BattleResult | undefined;
  let capturedPiece: Piece | undefined;

  if (defender) {
    battleResult = battle(movingPiece, defender);
    if (battleResult === 'attacker_wins' || battleResult === 'flag_captured') {
      // 防守方死，攻击方移动到目标位置
      capturedPiece = { ...defender };
      const idx = newPieces.findIndex((p) => p.id === defender.id);
      if (idx !== -1) newPieces.splice(idx, 1);
      movingPiece.col = action.to.col;
      movingPiece.row = action.to.row;
    } else if (battleResult === 'defender_wins') {
      // 攻击方死
      capturedPiece = { ...movingPiece };
      const idx = newPieces.findIndex((p) => p.id === movingPiece.id);
      if (idx !== -1) newPieces.splice(idx, 1);
    } else if (battleResult === 'both_die') {
      // 同归于尽
      capturedPiece = { ...movingPiece };
      const idx1 = newPieces.findIndex((p) => p.id === movingPiece.id);
      if (idx1 !== -1) newPieces.splice(idx1, 1);
      const idx2 = newPieces.findIndex((p) => p.id === defender.id);
      if (idx2 !== -1) newPieces.splice(idx2, 1);
    }
  } else {
    // 移动到空位
    movingPiece.col = action.to.col;
    movingPiece.row = action.to.row;
  }

  return { newPieces, battleResult, capturedPiece };
}

export const useJunqiStore = create<JunqiState>((set, get) => ({
  pieces: createInitialBoard(),
  currentPlayer: 'human',
  playerColor: null,
  gameStatus: 'playing',
  winner: null,
  winReason: null,
  selectedPieceId: null,
  validMoves: [],
  history: [],
  difficulty: 'medium',
  isAIThinking: false,
  lastAction: null,

  revealPiece: (col, row) => {
    const state = get();
    if (state.gameStatus !== 'playing') return;
    if (state.isAIThinking) return;
    if (state.currentPlayer !== 'human') return;

    const piece = getPieceAt(state.pieces, col, row);
    if (!piece || piece.revealed) return;

    const { newPieces, flippedPiece } = applyAction(state.pieces, {
      type: 'flip',
      col,
      row,
    });

    // 第一手翻棋决定玩家颜色
    let newPlayerColor = state.playerColor;
    if (state.playerColor === null && flippedPiece) {
      newPlayerColor = flippedPiece.color as RealColor;
    }

    const historyEntry: MoveHistoryEntry = {
      type: 'flip',
      player: 'human',
      color: newPlayerColor,
      flippedPiece: flippedPiece ? { ...flippedPiece } : undefined,
    };

    // AI 颜色 = 玩家颜色的相反
    const aiColor: RealColor | null = newPlayerColor === null
      ? null
      : (newPlayerColor === 'red' ? 'blue' : 'red');

    // 检查游戏是否结束（下一方是 AI）
    let newStatus: GameStatus = 'playing';
    let newWinner: RealColor | null = null;
    let newReason: string | null = null;
    if (aiColor !== null) {
      const gameOver = checkGameOver(newPieces, aiColor);
      if (gameOver.winner) {
        newStatus = 'won';
        newWinner = gameOver.winner;
        newReason = gameOver.reason;
      } else if (gameOver.isDraw) {
        newStatus = 'draw';
        newReason = gameOver.reason;
      }
    }

    set({
      pieces: newPieces,
      currentPlayer: 'ai',
      playerColor: newPlayerColor,
      history: [...state.history, historyEntry],
      selectedPieceId: null,
      validMoves: [],
      lastAction: { type: 'flip', col, row },
      gameStatus: newStatus,
      winner: newWinner,
      winReason: newReason,
    });

    // 游戏未结束，触发 AI
    if (newStatus === 'playing') {
      set({ isAIThinking: true });
      setTimeout(() => get().aiMove(), randomDelay());
    }
  },

  selectPiece: (id) => {
    const { pieces, currentPlayer, playerColor, gameStatus, isAIThinking } = get();

    if (gameStatus !== 'playing') {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }
    if (isAIThinking) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }
    if (currentPlayer !== 'human') {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }
    if (playerColor === null) {
      // 颜色未定前不能选子（必须先翻棋决定颜色）
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    if (id === null) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    const piece = pieces.find((p) => p.id === id);
    if (!piece || !piece.revealed || piece.color !== playerColor) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    if (!canMove(piece)) {
      // 军旗、地雷不能移动
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    const moves = getValidMoves(pieces, piece.col, piece.row);
    set({ selectedPieceId: id, validMoves: moves });
  },

  movePiece: (toCol, toRow) => {
    const state = get();
    if (state.gameStatus !== 'playing') return;
    if (state.isAIThinking) return;
    if (state.currentPlayer !== 'human') return;
    if (!state.selectedPieceId) return;
    if (state.playerColor === null) return;

    const isValid = state.validMoves.some((m) => m.col === toCol && m.row === toRow);
    if (!isValid) return;

    const selectedPiece = state.pieces.find((p) => p.id === state.selectedPieceId);
    if (!selectedPiece) return;

    const action: Action = {
      type: 'move',
      from: { col: selectedPiece.col, row: selectedPiece.row },
      to: { col: toCol, row: toRow },
    };

    const { newPieces, battleResult, capturedPiece } = applyAction(state.pieces, action);

    const historyEntry: MoveHistoryEntry = {
      type: 'move',
      player: 'human',
      color: state.playerColor,
      from: action.from,
      to: action.to,
      piece: { ...selectedPiece },
      capturedPiece: capturedPiece ? { ...capturedPiece } : undefined,
      battleResult,
    };

    // 检查游戏是否结束（下一方是 AI）
    const aiColor: RealColor = state.playerColor === 'red' ? 'blue' : 'red';
    const gameOver = checkGameOver(newPieces, aiColor);
    let newStatus: GameStatus = 'playing';
    let newWinner: RealColor | null = null;
    let newReason: string | null = null;
    if (gameOver.winner) {
      newStatus = 'won';
      newWinner = gameOver.winner;
      newReason = gameOver.reason;
    } else if (gameOver.isDraw) {
      newStatus = 'draw';
      newReason = gameOver.reason;
    }

    set({
      pieces: newPieces,
      currentPlayer: 'ai',
      history: [...state.history, historyEntry],
      selectedPieceId: null,
      validMoves: [],
      lastAction: { type: 'move', col: toCol, row: toRow },
      gameStatus: newStatus,
      winner: newWinner,
      winReason: newReason,
    });

    if (newStatus === 'playing') {
      set({ isAIThinking: true });
      setTimeout(() => get().aiMove(), randomDelay());
    }
  },

  aiMove: () => {
    const state = get();
    if (state.gameStatus !== 'playing') {
      set({ isAIThinking: false });
      return;
    }
    if (state.playerColor === null) {
      // 玩家颜色未定（不应该到这里，但保险起见）
      set({ isAIThinking: false });
      return;
    }

    const aiColor: RealColor = state.playerColor === 'red' ? 'blue' : 'red';
    const action = getAIMove(state.pieces, aiColor, state.difficulty);
    if (!action) {
      // AI 无棋可走，AI 输
      set({
        isAIThinking: false,
        gameStatus: 'won',
        winner: state.playerColor,
        winReason: '对方无棋可走',
      });
      return;
    }

    const { newPieces, battleResult, capturedPiece, flippedPiece } = applyAction(
      state.pieces,
      action
    );

    // 记录被移动/翻开的棋子（用于历史）
    let movedPiece: Piece | undefined;
    if (action.type === 'move') {
      movedPiece = state.pieces.find(
        (p) => p.col === action.from.col && p.row === action.from.row
      );
    }

    const historyEntry: MoveHistoryEntry =
      action.type === 'flip'
        ? {
            type: 'flip',
            player: 'ai',
            color: aiColor,
            flippedPiece: flippedPiece ? { ...flippedPiece } : undefined,
          }
        : {
            type: 'move',
            player: 'ai',
            color: aiColor,
            from: action.from,
            to: action.to,
            piece: movedPiece ? { ...movedPiece } : undefined,
            capturedPiece: capturedPiece ? { ...capturedPiece } : undefined,
            battleResult,
          };

    // 检查游戏是否结束（下一方是玩家）
    const gameOver = checkGameOver(newPieces, state.playerColor);
    let newStatus: GameStatus = 'playing';
    let newWinner: RealColor | null = null;
    let newReason: string | null = null;
    if (gameOver.winner) {
      newStatus = 'won';
      newWinner = gameOver.winner;
      newReason = gameOver.reason;
    } else if (gameOver.isDraw) {
      newStatus = 'draw';
      newReason = gameOver.reason;
    }

    set({
      pieces: newPieces,
      currentPlayer: 'human',
      history: [...state.history, historyEntry],
      selectedPieceId: null,
      validMoves: [],
      lastAction: {
        type: action.type,
        col: action.type === 'flip' ? action.col : action.to.col,
        row: action.type === 'flip' ? action.row : action.to.row,
      },
      isAIThinking: false,
      gameStatus: newStatus,
      winner: newWinner,
      winReason: newReason,
    });
  },

  resetGame: () => {
    set({
      pieces: createInitialBoard(),
      currentPlayer: 'human',
      playerColor: null,
      gameStatus: 'playing',
      winner: null,
      winReason: null,
      selectedPieceId: null,
      validMoves: [],
      history: [],
      isAIThinking: false,
      lastAction: null,
    });
  },

  setDifficulty: (d) => set({ difficulty: d }),

  startGame: () => {
    const { resetGame } = get();
    resetGame();
  },
}));
