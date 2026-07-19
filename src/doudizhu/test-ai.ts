import { useGameStore } from './store/gameStore';
import { decideBid, decidePlay } from './game/ai';
import type { Card, PlayerPosition } from './game/types';

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

console.log('=== AI 行动测试 ===\n');

console.log('1. AI 叫分测试 (aiBid)');
{
  useGameStore.setState(useGameStore.getInitialState());
  const state = useGameStore.getState();
  state.startPvEGame('easy');
  let s = useGameStore.getState();

  const firstBidder = s.currentPlayer;
  assert(s.gamePhase === 'bidding', `游戏在叫分阶段 (实际: ${s.gamePhase})`);
  assert(firstBidder !== undefined, '有第一个叫分者');

  const hand = s.players[firstBidder].cards;
  const bidScore = decideBid(hand, s.currentBid, firstBidder, s.players[firstBidder].isLandlord, s.difficulty);
  
  useGameStore.getState().aiBid(firstBidder, bidScore as 0 | 1 | 2 | 3);
  s = useGameStore.getState();

  assert(s.bidCount === 1, `叫分次数为 1 (实际: ${s.bidCount})`);
  assert(s.currentPlayer !== firstBidder, `轮到下一个玩家叫分 (从 ${firstBidder} 到 ${s.currentPlayer})`);
  
  console.log(`    第一个叫分者 ${firstBidder} 叫了 ${bidScore} 分`);
  console.log(`    当前叫分: ${s.currentBid}, 叫分者: ${s.bidder}`);
}

console.log('\n2. AI 出牌测试 (aiPlayCards) - 首攻');
{
  useGameStore.setState(useGameStore.getInitialState());
  
  const testCards: Record<PlayerPosition, Card[]> = {
    bottom: [
      { suit: 'spades', rank: 3, id: 'b1' },
      { suit: 'hearts', rank: 4, id: 'b2' },
      { suit: 'clubs', rank: 5, id: 'b3' },
    ],
    right: [
      { suit: 'spades', rank: 6, id: 'r1' },
      { suit: 'hearts', rank: 7, id: 'r2' },
      { suit: 'clubs', rank: 8, id: 'r3' },
    ],
    left: [
      { suit: 'diamonds', rank: 9, id: 'l1' },
      { suit: 'spades', rank: 10, id: 'l2' },
      { suit: 'hearts', rank: 11, id: 'l3' },
    ],
  };

  useGameStore.setState({
    gamePhase: 'playing',
    currentPlayer: 'right',
    landlordPosition: 'bottom',
    players: {
      bottom: { position: 'bottom', name: '我', cards: testCards.bottom, isLandlord: true, isAutoPlay: false, remaining: 3 },
      right: { position: 'right', name: '右家', cards: testCards.right, isLandlord: false, isAutoPlay: true, remaining: 3 },
      left: { position: 'left', name: '左家', cards: testCards.left, isLandlord: false, isAutoPlay: true, remaining: 3 },
    },
    lastPlay: null,
    passCount: 0,
    selectedCards: [],
    bottomCards: [],
  });

  let s = useGameStore.getState();
  assert(s.currentPlayer === 'right', '轮到右家出牌');
  assert(s.players.right.remaining === 3, '右家有3张牌');

  const hand = s.players.right.cards;
  const play = decidePlay(hand, null, 'right', false, 'easy', 3, 3, []);
  
  assert(play !== null && play.length > 0, 'AI 决定出牌');
  
  if (play) {
    const cardIds = play.map(c => c.id);
    const success = useGameStore.getState().aiPlayCards('right', cardIds);
    s = useGameStore.getState();

    assert(success === true, 'AI 出牌成功');
    assert(s.lastPlay !== null, '有上一手牌');
    assert(s.lastPlay?.player === 'right', '上一手是右家出的');
    assert(s.players.right.remaining === 2, `右家剩余2张 (实际: ${s.players.right.remaining})`);
    assert(s.currentPlayer === 'left', `轮到左家 (实际: ${s.currentPlayer})`);
    
    console.log(`    右家出了 ${play.length} 张牌`);
    console.log(`    牌型: ${s.lastPlay?.cardType}`);
  }
}

