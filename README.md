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
