// 卡牌数据：20 张卡（10 初始 + 10 奖励）+ 升级版

import type { Card, CardType, CardTarget } from './types';

// 卡牌模板（不含运行时 id / upgraded）
interface CardTemplate {
  name: string;
  type: CardType;
  cost: number;
  description: string;
  damage?: number;
  block?: number;
  heal?: number;
  draw?: number;
  energyNext?: number;
  weaken?: number;
  strength?: number;
  exhaust?: boolean;
  hits?: number;
  upgradeable: boolean;
  target?: CardTarget;
}

// 唯一 id 计数器
let cardIdCounter = 0;
function makeId(): string {
  return `card-${++cardIdCounter}`;
}

// 由模板创建卡牌实例（每张 id 唯一）
function makeCard(t: CardTemplate): Card {
  return {
    id: makeId(),
    name: t.name,
    type: t.type,
    cost: t.cost,
    description: t.description,
    damage: t.damage,
    block: t.block,
    heal: t.heal,
    draw: t.draw,
    energyNext: t.energyNext,
    weaken: t.weaken,
    strength: t.strength,
    exhaust: t.exhaust,
    hits: t.hits,
    upgradeable: t.upgradeable,
    upgraded: false,
    target: t.target,
  };
}

// ===== 模板定义 =====

// 打击：基础攻击牌
const STRIKE: CardTemplate = {
  name: '打击',
  type: 'attack',
  cost: 1,
  description: '造成 6 伤害。',
  damage: 6,
  upgradeable: true,
  target: 'enemy',
};

// 防御：基础技能牌
const DEFEND: CardTemplate = {
  name: '防御',
  type: 'skill',
  cost: 1,
  description: '获得 5 格挡。',
  block: 5,
  upgradeable: true,
  target: 'self',
};

// 重击：高伤攻击
const HEAVY_STRIKE: CardTemplate = {
  name: '重击',
  type: 'attack',
  cost: 2,
  description: '造成 14 伤害。',
  damage: 14,
  upgradeable: true,
  target: 'enemy',
};

// 痛击：消耗型高伤
const POKE: CardTemplate = {
  name: '痛击',
  type: 'attack',
  cost: 1,
  description: '造成 8 伤害。消耗。',
  damage: 8,
  exhaust: true,
  upgradeable: true,
  target: 'enemy',
};

// 旋风斩：群体攻击
const WHIRLWIND: CardTemplate = {
  name: '旋风斩',
  type: 'attack',
  cost: 1,
  description: '对所有敌人造成 6 伤害。',
  damage: 6,
  upgradeable: true,
  target: 'all-enemies',
};

// 双击：连续两次攻击
const DOUBLE_STRIKE: CardTemplate = {
  name: '双击',
  type: 'attack',
  cost: 1,
  description: '造成 5 伤害两次。',
  damage: 5,
  hits: 2,
  upgradeable: true,
  target: 'enemy',
};

// 吸血斩：伤害+治疗
const LIFE_DRAIN: CardTemplate = {
  name: '吸血斩',
  type: 'attack',
  cost: 2,
  description: '造成 10 伤害，回复 3 HP。',
  damage: 10,
  heal: 3,
  upgradeable: true,
  target: 'enemy',
};

// 坚守：大格挡
const FORTIFY: CardTemplate = {
  name: '坚守',
  type: 'skill',
  cost: 2,
  description: '获得 12 格挡。',
  block: 12,
  upgradeable: true,
  target: 'self',
};

// 蓄势：下回合能量
const FOCUS: CardTemplate = {
  name: '蓄势',
  type: 'skill',
  cost: 1,
  description: '下回合获得 2 能量。',
  energyNext: 2,
  upgradeable: true,
  target: 'self',
};

// 冲刺：格挡+抽牌
const DASH: CardTemplate = {
  name: '冲刺',
  type: 'skill',
  cost: 1,
  description: '获得 4 格挡，抽 1 张牌。',
  block: 4,
  draw: 1,
  upgradeable: true,
  target: 'self',
};

