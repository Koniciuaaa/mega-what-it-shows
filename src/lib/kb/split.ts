// #4471 by problem: what the merged reports turn out to be once each is placed. Pages explain it;
// this file is what runs (the kb pages through ProblemTable, scripts/ through Node).
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

// causes.ts places a report by its tenant: a flipped month and day, from the parser or from the
// booking-v3 hint. The desk read some reports as something else: the date moved by one day
// (desk-notes.json, `oneDayMove`). A one-day move is not a flip, so neither fix touches it.
export type Problem = Cause | 'one-day' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'one-day', 'unplaced'];

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  // What intake tagged these reports as: tag → count. A guess from the browser, kept for comparison.
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

// Every report merged into `ticket`, counted once by id, in exactly one problem.
export function splitByProblem(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const merged = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  return PROBLEMS.map((problem) => {
    const rs = merged.filter((r) => problemOf(r, tenantOf(r), oneDayMove) === problem);
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      problem,
      reports: rs,
      tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
      channels: tally(rs, (r) => r.channel),
      taggedAs: tally(rs, (r) => r.meta.intakeTag),
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
    };
  }).filter((g) => g.reports.length > 0);
}
