import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Clock } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export function UndoModal() {
  const { undoRequestStatus, acceptUndo, rejectUndo } = useGameStore();

  const isReceived = undoRequestStatus === 'received';
  const isSent = undoRequestStatus === 'sent';
  const showModal = isReceived || isSent;

  const handleAccept = () => {
    acceptUndo();
  };

  const handleReject = () => {
    rejectUndo();
  };

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="wood-panel p-8 max-w-sm w-full"
          >
            <div className="relative z-10 text-center">
              <motion.div
                animate={isSent ? { rotate: 360 } : {}}
                transition={isSent ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
                className="w-20 h-20 rounded-full bg-vermilion/20 flex items-center justify-center mx-auto mb-6"
              >
                {isSent ? (
                  <Clock size={40} className="text-vermilion" />
                ) : (
                  <Undo2 size={40} className="text-vermilion" />
                )}
              </motion.div>

              <h3 className="font-calligraphy text-3xl text-wood-dark mb-3">
                {isSent ? '等待对方回应' : '对方请求悔棋'}
              </h3>

              <p className="font-serif-sc text-wood-dark/70 mb-8">
                {isSent
                  ? '已发送悔棋请求，等待对方同意...'
                  : '对方请求悔棋，是否同意？'}
              </p>

              {isReceived ? (
                <div className="flex gap-4 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleReject}
                    className="seal-btn seal-btn-secondary text-lg px-8 py-3"
                  >
                    拒绝
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAccept}
                    className="seal-btn text-lg px-8 py-3"
                  >
                    同意
                  </motion.button>
                </div>
              ) : (
                <div className="flex justify-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 rounded-full bg-vermilion"
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
