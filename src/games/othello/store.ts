// 黑白棋状态管理：使用 zustand
// 人机模式：玩家执黑（1），AI 执白（2）
// 联机模式：由 playerColor 决定执黑/执白，回合切换由 isMyTurn 控制

import { create } from 'zustand';
import {
  Board,
  Player,
  createInitialBoard,
  cloneBoard,
  isValidMove,
  makeMove,
  checkGameOver,
  hasAnyValidMove,
} from './rules';
import { getAIMove, Difficulty } from './ai';
import { othelloRoom, OthelloRoomMessage } from './room';

export type { Difficulty } from './ai';
export type { Player } from './rules';

export type OthelloGameStatus = 'playing' | 'won' | 'draw';
export type OthelloGameMode = 'pve' | 'online';
export type UndoRequestStatus = 'none' | 'sent' | 'received';

// 翻转位置
export type FlipPos = [number, number];

// 一手棋的记录：含翻转位置和落子后的棋盘快照，便于悔棋恢复
export interface MoveRecord {
  row: number;
  col: number;
  player: Player;
  flips: FlipPos[];
  boardSnapshot: Board;
}

// 联机状态
export interface OnlineState {
  connected: boolean;
  roomCode: string | null;
  opponentName: string | null;
  playerColor: Player | null;       // 本地玩家颜色：1 黑 / 2 白
  isMyTurn: boolean;
  undoRequestStatus: UndoRequestStatus;
}

interface OthelloState {
  board: Board;
  currentPlayer: Player;       // 当前轮到谁
  winner: Player | null;       // 胜者
  gameStatus: OthelloGameStatus;
  history: MoveRecord[];
  lastMove: { row: number; col: number } | null;
  lastFlips: FlipPos[];        // 上一手翻转的位置
  difficulty: Difficulty;
  isAIThinking: boolean;
  passNotice: string | null;   // 临时无棋可走提示
  gameMode: OthelloGameMode;
  onlineState: OnlineState;

  placeStone: (row: number, col: number) => void;
  aiMove: () => void;
  resetGame: () => void;
  undoMove: () => void;
  setDifficulty: (d: Difficulty) => void;
  setGameMode: (mode: OthelloGameMode) => void;

  // 联机相关
  startOnlineGame: (roomCode: string, playerName: string, opponentName: string, playerColor: Player) => void;
  applyOnlineMove: (row: number, col: number) => void;
  sendUndoRequest: () => void;
  acceptUndo: () => void;
  rejectUndo: () => void;
  leaveOnlineGame: () => void;
}

const AI_PLAYER: Player = 2;
const HUMAN_PLAYER: Player = 1;

// AI 思考延迟范围（毫秒）
const AI_DELAY_MIN = 400;
const AI_DELAY_MAX = 800;

function randomDelay(): number {
  return Math.floor(Math.random() * (AI_DELAY_MAX - AI_DELAY_MIN + 1)) + AI_DELAY_MIN;
}

// 对手颜色
function opponentOf(p: Player): Player {
  return p === 1 ? 2 : 1;
}

// 落子并推进游戏状态（玩家与 AI 共用）
// 处理：落子 → 翻转 → 胜负判定 → 下一方无棋可走则 pass → 双方都无棋则结束
function applyMove(
  history: MoveRecord[],
  board: Board,
  row: number,
  col: number,
  player: Player
) {
  const { newBoard, flips } = makeMove(board, row, col, player);
  const nextPlayer = opponentOf(player);

  const result = checkGameOver(newBoard);
  let gameStatus: OthelloGameStatus = 'playing';
  let winner: Player | null = null;
  let passNotice: string | null = null;
  let currentPlayer: Player = nextPlayer;

  if (result === 'black') {
    gameStatus = 'won';
    winner = 1;
  } else if (result === 'white') {
    gameStatus = 'won';
    winner = 2;
  } else if (result === 'draw') {
    gameStatus = 'draw';
  } else {
    // 下一方无棋可走 -> 自动 pass
    if (!hasAnyValidMove(newBoard, nextPlayer)) {
      const passer = nextPlayer === 1 ? '黑方' : '白方';
      passNotice = `${passer} 无棋可走，跳过回合`;
      if (hasAnyValidMove(newBoard, player)) {
        // 当前方还能继续走，轮次保持
        currentPlayer = player;
      } else {
        // 双方都无棋可走 -> 游戏结束
        const finalResult = checkGameOver(newBoard);
        if (finalResult === 'black') {
          gameStatus = 'won';
          winner = 1;
        } else if (finalResult === 'white') {
          gameStatus = 'won';
          winner = 2;
        } else if (finalResult === 'draw') {
          gameStatus = 'draw';
        }
      }
    }
  }

  return {
    board: newBoard,
    currentPlayer,
    winner,
    gameStatus,
    lastMove: { row, col } as { row: number; col: number },
    lastFlips: flips,
    history: [
      ...history,
      {
        row,
        col,
        player,
        flips,
        boardSnapshot: cloneBoard(newBoard),
      } as MoveRecord,
    ],
    passNotice,
  };
}

