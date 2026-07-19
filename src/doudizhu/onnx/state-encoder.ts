/**
 * 游戏状态编码器
 *
 * 功能:
 * - 将游戏状态编码为模型输入张量
 * - 实现 DouZero 的特征编码方案
 */

import type { Card, PlayerPosition } from '../game/types';

/**
 * 卡牌值到列索引的映射
 *
 * 说明:
 * - 3-14 对应 3-A
 * - 17 对应 2
 * - 16 对应小王
 * - 17 对应大王(使用特殊处理)
 */
const Card2Column: Record<number, number> = {
  3: 0, 4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6,
  10: 7, 11: 8, 12: 9, 13: 10, 14: 11, 15: 12,
};

/**
 * 数量到编码数组的映射
 *
 * 说明:
 * - [0,0,0,0] = 0张
 * - [1,0,0,0] = 1张
 * - [1,1,0,0] = 2张
 * - [1,1,1,0] = 3张
 * - [1,1,1,1] = 4张
 */
const NumOnes2Array: Record<number, number[]> = {
  0: [0, 0, 0, 0],
  1: [1, 0, 0, 0],
  2: [1, 1, 0, 0],
  3: [1, 1, 1, 0],
  4: [1, 1, 1, 1],
};

/**
 * 将牌列表编码为 54 维向量
 *
 * 编码规则:
 * - 前 52 维: 矩阵部分 [4, 13] 按 F (Fortran) 顺序展平
 * - 后 2 维: 大小王部分 [小王, 大王]
 *
 * @param cards 牌列表
 * @returns 54 维向量
 */
export function cards2Array(cards: Card[]): number[] {
  const result = new Array(54).fill(0);

  if (cards.length === 0) {
    return result;
  }

  const count: Record<number, number> = {};

  for (const card of cards) {
    const rank = card.rank;
    count[rank] = (count[rank] || 0) + 1;
  }

  const matrix: number[][] = [];

  for (let i = 0; i < 4; i++) {
    matrix[i] = new Array(13).fill(0);
  }

  for (const [rankStr, num] of Object.entries(count)) {
    const rank = parseInt(rankStr, 10);

    if (rank < 20) {
      const col = Card2Column[rank];
      if (col !== undefined) {
        const encoding = NumOnes2Array[num] || [0, 0, 0, 0];
        for (let row = 0; row < 4; row++) {
          matrix[row][col] = encoding[row];
        }
      }
    } else if (rank === 16) {
      result[52] = 1;
    } else if (rank === 17) {
      result[53] = 1;
    }
  }

  for (let col = 0; col < 13; col++) {
    for (let row = 0; row < 4; row++) {
      result[col * 4 + row] = matrix[row][col];
    }
  }

  return result;
}

/**
 * One-hot 编码
 */
function getOneHotArray(value: number, max: number): number[] {
  const result = new Array(max).fill(0);
  if (value >= 0 && value < max) {
    result[value] = 1;
  }
  return result;
}

/**
 * 炸弹数量 One-hot 编码
 */
function getBombOneHot(bombNum: number): number[] {
  return getOneHotArray(bombNum, 15);
}

/**
 * 编码历史动作序列为 [5, 162] 矩阵
 *
 * 说明:
 * - 取最近 15 个动作
 * - 每 3 个动作合并为一行 (斗地主 3 个玩家一轮)
 * - 162 = 54 × 3
 *
 * @param actions 历史动作列表 (牌列表的列表)
 * @returns [5, 162] 矩阵
 */
export function encodeActionSequence(actions: Card[][]): number[][] {
  const length = 15;
  const paddedActions: Card[][] = [];

  if (actions.length < length) {
    const padCount = length - actions.length;
    for (let i = 0; i < padCount; i++) {
      paddedActions.push([]);
    }
  }

  paddedActions.push(...actions.slice(-length));

  const sequence = paddedActions.slice(-length);
  const actionArray: number[][] = [];

  for (const action of sequence) {
    actionArray.push(cards2Array(action));
  }

  const result: number[][] = [];

  for (let i = 0; i < 5; i++) {
    const row: number[] = [];
    for (let j = 0; j < 3; j++) {
      const idx = i * 3 + j;
      if (idx < actionArray.length) {
        row.push(...actionArray[idx]);
      } else {
        row.push(...new Array(54).fill(0));
      }
    }
    result.push(row);
  }

  return result;
}

/**
 * 地主观察编码
 *
 * 特征维度: 373 = 54×6 + 17 + 17 + 15 + 54
 */
export interface LandlordObservation {
  myHandCards: Card[];
  otherHandCards: Card[];
  lastAction: Card[];
  landlordUpPlayedCards: Card[];
  landlordDownPlayedCards: Card[];
  landlordUpNumCardsLeft: number;
  landlordDownNumCardsLeft: number;
  bombNum: number;
  legalActions: Card[][];
  actionHistory: Card[][];
}

