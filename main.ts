// Neon Palms — the hand-in program for the gta6-01 bounty (Node 22,
// standard library only). The game itself is the static site in game/:
// plain files a desktop browser opens offline. This program copies game/
// and screenshots/ from beside itself into the output directory and writes
// dossier.json there with the vendored make.fun dossier library — the
// summary the judge reads. It is deterministic: the library reads only the
// files on disk, so two runs over the same repository write the same bytes.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play the game locally with:  node serve.ts   (then open the printed URL)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps mirror the scorer's gate: the dossier's source text is capped so
// the judge's outline stays readable, screenshots are at most four files of
// 256 KiB, and game/ stays within its file-count and byte budgets.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
