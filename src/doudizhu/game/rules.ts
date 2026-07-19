import type { Card, CardType } from './types';

export function countByRank(cards: Card[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const card of cards) {
    map.set(card.rank, (map.get(card.rank) || 0) + 1);
  }
  return map;
}

export function getRankName(rank: number): string {
  if (rank === 16) return '小王';
  if (rank === 17) return '大王';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  if (rank === 15) return '2';
  return String(rank);
}

export function getSuitSymbol(suit: string): string {
  switch (suit) {
    case 'spades': return '♠';
    case 'hearts': return '♥';
    case 'clubs': return '♣';
    case 'diamonds': return '♦';
    case 'joker': return '王';
    default: return '';
  }
}

function isConsecutiveRanks(ranks: number[]): boolean {
  if (ranks.length < 2) return ranks.length === 1;
  const sorted = [...ranks].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] >= 15) return false;
    if (i > 0 && sorted[i] - sorted[i - 1] !== 1) return false;
  }
  return true;
}

function findConsecutiveGroups(ranks: number[], minCount: number): number[][] {
  const validRanks = ranks.filter(r => r < 15).sort((a, b) => a - b);
  const groups: number[][] = [];
  let current: number[] = [];

  for (let i = 0; i < validRanks.length; i++) {
    if (current.length === 0) {
      current.push(validRanks[i]);
    } else if (validRanks[i] === current[current.length - 1] + 1) {
      current.push(validRanks[i]);
    } else {
      if (current.length >= minCount) {
        groups.push([...current]);
      }
      current = [validRanks[i]];
    }
  }
  if (current.length >= minCount) {
    groups.push([...current]);
  }
  return groups;
}

export function getCardType(cards: Card[]): { type: CardType; mainRank: number; length: number } | null {
  if (!cards || cards.length === 0) return null;

  const len = cards.length;
  const rankCount = countByRank(cards);
  const ranks = Array.from(rankCount.keys());

  const counts: number[] = [];
  rankCount.forEach((count) => counts.push(count));
  counts.sort((a, b) => b - a);

  if (len === 2 && ranks.includes(16) && ranks.includes(17)) {
    return { type: 'rocket', mainRank: 17, length: 1 };
  }

  if (len === 4 && counts[0] === 4) {
    return { type: 'bomb', mainRank: ranks.find(r => rankCount.get(r) === 4)!, length: 1 };
  }

  if (len === 1) {
    return { type: 'single', mainRank: cards[0].rank, length: 1 };
  }

  if (len === 2 && counts[0] === 2) {
    return { type: 'pair', mainRank: ranks[0], length: 1 };
  }

  if (len === 3 && counts[0] === 3) {
    return { type: 'triple', mainRank: ranks.find(r => rankCount.get(r) === 3)!, length: 1 };
  }

  if (len === 4 && counts[0] === 3 && counts[1] === 1) {
    const tripleRank = ranks.find(r => rankCount.get(r) === 3)!;
    return { type: 'triple_single', mainRank: tripleRank, length: 1 };
  }

  if (len === 5 && counts[0] === 3 && counts[1] === 2) {
    const tripleRank = ranks.find(r => rankCount.get(r) === 3)!;
    return { type: 'triple_pair', mainRank: tripleRank, length: 1 };
  }

  if (len >= 5 && counts.every(c => c === 1)) {
    if (isConsecutiveRanks(ranks)) {
      const minRank = Math.min(...ranks);
      return { type: 'straight', mainRank: minRank, length: len };
    }
  }

  if (len >= 6 && len % 2 === 0 && counts.every(c => c === 2)) {
    const pairCount = len / 2;
    if (pairCount >= 3 && isConsecutiveRanks(ranks)) {
      const minRank = Math.min(...ranks);
      return { type: 'straight_pair', mainRank: minRank, length: pairCount };
    }
  }

  if (len >= 6 && len % 3 === 0 && counts.every(c => c === 3)) {
    const tripleCount = len / 3;
    if (tripleCount >= 2 && isConsecutiveRanks(ranks)) {
      const minRank = Math.min(...ranks);
      return { type: 'airplane', mainRank: minRank, length: tripleCount };
    }
  }

  if (len >= 8 && len % 4 === 0) {
    const n = len / 4;
    if (n >= 2) {
      const tripleRanks = ranks.filter(r => rankCount.get(r) === 3);
      const singleRanks = ranks.filter(r => rankCount.get(r) === 1);
      if (tripleRanks.length === n && singleRanks.length === n) {
        const consecutiveGroups = findConsecutiveGroups(tripleRanks, n);
        if (consecutiveGroups.some(g => g.length === n)) {
          const group = consecutiveGroups.find(g => g.length === n)!;
          const hasJoker = singleRanks.some(r => r >= 16);
          if (!hasJoker) {
            return { type: 'airplane_single', mainRank: group[0], length: n };
          }
        }
      }
    }
  }

  if (len >= 10 && len % 5 === 0) {
    const n = len / 5;
    if (n >= 2) {
      const tripleRanks = ranks.filter(r => rankCount.get(r) === 3);
      const pairRanks = ranks.filter(r => rankCount.get(r) === 2);
      if (tripleRanks.length === n && pairRanks.length === n) {
        const consecutiveGroups = findConsecutiveGroups(tripleRanks, n);
        if (consecutiveGroups.some(g => g.length === n)) {
          const group = consecutiveGroups.find(g => g.length === n)!;
          const hasJoker = pairRanks.some(r => r >= 16);
          if (!hasJoker) {
            return { type: 'airplane_pair', mainRank: group[0], length: n };
          }
        }
      }
    }
  }

  if (len === 6) {
    const fourRank = ranks.find(r => rankCount.get(r) === 4);
    if (fourRank !== undefined) {
      const remainingRanks = ranks.filter(r => r !== fourRank);
      const remainingCounts = remainingRanks.map(r => rankCount.get(r)!);
      const hasJoker = remainingRanks.some(r => r >= 16);
      if (!hasJoker && (remainingCounts.length === 2 || (remainingCounts.length === 1 && remainingCounts[0] === 2))) {
        return { type: 'four_two', mainRank: fourRank, length: 1 };
      }
    }
  }

  return null;
}

