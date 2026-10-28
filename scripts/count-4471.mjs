// Recount #4471 by problem from the export: `npm run count`. Prints what ProblemTable renders.
import { mergedCount, splitByProblem } from '#lib/kb/split';
import { reports, notes, tenantOf } from './data.mjs';

const groups = splitByProblem(reports, 4471, tenantOf, notes.oneDayMove);
const total = mergedCount(reports, 4471);
console.log(`${reports.length} rows in the export, ${total} unique reports merged into #4471`);
for (const g of groups) {
  console.log(
    `${g.problem.padEnd(8)} ${String(g.reports.length).padStart(4)}${g.alsoOneDay ? ` (${g.alsoOneDay} also one-day)` : ''}  tenants ${g.tenants.length}  ` +
      `channels ${JSON.stringify(g.channels)}  tagged ${JSON.stringify(g.taggedAs)}  ${g.firstSeen} → ${g.lastSeen}`,
  );
}
if (process.argv.includes('--ids')) for (const g of groups) console.log(g.problem, g.reports.map((r) => r.id).join(' '));
