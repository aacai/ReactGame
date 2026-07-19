import type { Card, CardType, PlayerPosition, Difficulty } from './src/doudizhu/game/types';
import { createDeck, dealCards, sortCards } from './src/doudizhu/game/deck';
import { getCardType, canBeat, findAllPlays } from './src/doudizhu/game/rules';
import { evaluateHandStrength, decideBid, decidePlay } from './src/doudizhu/game/ai';

type PlayHistoryEntry = {
  player: PlayerPosition;
  cards: Card[];
  cardType: CardType | 'pass';
};

const POSITIONS: PlayerPosition[] = ['bottom', 'right', 'left'];

function getNextPosition(current: PlayerPosition): PlayerPosition {
  const index = POSITIONS.indexOf(current);
  return POSITIONS[(index + 1) % 3];
}

function makeCard(rank: number, suit: string = 'spades', id: string = `card_${rank}_${suit}`): Card {
  return { rank, suit: suit as any, id };
}

function log(...args: any[]) {
  console.log(...args);
}

function testEvaluateHandStrength() {
  log('\n=== 测试 evaluateHandStrength ===');

  const weakHand = [
    makeCard(3, 'spades', 'c1'),
    makeCard(5, 'spades', 'c2'),
    makeCard(7, 'spades', 'c3'),
    makeCard(9, 'spades', 'c4'),
    makeCard(11, 'spades', 'c5'),
  ];
  const weakScore = evaluateHandStrength(weakHand);
  log(`弱牌得分: ${weakScore} (预期较低)`);
  if (weakScore < 20) {
    log('✓ 弱牌评分合理');
  } else {
    log('✗ 弱牌评分偏高');
  }

  const strongHand = [
    makeCard(16, 'joker', 'sj'),
    makeCard(17, 'joker', 'bj'),
    makeCard(15, 'spades', 'c1'),
    makeCard(15, 'hearts', 'c2'),
    makeCard(14, 'spades', 'c3'),
    makeCard(14, 'hearts', 'c4'),
    makeCard(14, 'clubs', 'c5'),
    makeCard(14, 'diamonds', 'c6'),
    makeCard(13, 'spades', 'c7'),
    makeCard(13, 'hearts', 'c8'),
    makeCard(13, 'clubs', 'c9'),
    makeCard(13, 'diamonds', 'c10'),
  ];
  const strongScore = evaluateHandStrength(strongHand);
  log(`强牌得分: ${strongScore} (王炸+双炸+大牌，预期很高)`);
  if (strongScore >= 70) {
    log('✓ 强牌评分合理');
  } else {
    log('✗ 强牌评分偏低');
  }

  log('✓ evaluateHandStrength 测试完成');
}

function testDecideBid() {
  log('\n=== 测试 decideBid ===');

  const weakHand = [
    makeCard(3, 'spades', 'c1'),
    makeCard(4, 'spades', 'c2'),
    makeCard(5, 'spades', 'c3'),
    makeCard(7, 'spades', 'c4'),
    makeCard(9, 'spades', 'c5'),
  ];

  const easyBidWeak = decideBid(weakHand, 0, 'bottom', false, 'easy');
  log(`简单难度弱牌叫分: ${easyBidWeak} (预期 0-1)`);
  if (easyBidWeak >= 0 && easyBidWeak <= 1) {
    log('✓ 简单难度弱牌叫分合理');
  } else {
    log('✗ 简单难度弱牌叫分不合理');
  }

  const rocketHand = [
    makeCard(16, 'joker', 'sj'),
    makeCard(17, 'joker', 'bj'),
    makeCard(3, 'spades', 'c1'),
  ];

  const easyBidRocket = decideBid(rocketHand, 0, 'bottom', false, 'easy');
  log(`简单难度王炸叫分: ${easyBidRocket} (预期 3)`);
  if (easyBidRocket === 3) {
    log('✓ 简单难度王炸叫分正确');
  } else {
    log('✗ 简单难度王炸叫分错误');
  }

  const mediumBidRocket = decideBid(rocketHand, 0, 'bottom', false, 'medium');
  log(`中等难度王炸叫分: ${mediumBidRocket} (预期 3)`);
  if (mediumBidRocket === 3) {
    log('✓ 中等难度王炸叫分正确');
  } else {
    log('✗ 中等难度王炸叫分错误');
  }

  const hardBidRocket = decideBid(rocketHand, 0, 'bottom', false, 'hard');
  log(`困难难度王炸叫分: ${hardBidRocket} (预期 3)`);
  if (hardBidRocket === 3) {
    log('✓ 困难难度王炸叫分正确');
  } else {
    log('✗ 困难难度王炸叫分错误');
  }

  log('✓ decideBid 测试完成');
}