export function canBeat(
  cards: Card[],
  lastPlay: { cards: Card[]; cardType: CardType; mainRank: number; length: number }
): boolean {
  const current = getCardType(cards);
  if (!current) return false;

  if (current.type === 'rocket') {
    return lastPlay.cardType !== 'rocket';
  }

  if (current.type === 'bomb') {
    if (lastPlay.cardType === 'rocket') return false;
    if (lastPlay.cardType === 'bomb') {
      return current.mainRank > lastPlay.mainRank;
    }
    return true;
  }

  if (lastPlay.cardType === 'rocket' || lastPlay.cardType === 'bomb') {
    return false;
  }

  if (current.type !== lastPlay.cardType) return false;
  if (current.length !== lastPlay.length) return false;

  return current.mainRank > lastPlay.mainRank;
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function getCardsByRank(hand: Card[], rank: number): Card[] {
  return hand.filter(c => c.rank === rank);
}

function getRanksWithCount(hand: Card[], count: number): number[] {
  const rankCount = countByRank(hand);
  const result: number[] = [];
  rankCount.forEach((c, r) => {
    if (c >= count) result.push(r);
  });
  return result.sort((a, b) => a - b);
}

function findAllSingle(hand: Card[]): Card[][] {
  return hand.map(c => [c]);
}

function findAllPair(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const pairRanks = getRanksWithCount(hand, 2);
  for (const rank of pairRanks) {
    const cards = getCardsByRank(hand, rank);
    const combos = getCombinations(cards, 2);
    result.push(...combos);
  }
  return result;
}

function findAllTriple(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const tripleRanks = getRanksWithCount(hand, 3);
  for (const rank of tripleRanks) {
    const cards = getCardsByRank(hand, rank);
    const combos = getCombinations(cards, 3);
    result.push(...combos);
  }
  return result;
}

function findAllTripleSingle(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const tripleRanks = getRanksWithCount(hand, 3);
  for (const tRank of tripleRanks) {
    const tripleCards = getCardsByRank(hand, tRank);
    const tripleCombos = getCombinations(tripleCards, 3);
    const otherCards = hand.filter(c => c.rank !== tRank);
    const singleCombos = getCombinations(otherCards, 1);
    for (const t of tripleCombos) {
      for (const s of singleCombos) {
        result.push([...t, ...s]);
      }
    }
  }
  return result;
}

function findAllTriplePair(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const tripleRanks = getRanksWithCount(hand, 3);
  const pairRanks = getRanksWithCount(hand, 2);
  for (const tRank of tripleRanks) {
    const tripleCards = getCardsByRank(hand, tRank);
    const tripleCombos = getCombinations(tripleCards, 3);
    for (const pRank of pairRanks) {
      if (pRank === tRank) continue;
      const pairCards = getCardsByRank(hand, pRank);
      const pairCombos = getCombinations(pairCards, 2);
      for (const t of tripleCombos) {
        for (const p of pairCombos) {
          result.push([...t, ...p]);
        }
      }
    }
  }
  return result;
}

function findAllStraight(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const rankCount = countByRank(hand);
  const singleRanks = Array.from(rankCount.keys()).filter(r => r < 15 && rankCount.get(r)! >= 1).sort((a, b) => a - b);

  const consecutiveGroups: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < singleRanks.length; i++) {
    if (current.length === 0) {
      current.push(singleRanks[i]);
    } else if (singleRanks[i] === current[current.length - 1] + 1) {
      current.push(singleRanks[i]);
    } else {
      if (current.length >= 5) consecutiveGroups.push([...current]);
      current = [singleRanks[i]];
    }
  }
  if (current.length >= 5) consecutiveGroups.push([...current]);

  for (const group of consecutiveGroups) {
    for (let len = 5; len <= group.length; len++) {
      for (let start = 0; start + len <= group.length; start++) {
        const ranks = group.slice(start, start + len);
        const cardsOfRanks = ranks.map(r => getCardsByRank(hand, r));
        function cartesian(arr: Card[][]): Card[][] {
          if (arr.length === 0) return [[]];
          const [first, ...rest] = arr;
          const restResult = cartesian(rest);
          const result: Card[][] = [];
          for (const f of first) {
            for (const r of restResult) {
              result.push([f, ...r]);
            }
          }
          return result;
        }
        result.push(...cartesian(cardsOfRanks));
      }
    }
  }
  return result;
}

