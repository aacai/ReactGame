import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Users, Crown, LogOut, Play, UserPlus } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { roomManager } from '../game/room';

interface OnlineWaitingProps {
  onBack: () => void;
}

export function OnlineWaiting({ onBack }: OnlineWaitingProps) {
  const {
    roomId,
    onlinePlayers,
    mySeatIndex,
    onlineStatus,
    changeSeat,
    leaveOnlineRoom,
    startOnlineGame,
    showToast,
  } = useGameStore();

  const [copied, setCopied] = useState(false);

  const handleCopyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      showToast('房间号已复制');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSeatClick = (seatIndex: number) => {
    const player = onlinePlayers.find(p => p.seatIndex === seatIndex);
    if (player) return;
    changeSeat(seatIndex);
  };

  const handleStartGame = () => {
    if (onlinePlayers.length < 2) {
      showToast('至少需要2名玩家才能开始游戏');
      return;
    }
    startOnlineGame();
  };

  const handleLeave = () => {
    leaveOnlineRoom();
    onBack();
  };

  const handleAddBot = () => {
    const seat = roomManager.addBot();
    if (seat === -1) showToast('座位已满，无法添加电脑');
  };

  const handleRemoveBot = (seatIndex: number) => {
    roomManager.removeBot(seatIndex);
  };

  const isHost = onlinePlayers.some(p => p.playerId === useGameStore.getState().onlinePlayers.find(op => op.isHost)?.playerId && p.isHost);
  const hostPlayer = onlinePlayers.find(p => p.isHost);
  const myPlayer = onlinePlayers.find(p => p.seatIndex === mySeatIndex);
  const amIHost = myPlayer?.isHost ?? false;

  const seats = [0, 1, 2].map(seatIndex => {
    const player = onlinePlayers.find(p => p.seatIndex === seatIndex);
    return { seatIndex, player };
  });

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-green-800 to-green-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_0%,_transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">斗地主 · 在线对战</h1>
          <p className="text-white/60">等待玩家加入...</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-yellow-400" />
              <span className="text-white font-medium">房间号</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-bold text-xl tracking-wider">{roomId}</span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCopyRoomId}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <Copy size={18} />
              </motion.button>
            </div>
          </div>

          {copied && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-green-400 text-sm text-center mb-4"
            >
              已复制到剪贴板
            </motion.div>
          )}

          <div className="space-y-3">
            {seats.map(({ seatIndex, player }) => (
              <motion.div
                key={seatIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + seatIndex * 0.1 }}
                onClick={() => !player && handleSeatClick(seatIndex)}
                className={`
                  flex items-center justify-between p-4 rounded-xl
                  transition-all duration-200
                  ${player
                    ? 'bg-white/10'
                    : 'bg-white/5 border-2 border-dashed border-white/20 cursor-pointer hover:border-yellow-400/50 hover:bg-white/10'
                  }
                  ${mySeatIndex === seatIndex ? 'ring-2 ring-yellow-400' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${player ? 'bg-yellow-500/20' : 'bg-white/10'}
                  `}>
                    {player ? (
                      <UserPlus size={20} className="text-yellow-400" />
                    ) : (
                      <UserPlus size={20} className="text-white/30" />
                    )}
                  </div>
                  <div>
                    <div className={`font-medium ${player ? 'text-white' : 'text-white/40'}`}>
                      {player ? player.playerName : '空座'}
                    </div>
                    <div className="text-xs text-white/50">
                      {player ? `座位 ${seatIndex + 1}` : '点击加入'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {player?.isBot && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium">
                      电脑
                    </div>
                  )}
                  {player?.isHost && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                      <Crown size={14} />
                      房主
                    </div>
                  )}
                  {mySeatIndex === seatIndex && player && (
                    <div className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                      我
                    </div>
                  )}
                  {amIHost && player?.isBot && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); handleRemoveBot(seatIndex); }}
                      className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300"
                      title="移除电脑"
                    >
                      <LogOut size={14} />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 text-center text-white/50 text-sm">
            在线玩家: {onlinePlayers.length} / 3
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          {amIHost && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartGame}
              disabled={onlinePlayers.length < 2}
              className={`
                w-full py-4 px-6 rounded-xl font-bold text-lg
                flex items-center justify-center gap-2 shadow-lg
                transition-all duration-200
                ${onlinePlayers.length >= 2
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-900 hover:from-yellow-400 hover:to-yellow-500'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <Play size={24} />
              开始游戏
            </motion.button>
          )}

          {amIHost && onlinePlayers.length < 3 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddBot}
              className="w-full py-3 px-6 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-100 font-medium
                flex items-center justify-center gap-2 transition-colors"
            >
              <UserPlus size={20} />
              添加电脑玩家（填充空座）
            </motion.button>
          )}

          {!amIHost && (
            <div className="w-full py-4 px-6 rounded-xl bg-black/30 text-white/60 text-center font-medium">
              等待房主开始游戏...
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLeave}
            className="w-full py-3 px-6 rounded-xl bg-black/30 text-white font-medium
              flex items-center justify-center gap-2 hover:bg-black/40 transition-colors"
          >
            <LogOut size={20} />
            离开房间
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center"
        >
          <p className="text-white/40 text-sm">
            {onlineStatus === 'connecting' ? '连接中...' : '已连接'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
