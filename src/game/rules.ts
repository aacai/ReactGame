import type { Piece, PieceColor, PieceType, Position } from './types';
import { BOARD_COLS, BOARD_ROWS, isInBoard, isInPalace, isOnOwnSide, hasCrossedRiver, clonePieces } from './board';

export function getPieceAt(pieces: Piece[], col: number, row: number): Piece | undefined {
  return pieces.find((p) => p.col === col && p.row === row);
}

function getPiecesByType(pieces: Piece[], color: PieceColor, type: PieceType): Piece[] {
  return pieces.filter((p) => p.color === color && p.type === type);
}

function getKing(pieces: Piece[], color: PieceColor): Piece | undefined {
  return pieces.find((p) => p.color === color && p.type === 'king');
}

function isKingsFacing(pieces: Piece[]): boolean {
  const redKing = getKing(pieces, 'red');
  const blackKing = getKing(pieces, 'black');
  if (!redKing || !blackKing) return false;
  if (redKing.col !== blackKing.col) return false;

  const minRow = Math.min(redKing.row, blackKing.row);
  const maxRow = Math.max(redKing.row, blackKing.row);

  for (let row = minRow + 1; row < maxRow; row += 1) {
    if (getPieceAt(pieces, redKing.col, row)) return false;
  }
  return true;
}

function getKingMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const directions = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
  ];

  for (const dir of directions) {
    const newCol = piece.col + dir.dc;
    const newRow = piece.row + dir.dr;
    if (!isInPalace(newCol, newRow, piece.color)) continue;
    const target = getPieceAt(pieces, newCol, newRow);
    if (target && target.color === piece.color) continue;
    moves.push({ col: newCol, row: newRow });
  }

  return moves;
}

function getAdvisorMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const directions = [
    { dc: -1, dr: -1 },
    { dc: 1, dr: -1 },
    { dc: -1, dr: 1 },
    { dc: 1, dr: 1 },
  ];

  for (const dir of directions) {
    const newCol = piece.col + dir.dc;
    const newRow = piece.row + dir.dr;
    if (!isInPalace(newCol, newRow, piece.color)) continue;
    const target = getPieceAt(pieces, newCol, newRow);
    if (target && target.color === piece.color) continue;
    moves.push({ col: newCol, row: newRow });
  }

  return moves;
}

function getElephantMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const directions = [
    { dc: -2, dr: -2, ec: -1, er: -1 },
    { dc: 2, dr: -2, ec: 1, er: -1 },
    { dc: -2, dr: 2, ec: -1, er: 1 },
    { dc: 2, dr: 2, ec: 1, er: 1 },
  ];

  for (const dir of directions) {
    const newCol = piece.col + dir.dc;
    const newRow = piece.row + dir.dr;
    if (!isInBoard(newCol, newRow)) continue;
    if (!isOnOwnSide(newRow, piece.color)) continue;

    const eyeCol = piece.col + dir.ec;
    const eyeRow = piece.row + dir.er;
    if (getPieceAt(pieces, eyeCol, eyeRow)) continue;

    const target = getPieceAt(pieces, newCol, newRow);
    if (target && target.color === piece.color) continue;
    moves.push({ col: newCol, row: newRow });
  }

  return moves;
}

function getHorseMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const horseMoves = [
    { dc: -1, dr: -2, bc: 0, br: -1 },
    { dc: 1, dr: -2, bc: 0, br: -1 },
    { dc: -1, dr: 2, bc: 0, br: 1 },
    { dc: 1, dr: 2, bc: 0, br: 1 },
    { dc: -2, dr: -1, bc: -1, br: 0 },
    { dc: -2, dr: 1, bc: -1, br: 0 },
    { dc: 2, dr: -1, bc: 1, br: 0 },
    { dc: 2, dr: 1, bc: 1, br: 0 },
  ];

  for (const m of horseMoves) {
    const newCol = piece.col + m.dc;
    const newRow = piece.row + m.dr;
    if (!isInBoard(newCol, newRow)) continue;

    const blockCol = piece.col + m.bc;
    const blockRow = piece.row + m.br;
    if (getPieceAt(pieces, blockCol, blockRow)) continue;

    const target = getPieceAt(pieces, newCol, newRow);
    if (target && target.color === piece.color) continue;
    moves.push({ col: newCol, row: newRow });
  }

  return moves;
}

function getChariotMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const directions = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
  ];

  for (const dir of directions) {
    let col = piece.col + dir.dc;
    let row = piece.row + dir.dr;
    while (isInBoard(col, row)) {
      const target = getPieceAt(pieces, col, row);
      if (target) {
        if (target.color !== piece.color) {
          moves.push({ col, row });
        }
        break;
      }
      moves.push({ col, row });
      col += dir.dc;
      row += dir.dr;
    }
  }

  return moves;
}

function getCannonMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const directions = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
  ];

  for (const dir of directions) {
    let col = piece.col + dir.dc;
    let row = piece.row + dir.dr;
    let jumped = false;

    while (isInBoard(col, row)) {
      const target = getPieceAt(pieces, col, row);
      if (!jumped) {
        if (target) {
          jumped = true;
        } else {
          moves.push({ col, row });
        }
      } else {
        if (target) {
          if (target.color !== piece.color) {
            moves.push({ col, row });
          }
          break;
        }
      }
      col += dir.dc;
      row += dir.dr;
    }
  }

  return moves;
}

function getSoldierMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const forward = piece.color === 'red' ? -1 : 1;

  const forwardCol = piece.col;
  const forwardRow = piece.row + forward;
  if (isInBoard(forwardCol, forwardRow)) {
    const target = getPieceAt(pieces, forwardCol, forwardRow);
    if (!target || target.color !== piece.color) {
      moves.push({ col: forwardCol, row: forwardRow });
    }
  }

  if (hasCrossedRiver(piece.row, piece.color)) {
    const leftCol = piece.col - 1;
    const leftRow = piece.row;
    if (isInBoard(leftCol, leftRow)) {
      const target = getPieceAt(pieces, leftCol, leftRow);
      if (!target || target.color !== piece.color) {
        moves.push({ col: leftCol, row: leftRow });
      }
    }

    const rightCol = piece.col + 1;
    const rightRow = piece.row;
    if (isInBoard(rightCol, rightRow)) {
      const target = getPieceAt(pieces, rightCol, rightRow);
      if (!target || target.color !== piece.color) {
        moves.push({ col: rightCol, row: rightRow });
      }
    }
  }

  return moves;
}

function getRawMoves(pieces: Piece[], piece: Piece): Position[] {
  switch (piece.type) {
    case 'king':
      return getKingMoves(pieces, piece);
    case 'advisor':
      return getAdvisorMoves(pieces, piece);
    case 'elephant':
      return getElephantMoves(pieces, piece);
    case 'horse':
      return getHorseMoves(pieces, piece);
    case 'chariot':
      return getChariotMoves(pieces, piece);
    case 'cannon':
      return getCannonMoves(pieces, piece);
    case 'soldier':
      return getSoldierMoves(pieces, piece);
    default:
      return [];
  }
}

export function isInCheck(pieces: Piece[], color: PieceColor): boolean {
  if (isKingsFacing(pieces)) return true;

  const king = getKing(pieces, color);
  if (!king) return false;

  const opponentColor = color === 'red' ? 'black' : 'red';
  const opponentPieces = pieces.filter((p) => p.color === opponentColor);

  for (const op of opponentPieces) {
    const moves = getRawMoves(pieces, op);
    if (moves.some((m) => m.col === king.col && m.row === king.row)) {
      return true;
    }
  }

  return false;
}

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

export function getValidMoves(pieces: Piece[], fromCol: number, fromRow: number): Position[] {
  const piece = getPieceAt(pieces, fromCol, fromRow);
  if (!piece) return [];

  const rawMoves = getRawMoves(pieces, piece);

  return rawMoves.filter((move) => {
    const newPieces = simulateMove(pieces, fromCol, fromRow, move.col, move.row);
    return !isInCheck(newPieces, piece.color);
  });
}

export function isValidMove(pieces: Piece[], from: Position, to: Position, color: PieceColor): boolean {
  const piece = getPieceAt(pieces, from.col, from.row);
  if (!piece || piece.color !== color) return false;

  const validMoves = getValidMoves(pieces, from.col, from.row);
  return validMoves.some((m) => m.col === to.col && m.row === to.row);
}

export function getAllValidMovesForColor(pieces: Piece[], color: PieceColor): { piece: Piece; move: Position }[] {
  const result: { piece: Piece; move: Position }[] = [];
  const colorPieces = pieces.filter((p) => p.color === color);

  for (const piece of colorPieces) {
    const moves = getValidMoves(pieces, piece.col, piece.row);
    for (const move of moves) {
      result.push({ piece, move });
    }
  }

  return result;
}

export function isCheckmate(pieces: Piece[], color: PieceColor): boolean {
  if (!isInCheck(pieces, color)) return false;
  const moves = getAllValidMovesForColor(pieces, color);
  return moves.length === 0;
}

export function isStalemate(pieces: Piece[], color: PieceColor): boolean {
  if (isInCheck(pieces, color)) return false;
  const moves = getAllValidMovesForColor(pieces, color);
  return moves.length === 0;
}
