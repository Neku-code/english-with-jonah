import { sql } from 'drizzle-orm';
import type { Connection } from '../db/connect';

// Called inside the existing student-locked grading transaction, including
// teacher reviews. The database key is the final guard against double awards.
export async function awardLearningCoins(db: Connection, studentId: string) {
  const { rows } = await db.execute<{ awarded: number }>(sql`SELECT award_learning_coins(${studentId}::uuid) AS awarded`);
  return rows[0].awarded;
}

export async function rankings(db: Connection, studentId: string) {
  const { rows } = await db.execute<{ name: string; points: number; rank: number; isCurrent: boolean }>(sql`
    WITH totals AS (
      SELECT s.id, s.display_name AS name, s.lookup_name,
        COALESCE(sum(r.coins), 0)::int AS points
      FROM students s LEFT JOIN learning_rewards r ON r.student_id=s.id
      WHERE s.status='active' GROUP BY s.id
    )
    SELECT name, points, dense_rank() OVER (ORDER BY points DESC)::int AS rank,
      id=${studentId}::uuid AS "isCurrent"
    FROM totals ORDER BY points DESC, lookup_name, id`);
  // Never expose student IDs, groups, names used for lookup, or profile links.
  return rows;
}
