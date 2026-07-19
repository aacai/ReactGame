// 国际象棋 AI：基于 minimax + alpha-beta 剪枝
// 评估函数：棋子价值 + 位置价值表（PST）
// 难度分级：easy（深度1）/ medium（深度2）/ hard（深度3）

import type { Piece, PieceColor, PieceType, Position, CastlingRights } from './types';
import {
  clonePieces,
  getAllValidMovesForColor,
  getPieceAt,
  getEnPassantTargetAfterMove,
  isPromotionMove,
  isInCheck,
  INITIAL_CASTLING_RIGHTS,
} from './rules';

export type Difficulty = 'easy' | 'medium' | 'hard';

// 棋子基础价值（国际象棋标准值）
const PIECE_VALUES: Record<PieceType, number> = {
  king: 20000,
  queen: 900,
  rook: 500,
  bishop: 330,
  knight: 320,
  pawn: 100,
};

// 位置价值表（PST）- 从白方视角，黑方需镜像翻转 row
// 来源：国际象棋经典 PST 表（简化版）

// 兵的位置价值：中心列加分，边角扣分
const PAWN_PST: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

// 马的位置价值：边角扣分，中心加分
const KNIGHT_PST: number[][] = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

// 象的位置价值
const BISHOP_PST: number[][] = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

// 车的位置价值：在第 7 排（对方底线）有奖励
const ROOK_PST: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

// 后的位置价值
const QUEEN_PST: number[][] = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

// 王的位置价值（中局）
const KING_PST: number[][] = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const PST_TABLES: Record<PieceType, number[][]> = {
  pawn: PAWN_PST,
  knight: KNIGHT_PST,
  bishop: BISHOP_PST,
  rook: ROOK_PST,
  queen: QUEEN_PST,
  king: KING_PST,
};

// 获取棋子位置价值（白方视角的 PST，黑方需翻转 row）
function getPositionValue(piece: Piece): number {
  const table = PST_TABLES[piece.type];
  if (piece.color === 'white') {
    return table[piece.row][piece.col];
  }
  // 黑方视角：翻转 row（row 0 -> 7）
  return table[7 - piece.row][piece.col];
}

