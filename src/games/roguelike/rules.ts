// 规则引擎：纯函数处理状态变换

import type {
  Card,
  CombatState,
  Enemy,
  EnemyMove,
  GameState,
  MapNode,
  Player,
  Pile,
  Relic,
  StatusEffect,
} from './types';
import { createInitialDeck } from './cards';
import { createBoss, createEnemy, createRandomEnemy, ENEMY_TEMPLATES } from './enemies';

// ===== 常量 =====

// 玩家初始属性
const PLAYER_INITIAL_HP = 80;
const PLAYER_INITIAL_MAX_ENERGY = 3;
const HAND_SIZE = 5;

// 地图节点配置：战斗→战斗→篝火→战斗→战斗→商店→战斗→战斗→战斗→Boss
const MAP_LAYOUT: Array<'combat' | 'rest' | 'shop' | 'boss'> = [
  'combat', 'combat', 'rest', 'combat', 'combat',
  'shop', 'combat', 'combat', 'combat', 'boss',
];

// 遗物 id 常量
const RELIC_IRON_SWORD = 'iron_sword';
const RELIC_AMULET = 'amulet';
const RELIC_HEART = 'heart';
const RELIC_VAMPIRE_FANG = 'vampire_fang';
const RELIC_REFORGE_HAMMER = 'reforge_hammer';

// 空状态
function emptyStatus(): StatusEffect {
  return { strength: 0, weak: 0, stun: 0 };
}

// 深拷贝玩家
function clonePlayer(p: Player): Player {
  return { ...p, status: { ...p.status } };
}

// 深拷贝敌人
function cloneEnemy(e: Enemy): Enemy {
  return {
    ...e,
    status: { ...e.status },
    moves: e.moves.map((m) => ({ ...m })),
  };
}

// 深拷贝战斗状态
function cloneCombat(c: CombatState): CombatState {
  return {
    ...c,
    player: clonePlayer(c.player),
    enemies: c.enemies.map(cloneEnemy),
    hand: c.hand.map((card) => ({ ...card })),
    drawPile: c.drawPile.map((card) => ({ ...card })),
    discardPile: c.discardPile.map((card) => ({ ...card })),
    exhaustPile: c.exhaustPile.map((card) => ({ ...card })),
    relics: c.relics.map((r) => ({ ...r })),
  };
}

// ===== 初始状态 =====

// 创建初始游戏状态（角色介绍页）
export function createInitialState(): GameState {
  const relics: Relic[] = [];

  // 应用心脏遗物效果（虽然初始没有遗物，但 startRun 时若选了心脏会处理）
  const player: Player = {
    hp: PLAYER_INITIAL_HP,
    maxHp: PLAYER_INITIAL_HP,
    energy: PLAYER_INITIAL_MAX_ENERGY,
    maxEnergy: PLAYER_INITIAL_MAX_ENERGY,
    block: 0,
    status: emptyStatus(),
    gold: 0,
  };

  // 创建地图节点
  const mapNodes: MapNode[] = MAP_LAYOUT.map((type, index) => ({
    id: `node-${index}`,
    type,
    completed: false,
    index,
  }));

  return {
    phase: 'intro',
    player,
    deck: createInitialDeck(),
    relics,
    mapNodes,
    currentNodeIndex: -1,
    combat: null,
    rewardChoices: [],
    defeatedEnemies: 0,
    goldEarned: 0,
    restUsed: false,
    shopPurchased: { upgrade: false, heal: false, relic: false },
  };
}

// ===== 牌堆操作 =====

