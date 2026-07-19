// 四子棋棋盘组件
// - 7列 x 6行 蓝色立体框架，圆孔露出内部棋子（经典 Connect4 外观）
// - 棋子从棋盘顶部上方下落（framer-motion animate y）
// - hover 列高亮 + 顶部半透明预览棋子
// - 获胜四连金色发光脉冲
// - 最后一手白色边框标记

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useConnect4Store } from './store';
import { COLS, ROWS } from './rules';

// 棋子在格子中的占比
const PIECE_RATIO = 0.82;

export function Connect4Board() {
  const board = useConnect4Store((s) => s.board);
  const lastMove = useConnect4Store((s) => s.lastMove);
  const winningLine = useConnect4Store((s) => s.winningLine);
  const dropPiece = useConnect4Store((s) => s.dropPiece);
  const gameStatus = useConnect4Store((s) => s.gameStatus);
  const currentPlayer = useConnect4Store((s) => s.currentPlayer);
  const isAIThinking = useConnect4Store((s) => s.isAIThinking);
  const gameMode = useConnect4Store((s) => s.gameMode);
  const onlineState = useConnect4Store((s) => s.onlineState);

  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [cellHeight, setCellHeight] = useState(0);

  // 测量内部网格高度，用于计算棋子下落距离
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setCellHeight(el.offsetHeight / ROWS);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 是否允许玩家点击下子：
  // - 人机模式：仅红方（玩家）且未在 AI 思考时
  // - 联机模式：由 isMyTurn 控制（玩家可能是红或黄）
  const canPlace =
    gameStatus === 'playing' &&
    !isAIThinking &&
    (gameMode === 'online'
      ? onlineState.isMyTurn
      : currentPlayer === 1);

  // 顶部预览棋子的颜色：联机模式下用我的颜色，人机模式下固定红
  const previewColor: 1 | 2 =
    gameMode === 'online' ? onlineState.playerColor : 1;

  const isWinningCell = (r: number, c: number) =>
    winningLine.some((p) => p.row === r && p.col === c);

  const isLastMove = (r: number, c: number) =>
    lastMove?.row === r && lastMove?.col === c;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{
        aspectRatio: '7 / 6',
        padding: '3%',
        background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
        boxShadow:
          'inset 0 0 40px rgba(0,0,0,0.45), 0 12px 32px rgba(0,0,0,0.55)',
        border: '4px solid #1e3a8a',
      }}
    >
      {/* 内部容器：网格 + 点击层都基于此 */}
      <div ref={innerRef} className="relative w-full h-full">
        {/* 棋盘格子（圆孔 + 棋子） */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`cell-${r}-${c}`}
                className="relative"
              >
                {/* 圆孔：深色背景，模拟"看穿到底" */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: `${PIECE_RATIO * 100}%`,
                    height: `${PIECE_RATIO * 100}%`,
                    left: `${(1 - PIECE_RATIO) * 50}%`,
                    top: `${(1 - PIECE_RATIO) * 50}%`,
                    background: '#0f172a',
                    boxShadow:
                      'inset 0 2px 6px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(255,255,255,0.05)',
                  }}
                />

                {/* 棋子 */}
                {cell !== 0 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ zIndex: 2, pointerEvents: 'none' }}
                  >
                    <motion.div
                      initial={{ y: -(r + 1) * cellHeight }}
                      animate={{ y: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 22,
                      }}
                      className="rounded-full relative"
                      style={{
                        width: `${PIECE_RATIO * 100}%`,
                        height: `${PIECE_RATIO * 100}%`,
                        background:
                          cell === 1
                            ? 'radial-gradient(circle at 32% 30%, #ef4444 0%, #dc2626 55%, #b91c1c 100%)'
                            : 'radial-gradient(circle at 32% 30%, #fbbf24 0%, #f59e0b 55%, #d97706 100%)',
                        boxShadow:
                          '0 2px 6px rgba(0,0,0,0.45), inset -2px -3px 6px rgba(0,0,0,0.35), inset 2px 2px 4px rgba(255,255,255,0.28)',
                      }}
                    >
                      {/* 最后一手白色边框标记（非获胜格才显示，避免与金色高亮冲突） */}
                      {isLastMove(r, c) && !isWinningCell(r, c) && (
                        <div
                          className="absolute inset-0 rounded-full pointer-events-none"
                          style={{
                            boxShadow:
                              'inset 0 0 0 3px rgba(255,255,255,0.85)',
                          }}
                        />
                      )}
                    </motion.div>
                  </div>
                )}

                {/* 获胜四连金色发光脉冲 */}
                {isWinningCell(r, c) && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ zIndex: 3 }}
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, scale: [1, 1.12, 1] }}
                      transition={{
                        opacity: { duration: 0.3, delay: 0.4 },
                        scale: {
                          duration: 1.2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: 0.4,
                        },
                      }}
                      className="rounded-full"
                      style={{
                        width: `${PIECE_RATIO * 100}%`,
                        height: `${PIECE_RATIO * 100}%`,
                        boxShadow:
                          '0 0 14px 4px rgba(251,191,36,0.95), 0 0 28px 8px rgba(251,191,36,0.55)',
                      }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 列点击层：7 个等宽透明列覆盖在棋盘上 */}
        <div
          className="absolute inset-0 flex"
          style={{ zIndex: 5 }}
        >
          {Array.from({ length: COLS }).map((_, c) => {
            const isHovered = hoveredCol === c && canPlace;
            return (
              <div
                key={`col-${c}`}
                className="relative flex-1"
                style={{ cursor: canPlace ? 'pointer' : 'default' }}
                onMouseEnter={() => canPlace && setHoveredCol(c)}
                onMouseLeave={() => setHoveredCol(null)}
                onClick={() => {
                  if (!canPlace) return;
                  dropPiece(c);
                  setHoveredCol(null);
                }}
              >
                {/* 该列稍微变亮 */}
                {isHovered && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  />
                )}
                {/* 顶部半透明预览棋子 */}
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: `${PIECE_RATIO * 100}%`,
                      aspectRatio: '1 / 1',
                      top: `${(100 / ROWS) * 0.09}%`,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background:
                        previewColor === 1
                          ? 'radial-gradient(circle at 32% 30%, rgba(239,68,68,0.55) 0%, rgba(185,28,28,0.4) 100%)'
                          : 'radial-gradient(circle at 32% 30%, rgba(251,191,36,0.55) 0%, rgba(217,119,6,0.4) 100%)',
                      boxShadow:
                        previewColor === 1
                          ? '0 0 8px rgba(239,68,68,0.3)'
                          : '0 0 8px rgba(251,191,36,0.3)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
