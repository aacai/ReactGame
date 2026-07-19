import { useGameStore } from './store/gameStore';
import type { Card, PlayerPosition, Difficulty } from './game/types';
import { createDeck, shuffleDeck, sortCards } from './game/deck';
import { getCardType } from './game/rules';

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

console.log('=== 斗地主状态管理测试 ===\n');

console.log('1. 初始状态测试');
{
  useGameStore.setState(useGameStore.getInitialState());
  const state = useGameStore.getState();

  assert(state.gamePhase === 'waiting', `初始阶段为 waiting (实际: ${state.gamePhase})`);
  assert(state.gameMode === 'pve', `初始模式为 pve (实际: ${state.gameMode})`);
  assert(state.landlordPosition === null, '初始无地主');
  assert(state.currentBid === 0, '初始叫分为 0');
  assert(state.bidder === null, '初始无叫分者');
  assert(state.selectedCards.length === 0, '初始无选中牌');
  assert(state.bottomCards.length === 0, '初始无底牌');
  assert(state.winner === null, '初始无赢家');
  assert(state.myPosition === 'bottom', '玩家位置为 bottom');
  assert(state.soundEnabled === true, '音效默认开启');
  assert(state.countdownEnabled === false, '倒计时默认关闭');
}

console.log('\n2. 发牌测试 (startPvEGame)');
{
  useGameStore.setState(useGameStore.getInitialState());
  const state = useGameStore.getState();
  state.startPvEGame('medium');
  const s = useGameStore.getState();

  assert(s.gamePhase === 'bidding', `开始游戏后阶段为 bidding (实际: ${s.gamePhase})`);
  assert(s.players.bottom.cards.length === 17, `玩家1有17张牌 (实际: ${s.players.bottom.cards.length})`);
  assert(s.players.right.cards.length === 17, `玩家2有17张牌 (实际: ${s.players.right.cards.length})`);
  assert(s.players.left.cards.length === 17, `玩家3有17张牌 (实际: ${s.players.left.cards.length})`);
  assert(s.bottomCards.length === 3, `底牌有3张 (实际: ${s.bottomCards.length})`);
  assert(s.players.bottom.remaining === 17, '玩家1剩余17张');
  assert(s.players.right.remaining === 17, '玩家2剩余17张');
  assert(s.players.left.remaining === 17, '玩家3剩余17张');

  const allCards = [
    ...s.players.bottom.cards,
    ...s.players.right.cards,
    ...s.players.left.cards,
    ...s.bottomCards,
  ];
  assert(allCards.length === 54, `所有牌共54张 (实际: ${allCards.length})`);

  const uniqueIds = new Set(allCards.map(c => c.id));
  assert(uniqueIds.size === 54, '所有牌id唯一');

  assert(['bottom', 'right', 'left'].includes(s.currentPlayer), `当前叫分者是三个位置之一 (实际: ${s.currentPlayer})`);
}

console.log('\n3. 选牌测试');
{
  useGameStore.setState(useGameStore.getInitialState());
  const state = useGameStore.getState();
  state.startPvEGame('medium');
  let s = useGameStore.getState();

  const myCards = s.players.bottom.cards;
  assert(myCards.length > 0, '玩家有牌');

  const firstCard = myCards[0];
  s.selectCard(firstCard.id);
  s = useGameStore.getState();
  assert(s.selectedCards.length === 1 && s.selectedCards[0] === firstCard.id, '选中一张牌');

  s.selectCard(firstCard.id);
  s = useGameStore.getState();
  assert(s.selectedCards.length === 0, '取消选中');

  const secondCard = myCards[1];
  s.selectCard(firstCard.id);
  s.selectCard(secondCard.id);
  s = useGameStore.getState();
  assert(s.selectedCards.length === 2, '选中多张牌');

  s.selectAllCards();
  s = useGameStore.getState();
  assert(s.selectedCards.length === myCards.length, '全选所有牌');

  s.selectAllCards();
  s = useGameStore.getState();
  assert(s.selectedCards.length === 0, '取消全选');

  const rightCard = s.players.right.cards[0];
  const prevSelected = s.selectedCards.length;
  s.selectCard(rightCard.id);
  s = useGameStore.getState();
  assert(s.selectedCards.length === prevSelected, '不能选别人的牌');
}

