// Zustand 状态管理 + 所有 action

import { create } from 'zustand';
import type { Card, GameState, MapNode, Relic } from './types';
import {
  createInitialState,
  startCombatForNode,
  playCard as rulesPlayCard,
  endPlayerTurn as rulesEndPlayerTurn,
  processEnemyTurn as rulesProcessEnemyTurn,
} from './rules';
import { getRandomRewardCards, upgradeCard } from './cards';
import { getRandomRelic } from './relics';

// 敌人回合延迟（毫秒）
const ENEMY_TURN_DELAY = 800;

// 商店价格
const SHOP_PRICE_UPGRADE = 25;
const SHOP_PRICE_HEAL = 15;
const SHOP_PRICE_RELIC = 50;
const SHOP_HEAL_AMOUNT = 20;

// 篝火回复比例
const REST_HEAL_RATIO = 0.3;

// 战斗金币奖励范围
const COMBAT_GOLD_MIN = 10;
const COMBAT_GOLD_MAX = 20;
const BOSS_GOLD_REWARD = 50;

interface RoguelikeStore extends GameState {
  startRun: () => void;
  enterNode: (nodeId: string) => void;
  playCard: (cardId: string, targetEnemyId?: string) => void;
  selectCard: (cardId: string | null) => void;
  cancelSelection: () => void;
  endTurn: () => void;
  chooseReward: (cardId: string) => void;
  skipReward: () => void;
  rest: (action: 'sleep' | 'smith', cardId?: string) => void;
  shopBuy: (item: 'upgrade' | 'heal' | 'relic', cardId?: string) => void;
  leaveShop: () => void;
  resetRun: () => void;
  backToMenu: () => void;
}

