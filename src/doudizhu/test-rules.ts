import { createDeck, dealCards, sortCards } from './game/deck';
import {
  getCardType,
  canBeat,
  findAllPlays,
  countByRank,
  getRankName,
  getSuitSymbol,
} from './game/rules';
import type { Card, CardType } from './game/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ ${message}`);
  }
}

function makeCard(suit: string, rank: number, id: string): Card {
  return { suit: suit as any, rank, id };
}

console.log('=== 斗地主核心逻辑测试 ===\n');

console.log('1. 牌组测试 (deck.ts)');
{
  const deck = createDeck();
  assert(deck.length === 54, `createDeck: 54张牌 (实际: ${deck.length})`);

  const uniqueIds = new Set(deck.map(c => c.id));
  assert(uniqueIds.size === 54, 'createDeck: 每张牌id唯一');

  const jokerCount = deck.filter(c => c.suit === 'joker').length;
  assert(jokerCount === 2, `createDeck: 2张王 (实际: ${jokerCount})`);

  const smallJoker = deck.find(c => c.rank === 16);
  const bigJoker = deck.find(c => c.rank === 17);
  assert(!!smallJoker && !!bigJoker, 'createDeck: 大小王点数正确');

  const result = dealCards(deck);
  assert(result.players.length === 3, 'dealCards: 3个玩家');
  assert(result.players[0].length === 17, `dealCards: 玩家1有17张 (实际: ${result.players[0].length})`);
  assert(result.players[1].length === 17, `dealCards: 玩家2有17张 (实际: ${result.players[1].length})`);
  assert(result.players[2].length === 17, `dealCards: 玩家3有17张 (实际: ${result.players[2].length})`);
  assert(result.bottom.length === 3, `dealCards: 3张底牌 (实际: ${result.bottom.length})`);

  const allCards = [...result.players[0], ...result.players[1], ...result.players[2], ...result.bottom];
  assert(allCards.length === 54, 'dealCards: 所有牌加起来54张');

  const p0Sorted = sortCards(result.players[0]);
  let isSorted = true;
  for (let i = 1; i < p0Sorted.length; i++) {
    if (p0Sorted[i].rank < p0Sorted[i - 1].rank) {
      isSorted = false;
      break;
    }
  }
  assert(isSorted, 'sortCards: 按点数从小到大排序');
}

console.log('\n2. 辅助函数测试');
{
  const cards = [
    makeCard('spades', 3, '1'),
    makeCard('hearts', 3, '2'),
    makeCard('clubs', 5, '3'),
  ];
  const counts = countByRank(cards);
  assert(counts.get(3) === 2, `countByRank: 点数3有2张 (实际: ${counts.get(3)})`);
  assert(counts.get(5) === 1, `countByRank: 点数5有1张 (实际: ${counts.get(5)})`);

  assert(getRankName(3) === '3', 'getRankName: 3');
  assert(getRankName(11) === 'J', 'getRankName: J');
  assert(getRankName(14) === 'A', 'getRankName: A');
  assert(getRankName(15) === '2', 'getRankName: 2');
  assert(getRankName(16) === '小王', 'getRankName: 小王');
  assert(getRankName(17) === '大王', 'getRankName: 大王');

  assert(getSuitSymbol('spades') === '♠', 'getSuitSymbol: ♠');
  assert(getSuitSymbol('hearts') === '♥', 'getSuitSymbol: ♥');
  assert(getSuitSymbol('joker') === '王', 'getSuitSymbol: 王');
}

