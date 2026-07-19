import type { Card, CardType, PlayerPosition, Difficulty } from './types';
import { countByRank, getCardType, canBeat, findAllPlays } from './rules';
import { sortCards } from './deck';
import { DouZeroAI, createDouZeroAI, type AIState } from '../onnx';

type LastPlay = { cards: Card[]; cardType: CardType; mainRank: number; length: number } | null;

type PlayHistoryEntry = {
  player: PlayerPosition;
  cards: Card[];
  cardType: CardType | 'pass';
};

/**
 * DouZero AI 实例 (可选)
 *
 * 说明:
 * - 如果启用 DouZero AI,将使用深度强化学习模型
 * - 否则使用启发式 AI
 */
let douzeroAI: DouZeroAI | null = null;

/**
 * 初始化 DouZero AI
 *
 * @param onStateChange 状态变化回调
 * @returns DouZero AI 实例
 *
 * 改动说明:
 * - 创建全局 DouZero AI 实例
 * - 支持异步加载模型
 */
export async function initializeDouZeroAI(
  onStateChange?: (state: AIState) => void,
  forceReload = false
): Promise<DouZeroAI> {
  if (douzeroAI && !forceReload) {
    // 已存在实例：更新回调，直接复用（不再重复加载）
    if (onStateChange) douzeroAI.setOnStateChange(onStateChange);
    return douzeroAI;
  }

  console.log('\n初始化 DouZero AI...');

  douzeroAI = createDouZeroAI({
    difficulty: 'hard',
    onStateChange: (state) => {
      console.log(`DouZero AI 状态: ${state}`);
      onStateChange?.(state);
    },
    onError: (error) => {
      console.error('DouZero AI 错误:', error);
    },
  });

  await douzeroAI.loadModels();

  return douzeroAI;
}

/**
 * 重置 DouZero AI 单例，用于「重新加载模型」按钮真正触发一次重新加载。
 */
export function resetDouZeroAI(): void {
  douzeroAI = null;
}


/**
 * 获取 DouZero AI 实例
 */
export function getDouZeroAI(): DouZeroAI | null {
  return douzeroAI;
}

/**
 * 检查 DouZero AI 是否可用
 */
export function isDouZeroAvailable(): boolean {
  return douzeroAI !== null && douzeroAI.getState() === 'ready';
}

export function evaluateHandStrength(hand: Card[]): number {
  if (hand.length === 0) return 0;

  let score = 25;
  const rankCount = countByRank(hand);
  const ranks = Array.from(rankCount.keys()).sort((a, b) => a - b);

  const hasRocket = rankCount.has(16) && rankCount.has(17);
  if (hasRocket) score += 20;

  const hasSmallJoker = rankCount.has(16);
  const hasBigJoker = rankCount.has(17);
  if (hasSmallJoker && !hasRocket) score += 6;
  if (hasBigJoker && !hasRocket) score += 8;

  let bombCount = 0;
  let maxBombRank = 0;
  rankCount.forEach((count, rank) => {
    if (count === 4) {
      bombCount++;
      if (rank > maxBombRank) maxBombRank = rank;
    }
  });
  score += bombCount * 12;

  const bigCardRanks = [15, 14, 13, 12, 11];
  for (const rank of bigCardRanks) {
    const count = rankCount.get(rank) || 0;
    const weight = rank === 15 ? 5 : rank === 14 ? 3.5 : rank === 13 ? 2.5 : rank === 12 ? 1.5 : 1;
    score += count * weight;
  }

  const smallCardRanks = [3, 4, 5, 6, 7, 8, 9, 10];
  let smallCardCount = 0;
  for (const rank of smallCardRanks) {
    smallCardCount += rankCount.get(rank) || 0;
  }

  const singleCount = ranks.filter(r => (rankCount.get(r) || 0) === 1 && r < 16).length;
  const pairCount = ranks.filter(r => (rankCount.get(r) || 0) === 2).length;
  const tripleCount = ranks.filter(r => (rankCount.get(r) || 0) === 3).length;

  if (singleCount <= 2) score += 6;
  else if (singleCount <= 4) score += 3;
  else if (singleCount <= 6) score += 0;
  else score -= (singleCount - 6) * 2;

  const straightScore = evaluateStraightPotential(ranks, rankCount);
  score += straightScore;

  const pairStraightScore = evaluatePairStraightPotential(ranks, rankCount);
  score += pairStraightScore;

  const airplaneScore = evaluateAirplanePotential(ranks, rankCount);
  score += airplaneScore;

  score += tripleCount * 3;
  score += pairCount * 1;

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return Math.round(score);
}

