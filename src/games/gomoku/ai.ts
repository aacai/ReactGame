// 五子棋 AI：启发式评估 + 威胁检测 + 简单 minimax

import {
  Board,
  Player,
  BOARD_SIZE,
  cloneBoard,
  checkWin,
  inBoard,
} from './rules';

export type Difficulty = 'easy' | 'medium' | 'hard';

// 棋型得分表
const PATTERN_SCORES = {
  FIVE: 1_000_000,       // 五连：必胜
  OPEN_FOUR: 100_000,    // 活四：下一手必胜
  FOUR: 10_000,          // 冲四：威胁
  OPEN_THREE: 10_000,    // 活三：威胁
  THREE: 1_000,          // 眠三
  OPEN_TWO: 1_000,       // 活二
  TWO: 100,              // 眠二
  OPEN_ONE: 10,          // 活一
  ONE: 1,                // 眠一
} as const;

// 根据（连子数，开放端数）判定棋型得分
function getPatternScore(count: number, openEnds: number): number {
  if (count >= 5) return PATTERN_SCORES.FIVE;
  if (count === 4) {
    if (openEnds === 2) return PATTERN_SCORES.OPEN_FOUR;
    if (openEnds === 1) return PATTERN_SCORES.FOUR;
    return 0;
  }
  if (count === 3) {
    if (openEnds === 2) return PATTERN_SCORES.OPEN_THREE;
    if (openEnds === 1) return PATTERN_SCORES.THREE;
    return 0;
  }
  if (count === 2) {
    if (openEnds === 2) return PATTERN_SCORES.OPEN_TWO;
    if (openEnds === 1) return PATTERN_SCORES.TWO;
    return 0;
  }
  if (count === 1) {
    if (openEnds === 2) return PATTERN_SCORES.OPEN_ONE;
    if (openEnds === 1) return PATTERN_SCORES.ONE;
    return 0;
  }
  return 0;
}

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

// 评估在 (row, col) 落子（color 方）后形成的棋型总得分
// 注意：调用时 board[row][col] 应为 0，本函数将其视为 color 后评估
function evaluatePoint(board: Board, row: number, col: number, color: Player): number {
  let total = 0;
  for (const [dr, dc] of DIRECTIONS) {
    // 临时把该位置视为 color，统计连子数
    // 直接复用 countLine：先把 board[row][col] 设为 color，统计完再还原
    // 为避免修改入参，采用内联计算
    let count = 1;
    let openEnds = 0;

    let r = row + dr;
    let c = col + dc;
    while (inBoard(r, c) && board[r][c] === color) {
      count++;
      r += dr;
      c += dc;
    }
    if (inBoard(r, c) && board[r][c] === 0) openEnds++;

    r = row - dr;
    c = col - dc;
    while (inBoard(r, c) && board[r][c] === color) {
      count++;
      r -= dr;
      c -= dc;
    }
    if (inBoard(r, c) && board[r][c] === 0) openEnds++;

    total += getPatternScore(count, openEnds);
  }
  return total;
}

// 获取候选位置：已有棋子附近的空位
function getCandidates(board: Board, range = 2): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  const seen = new Set<number>();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) continue;
      for (let dr = -range; dr <= range; dr++) {
        for (let dc = -range; dc <= range; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBoard(nr, nc)) continue;
          if (board[nr][nc] !== 0) continue;
          const key = nr * BOARD_SIZE + nc;
          if (seen.has(key)) continue;
          seen.add(key);
          result.push([nr, nc]);
        }
      }
    }
  }

  // 空棋盘返回天元
  if (result.length === 0) {
    return [[Math.floor(BOARD_SIZE / 2), Math.floor(BOARD_SIZE / 2)]];
  }
  return result;
}

// 简单的整盘评估：AI 最高单点得分 - 对手最高单点得分
function evaluateBoard(board: Board, aiColor: Player): number {
  const opponent: Player = aiColor === 1 ? 2 : 1;
  const candidates = getCandidates(board, 1);

  let aiBest = 0;
  let opBest = 0;
  for (const [r, c] of candidates) {
    const aiScore = evaluatePoint(board, r, c, aiColor);
    const opScore = evaluatePoint(board, r, c, opponent);
    if (aiScore > aiBest) aiBest = aiScore;
    if (opScore > opBest) opBest = opScore;
  }
  return aiBest - opBest;
}

