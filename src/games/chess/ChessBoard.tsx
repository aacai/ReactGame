// 国际象棋棋盘组件
// 8x8 黑白格棋盘（a-h, 1-8 标记）
// 棋子用 Unicode 国际象棋符号：白棋用白色描边，黑棋用黑色填充
// 选中高亮、可走位置圆点提示、可吃位置红圈
// 上次走棋高亮、王车易位、过路兵、升变（弹窗选择后/车/象/马）

import { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useChessStore } from './store';
import { BOARD_SIZE } from './rules';
import { PIECE_SYMBOLS } from './types';
import type { Piece, Position, PieceType } from './types';

interface ChessPieceProps {
  piece: Piece;
  selected: boolean;
  onClick: () => void;
}

// 国际象棋棋子：白棋用白色描边（边框为黑），黑棋用黑色填充
function ChessPieceView({ piece, selected, onClick }: ChessPieceProps) {
  const isWhite = piece.color === 'white';
  const symbol = PIECE_SYMBOLS[piece.color][piece.type];

  return (
    <motion.div
      className="relative w-full h-full cursor-pointer select-none"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
          selected ? 'drop-shadow-[0_0_8px_rgba(255,255,0,0.8)]' : ''
        }`}
        style={{
          fontSize: 'clamp(1.5rem, 7vw, 3rem)',
          lineHeight: 1,
          // 白棋：白填充 + 黑描边；黑棋：黑填充 + 白描边（增强对比度）
          color: isWhite ? '#ffffff' : '#1a1a1a',
          textShadow: isWhite
            ? '0 0 2px #000, 0 0 2px #000, 0 0 2px #000, 0 0 2px #000, 0 0 2px #000, 0 0 2px #000, 0 0 2px #000, 0 0 2px #000, 1px 1px 1px rgba(0,0,0,0.5)'
            : '0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff, 1px 1px 1px rgba(255,255,255,0.3)',
          filter: selected ? 'drop-shadow(0 0 4px gold)' : 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
        }}
      >
        <span className="relative z-10">{symbol}</span>
      </div>
    </motion.div>
  );
}

// 升变弹窗：选择升变类型（后/车/象/马）
function PromotionModal() {
  const { pendingPromotion, completePromotion } = useChessStore();

  const options: { type: PieceType; label: string; symbol: string }[] = [
    { type: 'queen', label: '后', symbol: '♕' },
    { type: 'rook', label: '车', symbol: '♖' },
    { type: 'bishop', label: '象', symbol: '♗' },
    { type: 'knight', label: '马', symbol: '♘' },
  ];

  return (
    <AnimatePresence>
      {pendingPromotion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="wood-panel p-6 max-w-sm w-full text-center"
          >
            <div className="relative z-10">
              <h3 className="font-calligraphy text-2xl text-wood-dark mb-2">升变</h3>
              <p className="font-serif-sc text-wood-dark/70 mb-4 text-sm">选择升变为哪种棋子</p>
              <div className="grid grid-cols-4 gap-2">
                {options.map((opt) => (
                  <motion.button
                    key={opt.type}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => completePromotion(opt.type)}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg, #FFFFF0, #E8D4A8)',
                      border: '2px solid #8B4513',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}
                  >
                    <span
                      className="text-4xl"
                      style={{
                        color: '#1a1a1a',
                        textShadow: '0 0 1px #000',
                        lineHeight: 1,
                      }}
                    >
                      {opt.symbol}
                    </span>
                    <span className="font-serif-sc text-xs text-wood-dark mt-1">{opt.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ChessBoard() {
  const {
    pieces,
    selectedPieceId,
    validMoves,
    selectPiece,
    movePiece,
    currentPlayer,
    lastMove,
    inCheck,
    gameStatus,
  } = useChessStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(0);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        // 棋盘为正方形
        const size = Math.min(containerWidth, containerHeight);
        setBoardWidth(size);
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

  // 找到被将军的王位置
  const checkedKingPos: Position | null = (() => {
    if (!inCheck || gameStatus !== 'playing') return null;
    const king = pieces.find((p) => p.type === 'king' && p.color === currentPlayer);
    return king ? { col: king.col, row: king.row } : null;
  })();

  // 文件标记 a-h
  const fileLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  // 等级标记 1-8（row 0 -> 8，row 7 -> 1）
  const rankLabel = (row: number) => String(8 - row);

  const handleSquareClick = (col: number, row: number) => {
    if (gameStatus !== 'playing') return;

    const pieceAtPosition = pieces.find((p) => p.col === col && p.row === row);

    if (pieceAtPosition) {
      if (pieceAtPosition.color === currentPlayer) {
        selectPiece(pieceAtPosition.id);
      } else if (selectedPieceId) {
        const isValid = validMoves.some((m) => m.col === col && m.row === row);
        if (isValid) {
          movePiece(col, row);
        } else {
          selectPiece(null);
        }
      }
    } else if (selectedPieceId) {
      const isValid = validMoves.some((m) => m.col === col && m.row === row);
      if (isValid) {
        movePiece(col, row);
      } else {
        selectPiece(null);
      }
    } else {
      selectPiece(null);
    }
  };

  const hasPieceAtPosition = (col: number, row: number): boolean => {
    return pieces.some((p) => p.col === col && p.row === row);
  };

  // 是否为白格：(col + row) 为偶数时为白格
  const isLightSquare = (col: number, row: number): boolean => (col + row) % 2 === 0;

  // 显示用：白方在下（row 7 在最下），所以正常遍历 row 0 -> 7（从上到下）
  // 棋盘从上到下依次是 row 0..row 7（对应黑方第一排到白方第一排）

  return (
    <div ref={containerRef} className="w-full flex items-center justify-center" style={{ minHeight: '300px' }}>
      <div
        className="relative flex flex-col items-center"
        style={{ width: boardWidth || '100%' }}
      >
        {/* 棋盘主体 + 标签 */}
        <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
          {/* 等级标签（左侧） */}
          <div className="absolute -left-5 top-0 bottom-0 flex flex-col justify-around" style={{ width: '16px' }}>
            {Array.from({ length: BOARD_SIZE }).map((_, idx) => (
              <div
                key={`rank-${idx}`}
                className="flex items-center justify-center font-serif-sc text-wood-light/60 text-xs"
              >
                {rankLabel(idx)}
              </div>
            ))}
          </div>

          {/* 文件标签（底部） */}
          <div className="absolute -bottom-5 left-0 right-0 flex justify-around" style={{ height: '16px' }}>
            {fileLabels.map((label) => (
              <div
                key={`file-${label}`}
                className="flex items-center justify-center font-serif-sc text-wood-light/60 text-xs"
              >
                {label}
              </div>
            ))}
          </div>

          {/* 棋盘格子 */}
          <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}>
            {Array.from({ length: BOARD_SIZE }).map((_, rowIdx) =>
              Array.from({ length: BOARD_SIZE }).map((_, colIdx) => {
                const isLight = isLightSquare(colIdx, rowIdx);
                const isSelected = pieces.some(
                  (p) => p.id === selectedPieceId && p.col === colIdx && p.row === rowIdx
                );
                const isValidMove = validMoves.some((m) => m.col === colIdx && m.row === rowIdx);
                const hasPiece = hasPieceAtPosition(colIdx, rowIdx);
                const isCaptureTarget = isValidMove && hasPiece;
                const isLastMoveFrom = lastMove && lastMove.from.col === colIdx && lastMove.from.row === rowIdx;
                const isLastMoveTo = lastMove && lastMove.to.col === colIdx && lastMove.to.row === rowIdx;
                const isCheckedKing = checkedKingPos !== null && checkedKingPos.col === colIdx && checkedKingPos.row === rowIdx;

                return (
                  <div
                    key={`sq-${colIdx}-${rowIdx}`}
                    className="relative cursor-pointer"
                    style={{
                      backgroundColor: isCheckedKing
                        ? '#ff6b6b'
                        : isSelected
                        ? '#f7ec74'
                        : isLastMoveFrom || isLastMoveTo
                        ? (isLight ? '#f5e86a' : '#d4b04a')
                        : isLight
                        ? '#f0d9b5'
                        : '#b58863',
                      boxShadow: isCheckedKing
                        ? 'inset 0 0 0 3px #c92a2a, 0 0 12px rgba(255, 80, 80, 0.7)'
                        : 'inset 0 0 0 0.5px rgba(0,0,0,0.1)',
                    }}
                    onClick={() => handleSquareClick(colIdx, rowIdx)}
                  >
                    {/* 可走位置圆点提示（空格） */}
                    {isValidMove && !isCaptureTarget && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: '30%',
                          height: '30%',
                          left: '35%',
                          top: '35%',
                          backgroundColor: 'rgba(50, 50, 50, 0.35)',
                        }}
                      />
                    )}

                    {/* 可吃位置红圈 */}
                    {isCaptureTarget && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: '90%',
                          height: '90%',
                          left: '5%',
                          top: '5%',
                          border: '4px solid #e74c3c',
                          boxShadow: '0 0 8px rgba(231, 76, 60, 0.6)',
                        }}
                      />
                    )}

                    {/* 棋子 */}
                    {pieces
                      .filter((p) => p.col === colIdx && p.row === rowIdx)
                      .map((piece) => (
                        <motion.div
                          key={piece.id}
                          className="absolute"
                          style={{
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: selectedPieceId === piece.id ? 20 : 10,
                          }}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          layout
                        >
                          <ChessPieceView
                            piece={piece}
                            selected={selectedPieceId === piece.id}
                            onClick={() => handleSquareClick(piece.col, piece.row)}
                          />
                        </motion.div>
                      ))}
                  </div>
                );
              }),
            )}
          </div>
        </div>

        <PromotionModal />
      </div>
    </div>
  );
}
