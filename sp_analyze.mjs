// Merge arctic-shift pages (/tmp/asi/*.json), classify posts, emit dashboard data.
import { readdirSync, readFileSync, writeFileSync } from 'fs';

const CUTOFF = 1767225600; // 2026-01-01
const END = Math.floor(Date.now() / 1000);
const byId = new Map();
for (const dir of ['/tmp/asi', '/tmp/asi-jan']) {
  const files = readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    let j;
    try { j = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')); } catch { continue; }
    for (const p of j.data || []) byId.set(p.id, p);
  }
}
const all = [...byId.values()].filter(p => p.created_utc >= CUTOFF && p.created_utc <= END);
const posts = all.filter(p => !/^\[(removed|deleted)\]$/i.test(p.selftext || ''));
posts.sort((a, b) => a.created_utc - b.created_utc);
const removed = all.length - posts.length;

const CATS = [
  ['AI & LLM tools', /(?<!['’])\bai\b|\b(gpt|llm|chatbot|openai|claude|gemini|prompt|rag|machine learning|midjourney|stable diffusion|text.?to.?image|transcrib|voice agent)\b/i],
  ['Games', /\b(game|gaming|puzzle|roguelike|wordle|chess|rpg|arcade)\b/i],
  ['Hardware & IoT', /\b(raspberry pi|arduino|iot|hardware|sensor|3d.?print|drone|robot|esp32|pcb|smart device|wearable)\b/i],
  ['E-commerce', /\b(shopify|ecommerce|e-?commerce|online store|dropship|etsy|amazon fba|marketplace|store for)\b/i],
  ['Dev tools', /\b(dev(eloper)? tool|cli|sdk|ide|code editor|vs ?code|vscode|git|api client|library|framework|browser extension|developers?)\b/i],
  ['Finance & fintech', /\b(finance|budget|expense|invoice|crypto|stock|trading|tax|banking|payment|payroll|money)\b/i],
  ['Health & fitness', /\b(health|fitness|workout|gym|diet|calorie|sleep|meditat|mental health|therapy|habit)\b/i],
  ['Marketing & social', /\b(marketing|seo|newsletter|social media|instagram|tiktok|twitter|linkedin|lead gen|content creat|influencer|ads?)\b/i],
  ['Productivity & notes', /\b(notes?|to.?do|tasks?|productivity|calendar|journal|planner|bookmark|pomodoro|second brain)\b/i],
  ['Education', /\b(learn|course|language|study|education|tutor|flashcard|students?|school)\b/i],
  ['Music & audio', /\b(music|audio|song|podcast|guitar|piano|synth|voice record)\b/i],
  ['Photo & video', /\b(photo|video|image|camera|screenshot|wallpaper|editing)\b/i],
  ['Data & analytics', /\b(analytics|dashboard|tracking|monitor|metrics?|data|charts?)\b/i],
  ['Community & dating', /\b(community|forum|dating|social network|chat app|discord bot)\b/i],
  ['Travel & maps', /\b(travel|maps?|navigation|trip|flight|hotel)\b/i],
  ['News & reading', /\b(news|rss|reading|articles?|books?|summariz)\b/i],
  ['Job & career', /\b(job|career|resume|interview|hiring|recruit|freelanc)\b/i],
];
function classify(p) {
  const text = (p.title + ' ' + (p.selftext || '').replace(/\s+/g, ' ').slice(0, 500));
  for (const [name, re] of CATS) if (re.test(text)) return name;
  return 'Uncategorized';
}

const TECH = [
  ['AI / LLM', /\b(gpt|openai|llm|claude|gemini|machine learning|ai.?powered)\b|(?<!['’\w])ai(?![\w’])/i],
  ['Next.js', /next\.?js/i],
  ['React', /\breact(?! ?native)/i],
  ['React Native', /react ?native/i],
  ['Python', /\bpython\b|django|flask|fastapi/i],
  ['Node.js', /\bnode(\.js)?\b/i],
  ['TypeScript', /typescript/i],
  ['Flutter', /\bflutter\b|\bdart\b/i],
  ['Swift / iOS', /\bswift\b|swiftui|ios app/i],
  ['Vue', /\bvue\b|nuxt/i],
  ['Svelte', /svelte/i],
  ['Rust', /\brust\b/i],
  ['Go', /golang|(?:written|built|made|using|with|in)\s+go\b/i],
  ['Supabase', /supabase/i],
  ['Firebase', /firebase/i],
  ['Tailwind', /tailwind/i],
  ['AWS', /\baws\b/i],
  ['No-code', /\bno.?code\b|bubble\.io|webflow/i],
  ['Figma', /figma/i],
];

const start = posts[0].created_utc, end = posts.at(-1).created_utc;
const byCat = {}, tech = {}, weekly = {}, weeklyAI = {}, monthAI = {};
let aiCount = 0, monetCount = 0, freeCount = 0;
const MONET = /\b(revenue|mrr|paid|pricing|premium|subscription|monetiz|freemium|stripe|customer|sale)s?\b/i;
const FREE = /\b(free|open.?source|no sign.?up|no account|gratis)\b/i;
for (const p of posts) {
  p.cat = classify(p);
  byCat[p.cat] = (byCat[p.cat] || 0) + 1;
  const snippet = (p.selftext || '').replace(/\s+/g, ' ').slice(0, 400);
  const text = p.title + ' ' + snippet;
  const isAI = /(?<!['’\w])ai(?![\w’])|gpt|openai|\bllm|claude|gemini|chatbot/i.test(text);
  if (isAI) aiCount++;
  if (MONET.test(text)) monetCount++;
  if (FREE.test(text)) freeCount++;
  const wk = new Date((p.created_utc - 345600) * 1000).toISOString().slice(0, 10); // Monday-ish
  weekly[wk] = (weekly[wk] || 0) + 1;
  if (isAI) weeklyAI[wk] = (weeklyAI[wk] || 0) + 1;
  const mo = new Date(p.created_utc * 1000).toISOString().slice(0, 7);
  (monthAI[mo] ||= { total: 0, ai: 0 }).total++;
  if (isAI) monthAI[mo].ai++;
  for (const [name, re] of TECH) if (re.test(text)) tech[name] = (tech[name] || 0) + 1;
}

// engagement from the LIVE /new sample (archive scores are frozen at crawl time)
const liveFiles = readdirSync('/tmp').filter(f => /^sp_e_\d+\.json$/.test(f));
const liveSeen = new Set();
const live = [];
for (const f of liveFiles) {
  let j;
  try { j = JSON.parse(readFileSync('/tmp/' + f, 'utf8')); } catch { continue; }
  for (const p of j.posts || []) {
    const key = p.a + '|' + p.t + '|' + p.ct;
    if (liveSeen.has(key)) continue;
    liveSeen.add(key);
    live.push(p);
  }
}
const scores = live.map(p => p.s ?? 0).sort((a, b) => a - b);
const median = scores[Math.floor(scores.length / 2)];
const pct = q => scores[Math.min(scores.length - 1, Math.floor(scores.length * q))];
const bins = [0, 0, 0, 0];
for (const s of scores) { if (s <= 1) bins[0]++; else if (s <= 9) bins[1]++; else if (s <= 49) bins[2]++; else bins[3]++; }
const avgComments = +(live.reduce((s, p) => s + (p.nc ?? 0), 0) / (live.length || 1)).toFixed(1);

// winners from LIVE /top pull, restricted to the 6-month window
const topFiles = readdirSync('/tmp').filter(f => /^sp_top_\d+\.json$/.test(f));
const topSeen = new Set();
const winners = [];
for (const f of topFiles) {
  let j;
  try { j = JSON.parse(readFileSync('/tmp/' + f, 'utf8')); } catch { continue; }
  for (const p of j.posts || []) {
    if (p.ct < CUTOFF || p.ct > END || topSeen.has(p.id)) continue;
    topSeen.add(p.id);
    winners.push(p);
  }
}
winners.sort((a, b) => b.s - a.s);
const top = winners.slice(0, 10).map(p => ({ ...p, cat: classify(p) }));

const verbs = {};
for (const p of posts) {
  const m = p.title.match(/\b(built|made|launched|created|developed|released|shipped|wrote|designed)\b/i);
  if (m) verbs[m[1].toLowerCase()] = (verbs[m[1].toLowerCase()] || 0) + 1;
}

// title "I built X" bigram census — what the object of the sentence is
const NOUNS = {};
for (const p of posts) {
  const m = p.title.match(/\b(?:an?|my)\s+([a-z]+(?:\s+[a-z]+)?)/i);
}

const out = {
  n: posts.length, removed,
  range: [new Date(start * 1000).toISOString().slice(0, 10), new Date(end * 1000).toISOString().slice(0, 10)],
  perDay: +(posts.length / ((end - start) / 86400)).toFixed(0),
  byCat, weekly, weeklyAI, monthAI,
  tech: Object.fromEntries(Object.entries(tech).sort((a, b) => b[1] - a[1])),
  medianScore: median, p90: pct(0.9), p99: pct(0.99), maxScore: scores.at(-1),
  bins: bins.map((b, i) => ({ label: ['0–1 upvotes', '2–9', '10–49', '50+'][i], n: b, pct: +(100 * b / (live.length || 1)).toFixed(1) })),
  avgComments, liveSample: live.length,
  aiCount, monetCount, freeCount, top, verbs,
  zeroScore: bins[0],
};
writeFileSync('/tmp/sp_analysis.json', JSON.stringify(out));
console.log('posts:', posts.length, 'removed:', removed, 'range:', out.range.join(' → '), 'perDay:', out.perDay);
console.log('cats:', JSON.stringify(out.byCat));
console.log('tech:', JSON.stringify(out.tech));
console.log('verbs:', JSON.stringify(out.verbs));
console.log('median score:', median, 'p99:', out.p99, 'zero/1:', out.zeroScore);
