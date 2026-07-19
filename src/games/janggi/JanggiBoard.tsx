// 韩国象棋棋盘组件
// 9x10 棋盘，木质背景
// 宫格 3x3 带 X 对角线
// 棋子圆形，红方红色字，蓝方蓝色字
// 注意：与中国象棋不同，无楚河汉界，竖线贯通

import { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useJanggiStore } from './store';
import { BOARD_COLS, BOARD_ROWS } from './rules';
import { PIECE_NAMES } from './types';
import type { Piece, Position } from './types';

interface JanggiPieceProps {
  piece: Piece;
  selected: boolean;
  isHint?: boolean;
  onClick: () => void;
}

// 韩国象棋棋子：圆形底盘 + 颜色字（红/蓝）
function JanggiPiece({ piece, selected, isHint = false, onClick }: JanggiPieceProps) {
  const isRed = piece.color === 'red';
  const pieceName = PIECE_NAMES[piece.color][piece.type];

  return (
    <motion.div
      className="relative w-full h-full cursor-pointer select-none"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {isHint && (
        <motion.div
          className="absolute -inset-1 rounded-full"
          style={{
            border: '3px solid #FFD700',
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.8), inset 0 0 15px rgba(255, 215, 0, 0.4)',
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [1, 0.6, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <div
        className={`absolute inset-0 rounded-full flex items-center justify-center font-bold transition-all duration-200 ${
          selected ? 'ring-4 ring-yellow-400 ring-opacity-80' : ''
        }`}
        style={{
          background: `
            radial-gradient(circle at 30% 30%,
              #FFFFF0 0%,
              #F5E6C8 40%,
              #E8D4A8 70%,
              #D4B896 100%)
          `,
          boxShadow: `
            inset 0 -4px 8px rgba(139, 69, 19, 0.3),
            inset 0 4px 8px rgba(255, 255, 255, 0.5),
            0 4px 12px rgba(0, 0, 0, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.2)
          `,
          // 红方红色字，蓝方蓝色字
          color: isRed ? '#B22222' : '#1E40AF',
          textShadow: isRed
            ? '1px 1px 2px rgba(178, 34, 34, 0.3)'
            : '1px 1px 2px rgba(30, 64, 175, 0.3)',
          fontSize: 'clamp(1rem, 5vw, 2rem)',
          border: isRed
            ? '2px solid rgba(178, 34, 34, 0.5)'
            : '2px solid rgba(30, 64, 175, 0.5)',
        }}
      >
        <span className="relative z-10" style={{ fontFamily: 'serif' }}>
          {pieceName}
        </span>
        <div
          className="absolute inset-1 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.8) 0%, transparent 50%)',
          }}
        />
      </div>
    </motion.div>
  );
}

export function JanggiBoard() {
  const {
    pieces,
    selectedPieceId,
    validMoves,
    selectPiece,
    movePiece,
    currentPlayer,
    hintMove,
    clearHint,
    showInvalidMove,
    gameStatus,
  } = useJanggiStore();

  const boardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(0);
  const [shakeBoard, setShakeBoard] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      if (boardRef.current && containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
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

  const padding = boardWidth * 0.05;
  const gridWidth = boardWidth - padding * 2;
  const cellSize = gridWidth / (BOARD_COLS - 1);
  const pieceSize = cellSize * 0.85;
  const minTouchSize = 44;
  const touchSize = Math.max(pieceSize, minTouchSize);
  const boardHeight = cellSize * (BOARD_ROWS - 1) + padding * 2;

  const getX = (col: number) => padding + col * cellSize;
  const getY = (row: number) => padding + row * cellSize;

  const handlePointClick = (col: number, row: number) => {
    if (hintMove) clearHint();

    const pieceAtPosition = pieces.find((p) => p.col === col && p.row === row);

    if (pieceAtPosition) {
      if (pieceAtPosition.color === currentPlayer) {
        selectPiece(pieceAtPosition.id);
      } else if (selectedPieceId) {
        const isValid = validMoves.some((m) => m.col === col && m.row === row);
        if (isValid) {
          movePiece(col, row);
        } else {
          triggerInvalidMove();
        }
      }
    } else if (selectedPieceId) {
      const isValid = validMoves.some((m) => m.col === col && m.row === row);
      if (isValid) {
        movePiece(col, row);
      } else {
        triggerInvalidMove();
      }
    } else {
      selectPiece(null);
    }
  };

  const triggerInvalidMove = () => {
    if (gameStatus !== 'playing') return;
    showInvalidMove('此位置不能走');
    setShakeBoard(true);
    setTimeout(() => setShakeBoard(false), 300);
  };

  const hasPieceAtPosition = (col: number, row: number): boolean => {
    return pieces.some((p) => p.col === col && p.row === row);
  };

  // 绘制棋盘网格线（含宫的 X 对角线）
  // 关键差异：无楚河汉界，所有竖线贯通
  const renderGridLines = () => {
    const lines = [];
    const h = cellSize * (BOARD_ROWS - 1);

    // 横线
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      lines.push(
        <line
          key={`h-${row}`}
          x1={padding}
          y1={getY(row)}
          x2={boardWidth - padding}
          y2={getY(row)}
          stroke="#8B4513"
          strokeWidth="1.5"
        />,
      );
    }

    // 竖线：全部贯通（无楚河汉界）
    for (let col = 0; col < BOARD_COLS; col += 1) {
      lines.push(
        <line
          key={`v-${col}`}
          x1={getX(col)}
          y1={padding}
          x2={getX(col)}
          y2={padding + h}
          stroke="#8B4513"
          strokeWidth="1.5"
        />,
      );
    }

    // 上宫 X 对角线：(3,0)-(5,2) 与 (5,0)-(3,2)
    lines.push(
      <line key="palace-top-1" x1={getX(3)} y1={getY(0)} x2={getX(5)} y2={getY(2)} stroke="#8B4513" strokeWidth="1.5" />,
      <line key="palace-top-2" x1={getX(5)} y1={getY(0)} x2={getX(3)} y2={getY(2)} stroke="#8B4513" strokeWidth="1.5" />,
    );

    // 下宫 X 对角线：(3,7)-(5,9) 与 (5,7)-(3,9)
    lines.push(
      <line key="palace-bot-1" x1={getX(3)} y1={getY(7)} x2={getX(5)} y2={getY(9)} stroke="#8B4513" strokeWidth="1.5" />,
      <line key="palace-bot-2" x1={getX(5)} y1={getY(7)} x2={getX(3)} y2={getY(9)} stroke="#8B4513" strokeWidth="1.5" />,
    );

    return lines;
  };

  const svgW = boardWidth;
  const svgH = boardHeight;

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <div
        ref={boardRef}
        className={`relative ${shakeBoard ? 'animate-shake' : ''}`}
        style={{ width: boardWidth || '100%', height: boardHeight || 'auto' }}
      >
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            background: `linear-gradient(135deg,
              #DEB887 0%,
              #D2A679 25%,
              #C4956A 50%,
              #D2A679 75%,
              #DEB887 100%)`,
            boxShadow: `
              inset 0 0 60px rgba(139, 69, 19, 0.3),
              0 10px 40px rgba(0, 0, 0, 0.4)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                repeating-linear-gradient(90deg,
                  transparent,
                  transparent 20px,
                  rgba(139, 69, 19, 0.1) 20px,
                  rgba(139, 69, 19, 0.1) 21px),
                repeating-linear-gradient(0deg,
                  transparent,
                  transparent 20px,
                  rgba(139, 69, 19, 0.1) 20px,
                  rgba(139, 69, 19, 0.1) 21px)`,
            }}
          />
        </div>

        {boardWidth > 0 && (
          <>
            <svg
              className="absolute inset-0 w-full h-full"
              width={svgW}
              height={svgH}
              viewBox={`0 0 ${svgW} ${svgH}`}
            >
              {renderGridLines()}
            </svg>

            {/* 点击区 */}
            {Array.from({ length: BOARD_COLS }).map((_, col) =>
              Array.from({ length: BOARD_ROWS }).map((_, row) => (
                <div
                  key={`point-${col}-${row}`}
                  className="absolute cursor-pointer"
                  style={{
                    left: getX(col) - touchSize / 2,
                    top: getY(row) - touchSize / 2,
                    width: touchSize,
                    height: touchSize,
                  }}
                  onClick={() => handlePointClick(col, row)}
                />
              )),
            )}

            {/* 合法走法提示 */}
            {validMoves.map((move: Position, idx: number) => {
              const hasPiece = hasPieceAtPosition(move.col, move.row);
              const cx = getX(move.col);
              const cy = getY(move.row);
              const dotSize = pieceSize * 0.3;

              return hasPiece ? (
                <motion.div
                  key={`valid-ring-${idx}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.05, 1], opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute rounded-full border-4 border-jade pointer-events-none"
                  style={{
                    left: cx - pieceSize / 2,
                    top: cy - pieceSize / 2,
                    width: pieceSize,
                    height: pieceSize,
                    boxShadow: '0 0 20px rgba(74, 124, 89, 0.5)',
                  }}
                />
              ) : (
                <motion.div
                  key={`valid-dot-${idx}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute rounded-full bg-jade pointer-events-none"
                  style={{
                    left: cx - dotSize / 2,
                    top: cy - dotSize / 2,
                    width: dotSize,
                    height: dotSize,
                    boxShadow: '0 0 15px rgba(74, 124, 89, 0.6)',
                  }}
                />
              );
            })}

            {/* 提示走法 */}
            {hintMove && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.15, 1], opacity: 1 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute rounded-full border-4 pointer-events-none"
                  style={{
                    left: getX(hintMove.from.col) - pieceSize / 2,
                    top: getY(hintMove.from.row) - pieceSize / 2,
                    width: pieceSize,
                    height: pieceSize,
                    borderColor: '#DAA520',
                    boxShadow: '0 0 25px rgba(218, 165, 32, 0.8), inset 0 0 15px rgba(218, 165, 32, 0.3)',
                  }}
                />
                {(() => {
                  const hasPiece = hasPieceAtPosition(hintMove.to.col, hintMove.to.row);
                  const cx = getX(hintMove.to.col);
                  const cy = getY(hintMove.to.row);
                  const dotSize = pieceSize * 0.35;
                  return hasPiece ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: [1, 1.1, 1], opacity: 1 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute rounded-full border-4 pointer-events-none"
                      style={{
                        left: cx - pieceSize / 2,
                        top: cy - pieceSize / 2,
                        width: pieceSize,
                        height: pieceSize,
                        borderColor: '#FFD700',
                        boxShadow: '0 0 25px rgba(255, 215, 0, 0.7)',
                      }}
                    />
                  ) : (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [1, 1.3, 1], opacity: 1 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        left: cx - dotSize / 2,
                        top: cy - dotSize / 2,
                        width: dotSize,
                        height: dotSize,
                        backgroundColor: '#FFD700',
                        boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
                      }}
                    />
                  );
                })()}
              </>
            )}

            {/* 棋子 */}
            <AnimatePresence mode="popLayout">
              {pieces.map((piece) => {
                const isHintPiece = hintMove !== null
                  && hintMove.from.col === piece.col
                  && hintMove.from.row === piece.row;
                return (
                  <motion.div
                    key={piece.id}
                    className="absolute"
                    style={{
                      left: getX(piece.col) - pieceSize / 2,
                      top: getY(piece.row) - pieceSize / 2,
                      width: pieceSize,
                      height: pieceSize,
                      zIndex: selectedPieceId === piece.id || isHintPiece ? 20 : 10,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    layout
                  >
                    <JanggiPiece
                      piece={piece}
                      selected={selectedPieceId === piece.id}
                      isHint={isHintPiece}
                      onClick={() => handlePointClick(piece.col, piece.row)}
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