// 简单 minimax（带 alpha-beta 剪枝）
function minimax(
  board: Board,
  depth: number,
  isMaximizing: boolean,
  aiColor: Player,
  alpha: number,
  beta: number
): number {
  if (depth === 0) {
    return evaluateBoard(board, aiColor);
  }

  const currentColor: Player = isMaximizing ? aiColor : aiColor === 1 ? 2 : 1;
  const candidates = getCandidates(board, 1);

  // 候选裁剪：只保留得分最高的若干个
  const sorted = candidates
    .map(([r, c]) => ({
      pos: [r, c] as [number, number],
      score: evaluatePoint(board, r, c, currentColor),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.pos);

  if (sorted.length === 0) return evaluateBoard(board, aiColor);

  if (isMaximizing) {
    let best = -Infinity;
    for (const [r, c] of sorted) {
      const newBoard = cloneBoard(board);
      newBoard[r][c] = currentColor;
      if (checkWin(newBoard, r, c)) {
        return PATTERN_SCORES.FIVE;
      }
      const val = minimax(newBoard, depth - 1, false, aiColor, alpha, beta);
      if (val > best) best = val;
      if (val > alpha) alpha = val;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of sorted) {
      const newBoard = cloneBoard(board);
      newBoard[r][c] = currentColor;
      if (checkWin(newBoard, r, c)) {
        return -PATTERN_SCORES.FIVE;
      }
      const val = minimax(newBoard, depth - 1, true, aiColor, alpha, beta);
      if (val < best) best = val;
      if (val < beta) beta = val;
      if (beta <= alpha) break;
    }
    return best;
  }
}

// 主入口：获取 AI 落子位置
export function getAIMove(
  board: Board,
  color: Player,
  difficulty: Difficulty
): [number, number] | null {
  const candidates = getCandidates(board);
  if (candidates.length === 0) return null;

  const opponent: Player = color === 1 ? 2 : 1;

  // 1. 优先：自己能直接获胜
  for (const [r, c] of candidates) {
    const newBoard = cloneBoard(board);
    newBoard[r][c] = color;
    if (checkWin(newBoard, r, c)) return [r, c];
  }

  // 2. 优先：对手能直接获胜则必须防守
  for (const [r, c] of candidates) {
    const newBoard = cloneBoard(board);
    newBoard[r][c] = opponent;
    if (checkWin(newBoard, r, c)) return [r, c];
  }

  if (difficulty === 'easy') {
    // 简单：评估每个位置，从前 3 名中随机选择
    const scored = candidates.map(([r, c]) => ({
      pos: [r, c] as [number, number],
      score:
        evaluatePoint(board, r, c, color) +
        evaluatePoint(board, r, c, opponent) * 0.8,
    }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, Math.min(3, scored.length));
    return top[Math.floor(Math.random() * top.length)].pos;
  }

  if (difficulty === 'medium') {
    // 中等：进攻击略优先于防守，选最佳单点
    let bestScore = -Infinity;
    let bestMove: [number, number] = candidates[0];
    for (const [r, c] of candidates) {
      const attack = evaluatePoint(board, r, c, color);
      const defense = evaluatePoint(board, r, c, opponent);
      const score = attack * 1.1 + defense;
      if (score > bestScore) {
        bestScore = score;
        bestMove = [r, c];
      }
    }
    return bestMove;
  }

  // hard：minimax 深度 2
  const sortedCandidates = candidates
    .map(([r, c]) => ({
      pos: [r, c] as [number, number],
      score:
        evaluatePoint(board, r, c, color) + evaluatePoint(board, r, c, opponent),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => item.pos);

  let bestScore = -Infinity;
  let bestMove: [number, number] = sortedCandidates[0];

  for (const [r, c] of sortedCandidates) {
    const newBoard = cloneBoard(board);
    newBoard[r][c] = color;
    // 已经在上面检查过直接获胜，这里直接进入对手回合
    const score = minimax(newBoard, 1, false, color, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }

  return bestMove;
}
