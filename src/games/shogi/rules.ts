// 日本将棋（Shogi/将棋）规则引擎
// 棋盘 9x9：row 0 在顶部（后手 gote 起始区），row 8 在底部（先手 sente 起始区）
// 先手 sente 朝上方推进（row 减小），后手 gote 朝下方推进（row 增大）
//
// 关键规则：
// 1. 升变（成る）：进入或离开对方三段（升变区）时可升变，部分棋子强制升变
// 2. 持驹（持ち駒）：吃掉的对方子可打入空格，打入后回到未升变状态
// 3. 二步禁手：同一列不能有两个未升变的己方步兵
// 4. 打步诘禁手：打入步兵不能直接将死对方
// 5. 步兵/香车不能打入最后一段；桂马不能打入最后两段

import type { Piece, PieceColor, PieceType, Position, Hand } from './types';

export const BOARD_COLS = 9;
export const BOARD_ROWS = 9;

// 棋子 ID 生成器
let pieceIdCounter = 0;

function nextPieceId(): string {
  pieceIdCounter += 1;
  return `shogi-p-${pieceIdCounter}`;
}

function createPiece(
  color: PieceColor,
  type: PieceType,
  col: number,
  row: number,
  promoted: boolean = false,
): Piece {
  return {
    id: nextPieceId(),
    color,
    type,
    col,
    row,
    promoted,
  };
}

// ========== 棋盘工具 ==========
export function isInBoard(col: number, row: number): boolean {
  return col >= 0 && col < BOARD_COLS && row >= 0 && row < BOARD_ROWS;
}

export function getPieceAt(pieces: Piece[], col: number, row: number): Piece | undefined {
  return pieces.find((p) => p.col === col && p.row === row);
}

export function clonePieces(pieces: Piece[]): Piece[] {
  return pieces.map((p) => ({ ...p }));
}

// ========== 持驹工具 ==========
export function createEmptyHand(): Hand {
  return { sente: [], gote: [] };
}

export function cloneHand(hand: Hand): Hand {
  return {
    sente: hand.sente.map((h) => ({ ...h })),
    gote: hand.gote.map((h) => ({ ...h })),
  };
}

export function getHandCount(hand: Hand, color: PieceColor, type: PieceType): number {
  const entry = hand[color].find((h) => h.type === type);
  return entry ? entry.count : 0;
}

// 将一枚棋子加入某方持驹（返回新持驹，不修改原持驹）
export function addToHand(hand: Hand, color: PieceColor, type: PieceType): Hand {
  const newHand = cloneHand(hand);
  const entry = newHand[color].find((h) => h.type === type);
  if (entry) {
    entry.count += 1;
  } else {
    newHand[color].push({ type, count: 1 });
  }
  return newHand;
}

// 从某方持驹中取出一枚（返回新持驹，不修改原持驹）
export function removeFromHand(hand: Hand, color: PieceColor, type: PieceType): Hand {
  const newHand = cloneHand(hand);
  const entry = newHand[color].find((h) => h.type === type);
  if (entry) {
    entry.count -= 1;
    if (entry.count <= 0) {
      newHand[color] = newHand[color].filter((h) => h.type !== type);
    }
  }
  return newHand;
}

// ========== 方向与升变区 ==========
// 先手向 row 减小方向走，后手向 row 增大方向走
function getForward(color: PieceColor): number {
  return color === 'sente' ? -1 : 1;
}

// 是否在升变区（对方三段）
export function isInPromotionZone(row: number, color: PieceColor): boolean {
  return color === 'sente' ? row <= 2 : row >= 6;
}

// 是否在最后一段（步兵/香车不能去此处）
export function isLastRank(row: number, color: PieceColor): boolean {
  return color === 'sente' ? row === 0 : row === 8;
}

// 是否在最后两段（桂马不能去此处）
export function isLastTwoRanks(row: number, color: PieceColor): boolean {
  return color === 'sente' ? row <= 1 : row >= 7;
}

// 是否可选择升变（玩家可选）
// 条件：未升变、不是王/金、起点或终点在升变区
export function canPromote(piece: Piece, fromRow: number, toRow: number): boolean {
  if (piece.promoted) return false;
  if (piece.type === 'king' || piece.type === 'gold') return false;
  return isInPromotionZone(fromRow, piece.color) || isInPromotionZone(toRow, piece.color);
}

