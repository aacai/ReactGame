// 围棋规则引擎
// 实现要点：
// 1. 19x19 棋盘，黑白交替落子（黑先）
// 2. 棋子有"气"（liberty）：连通同色棋块相邻的空交叉点
// 3. 落子后先检查相邻对方棋块是否无气，无气则提子
// 4. 提子后若自己仍无气，则为禁着点（自杀）
// 5. 劫（ko）：不能立即恢复上一手的棋盘状态（用 koPoint 简化判定）

import type { Board, StoneColor, Position, Captures, ScoreResult } from './types';

// 棋盘大小
export const BOARD_SIZE = 19;

// 贴目（白方让目）
export const KOMI = 6.5;

// 四邻方向
const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

// 检查坐标是否在棋盘内
export function inBoard(col: number, row: number): boolean {
  return col >= 0 && col < BOARD_SIZE && row >= 0 && row < BOARD_SIZE;
}

// 创建空棋盘
export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 'empty' as StoneColor)
  );
}

// 克隆棋盘
export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

// 获取 (col, row) 所在连通棋块（同色相邻）的所有点
// 若该点为空，返回空数组
export function getGroup(board: Board, col: number, row: number): Position[] {
  if (!inBoard(col, row)) return [];
  const color = board[row][col];
  if (color === 'empty') return [];

  const result: Position[] = [];
  const visited = new Set<string>();
  const stack: Position[] = [{ col, row }];
  visited.add(`${col},${row}`);

  while (stack.length > 0) {
    const cur = stack.pop()!;
    result.push(cur);
    for (const [dc, dr] of NEIGHBORS) {
      const nc = cur.col + dc;
      const nr = cur.row + dr;
      if (!inBoard(nc, nr)) continue;
      const key = `${nc},${nr}`;
      if (visited.has(key)) continue;
      if (board[nr][nc] === color) {
        visited.add(key);
        stack.push({ col: nc, row: nr });
      }
    }
  }

  return result;
}

// 获取 (col, row) 所在棋块的气数（所有相邻空点）
// 同时返回气的具体位置（去重）
export function getLiberties(board: Board, col: number, row: number): {
  count: number;
  points: Position[];
} {
  const group = getGroup(board, col, row);
  if (group.length === 0) return { count: 0, points: [] };

  const libertySet = new Set<string>();
  const points: Position[] = [];

  for (const pos of group) {
    for (const [dc, dr] of NEIGHBORS) {
      const nc = pos.col + dc;
      const nr = pos.row + dr;
      if (!inBoard(nc, nr)) continue;
      if (board[nr][nc] !== 'empty') continue;
      const key = `${nc},${nr}`;
      if (libertySet.has(key)) continue;
      libertySet.add(key);
      points.push({ col: nc, row: nr });
    }
  }

  return { count: points.length, points };
}

// 落子并处理提子，返回新棋盘与被提子的位置列表
// 注意：本函数不做合法性检查，假定调用方已确认合法
// 仍会处理"自杀"情况：若落子后己方无气且未提子，返回 null（视为禁着点）
export function placeStone(
  board: Board,
  col: number,
  row: number,
  color: StoneColor
): { board: Board; captured: Position[] } | null {
  if (!inBoard(col, row)) return null;
  if (board[row][col] !== 'empty') return null;
  if (color === 'empty') return null;

  const newBoard = cloneBoard(board);
  newBoard[row][col] = color;

  const opponent: StoneColor = color === 'black' ? 'white' : 'black';
  const captured: Position[] = [];

  // 检查相邻的对方棋块，无气则提
  for (const [dc, dr] of NEIGHBORS) {
    const nc = col + dc;
    const nr = row + dr;
    if (!inBoard(nc, nr)) continue;
    if (newBoard[nr][nc] !== opponent) continue;

    const libs = getLiberties(newBoard, nc, nr);
    if (libs.count === 0) {
      const group = getGroup(newBoard, nc, nr);
      for (const p of group) {
        newBoard[p.row][p.col] = 'empty';
        captured.push(p);
      }
    }
  }

  // 提子后检查自己是否仍有气；无气则为禁着点（自杀）
  const selfLibs = getLiberties(newBoard, col, row);
  if (selfLibs.count === 0) {
    return null;
  }

  return { board: newBoard, captured };
}

