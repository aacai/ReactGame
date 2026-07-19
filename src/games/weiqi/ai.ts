// 围棋 AI：启发式评估
// 三档难度：
// - easy：从合法点中随机选一个
// - medium：基本启发式（提子、救子、攻击、要点）
// - hard：在 medium 基础上做更深的候选评估（1 层对手反击模拟）

import type { Board, StoneColor, Position } from './types';
import {
  BOARD_SIZE,
  inBoard,
  placeStone,
  isLegalMove,
  getLiberties,
  getGroup,
} from './rules';

export type Difficulty = 'easy' | 'medium' | 'hard';

// 四邻方向
const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

// 9 个标准星位（0-indexed：4-4, 4-10, 4-16, 10-4, 10-10, 10-16, 16-4, 16-10, 16-16）
const STAR_POINTS: ReadonlyArray<readonly [number, number]> = [
  [3, 3],
  [3, 9],
  [3, 15],
  [9, 3],
  [9, 9],
  [9, 15],
  [15, 3],
  [15, 9],
  [15, 15],
];

// 收集所有合法落子点
export function getAllLegalMoves(
  board: Board,
  color: StoneColor,
  koPoint?: Position | null
): Position[] {
  const result: Position[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== 'empty') continue;
      if (!isLegalMove(board, c, r, color, koPoint)) continue;
      result.push({ col: c, row: r });
    }
  }
  return result;
}

// 获取候选位置：已有棋子附近的空位（限定搜索范围，提高效率）
function getCandidates(
  board: Board,
  range: number,
  color: StoneColor,
  koPoint?: Position | null
): Position[] {
  const result: Position[] = [];
  const seen = new Set<number>();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 'empty') continue;
      for (let dr = -range; dr <= range; dr++) {
        for (let dc = -range; dc <= range; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBoard(nc, nr)) continue;
          if (board[nr][nc] !== 'empty') continue;
          const key = nr * BOARD_SIZE + nc;
          if (seen.has(key)) continue;
          // 必须是合法点
          if (!isLegalMove(board, nc, nr, color, koPoint)) continue;
          seen.add(key);
          result.push({ col: nc, row: nr });
        }
      }
    }
  }

  return result;
}

// 评估在 (col, row) 落子（color 方）的得分
// 综合考虑：提子收益、自身危险、攻击对方、连接己方、星位加成
function evaluateMove(
  board: Board,
  col: number,
  row: number,
  color: StoneColor,
  koPoint?: Position | null
): number {
  const result = placeStone(board, col, row, color);
  if (result === null) return -Infinity; // 禁着

  const { board: newBoard, captured } = result;
  const opponent: StoneColor = color === 'black' ? 'white' : 'black';

  let score = 0;

  // 1. 提子收益（每个被提子 +120）
  score += captured.length * 120;

  // 2. 自身棋块的气数（气越多越安全）
  const selfLibs = getLiberties(newBoard, col, row);
  if (selfLibs.count === 1) {
    // 落子后自己只有 1 气，极易被提
    score -= 80;
  } else if (selfLibs.count === 2) {
    score -= 10;
  } else {
    score += Math.min(selfLibs.count * 2, 12);
  }

  // 3. 攻击对方棋块：减少对方棋块的气
  for (const [dc, dr] of NEIGHBORS) {
    const nc = col + dc;
    const nr = row + dr;
    if (!inBoard(nc, nr)) continue;
    if (newBoard[nr][nc] !== opponent) continue;

    const opLibs = getLiberties(newBoard, nc, nr);
    if (opLibs.count === 1) {
      // 打吃（对方只剩 1 气）
      const opGroup = getGroup(newBoard, nc, nr);
      score += opGroup.length * 50;
    } else if (opLibs.count === 2) {
      score += 8;
    }
  }

  // 4. 救援己方危险棋块：若邻近己方棋块原本只有 1 气，落子后扩展
  for (const [dc, dr] of NEIGHBORS) {
    const nc = col + dc;
    const nr = row + dr;
    if (!inBoard(nc, nr)) continue;
    if (board[nr][nc] !== color) continue;

    const beforeLibs = getLiberties(board, nc, nr);
    if (beforeLibs.count === 1) {
      // 原本只剩 1 气，本手能救
      const savedGroup = getGroup(board, nc, nr);
      const afterLibs = getLiberties(newBoard, nc, nr);
      if (afterLibs.count >= 2) {
        score += savedGroup.length * 60;
      }
    }
  }

  // 5. 星位加成（仅当棋盘较空时）
  const totalStones = countStones(board);
  if (totalStones < 12) {
    for (const [sc, sr] of STAR_POINTS) {
      if (sc === col && sr === row) {
        score += 15;
        break;
      }
    }
  }

  // 6. 避免太靠近棋盘边缘（边角发展受限）
  const edgeDist = Math.min(col, row, BOARD_SIZE - 1 - col, BOARD_SIZE - 1 - row);
  if (edgeDist === 0 && totalStones > 4) {
    score -= 5;
  }

  return score;
}

