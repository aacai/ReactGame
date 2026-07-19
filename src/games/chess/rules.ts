// 国际象棋（Chess）规则引擎
// 8x8 棋盘
// 坐标系：col 0-7 (a-h)，row 0-7 (1-8)
// 白方在下（row 6-7），黑方在上（row 0-1）
// 白方兵向 row 减小方向走（向上推进），黑方兵向 row 增大方向走

import type { Piece, PieceColor, PieceType, Position, CastlingRights } from './types';

export const BOARD_SIZE = 8;

// 初始王车易位权利
export const INITIAL_CASTLING_RIGHTS: CastlingRights = {
  whiteKingSide: true,
  whiteQueenSide: true,
  blackKingSide: true,
  blackQueenSide: true,
};

// 棋盘判断
export function isInBoard(col: number, row: number): boolean {
  return col >= 0 && col < BOARD_SIZE && row >= 0 && row < BOARD_SIZE;
}

let pieceIdCounter = 0;

function createPiece(color: PieceColor, type: PieceType, col: number, row: number): Piece {
  pieceIdCounter += 1;
  return {
    id: `${color}-${type}-${pieceIdCounter}`,
    color,
    type,
    col,
    row,
    hasMoved: false,
  };
}

// 标准初始布局：
// row 0：黑方后排 车马象后王象马车
// row 1：黑方 8 个兵
// row 6：白方 8 个兵
// row 7：白方后排 车马象后王象马车
export function createInitialBoard(): Piece[] {
  pieceIdCounter = 0;
  const pieces: Piece[] = [];

  // 后排顺序：车-马-象-后-王-象-马-车
  // 注意：白后在白格（col 3，row 7 是 d1，白格）；白王在 e1（col 4）
  const backRank: PieceType[] = [
    'rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook',
  ];

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    pieces.push(createPiece('black', backRank[col], col, 0));
    pieces.push(createPiece('black', 'pawn', col, 1));
    pieces.push(createPiece('white', 'pawn', col, 6));
    pieces.push(createPiece('white', backRank[col], col, 7));
  }

  return pieces;
}

export function clonePieces(pieces: Piece[]): Piece[] {
  return pieces.map((p) => ({ ...p }));
}

export function getPieceAt(pieces: Piece[], col: number, row: number): Piece | undefined {
  return pieces.find((p) => p.col === col && p.row === row);
}

function getKing(pieces: Piece[], color: PieceColor): Piece | undefined {
  return pieces.find((p) => p.color === color && p.type === 'king');
}

// 兵走法：
// - 前进一格（前方必须为空）
// - 首次可前进两格（两格都必须为空）
// - 斜吃（前方斜对角有敌方棋子）
// - 过路兵（en passant）：对方刚走两格的兵，可斜进吃之
// - 升变：到达底线（白方 row 0，黑方 row 7）后升变（在 store 中处理选择）
function getPawnMoves(
  pieces: Piece[],
  piece: Piece,
  enPassantTarget: Position | null
): Position[] {
  const moves: Position[] = [];
  // 白方向上推进（row 减小），黑方向下推进（row 增大）
  const forward = piece.color === 'white' ? -1 : 1;
  const startRow = piece.color === 'white' ? 6 : 1;
  const promotionRow = piece.color === 'white' ? 0 : 7;

  // 前进一格
  const oneRow = piece.row + forward;
  if (isInBoard(piece.col, oneRow) && !getPieceAt(pieces, piece.col, oneRow)) {
    moves.push({ col: piece.col, row: oneRow });
    // 首次可前进两格
    if (piece.row === startRow) {
      const twoRow = piece.row + forward * 2;
      if (!getPieceAt(pieces, piece.col, twoRow)) {
        moves.push({ col: piece.col, row: twoRow });
      }
    }
  }

  // 斜吃（左前、右前）
  for (const dc of [-1, 1]) {
    const nc = piece.col + dc;
    const nr = piece.row + forward;
    if (!isInBoard(nc, nr)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (target && target.color !== piece.color) {
      moves.push({ col: nc, row: nr });
    }
    // 过路兵：目标格为空但与 enPassantTarget 相符
    if (!target && enPassantTarget && enPassantTarget.col === nc && enPassantTarget.row === nr) {
      moves.push({ col: nc, row: nr });
    }
  }

  // 升变判断在 store 中处理（这里只返回走法位置）
  void promotionRow;
  return moves;
}

// 车走法：直线滑动
function getRookMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const dirs = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
  ];

  for (const dir of dirs) {
    let col = piece.col + dir.dc;
    let row = piece.row + dir.dr;
    while (isInBoard(col, row)) {
      const target = getPieceAt(pieces, col, row);
      if (target) {
        if (target.color !== piece.color) {
          moves.push({ col, row });
        }
        break;
      }
      moves.push({ col, row });
      col += dir.dc;
      row += dir.dr;
    }
  }
  return moves;
}

