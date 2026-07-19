// 黑白棋（Othello/Reversi）规则引擎

// 棋盘大小：8x8
export const BOARD_SIZE = 8;

// 棋子颜色：0 空 / 1 黑 / 2 白
export type Cell = 0 | 1 | 2;
export type Player = 1 | 2;

// 棋盘类型：二维数组
export type Board = Cell[][];

// 8 个方向：横、竖、两条对角线
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

// 创建初始棋盘：中心 4 子
// (3,3)白 (3,4)黑 (4,3)黑 (4,4)白
export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0 as Cell)
  );
  board[3][3] = 2;
  board[3][4] = 1;
  board[4][3] = 1;
  board[4][4] = 2;
  return board;
}

// 克隆棋盘
export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice() as Cell[]);
}

// 检查位置是否在棋盘范围内
export function inBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// 计算在 (row, col) 落子（player 方）后会翻转的所有对方棋子位置
// 返回翻转位置数组（不含落子点本身）；若位置不为空或不能翻转，返回空数组
export function getFlips(
  board: Board,
  row: number,
  col: number,
  player: Player
): Array<[number, number]> {
  if (!inBoard(row, col) || board[row][col] !== 0) return [];

  const opponent: Player = player === 1 ? 2 : 1;
  const flips: Array<[number, number]> = [];

  for (const [dr, dc] of DIRECTIONS) {
    const lineFlips: Array<[number, number]> = [];
    let r = row + dr;
    let c = col + dc;
    // 沿方向收集连续的对方棋子
    while (inBoard(r, c) && board[r][c] === opponent) {
      lineFlips.push([r, c]);
      r += dr;
      c += dc;
    }
    // 末端是己方棋子，则这条线上的对方棋子全部翻转
    if (lineFlips.length > 0 && inBoard(r, c) && board[r][c] === player) {
      flips.push(...lineFlips);
    }
  }

  return flips;
}

// 判断 (row, col) 是否为 player 的合法落子
export function isValidMove(
  board: Board,
  row: number,
  col: number,
  player: Player
): boolean {
  return getFlips(board, row, col, player).length > 0;
}

// 获取 player 所有合法落子位置
export function getValidMoves(
  board: Board,
  player: Player
): Array<[number, number]> {
  const moves: Array<[number, number]> = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== 0) continue;
      if (isValidMove(board, r, c, player)) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

// 判断 player 是否还有任何合法落子（用于判断是否需要 pass）
export function hasAnyValidMove(board: Board, player: Player): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== 0) continue;
      if (isValidMove(board, r, c, player)) return true;
    }
  }
  return false;
}

// 落子：返回新棋盘和被翻转的位置数组
export function makeMove(
  board: Board,
  row: number,
  col: number,
  player: Player
): { newBoard: Board; flips: Array<[number, number]> } {
  const flips = getFlips(board, row, col, player);
  const newBoard = cloneBoard(board);
  newBoard[row][col] = player;
  for (const [r, c] of flips) {
    newBoard[r][c] = player;
  }
  return { newBoard, flips };
}

// 统计比分
export function getScore(board: Board): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 1) black++;
      else if (board[r][c] === 2) white++;
    }
  }
  return { black, white };
}

// 检查游戏是否结束
// 双方都无棋可走时结束，返回胜方或平局；否则返回 null
export function checkGameOver(
  board: Board
): 'black' | 'white' | 'draw' | null {
  const blackCanMove = hasAnyValidMove(board, 1);
  const whiteCanMove = hasAnyValidMove(board, 2);
  if (blackCanMove || whiteCanMove) return null;

  const { black, white } = getScore(board);
  if (black > white) return 'black';
  if (white > black) return 'white';
  return 'draw';
}
