// 军棋暗棋（翻棋）类型定义
// 棋盘：4 列 × 8 行 = 32 格，正好放 32 子
// 每方 16 子，扣置随机分布于棋盘

// 棋子颜色：unknown 表示尚未翻开（仅用于类型与显示语义）
// 实际存储时 piece.color 始终为 'red' 或 'blue'，是否翻开由 revealed 字段表示
export type PieceColor = 'red' | 'blue' | 'unknown';

// 棋子军衔
export type PieceRank =
  | 'commander'   // 司令
  | 'army'        // 军长
  | 'division'    // 师长
  | 'brigade'     // 旅长
  | 'regiment'    // 团长
  | 'battalion'   // 营长
  | 'company'     // 连长
  | 'platoon'     // 排长
  | 'engineer'    // 工兵
  | 'bomb'        // 炸弹
  | 'mine'        // 地雷
  | 'flag';       // 军旗

// 棋子接口
export interface Piece {
  id: string;
  color: PieceColor;  // 真实颜色（始终为 'red' 或 'blue'）
  rank: PieceRank;
  col: number;
  row: number;
  revealed: boolean;  // 是否已翻开
}

export interface Position {
  col: number;
  row: number;
}

// 军衔数值：工兵 32 ... 司令 40
// 炸弹、地雷、军旗为特殊棋子，使用哨兵值标识（不参与大小比较）
export const RANK_VALUES: Record<PieceRank, number> = {
  engineer: 32,
  platoon: 33,
  company: 34,
  battalion: 35,
  regiment: 36,
  brigade: 37,
  division: 38,
  army: 39,
  commander: 40,
  bomb: -1,    // 炸弹
  mine: -2,    // 地雷
  flag: 0,     // 军旗
};

// 军衔显示文字
export const RANK_NAMES: Record<PieceRank, string> = {
  commander: '司令',
  army: '军长',
  division: '师长',
  brigade: '旅长',
  regiment: '团长',
  battalion: '营长',
  company: '连长',
  platoon: '排长',
  engineer: '工兵',
  bomb: '炸弹',
  mine: '地雷',
  flag: '军旗',
};
