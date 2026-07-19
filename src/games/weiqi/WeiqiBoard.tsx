// 围棋棋盘组件
// - 19x19 木质棋盘（背景色 #DCB35C）
// - 9 个标准星位
// - 黑白立体棋子（带高光/阴影）
// - 最后一手红点标记
// - 坐标标记：A-T（跳过 I）/ 1-19
// - framer-motion 落子动画

import { motion } from 'framer-motion';
import { useWeiqiStore } from './store';
import { BOARD_SIZE } from './rules';

// 9 个标准星位（0-indexed，对应 1-indexed 的 4-4 / 4-10 / 4-16 / 10-4 / 10-10 / 10-16 / 16-4 / 16-10 / 16-16）
const STAR_POINTS: ReadonlyArray<readonly [number, number]> = [
  [3, 3],
  [3, 9],
  [3, 15],
  [9, 3],
  [9, 9],
  [9, 15],
  [15, 3],
  [15, 9],
  [15, 15],
];

// 列坐标字母：A-T 跳过 I（共 19 个字母）
const COL_LETTERS: string[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K',
  'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
];

// 每个交叉点占的百分比
const CELL_PCT = 100 / BOARD_SIZE;

// 第 i 条线的位置（百分比，加 0.5 让线居中在格子中央，即交叉点处）
function linePos(i: number): number {
  return (i + 0.5) * CELL_PCT;
}

// 木质棋盘背景色
const WOOD_COLOR = '#DCB35C';
// 棋盘线颜色
const LINE_COLOR = '#2a1a08';
// 坐标文字颜色
const COORD_COLOR = '#5a3a18';

export function WeiqiBoard() {
  const board = useWeiqiStore((s) => s.board);
  const lastMove = useWeiqiStore((s) => s.lastMove);
  const placeStone = useWeiqiStore((s) => s.placeStone);
  const gameStatus = useWeiqiStore((s) => s.gameStatus);
  const currentPlayer = useWeiqiStore((s) => s.currentPlayer);
  const isAIThinking = useWeiqiStore((s) => s.isAIThinking);

  // 仅在人机模式下允许玩家（黑棋）点击落子
  const canPlace =
    gameStatus === 'playing' && currentPlayer === 'black' && !isAIThinking;

  const handleClick = (row: number, col: number) => {
    if (!canPlace) return;
    placeStone(col, row);
  };

  // 棋子直径相对单元格的比例（19x19 较密，稍小一些）
  const STONE_RATIO = 0.92;
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
            strokeWidth={0.18}
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
            strokeWidth={0.18}
          />
        ))}
        {/* 9 个星位 */}
        {STAR_POINTS.map(([r, c]) => (
          <circle
            key={`star-${r}-${c}`}
            cx={linePos(c)}
            cy={linePos(r)}
            r={0.55}
            fill={LINE_COLOR}
          />
        ))}
      </svg>

      {/* 顶部列坐标 A-T */}
      <div className="absolute top-0 left-0 right-0 flex pointer-events-none" style={{ height: `${CELL_PCT * 0.5}%` }}>
        {COL_LETTERS.map((letter, i) => (
          <div
            key={`top-${letter}`}
            className="flex items-center justify-center font-serif-sc"
            style={{
              position: 'absolute',
              left: `${linePos(i)}%`,
              transform: 'translateX(-50%)',
              fontSize: 'clamp(6px, 1vw, 10px)',
              color: COORD_COLOR,
              fontWeight: 600,
            }}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* 底部列坐标 A-T */}
      <div className="absolute bottom-0 left-0 right-0 flex pointer-events-none" style={{ height: `${CELL_PCT * 0.5}%` }}>
        {COL_LETTERS.map((letter, i) => (
          <div
            key={`bot-${letter}`}
            className="flex items-center justify-center font-serif-sc"
            style={{
              position: 'absolute',
              left: `${linePos(i)}%`,
              transform: 'translateX(-50%)',
              fontSize: 'clamp(6px, 1vw, 10px)',
              color: COORD_COLOR,
              fontWeight: 600,
            }}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* 左侧行坐标 1-19（顶部=19，底部=1，符合围棋传统视角） */}
      <div className="absolute left-0 top-0 bottom-0 pointer-events-none" style={{ width: `${CELL_PCT * 0.5}%` }}>
        {Array.from({ length: BOARD_SIZE }).map((_, i) => (
          <div
            key={`left-${i}`}
            className="flex items-center justify-center font-serif-sc"
            style={{
              position: 'absolute',
              top: `${linePos(i)}%`,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 'clamp(6px, 1vw, 10px)',
              color: COORD_COLOR,
              fontWeight: 600,
            }}
          >
            {BOARD_SIZE - i}
          </div>
        ))}
      </div>

      {/* 右侧行坐标 1-19 */}
      <div className="absolute right-0 top-0 bottom-0 pointer-events-none" style={{ width: `${CELL_PCT * 0.5}%` }}>
        {Array.from({ length: BOARD_SIZE }).map((_, i) => (
          <div
            key={`right-${i}`}
            className="flex items-center justify-center font-serif-sc"
            style={{
              position: 'absolute',
              top: `${linePos(i)}%`,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 'clamp(6px, 1vw, 10px)',
              color: COORD_COLOR,
              fontWeight: 600,
            }}
          >
            {BOARD_SIZE - i}
          </div>
        ))}
      </div>

      {/* 点击区域：每个交叉点一个透明方块 */}
      {board.map((row, r) =>
        row.map((_, c) => (
          <div
            key={`click-${r}-${c}`}
            className="absolute"
            style={{
              left: `${linePos(c)}%`,
              top: `${linePos(r)}%`,
              width: `${CELL_PCT}%`,
              height: `${CELL_PCT}%`,
              transform: 'translate(-50%, -50%)',
              cursor: canPlace ? 'pointer' : 'default',
              zIndex: 1,
            }}
            onClick={() => handleClick(r, c)}
          />
        ))
      )}

      {/* 棋子 */}
      {board.map((row, r) =>
        row.map((cell, c) => {
          if (cell === 'empty') return null;
          // 最后一手标记：非 pass 的最近一手
          const isLast =
            lastMove !== null && !lastMove.pass && lastMove.col === c && lastMove.row === r;
          const isBlack = cell === 'black';

          return (
            <motion.div
              key={`stone-${r}-${c}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 600,
                damping: 28,
                duration: 0.2,
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
                // 立体感：黑子偏深 + 高光，白子偏亮 + 阴影
                background: isBlack
                  ? 'radial-gradient(circle at 32% 28%, #6a6a6a 0%, #1a1a1a 55%, #000000 100%)'
                  : 'radial-gradient(circle at 32% 28%, #ffffff 0%, #f0ece0 55%, #c8c2b0 100%)',
                boxShadow: isBlack
                  ? '0 1.5px 3px rgba(0,0,0,0.7), inset -1px -2px 3px rgba(0,0,0,0.6), inset 1px 1px 2px rgba(255,255,255,0.18)'
                  : '0 1.5px 3px rgba(0,0,0,0.4), inset -1px -2px 3px rgba(160,150,130,0.5), inset 1px 1px 2px rgba(255,255,255,0.7), 0 0 0 1px rgba(0,0,0,0.18)',
              }}
            >
              {/* 最后一手红点标记 */}
              {isLast && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.12, type: 'spring', stiffness: 500 }}
                  className="absolute rounded-full"
                  style={{
                    width: '30%',
                    height: '30%',
                    left: '35%',
                    top: '35%',
                    background: '#E53935',
                    boxShadow: '0 0 4px rgba(229, 57, 53, 0.85)',
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
