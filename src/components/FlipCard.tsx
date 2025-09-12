import React from 'react';

type FlipCardProps = {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  /**
   * On touch devices, hover doesn't exist. If true, clicking toggles flip via JS.
   * Default: true
   */
  enableTapToggle?: boolean;
};

export const FlipCard: React.FC<FlipCardProps> = ({ front, back, className = '', enableTapToggle = true }) => {
  const [flipped, setFlipped] = React.useState(false);

  const isTouch = typeof window !== 'undefined' && matchMedia('(hover: none)').matches;

  const handleToggle = () => {
    if (enableTapToggle && isTouch) setFlipped(f => !f);
  };

  return (
    <div className={`flip-3d ${className}`} onClick={handleToggle}>
      <div className={`flip-3d-inner ${flipped ? 'is-flipped' : ''}`}>
        <div className="flip-3d-front">{front}</div>
        <div className="flip-3d-back">{back}</div>
      </div>
    </div>
  );
};

export default FlipCard;