console.log('\n3. 牌型判定测试');
{
  console.log('  单张:');
  const single = [makeCard('spades', 5, '1')];
  const t1 = getCardType(single);
  assert(t1?.type === 'single' && t1.mainRank === 5, `单张5 (type: ${t1?.type}, rank: ${t1?.mainRank})`);

  console.log('  对子:');
  const pair = [makeCard('spades', 8, '1'), makeCard('hearts', 8, '2')];
  const t2 = getCardType(pair);
  assert(t2?.type === 'pair' && t2.mainRank === 8, `对8 (type: ${t2?.type}, rank: ${t2?.mainRank})`);

  console.log('  三张:');
  const triple = [
    makeCard('spades', 10, '1'),
    makeCard('hearts', 10, '2'),
    makeCard('clubs', 10, '3'),
  ];
  const t3 = getCardType(triple);
  assert(t3?.type === 'triple' && t3.mainRank === 10, `三张10 (type: ${t3?.type}, rank: ${t3?.mainRank})`);

  console.log('  三带一:');
  const tripleSingle = [
    makeCard('spades', 7, '1'),
    makeCard('hearts', 7, '2'),
    makeCard('clubs', 7, '3'),
    makeCard('diamonds', 3, '4'),
  ];
  const t4 = getCardType(tripleSingle);
  assert(t4?.type === 'triple_single' && t4.mainRank === 7, `三带一 (7带3) (type: ${t4?.type}, rank: ${t4?.mainRank})`);

  console.log('  三带二:');
  const triplePair = [
    makeCard('spades', 9, '1'),
    makeCard('hearts', 9, '2'),
    makeCard('clubs', 9, '3'),
    makeCard('diamonds', 4, '4'),
    makeCard('spades', 4, '5'),
  ];
  const t5 = getCardType(triplePair);
  assert(t5?.type === 'triple_pair' && t5.mainRank === 9, `三带二 (9带对4) (type: ${t5?.type}, rank: ${t5?.mainRank})`);

  console.log('  顺子:');
  const straight = [
    makeCard('spades', 3, '1'),
    makeCard('hearts', 4, '2'),
    makeCard('clubs', 5, '3'),
    makeCard('diamonds', 6, '4'),
    makeCard('spades', 7, '5'),
  ];
  const t6 = getCardType(straight);
  assert(t6?.type === 'straight' && t6.mainRank === 3 && t6.length === 5,
    `顺子 3-7 (type: ${t6?.type}, rank: ${t6?.mainRank}, len: ${t6?.length})`);

  console.log('  连对:');
  const straightPair = [
    makeCard('spades', 4, '1'),
    makeCard('hearts', 4, '2'),
    makeCard('clubs', 5, '3'),
    makeCard('diamonds', 5, '4'),
    makeCard('spades', 6, '5'),
    makeCard('hearts', 6, '6'),
  ];
  const t7 = getCardType(straightPair);
  assert(t7?.type === 'straight_pair' && t7.mainRank === 4 && t7.length === 3,
    `连对 445566 (type: ${t7?.type}, rank: ${t7?.mainRank}, len: ${t7?.length})`);

  console.log('  飞机 (三顺):');
  const airplane = [
    makeCard('spades', 5, '1'),
    makeCard('hearts', 5, '2'),
    makeCard('clubs', 5, '3'),
    makeCard('diamonds', 6, '4'),
    makeCard('spades', 6, '5'),
    makeCard('hearts', 6, '6'),
  ];
  const t8 = getCardType(airplane);
  assert(t8?.type === 'airplane' && t8.mainRank === 5 && t8.length === 2,
    `飞机 555666 (type: ${t8?.type}, rank: ${t8?.mainRank}, len: ${t8?.length})`);

  console.log('  飞机带单:');
  const airplaneSingle = [
    makeCard('spades', 5, '1'),
    makeCard('hearts', 5, '2'),
    makeCard('clubs', 5, '3'),
    makeCard('diamonds', 6, '4'),
    makeCard('spades', 6, '5'),
    makeCard('hearts', 6, '6'),
    makeCard('clubs', 3, '7'),
    makeCard('diamonds', 4, '8'),
  ];
  const t9 = getCardType(airplaneSingle);
  assert(t9?.type === 'airplane_single' && t9.mainRank === 5 && t9.length === 2,
    `飞机带单 555666+34 (type: ${t9?.type}, rank: ${t9?.mainRank}, len: ${t9?.length})`);

  console.log('  飞机带对:');
  const airplanePair = [
    makeCard('spades', 6, '1'),
    makeCard('hearts', 6, '2'),
    makeCard('clubs', 6, '3'),
    makeCard('diamonds', 7, '4'),
    makeCard('spades', 7, '5'),
    makeCard('hearts', 7, '6'),
    makeCard('clubs', 3, '7'),
    makeCard('diamonds', 3, '8'),
    makeCard('spades', 4, '9'),
    makeCard('hearts', 4, '10'),
  ];
  const t10 = getCardType(airplanePair);
  assert(t10?.type === 'airplane_pair' && t10.mainRank === 6 && t10.length === 2,
    `飞机带对 666777+3344 (type: ${t10?.type}, rank: ${t10?.mainRank}, len: ${t10?.length})`);

  console.log('  四带二 (单张):');
  const fourTwoSingle = [
    makeCard('spades', 8, '1'),
    makeCard('hearts', 8, '2'),
    makeCard('clubs', 8, '3'),
    makeCard('diamonds', 8, '4'),
    makeCard('spades', 3, '5'),
    makeCard('hearts', 5, '6'),
  ];
  const t11 = getCardType(fourTwoSingle);
  assert(t11?.type === 'four_two' && t11.mainRank === 8,
    `四带二 8888+35 (type: ${t11?.type}, rank: ${t11?.mainRank})`);

  console.log('  四带二 (对子):');
  const fourTwoPair = [
    makeCard('spades', 9, '1'),
    makeCard('hearts', 9, '2'),
    makeCard('clubs', 9, '3'),
    makeCard('diamonds', 9, '4'),
    makeCard('spades', 4, '5'),
    makeCard('hearts', 4, '6'),
  ];
  const t12 = getCardType(fourTwoPair);
  assert(t12?.type === 'four_two' && t12.mainRank === 9,
    `四带二 9999+44 (type: ${t12?.type}, rank: ${t12?.mainRank})`);

  console.log('  炸弹:');
  const bomb = [
    makeCard('spades', 10, '1'),
    makeCard('hearts', 10, '2'),
    makeCard('clubs', 10, '3'),
    makeCard('diamonds', 10, '4'),
  ];
  const t13 = getCardType(bomb);
  assert(t13?.type === 'bomb' && t13.mainRank === 10,
    `炸弹 10炸 (type: ${t13?.type}, rank: ${t13?.mainRank})`);

  console.log('  王炸:');
  const rocket = [
    makeCard('joker', 16, '1'),
    makeCard('joker', 17, '2'),
  ];
  const t14 = getCardType(rocket);
  assert(t14?.type === 'rocket' && t14.mainRank === 17,
    `王炸 (type: ${t14?.type}, rank: ${t14?.mainRank})`);
}