function evaluateStraightPotential(ranks: number[], rankCount: Map<number, number>): number {
  const validRanks = ranks.filter(r => r < 15 && (rankCount.get(r) || 0) >= 1).sort((a, b) => a - b);
  let maxLen = 0;
  let currentLen = 0;
  let prev = -1;

  for (const r of validRanks) {
    if (prev === -1 || r === prev + 1) {
      currentLen++;
    } else {
      if (currentLen > maxLen) maxLen = currentLen;
      currentLen = 1;
    }
    prev = r;
  }
  if (currentLen > maxLen) maxLen = currentLen;

  if (maxLen >= 5) {
    return Math.min((maxLen - 4) * 2, 8);
  }
  return 0;
}

function evaluatePairStraightPotential(ranks: number[], rankCount: Map<number, number>): number {
  const validRanks = ranks.filter(r => r < 15 && (rankCount.get(r) || 0) >= 2).sort((a, b) => a - b);
  let maxLen = 0;
  let currentLen = 0;
  let prev = -1;

  for (const r of validRanks) {
    if (prev === -1 || r === prev + 1) {
      currentLen++;
    } else {
      if (currentLen > maxLen) maxLen = currentLen;
      currentLen = 1;
    }
    prev = r;
  }
  if (currentLen > maxLen) maxLen = currentLen;

  if (maxLen >= 3) {
    return Math.min((maxLen - 2) * 2, 8);
  }
  return 0;
}

function evaluateAirplanePotential(ranks: number[], rankCount: Map<number, number>): number {
  const validRanks = ranks.filter(r => r < 15 && (rankCount.get(r) || 0) >= 3).sort((a, b) => a - b);
  let maxLen = 0;
  let currentLen = 0;
  let prev = -1;

  for (const r of validRanks) {
    if (prev === -1 || r === prev + 1) {
      currentLen++;
    } else {
      if (currentLen > maxLen) maxLen = currentLen;
      currentLen = 1;
    }
    prev = r;
  }
  if (currentLen > maxLen) maxLen = currentLen;

  if (maxLen >= 2) {
    return Math.min((maxLen - 1) * 3, 10);
  }
  return 0;
}

export function decideBid(
  hand: Card[],
  currentBid: number,
  position: PlayerPosition,
  isLandlord: boolean,
  difficulty: Difficulty
): number {
  const strength = evaluateHandStrength(hand);
  const rankCount = countByRank(hand);
  const hasRocket = rankCount.has(16) && rankCount.has(17);

  if (difficulty === 'easy') {
    if (hasRocket) return 3;
    if (strength >= 55 && currentBid < 2) {
      return Math.random() > 0.3 ? 2 : 1;
    }
    if (strength >= 45 && currentBid < 1) {
      return Math.random() > 0.2 ? 1 : 0;
    }
    if (strength >= 35 && currentBid < 1) {
      return Math.random() > 0.5 ? 1 : 0;
    }
    return 0;
  }

  if (difficulty === 'medium') {
    if (hasRocket && currentBid < 3) return 3;

    let bombCount = 0;
    rankCount.forEach((count) => {
      if (count === 4) bombCount++;
    });
    if (bombCount >= 2 && currentBid < 3) return 3;
    if (bombCount >= 1 && currentBid < 2) return 2;

    if (strength >= 70 && currentBid < 3) return 3;
    if (strength >= 55 && currentBid < 2) return 2;
    if (strength >= 42 && currentBid < 1) return 1;

    const twoCount = rankCount.get(15) || 0;
    if (twoCount >= 2 && strength >= 38 && currentBid < 1) return 1;

    return 0;
  }

  return decideBidHard(hand, currentBid, strength, hasRocket, rankCount);
}