// 是否必须升变（强制升变）
export function mustPromote(piece: Piece, toRow: number): boolean {
  if (piece.promoted) return false;
  if (piece.type === 'pawn' || piece.type === 'lance') {
    return isLastRank(toRow, piece.color);
  }
  if (piece.type === 'knight') {
    return isLastTwoRanks(toRow, piece.color);
  }
  return false;
}

// ========== 初始布局 ==========
// 标准日本将棋初始布局
// 后手 gote（row 0-2）：香桂银金王金银桂香 / 角(7,1) 飛(1,1) / 歩×9
// 先手 sente（row 6-8）：歩×9 / 飛(7,7) 角(1,7) / 香桂银金王金银桂香
// 两侧棋子呈点对称；双方角行在同一条对角线上（(1,7)-(7,1)）
export function createInitialBoard(): Piece[] {
  pieceIdCounter = 0;
  const pieces: Piece[] = [];

  const backRank: PieceType[] = [
    'lance', 'knight', 'silver', 'gold', 'king', 'gold', 'silver', 'knight', 'lance',
  ];

  // 后手 gote（上方）
  for (let col = 0; col < 9; col += 1) {
    pieces.push(createPiece('gote', backRank[col], col, 0));
  }
  pieces.push(createPiece('gote', 'rook', 1, 1));
  pieces.push(createPiece('gote', 'bishop', 7, 1));
  for (let col = 0; col < 9; col += 1) {
    pieces.push(createPiece('gote', 'pawn', col, 2));
  }

  // 先手 sente（下方）
  for (let col = 0; col < 9; col += 1) {
    pieces.push(createPiece('sente', backRank[col], col, 8));
  }
  pieces.push(createPiece('sente', 'bishop', 1, 7));
  pieces.push(createPiece('sente', 'rook', 7, 7));
  for (let col = 0; col < 9; col += 1) {
    pieces.push(createPiece('sente', 'pawn', col, 6));
  }

  return pieces;
}

export function createInitialHand(): Hand {
  return createEmptyHand();
}

// ========== 走法生成（原始，未过滤将军） ==========

// 金将走法（升变后的银/桂/香/步也用此走法）
// 6 个方向：前、前左、前右、左、右、后
function getGoldMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const f = getForward(piece.color);
  const dirs = [
    { dc: 0, dr: f },   // 前
    { dc: -1, dr: f },  // 前左
    { dc: 1, dr: f },   // 前右
    { dc: -1, dr: 0 },  // 左
    { dc: 1, dr: 0 },   // 右
    { dc: 0, dr: -f },  // 后
  ];
  for (const d of dirs) {
    const nc = piece.col + d.dc;
    const nr = piece.row + d.dr;
    if (!isInBoard(nc, nr)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (target && target.color === piece.color) continue;
    moves.push({ col: nc, row: nr });
  }
  return moves;
}

// 银将走法：前、前左、前右、后左、后右（5 方向）
function getSilverMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const f = getForward(piece.color);
  const dirs = [
    { dc: 0, dr: f },   // 前
    { dc: -1, dr: f },  // 前左
    { dc: 1, dr: f },   // 前右
    { dc: -1, dr: -f }, // 后左
    { dc: 1, dr: -f },  // 后右
  ];
  for (const d of dirs) {
    const nc = piece.col + d.dc;
    const nr = piece.row + d.dr;
    if (!isInBoard(nc, nr)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (target && target.color === piece.color) continue;
    moves.push({ col: nc, row: nr });
  }
  return moves;
}

// 王将走法：8 方向各一格
function getKingMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const dirs = [
    { dc: -1, dr: -1 }, { dc: 0, dr: -1 }, { dc: 1, dr: -1 },
    { dc: -1, dr: 0 },                      { dc: 1, dr: 0 },
    { dc: -1, dr: 1 },  { dc: 0, dr: 1 },  { dc: 1, dr: 1 },
  ];
  for (const d of dirs) {
    const nc = piece.col + d.dc;
    const nr = piece.row + d.dr;
    if (!isInBoard(nc, nr)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (target && target.color === piece.color) continue;
    moves.push({ col: nc, row: nr });
  }
  return moves;
}

