// Roguelike 卡牌游戏类型定义

// 卡牌类型：攻击 / 技能 / 能力
export type CardType = 'attack' | 'skill' | 'power';

// 卡牌目标
export type CardTarget = 'enemy' | 'all-enemies' | 'self';

// 卡牌
export interface Card {
  id: string;            // 实例唯一 id
  name: string;          // 卡名
  type: CardType;        // 卡牌类型
  cost: number;          // 能量费用
  description: string;   // 描述
  damage?: number;       // 伤害值
  block?: number;        // 格挡值
  heal?: number;         // 治疗值
  draw?: number;         // 抽牌数
  energyNext?: number;   // 下回合能量
  weaken?: number;       // 施加虚弱层数
  strength?: number;     // 力量增益
  exhaust?: boolean;     // 是否消耗
  hits?: number;         // 攻击次数（双击 = 2）
  upgradeable: boolean;  // 是否可升级
  upgraded: boolean;     // 是否已升级
  target?: CardTarget;   // 目标类型
}

// 状态效果
export interface StatusEffect {
  strength: number;  // 力量（攻击伤害 +N）
  weak: number;      // 虚弱（造成伤害 -25%）
  stun: number;      // 晕眩（跳过下回合）
}

// 玩家
export interface Player {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  block: number;
  status: StatusEffect;
  gold: number;
}

// 敌人行动
export interface EnemyMove {
  type: 'attack' | 'block' | 'buff' | 'attack-debuff';
  value: number;        // 数值（伤害/格挡/力量等）
  description: string;  // 行动描述
}

// 敌人
export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  status: StatusEffect;
  moves: EnemyMove[];
  moveIndex: number;
  emoji: string;
}

// 地图节点类型
export type MapNodeType = 'combat' | 'rest' | 'shop' | 'boss';

// 地图节点
export interface MapNode {
  id: string;
  type: MapNodeType;
  completed: boolean;
  index: number;  // 在地图中的位置（0-9）
}

// 遗物
export interface Relic {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

// 牌堆
export type Pile = Card[];

// 战斗状态
export interface CombatState {
  player: Player;
  enemies: Enemy[];
  hand: Pile;
  drawPile: Pile;
  discardPile: Pile;
  exhaustPile: Pile;
  turn: 'player' | 'enemy';
  selectedCardId: string | null;
  targetEnemyId: string | null;
  isOver: boolean;
  result: 'win' | 'lose' | null;
  // 扩展字段：当前拥有的遗物（用于战斗内效果）
  relics: Relic[];
  // 扩展字段：下回合额外能量（蓄势卡用）
  pendingEnergyNext: number;
  // 扩展字段：本回合是否已使用首张攻击牌加成（铁剑遗物用）
  firstAttackBonusApplied: boolean;
}

// 游戏阶段
export type GamePhase = 'intro' | 'map' | 'combat' | 'rest' | 'shop' | 'victory' | 'defeat';

// 顶层游戏状态
export interface GameState {
  phase: GamePhase;
  player: Player;
  deck: Pile;             // 主卡组（战斗外）
  relics: Relic[];
  mapNodes: MapNode[];
  currentNodeIndex: number;  // 当前所在节点（-1 表示尚未进入地图）
  combat: CombatState | null;
  rewardChoices: Card[];     // 战斗胜利后的三选一奖励
  defeatedEnemies: number;
  goldEarned: number;
  // 篝火/商店内部状态
  restUsed: boolean;
  shopPurchased: { upgrade: boolean; heal: boolean; relic: boolean };
}