// 判断一手棋是否合法
// 不合法的情况：超出棋盘 / 已有子 / 劫点 / 自杀
export function isLegalMove(
  board: Board,
  col: number,
  row: number,
  color: StoneColor,
  koPoint?: Position | null
): boolean {
  if (!inBoard(col, row)) return false;
  if (board[row][col] !== 'empty') return false;
  if (color === 'empty') return false;

  // 劫点禁着
  if (koPoint && koPoint.col === col && koPoint.row === row) return false;

  // 尝试落子：若返回 null 则为自杀（禁着）
  const result = placeStone(board, col, row, color);
  if (result === null) return false;

  return true;
}

// 判定落子后是否形成劫点
// 劫的形成条件：本手提走恰好 1 子，且本手所下之子自身为孤立单子（棋块大小 1）且仅有 1 口气
// 此时被提走的位置就是下一手的劫点（对方不能立即回提）
export function detectKo(
  boardBefore: Board,
  boardAfter: Board,
  moveCol: number,
  moveRow: number,
  captured: Position[]
): Position | null {
  if (captured.length !== 1) return null;

  // 检查落子后该子所在棋块是否为单子
  const group = getGroup(boardAfter, moveCol, moveRow);
  if (group.length !== 1) return null;

  // 检查该子是否恰好 1 口气
  const libs = getLiberties(boardAfter, moveCol, moveRow);
  if (libs.count !== 1) return null;

  // 劫点就是被提走的那一子位置
  return { col: captured[0].col, row: captured[0].row };
}

// 简单数子计分（地域法）：
// 黑方得分 = 黑子数 + 黑围空 + 提白数
// 白方得分 = 白子数 + 白围空 + 提黑数 + 贴目(6.5)
// 围空：仅与单一颜色相邻的空区域归属于该颜色；同时相邻两色则为公气（不归属）
export function calculateScore(board: Board, captures: Captures): ScoreResult {
  let blackStones = 0;
  let whiteStones = 0;
  let blackTerritory = 0;
  let whiteTerritory = 0;

  // 统计棋子数
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (cell === 'black') blackStones++;
      else if (cell === 'white') whiteStones++;
    }
  }

  // 用 BFS 遍历每个空区域，判断其归属
  const visited = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  );

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== 'empty') continue;
      if (visited[r][c]) continue;

      // BFS 收集该空区域，并记录相邻颜色
      const region: Position[] = [];
      const borderColors = new Set<StoneColor>();
      const stack: Position[] = [{ col: c, row: r }];
      visited[r][c] = true;

      while (stack.length > 0) {
        const cur = stack.pop()!;
        region.push(cur);

        for (const [dc, dr] of NEIGHBORS) {
          const nc = cur.col + dc;
          const nr = cur.row + dr;
          if (!inBoard(nc, nr)) continue;
          const cell = board[nr][nc];
          if (cell === 'empty') {
            if (!visited[nr][nc]) {
              visited[nr][nc] = true;
              stack.push({ col: nc, row: nr });
            }
          } else {
            borderColors.add(cell);
          }
        }
      }

      // 仅与一种颜色相邻：归属该颜色
      if (borderColors.size === 1) {
        const only = borderColors.values().next().value as StoneColor;
        if (only === 'black') {
          blackTerritory += region.length;
        } else if (only === 'white') {
          whiteTerritory += region.length;
        }
      }
    }
  }

  const blackScore = blackStones + blackTerritory + captures.black;
  const whiteScore = whiteStones + whiteTerritory + captures.white + KOMI;

  return {
    black: blackScore,
    white: whiteScore,
    blackStones,
    whiteStones,
    blackTerritory,
    whiteTerritory,
    capturedByBlack: captures.black,
    capturedByWhite: captures.white,
    komi: KOMI,
  };
}
