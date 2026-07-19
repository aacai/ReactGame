import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, BookOpen, Home, Flag, X, User, Wifi, WifiOff } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { PIECE_NAMES } from '../game/types';
import type { PieceColor, PieceType } from '../game/types';

interface ControlPanelProps {
  onOpenRules: () => void;
}

interface MoveHistoryDisplay {
  index: number;
  player: PieceColor;
  pieceName: string;
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
  captured?: string;
}

const COL_NAMES_RED = ['九', '八', '七', '六', '五', '四', '三', '二', '一'];
const COL_NAMES_BLACK = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ROW_NAMES_RED = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const ROW_NAMES_BLACK = ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'];

function formatMoveNotation(
  pieceType: PieceType,
  pieceColor: PieceColor,
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
  captured: boolean,
): string {
  const pieceName = PIECE_NAMES[pieceColor][pieceType];
  const isRed = pieceColor === 'red';

  const colNames = isRed ? COL_NAMES_RED : COL_NAMES_BLACK;
  const rowNames = isRed ? ROW_NAMES_RED : ROW_NAMES_BLACK;

  const fromColName = colNames[fromCol];
  const toColName = colNames[toCol];
  const fromRowName = rowNames[fromRow];
  const toRowName = rowNames[toRow];

  let action = '';
  if (fromRow === toRow) {
    action = '平';
  } else if ((isRed && toRow > fromRow) || (!isRed && toRow < fromRow)) {
    action = '进';
  } else {
    action = '退';
  }

  let dest = '';
  if (action === '平') {
    dest = toColName;
  } else {
    const rowDiff = Math.abs(toRow - fromRow);
    if (pieceType === 'horse' || pieceType === 'advisor' || pieceType === 'elephant') {
      dest = toColName;
    } else {
      dest = isRed ? ROW_NAMES_RED[rowDiff - 1] : String(rowDiff);
    }
  }

  return `${pieceName}${fromColName}${action}${dest}${captured ? ' 吃' : ''}`;
}

