#!/bin/bash
LASTPAGE=$(ls /tmp/asi | sed 's/\.json//' | sort -n | tail -1)
P=$(($(ls /tmp/asi | grep -c json) ))
# resume from last GOOD page
while ! jq -e '.data and (.data|length) > 0' "/tmp/asi/$LASTPAGE.json" >/dev/null 2>&1; do
  rm -f "/tmp/asi/$LASTPAGE.json"; LASTPAGE=$((LASTPAGE-1)); P=$((P-1))
done
CURSOR=$(jq -r '.data | .[-1].created_utc' "/tmp/asi/$LASTPAGE.json")
echo "resuming from page $LASTPAGE cursor=$CURSOR"
END=1789372800
RETRY=0
while [ $P -lt 1300 ]; do
  P=$((P+1))
  curl -s --max-time 120 "https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=SideProject&after=${CURSOR}&sort=asc&limit=auto&fields=id,title,selftext,created_utc,score,num_comments,author,link_flair_text" -o "/tmp/asi/$P.json"
  read -r N LASTCT <<< "$(jq -r '[.data | length, (if (.|length) > 0 then .[-1].created_utc else 0 end)] | @tsv' /tmp/asi/$P.json 2>/dev/null)"
  if [ -z "$N" ] || [ "$N" = "null" ] || [ "$N" -eq 0 ]; then
    RETRY=$((RETRY+1))
    if [ $RETRY -gt 6 ]; then echo "too many retries, stop at page $P"; break; fi
    echo "retry $RETRY at cursor $CURSOR: $(head -c 80 /tmp/asi/$P.json)"
    rm -f "/tmp/asi/$P.json"; P=$((P-1)); sleep 15; continue
  fi
  RETRY=0
  echo "page $P: n=$N last=$(date -u -r ${LASTCT%.*} '+%Y-%m-%d')"
  CURSOR=$LASTCT
  [ "$LASTCT" -ge "$END" ] && { echo "done"; break; }
  sleep 1.2
done
echo "WALK DONE pages=$P cursor=$CURSOR"