// 模拟走棋（含升变、过路兵、王车易位的副作用）
function simulateMove(
  pieces: Piece[],
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
  enPassantTarget: Position | null
): Piece[] {
  const newPieces = clonePieces(pieces);
  const movingPiece = newPieces.find((p) => p.col === fromCol && p.row === fromRow);
  if (!movingPiece) return newPieces;

  // 过路兵吃子：被吃的兵位于走棋者同列、走棋前的行
  if (movingPiece.type === 'pawn' && enPassantTarget
    && toCol === enPassantTarget.col && toRow === enPassantTarget.row
    && fromCol !== toCol) {
    const capturedPawnRow = fromRow;
    const capturedIdx = newPieces.findIndex((p) => p.col === toCol && p.row === capturedPawnRow);
    if (capturedIdx !== -1) {
      newPieces.splice(capturedIdx, 1);
    }
  } else {
    // 普通吃子
    const targetIndex = newPieces.findIndex((p) => p.col === toCol && p.row === toRow);
    if (targetIndex !== -1) {
      newPieces.splice(targetIndex, 1);
    }
  }

  movingPiece.col = toCol;
  movingPiece.row = toRow;
  movingPiece.hasMoved = true;

  // 升变：AI 默认升变为后
  if (movingPiece.type === 'pawn' && isPromotionMove(movingPiece, toRow)) {
    movingPiece.type = 'queen';
  }

  // 王车易位：王走两格，需同步移动车
  if (movingPiece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
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

  return newPieces;
}

// 评估当前盘面（从 aiColor 视角，正数表示对 AI 有利）
function evaluateBoard(pieces: Piece[], aiColor: PieceColor): number {
  let score = 0;
  for (const piece of pieces) {
    const value = PIECE_VALUES[piece.type];
    const posValue = getPositionValue(piece);
    const total = value + posValue;
    if (piece.color === aiColor) {
      score += total;
    } else {
      score -= total;
    }
  }

  // 将军奖惩
  const opponentColor: PieceColor = aiColor === 'white' ? 'black' : 'white';
  if (isInCheck(pieces, opponentColor)) {
    score += 30;
  }
  if (isInCheck(pieces, aiColor)) {
    score -= 30;
  }

  return score;
}

// 移动排序：优先考虑吃子走法（提高 alpha-beta 剪枝效率）
function orderMoves(
  moves: { piece: Piece; move: Position }[],
  pieces: Piece[]
): { piece: Piece; move: Position }[] {
  return [...moves].sort((a, b) => {
    const aCapture = getPieceAt(pieces, a.move.col, a.move.row);
    const bCapture = getPieceAt(pieces, b.move.col, b.move.row);
    const aVal = aCapture ? PIECE_VALUES[aCapture.type] : 0;
    const bVal = bCapture ? PIECE_VALUES[bCapture.type] : 0;
    return bVal - aVal;
  });
}

// 获取走棋后的易位权利（用于 AI 内部递归调用）
function getCastlingRightsAfterMove(
  piece: Piece,
  castlingRights: CastlingRights
): CastlingRights {
  const rights: CastlingRights = { ...castlingRights };
  if (piece.type === 'king') {
    if (piece.color === 'white') {
      rights.whiteKingSide = false;
      rights.whiteQueenSide = false;
    } else {
      rights.blackKingSide = false;
      rights.blackQueenSide = false;
    }
  } else if (piece.type === 'rook') {
    const homeRow = piece.color === 'white' ? 7 : 0;
    if (piece.row === homeRow) {
      if (piece.col === 0) {
        if (piece.color === 'white') rights.whiteQueenSide = false;
        else rights.blackQueenSide = false;
      } else if (piece.col === 7) {
        if (piece.color === 'white') rights.whiteKingSide = false;
        else rights.blackKingSide = false;
      }
    }
  }
  return rights;
}

// minimax + alpha-beta 剪枝
function minimax(
  pieces: Piece[],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PieceColor,
  enPassantTarget: Position | null,
  castlingRights: CastlingRights
): number {
  if (depth === 0) {
    return evaluateBoard(pieces, aiColor);
  }

  const currentColor: PieceColor = isMaximizing ? aiColor : (aiColor === 'white' ? 'black' : 'white');
  const moves = getAllValidMovesForColor(pieces, currentColor, enPassantTarget, castlingRights);

  if (moves.length === 0) {
    // 无棋可走：将军中=将杀（极差），非将军中=逼和（和棋）
    if (isInCheck(pieces, currentColor)) {
      return isMaximizing ? -100000 : 100000;
    }
    return 0;
  }

  const orderedMoves = orderMoves(moves, pieces);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const { piece, move } of orderedMoves) {
      const newEnPassant = getEnPassantTargetAfterMove(piece, piece.row, move.row);
      const newCastling = getCastlingRightsAfterMove(piece, castlingRights);
      const newPieces = simulateMove(pieces, piece.col, piece.row, move.col, move.row, enPassantTarget);
      const evalScore = minimax(
        newPieces,
        depth - 1,
        alpha,
        beta,
        false,
        aiColor,
        newEnPassant,
        newCastling
      );
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) {
        break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const { piece, move } of orderedMoves) {
      const newEnPassant = getEnPassantTargetAfterMove(piece, piece.row, move.row);
      const newCastling = getCastlingRightsAfterMove(piece, castlingRights);
      const newPieces = simulateMove(pieces, piece.col, piece.row, move.col, move.row, enPassantTarget);
      const evalScore = minimax(
        newPieces,
        depth - 1,
        alpha,
        beta,
        true,
        aiColor,
        newEnPassant,
        newCastling
      );
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) {
        break;
      }
    }
    return minEval;
  }
}