export const useRoguelikeStore = create<RoguelikeStore>((set, get) => ({
  ...createInitialState(),

  // 开始冒险：从介绍页进入地图
  startRun: () => {
    const fresh = createInitialState();
    set({ ...fresh, phase: 'map' });
  },

  // 进入地图节点
  enterNode: (nodeId) => {
    const state = get();
    const node = state.mapNodes.find((n) => n.id === nodeId);
    if (!node) return;

    // 只能进入当前+1 节点
    if (node.index !== state.currentNodeIndex + 1) return;

    set({ currentNodeIndex: node.index });

    switch (node.type) {
      case 'combat':
      case 'boss': {
        const combat = startCombatForNode(state, node);
        set({ combat, phase: 'combat' });
        break;
      }
      case 'rest':
        set({ phase: 'rest', restUsed: false });
        break;
      case 'shop':
        set({
          phase: 'shop',
          shopPurchased: { upgrade: false, heal: false, relic: false },
        });
        break;
    }
  },

  // 出牌
  playCard: (cardId, targetEnemyId) => {
    const state = get();
    if (!state.combat) return;
    const next = rulesPlayCard(state.combat, cardId, targetEnemyId);
    set({ combat: next });
  },

  // 选中卡牌（用于目标选择 UI）
  selectCard: (cardId) => {
    const state = get();
    if (!state.combat) return;
    set({ combat: { ...state.combat, selectedCardId: cardId, targetEnemyId: null } });
  },

  // 取消选择
  cancelSelection: () => {
    const state = get();
    if (!state.combat) return;
    set({ combat: { ...state.combat, selectedCardId: null, targetEnemyId: null } });
  },

  // 结束玩家回合
  endTurn: () => {
    const state = get();
    if (!state.combat || state.combat.turn !== 'player' || state.combat.isOver) return;

    const afterEnd = rulesEndPlayerTurn(state.combat);
    set({ combat: afterEnd });

    // 800ms 后执行敌人回合
    setTimeout(() => {
      const current = get();
      if (!current.combat || current.combat.isOver || current.combat.turn !== 'enemy') return;
      const afterEnemy = rulesProcessEnemyTurn(current.combat);
      set({ combat: afterEnemy });
    }, ENEMY_TURN_DELAY);
  },

  // 战斗胜利后选择奖励卡
  chooseReward: (cardId) => {
    const state = get();
    if (state.phase !== 'combat' || !state.combat) return;

    const chosen = state.rewardChoices.find((c) => c.id === cardId);
    if (!chosen) return;

    // 同步玩家 HP 到 GameState
    const playerHp = state.combat.player.hp;

    // 完成当前节点
    const currentNode = state.mapNodes[state.currentNodeIndex];
    const isBoss = currentNode?.type === 'boss';

    if (isBoss) {
      // 通关
      set({
        deck: [...state.deck, chosen],
        rewardChoices: [],
        player: {
          ...state.player,
          hp: playerHp,
          gold: state.player.gold + BOSS_GOLD_REWARD,
        },
        defeatedEnemies: state.defeatedEnemies + state.combat.enemies.length,
        goldEarned: state.goldEarned + BOSS_GOLD_REWARD,
        combat: null,
        phase: 'victory',
      });
      return;
    }

    // 普通战斗：获得金币，回到地图
    const goldReward = Math.floor(
      Math.random() * (COMBAT_GOLD_MAX - COMBAT_GOLD_MIN + 1) + COMBAT_GOLD_MIN,
    );

    const newMapNodes = state.mapNodes.map((n) =>
      n.index === state.currentNodeIndex ? { ...n, completed: true } : n,
    );

    set({
      deck: [...state.deck, chosen],
      rewardChoices: [],
      player: { ...state.player, hp: playerHp, gold: state.player.gold + goldReward },
      defeatedEnemies: state.defeatedEnemies + state.combat.enemies.length,
      goldEarned: state.goldEarned + goldReward,
      mapNodes: newMapNodes,
      combat: null,
      phase: 'map',
    });
  },

  // 跳过奖励
  skipReward: () => {
    const state = get();
    if (state.phase !== 'combat' || !state.combat) return;

    const playerHp = state.combat.player.hp;
    const currentNode = state.mapNodes[state.currentNodeIndex];
    const isBoss = currentNode?.type === 'boss';

    if (isBoss) {
      set({
        rewardChoices: [],
        player: { ...state.player, hp: playerHp },
        defeatedEnemies: state.defeatedEnemies + state.combat.enemies.length,
        combat: null,
        phase: 'victory',
      });
      return;
    }

    const goldReward = Math.floor(
      Math.random() * (COMBAT_GOLD_MAX - COMBAT_GOLD_MIN + 1) + COMBAT_GOLD_MIN,
    );

    const newMapNodes = state.mapNodes.map((n) =>
      n.index === state.currentNodeIndex ? { ...n, completed: true } : n,
    );

    set({
      rewardChoices: [],
      player: { ...state.player, hp: playerHp, gold: state.player.gold + goldReward },
      defeatedEnemies: state.defeatedEnemies + state.combat.enemies.length,
      goldEarned: state.goldEarned + goldReward,
      mapNodes: newMapNodes,
      combat: null,
      phase: 'map',
    });
  },

  // 篝火：休息或锻造
  rest: (action, cardId) => {
    const state = get();
    if (state.phase !== 'rest' || state.restUsed) return;

    if (action === 'sleep') {
      const healAmount = Math.floor(state.player.maxHp * REST_HEAL_RATIO);
      const newPlayer = {
        ...state.player,
        hp: Math.min(state.player.maxHp, state.player.hp + healAmount),
      };
      const newMapNodes = state.mapNodes.map((n) =>
        n.index === state.currentNodeIndex ? { ...n, completed: true } : n,
      );
      set({ player: newPlayer, restUsed: true, mapNodes: newMapNodes, phase: 'map' });
    } else if (action === 'smith' && cardId) {
      const newDeck = state.deck.map((c) => (c.id === cardId ? upgradeCard(c) : c));
      const newMapNodes = state.mapNodes.map((n) =>
        n.index === state.currentNodeIndex ? { ...n, completed: true } : n,
      );
      set({ deck: newDeck, restUsed: true, mapNodes: newMapNodes, phase: 'map' });
    }
  },

  // 商店购买
  shopBuy: (item, cardId) => {
    const state = get();
    if (state.phase !== 'shop') return;
    if (state.shopPurchased[item]) return;

    if (item === 'upgrade') {
      if (state.player.gold < SHOP_PRICE_UPGRADE) return;
      if (!cardId) return;
      const newDeck = state.deck.map((c) => (c.id === cardId ? upgradeCard(c) : c));
      set({
        deck: newDeck,
        player: { ...state.player, gold: state.player.gold - SHOP_PRICE_UPGRADE },
        shopPurchased: { ...state.shopPurchased, upgrade: true },
      });
    } else if (item === 'heal') {
      if (state.player.gold < SHOP_PRICE_HEAL) return;
      const newPlayer = {
        ...state.player,
        hp: Math.min(state.player.maxHp, state.player.hp + SHOP_HEAL_AMOUNT),
        gold: state.player.gold - SHOP_PRICE_HEAL,
      };
      set({
        player: newPlayer,
        shopPurchased: { ...state.shopPurchased, heal: true },
      });
    } else if (item === 'relic') {
      if (state.player.gold < SHOP_PRICE_RELIC) return;
      const newRelic = getRandomRelic(state.relics.map((r) => r.id));
      const newPlayer = applyRelicObtained({ ...state.player, gold: state.player.gold - SHOP_PRICE_RELIC }, newRelic);
      set({
        relics: [...state.relics, newRelic],
        player: newPlayer,
        shopPurchased: { ...state.shopPurchased, relic: true },
      });
    }
  },

  // 离开商店
  leaveShop: () => {
    const state = get();
    if (state.phase !== 'shop') return;
    const newMapNodes = state.mapNodes.map((n) =>
      n.index === state.currentNodeIndex ? { ...n, completed: true } : n,
    );
    set({ mapNodes: newMapNodes, phase: 'map' });
  },

  // 重置冒险（再玩一次）
  resetRun: () => {
    const fresh = createInitialState();
    set({ ...fresh, phase: 'intro' });
  },

  // 返回主菜单（重置状态，由组件调用 onBack）
  backToMenu: () => {
    const fresh = createInitialState();
    set({ ...fresh, phase: 'intro' });
  },
}));

// 应用遗物获取时的永久效果（心脏 +20 maxHp）
function applyRelicObtained(player: GameState['player'], relic: Relic): GameState['player'] {
  const newPlayer = { ...player };
  if (relic.id === 'heart') {
    newPlayer.maxHp += 20;
    newPlayer.hp += 20;
  }
  return newPlayer;
}

// 监听战斗结束，自动进入奖励选择阶段
useRoguelikeStore.subscribe((state, prev) => {
  if (
    state.phase === 'combat' &&
    state.combat?.isOver &&
    !prev.combat?.isOver
  ) {
    if (state.combat.result === 'win') {
      // 生成三选一奖励卡
      const rewards = getRandomRewardCards(3);
      useRoguelikeStore.setState({ rewardChoices: rewards });
    } else if (state.combat.result === 'lose') {
      // 失败
      useRoguelikeStore.setState({ phase: 'defeat', combat: null });
    }
  }
});
