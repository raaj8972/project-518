import {expect,it} from 'vitest';
import {normalizeGuestArtists,selectHomepageArtists} from '../src/utils/guestArtists';
const artist=(id:number,patch:Record<string,unknown>={})=>({id,name:`Artist ${id}`,image:`artist-${id}.jpg`,enabled:true,is_featured:false,order_position:id,...patch});
it('automatically includes older visible artists even when their old featured flag is false or null',()=>{
 const rows=[artist(2,{is_featured:null}),artist(1),artist(3,{enabled:false,is_featured:true})];
 expect(selectHomepageArtists(rows).map(row=>row.id)).toEqual([1,2]);expect(rows[0].is_featured).toBeNull();
});
it('repairs null/partial collections and rejects malformed rows without a null-object crash',()=>{
 const rows=normalizeGuestArtists([null,false,[],artist(1,{achievements:null,social_links:null}),artist(2,{achievements:[null,'Live performance',42],social_links:{instagram:null,youtube:'https://youtube.com/@artist',spotify:{}}})]);
 expect(rows).toHaveLength(2);expect(rows[0].achievements).toEqual([]);expect(rows[0].social_links).toEqual({});expect(rows[1].achievements).toEqual(['Live performance']);expect(rows[1].social_links).toEqual({youtube:'https://youtube.com/@artist'});
 expect(selectHomepageArtists([artist(1,{image:null}),artist(2,{name:null})])).toEqual([]);expect(selectHomepageArtists(null)).toEqual([]);
});
