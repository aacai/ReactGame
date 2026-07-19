import { motion } from 'framer-motion';
import type { Piece } from '../game/types';
import { PIECE_NAMES } from '../game/types';

interface ChessPieceProps {
  piece: Piece;
  selected: boolean;
  isHint?: boolean;
  onClick: () => void;
}

export function ChessPiece({ piece, selected, isHint = false, onClick }: ChessPieceProps) {
  const isRed = piece.color === 'red';
  const pieceName = PIECE_NAMES[piece.color][piece.type];

  return (
    <motion.div
      className="relative w-full h-full cursor-pointer select-none"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {isHint && (
        <motion.div
          className="absolute -inset-1 rounded-full"
          style={{
            border: '3px solid #FFD700',
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.8), inset 0 0 15px rgba(255, 215, 0, 0.4)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [1, 0.6, 1],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      <div
        className={`
          absolute inset-0 rounded-full
          flex items-center justify-center
          font-bold
          transition-all duration-200
          ${selected ? 'ring-4 ring-yellow-400 ring-opacity-80' : ''}
        `}
        style={{
          background: `
            radial-gradient(circle at 30% 30%, 
              #FFFFF0 0%, 
              #F5E6C8 40%, 
              #E8D4A8 70%, 
              #D4B896 100%
            )
          `,
          boxShadow: `
            inset 0 -4px 8px rgba(139, 69, 19, 0.3),
            inset 0 4px 8px rgba(255, 255, 255, 0.5),
            0 4px 12px rgba(0, 0, 0, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.2)
          `,
          color: isRed ? '#B22222' : '#1a1a1a',
          textShadow: isRed 
            ? '1px 1px 2px rgba(178, 34, 34, 0.3)' 
            : '1px 1px 2px rgba(26, 26, 26, 0.3)',
          fontSize: 'clamp(1rem, 5vw, 2rem)',
          border: isRed 
            ? '2px solid rgba(178, 34, 34, 0.4)' 
            : '2px solid rgba(26, 26, 26, 0.4)',
        }}
      >
        <span className="relative z-10" style={{ fontFamily: 'serif' }}>
          {pieceName}
        </span>
        <div
          className="absolute inset-1 rounded-full opacity-30"
          style={{
            background: `
              radial-gradient(circle at 30% 20%, 
                rgba(255, 255, 255, 0.8) 0%, 
                transparent 50%
              )
            `,
          }}
        />
      </div>
    </motion.div>
  );
}
