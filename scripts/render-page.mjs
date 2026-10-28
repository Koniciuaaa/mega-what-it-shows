// Render one kb page the way the desk sees it, without the Vite build: the runbook frame, the
// page's Markdown, and the components this page uses, computed from the same src/lib code.
//   node scripts/render-page.mjs src/routes/kb/incidents/4471/split/+page.svx
// Writes build/<route>/index.html. Only the Markdown and components kb pages use are handled.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deskRef } from '#lib/kb/desk-ref';
import { daysSince, isoDay, STALE_AFTER_DAYS } from '#lib/kb/staleness';
import { mergedCount, splitByProblem } from '#lib/kb/split';
import { reports, notes, tenantOf } from './data.mjs';

const src = process.argv[2];
const root = new URL('../', import.meta.url).pathname;
const text = readFileSync(join(root, src), 'utf8');

// Frontmatter: flat keys plus one level of nesting, which is all kb pages use.
const [, fm, body] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
const meta = {};
let nest = null;
for (const line of fm.split('\n')) {
  const m = line.match(/^(\s*)([\w-]+):\s*(.*)$/);
  if (!m) continue;
  const value = m[3].replace(/^'(.*)'$/, '$1');
  if (m[1]) meta[nest][m[2]] = value;
  else if (value === '') meta[(nest = m[2])] = {};
  else meta[m[2]] = value;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

function markdown(md) {
  return md
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      if (block.startsWith('## ')) return `<h2>${inline(block.slice(3))}</h2>`;
      if (block.startsWith('- '))
        return `<ul>${block
          .split(/\n(?=- )/)
          .map((li) => `<li>${inline(li.slice(2).replace(/\n\s*/g, ' '))}</li>`)
          .join('')}</ul>`;
      if (block.startsWith('<')) return block; // already rendered component
      return `<p>${inline(block.replace(/\n/g, ' '))}</p>`;
    })
    .join('\n');
}

// Components, mirroring their .svelte files in src/lib/kb.
const list = (n) =>
  Object.entries(n)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ×${v}`)
    .join(' · ');

function problemTable(ticket, tickets) {
  const groups = splitByProblem(reports, ticket, tenantOf, notes.oneDayMove);
  const total = mergedCount(reports, ticket);
  const rows = groups
    .map((g) => {
      const url = tickets[g.problem];
      const link = url ? `<a href="${url}">#${url.match(/\/issues\/(\d+)$/)?.[1]}</a>` : 'none yet';
      return `<tr${url ? '' : ' class="orphan"'}><td><code>${g.problem}</code></td><td>${g.reports.length}${g.alsoOneDay ? ` <span class="tags">(${g.alsoOneDay} also one-day)</span>` : ''}</td><td>${link}</td><td>${g.tenants.length}</td><td class="tags">${list(g.channels)}</td><td class="tags">${list(g.taggedAs)}</td><td>${g.firstSeen} → ${g.lastSeen}</td></tr>`;
    })
    .join('\n');
  return `<p class="sum"><strong>${total}</strong> reports merged into #${ticket} (${reports.length} rows in the export, counted once by id) · <strong>${groups.length}</strong> ${groups.length === 1 ? 'problem' : 'problems'}</p>
<table><thead><tr><th>problem</th><th>reports</th><th>ticket</th><th>tenants</th><th>came in by</th><th>intake tagged</th><th>seen</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="note">Counted the desk's way: each report under the cause it is filed by. The one-day reports are also counted where they're filed, so the rows overlap and don't add up to ${total}.</p>`;
}

const renderStamp = (signature) =>
  signature
    ? `<p class="stamp">desk ref <b>${deskRef(signature)}</b></p>`
    : `<p class="stamp missing">no desk ref: this page isn't signed (no <code>signature</code> in its frontmatter)</p>`;

const content = markdown(
  body
    .replace(/<script>[\s\S]*?<\/script>/, '')
    .replace(/<Callout(?: kind="(\w+)")?>\n?([\s\S]*?)<\/Callout>/g, (_, kind = 'note', inner) =>
      `<aside class="${kind}">${inline(inner.trim().replace(/\n/g, ' '))}</aside>`)
    .replace(/<ProblemTable ticket=\{(\d+)\} \{tickets\} \/>/g, (_, t) => problemTable(Number(t), meta.tickets ?? {}))
    .replace(/<RenderStamp \{signature\} \/>/g, () => renderStamp(meta.signature)),
);

// The runbook frame (src/lib/layouts/runbook.svelte) and the styles of every component on the page.
const style = (file) =>
  readFileSync(join(root, file), 'utf8')
    .match(/<style>([\s\S]*?)<\/style>/)[1]
    .replace(/:global\(([^)]*)\)/g, '$1');
const css = ['src/lib/layouts/runbook.svelte', 'src/lib/kb/Callout.svelte', 'src/lib/kb/ProblemTable.svelte', 'src/lib/kb/RenderStamp.svelte']
  .map(style)
  .join('\n');
const age = daysSince(meta.reviewed);
const stale = age > STALE_AFTER_DAYS;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(meta.title)} · support kb</title>
<style>${css}</style>
</head>
<body>
<div class="kb">
  <header>
    <a class="crumb" href="/kb">support desk · kb</a>
    <h1>${esc(meta.title)}</h1>
    <p class="meta">
      <span>owner <b>${esc(meta.owner)}</b></span>
      <span class="status ${esc(meta.status)}">${esc(meta.status)}</span>
      <span${stale ? ' class="stale"' : ''}>reviewed ${isoDay(meta.reviewed)} · ${age} days ago${stale ? ' · stale' : ''}</span>
    </p>
  </header>
  ${stale ? `<p class="banner">Nobody has re-read this page in ${age} days. Check it against the live views before you rely on it.</p>` : ''}
  <main>
${content}
  </main>
  <footer>Pages are written by people. Tables and charts are built from data at render time.</footer>
</div>
</body>
</html>
`;

const route = dirname(src).replace(/^src\/routes/, '');
const out = join(root, 'build', route, 'index.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${out}  (desk ref ${meta.signature ? deskRef(meta.signature) : 'none'})`);
