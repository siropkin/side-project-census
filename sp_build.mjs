// Injects analysis data into the dashboard template → index.html
// Data source: /tmp/sp_analysis.json when present (fresh run of sp_analyze.mjs),
// else the committed data.json snapshot.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)));
const tpl = readFileSync(join(root, 'dashboard-template.html'), 'utf8');
const fresh = '/tmp/sp_analysis.json';
const dataFile = existsSync(fresh) ? fresh : join(root, 'data.json');
const data = readFileSync(dataFile, 'utf8');
writeFileSync(join(root, 'index.html'), tpl.replace('const DATA = __DATA__;', 'const DATA = ' + data + ';'));
console.log(`built index.html from ${dataFile === fresh ? 'fresh analysis' : 'committed data.json'}`);
