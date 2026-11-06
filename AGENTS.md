# Working on TravelApp

TravelApp (Roam) is a plain JavaScript application with an editable source tree. Keep the pixel-art design, plain wording, saved-place tray below the calendar, and the shared place cards in both planning views.

## Project map

- `index.html`: app shell and ordered deferred script/style references only.
- `src/main.js`: routing and startup.
- `src/views/`: My trips, planner, journal, trip details, and passport.
- `src/components/`: calendar, saved places, cards, shared UI, and pixel artwork.
- `src/forms/`: trip, memory, and itinerary dialogs.
- `src/events/`: delegated buttons, filters, and form submissions.
- `src/state/store.js`: browser IndexedDB persistence and serialized changes.
- `src/features/`: backup/restore and saved Instagram Story imports.
- `src/data/`: destination suggestions and fictional sample trips.
- `src/lib/`: shared DOM, date, amount, and media helpers.
- `src/styles/`: global, planner, calendar, saved-place, and readability CSS.
- `public/assets/`: original pixel font and favicon.
- `tests/app.test.mjs`: existing data, import, and scheduling contracts.

## Development

Use Node 20 or later. Run `npm ci`, `npm run dev`, `npm run check`, `npm test`, and `npm run build`. The app has no runtime dependencies. The source server serves current files directly; refresh the browser after editing. `dist/` is generated and must not be edited or committed.

The browser files are ordered classic scripts sharing existing global bindings. Preserve the order in `index.html`: utilities/data/state first, features and event handlers next, `src/main.js` last. Tests read that same entry point. Avoid redefining shared `const`/`let` names across files. Put feature logic in the relevant source file rather than in the HTML or startup file.

## Preserve saved journals

The IndexedDB database is `roam-travel-journal`, object store `journal`, key `world`. Keep those identifiers and the backup format when reorganizing code. Personal trips, photos, and plans are stored in the visitor's browser; they are not source files, sample data, or Vercel storage. Do not add real travel records or credentials to the repository.

Moving to a new website origin requires exporting and importing a backup. Closing and reopening the same site normally preserves the journal. Private browsing and cleared site storage can remove it. Do not claim account or cross-device sync exists.

## Verification

After behavior changes, check trips, journal navigation, saving/reloading, and backup import/export. For planner changes, check shared place filters, dragging from the bottom tray, event movement/resizing, and metadata on scheduled items. Keep keyboard and touch fallbacks.

Vercel builds `dist/` using `vercel.json`. Existing Sites hosting uses the tracked `.openai/hosting.json`; preserve its project ID. Never commit browser data, `node_modules/`, generated builds, or credential files.