function decideBidHard(
  hand: Card[],
  currentBid: number,
  strength: number,
  hasRocket: boolean,
  rankCount: Map<number, number>
): number {
  let adjustedStrength = strength;

  let bombCount = 0;
  rankCount.forEach((count) => {
    if (count === 4) bombCount++;
  });

  if (hasRocket && bombCount >= 1) adjustedStrength += 10;
  if (bombCount >= 2) adjustedStrength += 10;

  const twoCount = rankCount.get(15) || 0;
  const aCount = rankCount.get(14) || 0;
  if (twoCount >= 2 && aCount >= 2) adjustedStrength += 5;

  const singleCount = Array.from(rankCount.keys()).filter(
    r => r < 16 && rankCount.get(r) === 1
  ).length;
  if (singleCount <= 2) adjustedStrength += 5;
  if (singleCount >= 6) adjustedStrength -= 5;

  if (hasRocket && currentBid < 3) return 3;
  if (bombCount >= 2 && currentBid < 3) return 3;
  if (bombCount >= 1 && currentBid < 2 && adjustedStrength >= 42) return 2;

  if (adjustedStrength >= 72 && currentBid < 3) return 3;
  if (adjustedStrength >= 58 && currentBid < 2) return 2;
  if (adjustedStrength >= 45 && currentBid < 1) return 1;

  if (twoCount >= 2 && currentBid < 1 && adjustedStrength >= 40) return 1;

  return 0;
}

export function decidePlay(
  hand: Card[],
  lastPlay: LastPlay,
  position: PlayerPosition,
  isLandlord: boolean,
  difficulty: Difficulty,
  partnerRemaining: number,
  landlordRemaining: number,
  playHistory: PlayHistoryEntry[],
  landlordPosition?: PlayerPosition
): Card[] | null {
  const sortedHand = sortCards(hand);

  if (!lastPlay) {
    return decideLeadPlay(sortedHand, isLandlord, difficulty, partnerRemaining, landlordRemaining, playHistory);
  }

  return decideFollowPlay(
    sortedHand,
    lastPlay,
    isLandlord,
    difficulty,
    partnerRemaining,
    landlordRemaining,
    playHistory,
    position,
    landlordPosition
  );
}

function decideLeadPlay(
  hand: Card[],
  isLandlord: boolean,
  difficulty: Difficulty,
  partnerRemaining: number,
  landlordRemaining: number,
  playHistory: PlayHistoryEntry[]
): Card[] | null {
  if (hand.length === 0) return null;

  if (difficulty === 'easy') {
    return easyLeadPlay(hand);
  }

  if (difficulty === 'medium') {
    return mediumLeadPlay(hand, isLandlord);
  }

  return hardLeadPlay(hand, isLandlord, partnerRemaining, landlordRemaining, playHistory);
}

function easyLeadPlay(hand: Card[]): Card[] | null {
  const rankCount = countByRank(hand);
  const ranks = Array.from(rankCount.keys()).sort((a, b) => a - b);

  const singles = ranks.filter(r => rankCount.get(r) === 1 && r < 16);
  if (singles.length > 0) {
    const card = hand.find(c => c.rank === singles[0]);
    if (card) return [card];
  }

  const pairs = ranks.filter(r => rankCount.get(r) === 2);
  if (pairs.length > 0) {
    return hand.filter(c => c.rank === pairs[0]);
  }

  const allPlays = findAllPlays(hand, null);
  if (allPlays.length === 0) return null;

  allPlays.sort((a, b) => {
    const typeOrder: Record<string, number> = {
      single: 0, pair: 1, triple: 2, triple_single: 3, triple_pair: 4,
      straight: 5, straight_pair: 6, airplane: 7, airplane_single: 8,
      airplane_pair: 9, four_two: 10, bomb: 11, rocket: 12
    };
    const typeA = getCardType(a)!;
    const typeB = getCardType(b)!;
    if (typeOrder[typeA.type] !== typeOrder[typeB.type]) {
      return typeOrder[typeA.type] - typeOrder[typeB.type];
    }
    return typeA.mainRank - typeB.mainRank;
  });

  return allPlays[0];
}

function mediumLeadPlay(hand: Card[], isLandlord: boolean): Card[] | null {
  const rankCount = countByRank(hand);
  const ranks = Array.from(rankCount.keys()).sort((a, b) => a - b);

  if (hand.length <= 2) {
    const allPlays = findAllPlays(hand, null);
    if (allPlays.length > 0) {
      allPlays.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoA.mainRank - infoB.mainRank;
      });
      return allPlays[0];
    }
  }

  const straightPlay = findBestStraight(hand);
  if (straightPlay && straightPlay.length >= 5) {
    return straightPlay;
  }

  const pairStraight = findBestPairStraight(hand);
  if (pairStraight && pairStraight.length >= 6) {
    return pairStraight;
  }

  const airplanePlay = findBestAirplane(hand);
  if (airplanePlay && airplanePlay.length >= 6) {
    return airplanePlay;
  }

  const triples = ranks.filter(r => rankCount.get(r) === 3 && r < 15);
  if (triples.length > 0) {
    const tripleRank = triples[0];
    const tripleCards = hand.filter(c => c.rank === tripleRank);
    const otherCards = hand.filter(c => c.rank !== tripleRank && c.rank < 16);
    if (otherCards.length > 0) {
      const smallestSingle = otherCards[0];
      return [...tripleCards, smallestSingle];
    }
    return tripleCards;
  }

  const pairs = ranks.filter(r => rankCount.get(r) === 2 && r < 15);
  if (pairs.length > 0) {
    return hand.filter(c => c.rank === pairs[0]);
  }

  const singles = ranks.filter(r => rankCount.get(r) === 1 && r < 16);
  if (singles.length > 0) {
    const card = hand.find(c => c.rank === singles[0]);
    if (card) return [card];
  }

  return easyLeadPlay(hand);
}

