// 黑白棋 AI：
// - easy：随机
// - medium：贪心 + 位置权重 + 一步前瞻（看对手最佳回应）
// - hard：minimax + alpha-beta + 移动排序 + 终局完美搜索
//        深度 6（1 + 内部 5），剩余空格 ≤ 10 时改用完美搜索

import {
  Board,
  Player,
  BOARD_SIZE,
  getValidMoves,
  getFlips,
  makeMove,
  getScore,
  hasAnyValidMove,
} from './rules';

export type Difficulty = 'easy' | 'medium' | 'hard';

// 位置权重表（8x8）：角落最高，X 位（角落对角线邻位）最低
const POSITION_WEIGHTS: ReadonlyArray<readonly number[]> = [
  [100, -25,  10,   5,   5,  10, -25, 100],
  [-25, -50,   1,   1,   1,   1, -50, -25],
  [ 10,   1,   5,   2,   2,   5,   1,  10],
  [  5,   1,   2,   1,   1,   2,   1,   5],
  [  5,   1,   2,   1,   1,   2,   1,   5],
  [ 10,   1,   5,   2,   2,   5,   1,  10],
  [-25, -50,   1,   1,   1,   1, -50, -25],
  [100, -25,  10,   5,   5,  10, -25, 100],
];

// 四个角的位置
const CORNERS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0, BOARD_SIZE - 1],
  [BOARD_SIZE - 1, 0], [BOARD_SIZE - 1, BOARD_SIZE - 1],
];

// 评估函数各项权重
const W_MOBILITY = 5;      // 行动力差权重
const W_CORNER = 200;      // 角落控制差权重
const W_STABLE = 10;       // 稳定子差权重

// 终局完美搜索触发的剩余空格阈值
const ENDGAME_THRESHOLD = 10;
// 普通搜索内部深度（总深度 = 1 + 内部深度 = 6）
const NORMAL_INNER_DEPTH = 5;

// 计算棋盘剩余空格数
function countEmpty(board: Board): number {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) count++;
    }
  }
  return count;
}

// 角落控制差（己方占角数 - 对方占角数）
function cornerDiff(board: Board, aiColor: Player): number {
  const opponent: Player = aiColor === 1 ? 2 : 1;
  let ai = 0;
  let op = 0;
  for (const [r, c] of CORNERS) {
    if (board[r][c] === aiColor) ai++;
    else if (board[r][c] === opponent) op++;
  }
  return ai - op;
}

// 行动力差（己方合法走法数 - 对方合法走法数）
function mobilityDiff(board: Board, aiColor: Player): number {
  const opponent: Player = aiColor === 1 ? 2 : 1;
  return getValidMoves(board, aiColor).length - getValidMoves(board, opponent).length;
}

// 稳定子：判定某格在指定方向上是否封闭
// 封闭条件：出界 / 遇到已稳定子 / 沿途到边界全为非空
function isDirClosed(
  board: Board,
  stable: boolean[][],
  r: number,
  c: number,
  dr: number,
  dc: number
): boolean {
  let nr = r + dr;
  let nc = c + dc;
  while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
    if (board[nr][nc] === 0) return false;
    if (stable[nr][nc]) return true;
    nr += dr;
    nc += dc;
  }
  return true;
}

// 判定某格是否稳定：对每条轴线至少一个方向封闭
function isStableAt(
  board: Board,
  stable: boolean[][],
  r: number,
  c: number
): boolean {
  // 4 个轴：水平 / 垂直 / 主对角 / 反对角
  const axes: ReadonlyArray<readonly [readonly [number, number], readonly [number, number]]> = [
    [[0, -1], [0, 1]],
    [[-1, 0], [1, 0]],
    [[-1, -1], [1, 1]],
    [[-1, 1], [1, -1]],
  ];
  for (const [d1, d2] of axes) {
    const closed1 = isDirClosed(board, stable, r, c, d1[0], d1[1]);
    const closed2 = isDirClosed(board, stable, r, c, d2[0], d2[1]);
    if (!closed1 && !closed2) return false;
  }
  return true;
}

// 计算 player 方的稳定子数量（迭代传播，从角落向外扩散）
function countStable(board: Board, player: Player): number {
  const stable: boolean[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  );

  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === 0 || stable[r][c]) continue;
        if (isStableAt(board, stable, r, c)) {
          stable[r][c] = true;
          changed = true;
        }
      }
    }
  }

  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (stable[r][c] && board[r][c] === player) count++;
    }
  }
  return count;
}

// 稳定子差（己方 - 对方）
function stableDiff(board: Board, aiColor: Player): number {
  const opponent: Player = aiColor === 1 ? 2 : 1;
  return countStable(board, aiColor) - countStable(board, opponent);
}

// 整盘评估：位置权重 + 棋子数差 + 行动力差×5 + 角落控制×200 + 稳定子差×10
// 从 aiColor 视角，越大越有利
function evaluateBoard(board: Board, aiColor: Player): number {
  const opponent: Player = aiColor === 1 ? 2 : 1;
  let positional = 0;
  let aiCount = 0;
  let opCount = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (cell === aiColor) {
        positional += POSITION_WEIGHTS[r][c];
        aiCount++;
      } else if (cell === opponent) {
        positional -= POSITION_WEIGHTS[r][c];
        opCount++;
      }
    }
  }

  const pieceDiff = aiCount - opCount;
  const mobDiff = mobilityDiff(board, aiColor);
  const cornDiff = cornerDiff(board, aiColor);
  const stabDiff = stableDiff(board, aiColor);

  return (
    positional +
    pieceDiff +
    mobDiff * W_MOBILITY +
    cornDiff * W_CORNER +
    stabDiff * W_STABLE
  );
}

