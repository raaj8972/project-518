/** Measure actual frame work; idle gaps between demand frames are not poor FPS. */
export function createFrameHealthMonitor(onSlow: () => void) {
  let slowFrames = 0, reported = false;
  return {
    sample(milliseconds: number) {
      if (reported) return;
      slowFrames = milliseconds > 70 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames >= 8) { reported = true; onSlow(); }
    },
    reset() { slowFrames = 0; },
  };
}
