import React from 'react';
import { GridIcon, ReaderIcon } from '@radix-ui/react-icons';
import { EVENT_FILTERS } from '../../utils/eventPresentation';

interface Props { selectedCategory: string; setSelectedCategory: (category: string) => void }
function CulturalIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 4c3 1 6 1 9 0v6c0 4-3 6-4.5 7C6 16 3 14 3 10V4Z" /><path d="m5 8 2 .5m2-.5 2-.5M5.5 12c1-1 2.5-1 3.5 0M13 6l7-1 1 6c.6 4-1.7 6.5-3.5 8-1.5-.5-3-1.7-4-3M14 9l2 .2m2-.7 2-.7M15.5 13c1 1 2.3.7 3.1-.4" /></svg>;
}
export const CategoryFilter: React.FC<Props> = ({ selectedCategory, setSelectedCategory }) => <nav className="arena-category-nav" aria-label="Filter events by category"><div className="arena-category-track">{EVENT_FILTERS.map(category => {
  const Icon = category === 'All' ? GridIcon : category === 'Academic' ? ReaderIcon : CulturalIcon;
  return <button type="button" key={category} className={`arena-category-button ${selectedCategory === category ? 'is-active' : ''}`} aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory(category)}><span className="arena-category-content"><Icon /><span>{category}</span></span></button>;
})}</div></nav>;
