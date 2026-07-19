// 国际象棋（Chess）类型定义

// 棋子颜色：白方在下，黑方在上
export type PieceColor = 'white' | 'black';

// 棋子类型
export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

// 棋子接口：hasMoved 用于王车易位判断（王和车是否移动过）
export interface Piece {
  id: string;
  color: PieceColor;
  type: PieceType;
  col: number;
  row: number;
  hasMoved: boolean;
}

export interface Position {
  col: number;
  row: number;
}

// 王车易位权利
export interface CastlingRights {
  whiteKingSide: boolean;   // 白方短易位
  whiteQueenSide: boolean;  // 白方长易位
  blackKingSide: boolean;   // 黑方短易位
  blackQueenSide: boolean;  // 黑方长易位
}

// 走棋记录
export interface MoveHistory {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  currentPlayerBefore: PieceColor;
  // 升变后的类型（若有）
  promotion?: PieceType;
  // 是否为王车易位
  isCastling?: boolean;
  // 是否为过路兵吃子
  isEnPassant?: boolean;
}

// 棋子的 Unicode 符号
export const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
};

// 棋子中文名
export const PIECE_NAMES: Record<PieceColor, Record<PieceType, string>> = {
  white: {
    king: '白王',
    queen: '白后',
    rook: '白车',
    bishop: '白象',
    knight: '白马',
    pawn: '白兵',
  },
  black: {
    king: '黑王',
    queen: '黑后',
    rook: '黑车',
    bishop: '黑象',
    knight: '黑马',
    pawn: '黑兵',
  },
};
