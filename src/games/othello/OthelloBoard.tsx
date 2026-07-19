// 黑白棋棋盘组件
// - 8x8 绿色桌布棋盘（金色边框）
// - 黑白立体棋子（radial-gradient）
// - 可落子位置半透明小圆点提示
// - 上一手翻转的棋子带金色高亮边框
// - 最后一手位置带红点标记
// - framer-motion 棋子翻转动画（scale 1→0→1, rotateY 180°）

import { motion } from 'framer-motion';
import { useOthelloStore } from './store';
import { BOARD_SIZE, getValidMoves } from './rules';
import type { Player } from './rules';

export function OthelloBoard() {
  const board = useOthelloStore((s) => s.board);
  const lastMove = useOthelloStore((s) => s.lastMove);
  const lastFlips = useOthelloStore((s) => s.lastFlips);
  const placeStone = useOthelloStore((s) => s.placeStone);
  const gameStatus = useOthelloStore((s) => s.gameStatus);
  const currentPlayer = useOthelloStore((s) => s.currentPlayer);
  const isAIThinking = useOthelloStore((s) => s.isAIThinking);
  const gameMode = useOthelloStore((s) => s.gameMode);
  const onlineState = useOthelloStore((s) => s.onlineState);

  // 本地玩家颜色：联机模式由 playerColor 决定，人机模式固定黑（1）
  const localPlayer: Player | null =
    gameMode === 'online' ? onlineState.playerColor : 1;
  // 是否轮到本地玩家落子
  // - 联机：由 onlineState.isMyTurn 控制
  // - 人机：当前为黑方（1）且 AI 未思考时
  const isMyTurn =
    gameMode === 'online'
      ? onlineState.isMyTurn
      : currentPlayer === 1 && !isAIThinking;
  const canPlace = gameStatus === 'playing' && isMyTurn;

  const validMoves =
    canPlace && localPlayer !== null ? getValidMoves(board, localPlayer) : [];
  const validMoveSet = new Set(
    validMoves.map(([r, c]) => r * BOARD_SIZE + c)
  );
  const flipSet = new Set(lastFlips.map(([r, c]) => r * BOARD_SIZE + c));

  const handleClick = (row: number, col: number) => {
    if (!canPlace) return;
    // 仅合法位置可点击
    if (!validMoveSet.has(row * BOARD_SIZE + col)) return;
    placeStone(row, col);
  };

  return (
    <div
      className="relative w-full aspect-square rounded-lg overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(ellipse at center, #2d5a3d 0%, #1f4a2e 60%, #133521 100%)',
        boxShadow:
          'inset 0 0 30px rgba(0, 0, 0, 0.5), 0 10px 30px rgba(0, 0, 0, 0.5)',
        border: '3px solid #8B6914',
        padding: '2%',
      }}
    >
      <div
        className="grid w-full h-full"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
          gap: '1.5px',
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = r * BOARD_SIZE + c;
            const isValid = validMoveSet.has(key);
            const isFlipped = flipSet.has(key);
            const isLast =
              lastMove?.row === r && lastMove?.col === c;
            const isBlack = cell === 1;

            return (
              <div
                key={`cell-${r}-${c}`}
                className="relative flex items-center justify-center"
                style={{
                  background: 'rgba(0, 0, 0, 0.18)',
                  borderRadius: '2px',
                  cursor: isValid ? 'pointer' : 'default',
                }}
                onClick={() => handleClick(r, c)}
              >
                {/* 可落子位置半透明圆点提示 */}
                {isValid && cell === 0 && (
                  <div
                    className="rounded-full"
                    style={{
                      width: '30%',
                      height: '30%',
                      background: 'rgba(255, 255, 255, 0.25)',
                    }}
                  />
                )}

                {/* 棋子 */}
                {cell !== 0 && (
                  <div
                    className="relative"
                    style={{
                      width: '78%',
                      height: '78%',
                      borderRadius: '50%',
                      // 上一手翻转的棋子带金色高亮边框
                      boxShadow: isFlipped
                        ? '0 0 0 2px #FFD700, 0 0 10px rgba(255, 215, 0, 0.5)'
                        : 'none',
                    }}
                  >
                    <motion.div
                      key={`stone-${r}-${c}-${cell}`}
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 180, scale: [1, 0, 1] }}
                      transition={{ duration: 0.5, times: [0, 0.5, 1] }}
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: isBlack
                          ? 'radial-gradient(circle at 32% 30%, #6a6a6a 0%, #1a1a1a 55%, #000000 100%)'
                          : 'radial-gradient(circle at 32% 30%, #ffffff 0%, #f0ece0 55%, #c8c2b0 100%)',
                        boxShadow: isBlack
                          ? '0 2px 4px rgba(0,0,0,0.6), inset -1px -2px 3px rgba(0,0,0,0.6), inset 1px 1px 2px rgba(255,255,255,0.15)'
                          : '0 2px 4px rgba(0,0,0,0.35), inset -1px -2px 3px rgba(160,150,130,0.5), inset 1px 1px 2px rgba(255,255,255,0.7)',
                      }}
                    >
                      {/* 最后一手红点标记 */}
                      {isLast && (
                        <div
                          className="absolute rounded-full"
                          style={{
                            width: '28%',
                            height: '28%',
                            left: '36%',
                            top: '36%',
                            background: '#E53935',
                            boxShadow: '0 0 4px rgba(229, 57, 53, 0.8)',
                          }}
                        />
                      )}
                    </motion.div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
