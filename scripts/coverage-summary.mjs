// Prints a Markdown coverage table from each workspace's coverage-summary.json.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const rows = process.argv.slice(2).map((dir) => {
  const file = join(dir, 'coverage', 'coverage-summary.json');
  if (!existsSync(file)) return `| ${dir} | missing | missing | missing |`;
  const { total } = JSON.parse(readFileSync(file, 'utf8'));
  return `| ${dir} | ${total.lines.pct}% | ${total.branches.pct}% | ${total.functions.pct}% |`;
});

console.log(
  [
    '### Coverage',
    '',
    '| Workspace | Lines | Branches | Functions |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n'),
);
