# UI-Backend Sync Pattern Guide

## ✅ Current Implementation Status

All UI delete operations **already sync to Supabase backend**. This project follows a consistent pattern.

## 📋 Delete Functions (All Syncing Correctly)

| Function | Table | Status |
|----------|-------|--------|
| `deleteEvent` | events | ✅ Synced via `supabase.from('events').delete()` |
| `deleteRegistration` | registrations | ✅ Synced |
| `deleteMembership` | memberships | ✅ Synced |
| `deleteAudition` | auditions | ✅ Synced |
| `deleteSponsor` | sponsors | ✅ Synced |
| `deleteGalleryImage` | gallery_images | ✅ Synced |
| `deleteFacultyHead` | faculty_heads | ✅ Synced |
| `deleteCoreCommittee` | core_committees | ✅ Synced |
| `deleteCoreTeamMember` | core_team_members | ✅ Synced |
| `deleteBandMember` | band_members | ✅ Synced |
| `deleteGuestArtist` | guest_artists | ✅ Synced |
| `deleteChiefGuest` | chief_guests | ✅ Synced |
| `deleteSponsorshipPackage` | sponsorship_packages | ✅ Synced |
| `deleteNotification` | notifications | ✅ Synced |
| `deleteEventWinner` | event_winners | ✅ Synced |
| `deleteScheduleDay` | schedule_days | ✅ Synced |
| `deleteScheduleEvent` | schedule_events | ✅ Synced |
| `deleteEventCoordinator` | event_coordinators | ✅ Synced |
| `deleteEventCategory` | event_categories | ✅ Synced |
| `deleteSportsCommittee` | sports_committees | ✅ Synced |
| `deleteSportsTeamMember` | sports_team_members | ✅ Synced |
| `deleteRoadmapMilestone` | roadmap_milestones | ✅ Synced |
| `deleteContactSection` | contact_sections | ✅ Synced |

## 🔧 Pattern for Future Features

When adding **ANY** new feature with delete functionality, follow this pattern:

### 1. **DataContext Function Template**

```typescript
const deleteYourFeature = async (id: number | string) => {
  // 1. Delete from Supabase FIRST
  const { error } = await supabase.from('your_table').delete().eq('id', id);
  if (error) throw error;
  
  // 2. Update local state (optimistic UI)
  setYourFeatures(prev => prev.filter(item => item.id !== id));
  
  // 3. Optional: Trigger background refresh
  fetchData(true).catch(e => console.warn('Background refresh failed', e));
};
```

### 2. **Admin UI Component Template**

```typescript
const handleDelete = async (id: number | string) => {
  if (!confirm('Are you sure you want to delete this item?')) return;
  
  try {
    // Call DataContext delete function
    await deleteYourFeature(id);
    
    // Success feedback (optional)
    console.log('Deleted successfully');
  } catch (error) {
    console.error('Delete failed:', error);
    alert('Failed to delete. Please try again.');
  }
};
```

### 3. **Database RLS Policy**

Ensure your Supabase table has proper delete policies:

```sql
-- Allow admins to delete
CREATE POLICY "Admins can delete" ON public.your_table
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );
```

## ⚙️ Automatic Cleanup (24-hour retention)

For **login sessions** and **biometric data**, automatic cleanup is enabled:

- **Admin Sessions**: Auto-delete after 24 hours of inactivity
- **Passkeys**: Auto-delete after 24 hours of non-use
- **Passkey Challenges**: Auto-delete when expired

**Cleanup runs**: Daily at 2 AM UTC via cron job

**Manual cleanup**:
```sql
SELECT public.cleanup_auth_data();
```

## 🚨 Critical Rules

1. **NEVER** delete from UI state without deleting from Supabase first
2. **ALWAYS** use `supabase.from().delete()` for database deletions
3. **ALWAYS** handle errors properly
4. **ALWAYS** show user confirmation before destructive actions
5. **ALWAYS** test delete operations in both dev and production

## ✅ Verification Checklist

Before deploying any new delete feature:

- [ ] Delete function exists in DataContext
- [ ] Function calls `supabase.from().delete()`
- [ ] UI component calls DataContext function
- [ ] Error handling is implemented
- [ ] User confirmation dialog shows
- [ ] RLS policy allows delete for admins
- [ ] Tested in development environment
- [ ] Verified in Supabase dashboard

## 📖 Related Files

- **DataContext**: `/src/context/DataContext.tsx` (all delete functions)
- **Admin Components**: `/src/components/admin/` (UI delete buttons)
- **RLS Policies**: Database → Authentication → Policies
- **Cleanup Jobs**: Database → Cron Jobs

---

**Last Updated**: 2025-11-30  
**Status**: All delete operations syncing correctly ✅
