// 五子棋状态管理：使用 zustand
// 人机模式：玩家执黑（1），AI 执白（2）

import { create } from 'zustand';
import {
  Board,
  Player,
  createEmptyBoard,
  cloneBoard,
  isValidMove,
  checkWin,
  isBoardFull,
} from './rules';
import { getAIMove, Difficulty } from './ai';

export type { Difficulty } from './ai';
export type { Player } from './rules';

export type GomokuGameStatus = 'playing' | 'won' | 'draw';

// 一手棋的记录
export interface MoveRecord {
  row: number;
  col: number;
  player: Player;
}

interface GomokuState {
  board: Board;
  currentPlayer: Player;       // 当前轮到谁
  winner: Player | null;       // 胜者
  gameStatus: GomokuGameStatus;
  history: MoveRecord[];
  lastMove: { row: number; col: number } | null;
  difficulty: Difficulty;
  isAIThinking: boolean;

  // 落子（玩家手动）
  placeStone: (row: number, col: number) => void;
  // AI 走棋
  aiMove: () => void;
  // 重新开始
  resetGame: () => void;
  // 悔棋（人机模式下默认悔两步：玩家+AI）
  undoMove: () => void;
  // 设置难度
  setDifficulty: (d: Difficulty) => void;
}

// AI 颜色：白棋
const AI_PLAYER: Player = 2;
// 玩家颜色：黑棋
const HUMAN_PLAYER: Player = 1;

// AI 思考延迟范围（毫秒）
const AI_DELAY_MIN = 300;
const AI_DELAY_MAX = 700;

function randomDelay(): number {
  return Math.floor(Math.random() * (AI_DELAY_MAX - AI_DELAY_MIN + 1)) + AI_DELAY_MIN;
}

export const useGomokuStore = create<GomokuState>((set, get) => ({
  board: createEmptyBoard(),
  currentPlayer: HUMAN_PLAYER,
  winner: null,
  gameStatus: 'playing',
  history: [],
  lastMove: null,
  difficulty: 'medium',
  isAIThinking: false,

  placeStone: (row, col) => {
    const state = get();
    if (state.gameStatus !== 'playing') return;
    if (state.isAIThinking) return;
    if (!isValidMove(state.board, row, col)) return;

    const player = state.currentPlayer;
    const newBoard = cloneBoard(state.board);
    newBoard[row][col] = player;

    const won = checkWin(newBoard, row, col);
    const full = isBoardFull(newBoard);
    const newStatus: GomokuGameStatus = won ? 'won' : full ? 'draw' : 'playing';
    const newWinner: Player | null = won ? player : null;
    const nextPlayer: Player = player === 1 ? 2 : 1;

    set({
      board: newBoard,
      currentPlayer: nextPlayer,
      winner: newWinner,
      gameStatus: newStatus,
      history: [...state.history, { row, col, player }],
      lastMove: { row, col },
    });

    // 若游戏未结束且轮到 AI，触发 AI 走棋
    if (newStatus === 'playing' && nextPlayer === AI_PLAYER) {
      set({ isAIThinking: true });
      setTimeout(() => {
        get().aiMove();
      }, randomDelay());
    }
  },

  aiMove: () => {
    const state = get();
    if (state.gameStatus !== 'playing') {
      set({ isAIThinking: false });
      return;
    }

    const move = getAIMove(state.board, AI_PLAYER, state.difficulty);
    if (!move) {
      set({ isAIThinking: false });
      return;
    }

    const [row, col] = move;
    const newBoard = cloneBoard(state.board);
    newBoard[row][col] = AI_PLAYER;

    const won = checkWin(newBoard, row, col);
    const full = isBoardFull(newBoard);
    const newStatus: GomokuGameStatus = won ? 'won' : full ? 'draw' : 'playing';
    const newWinner: Player | null = won ? AI_PLAYER : null;

    set({
      board: newBoard,
      currentPlayer: HUMAN_PLAYER,
      winner: newWinner,
      gameStatus: newStatus,
      history: [...state.history, { row, col, player: AI_PLAYER }],
      lastMove: { row, col },
      isAIThinking: false,
    });
  },

  resetGame: () => {
    set({
      board: createEmptyBoard(),
      currentPlayer: HUMAN_PLAYER,
      winner: null,
      gameStatus: 'playing',
      history: [],
      lastMove: null,
      isAIThinking: false,
    });
  },

  undoMove: () => {
    const state = get();
    if (state.isAIThinking) return;
    if (state.history.length === 0) return;
    if (state.gameStatus !== 'playing' && state.gameStatus !== 'won' && state.gameStatus !== 'draw') return;

    // 人机模式：若最后一手是 AI 下的，悔两步（AI + 玩家）
    let stepsToUndo = 1;
    if (state.history.length >= 2 && state.history[state.history.length - 1].player === AI_PLAYER) {
      stepsToUndo = 2;
    }

    const newBoard = cloneBoard(state.board);
    const newHistory = [...state.history];
    let lastPlayer: Player = HUMAN_PLAYER;

    for (let i = 0; i < stepsToUndo; i++) {
      if (newHistory.length === 0) break;
      const last = newHistory.pop()!;
      newBoard[last.row][last.col] = 0;
      lastPlayer = last.player;
    }

    const lastRec = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;

    set({
      board: newBoard,
      currentPlayer: lastPlayer,
      winner: null,
      gameStatus: 'playing',
      history: newHistory,
      lastMove: lastRec ? { row: lastRec.row, col: lastRec.col } : null,
      isAIThinking: false,
    });
  },

  setDifficulty: (d) => {
    set({ difficulty: d });
  },
}));
