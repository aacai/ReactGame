import { motion } from 'framer-motion';
import type { Card } from '../game/types';
import { getRankName, getSuitSymbol } from '../game/rules';

interface PlayingCardProps {
  card?: Card;
  selected?: boolean;
  onClick?: () => void;
  size?: 'small' | 'normal' | 'large';
  faceDown?: boolean;
  disabled?: boolean;
}

const sizeConfig = {
  small: {
    width: 44,
    height: 64,
    cornerFontSize: 9,
    cornerSuitSize: 12,
    centerSuitSize: 22,
    padding: 3,
  },
  normal: {
    width: 88,
    height: 128,
    cornerFontSize: 16,
    cornerSuitSize: 20,
    centerSuitSize: 46,
    padding: 6,
  },
  large: {
    width: 96,
    height: 140,
    cornerFontSize: 18,
    cornerSuitSize: 24,
    centerSuitSize: 52,
    padding: 7,
  },
};

export function PlayingCard({
  card,
  selected = false,
  onClick,
  size = 'normal',
  faceDown = false,
  disabled = false,
}: PlayingCardProps) {
  const config = sizeConfig[size];

  const isRed = card
    ? card.suit === 'hearts' || card.suit === 'diamonds' || card.rank === 17
    : false;

  const isJoker = card?.suit === 'joker';

  const color = isRed ? '#DC2626' : '#111827';

  if (faceDown || !card) {
    return (
      <motion.div
        whileHover={!disabled ? { y: -4 } : undefined}
        whileTap={!disabled ? { scale: 0.95 } : undefined}
        style={{
          width: config.width,
          height: config.height,
          borderRadius: config.width * 0.08,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #172554 100%)',
          position: 'relative',
          overflow: 'hidden',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: config.width * 0.06,
            borderRadius: config.width * 0.06,
            border: '2px solid rgba(96, 165, 250, 0.5)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: config.width * 0.12,
            borderRadius: config.width * 0.04,
            border: '1px solid rgba(147, 197, 253, 0.3)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(45deg)',
            fontSize: config.width * 0.2,
            color: 'rgba(191, 219, 254, 0.4)',
            fontWeight: 900,
            letterSpacing: '0.1em',
          }}
        >
          ♠♥♦♣
        </div>
      </motion.div>
    );
  }

  const rankName = getRankName(card.rank);
  const suitSymbol = getSuitSymbol(card.suit);

  return (
    <motion.div
      onClick={!disabled ? onClick : undefined}
      whileHover={!disabled ? { y: -4 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        width: config.width,
        height: config.height,
        borderRadius: config.width * 0.08,
        boxShadow: selected
          ? '0 0 0 3px #facc15, 0 4px 16px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.2)',
        background: '#ffffff',
        border: selected ? '2px solid #facc15' : '1px solid #d1d5db',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {isJoker ? (
        <>
          <div
            style={{
              position: 'absolute',
              top: config.padding,
              left: config.padding,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: 1,
            }}
          >
            <span
              style={{
                fontSize: config.cornerFontSize,
                fontWeight: 900,
                color,
                lineHeight: 1,
              }}
            >
              {card.rank === 17 ? '大' : '小'}
            </span>
            <span
              style={{
                fontSize: config.cornerSuitSize,
                color,
                lineHeight: 1,
                marginTop: 1,
              }}
            >
              ★
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: config.centerSuitSize * 0.55,
              fontWeight: 900,
              color,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: 1,
              gap: 2,
            }}
          >
            <span>{card.rank === 17 ? '大' : '小'}</span>
            <span>王</span>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: config.padding,
              right: config.padding,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: 1,
              transform: 'rotate(180deg)',
            }}
          >
            <span
              style={{
                fontSize: config.cornerFontSize,
                fontWeight: 900,
                color,
                lineHeight: 1,
              }}
            >
              {card.rank === 17 ? '大' : '小'}
            </span>
            <span
              style={{
                fontSize: config.cornerSuitSize,
                color,
                lineHeight: 1,
                marginTop: 1,
              }}
            >
              ★
            </span>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              position: 'absolute',
              top: config.padding,
              left: config.padding,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: 1,
            }}
          >
            <span
              style={{
                fontSize: config.cornerFontSize,
                fontWeight: 700,
                color,
                lineHeight: 1,
              }}
            >
              {rankName}
            </span>
            <span
              style={{
                fontSize: config.cornerSuitSize,
                color,
                lineHeight: 1,
                marginTop: 1,
              }}
            >
              {suitSymbol}
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: config.centerSuitSize,
              color,
              lineHeight: 1,
            }}
          >
            {suitSymbol}
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: config.padding,
              right: config.padding,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: 1,
              transform: 'rotate(180deg)',
            }}
          >
            <span
              style={{
                fontSize: config.cornerFontSize,
                fontWeight: 700,
                color,
                lineHeight: 1,
              }}
            >
              {rankName}
            </span>
            <span
              style={{
                fontSize: config.cornerSuitSize,
                color,
                lineHeight: 1,
                marginTop: 1,
              }}
            >
              {suitSymbol}
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
}
