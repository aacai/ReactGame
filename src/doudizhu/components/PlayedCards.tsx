import { motion, AnimatePresence } from 'framer-motion';
import { PlayingCard } from './PlayingCard';
import type { Card, CardType, PlayerPosition } from '../game/types';

interface PlayedCardsProps {
  cards: Card[];
  cardType?: CardType | 'pass';
  position?: PlayerPosition;
  size?: 'small' | 'normal';
}

const cardTypeNames: Record<CardType | 'pass', string> = {
  single: '单张',
  pair: '对子',
  triple: '三张',
  triple_single: '三带一',
  triple_pair: '三带二',
  straight: '顺子',
  straight_pair: '连对',
  airplane: '飞机',
  airplane_single: '飞机带单',
  airplane_pair: '飞机带双',
  four_two: '四带二',
  bomb: '炸弹',
  rocket: '王炸',
  pass: '不出',
};

const CARD_SIZES = {
  small: { width: 52, height: 76 },
  normal: { width: 88, height: 128 },
};

export function PlayedCards({
  cards,
  cardType,
  position = 'bottom',
  size = 'normal',
}: PlayedCardsProps) {
  const isBomb = cardType === 'bomb' || cardType === 'rocket';
  const isPass = cardType === 'pass';
  const cardWidth = CARD_SIZES[size].width;
  const overlap = cardWidth * 0.55;
  const mlValue = -(cardWidth - overlap);

  return (
    <div className="flex flex-col items-center justify-center gap-2 min-h-[100px]">
      <AnimatePresence mode="wait">
        {cards.length > 0 && (
          <motion.div
            key="cards"
            initial={{ opacity: 0, scale: 0.8, y: position === 'bottom' ? 20 : position === 'left' ? -20 : 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              rotate: isBomb ? [0, -2, 2, -2, 2, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              duration: 0.3,
              rotate: isBomb ? { duration: 0.5, repeat: 2 } : undefined,
            }}
            className="flex items-center justify-center relative"
          >
            {isBomb && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.3, 0], scale: [0.5, 1.5, 2] }}
                transition={{ duration: 0.6, repeat: 2 }}
                className="absolute inset-0 rounded-full bg-yellow-400/50 blur-xl"
              />
            )}
            
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: index * 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{ 
                  zIndex: index,
                  marginLeft: index > 0 ? mlValue : 0,
                }}
              >
                <PlayingCard card={card} size={size} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {isPass && cards.length === 0 && (
          <motion.div
            key="pass"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="text-gray-400 text-lg font-bold"
          >
            不出
          </motion.div>
        )}
      </AnimatePresence>

      {cardType && cardType !== 'pass' && cards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            text-sm font-bold px-3 py-1 rounded-full
            ${isBomb 
              ? 'bg-yellow-500 text-yellow-900' 
              : 'bg-white/20 text-white/80'
            }
          `}
        >
          {cardTypeNames[cardType]}
        </motion.div>
      )}
    </div>
  );
}
