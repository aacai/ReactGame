// 国际象棋游戏状态管理
// 人机模式：玩家执白棋（白方在下），AI 执黑棋
// 处理：选择棋子、走棋（含升变）、AI 走棋、悔棋、重置
// 状态：棋子、当前玩家、游戏状态、历史、过路兵目标、易位权利、选中棋子、合法走法、AI 思考中

import { create } from 'zustand';
import type { Piece, PieceColor, PieceType, Position, CastlingRights, MoveHistory } from './types';
import {
  createInitialBoard,
  clonePieces,
  getValidMoves,
  getPieceAt,
  isInCheck,
  isCheckmate,
  isStalemate,
  isPromotionMove,
  isEnPassantCapture,
  isCastlingMove,
  getEnPassantTargetAfterMove,
  INITIAL_CASTLING_RIGHTS,
} from './rules';
import { getAIMove, type Difficulty } from './ai';
export type { Difficulty } from './ai';
// 复用中国象棋的音效模块（音效与游戏无关，可通用）
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playWinSound,
  playLoseSound,
  playClickSound,
  setSoundEnabled,
} from '../../game/sound';

export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'resigned' | 'draw';

interface ChessState {
  pieces: Piece[];
  currentPlayer: PieceColor;
  selectedPieceId: string | null;
  validMoves: Position[];
  history: MoveHistory[];
  enPassantTarget: Position | null;
  castlingRights: CastlingRights;
  winner: PieceColor | null;
  gameStatus: GameStatus;
  inCheck: boolean;
  difficulty: Difficulty;
  playerColor: PieceColor;
  isAIThinking: boolean;
  // 待升变：当玩家走兵到底线时，先记录走法，等用户选择升变类型后再完成
  pendingPromotion: { from: Position; to: Position } | null;
  // 上次走棋（用于高亮显示）
  lastMove: { from: Position; to: Position } | null;
  soundEnabled: boolean;
  // actions
  selectPiece: (id: string | null) => void;
  movePiece: (toCol: number, toRow: number) => void;
  // 完成升变：玩家选择升变类型后调用
  completePromotion: (promotionType: PieceType) => void;
  aiMove: () => void;
  undoMove: () => void;
  resetGame: () => void;
  resign: () => void;
  setDifficulty: (level: Difficulty) => void;
  setPlayerColor: (color: PieceColor) => void;
  startGame: () => void;
  backToMenu: () => void;
  toggleSound: () => void;
}

// AI 执黑棋
const AI_COLOR: PieceColor = 'black';

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDelayRange(difficulty: Difficulty): { min: number; max: number } {
  switch (difficulty) {
    case 'easy':
      return { min: 300, max: 500 };
    case 'medium':
      return { min: 500, max: 800 };
    case 'hard':
      return { min: 700, max: 1500 };
  }
}

// 计算走棋后的易位权利
// 注意：piece 参数只用于获取 type/color，原始位置由 fromCol/fromRow 提供
// （因为调用时 piece.col/row 可能已更新为新位置）
function getCastlingRightsAfterMove(
  piece: Piece,
  fromCol: number,
  fromRow: number,
  castlingRights: CastlingRights
): CastlingRights {
  const rights: CastlingRights = { ...castlingRights };
  if (piece.type === 'king') {
    // 王一旦移动，失去双方易位权利
    if (piece.color === 'white') {
      rights.whiteKingSide = false;
      rights.whiteQueenSide = false;
    } else {
      rights.blackKingSide = false;
      rights.blackQueenSide = false;
    }
  } else if (piece.type === 'rook') {
    const homeRow = piece.color === 'white' ? 7 : 0;
    // 只有车从其原始位置离开才会失去对应方向的易位权利
    if (fromRow === homeRow) {
      if (fromCol === 0) {
        if (piece.color === 'white') rights.whiteQueenSide = false;
        else rights.blackQueenSide = false;
      } else if (fromCol === 7) {
        if (piece.color === 'white') rights.whiteKingSide = false;
        else rights.blackKingSide = false;
      }
    }
  }
  return rights;
}

// 处理被吃车对易位权利的影响
function updateCastlingRightsForCapture(
  rights: CastlingRights,
  capturedPiece: Piece
): CastlingRights {
  const newRights = { ...rights };
  if (capturedPiece.type === 'rook') {
    const homeRow = capturedPiece.color === 'white' ? 7 : 0;
    if (capturedPiece.row === homeRow) {
      if (capturedPiece.col === 0) {
        if (capturedPiece.color === 'white') newRights.whiteQueenSide = false;
        else newRights.blackQueenSide = false;
      } else if (capturedPiece.col === 7) {
        if (capturedPiece.color === 'white') newRights.whiteKingSide = false;
        else newRights.blackKingSide = false;
      }
    }
  }
  return newRights;
}

