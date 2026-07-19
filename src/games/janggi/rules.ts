// 韩国象棋（Janggi）规则引擎
// 关键差异：
// 1. 无楚河汉界，竖线贯通整个棋盘
// 2. 宫内有 X 对角线（连接宫的四个角通过中心点）
// 3. 马无蹩马腿限制
// 4. 象走"用"字（1直+2斜），无蹩腿限制
// 5. 炮不能跳炮，也不能吃炮
// 6. 兵可前可横（不能后退），无过河概念
// 7. 王/士在宫内可沿宫线（含对角线）走
// 8. 车在宫内可沿对角线走

import type { Piece, PieceColor, Position } from './types';

export const BOARD_COLS = 9;
export const BOARD_ROWS = 10;

// 棋盘判断
export function isInBoard(col: number, row: number): boolean {
  return col >= 0 && col < BOARD_COLS && row >= 0 && row < BOARD_ROWS;
}

// 宫判断：红方在下（row 7-9），蓝方在上（row 0-2），列均为 3-5
export function isInPalace(col: number, row: number, color: PieceColor): boolean {
  if (col < 3 || col > 5) return false;
  if (color === 'red') {
    return row >= 7 && row <= 9;
  } else {
    return row >= 0 && row <= 2;
  }
}

// 判断是否在任意一方的宫内（用于车/炮的对角线移动范围判断）
export function isInAnyPalace(col: number, row: number): boolean {
  if (col < 3 || col > 5) return false;
  return (row >= 0 && row <= 2) || (row >= 7 && row <= 9);
}

// 判断点是否在宫的 X 对角线上
// 上宫 X 线：(3,0)-(5,2) 与 (5,0)-(3,2)，相交于 (4,1)
// 下宫 X 线：(3,7)-(5,9) 与 (5,7)-(3,9)，相交于 (4,8)
// 对角线上的整数点：四角 + 中心点
export function isOnPalaceDiagonal(col: number, row: number): boolean {
  // 上宫
  if (row >= 0 && row <= 2 && col >= 3 && col <= 5) {
    if ((col === 3 && row === 0) || (col === 5 && row === 0) ||
        (col === 3 && row === 2) || (col === 5 && row === 2) ||
        (col === 4 && row === 1)) {
      return true;
    }
  }
  // 下宫
  if (row >= 7 && row <= 9 && col >= 3 && col <= 5) {
    if ((col === 3 && row === 7) || (col === 5 && row === 7) ||
        (col === 3 && row === 9) || (col === 5 && row === 9) ||
        (col === 4 && row === 8)) {
      return true;
    }
  }
  return false;
}

let pieceIdCounter = 0;

function createPiece(color: PieceColor, type: Piece['type'], col: number, row: number): Piece {
  pieceIdCounter += 1;
  return {
    id: `${color}-${type}-${pieceIdCounter}`,
    color,
    type,
    col,
    row,
  };
}

// 初始布局：
// 红方在下：车马象-士王士-象马车（row 9），王居宫中(row 8 col 4)，士在王两侧
// 炮在 row 7 的 col 1、col 7
// 兵在 row 6 的 0,2,4,6,8 列
// 蓝方对称
export function createInitialBoard(): Piece[] {
  pieceIdCounter = 0;
  const pieces: Piece[] = [];

  // 后排：车-马-象-(空)-空-(空)-象-马-车
  const backRank: Array<Piece['type']> = [
    'chariot',
    'horse',
    'elephant',
    'elephant', // 占位（士和王分别在 row 8）
    'elephant', // 占位
    'elephant', // 占位
    'elephant',
    'horse',
    'chariot',
  ];
  // 上面用占位是为了类型推导；实际下面只取 col 0,1,2,6,7,8
  const backPlacement: Array<{ col: number; type: Piece['type'] }> = [
    { col: 0, type: 'chariot' },
    { col: 1, type: 'horse' },
    { col: 2, type: 'elephant' },
    { col: 6, type: 'elephant' },
    { col: 7, type: 'horse' },
    { col: 8, type: 'chariot' },
  ];

  for (const { col, type } of backPlacement) {
    pieces.push(createPiece('blue', type, col, 0));
    pieces.push(createPiece('red', type, col, 9));
  }

  // 王居宫中心
  pieces.push(createPiece('blue', 'king', 4, 1));
  pieces.push(createPiece('red', 'king', 4, 8));

  // 士在王两侧
  pieces.push(createPiece('blue', 'advisor', 3, 1));
  pieces.push(createPiece('blue', 'advisor', 5, 1));
  pieces.push(createPiece('red', 'advisor', 3, 8));
  pieces.push(createPiece('red', 'advisor', 5, 8));

  // 炮：在第三排的 col 1、col 7
  pieces.push(createPiece('blue', 'cannon', 1, 2));
  pieces.push(createPiece('blue', 'cannon', 7, 2));
  pieces.push(createPiece('red', 'cannon', 1, 7));
  pieces.push(createPiece('red', 'cannon', 7, 7));

  // 兵：第四排的 0,2,4,6,8 列
  for (const col of [0, 2, 4, 6, 8]) {
    pieces.push(createPiece('blue', 'soldier', col, 3));
    pieces.push(createPiece('red', 'soldier', col, 6));
  }

  // 消除未使用变量告警
  void backRank;

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

// 王（왕）走法：宫内一步，可沿宫线（含 X 对角线，前提是起点终点都在 X 线上）
function getKingMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  // 直线方向
  const orthoDirs = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
  ];
  // 对角线方向（仅当起点在 X 线上时）
  const diagDirs = [
    { dc: -1, dr: -1 },
    { dc: 1, dr: -1 },
    { dc: -1, dr: 1 },
    { dc: 1, dr: 1 },
  ];

  for (const dir of orthoDirs) {
    const nc = piece.col + dir.dc;
    const nr = piece.row + dir.dr;
    if (!isInPalace(nc, nr, piece.color)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (target && target.color === piece.color) continue;
    moves.push({ col: nc, row: nr });
  }

  if (isOnPalaceDiagonal(piece.col, piece.row)) {
    for (const dir of diagDirs) {
      const nc = piece.col + dir.dc;
      const nr = piece.row + dir.dr;
      if (!isInPalace(nc, nr, piece.color)) continue;
      // 终点也必须在 X 线上
      if (!isOnPalaceDiagonal(nc, nr)) continue;
      const target = getPieceAt(pieces, nc, nr);
      if (target && target.color === piece.color) continue;
      moves.push({ col: nc, row: nr });
    }
  }

  return moves;
}

