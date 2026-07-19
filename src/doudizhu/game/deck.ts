import type { Card, CardSuit } from './types';

const SUITS: CardSuit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
const RANKS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        id: `card_${id++}`,
      });
    }
  }

  deck.push({ suit: 'joker', rank: 16, id: `card_${id++}` });
  deck.push({ suit: 'joker', rank: 17, id: `card_${id++}` });

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.rank - b.rank);
}

export function dealCards(deck: Card[]): { bottom: Card[]; players: Card[][] } {
  const shuffled = shuffleDeck(deck);
  const players: Card[][] = [[], [], []];

  for (let i = 0; i < 51; i++) {
    players[i % 3].push(shuffled[i]);
  }

  const bottom = shuffled.slice(51, 54);

  for (let i = 0; i < 3; i++) {
    players[i] = sortCards(players[i]);
  }

  return { bottom: sortCards(bottom), players };
}