console.log('\n3. AI 出牌测试 (aiPlayCards) - 跟牌');
{
  useGameStore.setState(useGameStore.getInitialState());
  
  const testCards: Record<PlayerPosition, Card[]> = {
    bottom: [
      { suit: 'spades', rank: 3, id: 'b1' },
    ],
    right: [
      { suit: 'hearts', rank: 5, id: 'r1' },
      { suit: 'clubs', rank: 10, id: 'r2' },
    ],
    left: [
      { suit: 'diamonds', rank: 7, id: 'l1' },
    ],
  };

  useGameStore.setState({
    gamePhase: 'playing',
    currentPlayer: 'right',
    landlordPosition: 'bottom',
    players: {
      bottom: { position: 'bottom', name: '我', cards: testCards.bottom, isLandlord: true, isAutoPlay: false, remaining: 1 },
      right: { position: 'right', name: '右家', cards: testCards.right, isLandlord: false, isAutoPlay: true, remaining: 2 },
      left: { position: 'left', name: '左家', cards: testCards.left, isLandlord: false, isAutoPlay: true, remaining: 1 },
    },
    lastPlay: { player: 'bottom', cards: [testCards.bottom[0]], cardType: 'single', mainRank: 3, length: 1 },
    passCount: 0,
    selectedCards: [],
    bottomCards: [],
  });

  let s = useGameStore.getState();
  assert(s.currentPlayer === 'right', '轮到右家跟牌');

  const hand = s.players.right.cards;
  const lastPlay = s.lastPlay;
  const play = decidePlay(hand, lastPlay, 'right', false, 'easy', 1, 1, []);
  
  assert(play !== null && play.length > 0, 'AI 决定跟牌');
  
  if (play) {
    const cardIds = play.map(c => c.id);
    const success = useGameStore.getState().aiPlayCards('right', cardIds);
    s = useGameStore.getState();

    assert(success === true, 'AI 跟牌成功');
    assert(s.lastPlay?.player === 'right', '上一手变成右家');
    assert(s.players.right.remaining === 1, `右家剩余1张 (实际: ${s.players.right.remaining})`);
    
    console.log(`    右家跟了 ${play.length} 张牌`);
  }
}

console.log('\n4. AI 不出测试 (aiPass)');
{
  useGameStore.setState(useGameStore.getInitialState());
  
  const testCards: Record<PlayerPosition, Card[]> = {
    bottom: [
      { suit: 'spades', rank: 15, id: 'b1' },
    ],
    right: [
      { suit: 'hearts', rank: 3, id: 'r1' },
      { suit: 'clubs', rank: 4, id: 'r2' },
    ],
    left: [
      { suit: 'diamonds', rank: 5, id: 'l1' },
    ],
  };

  useGameStore.setState({
    gamePhase: 'playing',
    currentPlayer: 'right',
    landlordPosition: 'bottom',
    players: {
      bottom: { position: 'bottom', name: '我', cards: testCards.bottom, isLandlord: true, isAutoPlay: false, remaining: 1 },
      right: { position: 'right', name: '右家', cards: testCards.right, isLandlord: false, isAutoPlay: true, remaining: 2 },
      left: { position: 'left', name: '左家', cards: testCards.left, isLandlord: false, isAutoPlay: true, remaining: 1 },
    },
    lastPlay: { player: 'bottom', cards: [testCards.bottom[0]], cardType: 'single', mainRank: 15, length: 1 },
    passCount: 0,
    selectedCards: [],
    bottomCards: [],
  });

  let s = useGameStore.getState();
  assert(s.currentPlayer === 'right', '轮到右家');
  assert(s.passCount === 0, 'passCount 为 0');

  const hand = s.players.right.cards;
  const lastPlay = s.lastPlay;
  const play = decidePlay(hand, lastPlay, 'right', false, 'easy', 1, 1, []);
  
  assert(play === null, 'AI 决定不出');
  
  const passSuccess = useGameStore.getState().aiPass('right');
  s = useGameStore.getState();

  assert(passSuccess === true, 'AI pass 成功');
  assert(s.passCount === 1, `passCount 为 1 (实际: ${s.passCount})`);
  assert(s.currentPlayer === 'left', `轮到左家 (实际: ${s.currentPlayer})`);
  assert(s.players.right.remaining === 2, '右家牌数不变');
  
  console.log('    右家选择不出');
}

