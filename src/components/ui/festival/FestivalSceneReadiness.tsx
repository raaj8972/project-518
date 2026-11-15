import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const FestivalSceneReadiness = createContext({ pending: false, setSettled: (_settled: boolean) => {} });

/** Release the opening when the homepage has visible artwork; 3D can finish later. */
export function FestivalSceneProvider({ required, children }: { required: boolean; children: ReactNode }) {
  const [settled, setSettled] = useState(false);
  useEffect(() => { if (!required) setSettled(false); }, [required]);
  return <FestivalSceneReadiness.Provider value={{ pending: required && !settled, setSettled }}>{children}</FestivalSceneReadiness.Provider>;
}

export const useFestivalSceneReadiness = () => useContext(FestivalSceneReadiness);