console.log('\n4. 无效牌型测试');
{
  const invalid1 = [
    makeCard('spades', 3, '1'),
    makeCard('hearts', 4, '2'),
    makeCard('clubs', 5, '3'),
    makeCard('diamonds', 6, '4'),
  ];
  assert(getCardType(invalid1) === null, '4张不成顺 (只有4张)');

  const invalid2 = [
    makeCard('spades', 10, '1'),
    makeCard('hearts', 11, '2'),
    makeCard('clubs', 12, '3'),
    makeCard('diamonds', 13, '4'),
    makeCard('spades', 15, '5'),
  ];
  assert(getCardType(invalid2) === null, '含2的不成顺');

  const invalid3 = [
    makeCard('spades', 3, '1'),
    makeCard('hearts', 3, '2'),
    makeCard('clubs', 4, '3'),
    makeCard('diamonds', 5, '4'),
  ];
  assert(getCardType(invalid3) === null, '4张不是三带一 (2+1+1)');

  const invalid4 = [
    makeCard('joker', 16, '1'),
    makeCard('spades', 5, '2'),
  ];
  assert(getCardType(invalid4) === null, '小王+单张 不是有效牌型');

  const invalid5 = [
    makeCard('spades', 3, '1'),
    makeCard('hearts', 5, '2'),
    makeCard('clubs', 7, '3'),
    makeCard('diamonds', 9, '4'),
    makeCard('spades', 11, '5'),
  ];
  assert(getCardType(invalid5) === null, '5张不连续不成顺');
}

