// runs every *.test.mjs in this folder; exits non-zero if any suite fails
import { readdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter(f => f.endsWith('.test.mjs')).sort();

let failed = 0;
for (const file of files) {
  const run = spawnSync('node', [join(here, file)], { encoding: 'utf8' });
  const ok = run.status === 0;
  if (!ok) failed++;
  const summary = (run.stdout.trim().split('\n').pop() || '').trim();
  console.log(`${ok ? '✓' : '✗'} ${file.padEnd(26)} ${summary}`);
  if (!ok) {
    console.log(run.stdout);
    console.error(run.stderr);
  }
}

console.log(`\n${files.length - failed}/${files.length} suites OK`);
process.exit(failed ? 1 : 0);
