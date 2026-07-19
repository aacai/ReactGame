// 军棋暗棋规则引擎
// 棋盘：4 列 × 8 行 = 32 格
// 32 子（每方 16 子）随机扣置于棋盘

import type { Piece, PieceColor, PieceRank, Position } from './types';
import { RANK_VALUES } from './types';

// 棋盘尺寸
export const BOARD_COLS = 4;
export const BOARD_ROWS = 8;

// 每方棋子配置（共 16 子 × 2 = 32 子）
// 1+1+2+2+1+1+1+1+1+2+2+1 = 16
const PIECE_CONFIG: Array<{ rank: PieceRank; count: number }> = [
  { rank: 'commander', count: 1 },   // 司令
  { rank: 'army', count: 1 },        // 军长
  { rank: 'division', count: 2 },    // 师长
  { rank: 'brigade', count: 2 },     // 旅长
  { rank: 'regiment', count: 1 },    // 团长
  { rank: 'battalion', count: 1 },   // 营长
  { rank: 'company', count: 1 },     // 连长
  { rank: 'platoon', count: 1 },     // 排长
  { rank: 'engineer', count: 1 },    // 工兵
  { rank: 'bomb', count: 2 },        // 炸弹
  { rank: 'mine', count: 2 },        // 地雷
  { rank: 'flag', count: 1 },        // 军旗
];

// 棋子 ID 计数器
let pieceIdCounter = 0;

// 判断位置是否在棋盘内
export function isInBoard(col: number, row: number): boolean {
  return col >= 0 && col < BOARD_COLS && row >= 0 && row < BOARD_ROWS;
}

// 深拷贝棋子数组
export function clonePieces(pieces: Piece[]): Piece[] {
  return pieces.map((p) => ({ ...p }));
}

// 获取指定位置的棋子
export function getPieceAt(pieces: Piece[], col: number, row: number): Piece | undefined {
  return pieces.find((p) => p.col === col && p.row === row);
}

// 创建初始棋盘：32 子随机扣置
export function createInitialBoard(): Piece[] {
  pieceIdCounter = 0;
  const pieces: Piece[] = [];

  // 红蓝双方各按配置生成
  const colors: Array<'red' | 'blue'> = ['red', 'blue'];
  for (const color of colors) {
    for (const { rank, count } of PIECE_CONFIG) {
      for (let i = 0; i < count; i++) {
        pieceIdCounter += 1;
        pieces.push({
          id: `${color}-${rank}-${pieceIdCounter}`,
          color,
          rank,
          col: -1,
          row: -1,
          revealed: false,
        });
      }
    }
  }

  // 生成所有棋盘位置
  const positions: Array<{ col: number; row: number }> = [];
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      positions.push({ col, row });
    }
  }

  // Fisher-Yates 洗牌
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // 分配位置
  for (let i = 0; i < pieces.length; i++) {
    pieces[i].col = positions[i].col;
    pieces[i].row = positions[i].row;
  }

  return pieces;
}

// 判断棋子是否可移动（军旗、地雷不能移动；未翻开的棋子不能移动）
export function canMove(piece: Piece): boolean {
  if (!piece.revealed) return false;
  if (piece.rank === 'flag' || piece.rank === 'mine') return false;
  return true;
}

// 获取已翻开己方棋子的合法走法（一格上下左右）
// - 空位：可移动
// - 已翻开的敌方棋子：可攻击
// - 未翻开的棋子：不能移动到该位置
export function getValidMoves(pieces: Piece[], col: number, row: number): Position[] {
  const piece = getPieceAt(pieces, col, row);
  if (!piece) return [];
  if (!canMove(piece)) return [];

  const moves: Position[] = [];
  const dirs = [
    { dc: 0, dr: -1 },  // 上
    { dc: 0, dr: 1 },   // 下
    { dc: -1, dr: 0 },  // 左
    { dc: 1, dr: 0 },   // 右
  ];

  for (const dir of dirs) {
    const nc = col + dir.dc;
    const nr = row + dir.dr;
    if (!isInBoard(nc, nr)) continue;

    const target = getPieceAt(pieces, nc, nr);
    if (!target) {
      // 空位：可移动
      moves.push({ col: nc, row: nr });
    } else if (target.revealed && target.color !== piece.color) {
      // 已翻开的敌方棋子：可攻击
      moves.push({ col: nc, row: nr });
    }
    // 未翻开的棋子：不能攻击，跳过
  }

  return moves;
}

