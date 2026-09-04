#!/usr/bin/env node
// Print the three sha256 hashes Moss/Weave uses for a tool version.
// These are plain sha256 of the packed artifacts (verified against published
// releases): the embedded .happ, the .webhapp file, and the embedded UI zip.
// No Electron / `weave` CLI needed.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const files = {
  happSha256: 'workdir/emergence.happ',
  webhappSha256: 'workdir/emergence.webhapp',
  uiSha256: 'ui/dist.zip',
};

const hashes = {};
for (const [key, file] of Object.entries(files)) {
  hashes[key] = createHash('sha256').update(readFileSync(file)).digest('hex');
}

// Printed in the shape used by the weave-tool-curation list entry.
console.log(JSON.stringify({ hashes }, null, 2));