console.log('\n5. 牌型比较测试 (canBeat)');
{
  function makePlay(cards: Card[]): { cards: Card[]; cardType: CardType; mainRank: number; length: number } {
    const t = getCardType(cards)!;
    return { cards, cardType: t.type, mainRank: t.mainRank, length: t.length };
  }

  const single5 = [makeCard('spades', 5, '1')];
  const single8 = [makeCard('hearts', 8, '2')];
  assert(canBeat(single8, makePlay(single5)), '单张8 > 单张5');
  assert(!canBeat(single5, makePlay(single8)), '单张5 < 单张8');

  const pair7 = [makeCard('spades', 7, '1'), makeCard('hearts', 7, '2')];
  const pair10 = [makeCard('clubs', 10, '3'), makeCard('diamonds', 10, '4')];
  assert(canBeat(pair10, makePlay(pair7)), '对10 > 对7');

  const triple5 = [
    makeCard('spades', 5, '1'),
    makeCard('hearts', 5, '2'),
    makeCard('clubs', 5, '3'),
  ];
  const triple8 = [
    makeCard('spades', 8, '4'),
    makeCard('hearts', 8, '5'),
    makeCard('clubs', 8, '6'),
  ];
  assert(canBeat(triple8, makePlay(triple5)), '三张8 > 三张5');

  const ts5 = [
    makeCard('spades', 5, '1'),
    makeCard('hearts', 5, '2'),
    makeCard('clubs', 5, '3'),
    makeCard('diamonds', 3, '4'),
  ];
  const ts9 = [
    makeCard('spades', 9, '5'),
    makeCard('hearts', 9, '6'),
    makeCard('clubs', 9, '7'),
    makeCard('diamonds', 10, '8'),
  ];
  assert(canBeat(ts9, makePlay(ts5)), '三带一 9带10 > 5带3');

  const tp6 = [
    makeCard('spades', 6, '1'),
    makeCard('hearts', 6, '2'),
    makeCard('clubs', 6, '3'),
    makeCard('diamonds', 4, '4'),
    makeCard('spades', 4, '5'),
  ];
  const tp10 = [
    makeCard('spades', 10, '6'),
    makeCard('hearts', 10, '7'),
    makeCard('clubs', 10, '8'),
    makeCard('diamonds', 7, '9'),
    makeCard('spades', 7, '10'),
  ];
  assert(canBeat(tp10, makePlay(tp6)), '三带二 10带对7 > 6带对4');

  const straight3 = [
    makeCard('spades', 3, '1'),
    makeCard('hearts', 4, '2'),
    makeCard('clubs', 5, '3'),
    makeCard('diamonds', 6, '4'),
    makeCard('spades', 7, '5'),
  ];
  const straight5 = [
    makeCard('hearts', 5, '6'),
    makeCard('clubs', 6, '7'),
    makeCard('diamonds', 7, '8'),
    makeCard('spades', 8, '9'),
    makeCard('hearts', 9, '10'),
  ];
  assert(canBeat(straight5, makePlay(straight3)), '顺子5-9 > 顺子3-7');

  const straight4_6 = [
    makeCard('spades', 4, '1'),
    makeCard('hearts', 5, '2'),
    makeCard('clubs', 6, '3'),
    makeCard('diamonds', 7, '4'),
    makeCard('spades', 8, '5'),
    makeCard('hearts', 9, '6'),
  ];
  assert(!canBeat(straight4_6, makePlay(straight3)), '长度不同不能比 (6张 vs 5张)');

  const sp4 = [
    makeCard('spades', 4, '1'),
    makeCard('hearts', 4, '2'),
    makeCard('clubs', 5, '3'),
    makeCard('diamonds', 5, '4'),
    makeCard('spades', 6, '5'),
    makeCard('hearts', 6, '6'),
  ];
  const sp7 = [
    makeCard('spades', 7, '7'),
    makeCard('hearts', 7, '8'),
    makeCard('clubs', 8, '9'),
    makeCard('diamonds', 8, '10'),
    makeCard('spades', 9, '11'),
    makeCard('hearts', 9, '12'),
  ];
  assert(canBeat(sp7, makePlay(sp4)), '连对 778899 > 445566');

  const ap5 = [
    makeCard('spades', 5, '1'),
    makeCard('hearts', 5, '2'),
    makeCard('clubs', 5, '3'),
    makeCard('diamonds', 6, '4'),
    makeCard('spades', 6, '5'),
    makeCard('hearts', 6, '6'),
  ];
  const ap8 = [
    makeCard('spades', 8, '7'),
    makeCard('hearts', 8, '8'),
    makeCard('clubs', 8, '9'),
    makeCard('diamonds', 9, '10'),
    makeCard('spades', 9, '11'),
    makeCard('hearts', 9, '12'),
  ];
  assert(canBeat(ap8, makePlay(ap5)), '飞机 888999 > 555666');

  const bomb5 = [
    makeCard('spades', 5, '1'),
    makeCard('hearts', 5, '2'),
    makeCard('clubs', 5, '3'),
    makeCard('diamonds', 5, '4'),
  ];
  const bomb10 = [
    makeCard('spades', 10, '5'),
    makeCard('hearts', 10, '6'),
    makeCard('clubs', 10, '7'),
    makeCard('diamonds', 10, '8'),
  ];
  assert(canBeat(bomb10, makePlay(bomb5)), '炸弹 10炸 > 5炸');

  assert(canBeat(bomb5, makePlay(single8)), '炸弹 > 单张');
  assert(canBeat(bomb5, makePlay(pair10)), '炸弹 > 对子');
  assert(canBeat(bomb5, makePlay(straight3)), '炸弹 > 顺子');

  const rocket = [
    makeCard('joker', 16, '1'),
    makeCard('joker', 17, '2'),
  ];
  assert(canBeat(rocket, makePlay(bomb10)), '王炸 > 炸弹');
  assert(canBeat(rocket, makePlay(straight3)), '王炸 > 顺子');
  assert(!canBeat(bomb10, makePlay(rocket)), '炸弹 < 王炸');

  assert(!canBeat(pair7, makePlay(single5)), '不同类型不能压 (对子 vs 单张)');
}