// 桂马走法：前左两格 + 左 1，前右两格 + 右 1（仅向前，可越过前方棋子）
function getKnightMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const f = getForward(piece.color);
  const dirs = [
    { dc: -1, dr: 2 * f },
    { dc: 1, dr: 2 * f },
  ];
  for (const d of dirs) {
    const nc = piece.col + d.dc;
    const nr = piece.row + d.dr;
    if (!isInBoard(nc, nr)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (target && target.color === piece.color) continue;
    moves.push({ col: nc, row: nr });
  }
  return moves;
}

// 步兵走法：向前一格
function getPawnMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const f = getForward(piece.color);
  const nc = piece.col;
  const nr = piece.row + f;
  if (!isInBoard(nc, nr)) return moves;
  const target = getPieceAt(pieces, nc, nr);
  if (target && target.color === piece.color) return moves;
  moves.push({ col: nc, row: nr });
  return moves;
}

// 香车走法：向前直线滑动
function getLanceMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const f = getForward(piece.color);
  let nc = piece.col;
  let nr = piece.row + f;
  while (isInBoard(nc, nr)) {
    const target = getPieceAt(pieces, nc, nr);
    if (target) {
      if (target.color !== piece.color) moves.push({ col: nc, row: nr });
      break;
    }
    moves.push({ col: nc, row: nr });
    nr += f;
  }
  return moves;
}

// 飞车走法：直线滑动
function getRookMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const dirs = [
    { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
    { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
  ];
  for (const d of dirs) {
    let nc = piece.col + d.dc;
    let nr = piece.row + d.dr;
    while (isInBoard(nc, nr)) {
      const target = getPieceAt(pieces, nc, nr);
      if (target) {
        if (target.color !== piece.color) moves.push({ col: nc, row: nr });
        break;
      }
      moves.push({ col: nc, row: nr });
      nc += d.dc;
      nr += d.dr;
    }
  }
  return moves;
}

// 角行走法：斜线滑动
function getBishopMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const dirs = [
    { dc: -1, dr: -1 }, { dc: 1, dr: -1 },
    { dc: -1, dr: 1 },  { dc: 1, dr: 1 },
  ];
  for (const d of dirs) {
    let nc = piece.col + d.dc;
    let nr = piece.row + d.dr;
    while (isInBoard(nc, nr)) {
      const target = getPieceAt(pieces, nc, nr);
      if (target) {
        if (target.color !== piece.color) moves.push({ col: nc, row: nr });
        break;
      }
      moves.push({ col: nc, row: nr });
      nc += d.dc;
      nr += d.dr;
    }
  }
  return moves;
}

// 龙王（升变飞车）走法：飞车 + 1 格斜向
function getPromotedRookMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves = getRookMoves(pieces, piece);
  const diagDirs = [
    { dc: -1, dr: -1 }, { dc: 1, dr: -1 },
    { dc: -1, dr: 1 },  { dc: 1, dr: 1 },
  ];
  for (const d of diagDirs) {
    const nc = piece.col + d.dc;
    const nr = piece.row + d.dr;
    if (!isInBoard(nc, nr)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (target && target.color === piece.color) continue;
    moves.push({ col: nc, row: nr });
  }
  return moves;
}

