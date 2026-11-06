# TravelApp · Roam

A pixel-art travel planner and journal, organized as an editable project for GitHub, Codex, and Vercel.

## Run in Codex or locally

Use Node.js 20 or later. There are no runtime dependencies.

```sh
npm ci
npm run dev
```

Open the local address printed by the server (normally http://127.0.0.1:3000). Edit source files and refresh the browser to see your changes.

```sh
npm run check
npm test
npm run build
```

`npm run build` generates `dist/`. Edit the source folders, not `dist/` or a downloaded browser export.

## Where to edit

| What you want to change                            | Source                                               |
| -------------------------------------------------- | ---------------------------------------------------- |
| Navigation and startup                             | `src/main.js`                                        |
| My trips and travel map                            | `src/views/my-trips.js`                              |
| Planner tabs, place forms, and budget              | `src/views/planner.js`                               |
| Drag-and-drop itinerary                            | `src/components/calendar.js`                         |
| Shared saved-place cards and category filters      | `src/components/saved-places.js`                     |
| Journal and search                                 | `src/views/journal.js`                               |
| Trip details and passport                          | `src/views/trip-details.js`, `src/views/passport.js` |
| Trip, memory, and itinerary dialogs                | `src/forms/`                                         |
| Button actions and form submissions                | `src/events/`                                        |
| Browser storage and updates                        | `src/state/store.js`                                 |
| Backup/restore and saved Story imports             | `src/features/`                                      |
| Destination suggestions and fictional sample trips | `src/data/`                                          |
| Shared date, amount, DOM, and media helpers        | `src/lib/`                                           |
| Colors, layout, typography, and responsive styles  | `src/styles/`                                        |
| Original font and favicon                          | `public/assets/`                                     |
| Existing scheduling/import/data checks             | `tests/app.test.mjs`                                 |

`index.html` contains the app shell and links to source files. The application is plain JavaScript; its ordered deferred scripts share existing bindings. Keep `src/main.js` last. `AGENTS.md` gives Codex the project map and development rules.

## Host on Vercel

Upload or push this entire project to `stephmimi27/TravelApp`, including `src/`, `public/`, `scripts/`, `tests/`, `package.json`, `package-lock.json`, and `vercel.json`. Import that repository as a Vercel project. Use the repository root as the Root Directory.

The included `vercel.json` selects the Other framework preset, runs syntax and application checks, builds the site, and publishes `dist/`. No environment variables or API keys are needed. Future deployments should use the same production website address to retain that browser's journal.

## How your travel data is saved

Trips, photos, videos, saved places, plans, and notes are saved in IndexedDB in the browser you are using. Editing the website's code or deploying it to Vercel does not put that journal into GitHub or into a cloud database.

Closing the tab or browser normally keeps your data. Reopening the same website address in the same browser brings it back. Clearing site storage, using a private/incognito session, or browser storage eviction can remove it. Export backups for a separate copy.

A new Vercel address has separate browser storage from the current Roam address. Before switching, open Settings & backups on the old site and export your backup; import it on the new site. Another browser or device has a separate journal. This version has no account, server database, or cross-device sync.

The original database name, object-store key, and backup format are preserved in this source reorganization. Personal journal records are never included in this repository. Files under `src/data/` contain fictional examples and offline destination suggestions only.

## Features

- Past trips, upcoming trips, wishlists, map pins, journal memories, and passport stamps.
- Photos and videos stored locally, with image resizing and video size limits.
- Matching place cards and category tabs in Places to explore and the itinerary's bottom tray.
- Calendar scheduling at 15-minute intervals, dragging between days/times, resizing, and undo.
- Checklist, trip notes, and planned-versus-actual spending.
- Paste place research from Sheets; export places, itineraries, and budgets as headerless TSV files.
- Versioned JSON backup and restore, including media.
- Import saved Instagram Story files or an Instagram JSON export. This is file-based import; there is no live Instagram connection.

## Optional font regeneration

The original font is already included. To regenerate it, install Python fontTools and run `python3 scripts/build-font.py`. It writes to `public/assets/roam-pixel.woff`.