function hardLeadPlay(
  hand: Card[],
  isLandlord: boolean,
  partnerRemaining: number,
  landlordRemaining: number,
  playHistory: PlayHistoryEntry[]
): Card[] | null {
  if (hand.length <= 2) {
    const allPlays = findAllPlays(hand, null);
    if (allPlays.length > 0) {
      allPlays.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoA.mainRank - infoB.mainRank;
      });
      return allPlays[0];
    }
  }

  const handInfo = analyzeHand(hand);

  if (handInfo.bombs.length > 0 && hand.length - 4 <= 2) {
    const bomb = handInfo.bombs[0];
    return bomb;
  }

  if (handInfo.straights.length > 0) {
    const bestStraight = handInfo.straights[0];
    if (bestStraight.length >= 7) {
      return bestStraight;
    }
  }

  if (handInfo.pairStraights.length > 0) {
    const best = handInfo.pairStraights[0];
    if (best.length >= 8) {
      return best;
    }
  }

  if (handInfo.airplanes.length > 0) {
    return handInfo.airplanes[0];
  }

  if (!isLandlord && partnerRemaining <= 5 && partnerRemaining > 0) {
    const bigSingle = findBiggestSingle(hand);
    if (bigSingle) {
      return [bigSingle];
    }
  }

  if (isLandlord && landlordRemaining <= 5) {
    const bigPlay = findBiggestNormalPlay(hand);
    if (bigPlay) return bigPlay;
  }

  if (handInfo.triples.length > 0) {
    const tripleRank = handInfo.tripleRanks[0];
    const tripleCards = hand.filter(c => c.rank === tripleRank);
    const singles = handInfo.singleRanks.filter(r => r < 16);
    if (singles.length > 0) {
      const smallestSingle = hand.find(c => c.rank === singles[0])!;
      return [...tripleCards, smallestSingle];
    }
    const pairs = handInfo.pairRanks.filter(r => r < 15);
    if (pairs.length > 0) {
      const pairCards = hand.filter(c => c.rank === pairs[0]);
      return [...tripleCards, ...pairCards];
    }
    return tripleCards;
  }

  if (handInfo.pairs.length > 0) {
    const pairRank = handInfo.pairRanks[0];
    return hand.filter(c => c.rank === pairRank);
  }

  if (handInfo.singles.length > 0) {
    const singleRank = handInfo.singleRanks[0];
    const card = hand.find(c => c.rank === singleRank);
    if (card) return [card];
  }

  return mediumLeadPlay(hand, isLandlord);
}

function decideFollowPlay(
  hand: Card[],
  lastPlay: { cards: Card[]; cardType: CardType; mainRank: number; length: number },
  isLandlord: boolean,
  difficulty: Difficulty,
  partnerRemaining: number,
  landlordRemaining: number,
  playHistory: PlayHistoryEntry[],
  position: PlayerPosition,
  landlordPosition?: PlayerPosition
): Card[] | null {
  const allPlays = findAllPlays(hand, lastPlay);

  if (allPlays.length === 0) {
    return null;
  }

  const lastPlayer = getLastPlayer(playHistory, position);
  const isPartner = !isLandlord && lastPlayer && lastPlayer !== landlordPosition && !isLastPlayerLandlord(lastPlayer, playHistory, landlordPosition);

  if (difficulty === 'easy') {
    return easyFollowPlay(allPlays, lastPlay);
  }

  if (difficulty === 'medium') {
    return mediumFollowPlay(
      hand,
      allPlays,
      lastPlay,
      isLandlord,
      isPartner,
      partnerRemaining,
      landlordRemaining
    );
  }

  return hardFollowPlay(
    hand,
    allPlays,
    lastPlay,
    isLandlord,
    isPartner,
    partnerRemaining,
    landlordRemaining,
    playHistory,
    position
  );
}

