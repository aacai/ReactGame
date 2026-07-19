// 遗物数据：5 个遗物

import type { Relic } from './types';

export const RELICS: Relic[] = [
  {
    id: 'iron_sword',
    name: '铁剑',
    description: '每回合首张攻击牌伤害 +2',
    emoji: '⚔️',
  },
  {
    id: 'amulet',
    name: '护符',
    description: '战斗开始时多 1 能量',
    emoji: '🔮',
  },
  {
    id: 'heart',
    name: '心脏',
    description: '最大 HP +20',
    emoji: '❤️',
  },
  {
    id: 'vampire_fang',
    name: '吸血牙',
    description: '攻击造成伤害时回 1 HP',
    emoji: '🦷',
  },
  {
    id: 'reforge_hammer',
    name: '重铸锤',
    description: '每场战斗开始抽 1 张额外牌',
    emoji: '🔨',
  },
];

// 随机获取一个遗物（排除已拥有的）
export function getRandomRelic(excludeIds: string[] = []): Relic {
  const available = RELICS.filter((r) => !excludeIds.includes(r.id));
  if (available.length === 0) return RELICS[0];
  return available[Math.floor(Math.random() * available.length)];
}