// 马走法：L 形跳跃（无蹩马腿）
function getKnightMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const deltas = [
    { dc: -1, dr: -2 },
    { dc: 1, dr: -2 },
    { dc: -1, dr: 2 },
    { dc: 1, dr: 2 },
    { dc: -2, dr: -1 },
    { dc: -2, dr: 1 },
    { dc: 2, dr: -1 },
    { dc: 2, dr: 1 },
  ];

  for (const d of deltas) {
    const nc = piece.col + d.dc;
    const nr = piece.row + d.dr;
    if (!isInBoard(nc, nr)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (!target || target.color !== piece.color) {
      moves.push({ col: nc, row: nr });
    }
  }
  return moves;
}

// 象走法：斜线滑动
function getBishopMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const dirs = [
    { dc: -1, dr: -1 },
    { dc: 1, dr: -1 },
    { dc: -1, dr: 1 },
    { dc: 1, dr: 1 },
  ];

  for (const dir of dirs) {
    let col = piece.col + dir.dc;
    let row = piece.row + dir.dr;
    while (isInBoard(col, row)) {
      const target = getPieceAt(pieces, col, row);
      if (target) {
        if (target.color !== piece.color) {
          moves.push({ col, row });
        }
        break;
      }
      moves.push({ col, row });
      col += dir.dc;
      row += dir.dr;
    }
  }
  return moves;
}

// 后走法：车 + 象
function getQueenMoves(pieces: Piece[], piece: Piece): Position[] {
  return [...getRookMoves(pieces, piece), ...getBishopMoves(pieces, piece)];
}

// 王走法：一格任意方向 + 王车易位
function getKingMoves(
  pieces: Piece[],
  piece: Piece,
  castlingRights: CastlingRights
): Position[] {
  const moves: Position[] = [];
  const dirs = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
    { dc: -1, dr: -1 },
    { dc: 1, dr: -1 },
    { dc: -1, dr: 1 },
    { dc: 1, dr: 1 },
  ];

  for (const dir of dirs) {
    const nc = piece.col + dir.dc;
    const nr = piece.row + dir.dr;
    if (!isInBoard(nc, nr)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (!target || target.color !== piece.color) {
      moves.push({ col: nc, row: nr });
    }
  }

  // 王车易位
  // 条件：王和车都未移动过、王和目标格之间无子、王经过的格子不被攻击、王不在被将军中
  // 短易位：王向 col 大方向走两格，车跳到王的另一侧
  // 长易位：王向 col 小方向走两格，车跳到王的另一侧
  if (!piece.hasMoved && !isInCheck(pieces, piece.color)) {
    const homeRow = piece.color === 'white' ? 7 : 0;
    if (piece.row === homeRow && piece.col === 4) {
      const kingSideRight = piece.color === 'white' ? castlingRights.whiteKingSide : castlingRights.blackKingSide;
      const queenSideRight = piece.color === 'white' ? castlingRights.whiteQueenSide : castlingRights.blackQueenSide;

      // 短易位（king side）：王 col 4 -> 6，车 col 7 -> 5
      // 中间格子 col 5、6 必须为空
      if (kingSideRight) {
        const rookPiece = getPieceAt(pieces, 7, homeRow);
        if (rookPiece && rookPiece.type === 'rook' && rookPiece.color === piece.color && !rookPiece.hasMoved) {
          if (!getPieceAt(pieces, 5, homeRow) && !getPieceAt(pieces, 6, homeRow)) {
            // 王经过的格子（col 5）不能被攻击
            const sim = simulateMove(pieces, 4, homeRow, 5, homeRow);
            if (!isInCheck(sim, piece.color)) {
              moves.push({ col: 6, row: homeRow });
            }
          }
        }
      }

      // 长易位（queen side）：王 col 4 -> 2，车 col 0 -> 3
      // 中间格子 col 1、2、3 必须为空
      if (queenSideRight) {
        const rookPiece = getPieceAt(pieces, 0, homeRow);
        if (rookPiece && rookPiece.type === 'rook' && rookPiece.color === piece.color && !rookPiece.hasMoved) {
          if (!getPieceAt(pieces, 1, homeRow) && !getPieceAt(pieces, 2, homeRow) && !getPieceAt(pieces, 3, homeRow)) {
            // 王经过的格子（col 3）不能被攻击
            const sim = simulateMove(pieces, 4, homeRow, 3, homeRow);
            if (!isInCheck(sim, piece.color)) {
              moves.push({ col: 2, row: homeRow });
            }
          }
        }
      }
    }
  }

  return moves;
}