function easyFollowPlay(
  allPlays: Card[][],
  lastPlay: { cards: Card[]; cardType: CardType; mainRank: number; length: number }
): Card[] | null {
  const normalPlays = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === lastPlay.cardType;
  });

  if (normalPlays.length > 0) {
    normalPlays.sort((a, b) => {
      const infoA = getCardType(a)!;
      const infoB = getCardType(b)!;
      return infoA.mainRank - infoB.mainRank;
    });
    return normalPlays[0];
  }

  const bombs = allPlays.filter(p => {
    const info = getCardType(p);
    return info && (info.type === 'bomb' || info.type === 'rocket');
  });

  if (bombs.length > 0 && Math.random() < 0.3) {
    bombs.sort((a, b) => {
      const infoA = getCardType(a)!;
      const infoB = getCardType(b)!;
      return infoA.mainRank - infoB.mainRank;
    });
    return bombs[0];
  }

  return null;
}

function mediumFollowPlay(
  hand: Card[],
  allPlays: Card[][],
  lastPlay: { cards: Card[]; cardType: CardType; mainRank: number; length: number },
  isLandlord: boolean,
  isPartner: boolean,
  partnerRemaining: number,
  landlordRemaining: number
): Card[] | null {
  const normalPlays = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === lastPlay.cardType && info.type !== 'bomb' && info.type !== 'rocket';
  });

  const bombs = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === 'bomb';
  });

  const rockets = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === 'rocket';
  });

  if (isPartner && !isLandlord) {
    if (partnerRemaining <= 2 && partnerRemaining > 0) {
      return null;
    }
    if (lastPlay.cardType === 'single' && lastPlay.mainRank >= 14) {
      return null;
    }
    if (lastPlay.cardType === 'pair' && lastPlay.mainRank >= 13) {
      return null;
    }
  }

  if (isLandlord && landlordRemaining <= 4 && landlordRemaining > 0) {
    if (bombs.length > 0) {
      bombs.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoA.mainRank - infoB.mainRank;
      });
      return bombs[0];
    }
    if (rockets.length > 0) {
      return rockets[0];
    }
  }

  if (!isLandlord && landlordRemaining <= 2 && landlordRemaining > 0) {
    if (normalPlays.length > 0) {
      normalPlays.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoB.mainRank - infoA.mainRank;
      });
      return normalPlays[0];
    }
    if (bombs.length > 0) {
      bombs.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoA.mainRank - infoB.mainRank;
      });
      return bombs[0];
    }
    if (rockets.length > 0) {
      return rockets[0];
    }
  }

  if (normalPlays.length > 0) {
    normalPlays.sort((a, b) => {
      const infoA = getCardType(a)!;
      const infoB = getCardType(b)!;
      return infoA.mainRank - infoB.mainRank;
    });

    const bestPlay = normalPlays[0];
    const bestInfo = getCardType(bestPlay)!;

    if (isLandlord) {
      if (bestInfo.mainRank - lastPlay.mainRank <= 3) {
        return bestPlay;
      }
    } else {
      if (bestInfo.mainRank - lastPlay.mainRank <= 2) {
        return bestPlay;
      }
    }
  }

  if (!isPartner && !isLandlord && lastPlay.cardType === 'single' && lastPlay.mainRank >= 15) {
    if (bombs.length > 0) {
      bombs.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoA.mainRank - infoB.mainRank;
      });
      return bombs[0];
    }
  }

  if (hand.length <= 4 && normalPlays.length > 0) {
    normalPlays.sort((a, b) => {
      const infoA = getCardType(a)!;
      const infoB = getCardType(b)!;
      return infoA.mainRank - infoB.mainRank;
    });
    return normalPlays[0];
  }

  return null;
}

