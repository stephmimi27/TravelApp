# TravelApp · Air Time

A pixel-art travel planner and journal, organized as an editable project for GitHub, Codex, and Vercel.

https://travel-roaming.vercel.app

## Run in Codex or locally 

Use Node.js 20 or later. The site is served as static files. The build can bundle the Supabase browser SDK for account sharing.

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

## How your travel data is saved

Trips, photos, videos, saved places, plans, and notes are saved in IndexedDB in the browser you are using. Editing the website's code or deploying it to Vercel does not put that journal into GitHub or into a cloud database.

Closing the tab or browser keeps your data. Reopening the same website address in the same browser brings it back. Clearing site storage, using a private/incognito session, or browser storage eviction can remove it. Export backups for a separate copy.
The original database name, object-store key, and backup format are preserved in this source reorganization. Personal journal records are never included in this repository. Files under `src/data/` contain fictional examples and offline destination suggestions only.

## Accounts and shared plans

Open **Account** to sign in with an email code. From a trip, choose **Share plan**, enter the recipient's email address, and choose **Can edit** or **Can view**. Send them the copied link. They can open it or find the plan in **Account → Shared plans** after signing in with that address. The owner can add people, change permissions, and revoke access under **Manage access**.

The owner and invited editors make changes to the same shared plan in **Edit shared plan**. They can change the trip details, itinerary, saved places, and checklist. An open shared plan checks for saved changes automatically. If someone saves first, the editor keeps the older draft open so its changes can be reviewed before refreshing.

The shared plan starts from a copy of the local trip and is stored in Supabase. To plan together, make changes from **Shared plans**. Journal memories, photos, budget entries, and trip-wide notes stay in the local journal, which you can export as a backup. **Stop sharing** deletes the cloud plan and its shared changes.

### Enable account sharing on a deployment

1. Create or select a Supabase project and apply the files in [supabase/migrations](supabase/migrations) in order. A new project needs both migrations. A project with sharing already enabled needs [the editor migration](supabase/migrations/20261120000001_roam_shared_plan_editors.sql). Run the migrations in the SQL Editor or with `supabase db push` against a linked project.
2. Enable email sign-ups, email confirmation, and **Secure email change** in Supabase Auth. In the **Confirm signup** and **Magic Link** email templates, include `{{ .Token }}` in the message so visitors receive a code. Configure custom SMTP to deliver sign-in codes to visitors outside your Supabase team. [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates) · [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
3. Set `ROAM_SUPABASE_URL` to the project URL and `ROAM_SUPABASE_PUBLISHABLE_KEY` to the `sb_publishable_…` key in the host's build environment. These two values are public. For local development, export the two variables in your shell before running `npm run dev`. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
4. Build and deploy the site. Use two email addresses to verify that an invited editor can save changes and that switching an invitation to **Can view** removes editing access. Existing invitations keep their view-only access until the owner changes them. With both variables empty, the site continues to run as a local journal.

## Features

- Past trips, upcoming trips, wishlists, map pins, journal memories, and passport stamps.
- Photos and videos stored locally, with image resizing and video size limits.
- Matching place cards and category tabs in Places to explore and the itinerary's bottom tray.
- Calendar scheduling at 15-minute intervals, dragging between days/times, resizing, and undo.
- Checklist, trip notes, and planned-versus-actual spending.
- Paste place research from Sheets; export places, itineraries, and budgets as headerless TSV files.
- Versioned JSON backup and restore, including media.
- Import saved Instagram Story files or an Instagram JSON export. This is file-based import; there is no live Instagram connection.

