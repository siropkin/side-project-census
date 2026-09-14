#!/bin/bash
CLI="/Users/ivan.seredkin/_projects/chrome-bridge/cli.mjs"
CUTOFF=1773360000
AFTER=""
P=0
rm -f /tmp/sp_e_*.json
while [ $P -lt 200 ]; do
  P=$((P+1))
  URL="https://www.reddit.com/r/SideProject/new.json?limit=100&raw_json=1"
  [ -n "$AFTER" ] && URL="$URL&after=$AFTER"
  node "$CLI" eval id:1407325668 - > "/tmp/sp_e_$P.json" <<JS
(async () => {
  const r = await fetch('$URL', {credentials:'include'});
  if (!r.ok) return JSON.stringify({err: r.status});
  const j = await r.json();
  const posts = j.data.children.map(c => c.data).map(d => ({
    t: d.title, f: d.link_flair_text || '', a: d.author,
    s: d.score, nc: d.num_comments, u: d.upvote_ratio,
    d: d.domain, ct: d.created_utc,
    x: (d.selftext||'').replace(/\s+/g,' ').slice(0,150)
  }));
  return JSON.stringify({after: j.data.after, n: posts.length, posts});
})()
JS
  INFO=$(jq -r '[.after, ([.posts[].ct] | min), .n, (.err // "")] | @tsv' "/tmp/sp_e_$P.json" 2>/dev/null)
  if [ -z "$INFO" ]; then echo "page $P: bad output"; head -c 200 "/tmp/sp_e_$P.json"; break; fi
  read -r NEWAFTER MIN N ERR <<< "$INFO"
  echo "page $P: n=$N oldest=$(date -r ${MIN%.*} '+%Y-%m-%d') err=$ERR"
  [ -n "$ERR" ] && sleep 5
  [ "$N" -eq 0 ] && break
  [ "${MIN%.*}" -lt "$CUTOFF" ] && { echo "reached cutoff"; break; }
  [ -z "$NEWAFTER" -o "$NEWAFTER" = "null" ] && { echo "no more pages"; break; }
  AFTER=$NEWAFTER
  sleep 1
done
echo "DONE pages=$P"
