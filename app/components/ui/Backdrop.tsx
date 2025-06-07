import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BackdropProps {
  isOpen: boolean;
  onClose: () => void;
  blur?: boolean;
}

export function Backdrop({ isOpen, onClose, blur = true }: BackdropProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when backdrop is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 z-40 ${
            blur ? 'backdrop-blur-sm bg-black/30' : 'bg-black/30'
          }`}
          onClick={onClose}
        />
      )}
    </AnimatePresence>
  );
}
