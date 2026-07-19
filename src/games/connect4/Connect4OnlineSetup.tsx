// 四子棋联机房间创建/加入界面
// - 顶部返回按钮
// - 两个大按钮：创建房间 / 加入房间
// - 创建房间：生成 6 位房间号，显示等待界面
// - 加入房间：输入 6 位房间号，连接

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, LogIn, X, Wifi, Copy, Check, Users } from 'lucide-react';
import { useConnect4Store } from './store';
import { room } from './room';

interface Connect4OnlineSetupProps {
  onBack: () => void;
  onGameStart: () => void;
}

export function Connect4OnlineSetup({ onBack, onGameStart }: Connect4OnlineSetupProps) {
  const startOnlineGame = useConnect4Store((s) => s.startOnlineGame);

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 标记游戏是否已开始：用于区分卸载时是否需要清理房间
  const gameStartedRef = useRef(false);

  // 组件卸载时若游戏未开始，清理房间资源
  useEffect(() => {
    return () => {
      if (!gameStartedRef.current && room.roomCode) {
        room.onOpponentJoin = null;
        room.onOpponentLeave = null;
        room.leaveRoom();
      }
    };
  }, []);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setErrorMsg(null);
    try {
      const code = await room.createRoom('玩家');
      setRoomCode(code);
      // 等待对手加入：room 在 handleJoin 时触发 onOpponentJoin
      room.onOpponentJoin = () => {
        if (!room.opponentName || !room.myColor) return;
        gameStartedRef.current = true;
        startOnlineGame(code, '玩家', room.opponentName, room.myColor);
        onGameStart();
      };
    } catch (error) {
      console.error('创建房间失败:', error);
      setErrorMsg('创建房间失败，请重试');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinInput || joinInput.length !== 6) {
      setErrorMsg('请输入6位房间号');
      return;
    }
    setIsJoining(true);
    setErrorMsg(null);
    try {
      const result = await room.joinRoom(joinInput, '玩家');
      gameStartedRef.current = true;
      startOnlineGame(joinInput, '玩家', result.opponentName, result.color);
      onGameStart();
    } catch (error) {
      console.error('加入房间失败:', error);
      setErrorMsg('房间不存在或已解散');
      setIsJoining(false);
    }
  };

  const handleRoomIdChange = (value: string) => {
    // 仅保留数字，最多 6 位
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setJoinInput(cleaned);
  };

  const handleCopyCode = () => {
    if (roomCode && navigator.clipboard) {
      navigator.clipboard.writeText(roomCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleCancelCreate = () => {
    room.onOpponentJoin = null;
    room.onOpponentLeave = null;
    room.leaveRoom();
    setRoomCode(null);
    setIsCreating(false);
  };

  // 等待对手界面
  if (isCreating && roomCode) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen flex flex-col"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-ivory/10">
          <button
            onClick={handleCancelCreate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-serif-sc text-sm">取消</span>
          </button>
          <h1 className="font-calligraphy text-2xl text-ivory game-title">等待对手</h1>
          <div className="w-16" />
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="wood-panel p-8 max-w-sm w-full text-center"
          >
            <div className="relative z-10">
              {/* 等待动画 */}
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 rounded-full border-4 border-vermilion/30 border-t-vermilion flex items-center justify-center"
                >
                  <Users size={28} className="text-vermilion" />
                </motion.div>
              </div>

              <h3 className="font-calligraphy text-2xl text-wood-dark mb-2">
                等待对手加入
              </h3>
              <p className="font-serif-sc text-wood-dark/70 text-sm mb-6">
                将下方房间号分享给好友
              </p>

              {/* 房间号展示 */}
              <div className="mb-6">
                <div className="font-serif-sc text-wood-dark/60 text-xs mb-2">
                  房间号
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div
                    className="font-mono text-5xl tracking-[0.3em] py-3 px-6 rounded-xl"
                    style={{
                      background: 'linear-gradient(145deg, #1a1a1a, #2d2d2d)',
                      color: '#DEB887',
                      border: '3px solid #8B4513',
                    }}
                  >
                    {roomCode}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-vermilion/20 text-vermilion hover:bg-vermilion/30 transition-colors"
                    title="复制房间号"
                  >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
                {copied && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-serif-sc text-vermilion text-xs mt-2"
                  >
                    已复制到剪贴板
                  </motion.div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCancelCreate}
                className="w-full seal-btn seal-btn-secondary py-3"
              >
                取消等待
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // 创建/加入选择界面
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col"
    >
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-ivory/10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-serif-sc text-sm">返回</span>
        </button>
        <h1 className="font-calligraphy text-2xl text-ivory game-title">联机对战</h1>
        <div className="w-16" />
      </header>

      {/* 内容区 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="wood-panel p-6 rounded-2xl"
          >
            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-vermilion/20 flex items-center justify-center">
                  <Wifi size={40} className="text-vermilion" />
                </div>
              </div>

              <h3 className="font-calligraphy text-3xl text-wood-dark text-center mb-2">
                四子棋联机
              </h3>
              <p className="font-serif-sc text-wood-dark/70 text-center mb-6">
                与好友在线对弈，先连四子者胜
              </p>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateRoom}
                  disabled={isCreating || isJoining}
                  className="w-full seal-btn text-xl py-4 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Plus size={24} />
                  <span>创建房间</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowJoinModal(true)}
                  disabled={isCreating || isJoining}
                  className="w-full seal-btn seal-btn-secondary text-xl py-4 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <LogIn size={24} />
                  <span>加入房间</span>
                </motion.button>
              </div>

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center font-serif-sc text-red-600 text-sm"
                >
                  {errorMsg}
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* 使用说明 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="wood-panel p-5 rounded-2xl"
          >
            <div className="relative z-10">
              <h4 className="font-calligraphy text-xl text-wood-dark mb-3 text-center">
                使用说明
              </h4>
              <ul className="font-serif-sc text-wood-dark/70 text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-vermilion font-bold">•</span>
                  <span>创建房间后，将 6 位房间号分享给好友</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-vermilion font-bold">•</span>
                  <span>好友输入房间号即可加入对局</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-vermilion font-bold">•</span>
                  <span>房主执红棋先行，加入者执黄棋</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-vermilion font-bold">•</span>
                  <span>请保持网络连接稳定</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 加入房间弹窗 */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isJoining && setShowJoinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="wood-panel p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-calligraphy text-2xl text-wood-dark">
                    加入房间
                  </h3>
                  <button
                    onClick={() => !isJoining && setShowJoinModal(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-wood-dark/60 hover:text-wood-dark hover:bg-wood-dark/10 transition-colors"
                    disabled={isJoining}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block font-serif-sc text-wood-dark/80 text-sm mb-2">
                    请输入 6 位房间号
                  </label>
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => handleRoomIdChange(e.target.value)}
                    placeholder="------"
                    maxLength={6}
                    disabled={isJoining}
                    autoFocus
                    className="w-full text-center font-mono text-4xl tracking-[0.3em] py-4 px-4 rounded-xl outline-none transition-all"
                    style={{
                      background: 'linear-gradient(145deg, #1a1a1a, #2d2d2d)',
                      color: '#DEB887',
                      border: '3px solid #8B4513',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                {errorMsg && (
                  <div className="mb-4 text-center font-serif-sc text-red-600 text-sm">
                    {errorMsg}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowJoinModal(false)}
                    disabled={isJoining}
                    className="flex-1 seal-btn seal-btn-secondary py-3 disabled:opacity-50"
                  >
                    取消
                  </button>
                  <motion.button
                    whileHover={{ scale: isJoining ? 1 : 1.03 }}
                    whileTap={{ scale: isJoining ? 1 : 0.97 }}
                    onClick={handleJoinRoom}
                    disabled={isJoining || joinInput.length !== 6}
                    className="flex-1 seal-btn py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isJoining ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>加入中...</span>
                      </>
                    ) : (
                      <span>加入</span>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