// 执行实际走棋（不处理升变选择，AI 自动升变为后）
function executeMove(
  state: ChessState,
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
  promotionType?: PieceType
): {
  pieces: Piece[];
  nextPlayer: PieceColor;
  newStatus: GameStatus;
  newWinner: PieceColor | null;
  newInCheck: boolean;
  newEnPassant: Position | null;
  newCastlingRights: CastlingRights;
  newHistory: MoveHistory[];
  capturedPiece?: Piece;
  isCastling: boolean;
  isEnPassant: boolean;
  promotedTo?: PieceType;
} {
  const { pieces, currentPlayer, enPassantTarget, castlingRights, history } = state;

  const newPieces = clonePieces(pieces);
  const movingPiece = newPieces.find((p) => p.col === fromCol && p.row === fromRow);
  if (!movingPiece) {
    return {
      pieces,
      nextPlayer: currentPlayer,
      newStatus: 'playing',
      newWinner: null,
      newInCheck: false,
      newEnPassant: enPassantTarget,
      newCastlingRights: castlingRights,
      newHistory: history,
      isCastling: false,
      isEnPassant: false,
    };
  }

  // 检测过路兵吃子
  const enPassant = isEnPassantCapture(movingPiece, fromCol, toCol, toRow, enPassantTarget);
  // 检测王车易位
  const castling = isCastlingMove(movingPiece, fromCol, toCol);

  let capturedPiece: Piece | undefined;
  if (enPassant) {
    // 过路兵：被吃的兵位于走棋者同列、走棋前的行
    const capturedPawnRow = fromRow;
    const capturedIdx = newPieces.findIndex((p) => p.col === toCol && p.row === capturedPawnRow);
    if (capturedIdx !== -1) {
      capturedPiece = { ...newPieces[capturedIdx] };
      newPieces.splice(capturedIdx, 1);
    }
  } else {
    // 普通吃子
    const targetIdx = newPieces.findIndex((p) => p.col === toCol && p.row === toRow);
    if (targetIdx !== -1) {
      capturedPiece = { ...newPieces[targetIdx] };
      newPieces.splice(targetIdx, 1);
    }
  }

  // 移动棋子
  movingPiece.col = toCol;
  movingPiece.row = toRow;
  movingPiece.hasMoved = true;

  // 王车易位：王走两格，需同步移动车
  if (castling) {
    const homeRow = movingPiece.row;
    if (toCol === 6) {
      // 短易位：车 col 7 -> 5
      const rook = newPieces.find((p) => p.col === 7 && p.row === homeRow);
      if (rook) {
        rook.col = 5;
        rook.hasMoved = true;
      }
    } else if (toCol === 2) {
      // 长易位：车 col 0 -> 3
      const rook = newPieces.find((p) => p.col === 0 && p.row === homeRow);
      if (rook) {
        rook.col = 3;
        rook.hasMoved = true;
      }
    }
  }

  // 升变：若指定了升变类型则应用，否则检测是否需要升变
  let promotedTo: PieceType | undefined;
  if (movingPiece.type === 'pawn' && isPromotionMove(movingPiece, toRow)) {
    if (promotionType) {
      movingPiece.type = promotionType;
      promotedTo = promotionType;
    } else {
      // AI 默认升变为后
      movingPiece.type = 'queen';
      promotedTo = 'queen';
    }
  }

  // 更新易位权利（使用原始位置 fromCol/fromRow 判断）
  let newCastlingRights = getCastlingRightsAfterMove(movingPiece, fromCol, fromRow, castlingRights);
  if (capturedPiece) {
    newCastlingRights = updateCastlingRightsForCapture(newCastlingRights, capturedPiece);
  }

  // 更新过路兵目标
  const newEnPassant = getEnPassantTargetAfterMove(movingPiece, fromRow, toRow);

  // 切换玩家
  const nextPlayer: PieceColor = currentPlayer === 'white' ? 'black' : 'white';
  const newInCheck = isInCheck(newPieces, nextPlayer);
  const newCheckmate = isCheckmate(newPieces, nextPlayer, newEnPassant, newCastlingRights);
  const newStalemate = isStalemate(newPieces, nextPlayer, newEnPassant, newCastlingRights);

  let newStatus: GameStatus = 'playing';
  let newWinner: PieceColor | null = null;
  if (newCheckmate) {
    newStatus = 'checkmate';
    newWinner = currentPlayer;
  } else if (newStalemate) {
    newStatus = 'stalemate';
  }

  // 构造历史记录
  const historyEntry: MoveHistory = {
    from: { col: fromCol, row: fromRow },
    to: { col: toCol, row: toRow },
    piece: { ...movingPiece, col: fromCol, row: fromRow, type: promotionType ? 'pawn' : movingPiece.type },
    captured: capturedPiece,
    currentPlayerBefore: currentPlayer,
    promotion: promotedTo,
    isCastling: castling,
    isEnPassant: enPassant,
  };

  return {
    pieces: newPieces,
    nextPlayer,
    newStatus,
    newWinner,
    newInCheck,
    newEnPassant,
    newCastlingRights,
    newHistory: [...history, historyEntry],
    capturedPiece,
    isCastling: castling,
    isEnPassant: enPassant,
    promotedTo,
  };
}

