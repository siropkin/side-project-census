#!/bin/bash
CLI="/Users/ivan.seredkin/_projects/chrome-bridge/cli.mjs"
AFTER=""
P=0
while [ $P -lt 12 ]; do
  P=$((P+1))
  URL="https://www.reddit.com/r/SideProject/top.json?t=all&limit=100&raw_json=1"
  [ -n "$AFTER" ] && URL="$URL&after=$AFTER"
  node "$CLI" eval id:1407325668 - > "/tmp/sp_top_$P.json" <<JS
(async () => {
  const r = await fetch('$URL', {credentials:'include'});
  if (!r.ok) return JSON.stringify({err: r.status});
  const j = await r.json();
  const posts = j.data.children.map(c => c.data).map(d => ({
    id: d.id, t: d.title, s: d.score, nc: d.num_comments, a: d.author,
    ct: d.created_utc, f: d.link_flair_text || ''
  }));
  return JSON.stringify({after: j.data.after, n: posts.length, posts});
})()
JS
  read -r NEWAFTER MIN N <<< "$(jq -r '[.after, ([.posts[].ct] | min // 0), .n] | @tsv' /tmp/sp_top_$P.json 2>/dev/null)"
  echo "top page $P: n=$N"
  [ -z "$NEWAFTER" -o "$NEWAFTER" = "null" ] && break
  AFTER=$NEWAFTER
  sleep 1
done
echo "TOP DONE"
