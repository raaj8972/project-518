import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import { createPortalLogo } from './portalLogoMesh';

export default function CinematicPortalLogo({ logoUrl, progress }: { logoUrl: string; progress: { current: number } }) {
  const group = useRef<Group>(null);
  const controller = useRef<ReturnType<typeof createPortalLogo>>();
  const { invalidate } = useThree();
  useLayoutEffect(() => {
    const logo = createPortalLogo(logoUrl, invalidate);
    controller.current = logo;
    group.current?.add(logo.mesh);
    invalidate();
    return () => { controller.current = undefined; logo.dispose(); };
  }, [logoUrl, invalidate]);
  useFrame(() => controller.current?.update(progress.current));
  return <group ref={group} />;
}
