// 围棋状态管理（zustand）
// 人机模式：玩家执黑（先手），AI 执白
// 状态包含：棋盘、当前轮次、历史、提子数、劫点、游戏状态、胜方、最后一手、pass 次数

import { create } from 'zustand';
import type { Board, StoneColor, Position, Captures, GameStatus, Winner, ScoreResult } from './types';
import {
  createEmptyBoard,
  cloneBoard,
  placeStone as placeStoneRule,
  isLegalMove,
  detectKo,
  calculateScore,
} from './rules';
import { getAIMove } from './ai';

export type { Difficulty } from './ai';
export type { StoneColor, GameStatus, Winner, ScoreResult } from './types';

import type { Difficulty } from './ai';

// 历史记录条目：保存落子前的完整状态，便于悔棋恢复
interface HistoryEntry {
  board: Board;            // 落子前的棋盘
  currentPlayer: StoneColor;
  captures: Captures;      // 落子前的提子数
  koPoint: Position | null;
  passCount: number;
  move: {
    col: number;
    row: number;
    color: StoneColor;
    pass: boolean;
    captured: Position[];
  };
}

interface WeiqiState {
  board: Board;
  currentPlayer: StoneColor;       // 当前轮次：'black' 先手
  history: HistoryEntry[];
  captures: Captures;              // 黑/白各方提子数
  koPoint: Position | null;        // 当前劫点（下一手不可下此处）
  gameStatus: GameStatus;
  winner: Winner;
  lastMove: { col: number; row: number; pass: boolean } | null;
  passCount: number;               // 连续 pass 次数；2 次终局
  difficulty: Difficulty;
  isAIThinking: boolean;
  score: ScoreResult | null;       // 终局计分结果

  // 玩家手动落子
  placeStone: (col: number, row: number) => void;
  // 停一手（pass）
  pass: () => void;
  // AI 走棋
  aiMove: () => void;
  // 重新开始
  resetGame: () => void;
  // 悔棋（人机模式下默认悔两步：玩家+AI）
  undoMove: () => void;
  // 认输
  resign: () => void;
  // 设置难度
  setDifficulty: (d: Difficulty) => void;
}

// 玩家执黑先手，AI 执白
const HUMAN_COLOR: StoneColor = 'black';
const AI_COLOR: StoneColor = 'white';

// AI 思考延迟范围（毫秒）
const AI_DELAY_MIN = 400;
const AI_DELAY_MAX = 900;

function randomDelay(): number {
  return Math.floor(Math.random() * (AI_DELAY_MAX - AI_DELAY_MIN + 1)) + AI_DELAY_MIN;
}

// 切换当前轮次
function opponentOf(color: StoneColor): StoneColor {
  return color === 'black' ? 'white' : 'black';
}

