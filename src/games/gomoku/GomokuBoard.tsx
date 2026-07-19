// 五子棋棋盘组件
// - 15x15 木质棋盘
// - 5 个标准星位
// - 黑白立体棋子（带阴影/高光）
// - 最后一手红点标记
// - framer-motion 落子动画

import { motion } from 'framer-motion';
import { useGomokuStore } from './store';
import { BOARD_SIZE } from './rules';

// 标准星位：四角星 + 天元
const STAR_POINTS: ReadonlyArray<readonly [number, number]> = [
  [3, 3],
  [3, 11],
  [7, 7],
  [11, 3],
  [11, 11],
];

// 每个交叉点占的百分比（棋盘共 15 列/行，均分 100%）
const CELL_PCT = 100 / BOARD_SIZE;

// 第 i 条线的位置（百分比）
function linePos(i: number): number {
  return (i + 0.5) * CELL_PCT;
}

// 木质棋盘背景色
const WOOD_COLOR = '#DCB35C';
// 棋盘线颜色
const LINE_COLOR = '#3a2817';

export function GomokuBoard() {
  const board = useGomokuStore((s) => s.board);
  const lastMove = useGomokuStore((s) => s.lastMove);
  const placeStone = useGomokuStore((s) => s.placeStone);
  const gameStatus = useGomokuStore((s) => s.gameStatus);
  const currentPlayer = useGomokuStore((s) => s.currentPlayer);
  const isAIThinking = useGomokuStore((s) => s.isAIThinking);

  // 仅在人机模式下允许玩家（黑棋）点击落子
  const canPlace =
    gameStatus === 'playing' && currentPlayer === 1 && !isAIThinking;

  const handleClick = (row: number, col: number) => {
    if (!canPlace) return;
    placeStone(row, col);
  };

  // 棋子直径相对单元格的比例
  const STONE_RATIO = 0.88;
  const stoneSize = CELL_PCT * STONE_RATIO;

  return (
    <div
      className="relative w-full aspect-square rounded-lg overflow-hidden select-none"
      style={{
        background: `radial-gradient(ellipse at center, #E8C374 0%, ${WOOD_COLOR} 60%, #C99A4A 100%)`,
        boxShadow:
          'inset 0 0 30px rgba(139, 69, 19, 0.35), 0 10px 30px rgba(0, 0, 0, 0.5)',
        border: '3px solid #6b3410',
      }}
    >
      {/* 棋盘线与星位（SVG，按百分比绘制） */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {/* 横线 */}
        {Array.from({ length: BOARD_SIZE }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={linePos(0)}
            y1={linePos(i)}
            x2={linePos(BOARD_SIZE - 1)}
            y2={linePos(i)}
            stroke={LINE_COLOR}
            strokeWidth={0.25}
          />
        ))}
        {/* 竖线 */}
        {Array.from({ length: BOARD_SIZE }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={linePos(i)}
            y1={linePos(0)}
            x2={linePos(i)}
            y2={linePos(BOARD_SIZE - 1)}
            stroke={LINE_COLOR}
            strokeWidth={0.25}
          />
        ))}
        {/* 星位 */}
        {STAR_POINTS.map(([r, c]) => (
          <circle
            key={`star-${r}-${c}`}
            cx={linePos(c)}
            cy={linePos(r)}
            r={0.7}
            fill={LINE_COLOR}
          />
        ))}
      </svg>

      {/* 点击层：单一透明覆盖层，根据点击位置计算最近交叉点 */}
      <div
        className="absolute inset-0"
        style={{
          cursor: canPlace ? 'pointer' : 'default',
          zIndex: 1,
        }}
        onClick={(e) => {
          if (!canPlace) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const xPct = ((e.clientX - rect.left) / rect.width) * 100;
          const yPct = ((e.clientY - rect.top) / rect.height) * 100;
          // 反推最近交叉点：linePos(i) = (i + 0.5) * CELL_PCT
          const col = Math.round(xPct / CELL_PCT - 0.5);
          const row = Math.round(yPct / CELL_PCT - 0.5);
          if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
          handleClick(row, col);
        }}
      />

      {/* 棋子 */}
      {board.map((row, r) =>
        row.map((cell, c) => {
          if (cell === 0) return null;
          const isLast =
            lastMove?.row === r && lastMove?.col === c;
          const isBlack = cell === 1;

          return (
            <motion.div
              key={`stone-${r}-${c}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 600,
                damping: 28,
                duration: 0.25,
              }}
              className="absolute rounded-full"
              style={{
                left: `${linePos(c)}%`,
                top: `${linePos(r)}%`,
                width: `${stoneSize}%`,
                height: `${stoneSize}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                pointerEvents: 'none',
                background: isBlack
                  ? 'radial-gradient(circle at 32% 30%, #6a6a6a 0%, #1a1a1a 55%, #000000 100%)'
                  : 'radial-gradient(circle at 32% 30%, #ffffff 0%, #f0ece0 55%, #c8c2b0 100%)',
                boxShadow: isBlack
                  ? '0 2px 4px rgba(0,0,0,0.6), inset -1px -2px 3px rgba(0,0,0,0.6), inset 1px 1px 2px rgba(255,255,255,0.15)'
                  : '0 2px 4px rgba(0,0,0,0.35), inset -1px -2px 3px rgba(160,150,130,0.5), inset 1px 1px 2px rgba(255,255,255,0.7), 0 0 0 1px rgba(0,0,0,0.18)',
              }}
            >
              {/* 最后一手红点标记 */}
              {isLast && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 500 }}
                  className="absolute rounded-full"
                  style={{
                    width: '32%',
                    height: '32%',
                    left: '34%',
                    top: '34%',
                    background: '#E53935',
                    boxShadow: '0 0 4px rgba(229, 57, 53, 0.8)',
                  }}
                />
              )}
            </motion.div>
          );
        })
      )}
    </div>
  );
}
