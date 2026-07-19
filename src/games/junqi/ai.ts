// 军棋暗棋 AI
// - 简单：随机翻棋 + 随机走棋
// - 中等：优先安全吃子，再翻棋，再随机走棋
// - 困难：动作评估（吃子价值、避免送死、位置加分）

import type { Piece } from './types';
import { RANK_VALUES } from './types';
import {
  canMove,
  getValidMoves,
  getPieceAt,
  battle,
  getAllValidActions,
  type Action,
} from './rules';

export type Difficulty = 'easy' | 'medium' | 'hard';

// 简单 AI：完全随机
function getEasyMove(pieces: Piece[], aiColor: 'red' | 'blue'): Action | null {
  const actions = getAllValidActions(pieces, aiColor);
  if (actions.length === 0) return null;
  return actions[Math.floor(Math.random() * actions.length)];
}

// 中等 AI：优先安全吃子，否则倾向于翻棋
function getMediumMove(pieces: Piece[], aiColor: 'red' | 'blue'): Action | null {
  const actions = getAllValidActions(pieces, aiColor);
  if (actions.length === 0) return null;

  // 1. 找可以安全吃子的走法（攻击方存活）
  const safeCaptures: Array<{ action: Action; value: number }> = [];
  for (const action of actions) {
    if (action.type !== 'move') continue;
    const attacker = getPieceAt(pieces, action.from.col, action.from.row);
    const defender = getPieceAt(pieces, action.to.col, action.to.row);
    if (!attacker || !defender || defender.color === aiColor) continue;

    const result = battle(attacker, defender);
    if (result === 'attacker_wins' || result === 'flag_captured') {
      // 工兵挖地雷、大子吃小子等：攻击方存活
      const value = RANK_VALUES[defender.rank];
      safeCaptures.push({ action, value });
    }
  }

  if (safeCaptures.length > 0) {
    // 选价值最高的吃子（司令 > 军长 > ...）
    safeCaptures.sort((a, b) => b.value - a.value);
    return safeCaptures[0].action;
  }

  // 2. 60% 概率翻棋（探索信息）
  const flipActions = actions.filter((a) => a.type === 'flip');
  if (flipActions.length > 0 && Math.random() < 0.6) {
    return flipActions[Math.floor(Math.random() * flipActions.length)];
  }

  // 3. 随机走棋
  return actions[Math.floor(Math.random() * actions.length)];
}

// 困难 AI：动作评估，选最高分
function getHardMove(pieces: Piece[], aiColor: 'red' | 'blue'): Action | null {
  const actions = getAllValidActions(pieces, aiColor);
  if (actions.length === 0) return null;

  let bestScore = -Infinity;
  let bestActions: Action[] = [];

  for (const action of actions) {
    const score = evaluateAction(pieces, action, aiColor);
    if (score > bestScore) {
      bestScore = score;
      bestActions = [action];
    } else if (score === bestScore) {
      bestActions.push(action);
    }
  }

  return bestActions[Math.floor(Math.random() * bestActions.length)];
}

// 评估单个动作的分数
function evaluateAction(
  pieces: Piece[],
  action: Action,
  aiColor: 'red' | 'blue'
): number {
  if (action.type === 'flip') {
    // 翻棋的基础分：略低于普通走棋，但当己方已翻开棋子少时优先
    const myRevealedCount = pieces.filter(
      (p) => p.color === aiColor && p.revealed
    ).length;
    // 己方已翻开棋子越少，翻棋越有价值
    return 30 + (4 - Math.min(myRevealedCount, 4)) * 5 + Math.random() * 5;
  }

  // 走棋评估
  const attacker = getPieceAt(pieces, action.from.col, action.from.row);
  if (!attacker) return -100;

  const defender = getPieceAt(pieces, action.to.col, action.to.row);

  if (!defender) {
    // 移动到空位：基础分 + 中心位置加分 + 接近敌方已翻开棋子的加分
    let score = 10;
    // 中心列加分（col 1, 2 是中心）
    score += (1 - Math.abs(action.to.col - 1.5)) * 2;
    // 接近敌方已翻开棋子的加分（机动性）
    const enemyPieces = pieces.filter(
      (p) => p.color !== aiColor && p.revealed && p.rank !== 'flag' && p.rank !== 'mine'
    );
    for (const enemy of enemyPieces) {
      const dist = Math.abs(enemy.col - action.to.col) + Math.abs(enemy.row - action.to.row);
      if (dist === 1) {
        // 移动到敌方相邻位置：评估是否能赢
        const result = battle(attacker, enemy);
        if (result === 'attacker_wins') {
          score += RANK_VALUES[enemy.rank] * 0.5;  // 有机会吃掉敌方
        } else if (result === 'defender_wins') {
          score -= RANK_VALUES[attacker.rank] * 0.5;  // 会被吃
        }
      }
    }
    return score + Math.random() * 3;
  }

  // 攻击对方棋子
  const result = battle(attacker, defender);
  const atkVal = Math.abs(RANK_VALUES[attacker.rank]);
  const defVal = Math.abs(RANK_VALUES[defender.rank]);

  switch (result) {
    case 'attacker_wins':
      // 安全吃子：得分 = 防守方价值
      return 100 + defVal;
    case 'flag_captured':
      // 吃军旗：胜利
      return 100000;
    case 'both_die':
      // 同归于尽：得分 = 防守方价值 - 攻击方价值
      // 如果防守方价值更高，则同归于尽是赚的
      return 50 + defVal - atkVal;
    case 'defender_wins':
      // 送死：扣分 = 攻击方价值
      return -100 - atkVal;
    default:
      return 0;
  }
}

// 主入口
export function getAIMove(
  pieces: Piece[],
  aiColor: 'red' | 'blue',
  difficulty: Difficulty
): Action | null {
  switch (difficulty) {
    case 'easy':
      return getEasyMove(pieces, aiColor);
    case 'medium':
      return getMediumMove(pieces, aiColor);
    case 'hard':
      return getHardMove(pieces, aiColor);
    default:
      return null;
  }
}