export const useChessStore = create<ChessState>((set, get) => ({
  pieces: createInitialBoard(),
  currentPlayer: 'white',
  selectedPieceId: null,
  validMoves: [],
  history: [],
  enPassantTarget: null,
  castlingRights: { ...INITIAL_CASTLING_RIGHTS },
  winner: null,
  gameStatus: 'playing',
  inCheck: false,
  difficulty: 'medium',
  playerColor: 'white',
  isAIThinking: false,
  pendingPromotion: null,
  lastMove: null,
  soundEnabled: true,

  selectPiece: (id) => {
    const { pieces, currentPlayer, gameStatus, isAIThinking, enPassantTarget, castlingRights, playerColor } = get();

    if (gameStatus !== 'playing') {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    // PvE 模式下，AI 回合玩家不能选子
    if (currentPlayer === AI_COLOR) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    if (isAIThinking) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    // 玩家只能选自己的棋子（白方）
    void playerColor;

    if (id === null) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    const piece = pieces.find((p) => p.id === id);
    if (!piece || piece.color !== currentPlayer) {
      set({ selectedPieceId: null, validMoves: [] });
      return;
    }

    const moves = getValidMoves(pieces, piece.col, piece.row, enPassantTarget, castlingRights);
    set({ selectedPieceId: id, validMoves: moves });
  },

  movePiece: (toCol, toRow) => {
    const {
      pieces, currentPlayer, selectedPieceId, validMoves, enPassantTarget, castlingRights,
      gameStatus, difficulty,
    } = get();

    if (gameStatus !== 'playing') return;
    if (!selectedPieceId) return;
    const isValid = validMoves.some((m) => m.col === toCol && m.row === toRow);
    if (!isValid) return;

    const selectedPiece = pieces.find((p) => p.id === selectedPieceId);
    if (!selectedPiece) return;

    const fromCol = selectedPiece.col;
    const fromRow = selectedPiece.row;

    // 检测是否为升变走棋：兵走到底线
    if (isPromotionMove(selectedPiece, toRow)) {
      // 暂存待升变的走法，等用户选择升变类型
      set({
        pendingPromotion: { from: { col: fromCol, row: fromRow }, to: { col: toCol, row: toRow } },
        selectedPieceId: null,
        validMoves: [],
      });
      return;
    }

    // 执行走棋
    const result = executeMove(get(), fromCol, fromRow, toCol, toRow);

    set({
      pieces: result.pieces,
      currentPlayer: result.nextPlayer,
      selectedPieceId: null,
      validMoves: [],
      history: result.newHistory,
      enPassantTarget: result.newEnPassant,
      castlingRights: result.newCastlingRights,
      winner: result.newWinner,
      gameStatus: result.newStatus,
      inCheck: result.newInCheck,
      lastMove: { from: { col: fromCol, row: fromRow }, to: { col: toCol, row: toRow } },
      pendingPromotion: null,
    });

    // 播放音效
    if (result.capturedPiece) {
      playCaptureSound();
    } else {
      playMoveSound();
    }

    if (result.newStatus === 'checkmate') {
      setTimeout(() => playWinSound(), 300);
    } else if (result.newInCheck) {
      setTimeout(() => playCheckSound(), 100);
    }

    // 触发 AI 走棋
    if (result.newStatus === 'playing' && result.nextPlayer === AI_COLOR) {
      const { min, max } = getDelayRange(difficulty);
      const delay = randomDelay(min, max);
      set({ isAIThinking: true });
      setTimeout(() => {
        get().aiMove();
      }, delay);
    }
  },

  completePromotion: (promotionType) => {
    const { pendingPromotion, gameStatus, difficulty } = get();
    if (!pendingPromotion || gameStatus !== 'playing') return;

    const result = executeMove(get(), pendingPromotion.from.col, pendingPromotion.from.row, pendingPromotion.to.col, pendingPromotion.to.row, promotionType);

    set({
      pieces: result.pieces,
      currentPlayer: result.nextPlayer,
      selectedPieceId: null,
      validMoves: [],
      history: result.newHistory,
      enPassantTarget: result.newEnPassant,
      castlingRights: result.newCastlingRights,
      winner: result.newWinner,
      gameStatus: result.newStatus,
      inCheck: result.newInCheck,
      lastMove: { from: pendingPromotion.from, to: pendingPromotion.to },
      pendingPromotion: null,
    });

    if (result.capturedPiece) {
      playCaptureSound();
    } else {
      playMoveSound();
    }

    if (result.newStatus === 'checkmate') {
      setTimeout(() => playWinSound(), 300);
    } else if (result.newInCheck) {
      setTimeout(() => playCheckSound(), 100);
    }

    // 触发 AI 走棋
    if (result.newStatus === 'playing' && result.nextPlayer === AI_COLOR) {
      const { min, max } = getDelayRange(difficulty);
      const delay = randomDelay(min, max);
      set({ isAIThinking: true });
      setTimeout(() => {
        get().aiMove();
      }, delay);
    }
  },

  aiMove: () => {
    const { pieces, difficulty, gameStatus, currentPlayer, enPassantTarget, castlingRights } = get();

    if (gameStatus !== 'playing') {
      set({ isAIThinking: false });
      return;
    }

    if (currentPlayer !== AI_COLOR) {
      set({ isAIThinking: false });
      return;
    }

    const move = getAIMove(pieces, AI_COLOR, difficulty, enPassantTarget, castlingRights);
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

    // 执行 AI 走棋（自动升变为后）
    const result = executeMove(get(), from.col, from.row, to.col, to.row);

    set({
      pieces: result.pieces,
      currentPlayer: result.nextPlayer,
      selectedPieceId: null,
      validMoves: [],
      history: result.newHistory,
      enPassantTarget: result.newEnPassant,
      castlingRights: result.newCastlingRights,
      winner: result.newWinner,
      gameStatus: result.newStatus,
      inCheck: result.newInCheck,
      lastMove: { from, to },
      isAIThinking: false,
    });

    if (result.capturedPiece) {
      playCaptureSound();
    } else {
      playMoveSound();
    }

    if (result.newStatus === 'checkmate') {
      // AI 胜利，玩家失败音效
      setTimeout(() => playLoseSound(), 300);
    } else if (result.newInCheck) {
      setTimeout(() => playCheckSound(), 100);
    }
  },

  undoMove: () => {
    const { history, pieces, gameStatus } = get();
    if (history.length === 0) return;
    if (gameStatus !== 'playing') return;

    // PvE 模式下悔棋撤销两步（AI + 玩家）
    // 但若最后一步是 AI 走的，则只撤一步
    // 若最后一步是玩家走的（极端情况，比如刚开始就悔棋），也只撤一步
    let stepsToUndo = 1;
    const lastMove = history[history.length - 1];
    if (lastMove.currentPlayerBefore === AI_COLOR) {
      // AI 走的最后一步，撤一步
      stepsToUndo = 1;
    } else if (history.length >= 2) {
      // 玩家走后 AI 走了，撤两步
      stepsToUndo = 2;
    }

    let newPieces = clonePieces(pieces);
    let newHistory = [...history];
    let newEnPassantTarget: Position | null = null;
    let newCastlingRights: CastlingRights = { ...INITIAL_CASTLING_RIGHTS };
    let currentPlayer: PieceColor = 'white';
    let newLastMove: { from: Position; to: Position } | null = null;

    // 简化方案：从初始棋盘重放到撤销点
    // 因为过路兵目标、易位权利的还原较复杂，从初始状态重建是最可靠的方式
    const replayHistory = history.slice(0, history.length - stepsToUndo);
    newPieces = createInitialBoard();
    newCastlingRights = { ...INITIAL_CASTLING_RIGHTS };
    newEnPassantTarget = null;
    currentPlayer = 'white';

    for (const entry of replayHistory) {
      const movingPiece = newPieces.find((p) => p.col === entry.from.col && p.row === entry.from.row);
      if (!movingPiece) continue;

      // 检测过路兵吃子
      const enPassant = entry.isEnPassant || false;
      // 检测王车易位
      const castling = entry.isCastling || false;

      let capturedPiece: Piece | undefined;
      if (enPassant) {
        const capturedPawnRow = entry.from.row;
        const capturedIdx = newPieces.findIndex((p) => p.col === entry.to.col && p.row === capturedPawnRow);
        if (capturedIdx !== -1) {
          capturedPiece = { ...newPieces[capturedIdx] };
          newPieces.splice(capturedIdx, 1);
        }
      } else {
        const targetIdx = newPieces.findIndex((p) => p.col === entry.to.col && p.row === entry.to.row);
        if (targetIdx !== -1) {
          capturedPiece = { ...newPieces[targetIdx] };
          newPieces.splice(targetIdx, 1);
        }
      }

      // 移动棋子
      movingPiece.col = entry.to.col;
      movingPiece.row = entry.to.row;
      movingPiece.hasMoved = true;

      // 王车易位：同步移动车
      if (castling) {
        const homeRow = movingPiece.row;
        if (entry.to.col === 6) {
          const rook = newPieces.find((p) => p.col === 7 && p.row === homeRow);
          if (rook) {
            rook.col = 5;
            rook.hasMoved = true;
          }
        } else if (entry.to.col === 2) {
          const rook = newPieces.find((p) => p.col === 0 && p.row === homeRow);
          if (rook) {
            rook.col = 3;
            rook.hasMoved = true;
          }
        }
      }

      // 升变
      if (entry.promotion) {
        movingPiece.type = entry.promotion;
      }

      // 更新易位权利（使用 entry.from 的原始位置）
      newCastlingRights = getCastlingRightsAfterMove(movingPiece, entry.from.col, entry.from.row, newCastlingRights);
      if (capturedPiece) {
        newCastlingRights = updateCastlingRightsForCapture(newCastlingRights, capturedPiece);
      }

      // 更新过路兵目标
      newEnPassantTarget = getEnPassantTargetAfterMove(movingPiece, entry.from.row, entry.to.row);

      // 切换玩家
      currentPlayer = movingPiece.color === 'white' ? 'black' : 'white';
      newLastMove = { from: entry.from, to: entry.to };
    }

    newHistory = replayHistory;

    const inCheck = isInCheck(newPieces, currentPlayer);

    set({
      pieces: newPieces,
      currentPlayer,
      selectedPieceId: null,
      validMoves: [],
      history: newHistory,
      enPassantTarget: newEnPassantTarget,
      castlingRights: newCastlingRights,
      winner: null,
      gameStatus: 'playing',
      inCheck,
      isAIThinking: false,
      lastMove: newLastMove,
      pendingPromotion: null,
    });
  },

  resetGame: () => {
    set({
      pieces: createInitialBoard(),
      currentPlayer: 'white',
      selectedPieceId: null,
      validMoves: [],
      history: [],
      enPassantTarget: null,
      castlingRights: { ...INITIAL_CASTLING_RIGHTS },
      winner: null,
      gameStatus: 'playing',
      inCheck: false,
      isAIThinking: false,
      lastMove: null,
      pendingPromotion: null,
    });
  },

  resign: () => {
    const { currentPlayer, gameStatus } = get();
    if (gameStatus !== 'playing') return;
    // 玩家认输，AI 胜
    const winner: PieceColor = currentPlayer === 'white' ? 'black' : 'white';
    set({
      gameStatus: 'resigned',
      winner,
      selectedPieceId: null,
      validMoves: [],
      isAIThinking: false,
      pendingPromotion: null,
    });
    setTimeout(() => playLoseSound(), 200);
  },

  setDifficulty: (level) => set({ difficulty: level }),
  setPlayerColor: (color) => set({ playerColor: color }),

  startGame: () => {
    const { resetGame } = get();
    resetGame();
    // PvE 模式下，玩家执白，AI 执黑，玩家先走
  },

  backToMenu: () => {
    set({
      isAIThinking: false,
      pendingPromotion: null,
    });
  },

  toggleSound: () => {
    const { soundEnabled } = get();
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    set({ soundEnabled: newVal });
    if (newVal) playClickSound();
  },
}));
