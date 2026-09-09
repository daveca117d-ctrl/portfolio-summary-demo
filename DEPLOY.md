# Deploying the capability demo to Railway

This is a **standalone, self-contained copy** of the Portfolio Summary app,
seeded with 3 curated, anonymised assets for pitching a new business partner
(Nash House → "Buckingham Palace", 8-10 Hanover Square → "House of
Parliament", 19 Charterhouse Street → "Gherkin", with the Gherkin's exit
appraisal boosted to a 4.0% exit yield / positive profit for the story).

It shares nothing at runtime with either the real Portfolio Summary app or
the Morgan Tracker — separate repo, separate database, separate secrets.
Unlike the real app, it **never needs an Excel upload** — every boot re-seeds
itself from the committed `prisma/demo-data.json` snapshot, so the data
never drifts and there's nothing to maintain.

## One-time setup

1. **Create the project** — Railway → New Project → Deploy from GitHub repo
   (this repo, once pushed to its own GitHub remote — see below).

2. **Add a volume** — Service → Settings → add a Volume, mount path **`/data`**.
   (Technically optional since the data is re-seeded on every boot anyway,
   but keeps behaviour consistent with the other two apps and avoids a
   fresh SQLite file write on every deploy.)

3. **Set environment variables** (Service → Variables):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `file:/data/demo.db` |
   | `ADMIN_PASSWORD` | *(a value — the /update page is unused here, but still gated)* |
   | `SESSION_SECRET` | *(a fresh random secret — don't reuse from the other two apps)* |

4. **Deploy.** On boot: `prisma db push` creates the schema, `npm run db:seed`
   loads the 3-asset demo snapshot, then the app starts. Every redeploy
   re-seeds from scratch — there's no `/update` workflow to think about.

## Notes

- **This demo data is intentionally fabricated for the pitch** — the Gherkin's
  exit yield/profit figures are optimistic placeholders, not real appraisal
  output. Don't reuse this repo as a starting point for anything that needs
  to show real numbers.
- **HTTPS only** — same as the other two apps; the admin auth is a
  shared-password cookie.
