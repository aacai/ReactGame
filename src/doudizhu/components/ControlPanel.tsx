import { motion } from 'framer-motion';
import { Volume2, VolumeX, Bot, HelpCircle, ArrowLeft, Lightbulb, Timer, TimerOff, Undo2, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface ControlPanelProps {
  onHint?: () => void;
  onToggleAutoPlay?: () => void;
  onToggleSound?: () => void;
  onToggleCountdown?: () => void;
  onShowRules?: () => void;
  onBack?: () => void;
  onUndo?: () => void;
  onToggleDebugReveal?: () => void;
  onReloadModel?: () => void;
  algorithmState?: 'idle' | 'loading' | 'ready' | 'error';
  soundEnabled?: boolean;
  isAutoPlay?: boolean;
  countdown?: number;
  countdownEnabled?: boolean;
  showCountdown?: boolean;
  undoDisabled?: boolean;
  undoWaiting?: boolean;
  debugRevealOpponents?: boolean;
}

export function ControlPanel({
  onHint,
  onToggleAutoPlay,
  onToggleSound,
  onToggleCountdown,
  onShowRules,
  onBack,
  onUndo,
  onToggleDebugReveal,
  onReloadModel,
  algorithmState,
  soundEnabled = true,
  isAutoPlay = false,
  countdown,
  countdownEnabled = false,
  showCountdown = false,
  undoDisabled = false,
  undoWaiting = false,
  debugRevealOpponents = false,
}: ControlPanelProps) {
  return (
    <div className="flex items-center gap-2">
      {onBack && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </motion.button>
      )}

      {showCountdown && countdown !== undefined && (
        <motion.div
          animate={countdown <= 5 ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: countdown <= 5 ? Infinity : 0 }}
          className={`
            px-3 py-1 rounded-full font-bold text-sm
            ${countdown <= 5 ? 'bg-red-500 text-white' : 'bg-black/30 text-white'}
          `}
        >
          {countdown}s
        </motion.div>
      )}

      {onHint && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onHint}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
        >
          <Lightbulb size={20} />
        </motion.button>
      )}

      {onToggleAutoPlay && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleAutoPlay}
          className={`
            p-2 rounded-full transition-colors
            ${isAutoPlay 
              ? 'bg-yellow-500 text-yellow-900' 
              : 'bg-black/30 hover:bg-black/50 text-white'
            }
          `}
        >
          <Bot size={20} />
        </motion.button>
      )}

      {onToggleDebugReveal && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleDebugReveal}
          className={`
            p-2 rounded-full transition-colors
            ${debugRevealOpponents 
              ? 'bg-purple-500 text-white' 
              : 'bg-black/30 hover:bg-black/50 text-white'
            }
          `}
          title={debugRevealOpponents ? '隐藏对手牌' : '显示对手牌（调试）'}
        >
          {debugRevealOpponents ? <EyeOff size={20} /> : <Eye size={20} />}
        </motion.button>
      )}

      {onToggleCountdown && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleCountdown}
          className={`
            p-2 rounded-full transition-colors
            ${countdownEnabled 
              ? 'bg-blue-500 text-white' 
              : 'bg-black/30 hover:bg-black/50 text-white'
            }
          `}
        >
          {countdownEnabled ? <Timer size={20} /> : <TimerOff size={20} />}
        </motion.button>
      )}

      {onToggleSound && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleSound}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </motion.button>
      )}

      {algorithmState && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-black/40 border border-white/15"
          title="当前 AI 算法（仅人机模式）"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              algorithmState === 'ready'
                ? 'bg-green-400'
                : algorithmState === 'loading'
                ? 'bg-blue-400 animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-white/90">
            {algorithmState === 'ready' ? 'DouZero' : algorithmState === 'loading' ? '加载中' : '启发式'}
          </span>
        </div>
      )}

      {onReloadModel && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onReloadModel}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
          title="重新加载 DouZero 模型"
        >
          <RefreshCw size={18} />
        </motion.button>
      )}

      {onShowRules && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onShowRules}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
        >
          <HelpCircle size={20} />
        </motion.button>
      )}

      {onUndo && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onUndo}
          disabled={undoDisabled || undoWaiting}
          className={`
            p-2 rounded-full transition-colors
            ${undoWaiting
              ? 'bg-yellow-500/50 text-yellow-900 cursor-not-allowed'
              : 'bg-black/30 hover:bg-black/50 text-white'
            }
            ${undoDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          title={undoWaiting ? '等待对方同意...' : '请求悔棋'}
        >
          <Undo2 size={20} />
        </motion.button>
      )}
    </div>
  );
}
