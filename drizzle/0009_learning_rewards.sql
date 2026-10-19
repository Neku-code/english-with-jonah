CREATE TABLE "learning_rewards" (
	"student_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"coins" integer NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_rewards_student_id_lesson_id_kind_pk" PRIMARY KEY("student_id","lesson_id","kind"),
	CONSTRAINT "reward_amount" CHECK (("learning_rewards"."kind" = 'vocabulary' AND "learning_rewards"."coins" = 30) OR ("learning_rewards"."kind" = 'lesson' AND "learning_rewards"."coins" = 50) OR ("learning_rewards"."kind" = 'mastery' AND "learning_rewards"."coins" = 10))
);
--> statement-breakpoint
CREATE TABLE "vocabulary_study" (
	"student_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vocabulary_study_student_id_lesson_id_version_id_pk" PRIMARY KEY("student_id","lesson_id","version_id")
);
--> statement-breakpoint
ALTER TABLE "learning_rewards" ADD CONSTRAINT "learning_rewards_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_rewards" ADD CONSTRAINT "learning_rewards_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_study" ADD CONSTRAINT "vocabulary_study_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_study" ADD CONSTRAINT "vocabulary_study_version_id_lesson_id_lesson_versions_id_lesson_id_fk" FOREIGN KEY ("version_id","lesson_id") REFERENCES "public"."lesson_versions"("id","lesson_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TRIGGER retain_learning_rewards BEFORE UPDATE OR DELETE ON learning_rewards FOR EACH ROW EXECUTE FUNCTION retain_study_history();
--> statement-breakpoint
CREATE TRIGGER retain_vocabulary_study BEFORE UPDATE OR DELETE ON vocabulary_study FOR EACH ROW EXECUTE FUNCTION retain_study_history();
--> statement-breakpoint
CREATE VIEW reward_published_lessons AS
SELECT l.* FROM lessons l JOIN units u ON u.id=l.unit_id
WHERE l.status='published' AND u.status='published'
  AND EXISTS (SELECT 1 FROM lesson_versions v WHERE v.lesson_id=l.id AND v.published_at<=now());
--> statement-breakpoint
-- All awards are based on saved, server-graded milestones. ON CONFLICT is
-- deliberately keyed by lesson, not attempt/revision/request. Never retract a
-- coin receipt when a teacher amends a grade; re-earning it cannot pay twice.
CREATE FUNCTION award_learning_coins(target_student uuid) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE awarded integer := 0; inserted integer;
BEGIN
  INSERT INTO learning_rewards(student_id,lesson_id,kind,coins)
  SELECT DISTINCT r.student_id,r.lesson_id,'vocabulary',30
  FROM vocabulary_readiness r JOIN lessons l ON l.id=r.lesson_id
  WHERE r.student_id=target_student AND l.kind='lesson'
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT; awarded := awarded + 30 * inserted;

  INSERT INTO learning_rewards(student_id,lesson_id,kind,coins)
  SELECT p.student_id,p.lesson_id,'lesson',50
  FROM lesson_progress p JOIN lessons l ON l.id=p.lesson_id
  WHERE p.student_id=target_student AND l.kind='lesson'
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT; awarded := awarded + 50 * inserted;

  INSERT INTO learning_rewards(student_id,lesson_id,kind,coins)
  SELECT p.student_id,p.lesson_id,'mastery',10
  FROM lesson_progress p JOIN reward_published_lessons l ON l.id=p.lesson_id
  WHERE p.student_id=target_student AND l.kind='lesson'
    AND NOT EXISTS (
      SELECT 1 FROM reward_published_lessons sibling
      WHERE sibling.unit_id=l.unit_id AND sibling.kind='lesson'
        AND NOT EXISTS (SELECT 1 FROM lesson_progress done WHERE done.student_id=target_student AND done.lesson_id=sibling.id)
    )
    AND EXISTS (
      SELECT 1 FROM reward_published_lessons exam JOIN lesson_attempts a ON a.lesson_id=exam.id
      WHERE exam.unit_id=l.unit_id AND exam.kind='final_exam' AND a.student_id=target_student
        AND a.status='submitted' AND NOT a.pending_review
        AND 100::bigint*a.earned_points >= 90::bigint*a.max_points
    )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT; awarded := awarded + 10 * inserted;
  RETURN awarded;
END $$;
--> statement-breakpoint
-- Preserve real historical completions/passes when this reward system launches.
SELECT award_learning_coins(id) FROM students ORDER BY id;
