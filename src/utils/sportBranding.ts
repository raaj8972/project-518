export type SportType = 'Cricket' | 'Football' | 'Badminton' | 'Volleyball' | 'Basketball' | 'Handball' | 'Athletics' | 'Generic';

export interface PlayerAttribute {
  label: string;
  key: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}

export interface SportCardTheme {
  primaryColor: string;
  secondaryColor: string;
  icon: string;
  attributes: PlayerAttribute[];
}

export const SPORT_THEMES: Record<SportType, SportCardTheme> = {
  Cricket: {
    primaryColor: '#00529b', // India Blue
    secondaryColor: '#ff9933', // Saffron
    icon: 'target',
    attributes: [
      { label: 'Style', key: 'batting_style', type: 'select', options: ['RHB', 'LHB'] },
      { label: 'Role', key: 'bowling_role', type: 'select', options: ['Batter', 'Bowler', 'All Rounder', 'Wicket Keeper'] },
      { label: 'Jersey', key: 'jersey_no', type: 'number' },
      { label: 'Batch', key: 'batch', type: 'text' }
    ]
  },
  Football: {
    primaryColor: '#1a1a1a', 
    secondaryColor: '#ccff00',
    icon: 'activity',
    attributes: [
      { label: 'Position', key: 'position', type: 'select', options: ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'] },
      { label: 'Jersey', key: 'jersey_no', type: 'number' },
      { label: 'Batch', key: 'batch', type: 'text' }
    ]
  },
  Badminton: {
    primaryColor: '#9333ea',
    secondaryColor: '#f472b6',
    icon: 'zap',
    attributes: [
      { label: 'Style', key: 'play_style', type: 'select', options: ['Offensive', 'Defensive', 'All-Court'] },
      { label: 'Rank', key: 'rank', type: 'number' },
      { label: 'Batch', key: 'batch', type: 'text' }
    ]
  },
  Basketball: {
    primaryColor: '#ea580c',
    secondaryColor: '#facc15',
    icon: 'target',
    attributes: [
      { label: 'Position', key: 'position', type: 'select', options: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'] },
      { label: 'Jersey', key: 'jersey_no', type: 'number' },
      { label: 'Batch', key: 'batch', type: 'text' }
    ]
  },
  'Generic': {
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
    icon: 'user',
    attributes: [
      { label: 'Batch', key: 'batch', type: 'text' },
      { label: 'Jersey', key: 'jersey_no', type: 'number' }
    ]
  }
} as any;

export const getSportType = (sportName: string): SportType => {
  const name = sportName.toLowerCase();
  if (name.includes('cricket')) return 'Cricket';
  if (name.includes('football')) return 'Football';
  if (name.includes('badminton')) return 'Badminton';
  if (name.includes('basketball')) return 'Basketball';
  if (name.includes('volleyball')) return 'Volleyball';
  if (name.includes('handball')) return 'Handball';
  if (name.includes('athletics')) return 'Athletics';
  return 'Generic';
};

export const getSportTheme = (sportName: string): SportCardTheme => {
  const type = getSportType(sportName);
  return SPORT_THEMES[type] || SPORT_THEMES['Generic'];
};