// 士（사）走法：同王，宫内一步沿宫线
function getAdvisorMoves(pieces: Piece[], piece: Piece): Position[] {
  return getKingMoves(pieces, piece);
}

// 象（상）走法："用"字 - 1 直 + 2 斜，无蹩腿
// 共 8 个落点：(±2, ±3) 与 (±3, ±2)
function getElephantMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const deltas = [
    { dc: -2, dr: -3 },
    { dc: 2, dr: -3 },
    { dc: -2, dr: 3 },
    { dc: 2, dr: 3 },
    { dc: -3, dr: -2 },
    { dc: 3, dr: -2 },
    { dc: -3, dr: 2 },
    { dc: 3, dr: 2 },
  ];

  for (const d of deltas) {
    const nc = piece.col + d.dc;
    const nr = piece.row + d.dr;
    if (!isInBoard(nc, nr)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (target && target.color === piece.color) continue;
    moves.push({ col: nc, row: nr });
  }

  return moves;
}

// 马（마）走法："日"字，无蹩马腿
function getHorseMoves(pieces: Piece[], piece: Piece): Position[] {
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
    if (target && target.color === piece.color) continue;
    moves.push({ col: nc, row: nr });
  }

  return moves;
}

// 车（차）走法：直线滑动；在宫内若起点在 X 线上，可沿对角线滑动
function getChariotMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const orthoDirs = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
  ];

  for (const dir of orthoDirs) {
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

  // 宫内对角线
  if (isOnPalaceDiagonal(piece.col, piece.row)) {
    const diagDirs = [
      { dc: -1, dr: -1 },
      { dc: 1, dr: -1 },
      { dc: -1, dr: 1 },
      { dc: 1, dr: 1 },
    ];
    for (const dir of diagDirs) {
      let col = piece.col + dir.dc;
      let row = piece.row + dir.dr;
      while (isInBoard(col, row) && isOnPalaceDiagonal(col, row)) {
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
  }

  return moves;
}

// 炮（포）走法：必须跳一个子；不能跳炮，也不能吃炮
// 在宫内若起点在 X 线上，可沿对角线跳跃（同样规则）
function getCannonMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  const orthoDirs = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
  ];

  for (const dir of orthoDirs) {
    let col = piece.col + dir.dc;
    let row = piece.row + dir.dr;
    let jumped = false;

    while (isInBoard(col, row)) {
      const target = getPieceAt(pieces, col, row);
      if (!jumped) {
        if (target) {
          // 不能跳炮
          if (target.type === 'cannon') break;
          jumped = true;
        } else {
          moves.push({ col, row });
        }
      } else {
        if (target) {
          // 不能吃炮，不能吃己方
          if (target.type !== 'cannon' && target.color !== piece.color) {
            moves.push({ col, row });
          }
          break;
        }
      }
      col += dir.dc;
      row += dir.dr;
    }
  }

  // 宫内对角线
  if (isOnPalaceDiagonal(piece.col, piece.row)) {
    const diagDirs = [
      { dc: -1, dr: -1 },
      { dc: 1, dr: -1 },
      { dc: -1, dr: 1 },
      { dc: 1, dr: 1 },
    ];
    for (const dir of diagDirs) {
      let col = piece.col + dir.dc;
      let row = piece.row + dir.dr;
      let jumped = false;

      while (isInBoard(col, row) && isOnPalaceDiagonal(col, row)) {
        const target = getPieceAt(pieces, col, row);
        if (!jumped) {
          if (target) {
            if (target.type === 'cannon') break;
            jumped = true;
          } else {
            moves.push({ col, row });
          }
        } else {
          if (target) {
            if (target.type !== 'cannon' && target.color !== piece.color) {
              moves.push({ col, row });
            }
            break;
          }
        }
        col += dir.dc;
        row += dir.dr;
      }
    }
  }

  return moves;
}