// 龙马（升变角行）走法：角行 + 1 格直向
function getPromotedBishopMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves = getBishopMoves(pieces, piece);
  const orthoDirs = [
    { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
    { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
  ];
  for (const d of orthoDirs) {
    const nc = piece.col + d.dc;
    const nr = piece.row + d.dr;
    if (!isInBoard(nc, nr)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (target && target.color === piece.color) continue;
    moves.push({ col: nc, row: nr });
  }
  return moves;
}

// 获取棋子的原始走法（不考虑将军）
function getRawMoves(pieces: Piece[], piece: Piece): Position[] {
  // 已升变的银/桂/香/步按金将走法
  if (piece.promoted) {
    switch (piece.type) {
      case 'silver':
      case 'knight':
      case 'lance':
      case 'pawn':
        return getGoldMoves(pieces, piece);
      case 'rook':
        return getPromotedRookMoves(pieces, piece);
      case 'bishop':
        return getPromotedBishopMoves(pieces, piece);
      case 'king':
        return getKingMoves(pieces, piece);
      case 'gold':
        return getGoldMoves(pieces, piece);
      default:
        return [];
    }
  }
  switch (piece.type) {
    case 'king': return getKingMoves(pieces, piece);
    case 'rook': return getRookMoves(pieces, piece);
    case 'bishop': return getBishopMoves(pieces, piece);
    case 'gold': return getGoldMoves(pieces, piece);
    case 'silver': return getSilverMoves(pieces, piece);
    case 'knight': return getKnightMoves(pieces, piece);
    case 'lance': return getLanceMoves(pieces, piece);
    case 'pawn': return getPawnMoves(pieces, piece);
    default: return [];
  }
}

// ========== 模拟与应用 ==========

// 模拟走棋（不升变），返回新棋盘和被吃棋子
function simulateMove(
  pieces: Piece[],
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): { newPieces: Piece[]; captured: Piece | undefined } {
  const newPieces = clonePieces(pieces);
  const movingPiece = newPieces.find((p) => p.col === fromCol && p.row === fromRow);
  if (!movingPiece) return { newPieces, captured: undefined };

  const targetIdx = newPieces.findIndex((p) => p.col === toCol && p.row === toRow);
  let captured: Piece | undefined;
  if (targetIdx !== -1) {
    captured = { ...newPieces[targetIdx] };
    newPieces.splice(targetIdx, 1);
  }
  movingPiece.col = toCol;
  movingPiece.row = toRow;
  return { newPieces, captured };
}

// 应用走棋（含升变和持驹更新），返回新棋盘、新持驹、被吃棋子
export function applyMove(
  pieces: Piece[],
  hand: Hand,
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
  promote: boolean,
): { newPieces: Piece[]; newHand: Hand; captured: Piece | undefined } {
  const { newPieces, captured } = simulateMove(pieces, fromCol, fromRow, toCol, toRow);
  const movingPiece = newPieces.find((p) => p.col === toCol && p.row === toRow);
  if (movingPiece && promote) {
    movingPiece.promoted = true;
  }
  let newHand = hand;
  if (captured) {
    // 吃子加入持驹：被吃的子回到原始（未升变）状态
    const moverColor: PieceColor = captured.color === 'sente' ? 'gote' : 'sente';
    newHand = addToHand(hand, moverColor, captured.type);
  }
  return { newPieces, newHand, captured };
}

// 应用打入（仅修改棋盘，不修改持驹），返回新棋盘
export function applyDrop(
  pieces: Piece[],
  color: PieceColor,
  type: PieceType,
  toCol: number,
  toRow: number,
): Piece[] {
  const newPieces = clonePieces(pieces);
  const newPiece = createPiece(color, type, toCol, toRow, false);
  newPieces.push(newPiece);
  return newPieces;
}

// ========== 将军检测 ==========

// 找到某方的王
function getKing(pieces: Piece[], color: PieceColor): Piece | undefined {
  return pieces.find((p) => p.color === color && p.type === 'king');
}

// 某方是否被将军
export function isInCheck(pieces: Piece[], color: PieceColor): boolean {
  const king = getKing(pieces, color);
  if (!king) return false;
  const opponent: PieceColor = color === 'sente' ? 'gote' : 'sente';
  const opponentPieces = pieces.filter((p) => p.color === opponent);
  for (const op of opponentPieces) {
    const moves = getRawMoves(pieces, op);
    if (moves.some((m) => m.col === king.col && m.row === king.row)) {
      return true;
    }
  }
  return false;
}

// ========== 走法过滤 ==========

// 获取某位置棋子的合法走法（已过滤会令己方被将军的走法）
// 返回位置列表，不含升变选择信息
export function getValidMoves(pieces: Piece[], fromCol: number, fromRow: number): Position[] {
  const piece = getPieceAt(pieces, fromCol, fromRow);
  if (!piece) return [];
  const rawMoves = getRawMoves(pieces, piece);
  return rawMoves.filter((move) => {
    const { newPieces } = simulateMove(pieces, fromCol, fromRow, move.col, move.row);
    return !isInCheck(newPieces, piece.color);
  });
}

// 获取打入合法位置
// 检查：空格、最后一段/两段限制、二步禁手、打步诘禁手
export function getDropMoves(
  pieces: Piece[],
  color: PieceColor,
  hand: Hand,
  type: PieceType,
): Position[] {
  if (getHandCount(hand, color, type) <= 0) return [];

  const validSquares: Position[] = [];
  // 二步禁手：同列已有己方未升变步兵则不能打入步兵
  const friendlyPawnCols = new Set<number>();
  if (type === 'pawn') {
    for (const p of pieces) {
      if (p.color === color && p.type === 'pawn' && !p.promoted) {
        friendlyPawnCols.add(p.col);
      }
    }
  }

  for (let col = 0; col < BOARD_COLS; col += 1) {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      // 必须打入空格
      if (getPieceAt(pieces, col, row)) continue;
      // 步兵/香车不能打入最后一段
      if ((type === 'pawn' || type === 'lance') && isLastRank(row, color)) continue;
      // 桂马不能打入最后两段
      if (type === 'knight' && isLastTwoRanks(row, color)) continue;
      // 二步禁手
      if (type === 'pawn' && friendlyPawnCols.has(col)) continue;
      // 打步诘禁手
      if (type === 'pawn' && isUchifuzume(pieces, color, col, row, hand)) continue;
      // 打入后己方不能被将军
      const newPieces = applyDrop(pieces, color, type, col, row);
      if (isInCheck(newPieces, color)) continue;
      validSquares.push({ col, row });
    }
  }
  return validSquares;
}

// 用于将死判断的打入位置（跳过打步诘检查，避免无限递归）
function getDropMovesForCheckmateCheck(
  pieces: Piece[],
  color: PieceColor,
  type: PieceType,
): Position[] {
  const validSquares: Position[] = [];
  const friendlyPawnCols = new Set<number>();
  if (type === 'pawn') {
    for (const p of pieces) {
      if (p.color === color && p.type === 'pawn' && !p.promoted) {
        friendlyPawnCols.add(p.col);
      }
    }
  }
  for (let col = 0; col < BOARD_COLS; col += 1) {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      if (getPieceAt(pieces, col, row)) continue;
      if ((type === 'pawn' || type === 'lance') && isLastRank(row, color)) continue;
      if (type === 'knight' && isLastTwoRanks(row, color)) continue;
      if (type === 'pawn' && friendlyPawnCols.has(col)) continue;
      const newPieces = applyDrop(pieces, color, type, col, row);
      if (isInCheck(newPieces, color)) continue;
      validSquares.push({ col, row });
    }
  }
  return validSquares;
}

