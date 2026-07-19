// 地图视图：10 节点直线排列

import { motion } from 'framer-motion';
import type { MapNode, MapNodeType } from '../types';

// 节点类型图标
const NODE_ICONS: Record<MapNodeType, string> = {
  combat: '⚔️',
  rest: '🔥',
  shop: '🏪',
  boss: '👹',
};

// 节点类型名称
const NODE_NAMES: Record<MapNodeType, string> = {
  combat: '战斗',
  rest: '篝火',
  shop: '商店',
  boss: 'Boss',
};

interface MapViewProps {
  nodes: MapNode[];
  currentNodeIndex: number;
  onEnterNode: (nodeId: string) => void;
}

export function MapView({ nodes, currentNodeIndex, onEnterNode }: MapViewProps) {
  // 按索引倒序展示（从上到下：Boss 在顶 / 起点在底）
  const sortedNodes = [...nodes].sort((a, b) => b.index - a.index);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: 20,
        position: 'relative',
      }}
    >
      {sortedNodes.map((node) => {
        const isCurrent = node.index === currentNodeIndex;
        const isNext = node.index === currentNodeIndex + 1;
        const isCompleted = node.completed;
        const isLocked = !isCurrent && !isNext && !isCompleted && node.index > currentNodeIndex;
        const isPast = node.index < currentNodeIndex;

        return (
          <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* 节点序号 */}
            <div
              style={{
                width: 24,
                textAlign: 'center',
                color: isCompleted ? '#6b7280' : '#a855f7',
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 12,
              }}
            >
              {node.index + 1}
            </div>

            {/* 节点按钮 */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: node.index * 0.05 }}
              whileHover={isNext ? { scale: 1.05 } : {}}
              whileTap={isNext ? { scale: 0.95 } : {}}
              onClick={isNext ? () => onEnterNode(node.id) : undefined}
              style={{
                width: 200,
                padding: '12px 16px',
                background: isCurrent
                  ? 'linear-gradient(135deg, #4c1d95, #1a0b2e)'
                  : isCompleted
                  ? 'linear-gradient(135deg, #2a2a2a, #1a1a1a)'
                  : isLocked
                  ? 'linear-gradient(135deg, #1a1a2e, #0f0f1a)'
                  : 'linear-gradient(135deg, #1a0b2e, #0f0820)',
                border: `2px solid ${
                  isCurrent ? '#fbbf24' : isNext ? '#a855f7' : isCompleted ? '#4a4a4a' : '#333'
                }`,
                borderRadius: 10,
                boxShadow: isCurrent
                  ? '0 0 20px #fbbf24, 0 0 40px #fbbf2480'
                  : isNext
                  ? '0 0 12px #a855f780'
                  : 'none',
                cursor: isNext ? 'pointer' : 'default',
                opacity: isLocked ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: isCompleted ? '#9a9a9a' : '#e9d5ff',
                fontFamily: 'Noto Serif SC, serif',
                position: 'relative',
                animation: isCurrent ? 'pulse 2s ease-in-out infinite' : undefined,
              }}
            >
              <span style={{ fontSize: 24, filter: isCompleted ? 'grayscale(0.7)' : 'none' }}>
                {NODE_ICONS[node.type]}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {NODE_NAMES[node.type]}
              </span>
              {isCompleted && (
                <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 14 }}>✓</span>
              )}
              {isCurrent && !isCompleted && (
                <span style={{ marginLeft: 'auto', color: '#fbbf24', fontSize: 11 }}>你在此</span>
              )}
            </motion.button>

            {/* 连接线（除最后一个节点外） */}
            <div style={{ width: 24, textAlign: 'center' }}>
              {node.index > 0 && (
                <div
                  style={{
                    width: 2,
                    height: 20,
                    background: isPast || isCurrent
                      ? 'linear-gradient(180deg, #a855f7, #4c1d95)'
                      : '#333',
                    margin: '0 auto',
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
