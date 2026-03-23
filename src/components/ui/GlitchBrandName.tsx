import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const languages = [
  { text: 'RICORRENZA', font: 'font-black' },
  { text: 'রিকোরেনজা', font: 'font-bengali' },
  { text: 'रिकोरेंज़ा', font: 'font-hindi' },
];

const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#________';

const splitIntoGraphemes = (text: string) => {
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text)).map((s: any) => s.segment);
  }
  return text.split('');
};

const GlitchChar = ({ char, isChanging }: { char: string; isChanging: boolean }) => {
  const [displayChar, setDisplayChar] = useState(char);

  useEffect(() => {
    if (!isChanging) {
      setDisplayChar(char);
      return;
    }

    let iterations = 0;
    const interval = setInterval(() => {
      setDisplayChar(GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]);
      iterations++;
      if (iterations > 10) {
        clearInterval(interval);
        setDisplayChar(char);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [char, isChanging]);

  return (
    <span className="relative inline-block stranger-title-gradient py-2">
      {displayChar}
    </span>
  );
};

export const GlitchBrandName: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [index, setIndex] = useState(0);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsChanging(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % languages.length);
        setIsChanging(false);
      }, 500);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const currentText = languages[index].text;
  const chars = useMemo(() => splitIntoGraphemes(currentText), [currentText]);

  return (
    <div className={`relative inline-block overflow-visible ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.02, filter: 'blur(12px)' }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`relative ${languages[index].font} flex justify-center items-center py-32 overflow-visible`}
        >
          <div className="flex">
            {chars.map((char, i) => (
              <GlitchChar key={`${index}-${i}`} char={char} isChanging={isChanging} />
            ))}
          </div>
          
          {/* Subtle Chromatic Aberration - applied only during changes to save PERF */}
          {isChanging && (
            <>
              <motion.div
                animate={{ x: [-1, 1, -0.5, 0], opacity: [0.6, 0.4, 0] }}
                className="absolute inset-0 text-cyan-500/40 pointer-events-none mix-blend-screen whitespace-nowrap blur-[1px]"
              >
                {currentText}
              </motion.div>
              <motion.div
                animate={{ x: [1, -1, 0.5, 0], opacity: [0.6, 0.4, 0] }}
                className="absolute inset-0 text-red-500/40 pointer-events-none mix-blend-screen whitespace-nowrap blur-[1px]"
              >
                {currentText}
              </motion.div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <style>{`
        .font-bengali {
          font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif;
        }
        .font-hindi {
          font-family: 'Poppins', 'Noto Sans Devanagari', sans-serif;
        }
      `}</style>
    </div>
  );
};

export default GlitchBrandName;