// 模拟走棋（不考虑特殊规则如易位、过路兵的副作用，仅做位置移动）
export function simulateMove(
  pieces: Piece[],
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number
): Piece[] {
  const newPieces = clonePieces(pieces);
  const movingPiece = newPieces.find((p) => p.col === fromCol && p.row === fromRow);
  if (!movingPiece) return newPieces;

  // 移除目标格的棋子（被吃子）
  const targetIndex = newPieces.findIndex((p) => p.col === toCol && p.row === toRow);
  if (targetIndex !== -1) {
    newPieces.splice(targetIndex, 1);
  }

  movingPiece.col = toCol;
  movingPiece.row = toRow;
  movingPiece.hasMoved = true;

  return newPieces;
}

// 判断是否会被将军
export function isInCheck(pieces: Piece[], color: PieceColor): boolean {
  const king = getKing(pieces, color);
  if (!king) return false;

  const opponentColor: PieceColor = color === 'white' ? 'black' : 'white';
  const opponentPieces = pieces.filter((p) => p.color === opponentColor);

  for (const op of opponentPieces) {
    const moves = getRawMovesWithoutCastling(pieces, op);
    if (moves.some((m) => m.col === king.col && m.row === king.row)) {
      return true;
    }
  }

  return false;
}

// 获取原始走法（不含王车易位，因为易位判断依赖 isInCheck，避免循环）
function getRawMovesWithoutCastling(pieces: Piece[], piece: Piece): Position[] {
  switch (piece.type) {
    case 'king':
      return getKingBasicMoves(pieces, piece);
    case 'queen':
      return getQueenMoves(pieces, piece);
    case 'rook':
      return getRookMoves(pieces, piece);
    case 'bishop':
      return getBishopMoves(pieces, piece);
    case 'knight':
      return getKnightMoves(pieces, piece);
    case 'pawn':
      // 不考虑过路兵，因为攻击格判断只需斜吃范围
      return getPawnAttackSquares(pieces, piece);
    default:
      return [];
  }
}

// 王的基础走法（不含易位），用于 isInCheck 判断
function getKingBasicMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const dirs = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
    { dc: -1, dr: -1 },
    { dc: 1, dr: -1 },
    { dc: -1, dr: 1 },
    { dc: 1, dr: 1 },
  ];

  for (const dir of dirs) {
    const nc = piece.col + dir.dc;
    const nr = piece.row + dir.dr;
    if (!isInBoard(nc, nr)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (!target || target.color !== piece.color) {
      moves.push({ col: nc, row: nr });
    }
  }
  return moves;
}

// 兵的攻击格（仅斜吃范围，用于将军判断）
function getPawnAttackSquares(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const forward = piece.color === 'white' ? -1 : 1;
  for (const dc of [-1, 1]) {
    const nc = piece.col + dc;
    const nr = piece.row + forward;
    if (!isInBoard(nc, nr)) continue;
    // 攻击格与是否有敌方棋子无关（用于将军判断时只看攻击范围）
    moves.push({ col: nc, row: nr });
  }
  return moves;
}

// 获取原始走法（含特殊规则），不含"会让自己被将军"的过滤
function getRawMoves(
  pieces: Piece[],
  piece: Piece,
  enPassantTarget: Position | null,
  castlingRights: CastlingRights
): Position[] {
  switch (piece.type) {
    case 'king':
      return getKingMoves(pieces, piece, castlingRights);
    case 'queen':
      return getQueenMoves(pieces, piece);
    case 'rook':
      return getRookMoves(pieces, piece);
    case 'bishop':
      return getBishopMoves(pieces, piece);
    case 'knight':
      return getKnightMoves(pieces, piece);
    case 'pawn':
      return getPawnMoves(pieces, piece, enPassantTarget);
    default:
      return [];
  }
}

// 获取某位置棋子的合法走法（已过滤会令己方被将军的走法）
export function getValidMoves(
  pieces: Piece[],
  col: number,
  row: number,
  enPassantTarget: Position | null = null,
  castlingRights: CastlingRights = INITIAL_CASTLING_RIGHTS
): Position[] {
  const piece = getPieceAt(pieces, col, row);
  if (!piece) return [];

  const rawMoves = getRawMoves(pieces, piece, enPassantTarget, castlingRights);

  return rawMoves.filter((move) => {
    // 模拟走棋后检查自己是否被将军
    const newPieces = simulateMoveForCheck(pieces, piece, move, enPassantTarget);
    return !isInCheck(newPieces, piece.color);
  });
}

