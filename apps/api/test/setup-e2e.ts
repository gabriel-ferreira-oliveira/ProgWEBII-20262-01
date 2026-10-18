import * as fs from 'node:fs';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const dbFile = path.join(__dirname, 'ceviu-e2e.sqlite');

for (const suffix of ['', '-shm', '-wal']) {
  fs.rmSync(`${dbFile}${suffix}`, { force: true });
}

process.env.DATABASE_PATH = path.relative(repoRoot, dbFile).split(path.sep).join('/');
process.env.JWT_SECRET = 'segredo-de-teste';
process.env.BCRYPT_ROUNDS = '4';