// 兵/卒（병/졸）走法：可向前或横向一格，不能后退
// 在敌方宫内若起点终点都在 X 线上，可斜向前进
function getSoldierMoves(pieces: Piece[], piece: Piece): Position[] {
  const moves: Position[] = [];
  // 红方向上(row 减小)，蓝方向下(row 增加)
  const forward = piece.color === 'red' ? -1 : 1;

  // 前进
  const fc = piece.col;
  const fr = piece.row + forward;
  if (isInBoard(fc, fr)) {
    const target = getPieceAt(pieces, fc, fr);
    if (!target || target.color !== piece.color) {
      moves.push({ col: fc, row: fr });
    }
  }

  // 横走（左右）
  for (const dc of [-1, 1]) {
    const nc = piece.col + dc;
    const nr = piece.row;
    if (!isInBoard(nc, nr)) continue;
    const target = getPieceAt(pieces, nc, nr);
    if (!target || target.color !== piece.color) {
      moves.push({ col: nc, row: nr });
    }
  }

  // 宫内对角线斜向前进
  if (isOnPalaceDiagonal(piece.col, piece.row)) {
    for (const dc of [-1, 1]) {
      const nc = piece.col + dc;
      const nr = piece.row + forward;
      if (!isInBoard(nc, nr)) continue;
      if (!isOnPalaceDiagonal(nc, nr)) continue;
      const target = getPieceAt(pieces, nc, nr);
      if (!target || target.color !== piece.color) {
        moves.push({ col: nc, row: nr });
      }
    }
  }

  return moves;
}

function getRawMoves(pieces: Piece[], piece: Piece): Position[] {
  switch (piece.type) {
    case 'king':
      return getKingMoves(pieces, piece);
    case 'advisor':
      return getAdvisorMoves(pieces, piece);
    case 'elephant':
      return getElephantMoves(pieces, piece);
    case 'horse':
      return getHorseMoves(pieces, piece);
    case 'chariot':
      return getChariotMoves(pieces, piece);
    case 'cannon':
      return getCannonMoves(pieces, piece);
    case 'soldier':
      return getSoldierMoves(pieces, piece);
    default:
      return [];
  }
}

function simulateMove(pieces: Piece[], fromCol: number, fromRow: number, toCol: number, toRow: number): Piece[] {
  const newPieces = clonePieces(pieces);
  const movingPiece = newPieces.find((p) => p.col === fromCol && p.row === fromRow);
  if (!movingPiece) return newPieces;

  const targetIndex = newPieces.findIndex((p) => p.col === toCol && p.row === toRow);
  if (targetIndex !== -1) {
    newPieces.splice(targetIndex, 1);
  }

  movingPiece.col = toCol;
  movingPiece.row = toRow;

  return newPieces;
}

// 是否被将军
export function isInCheck(pieces: Piece[], color: PieceColor): boolean {
  const king = getKing(pieces, color);
  if (!king) return false;

  const opponentColor: PieceColor = color === 'red' ? 'blue' : 'red';
  const opponentPieces = pieces.filter((p) => p.color === opponentColor);

  for (const op of opponentPieces) {
    const moves = getRawMoves(pieces, op);
    if (moves.some((m) => m.col === king.col && m.row === king.row)) {
      return true;
    }
  }

  return false;
}

// 获取某位置棋子的合法走法（已过滤会令己方被将军的走法）
export function getValidMoves(pieces: Piece[], fromCol: number, fromRow: number): Position[] {
  const piece = getPieceAt(pieces, fromCol, fromRow);
  if (!piece) return [];

  const rawMoves = getRawMoves(pieces, piece);

  return rawMoves.filter((move) => {
    const newPieces = simulateMove(pieces, fromCol, fromRow, move.col, move.row);
    return !isInCheck(newPieces, piece.color);
  });
}

export function getAllValidMovesForColor(pieces: Piece[], color: PieceColor): { piece: Piece; move: Position }[] {
  const result: { piece: Piece; move: Position }[] = [];
  const colorPieces = pieces.filter((p) => p.color === color);

  for (const piece of colorPieces) {
    const moves = getValidMoves(pieces, piece.col, piece.row);
    for (const move of moves) {
      result.push({ piece, move });
    }
  }

  return result;
}

// 是否将杀
export function isCheckmate(pieces: Piece[], color: PieceColor): boolean {
  if (!isInCheck(pieces, color)) return false;
  const moves = getAllValidMovesForColor(pieces, color);
  return moves.length === 0;
}

// 是否困毙
export function isStalemate(pieces: Piece[], color: PieceColor): boolean {
  if (isInCheck(pieces, color)) return false;
  const moves = getAllValidMovesForColor(pieces, color);
  return moves.length === 0;
}