// 联机悔棋：回退 1 手，计算恢复后的状态
function computeOnlineUndo(
  history: MoveRecord[],
  playerColor: Player
): {
  board: Board;
  currentPlayer: Player;
  lastMove: { row: number; col: number } | null;
  lastFlips: FlipPos[];
  history: MoveRecord[];
  isMyTurn: boolean;
} | null {
  if (history.length === 0) return null;

  const newHistory = [...history];
  newHistory.pop();

  let board: Board;
  let lastMove: { row: number; col: number } | null;
  let lastFlips: FlipPos[];
  let currentPlayer: Player;

  if (newHistory.length === 0) {
    board = createInitialBoard();
    lastMove = null;
    lastFlips = [];
    currentPlayer = 1; // 黑先
  } else {
    const lastRecord = newHistory[newHistory.length - 1];
    board = cloneBoard(lastRecord.boardSnapshot);
    lastMove = { row: lastRecord.row, col: lastRecord.col };
    lastFlips = lastRecord.flips;
    // 当前轮到最后一手的对手
    currentPlayer = opponentOf(lastRecord.player);
  }

  return {
    board,
    currentPlayer,
    lastMove,
    lastFlips,
    history: newHistory,
    isMyTurn: currentPlayer === playerColor,
  };
}

const INITIAL_ONLINE_STATE: OnlineState = {
  connected: false,
  roomCode: null,
  opponentName: null,
  playerColor: null,
  isMyTurn: false,
  undoRequestStatus: 'none',
};