function findAllStraightPair(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const rankCount = countByRank(hand);
  const pairRanks = Array.from(rankCount.keys()).filter(r => r < 15 && rankCount.get(r)! >= 2).sort((a, b) => a - b);

  const consecutiveGroups: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < pairRanks.length; i++) {
    if (current.length === 0) {
      current.push(pairRanks[i]);
    } else if (pairRanks[i] === current[current.length - 1] + 1) {
      current.push(pairRanks[i]);
    } else {
      if (current.length >= 3) consecutiveGroups.push([...current]);
      current = [pairRanks[i]];
    }
  }
  if (current.length >= 3) consecutiveGroups.push([...current]);

  for (const group of consecutiveGroups) {
    for (let len = 3; len <= group.length; len++) {
      for (let start = 0; start + len <= group.length; start++) {
        const ranks = group.slice(start, start + len);
        const pairCardsOfRanks = ranks.map(r => getCombinations(getCardsByRank(hand, r), 2));
        function cartesian(arr: Card[][][]): Card[][] {
          if (arr.length === 0) return [[]];
          const [first, ...rest] = arr;
          const restResult = cartesian(rest);
          const result: Card[][] = [];
          for (const f of first) {
            for (const r of restResult) {
              result.push([...f, ...r]);
            }
          }
          return result;
        }
        result.push(...cartesian(pairCardsOfRanks));
      }
    }
  }
  return result;
}

