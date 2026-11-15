import { useEffect, useState } from 'react';
import { INTRO_PHASE_EVENT, INTRO_STATIC_EVENT, preferStaticExperience } from '../components/cinematic/introCapability';

/** Reuse existing static homepage art when a device cannot sustain the effects. */
export function useStaticExperience() {
  const [staticExperience, setStaticExperience] = useState(preferStaticExperience);
  useEffect(() => {
    const update = () => setStaticExperience(preferStaticExperience());
    update();
    window.addEventListener(INTRO_STATIC_EVENT, update);
    return () => window.removeEventListener(INTRO_STATIC_EVENT, update);
  }, []);
  return staticExperience;
}

export function useCinematicIntroActive() {
  const [active, setActive] = useState(() => document.documentElement.dataset.cinematicIntro === 'active');
  useEffect(() => {
    const update = () => setActive(document.documentElement.dataset.cinematicIntro === 'active');
    update(); window.addEventListener(INTRO_PHASE_EVENT, update);
    return () => window.removeEventListener(INTRO_PHASE_EVENT, update);
  }, []);
  return active;
}