export const useOthelloStore = create<OthelloState>((set, get) => ({
  board: createInitialBoard(),
  currentPlayer: HUMAN_PLAYER,
  winner: null,
  gameStatus: 'playing',
  history: [],
  lastMove: null,
  lastFlips: [],
  difficulty: 'medium',
  isAIThinking: false,
  passNotice: null,
  gameMode: 'pve',
  onlineState: INITIAL_ONLINE_STATE,

  placeStone: (row, col) => {
    const state = get();
    if (state.gameStatus !== 'playing') return;
    if (state.isAIThinking) return;

    // 联机模式：走网络，不走 AI
    if (state.gameMode === 'online') {
      const myColor = state.onlineState.playerColor;
      if (!myColor) return;
      if (state.currentPlayer !== myColor) return; // 不是我的回合
      if (!isValidMove(state.board, row, col, myColor)) return;

      const updates = applyMove(state.history, state.board, row, col, myColor);
      set({
        board: updates.board,
        currentPlayer: updates.currentPlayer,
        winner: updates.winner,
        gameStatus: updates.gameStatus,
        history: updates.history,
        lastMove: updates.lastMove,
        lastFlips: updates.lastFlips,
        passNotice: updates.passNotice,
        onlineState: {
          ...state.onlineState,
          isMyTurn: updates.currentPlayer === myColor,
        },
      });

      // 发送给对手
      othelloRoom.sendMove(row, col);

      if (updates.passNotice) {
        setTimeout(() => set({ passNotice: null }), 1500);
      }
      return;
    }

    // 人机模式（原有逻辑）
    if (state.currentPlayer !== HUMAN_PLAYER) return;
    if (!isValidMove(state.board, row, col, HUMAN_PLAYER)) return;

    const updates = applyMove(state.history, state.board, row, col, HUMAN_PLAYER);
    set(updates);

    // passNotice 1.5s 后自动清除
    if (updates.passNotice) {
      setTimeout(() => set({ passNotice: null }), 1500);
    }

    // 游戏未结束且轮到 AI -> 触发 AI 走棋
    if (updates.gameStatus === 'playing' && updates.currentPlayer === AI_PLAYER) {
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
    const updates = applyMove(state.history, state.board, row, col, AI_PLAYER);
    set({ ...updates, isAIThinking: false });

    if (updates.passNotice) {
      setTimeout(() => set({ passNotice: null }), 1500);
    }

    // AI 走完后若仍轮到 AI（玩家被 pass），继续 AI 回合
    if (
      updates.gameStatus === 'playing' &&
      updates.currentPlayer === AI_PLAYER
    ) {
      set({ isAIThinking: true });
      setTimeout(() => {
        get().aiMove();
      }, randomDelay());
    }
  },

  resetGame: () => {
    set({
      board: createInitialBoard(),
      currentPlayer: HUMAN_PLAYER,
      winner: null,
      gameStatus: 'playing',
      history: [],
      lastMove: null,
      lastFlips: [],
      isAIThinking: false,
      passNotice: null,
    });
  },

  undoMove: () => {
    const state = get();
    if (state.isAIThinking) return;
    if (state.history.length === 0) return;

    // 人机模式：若最后一手是 AI 下的，悔两步（AI + 玩家）
    let stepsToUndo = 1;
    if (
      state.history.length >= 2 &&
      state.history[state.history.length - 1].player === AI_PLAYER
    ) {
      stepsToUndo = 2;
    }

    const newHistory = [...state.history];
    for (let i = 0; i < stepsToUndo; i++) {
      if (newHistory.length === 0) break;
      newHistory.pop();
    }

    // 从上一手快照恢复棋盘
    let board: Board;
    let lastMove: { row: number; col: number } | null;
    let lastFlips: FlipPos[];
    let currentPlayer: Player;

    if (newHistory.length === 0) {
      board = createInitialBoard();
      lastMove = null;
      lastFlips = [];
      currentPlayer = HUMAN_PLAYER;
    } else {
      const lastRecord = newHistory[newHistory.length - 1];
      board = cloneBoard(lastRecord.boardSnapshot);
      lastMove = { row: lastRecord.row, col: lastRecord.col };
      lastFlips = lastRecord.flips;
      // 当前轮到最后一手的对手
      currentPlayer = opponentOf(lastRecord.player);
    }

    set({
      board,
      currentPlayer,
      winner: null,
      gameStatus: 'playing',
      history: newHistory,
      lastMove,
      lastFlips,
      isAIThinking: false,
      passNotice: null,
    });
  },

  setDifficulty: (d) => {
    set({ difficulty: d });
  },

  setGameMode: (mode) => {
    set({ gameMode: mode });
  },

  // ============ 联机相关 ============

  startOnlineGame: (roomCode, playerName, opponentName, playerColor) => {
    // 注册消息回调：处理对手走法、悔棋、认输、离开等
    othelloRoom.onMessage((msg: OthelloRoomMessage) => {
      const state = get();
      if (state.gameMode !== 'online') return;

      switch (msg.type) {
        case 'move': {
          // 收到对手落子
          get().applyOnlineMove(msg.row, msg.col);
          break;
        }
        case 'resign': {
          // 对手认输，本地玩家获胜
          set({
            gameStatus: 'won',
            winner: playerColor,
            passNotice: '对手认输',
          });
          setTimeout(() => set({ passNotice: null }), 2000);
          break;
        }
        case 'leave': {
          // 对手离开
          set({
            onlineState: { ...state.onlineState, connected: false },
            passNotice: '对手已离开',
          });
          setTimeout(() => set({ passNotice: null }), 2000);
          break;
        }
        case 'undo_request': {
          // 对手请求悔棋，弹窗让玩家选择
          set({
            onlineState: { ...state.onlineState, undoRequestStatus: 'received' },
          });
          break;
        }
        case 'undo_accept': {
          // 对手同意悔棋，本地也回退 1 手
          const undo = computeOnlineUndo(state.history, playerColor);
          if (undo) {
            set({
              board: undo.board,
              currentPlayer: undo.currentPlayer,
              lastMove: undo.lastMove,
              lastFlips: undo.lastFlips,
              history: undo.history,
              winner: null,
              gameStatus: 'playing',
              passNotice: '对方同意悔棋',
              onlineState: {
                ...state.onlineState,
                isMyTurn: undo.isMyTurn,
                undoRequestStatus: 'none',
              },
            });
            setTimeout(() => set({ passNotice: null }), 1500);
          } else {
            set({
              onlineState: { ...state.onlineState, undoRequestStatus: 'none' },
            });
          }
          break;
        }
        case 'undo_reject': {
          // 对手拒绝悔棋
          set({
            onlineState: { ...state.onlineState, undoRequestStatus: 'none' },
            passNotice: '对方拒绝悔棋',
          });
          setTimeout(() => set({ passNotice: null }), 1500);
          break;
        }
        // heartbeat / join / join_ack 等忽略
      }
    });

    set({
      gameMode: 'online',
      board: createInitialBoard(),
      currentPlayer: 1, // 黑方先手
      winner: null,
      gameStatus: 'playing',
      history: [],
      lastMove: null,
      lastFlips: [],
      isAIThinking: false,
      passNotice: null,
      onlineState: {
        connected: true,
        roomCode,
        opponentName,
        playerColor,
        isMyTurn: playerColor === 1, // 黑方先手
        undoRequestStatus: 'none',
      },
    });
  },

  applyOnlineMove: (row, col) => {
    const state = get();
    if (state.gameMode !== 'online') return;
    if (state.gameStatus !== 'playing') return;

    const myColor = state.onlineState.playerColor;
    if (!myColor) return;
    const opponentColor = opponentOf(myColor);
    if (state.currentPlayer !== opponentColor) return;
    if (!isValidMove(state.board, row, col, opponentColor)) return;

    const updates = applyMove(state.history, state.board, row, col, opponentColor);
    set({
      board: updates.board,
      currentPlayer: updates.currentPlayer,
      winner: updates.winner,
      gameStatus: updates.gameStatus,
      history: updates.history,
      lastMove: updates.lastMove,
      lastFlips: updates.lastFlips,
      passNotice: updates.passNotice,
      onlineState: {
        ...state.onlineState,
        isMyTurn: updates.currentPlayer === myColor,
      },
    });

    if (updates.passNotice) {
      setTimeout(() => set({ passNotice: null }), 1500);
    }
  },

  sendUndoRequest: () => {
    const state = get();
    if (state.gameMode !== 'online') return;
    if (state.gameStatus !== 'playing') return;
    if (state.onlineState.undoRequestStatus !== 'none') return;

    othelloRoom.sendUndoRequest();
    set({
      onlineState: { ...state.onlineState, undoRequestStatus: 'sent' },
    });
  },

  acceptUndo: () => {
    const state = get();
    if (state.gameMode !== 'online') return;
    if (state.onlineState.undoRequestStatus !== 'received') return;

    othelloRoom.sendUndoAccept();
    const myColor = state.onlineState.playerColor;
    if (!myColor) {
      set({
        onlineState: { ...state.onlineState, undoRequestStatus: 'none' },
      });
      return;
    }
    const undo = computeOnlineUndo(state.history, myColor);
    if (undo) {
      set({
        board: undo.board,
        currentPlayer: undo.currentPlayer,
        lastMove: undo.lastMove,
        lastFlips: undo.lastFlips,
        history: undo.history,
        winner: null,
        gameStatus: 'playing',
        passNotice: null,
        onlineState: {
          ...state.onlineState,
          isMyTurn: undo.isMyTurn,
          undoRequestStatus: 'none',
        },
      });
    } else {
      set({
        onlineState: { ...state.onlineState, undoRequestStatus: 'none' },
      });
    }
  },

  rejectUndo: () => {
    const state = get();
    if (state.gameMode !== 'online') return;
    if (state.onlineState.undoRequestStatus !== 'received') return;

    othelloRoom.sendUndoReject();
    set({
      onlineState: { ...state.onlineState, undoRequestStatus: 'none' },
    });
  },

  leaveOnlineGame: () => {
    othelloRoom.leaveRoom();
    set({
      gameMode: 'pve',
      board: createInitialBoard(),
      currentPlayer: HUMAN_PLAYER,
      winner: null,
      gameStatus: 'playing',
      history: [],
      lastMove: null,
      lastFlips: [],
      isAIThinking: false,
      passNotice: null,
      onlineState: { ...INITIAL_ONLINE_STATE },
    });
  },
}));
