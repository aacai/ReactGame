import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md max-h-[80vh] bg-gray-800 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">游戏规则</h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </motion.button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4 text-gray-300 text-sm">
              <section>
                <h3 className="text-yellow-400 font-bold mb-2">游戏简介</h3>
                <p>斗地主是一种三人扑克牌游戏，使用一副54张牌（包括大小王）。一人为地主，另外两人为农民，双方对战，先出完牌的一方获胜。</p>
              </section>

              <section>
                <h3 className="text-yellow-400 font-bold mb-2">发牌</h3>
                <p>三人每人发17张牌，剩余3张为底牌。叫地主后，底牌归地主所有。</p>
              </section>

              <section>
                <h3 className="text-yellow-400 font-bold mb-2">叫地主</h3>
                <p>玩家可以选择叫1分、2分、3分或不叫。分数最高者成为地主。叫3分直接成为地主。三人都不叫则重新发牌。</p>
              </section>

              <section>
                <h3 className="text-yellow-400 font-bold mb-2">牌型说明</h3>
                <div className="space-y-1">
                  <p><span className="text-white font-medium">单张：</span>任意一张牌</p>
                  <p><span className="text-white font-medium">对子：</span>两张相同点数的牌</p>
                  <p><span className="text-white font-medium">三张：</span>三张相同点数的牌</p>
                  <p><span className="text-white font-medium">三带一：</span>三张 + 一张单牌</p>
                  <p><span className="text-white font-medium">三带二：</span>三张 + 一个对子</p>
                  <p><span className="text-white font-medium">顺子：</span>五张或更多连续的单牌（不包括2和王）</p>
                  <p><span className="text-white font-medium">连对：</span>三对或更多连续的对子</p>
                  <p><span className="text-white font-medium">飞机：</span>两个或更多连续的三张</p>
                  <p><span className="text-white font-medium">飞机带单：</span>飞机 + 对应数量的单牌</p>
                  <p><span className="text-white font-medium">飞机带双：</span>飞机 + 对应数量的对子</p>
                  <p><span className="text-white font-medium">四带二：</span>四张 + 两张单牌或两个对子</p>
                  <p><span className="text-red-400 font-medium">炸弹：</span>四张相同点数的牌</p>
                  <p><span className="text-red-400 font-medium">王炸：</span>大王 + 小王，最大的牌型</p>
                </div>
              </section>

              <section>
                <h3 className="text-yellow-400 font-bold mb-2">出牌规则</h3>
                <p>地主先出牌。玩家可以选择出比上家大的牌，或者选择"不出"。连续两人不出后，最后出牌的人可以重新出任意牌型。</p>
              </section>

              <section>
                <h3 className="text-yellow-400 font-bold mb-2">大小比较</h3>
                <p>大王 &gt; 小王 &gt; 2 &gt; A &gt; K &gt; Q &gt; J &gt; 10 &gt; 9 &gt; 8 &gt; 7 &gt; 6 &gt; 5 &gt; 4 &gt; 3</p>
                <p className="mt-1">炸弹大于除王炸外的任何牌型。王炸是最大的牌型。</p>
              </section>

              <section>
                <h3 className="text-yellow-400 font-bold mb-2">胜负判定</h3>
                <p>地主先出完牌，地主胜；任意一个农民先出完牌，农民胜。</p>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
