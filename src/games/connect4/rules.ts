// 四子棋规则引擎

// 棋盘大小：7列 x 6行
export const COLS = 7;
export const ROWS = 6;

// 棋子颜色：0 空 / 1 红 / 2 黄
export type Cell = 0 | 1 | 2;
export type Player = 1 | 2;

// 棋盘类型：board[row][col]，row 0 在顶部，row 5 在底部
export type Board = Cell[][];

// 四个方向：横、竖、右斜（↘）、左斜（↙）
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

// 检查位置是否在棋盘范围内
export function inBoard(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

// 创建空棋盘
export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 0 as Cell)
  );
}

// 克隆棋盘
export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice() as Cell[]);
}

// 返回该列可下落的行号（重力下落到最底空位），-1 表示列已满
// 由于 row 0 在顶部、row 5 在底部，棋子会落到最大索引的空行
export function getDropRow(board: Board, col: number): number {
  if (col < 0 || col >= COLS) return -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) return r;
  }
  return -1;
}

// 检查是否可下子（列合法且未满）
export function isValidMove(board: Board, col: number): boolean {
  return getDropRow(board, col) !== -1;
}

// 返回所有可下子的列号
export function getValidMoves(board: Board): number[] {
  const result: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (isValidMove(board, c)) result.push(c);
  }
  return result;
}

// 在 col 列下子（player 方），返回 { newBoard, row }
// row 为 -1 表示非法下子（列已满），newBoard 不会改变
export function makeMove(
  board: Board,
  col: number,
  player: Player
): { newBoard: Board; row: number } {
  const row = getDropRow(board, col);
  const newBoard = cloneBoard(board);
  if (row !== -1) {
    newBoard[row][col] = player;
  }
  return { newBoard, row };
}

// 检查在 (row, col) 落子后是否四连
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

    if (count >= 4) return true;
  }
  return false;
}

// 返回获胜的 4 个位置数组（用于高亮），未胜返回 []
// 若同方向连子超过 4，返回首个四连段
export function getWinningLine(
  board: Board,
  row: number,
  col: number
): Array<{ row: number; col: number }> {
  if (!inBoard(row, col)) return [];
  const color = board[row][col];
  if (color === 0) return [];

  for (const [dr, dc] of DIRECTIONS) {
    const line: Array<{ row: number; col: number }> = [{ row, col }];

    // 正方向延伸
    let r = row + dr;
    let c = col + dc;
    while (inBoard(r, c) && board[r][c] === color) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    // 反方向延伸（插入到头部，保持顺序）
    r = row - dr;
    c = col - dc;
    while (inBoard(r, c) && board[r][c] === color) {
      line.unshift({ row: r, col: c });
      r -= dr;
      c -= dc;
    }

    if (line.length >= 4) {
      return line.slice(0, 4);
    }
  }
  return [];
}

// 棋盘是否已满（平局判断）
// 只需检查顶行是否全部非空
export function isBoardFull(board: Board): boolean {
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === 0) return false;
  }
  return true;
}
