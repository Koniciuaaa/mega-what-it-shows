// The kb's data as Node sees it: the same files the pages import through Vite.
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../src/lib/data/', import.meta.url);
const json = (p) => JSON.parse(readFileSync(new URL(p, dir), 'utf8'));

export const reports = json('reports-4471.json');
export const notes = json('desk-notes.json');
const tenants = new Map(
  readdirSync(new URL('tenants/', dir)).map((f) => json(`tenants/${f}`)).map((t) => [t.handle, t]),
);
export const tenantOf = (r) => tenants.get(r.tenant);
