# Sidequest

Android-first, offline-first school command centre prototype.

## Run locally

Service workers require HTTP rather than opening `index.html` directly. From this folder:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Included

- Installable PWA manifest and offline app shell
- IndexedDB persistence
- Quests with creation, editing, sync-safe deletion tombstones, completion, XP, and Sparx progress
- Calendar timeline, focus timer, themes, backup export/import
- Standard `.ics` calendar import and export (all-day events become editable quests)
- Alternating Week A/Week B timetable anchored to Monday 31 August 2026
- Per-record IDs and `updatedAt` fields ready for a cloud sync adapter

## Supabase setup

1. Open the Supabase project SQL Editor.
2. Run `supabase-schema.sql` once.
3. Open Sidequest and select the circular level/profile button to create an account.

The client uses only the project's browser-safe publishable key. Never place a secret or service-role key in this folder.

## Closed-app notifications

`sidequest_push_subscriptions` stores each signed-in user's browser subscription behind RLS. Add the VAPID public key to `config.js`; keep its private half only in Supabase Edge Function Secrets. The app deliberately falls back to device-only test notifications until that public key is configured.

The `sidequest-notifications` Edge Function is intended to be invoked every minute by Supabase Cron. It calculates time in `Europe/London`, sends one combined morning timetable, an evening due-tomorrow warning, and a Sunday Sparx reminder. Notification log keys prevent duplicate delivery.