function hardFollowPlay(
  hand: Card[],
  allPlays: Card[][],
  lastPlay: { cards: Card[]; cardType: CardType; mainRank: number; length: number },
  isLandlord: boolean,
  isPartner: boolean,
  partnerRemaining: number,
  landlordRemaining: number,
  playHistory: PlayHistoryEntry[],
  position: PlayerPosition,
  landlordPosition?: PlayerPosition
): Card[] | null {
  const handInfo = analyzeHand(hand);

  const normalPlays = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === lastPlay.cardType && info.type !== 'bomb' && info.type !== 'rocket';
  });

  const bombs = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === 'bomb';
  });

  const rockets = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === 'rocket';
  });

  if (hand.length <= lastPlay.cards.length) {
    if (normalPlays.length > 0) {
      normalPlays.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoA.mainRank - infoB.mainRank;
      });
      return normalPlays[0];
    }
    if (bombs.length > 0) {
      bombs.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoA.mainRank - infoB.mainRank;
      });
      return bombs[0];
    }
    if (rockets.length > 0) {
      return rockets[0];
    }
  }

  if (isPartner && !isLandlord) {
    if (partnerRemaining <= 5 && partnerRemaining > 0) {
      return null;
    }
    if (lastPlay.cardType === 'single' && lastPlay.mainRank >= 13) {
      return null;
    }
    if (lastPlay.cardType === 'pair' && lastPlay.mainRank >= 12) {
      return null;
    }
  }

  if (!isLandlord && landlordRemaining <= 2 && landlordRemaining > 0) {
    if (normalPlays.length > 0) {
      normalPlays.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoB.mainRank - infoA.mainRank;
      });
      return normalPlays[0];
    }
    if (bombs.length > 0) {
      bombs.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoA.mainRank - infoB.mainRank;
      });
      return bombs[0];
    }
    if (rockets.length > 0) {
      return rockets[0];
    }
  }

  if (isLandlord && landlordRemaining <= 4 && landlordRemaining > 0) {
    if (bombs.length > 0) {
      bombs.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoA.mainRank - infoB.mainRank;
      });
      return bombs[0];
    }
    if (rockets.length > 0) {
      return rockets[0];
    }
  }

  if (isLandlord) {
    if (normalPlays.length > 0) {
      normalPlays.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoA.mainRank - infoB.mainRank;
      });

      const bestPlay = normalPlays[0];
      const bestInfo = getCardType(bestPlay)!;

      if (bestInfo.mainRank >= 15 || bestInfo.mainRank - lastPlay.mainRank <= 3) {
        return bestPlay;
      }

      if (handInfo.singleRanks.length > 4 && lastPlay.cardType === 'single') {
        return bestPlay;
      }

      if (handInfo.pairRanks.length > 3 && lastPlay.cardType === 'pair') {
        return bestPlay;
      }
    }

    if (lastPlay.cardType === 'single' && lastPlay.mainRank >= 14) {
      if (bombs.length > 0 && hand.length > 12) {
        bombs.sort((a, b) => {
          const infoA = getCardType(a)!;
          const infoB = getCardType(b)!;
          return infoA.mainRank - infoB.mainRank;
        });
        return bombs[0];
      }
    }
  } else {
    if (normalPlays.length > 0) {
      normalPlays.sort((a, b) => {
        const infoA = getCardType(a)!;
        const infoB = getCardType(b)!;
        return infoA.mainRank - infoB.mainRank;
      });

      const bestPlay = normalPlays[0];
      const bestInfo = getCardType(bestPlay)!;

      if (bestInfo.mainRank - lastPlay.mainRank <= 2) {
        if (!isPartner || bestInfo.mainRank - lastPlay.mainRank >= 2) {
          return bestPlay;
        }
      }

      if (lastPlay.cardType === 'single' && lastPlay.mainRank >= 14) {
        if (bestInfo.mainRank >= 15) {
          return bestPlay;
        }
        if (bombs.length > 0 && hand.length > 14) {
          bombs.sort((a, b) => {
            const infoA = getCardType(a)!;
            const infoB = getCardType(b)!;
            return infoA.mainRank - infoB.mainRank;
          });
          return bombs[0];
        }
      }
    }

    if (!isPartner && lastPlay.mainRank >= 15 && lastPlay.cardType === 'single') {
      if (bombs.length > 0 && hand.length > 12) {
        bombs.sort((a, b) => {
          const infoA = getCardType(a)!;
          const infoB = getCardType(b)!;
          return infoA.mainRank - infoB.mainRank;
        });
        return bombs[0];
      }
    }
  }

  if (lastPlay.cardType === 'bomb' || lastPlay.cardType === 'rocket') {
    if (bombs.length > 0 && lastPlay.cardType === 'bomb') {
      const biggerBombs = bombs.filter(p => {
        const info = getCardType(p)!;
        return info.mainRank > lastPlay.mainRank;
      });
      if (biggerBombs.length > 0) {
        biggerBombs.sort((a, b) => {
          const infoA = getCardType(a)!;
          const infoB = getCardType(b)!;
          return infoA.mainRank - infoB.mainRank;
        });
        return biggerBombs[0];
      }
    }
    if (rockets.length > 0) {
      return rockets[0];
    }
    return null;
  }

  if (hand.length <= 6 && normalPlays.length > 0) {
    normalPlays.sort((a, b) => {
      const infoA = getCardType(a)!;
      const infoB = getCardType(b)!;
      return infoA.mainRank - infoB.mainRank;
    });
    return normalPlays[0];
  }

  return null;
}

