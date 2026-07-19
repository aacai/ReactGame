// 四子棋状态管理：使用 zustand
// 人机模式：玩家执红（1），AI 执黄（2）
// 联机模式：玩家颜色由房间分配，回合由 isMyTurn 控制

import { create } from 'zustand';
import {
  Board,
  Player,
  createEmptyBoard,
  cloneBoard,
  isValidMove,
  makeMove,
  checkWin,
  getWinningLine,
  isBoardFull,
} from './rules';
import { getAIMove, Difficulty } from './ai';
import { room, RoomMessage } from './room';

export type { Difficulty } from './ai';
export type { Player } from './rules';

export type Connect4GameStatus = 'playing' | 'won' | 'draw';

// 联机模式下的悔棋请求状态
export type UndoRequestStatus = 'none' | 'sent' | 'received';

// 联机状态：聚合所有联机对局相关信息
export interface OnlineState {
  connected: boolean; // 对手是否在线
  roomCode: string;
  opponentName: string;
  playerColor: Player; // 我的颜色
  isMyTurn: boolean;
  undoRequestStatus: UndoRequestStatus;
}

// 一手棋的记录：boardSnapshot 为落子后的棋盘快照，用于悔棋恢复
export interface MoveRecord {
  col: number;
  row: number;
  player: Player;
  boardSnapshot: Board;
}

interface Connect4State {
  board: Board;
  currentPlayer: Player;       // 当前轮到谁（联机模式下与 isMyTurn 同步）
  gameStatus: Connect4GameStatus;
  winner: Player | null;
  history: MoveRecord[];
  lastMove: { row: number; col: number } | null;
  winningLine: Array<{ row: number; col: number }>;
  difficulty: Difficulty;
  isAIThinking: boolean;

  // 游戏模式：人机 / 联机
  gameMode: 'pve' | 'online';
  onlineState: OnlineState;

  // 玩家下子（指定列）；人机模式触发 AI，联机模式走网络
  dropPiece: (col: number) => void;
  // AI 走棋（仅人机模式）
  aiMove: () => void;
  // 重新开始（人机模式重置棋盘）
  resetGame: () => void;
  // 悔棋（人机模式默认悔两步：玩家 + AI）
  undoMove: () => void;
  // 设置难度
  setDifficulty: (d: Difficulty) => void;

  // === 联机 actions ===
  // 进入联机对战：设置房间信息并注册消息回调
  startOnlineGame: (
    roomCode: string,
    playerName: string,
    opponentName: string,
    playerColor: Player
  ) => void;
  // 接收对方走法（col 为对方落子列）
  applyOnlineMove: (col: number) => void;
  // 请求悔棋
  sendUndoRequest: () => void;
  // 同意对方的悔棋请求
  acceptUndo: () => void;
  // 拒绝对方的悔棋请求
  rejectUndo: () => void;
  // 离开联机对局，清理房间
  leaveOnlineGame: () => void;
  // 联机悔棋实际执行：回退最后一手（内部使用，由 accept / undo_accept 消息触发）
  applyOnlineUndo: () => void;
}

// AI 颜色：黄棋
const AI_PLAYER: Player = 2;
// 玩家颜色：红棋
const HUMAN_PLAYER: Player = 1;

// AI 思考延迟范围（毫秒）
const AI_DELAY_MIN = 400;
const AI_DELAY_MAX = 800;

function randomDelay(): number {
  return Math.floor(Math.random() * (AI_DELAY_MAX - AI_DELAY_MIN + 1)) + AI_DELAY_MIN;
}

// 默认（人机模式）的联机状态占位，避免 null 检查
const DEFAULT_ONLINE_STATE: OnlineState = {
  connected: false,
  roomCode: '',
  opponentName: '',
  playerColor: HUMAN_PLAYER,
  isMyTurn: false,
  undoRequestStatus: 'none',
};