console.log('\n5. 完整 AI 对局模拟测试');
{
  useGameStore.setState(useGameStore.getInitialState());
  const state = useGameStore.getState();
  state.startPvEGame('easy');
  
  let s = useGameStore.getState();
  let roundCount = 0;
  const maxRounds = 200;
  
  console.log(`    初始叫分者: ${s.currentPlayer}`);
  
  // 叫分阶段
  while (s.gamePhase === 'bidding' && roundCount < maxRounds) {
    roundCount++;
    const currentPos = s.currentPlayer;
    
    if (currentPos === 'bottom') {
      // 玩家不叫，测试 AI
      useGameStore.getState().bid(0);
    } else {
      const hand = s.players[currentPos].cards;
      const bidScore = decideBid(hand, s.currentBid, currentPos, s.players[currentPos].isLandlord, s.difficulty);
      useGameStore.getState().aiBid(currentPos, bidScore as 0 | 1 | 2 | 3);
    }
    
    s = useGameStore.getState();
  }
  
  console.log(`    叫分阶段结束，共 ${roundCount} 轮`);
  console.log(`    地主: ${s.landlordPosition}, 叫分: ${s.currentBid}`);
  
  assert(s.gamePhase === 'playing', `进入出牌阶段 (实际: ${s.gamePhase})`);
  assert(s.landlordPosition !== null, '已确定地主');
  
  // 出牌阶段
  roundCount = 0;
  while (s.gamePhase === 'playing' && roundCount < maxRounds) {
    roundCount++;
    const currentPos = s.currentPlayer;
    
    if (currentPos === 'bottom') {
      // 玩家自动出牌（也用 AI 逻辑）
      const hand = s.players[currentPos].cards;
      const lastPlay = s.lastPlay;
      const play = decidePlay(hand, lastPlay, currentPos, true, 'easy', s.players.left.remaining, s.players.right.remaining, []);
      
      if (play && play.length > 0) {
        const cardIds = play.map(c => c.id);
        useGameStore.setState({ selectedCards: cardIds });
        useGameStore.getState().playCards();
      } else {
        if (lastPlay && lastPlay.player !== currentPos) {
          useGameStore.getState().pass();
        }
      }
    } else {
      const hand = s.players[currentPos].cards;
      const lastPlay = s.lastPlay;
      const partnerPos = currentPos === 'left' ? 'right' : 'left';
      const landlordPos = s.landlordPosition || 'bottom';
      const partnerRemaining = s.players[partnerPos].remaining;
      const landlordRemaining = s.players[landlordPos].remaining;
      
      const playHistory = s.playHistory.map(h => ({
        player: h.player,
        cards: h.cards,
        cardType: h.cardType,
      }));
      
      const play = decidePlay(
        hand,
        lastPlay,
        currentPos,
        s.players[currentPos].isLandlord,
        s.difficulty,
        partnerRemaining,
        landlordRemaining,
        playHistory
      );
      
      if (play && play.length > 0) {
        const cardIds = play.map(c => c.id);
        const success = useGameStore.getState().aiPlayCards(currentPos, cardIds);
        if (!success) {
          if (lastPlay && lastPlay.player !== currentPos) {
            useGameStore.getState().aiPass(currentPos);
          }
        }
      } else {
        if (lastPlay && lastPlay.player !== currentPos) {
          useGameStore.getState().aiPass(currentPos);
        }
      }
    }
    
    s = useGameStore.getState();
  }
  
  console.log(`    出牌阶段结束，共 ${roundCount} 轮`);
  console.log(`    游戏阶段: ${s.gamePhase}, 赢家: ${s.winner}`);
  console.log(`    剩余牌数 - 底: ${s.players.bottom.remaining}, 右: ${s.players.right.remaining}, 左: ${s.players.left.remaining}`);
  
  assert(s.gamePhase === 'ended', `游戏正常结束 (实际: ${s.gamePhase})`);
  assert(s.winner !== null, '有赢家');
  assert(roundCount < maxRounds, '没有超出最大轮数');
}

console.log('\n6. AI 位置验证测试');
{
  useGameStore.setState(useGameStore.getInitialState());
  
  const testCards: Record<PlayerPosition, Card[]> = {
    bottom: [
      { suit: 'spades', rank: 3, id: 'b1' },
    ],
    right: [
      { suit: 'hearts', rank: 5, id: 'r1' },
    ],
    left: [
      { suit: 'diamonds', rank: 7, id: 'l1' },
    ],
  };

  useGameStore.setState({
    gamePhase: 'playing',
    currentPlayer: 'left',
    landlordPosition: 'bottom',
    players: {
      bottom: { position: 'bottom', name: '我', cards: testCards.bottom, isLandlord: true, isAutoPlay: false, remaining: 1 },
      right: { position: 'right', name: '右家', cards: testCards.right, isLandlord: false, isAutoPlay: true, remaining: 1 },
      left: { position: 'left', name: '左家', cards: testCards.left, isLandlord: false, isAutoPlay: true, remaining: 1 },
    },
    lastPlay: null,
    passCount: 0,
    selectedCards: [],
    bottomCards: [],
  });

  let s = useGameStore.getState();
  
  // 测试右家不能在左家的回合出牌
  const wrongPlayResult = useGameStore.getState().aiPlayCards('right', ['r1']);
  assert(wrongPlayResult === false, '不是当前玩家不能出牌');
  
  // 测试左家可以出牌
  const correctPlayResult = useGameStore.getState().aiPlayCards('left', ['l1']);
  assert(correctPlayResult === true, '当前玩家可以出牌');
  
  s = useGameStore.getState();
  assert(s.currentPlayer === 'bottom', `出牌后轮到下一家 (实际: ${s.currentPlayer})`);
  
  console.log('    AI 位置验证通过');
}

console.log(`\n=== 测试结果 ===`);
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
