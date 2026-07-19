import { motion } from 'framer-motion';
import { Crown, Bot, User } from 'lucide-react';
import type { PlayerPosition } from '../game/types';

interface PlayerInfoProps {
  position: PlayerPosition;
  name: string;
  remaining: number;
  isLandlord?: boolean;
  isActive?: boolean;
  isAutoPlay?: boolean;
  avatar?: string;
}

export function PlayerInfo({
  position,
  name,
  remaining,
  isLandlord = false,
  isActive = false,
  isAutoPlay = false,
}: PlayerInfoProps) {
  const isVertical = position === 'left' || position === 'right';

  return (
    <motion.div
      animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
      className={`
        flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-2
        p-3 rounded-xl
        ${isActive 
          ? 'bg-yellow-500/20 ring-2 ring-yellow-400' 
          : 'bg-black/20'
        }
        transition-all duration-300
      `}
    >
      <div className="relative">
        <div className={`
          w-12 h-12 rounded-full
          bg-gradient-to-br from-blue-500 to-blue-700
          flex items-center justify-center
          ${isActive ? 'ring-2 ring-yellow-400' : ''}
        `}>
          {isAutoPlay ? (
            <Bot size={24} className="text-white" />
          ) : (
            <User size={24} className="text-white" />
          )}
        </div>

        {isLandlord && (
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg"
          >
            <Crown size={14} className="text-yellow-800" />
          </motion.div>
        )}
      </div>

      <div className={`flex ${isVertical ? 'flex-col items-center' : 'flex-col items-start'}`}>
        <div className="flex items-center gap-1">
          <span className="text-white font-bold text-sm">{name}</span>
          {isAutoPlay && (
            <span className="text-xs text-gray-400">[托管]</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-yellow-400 font-bold text-lg">{remaining}</span>
          <span className="text-white/60 text-xs">张</span>
        </div>
      </div>
    </motion.div>
  );
}
