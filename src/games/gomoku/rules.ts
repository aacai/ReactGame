// 五子棋规则引擎

// 棋盘大小：15x15
export const BOARD_SIZE = 15;

// 棋子颜色：0 空 / 1 黑 / 2 白
export type Cell = 0 | 1 | 2;
export type Player = 1 | 2;

// 棋盘类型：二维数组
export type Board = Cell[][];

// 四个方向：横、竖、右斜、左斜
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

// 创建空棋盘
export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0 as Cell)
  );
}

// 检查位置是否在棋盘范围内
export function inBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// 检查是否可落子（位置合法且为空）
export function isValidMove(board: Board, row: number, col: number): boolean {
  if (!inBoard(row, col)) return false;
  return board[row][col] === 0;
}

// 克隆棋盘
export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice() as Cell[]);
}

// 检查在 (row, col) 落子后是否胜利（5 子连珠）
export function checkWin(board: Board, row: number, col: number): boolean {
  if (!inBoard(row, col)) return false;
  const color = board[row][col];
  if (color === 0) return false;

  for (const [dr, dc] of DIRECTIONS) {
    let count = 1; // 当前落子算 1 个

    // 正方向延伸
    let r = row + dr;
    let c = col + dc;
    while (inBoard(r, c) && board[r][c] === color) {
      count++;
      r += dr;
      c += dc;
    }

    // 反方向延伸
    r = row - dr;
    c = col - dc;
    while (inBoard(r, c) && board[r][c] === color) {
      count++;
      r -= dr;
      c -= dc;
    }

    if (count >= 5) return true;
  }
  return false;
}

// 检查棋盘是否已满（平局）
export function isBoardFull(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  return true;
}

// 统计在 (row, col) 落子后，沿指定方向形成的连子数与开放端数
// 返回 { count, openEnds }：count 含当前落子，openEnds 为 0/1/2
export function countLine(
  board: Board,
  row: number,
  col: number,
  dr: number,
  dc: number
): { count: number; openEnds: number } {
  const color = board[row][col];
  if (color === 0) return { count: 0, openEnds: 0 };

  let count = 1;
  let openEnds = 0;

  // 正方向
  let r = row + dr;
  let c = col + dc;
  while (inBoard(r, c) && board[r][c] === color) {
    count++;
    r += dr;
    c += dc;
  }
  if (inBoard(r, c) && board[r][c] === 0) openEnds++;

  // 反方向
  r = row - dr;
  c = col - dc;
  while (inBoard(r, c) && board[r][c] === color) {
    count++;
    r -= dr;
    c -= dc;
  }
  if (inBoard(r, c) && board[r][c] === 0) openEnds++;

  return { count, openEnds };
}

// 简单禁手检测（仅对黑方）：
// - 三三：同时形成两个活三
// - 四四：同时形成两个冲四/活四
// - 长连：6 子以上连珠
// 返回 true 表示该落子为禁手
export function isForbidden(board: Board, row: number, col: number): boolean {
  if (!inBoard(row, col) || board[row][col] !== 1) return false;

  let openThreeCount = 0;
  let fourCount = 0;

  for (const [dr, dc] of DIRECTIONS) {
    const { count, openEnds } = countLine(board, row, col, dr, dc);

    // 长连禁手
    if (count >= 6) return true;

    // 活三
    if (count === 3 && openEnds === 2) openThreeCount++;
    // 冲四或活四
    if (count === 4 && openEnds >= 1) fourCount++;
  }

  // 四四禁手
  if (fourCount >= 2) return true;
  // 三三禁手
  if (openThreeCount >= 2) return true;

  return false;
}