function findAllAirplane(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const rankCount = countByRank(hand);
  const tripleRanks = Array.from(rankCount.keys()).filter(r => r < 15 && rankCount.get(r)! >= 3).sort((a, b) => a - b);

  const consecutiveGroups: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < tripleRanks.length; i++) {
    if (current.length === 0) {
      current.push(tripleRanks[i]);
    } else if (tripleRanks[i] === current[current.length - 1] + 1) {
      current.push(tripleRanks[i]);
    } else {
      if (current.length >= 2) consecutiveGroups.push([...current]);
      current = [tripleRanks[i]];
    }
  }
  if (current.length >= 2) consecutiveGroups.push([...current]);

  for (const group of consecutiveGroups) {
    for (let len = 2; len <= group.length; len++) {
      for (let start = 0; start + len <= group.length; start++) {
        const ranks = group.slice(start, start + len);
        const tripleCardsOfRanks = ranks.map(r => getCombinations(getCardsByRank(hand, r), 3));
        function cartesian(arr: Card[][][]): Card[][] {
          if (arr.length === 0) return [[]];
          const [first, ...rest] = arr;
          const restResult = cartesian(rest);
          const result: Card[][] = [];
          for (const f of first) {
            for (const r of restResult) {
              result.push([...f, ...r]);
            }
          }
          return result;
        }
        result.push(...cartesian(tripleCardsOfRanks));
      }
    }
  }
  return result;
}

function findAllAirplaneSingle(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const airplanes = findAllAirplane(hand);
  const seen = new Set<string>();

  for (const airplane of airplanes) {
    const n = airplane.length / 3;
    const airplaneRanks = new Set(airplane.map(c => c.rank));
    const otherCards = hand.filter(c => !airplaneRanks.has(c.rank) && c.rank < 16);

    if (otherCards.length < n) continue;

    const singleCombos = getCombinations(otherCards, n);
    for (const singles of singleCombos) {
      const play = [...airplane, ...singles];
      const key = play.map(c => c.id).sort().join(',');
      if (!seen.has(key)) {
        seen.add(key);
        result.push(play);
      }
    }
  }
  return result;
}

function findAllAirplanePair(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const airplanes = findAllAirplane(hand);
  const seen = new Set<string>();

  for (const airplane of airplanes) {
    const n = airplane.length / 3;
    const airplaneRanks = new Set(airplane.map(c => c.rank));
    const otherCards = hand.filter(c => !airplaneRanks.has(c.rank) && c.rank < 16);

    const rankCount = countByRank(otherCards);
    const pairRanks = Array.from(rankCount.keys()).filter(r => rankCount.get(r)! >= 2);

    if (pairRanks.length < n) continue;

    const rankCombos = getCombinations(pairRanks, n);
    for (const ranks of rankCombos) {
      const pairCardCombos = ranks.map(r => getCombinations(getCardsByRank(otherCards, r), 2));
      function cartesian(arr: Card[][][]): Card[][] {
        if (arr.length === 0) return [[]];
        const [first, ...rest] = arr;
        const restResult = cartesian(rest);
        const result: Card[][] = [];
        for (const f of first) {
          for (const r of restResult) {
            result.push([...f, ...r]);
          }
        }
        return result;
      }
      const pairCombos = cartesian(pairCardCombos);
      for (const pairs of pairCombos) {
        const play = [...airplane, ...pairs];
        const key = play.map(c => c.id).sort().join(',');
        if (!seen.has(key)) {
          seen.add(key);
          result.push(play);
        }
      }
    }
  }
  return result;
}

function findAllBomb(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const bombRanks = getRanksWithCount(hand, 4);
  for (const rank of bombRanks) {
    const cards = getCardsByRank(hand, rank);
    const combos = getCombinations(cards, 4);
    result.push(...combos);
  }
  return result;
}

function findAllRocket(hand: Card[]): Card[][] {
  const smallJoker = hand.find(c => c.rank === 16);
  const bigJoker = hand.find(c => c.rank === 17);
  if (smallJoker && bigJoker) {
    return [[smallJoker, bigJoker]];
  }
  return [];
}