function testDecidePlayEasy() {
  log('\n=== 测试简单难度 AI 出牌 ===');

  const hand = sortCards([
    makeCard(3, 'spades', 'c1'),
    makeCard(4, 'spades', 'c2'),
    makeCard(5, 'spades', 'c3'),
    makeCard(6, 'spades', 'c4'),
    makeCard(7, 'spades', 'c5'),
    makeCard(9, 'hearts', 'c6'),
    makeCard(10, 'clubs', 'c7'),
  ]);

  const leadPlay = decidePlay(hand, null, 'bottom', false, 'easy', 17, 20, []);
  log(`简单难度首攻: ${leadPlay ? leadPlay.map(c => c.rank).join(',') : 'pass'}`);
  if (leadPlay && leadPlay.length > 0) {
    const cardType = getCardType(leadPlay);
    log(`牌型: ${cardType?.type}`);
    log('✓ 简单难度首攻正常');
  } else {
    log('✗ 简单难度首攻失败');
  }

  const lastPlay = {
    cards: [makeCard(5, 'spades', 'last1')],
    cardType: 'single' as CardType,
    mainRank: 5,
    length: 1,
  };

  const followPlay = decidePlay(hand, lastPlay, 'bottom', false, 'easy', 17, 20, []);
  log(`简单难度跟牌(对5): ${followPlay ? followPlay.map(c => c.rank).join(',') : 'pass'}`);
  if (followPlay) {
    const beat = canBeat(followPlay, lastPlay);
    log(`能压过: ${beat}`);
    if (beat) {
      log('✓ 简单难度跟牌合法');
    } else {
      log('✗ 简单难度跟牌不合法');
    }
  } else {
    log('简单难度选择 pass');
  }

  log('✓ 简单难度出牌测试完成');
}

function testDecidePlayMedium() {
  log('\n=== 测试中等难度 AI 出牌 ===');

  const hand = sortCards([
    makeCard(3, 'spades', 'c1'),
    makeCard(4, 'spades', 'c2'),
    makeCard(5, 'spades', 'c3'),
    makeCard(6, 'spades', 'c4'),
    makeCard(7, 'spades', 'c5'),
    makeCard(9, 'hearts', 'c6'),
    makeCard(10, 'clubs', 'c7'),
    makeCard(10, 'hearts', 'c8'),
    makeCard(11, 'spades', 'c9'),
    makeCard(11, 'hearts', 'c10'),
    makeCard(12, 'spades', 'c11'),
    makeCard(12, 'hearts', 'c12'),
    makeCard(15, 'spades', 'c13'),
    makeCard(16, 'joker', 'sj'),
  ]);

  const leadPlay = decidePlay(hand, null, 'bottom', false, 'medium', 17, 20, []);
  log(`中等难度首攻: ${leadPlay ? leadPlay.map(c => c.rank).join(',') : 'pass'}`);
  if (leadPlay && leadPlay.length > 0) {
    const cardType = getCardType(leadPlay);
    log(`牌型: ${cardType?.type}`);
    log('✓ 中等难度首攻正常');
  } else {
    log('✗ 中等难度首攻失败');
  }

  const lastPlay = {
    cards: [makeCard(8, 'spades', 'last1')],
    cardType: 'single' as CardType,
    mainRank: 8,
    length: 1,
  };

  const followPlay = decidePlay(hand, lastPlay, 'bottom', false, 'medium', 17, 20, []);
  log(`中等难度跟牌(对8单张): ${followPlay ? followPlay.map(c => c.rank).join(',') : 'pass'}`);
  if (followPlay) {
    const beat = canBeat(followPlay, lastPlay);
    log(`能压过: ${beat}`);
    if (beat) {
      log('✓ 中等难度跟牌合法');
    } else {
      log('✗ 中等难度跟牌不合法');
    }
  } else {
    log('中等难度选择 pass');
  }

  log('✓ 中等难度出牌测试完成');
}