console.log('\n6. findAllPlays 测试');
{
  const hand = [
    makeCard('spades', 3, '1'),
    makeCard('hearts', 3, '2'),
    makeCard('clubs', 4, '3'),
    makeCard('diamonds', 4, '4'),
    makeCard('spades', 5, '5'),
    makeCard('hearts', 5, '6'),
    makeCard('clubs', 5, '7'),
    makeCard('diamonds', 6, '8'),
    makeCard('spades', 7, '9'),
    makeCard('hearts', 8, '10'),
    makeCard('joker', 16, '11'),
    makeCard('joker', 17, '12'),
  ];

  const allPlays = findAllPlays(hand, null);
  assert(allPlays.length > 0, `findAllPlays: 首攻有多种出法 (${allPlays.length} 种)`);

  function makePlay(cards: Card[]): { cards: Card[]; cardType: CardType; mainRank: number; length: number } {
    const t = getCardType(cards)!;
    return { cards, cardType: t.type, mainRank: t.mainRank, length: t.length };
  }

  const single5 = [makeCard('spades', 5, '100')];
  const beatsSingle = findAllPlays(hand, makePlay(single5));
  assert(beatsSingle.length > 0, `能压过单张5的有 ${beatsSingle.length} 种`);

  const pair5 = [makeCard('spades', 5, '100'), makeCard('hearts', 5, '101')];
  const beatsPair = findAllPlays(hand, makePlay(pair5));
  assert(beatsPair.length > 0, `能压过对5的有 ${beatsPair.length} 种`);

  const straight3 = [
    makeCard('spades', 3, '100'),
    makeCard('hearts', 4, '101'),
    makeCard('clubs', 5, '102'),
    makeCard('diamonds', 6, '103'),
    makeCard('spades', 7, '104'),
  ];
  const beatsStraight = findAllPlays(hand, makePlay(straight3));
  assert(beatsStraight.length > 0, `能压过顺子3-7的有 ${beatsStraight.length} 种`);

  const rocket = [makeCard('joker', 16, '100'), makeCard('joker', 17, '101')];
  const beatsRocket = findAllPlays(hand, makePlay(rocket));
  assert(beatsRocket.length === 0, '王炸无人能压');
}

