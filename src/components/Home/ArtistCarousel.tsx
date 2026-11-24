import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import ArtistStage from './ArtistStage';
import { createArtistDemo } from '../../data/artistDemo';
import { BRAND_YEAR } from '../../constants/brand';
import type { GuestArtist } from '../../types/data';

interface ArtistCarouselProps {
  artists: GuestArtist[];
  settings?:unknown;
  currentYear?: number;
  loading?: boolean;
  openDetailModal: (artist: GuestArtist, options?: { userInitiated?: boolean }) => void;
  setVideoModalOpen: (open: boolean) => void;
  setSelectedArtistForVideo: (artist: GuestArtist | null) => void;
  detailOpen: boolean;
  videoModalOpen: boolean;
  showInteractive: boolean;
  prefetchDetailModal: () => void;
}

export default function ArtistCarousel({ artists, settings, currentYear = Number(BRAND_YEAR), loading, openDetailModal, detailOpen, videoModalOpen }: ArtistCarouselProps) {
  const location = useLocation();
  const demo = new URLSearchParams(location.search).get('artistsPreview') === '1';
  const examples = useMemo(() => demo ? createArtistDemo(currentYear) : [], [demo, currentYear]);
  return <ArtistStage settings={settings} artists={demo ? examples : artists} currentYear={currentYear} demo={demo} loading={!demo && loading} paused={detailOpen || videoModalOpen} onArtistDetails={artist => openDetailModal(artist, {userInitiated: true})}/>;
}
