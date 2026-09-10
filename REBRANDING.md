# Rebranding guide

This codebase was built and run under the name **"Nourix Academy"**. If you
are a new owner of this code, this is the practical checklist for replacing
that name with your own brand. Nothing here is required for the app to run —
it will work today under the "Nourix Academy" name — but you should do this
before showing the product to real users under a different name.

Quick way to find anything this guide misses, at any point:

```bash
git grep -in "nourix" -- .
```

## Tier 1 — Product surface (do this first)

These are what a real visitor/user actually sees or what identifies the app
to app stores, search engines, and social previews. 214 occurrences of
"Nourix"/"Nourix Academy" across these files, found via `git grep -ic
-i nourix`:

| File | Occurrences | What it is |
|---|---:|---|
| `client/src/pages/flows/StaffFlows.tsx` | 29 | Admin/teacher/institution panel copy (ar/fr/en) |
| `client/src/pages/Home.tsx` | 12 | Public landing page copy, footer, meta description |
| `client/src/pages/Dashboard.tsx` | 11 | Learner dashboard copy |
| `client/src/pages/Legal.tsx` | 10 | **Privacy policy / terms text — see note below** |
| `docker-compose.yml` | 9 | Default DB name, container names |
| `client/src/pages/Search.tsx` | 7 | Search page copy |
| `client/src/pages/CertificateVerify.tsx` | 7 | **Certificate wording — see note below** |
| `client/src/pages/Auth.tsx` | 7 | Login/register page copy |
| `client/index.html` | 7 | `<title>`, meta description, Open Graph / Twitter card tags |
| `server/certificatePdf.ts` | 6 | **Text embedded into every generated certificate PDF** |
| `client/src/pages/AlgorithmLab.tsx` | 6 | Algorithm lab page copy |
| `client/src/pages/flows/shared.tsx` | 5 | Shared header/shell used by every staff/parent page |
| `client/src/pages/Notifications.tsx` | 5 | Notifications page copy |
| `client/src/pages/CourseDetail.tsx` | 5 | Course page title/meta (dynamic per-course, brand suffix) |
| `scripts/backup-database.sh` | 4 | Default DB name in backup filenames |
| `client/src/pages/flows/LearnerFlows.tsx` | 4 | Learner/parent flow copy |
| `client/src/pages/Support.tsx` | 4 | Support page copy |
| `client/src/pages/Pricing.tsx` | 4 | Pricing page copy |
| `client/src/pages/LessonViewer.tsx` | 4 | Lesson viewer copy |
| `client/src/pages/CourseCatalog.tsx` | 4 | Course catalog copy |
| `client/src/components/UpdateBanner.tsx` | 4 | "New version available" banner copy |
| `scripts/restore-database.sh` | 3 | Default DB name |
| `client/src/main.tsx` | 3 | Error-reporting labels |
| `client/src/lib/documentMeta.ts` | 3 | Dynamic `<title>`/meta helper (site-wide default) |
| `client/public/manifest.webmanifest` | 3 | PWA app name shown on a phone's home screen |
| `client/src/pages/Workspace.tsx` | 2 | Redirect-in-progress copy |
| `client/src/index.css` | 2 | CSS comments only (no visible text) |
| `client/public/sw.js` | 2 | Service worker comments + cache name |
| `capacitor.config.json` | 2 | Native app name/ID (if you build iOS/Android via Capacitor) |
| `client/src/lib/language.ts` | 1 | Comment only |
| `client/src/components/RoleOnboardingModal.tsx` | 1 | Onboarding modal copy |
| `client/src/App.tsx` | 1 | Comment only |
| `client/public/offline.html` | 1 | Offline-fallback page shown with no network |
| `Dockerfile` | 1 | Comment only |
| `package.json` | 1 | `"name"` field |
| `drizzle/0007_seed_contact_channels.sql` | 1 | **Seeded Instagram URL — real placeholder data, see note below** |

### Special notes — not just text, worth reading before you skip these

- **`client/src/pages/Legal.tsx`**: the privacy policy and terms of service
  name "Nourix Academy" as the data controller, in all three languages. If
  you operate this under a different name/legal entity, this text is
  legally who your users are agreeing to — update it for real, don't just
  find-and-replace the brand word if your business name, jurisdiction, or
  entity type also changed. See `PRELAUNCH_CHECKLIST.md` for the existing
  note that this policy text has never had a real lawyer's review — that
  remains true regardless of what name is on it.
- **`server/certificatePdf.ts`** and **`client/src/pages/CertificateVerify.tsx`**:
  "Nourix Academy" is baked into every certificate this app has ever
  generated (new ones going forward will use whatever you change this to)
  and into the public verification page's disclaimer text. Change this
  before issuing certificates under your own name.
- **`drizzle/0007_seed_contact_channels.sql`**: seeds a placeholder
  `https://www.instagram.com/nourix_academy/` URL into the `platformSettings`
  table on first migration. This is just a starting default — replace it
  from the admin panel's platform settings (no code change needed), or edit
  the migration before first-ever deploy on a fresh database.

## Tier 2 — Static assets (can't be found by text search)

These are images — `git grep` cannot find brand references baked into
pixels. Replace the files directly (keep the same filenames/dimensions so
nothing else needs to change):

- `client/public/favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`,
  `icon-192.png`, `icon-192-maskable.png`, `icon-512.png`,
  `icon-512-maskable.png` — the current icon is a plain gold "N" mark.
- Any logo image referenced from `client/src/pages/*.tsx` — search for
  `<img` tags; this app currently draws its brand mark as CSS/text (see
  `.brand-mark-text` in `client/src/index.css`), not an image file, so
  there may be nothing here to replace beyond that CSS class's content.

## Tier 3 — Internal development history (optional, not customer-facing)

These are working documents written during development, not something an
end user or your own customers will ever see:
`AUDIT.md`, `DEPLOYMENT.md`, `IMPLEMENTATION.md`, `PHASE1_STATUS.md`,
`PHASE3_STATUS.md`, `PHASE_VISUAL_AUDIT.md`, `PRELAUNCH_CHECKLIST.md`,
`todo.md`, `template.json`, `.project-config.json`.

You do not need to edit these for the product to work under a new brand —
they're historical engineering logs describing what was built and why,
written when the project was still named "Nourix Academy". Leave them as
archival record, or delete them if you'd rather not carry development
history forward. `.project-config.json` and `template.json` in particular
are leftover platform bootstrap files from before this codebase was made
host-independent (see `DEPLOYMENT.md`) — safe to delete entirely; nothing
in the running app reads either file.

## Tier 4 — Test fixtures (cosmetic, zero user impact)

`server/realDb.e2e.test.ts`, `server/roles.permissions.test.ts`,
`server/feature.contracts.test.ts`, `server/certificatePdf.test.ts`,
`client/src/components/UpdateBanner.test.tsx` all use "Nourix Academy" as
a plain fixture string (e.g. a test course title) purely because it had to
be *some* string. Changing these is optional busywork — they test behavior,
not branding, and pass or fail identically regardless of what string is in
them.

## Not covered here on purpose

`package-lock.json`'s 2 occurrences and `drizzle/meta/_journal.json`'s 1
occurrence are auto-generated files — they regenerate correctly from
`package.json`'s name and your migration files respectively. Don't hand-edit
them; just re-run `npm install` / `npm run db:generate` after changing the
source files that drive them.
