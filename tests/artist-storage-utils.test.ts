import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({remove:vi.fn().mockResolvedValue({error:null}),from:vi.fn()}));
vi.mock('../src/lib/supabase',()=>({supabase:{storage:{from:mocks.from}}}));
import {deleteStorageFileByPublicUrl,isUrlReferencedSomewhere} from '../src/utils/storageUtils';
const cache=(artist:unknown)=>({guestArtists:[artist],galleryImages:[],sponsors:[],facultyHeads:[],coreTeamMembers:[],bandMembers:[],events:[],eventWinners:[],homepageSettings:null,sponsorshipSettings:null,heroMedia:{}} as any);
beforeEach(()=>{mocks.from.mockReset().mockReturnValue({remove:mocks.remove});mocks.remove.mockClear();});
it('preserves referenced songs, posters and every phone/desktop gallery or clip slot',()=>{
 const url='https://media.example/shared.webp';
 for(const field of ['image','video_url','card_media_url','detail_music_url','gallery_images','stage_clip_urls','desktop_gallery_images','desktop_stage_clip_urls']){
  const row={id:9,[field]:field.includes('images')||field.includes('urls')?[url]:url};expect(isUrlReferencedSomewhere(url+'?cache=1',cache(row))).toBe(true);expect(isUrlReferencedSomewhere(url,cache(row),{table:'guest_artists',id:9})).toBe(false);
 }
 expect(isUrlReferencedSomewhere(url,cache({id:9,detail_music_url:null,gallery_images:null}))).toBe(false);
});
it('removes an artist audio upload from the correct bucket with its decoded path',async()=>{
 await deleteStorageFileByPublicUrl('https://project.supabase.co/storage/v1/object/public/guest-artist-audio/artists/audio/track%20one.mp3?cache=1');expect(mocks.from).toHaveBeenCalledWith('guest-artist-audio');expect(mocks.remove).toHaveBeenCalledWith(['artists/audio/track one.mp3']);
});