// 洗牌（Fisher-Yates）
export function shufflePile(pile: Pile): Pile {
  const arr = [...pile];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 从抽牌堆抽 n 张到手牌，不足时重洗弃牌堆
export function drawCards(state: CombatState, n: number): CombatState {
  const next = cloneCombat(state);
  let need = n;
  const drawn: Card[] = [];

  // 优先从抽牌堆抽
  while (need > 0 && next.drawPile.length > 0) {
    drawn.push(next.drawPile.shift()!);
    need--;
  }

  // 抽牌堆空了还不够：重洗弃牌堆
  if (need > 0 && next.discardPile.length > 0) {
    next.drawPile = shufflePile(next.discardPile);
    next.discardPile = [];
    while (need > 0 && next.drawPile.length > 0) {
      drawn.push(next.drawPile.shift()!);
      need--;
    }
  }

  next.hand = [...next.hand, ...drawn];
  return next;
}

// ===== 伤害计算 =====

// 计算伤害：基础 + 力量，虚弱 -25%
export function calcDamage(base: number, attackerStrength: number, attackerWeak: number): number {
  let dmg = base + attackerStrength;
  if (attackerWeak > 0) {
    dmg = Math.floor(dmg * 0.75);
  }
  return Math.max(0, dmg);
}

// ===== 战斗初始化 =====

// 是否拥有某遗物
function hasRelic(relics: Relic[], id: string): boolean {
  return relics.some((r) => r.id === id);
}

// 根据地图节点创建战斗
export function startCombatForNode(state: GameState, node: MapNode): CombatState {
  // 创建玩家副本
  let player = clonePlayer(state.player);
  player.energy = player.maxEnergy;
  player.block = 0;
  player.status = emptyStatus();

  // 创建敌人
  let enemies: Enemy[];
  if (node.type === 'boss') {
    enemies = [createBoss()];
  } else {
    // 后期节点（6/7/8）出 2 个敌人，前期 1 个
    if (node.index >= 6) {
      // 选两种不同的敌人
      const ids = Object.keys(ENEMY_TEMPLATES);
      const shuffled = [...ids].sort(() => Math.random() - 0.5);
      enemies = [
        createEnemy(ENEMY_TEMPLATES[shuffled[0]]),
        createEnemy(ENEMY_TEMPLATES[shuffled[1]]),
      ];
    } else {
      enemies = [createRandomEnemy()];
    }
  }

  // 战斗开始时应用遗物效果
  // 护符：+1 最大能量
  if (hasRelic(state.relics, RELIC_AMULET)) {
    player.maxEnergy += 1;
    player.energy = player.maxEnergy;
  }

  // 创建牌堆：洗牌后的主卡组副本
  const deckCopy = state.deck.map((c) => ({ ...c }));
  const drawPile = shufflePile(deckCopy);

  let combat: CombatState = {
    player,
    enemies,
    hand: [],
    drawPile,
    discardPile: [],
    exhaustPile: [],
    turn: 'player',
    selectedCardId: null,
    targetEnemyId: null,
    isOver: false,
    result: null,
    relics: state.relics.map((r) => ({ ...r })),
    pendingEnergyNext: 0,
    firstAttackBonusApplied: false,
  };

  // 抽初始手牌（重铸锤 +1）
  const initialDraw = HAND_SIZE + (hasRelic(state.relics, RELIC_REFORGE_HAMMER) ? 1 : 0);
  combat = drawCards(combat, initialDraw);

  return combat;
}

// ===== 出牌 =====

// 找到敌人
function findEnemy(state: CombatState, enemyId: string): Enemy | undefined {
  return state.enemies.find((e) => e.id === enemyId);
}

// 对敌人造成伤害（先扣格挡）
function dealDamageToEnemy(enemy: Enemy, damage: number): { enemy: Enemy; dealt: number } {
  const next = cloneEnemy(enemy);
  let remaining = damage;
  // 先扣格挡
  if (next.block > 0) {
    const absorbed = Math.min(next.block, remaining);
    next.block -= absorbed;
    remaining -= absorbed;
  }
  // 再扣血
  if (remaining > 0) {
    next.hp = Math.max(0, next.hp - remaining);
  }
  return { enemy: next, dealt: damage };
}

// 出牌：扣能量、效果结算、状态效果、抽牌、消耗
export function playCard(
  state: CombatState,
  cardId: string,
  targetEnemyId?: string,
): CombatState {
  if (state.isOver || state.turn !== 'player') return state;
  // 晕眩时不能出牌
  if (state.player.status.stun > 0) return state;

  const card = state.hand.find((c) => c.id === cardId);
  if (!card) return state;

  // 检查能量
  if (card.cost > state.player.energy) return state;

  const next = cloneCombat(state);
  const player = clonePlayer(next.player);

  // 扣能量
  player.energy -= card.cost;

  // 从手牌移除
  next.hand = next.hand.filter((c) => c.id !== cardId);

  // 计算伤害（含力量、虚弱、铁剑加成）
  const isAttackCard = card.type === 'attack';
  const hasIronSword = hasRelic(next.relics, RELIC_IRON_SWORD);
  const isFirstAttack = isAttackCard && !next.firstAttackBonusApplied;
  const ironSwordBonus = isFirstAttack && hasIronSword ? 2 : 0;

  if (isAttackCard) {
    next.firstAttackBonusApplied = true;
  }

  // 处理伤害
  if (card.damage !== undefined) {
    const hits = card.hits ?? 1;
    let totalDamageDealt = 0;

    if (card.target === 'all-enemies') {
      // 群体攻击：对每个敌人造成 hits 次伤害
      for (let h = 0; h < hits; h++) {
        const baseDmg = calcDamage(card.damage, player.status.strength, player.status.weak) + ironSwordBonus;
        next.enemies = next.enemies.map((e) => {
          const { enemy, dealt } = dealDamageToEnemy(e, baseDmg);
          totalDamageDealt += dealt;
          return enemy;
        });
      }
    } else if (card.target === 'enemy') {
      // 单体攻击：对目标敌人造成 hits 次伤害
      const target = targetEnemyId ? findEnemy(next, targetEnemyId) : next.enemies[0];
      if (target) {
        for (let h = 0; h < hits; h++) {
          const baseDmg = calcDamage(card.damage, player.status.strength, player.status.weak) + ironSwordBonus;
          const { enemy, dealt } = dealDamageToEnemy(target, baseDmg);
          target.hp = enemy.hp;
          target.block = enemy.block;
          totalDamageDealt += dealt;
        }
      }
    }

    // 吸血牙遗物：造成伤害时回 1 HP
    if (totalDamageDealt > 0 && hasRelic(next.relics, RELIC_VAMPIRE_FANG)) {
      player.hp = Math.min(player.maxHp, player.hp + 1);
    }
  }

  // 处理格挡
  if (card.block !== undefined) {
    player.block += card.block;
  }

  // 处理治疗
  if (card.heal !== undefined) {
    player.hp = Math.min(player.maxHp, player.hp + card.heal);
  }

  // 处理抽牌
  if (card.draw !== undefined && card.draw > 0) {
    // 抽牌需要单独处理（修改 hand/drawPile/discardPile）
    Object.assign(next, drawCards({ ...next, player }, card.draw));
    // drawCards 会重新 clone player，所以这里要确保 player 引用一致
  }

  // 处理下回合能量
  if (card.energyNext !== undefined) {
    next.pendingEnergyNext += card.energyNext;
  }

  // 处理力量增益
  if (card.strength !== undefined) {
    player.status.strength += card.strength;
  }

  // 处理虚弱（施加给目标敌人）
  if (card.weaken !== undefined && card.weaken > 0) {
    if (card.target === 'all-enemies') {
      next.enemies = next.enemies.map((e) => ({
        ...e,
        status: { ...e.status, weak: e.status.weak + card.weaken! },
      }));
    } else if (card.target === 'enemy') {
      const target = targetEnemyId ? findEnemy(next, targetEnemyId) : next.enemies[0];
      if (target) {
        target.status = { ...target.status, weak: target.status.weak + card.weaken };
      }
    }
  }

  next.player = player;

  // 牌进入弃牌堆或消耗堆
  if (card.exhaust) {
    next.exhaustPile = [...next.exhaustPile, card];
  } else {
    next.discardPile = [...next.discardPile, card];
  }

  // 清除选中状态
  next.selectedCardId = null;
  next.targetEnemyId = null;

  // 检查战斗是否结束
  return checkCombatEnd(next);
}

// ===== 回合切换 =====

// 玩家回合结束
export function endPlayerTurn(state: CombatState): CombatState {
  if (state.isOver || state.turn !== 'player') return state;

  const next = cloneCombat(state);
  const player = clonePlayer(next.player);

  // 弃手牌
  next.discardPile = [...next.discardPile, ...next.hand];
  next.hand = [];

  // 格挡清零
  player.block = 0;

  // 玩家状态衰减：虚弱 -1，晕眩 -1
  if (player.status.weak > 0) player.status.weak--;
  if (player.status.stun > 0) player.status.stun--;

  next.player = player;

  // 敌人状态衰减
  next.enemies = next.enemies.map((e) => {
    const status = { ...e.status };
    if (status.weak > 0) status.weak--;
    if (status.stun > 0) status.stun--;
    return { ...e, status };
  });

  // 切到敌人回合
  next.turn = 'enemy';

  return next;
}

// 玩家回合开始：抽 5 张、能量恢复、格挡清零、状态衰减已在 endPlayerTurn 处理
export function startPlayerTurn(state: CombatState): CombatState {
  const next = cloneCombat(state);
  const player = clonePlayer(next.player);

  // 能量恢复（含蓄势加成）
  player.energy = player.maxEnergy + next.pendingEnergyNext;
  next.pendingEnergyNext = 0;

  // 格挡清零（防御牌的格挡只持续一回合）
  player.block = 0;

  next.player = player;

  // 重置首张攻击加成
  next.firstAttackBonusApplied = false;

  // 抽 5 张
  return drawCards(next, HAND_SIZE);
}

// 执行单个敌人行动
function executeEnemyMove(state: CombatState, enemy: Enemy): CombatState {
  const next = cloneCombat(state);
  const e = next.enemies.find((x) => x.id === enemy.id);
  if (!e) return state;

  // 晕眩跳过
  if (e.status.stun > 0) {
    // 推进到下一个 move
    e.moveIndex = (e.moveIndex + 1) % e.moves.length;
    return next;
  }

  const move: EnemyMove = e.moves[e.moveIndex];
  const player = clonePlayer(next.player);

  switch (move.type) {
    case 'attack': {
      // 攻击：受虚弱影响
      const dmg = calcDamage(move.value, e.status.strength, e.status.weak);
      let remaining = dmg;
      if (player.block > 0) {
        const absorbed = Math.min(player.block, remaining);
        player.block -= absorbed;
        remaining -= absorbed;
      }
      if (remaining > 0) {
        player.hp = Math.max(0, player.hp - remaining);
      }
      break;
    }
    case 'attack-debuff': {
      // 攻击 + debuff
      const dmg = calcDamage(move.value, e.status.strength, e.status.weak);
      let remaining = dmg;
      if (player.block > 0) {
        const absorbed = Math.min(player.block, remaining);
        player.block -= absorbed;
        remaining -= absorbed;
      }
      if (remaining > 0) {
        player.hp = Math.max(0, player.hp - remaining);
        // 默认施加虚弱（哥布林 4 伤害+虚弱）
        player.status.weak += 1;
      }
      break;
    }
    case 'block': {
      // 防御：获得格挡
      e.block += move.value;
      break;
    }
    case 'buff': {
      // 增益：获得力量
      e.status.strength += move.value;
      break;
    }
  }

  next.player = player;

  // 推进 move 索引
  e.moveIndex = (e.moveIndex + 1) % e.moves.length;

  return next;
}

// 执行所有敌人行动
export function processEnemyTurn(state: CombatState): CombatState {
  if (state.isOver || state.turn !== 'enemy') return state;

  let next = state;
  for (const enemy of state.enemies) {
    if (next.isOver) break;
    next = executeEnemyMove(next, enemy);
  }

  // 切回玩家回合
  next = { ...next, turn: 'player' };

  // 玩家回合开始
  next = startPlayerTurn(next);

  // 检查战斗结束
  return checkCombatEnd(next);
}

// ===== 胜负判定 =====

export function checkCombatEnd(state: CombatState): CombatState {
  // 玩家死亡
  if (state.player.hp <= 0) {
    return { ...state, isOver: true, result: 'lose' };
  }
  // 所有敌人死亡
  if (state.enemies.every((e) => e.hp <= 0)) {
    return { ...state, isOver: true, result: 'win' };
  }
  return state;
}
