// Sobe Postgres+Redis via docker compose (best-effort). Se o Docker não estiver
// disponível, apenas avisa — o realtime cai para presença em memória.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const compose = join(here, 'docker-compose.yml');

const res = spawnSync('docker', ['compose', '-f', compose, 'up', '-d'], {
  stdio: 'inherit',
  shell: true,
});

if (res.status !== 0) {
  console.warn('[infra] Docker indisponível — seguindo com fallback em memória (single-instance).');
}
// Nunca falha o boot por causa do Docker.
process.exit(0);
