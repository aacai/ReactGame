// 日本将棋 AI：基于 minimax + alpha-beta 剪枝
// 评估：棋子价值（升变后价值更高）+ 位置 + 持驹价值
// 难度分级：easy（随机+吃子偏好）/ medium（1.5 层搜索）/ hard（深度 3）

import type { Piece, PieceColor, PieceType, Hand } from './types';
import {
  getAllActionsForColor,
  applyAction,
  isInCheck,
  isCheckmate,
  isStalemate,
} from './rules';
import type { Action } from './rules';

export type Difficulty = 'easy' | 'medium' | 'hard';

// 棋子基础价值（未升变）
const PIECE_VALUES: Record<PieceType, number> = {
  king: 10000,
  rook: 10,
  bishop: 8,
  gold: 6,
  silver: 5,
  knight: 4,
  lance: 3,
  pawn: 1,
};

// 升变后的额外价值（升变后 = 基础 + 额外）
const PROMOTION_BONUS: Record<PieceType, number> = {
  king: 0,
  rook: 3,    // 龙王 = 13
  bishop: 2,  // 龙马 = 10
  gold: 0,
  silver: 1,  // 成银 = 6
  knight: 2,  // 成桂 = 6
  lance: 3,   // 成香 = 6
  pawn: 5,    // と金 = 6
};

// 持驹价值系数（持驹略低于盘上价值，因为需要打入才能发挥作用）
const HAND_VALUE_RATIO = 0.8;

function evaluatePieceValue(piece: Piece): number {
  const base = PIECE_VALUES[piece.type];
  if (piece.promoted) {
    return base + PROMOTION_BONUS[piece.type];
  }
  return base;
}

function evaluateHandValue(hand: Hand, color: PieceColor): number {
  let total = 0;
  for (const hp of hand[color]) {
    total += PIECE_VALUES[hp.type] * hp.count * HAND_VALUE_RATIO;
  }
  return total;
}

// 位置加分：靠近中央更灵活
function getCenterBonus(col: number, row: number): number {
  const colDist = Math.abs(col - 4);
  const rowDist = Math.abs(row - 4);
  return (4 - colDist) * 0.2 + (4 - rowDist) * 0.15;
}

// 步兵推进加分（越靠近对方底端越好）
function getPawnAdvancement(piece: Piece): number {
  if (piece.type !== 'pawn' || piece.promoted) return 0;
  // sente 向 row 减小推进，gote 向 row 增大推进
  if (piece.color === 'sente') {
    return (6 - piece.row) * 0.15; // 起始 row 6，每推进一格加分
  }
  return (piece.row - 2) * 0.15;
}

// 完整评估函数
function evaluateBoard(pieces: Piece[], hand: Hand, aiColor: PieceColor): number {
  let score = 0;
  const opponentColor: PieceColor = aiColor === 'sente' ? 'gote' : 'sente';

  for (const piece of pieces) {
    const value = evaluatePieceValue(piece);
    const sign = piece.color === aiColor ? 1 : -1;
    score += value * sign;

    // 机动性加成（仅对滑动/跳跃棋子）
    if (piece.type === 'rook' || piece.type === 'bishop' || piece.type === 'silver' || piece.type === 'gold') {
      score += getCenterBonus(piece.col, piece.row) * sign;
    }

    // 步兵推进
    if (piece.type === 'pawn') {
      score += getPawnAdvancement(piece) * sign;
    }
  }

  // 持驹价值
  score += evaluateHandValue(hand, aiColor);
  score -= evaluateHandValue(hand, opponentColor);

  // 将军奖惩
  if (isInCheck(pieces, opponentColor)) {
    score += 3;
  }
  if (isInCheck(pieces, aiColor)) {
    score -= 3;
  }

  return score;
}

// 动作排序：吃子优先，升变优先，便于 alpha-beta 剪枝
function orderActions(actions: Action[], pieces: Piece[], hand: Hand, color: PieceColor): Action[] {
  const opponentColor: PieceColor = color === 'sente' ? 'gote' : 'sente';
  return [...actions].sort((a, b) => {
    const scoreA = estimateActionValue(a, pieces, hand, color, opponentColor);
    const scoreB = estimateActionValue(b, pieces, hand, color, opponentColor);
    return scoreB - scoreA;
  });
}

// 估算动作价值（用于排序，越激进越靠前）
function estimateActionValue(
  action: Action,
  pieces: Piece[],
  _hand: Hand,
  _color: PieceColor,
  _opponentColor: PieceColor,
): number {
  let score = 0;
  if (action.kind === 'move') {
    // 吃子价值
    const target = pieces.find((p) => p.col === action.to.col && p.row === action.to.row);
    if (target) {
      score += evaluatePieceValue(target) * 10;
    }
    // 升变加分
    if (action.promote) {
      const mover = pieces.find((p) => p.col === action.from.col && p.row === action.from.row);
      if (mover) {
        score += PROMOTION_BONUS[mover.type] * 5;
      }
    }
  } else {
    // 打入：略低于吃子
    score += 1;
  }
  return score;
}

