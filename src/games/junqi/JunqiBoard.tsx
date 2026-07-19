// 军棋暗棋棋盘组件
// - 4 列 × 8 行棋盘
// - 未翻开棋子：背面（暗色，"军"字）
// - 已翻开棋子：正面（军衔文字 + 红蓝颜色）
// - 翻棋使用 rotateY 3D 翻转动画
// - 选中高亮、可走位置提示、最近一手标记

import { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useJunqiStore } from './store';
import { BOARD_COLS, BOARD_ROWS } from './rules';
import { RANK_NAMES } from './types';
import type { Piece, Position } from './types';

interface JunqiPieceProps {
  piece: Piece;
  selected: boolean;
  isLastAction: boolean;
  onClick: () => void;
}

// 单个棋子：使用 rotateY 翻转动画
function JunqiPiece({ piece, selected, isLastAction, onClick }: JunqiPieceProps) {
  const isRed = piece.color === 'red';
  const rankName = RANK_NAMES[piece.rank];

  return (
    <motion.div
      className="relative w-full h-full cursor-pointer select-none"
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      style={{ perspective: 1000 }}
    >
      {/* 选中高亮 */}
      {selected && (
        <motion.div
          className="absolute -inset-1 rounded-lg pointer-events-none"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            border: '3px solid #FFD700',
            boxShadow: '0 0 18px rgba(255, 215, 0, 0.7), inset 0 0 12px rgba(255, 215, 0, 0.3)',
          }}
        />
      )}

      {/* 最近一手标记 */}
      {isLastAction && !selected && (
        <motion.div
          className="absolute -inset-0.5 rounded-lg pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            border: '2px solid #E53935',
            boxShadow: '0 0 8px rgba(229, 57, 53, 0.5)',
          }}
        />
      )}

      {/* 翻转容器 */}
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: piece.revealed ? 0 : 180 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {/* 正面（已翻开） */}
        <div
          className="absolute inset-0 rounded-lg flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: 'radial-gradient(circle at 30% 30%, #FFFFF0 0%, #F5E6C8 40%, #E8D4A8 70%, #D4B896 100%)',
            boxShadow: `
              inset 0 -3px 6px rgba(139, 69, 19, 0.3),
              inset 0 3px 6px rgba(255, 255, 255, 0.5),
              0 3px 8px rgba(0, 0, 0, 0.3)
            `,
            border: isRed
              ? '2px solid rgba(178, 34, 34, 0.55)'
              : '2px solid rgba(30, 64, 175, 0.55)',
          }}
        >
          <span
            className="font-calligraphy font-bold"
            style={{
              color: isRed ? '#B22222' : '#1E40AF',
              fontSize: 'clamp(0.85rem, 4vw, 1.4rem)',
              textShadow: isRed
                ? '1px 1px 1px rgba(178, 34, 34, 0.25)'
                : '1px 1px 1px rgba(30, 64, 175, 0.25)',
            }}
          >
            {rankName}
          </span>
          {/* 高光 */}
          <div
            className="absolute inset-1 rounded-md opacity-30 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.7) 0%, transparent 50%)',
            }}
          />
        </div>

        {/* 背面（未翻开） */}
        <div
          className="absolute inset-0 rounded-lg flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(145deg, #8B4513 0%, #654321 50%, #4a2f1a 100%)',
            boxShadow: `
              inset 0 0 12px rgba(0, 0, 0, 0.5),
              0 3px 6px rgba(0, 0, 0, 0.4)
            `,
            border: '2px solid #3d2817',
          }}
        >
          <span
            className="font-calligraphy text-ivory/40"
            style={{ fontSize: 'clamp(0.9rem, 4.5vw, 1.5rem)' }}
          >
            军
          </span>
          {/* 装饰边框 */}
          <div
            className="absolute inset-1 rounded-md pointer-events-none"
            style={{
              border: '1px solid rgba(218, 165, 32, 0.25)',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function JunqiBoard() {
  const {
    pieces,
    selectedPieceId,
    validMoves,
    selectPiece,
    movePiece,
    revealPiece,
    currentPlayer,
    playerColor,
    gameStatus,
    isAIThinking,
    lastAction,
  } = useJunqiStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(0);

  // 计算棋盘尺寸（保持 4:8 = 1:2 的宽高比）
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        // 宽高比 1:2
        const aspectRatio = BOARD_COLS / BOARD_ROWS;
        let width = containerWidth;
        if (containerHeight > 0) {
          const maxWidthByHeight = containerHeight * aspectRatio;
          if (maxWidthByHeight < containerWidth) {
            width = maxWidthByHeight;
          }
        }
        setBoardWidth(width);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateSize);
      observer.disconnect();
    };
  }, []);

  // padding 占棋盘宽度的 5%
  const padding = boardWidth * 0.05;
  const gridWidth = boardWidth - padding * 2;
  const cellWidth = gridWidth / BOARD_COLS;
  const cellHeight = gridWidth / BOARD_COLS;  // 单元格为正方形
  const gridHeight = cellHeight * BOARD_ROWS;
  const boardHeight = gridHeight + padding * 2;

  const pieceSize = Math.min(cellWidth, cellHeight) * 0.85;
  const minTouchSize = 44;
  const touchSize = Math.max(pieceSize, minTouchSize);

  const getX = (col: number) => padding + col * cellWidth + cellWidth / 2;
  const getY = (row: number) => padding + row * cellHeight + cellHeight / 2;

  // 玩家是否可交互（玩家回合、未思考、游戏中、有颜色）
  const canInteract =
    gameStatus === 'playing' &&
    currentPlayer === 'human' &&
    !isAIThinking;

  // 点击处理：根据位置上是否有棋子、是否翻开、是否己方等决定行为
  const handleClick = (col: number, row: number) => {
    if (!canInteract) return;
    const piece = pieces.find((p) => p.col === col && p.row === row);

    if (!piece) {
      // 空位：若有选中的棋子且是合法走法，则移动；否则取消选中
      if (selectedPieceId) {
        const isValid = validMoves.some((m) => m.col === col && m.row === row);
        if (isValid) {
          movePiece(col, row);
          return;
        }
      }
      selectPiece(null);
      return;
    }

    if (!piece.revealed) {
      // 未翻开棋子：翻棋
      revealPiece(col, row);
      return;
    }

    // 已翻开棋子
    if (playerColor === null) {
      // 颜色未定，不能选子（理论上不会到这里，因为颜色未定时只允许翻棋）
      selectPiece(null);
      return;
    }

    if (piece.color === playerColor) {
      // 己方棋子：选中
      selectPiece(piece.id);
      return;
    }

    // 敌方棋子：若是合法走法目标，则攻击
    if (selectedPieceId) {
      const isValid = validMoves.some((m) => m.col === col && m.row === row);
      if (isValid) {
        movePiece(col, row);
        return;
      }
    }
    selectPiece(null);
  };

  // 绘制棋盘网格线
  const renderGridLines = () => {
    const lines = [];
    // 横线
    for (let row = 0; row <= BOARD_ROWS; row++) {
      lines.push(
        <line
          key={`h-${row}`}
          x1={padding}
          y1={padding + row * cellHeight}
          x2={boardWidth - padding}
          y2={padding + row * cellHeight}
          stroke="#3a2817"
          strokeWidth="1.5"
        />
      );
    }
    // 竖线
    for (let col = 0; col <= BOARD_COLS; col++) {
      lines.push(
        <line
          key={`v-${col}`}
          x1={padding + col * cellWidth}
          y1={padding}
          x2={padding + col * cellWidth}
          y2={padding + gridHeight}
          stroke="#3a2817"
          strokeWidth="1.5"
        />
      );
    }
    return lines;
  };

  const hasPieceAt = (col: number, row: number): boolean => {
    return pieces.some((p) => p.col === col && p.row === row);
  };

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <div
        className="relative"
        style={{
          width: boardWidth || '100%',
          height: boardHeight || 'auto',
        }}
      >
        {/* 木质背景 */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, #DEB887 0%, #D2A679 25%, #C4956A 50%, #D2A679 75%, #DEB887 100%)',
            boxShadow:
              'inset 0 0 40px rgba(139, 69, 19, 0.3), 0 10px 30px rgba(0, 0, 0, 0.4)',
            border: '3px solid #6b3410',
          }}
        />

        {boardWidth > 0 && (
          <>
            {/* 网格线 */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              width={boardWidth}
              height={boardHeight}
              viewBox={`0 0 ${boardWidth} ${boardHeight}`}
            >
              {renderGridLines()}
            </svg>

            {/* 点击区域：每个格子一个透明方块 */}
            {Array.from({ length: BOARD_COLS }).map((_, col) =>
              Array.from({ length: BOARD_ROWS }).map((_, row) => (
                <div
                  key={`click-${col}-${row}`}
                  className="absolute"
                  style={{
                    left: getX(col) - touchSize / 2,
                    top: getY(row) - touchSize / 2,
                    width: touchSize,
                    height: touchSize,
                    cursor: canInteract ? 'pointer' : 'default',
                    zIndex: 1,
                  }}
                  onClick={() => handleClick(col, row)}
                />
              ))
            )}

            {/* 合法走法提示 */}
            {validMoves.map((move: Position, idx: number) => {
              const hasPiece = hasPieceAt(move.col, move.row);
              const cx = getX(move.col);
              const cy = getY(move.row);
              const dotSize = pieceSize * 0.32;

              return hasPiece ? (
                <motion.div
                  key={`valid-ring-${idx}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.06, 1], opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute rounded-lg border-4 pointer-events-none"
                  style={{
                    left: cx - pieceSize / 2,
                    top: cy - pieceSize / 2,
                    width: pieceSize,
                    height: pieceSize,
                    borderColor: '#4A7C59',
                    boxShadow: '0 0 18px rgba(74, 124, 89, 0.6)',
                    zIndex: 5,
                  }}
                />
              ) : (
                <motion.div
                  key={`valid-dot-${idx}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 1.25, 1], opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: cx - dotSize / 2,
                    top: cy - dotSize / 2,
                    width: dotSize,
                    height: dotSize,
                    background: '#4A7C59',
                    boxShadow: '0 0 14px rgba(74, 124, 89, 0.7)',
                    zIndex: 5,
                  }}
                />
              );
            })}

            {/* 棋子 */}
            <AnimatePresence mode="popLayout">
              {pieces.map((piece) => {
                const isLast =
                  lastAction !== null &&
                  lastAction.col === piece.col &&
                  lastAction.row === piece.row;
                return (
                  <motion.div
                    key={piece.id}
                    className="absolute"
                    style={{
                      left: getX(piece.col) - pieceSize / 2,
                      top: getY(piece.row) - pieceSize / 2,
                      width: pieceSize,
                      height: pieceSize,
                      zIndex: selectedPieceId === piece.id ? 20 : 10,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    layout
                  >
                    <JunqiPiece
                      piece={piece}
                      selected={selectedPieceId === piece.id}
                      isLastAction={isLast}
                      onClick={() => handleClick(piece.col, piece.row)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