// 怒吼：力量增益
const ROAR: CardTemplate = {
  name: '怒吼',
  type: 'skill',
  cost: 0,
  description: '获得 2 力量。消耗。',
  strength: 2,
  exhaust: true,
  upgradeable: true,
  target: 'self',
};

// 治愈：回血
const HEAL: CardTemplate = {
  name: '治愈',
  type: 'skill',
  cost: 1,
  description: '回复 8 HP。消耗。',
  heal: 8,
  exhaust: true,
  upgradeable: true,
  target: 'self',
};

// 所有奖励池模板
const REWARD_TEMPLATES: CardTemplate[] = [
  HEAVY_STRIKE,
  POKE,
  WHIRLWIND,
  DOUBLE_STRIKE,
  LIFE_DRAIN,
  FORTIFY,
  FOCUS,
  DASH,
  ROAR,
  HEAL,
];

// 初始卡组（静态展示用）
export const INITIAL_DECK: Card[] = [
  makeCard(STRIKE),
  makeCard(STRIKE),
  makeCard(STRIKE),
  makeCard(STRIKE),
  makeCard(STRIKE),
  makeCard(DEFEND),
  makeCard(DEFEND),
  makeCard(DEFEND),
  makeCard(DEFEND),
  makeCard(DEFEND),
];

// 奖励池（静态展示用）
export const REWARD_POOL: Card[] = REWARD_TEMPLATES.map(makeCard);

// 创建初始卡组（深拷贝，每张 id 唯一）
export function createInitialDeck(): Card[] {
  return [
    makeCard(STRIKE),
    makeCard(STRIKE),
    makeCard(STRIKE),
    makeCard(STRIKE),
    makeCard(STRIKE),
    makeCard(DEFEND),
    makeCard(DEFEND),
    makeCard(DEFEND),
    makeCard(DEFEND),
    makeCard(DEFEND),
  ];
}

// 升级数值字段（+50%）
function upgradeValue(v: number | undefined): number | undefined {
  if (v === undefined) return undefined;
  return Math.floor(v * 1.5);
}

// 升级单张卡（数值 +50%）
export function upgradeCard(card: Card): Card {
  if (!card.upgradeable || card.upgraded) return card;

  const upgraded: Card = {
    ...card,
    upgraded: true,
    damage: upgradeValue(card.damage),
    block: upgradeValue(card.block),
    heal: upgradeValue(card.heal),
    strength: upgradeValue(card.strength),
    weaken: upgradeValue(card.weaken),
    energyNext: upgradeValue(card.energyNext),
    draw: upgradeValue(card.draw),
  };

  // 重写描述（简单处理：把数值替换为升级后的值）
  upgraded.description = upgradeDescription(card, upgraded);

  return upgraded;
}

// 根据升级后的数值重写描述
function upgradeDescription(original: Card, upgraded: Card): string {
  let desc = original.description;

  // 替换伤害
  if (original.damage !== undefined && upgraded.damage !== undefined) {
    desc = desc.replace(`${original.damage} 伤害`, `${upgraded.damage} 伤害`);
  }
  // 替换格挡
  if (original.block !== undefined && upgraded.block !== undefined) {
    desc = desc.replace(`${original.block} 格挡`, `${upgraded.block} 格挡`);
  }
  // 替换治疗
  if (original.heal !== undefined && upgraded.heal !== undefined) {
    desc = desc.replace(`${original.heal} HP`, `${upgraded.heal} HP`);
  }
  // 替换力量
  if (original.strength !== undefined && upgraded.strength !== undefined) {
    desc = desc.replace(`${original.strength} 力量`, `${upgraded.strength} 力量`);
  }
  // 替换能量
  if (original.energyNext !== undefined && upgraded.energyNext !== undefined) {
    desc = desc.replace(`${original.energyNext} 能量`, `${upgraded.energyNext} 能量`);
  }

  return desc;
}

// 从奖励池随机选 count 张（用于三选一）
export function getRandomRewardCards(count: number): Card[] {
  const shuffled = [...REWARD_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(makeCard);
}