export function ControlPanel({ onOpenRules }: ControlPanelProps) {
  const {
    history,
    undoMove,
    resetGame,
    resign,
    backToMenu,
    isAIThinking,
    showHint,
    gameMode,
    gameStatus,
    currentPlayer,
    autoPlayRed,
    autoPlayBlack,
    toggleAutoPlay,
    autoPlaySpeed,
    setAutoPlaySpeed,
    myColor,
    opponentName,
    opponentConnected,
    onlineResign,
    requestRematch,
    rematchRequest,
    leaveOnlineRoom,
    sendUndoRequest,
    undoRequestStatus,
  } = useGameStore();

  const [showResignConfirm, setShowResignConfirm] = useState(false);

  const moveHistory = history.map((h, i) => ({
    index: i + 1,
    player: h.currentPlayerBefore,
    pieceName: PIECE_NAMES[h.piece.color][h.piece.type],
    fromCol: h.from.col,
    fromRow: h.from.row,
    toCol: h.to.col,
    toRow: h.to.row,
    captured: h.capturedPiece ? PIECE_NAMES[h.capturedPiece.color][h.capturedPiece.type] : undefined,
  }));

  const handleResign = () => {
    if (gameMode === 'online') {
      onlineResign();
    } else {
      resign();
    }
    setShowResignConfirm(false);
  };

  const handleRematch = () => {
    requestRematch();
  };

  const handleBackToMenu = () => {
    if (gameMode === 'online') {
      leaveOnlineRoom();
    } else {
      backToMenu();
    }
  };

  const isPlaying = gameStatus === 'playing';
  const isOnlineMode = gameMode === 'online';
  const isPlayerTurn = currentPlayer === 'red' || (isOnlineMode && myColor && currentPlayer === myColor);
  const canShowHint = isPlaying && !isAIThinking && isPlayerTurn && !isOnlineMode;

  const isCurrentPlayerAutoPlay = currentPlayer === 'red' ? autoPlayRed : autoPlayBlack;
  const isWatchMode = gameMode === 'watch';

  const handleToggleAutoPlay = () => {
    toggleAutoPlay(currentPlayer);
  };

  const speedOptions = [
    { key: 'slow' as const, label: '慢' },
    { key: 'normal' as const, label: '中' },
    { key: 'fast' as const, label: '快' },
  ];

  return (
    <div className="flex flex-col gap-3 control-panel">
      {isOnlineMode && (
        <div className="wood-panel p-3">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  opponentConnected ? 'bg-jade/20' : 'bg-vermilion/20'
                }`}>
                  <User size={20} className={opponentConnected ? 'text-jade' : 'text-vermilion'} />
                </div>
                <div>
                  <div className="font-calligraphy text-lg text-wood-dark">
                    {opponentName || '对手'}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-serif-sc ${
                    opponentConnected ? 'text-jade' : 'text-vermilion'
                  }`}>
                    {opponentConnected ? (
                      <>
                        <Wifi size={12} />
                        <span>在线</span>
                      </>
                    ) : (
                      <>
                        <WifiOff size={12} />
                        <span>离线</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-calligraphy text-lg text-wood-dark">
                  你执{myColor === 'red' ? '红' : '黑'}棋
                </div>
                <div className="text-xs font-serif-sc text-wood-dark/60">
                  {myColor === 'red' ? '先手' : '后手'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="wood-panel p-3">
        <div className="relative z-10">
          {isWatchMode ? (
            <div className="space-y-3">
              <div className="text-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-calligraphy text-lg"
                  style={{ background: 'linear-gradient(145deg, #6A5ACD, #483D8B)', color: '#FFFFF0' }}>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  观战模式
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-center font-serif-sc text-sm text-wood-dark/70">托管控制</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => toggleAutoPlay('red')}
                    disabled={!isPlaying}
                    className={`px-3 py-2 rounded-lg font-serif-sc text-sm transition-all flex items-center justify-center gap-2 ${
                      autoPlayRed
                        ? 'text-white'
                        : 'bg-white/50 text-wood-dark hover:bg-white/70'
                    }`}
                    style={{
                      background: autoPlayRed
                        ? 'linear-gradient(145deg, #DC143C, #B22222)'
                        : undefined,
                      border: autoPlayRed ? '2px solid #8B0000' : '2px solid #DC143C',
                    }}
                  >
                    <span className={`w-2 h-2 rounded-full ${autoPlayRed ? 'bg-white animate-pulse' : 'bg-vermilion'}`} />
                    <span>红方{autoPlayRed ? '托管' : '接管'}</span>
                  </button>
                  <button
                    onClick={() => toggleAutoPlay('black')}
                    disabled={!isPlaying}
                    className={`px-3 py-2 rounded-lg font-serif-sc text-sm transition-all flex items-center justify-center gap-2 ${
                      autoPlayBlack
                        ? 'text-white'
                        : 'bg-white/50 text-wood-dark hover:bg-white/70'
                    }`}
                    style={{
                      background: autoPlayBlack
                        ? 'linear-gradient(145deg, #1a1a1a, #333333)'
                        : undefined,
                      border: autoPlayBlack ? '2px solid #000000' : '2px solid #1a1a1a',
                    }}
                  >
                    <span className={`w-2 h-2 rounded-full ${autoPlayBlack ? 'bg-white animate-pulse' : 'bg-ink'}`} />
                    <span>黑方{autoPlayBlack ? '托管' : '接管'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="font-serif-sc text-sm text-wood-dark/70">速度调节</span>
                <div className="flex rounded-lg overflow-hidden border-2" style={{ borderColor: '#6A5ACD' }}>
                  {speedOptions.map((opt, index) => (
                    <button
                      key={opt.key}
                      onClick={() => setAutoPlaySpeed(opt.key)}
                      className={`px-4 py-2 font-serif-sc text-sm transition-all ${
                        autoPlaySpeed === opt.key
                          ? 'text-white'
                          : 'text-wood-dark hover:bg-purple-100'
                      } ${index > 0 ? 'border-l-2' : ''}`}
                      style={{
                        background: autoPlaySpeed === opt.key
                          ? 'linear-gradient(145deg, #6A5ACD, #483D8B)'
                          : 'rgba(255,255,255,0.5)',
                        borderColor: '#6A5ACD',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={resetGame}
                  disabled={isAIThinking}
                  className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                >
                  <RotateCcw size={16} />
                  <span>重开</span>
                </button>
                <button
                  onClick={onOpenRules}
                  className="seal-btn seal-btn-secondary text-sm py-2 flex items-center justify-center gap-1"
                >
                  <BookOpen size={16} />
                  <span>规则</span>
                </button>
                <button
                  onClick={backToMenu}
                  disabled={isAIThinking}
                  className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                  style={{ background: 'linear-gradient(145deg, #4A7C59, #2d5a3d)', borderColor: '#2d5a3d' }}
                >
                  <Home size={16} />
                  <span>菜单</span>
                </button>
              </div>
            </div>
          ) : isOnlineMode ? (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleRematch}
                disabled={isPlaying || rematchRequest !== 'none' || !opponentConnected}
                className="seal-btn text-sm py-2 flex items-center justify-center gap-1 col-span-3"
              >
                <RotateCcw size={16} />
                <span>
                  {rematchRequest === 'sent' ? '等待对方回应...' : '再来一局'}
                </span>
              </button>
              <button
                onClick={sendUndoRequest}
                disabled={
                  !isPlaying ||
                  !opponentConnected ||
                  history.length === 0 ||
                  undoRequestStatus !== 'none'
                }
                className="seal-btn seal-btn-secondary text-sm py-2 flex items-center justify-center gap-1 col-span-3"
              >
                <span>↩</span>
                <span>
                  {undoRequestStatus === 'sent' ? '等待对方同意...' : '请求悔棋'}
                </span>
              </button>
              <button
                onClick={onOpenRules}
                className="seal-btn seal-btn-secondary text-sm py-2 flex items-center justify-center gap-1"
              >
                <BookOpen size={16} />
                <span>规则</span>
              </button>
              <button
                onClick={() => setShowResignConfirm(true)}
                disabled={!isPlaying || !opponentConnected}
                className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                style={{ background: 'linear-gradient(145deg, #654321, #3d2817)', borderColor: '#3d2817' }}
              >
                <Flag size={16} />
                <span>认输</span>
              </button>
              <button
                onClick={handleBackToMenu}
                className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                style={{ background: 'linear-gradient(145deg, #4A7C59, #2d5a3d)', borderColor: '#2d5a3d' }}
              >
                <Home size={16} />
                <span>菜单</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={undoMove}
                disabled={history.length === 0 || !isPlaying || isAIThinking}
                className="seal-btn seal-btn-secondary text-sm py-2 flex items-center justify-center gap-1"
              >
                <span>↩</span>
                <span>悔棋</span>
              </button>
              <button
                onClick={showHint}
                disabled={!canShowHint}
                className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                style={{ background: 'linear-gradient(145deg, #DAA520, #B8860B)', borderColor: '#8B6914' }}
              >
                <span>💡</span>
                <span>提示</span>
              </button>
              <button
                onClick={resetGame}
                disabled={isAIThinking}
                className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
              >
                <RotateCcw size={16} />
                <span>重开</span>
              </button>
              <button
                onClick={onOpenRules}
                className="seal-btn seal-btn-secondary text-sm py-2 flex items-center justify-center gap-1"
              >
                <BookOpen size={16} />
                <span>规则</span>
              </button>
              <button
                onClick={() => setShowResignConfirm(true)}
                disabled={!isPlaying || isAIThinking}
                className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                style={{ background: 'linear-gradient(145deg, #654321, #3d2817)', borderColor: '#3d2817' }}
              >
                <Flag size={16} />
                <span>认输</span>
              </button>
              <button
                onClick={handleBackToMenu}
                disabled={isAIThinking}
                className="seal-btn text-sm py-2 flex items-center justify-center gap-1"
                style={{ background: 'linear-gradient(145deg, #4A7C59, #2d5a3d)', borderColor: '#2d5a3d' }}
              >
                <Home size={16} />
                <span>菜单</span>
              </button>
              {isCurrentPlayerAutoPlay ? (
                <button
                  onClick={handleToggleAutoPlay}
                  disabled={!isPlaying}
                  className="seal-btn text-sm py-2 flex items-center justify-center gap-1 col-span-3"
                  style={{ background: 'linear-gradient(145deg, #6A5ACD, #483D8B)', borderColor: '#483D8B' }}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>{currentPlayer === 'red' ? '红方' : '黑方'}托管中... 点击取消</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleAutoPlay}
                  disabled={!isPlaying || !isPlayerTurn || isAIThinking}
                  className="seal-btn text-sm py-2 flex items-center justify-center gap-1 col-span-3"
                  style={{ background: 'linear-gradient(145deg, #6A5ACD, #483D8B)', borderColor: '#483D8B' }}
                >
                  <span>🤖</span>
                  <span>托管</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="wood-panel p-3 flex-1 min-h-0 flex flex-col">
        <div className="relative z-10 flex flex-col h-full min-h-0">
          <h2 className="font-calligraphy text-xl text-wood-dark text-center mb-2 move-history-title">
            棋谱记录
          </h2>
          <div className="overflow-y-auto scrollbar-classic pr-1 max-h-[200px] lg:max-h-[400px] move-history-list">
            {moveHistory.length === 0 ? (
              <div className="text-center text-wood-dark/50 font-serif-sc py-6 text-sm">
                暂无走棋记录
              </div>
            ) : (
              <div className="space-y-1">
                {moveHistory.map((move) => (
                  <motion.div
                    key={move.index}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded ${move.player === 'red' ? 'bg-vermilion/10' : 'bg-ink/10'}`}
                  >
                    <span className="font-serif-sc text-wood-dark/50 text-xs w-5 shrink-0">
                      {move.index}.
                    </span>
                    <span className={`font-serif-sc font-medium text-xs ${move.player === 'red' ? 'text-vermilion' : 'text-ink'}`}>
                      {formatMoveNotation(
                        history[move.index - 1].piece.type,
                        move.player,
                        move.fromCol,
                        move.fromRow,
                        move.toCol,
                        move.toRow,
                        !!move.captured,
                      )}
                    </span>
                    {move.captured && (
                      <span className="ml-auto text-xs text-wood-dark/50 font-serif-sc shrink-0">
                        吃{move.captured}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showResignConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowResignConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="wood-panel p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative z-10 text-center">
                <h3 className="font-calligraphy text-2xl text-wood-dark mb-4">
                  确认认输
                </h3>
                <p className="font-serif-sc text-wood-dark/80 mb-6">
                  {isOnlineMode
                    ? '确定要向对手认输吗？'
                    : `${currentPlayer === 'red' ? '红方' : '黑方'}确定要认输吗？`}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowResignConfirm(false)}
                    className="seal-btn seal-btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleResign}
                    className="seal-btn"
                  >
                    确认认输
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
