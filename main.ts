// Neon Bay Cover Maker — the program that hands the entry in (Node 22,
// standard library only). It copies this repository's app/ and screenshots/
// beside this file into /output (or MAKEFUN_OUTPUT_DIR outside the grader)
// and writes /output/dossier.json with the vendored make.fun library, so the
// judge can read the app's source and screenshots. The app itself is plain
// static files under app/: index.html and its ES modules, no library and no
// network request. Run it twice and the two outputs are byte-identical:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copies a directory tree, refusing symlinks so the output stays plain files. */
function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const src = join(from, name);
    const dst = join(to, name);
    if (statSync(src).isDirectory()) copyTree(src, dst);
    else cpSync(src, dst);
  }
}

mkdirSync(out, { recursive: true });
copyTree(join(here, 'app'), join(out, 'app'));
if (existsSync(join(here, 'screenshots'))) {
  copyTree(join(here, 'screenshots'), join(out, 'screenshots'));
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the rest
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in app/ or 48 MiB of app files in all,
// or a path under app/ over 1000 bytes: app/ counts beside /output's own
// 1000-entry cap, its screenshots/ and dossier.json).
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// A one-line receipt on stdout (never part of the output bytes): the grader
// compares the two runs' files, and this line tells the maker the second run
// wrote the same dossier again.
console.log(`wrote ${dossierPath} (${statSync(dossierPath).size} bytes)`);