// 简单难度：随机走，倾向于吃子
function getEasyMove(
  pieces: Piece[],
  aiColor: PieceColor,
  enPassantTarget: Position | null,
  castlingRights: CastlingRights
): { from: Position; to: Position } | null {
  const allMoves = getAllValidMovesForColor(pieces, aiColor, enPassantTarget, castlingRights);
  if (allMoves.length === 0) return null;

  const captureMoves = allMoves.filter(({ move }) => {
    const target = getPieceAt(pieces, move.col, move.row);
    return target !== undefined;
  });

  // 50% 概率选择吃子（若有）
  if (captureMoves.length > 0 && Math.random() < 0.5) {
    // 找最高价值的吃子
    captureMoves.sort((a, b) => {
      const aTarget = getPieceAt(pieces, a.move.col, a.move.row);
      const bTarget = getPieceAt(pieces, b.move.col, b.move.row);
      const aVal = aTarget ? PIECE_VALUES[aTarget.type] : 0;
      const bVal = bTarget ? PIECE_VALUES[bTarget.type] : 0;
      return bVal - aVal;
    });
    const chosen = captureMoves[0];
    return {
      from: { col: chosen.piece.col, row: chosen.piece.row },
      to: chosen.move,
    };
  }

  const chosen = allMoves[Math.floor(Math.random() * allMoves.length)];
  return {
    from: { col: chosen.piece.col, row: chosen.piece.row },
    to: chosen.move,
  };
}

// 中等难度：minimax 深度 2
function getMediumMove(
  pieces: Piece[],
  aiColor: PieceColor,
  enPassantTarget: Position | null,
  castlingRights: CastlingRights
): { from: Position; to: Position } | null {
  const allMoves = getAllValidMovesForColor(pieces, aiColor, enPassantTarget, castlingRights);
  if (allMoves.length === 0) return null;

  const orderedMoves = orderMoves(allMoves, pieces);
  let bestScore = -Infinity;
  let bestMoves: { from: Position; to: Position }[] = [];

  for (const { piece, move } of orderedMoves) {
    const newEnPassant = getEnPassantTargetAfterMove(piece, piece.row, move.row);
    const newCastling = getCastlingRightsAfterMove(piece, castlingRights);
    const newPieces = simulateMove(pieces, piece.col, piece.row, move.col, move.row, enPassantTarget);
    const score = minimax(
      newPieces,
      1,
      -Infinity,
      Infinity,
      false,
      aiColor,
      newEnPassant,
      newCastling
    );

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [{ from: { col: piece.col, row: piece.row }, to: move }];
    } else if (score === bestScore) {
      bestMoves.push({ from: { col: piece.col, row: piece.row }, to: move });
    }
  }

  if (bestMoves.length === 0) return null;
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// 困难难度：minimax 深度 3
function getHardMove(
  pieces: Piece[],
  aiColor: PieceColor,
  enPassantTarget: Position | null,
  castlingRights: CastlingRights
): { from: Position; to: Position } | null {
  const allMoves = getAllValidMovesForColor(pieces, aiColor, enPassantTarget, castlingRights);
  if (allMoves.length === 0) return null;

  const orderedMoves = orderMoves(allMoves, pieces);
  let bestScore = -Infinity;
  let bestMoves: { from: Position; to: Position }[] = [];

  for (const { piece, move } of orderedMoves) {
    const newEnPassant = getEnPassantTargetAfterMove(piece, piece.row, move.row);
    const newCastling = getCastlingRightsAfterMove(piece, castlingRights);
    const newPieces = simulateMove(pieces, piece.col, piece.row, move.col, move.row, enPassantTarget);
    const score = minimax(
      newPieces,
      2,
      -Infinity,
      Infinity,
      false,
      aiColor,
      newEnPassant,
      newCastling
    );

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [{ from: { col: piece.col, row: piece.row }, to: move }];
    } else if (score === bestScore) {
      bestMoves.push({ from: { col: piece.col, row: piece.row }, to: move });
    }
  }

  if (bestMoves.length === 0) return null;
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

export function getAIMove(
  pieces: Piece[],
  aiColor: PieceColor,
  difficulty: Difficulty,
  enPassantTarget: Position | null = null,
  castlingRights: CastlingRights = INITIAL_CASTLING_RIGHTS
): { from: Position; to: Position } | null {
  switch (difficulty) {
    case 'easy':
      return getEasyMove(pieces, aiColor, enPassantTarget, castlingRights);
    case 'medium':
      return getMediumMove(pieces, aiColor, enPassantTarget, castlingRights);
    case 'hard':
      return getHardMove(pieces, aiColor, enPassantTarget, castlingRights);
    default:
      return null;
  }
}