/**
 * 农民观察编码
 *
 * 特征维度: 484 = 54×8 + 20 + 17 + 15 + 54
 */
export interface FarmerObservation {
  myHandCards: Card[];
  otherHandCards: Card[];
  landlordPlayedCards: Card[];
  teammatePlayedCards: Card[];
  lastAction: Card[];
  lastLandlordAction: Card[];
  lastTeammateAction: Card[];
  landlordNumCardsLeft: number;
  teammateNumCardsLeft: number;
  bombNum: number;
  legalActions: Card[][];
  actionHistory: Card[][];
}

/**
 * 编码地主观察
 *
 * @param obs 观察对象
 * @returns { z: [num_actions, 5, 162], x: [num_actions, 373] }
 */
export function encodeLandlordObservation(obs: LandlordObservation): {
  z: number[][][];
  x: number[][];
} {
  const numActions = obs.legalActions.length;

  const myHandCards = cards2Array(obs.myHandCards);
  const otherHandCards = cards2Array(obs.otherHandCards);
  const lastAction = cards2Array(obs.lastAction);
  const landlordUpPlayed = cards2Array(obs.landlordUpPlayedCards);
  const landlordDownPlayed = cards2Array(obs.landlordDownPlayedCards);
  const landlordUpNumLeft = getOneHotArray(obs.landlordUpNumCardsLeft, 17);
  const landlordDownNumLeft = getOneHotArray(obs.landlordDownNumCardsLeft, 17);
  const bombNum = getBombOneHot(obs.bombNum);

  const zSeq = encodeActionSequence(obs.actionHistory);

  const z: number[][][] = [];
  const x: number[][] = [];

  for (let i = 0; i < numActions; i++) {
    z.push(zSeq.map(row => [...row]));

    const actionCards = cards2Array(obs.legalActions[i]);

    const xRow = [
      ...myHandCards,
      ...otherHandCards,
      ...lastAction,
      ...landlordUpPlayed,
      ...landlordDownPlayed,
      ...landlordUpNumLeft,
      ...landlordDownNumLeft,
      ...bombNum,
      ...actionCards,
    ];

    x.push(xRow);
  }

  return { z, x };
}

/**
 * 编码农民观察
 *
 * @param obs 观察对象
 * @returns { z: [num_actions, 5, 162], x: [num_actions, 484] }
 */
export function encodeFarmerObservation(obs: FarmerObservation): {
  z: number[][][];
  x: number[][];
} {
  const numActions = obs.legalActions.length;

  const myHandCards = cards2Array(obs.myHandCards);
  const otherHandCards = cards2Array(obs.otherHandCards);
  const landlordPlayed = cards2Array(obs.landlordPlayedCards);
  const teammatePlayed = cards2Array(obs.teammatePlayedCards);
  const lastAction = cards2Array(obs.lastAction);
  const lastLandlordAction = cards2Array(obs.lastLandlordAction);
  const lastTeammateAction = cards2Array(obs.lastTeammateAction);
  const landlordNumLeft = getOneHotArray(obs.landlordNumCardsLeft, 20);
  const teammateNumLeft = getOneHotArray(obs.teammateNumCardsLeft, 17);
  const bombNum = getBombOneHot(obs.bombNum);

  const zSeq = encodeActionSequence(obs.actionHistory);

  const z: number[][][] = [];
  const x: number[][] = [];

  for (let i = 0; i < numActions; i++) {
    z.push(zSeq.map(row => [...row]));

    const actionCards = cards2Array(obs.legalActions[i]);

    const xRow = [
      ...myHandCards,
      ...otherHandCards,
      ...landlordPlayed,
      ...teammatePlayed,
      ...lastAction,
      ...lastLandlordAction,
      ...lastTeammateAction,
      ...landlordNumLeft,
      ...teammateNumLeft,
      ...bombNum,
      ...actionCards,
    ];

    x.push(xRow);
  }

  return { z, x };
}

/**
 * 创建测试用的观察数据
 */
export function createTestObservation(): LandlordObservation {
  const createCard = (rank: number): Card => ({
    rank,
    suit: 'spades',
    id: `${rank}-spades`,
  });

  return {
    myHandCards: [3, 4, 5].map(createCard),
    otherHandCards: [6, 7, 8].map(createCard),
    lastAction: [],
    landlordUpPlayedCards: [],
    landlordDownPlayedCards: [],
    landlordUpNumCardsLeft: 17,
    landlordDownNumCardsLeft: 17,
    bombNum: 0,
    legalActions: [
      [createCard(3)],
      [createCard(4)],
      [],
    ],
    actionHistory: [],
  };
}