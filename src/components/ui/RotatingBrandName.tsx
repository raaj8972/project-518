import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const languages = [
  { text: 'RICORRENZA', font: 'stranger-things-text' },
  { text: 'রিকোরেনজা', font: 'bengali-text' },
  { text: 'रिकोरेंज़ा', font: 'hindi-text' },
];

export const RotatingBrandName: React.FC<{ year?: string | number }> = ({ year }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % languages.length);
    }, 4000); // Change every 4 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-10 md:h-14 flex items-center justify-center overflow-visible perspective-1000">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ rotateX: -90, opacity: 0, y: 20 }}
          animate={{ rotateX: 0, opacity: 1, y: 0 }}
          exit={{ rotateX: 90, opacity: 0, y: -20 }}
          transition={{ 
            duration: 0.8, 
            ease: [0.4, 0, 0.2, 1],
            opacity: { duration: 0.4 }
          }}
          className="flex items-center space-x-2 md:space-x-4"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <span className={`text-xl sm:text-2xl md:text-4xl font-black tracking-wider leading-none whitespace-nowrap transition-all duration-500 ${languages[index].font}`}>
            {languages[index].text}
          </span>
          {year && (
            <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider leading-none stranger-things-text opacity-80">
              {year}
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .bengali-text {
          font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif;
          background: linear-gradient(45deg, #ff0000, #990000, #ff0000);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 4s ease-in-out infinite;
          text-shadow: 0 0 15px rgba(255, 0, 0, 0.4);
          letter-spacing: 0.05em;
        }

        .hindi-text {
          font-family: 'Poppins', 'Noto Sans Devanagari', sans-serif;
          background: linear-gradient(45deg, #ff0000, #990000, #ff0000);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 4s ease-in-out infinite;
          text-shadow: 0 0 15px rgba(255, 0, 0, 0.4);
          letter-spacing: 0.05em;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
};

export default RotatingBrandName;
