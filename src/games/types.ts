// 棋类游戏通用类型定义

export type GameType =
  | 'xiangqi'
  | 'doudizhu'
  | 'gomoku'
  | 'janggi'
  | 'chess'
  | 'junqi'
  | 'weiqi'
  | 'shogi'
  | 'othello'
  | 'connect4'
  | 'roguelike';

export interface BaseGameConfig {
  type: GameType;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
}

export const GAME_CONFIGS: BaseGameConfig[] = [
  { type: 'xiangqi', name: '中国象棋', nameEn: 'Xiangqi', description: '楚河汉界，运筹帷幄', icon: '♟' },
  { type: 'gomoku', name: '五子棋', nameEn: 'Gomoku', description: '五子连珠，简单易学', icon: '⚫' },
  { type: 'janggi', name: '韩国象棋', nameEn: 'Janggi', description: '朝鲜半岛的象棋变种', icon: '將' },
  { type: 'chess', name: '国际象棋', nameEn: 'Chess', description: '王后城堡，八格天下', icon: '♚' },
  { type: 'junqi', name: '军棋', nameEn: 'Junqi', description: '暗棋翻面，军衔较量', icon: '军' },
  { type: 'weiqi', name: '围棋', nameEn: 'Go', description: '黑白世界，千古绝弈', icon: '◯' },
  { type: 'shogi', name: '日本将棋', nameEn: 'Shogi', description: '升变持驹，东瀛棋道', icon: '王' },
  { type: 'othello', name: '黑白棋', nameEn: 'Othello', description: '翻转棋子，角力争锋', icon: '◍' },
  { type: 'connect4', name: '四子棋', nameEn: 'Connect Four', description: '重力落子，四连即胜', icon: '⚫' },
  { type: 'roguelike', name: 'Roguelike 卡牌', nameEn: 'Roguelike', description: '暗黑冒险，卡组构建', icon: '⚔' },
];