console.log('\n4. 叫地主流程测试');
{
  useGameStore.setState(useGameStore.getInitialState());
  const state = useGameStore.getState();
  state.startPvEGame('easy');

  const s0 = useGameStore.getState();
  const firstBidder = s0.currentPlayer;
  assert(s0.currentBid === 0, '初始叫分 0');
  assert(s0.bidCount === 0, '初始叫分次数 0');

  s0.bid(1);
  const s1 = useGameStore.getState();
  assert(s1.currentBid === 1, `第一个人叫1分 (实际: ${s1.currentBid})`);
  assert(s1.bidder === firstBidder, `第一个叫分者为最高分者 (实际: ${s1.bidder})`);
  assert(s1.bidCount === 1, `已叫1次 (实际: ${s1.bidCount})`);
  assert(s1.gamePhase === 'bidding', '仍在叫分阶段');

  s1.bid(2);
  const s2 = useGameStore.getState();
  assert(s2.currentBid === 2, `第二个人叫2分 (实际: ${s2.currentBid})`);
  assert(s2.bidCount === 2, `已叫2次 (实际: ${s2.bidCount})`);

  s2.bid(0);
  const s3 = useGameStore.getState();
  assert(s3.bidCount === 3, `三人都叫过了 (实际: ${s3.bidCount})`);
  assert(s3.gamePhase === 'playing', `三人叫完后进入出牌阶段 (实际: ${s3.gamePhase})`);
  assert(s3.landlordPosition !== null, '已确定地主');
  assert(s3.players[s3.landlordPosition!].isLandlord === true, '地主标记正确');
  assert(s3.players[s3.landlordPosition!].cards.length === 20, `地主有20张牌 (实际: ${s3.players[s3.landlordPosition!].cards.length})`);
  assert(s3.currentPlayer === s3.landlordPosition, '地主先出牌');
}

console.log('\n5. 叫3分直接当地主测试');
{
  useGameStore.setState(useGameStore.getInitialState());
  const state = useGameStore.getState();
  state.startPvEGame('hard');

  const s0 = useGameStore.getState();
  const firstBidder = s0.currentPlayer;

  s0.bid(3);
  const s1 = useGameStore.getState();
  assert(s1.gamePhase === 'playing', `叫3分直接进入出牌阶段 (实际: ${s1.gamePhase})`);
  assert(s1.landlordPosition === firstBidder, `叫3分者成为地主 (实际: ${s1.landlordPosition})`);
  assert(s1.currentBid === 3, `叫分为3 (实际: ${s1.currentBid})`);
}

console.log('\n6. 出牌流程测试');
{
  const testCards: Record<PlayerPosition, Card[]> = {
    bottom: [
      makeCard('spades', 3, 'b1'),
      makeCard('hearts', 4, 'b2'),
      makeCard('clubs', 5, 'b3'),
      makeCard('diamonds', 6, 'b4'),
      makeCard('spades', 7, 'b5'),
      makeCard('hearts', 8, 'b6'),
      makeCard('clubs', 9, 'b7'),
      makeCard('diamonds', 10, 'b8'),
      makeCard('spades', 11, 'b9'),
      makeCard('hearts', 12, 'b10'),
      makeCard('clubs', 13, 'b11'),
      makeCard('diamonds', 14, 'b12'),
      makeCard('spades', 15, 'b13'),
      makeCard('hearts', 3, 'b14'),
      makeCard('clubs', 4, 'b15'),
      makeCard('diamonds', 5, 'b16'),
      makeCard('spades', 6, 'b17'),
      makeCard('hearts', 7, 'b18'),
      makeCard('clubs', 8, 'b19'),
      makeCard('diamonds', 9, 'b20'),
    ],
    right: [
      makeCard('spades', 10, 'r1'),
      makeCard('hearts', 11, 'r2'),
      makeCard('clubs', 12, 'r3'),
    ],
    left: [
      makeCard('diamonds', 13, 'l1'),
      makeCard('spades', 14, 'l2'),
      makeCard('hearts', 15, 'l3'),
    ],
  };

  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.setState({
    gamePhase: 'playing',
    currentPlayer: 'bottom',
    landlordPosition: 'bottom',
    players: {
      bottom: { position: 'bottom', name: '我', cards: testCards.bottom, isLandlord: true, isAutoPlay: false, remaining: 20 },
      right: { position: 'right', name: '右家', cards: testCards.right, isLandlord: false, isAutoPlay: true, remaining: 3 },
      left: { position: 'left', name: '左家', cards: testCards.left, isLandlord: false, isAutoPlay: true, remaining: 3 },
    },
    lastPlay: null,
    passCount: 0,
    selectedCards: [],
    bottomCards: [],
  });

  let s = useGameStore.getState();
  assert(s.gamePhase === 'playing', '进入出牌阶段');
  assert(s.landlordPosition === 'bottom', '地主是玩家');
  assert(s.currentPlayer === 'bottom', '轮到玩家出牌');

  const singleCard = s.players.bottom.cards[0];
  s.selectCard(singleCard.id);
  const result = s.playCards();
  s = useGameStore.getState();
  assert(result === true, '地主首攻出牌成功');
  assert(s.lastPlay !== null, '有上一手牌');
  assert(s.lastPlay?.player === 'bottom', '上一手是玩家出的');
  assert(s.lastPlay?.cardType === 'single', '牌型为单张');
  assert(s.players.bottom.remaining === 19, `玩家剩余19张 (实际: ${s.players.bottom.remaining})`);
  assert(s.currentPlayer === 'right', '轮到右家');
  assert(s.selectedCards.length === 0, '出牌后清空选中');
}

