// 敌人数据：5 种普通怪 + 1 Boss

import type { Enemy, EnemyMove, StatusEffect } from './types';

// 敌人模板（不含运行时 id / 状态字段）
export interface EnemyTemplate {
  templateId: string;
  name: string;
  maxHp: number;
  moves: EnemyMove[];
  emoji: string;
}

// 唯一 id 计数器
let enemyIdCounter = 0;
function makeId(): string {
  return `enemy-${++enemyIdCounter}`;
}

// 空状态
const EMPTY_STATUS: StatusEffect = { strength: 0, weak: 0, stun: 0 };

// ===== 普通怪模板 =====

// 史莱姆：低血量，蓄力后攻击
const SLIME: EnemyTemplate = {
  templateId: 'slime',
  name: '史莱姆',
  maxHp: 18,
  emoji: '🟢',
  moves: [
    { type: 'attack', value: 6, description: '攻击 6' },
    { type: 'block', value: 8, description: '蓄力 8 格挡' },
  ],
};

// 哥布林：会施加虚弱
const GOBLIN: EnemyTemplate = {
  templateId: 'goblin',
  name: '哥布林',
  maxHp: 22,
  emoji: '👺',
  moves: [
    { type: 'attack', value: 5, description: '攻击 5' },
    { type: 'attack-debuff', value: 4, description: '攻击 4 + 施加 1 虚弱' },
  ],
};

// 骷髅兵：攻防兼备
const SKELETON: EnemyTemplate = {
  templateId: 'skeleton',
  name: '骷髅兵',
  maxHp: 25,
  emoji: '💀',
  moves: [
    { type: 'attack', value: 7, description: '攻击 7' },
    { type: 'block', value: 5, description: '防御 5 格挡' },
  ],
};

// 幽灵：飘忽不定
const GHOST: EnemyTemplate = {
  templateId: 'ghost',
  name: '幽灵',
  maxHp: 20,
  emoji: '👻',
  moves: [
    { type: 'attack', value: 4, description: '阴爪 4' },
    { type: 'attack', value: 6, description: '怨念 6' },
  ],
};

// 石像鬼：高血量重击
const GARGOYLE: EnemyTemplate = {
  templateId: 'gargoyle',
  name: '石像鬼',
  maxHp: 30,
  emoji: '🗿',
  moves: [
    { type: 'attack', value: 9, description: '重击 9' },
    { type: 'block', value: 6, description: '石化 6 格挡' },
  ],
};

// ===== Boss 模板 =====

// 暗影领主：三种行动模式
const SHADOW_LORD: EnemyTemplate = {
  templateId: 'shadow_lord',
  name: '暗影领主',
  maxHp: 60,
  emoji: '👹',
  moves: [
    { type: 'attack', value: 12, description: '暗影斩 12' },
    { type: 'attack-debuff', value: 8, description: '腐蚀 8 + 1 虚弱' },
    { type: 'attack-debuff', value: 10, description: '震慑 10 + 1 晕眩' },
  ],
};

// 普通怪模板表
export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  slime: SLIME,
  goblin: GOBLIN,
  skeleton: SKELETON,
  ghost: GHOST,
  gargoyle: GARGOYLE,
};

// Boss 模板
export const BOSS_TEMPLATE: EnemyTemplate = SHADOW_LORD;

// 普通怪 templateId 列表
export const NORMAL_ENEMY_IDS = Object.keys(ENEMY_TEMPLATES);

// 由模板创建敌人实例（深拷贝、唯一 id）
export function createEnemy(template: EnemyTemplate): Enemy {
  return {
    id: makeId(),
    name: template.name,
    hp: template.maxHp,
    maxHp: template.maxHp,
    block: 0,
    status: { ...EMPTY_STATUS },
    moves: template.moves.map((m) => ({ ...m })),
    moveIndex: 0,
    emoji: template.emoji,
  };
}

// 随机创建一个普通敌人
export function createRandomEnemy(): Enemy {
  const id = NORMAL_ENEMY_IDS[Math.floor(Math.random() * NORMAL_ENEMY_IDS.length)];
  return createEnemy(ENEMY_TEMPLATES[id]);
}

// 创建 Boss
export function createBoss(): Enemy {
  return createEnemy(BOSS_TEMPLATE);
}
