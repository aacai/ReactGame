import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Swords, Play, HelpCircle, Zap, Target, Users, UserPlus } from 'lucide-react';
import { GameScreen } from './components/GameScreen';
import { OnlineWaiting } from './components/OnlineWaiting';
import { RulesModal } from './components/RulesModal';
import { useGameStore } from './store/gameStore';
import type { Difficulty } from './game/types';

interface DoudizhuAppProps {
  onBack: () => void;
}

type MenuScreen = 'main' | 'online_create' | 'online_join';

export function DoudizhuApp({ onBack }: DoudizhuAppProps) {
  const [showRules, setShowRules] = useState(false);
  const [menuScreen, setMenuScreen] = useState<MenuScreen>('main');
  const [playerName, setPlayerName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const { startPvEGame, gamePhase, onlineStatus, createOnlineRoom, joinOnlineRoom, showToast } = useGameStore();
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');

  const handleStartGame = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    startPvEGame(difficulty);
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      showToast('请输入玩家昵称');
      return;
    }
    try {
      await createOnlineRoom(playerName.trim());
    } catch (err) {
      console.error('创建房间失败:', err);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      showToast('请输入玩家昵称');
      return;
    }
    if (!joinRoomId.trim() || joinRoomId.length !== 6) {
      showToast('请输入6位房间号');
      return;
    }
    try {
      await joinOnlineRoom(joinRoomId.trim(), playerName.trim());
    } catch (err) {
      console.error('加入房间失败:', err);
    }
  };

  const isInGame = gamePhase !== 'waiting';
  const isInRoom = onlineStatus === 'in_room' && !isInGame;

  return (
    <div className="min-h-screen w-full">
      <div className="fixed inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1a3e] to-[#24243e]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.25)_0%,_transparent_55%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(236,72,153,0.18)_0%,_transparent_55%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.12)_0%,_transparent_70%)]" />
      <div className="fixed inset-0 opacity-40" style={{
        backgroundImage: `
          radial-gradient(circle at 15% 25%, rgba(167,139,250,0.18) 0%, transparent 35%),
          radial-gradient(circle at 85% 75%, rgba(244,114,182,0.15) 0%, transparent 35%),
          radial-gradient(circle at 50% 50%, rgba(96,165,250,0.08) 0%, transparent 60%)
        `
      }} />
      <div className="fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
      }} />
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {isInGame ? (
            <GameScreen key="game" onBack={onBack} />
          ) : isInRoom ? (
            <OnlineWaiting key="waiting" onBack={onBack} />
          ) : menuScreen === 'main' ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen relative flex items-center justify-center p-4 md:p-8"
          >
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_0%,_transparent_70%)]" />
            </div>

            <div className="relative z-10 w-full max-w-md mx-auto md:max-w-5xl">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-4 mb-6 md:mb-8"
              >
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onBack}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft size={20} />
                  <span>返回</span>
                </motion.button>
              </motion.div>

              <div className="flex flex-col md:flex-row md:items-center md:gap-12">
                <motion.div
                  initial={{ opacity: 0, y: -30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="text-center mb-8 md:mb-0 md:flex-1 md:max-w-sm"
                >
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-full mx-auto mb-4 md:mb-6 flex items-center justify-center bg-yellow-500/20">
                    <Swords size={40} className="text-yellow-400 md:hidden" />
                    <Swords size={56} className="text-yellow-400 hidden md:block" />
                  </div>
                  <h1
                    className="text-4xl md:text-6xl font-bold text-white mb-2 md:mb-4"
                    style={{
                      textShadow: '0 4px 12px rgba(0,0,0,0.6), 0 0 60px rgba(234, 179, 8, 0.4)',
                    }}
                  >
                    斗地主
                  </h1>
                  <p className="text-white/70 text-base md:text-lg tracking-[0.3em]">
                    三人对战 · 斗智斗勇
                  </p>
                  <div className="mt-4 md:mt-5 flex justify-center gap-2">
                    <div className="w-12 md:w-16 h-0.5 bg-gradient-to-r from-transparent to-yellow-400" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <div className="w-12 md:w-16 h-0.5 bg-gradient-to-l from-transparent to-yellow-400" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-4 md:flex-1 md:max-w-lg"
                >
                  <div className="bg-black/30 backdrop-blur-sm p-5 md:p-6 rounded-2xl">
                    <h3 className="text-white font-bold text-lg mb-4 text-center">人机对战</h3>
                    
                    <div className="grid grid-cols-3 gap-3 mb-5 md:mb-6">
                      {[
                        { value: 'easy' as Difficulty, label: '简单', icon: Zap, color: 'from-green-500 to-green-700' },
                        { value: 'medium' as Difficulty, label: '中等', icon: Target, color: 'from-yellow-500 to-yellow-700' },
                        { value: 'hard' as Difficulty, label: '困难', icon: Swords, color: 'from-red-500 to-red-700' },
                      ].map((diff, index) => (
                        <motion.button
                          key={diff.value}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStartGame(diff.value)}
                          className={`
                            relative p-3 md:p-4 rounded-xl
                            bg-gradient-to-b ${diff.color}
                            text-white font-bold
                            shadow-lg
                            flex flex-col items-center gap-1 md:gap-2
                          `}
                        >
                          <diff.icon size={24} />
                          <span className="text-sm">{diff.label}</span>
                        </motion.button>
                      ))}
                    </div>

                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStartGame('medium')}
                      className="w-full py-3 md:py-4 px-6 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-900 font-bold text-base md:text-lg flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Play size={22} />
                      快速开始
                    </motion.button>
                  </div>

                  <div className="bg-black/30 backdrop-blur-sm p-5 md:p-6 rounded-2xl">
                    <h3 className="text-white font-bold text-lg mb-4 text-center">在线对战</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setMenuScreen('online_create')}
                        className="p-3 md:p-4 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-bold shadow-lg flex flex-col items-center gap-1 md:gap-2"
                      >
                        <Users size={24} />
                        <span className="text-sm">创建房间</span>
                      </motion.button>

                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.85 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setMenuScreen('online_join')}
                        className="p-3 md:p-4 rounded-xl bg-gradient-to-b from-purple-500 to-purple-700 text-white font-bold shadow-lg flex flex-col items-center gap-1 md:gap-2"
                      >
                        <UserPlus size={24} />
                        <span className="text-sm">加入房间</span>
                      </motion.button>
                    </div>
                  </div>

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowRules(true)}
                    className="w-full py-3 px-6 rounded-xl bg-black/30 text-white font-medium flex items-center justify-center gap-2 hover:bg-black/40 transition-colors"
                  >
                    <HelpCircle size={20} />
                    游戏规则
                  </motion.button>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-center mt-6 md:mt-10"
              >
                <p className="text-white/40 text-sm">~ 斗地主 · 欢乐无限 ~</p>
              </motion.div>
            </div>
          </motion.div>
        ) : menuScreen === 'online_create' ? (
          <motion.div
            key="create"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen relative flex items-center justify-center py-8 px-4"
          >
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_0%,_transparent_70%)]" />
            </div>

            <div className="relative z-10 w-full max-w-md mx-auto">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 mb-8"
              >
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setMenuScreen('main')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft size={20} />
                  <span>返回</span>
                </motion.button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-blue-500/20">
                  <Users size={40} className="text-blue-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">创建房间</h2>
                <p className="text-white/60">创建一个新房间，邀请好友一起玩</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-black/30 backdrop-blur-sm rounded-2xl p-6"
              >
                <div className="mb-6">
                  <label className="block text-white/80 text-sm mb-2">玩家昵称</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="请输入你的昵称"
                    maxLength={10}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateRoom}
                  disabled={onlineStatus === 'connecting'}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {onlineStatus === 'connecting' ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Users size={24} /> 创建房间</>
                  )}
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="join"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen relative flex items-center justify-center py-8 px-4"
          >
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_0%,_transparent_70%)]" />
            </div>

            <div className="relative z-10 w-full max-w-md mx-auto">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 mb-8"
              >
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setMenuScreen('main')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft size={20} />
                  <span>返回</span>
                </motion.button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-purple-500/20">
                  <UserPlus size={40} className="text-purple-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">加入房间</h2>
                <p className="text-white/60">输入房间号加入好友的游戏</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-black/30 backdrop-blur-sm rounded-2xl p-6"
              >
                <div className="mb-4">
                  <label className="block text-white/80 text-sm mb-2">玩家昵称</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="请输入你的昵称"
                    maxLength={10}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-white/80 text-sm mb-2">房间号</label>
                  <input
                    type="text"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="请输入6位房间号"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 transition-colors text-center text-2xl tracking-[0.5em] font-mono"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoinRoom}
                  disabled={onlineStatus === 'connecting'}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {onlineStatus === 'connecting' ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><UserPlus size={24} /> 加入房间</>
                  )}
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </div>
    </div>
  );
}
