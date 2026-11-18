import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const FestivalSceneReadiness = createContext({ pending: false, setSettled: (_settled: boolean) => {}, preparing: false, setPreparing: (_preparing: boolean) => {} });

/** Prepare the actual homepage behind the film; reveal only its complete frame. */
export function FestivalSceneProvider({ required, children }: { required: boolean; children: ReactNode }) {
  const [settled, setSettled] = useState(false);
  const [preparing, setPreparing] = useState(false);
  useEffect(() => { if (!required) { setSettled(false); setPreparing(false); } }, [required]);
  return <FestivalSceneReadiness.Provider value={{ pending: required && !settled, setSettled, preparing, setPreparing }}>{children}</FestivalSceneReadiness.Provider>;
}

export const useFestivalSceneReadiness = () => useContext(FestivalSceneReadiness);
