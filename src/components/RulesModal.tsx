import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PieceRule {
  name: string;
  redName: string;
  blackName: string;
  description: string[];
}

const pieceRules: PieceRule[] = [
  {
    name: '将/帅',
    redName: '帅',
    blackName: '将',
    description: [
      '在九宫格内活动，每步只能横走或竖走一格',
      '将与帅不能在同一条直线上直接相对（中间无子）',
      '是全军之主，被吃掉则输棋',
    ],
  },
  {
    name: '士/仕',
    redName: '仕',
    blackName: '士',
    description: [
      '在九宫格内活动，每步斜走一格',
      '是将/帅的贴身护卫，不能离开九宫',
    ],
  },
  {
    name: '象/相',
    redName: '相',
    blackName: '象',
    description: [
      '走"田"字，每次斜走两格',
      '不能过河（楚河汉界）',
      '"塞象眼"：田字中间有棋子时不能走',
    ],
  },
  {
    name: '马',
    redName: '马',
    blackName: '马',
    description: [
      '走"日"字，先横走一格再斜走一格',
      '"蹩马腿"：紧挨着的横/竖方向有棋子时不能走',
    ],
  },
  {
    name: '车',
    redName: '车',
    blackName: '车',
    description: [
      '横走或竖走，格数不限',
      '不能越过棋子走',
      '是棋盘中威力最大的棋子',
    ],
  },
  {
    name: '炮',
    redName: '炮',
    blackName: '炮',
    description: [
      '移动方式与车相同，横竖任意格，不能越子',
      '吃子时需要隔一个棋子（炮架）跳吃',
      '是唯一需要借助其他棋子吃子的棋子',
    ],
  },
  {
    name: '兵/卒',
    redName: '兵',
    blackName: '卒',
    description: [
      '未过河时只能向前走一格',
      '过河后可以向前或左右走一格',
      '不能后退',
    ],
  },
];

const winConditions = [
  {
    title: '将死',
    description: '一方的将/帅被对方将军，且无法化解（无处可走、无法垫将、无法吃将军子）',
  },
  {
    title: '困毙',
    description: '一方的将/帅虽未被将军，但所有棋子都无路可走',
  },
  {
    title: '认输',
    description: '一方主动认输，对方获胜',
  },
];

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="modal-content wood-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b-2 border-wood-dark/30">
              <h2 className="font-calligraphy text-3xl text-wood-dark">
                象棋规则
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-wood-dark/10 transition-colors text-wood-dark"
              >
                <X size={24} />
              </button>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto scrollbar-classic px-6 py-4">
              <section className="mb-6">
                <h3 className="font-calligraphy text-2xl text-vermilion mb-3">
                  棋子走法
                </h3>
                <div className="space-y-4">
                  {pieceRules.map((rule) => (
                    <div
                      key={rule.name}
                      className="bg-ivory/50 rounded-lg p-4 border border-wood-dark/20"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex gap-1">
                          <span
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                            style={{
                              background: 'radial-gradient(circle at 30% 30%, #FFFFF0, #E8D4A8)',
                              color: '#B22222',
                              border: '2px solid rgba(178, 34, 34, 0.4)',
                              fontFamily: 'serif',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            }}
                          >
                            {rule.redName}
                          </span>
                          <span
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                            style={{
                              background: 'radial-gradient(circle at 30% 30%, #FFFFF0, #E8D4A8)',
                              color: '#1a1a1a',
                              border: '2px solid rgba(26, 26, 26, 0.4)',
                              fontFamily: 'serif',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            }}
                          >
                            {rule.blackName}
                          </span>
                        </div>
                        <span className="font-serif-sc font-semibold text-wood-dark text-lg">
                          {rule.name}
                        </span>
                      </div>
                      <ul className="space-y-1 ml-2">
                        {rule.description.map((desc, i) => (
                          <li
                            key={i}
                            className="font-serif-sc text-wood-dark/80 text-sm flex gap-2"
                          >
                            <span className="text-jade">•</span>
                            <span>{desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-4">
                <h3 className="font-calligraphy text-2xl text-vermilion mb-3">
                  胜负条件
                </h3>
                <div className="space-y-3">
                  {winConditions.map((condition) => (
                    <div
                      key={condition.title}
                      className="bg-ivory/50 rounded-lg p-4 border border-wood-dark/20"
                    >
                      <h4 className="font-serif-sc font-bold text-wood-dark mb-1">
                        {condition.title}
                      </h4>
                      <p className="font-serif-sc text-wood-dark/80 text-sm">
                        {condition.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-calligraphy text-2xl text-vermilion mb-3">
                  基本规则
                </h3>
                <div className="bg-ivory/50 rounded-lg p-4 border border-wood-dark/20">
                  <ul className="space-y-2">
                    <li className="font-serif-sc text-wood-dark/80 text-sm flex gap-2">
                      <span className="text-jade">•</span>
                      <span>红方先行，双方轮流走棋</span>
                    </li>
                    <li className="font-serif-sc text-wood-dark/80 text-sm flex gap-2">
                      <span className="text-jade">•</span>
                      <span>每方每回合只能走一步棋</span>
                    </li>
                    <li className="font-serif-sc text-wood-dark/80 text-sm flex gap-2">
                      <span className="text-jade">•</span>
                      <span>棋子走到的位置如有对方棋子，可以吃掉对方棋子并占据该位置</span>
                    </li>
                    <li className="font-serif-sc text-wood-dark/80 text-sm flex gap-2">
                      <span className="text-jade">•</span>
                      <span>被将军时必须应将，不能走成被将军的状态</span>
                    </li>
                  </ul>
                </div>
              </section>
            </div>

            <div className="relative z-10 px-6 py-4 border-t-2 border-wood-dark/30 flex justify-end">
              <button onClick={onClose} className="seal-btn">
                知道了
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
