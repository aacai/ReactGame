// 韩国象棋（Janggi/장기）类型定义

// 棋子颜色：韩国象棋使用红蓝双方（对应传统楚汉，这里用红代表漢，蓝代表楚）
export type PieceColor = 'red' | 'blue';

// 棋子类型
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
  currentPlayerBefore: PieceColor;
}

// 棋子显示文字：红方用"兵"，蓝方用"卒"以区分
export const PIECE_NAMES: Record<PieceColor, Record<PieceType, string>> = {
  red: {
    king: '王',
    advisor: '士',
    elephant: '象',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '兵',
  },
  blue: {
    king: '王',
    advisor: '士',
    elephant: '象',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '卒',
  },
};
