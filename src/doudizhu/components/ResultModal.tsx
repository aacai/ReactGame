import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, Home, Crown } from 'lucide-react';

interface ResultModalProps {
  isOpen: boolean;
  winner: 'landlord' | 'farmer' | null;
  landlordName?: string;
  playerIsLandlord?: boolean;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export function ResultModal({
  isOpen,
  winner,
  landlordName = '地主',
  playerIsLandlord = false,
  onPlayAgain,
  onBackToMenu,
}: ResultModalProps) {
  const isWin = winner 
    ? (playerIsLandlord && winner === 'landlord') || (!playerIsLandlord && winner === 'farmer')
    : false;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-80 rounded-2xl overflow-hidden"
          >
            <div className={`
              p-8 text-center
              ${isWin 
                ? 'bg-gradient-to-b from-yellow-400 to-yellow-600' 
                : 'bg-gradient-to-b from-gray-600 to-gray-800'
              }
            `}>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center"
              >
                {isWin ? (
                  <Trophy size={48} className="text-yellow-900" />
                ) : (
                  <Crown size={48} className="text-gray-400" />
                )}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`text-3xl font-bold mb-2 ${isWin ? 'text-yellow-900' : 'text-white'}`}
              >
                {isWin ? '胜利！' : '失败'}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className={`text-sm mb-6 ${isWin ? 'text-yellow-800' : 'text-gray-300'}`}
              >
                {winner === 'landlord' ? `地主 ${landlordName} 获胜` : '农民获胜'}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPlayAgain}
                  className="w-full py-3 px-6 rounded-xl bg-white font-bold text-gray-800 flex items-center justify-center gap-2 shadow-lg"
                >
                  <RotateCcw size={20} />
                  再来一局
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onBackToMenu}
                  className="w-full py-3 px-6 rounded-xl bg-black/20 font-bold text-white flex items-center justify-center gap-2"
                >
                  <Home size={20} />
                  返回菜单
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
