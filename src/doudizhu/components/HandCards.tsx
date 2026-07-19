import { motion, AnimatePresence } from 'framer-motion';
import { PlayingCard } from './PlayingCard';
import type { Card } from '../game/types';

interface HandCardsProps {
  cards: Card[];
  selectedCardIds: string[];
  onSelectCard: (cardId: string) => void;
  onClearSelection?: () => void;
  onPlay?: () => void;
  onPass?: () => void;
  onHint?: () => void;
  disabled?: boolean;
  canPlay?: boolean;
  canPass?: boolean;
  size?: 'small' | 'normal' | 'large';
}

const CARD_SIZES = {
  small: { width: 52, height: 76 },
  normal: { width: 88, height: 128 },
  large: { width: 110, height: 160 },
};

export function HandCards({
  cards,
  selectedCardIds,
  onSelectCard,
  onClearSelection,
  onPlay,
  onPass,
  onHint,
  disabled = false,
  canPlay = true,
  canPass = true,
  size = 'normal',
}: HandCardsProps) {
  const cardWidth = CARD_SIZES[size].width;
  const cardHeight = CARD_SIZES[size].height;

  const maxVisibleWidth = typeof window !== 'undefined' ? window.innerWidth - 60 : 800;

  const minOverlap = cardWidth * 0.3;
  const maxOverlap = cardWidth * 0.75;

  let overlap = cardWidth * 0.5;
  if (cards.length > 0) {
    const neededWidth = cardWidth + (cards.length - 1) * (cardWidth - overlap);
    if (neededWidth > maxVisibleWidth) {
      const visiblePerCard = (maxVisibleWidth - cardWidth) / (cards.length - 1);
      overlap = Math.min(maxOverlap, Math.max(minOverlap, cardWidth - visiblePerCard));
    }
  }

  const selectedOffset = cardHeight * 0.12;

  const totalWidth = cards.length > 0
    ? cardWidth + (cards.length - 1) * (cardWidth - overlap)
    : 0;

  const containerHeight = cardHeight + selectedOffset + 16;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        style={{
          width: totalWidth > 0 ? totalWidth : 'auto',
          height: containerHeight,
          minWidth: cardWidth,
        }}
      >
        <AnimatePresence>
          {cards.map((card, index) => {
            const isSelected = selectedCardIds.includes(card.id);
            const x = index * (cardWidth - overlap);

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{
                  opacity: 1,
                  y: isSelected ? -selectedOffset : 0,
                  x,
                }}
                exit={{ opacity: 0, y: -40 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                  delay: index * 0.015,
                }}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  zIndex: index,
                }}
              >
                <PlayingCard
                  card={card}
                  selected={isSelected}
                  onClick={() => onSelectCard(card.id)}
                  size={size}
                  disabled={disabled}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {(onPlay || onPass || onHint || onClearSelection) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 flex-wrap justify-center"
        >
          {onClearSelection && selectedCardIds.length > 0 && (
            <motion.button
              whileHover={!disabled ? { scale: 1.05 } : undefined}
              whileTap={!disabled ? { scale: 0.95 } : undefined}
              onClick={onClearSelection}
              disabled={disabled}
              className={`
                px-5 py-2 rounded-lg font-bold text-white
                transition-all duration-200
                ${!disabled
                  ? 'bg-amber-600/90 hover:bg-amber-600 cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed opacity-60'
                }
              `}
            >
              放下
            </motion.button>
          )}

          {onPass && (
            <motion.button
              whileHover={canPass && !disabled ? { scale: 1.05 } : undefined}
              whileTap={canPass && !disabled ? { scale: 0.95 } : undefined}
              onClick={onPass}
              disabled={!canPass || disabled}
              className={`
                px-6 py-2 rounded-lg font-bold text-white
                transition-all duration-200
                ${canPass && !disabled
                  ? 'bg-gray-600 hover:bg-gray-700 cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed opacity-60'
                }
              `}
            >
              不出
            </motion.button>
          )}

          {onHint && (
            <motion.button
              whileHover={!disabled ? { scale: 1.05 } : undefined}
              whileTap={!disabled ? { scale: 0.95 } : undefined}
              onClick={onHint}
              disabled={disabled}
              className={`
                px-6 py-2 rounded-lg font-bold text-white
                transition-all duration-200
                ${!disabled
                  ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed opacity-60'
                }
              `}
            >
              提示
            </motion.button>
          )}

          {onPlay && (
            <motion.button
              whileHover={canPlay && !disabled ? { scale: 1.05 } : undefined}
              whileTap={canPlay && !disabled ? { scale: 0.95 } : undefined}
              onClick={onPlay}
              disabled={!canPlay || disabled}
              className={`
                px-8 py-2 rounded-lg font-bold text-white
                transition-all duration-200
                ${canPlay && !disabled
                  ? 'bg-green-500 hover:bg-green-600 cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed opacity-60'
                }
              `}
            >
              出牌
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  );
}