console.log('\n7. 不出 (pass) 测试');
{
  const testCards: Record<PlayerPosition, Card[]> = {
    bottom: [
      makeCard('spades', 5, 'b1'),
      makeCard('hearts', 6, 'b2'),
    ],
    right: [makeCard('clubs', 10, 'r1')],
    left: [makeCard('diamonds', 12, 'l1')],
  };

  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.setState({
    gamePhase: 'playing',
    currentPlayer: 'bottom',
    landlordPosition: 'bottom',
    players: {
      bottom: { position: 'bottom', name: '我', cards: testCards.bottom, isLandlord: true, isAutoPlay: false, remaining: 2 },
      right: { position: 'right', name: '右家', cards: testCards.right, isLandlord: false, isAutoPlay: true, remaining: 1 },
      left: { position: 'left', name: '左家', cards: testCards.left, isLandlord: false, isAutoPlay: true, remaining: 1 },
    },
    lastPlay: { player: 'left', cards: [makeCard('diamonds', 12, 'l1')], cardType: 'single', mainRank: 12, length: 1 },
    passCount: 0,
    selectedCards: [],
  });

  let s = useGameStore.getState();
  assert(s.lastPlay !== null, '有上家出牌');
  assert(s.lastPlay?.player === 'left', '上家是左家');
  assert(s.currentPlayer === 'bottom', '当前是玩家');

  const passResult = s.pass();
  s = useGameStore.getState();
  assert(passResult === true, 'pass 成功');
  assert(s.passCount === 1, `passCount 为 1 (实际: ${s.passCount})`);
  assert(s.currentPlayer === 'right', '轮到右家');
  assert(s.selectedCards.length === 0, 'pass 后清空选中');

  const passResult2 = s.pass();
  s = useGameStore.getState();
  assert(passResult2 === false, '不是当前玩家不能pass');
}

console.log('\n8. 两人都不出，出牌权回到原出牌人测试');
{
  const testCards: Record<PlayerPosition, Card[]> = {
    bottom: [
      makeCard('spades', 5, 'b1'),
      makeCard('hearts', 6, 'b2'),
    ],
    right: [
      makeCard('clubs', 7, 'r1'),
    ],
    left: [
      makeCard('diamonds', 8, 'l1'),
    ],
  };

  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.setState({
    gamePhase: 'playing',
    currentPlayer: 'bottom',
    landlordPosition: 'bottom',
    players: {
      bottom: { position: 'bottom', name: '我', cards: testCards.bottom, isLandlord: true, isAutoPlay: false, remaining: 2 },
      right: { position: 'right', name: '右家', cards: testCards.right, isLandlord: false, isAutoPlay: true, remaining: 1 },
      left: { position: 'left', name: '左家', cards: testCards.left, isLandlord: false, isAutoPlay: true, remaining: 1 },
    },
    lastPlay: null,
    passCount: 0,
    selectedCards: [],
  });

  let s = useGameStore.getState();
  s.selectCard('b1');
  s.playCards();
  s = useGameStore.getState();
  assert(s.lastPlay?.player === 'bottom', '玩家出牌');

  useGameStore.setState({ currentPlayer: 'bottom' });
  s = useGameStore.getState();

  const lastPlayer = s.lastPlay?.player;
  assert(lastPlayer === 'bottom', '上家是玩家');

  s.passCount = 1;
  const passResult = s.pass();
  s = useGameStore.getState();
  assert(passResult === false, '自己不能对自己pass');

  useGameStore.setState({ currentPlayer: 'right' });
  s = useGameStore.getState();

  useGameStore.setState({ currentPlayer: 'left' });
  s = useGameStore.getState();

  useGameStore.setState({
    currentPlayer: 'bottom',
    lastPlay: { player: 'right', cards: [makeCard('clubs', 7, 'r1')], cardType: 'single', mainRank: 7, length: 1 },
    passCount: 1,
  });
  s = useGameStore.getState();

  const result = s.pass();
  s = useGameStore.getState();
  assert(result === true, '第二个人pass成功');
  assert(s.passCount === 0, '两人pass后passCount重置为0');
  assert(s.lastPlay === null, '两人pass后lastPlay清空');
  assert(s.currentPlayer === 'right', '出牌权回到原出牌人');
}

