import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, X, Users } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

function useIsLandscapeMobile() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const check = () => {
      const isLand = window.innerHeight < window.innerWidth;
      const isShort = window.innerHeight <= 500;
      const isMobile = window.innerWidth < 1024;
      setIsLandscape(isLand && isShort && isMobile);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return isLandscape;
}

export function OnlineWaitingRoom() {
  const { roomId, leaveOnlineRoom, showToast } = useGameStore();
  const [copied, setCopied] = useState(false);
  const isLandscapeMobile = useIsLandscapeMobile();

  const handleCopyRoomId = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      showToast('房间号已复制', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('复制失败，请手动复制', 'error');
    }
  };

  const handleCancel = () => {
    leaveOnlineRoom();
  };

  return (
    <div className={`min-h-screen relative flex items-center justify-center py-8 px-4 ${isLandscapeMobile ? 'landscape-waiting' : ''}`}>
      <div className="relative z-10 w-full max-w-md mx-auto waiting-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="wood-panel p-8 rounded-2xl text-center waiting-content"
        >
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-24 h-24 rounded-full bg-vermilion/20 flex items-center justify-center mx-auto mb-6 waiting-icon"
            >
              <Users size={48} className="text-vermilion" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="font-calligraphy text-3xl text-wood-dark mb-2 waiting-title"
            >
              等待对手加入
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="font-serif-sc text-wood-dark/70 mb-8 waiting-desc"
            >
              分享房间号给好友，开始对弈
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
              <div className="font-serif-sc text-wood-dark/60 text-sm mb-3">
                房间号
              </div>
              <div className="flex items-center justify-center gap-3 mb-4">
                <div
                  className="font-mono text-5xl md:text-6xl font-bold tracking-widest px-6 py-4 rounded-xl room-id"
                  style={{
                    background: 'linear-gradient(145deg, #1a1a1a, #2d2d2d)',
                    color: '#DEB887',
                    border: '3px solid #8B4513',
                    textShadow: '0 0 20px rgba(222, 184, 135, 0.5)',
                    letterSpacing: '0.2em',
                  }}
                >
                  {roomId || '------'}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyRoomId}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl transition-all"
                style={{
                  background: 'linear-gradient(145deg, #4A7C59, #2d5a3d)',
                  color: '#FFFFF0',
                  border: '2px solid #2d5a3d',
                  boxShadow: '0 4px 12px rgba(74, 124, 89, 0.4)',
                }}
              >
                {copied ? (
                  <>
                    <Check size={20} />
                    <span className="font-calligraphy text-lg">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    <span className="font-calligraphy text-lg">复制房间号</span>
                  </>
                )}
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mb-8 waiting-footer"
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-vermilion border-t-transparent rounded-full"
                />
                <span className="font-serif-sc text-wood-dark/80 text-lg">
                  等待对手加入...
                </span>
              </div>
              <div className="flex justify-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-vermilion/40"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl transition-all"
              style={{
                background: 'linear-gradient(145deg, #654321, #3d2817)',
                color: '#FFFFF0',
                border: '2px solid #3d2817',
              }}
            >
              <X size={20} />
              <span className="font-calligraphy text-lg">取消等待</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
