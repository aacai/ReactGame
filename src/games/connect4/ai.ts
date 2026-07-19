// 四子棋 AI：随机 / 启发式+2层前瞻 / minimax 深度7 + alpha-beta + 置换表

import {
  Board,
  Player,
  COLS,
  ROWS,
  getDropRow,
  getValidMoves,
  makeMove,
  checkWin,
  inBoard,
} from './rules';

export type Difficulty = 'easy' | 'medium' | 'hard';

// 列权重表：偏好中间列（列 3 最高分），向两侧递减
const COL_WEIGHTS = [1, 2, 3, 4, 3, 2, 1];

// 四个方向：横、竖、右斜（↘）、左斜（↙）
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

// 评估常量
const SCORE_FOUR = 100000; // 四连威胁（实际由 checkWin 早返捕获，这里兜底）
const SCORE_THREE = 100; // 三连数（4 子窗口中 3 己 + 1 空）
const SCORE_TWO = 2; // 二连数（4 子窗口中 2 己 + 2 空）
const SCORE_CENTER = 4; // 中心列子数
const SCORE_PARITY = 50; // 奇偶性优势

// 置换表条目：缓存已评估局面
interface TranspositionEntry {
  depth: number;
  score: number;
}
// 置换表：每次 getAIMove 调用时重置，避免跨局污染
let transpositionTable: Map<string, TranspositionEntry> = new Map();

// 棋盘哈希：行字符串拼接，简单且足够区分局面
function hashBoard(board: Board): string {
  return board.map((row) => row.join('')).join('|');
}

// 随机选一个合法列
function randomMove(board: Board): number | null {
  const moves = getValidMoves(board);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

// 检查 player 在 col 列下子能否直接获胜
function canWinWithMove(board: Board, col: number, player: Player): boolean {
  const row = getDropRow(board, col);
  if (row === -1) return false;
  const { newBoard } = makeMove(board, col, player);
  return checkWin(newBoard, row, col);
}

// 统计 player 的四连、三连、二连数，以及三连威胁所在的空位列
// 四连：4 子窗口全为己方（实际由 checkWin 捕获，这里兜底）
// 三连：4 子窗口中己方 3 子 + 1 空位（即时威胁）
// 二连：4 子窗口中己方 2 子 + 2 空位（潜在威胁）
function countPatterns(
  board: Board,
  player: Player
): { fours: number; threes: number; twos: number; threatCols: number[] } {
  let fours = 0;
  let threes = 0;
  let twos = 0;
  const threatCols: number[] = [];
  const opponent: Player = player === 1 ? 2 : 1;

  for (const [dr, dc] of DIRECTIONS) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // 检查从 (r,c) 开始的 4 子窗口
        let valid = true;
        let playerCount = 0;
        let opponentCount = 0;
        let emptyCol = -1;
        for (let i = 0; i < 4; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (!inBoard(nr, nc)) {
            valid = false;
            break;
          }
          const v = board[nr][nc];
          if (v === player) playerCount++;
          else if (v === opponent) opponentCount++;
          else emptyCol = nc; // 记录空位列（用于奇偶性评估）
        }
        if (!valid) continue;
        // 只有 player 独占的窗口才有意义（含对手子的窗口无威胁）
        if (opponentCount > 0) continue;

        if (playerCount === 4) fours++;
        else if (playerCount === 3) {
          threes++;
          if (emptyCol >= 0) threatCols.push(emptyCol);
        } else if (playerCount === 2) twos++;
      }
    }
  }

  return { fours, threes, twos, threatCols };
}

// 统计 player 在中心列（列 3）的子数
function centerCount(board: Board, player: Player): number {
  let count = 0;
  const center = Math.floor(COLS / 2); // 列 3
  for (let r = 0; r < ROWS; r++) {
    if (board[r][center] === player) count++;
  }
  return count;
}

// 整盘评估：
// 四连威胁*100000 + 三连*100 + 二连*2 + 中心列子数*4 + 奇偶性*50
// 减去对手相同项（奇偶性已带符号）
function evaluateBoard(board: Board, aiColor: Player): number {
  const opponent: Player = aiColor === 1 ? 2 : 1;
  const aiPatterns = countPatterns(board, aiColor);
  const opPatterns = countPatterns(board, opponent);

  // 奇偶性：当前玩家在偶数列（0/2/4/6）的潜在威胁数比对手多则 +50
  // 偶数列威胁在四子棋中具有战略意义（控制权）
  let aiEvenThreats = 0;
  for (const col of aiPatterns.threatCols) {
    if (col % 2 === 0) aiEvenThreats++;
  }
  let opEvenThreats = 0;
  for (const col of opPatterns.threatCols) {
    if (col % 2 === 0) opEvenThreats++;
  }
  const parity =
    aiEvenThreats > opEvenThreats
      ? SCORE_PARITY
      : aiEvenThreats < opEvenThreats
      ? -SCORE_PARITY
      : 0;

  return (
    aiPatterns.fours * SCORE_FOUR +
    aiPatterns.threes * SCORE_THREE +
    aiPatterns.twos * SCORE_TWO +
    centerCount(board, aiColor) * SCORE_CENTER -
    (opPatterns.fours * SCORE_FOUR +
      opPatterns.threes * SCORE_THREE +
      opPatterns.twos * SCORE_TWO +
      centerCount(board, opponent) * SCORE_CENTER) +
    parity
  );
}