console.log('\n9. 胜负判定测试 (地主胜)');
{
  const testCards: Record<PlayerPosition, Card[]> = {
    bottom: [makeCard('spades', 5, 'b1')],
    right: [makeCard('clubs', 7, 'r1')],
    left: [makeCard('diamonds', 8, 'l1')],
  };

  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.setState({
    gamePhase: 'playing',
    currentPlayer: 'bottom',
    landlordPosition: 'bottom',
    players: {
      bottom: { position: 'bottom', name: '我', cards: testCards.bottom, isLandlord: true, isAutoPlay: false, remaining: 1 },
      right: { position: 'right', name: '右家', cards: testCards.right, isLandlord: false, isAutoPlay: true, remaining: 1 },
      left: { position: 'left', name: '左家', cards: testCards.left, isLandlord: false, isAutoPlay: true, remaining: 1 },
    },
    lastPlay: null,
    passCount: 0,
    selectedCards: [],
    winner: null,
  });

  let s = useGameStore.getState();
  s.selectCard('b1');
  s.playCards();
  s = useGameStore.getState();

  assert(s.gamePhase === 'ended', `游戏结束 (实际: ${s.gamePhase})`);
  assert(s.winner === 'landlord', `地主胜利 (实际: ${s.winner})`);
}

console.log('\n10. 胜负判定测试 (农民胜)');
{
  const testCards: Record<PlayerPosition, Card[]> = {
    bottom: [makeCard('spades', 5, 'b1')],
    right: [makeCard('clubs', 7, 'r1')],
    left: [makeCard('diamonds', 8, 'l1')],
  };

  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.setState({
    gamePhase: 'playing',
    currentPlayer: 'right',
    landlordPosition: 'bottom',
    players: {
      bottom: { position: 'bottom', name: '我', cards: testCards.bottom, isLandlord: true, isAutoPlay: false, remaining: 1 },
      right: { position: 'right', name: '右家', cards: testCards.right, isLandlord: false, isAutoPlay: true, remaining: 1 },
      left: { position: 'left', name: '左家', cards: testCards.left, isLandlord: false, isAutoPlay: true, remaining: 1 },
    },
    lastPlay: null,
    passCount: 0,
    selectedCards: [],
    winner: null,
  });

  let s = useGameStore.getState();
  useGameStore.setState({
    players: {
      ...s.players,
      right: { ...s.players.right, remaining: 0, cards: [] },
    },
  });

  s = useGameStore.getState();
  const winner = s.checkWin();
  s = useGameStore.getState();

  assert(winner === 'farmer', `农民胜利 (实际: ${winner})`);
  assert(s.gamePhase === 'ended', `游戏结束 (实际: ${s.gamePhase})`);
}

console.log('\n11. 切换设置测试');
{
  useGameStore.setState(useGameStore.getInitialState());
  let s = useGameStore.getState();

  const initialSound = s.soundEnabled;
  s.toggleSound();
  s = useGameStore.getState();
  assert(s.soundEnabled === !initialSound, '切换音效');

  const initialCountdown = s.countdownEnabled;
  s.toggleCountdown();
  s = useGameStore.getState();
  assert(s.countdownEnabled === !initialCountdown, '切换倒计时');

  s.toggleAutoPlay('bottom');
  s = useGameStore.getState();
  assert(s.players.bottom.isAutoPlay === true, '切换底部玩家托管');

  s.toggleAutoPlay('bottom');
  s = useGameStore.getState();
  assert(s.players.bottom.isAutoPlay === false, '取消底部玩家托管');
}

console.log('\n12. nextPlayer 测试');
{
  useGameStore.setState(useGameStore.getInitialState());
  let s = useGameStore.getState();

  useGameStore.setState({ currentPlayer: 'bottom' });
  s = useGameStore.getState();
  s.nextPlayer();
  s = useGameStore.getState();
  assert(s.currentPlayer === 'right', `bottom → right (实际: ${s.currentPlayer})`);

  s.nextPlayer();
  s = useGameStore.getState();
  assert(s.currentPlayer === 'left', `right → left (实际: ${s.currentPlayer})`);

  s.nextPlayer();
  s = useGameStore.getState();
  assert(s.currentPlayer === 'bottom', `left → bottom (实际: ${s.currentPlayer})`);
}

