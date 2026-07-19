import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { ToastType } from '../store/gameStore';

interface ToastStyle {
  background: string;
  borderColor: string;
  shadow: string;
}

function getToastStyle(type: ToastType): ToastStyle {
  switch (type) {
    case 'error':
      return {
        background: 'linear-gradient(135deg, #8B0000 0%, #B22222 50%, #8B0000 100%)',
        borderColor: '#654321',
        shadow: '0 8px 32px rgba(178, 34, 34, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      };
    case 'success':
      return {
        background: 'linear-gradient(135deg, #2d5a3d 0%, #4A7C59 50%, #2d5a3d 100%)',
        borderColor: '#654321',
        shadow: '0 8px 32px rgba(74, 124, 89, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      };
    case 'warning':
      return {
        background: 'linear-gradient(135deg, #B8860B 0%, #DAA520 50%, #B8860B 100%)',
        borderColor: '#8B6914',
        shadow: '0 8px 32px rgba(218, 165, 32, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      };
    case 'info':
    default:
      return {
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
        borderColor: '#8B4513',
        shadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      };
  }
}

export function Toast() {
  const { invalidMoveMessage, toastMessage, toastType } = useGameStore();

  const displayMessage = invalidMoveMessage || toastMessage;
  const displayType: ToastType = invalidMoveMessage ? 'error' : toastType;
  const style = getToastStyle(displayType);

  return (
    <AnimatePresence>
      {displayMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div
            className="wood-panel px-6 py-3"
            style={{
              background: style.background,
              borderColor: style.borderColor,
              boxShadow: style.shadow,
            }}
          >
            <span
              className="font-calligraphy text-xl whitespace-nowrap"
              style={{
                color: '#FFFFF0',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
              }}
            >
              {displayMessage}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
