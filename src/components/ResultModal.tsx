import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export function ResultModal() {
  const { gameStatus, winner, resetGame } = useGameStore();

  const isVisible = gameStatus !== 'playing';

  const getWinReason = (): string => {
    switch (gameStatus) {
      case 'checkmate':
        return '将死';
      case 'stalemate':
        return '困毙';
      case 'resigned':
        return '认输';
      default:
        return '';
    }
  };

  const isRedWin = winner === 'red';
  const winReason = getWinReason();
  const isStalemate = gameStatus === 'stalemate';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="wood-panel p-8 max-w-md w-full text-center"
          >
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <div
                  className="inline-block px-8 py-4 rounded-lg"
                  style={{
                    background: isStalemate
                      ? 'linear-gradient(145deg, #8B4513, #654321)'
                      : isRedWin
                      ? 'linear-gradient(145deg, #B22222, #8B0000)'
                      : 'linear-gradient(145deg, #1a1a1a, #000000)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <span
                    className="font-calligraphy text-5xl"
                    style={{
                      color: '#FFFFF0',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    {isStalemate ? '和 棋' : isRedWin ? '红方胜' : '黑方胜'}
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-8"
              >
                <div className="flex items-center justify-center gap-4 mb-4">
                  {!isStalemate && (
                    <>
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl"
                        style={{
                          background: isRedWin
                            ? 'radial-gradient(circle at 30% 30%, #FFFFF0, #E8D4A8)'
                            : 'radial-gradient(circle at 30% 30%, #FFFFF0, #E8D4A8)',
                          color: isRedWin ? '#B22222' : '#1a1a1a',
                          border: isRedWin
                            ? '3px solid rgba(178, 34, 34, 0.5)'
                            : '3px solid rgba(26, 26, 26, 0.5)',
                          fontFamily: 'serif',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}
                      >
                        {isRedWin ? '帅' : '将'}
                      </div>
                    </>
                  )}
                </div>
                <p className="font-serif-sc text-wood-dark/80 text-lg">
                  {isStalemate
                    ? '双方无子可走，判为和棋'
                    : `胜利原因：${winReason}`}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex justify-center gap-4"
              >
                <button onClick={resetGame} className="seal-btn text-lg px-8 py-3">
                  再来一局
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-8 pt-4 border-t border-wood-dark/20"
              >
                <p className="font-calligraphy text-wood-dark/60 text-lg">
                  ~ 棋局结束 ~
                </p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
