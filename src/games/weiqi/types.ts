// 围棋（Weiqi/Go）类型定义

// 棋子颜色：空 / 黑 / 白
export type StoneColor = 'empty' | 'black' | 'white';

// 棋盘：19x19 二维数组
// board[row][col]，row 为纵坐标（0-18，从上到下），col 为横坐标（0-18，从左到右）
export type Board = StoneColor[][];

// 坐标点
export interface Position {
  col: number;
  row: number;
}

// 一手棋的记录
export interface Move {
  col: number;
  row: number;
  color: StoneColor;
  // 该手提掉的对方子位置列表
  captured?: Position[];
  // 是否为弃权（停一手）
  pass?: boolean;
}

// 提子记录：分别记录黑方提走的白子数 / 白方提走的黑子数
export interface Captures {
  black: number; // 黑方提走的白子数
  white: number; // 白方提走的黑子数
}

// 难度
export type Difficulty = 'easy' | 'medium' | 'hard';

// 游戏状态
export type GameStatus = 'playing' | 'finished';

// 胜方
export type Winner = 'black' | 'white' | null;

// 数子计分结果
export interface ScoreResult {
  black: number; // 黑方得分
  white: number; // 白方得分（含贴目）
  blackStones: number; // 黑子数
  whiteStones: number; // 白子数
  blackTerritory: number; // 黑围空
  whiteTerritory: number; // 白围空
  capturedByBlack: number; // 黑方提子数
  capturedByWhite: number; // 白方提子数
  komi: number; // 贴目
}
