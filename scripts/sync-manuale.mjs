// Copia il manuale utente (sorgente unica) negli assets del frontend, così la guida
// in-app lo serve senza duplicazione manuale. Lanciato da prestart/prebuild.
import { cp, rm, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../Documentazione/manuale-utente');
const dest = resolve(here, '../src/assets/manuale');

await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log(`[sync-manuale] copiato ${src} → ${dest}`);
