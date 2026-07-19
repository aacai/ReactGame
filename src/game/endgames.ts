import type { Piece, PieceColor, PieceType } from './types';

export interface EndgamePosition {
  color: PieceColor;
  type: PieceType;
  col: number;
  row: number;
}

export interface Endgame {
  id: string;
  name: string;
  description: string;
  difficulty: '简单' | '中等' | '困难' | '专家';
  playerColor: PieceColor;
  currentPlayer: PieceColor;
  pieces: EndgamePosition[];
  hint: string;
}

let idCounter = 0;
function makePiece(color: PieceColor, type: PieceType, col: number, row: number): Piece {
  idCounter += 1;
  return {
    id: `eg-${color}-${type}-${idCounter}`,
    color,
    type,
    col,
    row,
  };
}

export function createEndgameBoard(endgame: Endgame): Piece[] {
  idCounter = 0;
  return endgame.pieces.map(p => makePiece(p.color, p.type, p.col, p.row));
}

export const ENDGAMES: Endgame[] = [
  {
    id: 'eg-1',
    name: '车马冷着',
    description: '红方车马配合，步步将军取胜',
    difficulty: '简单',
    playerColor: 'red',
    currentPlayer: 'red',
    pieces: [
      { color: 'red', type: 'king', col: 4, row: 9 },
      { color: 'red', type: 'chariot', col: 4, row: 5 },
      { color: 'red', type: 'horse', col: 3, row: 7 },
      { color: 'black', type: 'king', col: 4, row: 0 },
      { color: 'black', type: 'soldier', col: 4, row: 3 },
      { color: 'black', type: 'elephant', col: 2, row: 0 },
      { color: 'black', type: 'elephant', col: 6, row: 0 },
    ],
    hint: '车马冷着，步步紧逼，利用将军调动黑将',
  },
  {
    id: 'eg-2',
    name: '马炮联攻',
    description: '马后炮经典杀法',
    difficulty: '简单',
    playerColor: 'red',
    currentPlayer: 'red',
    pieces: [
      { color: 'red', type: 'king', col: 4, row: 9 },
      { color: 'red', type: 'horse', col: 4, row: 4 },
      { color: 'red', type: 'cannon', col: 4, row: 5 },
      { color: 'black', type: 'king', col: 4, row: 0 },
      { color: 'black', type: 'advisor', col: 3, row: 0 },
      { color: 'black', type: 'advisor', col: 5, row: 0 },
    ],
    hint: '马跳卧槽，炮在马后形成马后炮杀局',
  },
  {
    id: 'eg-3',
    name: '双车闹宫',
    description: '双车错杀，两车交替将军',
    difficulty: '简单',
    playerColor: 'red',
    currentPlayer: 'red',
    pieces: [
      { color: 'red', type: 'king', col: 4, row: 9 },
      { color: 'red', type: 'chariot', col: 0, row: 5 },
      { color: 'red', type: 'chariot', col: 8, row: 5 },
      { color: 'black', type: 'king', col: 4, row: 0 },
      { color: 'black', type: 'soldier', col: 4, row: 3 },
    ],
    hint: '双车错杀，一车将军另一车占肋',
  },
  {
    id: 'eg-4',
    name: '铁门栓',
    description: '炮镇中路，车马配合破士',
    difficulty: '中等',
    playerColor: 'red',
    currentPlayer: 'red',
    pieces: [
      { color: 'red', type: 'king', col: 4, row: 9 },
      { color: 'red', type: 'chariot', col: 4, row: 6 },
      { color: 'red', type: 'cannon', col: 4, row: 7 },
      { color: 'red', type: 'horse', col: 2, row: 5 },
      { color: 'black', type: 'king', col: 4, row: 0 },
      { color: 'black', type: 'advisor', col: 3, row: 0 },
      { color: 'black', type: 'advisor', col: 5, row: 0 },
      { color: 'black', type: 'elephant', col: 2, row: 0 },
      { color: 'black', type: 'elephant', col: 6, row: 0 },
    ],
    hint: '炮镇中路叫铁门栓，车沉底线将军',
  },
  {
    id: 'eg-5',
    name: '大刀剜心',
    description: '弃车破士，车炮巧胜',
    difficulty: '中等',
    playerColor: 'red',
    currentPlayer: 'red',
    pieces: [
      { color: 'red', type: 'king', col: 4, row: 9 },
      { color: 'red', type: 'chariot', col: 4, row: 3 },
      { color: 'red', type: 'cannon', col: 5, row: 5 },
      { color: 'black', type: 'king', col: 4, row: 0 },
      { color: 'black', type: 'advisor', col: 3, row: 0 },
      { color: 'black', type: 'advisor', col: 5, row: 0 },
      { color: 'black', type: 'elephant', col: 2, row: 0 },
      { color: 'black', type: 'elephant', col: 6, row: 0 },
    ],
    hint: '弃车破士叫大刀剜心，再用车炮攻杀',
  },
  {
    id: 'eg-6',
    name: '海底捞月',
    description: '车炮巧胜单车，经典残局',
    difficulty: '中等',
    playerColor: 'red',
    currentPlayer: 'red',
    pieces: [
      { color: 'red', type: 'king', col: 4, row: 9 },
      { color: 'red', type: 'chariot', col: 4, row: 8 },
      { color: 'red', type: 'cannon', col: 4, row: 9 },
      { color: 'black', type: 'king', col: 4, row: 0 },
      { color: 'black', type: 'chariot', col: 5, row: 5 },
    ],
    hint: '炮借车力，沉底将军叫海底捞月',
  },
  {
    id: 'eg-7',
    name: '马兵巧胜单缺士',
    description: '马兵配合，巧破单士',
    difficulty: '困难',
    playerColor: 'red',
    currentPlayer: 'red',
    pieces: [
      { color: 'red', type: 'king', col: 4, row: 9 },
      { color: 'red', type: 'horse', col: 4, row: 5 },
      { color: 'red', type: 'soldier', col: 4, row: 4 },
      { color: 'black', type: 'king', col: 4, row: 0 },
      { color: 'black', type: 'advisor', col: 3, row: 0 },
      { color: 'black', type: 'elephant', col: 2, row: 0 },
      { color: 'black', type: 'elephant', col: 6, row: 0 },
    ],
    hint: '马兵巧胜单缺士，用兵锁将门',
  },
  {
    id: 'eg-8',
    name: '炮兵巧胜士象全',
    description: '炮兵巧破士象全，高难度残局',
    difficulty: '困难',
    playerColor: 'red',
    currentPlayer: 'red',
    pieces: [
      { color: 'red', type: 'king', col: 4, row: 9 },
      { color: 'red', type: 'cannon', col: 4, row: 5 },
      { color: 'red', type: 'soldier', col: 4, row: 3 },
      { color: 'black', type: 'king', col: 4, row: 0 },
      { color: 'black', type: 'advisor', col: 3, row: 0 },
      { color: 'black', type: 'advisor', col: 5, row: 0 },
      { color: 'black', type: 'elephant', col: 2, row: 0 },
      { color: 'black', type: 'elephant', col: 6, row: 0 },
    ],
    hint: '炮兵巧胜士象全，兵入九宫，炮镇中路',
  },
  {
    id: 'eg-9',
    name: '车马兵攻杀',
    description: '车马兵三子联攻，复杂杀法',
    difficulty: '困难',
    playerColor: 'red',
    currentPlayer: 'red',
    pieces: [
      { color: 'red', type: 'king', col: 4, row: 9 },
      { color: 'red', type: 'chariot', col: 5, row: 4 },
      { color: 'red', type: 'horse', col: 3, row: 4 },
      { color: 'red', type: 'soldier', col: 4, row: 3 },
      { color: 'black', type: 'king', col: 4, row: 0 },
      { color: 'black', type: 'advisor', col: 3, row: 0 },
      { color: 'black', type: 'advisor', col: 5, row: 0 },
      { color: 'black', type: 'chariot', col: 0, row: 5 },
      { color: 'black', type: 'cannon', col: 8, row: 4 },
    ],
    hint: '车马兵联攻，先用兵破士，再用车马杀',
  },
  {
    id: 'eg-10',
    name: '七星聚会',
    description: '经典名局，七子对七子',
    difficulty: '专家',
    playerColor: 'red',
    currentPlayer: 'red',
    pieces: [
      { color: 'red', type: 'king', col: 4, row: 9 },
      { color: 'red', type: 'chariot', col: 0, row: 5 },
      { color: 'red', type: 'horse', col: 2, row: 5 },
      { color: 'red', type: 'cannon', col: 4, row: 6 },
      { color: 'red', type: 'soldier', col: 2, row: 3 },
      { color: 'red', type: 'soldier', col: 6, row: 3 },
      { color: 'red', type: 'soldier', col: 4, row: 4 },
      { color: 'black', type: 'king', col: 4, row: 0 },
      { color: 'black', type: 'chariot', col: 8, row: 5 },
      { color: 'black', type: 'horse', col: 6, row: 5 },
      { color: 'black', type: 'cannon', col: 4, row: 2 },
      { color: 'black', type: 'soldier', col: 2, row: 6 },
      { color: 'black', type: 'soldier', col: 6, row: 6 },
      { color: 'black', type: 'soldier', col: 4, row: 5 },
    ],
    hint: '七星聚会是古典名局，需精密计算，步步紧逼',
  },
  {
    id: 'eg-11',
    name: '野马操田',
    description: '古典四大名局之一，马兵斗车卒',
    difficulty: '专家',
    playerColor: 'red',
    currentPlayer: 'red',
    pieces: [
      { color: 'red', type: 'king', col: 4, row: 9 },
      { color: 'red', type: 'chariot', col: 4, row: 8 },
      { color: 'red', type: 'horse', col: 3, row: 5 },
      { color: 'red', type: 'soldier', col: 4, row: 4 },
      { color: 'red', type: 'soldier', col: 6, row: 6 },
      { color: 'black', type: 'king', col: 4, row: 0 },
      { color: 'black', type: 'chariot', col: 5, row: 4 },
      { color: 'black', type: 'soldier', col: 3, row: 6 },
      { color: 'black', type: 'soldier', col: 5, row: 6 },
    ],
    hint: '野马操田，马兵配合，需防黑车反扑',
  },
  {
    id: 'eg-12',
    name: '千里独行',
    description: '古典四大名局之一，单车巧胜',
    difficulty: '专家',
    playerColor: 'red',
    currentPlayer: 'red',
    pieces: [
      { color: 'red', type: 'king', col: 4, row: 9 },
      { color: 'red', type: 'chariot', col: 8, row: 4 },
      { color: 'red', type: 'soldier', col: 4, row: 5 },
      { color: 'red', type: 'soldier', col: 2, row: 6 },
      { color: 'black', type: 'king', col: 4, row: 0 },
      { color: 'black', type: 'chariot', col: 0, row: 4 },
      { color: 'black', type: 'soldier', col: 4, row: 3 },
      { color: 'black', type: 'soldier', col: 6, row: 3 },
    ],
    hint: '千里独行，单车控将，兵渡河助攻',
  },
];
