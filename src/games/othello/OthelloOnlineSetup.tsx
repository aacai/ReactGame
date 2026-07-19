// 黑白棋联机房间创建/加入界面
// - 顶部返回按钮
// - 两个大按钮：创建房间 / 加入房间
// - 创建房间：生成 6 位房间号，显示等待界面
// - 加入房间：输入 6 位房间号，连接
// - 复用 othelloRoom（基于 mqtt.ts）

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Copy, Users, LogOut, Play, Hash } from 'lucide-react';
import { othelloRoom } from './room';
import { useOthelloStore } from './store';
import type { Player } from './rules';

type SetupView = 'select' | 'waiting' | 'join';

// 生成默认玩家名
function defaultPlayerName(): string {
  return `玩家${Math.floor(Math.random() * 900 + 100)}`;
}

export function OthelloOnlineSetup({
  onBack,
  onGameStart,
}: {
  onBack: () => void;
  onGameStart: () => void;
}) {
  const [view, setView] = useState<SetupView>('select');
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinInput, setJoinInput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [connecting, setConnecting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [opponentJoined, setOpponentJoined] = useState<boolean>(false);

  const startOnlineGame = useOthelloStore((s) => s.startOnlineGame);
  const playerNameRef = useState(defaultPlayerName())[0];

  // 组件卸载时若仍在等待/连接中，清理房间
  useEffect(() => {
    return () => {
      // 仅当未进入游戏时清理（进入游戏后房间由 leaveOnlineGame 管理）
      if (!opponentJoined) {
        // 不调 leaveRoom，避免影响已进入游戏的连接
      }
    };
  }, [opponentJoined]);

  // 创建房间
  const handleCreate = async () => {
    setError('');
    setConnecting(true);
    try {
      const code = await othelloRoom.createRoom(playerNameRef);
      setRoomCode(code);
      // 注册消息回调：等待对手加入
      othelloRoom.onMessage((msg) => {
        if (msg.type === 'join') {
          // 对手已加入（room 内部已记录 opponentName 并回发 join_ack）
          const opponentName = othelloRoom.opponentName || '对手';
          const playerColor: Player = 1; // 创建者执黑
          setOpponentJoined(true);
          startOnlineGame(code, playerNameRef, opponentName, playerColor);
          onGameStart();
        }
      });
      setView('waiting');
    } catch (e) {
      setError('创建房间失败，请重试');
    } finally {
      setConnecting(false);
    }
  };

  // 加入房间
  const handleJoin = async () => {
    setError('');
    if (joinInput.length !== 6) {
      setError('请输入 6 位房间号');
      return;
    }
    setConnecting(true);
    try {
      await othelloRoom.joinRoom(joinInput, playerNameRef);
      // joinRoom 成功说明收到 join_ack，对手信息已就绪
      const opponentName = othelloRoom.opponentName || '房主';
      const playerColor: Player = 2; // 加入者执白
      setOpponentJoined(true);
      startOnlineGame(joinInput, playerNameRef, opponentName, playerColor);
      onGameStart();
    } catch (e) {
      setError('房间不存在或已解散');
    } finally {
      setConnecting(false);
    }
  };

  // 离开房间（等待状态下）
  const handleLeaveWaiting = () => {
    othelloRoom.leaveRoom();
    setRoomCode('');
    setView('select');
  };

  // 复制房间号
  const handleCopy = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

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
        <div className="text-center flex-1">
          <h1 className="font-calligraphy text-2xl text-ivory game-title">黑白棋·联机</h1>
        </div>
        <div className="w-16" />
      </header>

      {/* 主体 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {/* 选择界面 */}
            {view === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-vermilion/20 mb-4">
                    <Users size={40} className="text-vermilion" />
                  </div>
                  <h2 className="font-calligraphy text-3xl text-ivory mb-2">联机对战</h2>
                  <p className="font-serif-sc text-ivory/50 text-sm">
                    创建房间邀请好友，或输入房间号加入
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreate}
                  disabled={connecting}
                  className="seal-btn w-full py-5 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Play size={22} />
                  <span className="font-serif-sc text-lg">创建房间</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setError('');
                    setView('join');
                  }}
                  disabled={connecting}
                  className="seal-btn seal-btn-secondary w-full py-5 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Hash size={22} />
                  <span className="font-serif-sc text-lg">加入房间</span>
                </motion.button>

                {error && (
                  <div className="text-center text-red-400 text-sm font-serif-sc">
                    {error}
                  </div>
                )}

                <div className="text-center mt-6 font-serif-sc text-ivory/30 text-xs">
                  你是：{playerNameRef}
                </div>
              </motion.div>
            )}

            {/* 等待对手加入 */}
            {view === 'waiting' && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-vermilion/20 mb-4"
                  >
                    <div className="w-6 h-6 rounded-full bg-vermilion animate-pulse" />
                  </motion.div>
                  <h2 className="font-calligraphy text-2xl text-ivory mb-2">等待对手加入</h2>
                  <p className="font-serif-sc text-ivory/50 text-sm">
                    将房间号分享给好友
                  </p>
                </div>

                {/* 房间号展示 */}
                <div className="wood-panel p-6 text-center">
                  <div className="font-serif-sc text-ivory/60 text-sm mb-3">房间号</div>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <span className="font-calligraphy text-5xl text-ivory tracking-widest">
                      {roomCode}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCopy}
                      className="p-2 rounded-lg bg-ivory/10 hover:bg-ivory/20 text-ivory transition-colors"
                    >
                      <Copy size={20} />
                    </motion.button>
                  </div>
                  <AnimatePresence>
                    {copied && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-green-400 text-sm font-serif-sc"
                      >
                        已复制到剪贴板
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 房间信息 */}
                <div className="text-center font-serif-sc text-ivory/40 text-sm space-y-1">
                  <div>玩家：{playerNameRef}（黑方）</div>
                  <div>等待白方加入...</div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLeaveWaiting}
                  className="w-full py-3 rounded-lg bg-ivory/10 hover:bg-ivory/15 text-ivory/80 font-serif-sc flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut size={18} />
                  <span>离开房间</span>
                </motion.button>
              </motion.div>
            )}

            {/* 加入房间 */}
            {view === 'join' && (
              <motion.div
                key="join"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-vermilion/20 mb-4">
                    <Hash size={40} className="text-vermilion" />
                  </div>
                  <h2 className="font-calligraphy text-3xl text-ivory mb-2">加入房间</h2>
                  <p className="font-serif-sc text-ivory/50 text-sm">
                    输入好友分享的 6 位房间号
                  </p>
                </div>

                <div className="wood-panel p-6">
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setJoinInput(v);
                      setError('');
                    }}
                    placeholder="输入 6 位房间号"
                    maxLength={6}
                    autoFocus
                    className="w-full text-center font-calligraphy text-4xl text-ivory bg-transparent outline-none tracking-widest placeholder:text-ivory/20 placeholder:text-2xl placeholder:font-serif-sc"
                  />
                </div>

                {error && (
                  <div className="text-center text-red-400 text-sm font-serif-sc">
                    {error}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: joinInput.length === 6 && !connecting ? 1.02 : 1 }}
                  whileTap={{ scale: joinInput.length === 6 && !connecting ? 0.98 : 1 }}
                  onClick={handleJoin}
                  disabled={joinInput.length !== 6 || connecting}
                  className="seal-btn w-full py-5 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play size={22} />
                  <span className="font-serif-sc text-lg">
                    {connecting ? '连接中...' : '加入对战'}
                  </span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setError('');
                    setJoinInput('');
                    setView('select');
                  }}
                  className="w-full py-3 rounded-lg bg-ivory/10 hover:bg-ivory/15 text-ivory/80 font-serif-sc flex items-center justify-center gap-2 transition-colors"
                >
                  <ChevronLeft size={18} />
                  <span>返回</span>
                </motion.button>

                <div className="text-center font-serif-sc text-ivory/30 text-xs">
                  你是：{playerNameRef}（白方）
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
