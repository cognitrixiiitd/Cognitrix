import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AchievementBadge from "./AchievementBadge";
import confetti from "canvas-confetti";

export default function AchievementNotification({ achievement, onClose }) {
  useEffect(() => {
    if (achievement) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full px-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-[#00a98d] p-6">
            <p className="text-center text-sm font-semibold text-[#00a98d] mb-4">
              🎉 Achievement Unlocked!
            </p>
            <AchievementBadge achievement={achievement} size="md" showPoints />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