console.log('\n7. 边界情况测试');
{
  const straight12 = [
    makeCard('spades', 10, '1'),
    makeCard('hearts', 11, '2'),
    makeCard('clubs', 12, '3'),
    makeCard('diamonds', 13, '4'),
    makeCard('spades', 14, '5'),
  ];
  const t = getCardType(straight12);
  assert(t?.type === 'straight' && t.mainRank === 10 && t.length === 5,
    `顺子 10JQKA (type: ${t?.type}, rank: ${t?.mainRank})`);

  const notStraight = [
    makeCard('spades', 11, '1'),
    makeCard('hearts', 12, '2'),
    makeCard('clubs', 13, '3'),
    makeCard('diamonds', 14, '4'),
    makeCard('spades', 15, '5'),
  ];
  assert(getCardType(notStraight) === null, '含2不能成顺 (JQKA2)');

  const ap1 = [
    makeCard('spades', 13, '1'),
    makeCard('hearts', 13, '2'),
    makeCard('clubs', 13, '3'),
    makeCard('diamonds', 14, '4'),
    makeCard('spades', 14, '5'),
    makeCard('hearts', 14, '6'),
  ];
  const tap = getCardType(ap1);
  assert(tap?.type === 'airplane' && tap.mainRank === 13,
    `飞机 KKKAAA (type: ${tap?.type}, rank: ${tap?.mainRank})`);

  const ap2 = [
    makeCard('spades', 14, '1'),
    makeCard('hearts', 14, '2'),
    makeCard('clubs', 14, '3'),
    makeCard('diamonds', 15, '4'),
    makeCard('spades', 15, '5'),
    makeCard('hearts', 15, '6'),
  ];
  assert(getCardType(ap2) === null, '含2不能成飞机 (AAA222)');

  const fourWithJoker = [
    makeCard('spades', 8, '1'),
    makeCard('hearts', 8, '2'),
    makeCard('clubs', 8, '3'),
    makeCard('diamonds', 8, '4'),
    makeCard('joker', 16, '5'),
    makeCard('spades', 5, '6'),
  ];
  assert(getCardType(fourWithJoker) === null, '四带二不能带王');

  const apWithJoker = [
    makeCard('spades', 5, '1'),
    makeCard('hearts', 5, '2'),
    makeCard('clubs', 5, '3'),
    makeCard('diamonds', 6, '4'),
    makeCard('spades', 6, '5'),
    makeCard('hearts', 6, '6'),
    makeCard('joker', 16, '7'),
    makeCard('spades', 3, '8'),
  ];
  assert(getCardType(apWithJoker) === null, '飞机带单不能带王');

  const longStraight = [
    makeCard('spades', 3, '1'),
    makeCard('hearts', 4, '2'),
    makeCard('clubs', 5, '3'),
    makeCard('diamonds', 6, '4'),
    makeCard('spades', 7, '5'),
    makeCard('hearts', 8, '6'),
    makeCard('clubs', 9, '7'),
    makeCard('diamonds', 10, '8'),
    makeCard('spades', 11, '9'),
    makeCard('hearts', 12, '10'),
    makeCard('clubs', 13, '11'),
    makeCard('diamonds', 14, '12'),
  ];
  const tl = getCardType(longStraight);
  assert(tl?.type === 'straight' && tl.length === 12,
    `12张长顺 (type: ${tl?.type}, len: ${tl?.length})`);
}

console.log(`\n=== 测试结果 ===`);
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