function testDecidePlayHard() {
  log('\n=== 测试困难难度 AI 出牌 ===');

  const hand = sortCards([
    makeCard(3, 'spades', 'c1'),
    makeCard(4, 'spades', 'c2'),
    makeCard(5, 'spades', 'c3'),
    makeCard(6, 'spades', 'c4'),
    makeCard(7, 'spades', 'c5'),
    makeCard(8, 'hearts', 'c6'),
    makeCard(9, 'clubs', 'c7'),
    makeCard(10, 'spades', 'c8'),
    makeCard(10, 'hearts', 'c9'),
    makeCard(10, 'clubs', 'c10'),
    makeCard(10, 'diamonds', 'c11'),
    makeCard(11, 'spades', 'c12'),
    makeCard(12, 'spades', 'c13'),
    makeCard(15, 'spades', 'c14'),
    makeCard(15, 'hearts', 'c15'),
    makeCard(16, 'joker', 'sj'),
    makeCard(17, 'joker', 'bj'),
  ]);

  const leadPlay = decidePlay(hand, null, 'bottom', true, 'hard', 17, 20, []);
  log(`困难难度地主首攻: ${leadPlay ? leadPlay.map(c => c.rank).join(',') : 'pass'}`);
  if (leadPlay && leadPlay.length > 0) {
    const cardType = getCardType(leadPlay);
    log(`牌型: ${cardType?.type}`);
    log('✓ 困难难度首攻正常');
  } else {
    log('✗ 困难难度首攻失败');
  }

  log('✓ 困难难度出牌测试完成');
}

function simulateFullGame(difficulty: Difficulty): boolean {
  const deck = createDeck();
  const { bottom, players: playerCards } = dealCards(deck);

  const players: Record<PlayerPosition, { cards: Card[]; isLandlord: boolean; remaining: number }> = {
    bottom: { cards: playerCards[0], isLandlord: false, remaining: 17 },
    right: { cards: playerCards[1], isLandlord: false, remaining: 17 },
    left: { cards: playerCards[2], isLandlord: false, remaining: 17 },
  };

  let currentBid = 0;
  let bidder: PlayerPosition | null = null;
  let bidCount = 0;
  let currentPlayer: PlayerPosition = POSITIONS[Math.floor(Math.random() * 3)];

  while (bidCount < 3) {
    const bid = decideBid(
      players[currentPlayer].cards,
      currentBid,
      currentPlayer,
      players[currentPlayer].isLandlord,
      difficulty
    );

    if (bid === 3) {
      bidder = currentPlayer;
      currentBid = 3;
      break;
    }

    if (bid > currentBid) {
      currentBid = bid;
      bidder = currentPlayer;
    }

    bidCount++;
    if (bidCount >= 3) break;
    currentPlayer = getNextPosition(currentPlayer);
  }

  if (!bidder || currentBid === 0) {
    return false;
  }

  players[bidder].isLandlord = true;
  players[bidder].cards = sortCards([...players[bidder].cards, ...bottom]);
  players[bidder].remaining = players[bidder].cards.length;

  currentPlayer = bidder;
  let lastPlay: { cards: Card[]; cardType: CardType; mainRank: number; length: number } | null = null;
  let passCount = 0;
  const playHistory: PlayHistoryEntry[] = [];
  let round = 0;

  while (true) {
    round++;
    if (round > 500) {
      log(`  ✗ 游戏轮数过多，可能卡住了`);
      return false;
    }

    const player = players[currentPlayer];
    const isLandlord = player.isLandlord;

    let partnerRemaining = 17;
    let landlordRemaining = 20;
    if (isLandlord) {
      landlordRemaining = player.remaining;
      const others = POSITIONS.filter(p => p !== currentPlayer);
      partnerRemaining = Math.min(...others.map(p => players[p].remaining));
    } else {
      const landlordPos = POSITIONS.find(p => players[p].isLandlord)!;
      landlordRemaining = players[landlordPos].remaining;
      const partnerPos = POSITIONS.find(p => p !== currentPlayer && !players[p].isLandlord)!;
      partnerRemaining = players[partnerPos].remaining;
    }

    const play = decidePlay(
      player.cards,
      lastPlay,
      currentPlayer,
      isLandlord,
      difficulty,
      partnerRemaining,
      landlordRemaining,
      playHistory
    );

    if (play === null) {
      if (!lastPlay) {
        log(`  ✗ 首攻不能 pass`);
        return false;
      }

      playHistory.push({
        player: currentPlayer,
        cards: [],
        cardType: 'pass',
      });

      passCount++;
      if (passCount >= 2) {
        passCount = 0;
        const lastPlayer = lastPlay ? (playHistory.filter(h => h.cardType !== 'pass').slice(-1)[0]?.player || currentPlayer) : currentPlayer;
        currentPlayer = lastPlayer;
        lastPlay = null;
      } else {
        currentPlayer = getNextPosition(currentPlayer);
      }
    } else {
      const cardTypeResult = getCardType(play);
      if (!cardTypeResult) {
        log(`  ✗ 非法牌型: ${play.map(c => c.rank).join(',')}`);
        return false;
      }

      if (lastPlay && lastPlay.cardType !== 'single' as any) {
        if (!canBeat(play, lastPlay)) {
          log(`  ✗ 不能压过上家的牌`);
          log(`    上家: ${lastPlay.cardType} ${lastPlay.mainRank}`);
          log(`    出牌: ${cardTypeResult.type} ${cardTypeResult.mainRank}`);
          return false;
        }
      }

      const cardIds = new Set(play.map(c => c.id));
      const hasAll = play.every(c => player.cards.some(pc => pc.id === c.id));
      if (!hasAll) {
        log(`  ✗ 出了自己没有的牌`);
        return false;
      }

      player.cards = sortCards(player.cards.filter(c => !cardIds.has(c.id)));
      player.remaining = player.cards.length;

      if (player.remaining === 0) {
        return true;
      }

      lastPlay = {
        cards: play,
        cardType: cardTypeResult.type,
        mainRank: cardTypeResult.mainRank,
        length: cardTypeResult.length,
      };

      playHistory.push({
        player: currentPlayer,
        cards: play,
        cardType: cardTypeResult.type,
      });

      passCount = 0;
      currentPlayer = getNextPosition(currentPlayer);
    }
  }
}

