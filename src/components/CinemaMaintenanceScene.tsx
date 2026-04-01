import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import './CinemaMaintenanceScene.css';

interface CinemaMaintenanceSceneProps {
  title?: string;
  message?: string;
}

// ─── Phase Configuration ────────────────────────────────────────────────
const PHASES = [
  {
    id: 'directing',
    label: 'Director at Work',
    emoji: '🎬',
    color: '#d4af37',
    gradient: 'linear-gradient(135deg, #2d1f0e 0%, #0a0a0a 50%, #1a1002 100%)',
    subtitle: 'Setting Up the Scene...',
    description: 'The director is reviewing the storyboard and setting up lights for the next shot.',
  },
  {
    id: 'acting',
    label: 'Actors in Action',
    emoji: '🎭',
    color: '#e74c3c',
    gradient: 'linear-gradient(135deg, #2d0a0a 0%, #0a0a0a 50%, #1a0505 100%)',
    subtitle: 'Lights, Camera, Action!',
    description: 'Actors rehearsing their scenes under the spotlights.',
  },
  {
    id: 'shooting',
    label: 'Camera Rolling',
    emoji: '📹',
    color: '#3498db',
    gradient: 'linear-gradient(135deg, #0a1a2d 0%, #0a0a0a 50%, #051020 100%)',
    subtitle: 'Capturing the Magic...',
    description: 'The crew is rolling cameras on a dolly track. Every frame counts!',
  },
  {
    id: 'postprod',
    label: 'Post-Production',
    emoji: '✂️',
    color: '#9b59b6',
    gradient: 'linear-gradient(135deg, #1a0a2d 0%, #0a0a0a 50%, #120520 100%)',
    subtitle: 'Editing the Masterpiece...',
    description: 'The editor is cutting footage, color grading, and mixing audio.',
  },
  {
    id: 'filmvan',
    label: 'Reels to Cinema',
    emoji: '🚐',
    color: '#e67e22',
    gradient: 'linear-gradient(135deg, #2d1a05 0%, #0a0a0a 50%, #1a0f02 100%)',
    subtitle: 'Delivering the Film...',
    description: 'Film reels are being shipped to the theater. Almost premiere time!',
  },
  {
    id: 'cinema',
    label: 'Premiere Night',
    emoji: '🎞️',
    color: '#2ecc71',
    gradient: 'linear-gradient(135deg, #0a2d15 0%, #0a0a0a 50%, #051a0a 100%)',
    subtitle: 'The Audience Awaits!',
    description: 'Seats are filling up. The projector beam lights up the silver screen.',
  },
];

const PHASE_DURATION = 5000; // 5s per phase

// ─── Particle Generator ─────────────────────────────────────────────────
function FloatingParticles({ color }: { color: string }) {
  return (
    <div className="cinema-particles">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="cinema-particle"
          style={{
            left: `${Math.random() * 100}%`,
            width: `${3 + Math.random() * 5}px`,
            height: `${3 + Math.random() * 5}px`,
            background: color,
            opacity: 0.15 + Math.random() * 0.25,
          }}
          animate={{
            y: [window.innerHeight + 50, -50],
            x: [0, (Math.random() - 0.5) * 200],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
          }}
          transition={{
            duration: 6 + Math.random() * 10,
            repeat: Infinity,
            delay: Math.random() * 8,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

// ─── Scene Illustrations (Rich SVG/CSS Art) ──────────────────────────────

function DirectorScene() {
  return (
    <div className="scene-stage">
      <motion.img 
        src="/maintenance/director.svg" 
        alt="Director at work" 
        className="scene-image"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 1.05, opacity: 0, y: -20 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function ActorsScene() {
  return (
    <div className="scene-stage">
      <motion.img 
        src="/maintenance/actors.svg" 
        alt="Actors performing" 
        className="scene-image"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 1.05, opacity: 0, y: -20 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function ShootingScene() {
  return (
    <div className="scene-stage">
      <motion.img 
        src="/maintenance/shooting.svg" 
        alt="Camera rolling" 
        className="scene-image"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 1.05, opacity: 0, y: -20 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function PostProdScene() {
  return (
    <div className="scene-stage">
      <motion.img 
        src="/maintenance/editing.svg" 
        alt="Video editing" 
        className="scene-image"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 1.05, opacity: 0, y: -20 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function FilmVanScene() {
  return (
    <div className="scene-stage">
      <motion.img 
        src="/maintenance/filmvan.svg" 
        alt="Film van delivery" 
        className="scene-image"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 1.05, opacity: 0, y: -20 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function CinemaScene() {
  return (
    <div className="scene-stage">
      <motion.img 
        src="/maintenance/cinema.svg" 
        alt="Cinema premiere" 
        className="scene-image"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 1.05, opacity: 0, y: -20 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}


// ─── Scene Router ────────────────────────────────────────────────────────
function SceneRenderer({ phaseId }: { phaseId: string }) {
  switch (phaseId) {
    case 'directing': return <DirectorScene />;
    case 'acting': return <ActorsScene />;
    case 'shooting': return <ShootingScene />;
    case 'postprod': return <PostProdScene />;
    case 'filmvan': return <FilmVanScene />;
    case 'cinema': return <CinemaScene />;
    default: return null;
  }
}

// ─── Main Component ──────────────────────────────────────────────────────
export const CinemaMaintenanceScene: React.FC<CinemaMaintenanceSceneProps> = ({
  title = 'Production in Progress',
  message = 'Our crew is setting up the stage — the show will begin shortly!',
}) => {
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhase(prev => (prev + 1) % PHASES.length);
    }, PHASE_DURATION);
    return () => clearInterval(interval);
  }, []);

  const phase = PHASES[currentPhase];

  return (
    <div className="cinema-maintenance-root">
      {/* Dynamic Background */}
      <motion.div
        className="cinema-bg"
        animate={{ background: phase.gradient }}
        transition={{ duration: 1.5 }}
      />

      {/* Ambient Particles */}
      <FloatingParticles color={phase.color} />

      {/* Film Strip Top Border */}
      <div className="filmstrip-border top">
        <motion.div className="filmstrip-inner"
          animate={{ x: [0, -200] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          {[...Array(30)].map((_, i) => (
            <div key={i} className="perforation" />
          ))}
        </motion.div>
      </div>



      {/* Main Scene Area */}
      <div className="scene-viewport">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase.id}
            className="scene-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SceneRenderer phaseId={phase.id} />
          </motion.div>
        </AnimatePresence>
      </div>



      {/* Title & Message */}
      <div className="maintenance-info">
        <motion.h1
          className="maintenance-title"
          key={title}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {title}
        </motion.h1>
        <motion.p
          className="maintenance-message"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {phase.description}
        </motion.p>
      </div>

      {/* Film Strip Bottom Border */}
      <div className="filmstrip-border bottom">
        <motion.div className="filmstrip-inner"
          animate={{ x: [-200, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          {[...Array(30)].map((_, i) => (
            <div key={i} className="perforation" />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default CinemaMaintenanceScene;
