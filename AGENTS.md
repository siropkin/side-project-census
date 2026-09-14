# agent notes — side-project-census

A one-shot analysis project (Sep 2026), but designed to be re-runnable as a
rolling census. To refresh the data:

1. **Archive walk** (`asi_walk.sh` + `asi_walk_jan.sh`) — pulls every r/SideProject
   submission from the [Arctic Shift](https://arctic-shift.photon-reddit.com/) archive
   (`limit=auto` pages, ~300 posts each, polite ~1s cadence — it rate-limits with
   "Timeout. Maybe slow down a bit" on bursts; the scripts retry with backoff).
   `sp_collect3.sh` / `sp_top.sh` are the live-Reddit equivalents via the
   chrome-bridge (needed because archive scores are frozen at crawl time —
   engagement stats must come from live listings).
2. **Analyze** — `node sp_analyze.mjs` merges `/tmp/asi*/`, filters out
   `[removed]`/`[deleted]` posts (mod spam — ~60% of raw volume), classifies
   each project by keywords, emits `/tmp/sp_analysis.json`.
3. **Build** — `node sp_build.mjs` injects data into the `DATA` placeholder of
   `dashboard-template.html` and writes `index.html`. Picks up
   `/tmp/sp_analysis.json` when present, else falls back to the committed
   `data.json` snapshot — so the page rebuilds from the repo alone.
4. Commit & push — GitHub Pages serves `index.html` from `master` root.

Gotchas learned the hard way: Reddit's own API caps any listing at ~1000 items
(~6 days of this subreddit), so the archive is the only full-coverage source;
`limit=auto` silently rejects some `fields` values (`upvote_ratio`, `domain`);
the same-second posts at a cursor boundary can be missed (negligible at this
volume).

Design: dataviz reference palette (validated CVD-safe), Bricolage Grotesque /
Instrument Sans / IBM Plex Mono, three-state theme tokens (light / dark / OS).
Everything renders from `DATA` — no other state. Refresh = rebuild, no edits
to the page should hardcode a number that `DATA` also carries.
