// 韩国象棋 AI：基于 minimax + alpha-beta 剪枝
// 复用中国象棋的算法思路，针对韩国象棋调整棋子价值
// 韩国象棋中：车最贵，马象价值相近，炮因不能跳炮吃炮价值略低，兵可横走价值略高

import type { Piece, PieceColor, PieceType, Position } from './types';
import { clonePieces } from './rules';
import { getAllValidMovesForColor, getPieceAt, isInCheck } from './rules';

export type Difficulty = 'easy' | 'medium' | 'hard';

// 棋子基础价值（韩国象棋价值表）
const PIECE_VALUES: Record<PieceType, number> = {
  king: 10000,
  chariot: 130,  // 韩国象棋车最强（宫内可走斜线）
  cannon: 70,    // 不能跳炮吃炮，价值低于车
  horse: 50,
  elephant: 30,
  advisor: 30,
  soldier: 20,   // 可横走，价值高于中国象棋的兵
};

function simulateMove(pieces: Piece[], fromCol: number, fromRow: number, toCol: number, toRow: number): Piece[] {
  const newPieces = clonePieces(pieces);
  const movingPiece = newPieces.find((p) => p.col === fromCol && p.row === fromRow);
  if (!movingPiece) return newPieces;

  const targetIndex = newPieces.findIndex((p) => p.col === toCol && p.row === toRow);
  if (targetIndex !== -1) {
    newPieces.splice(targetIndex, 1);
  }

  movingPiece.col = toCol;
  movingPiece.row = toRow;

  return newPieces;
}

function evaluatePieceValue(piece: Piece): number {
  return PIECE_VALUES[piece.type];
}

function evaluateBoard(pieces: Piece[], aiColor: PieceColor): number {
  let score = 0;
  for (const piece of pieces) {
    const value = evaluatePieceValue(piece);
    if (piece.color === aiColor) {
      score += value;
    } else {
      score -= value;
    }
  }
  return score;
}

// 位置加分：靠近中央更灵活
function getCenterBonus(col: number, row: number): number {
  const colDist = Math.abs(col - 4);
  const rowDist = Math.abs(row - 4.5);
  const bonus = (4 - colDist) * 0.3 + (4.5 - rowDist) * 0.2;
  return bonus;
}

function evaluateBoardAdvanced(pieces: Piece[], aiColor: PieceColor): number {
  let score = 0;
  const opponentColor: PieceColor = aiColor === 'red' ? 'blue' : 'red';

  for (const piece of pieces) {
    const value = evaluatePieceValue(piece);
    const sign = piece.color === aiColor ? 1 : -1;
    score += value * sign;

    // 机动性加成
    if (piece.type === 'horse' || piece.type === 'cannon' || piece.type === 'chariot') {
      score += getCenterBonus(piece.col, piece.row) * sign;
    }

    // 兵卒向前推进加分
    if (piece.type === 'soldier') {
      // 红方推进 = row 减小；蓝方推进 = row 增大
      const advancement = piece.color === 'red'
        ? (6 - piece.row)
        : (piece.row - 3);
      score += advancement * sign * 0.3;
    }
  }

  // 将军奖惩
  if (isInCheck(pieces, opponentColor)) {
    score += 5;
  }
  if (isInCheck(pieces, aiColor)) {
    score -= 5;
  }

  return score;
}

function orderMoves(
  moves: { piece: Piece; move: Position }[],
  pieces: Piece[]
): { piece: Piece; move: Position }[] {
  return [...moves].sort((a, b) => {
    const aCapture = getPieceAt(pieces, a.move.col, a.move.row);
    const bCapture = getPieceAt(pieces, b.move.col, b.move.row);
    const aVal = aCapture ? evaluatePieceValue(aCapture) : 0;
    const bVal = bCapture ? evaluatePieceValue(bCapture) : 0;
    return bVal - aVal;
  });
}

