import EmbeddedPostgres from 'embedded-postgres';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdir, mkdtemp,rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { connectDatabase } from '../src/lib/server/db/connect';

export async function testDatabase() {
  process.env.TEACHER_ENTRY_NAME ??= 'Jonah2009TDIU';
  // Never reads DATABASE_URL, creates OS users, or touches an existing database.
  const root = resolve('.artifacts'); await mkdir(root, { recursive: true });
  const dir = await mkdtemp(resolve(root, 'postgres-'));
  if (!resolve(dir).startsWith(root + sep)) throw new Error('Invalid test database path');
  const server = createServer();
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>(done => server.close(() => done()));
  const password = randomBytes(24).toString('hex');
  const postgres = new EmbeddedPostgres({ databaseDir: dir, port, user: 'postgres', password, persistent: false,
    createPostgresUser: false, initdbFlags: ['--encoding=UTF8', '--locale=C'],
    // PostgreSQL 18's async I/O worker can outlive forced Windows teardown and
    // keep a test subprocess pipe open. Tests use synchronous disk I/O instead.
    postgresFlags: ['-h', '127.0.0.1', '-c', 'io_method=sync'], onLog: () => {}, onError: () => {} });
  await postgres.initialise(); await postgres.start();
  const stop = async () => {
    try { await postgres.stop(); }
    catch(e) {
      // Windows can release the final database handle just after shutdown.
      // Retry deletion only for this freshly-created, verified disposable path.
      const code=(e as NodeJS.ErrnoException).code;
      if(!['EBUSY','ENOTEMPTY','EPERM'].includes(code??'')||!resolve(dir).startsWith(root+sep))throw e;
      await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:200});
    }
  };
  const url = `postgresql://postgres:${password}@127.0.0.1:${port}/postgres`;
  const { db, pool } = connectDatabase(url);
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    // A second migration must be harmless, including custom SQL/trigger files.
    await migrate(db, { migrationsFolder: './drizzle' });
  } catch (e) { await pool.end(); await stop(); throw e; }
  return { db, pool, url, close: async () => { await pool.end(); await stop(); } };
}
