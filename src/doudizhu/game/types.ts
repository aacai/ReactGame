export type CardSuit = 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'joker';

export interface Card {
  suit: CardSuit;
  rank: number;
  id: string;
}

export type CardType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'triple_single'
  | 'triple_pair'
  | 'straight'
  | 'straight_pair'
  | 'airplane'
  | 'airplane_single'
  | 'airplane_pair'
  | 'four_two'
  | 'bomb'
  | 'rocket';

export type PlayerPosition = 'bottom' | 'left' | 'right';

export type GamePhase = 'waiting' | 'bidding' | 'playing' | 'ended';

export type GameMode = 'pve' | 'online' | 'watch';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface PlayedCards {
  player: PlayerPosition;
  cards: Card[];
  cardType: CardType;
  mainRank: number;
}

export interface PlayerInfo {
  position: PlayerPosition;
  name: string;
  cards: Card[];
  isLandlord: boolean;
  isAutoPlay: boolean;
  remaining: number;
}
