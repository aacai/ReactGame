import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string | null;
  type?: 'info' | 'success' | 'error' | 'warning';
}

export function Toast({ message, type = 'info' }: ToastProps) {
  const bgColors = {
    info: 'bg-gray-800',
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={`
            ${bgColors[type]}
            text-white px-6 py-3 rounded-lg shadow-lg
            font-medium text-sm
          `}>
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
