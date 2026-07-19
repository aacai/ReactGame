import type { Piece, PieceColor, PieceType, Position } from './types';

export const BOARD_COLS = 9;
export const BOARD_ROWS = 10;

export function isInBoard(col: number, row: number): boolean {
  return col >= 0 && col < BOARD_COLS && row >= 0 && row < BOARD_ROWS;
}

export function isInPalace(col: number, row: number, color: PieceColor): boolean {
  if (col < 3 || col > 5) return false;
  if (color === 'red') {
    return row >= 7 && row <= 9;
  } else {
    return row >= 0 && row <= 2;
  }
}

export function isOnOwnSide(row: number, color: PieceColor): boolean {
  if (color === 'red') {
    return row >= 5;
  } else {
    return row <= 4;
  }
}

export function hasCrossedRiver(row: number, color: PieceColor): boolean {
  return !isOnOwnSide(row, color);
}

let pieceIdCounter = 0;

function createPiece(color: PieceColor, type: PieceType, col: number, row: number): Piece {
  pieceIdCounter += 1;
  return {
    id: `${color}-${type}-${pieceIdCounter}`,
    color,
    type,
    col,
    row,
  };
}

export function createInitialBoard(): Piece[] {
  pieceIdCounter = 0;
  const pieces: Piece[] = [];

  const backRank: PieceType[] = [
    'chariot',
    'horse',
    'elephant',
    'advisor',
    'king',
    'advisor',
    'elephant',
    'horse',
    'chariot',
  ];

  for (let col = 0; col < BOARD_COLS; col += 1) {
    pieces.push(createPiece('black', backRank[col], col, 0));
    pieces.push(createPiece('red', backRank[col], col, 9));
  }

  pieces.push(createPiece('black', 'cannon', 1, 2));
  pieces.push(createPiece('black', 'cannon', 7, 2));
  pieces.push(createPiece('red', 'cannon', 1, 7));
  pieces.push(createPiece('red', 'cannon', 7, 7));

  for (let col = 0; col < BOARD_COLS; col += 2) {
    pieces.push(createPiece('black', 'soldier', col, 3));
    pieces.push(createPiece('red', 'soldier', col, 6));
  }

  return pieces;
}

export function clonePieces(pieces: Piece[]): Piece[] {
  return pieces.map((p) => ({ ...p }));
}

export function positionEquals(a: Position, b: Position): boolean {
  return a.col === b.col && a.row === b.row;
}
