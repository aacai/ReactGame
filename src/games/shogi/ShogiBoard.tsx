// 日本将棋棋盘组件
// 9x9 棋盘，木质背景，棋子落在方格内（非交叉点）
// 棋子五角形（屋顶形）：先手 sente 尖端朝上，后手 gote 整体旋转 180°（尖端朝下）
// 棋子文字：王/飛/角/金/銀/桂/香/歩，升变后：龍/馬/全/圭/杏/と
// 持驹区：棋盘上下两侧显示双方持驹，点击进入打入模式
// 升变弹窗：store.pendingPromotion 不为空时弹出，让玩家选择升变/不升变

import { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useShogiStore } from './store';
import { BOARD_COLS, BOARD_ROWS } from './rules';
import { PIECE_NAMES, PROMOTED_NAMES } from './types';
import type { Piece, PieceColor, PieceType, Position } from './types';

// 五角形（屋顶形）clip-path：尖端朝上
const PENTAGON_CLIP = 'polygon(50% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%)';

// 持驹显示顺序（按价值从高到低）
const HAND_ORDER: PieceType[] = ['rook', 'bishop', 'gold', 'silver', 'knight', 'lance', 'pawn'];

// ========== 棋子组件 ==========
interface ShogiPieceProps {
  piece: Piece;
  selected: boolean;
  isLastMove: boolean;
  onClick: () => void;
  size: number;
}