function testFullGames() {
  log('\n=== 测试完整游戏 ===');

  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  for (const diff of difficulties) {
    log(`\n测试 ${diff} 难度:`);
    let wins = 0;
    let games = 5;

    for (let i = 0; i < games; i++) {
      const result = simulateFullGame(diff);
      if (result) {
        wins++;
        log(`  游戏 ${i + 1}: ✓ 完成`);
      } else {
        log(`  游戏 ${i + 1}: ✗ 失败`);
      }
    }

    log(`  ${diff} 难度: ${wins}/${games} 局完成`);
    if (wins === games) {
      log(`  ✓ ${diff} 难度全部通过`);
    } else {
      log(`  ✗ ${diff} 难度有失败`);
    }
  }

  log('\n✓ 完整游戏测试完成');
}

function testNoIllegalPlays() {
  log('\n=== 测试不违规出牌 ===');

  let illegalCount = 0;
  const games = 10;

  for (let i = 0; i < games; i++) {
    const deck = createDeck();
    const { bottom, players: playerCards } = dealCards(deck);

    const players: Record<PlayerPosition, { cards: Card[]; isLandlord: boolean }> = {
      bottom: { cards: playerCards[0], isLandlord: false },
      right: { cards: playerCards[1], isLandlord: false },
      left: { cards: playerCards[2], isLandlord: false },
    };

    const allPossiblePlays: Card[][] = findAllPlays(players.bottom.cards, null);

    for (const play of allPossiblePlays) {
      const cardType = getCardType(play);
      if (!cardType) {
        illegalCount++;
      }

      const ids = new Set(play.map(c => c.id));
      if (ids.size !== play.length) {
        illegalCount++;
      }
    }

    const lastPlay = {
      cards: [makeCard(10, 'spades', 'last1')],
      cardType: 'single' as CardType,
      mainRank: 10,
      length: 1,
    };

    const followPlays = findAllPlays(players.bottom.cards, lastPlay);
    for (const play of followPlays) {
      if (!canBeat(play, lastPlay)) {
        illegalCount++;
      }
    }
  }

  log(`违规牌数: ${illegalCount}`);
  if (illegalCount === 0) {
    log('✓ 所有牌都合法');
  } else {
    log('✗ 有违规牌');
  }

  log('✓ 违规出牌测试完成');
}

function main() {
  log('========================================');
  log('  斗地主 AI 决策系统测试');
  log('========================================');

  testEvaluateHandStrength();
  testDecideBid();
  testDecidePlayEasy();
  testDecidePlayMedium();
  testDecidePlayHard();
  testNoIllegalPlays();
  testFullGames();

  log('\n========================================');
  log('  所有测试完成');
  log('========================================');
}

main();