// 打步诘检测：在 (col, row) 打入步兵是否会直接将死对方
function isUchifuzume(
  pieces: Piece[],
  color: PieceColor,
  col: number,
  row: number,
  hand: Hand,
): boolean {
  const newPieces = applyDrop(pieces, color, 'pawn', col, row);
  const opponent: PieceColor = color === 'sente' ? 'gote' : 'sente';
  // 必须先是被将军，否则不可能是将死
  if (!isInCheck(newPieces, opponent)) return false;
  // 对方无任何合法动作（含打入）→ 将死 → 打步诘禁手
  return !hasAnyLegalAction(newPieces, opponent, hand);
}

// 某方是否有任何合法动作（用于打步诘和将死判断）
export function hasAnyLegalAction(pieces: Piece[], color: PieceColor, hand: Hand): boolean {
  // 检查所有棋子的合法走法
  const colorPieces = pieces.filter((p) => p.color === color);
  for (const piece of colorPieces) {
    const moves = getRawMoves(pieces, piece);
    for (const move of moves) {
      const { newPieces } = simulateMove(pieces, piece.col, piece.row, move.col, move.row);
      if (!isInCheck(newPieces, color)) return true;
    }
  }
  // 检查所有持驹的合法打入（跳过打步诘检查避免递归）
  const handPieces = hand[color];
  for (const hp of handPieces) {
    if (hp.count <= 0) continue;
    const dropSquares = getDropMovesForCheckmateCheck(pieces, color, hp.type);
    if (dropSquares.length > 0) return true;
  }
  return false;
}