export const useConnect4Store = create<Connect4State>((set, get) => ({
  board: createEmptyBoard(),
  currentPlayer: HUMAN_PLAYER,
  gameStatus: 'playing',
  winner: null,
  history: [],
  lastMove: null,
  winningLine: [],
  difficulty: 'medium',
  isAIThinking: false,
  gameMode: 'pve',
  onlineState: DEFAULT_ONLINE_STATE,

  dropPiece: (col) => {
    const state = get();
    if (state.gameStatus !== 'playing') return;
    if (state.isAIThinking) return;
    if (!isValidMove(state.board, col)) return;

    // === 联机模式：走网络，不走 AI ===
    if (state.gameMode === 'online') {
      // 仅当轮到我时可下子
      if (!state.onlineState.isMyTurn) return;
      const player = state.onlineState.playerColor;
      const { newBoard, row } = makeMove(state.board, col, player);

      const won = checkWin(newBoard, row, col);
      const full = isBoardFull(newBoard);
      const newStatus: Connect4GameStatus = won ? 'won' : full ? 'draw' : 'playing';
      const newWinner: Player | null = won ? player : null;
      const newWinningLine = won ? getWinningLine(newBoard, row, col) : [];
      const opponentColor: Player = player === 1 ? 2 : 1;

      set({
        board: newBoard,
        currentPlayer: opponentColor,
        winner: newWinner,
        gameStatus: newStatus,
        history: [
          ...state.history,
          { col, row, player, boardSnapshot: cloneBoard(newBoard) },
        ],
        lastMove: { row, col },
        winningLine: newWinningLine,
        onlineState: {
          ...state.onlineState,
          isMyTurn: false,
        },
      });

      // 发送给对手
      room.sendMove(col);
      return;
    }

    // === 人机模式：原有逻辑 ===
    if (state.currentPlayer !== HUMAN_PLAYER) return;

    const player = state.currentPlayer;
    const { newBoard, row } = makeMove(state.board, col, player);
    // row 必然非 -1（isValidMove 已校验）

    const won = checkWin(newBoard, row, col);
    const full = isBoardFull(newBoard);
    const newStatus: Connect4GameStatus = won ? 'won' : full ? 'draw' : 'playing';
    const newWinner: Player | null = won ? player : null;
    const newWinningLine = won ? getWinningLine(newBoard, row, col) : [];
    const nextPlayer: Player = player === 1 ? 2 : 1;

    set({
      board: newBoard,
      currentPlayer: nextPlayer,
      winner: newWinner,
      gameStatus: newStatus,
      history: [
        ...state.history,
        { col, row, player, boardSnapshot: cloneBoard(newBoard) },
      ],
      lastMove: { row, col },
      winningLine: newWinningLine,
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

    const col = getAIMove(state.board, AI_PLAYER, state.difficulty);
    if (col === null) {
      set({ isAIThinking: false });
      return;
    }

    const { newBoard, row } = makeMove(state.board, col, AI_PLAYER);
    const won = checkWin(newBoard, row, col);
    const full = isBoardFull(newBoard);
    const newStatus: Connect4GameStatus = won ? 'won' : full ? 'draw' : 'playing';
    const newWinner: Player | null = won ? AI_PLAYER : null;
    const newWinningLine = won ? getWinningLine(newBoard, row, col) : [];

    set({
      board: newBoard,
      currentPlayer: HUMAN_PLAYER,
      winner: newWinner,
      gameStatus: newStatus,
      history: [
        ...state.history,
        { col, row, player: AI_PLAYER, boardSnapshot: cloneBoard(newBoard) },
      ],
      lastMove: { row, col },
      winningLine: newWinningLine,
      isAIThinking: false,
    });
  },

  resetGame: () => {
    const state = get();
    // 联机模式下不直接重置（需通过离开房间重新开始）
    if (state.gameMode === 'online') return;
    set({
      board: createEmptyBoard(),
      currentPlayer: HUMAN_PLAYER,
      winner: null,
      gameStatus: 'playing',
      history: [],
      lastMove: null,
      winningLine: [],
      isAIThinking: false,
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

    // 恢复棋盘到剩余记录中最后一手的快照；无记录则空棋盘
    let newBoard: Board;
    let nextPlayer: Player;
    let newLastMove: { row: number; col: number } | null;

    if (newHistory.length > 0) {
      const lastRec = newHistory[newHistory.length - 1];
      newBoard = cloneBoard(lastRec.boardSnapshot);
      nextPlayer = lastRec.player === 1 ? 2 : 1;
      newLastMove = { row: lastRec.row, col: lastRec.col };
    } else {
      newBoard = createEmptyBoard();
      nextPlayer = HUMAN_PLAYER;
      newLastMove = null;
    }

    set({
      board: newBoard,
      currentPlayer: nextPlayer,
      winner: null,
      gameStatus: 'playing',
      history: newHistory,
      lastMove: newLastMove,
      winningLine: [],
      isAIThinking: false,
    });
  },

  setDifficulty: (d) => {
    set({ difficulty: d });
  },

  // === 联机 actions ===
  startOnlineGame: (roomCode, _playerName, opponentName, playerColor) => {
    // 注册消息回调：分发对手的走法 / 悔棋 / 认输等消息
    room.onMessage = (msg: RoomMessage) => {
      switch (msg.type) {
        case 'move':
          get().applyOnlineMove(msg.col);
          break;
        case 'undo_request':
          // 收到对方请求，弹窗让玩家选择
          set({
            onlineState: { ...get().onlineState, undoRequestStatus: 'received' },
          });
          break;
        case 'undo_accept':
          // 对方同意，执行悔棋
          get().applyOnlineUndo();
          set({
            onlineState: { ...get().onlineState, undoRequestStatus: 'none' },
          });
          break;
        case 'undo_reject':
          set({
            onlineState: { ...get().onlineState, undoRequestStatus: 'none' },
          });
          break;
        case 'resign': {
          // 对手认输：我方获胜
          const winner: Player = get().onlineState.playerColor;
          set({
            gameStatus: 'won',
            winner,
            winningLine: [],
          });
          break;
        }
        default:
          break;
      }
    };

    // 对手掉线处理
    room.onOpponentLeave = () => {
      set({
        onlineState: { ...get().onlineState, connected: false },
      });
    };

    // 重置棋盘并进入联机模式
    // 红方（1）先手：若我是红方则 isMyTurn = true
    set({
      gameMode: 'online',
      board: createEmptyBoard(),
      currentPlayer: playerColor,
      gameStatus: 'playing',
      winner: null,
      history: [],
      lastMove: null,
      winningLine: [],
      isAIThinking: false,
      onlineState: {
        connected: true,
        roomCode,
        opponentName,
        playerColor,
        isMyTurn: playerColor === 1,
        undoRequestStatus: 'none',
      },
    });
  },

  applyOnlineMove: (col) => {
    const state = get();
    if (state.gameMode !== 'online') return;
    if (state.gameStatus !== 'playing') return;
    if (!isValidMove(state.board, col)) return;

    // 对手颜色与我的颜色相反
    const opponentColor: Player = state.onlineState.playerColor === 1 ? 2 : 1;
    const { newBoard, row } = makeMove(state.board, col, opponentColor);

    const won = checkWin(newBoard, row, col);
    const full = isBoardFull(newBoard);
    const newStatus: Connect4GameStatus = won ? 'won' : full ? 'draw' : 'playing';
    const newWinner: Player | null = won ? opponentColor : null;
    const newWinningLine = won ? getWinningLine(newBoard, row, col) : [];

    set({
      board: newBoard,
      currentPlayer: state.onlineState.playerColor, // 轮到我了
      winner: newWinner,
      gameStatus: newStatus,
      history: [
        ...state.history,
        { col, row, player: opponentColor, boardSnapshot: cloneBoard(newBoard) },
      ],
      lastMove: { row, col },
      winningLine: newWinningLine,
      onlineState: {
        ...state.onlineState,
        isMyTurn: newStatus === 'playing', // 游戏结束则不再轮到我
      },
    });
  },

  sendUndoRequest: () => {
    const state = get();
    if (state.gameMode !== 'online') return;
    if (state.gameStatus !== 'playing') return;
    if (state.onlineState.undoRequestStatus !== 'none') return;
    // 仅当轮到我时（对手刚走完）才可请求悔棋
    if (!state.onlineState.isMyTurn) return;
    // 至少需要 2 手历史（我的上一手 + 对手的回应）才能悔棋
    if (state.history.length < 2) return;

    room.sendUndoRequest();
    set({
      onlineState: { ...state.onlineState, undoRequestStatus: 'sent' },
    });
  },

  acceptUndo: () => {
    const state = get();
    if (state.gameMode !== 'online') return;
    if (state.onlineState.undoRequestStatus !== 'received') return;

    room.sendUndoAccept();
    // 同意方也执行一次悔棋（回退最后一手）
    get().applyOnlineUndo();
    set({
      onlineState: { ...get().onlineState, undoRequestStatus: 'none' },
    });
  },

  rejectUndo: () => {
    const state = get();
    if (state.gameMode !== 'online') return;
    if (state.onlineState.undoRequestStatus !== 'received') return;

    room.sendUndoReject();
    set({
      onlineState: { ...state.onlineState, undoRequestStatus: 'none' },
    });
  },

  leaveOnlineGame: () => {
    // 清理房间回调与连接
    room.onMessage = null;
    room.onOpponentJoin = null;
    room.onOpponentLeave = null;
    room.leaveRoom();

    // 回到人机模式初始状态
    set({
      gameMode: 'pve',
      board: createEmptyBoard(),
      currentPlayer: HUMAN_PLAYER,
      gameStatus: 'playing',
      winner: null,
      history: [],
      lastMove: null,
      winningLine: [],
      isAIThinking: false,
      onlineState: { ...DEFAULT_ONLINE_STATE },
    });
  },

  // 联机悔棋实际执行：回退最后 2 手（对手的回应 + 我的上一手）
  // 调用方负责后续状态清理（如 undoRequestStatus）
  // 注：sendUndoRequest 已保证 history.length >= 2，此处用 min 守护避免越界
  applyOnlineUndo: () => {
    const state = get();
    if (state.history.length === 0) return;

    // 回退 2 手：请求方走完最后一手的前一手，对手回应后轮到请求方；
    // pop 2 后请求方重新获得落子权，双方各 pop 本地副本以保持同步
    const stepsToUndo = Math.min(2, state.history.length);
    const newHistory = [...state.history];
    for (let i = 0; i < stepsToUndo; i++) {
      newHistory.pop();
    }

    let newBoard: Board;
    let newLastMove: { row: number; col: number } | null;
    let nextPlayer: Player;

    if (newHistory.length > 0) {
      const lastRec = newHistory[newHistory.length - 1];
      newBoard = cloneBoard(lastRec.boardSnapshot);
      nextPlayer = lastRec.player === 1 ? 2 : 1;
      newLastMove = { row: lastRec.row, col: lastRec.col };
    } else {
      newBoard = createEmptyBoard();
      nextPlayer = HUMAN_PLAYER;
      newLastMove = null;
    }

    set({
      board: newBoard,
      currentPlayer: nextPlayer,
      winner: null,
      gameStatus: 'playing',
      history: newHistory,
      lastMove: newLastMove,
      winningLine: [],
      onlineState: {
        ...get().onlineState,
        isMyTurn: nextPlayer === get().onlineState.playerColor,
      },
    });
  },
}));
