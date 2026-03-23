import { supabase } from './supabase';

export async function likeProfile(profileId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if like exists
    const { data: existing } = await supabase
      .from('profile_likes')
      .select('id')
      .eq('liker_id', user.id)
      .eq('profile_id', profileId)
      .single();

    if (existing) {
      // Unlike
      const { error } = await supabase
        .from('profile_likes')
        .delete()
        .eq('id', existing.id);
      
      if (error) throw error;
      return 'unliked';
    } else {
      // Like
      const { error } = await supabase
        .from('profile_likes')
        .insert({
          liker_id: user.id,
          profile_id: profileId
        });
      
      if (error) throw error;
      return 'liked';
    }
  } catch (err) {
    console.error('Error in likeProfile:', err);
    return null;
  }
}