// 简单难度：随机走，偶尔吃子
function getEasyMove(
  pieces: Piece[],
  hand: Hand,
  aiColor: PieceColor,
): Action | null {
  const actions = getAllActionsForColor(pieces, aiColor, hand);
  if (actions.length === 0) return null;

  // 50% 概率优先吃子
  const captureActions = actions.filter((a) => {
    if (a.kind !== 'move') return false;
    return pieces.some((p) => p.col === a.to.col && p.row === a.to.row);
  });

  if (captureActions.length > 0 && Math.random() < 0.5) {
    return captureActions[Math.floor(Math.random() * captureActions.length)];
  }
  return actions[Math.floor(Math.random() * actions.length)];
}

// 中等难度：1 层搜索 + 对手最佳应对（1.5 层）
function getMediumMove(
  pieces: Piece[],
  hand: Hand,
  aiColor: PieceColor,
): Action | null {
  const actions = getAllActionsForColor(pieces, aiColor, hand);
  if (actions.length === 0) return null;

  const opponentColor: PieceColor = aiColor === 'sente' ? 'gote' : 'sente';
  const orderedActions = orderActions(actions, pieces, hand, aiColor);

  let bestScore = -Infinity;
  let bestActions: Action[] = [];

  for (const action of orderedActions) {
    const { newPieces, newHand } = applyAction(pieces, hand, aiColor, action);
    let moveScore = evaluateBoard(newPieces, newHand, aiColor);

    // 检查对手是否被将死/困毙
    if (isCheckmate(newPieces, opponentColor, newHand)) {
      moveScore += 100000;
    } else if (isStalemate(newPieces, opponentColor, newHand)) {
      moveScore += 50000;
    } else {
      // 对手最佳应对
      const opponentActions = getAllActionsForColor(newPieces, opponentColor, newHand);
      if (opponentActions.length > 0) {
        let worstOpponentScore = Infinity;
        const orderedOpponentActions = orderActions(opponentActions, newPieces, newHand, opponentColor);
        for (const opAction of orderedOpponentActions) {
          const { newPieces: afterOpp, newHand: afterOppHand } = applyAction(
            newPieces,
            newHand,
            opponentColor,
            opAction,
          );
          const score = evaluateBoard(afterOpp, afterOppHand, aiColor);
          if (score < worstOpponentScore) {
            worstOpponentScore = score;
          }
        }
        moveScore = worstOpponentScore;
      }
    }

    if (moveScore > bestScore) {
      bestScore = moveScore;
      bestActions = [action];
    } else if (moveScore === bestScore) {
      bestActions.push(action);
    }
  }

  if (bestActions.length === 0) return null;
  return bestActions[Math.floor(Math.random() * bestActions.length)];
}

// 困难难度：minimax 深度 3，alpha-beta 剪枝
function minimax(
  pieces: Piece[],
  hand: Hand,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PieceColor,
): number {
  const opponentColor: PieceColor = aiColor === 'sente' ? 'gote' : 'sente';
  const currentColor: PieceColor = isMaximizing ? aiColor : opponentColor;

  // 终局判断
  if (isCheckmate(pieces, currentColor, hand)) {
    // 当前方被将死
    return isMaximizing ? -100000 : 100000;
  }
  if (isStalemate(pieces, currentColor, hand)) {
    return isMaximizing ? -50000 : 50000;
  }

  if (depth === 0) {
    return evaluateBoard(pieces, hand, aiColor);
  }

  const actions = getAllActionsForColor(pieces, currentColor, hand);
  if (actions.length === 0) {
    return isMaximizing ? -100000 : 100000;
  }

  const orderedActions = orderActions(actions, pieces, hand, currentColor);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const action of orderedActions) {
      const { newPieces, newHand } = applyAction(pieces, hand, currentColor, action);
      const evalScore = minimax(newPieces, newHand, depth - 1, alpha, beta, false, aiColor);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  }
  let minEval = Infinity;
  for (const action of orderedActions) {
    const { newPieces, newHand } = applyAction(pieces, hand, currentColor, action);
    const evalScore = minimax(newPieces, newHand, depth - 1, alpha, beta, true, aiColor);
    minEval = Math.min(minEval, evalScore);
    beta = Math.min(beta, evalScore);
    if (beta <= alpha) break;
  }
  return minEval;
}

function getHardMove(
  pieces: Piece[],
  hand: Hand,
  aiColor: PieceColor,
): Action | null {
  const actions = getAllActionsForColor(pieces, aiColor, hand);
  if (actions.length === 0) return null;

  const orderedActions = orderActions(actions, pieces, hand, aiColor);

  let bestScore = -Infinity;
  let bestActions: Action[] = [];

  for (const action of orderedActions) {
    const { newPieces, newHand } = applyAction(pieces, hand, aiColor, action);
    // 对手回合，所以 isMaximizing=false
    const score = minimax(newPieces, newHand, 2, -Infinity, Infinity, false, aiColor);

    if (score > bestScore) {
      bestScore = score;
      bestActions = [action];
    } else if (score === bestScore) {
      bestActions.push(action);
    }
  }

  if (bestActions.length === 0) return null;
  return bestActions[Math.floor(Math.random() * bestActions.length)];
}

export function getAIMove(
  pieces: Piece[],
  hand: Hand,
  aiColor: PieceColor,
  difficulty: Difficulty,
): Action | null {
  switch (difficulty) {
    case 'easy':
      return getEasyMove(pieces, hand, aiColor);
    case 'medium':
      return getMediumMove(pieces, hand, aiColor);
    case 'hard':
      return getHardMove(pieces, hand, aiColor);
    default:
      return null;
  }
}
