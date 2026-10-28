// #4471 by problem: what the merged reports turn out to be, counted the desk's way. Pages explain it;
// this file is what runs (the kb pages through ProblemTable, scripts/ through Node).
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

// causes.ts places every report by its tenant: a flipped month and day, from the parser or from
// the booking-v3 hint. The desk also read some reports as a one-day move (desk-notes.json,
// `oneDayMove`) and counts them where they're filed, footnoted under it. A one-day move is not a
// flip, so neither fix touches it: it is a problem of its own, counted inside its cause's group.
export type Problem = Cause | 'one-day' | 'unplaced';

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // Of these, how many are also counted under another problem (the one-day reports, where filed).
  alsoOneDay: number;
  tenants: string[];
  channels: Record<string, number>;
  // What intake tagged these reports as: tag → count. A guess from the browser, kept for comparison.
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

function group(problem: Problem, rs: Report[], oneDayMove: readonly string[]): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    alsoOneDay: problem === 'one-day' ? 0 : rs.filter((r) => oneDayMove.includes(r.id)).length,
    tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
    channels: tally(rs, (r) => r.channel),
    taggedAs: tally(rs, (r) => r.meta.intakeTag),
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
  };
}

// Every report merged into `ticket`, counted once by id: by cause as the desk files them
// (CauseTable's view), plus the one-day reports the desk read, which sit inside those groups.
export function splitByProblem(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const merged = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  const byCause: Problem[] = ['parser', 'hint', 'unplaced'];
  const groups = byCause.map((p) => group(p, merged.filter((r) => (causeOf(r, tenantOf(r)) ?? 'unplaced') === p), oneDayMove));
  groups.splice(2, 0, group('one-day', merged.filter((r) => oneDayMove.includes(r.id)), oneDayMove));
  return groups.filter((g) => g.reports.length > 0);
}

// Reports merged into `ticket`, once each: the groups overlap, so this is not their sum.
export const mergedCount = (reports: Report[], ticket: number) =>
  uniqueById(reports).filter((r) => r.mergedInto === ticket).length;