// 战斗结果
export type BattleResult =
  | 'attacker_wins'    // 攻击方胜（防守方死）
  | 'defender_wins'    // 防守方胜（攻击方死）
  | 'both_die'         // 同归于尽
  | 'flag_captured';   // 军旗被吃（攻击方胜，游戏结束）

// 战斗规则
// - 炸弹碰任何子：双方都死
// - 工兵碰地雷：地雷死，工兵活
// - 其他棋子碰地雷：攻击方死
// - 大子吃小子：小子死
// - 同级：双方都死
// - 吃军旗：攻击方胜（游戏结束）
export function battle(attacker: Piece, defender: Piece): BattleResult {
  // 炸弹：与任何棋子同归于尽
  if (attacker.rank === 'bomb' || defender.rank === 'bomb') {
    return 'both_die';
  }

  // 工兵挖地雷：地雷死，工兵活
  if (attacker.rank === 'engineer' && defender.rank === 'mine') {
    return 'attacker_wins';
  }

  // 其他棋子碰地雷：攻击方死
  if (defender.rank === 'mine') {
    return 'defender_wins';
  }

  // 吃军旗：攻击方胜，游戏结束
  if (defender.rank === 'flag') {
    return 'flag_captured';
  }

  // 大子吃小子，同级同归于尽
  const atkVal = RANK_VALUES[attacker.rank];
  const defVal = RANK_VALUES[defender.rank];

  if (atkVal > defVal) return 'attacker_wins';
  if (atkVal < defVal) return 'defender_wins';
  return 'both_die';
}

// 检查军旗胜负（仅检查军旗是否被吃）
export function checkWin(pieces: Piece[]): {
  winner: 'red' | 'blue' | null;
  reason: string | null;
  isDraw: boolean;
} {
  const redFlag = pieces.find((p) => p.color === 'red' && p.rank === 'flag');
  const blueFlag = pieces.find((p) => p.color === 'blue' && p.rank === 'flag');

  if (!redFlag && !blueFlag) {
    return { winner: null, reason: '双方军旗均被吃', isDraw: true };
  }
  if (!redFlag) {
    return { winner: 'blue', reason: '红方军旗被吃', isDraw: false };
  }
  if (!blueFlag) {
    return { winner: 'red', reason: '蓝方军旗被吃', isDraw: false };
  }

  return { winner: null, reason: null, isDraw: false };
}

// 检查某方是否还有可用的动作（翻棋或走棋）
export function hasValidActions(pieces: Piece[], color: 'red' | 'blue'): boolean {
  // 任何未翻开的棋子都可以翻
  if (pieces.some((p) => !p.revealed)) return true;

  // 己方已翻开的可移动棋子
  for (const piece of pieces) {
    if (piece.color === color && piece.revealed && canMove(piece)) {
      if (getValidMoves(pieces, piece.col, piece.row).length > 0) return true;
    }
  }

  return false;
}

// 综合判断游戏是否结束：军旗胜负 + 下一方是否有棋可走
export function checkGameOver(pieces: Piece[], nextColor: 'red' | 'blue'): {
  winner: 'red' | 'blue' | null;
  reason: string | null;
  isDraw: boolean;
} {
  // 先检查军旗
  const flagCheck = checkWin(pieces);
  if (flagCheck.winner || flagCheck.isDraw) {
    return flagCheck;
  }

  // 检查下一方是否有棋可走
  if (!hasValidActions(pieces, nextColor)) {
    const winner: 'red' | 'blue' = nextColor === 'red' ? 'blue' : 'red';
    return {
      winner,
      reason: `${nextColor === 'red' ? '红' : '蓝'}方无棋可走`,
      isDraw: false,
    };
  }

  return { winner: null, reason: null, isDraw: false };
}

// 动作类型：翻棋 或 走棋
export type Action =
  | { type: 'flip'; col: number; row: number }
  | { type: 'move'; from: Position; to: Position };

// 获取某方的所有合法动作（翻棋 + 走棋）
export function getAllValidActions(pieces: Piece[], color: 'red' | 'blue'): Action[] {
  const actions: Action[] = [];

  // 翻棋：所有未翻开的棋子
  for (const piece of pieces) {
    if (!piece.revealed) {
      actions.push({ type: 'flip', col: piece.col, row: piece.row });
    }
  }

  // 走棋：己方已翻开且可移动的棋子
  for (const piece of pieces) {
    if (piece.color === color && piece.revealed && canMove(piece)) {
      const moves = getValidMoves(pieces, piece.col, piece.row);
      for (const move of moves) {
        actions.push({
          type: 'move',
          from: { col: piece.col, row: piece.row },
          to: move,
        });
      }
    }
  }

  return actions;
}
