import React, { useEffect, useRef } from 'react';

// Tiny base64 encoded audio blips to avoid network requests for micro-interactions

export const AudioController: React.FC = () => {
  const hoverAudio = useRef<HTMLAudioElement | null>(null);
  const clickAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = (ref: React.MutableRefObject<HTMLAudioElement | null>, src: string, volume: number) => {
      if (!ref.current) { ref.current = new Audio(src); ref.current.preload = 'none'; ref.current.volume = volume; }
      return ref.current;
    };
    const playHover = () => {
      audio(hoverAudio, '/sounds/hover.mp3', 0.05);
      hoverAudio.current!.currentTime = 0;
      hoverAudio.current!.play().catch(() => {});
    };

    const playClick = () => {
      audio(clickAudio, '/sounds/click.mp3', 0.1);
      clickAudio.current!.currentTime = 0;
      clickAudio.current!.play().catch(() => {});
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'a' || 
        target.tagName.toLowerCase() === 'button' ||
        target.closest('a') ||
        target.closest('button') ||
        target.classList.contains('interactive')
      ) {
        playHover();
      }
    };

    const handleMouseClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'a' || 
        target.tagName.toLowerCase() === 'button' ||
        target.closest('a') ||
        target.closest('button')
      ) {
        playClick();
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('click', handleMouseClick);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('click', handleMouseClick);
    };
  }, []);

  return null; // This is a logic-only component
};