// 简单难度：随机走，偶尔吃子
function getEasyMove(pieces: Piece[], aiColor: PieceColor): { from: Position; to: Position } | null {
  const allMoves = getAllValidMovesForColor(pieces, aiColor);
  if (allMoves.length === 0) return null;

  const captureMoves = allMoves.filter(({ move }) => {
    const target = getPieceAt(pieces, move.col, move.row);
    return target !== undefined;
  });

  if (captureMoves.length > 0 && Math.random() < 0.5) {
    const chosen = captureMoves[Math.floor(Math.random() * captureMoves.length)];
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

// 中等难度：1 层搜索 + 对手最佳应对
function getMediumMove(pieces: Piece[], aiColor: PieceColor): { from: Position; to: Position } | null {
  const allMoves = getAllValidMovesForColor(pieces, aiColor);
  if (allMoves.length === 0) return null;

  const opponentColor: PieceColor = aiColor === 'red' ? 'blue' : 'red';
  let bestScore = -Infinity;
  let bestMoves: { from: Position; to: Position }[] = [];

  for (const { piece, move } of allMoves) {
    const newPieces = simulateMove(pieces, piece.col, piece.row, move.col, move.row);
    let moveScore = evaluateBoard(newPieces, aiColor);

    const opponentMoves = getAllValidMovesForColor(newPieces, opponentColor);
    let worstOpponentScore = Infinity;

    for (const { piece: opPiece, move: opMove } of opponentMoves) {
      const afterOpponent = simulateMove(newPieces, opPiece.col, opPiece.row, opMove.col, opMove.row);
      const score = evaluateBoard(afterOpponent, aiColor);
      if (score < worstOpponentScore) {
        worstOpponentScore = score;
      }
    }

    if (opponentMoves.length > 0) {
      moveScore = worstOpponentScore;
    }

    if (moveScore > bestScore) {
      bestScore = moveScore;
      bestMoves = [{ from: { col: piece.col, row: piece.row }, to: move }];
    } else if (moveScore === bestScore) {
      bestMoves.push({ from: { col: piece.col, row: piece.row }, to: move });
    }
  }

  if (bestMoves.length === 0) return null;
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// 困难难度：minimax 深度 3，alpha-beta 剪枝
function minimax(
  pieces: Piece[],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PieceColor
): number {
  if (depth === 0) {
    return evaluateBoardAdvanced(pieces, aiColor);
  }

  const currentColor: PieceColor = isMaximizing ? aiColor : (aiColor === 'red' ? 'blue' : 'red');
  const moves = getAllValidMovesForColor(pieces, currentColor);

  if (moves.length === 0) {
    if (isInCheck(pieces, currentColor)) {
      return isMaximizing ? -100000 : 100000;
    }
    return 0;
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    const orderedMoves = orderMoves(moves, pieces);
    for (const { piece, move } of orderedMoves) {
      const newPieces = simulateMove(pieces, piece.col, piece.row, move.col, move.row);
      const evalScore = minimax(newPieces, depth - 1, alpha, beta, false, aiColor);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) {
        break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    const orderedMoves = orderMoves(moves, pieces);
    for (const { piece, move } of orderedMoves) {
      const newPieces = simulateMove(pieces, piece.col, piece.row, move.col, move.row);
      const evalScore = minimax(newPieces, depth - 1, alpha, beta, true, aiColor);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) {
        break;
      }
    }
    return minEval;
  }
}

function getHardMove(pieces: Piece[], aiColor: PieceColor): { from: Position; to: Position } | null {
  const allMoves = getAllValidMovesForColor(pieces, aiColor);
  if (allMoves.length === 0) return null;

  const orderedMoves = orderMoves(allMoves, pieces);

  let bestScore = -Infinity;
  let bestMoves: { from: Position; to: Position }[] = [];

  for (const { piece, move } of orderedMoves) {
    const newPieces = simulateMove(pieces, piece.col, piece.row, move.col, move.row);
    const score = minimax(newPieces, 2, -Infinity, Infinity, false, aiColor);

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
  difficulty: Difficulty
): { from: Position; to: Position } | null {
  switch (difficulty) {
    case 'easy':
      return getEasyMove(pieces, aiColor);
    case 'medium':
      return getMediumMove(pieces, aiColor);
    case 'hard':
      return getHardMove(pieces, aiColor);
    default:
      return null;
  }
}
