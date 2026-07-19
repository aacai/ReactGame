import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Wifi,
  Eye,
  Settings,
  BookOpen,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Volume2,
  VolumeX,
  Gauge,
  Plus,
  LogIn,
  X,
  Swords,
  Puzzle,
  Grid3x3,
  Crown,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { RulesModal } from './RulesModal';
import { ENDGAMES } from '../game/endgames';
import { GomokuGame } from '../games/gomoku/GomokuGame';
import type { Difficulty, AutoPlaySpeed, Screen } from '../store/gameStore';
import type { PieceColor } from '../game/types';

const pageVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 50 : -50,
  }),
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -50 : 50,
  }),
};

const pageTransition = {
  duration: 0.35,
};

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  delay: number;
  variant?: 'primary' | 'secondary';
}

function MenuItem({ icon, title, description, onClick, delay, variant = 'primary' }: MenuItemProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', damping: 20, stiffness: 100 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl transition-all duration-300 wood-panel menu-item ${
        variant === 'primary' ? '' : 'opacity-90'
      }`}
    >
      <div className="relative z-10 flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 menu-item-icon ${
            variant === 'primary'
              ? 'bg-vermilion text-ivory shadow-lg shadow-vermilion/30'
              : 'bg-wood-dark/20 text-wood-dark'
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-calligraphy text-2xl text-wood-dark menu-item-title">{title}</h3>
          <p className="font-serif-sc text-wood-dark/70 text-sm mt-0.5 menu-item-desc">{description}</p>
        </div>
        <ChevronRight size={24} className="text-wood-dark/40 flex-shrink-0" />
      </div>
    </motion.button>
  );
}

interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

function BackButton({ onClick, label = '返回' }: BackButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-ivory/80 hover:text-ivory hover:bg-ivory/10 transition-colors"
    >
      <ChevronLeft size={20} />
      <span className="font-serif-sc">{label}</span>
    </motion.button>
  );
}

interface PageHeaderProps {
  title: string;
  onBack: () => void;
}

function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex items-center gap-4 mb-8"
    >
      <BackButton onClick={onBack} />
      <h2 className="font-calligraphy text-4xl text-ivory flex-1 text-center pr-16">{title}</h2>
    </motion.div>
  );
}

interface DifficultyCardProps {
  level: Difficulty;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
  delay: number;
}

function DifficultyCard({ level, title, description, isSelected, onClick, delay }: DifficultyCardProps) {
  const colors = {
    easy: { bg: 'from-emerald-600 to-emerald-800', ring: 'ring-emerald-400', shadow: 'shadow-emerald-500/40' },
    medium: { bg: 'from-amber-600 to-amber-800', ring: 'ring-amber-400', shadow: 'shadow-amber-500/40' },
    hard: { bg: 'from-rose-700 to-rose-900', ring: 'ring-rose-400', shadow: 'shadow-rose-500/40' },
  };

  const color = colors[level];

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', damping: 20, stiffness: 100 }}
      whileHover={{ scale: isSelected ? 1 : 1.03, y: isSelected ? 0 : -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative w-full p-5 rounded-2xl text-left transition-all duration-300 ${
        isSelected ? `ring-4 ${color.ring} shadow-2xl ${color.shadow}` : 'hover:shadow-xl'
      }`}
      style={{
        background: isSelected
          ? `linear-gradient(145deg, ${
              level === 'easy' ? '#059669, #065f46' : level === 'medium' ? '#d97706, #92400e' : '#be123c, #881337'
            })`
          : 'linear-gradient(145deg, rgba(222, 184, 135, 0.95), rgba(196, 149, 106, 0.95))',
        border: isSelected ? 'none' : '2px solid #8B4513',
      }}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center font-calligraphy text-3xl mb-3 ${
            isSelected ? 'bg-ivory/20 text-ivory' : 'bg-wood-dark/20 text-wood-dark'
          }`}
        >
          {level === 'easy' ? '初' : level === 'medium' ? '中' : '高'}
        </div>
        <h4 className={`font-calligraphy text-2xl mb-1 ${isSelected ? 'text-ivory' : 'text-wood-dark'}`}>
          {title}
        </h4>
        <p className={`font-serif-sc text-sm ${isSelected ? 'text-ivory/80' : 'text-wood-dark/60'}`}>
          {description}
        </p>
      </div>
      {isSelected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-3 right-3"
        >
          <div className="w-7 h-7 rounded-full bg-ivory flex items-center justify-center shadow-lg">
            <Sparkles size={16} className={level === 'easy' ? 'text-emerald-600' : level === 'medium' ? 'text-amber-600' : 'text-rose-600'} />
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}

interface ColorSelectProps {
  selected: PieceColor;
  onChange: (color: PieceColor) => void;
}

function ColorSelect({ selected, onChange }: ColorSelectProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="wood-panel p-6 rounded-2xl"
    >
      <div className="relative z-10">
        <h4 className="font-calligraphy text-2xl text-wood-dark text-center mb-4">选择先手</h4>
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: selected === 'red' ? 1 : 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange('red')}
            className={`p-4 rounded-xl transition-all duration-300 ${
              selected === 'red'
                ? 'ring-4 ring-vermilion shadow-xl shadow-vermilion/30'
                : 'hover:shadow-lg'
            }`}
            style={{
              background:
                selected === 'red'
                  ? 'linear-gradient(145deg, #B22222, #8B0000)'
                  : 'linear-gradient(145deg, rgba(222, 184, 135, 0.9), rgba(196, 149, 106, 0.9))',
              border: selected === 'red' ? 'none' : '2px solid #8B4513',
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-calligraphy text-2xl mb-2"
                style={{
                  background:
                    selected === 'red'
                      ? 'rgba(255, 255, 240, 0.2)'
                      : 'radial-gradient(circle at 30% 30%, #FFFFF0, #E8D4A8)',
                  color: selected === 'red' ? '#FFFFF0' : '#B22222',
                  border: selected === 'red' ? '2px solid rgba(255,255,240,0.5)' : '2px solid rgba(178, 34, 34, 0.4)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                帅
              </div>
              <span className={`font-serif-sc font-semibold ${selected === 'red' ? 'text-ivory' : 'text-wood-dark'}`}>
                红方先手
              </span>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: selected === 'black' ? 1 : 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange('black')}
            className={`p-4 rounded-xl transition-all duration-300 ${
              selected === 'black'
                ? 'ring-4 ring-ink shadow-xl shadow-ink/30'
                : 'hover:shadow-lg'
            }`}
            style={{
              background:
                selected === 'black'
                  ? 'linear-gradient(145deg, #2d2d2d, #1a1a1a)'
                  : 'linear-gradient(145deg, rgba(222, 184, 135, 0.9), rgba(196, 149, 106, 0.9))',
              border: selected === 'black' ? 'none' : '2px solid #8B4513',
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-calligraphy text-2xl mb-2"
                style={{
                  background:
                    selected === 'black'
                      ? 'rgba(255, 255, 240, 0.15)'
                      : 'radial-gradient(circle at 30% 30%, #FFFFF0, #E8D4A8)',
                  color: selected === 'black' ? '#FFFFF0' : '#1a1a1a',
                  border: selected === 'black' ? '2px solid rgba(255,255,240,0.4)' : '2px solid rgba(26, 26, 26, 0.4)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                将
              </div>
              <span className={`font-serif-sc font-semibold ${selected === 'black' ? 'text-ivory' : 'text-wood-dark'}`}>
                黑方先手
              </span>
            </div>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

interface SpeedSelectProps {
  value: AutoPlaySpeed;
  onChange: (speed: AutoPlaySpeed) => void;
}

function SpeedSelect({ value, onChange }: SpeedSelectProps) {
  const speeds: { value: AutoPlaySpeed; label: string; description: string }[] = [
    { value: 'slow', label: '慢', description: '沉稳思考' },
    { value: 'normal', label: '中', description: '正常节奏' },
    { value: 'fast', label: '快', description: '闪电出招' },
  ];

  return (
    <div className="wood-panel p-5 rounded-2xl">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Gauge size={20} className="text-wood-dark" />
          <h4 className="font-calligraphy text-xl text-wood-dark">托管速度</h4>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {speeds.map((speed, index) => (
            <motion.button
              key={speed.value}
              whileHover={{ scale: value === speed.value ? 1 : 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(speed.value)}
              className={`p-3 rounded-xl transition-all duration-300 ${
                value === speed.value
                  ? 'bg-vermilion text-ivory shadow-lg shadow-vermilion/30'
                  : 'bg-wood-dark/10 text-wood-dark hover:bg-wood-dark/20'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="font-calligraphy text-xl mb-0.5">{speed.label}</div>
              <div className={`text-xs font-serif-sc ${value === speed.value ? 'text-ivory/80' : 'text-wood-dark/60'}`}>
                {speed.description}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface MainMenuPageProps {
  onNavigate: (screen: Screen) => void;
  onGoToDoudizhu: () => void;
  onGoToJanggi: () => void;
  onGoToChess: () => void;
  onGoToJunqi: () => void;
  onGoToWeiqi: () => void;
  onGoToShogi: () => void;
  onGoToOthello: () => void;
  onGoToConnect4: () => void;
  onGoToRoguelike: () => void;
}

function MainMenuPage({ onNavigate, onGoToDoudizhu, onGoToJanggi, onGoToChess, onGoToJunqi, onGoToWeiqi, onGoToShogi, onGoToOthello, onGoToConnect4, onGoToRoguelike }: MainMenuPageProps) {
  const { setGameMode, startGame, startWatchGame } = useGameStore();
  const [showRules, setShowRules] = useState(false);

  const menuCategories: {
    title: string;
    items: {
      icon: React.ReactNode;
      title: string;
      description: string;
      onClick: () => void;
      variant?: 'primary' | 'secondary';
    }[];
  }[] = [
    {
      title: '中国象棋',
      items: [
        { icon: <Crown size={24} />, title: '中国象棋', description: '人机、联机、观战、残局，畅玩中国象棋', onClick: () => onNavigate('xiangqi-modes') },
      ],
    },
    {
      title: '棋类博弈',
      items: [
        { icon: <Grid3x3 size={24} />, title: '五子棋', description: '五子连珠，简单易学', onClick: () => onNavigate('gomoku') },
        { icon: <Swords size={24} />, title: '韩国象棋', description: '朝鲜半岛象棋变种，宫线对角', onClick: onGoToJanggi },
        { icon: <Grid3x3 size={24} />, title: '国际象棋', description: '王后城堡，八格天下', onClick: onGoToChess },
        { icon: <Swords size={24} />, title: '军棋', description: '暗棋翻面，军衔较量', onClick: onGoToJunqi },
        { icon: <Grid3x3 size={24} />, title: '围棋', description: '黑白世界，千古绝弈', onClick: onGoToWeiqi },
        { icon: <Swords size={24} />, title: '日本将棋', description: '升变持驹，东瀛棋道', onClick: onGoToShogi },
        { icon: <Grid3x3 size={24} />, title: '黑白棋', description: '翻转棋子，角力争锋', onClick: onGoToOthello },
        { icon: <Grid3x3 size={24} />, title: '四子棋', description: '重力落子，四连即胜', onClick: onGoToConnect4 },
      ],
    },
    {
      title: '卡牌游戏',
      items: [
        { icon: <Swords size={24} />, title: '斗地主', description: '经典三人斗地主，欢乐对战', onClick: onGoToDoudizhu },
        { icon: <Swords size={24} />, title: 'Roguelike 卡牌', description: '暗黑冒险，卡组构建', onClick: onGoToRoguelike },
      ],
    },
    {
      title: '设置',
      items: [
        { icon: <Settings size={24} />, title: '游戏设置', description: '音效、速度等游戏选项', onClick: () => onNavigate('settings'), variant: 'secondary' },
        { icon: <BookOpen size={24} />, title: '规则说明', description: '象棋基本规则与棋子走法', onClick: () => setShowRules(true), variant: 'secondary' },
        { icon: <Info size={24} />, title: '关于游戏', description: '版本信息与开发者', onClick: () => onNavigate('about'), variant: 'secondary' },
      ],
    },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      custom={1}
      className="w-full max-w-md mx-auto menu-container"
    >
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-10"
      >
        <h1
          className="font-calligraphy text-6xl md:text-7xl text-ivory mb-4 menu-title"
          style={{
            textShadow: '0 4px 12px rgba(0,0,0,0.6), 0 0 60px rgba(178, 34, 34, 0.4)',
          }}
        >
          中国象棋
        </h1>
        <p className="font-serif-sc text-ivory/70 text-lg tracking-[0.3em] menu-subtitle">楚河汉界 · 运筹帷幄</p>
        <div className="mt-5 flex justify-center gap-2">
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-vermilion" />
          <div className="w-2 h-2 rounded-full bg-vermilion" />
          <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-vermilion" />
        </div>
      </motion.div>

      <div className="space-y-6">
        {menuCategories.map((cat, ci) => (
          <div key={cat.title}>
            {cat.items.length > 1 && (
              <div className="flex items-center gap-3 mb-3 px-1">
                <h2 className="font-calligraphy text-xl text-ivory/90">{cat.title}</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-ivory/25 to-transparent" />
              </div>
            )}
            <div className="space-y-3 menu-grid">
              {cat.items.map((item, ii) => (
                <MenuItem
                  key={item.title}
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  onClick={item.onClick}
                  delay={0.15 + ci * 0.08 + ii * 0.035}
                  variant={item.variant}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-center mt-10"
      >
        <p className="font-serif-sc text-ivory/40 text-sm">~ 以棋会友 · 乐在棋中 ~</p>
      </motion.div>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </motion.div>
  );
}

function XiangqiModesPage({ onBack }: { onBack: () => void }) {
  const navigateTo = useGameStore((s) => s.navigateTo);

  const modes = [
    { icon: <Monitor size={24} />, title: '人机对战', description: '挑战电脑AI，单人模式也能尽兴对弈', onClick: () => navigateTo('pve-setup') },
    { icon: <Wifi size={24} />, title: '联机对战', description: '与远方的好友在线对弈', onClick: () => navigateTo('online-setup'), variant: 'secondary' as const },
    { icon: <Eye size={24} />, title: '观战模式', description: '观看AI双方对弈，学习棋艺', onClick: () => navigateTo('watch-settings'), variant: 'secondary' as const },
    { icon: <Puzzle size={24} />, title: '残局挑战', description: '精选残局，考验棋力与算度', onClick: () => navigateTo('endgame-select') },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      custom={1}
      className="w-full max-w-md mx-auto"
    >
      <PageHeader title="中国象棋" onBack={onBack} />
      <div className="space-y-3 menu-grid">
        {modes.map((mode, i) => (
          <MenuItem
            key={mode.title}
            icon={mode.icon}
            title={mode.title}
            description={mode.description}
            onClick={mode.onClick}
            delay={0.15 + i * 0.05}
            variant={mode.variant}
          />
        ))}
      </div>
    </motion.div>
  );
}

function PveSetupPage({ onBack }: { onBack: () => void }) {
  const { difficulty, setDifficulty, playerColor, setPlayerColor, setGameMode, startGame } = useGameStore();

  const handleStart = () => {
    setGameMode('pve');
    startGame();
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      custom={1}
      className="w-full max-w-md mx-auto"
    >
      <PageHeader title="人机对战" onBack={onBack} />

      <div className="space-y-6">
        <div className="wood-panel p-6 rounded-2xl">
          <div className="relative z-10">
            <h4 className="font-calligraphy text-2xl text-wood-dark text-center mb-5">选择难度</h4>
            <div className="grid grid-cols-3 gap-3">
              <DifficultyCard
                level="easy"
                title="初级"
                description="新手入门"
                isSelected={difficulty === 'easy'}
                onClick={() => setDifficulty('easy')}
                delay={0.2}
              />
              <DifficultyCard
                level="medium"
                title="中级"
                description="有一定挑战"
                isSelected={difficulty === 'medium'}
                onClick={() => setDifficulty('medium')}
                delay={0.28}
              />
              <DifficultyCard
                level="hard"
                title="高级"
                description="资深棋友"
                isSelected={difficulty === 'hard'}
                onClick={() => setDifficulty('hard')}
                delay={0.36}
              />
            </div>
          </div>
        </div>

        <ColorSelect selected={playerColor} onChange={setPlayerColor} />

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="w-full seal-btn text-2xl py-5"
        >
          开始游戏
        </motion.button>
      </div>
    </motion.div>
  );
}

function WatchSettingsPage({ onBack }: { onBack: () => void }) {
  const {
    redDifficulty,
    setRedDifficulty,
    blackDifficulty,
    setBlackDifficulty,
    autoPlaySpeed,
    setAutoPlaySpeed,
    startWatchGame,
  } = useGameStore();

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      custom={1}
      className="w-full max-w-md mx-auto"
    >
      <PageHeader title="AI观战模式" onBack={onBack} />

      <div className="space-y-5">
        <div className="wood-panel p-5 rounded-2xl">
          <div className="relative z-10">
            <h4 className="font-calligraphy text-2xl text-wood-dark text-center mb-4">红方难度</h4>
            <div className="grid grid-cols-3 gap-3">
              <DifficultyCard
                level="easy"
                title="初级"
                description="新手入门"
                isSelected={redDifficulty === 'easy'}
                onClick={() => setRedDifficulty('easy')}
                delay={0.2}
              />
              <DifficultyCard
                level="medium"
                title="中级"
                description="有一定挑战"
                isSelected={redDifficulty === 'medium'}
                onClick={() => setRedDifficulty('medium')}
                delay={0.28}
              />
              <DifficultyCard
                level="hard"
                title="高级"
                description="资深棋友"
                isSelected={redDifficulty === 'hard'}
                onClick={() => setRedDifficulty('hard')}
                delay={0.36}
              />
            </div>
          </div>
        </div>

        <div className="wood-panel p-5 rounded-2xl">
          <div className="relative z-10">
            <h4 className="font-calligraphy text-2xl text-wood-dark text-center mb-4">黑方难度</h4>
            <div className="grid grid-cols-3 gap-3">
              <DifficultyCard
                level="easy"
                title="初级"
                description="新手入门"
                isSelected={blackDifficulty === 'easy'}
                onClick={() => setBlackDifficulty('easy')}
                delay={0.2}
              />
              <DifficultyCard
                level="medium"
                title="中级"
                description="有一定挑战"
                isSelected={blackDifficulty === 'medium'}
                onClick={() => setBlackDifficulty('medium')}
                delay={0.28}
              />
              <DifficultyCard
                level="hard"
                title="高级"
                description="资深棋友"
                isSelected={blackDifficulty === 'hard'}
                onClick={() => setBlackDifficulty('hard')}
                delay={0.36}
              />
            </div>
          </div>
        </div>

        <SpeedSelect value={autoPlaySpeed} onChange={setAutoPlaySpeed} />

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={startWatchGame}
          className="w-full seal-btn text-2xl py-5"
        >
          开始观战
        </motion.button>
      </div>
    </motion.div>
  );
}

function EndgameSelectPage({ onBack }: { onBack: () => void }) {
  const { startEndgame } = useGameStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const difficultyColors: Record<string, { bg: string; ring: string; text: string }> = {
    '简单': { bg: 'from-emerald-600 to-emerald-800', ring: 'ring-emerald-400', text: 'text-emerald-100' },
    '中等': { bg: 'from-amber-600 to-amber-800', ring: 'ring-amber-400', text: 'text-amber-100' },
    '困难': { bg: 'from-rose-700 to-rose-900', ring: 'ring-rose-400', text: 'text-rose-100' },
    '专家': { bg: 'from-purple-700 to-purple-900', ring: 'ring-purple-400', text: 'text-purple-100' },
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      custom={1}
      className="w-full max-w-2xl mx-auto"
    >
      <PageHeader title="残局挑战" onBack={onBack} />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="font-serif-sc text-ivory/60 text-sm text-center mb-5"
      >
        共 {ENDGAMES.length} 局精选残局 · 红先手 · 目标将杀黑方
      </motion.p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {ENDGAMES.map((eg, index) => {
          const dc = difficultyColors[eg.difficulty];
          const isSelected = selectedId === eg.id;
          return (
            <motion.button
              key={eg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.04, type: 'spring', damping: 20, stiffness: 100 }}
              whileHover={{ scale: isSelected ? 1 : 1.02, y: isSelected ? 0 : -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedId(eg.id)}
              className={`relative text-left p-4 rounded-xl transition-all duration-300 ${
                isSelected ? `ring-4 ${dc.ring}` : 'hover:shadow-xl'
              }`}
              style={{
                background: isSelected
                  ? `linear-gradient(145deg, ${
                      eg.difficulty === '简单' ? '#059669, #065f46' :
                      eg.difficulty === '中等' ? '#d97706, #92400e' :
                      eg.difficulty === '困难' ? '#be123c, #881337' : '#7e22ce, #581c87'
                    })`
                  : 'linear-gradient(145deg, rgba(222, 184, 135, 0.95), rgba(196, 149, 106, 0.95))',
                border: isSelected ? 'none' : '2px solid #8B4513',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-calligraphy text-xl flex-shrink-0 ${
                    isSelected ? 'bg-ivory/20 text-ivory' : 'bg-wood-dark/20 text-wood-dark'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-calligraphy text-xl ${isSelected ? 'text-ivory' : 'text-wood-dark'}`}>
                      {eg.name}
                    </h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-serif-sc ${
                        isSelected ? `${dc.text} bg-black/20` : 'bg-wood-dark/15 text-wood-dark/80'
                      }`}
                    >
                      {eg.difficulty}
                    </span>
                  </div>
                  <p className={`font-serif-sc text-xs leading-relaxed ${isSelected ? 'text-ivory/80' : 'text-wood-dark/60'}`}>
                    {eg.description}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="wood-panel p-4 rounded-xl mb-3"
            >
              <div className="relative z-10 flex items-start gap-2">
                <Sparkles size={16} className="text-vermilion flex-shrink-0 mt-0.5" />
                <p className="font-serif-sc text-wood-dark/80 text-sm">
                  {ENDGAMES.find(e => e.id === selectedId)?.hint}
                </p>
              </div>
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startEndgame(selectedId)}
              className="w-full seal-btn text-2xl py-4"
            >
              开始挑战
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function OnlineSetupPage({ onBack }: { onBack: () => void }) {
  const { createOnlineRoom, joinOnlineRoom, showToast } = useGameStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState('');

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      await createOnlineRoom();
      showToast('房间创建成功！', 'success');
    } catch (error) {
      console.error('创建房间失败:', error);
      showToast('创建房间失败，请重试', 'error');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomIdInput || roomIdInput.length !== 6) {
      showToast('请输入6位房间号', 'warning');
      return;
    }

    setIsJoining(true);
    try {
      await joinOnlineRoom(roomIdInput);
      showToast('加入房间成功！', 'success');
    } catch (error) {
      console.error('加入房间失败:', error);
      showToast('房间不存在或已解散', 'error');
      setIsJoining(false);
    }
  };

  const handleRoomIdChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setRoomIdInput(cleaned);
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      custom={1}
      className="w-full max-w-md mx-auto"
    >
      <PageHeader title="联机对战" onBack={onBack} />

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="wood-panel p-6 rounded-2xl"
        >
          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-vermilion/20 flex items-center justify-center">
                <Wifi size={40} className="text-vermilion" />
              </div>
            </div>

            <h3 className="font-calligraphy text-3xl text-wood-dark text-center mb-2">
              联机对战
            </h3>
            <p className="font-serif-sc text-wood-dark/70 text-center mb-6">
              与远方的好友在线对弈，体验隔空博弈的乐趣
            </p>

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full seal-btn text-xl py-4 flex items-center justify-center gap-3"
              >
                {isCreating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span>正在创建房间...</span>
                  </>
                ) : (
                  <>
                    <Plus size={24} />
                    <span>创建房间</span>
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowJoinModal(true)}
                disabled={isJoining}
                className="w-full seal-btn seal-btn-secondary text-xl py-4 flex items-center justify-center gap-3"
              >
                <LogIn size={24} />
                <span>加入房间</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="wood-panel p-5 rounded-2xl"
        >
          <div className="relative z-10">
            <h4 className="font-calligraphy text-xl text-wood-dark mb-3 text-center">
              使用说明
            </h4>
            <ul className="font-serif-sc text-wood-dark/70 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-vermilion font-bold">•</span>
                <span>创建房间后，将房间号分享给好友</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vermilion font-bold">•</span>
                <span>好友输入房间号即可加入对局</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vermilion font-bold">•</span>
                <span>房主执红棋先行，客人执黑棋</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vermilion font-bold">•</span>
                <span>请保持网络连接稳定</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>

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
                    请输入6位房间号
                  </label>
                  <input
                    type="text"
                    value={roomIdInput}
                    onChange={(e) => handleRoomIdChange(e.target.value)}
                    placeholder="------"
                    maxLength={6}
                    disabled={isJoining}
                    className="w-full text-center font-mono text-4xl tracking-[0.3em] py-4 px-4 rounded-xl outline-none transition-all"
                    style={{
                      background: 'linear-gradient(145deg, #1a1a1a, #2d2d2d)',
                      color: '#DEB887',
                      border: '3px solid #8B4513',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowJoinModal(false)}
                    disabled={isJoining}
                    className="flex-1 seal-btn seal-btn-secondary"
                  >
                    取消
                  </button>
                  <motion.button
                    whileHover={{ scale: isJoining ? 1 : 1.03 }}
                    whileTap={{ scale: isJoining ? 1 : 0.97 }}
                    onClick={handleJoinRoom}
                    disabled={isJoining || roomIdInput.length !== 6}
                    className="flex-1 seal-btn flex items-center justify-center gap-2"
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

function SettingsPage({ onBack }: { onBack: () => void }) {
  const { soundEnabled, toggleSound, autoPlaySpeed, setAutoPlaySpeed } = useGameStore();

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      custom={1}
      className="w-full max-w-md mx-auto"
    >
      <PageHeader title="游戏设置" onBack={onBack} />

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="wood-panel p-5 rounded-2xl"
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 size={24} className="text-wood-dark" />
              ) : (
                <VolumeX size={24} className="text-wood-dark/50" />
              )}
              <div>
                <h4 className="font-calligraphy text-xl text-wood-dark">音效开关</h4>
                <p className="font-serif-sc text-wood-dark/60 text-sm">
                  {soundEnabled ? '音效已开启' : '音效已关闭'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleSound}
              className={`w-14 h-8 rounded-full transition-all duration-300 relative ${
                soundEnabled ? 'bg-vermilion' : 'bg-wood-dark/30'
              }`}
            >
              <motion.div
                animate={{ x: soundEnabled ? 28 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-6 h-6 rounded-full bg-ivory shadow-md"
              />
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <SpeedSelect value={autoPlaySpeed} onChange={setAutoPlaySpeed} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      custom={1}
      className="w-full max-w-md mx-auto"
    >
      <PageHeader title="关于游戏" onBack={onBack} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="wood-panel p-8 rounded-2xl text-center"
      >
        <div className="relative z-10">
          <div
            className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #FFFFF0, #E8D4A8)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              border: '3px solid #8B4513',
            }}
          >
            <span
              className="font-calligraphy text-5xl"
              style={{ color: '#B22222' }}
            >
              象
            </span>
          </div>

          <h2 className="font-calligraphy text-4xl text-wood-dark mb-2">中国象棋</h2>
          <p className="font-serif-sc text-wood-dark/60 mb-6">版本 1.0.0</p>

          <div className="space-y-4 text-left">
            <div className="border-t border-wood-dark/20 pt-4">
              <h4 className="font-calligraphy text-xl text-wood-dark mb-2">游戏特色</h4>
              <ul className="font-serif-sc text-wood-dark/70 text-sm space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-vermilion">•</span>
                  <span>经典中国象棋规则</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-vermilion">•</span>
                  <span>人机对战（初级/中级/高级）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-vermilion">•</span>
                  <span>人人同屏对战</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-vermilion">•</span>
                  <span>AI观战模式</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-vermilion">•</span>
                  <span>古典水墨风格界面</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-wood-dark/20 pt-4">
              <h4 className="font-calligraphy text-xl text-wood-dark mb-2">技术栈</h4>
              <p className="font-serif-sc text-wood-dark/70 text-sm">
                React + TypeScript + Zustand + Framer Motion + Tailwind CSS
              </p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-wood-dark/20">
            <p className="font-serif-sc text-wood-dark/50 text-sm">~ 以棋会友 · 乐在棋中 ~</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

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

interface MainMenuProps {
  onGoToDoudizhu: () => void;
  onGoToJanggi: () => void;
  onGoToChess: () => void;
  onGoToJunqi: () => void;
  onGoToWeiqi: () => void;
  onGoToShogi: () => void;
  onGoToOthello: () => void;
  onGoToConnect4: () => void;
  onGoToRoguelike: () => void;
}

export function MainMenu({ onGoToDoudizhu, onGoToJanggi, onGoToChess, onGoToJunqi, onGoToWeiqi, onGoToShogi, onGoToOthello, onGoToConnect4, onGoToRoguelike }: MainMenuProps) {
  const { screen, navigateTo, backToMenu } = useGameStore();
  const isLandscapeMobile = useIsLandscapeMobile();

  const renderPage = () => {
    switch (screen) {
      case 'menu':
        return <MainMenuPage key="menu" onNavigate={navigateTo} onGoToDoudizhu={onGoToDoudizhu} onGoToJanggi={onGoToJanggi} onGoToChess={onGoToChess} onGoToJunqi={onGoToJunqi} onGoToWeiqi={onGoToWeiqi} onGoToShogi={onGoToShogi} onGoToOthello={onGoToOthello} onGoToConnect4={onGoToConnect4} onGoToRoguelike={onGoToRoguelike} />;
      case 'xiangqi-modes':
        return <XiangqiModesPage key="xiangqi-modes" onBack={backToMenu} />;
      case 'pve-setup':
        return <PveSetupPage key="pve-setup" onBack={backToMenu} />;
      case 'watch-settings':
        return <WatchSettingsPage key="watch-settings" onBack={backToMenu} />;
      case 'endgame-select':
        return <EndgameSelectPage key="endgame-select" onBack={backToMenu} />;
      case 'online-setup':
        return <OnlineSetupPage key="online-setup" onBack={backToMenu} />;
      case 'gomoku':
        return <GomokuGame key="gomoku" onBack={backToMenu} />;
      case 'settings':
        return <SettingsPage key="settings" onBack={backToMenu} />;
      case 'about':
        return <AboutPage key="about" onBack={backToMenu} />;
      default:
        return <MainMenuPage key="menu" onNavigate={navigateTo} onGoToDoudizhu={onGoToDoudizhu} onGoToJanggi={onGoToJanggi} onGoToChess={onGoToChess} onGoToJunqi={onGoToJunqi} onGoToWeiqi={onGoToWeiqi} onGoToShogi={onGoToShogi} onGoToOthello={onGoToOthello} onGoToConnect4={onGoToConnect4} onGoToRoguelike={onGoToRoguelike} />;
    }
  };

  return (
    <div className={`min-h-screen relative flex items-center justify-center py-8 px-4 ${isLandscapeMobile ? 'landscape-menu' : ''}`}>
      <div className="relative z-10 w-full">
        <AnimatePresence mode="wait">{renderPage()}</AnimatePresence>
      </div>
    </div>
  );
}