// 统计棋盘上的棋子总数
function countStones(board: Board): number {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== 'empty') count++;
    }
  }
  return count;
}

// hard 模式：评估对手最佳反击下的局势
function evaluateMoveWithCounter(
  board: Board,
  col: number,
  row: number,
  color: StoneColor,
  koPoint?: Position | null
): number {
  const baseScore = evaluateMove(board, col, row, color, koPoint);
  if (baseScore === -Infinity) return -Infinity;

  const result = placeStone(board, col, row, color);
  if (result === null) return -Infinity;
  const { board: newBoard, captured } = result;

  // 提子后形成新棋盘，确定新 koPoint
  const opponent: StoneColor = color === 'black' ? 'white' : 'black';

  // 对手在剩余候选中找最佳反击
  const opCandidates = getCandidates(newBoard, 1, opponent, null);
  if (opCandidates.length === 0) return baseScore;

  let opBest = -Infinity;
  // 限制候选数量，避免过慢
  const sample = opCandidates.slice(0, Math.min(12, opCandidates.length));
  for (const pos of sample) {
    const opScore = evaluateMove(newBoard, pos.col, pos.row, opponent, null);
    if (opScore > opBest) opBest = opScore;
  }

  // 我方得分 - 对方最大反击得分
  return baseScore - opBest * 0.6;
}

// 主入口：根据难度返回 AI 落子位置
export function getAIMove(
  board: Board,
  color: StoneColor,
  difficulty: Difficulty,
  koPoint?: Position | null
): Position | null {
  // 空棋盘：下天元或星位
  if (countStones(board) === 0) {
    const picks: Position[] = [
      { col: 9, row: 9 },
      { col: 3, row: 3 },
      { col: 15, row: 15 },
      { col: 3, row: 15 },
      { col: 15, row: 3 },
    ];
    return picks[Math.floor(Math.random() * picks.length)];
  }

  const allLegal = getAllLegalMoves(board, color, koPoint);
  if (allLegal.length === 0) return null;

  // easy：随机合法点
  if (difficulty === 'easy') {
    return allLegal[Math.floor(Math.random() * allLegal.length)];
  }

  // 候选点：取已有棋子附近 2 格范围内的合法点
  let candidates = getCandidates(board, 2, color, koPoint);
  if (candidates.length === 0) {
    candidates = allLegal;
  }

  // medium：单层启发式
  if (difficulty === 'medium') {
    let bestScore = -Infinity;
    let bestMoves: Position[] = [];

    for (const pos of candidates) {
      const s = evaluateMove(board, pos.col, pos.row, color, koPoint);
      if (s > bestScore) {
        bestScore = s;
        bestMoves = [pos];
      } else if (s === bestScore) {
        bestMoves.push(pos);
      }
    }

    if (bestMoves.length === 0) return null;
    // 同分时随机选一个，增加变化
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  // hard：带 1 层对手反击的评估
  // 限制候选数到前 8 个（按基础得分排序）以控制开销
  const sorted = candidates
    .map((pos) => ({
      pos,
      base: evaluateMove(board, pos.col, pos.row, color, koPoint),
    }))
    .filter((item) => item.base > -Infinity)
    .sort((a, b) => b.base - a.base)
    .slice(0, 8);

  if (sorted.length === 0) return null;

  let bestScore = -Infinity;
  let bestMoves: Position[] = [];

  for (const item of sorted) {
    const s = evaluateMoveWithCounter(board, item.pos.col, item.pos.row, color, koPoint);
    if (s > bestScore) {
      bestScore = s;
      bestMoves = [item.pos];
    } else if (s === bestScore) {
      bestMoves.push(item.pos);
    }
  }

  if (bestMoves.length === 0) return sorted[0].pos;
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}