function findBestStraight(hand: Card[]): Card[] | null {
  const allPlays = findAllPlays(hand, null);
  const straights = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === 'straight';
  });

  if (straights.length === 0) return null;

  straights.sort((a, b) => {
    const infoA = getCardType(a)!;
    const infoB = getCardType(b)!;
    if (infoA.length !== infoB.length) {
      return infoB.length - infoA.length;
    }
    return infoA.mainRank - infoB.mainRank;
  });

  return straights[0];
}

function findBestPairStraight(hand: Card[]): Card[] | null {
  const allPlays = findAllPlays(hand, null);
  const plays = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === 'straight_pair';
  });

  if (plays.length === 0) return null;

  plays.sort((a, b) => {
    const infoA = getCardType(a)!;
    const infoB = getCardType(b)!;
    if (infoA.length !== infoB.length) {
      return infoB.length - infoA.length;
    }
    return infoA.mainRank - infoB.mainRank;
  });

  return plays[0];
}

function findBestAirplane(hand: Card[]): Card[] | null {
  const allPlays = findAllPlays(hand, null);
  const plays = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === 'airplane';
  });

  if (plays.length === 0) return null;

  plays.sort((a, b) => {
    const infoA = getCardType(a)!;
    const infoB = getCardType(b)!;
    if (infoA.length !== infoB.length) {
      return infoB.length - infoA.length;
    }
    return infoA.mainRank - infoB.mainRank;
  });

  return plays[0];
}

interface HandAnalysis {
  singles: Card[];
  singleRanks: number[];
  pairs: Card[][];
  pairRanks: number[];
  triples: Card[][];
  tripleRanks: number[];
  bombs: Card[][];
  bombRanks: number[];
  straights: Card[][];
  pairStraights: Card[][];
  airplanes: Card[][];
  hasRocket: boolean;
}

function analyzeHand(hand: Card[]): HandAnalysis {
  const rankCount = countByRank(hand);
  const ranks = Array.from(rankCount.keys()).sort((a, b) => a - b);

  const singles: Card[] = [];
  const singleRanks: number[] = [];
  const pairs: Card[][] = [];
  const pairRanks: number[] = [];
  const triples: Card[][] = [];
  const tripleRanks: number[] = [];
  const bombs: Card[][] = [];
  const bombRanks: number[] = [];

  for (const rank of ranks) {
    const cards = hand.filter(c => c.rank === rank);
    const count = cards.length;
    if (count === 1 && rank < 16) {
      singles.push(cards[0]);
      singleRanks.push(rank);
    } else if (count === 2) {
      pairs.push(cards);
      pairRanks.push(rank);
    } else if (count === 3) {
      triples.push(cards);
      tripleRanks.push(rank);
    } else if (count === 4) {
      bombs.push(cards);
      bombRanks.push(rank);
    }
  }

  const allPlays = findAllPlays(hand, null);
  const straights = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === 'straight';
  });
  const pairStraights = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === 'straight_pair';
  });
  const airplanes = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type === 'airplane';
  });

  straights.sort((a, b) => {
    const infoA = getCardType(a)!;
    const infoB = getCardType(b)!;
    if (infoA.length !== infoB.length) return infoB.length - infoA.length;
    return infoA.mainRank - infoB.mainRank;
  });

  pairStraights.sort((a, b) => {
    const infoA = getCardType(a)!;
    const infoB = getCardType(b)!;
    if (infoA.length !== infoB.length) return infoB.length - infoA.length;
    return infoA.mainRank - infoB.mainRank;
  });

  airplanes.sort((a, b) => {
    const infoA = getCardType(a)!;
    const infoB = getCardType(b)!;
    if (infoA.length !== infoB.length) return infoB.length - infoA.length;
    return infoA.mainRank - infoB.mainRank;
  });

  const hasRocket = rankCount.has(16) && rankCount.has(17);

  return {
    singles,
    singleRanks,
    pairs,
    pairRanks,
    triples,
    tripleRanks,
    bombs,
    bombRanks,
    straights,
    pairStraights,
    airplanes,
    hasRocket,
  };
}

function findBiggestSingle(hand: Card[]): Card | null {
  const normalCards = hand.filter(c => c.rank < 16);
  if (normalCards.length === 0) return null;
  return normalCards[normalCards.length - 1];
}