function ShogiPiece({ piece, selected, isLastMove, onClick, size }: ShogiPieceProps) {
  const isSente = piece.color === 'sente';
  // 后手 gote 整体旋转 180°，使尖端朝下、文字倒置（对手视角可读）
  const rotation = isSente ? 0 : 180;
  // 文字：未升变显示基础名，升变后显示升变名
  const text = piece.promoted ? PROMOTED_NAMES[piece.type] : PIECE_NAMES[piece.type];

  return (
    <motion.div
      className="absolute cursor-pointer select-none"
      style={{
        left: 0,
        top: 0,
        width: size,
        height: size,
        // 选中时抬高 z-index，确保不被遮挡
        zIndex: selected ? 20 : 10,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      layout
      onClick={onClick}
    >
      <div
        className="relative w-full h-full"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* 选中高亮 */}
        {selected && (
          <div
            className="absolute -inset-1 rounded-md"
            style={{
              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.45) 0%, transparent 70%)',
              boxShadow: '0 0 18px rgba(255, 215, 0, 0.8)',
            }}
          />
        )}
        {/* 最后一手高亮 */}
        {isLastMove && !selected && (
          <div
            className="absolute -inset-0.5 rounded-md"
            style={{
              background: 'radial-gradient(circle, rgba(255, 165, 0, 0.3) 0%, transparent 70%)',
            }}
          />
        )}
        {/* 五角形棋子主体 */}
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{
            clipPath: PENTAGON_CLIP,
            background: `
              linear-gradient(180deg,
                #F5E6C8 0%,
                #E8D4A8 40%,
                #D4B896 100%)
            `,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(139, 69, 19, 0.4)',
          }}
        >
          {/* 升变后棋子文字用红色，未升变用黑色（传统将棋习惯） */}
          <span
            className="relative z-10 font-bold leading-none"
            style={{
              fontFamily: "'Noto Serif SC', serif",
              fontSize: size * 0.5,
              color: piece.promoted ? '#8B0000' : '#1a1a1a',
              textShadow: '0 1px 1px rgba(255, 255, 255, 0.5)',
            }}
          >
            {text}
          </span>
          {/* 顶部高光，增加立体感 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              clipPath: PENTAGON_CLIP,
              background:
                'linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, transparent 35%)',
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ========== 持驹区组件 ==========
interface HandAreaProps {
  color: PieceColor;
  // 持驹点击：进入打入模式；同一类型再次点击：取消
  onSelect: (type: PieceType | null) => void;
  selectedType: PieceType | null;
  pieceSize: number;
}

function HandArea({ color, onSelect, selectedType, pieceSize }: HandAreaProps) {
  const hand = useShogiStore((s) => s.hand);
  const pieces = hand[color];

  const isSente = color === 'sente';
  const label = isSente ? '先手' : '后手';
  // 后手持驹整体旋转 180°，使文字朝向其玩家视角
  const rotation = isSente ? 0 : 180;

  return (
    <div
      className="wood-panel rounded-lg p-2 flex items-center gap-2 min-h-[44px]"
      style={{ background: 'linear-gradient(135deg, #DEB887 0%, #C4956A 100%)' }}
    >
      <span
        className="font-calligraphy text-sm shrink-0"
        style={{ color: '#5a3a1a', transform: `rotate(${rotation}deg)` }}
      >
        {label}
      </span>
      {pieces.length === 0 ? (
        <span
          className="font-serif-sc text-xs px-2"
          style={{ color: 'rgba(90, 58, 26, 0.5)', transform: `rotate(${rotation}deg)` }}
        >
          无持驹
        </span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {HAND_ORDER.flatMap((type) => {
            const entry = pieces.find((p) => p.type === type);
            if (!entry || entry.count <= 0) return [];
            const isSelected = selectedType === type;
            return [
              <motion.button
                key={`hand-${color}-${type}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(isSelected ? null : type)}
                className="relative rounded-md"
                style={{
                  width: pieceSize,
                  height: pieceSize,
                  padding: 0,
                  border: isSelected
                    ? '2px solid #FFD700'
                    : '2px solid rgba(139, 69, 19, 0.3)',
                  background: isSelected
                    ? 'rgba(255, 215, 0, 0.25)'
                    : 'rgba(255, 255, 240, 0.4)',
                }}
              >
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <span
                    className="font-bold leading-none"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      fontSize: pieceSize * 0.5,
                      color: '#1a1a1a',
                    }}
                  >
                    {PIECE_NAMES[type]}
                  </span>
                </div>
                {entry.count > 1 && (
                  <span
                    className="absolute -top-1 -right-1 rounded-full px-1 text-xs font-bold"
                    style={{
                      background: '#B22222',
                      color: '#FFFFF0',
                      fontSize: 10,
                      minWidth: 16,
                      textAlign: 'center',
                    }}
                  >
                    {entry.count}
                  </span>
                )}
              </motion.button>,
            ];
          })}
        </div>
      )}
    </div>
  );
}

// ========== 升变弹窗 ==========
function PromotionDialog() {
  const pendingPromotion = useShogiStore((s) => s.pendingPromotion);
  const confirmPromotion = useShogiStore((s) => s.confirmPromotion);
  const pieces = useShogiStore((s) => s.pieces);

  if (!pendingPromotion) return null;

  // 找到正在移动的棋子（在 from 位置）
  const mover = pieces.find(
    (p) => p.col === pendingPromotion.from.col && p.row === pendingPromotion.from.row,
  );
  const pieceName = mover ? PIECE_NAMES[mover.type] : '棋子';
  const promotedName = mover ? PROMOTED_NAMES[mover.type] : '升变';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 220 }}
          className="wood-panel p-6 max-w-sm w-full text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative z-10">
            <h3 className="font-calligraphy text-2xl text-wood-dark mb-2">是否升变？</h3>
            <p className="font-serif-sc text-wood-dark/70 text-sm mb-5">
              {pieceName} → {promotedName}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => confirmPromotion(true)}
                className="seal-btn flex-1 py-3"
              >
                升变
              </button>
              <button
                onClick={() => confirmPromotion(false)}
                className="seal-btn seal-btn-secondary flex-1 py-3"
              >
                不升变
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ========== 主棋盘组件 ==========
export function ShogiBoard() {
  const {
    pieces,
    selectedPieceId,
    validMoves,
    selectedHandType,
    validDropSquares,
    selectPiece,
    selectHandPiece,
    movePiece,
    dropPiece,
    currentPlayer,
    gameStatus,
    isAIThinking,
    pendingPromotion,
    lastMove,
  } = useShogiStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(0);

  // 监听容器尺寸，按短边计算正方形棋盘大小
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        // 容器高度可能为 0（父级未给明确高度时），此时退化为使用宽度
        const size = height > 0 ? Math.min(width, height) : width;
        setBoardSize(size);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', updateSize);
      observer.disconnect();
    };
  }, []);

  // 棋盘尺寸划分：9 个方格 + 外边距
  const padding = boardSize * 0.02;
  const gridSize = boardSize - padding * 2;
  const cellSize = gridSize / BOARD_COLS;
  const pieceSize = cellSize * 0.85;
  const touchSize = Math.max(pieceSize, 36);

  // 棋子中心坐标（方格中心）
  const getX = (col: number) => padding + col * cellSize + cellSize / 2;
  const getY = (row: number) => padding + row * cellSize + cellSize / 2;

  // 点击处理：合并棋子选择、走棋、打入逻辑
  const handleSquareClick = (col: number, row: number) => {
    if (gameStatus !== 'playing') return;
    if (pendingPromotion) return; // 升变弹窗显示中，禁止操作
    if (isAIThinking) return;

    const pieceAt = pieces.find((p) => p.col === col && p.row === row);

    // 打入模式优先：选中持驹时点击空格执行打入
    if (selectedHandType) {
      const validDrop = validDropSquares.some((s) => s.col === col && s.row === row);
      if (validDrop) {
        dropPiece(col, row);
      } else if (pieceAt && pieceAt.color === currentPlayer) {
        // 切换到选子模式
        selectPiece(pieceAt.id);
      } else {
        // 取消打入
        selectHandPiece(null);
      }
      return;
    }

    // 选子模式
    if (pieceAt) {
      if (pieceAt.color === currentPlayer) {
        // 点击己方棋子：切换选择（同一棋子则取消）
        selectPiece(selectedPieceId === pieceAt.id ? null : pieceAt.id);
      } else if (selectedPieceId) {
        // 点击对方棋子：若在可走位置则吃子
        const isValid = validMoves.some((m) => m.col === col && m.row === row);
        if (isValid) {
          movePiece(col, row);
        }
      }
    } else if (selectedPieceId) {
      // 点击空格：若在可走位置则移动
      const isValid = validMoves.some((m) => m.col === col && m.row === row);
      if (isValid) {
        movePiece(col, row);
      } else {
        // 无效位置取消选择
        selectPiece(null);
      }
    }
  };

  // 绘制 9x9 网格线（将棋方格线，非交叉点）
  const renderGridLines = () => {
    const lines = [];
    // 横线
    for (let row = 0; row <= BOARD_ROWS; row += 1) {
      lines.push(
        <line
          key={`h-${row}`}
          x1={padding}
          y1={padding + row * cellSize}
          x2={boardSize - padding}
          y2={padding + row * cellSize}
          stroke="#5a3a1a"
          strokeWidth="1.2"
        />,
      );
    }
    // 竖线
    for (let col = 0; col <= BOARD_COLS; col += 1) {
      lines.push(
        <line
          key={`v-${col}`}
          x1={padding + col * cellSize}
          y1={padding}
          x2={padding + col * cellSize}
          y2={boardSize - padding}
          stroke="#5a3a1a"
          strokeWidth="1.2"
        />,
      );
    }
    // 升变区边界加粗（row 2-3 与 row 5-6 之间，即对方三段与己方三段边界）
    // 第 3 横线（row=3）与第 6 横线（row=6）画粗线
    [3, 6].forEach((row) => {
      lines.push(
        <line
          key={`zone-${row}`}
          x1={padding}
          y1={padding + row * cellSize}
          x2={boardSize - padding}
          y2={padding + row * cellSize}
          stroke="#5a3a1a"
          strokeWidth="2"
        />,
      );
    });
    return lines;
  };

  // 判断某格是否最后一手的目标格
  const isLastMoveSquare = (col: number, row: number): boolean => {
    if (!lastMove) return false;
    return lastMove.to.col === col && lastMove.to.row === row;
  };

  // 判断某格是否可走位置（含吃子和移动）
  const isValidMoveSquare = (col: number, row: number): boolean => {
    return validMoves.some((m) => m.col === col && m.row === row);
  };

  // 判断某格是否可打入位置
  const isValidDropSquare = (col: number, row: number): boolean => {
    return validDropSquares.some((s) => s.col === col && s.row === row);
  };

  const handPieceSize = Math.min(pieceSize * 0.9, 36);

  return (
    <div className="w-full h-full flex flex-col items-center gap-2">
      {/* 后手持驹（上方） */}
      <div className="w-full" style={{ maxWidth: boardSize }}>
        <HandArea
          color="gote"
          onSelect={selectHandPiece}
          selectedType={selectedHandType}
          pieceSize={handPieceSize}
        />
      </div>

      {/* 棋盘主体 */}
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center"
        style={{ flex: 1, minHeight: 0 }}
      >
        <div
          className="relative"
          style={{
            width: boardSize || '100%',
            height: boardSize || 'auto',
          }}
        >
          {/* 木质背景 */}
          <div
            className="absolute inset-0 rounded-md overflow-hidden"
            style={{
              background: `linear-gradient(135deg,
                #DEB887 0%,
                #D2A679 25%,
                #C4956A 50%,
                #D2A679 75%,
                #DEB887 100%)`,
              boxShadow:
                'inset 0 0 40px rgba(139, 69, 19, 0.25), 0 8px 24px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* 木纹纹理 */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(90deg,
                    transparent,
                    transparent 18px,
                    rgba(139, 69, 19, 0.12) 18px,
                    rgba(139, 69, 19, 0.12) 19px),
                  repeating-linear-gradient(0deg,
                    transparent,
                    transparent 18px,
                    rgba(139, 69, 19, 0.12) 18px,
                    rgba(139, 69, 19, 0.12) 19px)
                `,
              }}
            />
          </div>

          {boardSize > 0 && (
            <>
              {/* 网格线 */}
              <svg
                className="absolute inset-0 w-full h-full"
                width={boardSize}
                height={boardSize}
                viewBox={`0 0 ${boardSize} ${boardSize}`}
              >
                {renderGridLines()}
              </svg>

              {/* 点击区（每个方格一个透明 div） */}
              {Array.from({ length: BOARD_COLS }).map((_, col) =>
                Array.from({ length: BOARD_ROWS }).map((_, row) => (
                  <div
                    key={`cell-${col}-${row}`}
                    className="absolute cursor-pointer"
                    style={{
                      left: padding + col * cellSize,
                      top: padding + row * cellSize,
                      width: cellSize,
                      height: cellSize,
                    }}
                    onClick={() => handleSquareClick(col, row)}
                  />
                )),
              )}

              {/* 可走/可吃位置提示 */}
              <AnimatePresence>
                {validMoves.map((move: Position, idx: number) => {
                  const hasPiece = pieces.some(
                    (p) => p.col === move.col && p.row === move.row,
                  );
                  const cx = getX(move.col);
                  const cy = getY(move.row);
                  return hasPiece ? (
                    // 吃子提示：方格边框
                    <motion.div
                      key={`vm-${idx}`}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      className="absolute pointer-events-none rounded-md border-4"
                      style={{
                        left: cx - cellSize / 2,
                        top: cy - cellSize / 2,
                        width: cellSize,
                        height: cellSize,
                        borderColor: '#dc2626',
                        boxShadow: '0 0 12px rgba(220, 38, 38, 0.6)',
                      }}
                    />
                  ) : (
                    // 移动提示：中心圆点
                    <motion.div
                      key={`vm-${idx}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 0.7 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute pointer-events-none rounded-full"
                      style={{
                        left: cx - cellSize * 0.18,
                        top: cy - cellSize * 0.18,
                        width: cellSize * 0.36,
                        height: cellSize * 0.36,
                        background: 'radial-gradient(circle, #16a34a 0%, #15803d 100%)',
                        boxShadow: '0 0 10px rgba(34, 197, 94, 0.6)',
                      }}
                    />
                  );
                })}
              </AnimatePresence>

              {/* 可打入位置提示（与可走位置区分，用蓝色方框） */}
              <AnimatePresence>
                {validDropSquares.map((sq: Position, idx: number) => (
                  <motion.div
                    key={`vd-${idx}`}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.55 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    className="absolute pointer-events-none rounded-md border-4"
                    style={{
                      left: getX(sq.col) - cellSize / 2,
                      top: getY(sq.row) - cellSize / 2,
                      width: cellSize,
                      height: cellSize,
                      borderColor: '#2563eb',
                      boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
                    }}
                  />
                ))}
              </AnimatePresence>

              {/* 棋子 */}
              <AnimatePresence mode="popLayout">
                {pieces.map((piece) => {
                  const isSelected = selectedPieceId === piece.id;
                  const isLast = isLastMoveSquare(piece.col, piece.row);
                  return (
                    <motion.div
                      key={piece.id}
                      className="absolute"
                      style={{
                        left: getX(piece.col) - pieceSize / 2,
                        top: getY(piece.row) - pieceSize / 2,
                        width: pieceSize,
                        height: pieceSize,
                        zIndex: isSelected ? 20 : 10,
                      }}
                    >
                      <ShogiPiece
                        piece={piece}
                        selected={isSelected}
                        isLastMove={isLast}
                        size={pieceSize}
                        onClick={() => handleSquareClick(piece.col, piece.row)}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      {/* 先手持驹（下方） */}
      <div className="w-full" style={{ maxWidth: boardSize }}>
        <HandArea
          color="sente"
          onSelect={selectHandPiece}
          selectedType={selectedHandType}
          pieceSize={handPieceSize}
        />
      </div>

      {/* 升变弹窗 */}
      <PromotionDialog />
    </div>
  );
}
