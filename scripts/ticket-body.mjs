// The body of one problem's ticket, computed from the export: `node scripts/ticket-body.mjs hint`.
// Rerun after a new export and edit the ticket with the output, so the count stays the data's.
import { splitByProblem } from '#lib/kb/split';
import { reports, notes, tenantOf } from './data.mjs';

const TEXT = {
  parser: {
    what: 'The shared parser reads every date month first. Every tenant on file writes the day first, so any date with a day of 12 or less comes out with month and day flipped (7 April becomes 4 July).',
    rule: 'Tenant locale is day-first (`dayFirst` in `causes.ts`) and the report did **not** come through a `booking-v3` form: app, email, or the `booking-v2` form. `causeOf` returns `parser`. Reports the desk read as a one-day move are left out (they are #3).',
    fix: 'This is the fix #4471 already has queued: parse dates in the tenant\'s order.',
  },
  hint: {
    what: 'The `booking-v3` form prints `MM/DD/YYYY` under its date field. People at day-first tenants type what the hint tells them, month first, and the form reads the field the tenant\'s way, day first. Month and day flip, the same symptom as #1, but by a different path.',
    rule: 'Tenant locale is day-first, the tenant runs `booking-v3`, and the report came in through the `form` channel. `causeOf` returns `hint`. `CauseTable` on the #4471 page already marks this group as "not this ticket" with "no ticket of its own".',
    fix: 'The parser fix queued for #4471 does not touch this path. Fix the hint under the `booking-v3` date field (print the tenant\'s order) or read the field the way the hint says.',
  },
  'one-day': {
    what: 'The date moves by one day (always earlier), it is not a month/day flip. Tuesday 12 May shows as Monday 11 May; a client in Lisbon gets Tuesday and one in Toronto gets Monday for the same meeting; only June bookings are one day off; an invite arrives before the booking was made. This points at time zones: a date kept or sent as midnight UTC and shown in the reader\'s local time.',
    rule: 'The desk read these reports as a one-day move (`desk-notes.json`, `oneDayMove`) and still filed them under `parser` by tenant, footnoted under the #4471 table. Their subjects match the flip reports, so decision 0001 merged them into #4471.',
    fix: 'Neither the parser fix (#1) nor the hint fix (#2) changes these. Needs its own look at how booking dates are stored and sent across time zones.',
  },
};

const problem = process.argv[2];
const groups = splitByProblem(reports, 4471, tenantOf, notes.oneDayMove);
const total = groups.reduce((n, x) => n + x.reports.length, 0);
const g = groups.find((x) => x.problem === problem);
if (!g || !TEXT[problem]) throw new Error(`no problem "${problem}" in #4471`);
const t = TEXT[problem];
const list = (n) => Object.entries(n).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(' · ');
const sample = g.reports.slice(0, 3).map((r) => `- \`${r.id}\` (${r.tenant}, ${r.channel}): ${r.body}`).join('\n');

console.log(`**Covers ${g.reports.length} reports** from #4471 (${total} merged reports, counted once by id).

${t.what}

## Which reports

${t.rule}

| | |
|---|---|
| reports | ${g.reports.length} |
| tenants | ${g.tenants.length}: ${g.tenants.join(', ')} |
| came in by | ${list(g.channels)} |
| intake tagged as | ${list(g.taggedAs)} (a guess from the browser; not used to place reports) |
| first / last seen | ${g.firstSeen} → ${g.lastSeen} |

## Fix

${t.fix}

## Examples

${sample}

<details><summary>All ${g.reports.length} report ids</summary>

${g.reports.map((r) => r.id).join(' ')}

</details>

Recount: \`npm run count\` in this repo. kb page: \`src/routes/kb/incidents/4471/split/+page.svx\`.`);
