// 日本将棋（Shogi/将棋）类型定义
// 棋盘 9x9：row 0 在顶部（后手 gote 起始区），row 8 在底部（先手 sente 起始区）
// 先手 sente 朝上方推进（row 减小），后手 gote 朝下方推进（row 增大）

// 棋子颜色：sente=先手（下方），gote=后手（上方）
export type PieceColor = 'sente' | 'gote';

// 棋子种类（与升变无关，仅表示基础类型）
export type PieceType =
  | 'king'    // 王/玉（王将/玉将）
  | 'rook'    // 飞车
  | 'bishop'  // 角行
  | 'gold'    // 金将
  | 'silver'  // 银将
  | 'knight'  // 桂马
  | 'lance'   // 香车
  | 'pawn';   // 步兵

export interface Piece {
  id: string;
  color: PieceColor;
  type: PieceType;
  col: number;
  row: number;
  // 是否已升变（成る）
  promoted: boolean;
}

export interface Position {
  col: number;
  row: number;
}

// 持驹（持ち駒）：手中有几枚同类型棋子
export interface HandPiece {
  type: PieceType; // 持驹一定未升变（被打入时回到原始状态）
  count: number;
}

// 双方持驹
export type Hand = Record<PieceColor, HandPiece[]>;

// 棋子显示文字
// 升变后文字：飛→龍, 角→馬, 銀→全, 桂→圭, 香→杏, 歩→と
export const PIECE_NAMES: Record<PieceType, string> = {
  king: '王',
  rook: '飛',
  bishop: '角',
  gold: '金',
  silver: '銀',
  knight: '桂',
  lance: '香',
  pawn: '歩',
};

// 升变后的棋子文字
export const PROMOTED_NAMES: Record<PieceType, string> = {
  king: '王',   // 王不升变
  rook: '龍',   // 龙王
  bishop: '馬', // 龙马
  gold: '金',   // 金不升变
  silver: '全', // 成银
  knight: '圭', // 成桂
  lance: '杏',  // 成香
  pawn: 'と',   // と金
};
