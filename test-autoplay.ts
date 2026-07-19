import { useGameStore } from './src/store/gameStore';
import type { AutoPlaySpeed } from './src/store/gameStore';
import { createInitialBoard } from './src/game/board';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getState() {
  return useGameStore.getState();
}

function log(message: string) {
  const time = new Date().toISOString().substr(14, 9);
  console.log(`[${time}] ${message}`);
}

function resetStore() {
  useGameStore.setState({
    pieces: createInitialBoard(),
    currentPlayer: 'red',
    selectedPieceId: null,
    validMoves: [],
    history: [],
    winner: null,
    gameStatus: 'playing',
    inCheck: false,
    screen: 'menu',
    gameMode: 'pve',
    difficulty: 'medium',
    playerColor: 'red',
    isAIThinking: false,
    hintMove: null,
    invalidMoveMessage: null,
    soundEnabled: true,
    autoPlayRed: false,
    autoPlayBlack: false,
    autoPlaySpeed: 'normal',
  });
}

async function waitForMoves(targetMoves: number, timeout: number): Promise<number> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const moves = getState().history.length;
    if (moves >= targetMoves) {
      return moves;
    }
    await sleep(50);
  }
  return getState().history.length;
}

async function cleanupTimers() {
  useGameStore.setState({ autoPlayRed: false, autoPlayBlack: false, isAIThinking: false });
  await sleep(100);
}

async function testWatchMode() {
  log('=== 测试 1: 观战模式 ===');
  resetStore();
  const store = useGameStore.getState();
  store.setAutoPlaySpeed('fast');
  
  await sleep(50);
  
  useGameStore.setState({ autoPlayRed: true, autoPlayBlack: true });
  store.startAutoPlay();

  const moveCount = await waitForMoves(10, 8000);
  
  log(`  走了 ${moveCount} 步`);
  if (moveCount >= 10) {
    log('  ✓ 观战模式测试通过 (至少5回合=10步)');
  } else {
    log('  ✗ 观战模式测试失败 (步数不足)');
  }
  
  await cleanupTimers();
  log('');
}

async function testSingleAutoPlay() {
  log('=== 测试 2: 单方托管 (红方托管) ===');
  resetStore();
  const store = useGameStore.getState();
  store.setAutoPlaySpeed('fast');
  
  await sleep(50);
  
  useGameStore.setState({ autoPlayRed: true });
  store.startAutoPlay();

  await sleep(1500);
  
  const moveCount = getState().history.length;
  const currentPlayer = getState().currentPlayer;
  
  log(`  1.5秒后走了 ${moveCount} 步`);
  log(`  当前轮到: ${currentPlayer}`);
  
  const movesByRed = getState().history.filter(h => h.currentPlayerBefore === 'red').length;
  const movesByBlack = getState().history.filter(h => h.currentPlayerBefore === 'black').length;
  
  log(`  红方走了 ${movesByRed} 步, 黑方走了 ${movesByBlack} 步`);
  
  let passed = true;
  if (movesByRed >= 1) {
    log('  ✓ 红方自动走棋成功');
  } else {
    log('  ✗ 红方没有自动走棋');
    passed = false;
  }
  
  if (movesByBlack === 0) {
    log('  ✓ 黑方未托管，没有自动走棋');
  } else {
    log('  ✗ 黑方也走棋了');
    passed = false;
  }

  await cleanupTimers();
  log('');
  return passed;
}

async function testToggleOff() {
  log('=== 测试 3: 取消托管 ===');
  resetStore();
  const store = useGameStore.getState();
  store.setAutoPlaySpeed('fast');
  
  await sleep(50);
  
  useGameStore.setState({ autoPlayRed: true, autoPlayBlack: true });
  store.startAutoPlay();

  await sleep(1500);
  const movesBefore = getState().history.length;
  log(`  取消前走了 ${movesBefore} 步`);

  useGameStore.setState({ autoPlayRed: false, autoPlayBlack: false, isAIThinking: false });

  await sleep(2000);
  const movesAfter = getState().history.length;
  const diff = movesAfter - movesBefore;
  log(`  取消后2秒走了 ${diff} 步`);

  if (diff <= 1) {
    log('  ✓ 取消托管后基本停止走棋');
  } else {
    log('  ✗ 取消托管后仍在走棋');
  }

  log('');
}

async function testSpeedSettings() {
  log('=== 测试 4: 速度档位 ===');
  
  async function measureFirstMoveDelay(speed: AutoPlaySpeed): Promise<number> {
    resetStore();
    const store = useGameStore.getState();
    store.setAutoPlaySpeed(speed);
    
    await sleep(50);
    
    const startTime = Date.now();
    useGameStore.setState({ autoPlayRed: true });
    store.startAutoPlay();
    
    while (getState().history.length < 1) {
      await sleep(10);
    }
    
    const delay = Date.now() - startTime;
    await cleanupTimers();
    return delay;
  }

  const fastDelay = await measureFirstMoveDelay('fast');
  log(`  fast 档位延迟: ${fastDelay}ms (期望 300-600ms)`);
  
  const normalDelay = await measureFirstMoveDelay('normal');
  log(`  normal 档位延迟: ${normalDelay}ms (期望 800-1200ms)`);

  const slowDelay = await measureFirstMoveDelay('slow');
  log(`  slow 档位延迟: ${slowDelay}ms (期望 1800-2500ms)`);

  if (fastDelay < normalDelay && normalDelay < slowDelay) {
    log('  ✓ 速度档位顺序正确 (fast < normal < slow)');
  } else {
    log('  ✗ 速度档位顺序不对');
  }

  log('');
}

async function testSelectPieceDisabled() {
  log('=== 测试 5: 托管时禁止选子 ===');
  resetStore();
  const store = useGameStore.getState();
  
  const redPieces = getState().pieces.filter((p) => p.color === 'red');
  const blackPieces = getState().pieces.filter((p) => p.color === 'black');
  
  useGameStore.setState({ autoPlayRed: true });
  await sleep(50);
  
  store.selectPiece(redPieces[0].id);
  const selectedAfterRedAuto = getState().selectedPieceId;
  if (selectedAfterRedAuto === null) {
    log('  ✓ 红方托管时无法选子');
  } else {
    log('  ✗ 红方托管时仍然可以选子');
  }
  
  useGameStore.setState({ autoPlayRed: false, autoPlayBlack: true, currentPlayer: 'black' });
  await sleep(50);
  
  store.selectPiece(blackPieces[0].id);
  const selectedAfterBlackAuto = getState().selectedPieceId;
  if (selectedAfterBlackAuto === null) {
    log('  ✓ 黑方托管时无法选子');
  } else {
    log('  ✗ 黑方托管时仍然可以选子');
  }

  log('');
}

async function main() {
  log('AI 托管模式测试开始');
  log('');

  try {
    await testWatchMode();
    await testSingleAutoPlay();
    await testToggleOff();
    await testSpeedSettings();
    await testSelectPieceDisabled();

    log('=== 所有测试完成 ===');
  } catch (error) {
    console.error('测试出错:', error);
  }

  process.exit(0);
}

main();
