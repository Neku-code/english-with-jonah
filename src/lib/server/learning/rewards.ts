import {coinBalance} from '../../coins';
import { sql } from 'drizzle-orm';
import type { Connection } from '../db/connect';

// Called inside the existing student-locked grading transaction, including
// teacher reviews. The database key is the final guard against double awards.
export async function awardLearningCoins(db: Connection, studentId: string) {
  const { rows } = await db.execute<{ awarded: number }>(sql`SELECT award_learning_coins(${studentId}::uuid) AS awarded`);
  return rows[0].awarded;
}

export async function rankings(db: Connection, studentId: string) {
  const { rows } = await db.execute<{ name: string; points: string; rank: number; isCurrent: boolean }>(sql`
    WITH totals AS (
      SELECT s.id, s.display_name AS name, s.lookup_name,
        (COALESCE((SELECT sum(r.coins) FROM learning_rewards r WHERE r.student_id=s.id),0) +
         COALESCE((SELECT sum(a.delta) FROM coin_adjustments a WHERE a.student_id=s.id),0)) AS points
      FROM students s WHERE s.status='active'
    )
    SELECT name, points::text AS points, dense_rank() OVER (ORDER BY points DESC)::int AS rank,
      id=${studentId}::uuid AS "isCurrent"
    FROM totals ORDER BY totals.points DESC, lookup_name, id`);
  // Never expose student IDs, groups, names used for lookup, or profile links.
  return rows.map(row=>({...row,points:coinBalance(row.points)}));
}