// 是否将死
export function isCheckmate(pieces: Piece[], color: PieceColor, hand: Hand): boolean {
  if (!isInCheck(pieces, color)) return false;
  return !hasAnyLegalAction(pieces, color, hand);
}

// 是否困毙（无合法走法但未被将军；将棋中视为负）
export function isStalemate(pieces: Piece[], color: PieceColor, hand: Hand): boolean {
  if (isInCheck(pieces, color)) return false;
  return !hasAnyLegalAction(pieces, color, hand);
}

// ========== AI 用：枚举所有合法动作 ==========

// 所有合法走法（含升变信息）
export function getAllValidMovesForColor(
  pieces: Piece[],
  color: PieceColor,
): { piece: Piece; move: Position; canPromote: boolean; mustPromote: boolean }[] {
  const result: { piece: Piece; move: Position; canPromote: boolean; mustPromote: boolean }[] = [];
  const colorPieces = pieces.filter((p) => p.color === color);
  for (const piece of colorPieces) {
    const moves = getRawMoves(pieces, piece);
    for (const move of moves) {
      const { newPieces } = simulateMove(pieces, piece.col, piece.row, move.col, move.row);
      if (isInCheck(newPieces, color)) continue;
      result.push({
        piece,
        move,
        canPromote: canPromote(piece, piece.row, move.row),
        mustPromote: mustPromote(piece, move.row),
      });
    }
  }
  return result;
}

// 所有合法打入位置
export function getAllValidDropsForColor(
  pieces: Piece[],
  color: PieceColor,
  hand: Hand,
): { type: PieceType; to: Position }[] {
  const result: { type: PieceType; to: Position }[] = [];
  const handPieces = hand[color];
  for (const hp of handPieces) {
    if (hp.count <= 0) continue;
    const squares = getDropMoves(pieces, color, hand, hp.type);
    for (const s of squares) {
      result.push({ type: hp.type, to: s });
    }
  }
  return result;
}

// 动作类型（用于 AI 评估）
export type Action =
  | { kind: 'move'; from: Position; to: Position; promote: boolean }
  | { kind: 'drop'; to: Position; pieceType: PieceType };

// 生成所有合法动作（含升变选择），用于 AI
export function getAllActionsForColor(pieces: Piece[], color: PieceColor, hand: Hand): Action[] {
  const actions: Action[] = [];
  const moves = getAllValidMovesForColor(pieces, color);
  for (const m of moves) {
    if (m.mustPromote) {
      actions.push({
        kind: 'move',
        from: { col: m.piece.col, row: m.piece.row },
        to: m.move,
        promote: true,
      });
    } else if (m.canPromote) {
      // 玩家可选升变或不升变
      actions.push({
        kind: 'move',
        from: { col: m.piece.col, row: m.piece.row },
        to: m.move,
        promote: true,
      });
      actions.push({
        kind: 'move',
        from: { col: m.piece.col, row: m.piece.row },
        to: m.move,
        promote: false,
      });
    } else {
      actions.push({
        kind: 'move',
        from: { col: m.piece.col, row: m.piece.row },
        to: m.move,
        promote: false,
      });
    }
  }
  const drops = getAllValidDropsForColor(pieces, color, hand);
  for (const d of drops) {
    actions.push({ kind: 'drop', to: d.to, pieceType: d.type });
  }
  return actions;
}

// 应用动作（用于 AI 模拟）
export function applyAction(
  pieces: Piece[],
  hand: Hand,
  color: PieceColor,
  action: Action,
): { newPieces: Piece[]; newHand: Hand } {
  if (action.kind === 'move') {
    const { newPieces, newHand } = applyMove(
      pieces,
      hand,
      action.from.col,
      action.from.row,
      action.to.col,
      action.to.row,
      action.promote,
    );
    return { newPieces, newHand };
  }
  const newPieces = applyDrop(pieces, color, action.pieceType, action.to.col, action.to.row);
  const newHand = removeFromHand(hand, color, action.pieceType);
  return { newPieces, newHand };
}
