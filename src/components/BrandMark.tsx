import { useEffect, useState } from 'react';
import * as CoreDataContextModule from '../context/CoreDataContext';
import BrandLogo3D from './BrandLogo3D';
import {
  DEFAULT_BRAND_LOGO,
  isLottieLogoUrl,
  resolveBrandLogoUrl,
  type BrandSettingsLike,
} from '../utils/brandLogo';

type BrandMarkProps = {
  settings?: BrandSettingsLike;
  allowCachedWhileLoading?: boolean;
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
  loading?: 'eager' | 'lazy';
};

/** Renders the configured festival brand logo (or official crest fallback) consistently across portals. */
export function BrandMark({
  settings,
  allowCachedWhileLoading = false,
  width = 36,
  height = 36,
  alt = '',
  className,
  loading,
}: BrandMarkProps) {
  const core = CoreDataContextModule.useOptionalCoreData?.();
  const activeSettings = settings === undefined ? core?.homepageSettings : settings;
  const resolvedSrc = resolveBrandLogoUrl(activeSettings, { allowCachedWhileLoading });
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    setFailedSrc(null);
  }, [resolvedSrc]);

  const effectiveSrc = failedSrc === resolvedSrc ? DEFAULT_BRAND_LOGO : resolvedSrc;

  if (isLottieLogoUrl(effectiveSrc)) {
    return (
      <BrandLogo3D
        src={effectiveSrc}
        size={height || width}
        glowStrength={0}
        animated={false}
        alt={alt}
        className={className || ''}
      />
    );
  }

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      loading={loading}
      className={className}
      onError={() => {
        if (effectiveSrc !== DEFAULT_BRAND_LOGO) setFailedSrc(resolvedSrc);
      }}
    />
  );
}