function findAllFourTwo(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const bombRanks = getRanksWithCount(hand, 4);
  const seen = new Set<string>();

  for (const bRank of bombRanks) {
    const bombCards = getCardsByRank(hand, bRank);
    const bombCombos = getCombinations(bombCards, 4);
    const otherCards = hand.filter(c => c.rank !== bRank && c.rank < 16);

    for (const bomb of bombCombos) {
      const twoSingles = getCombinations(otherCards, 2);
      for (const singles of twoSingles) {
        const play = [...bomb, ...singles];
        const key = play.map(c => c.id).sort().join(',');
        if (!seen.has(key)) {
          seen.add(key);
          result.push(play);
        }
      }

      const rankCount = countByRank(otherCards);
      const pairRanks = Array.from(rankCount.keys()).filter(r => rankCount.get(r)! >= 2);
      for (const pRank of pairRanks) {
        const pairCards = getCardsByRank(otherCards, pRank);
        const pairCombos = getCombinations(pairCards, 2);
        for (const pair of pairCombos) {
          const play = [...bomb, ...pair];
          const key = play.map(c => c.id).sort().join(',');
          if (!seen.has(key)) {
            seen.add(key);
            result.push(play);
          }
        }
      }
    }
  }
  return result;
}

export function findAllPlays(
  hand: Card[],
  lastPlay: { cards: Card[]; cardType: CardType; mainRank: number; length: number } | null
): Card[][] {
  if (!lastPlay) {
    return [
      ...findAllSingle(hand),
      ...findAllPair(hand),
      ...findAllTriple(hand),
      ...findAllTripleSingle(hand),
      ...findAllTriplePair(hand),
      ...findAllStraight(hand),
      ...findAllStraightPair(hand),
      ...findAllAirplane(hand),
      ...findAllAirplaneSingle(hand),
      ...findAllAirplanePair(hand),
      ...findAllFourTwo(hand),
      ...findAllBomb(hand),
      ...findAllRocket(hand),
    ];
  }

  const result: Card[][] = [];

  const bombs = findAllBomb(hand);
  for (const bomb of bombs) {
    if (canBeat(bomb, lastPlay)) {
      result.push(bomb);
    }
  }

  const rockets = findAllRocket(hand);
  for (const rocket of rockets) {
    if (canBeat(rocket, lastPlay)) {
      result.push(rocket);
    }
  }

  if (lastPlay.cardType === 'rocket' || lastPlay.cardType === 'bomb') {
    return result;
  }

  let sameTypePlays: Card[][] = [];
  switch (lastPlay.cardType) {
    case 'single':
      sameTypePlays = findAllSingle(hand);
      break;
    case 'pair':
      sameTypePlays = findAllPair(hand);
      break;
    case 'triple':
      sameTypePlays = findAllTriple(hand);
      break;
    case 'triple_single':
      sameTypePlays = findAllTripleSingle(hand);
      break;
    case 'triple_pair':
      sameTypePlays = findAllTriplePair(hand);
      break;
    case 'straight':
      sameTypePlays = findAllStraight(hand).filter(p => p.length === lastPlay.length);
      break;
    case 'straight_pair':
      sameTypePlays = findAllStraightPair(hand).filter(p => p.length / 2 === lastPlay.length);
      break;
    case 'airplane':
      sameTypePlays = findAllAirplane(hand).filter(p => p.length / 3 === lastPlay.length);
      break;
    case 'airplane_single':
      sameTypePlays = findAllAirplaneSingle(hand).filter(p => p.length / 4 === lastPlay.length);
      break;
    case 'airplane_pair':
      sameTypePlays = findAllAirplanePair(hand).filter(p => p.length / 5 === lastPlay.length);
      break;
    case 'four_two':
      sameTypePlays = findAllFourTwo(hand);
      break;
  }

  for (const play of sameTypePlays) {
    if (canBeat(play, lastPlay)) {
      result.push(play);
    }
  }

  return result;
}
