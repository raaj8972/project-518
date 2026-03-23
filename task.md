# Phase 2 — Supabase Backend for Chat & Announcements

## SQL Migration
- [/] Create announcements table + RLS
- [/] Create conversations table + RLS
- [/] Create chat_messages table + RLS + 5d auto-delete cron
- [/] Indexes for performance

## Frontend Wiring (after SQL applied)
- [ ] Wire AnnouncementsPanel to Supabase (insert/update/delete/realtime subscribe)
- [ ] Wire ChatPanel to Supabase (insert/delete/realtime subscribe)
- [ ] Conversations list from Supabase (student ↔ coordinator)
- [ ] Online/last-seen via Supabase Presence (Realtime channels)
- [ ] Coordinator Dashboard: load conversations for their events
