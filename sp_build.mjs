import { readFileSync, writeFileSync } from 'fs';
const tpl = readFileSync('/tmp/sp_dashboard.html', 'utf8');
const data = readFileSync('/tmp/sp_analysis.json', 'utf8');
writeFileSync('/tmp/sp_census.html', tpl.replace('const DATA = __DATA__;', 'const DATA = ' + data + ';'));
console.log('built /tmp/sp_census.html', (tpl.length / 1024).toFixed(0), 'KB +', (data.length / 1024).toFixed(0), 'KB data');