// 按列权重排序：优先中间列，提升 alpha-beta 剪枝效率
function orderMoves(moves: number[]): number[] {
  return moves.slice().sort((a, b) => COL_WEIGHTS[b] - COL_WEIGHTS[a]);
}

// minimax + alpha-beta 剪枝 + 置换表 + 胜负早返
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: Player
): number {
  // 置换表查询：仅当缓存深度 >= 当前深度时才使用（更深搜索更准确）
  const hash = hashBoard(board);
  const cached = transpositionTable.get(hash);
  if (cached && cached.depth >= depth) {
    return cached.score;
  }

  const moves = getValidMoves(board);
  // 棋盘已满（平局）或深度耗尽：返回静态评估
  if (moves.length === 0) {
    const score = evaluateBoard(board, aiColor);
    transpositionTable.set(hash, { depth, score });
    return score;
  }
  if (depth === 0) {
    const score = evaluateBoard(board, aiColor);
    transpositionTable.set(hash, { depth, score });
    return score;
  }

  const currentColor: Player = isMaximizing ? aiColor : aiColor === 1 ? 2 : 1;
  const orderedMoves = orderMoves(moves);

  let best: number;
  let isTerminal = false; // 是否为胜负终局（终局分数含 depth 加成，跨 depth 缓存会失真）

  if (isMaximizing) {
    best = -Infinity;
    for (const col of orderedMoves) {
      const { newBoard, row } = makeMove(board, col, currentColor);
      // 自己胜利：浅层胜利更优（depth 越大分越高）
      if (checkWin(newBoard, row, col)) {
        best = SCORE_FOUR + depth;
        isTerminal = true;
        break; // 早返：找到必胜即可
      }
      const val = minimax(newBoard, depth - 1, alpha, beta, false, aiColor);
      if (val > best) best = val;
      if (val > alpha) alpha = val;
      if (beta <= alpha) break; // alpha-beta 剪枝
    }
  } else {
    best = Infinity;
    for (const col of orderedMoves) {
      const { newBoard, row } = makeMove(board, col, currentColor);
      // 对手胜利：浅层失败更劣（depth 越大分越低）
      if (checkWin(newBoard, row, col)) {
        best = -SCORE_FOUR - depth;
        isTerminal = true;
        break; // 早返：找到必败即可
      }
      const val = minimax(newBoard, depth - 1, alpha, beta, true, aiColor);
      if (val < best) best = val;
      if (val < beta) beta = val;
      if (beta <= alpha) break; // alpha-beta 剪枝
    }
  }

  // 仅缓存非终局分数：终局分数含 depth 加成，跨 depth 复用会失真
  if (!isTerminal) {
    transpositionTable.set(hash, { depth, score: best });
  }
  return best;
}

// 主入口：返回列号 0-6 或 null
export function getAIMove(
  board: Board,
  player: Player,
  difficulty: Difficulty
): number | null {
  // 每次调用清空置换表，避免跨局污染
  transpositionTable = new Map();

  const moves = getValidMoves(board);
  if (moves.length === 0) return null;

  const opponent: Player = player === 1 ? 2 : 1;

  // easy：纯随机
  if (difficulty === 'easy') {
    return randomMove(board);
  }

  // medium & hard 共用：先检查自己能一手胜
  for (const col of moves) {
    if (canWinWithMove(board, col, player)) return col;
  }
  // 再检查必须防守（对手能一手胜则堵）
  for (const col of moves) {
    if (canWinWithMove(board, col, opponent)) return col;
  }

  if (difficulty === 'medium') {
    // medium：启发式 + 2 层前瞻
    // 对每个候选列，模拟自己下子后，对手最佳应对下自己的最差情况
    // 对手会选使自己得分最高（=使我得分最低）的列
    const orderedMoves = orderMoves(moves);
    let bestScore = -Infinity;
    let bestCols: number[] = [orderedMoves[0]];
    for (const col of orderedMoves) {
      const { newBoard } = makeMove(board, col, player);
      // 对手最佳应对（1 层）
      const opponentMoves = getValidMoves(newBoard);
      let opponentBest = Infinity;
      for (const opCol of opponentMoves) {
        const { newBoard: opBoard, row: opRow } = makeMove(
          newBoard,
          opCol,
          opponent
        );
        if (checkWin(opBoard, opRow, opCol)) {
          // 对手能直接获胜：这一手对我们极差
          opponentBest = -SCORE_FOUR;
          break;
        }
        const score = evaluateBoard(opBoard, player);
        if (score < opponentBest) opponentBest = score;
      }
      // 对手无合法手（棋盘已满）：直接评估我方下子后的局面
      const score =
        opponentBest === Infinity ? evaluateBoard(newBoard, player) : opponentBest;
      if (score > bestScore) {
        bestScore = score;
        bestCols = [col];
      } else if (score === bestScore) {
        bestCols.push(col);
      }
    }
    // 同分列中随机选一，避免完全可预测
    return bestCols[Math.floor(Math.random() * bestCols.length)];
  }

  // hard：minimax 深度 7（1 + 内部 6）+ alpha-beta + 置换表
  const orderedMoves = orderMoves(moves);
  let bestScore = -Infinity;
  let bestCol = orderedMoves[0];
  // 深度 7：自己已下 1 层，再递归 6 层
  for (const col of orderedMoves) {
    const { newBoard, row } = makeMove(board, col, player);
    // 显式胜利检查（minimax 也能发现，但显式更稳且省一次递归）
    if (checkWin(newBoard, row, col)) return col;
    const score = minimax(newBoard, 6, -Infinity, Infinity, false, player);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }
  return bestCol;
}