// 移动排序：按位置权重降序（角落优先），提升 alpha-beta 剪枝效率
function orderMoves(moves: Array<[number, number]>): Array<[number, number]> {
  return moves.slice().sort((a, b) => {
    return POSITION_WEIGHTS[b[0]][b[1]] - POSITION_WEIGHTS[a[0]][a[1]];
  });
}

// 终局评分：直接用棋子数差，胜方加大数保证优先选赢
function finalScore(board: Board, aiColor: Player): number {
  const { black, white } = getScore(board);
  const diff = aiColor === 1 ? black - white : white - black;
  if (diff > 0) return 100000 + diff;
  if (diff < 0) return -100000 + diff;
  return 0;
}

// minimax + alpha-beta + 移动排序
function minimax(
  board: Board,
  depth: number,
  isMaximizing: boolean,
  aiColor: Player,
  alpha: number,
  beta: number
): number {
  // 终局：双方都无棋可走
  if (!hasAnyValidMove(board, 1) && !hasAnyValidMove(board, 2)) {
    return finalScore(board, aiColor);
  }

  if (depth === 0) {
    return evaluateBoard(board, aiColor);
  }

  const currentPlayer: Player = isMaximizing
    ? aiColor
    : aiColor === 1 ? 2 : 1;

  const moves = orderMoves(getValidMoves(board, currentPlayer));

  // 当前玩家无棋可走 -> pass，换对方继续（depth 仍递减）
  if (moves.length === 0) {
    return minimax(board, depth - 1, !isMaximizing, aiColor, alpha, beta);
  }

  if (isMaximizing) {
    let best = -Infinity;
    for (const [r, c] of moves) {
      const { newBoard } = makeMove(board, r, c, currentPlayer);
      const val = minimax(newBoard, depth - 1, false, aiColor, alpha, beta);
      if (val > best) best = val;
      if (val > alpha) alpha = val;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of moves) {
      const { newBoard } = makeMove(board, r, c, currentPlayer);
      const val = minimax(newBoard, depth - 1, true, aiColor, alpha, beta);
      if (val < best) best = val;
      if (val < beta) beta = val;
      if (beta <= alpha) break;
    }
    return best;
  }
}

// easy：随机选择合法走法
function aiEasy(board: Board, player: Player): [number, number] | null {
  const moves = getValidMoves(board, player);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

// medium：贪心 + 位置权重 + 一步前瞻
// 对每个候选走法，计算己方得分（翻转数 + 位置权重），
// 再假设对手以贪心+位置权重做最佳回应，取净得分最高的走法
function aiMedium(board: Board, player: Player): [number, number] | null {
  const moves = getValidMoves(board, player);
  if (moves.length === 0) return null;

  const opponent: Player = player === 1 ? 2 : 1;

  let bestScore = -Infinity;
  let bestMove: [number, number] = moves[0];

  for (const [r, c] of moves) {
    const myFlips = getFlips(board, r, c, player);
    const myScore = myFlips.length + POSITION_WEIGHTS[r][c];

    const { newBoard } = makeMove(board, r, c, player);

    // 对手最佳回应（贪心 + 位置权重）
    // 对手无棋可走时 opBest = 0（pass，无收益也无损失）；
    // 有走法时用 -Infinity 作为初始值，确保能正确选出最大值（即使所有走法得分都为负）
    const opMoves = getValidMoves(newBoard, opponent);
    let opBest = 0;
    if (opMoves.length > 0) {
      opBest = -Infinity;
      for (const [or, oc] of opMoves) {
        const opFlips = getFlips(newBoard, or, oc, opponent);
        const opScore = opFlips.length + POSITION_WEIGHTS[or][oc];
        if (opScore > opBest) opBest = opScore;
      }
    }

    // 净得分 = 己方得分 - 对手最佳得分
    const netScore = myScore - opBest;
    if (netScore > bestScore) {
      bestScore = netScore;
      bestMove = [r, c];
    }
  }
  return bestMove;
}

// hard：minimax 深度 6（1 + 内部 5），剩余 ≤ 10 时空格改用完美搜索
function aiHard(board: Board, player: Player): [number, number] | null {
  const moves = orderMoves(getValidMoves(board, player));
  if (moves.length === 0) return null;

  const emptyCount = countEmpty(board);
  // 终局完美搜索：总深度 = 剩余空格数（外层展开 1 + 内部 empty-1）
  // 否则正常深度 6（1 + 内部 5）
  const innerDepth = emptyCount <= ENDGAME_THRESHOLD
    ? Math.max(1, emptyCount - 1)
    : NORMAL_INNER_DEPTH;

  let bestScore = -Infinity;
  let bestMove: [number, number] = moves[0];

  for (const [r, c] of moves) {
    const { newBoard } = makeMove(board, r, c, player);
    const score = minimax(newBoard, innerDepth, false, player, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }
  return bestMove;
}

// 主入口：获取 AI 落子位置
export function getAIMove(
  board: Board,
  player: Player,
  difficulty: Difficulty
): [number, number] | null {
  switch (difficulty) {
    case 'easy':
      return aiEasy(board, player);
    case 'medium':
      return aiMedium(board, player);
    case 'hard':
      return aiHard(board, player);
  }
}