// 用于将军判断的走棋模拟（处理过路兵的特殊情况：被吃子不在目标格）
function simulateMoveForCheck(
  pieces: Piece[],
  piece: Piece,
  move: Position,
  enPassantTarget: Position | null
): Piece[] {
  const newPieces = clonePieces(pieces);
  const movingPiece = newPieces.find((p) => p.id === piece.id);
  if (!movingPiece) return newPieces;

  // 移除目标格的棋子（被吃子）
  const targetIndex = newPieces.findIndex((p) => p.col === move.col && p.row === move.row);
  if (targetIndex !== -1) {
    newPieces.splice(targetIndex, 1);
  }

  // 过路兵：兵斜走到空格且该格为 enPassantTarget，需移除对方刚走两格的兵
  if (piece.type === 'pawn' && enPassantTarget
    && move.col === enPassantTarget.col && move.row === enPassantTarget.row
    && piece.col !== move.col) {
    // 被吃的兵位于走棋者的同列、走棋前的行
    const capturedPawnRow = piece.row;
    const capturedIdx = newPieces.findIndex((p) => p.col === move.col && p.row === capturedPawnRow);
    if (capturedIdx !== -1) {
      newPieces.splice(capturedIdx, 1);
    }
  }

  movingPiece.col = move.col;
  movingPiece.row = move.row;
  movingPiece.hasMoved = true;

  // 王车易位：王走两格，需同步移动车
  if (piece.type === 'king' && Math.abs(move.col - piece.col) === 2) {
    const homeRow = piece.row;
    if (move.col === 6) {
      // 短易位：车 col 7 -> 5
      const rook = newPieces.find((p) => p.col === 7 && p.row === homeRow);
      if (rook) {
        rook.col = 5;
        rook.hasMoved = true;
      }
    } else if (move.col === 2) {
      // 长易位：车 col 0 -> 3
      const rook = newPieces.find((p) => p.col === 0 && p.row === homeRow);
      if (rook) {
        rook.col = 3;
        rook.hasMoved = true;
      }
    }
  }

  return newPieces;
}

// 获取某方所有合法走法
export function getAllValidMovesForColor(
  pieces: Piece[],
  color: PieceColor,
  enPassantTarget: Position | null = null,
  castlingRights: CastlingRights = INITIAL_CASTLING_RIGHTS
): { piece: Piece; move: Position }[] {
  const result: { piece: Piece; move: Position }[] = [];
  const colorPieces = pieces.filter((p) => p.color === color);

  for (const piece of colorPieces) {
    const moves = getValidMoves(pieces, piece.col, piece.row, enPassantTarget, castlingRights);
    for (const move of moves) {
      result.push({ piece, move });
    }
  }

  return result;
}

// 是否将杀
export function isCheckmate(
  pieces: Piece[],
  color: PieceColor,
  enPassantTarget: Position | null = null,
  castlingRights: CastlingRights = INITIAL_CASTLING_RIGHTS
): boolean {
  if (!isInCheck(pieces, color)) return false;
  const moves = getAllValidMovesForColor(pieces, color, enPassantTarget, castlingRights);
  return moves.length === 0;
}

// 是否逼和（无棋可走但未被将军）
export function isStalemate(
  pieces: Piece[],
  color: PieceColor,
  enPassantTarget: Position | null = null,
  castlingRights: CastlingRights = INITIAL_CASTLING_RIGHTS
): boolean {
  if (isInCheck(pieces, color)) return false;
  const moves = getAllValidMovesForColor(pieces, color, enPassantTarget, castlingRights);
  return moves.length === 0;
}

// 判断走棋后是否到达升变行
export function isPromotionMove(piece: Piece, toRow: number): boolean {
  if (piece.type !== 'pawn') return false;
  if (piece.color === 'white') {
    return toRow === 0;
  }
  return toRow === 7;
}

// 判断走棋是否为过路兵吃子
export function isEnPassantCapture(
  piece: Piece,
  fromCol: number,
  toCol: number,
  toRow: number,
  enPassantTarget: Position | null
): boolean {
  if (piece.type !== 'pawn') return false;
  if (fromCol === toCol) return false; // 必须斜走
  if (!enPassantTarget) return false;
  return enPassantTarget.col === toCol && enPassantTarget.row === toRow;
}

// 判断走棋是否为王车易位
export function isCastlingMove(piece: Piece, fromCol: number, toCol: number): boolean {
  if (piece.type !== 'king') return false;
  return Math.abs(toCol - fromCol) === 2;
}

// 判断走棋后是否需要更新过路兵目标
// 当且仅当兵从起始格走两格时，目标格成为下一手的过路兵目标
export function getEnPassantTargetAfterMove(
  piece: Piece,
  fromRow: number,
  toRow: number
): Position | null {
  if (piece.type !== 'pawn') return null;
  if (Math.abs(toRow - fromRow) !== 2) return null;
  // 过路兵目标格：兵走过的中间格
  const middleRow = (fromRow + toRow) / 2;
  return { col: piece.col, row: middleRow };
}
