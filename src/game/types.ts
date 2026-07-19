export type PieceColor = 'red' | 'black';

export type PieceType = 'king' | 'advisor' | 'elephant' | 'horse' | 'chariot' | 'cannon' | 'soldier';

export interface Piece {
  id: string;
  color: PieceColor;
  type: PieceType;
  col: number;
  row: number;
}

export interface Position {
  col: number;
  row: number;
}

export interface MoveHistory {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
}

export const PIECE_NAMES: Record<PieceColor, Record<PieceType, string>> = {
  red: {
    king: '帅',
    advisor: '仕',
    elephant: '相',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '兵',
  },
  black: {
    king: '将',
    advisor: '士',
    elephant: '象',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '卒',
  },
};
