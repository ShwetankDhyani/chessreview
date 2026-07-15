#!/usr/bin/env node
/**
 * Build compact opening ECO lookup from lichess-org/chess-openings TSV files.
 * Run: node scripts/build-opening-eco.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src/assets/opening-eco.json");
const VOLUMES = ["a", "b", "c", "d", "e"];

function pgnToSans(pgn) {
  return pgn
    .replace(/\d+\.\.\./g, " ")
    .replace(/\d+\./g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

async function fetchTsv(name) {
  const url = `https://raw.githubusercontent.com/lichess-org/chess-openings/master/${name}.tsv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function parseTsv(text) {
  const lines = text.trim().split("\n");
  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const eco = line.slice(0, tab);
    const rest = line.slice(tab + 1);
    const tab2 = rest.indexOf("\t");
    if (tab2 < 0) continue;
    const name = rest.slice(0, tab2);
    const pgn = rest.slice(tab2 + 1);
    const moves = pgnToSans(pgn);
    if (!moves.length) continue;
    entries.push({ eco, name, moves });
  }
  return entries;
}

const all = [];
for (const vol of VOLUMES) {
  const text = await fetchTsv(vol);
  all.push(...parseTsv(text));
}

// Longest lines first helps gzip; lookup still scans all for best match.
all.sort((a, b) => b.moves.length - a.moves.length);

writeFileSync(OUT, JSON.stringify(all));
console.log(`Wrote ${all.length} openings to ${OUT} (${(JSON.stringify(all).length / 1024).toFixed(0)} KB)`);
