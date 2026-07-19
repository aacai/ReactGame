import type { Piece, PieceColor, PieceType, Position } from './types';
import { clonePieces, hasCrossedRiver } from './board';
import { getValidMoves, getAllValidMovesForColor, getPieceAt, isInCheck } from './rules';

type Difficulty = 'easy' | 'medium' | 'hard';

const PIECE_VALUES: Record<PieceType, number> = {
  king: 10000,
  chariot: 90,
  cannon: 50,
  horse: 40,
  elephant: 20,
  advisor: 20,
  soldier: 10,
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
  let value = PIECE_VALUES[piece.type];
  if (piece.type === 'soldier' && hasCrossedRiver(piece.row, piece.color)) {
    value += 5;
  }
  return value;
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

function getCenterBonus(col: number, row: number): number {
  const colDist = Math.abs(col - 4);
  const bonus = (4 - colDist) * 0.5;
  return bonus;
}

function evaluateBoardAdvanced(pieces: Piece[], aiColor: PieceColor): number {
  let score = 0;
  const opponentColor = aiColor === 'red' ? 'black' : 'red';

  for (const piece of pieces) {
    const value = evaluatePieceValue(piece);
    const sign = piece.color === aiColor ? 1 : -1;
    score += value * sign;

    if (piece.type === 'horse' || piece.type === 'cannon') {
      score += getCenterBonus(piece.col, piece.row) * sign;
    }

    if (piece.type === 'soldier') {
      const advancement = piece.color === 'red'
        ? (6 - piece.row)
        : (piece.row - 3);
      score += advancement * sign * 0.3;
    }
  }

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

function getMediumMove(pieces: Piece[], aiColor: PieceColor): { from: Position; to: Position } | null {
  const allMoves = getAllValidMovesForColor(pieces, aiColor);
  if (allMoves.length === 0) return null;

  const opponentColor = aiColor === 'red' ? 'black' : 'red';
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

  const currentColor = isMaximizing ? aiColor : (aiColor === 'red' ? 'black' : 'red');
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
