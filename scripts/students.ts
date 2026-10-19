import { databaseUrl } from './database.mjs';
import { connectDatabase } from '../src/lib/server/db/connect';
import { createStudent, renameStudent, archiveStudent } from '../src/lib/server/students';
import { students } from '../src/lib/server/db/schema';
import { ServiceError } from '../src/lib/server/validation';

const [command, ...args] = process.argv.slice(2);
const usage = 'Usage: pnpm students list | add --name "Ism Familiya" [--group "Guruh"] | rename --id UUID --name "Yangi ism" [--group "Guruh"] | archive --id UUID';
let connection: ReturnType<typeof connectDatabase> | undefined;
try {
  if (!command || !['list', 'add', 'rename', 'archive'].includes(command) || args.length % 2 !== 0) throw new Error(usage);
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--name', '--group', '--id'].includes(args[i]) || options[args[i]] !== undefined) throw new Error(usage);
    options[args[i]] = args[i + 1];
  }
  if ((command === 'add' || command === 'rename') && !options['--name']) throw new Error(usage);
  if ((command === 'rename' || command === 'archive') && !options['--id']) throw new Error(usage);
  connection = connectDatabase(databaseUrl());
  const db = connection.db;
  if (command === 'list') console.table(await db.select({ id: students.id, name: students.displayName, group: students.groupLabel, status: students.status }).from(students).orderBy(students.displayName));
  if (command === 'add') console.log(await createStudent(db, options['--name'], options['--group']));
  if (command === 'rename') console.log(await renameStudent(db, options['--id'], options['--name'], options['--group']));
  if (command === 'archive') { await archiveStudent(db, options['--id']); console.log('Student archived; sessions revoked. History retained.'); }
} catch (e) {
  console.error(e instanceof ServiceError ? e.message : e instanceof Error && e.message === usage ? usage : 'Student command failed. Check DATABASE_URL, migrations and supplied fields.');
  process.exitCode = 1;
} finally { await connection?.pool.end(); }
