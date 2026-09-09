<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Portfolio Summary — Capability Demo

This is a **standalone snapshot copy** of the Portfolio Summary app, forked
from `../portfolio-summary` at a point in time, for pitching a new business
partner. Fully independent from the real Portfolio Summary app AND from the
sibling `morgan` (Tracker) project — separate repo, database, deployment,
secrets. Never share data, code, or env vars between any of the three.

**Data is fabricated for the pitch, not real.** 3 curated assets, renamed and
re-imaged (Nash House → "Buckingham Palace", 8-10 Hanover Square → "House of
Parliament", 19 Charterhouse Street → "Gherkin"), with the Gherkin's exit
appraisal boosted to a 4.0% exit yield / positive profit for the story. See
`prisma/seed-demo.ts` and `prisma/demo-data.json` — the app self-seeds this
snapshot on every boot, there is no `/update` Excel-upload workflow in
practice (the code path still exists, just unused).

Do not port fixes made here back upstream without checking they're not
demo-specific, and don't port real data into this repo.
