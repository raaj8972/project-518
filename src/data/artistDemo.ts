import type { GuestArtist } from '../types/data';

/** Illustrative performers only. Never insert these into the public artist table. */
export function createArtistDemo(year: number): GuestArtist[] {
  const performers = [
    {name: 'Aarohi Sen', title: 'The indie voice', specialty: 'INDIE / SOUL', panel: 'left', description: 'Indie melodies, soulful stories and a voice made for a thousand people to sing along.\n\nAarohi’s set starts with a voice and an acoustic guitar, then opens into warm, full-band arrangements. Her songs move between quiet personal stories and choruses built to be shared with a crowd. On the Ricorrenza stage, expect stripped-back moments, familiar melodies and space for the audience to become part of the performance.'},
    {name: 'The Afterhours', title: 'The live band', specialty: 'ACOUSTIC / FUSION', panel: 'center', description: 'Acoustic stories, electric energy and a chorus that stays with you.\n\nThe Afterhours bring vocals and guitar together through arrangements that leave room for each musician to be heard. Their live set moves from close, acoustic conversations to open, rhythmic singalongs, blending indie influences with a shared love of melody. It is a performance built around the connection between the band and the people in front of the stage.'},
    {name: 'DJ Aaryan', title: 'After dark', specialty: 'ELECTRONIC / HOUSE', panel: 'right', description: 'Driving rhythms, late-night anthems and a dance floor that never stands still.\n\nAaryan builds his set as a journey: warm opening grooves, layered house rhythms and a lift in energy as the night moves on. Rather than rushing from one hook to the next, he makes room for transitions and the crowd’s response. Expect electronic textures, familiar vocal moments and a closing stretch designed to keep everyone moving.'},
  ];
  return [year, year - 1, year - 2].flatMap((festivalYear, yearIndex) => performers.slice(0, yearIndex === 2 ? 2 : 3).map((person, index) => ({
    id: -(yearIndex * 3 + index + 1), name: person.name, title: person.title,
    specialty: person.specialty, description: person.description, image: `/images/artist-demo-performers.webp#panel-${person.panel}`,
    gallery_images: [`/images/artist-demo-performers.webp#panel-${person.panel}`, `/images/artist-demo-performers-2.webp#panel-${person.panel}`],
    artist_kind: person.panel==='center'?'band':person.panel==='right'?'dj':'artist',stage_media_mode:'photos',stage_clip_urls:[],stage_clip_seconds:30,spotify_collection_url:'https://open.spotify.com/playlist/37i9dQZF1DZ06evO3eIivx',featured_songs:[{title:'Sample Spotify track',url:'https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ'},{title:'Sample video',url:'https://www.youtube.com/watch?v=aqz-KE-bpKQ'}],
    festival_year: festivalYear, track_title: 'Stage lights · demo instrumental', detail_music_url: '/media/artist-stage-demo.wav',
    youtube_url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', video_url: '', video: null, created_at:'2026-11-01T00:00:00Z', updated_at:'2026-11-01T00:00:00Z',
    social_links: {instagram:'https://www.instagram.com/',youtube:'https://www.youtube.com/'}, achievements: [], enabled: true,
    is_featured: true, order_position: index + 1, venue: 'IQ City · Main stage',
    performance_at: null, countdown_enabled: false, live_now_enabled: false,
    card_media_url: '', card_media_is_video: false, watch_live_url: '',
  } as GuestArtist)));
}