console.log('\n13. backToMenu 测试');
{
  useGameStore.setState(useGameStore.getInitialState());
  const state = useGameStore.getState();
  state.startPvEGame('medium');
  let s = useGameStore.getState();

  s.backToMenu();
  s = useGameStore.getState();
  assert(s.gamePhase === 'waiting', `返回菜单 (实际: ${s.gamePhase})`);
  assert(s.players.bottom.cards.length === 0, '牌已清空');
  assert(s.bottomCards.length === 0, '底牌已清空');
  assert(s.winner === null, '赢家已清空');
  assert(s.landlordPosition === null, '地主已清空');
}

console.log('\n14. resetGame 测试');
{
  useGameStore.setState(useGameStore.getInitialState());
  const state = useGameStore.getState();
  state.startPvEGame('hard');
  let s = useGameStore.getState();

  const prevCards = [...s.players.bottom.cards.map(c => c.id)].sort().join(',');
  s.resetGame();
  s = useGameStore.getState();

  assert(s.gamePhase === 'bidding', `重置后在叫分阶段 (实际: ${s.gamePhase})`);
  assert(s.difficulty === 'hard', `难度保持 hard (实际: ${s.difficulty})`);
  assert(s.players.bottom.cards.length === 17, '重置后有17张牌');
}

console.log('\n15. 出牌合法性验证测试');
{
  const testCards: Record<PlayerPosition, Card[]> = {
    bottom: [
      makeCard('spades', 5, 'b1'),
      makeCard('hearts', 5, 'b2'),
      makeCard('clubs', 7, 'b3'),
    ],
    right: [makeCard('diamonds', 10, 'r1')],
    left: [makeCard('spades', 12, 'l1')],
  };

  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.setState({
    gamePhase: 'playing',
    currentPlayer: 'bottom',
    landlordPosition: 'bottom',
    players: {
      bottom: { position: 'bottom', name: '我', cards: testCards.bottom, isLandlord: true, isAutoPlay: false, remaining: 3 },
      right: { position: 'right', name: '右家', cards: testCards.right, isLandlord: false, isAutoPlay: true, remaining: 1 },
      left: { position: 'left', name: '左家', cards: testCards.left, isLandlord: false, isAutoPlay: true, remaining: 1 },
    },
    lastPlay: null,
    passCount: 0,
    selectedCards: [],
  });

  let s = useGameStore.getState();
  s.selectCard('b1');
  s.selectCard('b3');
  const result = s.playCards();
  s = useGameStore.getState();
  assert(result === false, '非法牌型不能出 (单张+单张)');
  assert(s.players.bottom.remaining === 3, '牌数不变');

  useGameStore.setState({ selectedCards: [] });
  s = useGameStore.getState();
  s.selectCard('b1');
  s.selectCard('b2');
  const result2 = s.playCards();
  s = useGameStore.getState();
  assert(result2 === true, '对5可以出');
  assert(s.players.bottom.remaining === 1, `剩余1张 (实际: ${s.players.bottom.remaining})`);
}

console.log('\n16. 压牌验证测试');
{
  const testCards: Record<PlayerPosition, Card[]> = {
    bottom: [
      makeCard('spades', 8, 'b1'),
      makeCard('hearts', 8, 'b2'),
      makeCard('clubs', 10, 'b3'),
    ],
    right: [],
    left: [],
  };

  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.setState({
    gamePhase: 'playing',
    currentPlayer: 'bottom',
    landlordPosition: 'bottom',
    players: {
      bottom: { position: 'bottom', name: '我', cards: testCards.bottom, isLandlord: true, isAutoPlay: false, remaining: 3 },
      right: { position: 'right', name: '右家', cards: [], isLandlord: false, isAutoPlay: true, remaining: 0 },
      left: { position: 'left', name: '左家', cards: [], isLandlord: false, isAutoPlay: true, remaining: 0 },
    },
    lastPlay: { player: 'right', cards: [makeCard('diamonds', 9, 'r1')], cardType: 'single', mainRank: 9, length: 1 },
    passCount: 0,
    selectedCards: [],
  });

  let s = useGameStore.getState();
  s.selectCard('b1');
  const result1 = s.playCards();
  s = useGameStore.getState();
  assert(result1 === false, '单张8压不过单张9');

  useGameStore.setState({ selectedCards: [] });
  s = useGameStore.getState();
  s.selectCard('b3');
  const result2 = s.playCards();
  s = useGameStore.getState();
  assert(result2 === true, '单张10能压过单张9');
}

console.log(`\n=== 测试结果 ===`);
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