function findBiggestNormalPlay(hand: Card[]): Card[] | null {
  const allPlays = findAllPlays(hand, null);
  const normalPlays = allPlays.filter(p => {
    const info = getCardType(p);
    return info && info.type !== 'bomb' && info.type !== 'rocket';
  });

  if (normalPlays.length === 0) {
    if (allPlays.length > 0) return allPlays[0];
    return null;
  }

  normalPlays.sort((a, b) => {
    const infoA = getCardType(a)!;
    const infoB = getCardType(b)!;
    return infoB.mainRank - infoA.mainRank;
  });

  return normalPlays[0];
}

function getLastPlayer(playHistory: PlayHistoryEntry[], currentPosition: PlayerPosition): PlayerPosition | null {
  for (let i = playHistory.length - 1; i >= 0; i--) {
    if (playHistory[i].cardType !== 'pass') {
      return playHistory[i].player;
    }
  }
  return null;
}

function isLastPlayerLandlord(
  lastPlayer: PlayerPosition,
  playHistory: PlayHistoryEntry[],
  landlordPosition?: PlayerPosition
): boolean {
  if (!landlordPosition) return false;
  return lastPlayer === landlordPosition;
}

/**
 * 返回模型给出的前 K 手推荐 (按 Q 值降序)。模型不可用时降级为启发式单步。
 */
export async function decidePlayTopK(
  hand: Card[],
  lastPlay: LastPlay,
  position: PlayerPosition,
  isLandlord: boolean,
  difficulty: Difficulty,
  partnerRemaining: number,
  landlordRemaining: number,
  playHistory: PlayHistoryEntry[],
  landlordPosition?: PlayerPosition,
  k: number = 3
): Promise<Card[][]> {
  try {
    const douzeroAI = getDouZeroAI();
    if (!douzeroAI || douzeroAI.getState() !== 'ready') {
      const single = decidePlay(
        hand, lastPlay, position, isLandlord, difficulty,
        partnerRemaining, landlordRemaining, playHistory, landlordPosition
      );
      return single ? [single] : [];
    }
    const result = await douzeroAI.getTopK(
      hand, lastPlay, position, isLandlord,
      partnerRemaining, landlordRemaining, playHistory, landlordPosition, k
    );
    if (result && result.length > 0) return result;
    const single = decidePlay(
      hand, lastPlay, position, isLandlord, difficulty,
      partnerRemaining, landlordRemaining, playHistory, landlordPosition
    );
    return single ? [single] : [];
  } catch {
    const single = decidePlay(
      hand, lastPlay, position, isLandlord, difficulty,
      partnerRemaining, landlordRemaining, playHistory, landlordPosition
    );
    return single ? [single] : [];
  }
}

/**
 * 异步版本的 decidePlay (支持 DouZero AI)
 *
 * 说明:
 * - 如果 DouZero AI 可用,使用深度强化学习模型
 * - 否则使用启发式 AI
 * - 自动降级策略确保高可用性
 *
 * @param hand 手牌
 * @param lastPlay 上一次出牌
 * @param position 玩家位置
 * @param isLandlord 是否是地主
 * @param difficulty 难度
 * @param partnerRemaining 队友剩余牌数
 * @param landlordRemaining 地主剩余牌数
 * @param playHistory 出牌历史
 * @param landlordPosition 地主位置
 * @returns 出牌决策
 */
export async function decidePlayAsync(
  hand: Card[],
  lastPlay: LastPlay,
  position: PlayerPosition,
  isLandlord: boolean,
  difficulty: Difficulty,
  partnerRemaining: number,
  landlordRemaining: number,
  playHistory: PlayHistoryEntry[],
  landlordPosition?: PlayerPosition
): Promise<Card[] | null> {
  if (douzeroAI && douzeroAI.getState() === 'ready') {
    try {
      const result = await douzeroAI.decidePlay(
        hand,
        lastPlay,
        position,
        isLandlord,
        partnerRemaining,
        landlordRemaining,
        playHistory,
        landlordPosition
      );

      if (result) {
        console.log('使用 DouZero AI 决策');
        return result;
      }
    } catch (error) {
      console.error('DouZero AI 推理失败,使用降级策略:', error);
    }
  }

  return decidePlay(
    hand,
    lastPlay,
    position,
    isLandlord,
    difficulty,
    partnerRemaining,
    landlordRemaining,
    playHistory,
    landlordPosition
  );
}