export const useWeiqiStore = create<WeiqiState>((set, get) => ({
  board: createEmptyBoard(),
  currentPlayer: HUMAN_COLOR,
  history: [],
  captures: { black: 0, white: 0 },
  koPoint: null,
  gameStatus: 'playing',
  winner: null,
  lastMove: null,
  passCount: 0,
  difficulty: 'medium',
  isAIThinking: false,
  score: null,

  placeStone: (col, row) => {
    const state = get();
    if (state.gameStatus !== 'playing') return;
    if (state.isAIThinking) return;
    if (state.currentPlayer !== HUMAN_COLOR) return;

    if (!isLegalMove(state.board, col, row, HUMAN_COLOR, state.koPoint)) return;

    const result = placeStoneRule(state.board, col, row, HUMAN_COLOR);
    if (result === null) return;

    const { board: newBoard, captured } = result;
    const newCaptures: Captures = {
      black: state.captures.black + captured.length, // 黑方提走的白子数
      white: state.captures.white,
    };
    const newKoPoint = detectKo(state.board, newBoard, col, row, captured);

    const historyEntry: HistoryEntry = {
      board: cloneBoard(state.board),
      currentPlayer: state.currentPlayer,
      captures: { ...state.captures },
      koPoint: state.koPoint,
      passCount: state.passCount,
      move: { col, row, color: HUMAN_COLOR, pass: false, captured },
    };

    set({
      board: newBoard,
      currentPlayer: AI_COLOR,
      captures: newCaptures,
      koPoint: newKoPoint,
      history: [...state.history, historyEntry],
      lastMove: { col, row, pass: false },
      passCount: 0,
    });

    // 触发 AI 走棋
    set({ isAIThinking: true });
    setTimeout(() => {
      get().aiMove();
    }, randomDelay());
  },

  pass: () => {
    const state = get();
    if (state.gameStatus !== 'playing') return;
    if (state.isAIThinking) return;
    if (state.currentPlayer !== HUMAN_COLOR) return;

    const newPassCount = state.passCount + 1;
    const historyEntry: HistoryEntry = {
      board: cloneBoard(state.board),
      currentPlayer: state.currentPlayer,
      captures: { ...state.captures },
      koPoint: state.koPoint,
      passCount: state.passCount,
      move: { col: -1, row: -1, color: HUMAN_COLOR, pass: true, captured: [] },
    };

    // 双方连续 pass：终局
    if (newPassCount >= 2) {
      const score = calculateScore(state.board, state.captures);
      const winner: Winner = score.black > score.white ? 'black' : score.white > score.black ? 'white' : null;
      set({
        history: [...state.history, historyEntry],
        lastMove: { col: -1, row: -1, pass: true },
        passCount: newPassCount,
        gameStatus: 'finished',
        winner,
        score,
      });
      return;
    }

    set({
      currentPlayer: AI_COLOR,
      history: [...state.history, historyEntry],
      lastMove: { col: -1, row: -1, pass: true },
      passCount: newPassCount,
      koPoint: null,
    });

    // AI 接着走
    set({ isAIThinking: true });
    setTimeout(() => {
      get().aiMove();
    }, randomDelay());
  },

  aiMove: () => {
    const state = get();
    if (state.gameStatus !== 'playing') {
      set({ isAIThinking: false });
      return;
    }
    if (state.currentPlayer !== AI_COLOR) {
      set({ isAIThinking: false });
      return;
    }

    const move = getAIMove(state.board, AI_COLOR, state.difficulty, state.koPoint);

    // AI 无合法点：自动 pass
    if (move === null) {
      const newPassCount = state.passCount + 1;
      const historyEntry: HistoryEntry = {
        board: cloneBoard(state.board),
        currentPlayer: state.currentPlayer,
        captures: { ...state.captures },
        koPoint: state.koPoint,
        passCount: state.passCount,
        move: { col: -1, row: -1, color: AI_COLOR, pass: true, captured: [] },
      };

      if (newPassCount >= 2) {
        const score = calculateScore(state.board, state.captures);
        const winner: Winner = score.black > score.white ? 'black' : score.white > score.black ? 'white' : null;
        set({
          history: [...state.history, historyEntry],
          lastMove: { col: -1, row: -1, pass: true },
          passCount: newPassCount,
          gameStatus: 'finished',
          winner,
          score,
          isAIThinking: false,
        });
        return;
      }

      set({
        currentPlayer: HUMAN_COLOR,
        history: [...state.history, historyEntry],
        lastMove: { col: -1, row: -1, pass: true },
        passCount: newPassCount,
        koPoint: null,
        isAIThinking: false,
      });
      return;
    }

    const result = placeStoneRule(state.board, move.col, move.row, AI_COLOR);
    if (result === null) {
      // 走不到合法点：fallback pass
      set({ isAIThinking: false });
      get().pass();
      return;
    }

    const { board: newBoard, captured } = result;
    const newCaptures: Captures = {
      black: state.captures.black,
      white: state.captures.white + captured.length, // 白方提走的黑子数
    };
    const newKoPoint = detectKo(state.board, newBoard, move.col, move.row, captured);

    const historyEntry: HistoryEntry = {
      board: cloneBoard(state.board),
      currentPlayer: state.currentPlayer,
      captures: { ...state.captures },
      koPoint: state.koPoint,
      passCount: state.passCount,
      move: { col: move.col, row: move.row, color: AI_COLOR, pass: false, captured },
    };

    set({
      board: newBoard,
      currentPlayer: HUMAN_COLOR,
      captures: newCaptures,
      koPoint: newKoPoint,
      history: [...state.history, historyEntry],
      lastMove: { col: move.col, row: move.row, pass: false },
      passCount: 0,
      isAIThinking: false,
    });
  },

  resetGame: () => {
    set({
      board: createEmptyBoard(),
      currentPlayer: HUMAN_COLOR,
      history: [],
      captures: { black: 0, white: 0 },
      koPoint: null,
      gameStatus: 'playing',
      winner: null,
      lastMove: null,
      passCount: 0,
      isAIThinking: false,
      score: null,
    });
  },

  undoMove: () => {
    const state = get();
    if (state.isAIThinking) return;
    if (state.history.length === 0) return;

    // 人机模式：若最后一手是 AI，悔两步（AI + 玩家）；否则悔一步
    let stepsToUndo = 1;
    if (
      state.history.length >= 2 &&
      state.history[state.history.length - 1].move.color === AI_COLOR &&
      !state.history[state.history.length - 1].move.pass
    ) {
      stepsToUndo = 2;
    } else if (
      state.history.length >= 1 &&
      state.history[state.history.length - 1].move.color === AI_COLOR &&
      state.history[state.history.length - 1].move.pass
    ) {
      // AI pass 也悔两步（避免玩家被卡在 AI pass 后无法恢复轮次）
      stepsToUndo = 1;
    }

    let newHistory = [...state.history];
    let entry: HistoryEntry | null = null;

    for (let i = 0; i < stepsToUndo; i++) {
      if (newHistory.length === 0) break;
      entry = newHistory[newHistory.length - 1];
      newHistory = newHistory.slice(0, -1);
    }

    if (entry === null) return;

    set({
      board: entry.board,
      currentPlayer: entry.currentPlayer,
      captures: entry.captures,
      koPoint: entry.koPoint,
      passCount: entry.passCount,
      history: newHistory,
      gameStatus: 'playing',
      winner: null,
      score: null,
      isAIThinking: false,
      lastMove: newHistory.length > 0
        ? {
            col: newHistory[newHistory.length - 1].move.col,
            row: newHistory[newHistory.length - 1].move.row,
            pass: newHistory[newHistory.length - 1].move.pass,
          }
        : null,
    });
  },

  resign: () => {
    const state = get();
    if (state.gameStatus !== 'playing') return;

    // 玩家认输 → AI 获胜
    const score = calculateScore(state.board, state.captures);
    set({
      gameStatus: 'finished',
      winner: AI_COLOR,
      score,
      isAIThinking: false,
    });
  },

  setDifficulty: (d) => {
    set({ difficulty: d });
  },
}));
