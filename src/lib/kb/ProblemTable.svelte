<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { splitByProblem, type Problem } from '#lib/kb/split';
  import { tenantOf } from '#lib/kb/locales';
  import type { Report } from '#lib/kb/causes';

  // tickets: problem → the ticket that now owns it (a link).
  let { ticket, tickets }: { ticket: number; tickets: Partial<Record<Problem, string>> } = $props();

  const groups = $derived(splitByProblem(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const total = $derived(groups.reduce((n, g) => n + g.reports.length, 0));
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
  const issue = (url?: string) => url?.match(/\/issues\/(\d+)$/)?.[1];
</script>

<p class="sum">
  <strong>{total}</strong> reports merged into #{ticket} ({(reports as Report[]).length} rows in the export, counted once by id) ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>ticket</th><th>tenants</th><th>came in by</th><th>intake tagged</th><th>seen</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr class:orphan={!tickets[g.problem]}>
        <td><code>{g.problem}</code></td>
        <td>{g.reports.length}</td>
        <td>{#if tickets[g.problem]}<a href={tickets[g.problem]}>#{issue(tickets[g.problem])}</a>{:else}none yet{/if}</td>
        <td>{g.tenants.length}</td>
        <td class="tags">{list(g.channels)}</td>
        <td class="tags">{list(g.taggedAs)}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .sum { font-size: 1.1rem; }
  .tags { color: var(--muted); font-size: 0.85em; }
  .orphan td { background: var(--warn-bg); }
</style>
