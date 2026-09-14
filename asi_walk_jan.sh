#!/bin/bash
mkdir -p /tmp/asi-jan
CURSOR=1767225600   # 2026-01-01 00:00 UTC
END=1773360000      # 2026-03-13
P=0
RETRY=0
while [ $P -lt 1300 ]; do
  P=$((P+1))
  curl -s --max-time 120 "https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=SideProject&after=${CURSOR}&sort=asc&limit=auto&fields=id,title,selftext,created_utc,score,num_comments,author,link_flair_text" -o "/tmp/asi-jan/$P.json"
  read -r N LASTCT <<< "$(jq -r '[.data | length, (if (.|length) > 0 then .[-1].created_utc else 0 end)] | @tsv' /tmp/asi-jan/$P.json 2>/dev/null)"
  if [ -z "$N" ] || [ "$N" = "null" ] || [ "$N" -eq 0 ]; then
    RETRY=$((RETRY+1))
    if [ $RETRY -gt 6 ]; then echo "too many retries at page $P"; break; fi
    echo "retry $RETRY cursor $CURSOR: $(head -c 80 /tmp/asi-jan/$P.json)"
    rm -f "/tmp/asi-jan/$P.json"; P=$((P-1)); sleep 15; continue
  fi
  RETRY=0
  echo "page $P: n=$N last=$(date -u -r ${LASTCT%.*} '+%Y-%m-%d')"
  CURSOR=$LASTCT
  [ "$LASTCT" -ge "$END" ] && { echo "done"; break; }
  sleep 1.2
done
echo "JAN WALK DONE pages=$P cursor=$CURSOR"
